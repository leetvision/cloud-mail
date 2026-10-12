import app from '../hono/hono';
import BizError from '../error/biz-error';
import { verifyGroRequest } from '../lib/gro-auth';
import { sendGroConversation, reconcileGroSend } from '../service/gro-send-service';
import { bodyLimit } from 'hono/body-limit';

app.use(
	'/gro/*',
	bodyLimit({
		maxSize: 4_500_000,
		onError: (c) => c.json({ message: 'Gro request is too large' }, 413)
	})
);
async function authenticatedInput(c) {
	const body = await c.req.text();
	// index.js strips /api before dispatch; the signature binds the external path.
	const url = new URL(c.req.url);
	url.pathname = '/api' + url.pathname;
	const request = new Request(url, { method: c.req.method, headers: c.req.raw.headers });
	if (!(await verifyGroRequest(request, body, c.env.GRO_SHARED_SECRET)))
		throw new BizError('Invalid Gro signature', 401);
	try {
		return JSON.parse(body);
	} catch {
		throw new BizError('Invalid Gro JSON', 400);
	}
}
app.post('/gro/send', async (c) =>
	c.json(await sendGroConversation(c, await authenticatedInput(c)))
);
app.post('/gro/reconcile', async (c) =>
	c.json(await reconcileGroSend(c, await authenticatedInput(c)))
);
