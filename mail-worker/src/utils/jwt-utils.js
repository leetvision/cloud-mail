const encoder = new TextEncoder();
const decoder = new TextDecoder();

function getSecret(c) {
	const secret = c.env.jwt_secret;
	if (typeof secret !== 'string' || secret.length < 32) {
		throw new Error('JWT secret is not configured securely');
	}
	return secret;
}

const base64url = (input) => {
	const str = btoa(String.fromCharCode(...new Uint8Array(input)));
	return str.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
};

const base64urlDecode = (str) => {
	str = str.replace(/-/g, '+').replace(/_/g, '/');
	while (str.length % 4) str += '=';
	return Uint8Array.from(atob(str), c => c.charCodeAt(0));
};

const jwtUtils = {
	async generateToken(c, payload, expiresInSeconds) {
		const header = {
			alg: 'HS256',
			typ: 'JWT'
		};

		const now = Math.floor(Date.now() / 1000);
		if (!Number.isSafeInteger(expiresInSeconds) || expiresInSeconds <= 0) {
			throw new Error('A positive JWT expiration is required');
		}
		const exp = now + expiresInSeconds;

		const fullPayload = {
			...payload,
			iat: now,
			exp,
			iss: 'cloud-mail',
			aud: 'cloud-mail'
		};

		const headerStr = base64url(encoder.encode(JSON.stringify(header)));
		const payloadStr = base64url(encoder.encode(JSON.stringify(fullPayload)));
		const data = `${headerStr}.${payloadStr}`;

		const key = await crypto.subtle.importKey(
			'raw',
			encoder.encode(getSecret(c)),
			{ name: 'HMAC', hash: 'SHA-256' },
			false,
			['sign']
		);

		const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
		const signatureStr = base64url(signature);

		return `${data}.${signatureStr}`;
	},

	async verifyToken(c, token) {
		try {
			if (typeof token !== 'string') return null;
			const parts = token.split('.');
			if (parts.length !== 3) return null;
			const [headerB64, payloadB64, signatureB64] = parts;

			if (!headerB64 || !payloadB64 || !signatureB64) return null;

			const header = JSON.parse(decoder.decode(base64urlDecode(headerB64)));
			if (header.alg !== 'HS256' || header.typ !== 'JWT') return null;

			const data = `${headerB64}.${payloadB64}`;
			const key = await crypto.subtle.importKey(
				'raw',
				encoder.encode(getSecret(c)),
				{ name: 'HMAC', hash: 'SHA-256' },
				false,
				['verify']
			);

			const valid = await crypto.subtle.verify(
				'HMAC',
				key,
				base64urlDecode(signatureB64),
				encoder.encode(data)
			);

			if (!valid) return null;

			const payloadJson = decoder.decode(base64urlDecode(payloadB64));
			const payload = JSON.parse(payloadJson);

			const now = Math.floor(Date.now() / 1000);
			if (!Number.isSafeInteger(payload.exp) || payload.exp <= now) return null;
			if (payload.iss !== 'cloud-mail' || payload.aud !== 'cloud-mail') return null;

			return payload;

		} catch (err) {
			console.log(err)
			return null;
		}
	}
};

export default jwtUtils;
