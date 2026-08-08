const constant = {
	TOKEN_HEADER: 'Authorization',
	SESSION_COOKIE: 'cloud_mail_session',
	JWT_UID: 'user_id:',
	JWT_TOKEN: 'token:',
	TOKEN_EXPIRE: 60 * 60 * 24 * 30,
	PUBLIC_TOKEN_EXPIRE: 60 * 60,
	OAUTH_BIND_TOKEN_EXPIRE: 10 * 60,
	PASSWORD_MIN_LENGTH: 12,
	PASSWORD_MAX_LENGTH: 128,
	ATTACHMENT_PREFIX: 'attachments/',
	BACKGROUND_PREFIX: 'static/background/',
	ADMIN_ROLE: {
		name: 'admin',
		sendCount: 0,
		sendType: 'count',
		accountCount: 0
	}
}

export default constant
