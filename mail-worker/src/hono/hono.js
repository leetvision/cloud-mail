import { Hono } from 'hono';
const app = new Hono();

import result from '../model/result';
import { bodyLimit } from 'hono/body-limit';

app.use('*', bodyLimit({
	maxSize: 50 * 1024 * 1024,
	onError: (c) => c.json(result.fail('Request body is too large', 413), 413),
}));

app.use('*', async (c, next) => {
	await next();
	c.header('X-Content-Type-Options', 'nosniff');
	c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
	c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
	c.header('X-Frame-Options', 'DENY');
	if (!c.res.headers.has('Cache-Control')) c.header('Cache-Control', 'no-store');
});

app.onError((err, c) => {
	if (err.name === 'BizError') {
		return c.json(result.fail(err.message, err.code), err.code);
	}

	console.error(err);
	return c.json(result.fail('Internal server error', 500), 500);
});

export default app;
