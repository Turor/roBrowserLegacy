import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
	class MockGUIComponent {
		constructor(name) {
			this.name = name;
			this._host = document.createElement('div');
			this.__loaded = false;
			this.__active = false;
		}
		getRoot() {
			return this._host;
		}
		prepare() {
			if (this.__loaded) return;
			this._host.innerHTML = this.render();
			this.__loaded = true;
			if (this.init) this.init();
		}
		append() {
			this.prepare();
			this.__active = true;
			if (this.onAppend) this.onAppend();
		}
		remove() {
			this.__active = false;
			if (this.onRemove) this.onRemove();
		}
		draggable() {}
	}
	return {
		MockGUIComponent,
		session: {},
		chat: [],
		sent: [],
		prompts: []
	};
});

vi.mock('UI/GUIComponent.js', () => ({ default: mocks.MockGUIComponent }));
vi.mock('UI/UIManager.js', () => ({
	default: {
		addComponent: c => c,
		showPromptBox: (text, yes, no, onYes) => {
			mocks.prompts.push(text);
			onYes();
		}
	}
}));
vi.mock('UI/Components/ChatBox/ChatBox.js', () => ({
	default: {
		TYPE: { INFO: 128, ERROR: 64 },
		FILTER: { PUBLIC_LOG: 0 },
		addText: text => mocks.chat.push(text)
	}
}));
vi.mock('Network/NetworkManager.js', () => ({ default: { sendPacket: p => mocks.sent.push(p) } }));
vi.mock('Network/PacketStructure.js', () => ({
	default: {
		CZ: {
			MEMORIALDUNGEON_COMMAND: function MEMORIALDUNGEON_COMMAND() {
				this.Command = 0;
			}
		}
	}
}));
vi.mock('DB/DBManager.js', () => ({ default: { getMessage: (id, fallback) => fallback } }));
vi.mock('Engine/SessionStorage.js', () => ({ default: mocks.session }));
vi.mock('Core/Preferences.js', () => ({
	default: { get: () => ({ x: -1, y: 120, minimized: false, save: vi.fn() }) }
}));
vi.mock('Renderer/Renderer.js', () => ({ default: { width: 1280, height: 720 } }));

import MemorialDungeon, { formatRemaining, MD_COMMAND } from '../../src/UI/Components/MemorialDungeon/MemorialDungeon.js';

const NAME = 'Endless Tower';
const now = () => Math.floor(Date.now() / 1000);
const root = () => MemorialDungeon.getRoot();

describe('MemorialDungeon', () => {
	beforeEach(() => {
		if (MemorialDungeon.__active) MemorialDungeon.remove();
		MemorialDungeon.reset();
		mocks.chat.length = 0;
		mocks.sent.length = 0;
		mocks.prompts.length = 0;
	});

	it('formats remaining time as HH:MM:SS and clamps at zero', () => {
		expect(formatRemaining(0)).toBe('00:00:00');
		expect(formatRemaining(59)).toBe('00:00:59');
		expect(formatRemaining(3661)).toBe('01:01:01');
		expect(formatRemaining(4 * 3600)).toBe('04:00:00');
		expect(formatRemaining(-5)).toBe('00:00:00');
	});

	it('reservation (0x2cb) opens the window in standby with priority and announces the booking once', () => {
		MemorialDungeon.onSubscriptionInfo({ MemorialDungeonName: NAME, PriorityOrderNum: 2 });
		expect(MemorialDungeon.__active).toBe(true);
		expect(MemorialDungeon.getState()).toMatchObject({ state: 'standby', name: NAME, priority: 2 });
		expect(root().querySelector('.name').textContent).toBe('Endless Tower in Standby');
		expect(root().querySelector('.priority').innerHTML).toContain('<span style="color:#ff0000">2</span>');
		expect(root().querySelector('.destroy').style.display).toBe('none');
		expect(mocks.chat).toEqual(['Memorial Dungeon, [Endless Tower] is booked.']);
		expect(mocks.session.MemorialDungeon).toMatchObject({ state: 'standby', name: NAME });

		// re-sent on relog: no duplicate chat line
		MemorialDungeon.onSubscriptionInfo({ MemorialDungeonName: NAME, PriorityOrderNum: 1 });
		expect(mocks.chat.length).toBe(1);
		expect(MemorialDungeon.getState().priority).toBe(1);
	});

	it('priority update (0x2cc) updates; negative cancels the reservation', () => {
		MemorialDungeon.onSubscriptionInfo({ MemorialDungeonName: NAME, PriorityOrderNum: 3 });
		MemorialDungeon.onSubscriptionNotify({ PriorityOrderNum: 1 });
		expect(MemorialDungeon.getState().priority).toBe(1);
		MemorialDungeon.onSubscriptionNotify({ PriorityOrderNum: -1 });
		expect(MemorialDungeon.__active).toBe(false);
		expect(MemorialDungeon.getState().state).toBe('');
		expect(mocks.chat.at(-1)).toBe('The Memorial Dungeon reservation has been canceled.');
		expect(mocks.session.MemorialDungeon).toBeNull();
	});

	it('entry limit (0x2cd idle) shows "Available" with the enter countdown', () => {
		MemorialDungeon.onSubscriptionInfo({ MemorialDungeonName: NAME, PriorityOrderNum: 0 });
		MemorialDungeon.onInfo({ MemorialDungeonName: NAME, DestroyDate: 0, EnterTimeOutDate: now() + 300 });
		const s = MemorialDungeon.getState();
		expect(s.state).toBe('available');
		expect(root().querySelector('.name').textContent).toBe('Endless Tower Available');
		expect(root().querySelector('.enter').innerHTML).toMatch(/within <span style="color:#ff0000">00:0[45]:[0-9]{2}<\/span>/);
		expect(root().querySelector('.mission').style.display).toBe('none');
		expect(root().querySelector('.destroy').style.display).toBe('');
	});

	it('mission limit (0x2cd progress) shows "in Progress"; a later idle update keeps the mission limit', () => {
		const destroy = now() + 4 * 3600;
		MemorialDungeon.onInfo({ MemorialDungeonName: NAME, DestroyDate: destroy, EnterTimeOutDate: 0 });
		expect(MemorialDungeon.getState()).toMatchObject({ state: 'progress', destroyDate: destroy, enterLimitDate: 0 });
		expect(root().querySelector('.mission-time').textContent).toMatch(/^0[34]:[0-9]{2}:[0-9]{2}$/);
		expect(mocks.chat[0]).toContain('[Endless Tower] is created.');

		// everybody left: Hercules sends the idle timer with DestroyDate=0
		const idle = now() + 300;
		MemorialDungeon.onInfo({ MemorialDungeonName: NAME, DestroyDate: 0, EnterTimeOutDate: idle });
		expect(MemorialDungeon.getState()).toMatchObject({ state: 'progress', destroyDate: destroy, enterLimitDate: idle });
		expect(root().querySelector('.mission').style.display).toBe('');
		expect(root().querySelector('.enter').style.display).toBe('');

		// somebody re-entered: idle timer cleared
		MemorialDungeon.onInfo({ MemorialDungeonName: NAME, DestroyDate: destroy, EnterTimeOutDate: 0 });
		expect(MemorialDungeon.getState().enterLimitDate).toBe(0);
	});

	it.each([
		[1, 'The Memorial Dungeon duration expired; it has been destroyed.'],
		[2, "The Memorial Dungeon's entry time limit expired; it has been destroyed."],
		[3, 'The Memorial Dungeon has been removed.']
	])('notify type %i (0x2ce) closes with the official message', (type, text) => {
		MemorialDungeon.onInfo({ MemorialDungeonName: NAME, DestroyDate: now() + 60, EnterTimeOutDate: 0 });
		mocks.chat.length = 0;
		MemorialDungeon.onNotify({ Type: type, EnterLimitDate: 0 });
		expect(MemorialDungeon.__active).toBe(false);
		expect(mocks.chat).toEqual([text]);
		expect(mocks.session.MemorialDungeon).toBeNull();
	});

	it('notify type 4 (left / create failure) closes silently; type 0 updates the entry limit', () => {
		MemorialDungeon.onInfo({ MemorialDungeonName: NAME, DestroyDate: now() + 60, EnterTimeOutDate: 0 });
		const limit = now() + 120;
		MemorialDungeon.onNotify({ Type: 0, EnterLimitDate: limit });
		expect(MemorialDungeon.getState().enterLimitDate).toBe(limit);
		mocks.chat.length = 0;
		MemorialDungeon.onNotify({ Type: 4, EnterLimitDate: 123456 }); // garbage EnterLimitDate must be ignored
		expect(MemorialDungeon.__active).toBe(false);
		expect(mocks.chat).toEqual([]);
	});

	it('"Destroy instance" asks for confirmation and sends CZ_MEMORIALDUNGEON_COMMAND 3', () => {
		MemorialDungeon.onInfo({ MemorialDungeonName: NAME, DestroyDate: now() + 60, EnterTimeOutDate: 0 });
		root().querySelector('.destroy').click();
		expect(mocks.prompts).toEqual(['Destroy instance: Endless Tower?']);
		expect(mocks.sent.length).toBe(1);
		expect(mocks.sent[0].Command).toBe(MD_COMMAND.DESTROY_FORCE);
		expect(MD_COMMAND.DESTROY_FORCE).toBe(3);
	});

	it('restores from Session after a map-server change and resets on character select', () => {
		const destroy = now() + 600;
		mocks.session.MemorialDungeon = { state: 'progress', name: NAME, priority: 0, destroyDate: destroy, enterLimitDate: 0 };
		MemorialDungeon.restore();
		expect(MemorialDungeon.__active).toBe(true);
		expect(MemorialDungeon.getState().destroyDate).toBe(destroy);
		MemorialDungeon.remove();
		MemorialDungeon.reset();
		expect(mocks.session.MemorialDungeon).toBeNull();
		MemorialDungeon.restore();
		expect(MemorialDungeon.__active).toBe(false);
	});

	it('escapes dungeon names (no HTML injection)', () => {
		MemorialDungeon.onSubscriptionInfo({ MemorialDungeonName: '<img src=x onerror=alert(1)>', PriorityOrderNum: 1 });
		expect(root().querySelector('.name').innerHTML).not.toContain('<img');
		expect(root().querySelector('img')).toBeNull();
	});
});
