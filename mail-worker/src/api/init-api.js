import app from '../hono/hono';
import { dbInit } from '../init/init';
import { enforceAuthRateLimit } from '../security/rate-limit';

app.post('/init', async (c) => {
	await enforceAuthRateLimit(c, 'init', c.req.header('cf-connecting-ip') || 'unknown');
	return dbInit.init(c);
})
