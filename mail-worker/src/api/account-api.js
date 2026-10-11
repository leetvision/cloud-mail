import { requireMailbox } from '../service/mailbox-access';
import mailboxMembers from '../service/mailbox-member-service';
import app from '../hono/hono';
import accountService from '../service/account-service';
import result from '../model/result';
import userContext from '../security/user-context';

app.get('/account/list', async (c) => {
	const list = await accountService.list(c, c.req.query(), userContext.getUserId(c));
	return c.json(result.ok(list));
});

app.delete('/account/delete', async (c) => {
	await accountService.delete(c, c.req.query(), userContext.getUserId(c));
	return c.json(result.ok());
});

app.post('/account/add', async (c) => {
	const account = await accountService.add(c, await c.req.json(), userContext.getUserId(c));
	return c.json(result.ok(account));
});

app.put('/account/setName', async (c) => {
	await accountService.setName(c, await c.req.json(), userContext.getUserId(c));
	return c.json(result.ok());
});

app.put('/account/setAllReceive', async (c) => {
	await accountService.setAllReceive(c, await c.req.json(), userContext.getUserId(c));
	return c.json(result.ok());
});

app.put('/account/setAsTop', async (c) => {
	await accountService.setAsTop(c, await c.req.json(), userContext.getUserId(c));
	return c.json(result.ok());
});

app.get('/account/members', async (c) => {
	return c.json(result.ok(await mailboxMembers.list(c, c.req.query('accountId'), userContext.getUserId(c))));
});
app.put('/account/members', async (c) => {
	await mailboxMembers.save(c, await c.req.json(), userContext.getUserId(c));
	return c.json(result.ok());
});
app.delete('/account/members', async (c) => {
	await mailboxMembers.remove(c, c.req.query(), userContext.getUserId(c));
	return c.json(result.ok());
});

app.get('/account/access', async (c) => {
	const row = await requireMailbox(c, c.req.query('accountId'), userContext.getUserId(c));
	return c.json(result.ok({ accountId: row.account_id, email: row.email, name: row.name, accessRole: row.accessRole }));
});
