import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import constant from '../const/constant';

export function getAuthToken(c) {
	const cookieToken = getCookie(c, constant.SESSION_COOKIE);
	if (cookieToken) return cookieToken;
	const authorization = c.req.header(constant.TOKEN_HEADER);
	if (!authorization) return null;
	return authorization.startsWith('Bearer ') ? authorization.slice(7) : authorization;
}

export function setAuthCookie(c, token) {
	setCookie(c, constant.SESSION_COOKIE, token, {
		httpOnly: true,
		secure: new URL(c.req.url).protocol === 'https:',
		sameSite: 'Strict',
		path: '/api',
		maxAge: constant.TOKEN_EXPIRE,
	});
}

export function clearAuthCookie(c) {
	deleteCookie(c, constant.SESSION_COOKIE, {
		secure: new URL(c.req.url).protocol === 'https:',
		sameSite: 'Strict',
		path: '/api',
	});
}
