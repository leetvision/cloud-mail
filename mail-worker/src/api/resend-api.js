import resendService from '../service/resend-service';
import app from '../hono/hono';
import { Resend } from 'resend';

app.post('/webhooks',async (c) => {
	if (!c.env.resend_webhook_secret) {
		return c.text('Webhook is not configured', 503);
	}

	let body;
	try {
		const payload = await c.req.text();
		body = new Resend().webhooks.verify({
			payload,
			headers: {
				id: c.req.header('svix-id') || '',
				timestamp: c.req.header('svix-timestamp') || '',
				signature: c.req.header('svix-signature') || '',
			},
			webhookSecret: c.env.resend_webhook_secret,
		});
	} catch (e) {
		console.warn('Rejected Resend webhook:', e?.message || 'verification failed');
		return c.text('Invalid webhook signature', 401)
	}

	await resendService.webhooks(c, body);
	return c.text('success', 200)
})
