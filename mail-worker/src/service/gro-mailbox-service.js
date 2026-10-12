import { groAddressAllowed } from '../lib/gro-auth';

/** Explicitly bound Gro domains may create aliases under the active Cloud Mail administrator. */
export async function ensureGroMailbox(env, address) {
	if (!groAddressAllowed(env, address)) return null;
	address = address.toLowerCase();
	const read = () =>
		env.db
			.prepare(
				`SELECT a.account_id AS accountId,a.user_id AS userId,a.email,a.is_del AS isDel,u.status AS ownerStatus,u.is_del AS ownerDeleted FROM account a JOIN user u ON u.user_id=a.user_id WHERE a.email=? COLLATE NOCASE`
			)
			.bind(address)
			.first();
	let account = await read();
	if (!account) {
		const owner = await env.db
			.prepare(
				'SELECT user_id AS userId FROM user WHERE email=? COLLATE NOCASE AND is_del=0 AND status=0'
			)
			.bind(env.admin)
			.first();
		if (!owner) throw new Error('Gro mailbox owner is unavailable');
		await env.db
			.prepare(
				'INSERT INTO account (email,name,user_id) VALUES (?,?,?) ON CONFLICT(email) DO NOTHING'
			)
			.bind(address, address.split('@')[0], owner.userId)
			.run();
		account = await read();
	}
	if (!account || account.isDel || account.ownerStatus || account.ownerDeleted)
		throw new Error('Gro mailbox is inactive');
	return account;
}
