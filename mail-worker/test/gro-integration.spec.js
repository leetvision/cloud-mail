import { ensureGroMailbox } from '../src/service/gro-mailbox-service';
import { env, SELF } from 'cloudflare:test';
import { beforeAll, afterEach, expect, it, vi } from 'vitest';
import { dbInit } from '../src/init/init';
import {
	groIncomingEvent,
	enqueueGroEmail,
	flushGroWebhooks
} from '../src/service/gro-webhook-service';
import { sendGroConversation, reconcileGroSend } from '../src/service/gro-send-service';
import { groSignature, verifyGroRequest } from '../src/lib/gro-auth';
import emailService from '../src/service/email-service';
const secret = 'test-cloud-mail-secret-at-least-32-characters';
const config = () => ({
	...env,
	GRO_SHARED_SECRET: secret,
	GRO_WEBHOOK_URL: 'https://dev.gro.uz/api/webhooks/cloud-mail',
	GRO_MAIL_DOMAINS: ['gro.uz']
});
beforeAll(async () => {
	await dbInit.init({ env, req: { header: () => env.init_secret }, text: () => {}, set: () => {} });
	await env.db
		.prepare(
			"INSERT INTO user(user_id,email,password,salt) VALUES (98001,'owner@gro.uz','unused','unused')"
		)
		.run();
	await env.db
		.prepare(
			"INSERT INTO account(account_id,user_id,email,name) VALUES (98001,98001,'info@gro.uz','Info')"
		)
		.run();
});
afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});
const payload = () => ({
	deliveryId: 'MAILBOXMAIL-' + crypto.randomUUID().replaceAll('-', '').repeat(2),
	from: 'info@gro.uz',
	to: ['customer@example.com'],
	cc: ['copy@example.com'],
	subject: 'Re: Order',
	text: 'Our reply',
	inReplyTo: '<original@example.com>',
	references: '<original@example.com>',
	attachments: []
});
it('binds signatures to method/path/body and rejects unauthenticated sends', async () => {
	const body = JSON.stringify(payload()),
		timestamp = String(Date.now());
	const signature = await groSignature(secret, timestamp, 'POST', '/api/gro/send', body);
	const request = new Request('https://mail.leet.uz/api/gro/send', {
		method: 'POST',
		headers: { 'x-cloud-mail-timestamp': timestamp, 'x-cloud-mail-signature': signature },
		body
	});
	expect(await verifyGroRequest(request, body, secret)).toBe(true);
	expect(await verifyGroRequest(request, body + ' ', secret)).toBe(false);
	expect(await verifyGroRequest(request, body, secret, Date.now() + 400_000)).toBe(false);
	expect(
		(await SELF.fetch('https://example.com/api/gro/send', { method: 'POST', body })).status
	).toBe(401);
});
it('retains acknowledgements and never repeats acknowledged or changed sends', async () => {
	const c = { env: config() },
		input = payload(),
		sender = vi
			.fn()
			.mockResolvedValue([
				{ emailId: 123, resendEmailId: 'provider-123', messageId: '<sent@example.com>' }
			]);
	const first = await sendGroConversation(c, input, sender);
	expect(first.messageId).toBe('provider-123');
	expect(await sendGroConversation(c, input, sender)).toEqual(first);
	expect(sender).toHaveBeenCalledTimes(1);
	expect(sender.mock.calls[0][1]).toMatchObject({ cc: input.cc, receiveEmail: input.to });
	expect(sender.mock.calls[0][3]).toEqual({
		inReplyTo: input.inReplyTo,
		references: input.references
	});
	await expect(sendGroConversation(c, { ...input, text: 'Changed' }, sender)).rejects.toMatchObject(
		{ code: 409 }
	);
	await expect(
		reconcileGroSend(c, { deliveryId: input.deliveryId, reason: 'Operator evidence' })
	).rejects.toMatchObject({ code: 409 });
});
it('quarantines unknown results until explicit non-delivery reconciliation', async () => {
	const c = { env: config() },
		input = payload(),
		sender = vi.fn().mockRejectedValue(Error('Unknown result'));
	await expect(sendGroConversation(c, input, sender)).rejects.toThrow('Unknown result');
	await expect(sendGroConversation(c, input, sender)).rejects.toMatchObject({ code: 409 });
	expect(sender).toHaveBeenCalledTimes(1);
	expect(
		await reconcileGroSend(c, {
			deliveryId: input.deliveryId,
			reason: 'Provider confirmed no delivery'
		})
	).toMatchObject({ state: 'pending' });
	sender.mockResolvedValue([{ emailId: 124, messageId: '<second@example.com>' }]);
	expect((await sendGroConversation(c, input, sender)).messageId).toBe('<second@example.com>');
	expect(sender).toHaveBeenCalledTimes(2);
});
it('rejects unmapped senders, missing accounts and invalid attachment content before claiming', async () => {
	const c = { env: config() },
		input = payload(),
		sender = vi.fn();
	for (const bad of [
		{ ...input, from: 'info@other.test' },
		{ ...input, from: 'missing@gro.uz' },
		{ ...input, cc: input.to },
		{ ...input, attachments: [{ filename: 'a.txt', type: 'text/plain', content: '%%%' }] }
	])
		await expect(sendGroConversation(c, bad, sender)).rejects.toMatchObject({ code: 422 });
	expect(sender).not.toHaveBeenCalled();
});
it('sends CC and threading through Cloudflare', async () => {
	const send = vi.fn().mockResolvedValue({ messageId: 'provider' });
	await emailService.sendByCloudflareEmail(
		{ env: { email: { send } } },
		{
			accountEmail: 'info@gro.uz',
			receiveEmail: ['customer@example.com'],
			cc: ['copy@example.com'],
			subject: 'Reply',
			text: 'Body',
			sendType: 'reply',
			messageId: '<original@example.com>',
			references: '<root@example.com> <original@example.com>',
			attachments: []
		}
	);
	expect(send).toHaveBeenCalledWith(
		expect.objectContaining({
			cc: ['copy@example.com'],
			headers: {
				'in-reply-to': '<original@example.com>',
				references: '<root@example.com> <original@example.com>'
			}
		})
	);
});
it('exports readable text, threading and attachments while identifying files that exceed Gro limits', () => {
	const event = groIncomingEvent(
		{
			emailId: 9,
			toEmail: 'info@gro.uz',
			sendEmail: 'customer@example.com',
			content: '<p>Hello</p><script>bad()</script>',
			recipient: '[{"address":"info@gro.uz"}]',
			cc: '[{"address":"copy@example.com"}]',
			messageId: '<m@example.com>',
			inReplyTo: '<p@example.com>',
			relation: '<root@example.com>'
		},
		[
			{ filename: 'note.txt', mimeType: 'text/plain', content: new Uint8Array([65, 66]) },
			{ filename: 'large.bin', content: new Uint8Array(750_001) }
		]
	);
	expect(event).toMatchObject({
		version: 1,
		eventId: 'email:9',
		mailbox: 'info@gro.uz',
		text: 'Hello',
		references: '<root@example.com>',
		cc: ['copy@example.com'],
		attachments: [{ filename: 'note.txt', mimeType: 'text/plain', content: 'QUI=' }],
		omittedAttachments: ['large.bin']
	});
	expect(event).not.toHaveProperty('content');
});
it('keeps webhook failures durable and signs retries without duplicate events', async () => {
	const cfg = config(),
		row = {
			emailId: 10,
			toEmail: 'info@gro.uz',
			sendEmail: 'customer@example.com',
			text: 'Hello',
			recipient: '[]'
		};
	const fetcher = vi.fn().mockResolvedValue(new Response('Unavailable', { status: 503 }));
	vi.stubGlobal('fetch', fetcher);
	await enqueueGroEmail(cfg, row);
	const retained = await env.db
		.prepare("SELECT * FROM gro_webhook_outbox WHERE event_id='email:10'")
		.first();
	expect(retained.delivered_at).toBeNull();
	expect(retained.attempts).toBe(1);
	await env.db
		.prepare("UPDATE gro_webhook_outbox SET next_attempt=0 WHERE event_id='email:10'")
		.run();
	fetcher.mockImplementation(async () => new Response('Accepted'));
	await flushGroWebhooks(cfg);
	const [url, options] = fetcher.mock.calls.at(-1);
	expect(await verifyGroRequest(new Request(String(url), options), options.body, secret)).toBe(
		true
	);
	expect(
		(await env.db.prepare("SELECT * FROM gro_webhook_outbox WHERE event_id='email:10'").first())
			.delivered_at
	).not.toBeNull();
	await enqueueGroEmail(cfg, row);
	expect(fetcher).toHaveBeenCalledTimes(2);
});

it('creates only bound-domain aliases and never revives deleted or suspended inboxes', async () => {
	const cfg = { ...config(), admin: 'owner@gro.uz' };
	const first = await ensureGroMailbox(cfg, 'support@gro.uz');
	expect(first.email).toBe('support@gro.uz');
	expect((await ensureGroMailbox(cfg, 'SUPPORT@gro.uz')).accountId).toBe(first.accountId);
	expect(await ensureGroMailbox(cfg, 'private@other.test')).toBeNull();
	await env.db
		.prepare('UPDATE account SET is_del=1 WHERE account_id=?')
		.bind(first.accountId)
		.run();
	await expect(ensureGroMailbox(cfg, 'support@gro.uz')).rejects.toThrow('inactive');
});
it('executes the authenticated worker endpoint and exports internally delivered conversations to Gro', async () => {
	const { default: worker } = await import('../src/index');
	const { settingConst } = await import('../src/const/entity-const');
	const cfg = { ...config(), domain: ['gro.uz'], admin: 'owner@gro.uz' },
		input = { ...payload(), to: ['team@gro.uz'], cc: [] };
	await env.db.prepare('UPDATE setting SET send=?').bind(settingConst.send.OPEN).run();
	await env.kv.delete('setting');
	const settingService = (await import('../src/service/setting-service')).default;
	await settingService.refresh({ env: cfg, set: () => {} });
	const fetcher = vi.fn().mockImplementation(async () => new Response('Accepted'));
	vi.stubGlobal('fetch', fetcher);
	const body = JSON.stringify(input),
		timestamp = String(Date.now()),
		signature = await groSignature(secret, timestamp, 'POST', '/api/gro/send', body);
	const request = new Request('https://mail.leet.uz/api/gro/send', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			'x-cloud-mail-timestamp': timestamp,
			'x-cloud-mail-signature': signature
		},
		body
	});
	const response = await worker.fetch(request, cfg, { waitUntil: () => {} });
	expect(response.status).toBe(200);
	expect(await response.json()).toMatchObject({
		deliveryId: input.deliveryId,
		mailbox: 'info@gro.uz'
	});
	expect(fetcher).toHaveBeenCalledTimes(1);
	const incoming = JSON.parse(fetcher.mock.calls[0][1].body);
	expect(incoming).toMatchObject({
		mailbox: 'team@gro.uz',
		type: 'email.received',
		text: input.text,
		inReplyTo: input.inReplyTo
	});
});
it('stores four large incoming attachments in separate D1 rows and reconstructs the signed event', async () => {
	const cfg = config(),
		files = Array.from({ length: 4 }, (_, i) => ({
			filename: `file-${i}.bin`,
			mimeType: 'application/octet-stream',
			content: new Uint8Array(750_000).fill(i + 1)
		}));
	const fetcher = vi.fn().mockImplementation(async () => new Response('Retry', { status: 503 }));
	vi.stubGlobal('fetch', fetcher);
	await enqueueGroEmail(
		cfg,
		{
			emailId: 99,
			toEmail: 'info@gro.uz',
			sendEmail: 'customer@example.com',
			text: 'Files',
			recipient: '[]'
		},
		files
	);
	const row = await env.db
		.prepare("SELECT payload FROM gro_webhook_outbox WHERE event_id='email:99'")
		.first();
	expect(row.payload.length).toBeLessThan(10000);
	expect(
		(
			await env.db
				.prepare("SELECT COUNT(*) AS count FROM gro_webhook_attachment WHERE event_id='email:99'")
				.first()
		).count
	).toBe(4);
	const [url, options] = fetcher.mock.calls[0],
		payload = JSON.parse(options.body);
	expect(payload.attachments.map((file) => atob(file.content).length)).toEqual([
		750_000, 750_000, 750_000, 750_000
	]);
	expect(await verifyGroRequest(new Request(String(url), options), options.body, secret)).toBe(
		true
	);
});
