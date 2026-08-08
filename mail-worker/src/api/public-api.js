import app from '../hono/hono';
import result from '../model/result';
import publicService from '../service/public-service';
import { enforceAuthRateLimit } from '../security/rate-limit';
import BizError from '../error/biz-error';
import { bodyLimit } from 'hono/body-limit';

app.use('/public/genToken', bodyLimit({
	maxSize: 16 * 1024,
	onError: (c) => c.json(result.fail('Request body is too large', 413), 413),
}));

app.post('/public/genToken', async (c) => {
	const params = await c.req.json();
	if (!params || typeof params.email !== 'string' || params.email.length > 254
		|| typeof params.password !== 'string' || params.password.length > 128) {
		throw new BizError('Invalid email or password', 400);
	}
	await enforceAuthRateLimit(c, 'public-token', params.email);
	await enforceAuthRateLimit(c, 'public-token-ip', c.req.header('cf-connecting-ip') || 'unknown');
	const data = await publicService.genToken(c, params);
	return c.json(result.ok(data));
});

app.post('/public/emailList', async (c) => {
	const list = await publicService.emailList(c, await c.req.json());
	return c.json(result.ok(list));
});

app.post('/public/addUser', async (c) => {
	await publicService.addUser(c, await c.req.json());
	return c.json(result.ok());
});
