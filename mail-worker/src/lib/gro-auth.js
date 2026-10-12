export async function groHash(body) {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body));
	return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
export async function groSignature(secret, timestamp, method, path, body) {
	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const signature = await crypto.subtle.sign(
		'HMAC',
		key,
		new TextEncoder().encode(`${timestamp}.${method}.${path}.${body}`)
	);
	return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
export async function verifyGroRequest(request, body, secret, now = Date.now()) {
	if (!secret || secret.length < 32) return false;
	const timestamp = request.headers.get('x-cloud-mail-timestamp') || '',
		signature = request.headers.get('x-cloud-mail-signature') || '';
	if (
		!/^\d{13}$/.test(timestamp) ||
		Math.abs(now - Number(timestamp)) > 300_000 ||
		!/^[0-9a-f]{64}$/.test(signature)
	)
		return false;
	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['verify']
	);
	return crypto.subtle.verify(
		'HMAC',
		key,
		Uint8Array.from(signature.match(/../g), (byte) => parseInt(byte, 16)),
		new TextEncoder().encode(
			`${timestamp}.${request.method}.${new URL(request.url).pathname}.${body}`
		)
	);
}
export function groAddressAllowed(env, address) {
	return (
		typeof address === 'string' &&
		Array.isArray(env.GRO_MAIL_DOMAINS) &&
		env.GRO_MAIL_DOMAINS.includes(address.toLowerCase().split('@')[1])
	);
}
