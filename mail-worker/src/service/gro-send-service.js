import BizError from '../error/biz-error';
import { groHash, groAddressAllowed } from '../lib/gro-auth';
import emailService from './email-service';

const validEmail = (value) =>
	typeof value === 'string' &&
	value.length <= 254 &&
	/^[^\s@<>(),;:\"\\]+@[^\s@<>(),;:\"\\]+\.[^\s@<>(),;:\"\\]+$/.test(value);
export function validateGroSend(env, input) {
	if (
		!input ||
		typeof input !== 'object' ||
		!/^MAILBOXMAIL-[0-9a-f]{64}$/.test(input.deliveryId || '') ||
		!validEmail(input.from) ||
		!groAddressAllowed(env, input.from)
	)
		throw new BizError('Invalid Gro sender or delivery identity', 422);
	if (
		!Array.isArray(input.to) ||
		!input.to.length ||
		!Array.isArray(input.cc) ||
		input.to.length + input.cc.length > 50 ||
		[...input.to, ...input.cc].some((address) => !validEmail(address)) ||
		new Set([...input.to, ...input.cc].map((address) => address.toLowerCase())).size !==
			input.to.length + input.cc.length
	)
		throw new BizError('Invalid Gro recipients', 422);
	if (
		typeof input.subject !== 'string' ||
		!input.subject.trim() ||
		input.subject.length > 200 ||
		/[\r\n\x00]/.test(input.subject) ||
		typeof input.text !== 'string' ||
		!input.text.trim() ||
		input.text.length > 100_000 ||
		input.text.includes('\x00')
	)
		throw new BizError('Invalid Gro message content', 422);
	for (const field of ['inReplyTo', 'references'])
		if (
			input[field] !== undefined &&
			(typeof input[field] !== 'string' ||
				input[field].length > 2048 ||
				/[\r\n\x00]/.test(input[field]))
		)
			throw new BizError('Invalid threading headers', 422);
	if (!Array.isArray(input.attachments) || input.attachments.length > 4)
		throw new BizError('Invalid Gro attachments', 422);
	for (const file of input.attachments)
		if (
			!file ||
			typeof file.filename !== 'string' ||
			!file.filename.trim() ||
			file.filename.length > 180 ||
			/[\x00-\x1f\x7f/\\]/.test(file.filename) ||
			typeof file.type !== 'string' ||
			file.type.length > 120 ||
			!/^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/.test(file.type) ||
			typeof file.content !== 'string' ||
			file.content.length > 1_000_000 ||
			!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(file.content) ||
			atob(file.content).length < 1 ||
			atob(file.content).length > 750_000
		)
			throw new BizError('Invalid Gro attachment content', 422);
	return input;
}
export async function sendGroConversation(c, input, sender = emailService.send.bind(emailService)) {
	validateGroSend(c.env, input);
	const hash = await groHash(JSON.stringify(input));
	const read = () =>
		c.env.db
			.prepare('SELECT * FROM gro_send_receipt WHERE delivery_id=?')
			.bind(input.deliveryId)
			.first();
	let prior = await read();
	if (prior && prior.payload_hash !== hash)
		throw new BizError('Delivery identity belongs to different content', 409);
	if (prior?.state === 'sent')
		return { deliveryId: input.deliveryId, mailbox: input.from, messageId: prior.message_id };
	if (prior && prior.state !== 'pending')
		throw new BizError('Delivery acknowledgement is uncertain; reconcile before sending', 409);
	// An existing active mailbox is mandatory; a signed caller cannot manufacture sender identities.
	const account = await c.env.db
		.prepare(
			'SELECT a.account_id AS accountId,a.user_id AS userId FROM account a JOIN user u ON u.user_id=a.user_id WHERE lower(a.email)=? AND a.is_del=0 AND u.is_del=0 AND u.status=0'
		)
		.bind(input.from.toLowerCase())
		.first();
	if (!account) throw new BizError('Create the active sender mailbox in Cloud Mail first', 422);
	const claim = await c.env.db
		.prepare(
			`INSERT INTO gro_send_receipt (delivery_id,payload_hash,state,attempted_at) VALUES (?,?,'sending',?) ON CONFLICT(delivery_id) DO UPDATE SET state='sending',attempted_at=excluded.attempted_at WHERE state='pending' AND payload_hash=excluded.payload_hash RETURNING delivery_id`
		)
		.bind(input.deliveryId, hash, Date.now())
		.first();
	if (!claim) {
		prior = await read();
		if (prior?.state === 'sent' && prior.payload_hash === hash)
			return { deliveryId: input.deliveryId, mailbox: input.from, messageId: prior.message_id };
		throw new BizError('Delivery is already in progress', 409);
	}
	try {
		const rows = await sender(
			c,
			{
				accountId: account.accountId,
				name: input.name || '',
				sendType: input.inReplyTo ? 'reply' : 'send',
				receiveEmail: input.to,
				cc: input.cc,
				text: input.text,
				content: '',
				subject: input.subject,
				attachments: input.attachments
			},
			account.userId,
			{ inReplyTo: input.inReplyTo || '', references: input.references || '' }
		);
		const row = rows[0],
			messageId = row.resendEmailId || row.messageId;
		if (typeof messageId !== 'string' || !messageId.trim() || messageId.length > 512)
			throw new Error('Provider returned no message identity');
		await c.env.db
			.prepare(
				"UPDATE gro_send_receipt SET state='sent',message_id=?,email_id=? WHERE delivery_id=? AND state='sending'"
			)
			.bind(messageId, row.emailId, input.deliveryId)
			.run();
		return { deliveryId: input.deliveryId, mailbox: input.from, messageId };
	} catch (cause) {
		await c.env.db
			.prepare(
				"UPDATE gro_send_receipt SET state='indeterminate' WHERE delivery_id=? AND state='sending'"
			)
			.bind(input.deliveryId)
			.run();
		throw cause;
	}
}
export async function reconcileGroSend(c, input) {
	if (
		!input ||
		!/^MAILBOXMAIL-[0-9a-f]{64}$/.test(input.deliveryId || '') ||
		typeof input.reason !== 'string' ||
		!input.reason.trim() ||
		input.reason.length > 500
	)
		throw new BizError('Provide delivery identity and non-delivery evidence', 422);
	const prior = await c.env.db
		.prepare('SELECT state,message_id,attempted_at FROM gro_send_receipt WHERE delivery_id=?')
		.bind(input.deliveryId)
		.first();
	if (prior?.message_id || prior?.state === 'sent')
		throw new BizError('Known acknowledgement blocks non-delivery reconciliation', 409);
	if (prior?.state === 'sending' && prior.attempted_at + 600_000 > Date.now())
		throw new BizError('Delivery is still in progress', 409);
	await c.env.db
		.prepare(
			"UPDATE gro_send_receipt SET state='pending' WHERE delivery_id=? AND message_id IS NULL AND (state='indeterminate' OR (state='sending' AND attempted_at<=?))"
		)
		.bind(input.deliveryId, Date.now() - 600_000)
		.run();
	return { deliveryId: input.deliveryId, state: 'pending' };
}
