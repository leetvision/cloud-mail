import r2Service from '../service/r2-service';
import app from '../hono/hono';
import constant from '../const/constant';

const SAFE_INLINE_TYPES = new Set([
	'image/avif',
	'image/gif',
	'image/jpeg',
	'image/png',
	'image/webp',
]);

function sanitizeFilename(filename) {
	return String(filename || 'attachment')
		.replace(/[\u0000-\u001f\u007f"\\/]/g, '_')
		.slice(0, 180);
}

function contentDisposition(type, filename) {
	const fallback = filename.replace(/[^\x20-\x7e]/g, '_');
	const encoded = encodeURIComponent(filename).replace(/['()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
	return `${type}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

app.get('/oss/*', async (c) => {
	const key = c.req.path.split('/oss/')[1];
	if (!key || key.includes('..')) return c.notFound();

	const isBackground = key.startsWith(constant.BACKGROUND_PREFIX);
	let attachment;
	if (!isBackground) {
		const userId = c.get('user')?.userId;
		const emailId = c.get('emailAccessId');
		if (!userId && !emailId) return c.notFound();

		const query = userId
			? c.env.db.prepare('SELECT filename, mime_type FROM attachments WHERE key = ? AND user_id = ? LIMIT 1').bind(key, userId)
			: c.env.db.prepare('SELECT filename, mime_type FROM attachments WHERE key = ? AND email_id = ? LIMIT 1').bind(key, emailId);
		attachment = await query.first();
		if (!attachment) return c.notFound();
	}

	const obj = await r2Service.getObj(c, key);
	if (!obj) return c.notFound();

	const sourceHeaders = obj instanceof Response ? obj.headers : new Headers({
		'Content-Type': obj.httpMetadata?.contentType || 'application/octet-stream',
		'Content-Disposition': obj.httpMetadata?.contentDisposition || '',
	});
	const body = obj instanceof Response ? obj.body : obj.body;
	const candidateType = String(attachment?.mime_type || sourceHeaders.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
	const contentType = /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/.test(candidateType)
		? candidateType
		: 'application/octet-stream';
	const safeInline = SAFE_INLINE_TYPES.has(contentType.toLowerCase());
	if (isBackground && !safeInline) return c.notFound();
	const filename = sanitizeFilename(attachment?.filename);
	const headers = new Headers({
		'Content-Type': contentType,
		'X-Content-Type-Options': 'nosniff',
		'Cross-Origin-Resource-Policy': 'same-origin',
		'Cache-Control': isBackground ? 'public, max-age=31536000, immutable' : 'private, no-store',
		'Content-Disposition': contentDisposition(isBackground || safeInline ? 'inline' : 'attachment', filename),
	});

	return new Response(body, { headers });
});
