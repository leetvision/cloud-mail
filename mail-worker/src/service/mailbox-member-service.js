import { requireMailbox, mailboxRoles } from './mailbox-access';
import BizError from '../error/biz-error';

async function manageable(c, accountId, userId) {
	accountId = Number(accountId);
	if (!Number.isSafeInteger(accountId) || accountId < 1) throw new BizError('Invalid mailbox.', 400);
	// Account owners and delegated managers can manage access. Admins may also
	// manage any mailbox through the API, without joining every mailbox inbox.
	if (c.get('user')?.email === c.env.admin) {
		const row = await c.env.db.prepare('SELECT * FROM account WHERE account_id = ? AND is_del = 0').bind(Number(accountId)).first();
		if (!row) throw new BizError('Mailbox not found.', 404);
		return row;
	}
	return requireMailbox(c, accountId, userId, 'manage');
}

export default {
	async list(c, accountId, userId) {
		const mailbox = await manageable(c, accountId, userId);
		const { results } = await c.env.db.prepare(`SELECT u.user_id AS userId, u.email, m.role
			FROM mailbox_member m JOIN user u ON u.user_id = m.user_id
			WHERE m.account_id = ? AND u.is_del = 0 ORDER BY u.email`).bind(Number(accountId)).all();
		const owner = await c.env.db.prepare('SELECT email FROM user WHERE user_id = ?').bind(mailbox.user_id).first();
		return { owner: owner.email, members: results };
	},
	async save(c, params, userId) {
		const mailbox = await manageable(c, params.accountId, userId);
		if (!mailboxRoles.includes(params.role) || typeof params.email !== 'string') throw new BizError('Choose a valid member and access level.', 400);
		const member = await c.env.db.prepare('SELECT user_id FROM user WHERE email = ? COLLATE NOCASE AND is_del = 0 AND status = 0').bind(params.email.trim()).first();
		if (!member) throw new BizError('Create an active user account for this email first.', 400);
		if (member.user_id === mailbox.user_id) throw new BizError('The owner already has full access.', 400);
		await c.env.db.prepare(`INSERT INTO mailbox_member (account_id, user_id, role) VALUES (?, ?, ?)
			ON CONFLICT(account_id, user_id) DO UPDATE SET role = excluded.role`).bind(Number(params.accountId), member.user_id, params.role).run();
	},
	async remove(c, params, userId) {
		await manageable(c, params.accountId, userId);
		const memberId = Number(params.userId);
		if (!Number.isSafeInteger(memberId) || memberId < 1) throw new BizError('Invalid member.', 400);
		await c.env.db.prepare('DELETE FROM mailbox_member WHERE account_id = ? AND user_id = ?').bind(Number(params.accountId), memberId).run();
	}
};
