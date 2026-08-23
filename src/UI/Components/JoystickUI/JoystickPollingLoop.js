/**
 * UI/Components/JoystickUI/JoystickPollingLoop.js
 *
 * Poll the Gamepad API. Use requestAnimationFrame while a pad is connected
 * so Steam Controller trackpads / analog sticks feel responsive; fall back
 * to a slow timeout while idle (Chrome often omits gamepadconnected until
 * the first button press).
 *
 * @author AoShinHo
 */

import InputService from './JoystickInputService.js';

let timeoutHandle = null;
let rafHandle = null;
const POLL_RATE_IDLE = 250;

function clearHandles() {
	if (timeoutHandle) {
		clearTimeout(timeoutHandle);
		timeoutHandle = null;
	}
	if (rafHandle) {
		cancelAnimationFrame(rafHandle);
		rafHandle = null;
	}
}

export default {
	start: function () {
		if (timeoutHandle || rafHandle) {
			return;
		}
		this.run();
	},
	run: function () {
		const isConnected = InputService.update();
		const self = this;
		clearHandles();
		if (isConnected && typeof requestAnimationFrame === 'function') {
			rafHandle = requestAnimationFrame(function () {
				rafHandle = null;
				self.run();
			});
		} else {
			timeoutHandle = setTimeout(function () {
				timeoutHandle = null;
				self.run();
			}, POLL_RATE_IDLE);
		}
	},
	stop: function () {
		clearHandles();
	}
};
