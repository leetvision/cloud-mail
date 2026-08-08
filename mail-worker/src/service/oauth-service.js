import BizError from '../error/biz-error';
import orm from '../entity/orm';
import { oauth } from '../entity/oauth';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import userService from './user-service';
import loginService from './login-service';
import cryptoUtils from '../utils/crypto-utils';
import settingService from './setting-service';
import jwtUtils from '../utils/jwt-utils';
import constant from '../const/constant';
import { t } from '../i18n/i18n';

const PROVIDERS = {
	linuxdo: {
		authorizeUrl: 'https://connect.linux.do/oauth2/authorize',
		tokenUrl: 'https://connect.linux.do/oauth2/token',
		userUrl: 'https://connect.linux.do/api/user',
		scope: 'openid profile email',
	},
	github: {
		authorizeUrl: 'https://github.com/login/oauth/authorize',
		tokenUrl: 'https://github.com/login/oauth/access_token',
		userUrl: 'https://api.github.com/user',
		scope: 'user:email',
	},
	google: {
		authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
		tokenUrl: 'https://oauth2.googleapis.com/token',
		userUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
		scope: 'openid profile email',
	},
};

function validateAuthorizationCode(code) {
	if (typeof code !== 'string' || !code || code.length > 2048) {
		throw new BizError('Invalid OAuth authorization code', 400);
	}
}

const oauthService = {
	async getProviderConfig(c, provider) {
		const metadata = PROVIDERS[provider];
		if (!metadata) {
			throw new BizError('Unsupported OAuth provider', 400);
		}

		const setting = await settingService.query(c);
		const clientId = setting[`${provider}ClientId`];
		let clientSecret = setting[`${provider}ClientSecret`];
		let redirectUri = `${new URL(c.req.url).origin}/login`;

		if (provider === 'linuxdo' && c.env.linuxdo_client_id && c.env.linuxdo_client_secret) {
			clientSecret = c.env.linuxdo_client_secret;
			redirectUri = c.env.linuxdo_callback_url || redirectUri;
		}

		this.assertEnabled(setting, `${provider}Switch`);
		if (!clientId || !clientSecret) {
			throw new BizError('OAuth is not configured', 503);
		}

		return { ...metadata, clientId, clientSecret, redirectUri };
	},

	async getAuthorization(c, provider, state) {
		const config = await this.getProviderConfig(c, provider);
		const url = new URL(config.authorizeUrl);
		url.searchParams.set('client_id', config.clientId);
		url.searchParams.set('redirect_uri', config.redirectUri);
		url.searchParams.set('scope', config.scope);
		url.searchParams.set('state', state);
		if (provider !== 'github') {
			url.searchParams.set('response_type', 'code');
		}
		return { url: url.toString() };
	},

	async login(c, provider, params) {
		validateAuthorizationCode(params?.code);
		if (provider === 'linuxdo') return this.linuxDoLogin(c, params.code);
		if (provider === 'github') return this.githubLogin(c, params.code);
		if (provider === 'google') return this.googleLogin(c, params.code);
		throw new BizError('Unsupported OAuth provider', 400);
	},

	async bindUser(c, params) {
		const { email, bindToken, code } = params;
		const bindAuth = await jwtUtils.verifyToken(c, bindToken);
		if (bindAuth?.scope !== 'oauth-bind' || !Number.isSafeInteger(bindAuth.oauthId)) {
			throw new BizError('OAuth binding authorization expired', 401);
		}

		const oauthRow = await this.getByOauthId(c, bindAuth.oauthId);
		if (!oauthRow) {
			throw new BizError('OAuth binding authorization expired', 401);
		}

		let userRow = await userService.selectByIdIncludeDel(c, oauthRow.userId);
		if (userRow) {
			throw new BizError('The user already has a bound email address');
		}

		await loginService.register(c, { email, password: cryptoUtils.genRandomPwd(), code }, true);
		userRow = await userService.selectByEmail(c, email);

		await orm(c).update(oauth).set({ userId: userRow.userId }).where(eq(oauth.oauthId, oauthRow.oauthId)).run();
		const jwtToken = await loginService.login(c, { email, password: null }, true);

		return { userInfo: oauthRow, token: jwtToken };
	},

	async linuxDoLogin(c, code) {
		const config = await this.getProviderConfig(c, 'linuxdo');
		const reqParams = new URLSearchParams({
			client_id: config.clientId,
			client_secret: config.clientSecret,
			code,
			redirect_uri: config.redirectUri,
			grant_type: 'authorization_code',
		});

		const tokenRes = await fetch(config.tokenUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: reqParams.toString(),
		});
		if (!tokenRes.ok) throw new BizError(tokenRes.statusText);

		const token = await tokenRes.json();
		const userRes = await fetch(config.userUrl, {
			headers: { Authorization: `Bearer ${token.access_token}` },
		});
		if (!userRes.ok) throw new BizError(userRes.statusText);

		const userInfo = await userRes.json();
		userInfo.oauthUserId = String(userInfo.id);
		userInfo.active = userInfo.active ? 0 : 1;
		userInfo.silenced = userInfo.silenced ? 0 : 1;
		userInfo.trustLevel = userInfo.trust_level;
		userInfo.avatar = userInfo.avatar_url;
		userInfo.platform = 'linuxdo';
		return this.saveAndLogin(c, userInfo);
	},

	async githubLogin(c, code) {
		const config = await this.getProviderConfig(c, 'github');
		const tokenRes = await fetch(config.tokenUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
			},
			body: JSON.stringify({
				client_id: config.clientId,
				client_secret: config.clientSecret,
				code,
				redirect_uri: config.redirectUri,
			}),
		});
		if (!tokenRes.ok) throw new BizError(tokenRes.statusText);

		const token = await tokenRes.json();
		if (token.error) throw new BizError(token.error_description || token.error);

		const userRes = await fetch(config.userUrl, {
			headers: {
				Authorization: `Bearer ${token.access_token}`,
				'User-Agent': 'cloud-mail',
			},
		});
		if (!userRes.ok) throw new BizError(userRes.statusText);

		const userInfo = await userRes.json();
		userInfo.oauthUserId = String(userInfo.id);
		userInfo.username = userInfo.login;
		userInfo.avatar = userInfo.avatar_url;
		userInfo.platform = 'github';
		return this.saveAndLogin(c, userInfo);
	},

	async googleLogin(c, code) {
		const config = await this.getProviderConfig(c, 'google');
		const reqParams = new URLSearchParams({
			client_id: config.clientId,
			client_secret: config.clientSecret,
			code,
			redirect_uri: config.redirectUri,
			grant_type: 'authorization_code',
		});

		const tokenRes = await fetch(config.tokenUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: reqParams.toString(),
		});
		if (!tokenRes.ok) throw new BizError(tokenRes.statusText);

		const token = await tokenRes.json();
		const userRes = await fetch(config.userUrl, {
			headers: { Authorization: `Bearer ${token.access_token}` },
		});
		if (!userRes.ok) throw new BizError(userRes.statusText);

		const userInfo = await userRes.json();
		userInfo.oauthUserId = String(userInfo.sub);
		userInfo.username = userInfo.email;
		userInfo.avatar = userInfo.picture;
		userInfo.platform = 'google';
		return this.saveAndLogin(c, userInfo);
	},

	async saveAndLogin(c, userInfo) {
		const oauthRow = await this.saveUser(c, userInfo);
		const userRow = await userService.selectByIdIncludeDel(c, oauthRow.userId);

		if (!userRow) {
			const bindToken = await jwtUtils.generateToken(
				c,
				{ scope: 'oauth-bind', oauthId: oauthRow.oauthId },
				constant.OAUTH_BIND_TOKEN_EXPIRE,
			);
			return { userInfo: oauthRow, token: null, bindToken };
		}

		const jwtToken = await loginService.login(c, { email: userRow.email, password: null }, true);
		return { userInfo: oauthRow, token: jwtToken };
	},

	async saveUser(c, userInfo) {
		const userInfoRow = await this.getByProvider(c, userInfo.platform, userInfo.oauthUserId);
		if (!userInfoRow) {
			return orm(c).insert(oauth).values(userInfo).returning().get();
		}
		return orm(c).update(oauth).set(userInfo).where(eq(oauth.oauthId, userInfoRow.oauthId)).returning().get();
	},

	assertEnabled(setting, switchKey) {
		if (setting[switchKey] !== 0) {
			throw new BizError(t('oauthDisabled'), 403);
		}
	},

	async getByProvider(c, provider, oauthUserId) {
		let oauthRow = await orm(c).select().from(oauth).where(and(
			eq(oauth.platform, provider),
			eq(oauth.oauthUserId, oauthUserId),
		)).get();

		// Rows created before provider support were LinuxDo identities with a null platform.
		if (!oauthRow && provider === 'linuxdo') {
			oauthRow = await orm(c).select().from(oauth).where(and(
				isNull(oauth.platform),
				eq(oauth.oauthUserId, oauthUserId),
			)).get();
		}
		return oauthRow;
	},

	async getByOauthId(c, oauthId) {
		return orm(c).select().from(oauth).where(eq(oauth.oauthId, oauthId)).get();
	},

	async deleteByUserId(c, userId) {
		await this.deleteByUserIds(c, [userId]);
	},

	async deleteByUserIds(c, userIds) {
		await orm(c).delete(oauth).where(inArray(oauth.userId, userIds)).run();
	},

	// Scheduled task that removes OAuth users without a bound email address overnight.
	async clearNoBindOathUser(c) {
		await orm(c).delete(oauth).where(eq(oauth.userId, 0)).run();
	},
};

export default oauthService;
