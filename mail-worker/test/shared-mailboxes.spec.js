import { env, SELF } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import jwt from '../src/utils/jwt-utils';
import sessionService from '../src/service/session-service';
import { dbInit } from '../src/init/init';
import migrationSql from '../migrations/001-shared-mailboxes.sql?raw';

const tokens = {};
const owner = 91001, reader = 91002, sender = 91003, manager = 91004, outsider = 91005;
const shared = 92001, privateBox = 92002, readerBox = 92003;
const message = 93001, privateMessage = 93002;
async function request(userId, path, method = 'GET', body) {
	return SELF.fetch(`https://example.com/api${path}`, {
		method, headers: { Authorization: `Bearer ${tokens[userId]}`, 'Content-Type': 'application/json' },
		body: body === undefined ? undefined : JSON.stringify(body)
	});
}
async function data(userId, path) { return (await request(userId, path)).json(); }

beforeAll(async () => {
	// CI prepares this schema before first deployment, including on an empty D1.
	await env.db.batch(migrationSql.split(';').map(sql => sql.trim()).filter(Boolean).map(sql => env.db.prepare(sql)));
	const response = await SELF.fetch('https://example.com/api/init', {method: 'POST', headers: {'x-init-secret': env.init_secret}});
	expect(await response.text()).toBe('success');
	// Explicitly verify that upgrading an existing database is idempotent.
	await dbInit.sharedMailboxes({env});
	for (const [id, name] of [[owner, 'owner'], [reader, 'reader'], [sender, 'sender'], [manager, 'manager'], [outsider, 'outsider']]) {
		await env.db.prepare('INSERT INTO user(user_id,email,password,salt) VALUES (?,?,?,?)').bind(id, `${name}@example.com`, 'unused', 'unused').run();
		const sessionId = crypto.randomUUID();
		await sessionService.create({env}, id, sessionId, Math.floor(Date.now()/1000) + 3600);
		tokens[id] = await jwt.generateToken({env}, {userId:id, sessionId, scope:'user'}, 3600);
	}
	await env.db.batch([
		env.db.prepare('INSERT INTO account(account_id,user_id,email,name) VALUES (?,?,?,?)').bind(shared, owner, 'info@example.com', 'Info'),
		env.db.prepare('INSERT INTO account(account_id,user_id,email,name) VALUES (?,?,?,?)').bind(privateBox, owner, 'owner@example.com', 'Owner'),
		env.db.prepare('INSERT INTO account(account_id,user_id,email,name) VALUES (?,?,?,?)').bind(readerBox, reader, 'reader@example.com', 'Reader'),
		env.db.prepare('INSERT INTO email(email_id,account_id,user_id,subject,recipient) VALUES (?,?,?,?,?)').bind(message, shared, owner, 'Shared message', '[]'),
		env.db.prepare('INSERT INTO email(email_id,account_id,user_id,subject,recipient) VALUES (?,?,?,?,?)').bind(privateMessage, privateBox, owner, 'Private message', '[]'),
		env.db.prepare('INSERT INTO attachments(email_id,account_id,user_id,key,filename,mime_type) VALUES (?,?,?,?,?,?)').bind(message, shared, owner, 'attachments/shared-test.txt', 'shared.txt', 'text/plain')
	]);
	await env.kv.put('attachments/shared-test.txt', 'shared attachment');
});

beforeEach(async () => {
	await env.db.batch([
		env.db.prepare('DELETE FROM mailbox_member'),
		env.db.prepare("UPDATE role SET send_type = 'internal' WHERE role_id = 1"),
		env.db.prepare('UPDATE account SET is_del = 0'),
		env.db.prepare('UPDATE user SET status = 0, is_del = 0'),
		env.db.prepare('UPDATE email SET is_del = 0'),
		env.db.prepare('DELETE FROM star'),
		...[ [reader,'reader'], [sender,'sender'], [manager,'manager'] ].map(([id,role]) => env.db.prepare('INSERT INTO mailbox_member(account_id,user_id,role) VALUES (?,?,?)').bind(shared,id,role))
	]);
});

describe('shared mailbox authorization', () => {
	it('lists owned and delegated mailboxes without exposing the owner’s private mailbox', async () => {
		const res = await data(reader, '/account/list?size=30');
		expect(res.code).toBe(200);
		expect(res.data.map(row => row.accountId).sort()).toEqual([shared,readerBox].sort());
		expect(res.data.find(row => row.accountId === shared).accessRole).toBe('reader');
	});
	it('allows reading shared messages and polling, even when requesting all mail, but never private messages', async () => {
		const res = await data(reader, `/email/list?accountId=${shared}&size=20&allReceive=1`);
		expect(res.code).toBe(200);
		expect(res.data.list.map(row => row.emailId)).toEqual([message]);
		expect(res.data.list[0].canSend).toBe(0);
		expect(res.data.list[0].canManage).toBe(0);
		const latest = await data(reader, `/email/latest?accountId=${shared}&emailId=0&allReceive=1`);
		expect(latest.data.map(row => row.emailId)).toEqual([message]);
		expect((await request(reader, `/email/list?accountId=${privateBox}&size=20`)).status).toBe(403);
	});
	it('allows attachments and stars, then revokes all access immediately', async () => {
		expect((await request(reader, '/oss/attachments/shared-test.txt')).status).toBe(200);
		expect((await request(reader, '/star/add', 'POST', {emailId: message})).status).toBe(200);
		expect((await data(reader, `/email/attList?emailId=${message}`)).data).toHaveLength(1);
		expect((await request(owner, `/account/members?accountId=${shared}&userId=${reader}`, 'DELETE')).status).toBe(200);
		expect((await request(reader, `/email/list?accountId=${shared}&size=20`)).status).toBe(403);
		expect((await request(reader, '/oss/attachments/shared-test.txt')).status).toBe(404);
		expect((await data(reader, `/email/attList?emailId=${message}`)).data).toHaveLength(0);
		expect((await data(reader, '/star/list?size=20&full=1')).data.list).toHaveLength(0);
		expect((await request(reader, '/email/read','PUT',{emailIds:[message]})).status).toBe(403);
	});
	it('only managers and owners can modify membership, and validates roles and existing users', async () => {
		const grant = {accountId:shared,email:'outsider@example.com',role:'sender'};
		expect((await request(reader,'/account/members','PUT',grant)).status).toBe(403);
		expect((await request(sender,'/account/members','PUT',grant)).status).toBe(403);
		expect((await request(manager,'/account/members','PUT',grant)).status).toBe(200);
		expect((await request(manager,'/account/members','PUT',{...grant,role:'owner'})).status).toBe(400);
		expect((await request(owner,'/account/members','PUT',{...grant,email:'missing@example.com'})).status).toBe(400);
		expect((await request(manager,'/account/members','PUT',{...grant,email:'owner@example.com'})).status).toBe(400);
		expect((await request(outsider,`/account/members?accountId=${shared}`)).status).toBe(403);
	});
	it('requires manage access for deleting mail, rejecting an entire mixed unauthorized batch', async () => {
		expect((await request(reader,`/email/delete?emailIds=${message}`,'DELETE')).status).toBe(403);
		expect((await request(sender,`/email/delete?emailIds=${message}`,'DELETE')).status).toBe(403);
		expect((await request(manager,`/email/delete?emailIds=${message},${privateMessage}`,'DELETE')).status).toBe(403);
		expect((await env.db.prepare('SELECT is_del FROM email WHERE email_id = ?').bind(message).first()).is_del).toBe(0);
		expect((await request(manager,`/email/delete?emailIds=${message}`,'DELETE')).status).toBe(200);
	});
	it('prevents access when the owner is suspended or the mailbox is deleted', async () => {
		await env.db.prepare('UPDATE user SET status = 1 WHERE user_id = ?').bind(owner).run();
		expect((await request(sender,`/account/access?accountId=${shared}`)).status).toBe(403);
		await env.db.prepare('UPDATE user SET status = 0 WHERE user_id = ?').bind(owner).run();
		await env.db.prepare('UPDATE account SET is_del = 1 WHERE account_id = ?').bind(shared).run();
		expect((await request(sender,`/account/access?accountId=${shared}`)).status).toBe(403);
	});
	it('allows sender access to send internal mail and keeps sent messages with the mailbox owner', async () => {
		const form = {accountId:shared,receiveEmail:['reader@example.com'],subject:'Team reply',content:'<p>Hello</p>',text:'Hello',sendType:'send'};
		expect((await request(reader,'/email/send','POST',form)).status).toBe(403);
		const sent = await request(sender,'/email/send','POST',form);
		expect(await sent.clone().text()).not.toContain('Internal server error');
		expect(sent.status, await sent.clone().text()).toBe(200);
		const row = await env.db.prepare("SELECT user_id, account_id FROM email WHERE subject = 'Team reply' AND type = 1").first();
		expect(row).toEqual({user_id:owner,account_id:shared});
		const list = await data(reader,`/email/list?accountId=${shared}&size=20&type=1`);
		expect(list.data.list.some(row => row.subject === 'Team reply')).toBe(true);
	});
	it('does not allow replying to an inaccessible message', async () => {
		const form = {accountId:shared,receiveEmail:['reader@example.com'],subject:'Reply',content:'<p>Hello</p>',text:'Hello',sendType:'reply',emailId:privateMessage};
		expect((await request(sender,'/email/send','POST',form)).status).toBe(403);
	});
	it('supports cursor pagination without duplicate shared accounts', async () => {
		const first = (await data(reader, '/account/list?size=1')).data;
		const next = (await data(reader, `/account/list?size=1&accountId=${first[0].accountId}&lastSort=${first[0].sort}`)).data;
		expect(new Set([...first, ...next].map(row => row.accountId)).size).toBe(2);
	});
	it('keeps user-role sending restrictions effective for delegates', async () => {
		await env.db.prepare("UPDATE role SET send_type = 'ban' WHERE role_id = 1").run();
		const form = {accountId:shared,receiveEmail:['reader@example.com'],subject:'Denied',content:'<p>Hello</p>',text:'Hello',sendType:'send'};
		expect((await request(sender,'/email/send','POST',form)).status).toBe(403);
	});
	it('lets managers rename but not delete the mailbox or change owner-only inbox settings', async () => {
		expect((await request(manager, '/account/setName', 'PUT', {accountId:shared,name:'Shared support'})).status).toBe(200);
		expect((await request(reader, '/account/setName', 'PUT', {accountId:shared,name:'Not allowed'})).status).toBe(403);
		expect((await request(manager, `/account/delete?accountId=${shared}`, 'DELETE')).status).not.toBe(200);
		expect((await request(manager, '/account/setAllReceive', 'PUT', {accountId:shared})).status).not.toBe(200);
	});

	it('supports the UI limit of 95 selected messages within D1 parameter limits', async () => {
		const ids = Array.from({length:95}, (_, index) => 94000 + index);
		await env.db.batch(ids.map(id => env.db.prepare('INSERT INTO email(email_id,account_id,user_id,subject) VALUES (?,?,?,?)').bind(id,shared,owner,'Bulk message')));
		expect((await request(reader, '/email/read', 'PUT', {emailIds:ids})).status).toBe(200);
		expect((await request(manager, `/email/delete?emailIds=${ids.join(',')}`, 'DELETE')).status).toBe(200);
	});

});
