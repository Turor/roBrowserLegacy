import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
	cacheLookupNames,
	decodeThenNormalize,
	normalizeManifestPath,
	shardIdOf
} from 'Core/ManifestPath.js';

const fixturePath = join(dirname(fileURLToPath(import.meta.url)), '../../testdata/manifest-v2-normalize.txt');

describe('manifest v2 path normalization', () => {
	it('matches the shared fixture, including shard ids', async () => {
		const raw = readFileSync(fixturePath);
		expect(raw[0]).not.toBe(0xef);
		expect(raw.includes(0x0d)).toBe(false);
		const text = new TextDecoder('utf-8', { fatal: true }).decode(raw);
		const lines = text.split('\n');
		if (lines[lines.length - 1] === '') {
			lines.pop();
		}
		let checked = 0;
		for (const line of lines) {
			if (line === '' || line.startsWith('#')) {
				continue;
			}
			const parts = line.split('\t');
			expect(parts, line).toHaveLength(3);
			const [input, expected, shard] = parts;
			const normalized = input.includes('%') ? decodeThenNormalize(input) : normalizeManifestPath(input);
			if (!input.includes('%')) {
				const decoded = decodeThenNormalize(input);
				expect(decoded.ok).toBe(normalized.ok);
				expect(decoded.path).toBe(normalized.path);
			}
			if (expected === 'REJECT') {
				expect(normalized.ok, input).toBe(false);
				expect(shard).toBe('-');
			} else {
				expect(normalized.ok, input).toBe(true);
				expect(normalized.path).toBe(expected);
				expect(await shardIdOf(normalized.path)).toBe(shard);
			}
			checked++;
		}
		expect(checked).toBe(22);
	});

	it('rejects controls, dot segments, and overlong paths', () => {
		expect(normalizeManifestPath('datafoo').path).toBe('datafoo');
		expect(normalizeManifestPath('././data/a.txt').path).toBe('a.txt');
		expect(normalizeManifestPath('texture/foo/./bar.bmp').ok).toBe(false);
		expect(normalizeManifestPath('foo\0bar').ok).toBe(false);
		expect(normalizeManifestPath('foo\nbar').ok).toBe(false);
		expect(normalizeManifestPath('foo\x7fbar').ok).toBe(false);
		expect(normalizeManifestPath(`${'a'.repeat(512)}.bmp`).ok).toBe(false);
		expect(normalizeManifestPath('a'.repeat(512)).ok).toBe(true);
		expect(normalizeManifestPath(`${'a'.repeat(513)}`).ok).toBe(false);
		expect(decodeThenNormalize('ok/%').ok).toBe(false);
		expect(decodeThenNormalize('ok/%2').ok).toBe(false);
		expect(decodeThenNormalize('ok/%zz').ok).toBe(false);
		expect(decodeThenNormalize('ok/%80').ok).toBe(false);
	});

	it('looks up cached names by the normalized key and the legacy spelling', () => {
		expect(cacheLookupNames('Data\\Texture\\ABC.bmp')).toEqual(['texture/abc.bmp', 'Data/Texture/ABC.bmp']);
		expect(cacheLookupNames('texture/abc.bmp')).toEqual(['texture/abc.bmp']);
	});
});
