import { env, SELF } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import jwt from '../src/utils/jwt-utils';
import sessionService from '../src/service/session-service';
import emailService from '../src/service/email-service';
import { replyReferences } from '../src/lib/email-thread';

const owner = 96001, reader = 96002, stranger = 96003;
const inbox = 97001, privateBox = 97002, recipientBox = 97003;
const root = 98001, reply = 98002, tail = 98003;
const tokens = {};
async function request(userId, path, method = 'GET', body) {
	return SELF.fetch(`https://example.com/api${path}`, {
		method, headers: { Authorization: `Bearer ${tokens[userId]}`, 'Content-Type': 'application/json' },
		body: body === undefined ? undefined : JSON.stringify(body)
	});
}
async function thread(id = root, userId = owner) {
	const response = await request(userId, `/email/thread?emailId=${id}`);
	expect(response.status, await response.clone().text()).toBe(200);
	return (await response.json()).data;
}
async function insert(id, messageId, inReplyTo = '', references = '', type = 0, accountId = inbox, isDel = 0) {
	await env.db.prepare(`INSERT INTO email(email_id,account_id,user_id,subject,message_id,in_reply_to,relation,type,is_del,content,text,recipient,create_time)
		VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id, accountId, owner, 'Same subject', messageId, inReplyTo, references, type, isDel,
		`<p>Complete body ${id}</p>`, 'Full message '.repeat(80), '[]', `2026-10-11 12:00:${String(id % 60).padStart(2, '0')}`).run();
}

beforeAll(async () => {
	const init = await SELF.fetch('https://example.com/api/init', {method: 'POST', headers: {'x-init-secret': env.init_secret}});
	expect(await init.text()).toBe('success');
	for (const [id, name] of [[owner, 'thread-owner'], [reader, 'thread-reader'], [stranger, 'thread-stranger']]) {
		await env.db.prepare('INSERT INTO user(user_id,email,password,salt) VALUES (?,?,?,?)').bind(id, `${name}@example.com`, 'unused', 'unused').run();
		const sessionId = crypto.randomUUID();
		await sessionService.create({env}, id, sessionId, Math.floor(Date.now()/1000) + 3600);
		tokens[id] = await jwt.generateToken({env}, {userId:id, sessionId, scope:'user'}, 3600);
	}
	for (const [id, userId, address] of [[inbox, owner, 'thread-owner@example.com'], [privateBox, owner, 'thread-private@example.com'], [recipientBox, reader, 'thread-reader@example.com']]) {
		await env.db.prepare('INSERT INTO account(account_id,user_id,email,name) VALUES (?,?,?,?)').bind(id, userId, address, 'Thread mailbox').run();
	}
});

beforeEach(async () => {
	await env.db.batch([
		env.db.prepare("UPDATE role SET send_type = 'internal' WHERE role_id = 1"),
		env.db.prepare('DELETE FROM attachments WHERE account_id IN (?, ?, ?)').bind(inbox, privateBox, recipientBox),
		env.db.prepare('DELETE FROM email WHERE account_id IN (?, ?, ?)').bind(inbox, privateBox, recipientBox),
		env.db.prepare('DELETE FROM mailbox_member WHERE account_id = ?').bind(inbox),
		env.db.prepare('INSERT INTO mailbox_member(account_id,user_id,role) VALUES (?,?,?)').bind(inbox, reader, 'reader'),
	]);
	await insert(root, '<root@external.example>');
	await insert(reply, '<sent@external.example>', '<root@external.example>', '<root@external.example>', 1);
	await insert(tail, '<tail@external.example>', '<sent@external.example>', '<root@external.example>\r\n <sent@external.example>');
});

describe('message conversations', () => {
	it('loads full incoming and sent bodies and attachments from any message in the chain', async () => {
		await env.db.prepare('UPDATE email SET create_time = ? WHERE email_id = ?').bind('2026-10-10 12:00:00', root).run();
		await env.db.prepare('INSERT INTO attachments(email_id,account_id,user_id,key,filename,mime_type) VALUES (?,?,?,?,?,?)').bind(reply, inbox, owner, 'attachments/thread.txt', 'reply.txt', 'text/plain').run();
		for (const id of [root, reply, tail]) {
			const list = await thread(id);
			expect(list.map(row => row.emailId)).toEqual([root, reply, tail]);
			expect(list.every(row => row.text.length > 300 && row.content.includes('Complete body'))).toBe(true);
			expect(list[1].attList[0].filename).toBe('reply.txt');
		}
	});
	it('excludes unrelated same-subject mail, ID substrings, deleted mail, and other mailboxes', async () => {
		await insert(98004, '<unrelated@external.example>');
		await insert(98005, '<prefix-root@external.example>');
		await insert(98006, '<deleted@external.example>', '<root@external.example>', '', 0, inbox, 1);
		await insert(98007, '<private@external.example>', '<root@external.example>', '', 0, privateBox);
		expect((await thread()).map(row => row.emailId)).toEqual([root, reply, tail]);
	});
	it('finds siblings when the root is missing and handles cyclic reply headers', async () => {
		await env.db.prepare('DELETE FROM email WHERE email_id = ?').bind(root).run();
		await insert(98004, '<sibling@external.example>', '<root@external.example>');
		await env.db.prepare('UPDATE email SET in_reply_to = ? WHERE email_id = ?').bind('<tail@external.example>', reply).run();
		expect((await thread(tail)).map(row => row.emailId)).toEqual([reply, tail, 98004]);
	});
	it('returns a headerless message on its own', async () => {
		await insert(98004, '');
		await insert(98005, '');
		expect((await thread(98004)).map(row => row.emailId)).toEqual([98004]);
	});
	it('loads conversations beyond the inbox page size and D1 bind limit', async () => {
		for (let i = 0; i < 105; i++) await insert(98100 + i, `<long-${i}@external.example>`, '<root@external.example>');
		const list = await thread();
		expect(list).toHaveLength(108);
		expect(new Set(list.map(row => row.emailId)).size).toBe(108);
	});
	it('applies live mailbox permissions and rejects inaccessible or invalid selected messages', async () => {
		const list = await thread(root, reader);
		expect(list.every(row => row.canSend === 0 && row.canManage === 0)).toBe(true);
		expect((await request(stranger, `/email/thread?emailId=${root}`)).status).toBe(403);
		await env.db.prepare('DELETE FROM mailbox_member WHERE account_id = ?').bind(inbox).run();
		expect((await request(reader, `/email/thread?emailId=${root}`)).status).toBe(403);
		expect((await request(owner, '/email/thread?emailId=missing')).status).toBe(400);
		expect((await request(owner, '/email/thread?emailId=99999999')).status).toBe(404);
	});
	it('preserves ancestry and generates IDs for internal replies and their received copies', async () => {
		const sent = await request(owner, '/email/send', 'POST', {
			accountId: inbox, receiveEmail: ['thread-reader@example.com'], sendType:'reply', emailId:tail,
			subject:'Re: Same subject', content:'<p>Next reply</p>', text:'Next reply'
		});
		expect(sent.status, await sent.clone().text()).toBe(200);
		const next = (await sent.json()).data[0];
		expect(next.messageId).toMatch(/^<.+@example.com>$/);
		expect(next.relation).toBe('<root@external.example> <sent@external.example> <tail@external.example>');
		const received = await env.db.prepare('SELECT message_id, relation FROM email WHERE account_id = ?').bind(recipientBox).first();
		expect(received.message_id).toBe(next.messageId);
		expect((await thread()).map(row => row.emailId)).toContain(next.emailId);
	});
});

describe('outgoing threading headers', () => {
	const form = {name:'Owner', accountEmail:'owner@example.com', receiveEmail:['other@external.example'], subject:'Reply', text:'Reply', attachments:[], sendType:'reply', messageId:'<parent@example.com>', references:'<root@example.com> <parent@example.com>'};
	it('retains the Cloudflare Message-ID and sends the complete reference chain', async () => {
		const send = vi.fn().mockResolvedValue({messageId:'<new@cloudflare.example>'});
		const result = await emailService.sendByCloudflareEmail({env:{email:{send}}}, form);
		expect(send.mock.calls[0][0].headers.references).toBe(form.references);
		expect(result.data.messageId).toBe('<new@cloudflare.example>');
	});
	it('retrieves Resend’s RFC Message-ID separately from its API ID', async () => {
		const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
			if (options?.method === 'POST') {
				expect(JSON.parse(options.body).headers.references).toBe(form.references);
				return Response.json({id:'resend-api-id'});
			}
			expect(String(url)).toContain('/emails/resend-api-id');
			return Response.json({id:'resend-api-id', message_id:'<new@resend.example>'});
		});
		try {
			const sent = await emailService.sendByResend('test-token', form);
			expect(sent.data).toEqual({id:'resend-api-id', messageId:'<new@resend.example>'});
			expect(fetch).toHaveBeenCalledTimes(2);
		} finally { fetch.mockRestore(); }
	});
	it('keeps successful sends successful when the follow-up ID lookup fails', async () => {
		const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(Response.json({id:'accepted'})).mockRejectedValueOnce(new Error('Lookup unavailable'));
		try {
			const sent = await emailService.sendByResend('test-token', form);
			expect(sent.data.id).toBe('accepted');
			expect(sent.error).toBeNull();
			expect(fetch).toHaveBeenCalledTimes(2);
		} finally { fetch.mockRestore(); }
	});
	it('unfolds and deduplicates ancestry before writing reply headers', () => {
		expect(replyReferences({relation:'<root@example.com>\r\n <parent@example.com>', inReplyTo:'<root@example.com>', messageId:'<parent@example.com>'})).toBe(form.references);
	});
});
