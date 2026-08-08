import http from '@/axios/index.js';

export function oauthAuthorize(provider) {
	return http.get(`/oauth/${provider}/authorize`);
}

export function oauthLogin(provider, code, state) {
	return http.post(`/oauth/${provider}/login`, { code, state });
}

export function oauthBindUser(form) {
	return http.put('/oauth/bindUser', form);
}
