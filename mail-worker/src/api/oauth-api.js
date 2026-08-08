import app from '../hono/hono';
import result from '../model/result';
import oauthService from '../service/oauth-service';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import cryptoUtils from '../utils/crypto-utils';
import { enforceAuthRateLimit } from '../security/rate-limit';
import { setAuthCookie } from '../security/auth-cookie';
import { bodyLimit } from 'hono/body-limit';

const OAUTH_STATE_COOKIE = 'cloud_mail_oauth_state';
const OAUTH_PROVIDERS = new Set(['linuxdo', 'github', 'google']);
const oauthBodyLimit = bodyLimit({
	maxSize: 16 * 1024,
	onError: (c) => c.json(result.fail('Request body is too large', 413), 413),
});

app.use('/oauth/*', oauthBodyLimit);

app.get('/oauth/:provider/authorize', async (c) => {
	const provider = c.req.param('provider').toLowerCase();
	if (!OAUTH_PROVIDERS.has(provider)) {
		return c.json(result.fail('Unsupported OAuth provider', 400), 400);
	}

	await enforceAuthRateLimit(c, 'oauth-authorize', c.req.header('cf-connecting-ip') || 'unknown');
	const state = `${provider}.${cryptoUtils.genRandomPwd(40)}`;
	const authorization = await oauthService.getAuthorization(c, provider, state);
	setCookie(c, OAUTH_STATE_COOKIE, state, {
		httpOnly: true,
		secure: new URL(c.req.url).protocol === 'https:',
		sameSite: 'Lax',
		path: '/api/oauth',
		maxAge: 600,
	});
	return c.json(result.ok(authorization));
});

app.post('/oauth/:provider/login', async (c) => {
	const provider = c.req.param('provider').toLowerCase();
	const params = await c.req.json();
	if (!OAUTH_PROVIDERS.has(provider)
		|| typeof params?.state !== 'string' || params.state.length > 128
		|| typeof params?.code !== 'string' || params.code.length > 2048) {
		return c.json(result.fail('Invalid OAuth callback', 400), 400);
	}

	await enforceAuthRateLimit(c, 'oauth-login', c.req.header('cf-connecting-ip') || params.state);
	const expectedState = getCookie(c, OAUTH_STATE_COOKIE) || '';
	deleteCookie(c, OAUTH_STATE_COOKIE, { path: '/api/oauth' });
	if (!params.state.startsWith(`${provider}.`)
		|| !expectedState
		|| !await cryptoUtils.secureEqual(params.state, expectedState)) {
		return c.json(result.fail('Invalid OAuth state', 401), 401);
	}

	const loginInfo = await oauthService.login(c, provider, params);
	if (loginInfo.token) {
		setAuthCookie(c, loginInfo.token);
		delete loginInfo.token;
		loginInfo.authenticated = true;
	}
	return c.json(result.ok(loginInfo));
});

app.put('/oauth/bindUser', async (c) => {
	const params = await c.req.json();
	if (typeof params?.email !== 'string' || params.email.length > 254
		|| typeof params?.bindToken !== 'string' || params.bindToken.length > 4096
		|| (params.code != null && (typeof params.code !== 'string' || params.code.length > 256))) {
		return c.json(result.fail('Invalid OAuth binding request', 400), 400);
	}

	await enforceAuthRateLimit(c, 'oauth-bind', c.req.header('cf-connecting-ip') || params.email);
	const loginInfo = await oauthService.bindUser(c, params);
	setAuthCookie(c, loginInfo.token);
	delete loginInfo.token;
	loginInfo.authenticated = true;
	return c.json(result.ok(loginInfo));
});
