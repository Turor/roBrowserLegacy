import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	session: {},
	hooks: {},
	entities: {},
	cache: {}
}));

vi.mock('Engine/SessionStorage.js', () => ({ default: mocks.session }));
vi.mock('Network/NetworkManager.js', () => ({
	default: {
		hookPacket: (pkt, fn) => {
			mocks.hooks[pkt.name] = fn;
		}
	}
}));
vi.mock('Network/PacketStructure.js', () => ({
	default: {
		ZC: {
			EL_INIT: { name: 'EL_INIT' },
			EL_PAR_CHANGE: { name: 'EL_PAR_CHANGE' }
		}
	}
}));
vi.mock('Renderer/EntityManager.js', () => ({
	default: {
		get: gid => mocks.entities[gid] || null,
		storeLife: (gid, data) => {
			mocks.cache[gid] = Object.assign(mocks.cache[gid] || {}, data);
		}
	}
}));
vi.mock('DB/Status/StatusProperty.js', () => ({
	default: { HP: 5, MAXHP: 6, SP: 7, MAXSP: 8, SPEED: 0 }
}));

import ElementalEngine from '../../src/Engine/MapEngine/Elemental.js';

function makeEntity() {
	return {
		life: {
			hp: -1,
			hp_max: -1,
			sp: -1,
			sp_max: -1,
			updates: 0,
			update() {
				this.updates++;
			}
		}
	};
}

describe('Elemental HP/SP (0x81d / 0x81e)', () => {
	beforeEach(() => {
		for (const o of [mocks.session, mocks.hooks, mocks.entities, mocks.cache]) {
			Object.keys(o).forEach(k => delete o[k]);
		}
		ElementalEngine();
	});

	it('hooks both packets and resets the elemental id', () => {
		expect(typeof mocks.hooks.EL_INIT).toBe('function');
		expect(typeof mocks.hooks.EL_PAR_CHANGE).toBe('function');
		expect(mocks.session.elementalId).toBe(0);
	});

	it('EL_INIT fills the bars of the on-screen elemental', () => {
		const e = (mocks.entities[110000123] = makeEntity());
		mocks.hooks.EL_INIT({ AID: 110000123, hp: 900, maxHP: 1200, sp: 40, maxSP: 80 });
		expect(mocks.session.elementalId).toBe(110000123);
		expect(e.life).toMatchObject({ hp: 900, hp_max: 1200, sp: 40, sp_max: 80 });
		expect(e.life.updates).toBe(1);
	});

	it('EL_INIT before the spawn is cached for when the entity appears', () => {
		mocks.hooks.EL_INIT({ AID: 7, hp: 10, maxHP: 20, sp: 3, maxSP: 4 });
		expect(mocks.cache[7]).toEqual({ hp: 10, hp_max: 20, sp: 3, sp_max: 4 });
	});

	it('EL_PAR_CHANGE updates the matching field only', () => {
		const e = (mocks.entities[7] = makeEntity());
		mocks.hooks.EL_INIT({ AID: 7, hp: 10, maxHP: 20, sp: 3, maxSP: 4 });
		mocks.hooks.EL_PAR_CHANGE({ param: 5, value: 15 });
		mocks.hooks.EL_PAR_CHANGE({ param: 6, value: 25 });
		mocks.hooks.EL_PAR_CHANGE({ param: 7, value: 1 });
		mocks.hooks.EL_PAR_CHANGE({ param: 8, value: 9 });
		expect(e.life).toMatchObject({ hp: 15, hp_max: 25, sp: 1, sp_max: 9 });
		expect(mocks.cache[7]).toEqual({ hp: 15, hp_max: 25, sp: 1, sp_max: 9 });
	});

	it('ignores unknown params and updates with no elemental', () => {
		const e = (mocks.entities[7] = makeEntity());
		mocks.hooks.EL_PAR_CHANGE({ param: 5, value: 15 });
		expect(e.life.hp).toBe(-1);
		mocks.hooks.EL_INIT({ AID: 7, hp: 10, maxHP: 20, sp: 3, maxSP: 4 });
		mocks.hooks.EL_PAR_CHANGE({ param: 0, value: 150 });
		expect(e.life).toMatchObject({ hp: 10, hp_max: 20, sp: 3, sp_max: 4 });
	});
});
