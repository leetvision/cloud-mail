const sessionService = {
	async create(c, userId, sessionId, expiresAt) {
		await c.env.db.batch([
			c.env.db.prepare('DELETE FROM auth_session WHERE expires_at <= ?').bind(Math.floor(Date.now() / 1000)),
			c.env.db.prepare(`INSERT INTO auth_session (session_id, user_id, expires_at)
				VALUES (?, ?, ?)`
			).bind(sessionId, userId, expiresAt),
			c.env.db.prepare(`DELETE FROM auth_session
				WHERE user_id = ? AND session_id NOT IN (
					SELECT session_id FROM auth_session WHERE user_id = ? ORDER BY created_at DESC LIMIT 10
				)`
			).bind(userId, userId),
		]);
	},

	async validate(c, userId, sessionId) {
		return c.env.db.prepare(`SELECT session_id FROM auth_session
			WHERE session_id = ? AND user_id = ? AND expires_at > ?`
		).bind(sessionId, userId, Math.floor(Date.now() / 1000)).first();
	},

	async delete(c, userId, sessionId) {
		await c.env.db.prepare('DELETE FROM auth_session WHERE session_id = ? AND user_id = ?')
			.bind(sessionId, userId).run();
	},

	async deleteByUserId(c, userId) {
		await c.env.db.prepare('DELETE FROM auth_session WHERE user_id = ?').bind(userId).run();
	},

	async deleteByUserIds(c, userIds) {
		if (!userIds?.length) return;
		const placeholders = userIds.map(() => '?').join(',');
		await c.env.db.prepare(`DELETE FROM auth_session WHERE user_id IN (${placeholders})`).bind(...userIds).run();
	},

	async clearExpired(c) {
		await c.env.db.prepare('DELETE FROM auth_session WHERE expires_at <= ?')
			.bind(Math.floor(Date.now() / 1000)).run();
	},
};

export default sessionService;
