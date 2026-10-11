import { sql } from 'drizzle-orm';
import BizError from '../error/biz-error';

export const mailboxRoles = ['reader', 'sender', 'manager'];

// Correlated SQL keeps authorization live, including after membership revocation.
export function mailboxAccess(accountId, userId, permission = 'read') {
	const roles = permission === 'manage' ? ['manager']
		: permission === 'send' ? ['sender', 'manager'] : mailboxRoles;
	return sql`EXISTS (SELECT 1 FROM account AS mb
		JOIN user AS mb_owner ON mb_owner.user_id = mb.user_id
		WHERE mb.account_id = ${accountId} AND mb.is_del = 0
		AND mb_owner.is_del = 0 AND mb_owner.status = 0
		AND (mb.user_id = ${userId} OR EXISTS (
			SELECT 1 FROM mailbox_member AS mm
			JOIN user AS member_user ON member_user.user_id = mm.user_id
			WHERE mm.account_id = mb.account_id AND mm.user_id = ${userId}
			AND member_user.is_del = 0 AND member_user.status = 0
			AND mm.role IN (${sql.join(roles.map(role => sql`${role}`), sql`, `)})
		)))`;
}

export async function requireMailbox(c, accountId, userId, permission = 'read') {
	accountId = Number(accountId);
	if (!Number.isSafeInteger(accountId) || accountId < 1) throw new BizError('Invalid mailbox.', 400);
	const row = await c.env.db.prepare(`SELECT a.*, m.role AS member_role
		FROM account a JOIN user u ON u.user_id = a.user_id
		LEFT JOIN mailbox_member m ON m.account_id = a.account_id AND m.user_id = ?
		WHERE a.account_id = ? AND a.is_del = 0 AND u.is_del = 0 AND u.status = 0`).bind(userId, accountId).first();
	const role = row?.user_id === userId ? 'owner' : row?.member_role;
	const allowed = permission === 'manage' ? ['owner', 'manager']
		: permission === 'send' ? ['owner', 'manager', 'sender'] : ['owner', ...mailboxRoles];
	if (!row || !allowed.includes(role)) throw new BizError('You do not have access to this mailbox.', 403);
	return { ...row, accessRole: role };
}
