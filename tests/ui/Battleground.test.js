import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	session: {},
	hooks: {},
	entities: {},
	cache: {},
	chat: [],
	sent: [],
	marks: {},
	score: { active: false, points: null, removed: 0 }
}));

vi.mock('Engine/SessionStorage.js', () => ({ default: mocks.session }));
vi.mock('DB/DBManager.js', () => ({ default: { getMessage: id => 'msg' + id } }));
vi.mock('Network/NetworkManager.js', () => ({
	default: {
		hookPacket: (pkt, fn) => {
			mocks.hooks[pkt.name] = fn;
		},
		sendPacket: pkt => mocks.sent.push(pkt)
	}
}));
vi.mock('Network/PacketStructure.js', () => {
	const names = [
		'BATTLEFIELD_CHAT',
		'BATTLEFIELD_NOTIFY_CAMPINFO',
		'BATTLEFIELD_NOTIFY_POINT',
		'BATTLEFIELD_NOTIFY_POSITION',
		'BATTLEFIELD_NOTIFY_HP',
		'BATTLEFIELD_NOTIFY_HP2'
	];
	const ZC = {};
	names.forEach(n => (ZC[n] = { name: n }));
	function BATTLEFIELD_CHAT() {
		this.msg = '';
	}
	return { default: { ZC, CZ: { BATTLEFIELD_CHAT } } };
});
vi.mock('Renderer/EntityManager.js', () => ({
	default: {
		get: gid => mocks.entities[gid] || null,
		storeLife: (gid, data) => {
			mocks.cache[gid] = Object.assign(mocks.cache[gid] || {}, data);
		}
	}
}));
vi.mock('UI/Components/ChatBox/ChatBox.js', () => ({
	default: {
		TYPE: { GUILD: 16, INFO: 128 },
		FILTER: { PUBLIC_LOG: 0, BATTLEFIELD: 20 },
		addText: (text, type, filter) => mocks.chat.push({ text, type, filter })
	}
}));
vi.mock('UI/Components/MiniMap/MiniMap.js', () => ({
	default: {
		getUI: () => ({
			addPartyMemberMark: (k, x, y) => (mocks.marks[k] = [x, y]),
			removePartyMemberMark: k => delete mocks.marks[k]
		})
	}
}));
vi.mock('UI/Components/BattlefieldScore/BattlefieldScore.js', () => ({
	default: {
		get __active() {
			return mocks.score.active;
		},
		setPoints: (a, b) => {
			mocks.score.active = true;
			mocks.score.points = [a, b];
		},
		remove: () => {
			mocks.score.active = false;
			mocks.score.removed++;
		}
	}
}));

import BattlegroundEngine, {
	getCamp,
	leaveBattlefield,
	sendBattleChat,
	toggleBattleChat
} from '../../src/Engine/MapEngine/Battleground.js';

function entity() {
	return { life: { hp: -1, hp_max: -1, updates: 0, update() { this.updates++; } } };
}

describe('Battleground packets', () => {
	beforeEach(() => {
		for (const o of [mocks.session, mocks.hooks, mocks.entities, mocks.cache, mocks.marks]) {
			Object.keys(o).forEach(k => delete o[k]);
		}
		mocks.chat.length = 0;
		mocks.sent.length = 0;
		mocks.score.active = false;
		mocks.score.points = null;
		mocks.score.removed = 0;
		leaveBattlefield();
		mocks.score.removed = 0;
		BattlegroundEngine();
	});

	it('hooks all battlefield packets, both HP versions', () => {
		expect(Object.keys(mocks.hooks).sort()).toEqual([
			'BATTLEFIELD_CHAT',
			'BATTLEFIELD_NOTIFY_CAMPINFO',
			'BATTLEFIELD_NOTIFY_HP',
			'BATTLEFIELD_NOTIFY_HP2',
			'BATTLEFIELD_NOTIFY_POINT',
			'BATTLEFIELD_NOTIFY_POSITION'
		]);
		expect(mocks.session.battleChat).toBe(false);
	});

	it('camp chat goes to the Battlefield filter', () => {
		mocks.hooks.BATTLEFIELD_CHAT({ accountID: 1, name: 'A', msg: 'A : hi' });
		expect(mocks.chat[0]).toEqual({ text: 'A : hi', type: 16, filter: 20 });
	});

	it('score opens/updates the score window', () => {
		mocks.hooks.BATTLEFIELD_NOTIFY_POINT({ pointCampA: 3, pointCampB: 1 });
		expect(mocks.score.points).toEqual([3, 1]);
	});

	it('positions add marks and -1,-1 removes them', () => {
		mocks.hooks.BATTLEFIELD_NOTIFY_POSITION({ accountID: 9, x: 87, y: 75 });
		expect(mocks.marks[9]).toEqual([87, 75]);
		mocks.hooks.BATTLEFIELD_NOTIFY_POSITION({ accountID: 9, x: -1, y: -1 });
		expect(mocks.marks[9]).toBeUndefined();
	});

	it('HP2 updates the camp member bar and cache', () => {
		const e = (mocks.entities[9] = entity());
		mocks.hooks.BATTLEFIELD_NOTIFY_HP2({ accountID: 9, hp: 500, maxHp: 1000 });
		expect(e.life).toMatchObject({ hp: 500, hp_max: 1000, updates: 1 });
		expect(mocks.cache[9]).toEqual({ hp: 500, hp_max: 1000 });
	});

	it('camp info is remembered and set on the entity', () => {
		const e = (mocks.entities[9] = entity());
		mocks.hooks.BATTLEFIELD_NOTIFY_CAMPINFO({ accountID: 9, name: 'x', camp: 2 });
		expect(getCamp(9)).toBe(2);
		expect(e.bgCamp).toBe(2);
	});

	it('leaving clears score window, marks and camps', () => {
		mocks.hooks.BATTLEFIELD_NOTIFY_POINT({ pointCampA: 1, pointCampB: 1 });
		mocks.hooks.BATTLEFIELD_NOTIFY_POSITION({ accountID: 9, x: 1, y: 2 });
		mocks.hooks.BATTLEFIELD_NOTIFY_CAMPINFO({ accountID: 9, name: 'x', camp: 1 });
		leaveBattlefield();
		expect(mocks.score.removed).toBe(1);
		expect(mocks.marks[9]).toBeUndefined();
		expect(getCamp(9)).toBeNull();
	});

	it('/battlechat toggles with the official messages and sends 0x2db', () => {
		toggleBattleChat();
		expect(mocks.session.battleChat).toBe(true);
		expect(mocks.chat.pop().text).toBe('msg1365');
		toggleBattleChat();
		expect(mocks.chat.pop().text).toBe('msg1366');
		sendBattleChat('Me : go');
		expect(mocks.sent[0].msg).toBe('Me : go');
	});
});
