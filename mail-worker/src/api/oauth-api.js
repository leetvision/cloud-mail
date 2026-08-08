import app from '../hono/hono';
import result from "../model/result";
import oauthService from "../service/oauth-service";
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import cryptoUtils from '../utils/crypto-utils';
import { enforceAuthRateLimit } from '../security/rate-limit';
import { setAuthCookie } from '../security/auth-cookie';
import { bodyLimit } from 'hono/body-limit';

const OAUTH_STATE_COOKIE = 'cloud_mail_oauth_state';
const oauthBodyLimit = bodyLimit({
	maxSize: 16 * 1024,
	onError: (c) => c.json(result.fail('Request body is too large', 413), 413),
});

app.use('/oauth/linuxDo/login', oauthBodyLimit);
app.use('/oauth/bindUser', oauthBodyLimit);

app.get('/oauth/linuxDo/authorize', async (c) => {
	await enforceAuthRateLimit(c, 'oauth-authorize', c.req.header('cf-connecting-ip') || 'unknown');
	if (!c.env.linuxdo_client_id || !c.env.linuxdo_client_secret || !c.env.linuxdo_callback_url) {
		return c.json(result.fail('OAuth is not configured', 503), 503);
	}
	const state = cryptoUtils.genRandomPwd(40);
	setCookie(c, OAUTH_STATE_COOKIE, state, {
		httpOnly: true,
		secure: new URL(c.req.url).protocol === 'https:',
		sameSite: 'Lax',
		path: '/api/oauth',
		maxAge: 600,
	});
	const url = new URL('https://connect.linux.do/oauth2/authorize');
	url.searchParams.set('client_id', c.env.linuxdo_client_id);
	url.searchParams.set('redirect_uri', c.env.linuxdo_callback_url);
	url.searchParams.set('response_type', 'code');
	url.searchParams.set('scope', 'openid profile email');
	url.searchParams.set('state', state);
	return c.json(result.ok({ url: url.toString() }));
});

app.post('/oauth/linuxDo/login', async (c) => {
	const params = await c.req.json();
	if (typeof params?.state !== 'string' || params.state.length > 128
		|| typeof params?.code !== 'string' || params.code.length > 2048) {
		return c.json(result.fail('Invalid OAuth callback', 400), 400);
	}
	await enforceAuthRateLimit(c, 'oauth-login', c.req.header('cf-connecting-ip') || params.state);
	const expectedState = getCookie(c, OAUTH_STATE_COOKIE) || '';
	deleteCookie(c, OAUTH_STATE_COOKIE, { path: '/api/oauth' });
	if (!params.state || !expectedState || !await cryptoUtils.secureEqual(params.state, expectedState)) {
		return c.json(result.fail('Invalid OAuth state', 401), 401);
	}
	const loginInfo = await oauthService.linuxDoLogin(c, params);
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
})
