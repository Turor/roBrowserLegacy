/**
 * Core/DataManifest.js
 *
 * Two-level signed data manifest (GDAT2ROOT + GDAT2SHARD).
 *
 * The client verifies a detached Ed25519 signature over the canonical root,
 * fetches shards lazily, and SHA-256-checks file bytes before cache and use.
 * Default mode is report: failures are logged and loads continue. Enforce
 * fails closed after a manifest is required. See docs/data-manifest.md.
 */

import { legacyCacheName, normalizeManifestPath, shardIdOf } from 'Core/ManifestPath.js';

/** Release public key. The matching seed stays on the signing controller. */
export const EMBEDDED_RELEASE_PUBLIC_KEY_HEX = 'fb3dd3d6b9e1955ee03a4786596f7d5562b7d96d7b6c177e6d38cf7abca7de18';

const MAX_U64 = 18446744073709551615n;
const MAX_NEXT_KEYS = 8;
const MAX_STORED_KEYS = 32;
const MAX_ROOT_BYTES = 1024 * 1024;
const MAX_SHARD_BYTES = 16 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 20000;

const IDB_NAME = 'robrowser-data-manifest';
const IDB_STORE = 'hosts';

/**
 * @param {string} level
 * @param {string} message
 */
let manifestLogger = (level, message) => {
	if (level === 'info') {
		console.info(message);
	} else {
		console.warn(message);
	}
};

/**
 * @param {(level: string, message: string) => void} logger
 */
export function setDataManifestLogger(logger) {
	if (typeof logger === 'function') {
		manifestLogger = logger;
	}
}

/**
 * @param {Uint8Array|ArrayBuffer} bytes
 * @returns {string}
 */
export function bytesToHex(bytes) {
	const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
	let out = '';
	for (let i = 0; i < view.length; i++) {
		out += view[i].toString(16).padStart(2, '0');
	}
	return out;
}

/**
 * @param {string} hex
 * @returns {Uint8Array|null}
 */
export function hexToBytes(hex) {
	if (typeof hex !== 'string' || hex.length % 2 !== 0 || !/^[0-9a-f]+$/.test(hex)) {
		return null;
	}
	const out = new Uint8Array(hex.length / 2);
	for (let i = 0; i < out.length; i++) {
		out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
	}
	return out;
}

/**
 * @param {string} text
 * @param {boolean} allowZero
 * @returns {bigint|null}
 */
export function parseDecimal(text, allowZero) {
	if (typeof text !== 'string' || !/^(0|[1-9][0-9]*)$/.test(text)) {
		return null;
	}
	const value = BigInt(text);
	if (value > MAX_U64) {
		return null;
	}
	if (!allowZero && value === 0n) {
		return null;
	}
	return value;
}

/**
 * @param {Uint8Array|ArrayBuffer} data
 * @returns {Promise<string>}
 */
export async function sha256Hex(data) {
	const digest = await crypto.subtle.digest('SHA-256', copyBytes(data));
	return bytesToHex(new Uint8Array(digest));
}

/**
 * Canonical GDAT2ROOT document. `shards` is a Map of id → {sha256, size}.
 *
 * @param {object} doc
 * @returns {string}
 */
export function encodeRoot(doc) {
	let out = `GDAT2ROOT\n${doc.version}\n${doc.previousVersion}\n${doc.createdUnix}\n256\n`;
	for (let i = 0; i < 256; i++) {
		const id = i.toString(16).padStart(2, '0');
		const shard = doc.shards.get(id);
		out += `${id} ${shard.sha256} ${shard.size}\n`;
	}
	if (doc.nextKeys && doc.nextKeys.length) {
		out += `next-keys\n${doc.nextKeys.length}\n`;
		for (const key of doc.nextKeys) {
			out += `${key}\n`;
		}
	}
	return out;
}

/**
 * @param {object} doc
 * @returns {string}
 */
export function encodeShard(doc) {
	let out = `GDAT2SHARD\n${doc.version}\n${doc.id}\n${doc.entries.length}\n`;
	for (const entry of doc.entries) {
		out += `${entry.path}\n${entry.sha256}\n${entry.size}\n`;
	}
	return out;
}

/**
 * @param {string} text
 * @returns {{ok: true, text: string, version: bigint, previousVersion: bigint, createdUnix: bigint, shards: Map<string, {sha256: string, size: bigint}>, nextKeys: string[]}|{ok: false, reason: string}}
 */
export function parseRoot(text) {
	const lines = splitCanonical(text);
	if (!lines) {
		return fail('root encoding');
	}
	if (lines.length < 5 + 256 || lines[0] !== 'GDAT2ROOT') {
		return fail('root header');
	}
	const version = parseDecimal(lines[1], false);
	const previousVersion = parseDecimal(lines[2], true);
	const createdUnix = parseDecimal(lines[3], true);
	if (version === null || previousVersion === null || createdUnix === null || lines[4] !== '256') {
		return fail('root header');
	}
	const shards = new Map();
	for (let i = 0; i < 256; i++) {
		const id = i.toString(16).padStart(2, '0');
		const match = /^([0-9a-f]{2}) ([0-9a-f]{64}) (0|[1-9][0-9]*)$/.exec(lines[5 + i]);
		if (!match || match[1] !== id) {
			return fail('root shard line');
		}
		const size = parseDecimal(match[3], true);
		if (size === null) {
			return fail('root shard size');
		}
		shards.set(id, { sha256: match[2], size });
	}
	const rest = lines.slice(5 + 256);
	const nextKeys = [];
	if (rest.length) {
		if (rest[0] !== 'next-keys') {
			return fail('root trailing');
		}
		const count = parseDecimal(rest[1], false);
		if (count === null || count < 1n || count > BigInt(MAX_NEXT_KEYS)) {
			return fail('next-keys');
		}
		if (rest.length !== 2 + Number(count)) {
			return fail('next-keys');
		}
		for (let i = 0; i < Number(count); i++) {
			const key = rest[2 + i];
			if (!/^[0-9a-f]{64}$/.test(key) || /^0+$/.test(key)) {
				return fail('next-key');
			}
			if (i > 0 && key <= nextKeys[i - 1]) {
				return fail('next-key order');
			}
			nextKeys.push(key);
		}
	}
	const canonical = encodeRoot({ version, previousVersion, createdUnix, shards, nextKeys });
	if (canonical !== text) {
		return fail('root not canonical');
	}
	return { ok: true, text, version, previousVersion, createdUnix, shards, nextKeys };
}

/**
 * @param {string} text
 * @param {{version: bigint, id: string}} expected
 */
export async function parseShard(text, expected) {
	const lines = splitCanonical(text);
	if (!lines || lines.length < 4 || lines[0] !== 'GDAT2SHARD') {
		return fail('shard header');
	}
	const version = parseDecimal(lines[1], false);
	if (version === null || version !== expected.version || lines[2] !== expected.id) {
		return fail('shard header');
	}
	const count = parseDecimal(lines[3], true);
	if (count === null || BigInt(Number(count)) !== count) {
		return fail('shard count');
	}
	const total = Number(count);
	if (lines.length !== 4 + total * 3) {
		return fail('shard length');
	}
	const entries = [];
	const files = new Map();
	let previous = null;
	for (let i = 0; i < total; i++) {
		const path = lines[4 + i * 3];
		const sha256 = lines[4 + i * 3 + 1];
		const size = parseDecimal(lines[4 + i * 3 + 2], true);
		const norm = normalizeManifestPath(path);
		if (!norm.ok || norm.path !== path || size === null || !/^[0-9a-f]{64}$/.test(sha256)) {
			return fail('shard entry');
		}
		if ((await shardIdOf(path)) !== expected.id) {
			return fail('shard id');
		}
		if (previous !== null && utf8Compare(previous, path) >= 0) {
			return fail('shard order');
		}
		previous = path;
		files.set(path, { sha256, size });
		entries.push({ path, sha256, size });
	}
	const canonical = encodeShard({ version, id: expected.id, entries });
	if (canonical !== text) {
		return fail('shard not canonical');
	}
	return { ok: true, text, version, id: expected.id, files };
}

/**
 * 64-byte signature as 128 lowercase hex, with or without one trailing newline.
 *
 * @param {Uint8Array|ArrayBuffer|string} input
 * @returns {Uint8Array|null}
 */
export function parseDetachedSignature(input) {
	let text;
	if (typeof input === 'string') {
		text = input;
	} else {
		try {
			text = new TextDecoder('utf-8', { fatal: true }).decode(input);
		} catch {
			return null;
		}
	}
	if (text.endsWith('\n')) {
		text = text.slice(0, -1);
	}
	if (!/^[0-9a-f]{128}$/.test(text)) {
		return null;
	}
	return hexToBytes(text);
}

/**
 * @param {Uint8Array} publicKey
 * @param {Uint8Array} signature
 * @param {Uint8Array} message
 * @returns {Promise<boolean>}
 */
export async function verifyEd25519(publicKey, signature, message) {
	if (!publicKey || publicKey.length !== 32 || isZero(publicKey) || !signature || signature.length !== 64) {
		return false;
	}
	try {
		const key = await crypto.subtle.importKey('raw', publicKey, { name: 'Ed25519' }, false, ['verify']);
		return await crypto.subtle.verify({ name: 'Ed25519' }, key, signature, message);
	} catch {
		return false;
	}
}

/**
 * @param {Uint8Array} message
 * @param {Uint8Array} signature
 * @param {string[]} keyHexes
 * @returns {Promise<string|null>} the first key that verifies
 */
export async function verifyWithKeys(message, signature, keyHexes) {
	for (const hex of keyHexes) {
		const key = hexToBytes(hex);
		if (key && (await verifyEd25519(key, signature, message))) {
			return hex;
		}
	}
	return null;
}

/**
 * Decide whether bytes may be used and cached.
 * `fallback` tries another source, then uses the bytes in report mode.
 *
 * @param {{accepted: boolean, blocked: boolean, mode: string, legacyName: string}} state
 * @param {{kind: string, path?: string, reason?: string}} found
 * @param {boolean} bytesMatch
 * @param {string} source
 */
export function decideUse(state, found, bytesMatch, source) {
	const remote = source === 'http' || source === 'cache';
	const local = source === 'grf' || source === 'local';
	if (!state.accepted) {
		if (state.blocked && remote) {
			return { action: 'reject', save: false, saveAs: null, error: 'signed data manifest required' };
		}
		return {
			action: 'accept',
			save: source === 'http',
			saveAs: state.legacyName,
			error: null
		};
	}
	if (found.kind === 'listed') {
		if (bytesMatch) {
			return { action: 'accept', save: source === 'http', saveAs: found.path, error: null };
		}
		if (state.mode === 'enforce') {
			return { action: 'reject', save: false, saveAs: null, error: 'digest mismatch' };
		}
		return { action: 'fallback', save: false, saveAs: null, error: 'digest mismatch' };
	}
	if (found.kind === 'unlisted') {
		if (local) {
			return { action: 'accept', save: false, saveAs: null, error: null };
		}
		if (state.mode === 'enforce') {
			return { action: 'reject', save: false, saveAs: null, error: 'not in signed manifest' };
		}
		return { action: 'accept', save: false, saveAs: null, error: null };
	}
	if (local && found.kind === 'bad-path') {
		return { action: 'accept', save: false, saveAs: null, error: null };
	}
	if (state.mode === 'enforce') {
		return {
			action: 'reject',
			save: false,
			saveAs: null,
			error: found.reason || 'manifest check failed'
		};
	}
	if (local) {
		return { action: 'accept', save: false, saveAs: null, error: null };
	}
	return { action: 'fallback', save: false, saveAs: null, error: found.reason || 'manifest check failed' };
}

/**
 * @returns {{load: Function, save: Function}}
 */
export function createMemoryStore() {
	const data = new Map();
	return {
		async load(key) {
			const value = data.get(key);
			return value ? structuredClone(value) : null;
		},
		async save(key, value) {
			data.set(key, structuredClone(value));
		}
	};
}

/**
 * Persist the accepted root in IndexedDB (available to the file worker).
 *
 * @returns {{load: Function, save: Function}}
 */
export function createIndexedDbStore() {
	let dbPromise = null;
	const open = () => {
		if (!dbPromise) {
			dbPromise = new Promise((resolve, reject) => {
				if (typeof indexedDB === 'undefined' || !indexedDB) {
					reject(new Error('indexedDB unavailable'));
					return;
				}
				const request = indexedDB.open(IDB_NAME, 1);
				request.onupgradeneeded = () => {
					const db = request.result;
					if (!db.objectStoreNames.contains(IDB_STORE)) {
						db.createObjectStore(IDB_STORE);
					}
				};
				request.onsuccess = () => resolve(request.result);
				request.onerror = () => reject(request.error);
			});
		}
		return dbPromise;
	};
	const run = async (mode, fn) => {
		const db = await open();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(IDB_STORE, mode);
			const store = tx.objectStore(IDB_STORE);
			const request = fn(store);
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
	};
	return {
		load(key) {
			return run('readonly', store => store.get(key));
		},
		save(key, value) {
			return run('readwrite', store => store.put(value, key));
		}
	};
}

function defaultStore() {
	try {
		if (typeof indexedDB !== 'undefined' && indexedDB) {
			return createIndexedDbStore();
		}
	} catch {
		// Fall through to memory when storage cannot be opened.
	}
	return createMemoryStore();
}

export function createManifestSession(options) {
	return new ManifestSession(options);
}

class ManifestSession {
	constructor(options) {
		this.base = normalizeRemoteBase(options.base);
		this.mode = options.mode === 'enforce' ? 'enforce' : 'report';
		this.store = options.store;
		this.fetchImpl = options.fetchImpl;
		this.logger = options.logger || manifestLogger;
		this.embeddedKeyHex = options.embeddedKeyHex || EMBEDDED_RELEASE_PUBLIC_KEY_HEX;
		this.nextKeysHex = [];
		this.accepted = null;
		this.trusted = false;
		this.blocked = false;
		this.passthrough = false;
		this.cacheGeneration = 0;
		this.shards = new Map();
		this.shardLoads = new Map();
		this.events = [];
		this._seen = new Set();
		this._boot = null;
		this._refresh = null;
		this._seenHeader = null;
		this.settled = false;
	}

	bootstrap() {
		if (!this._boot) {
			this._boot = this._bootstrap().finally(() => {
				this.settled = true;
			});
		}
		return this._boot;
	}

	async noteServerVersion(raw) {
		const version = parseDecimal(String(raw).trim(), false);
		if (version === null) {
			return;
		}
		await this.bootstrap();
		if (!this.accepted || version > this.accepted.version) {
			this._seenHeader = version;
			await this.refresh();
		}
	}

	refresh() {
		if (this._refresh) {
			return this._refresh;
		}
		this._refresh = this._refreshBody().finally(() => {
			this._refresh = null;
		});
		return this._refresh;
	}

	async assess(filename, bytes, source) {
		await this.bootstrap();
		const view = toUint8(bytes);
		const state = {
			accepted: !!this.accepted,
			blocked: this.blocked,
			mode: this.mode,
			legacyName: legacyCacheName(filename)
		};
		if (!this.accepted) {
			return decideUse(state, { kind: 'none' }, true, source);
		}
		const found = await this.lookup(filename);
		let bytesMatch = false;
		if (found.kind === 'listed') {
			bytesMatch = await bytesMatchEntry(view, found);
		}
		this._logFound(filename, found, bytesMatch, source);
		return decideUse(state, found, bytesMatch, source);
	}

	async lookup(filename) {
		const norm = normalizeManifestPath(filename);
		if (!norm.ok) {
			return { kind: 'bad-path', reason: 'path rejected' };
		}
		const id = await shardIdOf(norm.path);
		const shard = await this.loadShard(id);
		if (!shard.ok) {
			return { kind: 'unverified', path: norm.path, reason: shard.reason || 'shard rejected' };
		}
		const entry = shard.files.get(norm.path);
		if (!entry) {
			return { kind: 'unlisted', path: norm.path };
		}
		return { kind: 'listed', path: norm.path, sha256: entry.sha256, size: entry.size };
	}

	async loadShard(id) {
		if (this.shards.has(id)) {
			return this.shards.get(id);
		}
		if (this.shardLoads.has(id)) {
			return this.shardLoads.get(id);
		}
		const pending = this._loadShard(id);
		this.shardLoads.set(id, pending);
		try {
			const parsed = await pending;
			this.shards.set(id, parsed);
			return parsed;
		} finally {
			this.shardLoads.delete(id);
		}
	}

	trustedKeyHexes() {
		const keys = [this.embeddedKeyHex];
		for (const key of this.nextKeysHex) {
			if (!keys.includes(key)) {
				keys.push(key);
			}
		}
		return keys;
	}

	async _bootstrap() {
		let stored = null;
		let storeFailed = false;
		try {
			stored = await this.store.load(this.base);
		} catch {
			storeFailed = true;
			this.note('warn', 'store', 'failed to read accepted manifest');
		}
		if (storeFailed && this.mode === 'enforce') {
			this.blocked = true;
			return;
		}
		if (stored && typeof stored.root === 'string' && typeof stored.signature === 'string') {
			this.nextKeysHex = mergeNextKeys(this.embeddedKeyHex, stored.nextKeys, []);
			const verified = await this._verifyRootText(stored.root, stored.signature);
			if (verified.ok && verified.root.version.toString() === String(stored.version)) {
				this.accepted = verified.root;
				this.accepted.signatureHex = stored.signature;
				this.trusted = true;
				this.cacheGeneration = Number(stored.cacheGeneration) || 1;
				this.nextKeysHex = mergeNextKeys(this.embeddedKeyHex, this.nextKeysHex, verified.root.nextKeys);
			} else {
				this.nextKeysHex = mergeNextKeys(this.embeddedKeyHex, stored.nextKeys, []);
				this.note('warn', 'reverify', 'persisted root rejected');
				if (this.mode === 'enforce') {
					this.blocked = true;
				}
			}
		}
		await this.refresh();
	}

	async _refreshBody() {
		const live = await this._fetchLiveVersion();
		let target = live;
		if (this._seenHeader !== null && (target === null || this._seenHeader > target)) {
			target = this._seenHeader;
		}
		if (this.accepted && target !== null && target < this.accepted.version) {
			this.note('warn', 'rollback', `server version ${target} < accepted ${this.accepted.version}`);
			return;
		}
		if (this.accepted && target !== null && target === this.accepted.version && this._seenHeader === null) {
			return;
		}
		if (this.accepted && target !== null && target === this.accepted.version && this._seenHeader === target) {
			return;
		}
		const fetched = await this._fetchRoot(target);
		if (!fetched.ok) {
			this._onRootUnavailable(fetched.reason);
			return;
		}
		const verified = await this._verifyRootBytes(fetched.root, fetched.sig);
		if (!verified.ok) {
			this._onRootRejected(verified.reason);
			return;
		}
		await this._acceptNew(verified.root, verified.signatureHex);
	}

	_onRootUnavailable(reason) {
		if (this.trusted || this.accepted) {
			this.note('warn', 'missing-manifest', reason || 'manifest unavailable');
			return;
		}
		if (this.mode === 'enforce') {
			this.blocked = true;
			this.note('warn', 'missing-manifest', reason || 'manifest unavailable');
			return;
		}
		this.passthrough = true;
		this.note('info', 'unsigned', 'no published signature; report mode will not block loads');
	}

	_onRootRejected(reason) {
		if (this.trusted || this.accepted || this.mode === 'enforce') {
			this.note('warn', 'bad-signature', reason || 'manifest rejected');
			if (!this.accepted && this.mode === 'enforce') {
				this.blocked = true;
			}
			return;
		}
		this.passthrough = true;
		this.note('warn', 'bad-signature', reason || 'manifest rejected');
	}

	async _acceptNew(root, signatureHex) {
		if (this.accepted && root.version < this.accepted.version) {
			this.note('warn', 'rollback', `refusing version ${root.version} < ${this.accepted.version}`);
			return;
		}
		if (this.accepted && root.version === this.accepted.version) {
			if (root.text !== this.accepted.text) {
				this.note('warn', 'rollback', `version ${root.version} document changed`);
			}
			return;
		}
		const generation = (this.cacheGeneration || 0) + 1;
		this.accepted = root;
		this.accepted.signatureHex = signatureHex;
		this.trusted = true;
		this.blocked = false;
		this.passthrough = false;
		this.cacheGeneration = generation;
		this.shards.clear();
		this.shardLoads.clear();
		this.nextKeysHex = mergeNextKeys(this.embeddedKeyHex, this.nextKeysHex, root.nextKeys);
		this.note('info', 'accepted', `version ${root.version} generation ${generation}`);
		try {
			await this.store.save(this.base, {
				version: root.version.toString(),
				root: root.text,
				signature: signatureHex,
				nextKeys: this.nextKeysHex,
				cacheGeneration: generation
			});
		} catch {
			this.note('warn', 'store', 'failed to persist accepted manifest');
		}
	}

	async _fetchLiveVersion() {
		const res = await this._request('version', 'no-store');
		if (!res.ok || !res.body) {
			return null;
		}
		try {
			const text = new TextDecoder('utf-8', { fatal: true }).decode(res.body);
			const json = JSON.parse(text);
			return parseDecimal(String(json && json.version).trim(), false);
		} catch {
			return null;
		}
	}

	async _fetchRoot(version) {
		const prefix = version === null || version === undefined ? 'data-manifest' : `data-manifest/v/${version}`;
		const root = await this._request(`${prefix}/root`, 'no-store');
		const sig = await this._request(`${prefix}/root.sig`, 'no-store');
		if (!root.transportOk || !sig.transportOk) {
			return { ok: false, reason: 'manifest fetch failed' };
		}
		if (!root.ok || !sig.ok) {
			return { ok: false, reason: `manifest http ${root.status}/${sig.status}` };
		}
		return { ok: true, root: root.body, sig: sig.body };
	}

	async _loadShard(id) {
		if (!this.accepted) {
			return fail('no root');
		}
		const meta = this.accepted.shards.get(id);
		if (!meta) {
			return fail(`shard ${id} missing from root`);
		}
		const res = await this._request(`data-manifest/v/${this.accepted.version}/shards/${id}`, 'default');
		if (!res.transportOk) {
			return fail(`shard ${id} fetch failed`);
		}
		if (!res.ok || !res.body) {
			return fail(`shard ${id} http ${res.status}`);
		}
		if (res.body.byteLength > MAX_SHARD_BYTES || BigInt(res.body.byteLength) !== meta.size) {
			return fail(`shard ${id} size`);
		}
		const view = new Uint8Array(res.body);
		if ((await sha256Hex(view)) !== meta.sha256) {
			return fail(`shard ${id} digest`);
		}
		const text = decodeExact(view);
		if (text === null) {
			return fail(`shard ${id} encoding`);
		}
		return parseShard(text, { version: this.accepted.version, id });
	}

	async _verifyRootBytes(rootBuffer, sigBuffer) {
		if (!rootBuffer || rootBuffer.byteLength > MAX_ROOT_BYTES) {
			return { ok: false, reason: 'root size' };
		}
		const bytes = new Uint8Array(rootBuffer);
		const text = decodeExact(bytes);
		if (text === null) {
			return { ok: false, reason: 'root encoding' };
		}
		const signature = parseDetachedSignature(sigBuffer);
		if (!signature) {
			return { ok: false, reason: 'signature encoding' };
		}
		const root = parseRoot(text);
		if (!root.ok) {
			return { ok: false, reason: root.reason };
		}
		const key = await verifyWithKeys(bytes, signature, this.trustedKeyHexes());
		if (!key) {
			return { ok: false, reason: 'signature rejected' };
		}
		return { ok: true, root, signatureHex: bytesToHex(signature) };
	}

	async _verifyRootText(text, signatureHex) {
		const bytes = new TextEncoder().encode(text);
		const signature = parseDetachedSignature(signatureHex);
		if (!signature) {
			return { ok: false, reason: 'signature encoding' };
		}
		const root = parseRoot(text);
		if (!root.ok) {
			return root;
		}
		const key = await verifyWithKeys(bytes, signature, this.trustedKeyHexes());
		if (!key) {
			return { ok: false, reason: 'signature rejected' };
		}
		return { ok: true, root };
	}

	async _request(path, cacheMode) {
		if (typeof this.fetchImpl !== 'function') {
			return { transportOk: false, ok: false, status: 0, body: null };
		}
		const url = endpoint(this.base, path);
		const opts = { cache: cacheMode, credentials: 'omit' };
		if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
			opts.signal = AbortSignal.timeout(FETCH_TIMEOUT_MS);
		}
		try {
			const response = await this.fetchImpl(url, opts);
			const status = response && typeof response.status === 'number' ? response.status : 0;
			let body = null;
			if (response && typeof response.arrayBuffer === 'function') {
				body = await response.arrayBuffer();
			}
			return { transportOk: true, ok: status === 200, status, body, response };
		} catch {
			return { transportOk: false, ok: false, status: 0, body: null, response: null };
		}
	}

	_logFound(filename, found, bytesMatch, source) {
		const remote = source === 'http' || source === 'cache';
		if (found.kind === 'listed' && !bytesMatch) {
			this.note('warn', 'digest-mismatch', found.path);
		} else if (found.kind === 'unlisted' && remote) {
			this.note('warn', 'unlisted', found.path);
		} else if (found.kind === 'unverified') {
			this.note('warn', 'shard', `${found.path}: ${found.reason}`);
		} else if (found.kind === 'bad-path' && remote) {
			this.note('warn', 'path', String(filename));
		}
	}

	note(level, code, detail) {
		const key = `${code}\0${detail}`;
		if (this._seen.has(key)) {
			return;
		}
		this._seen.add(key);
		const message = `[data-manifest] ${code}: ${detail}`;
		this.events.push({ level, code, detail, message });
		try {
			this.logger(level, message);
		} catch {
			// Logging must not break file loads.
		}
	}
}

const dataManifestState = {
	mode: 'report',
	session: null,
	ready: null,
	store: null,
	fetchImpl: null
};

export const dataManifest = {
	/**
	 * @param {{remoteClient: string, mode?: string, store?: object, fetchImpl?: Function, embeddedKeyHex?: string}} options
	 */
	configure(options) {
		const base = normalizeRemoteBase(options.remoteClient);
		const mode = options.mode === 'enforce' ? 'enforce' : 'report';
		dataManifestState.mode = mode;
		if (options.store) {
			dataManifestState.store = options.store;
		}
		if (options.fetchImpl) {
			dataManifestState.fetchImpl = options.fetchImpl;
		}
		if (!base) {
			return;
		}
		const current = dataManifestState.session;
		if (current && current.base === base && current.mode === mode && dataManifestState.ready) {
			return;
		}
		const session = createManifestSession({
			base,
			mode,
			store: dataManifestState.store || defaultStore(),
			fetchImpl: dataManifestState.fetchImpl || globalThis.fetch,
			embeddedKeyHex: options.embeddedKeyHex
		});
		dataManifestState.session = session;
		dataManifestState.ready = session.bootstrap();
	},

	/**
	 * Start verification for a remote client if SET_HOST has not done it yet.
	 *
	 * @param {string} remoteClient
	 * @returns {Promise<void>}
	 */
	ensureReady(remoteClient) {
		const base = normalizeRemoteBase(remoteClient);
		if (!base) {
			return Promise.resolve();
		}
		if (!dataManifestState.session || dataManifestState.session.base !== base) {
			this.configure({ remoteClient: base, mode: dataManifestState.mode });
		}
		return dataManifestState.ready || Promise.resolve();
	},

	/**
	 * True once an accepted manifest or an enforce block is in force.
	 * Audio URL shortcuts stay on the legacy path until this is true.
	 */
	requiresByteCheck() {
		const session = dataManifestState.session;
		if (!session || !session.settled) {
			return false;
		}
		return !!(session.accepted || session.blocked);
	},

	/**
	 * @param {string} filename
	 * @param {ArrayBuffer|Uint8Array} bytes
	 * @param {string} source
	 */
	async assess(filename, bytes, source) {
		if (!dataManifestState.session) {
			return {
				action: 'accept',
				save: source === 'http',
				saveAs: legacyCacheName(filename),
				error: null
			};
		}
		await (dataManifestState.ready || Promise.resolve());
		return dataManifestState.session.assess(filename, bytes, source);
	},

	/**
	 * @param {string|number} version
	 */
	async noteServerVersion(version) {
		if (!dataManifestState.session) {
			return;
		}
		await dataManifestState.session.noteServerVersion(version);
	},

	/** @returns {ManifestSession|null} */
	session() {
		return dataManifestState.session;
	}
};

/**
 * @param {string} remote
 * @returns {string}
 */
export function normalizeRemoteBase(remote) {
	if (typeof remote !== 'string') {
		return '';
	}
	const base = remote.trim();
	if (!base) {
		return '';
	}
	return base.endsWith('/') ? base : `${base}/`;
}

function endpoint(base, path) {
	const rel = path.replace(/^\//, '');
	try {
		return new URL(rel, base).toString();
	} catch {
		return base + rel;
	}
}

function splitCanonical(text) {
	if (typeof text !== 'string' || !text.endsWith('\n') || text.includes('\r') || text.includes('\0')) {
		return null;
	}
	const lines = text.split('\n');
	lines.pop();
	return lines;
}

function fail(reason) {
	return { ok: false, reason };
}

function isZero(bytes) {
	for (const b of bytes) {
		if (b !== 0) {
			return false;
		}
	}
	return true;
}

function utf8Compare(a, b) {
	const left = new TextEncoder().encode(a);
	const right = new TextEncoder().encode(b);
	const count = Math.min(left.length, right.length);
	for (let i = 0; i < count; i++) {
		if (left[i] !== right[i]) {
			return left[i] - right[i];
		}
	}
	return left.length - right.length;
}

function decodeExact(bytes) {
	try {
		const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
		const again = new TextEncoder().encode(text);
		if (again.length !== bytes.length) {
			return null;
		}
		for (let i = 0; i < again.length; i++) {
			if (again[i] !== bytes[i]) {
				return null;
			}
		}
		return text;
	} catch {
		return null;
	}
}

function copyBytes(data) {
	if (data == null) {
		return new Uint8Array(0);
	}
	// ArrayBuffer.isView is cross-realm. A fresh copy also avoids hashing a
	// view's underlying buffer past the bytes that were actually served.
	if (ArrayBuffer.isView(data)) {
		const out = new Uint8Array(data.byteLength);
		out.set(data);
		return out;
	}
	if (typeof data.byteLength === 'number') {
		return new Uint8Array(data);
	}
	return new Uint8Array(0);
}

function toUint8(bytes) {
	return copyBytes(bytes);
}

async function bytesMatchEntry(view, found) {
	if (BigInt(view.byteLength) !== found.size) {
		return false;
	}
	return (await sha256Hex(view)) === found.sha256;
}

function mergeNextKeys(embedded, existing, incoming) {
	const set = new Set();
	for (const key of [...(existing || []), ...(incoming || [])]) {
		if (typeof key !== 'string' || !/^[0-9a-f]{64}$/.test(key) || /^0+$/.test(key)) {
			continue;
		}
		if (key === embedded) {
			continue;
		}
		set.add(key);
	}
	return [...set].sort().slice(-MAX_STORED_KEYS);
}
