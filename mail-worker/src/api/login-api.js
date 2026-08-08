import app from '../hono/hono';
import loginService from '../service/login-service';
import result from '../model/result';
import userContext from '../security/user-context';
import { clearAuthCookie, setAuthCookie } from '../security/auth-cookie';
import { enforceAuthRateLimit } from '../security/rate-limit';
import { bodyLimit } from 'hono/body-limit';
import BizError from '../error/biz-error';

const authBodyLimit = bodyLimit({
	maxSize: 16 * 1024,
	onError: (c) => c.json(result.fail('Request body is too large', 413), 413),
});

app.use('/login', authBodyLimit);
app.use('/register', authBodyLimit);

function validateCredentials(params) {
	if (!params || typeof params.email !== 'string' || params.email.length > 254
		|| typeof params.password !== 'string' || params.password.length > 128) {
		throw new BizError('Invalid email or password', 400);
	}
}

app.post('/login', async (c) => {
	const params = await c.req.json();
	validateCredentials(params);
	await enforceAuthRateLimit(c, 'login', params.email);
	await enforceAuthRateLimit(c, 'login-ip', c.req.header('cf-connecting-ip') || 'unknown');
	const token = await loginService.login(c, params);
	setAuthCookie(c, token);
	return c.json(result.ok({ authenticated: true }));
});

app.post('/register', async (c) => {
	const params = await c.req.json();
	validateCredentials(params);
	await enforceAuthRateLimit(c, 'register', c.req.header('cf-connecting-ip') || params.email);
	const jwt = await loginService.register(c, params);
	return c.json(result.ok(jwt));
});

app.delete('/logout', async (c) => {
	await loginService.logout(c, userContext.getUserId(c));
	clearAuthCookie(c);
	return c.json(result.ok());
});
