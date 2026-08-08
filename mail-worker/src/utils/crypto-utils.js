const encoder = new TextEncoder();
const PBKDF2_ITERATIONS = 210_000;
const PBKDF2_PREFIX = 'pbkdf2_sha256';

function toBase64(bytes) {
	return btoa(String.fromCharCode(...bytes));
}

function fromBase64(value) {
	return Uint8Array.from(atob(value), char => char.charCodeAt(0));
}

async function secureEqual(left, right) {
	const [leftHash, rightHash] = await Promise.all([
		crypto.subtle.digest('SHA-256', encoder.encode(left || '')),
		crypto.subtle.digest('SHA-256', encoder.encode(right || '')),
	]);
	return crypto.subtle.timingSafeEqual(leftHash, rightHash);
}

const saltHashUtils = {

	generateSalt(length = 16) {
		const array = new Uint8Array(length);
		crypto.getRandomValues(array);
		return toBase64(array);
	},


	async hashPassword(password) {
		const salt = this.generateSalt();
		const hash = await this.genHashPassword(password, salt);
		return { salt, hash };
	},

	async genHashPassword(password, salt, iterations = PBKDF2_ITERATIONS) {
		const key = await crypto.subtle.importKey(
			'raw',
			encoder.encode(password),
			'PBKDF2',
			false,
			['deriveBits']
		);
		const bits = await crypto.subtle.deriveBits({
			name: 'PBKDF2',
			hash: 'SHA-256',
			salt: fromBase64(salt),
			iterations,
		}, key, 256);
		return `${PBKDF2_PREFIX}$${iterations}$${toBase64(new Uint8Array(bits))}`;
	},

	async verifyPassword(inputPassword, salt, storedHash) {
		if (!inputPassword || !salt || !storedHash) return false;

		if (storedHash.startsWith(`${PBKDF2_PREFIX}$`)) {
			const parts = storedHash.split('$');
			if (parts.length !== 3) return false;
			const [, iterationValue] = parts;
			const iterations = Number(iterationValue);
			if (!Number.isSafeInteger(iterations) || iterations < 100_000 || iterations > PBKDF2_ITERATIONS * 2) return false;
			try {
				const hash = await this.genHashPassword(inputPassword, salt, iterations);
				return secureEqual(hash, storedHash);
			} catch {
				return false;
			}
		}

		// Legacy SHA-256 hashes are accepted once and upgraded after login.
		const legacyBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(salt + inputPassword));
		return secureEqual(toBase64(new Uint8Array(legacyBuffer)), storedHash);
	},

	needsRehash(storedHash) {
		if (!storedHash?.startsWith(`${PBKDF2_PREFIX}$`)) return true;
		const iterations = Number(storedHash.split('$')[1]);
		return iterations < PBKDF2_ITERATIONS;
	},

	secureEqual,

	genRandomPwd(length = 24) {
		const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		const random = new Uint8Array(length);
		crypto.getRandomValues(random);
		let result = '';
		for (let i = 0; i < length; i++) {
			result += chars.charAt(random[i] % chars.length);
		}
		return result;
	}
};

export default saltHashUtils;
