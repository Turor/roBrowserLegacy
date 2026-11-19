import { describe, expect, it } from 'vitest';
import {
	EMBEDDED_RELEASE_PUBLIC_KEY_HEX,
	bytesToHex,
	createManifestSession,
	createMemoryStore,
	decideUse,
	encodeRoot,
	encodeShard,
	parseDetachedSignature,
	parseRoot,
	sha256Hex,
	verifyEd25519
} from 'Core/DataManifest.js';
import { shardIdOf } from 'Core/ManifestPath.js';

const BASE = 'https://data.example.invalid/client/';

function copyView(data) {
	const out = new Uint8Array(data.byteLength);
	out.set(data);
	return out;
}

async function generateKey() {
	const kp = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
	const raw = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
	return { kp, hex: bytesToHex(raw) };
}

async function signText(kp, text) {
	const sig = new Uint8Array(
		await crypto.subtle.sign({ name: 'Ed25519' }, kp.privateKey, new TextEncoder().encode(text))
	);
	return bytesToHex(sig);
}

async function buildPublished({ version, previous = 0n, created = 1_700_000_000n, files, nextKeys = [], signer }) {
	const grouped = new Map();
	for (const file of files) {
		const id = await shardIdOf(file.path);
		if (!grouped.has(id)) {
			grouped.set(id, []);
		}
		const body = typeof file.bytes === 'string' ? new TextEncoder().encode(file.bytes) : copyView(file.bytes);
		grouped.get(id).push({
			path: file.path,
			sha256: await sha256Hex(body),
			size: BigInt(body.byteLength)
		});
	}
	for (const entries of grouped.values()) {
		entries.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
	}
	const shards = new Map();
	const texts = new Map();
	for (let i = 0; i < 256; i++) {
		const id = i.toString(16).padStart(2, '0');
		const text = encodeShard({ version, id, entries: grouped.get(id) || [] });
		const bytes = new TextEncoder().encode(text);
		texts.set(id, text);
		shards.set(id, { sha256: await sha256Hex(bytes), size: BigInt(bytes.length) });
	}
	const root = encodeRoot({
		version,
		previousVersion: previous,
		createdUnix: created,
		shards,
		nextKeys
	});
	const signature = `${await signText(signer, root)}\n`;
	return { root, signature, texts, version };
}

function mockFetch(routes) {
	const calls = [];
	const impl = async url => {
		const u = String(url);
		calls.push(u);
		const hit = routes.find(route => u.endsWith(route.suffix));
		const status = hit ? hit.status : 404;
		const raw = hit && hit.body !== undefined ? hit.body : '';
		const bytes = typeof raw === 'string' ? new TextEncoder().encode(raw) : raw;
		return {
			status,
			arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
		};
	};
	impl.calls = calls;
	return impl;
}

function routesFor(published, versionBody) {
	const version = published.version.toString();
	const list = [
		{ suffix: '/version', status: 200, body: versionBody || `{"version":${version}}` },
		{ suffix: `/data-manifest/v/${version}/root.sig`, status: 200, body: published.signature },
		{ suffix: `/data-manifest/v/${version}/root`, status: 200, body: published.root },
		{ suffix: '/data-manifest/root.sig', status: 200, body: published.signature },
		{ suffix: '/data-manifest/root', status: 200, body: published.root }
	];
	for (const [id, text] of published.texts) {
		list.push({ suffix: `/data-manifest/v/${version}/shards/${id}`, status: 200, body: text });
	}
	return list;
}

function session(options) {
	return createManifestSession({
		base: BASE,
		store: options.store || createMemoryStore(),
		logger: () => {},
		...options
	});
}

describe('GDAT2 data manifest', () => {
	it('embeds the release public key and rejects a signature from another key', async () => {
		expect(EMBEDDED_RELEASE_PUBLIC_KEY_HEX).toBe(
			'fb3dd3d6b9e1955ee03a4786596f7d5562b7d96d7b6c177e6d38cf7abca7de18'
		);
		const { hex } = await generateKey();
		const key = Uint8Array.from(Buffer.from(EMBEDDED_RELEASE_PUBLIC_KEY_HEX, 'hex'));
		const sig = Uint8Array.from(Buffer.from(hex.slice(0, 128).padEnd(128, '0'), 'hex'));
		expect(await verifyEd25519(key, sig, new TextEncoder().encode('GDAT2ROOT\n'))).toBe(false);
		expect(parseDetachedSignature(`${'ab'.repeat(64)}\n`)?.length).toBe(64);
		expect(parseDetachedSignature('ab'.repeat(64))?.length).toBe(64);
		expect(parseDetachedSignature(`${'ab'.repeat(64)}\n\n`)).toBe(null);
	});

	it('rejects a non-canonical root and an all-zero next key', async () => {
		const { kp, hex } = await generateKey();
		const published = await buildPublished({
			version: 1n,
			files: [],
			signer: kp,
			nextKeys: ['00'.repeat(32)]
		});
		expect(parseRoot(published.root).ok).toBe(false);
		const zero = encodeRoot({
			version: 1n,
			previousVersion: 0n,
			createdUnix: 10n,
			shards: new Map(
				[...Array(256)].map((_, i) => {
					const id = i.toString(16).padStart(2, '0');
					return [id, { sha256: 'ab'.repeat(32), size: 1n }];
				})
			),
			nextKeys: [hex]
		});
		expect(parseRoot(`${zero.slice(0, -1)} \n`).ok).toBe(false);
		expect(parseRoot(zero).ok).toBe(true);
	});

	it('accepts a signed root, checks one shard lazily, and rejects a bad file in enforce', async () => {
		const { kp, hex } = await generateKey();
		const body = new TextEncoder().encode('hello');
		const published = await buildPublished({
			version: 4n,
			previous: 2n,
			files: [{ path: 'texture/abc.bmp', bytes: body }],
			signer: kp
		});
		const fetchImpl = mockFetch(routesFor(published));
		const store = createMemoryStore();
		const active = session({ mode: 'enforce', store, fetchImpl, embeddedKeyHex: hex });
		await active.bootstrap();
		expect(active.accepted.version).toBe(4n);
		expect(active.cacheGeneration).toBe(1);

		const good = await active.assess('Data\\Texture\\ABC.bmp', body, 'http');
		expect(good).toMatchObject({ action: 'accept', save: true, saveAs: 'texture/abc.bmp' });
		const shardCalls = fetchImpl.calls.filter(url => url.includes('/shards/'));
		expect(shardCalls).toEqual([`${BASE}data-manifest/v/4/shards/31`]);

		const bad = await active.assess('texture/abc.bmp', new TextEncoder().encode('nope'), 'http');
		expect(bad.action).toBe('reject');
		expect(bad.save).toBe(false);
		expect(active.events.some(event => event.code === 'digest-mismatch')).toBe(true);

		const again = await active.assess('texture/abc.bmp', body, 'cache');
		expect(again.action).toBe('accept');
		expect(fetchImpl.calls.filter(url => url.includes('/shards/'))).toHaveLength(1);
	});

	it('does not block loads in report mode when no signature is published', async () => {
		const fetchImpl = mockFetch([
			{ suffix: '/version', status: 404, body: '' },
			{ suffix: '/data-manifest/root.sig', status: 404, body: '' },
			{ suffix: '/data-manifest/root', status: 404, body: '' }
		]);
		const active = session({ mode: 'report', fetchImpl, embeddedKeyHex: 'ab'.repeat(32) });
		await active.bootstrap();
		expect(active.accepted).toBe(null);
		expect(active.passthrough).toBe(true);
		const decision = await active.assess('texture/abc.bmp', new Uint8Array([1, 2, 3]), 'http');
		expect(decision.action).toBe('accept');
		expect(decision.save).toBe(true);
		expect(active.events.some(event => event.code === 'unsigned')).toBe(true);
	});

	it('fails closed in enforce mode when the signature is not published', async () => {
		const fetchImpl = mockFetch([{ suffix: '/version', status: 404, body: '' }]);
		const active = session({ mode: 'enforce', fetchImpl, embeddedKeyHex: 'ab'.repeat(32) });
		await active.bootstrap();
		expect(active.blocked).toBe(true);
		expect((await active.assess('texture/abc.bmp', new Uint8Array([1]), 'http')).action).toBe('reject');
		expect((await active.assess('System/itemInfo.lua', new Uint8Array([1]), 'grf')).action).toBe('accept');
	});

	it('re-verifies the persisted root, refuses rollback, and can skip a version', async () => {
		const { kp, hex } = await generateKey();
		const store = createMemoryStore();
		const v2 = await buildPublished({ version: 2n, files: [], signer: kp });
		const first = session({
			mode: 'report',
			store,
			fetchImpl: mockFetch(routesFor(v2)),
			embeddedKeyHex: hex
		});
		await first.bootstrap();
		expect(first.accepted.version).toBe(2n);

		const v1 = await buildPublished({ version: 1n, files: [], signer: kp });
		const rolled = session({
			mode: 'enforce',
			store,
			fetchImpl: mockFetch(routesFor(v1)),
			embeddedKeyHex: hex
		});
		await rolled.bootstrap();
		expect(rolled.accepted.version).toBe(2n);
		expect(rolled.events.some(event => event.code === 'rollback')).toBe(true);

		const v4 = await buildPublished({ version: 4n, previous: 2n, files: [], signer: kp });
		const jumped = session({
			mode: 'report',
			store,
			fetchImpl: mockFetch(routesFor(v4)),
			embeddedKeyHex: hex
		});
		await jumped.bootstrap();
		expect(jumped.accepted.version).toBe(4n);
		expect(jumped.cacheGeneration).toBe(2);
	});

	it('trusts a persisted next key on the following root', async () => {
		const keyA = await generateKey();
		const keyB = await generateKey();
		const store = createMemoryStore();
		const v1 = await buildPublished({
			version: 1n,
			files: [],
			nextKeys: [keyB.hex],
			signer: keyA.kp
		});
		const first = session({
			mode: 'report',
			store,
			fetchImpl: mockFetch(routesFor(v1)),
			embeddedKeyHex: keyA.hex
		});
		await first.bootstrap();
		expect(first.nextKeysHex).toEqual([keyB.hex]);

		const v2 = await buildPublished({ version: 2n, previous: 1n, files: [], signer: keyB.kp });
		const second = session({
			mode: 'report',
			store,
			fetchImpl: mockFetch(routesFor(v2)),
			embeddedKeyHex: keyA.hex
		});
		await second.bootstrap();
		expect(second.accepted.version).toBe(2n);

		const stranger = await generateKey();
		const forged = await buildPublished({ version: 3n, files: [], signer: stranger.kp });
		const third = session({
			mode: 'report',
			store,
			fetchImpl: mockFetch(routesFor(forged)),
			embeddedKeyHex: keyA.hex
		});
		await third.bootstrap();
		expect(third.accepted.version).toBe(2n);
		expect(third.events.some(event => event.code === 'bad-signature')).toBe(true);
	});

	it('ignores a tampered persisted version and still accepts a signed root', async () => {
		const { kp, hex } = await generateKey();
		const store = createMemoryStore();
		await store.save(BASE, { version: '99', root: 'nope', signature: 'aa'.repeat(64), nextKeys: [] });
		const published = await buildPublished({ version: 1n, files: [], signer: kp });
		const active = session({
			mode: 'report',
			store,
			fetchImpl: mockFetch(routesFor(published)),
			embeddedKeyHex: hex
		});
		await active.bootstrap();
		expect(active.accepted.version).toBe(1n);
		expect(active.events.some(event => event.code === 'reverify')).toBe(true);
	});

	it('reports a digest mismatch without caching it', () => {
		const state = { accepted: true, blocked: false, mode: 'report', legacyName: 'texture/abc.bmp' };
		expect(decideUse(state, { kind: 'listed', path: 'texture/abc.bmp' }, false, 'http')).toMatchObject({
			action: 'fallback',
			save: false
		});
		expect(decideUse(state, { kind: 'unlisted', path: 'texture/abc.bmp' }, false, 'grf').action).toBe('accept');
		expect(decideUse({ ...state, mode: 'enforce' }, { kind: 'unlisted', path: 'x' }, false, 'http').action).toBe(
			'reject'
		);
	});
});
