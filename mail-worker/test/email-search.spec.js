import { env, SELF } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import jwt from '../src/utils/jwt-utils';
import sessionService from '../src/service/session-service';

const owner = 91001, reader = 91002, stranger = 91003;
const inbox = 92001, privateBox = 92002, otherBox = 92003;
const tokens = {};
async function request(userId, path) {
  return SELF.fetch(`https://example.com/api${path}`, { headers: {Authorization: `Bearer ${tokens[userId]}`} });
}
async function search(query, extra = '', userId = owner) {
  const response = await request(userId, `/email/list?accountId=${inbox}&size=2&type=0&full=0&query=${encodeURIComponent(query)}${extra}`);
  expect(response.status, await response.clone().text()).toBe(200);
  return (await response.json()).data;
}

beforeAll(async () => {
  const init = await SELF.fetch('https://example.com/api/init', {method:'POST', headers:{'x-init-secret':env.init_secret}});
  expect(await init.text()).toBe('success');
  for (const id of [owner, reader, stranger]) {
    await env.db.prepare('INSERT INTO user(user_id,email,password,salt) VALUES (?,?,?,?)').bind(id, `search-${id}@example.com`, 'unused', 'unused').run();
    const sessionId = crypto.randomUUID();
    await sessionService.create({env}, id, sessionId, Math.floor(Date.now()/1000)+3600);
    tokens[id] = await jwt.generateToken({env}, {userId:id,sessionId,scope:'user'},3600);
  }
  for (const [id, userId] of [[inbox, owner], [privateBox, owner], [otherBox, stranger]]) {
    await env.db.prepare('INSERT INTO account(account_id,user_id,email,name) VALUES (?,?,?,?)').bind(id,userId,`box-${id}@example.com`,'Search mailbox').run();
  }
  await env.db.prepare('INSERT INTO mailbox_member(account_id,user_id,role) VALUES (?,?,?)').bind(inbox,reader,'reader').run();
  const samples = [
    [93001, inbox, 'Launch plan', 'Maya', 'First milestone', '', 0, 0],
    [93002, inbox, 'Launch review', 'Jordan', 'Next milestone', '', 0, 0],
    [93003, inbox, 'Launch summary', 'Maya', 'Final milestone', '', 0, 0],
    [93004, inbox, '100%_complete', "O'Hara", 'file\\name', '', 0, 0],
    [93005, inbox, 'Sent launch', 'Alex', 'Sent message', '', 1, 0],
    [93006, inbox, 'Deleted launch', 'Maya', 'Deleted message', '', 0, 1],
    [93007, privateBox, 'Private launch', 'Maya', 'Private message', '', 0, 0],
    [93008, otherBox, 'Other launch', 'Maya', 'Other message', '', 0, 0],
    [93009, inbox, 'HTML only', 'Maya', '', '<p>Release candidate</p>', 0, 0],
  ];
  for (const [id, accountId, subject, name, text, content, type, deleted] of samples) {
    await env.db.prepare('INSERT INTO email(email_id,account_id,user_id,subject,name,text,content,type,is_del,send_email,recipient) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
      .bind(id,accountId,accountId === otherBox ? stranger : owner,subject,name,text,content,type,deleted,'sender@example.com','["recipient@example.com"]').run();
  }
  await env.db.prepare('INSERT INTO star(user_id,email_id) VALUES (?,?)').bind(owner,93002).run();
});

describe('mail folder search', () => {
  it('searches subjects and bodies with a stable total across cursor pages', async () => {
    const first = await search('  LAUNCH  ');
    expect(first.list.map(row=>row.emailId)).toEqual([93003,93002]);
    expect(first.total).toBe(3);
    const next = await search('launch', '&emailId=93002');
    expect(next.list.map(row=>row.emailId)).toEqual([93001]);
    expect(next.total).toBe(3);
    expect((await search('milestone')).total).toBe(3);
  });
  it('searches names, sender, recipient and HTML-only bodies', async () => {
    expect((await search("O'Hara")).list[0].emailId).toBe(93004);
    expect((await search('sender@example.com')).total).toBe(5);
    expect((await search('recipient@example.com')).total).toBe(5);
    expect((await search('Release candidate')).list[0].emailId).toBe(93009);
  });
  it('treats wildcard characters and backslashes as literal user input', async () => {
    for (const query of ['%', '_', 'file\\name']) {
      const result = await search(query);
      expect(result.list.map(row=>row.emailId)).toEqual([93004]);
    }
    expect((await search("' OR 1=1 --")).total).toBe(0);
  });
  it('retains sent-folder and starred-folder boundaries', async () => {
    const response = await request(owner, `/email/list?accountId=${inbox}&size=50&type=1&query=launch`);
    expect((await response.json()).data.list.map(row=>row.emailId)).toEqual([93005]);
    const stars = await request(owner, '/star/list?size=50&query=review');
    expect((await stars.json()).data.list.map(row=>row.emailId)).toEqual([93002]);
    const noStars = await request(owner, '/star/list?size=50&query=summary');
    expect((await noStars.json()).data.list).toEqual([]);
  });
  it('never expands delegated mailbox access or reveals other users mail', async () => {
    const result = await search('launch','&allReceive=1',reader);
    expect(result.total).toBe(3);
    expect(result.list.every(row=>row.canSend === 0 && row.canManage === 0)).toBe(true);
    const denied = await request(stranger, `/email/list?accountId=${inbox}&size=50&type=0&query=launch`);
    expect(denied.status).toBe(403);
    const expanded = await search('launch','&allReceive=1');
    expect(expanded.total).toBe(4);
  });
});
