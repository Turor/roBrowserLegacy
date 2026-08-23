import { describe, it, expect } from 'vitest';
import {
	hatToDpad,
	pickGamepad,
	normalizeGamepad,
	isSteamGamepad
} from 'UI/Components/JoystickUI/JoystickGamepadMap.js';

function btn(pressed, value) {
	return { pressed: !!pressed, value: value != null ? value : (pressed ? 1 : 0) };
}

function fakePad(opts) {
	return {
		id: opts.id || 'pad',
		index: opts.index || 0,
		mapping: opts.mapping || '',
		timestamp: opts.timestamp || 0,
		buttons: opts.buttons || [],
		axes: opts.axes || []
	};
}

describe('JoystickGamepadMap', () => {
	it('detects Steam Controller / Deck ids', () => {
		expect(isSteamGamepad({ id: 'Wireless Steam Controller' })).toBe(true);
		expect(isSteamGamepad({ id: 'Valve Steam Deck Controller' })).toBe(true);
		expect(isSteamGamepad({ id: 'Xbox One Controller' })).toBe(false);
	});

	it('hatToDpad maps 8-way hat, idle when > 1', () => {
		expect(hatToDpad(-1).up).toBe(true);
		expect(hatToDpad(1).down).toBe(true);
		expect(hatToDpad(-0.5).right).toBe(true);
		expect(hatToDpad(1.28).up).toBe(false);
		expect(hatToDpad(1.28).down).toBe(false);
	});

	it('leaves standard-mapping pads unchanged', () => {
		const gp = fakePad({
			id: 'Xbox 360 Controller (XInput STANDARD GAMEPAD)',
			mapping: 'standard',
			buttons: Array.from({ length: 16 }, () => btn(false)),
			axes: [0, 0, 0, 0]
		});
		expect(normalizeGamepad(gp)).toBe(gp);
	});

	it('remaps Steam DInput triggers off the stick axes', () => {
		const gp = fakePad({
			id: 'Steam Controller',
			mapping: '',
			buttons: Array.from({ length: 11 }, () => btn(false)),
			axes: [0.5, 0, 1, 0.8, -0.2, -1]
		});
		const n = normalizeGamepad(gp);
		expect(n.axes[0]).toBe(0.5);
		expect(n.axes[1]).toBe(0);
		expect(n.axes[2]).toBe(0.8);
		expect(n.axes[3]).toBe(-0.2);
		expect(n.buttons[6].pressed).toBe(true);
		expect(n.buttons[7].pressed).toBe(false);
	});

	it('remaps DInput Back/Start to standard 8/9', () => {
		const buttons = Array.from({ length: 11 }, () => btn(false));
		buttons[6] = btn(true);
		buttons[7] = btn(true);
		const gp = fakePad({
			id: 'Steam Virtual Gamepad',
			mapping: '',
			buttons,
			axes: [0, 0, -1, 0, 0, -1]
		});
		const n = normalizeGamepad(gp);
		expect(n.buttons[8].pressed).toBe(true);
		expect(n.buttons[9].pressed).toBe(true);
	});

	it('picks the live Steam pad over an idle XInput ghost', () => {
		const ghost = fakePad({
			id: 'Xbox 360 Controller',
			mapping: 'standard',
			timestamp: 1,
			buttons: Array.from({ length: 16 }, () => btn(false)),
			axes: [0, 0, 0, 0]
		});
		const steamButtons = Array.from({ length: 11 }, () => btn(false));
		steamButtons[0] = btn(true);
		const steam = fakePad({
			id: 'Wireless Steam Controller',
			mapping: '',
			index: 1,
			timestamp: 2,
			buttons: steamButtons,
			axes: [0, 0, -1, 0, 0, -1]
		});
		expect(pickGamepad([ghost, steam])).toBe(steam);
	});
});
