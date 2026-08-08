import BizError from '../error/biz-error';

async function hashKey(value) {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(value || '').toLowerCase()));
	return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function enforceAuthRateLimit(c, action, identity) {
	if (!c.env.AUTH_RATE_LIMITER) {
		throw new BizError('Rate limiting is not configured.', 503);
	}
	const key = await hashKey(`${action}:${identity}`);
	const { success } = await c.env.AUTH_RATE_LIMITER.limit({ key });
	if (!success) throw new BizError('Too many requests. Please try again later.', 429);
}
