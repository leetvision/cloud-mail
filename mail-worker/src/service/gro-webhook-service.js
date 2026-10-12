import { groSignature, groAddressAllowed } from '../lib/gro-auth';
import { parseHTML } from 'linkedom';
import { messageIds } from '../lib/email-thread';

function plainText(row) {
	if (row.text) return row.text;
	const { document } = parseHTML(`<html><body>${row.content || ''}</body></html>`);
	document.querySelectorAll('script,style').forEach((node) => node.remove());
	document.querySelectorAll('br').forEach((node) => node.replaceWith('\n'));
	return document.body.textContent || '';
}
export function groIncomingEvent(row, attachments = []) {
	const list = (value) => {
		try {
			return JSON.parse(value || '[]')
				.map((item) => item.address)
				.filter(Boolean)
				.slice(0, 50);
		} catch {
			return [];
		}
	};
	const attached = [],
		omitted = [];
	for (const file of attachments) {
		const bytes =
			file.content instanceof Uint8Array ? file.content : new Uint8Array(file.content || []);
		if (bytes.length < 1 || bytes.length > 750_000 || attached.length >= 4) {
			omitted.push(file.filename || 'Attachment');
			continue;
		}
		let binary = '';
		for (let i = 0; i < bytes.length; i += 0x8000)
			binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
		attached.push({
			filename: (file.filename || 'Attachment').slice(0, 180),
			mimeType: (file.mimeType || 'application/octet-stream').toLowerCase(),
			content: btoa(binary)
		});
	}
	return {
		version: 1,
		type: 'email.received',
		eventId: `email:${row.emailId}`,
		mailbox: row.toEmail,
		from: row.sendEmail,
		fromName: row.name || '',
		to: list(row.recipient),
		cc: list(row.cc),
		subject: row.subject || '',
		text: plainText(row).slice(0, 100_000),
		messageId: row.messageId || '',
		inReplyTo: row.inReplyTo || '',
		references: messageIds(row.relation)
			.map((id) => `<${id}>`)
			.join(' ')
			.slice(-25_600),
		attachments: attached,
		omittedAttachments: omitted
	};
}
export async function enqueueGroEmail(env, row, attachments = []) {
	if (!env.GRO_WEBHOOK_URL || !groAddressAllowed(env, row.toEmail)) return;
	if (!env.GRO_SHARED_SECRET || env.GRO_SHARED_SECRET.length < 32)
		throw new Error('Gro webhook secret is not configured');
	const event = groIncomingEvent(row, attachments);
	const prior = await env.db
		.prepare('SELECT event_id FROM gro_webhook_outbox WHERE event_id=?')
		.bind(event.eventId)
		.first();
	if (!prior) {
		const files = event.attachments.map((file) => file.content);
		const metadata = {
			...event,
			attachments: event.attachments.map((file) => ({ ...file, content: '' }))
		};
		// Each file occupies its own row below D1's 2 MB row/string ceiling.
		await env.db.batch([
			env.db
				.prepare(
					'INSERT INTO gro_webhook_outbox (event_id,payload) VALUES (?,?) ON CONFLICT(event_id) DO NOTHING'
				)
				.bind(event.eventId, JSON.stringify(metadata)),
			...files.map((content, position) =>
				env.db
					.prepare(
						'INSERT INTO gro_webhook_attachment (event_id,position,content) VALUES (?,?,?) ON CONFLICT(event_id,position) DO NOTHING'
					)
					.bind(event.eventId, position, content)
			)
		]);
	}
	await flushGroWebhooks(env, event.eventId);
}
/** Durable incoming delivery retries independently of forwarding settings and filters. */
export async function flushGroWebhooks(env, eventId) {
	if (!env.GRO_WEBHOOK_URL || !env.GRO_SHARED_SECRET) return;
	const url = new URL(env.GRO_WEBHOOK_URL);
	if (url.protocol !== 'https:') throw new Error('Gro webhook requires HTTPS');
	const rows = await env.db
		.prepare(
			'SELECT event_id,payload,attempts FROM gro_webhook_outbox WHERE delivered_at IS NULL AND next_attempt<=? AND (? IS NULL OR event_id=?) ORDER BY next_attempt LIMIT 20'
		)
		.bind(Date.now(), eventId || null, eventId || null)
		.all();
	for (const row of rows.results) {
		const event = JSON.parse(row.payload);
		const parts = await env.db
			.prepare(
				'SELECT position,content FROM gro_webhook_attachment WHERE event_id=? ORDER BY position'
			)
			.bind(row.event_id)
			.all();
		for (const part of parts.results) event.attachments[part.position].content = part.content;
		const payload = JSON.stringify(event);
		const timestamp = String(Date.now());
		let delivered = false;
		try {
			const signature = await groSignature(
				env.GRO_SHARED_SECRET,
				timestamp,
				'POST',
				url.pathname,
				payload
			);
			const response = await fetch(url, {
				method: 'POST',
				redirect: 'manual',
				signal: AbortSignal.timeout(15_000),
				headers: {
					'content-type': 'application/json',
					'x-cloud-mail-timestamp': timestamp,
					'x-cloud-mail-signature': signature
				},
				body: payload
			});
			delivered = response.ok;
			await response.body?.cancel();
		} catch {
			/* Retain the durable payload, including when delivery acknowledgement is lost. */
		}
		await env.db
			.prepare(
				'UPDATE gro_webhook_outbox SET attempts=attempts+1,delivered_at=?,next_attempt=?,last_error=? WHERE event_id=? AND delivered_at IS NULL'
			)
			.bind(
				delivered ? Date.now() : null,
				Date.now() + Math.min(3_600_000, 30_000 * 2 ** Math.min(row.attempts, 7)),
				delivered ? null : 'Gro delivery unacknowledged',
				row.event_id
			)
			.run();
		if (delivered)
			await env.db
				.prepare('DELETE FROM gro_webhook_attachment WHERE event_id=?')
				.bind(row.event_id)
				.run();
	}
}
