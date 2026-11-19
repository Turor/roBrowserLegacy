/**
 * Core/ManifestPath.js
 *
 * Shared manifest v2 path normalization.
 *
 * Manifest keys are compared only after NormalizeManifestPath. Callers that
 * still have a percent-encoded URL path must use DecodeThenNormalize.
 */

const MAX_PATH_BYTES = 512;

/**
 * @param {string} input
 * @returns {{ok: boolean, path: string}}
 */
export function normalizeManifestPath(input) {
	if (typeof input !== 'string' || !isUnicodeScalar(input) || hasC0OrDel(input)) {
		return { ok: false, path: '' };
	}

	let path = input.toLowerCase();
	path = path.replace(/\\/g, '/');
	if (path.startsWith('/')) {
		path = path.slice(1);
	}
	path = path.replace(/\/{2,}/g, '/');
	while (path.startsWith('./')) {
		path = path.slice(2);
	}
	if (path.endsWith('/')) {
		path = path.slice(0, -1);
	}
	if (path === 'data') {
		path = '';
	} else if (path.startsWith('data/')) {
		path = path.slice(5);
	}

	if (!path || utf8ByteLength(path) > MAX_PATH_BYTES) {
		return { ok: false, path: '' };
	}
	if (path.includes('\\') || path.includes(':')) {
		return { ok: false, path: '' };
	}
	const segments = path.split('/');
	for (const segment of segments) {
		if (segment === '' || segment === '.' || segment === '..') {
			return { ok: false, path: '' };
		}
	}
	return { ok: true, path };
}

/**
 * Percent-decode a URL path, then normalize. Inputs with no % skip decoding.
 *
 * @param {string} input
 * @returns {{ok: boolean, path: string}}
 */
export function decodeThenNormalize(input) {
	if (typeof input !== 'string') {
		return { ok: false, path: '' };
	}
	if (!input.includes('%')) {
		return normalizeManifestPath(input);
	}
	const decoded = percentDecode(input);
	if (decoded === null) {
		return { ok: false, path: '' };
	}
	return normalizeManifestPath(decoded);
}

/**
 * First byte of SHA-256(UTF-8 path), as two lowercase hex digits.
 *
 * @param {string} normalizedPath
 * @returns {Promise<string>}
 */
export async function shardIdOf(normalizedPath) {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalizedPath));
	const first = new Uint8Array(digest)[0];
	return first.toString(16).padStart(2, '0');
}

/**
 * Cache lookup names: normalized manifest key first, then the legacy slash form.
 *
 * @param {string} filename
 * @returns {string[]}
 */
export function cacheLookupNames(filename) {
	const names = [];
	const norm = normalizeManifestPath(filename);
	if (norm.ok) {
		names.push(norm.path);
	}
	const legacy = legacyCacheName(filename);
	if (!names.includes(legacy)) {
		names.push(legacy);
	}
	return names;
}

/**
 * @param {string} filename
 * @returns {string}
 */
export function legacyCacheName(filename) {
	return String(filename).replace(/\\/g, '/');
}

/**
 * @param {string} input
 * @returns {string|null}
 */
export function percentDecode(input) {
	const bytes = [];
	for (let i = 0; i < input.length;) {
		const cp = input.codePointAt(i);
		if (cp === 0x25) {
			if (i + 2 >= input.length) {
				return null;
			}
			const hex = input.slice(i + 1, i + 3);
			if (!/^[0-9A-Fa-f]{2}$/.test(hex)) {
				return null;
			}
			bytes.push(parseInt(hex, 16));
			i += 3;
			continue;
		}
		if (cp <= 0x7f) {
			bytes.push(cp);
		} else {
			const encoded = new TextEncoder().encode(String.fromCodePoint(cp));
			for (const b of encoded) {
				bytes.push(b);
			}
		}
		i += cp > 0xffff ? 2 : 1;
	}
	try {
		return new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes));
	} catch {
		return null;
	}
}

function isUnicodeScalar(input) {
	for (let i = 0; i < input.length; i++) {
		const c = input.charCodeAt(i);
		if (c >= 0xd800 && c <= 0xdbff) {
			const next = input.charCodeAt(i + 1);
			if (!(next >= 0xdc00 && next <= 0xdfff)) {
				return false;
			}
			i++;
			continue;
		}
		if (c >= 0xdc00 && c <= 0xdfff) {
			return false;
		}
	}
	return true;
}

function hasC0OrDel(input) {
	for (const ch of input) {
		const cp = ch.codePointAt(0);
		if (cp <= 0x1f || cp === 0x7f) {
			return true;
		}
	}
	return false;
}

function utf8ByteLength(input) {
	return new TextEncoder().encode(input).length;
}
