import app from '../hono/hono';
import telegramService from '../service/telegram-service';

app.get('/telegram/getEmail/:token', async (c) => {
	const content = await telegramService.getEmailContent(c, c.req.param());
	c.header('Cache-Control', 'private, no-store');
	c.header('Content-Security-Policy', "default-src 'none'; frame-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'");
	c.header('Referrer-Policy', 'no-referrer');
	c.header('X-Content-Type-Options', 'nosniff');
	return c.html(content)
});
