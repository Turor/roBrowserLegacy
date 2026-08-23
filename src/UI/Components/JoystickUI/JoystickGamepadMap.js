/**
 * UI/Components/JoystickUI/JoystickGamepadMap.js
 *
 * Normalize Gamepad API devices to the W3C "standard" layout used by
 * JoystickButtonInput / JoystickAxisInput (Xbox-style 16 buttons + 4 axes).
 *
 * Steam Controller, Steam Deck (desktop), and Steam Virtual Gamepad often
 * appear as DirectInput (mapping === "") with:
 *   - Back/Start on buttons 6/7 instead of 8/9
 *   - analog triggers on axes 2 and 5 (the existing joystick code treats
 *     those as the right stick, so cursor/camera does not work)
 *   - D-pad as a hat axis instead of buttons 12-15
 *
 * When the browser already sets mapping === "standard" (Steam Input Xbox
 * config, Steam Deck game mode), this module leaves the pad unchanged.
 */

const STEAM_ID_RE = /steam|valve|28de|steamcontroller|steam deck|steamvirtual/i;

export function isSteamGamepad(gp) {
	return !!(gp && STEAM_ID_RE.test(gp.id || ''));
}

function isPressed(button) {
	if (!button) {
		return false;
	}
	if (typeof button === 'object') {
		return !!button.pressed || (typeof button.value === 'number' && button.value > 0.5);
	}
	return !!button;
}

function buttonValue(button) {
	if (!button) {
		return 0;
	}
	if (typeof button === 'object' && typeof button.value === 'number') {
		return button.value;
	}
	return isPressed(button) ? 1 : 0;
}

function makeButton(pressed, value) {
	const v = value != null ? value : pressed ? 1 : 0;
	return { pressed: !!pressed || v > 0.5, value: v };
}

/** DInput analog trigger in [-1, 1] (idle -1) -> [0, 1]. */
function axisTrigger(axes, index) {
	const v = axes[index];
	if (typeof v !== 'number' || Number.isNaN(v)) {
		return 0;
	}
	if (v >= -1 && v <= 1) {
		return (v + 1) / 2;
	}
	return 0;
}

/**
 * Hat axis in [-1, 1] (idle typically > 1) -> cardinals.
 * Chrome/Linux 8-way: -1 = N, then clockwise in 0.25 steps.
 */
export function hatToDpad(value) {
	const dpad = { up: false, down: false, left: false, right: false };
	if (typeof value !== 'number' || Number.isNaN(value) || value > 1.0) {
		return dpad;
	}
	let step = Math.round((value + 1) * 4);
	if (step >= 8) {
		step = 4; // +1 is south; do not wrap to north
	}
	switch (step) {
		case 0:
			dpad.up = true;
			break;
		case 1:
			dpad.up = true;
			dpad.right = true;
			break;
		case 2:
			dpad.right = true;
			break;
		case 3:
			dpad.down = true;
			dpad.right = true;
			break;
		case 4:
			dpad.down = true;
			break;
		case 5:
			dpad.down = true;
			dpad.left = true;
			break;
		case 6:
			dpad.left = true;
			break;
		case 7:
			dpad.up = true;
			dpad.left = true;
			break;
		default:
			break;
	}
	return dpad;
}

function alreadyStandard(gp) {
	return gp && gp.mapping === 'standard' && gp.buttons && gp.buttons.length >= 12 && gp.axes && gp.axes.length >= 4;
}

/**
 * DirectInput / unmapped Steam layout -> standard 16 buttons + 4 axes.
 */
function remapDirectInput(gp) {
	const srcButtons = gp.buttons || [];
	const srcAxes = gp.axes || [];
	// 6+ axes with empty mapping: 0,1 left stick; 2 LT; 3,4 right pad/stick; 5 RT
	const dinput = gp.mapping !== 'standard' && srcAxes.length >= 6;

	const lx = srcAxes[0] || 0;
	const ly = srcAxes[1] || 0;
	let rx, ry, lt, rt;

	if (dinput) {
		lt = axisTrigger(srcAxes, 2);
		rx = srcAxes[3] || 0;
		ry = srcAxes[4] || 0;
		rt = axisTrigger(srcAxes, 5);
	} else {
		rx = srcAxes[2] || 0;
		ry = srcAxes[3] || 0;
		lt = buttonValue(srcButtons[6]);
		rt = buttonValue(srcButtons[7]);
	}

	const back = dinput ? isPressed(srcButtons[6]) : isPressed(srcButtons[8]);
	const start = dinput ? isPressed(srcButtons[7]) : isPressed(srcButtons[9]);
	const ls = dinput ? isPressed(srcButtons[9]) : isPressed(srcButtons[10]);
	const rs = dinput ? isPressed(srcButtons[10]) : isPressed(srcButtons[11]);

	let up = isPressed(srcButtons[12]);
	let down = isPressed(srcButtons[13]);
	let left = isPressed(srcButtons[14]);
	let right = isPressed(srcButtons[15]);

	if (!up && !down && !left && !right) {
		if (srcAxes.length >= 8 && (Math.abs(srcAxes[6] || 0) > 0.5 || Math.abs(srcAxes[7] || 0) > 0.5)) {
			left = (srcAxes[6] || 0) < -0.5;
			right = (srcAxes[6] || 0) > 0.5;
			up = (srcAxes[7] || 0) < -0.5;
			down = (srcAxes[7] || 0) > 0.5;
		} else {
			const hatIndex = srcAxes.length >= 10 ? 9 : srcAxes.length >= 7 ? srcAxes.length - 1 : -1;
			if (hatIndex >= 0) {
				const dpad = hatToDpad(srcAxes[hatIndex]);
				up = dpad.up;
				down = dpad.down;
				left = dpad.left;
				right = dpad.right;
			}
		}
	}

	return {
		id: gp.id,
		index: gp.index,
		mapping: 'standard',
		timestamp: gp.timestamp,
		buttons: [
			makeButton(isPressed(srcButtons[0])),
			makeButton(isPressed(srcButtons[1])),
			makeButton(isPressed(srcButtons[2])),
			makeButton(isPressed(srcButtons[3])),
			makeButton(isPressed(srcButtons[4])),
			makeButton(isPressed(srcButtons[5])),
			makeButton(lt > 0.5, lt),
			makeButton(rt > 0.5, rt),
			makeButton(back),
			makeButton(start),
			makeButton(ls),
			makeButton(rs),
			makeButton(up),
			makeButton(down),
			makeButton(left),
			makeButton(right)
		],
		axes: [lx, ly, rx, ry]
	};
}

/**
 * Prefer the pad the player is using. Windows XInput exposes four slots;
 * Chrome may return idle "Xbox 360 Controller" pads first.
 */
export function pickGamepad(gamepads) {
	let best = null;
	let bestScore = -1;
	for (let i = 0; i < gamepads.length; i++) {
		const gp = gamepads[i];
		if (!gp || !gp.buttons) {
			continue;
		}
		let score = 1;
		if (gp.mapping === 'standard') {
			score += 2;
		}
		if (isSteamGamepad(gp)) {
			score += 4;
		}
		let live = false;
		for (let b = 0; b < gp.buttons.length; b++) {
			if (isPressed(gp.buttons[b])) {
				live = true;
				break;
			}
		}
		if (!live) {
			for (let a = 0; a < (gp.axes || []).length; a++) {
				if (Math.abs(gp.axes[a]) > 0.25) {
					live = true;
					break;
				}
			}
		}
		if (live) {
			score += 20;
		}
		if (typeof gp.timestamp === 'number') {
			score += Math.min(gp.timestamp / 1e12, 1);
		}
		if (score > bestScore) {
			best = gp;
			bestScore = score;
		}
	}
	return best;
}

/**
 * @param {Gamepad} gp
 * @returns {Gamepad|object|null} standard-layout gamepad-like object
 */
export function normalizeGamepad(gp) {
	if (!gp) {
		return null;
	}
	if (alreadyStandard(gp)) {
		return gp;
	}
	if (isSteamGamepad(gp) || gp.mapping !== 'standard') {
		return remapDirectInput(gp);
	}
	return gp;
}

export default {
	pickGamepad,
	normalizeGamepad,
	isSteamGamepad,
	hatToDpad
};
