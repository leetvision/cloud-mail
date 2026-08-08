import { SELF } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import cryptoUtils from '../src/utils/crypto-utils';
import jwtUtils from '../src/utils/jwt-utils';
import emailHtmlTemplate from '../src/template/email-html';

const encoder = new TextEncoder();

function toBase64(bytes) {
	return btoa(String.fromCharCode(...bytes));
}

describe('credential security', () => {
	it('hashes passwords with a salted, iterated format', async () => {
		const { salt, hash } = await cryptoUtils.hashPassword('correct horse battery staple');

		expect(hash).toMatch(/^pbkdf2_sha256\$210000\$/);
		expect(await cryptoUtils.verifyPassword('correct horse battery staple', salt, hash)).toBe(true);
		expect(await cryptoUtils.verifyPassword('incorrect', salt, hash)).toBe(false);
		expect(cryptoUtils.needsRehash(hash)).toBe(false);
	}, 20_000);

	it('accepts a legacy hash only for migration', async () => {
		const salt = cryptoUtils.generateSalt();
		const digest = await crypto.subtle.digest('SHA-256', encoder.encode(`${salt}legacy-password`));
		const legacyHash = toBase64(new Uint8Array(digest));

		expect(await cryptoUtils.verifyPassword('legacy-password', salt, legacyHash)).toBe(true);
		expect(cryptoUtils.needsRehash(legacyHash)).toBe(true);
	});

	it('signs scoped JWTs with mandatory expiration', async () => {
		const c = { env: { jwt_secret: 'test-only-jwt-secret-that-is-long-enough' } };
		const token = await jwtUtils.generateToken(c, { scope: 'public' }, 60);
		const payload = await jwtUtils.verifyToken(c, token);

		expect(payload.scope).toBe('public');
		expect(payload.exp).toBeGreaterThan(payload.iat);
		await expect(jwtUtils.generateToken(c, {}, 0)).rejects.toThrow(/expiration/);
	});
});

describe('HTTP security boundaries', () => {
	it('serves the application with a restrictive content security policy', async () => {
		const response = await SELF.fetch('https://example.com/');
		const csp = response.headers.get('content-security-policy');

		expect(response.status).toBe(200);
		expect(csp).toContain("object-src 'none'");
		expect(csp).toContain("frame-ancestors 'none'");
	});

	it('rejects unauthenticated protected API requests', async () => {
		const response = await SELF.fetch('https://example.com/api/my/loginUserInfo');
		const body = await response.json();

		expect(response.status).toBe(401);
		expect(body.code).toBe(401);
		expect(response.headers.get('x-content-type-options')).toBe('nosniff');
		expect(response.headers.get('cache-control')).toBe('no-store');
	});

	it('renders untrusted email HTML only inside a script-disabled sandbox', () => {
		const page = emailHtmlTemplate('<script>top.location="https://evil.example"</script><img src="{{domain}}attachments/a.png">', 'view-token');

		expect(page).toContain('sandbox="allow-same-origin"');
		expect(page).not.toContain('allow-scripts');
		expect(page).toContain('access_token=view-token');
		expect(page).toContain('&lt;script&gt;');
	});
});
