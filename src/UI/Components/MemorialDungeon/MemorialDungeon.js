/**
 * UI/Components/MemorialDungeon/MemorialDungeon.js
 *
 * Memorial Dungeon (instance) status window: standby priority, entry limit
 * and mission time limit countdowns, and the "Destroy instance" command.
 *
 * Packets: ZC_MEMORIALDUNGEON_SUBSCRIPTION_INFO (0x2cb),
 * ZC_MEMORIALDUNGEON_SUBSCRIPTION_NOTIFY (0x2cc), ZC_MEMORIALDUNGEON_INFO (0x2cd),
 * ZC_MEMORIALDUNGEON_NOTIFY (0x2ce), CZ_MEMORIALDUNGEON_COMMAND (0x2cf).
 *
 * Server timestamps are absolute unix times (seconds).
 */

import DB from 'DB/DBManager.js';
import Network from 'Network/NetworkManager.js';
import PACKET from 'Network/PacketStructure.js';
import Preferences from 'Core/Preferences.js';
import Session from 'Engine/SessionStorage.js';
import Renderer from 'Renderer/Renderer.js';
import UIManager from 'UI/UIManager.js';
import GUIComponent from 'UI/GUIComponent.js';
import ChatBox from 'UI/Components/ChatBox/ChatBox.js';
import htmlText from './MemorialDungeon.html?raw';
import cssText from './MemorialDungeon.css?raw';

/** CZ_MEMORIALDUNGEON_COMMAND commands */
export const MD_COMMAND = {
	SUBSCRIPTION_CANCEL: 0,
	DESTROY_FORCE: 3
};

/** ZC_MEMORIALDUNGEON_NOTIFY types */
export const MD_NOTIFY = {
	ENTER_LIMIT_UPDATE: 0,
	DESTROY_EXPIRED: 1,
	DESTROY_ENTER_TIMEOUT: 2,
	DESTROY_REMOVED: 3,
	CREATE_FAIL: 4
};

const MemorialDungeon = new GUIComponent('MemorialDungeon', cssText);
MemorialDungeon.render = () => htmlText;

const _preferences = Preferences.get('MemorialDungeon', { x: -1, y: 120, minimized: false }, 1.0);

/**
 * Current state, mirrored in Session.MemorialDungeon so it survives map-server changes.
 * state: '' | 'standby' | 'available' | 'progress'
 */
function emptyState() {
	return { state: '', name: '', priority: 0, destroyDate: 0, enterLimitDate: 0 };
}
let _data = emptyState();

function msg(id, fallback) {
	const text = DB.getMessage(id, fallback);
	return typeof text === 'string' && text.length ? text : fallback;
}

function escapeHtml(text) {
	return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

/** Escape, then turn RO ^RRGGBB colour codes into spans. */
function colorize(text) {
	let open = 0;
	let html = escapeHtml(text).replace(/\^([0-9a-fA-F]{6})/g, (m, color) => {
		if (color === '000000') {
			if (open > 0) {
				open--;
				return '</span>';
			}
			return '';
		}
		open++;
		return `<span style="color:#${color}">`;
	});
	while (open-- > 0) html += '</span>';
	return html;
}

/** Seconds -> HH:MM:SS (never negative) */
export function formatRemaining(seconds) {
	seconds = Math.max(0, Math.floor(seconds));
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = seconds % 60;
	return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
}

function nowSeconds() {
	return Math.floor(Date.now() / 1000);
}

/**
 * Initialize UI
 */
MemorialDungeon.init = function init() {
	const root = this.getRoot();
	this.draggable(root.querySelector('.titlebar'));

	root.querySelector('.mini').addEventListener('click', () => {
		_preferences.minimized = !_preferences.minimized;
		_preferences.save();
		applyMinimized();
	});

	root.querySelector('.destroy').addEventListener('click', () => {
		const question = `${msg(3270, 'Destroy instance')}: ${_data.name}?`;
		UIManager.showPromptBox(question, 'ok', 'cancel', () => {
			MemorialDungeon.sendCommand(MD_COMMAND.DESTROY_FORCE);
		});
	});
};

function applyMinimized() {
	const win = MemorialDungeon.getRoot().querySelector('#MemorialDungeon');
	if (win) win.classList.toggle('minimized', !!_preferences.minimized);
}

MemorialDungeon.onAppend = function onAppend() {
	const width = this._host.offsetWidth || 280;
	const x = _preferences.x < 0 ? Renderer.width - width - 10 : _preferences.x;
	this._host.style.top = Math.min(Math.max(0, _preferences.y), Math.max(0, Renderer.height - 40)) + 'px';
	this._host.style.left = Math.min(Math.max(0, x), Math.max(0, Renderer.width - width)) + 'px';
	applyMinimized();
	this.refresh();
	this.startTimer();
};

MemorialDungeon.onRemove = function onRemove() {
	this.stopTimer();
	if (this._host.style.top) {
		_preferences.y = parseInt(this._host.style.top, 10);
		_preferences.x = parseInt(this._host.style.left, 10);
		_preferences.save();
	}
};

MemorialDungeon.startTimer = function startTimer() {
	this.stopTimer();
	this._timer = setInterval(() => this.refresh(), 1000);
};

MemorialDungeon.stopTimer = function stopTimer() {
	if (this._timer) {
		clearInterval(this._timer);
		this._timer = null;
	}
};

/**
 * Re-render text and countdowns from _data.
 */
MemorialDungeon.refresh = function refresh() {
	if (!this.__loaded) return;
	const root = this.getRoot();
	const name = _data.name || '';
	const nameEl = root.querySelector('.name');
	const priorityEl = root.querySelector('.priority');
	const missionEl = root.querySelector('.mission');
	const missionTime = root.querySelector('.mission-time');
	const enterEl = root.querySelector('.enter');
	const destroyBtn = root.querySelector('.destroy');
	const now = nowSeconds();

	let header;
	switch (_data.state) {
		case 'standby':
			header = msg(1337, '%s in Standby');
			break;
		case 'available':
			header = msg(1338, '%s Available');
			break;
		default:
			header = msg(1339, '%s in Progress');
	}
	nameEl.textContent = header.replace('%s', name);

	if (_data.state === 'standby') {
		priorityEl.style.display = '';
		priorityEl.innerHTML = colorize(
			msg(1342, 'Your Standby Priority: ^ff0000%d^000000').replace('%d', String(_data.priority))
		);
	} else {
		priorityEl.style.display = 'none';
	}

	if (_data.destroyDate > 0) {
		missionEl.style.display = '';
		missionTime.textContent = formatRemaining(_data.destroyDate - now);
	} else {
		missionEl.style.display = 'none';
	}

	if (_data.enterLimitDate > 0) {
		enterEl.style.display = '';
		enterEl.innerHTML = colorize(
			msg(1343, 'The requested dungeon will be removed if you do not enter within ^ff0000%s^000000.').replace(
				'%s',
				formatRemaining(_data.enterLimitDate - now)
			)
		);
	} else {
		enterEl.style.display = 'none';
	}

	destroyBtn.style.display = _data.state === 'standby' ? 'none' : '';
};

function save() {
	Session.MemorialDungeon = _data.state ? Object.assign({}, _data) : null;
}

function show() {
	save();
	if (!MemorialDungeon.__active) {
		MemorialDungeon.append();
	} else {
		MemorialDungeon.refresh();
	}
}

function close() {
	_data = emptyState();
	save();
	if (MemorialDungeon.__active) {
		MemorialDungeon.remove();
	}
}

/**
 * 0x2cb ZC_MEMORIALDUNGEON_SUBSCRIPTION_INFO: dungeon reserved (or re-sent on login).
 */
MemorialDungeon.onSubscriptionInfo = function onSubscriptionInfo(pkt) {
	const isNew = _data.name !== pkt.MemorialDungeonName || !_data.state;
	_data = emptyState();
	_data.state = 'standby';
	_data.name = pkt.MemorialDungeonName;
	_data.priority = pkt.PriorityOrderNum;
	if (isNew) {
		ChatBox.addText(
			msg(1319, 'Memorial Dungeon, [%s] is booked.').replace('%s', _data.name),
			ChatBox.TYPE.INFO,
			ChatBox.FILTER.PUBLIC_LOG
		);
	}
	show();
};

/**
 * 0x2cc ZC_MEMORIALDUNGEON_SUBSCRIPTION_NOTIFY: standby priority update; negative = reservation cancelled.
 */
MemorialDungeon.onSubscriptionNotify = function onSubscriptionNotify(pkt) {
	if (pkt.PriorityOrderNum < 0) {
		ChatBox.addText(msg(1345, 'The Memorial Dungeon reservation has been canceled.'), ChatBox.TYPE.INFO, ChatBox.FILTER.PUBLIC_LOG);
		close();
		return;
	}
	_data.priority = pkt.PriorityOrderNum;
	if (!_data.state) _data.state = 'standby';
	show();
};

/**
 * 0x2cd ZC_MEMORIALDUNGEON_INFO: DestroyDate = mission time limit, EnterTimeOutDate = entry limit.
 * Older servers zero whichever field does not apply; keep the last known mission limit for the same dungeon.
 */
MemorialDungeon.onInfo = function onInfo(pkt) {
	const sameDungeon = _data.name === pkt.MemorialDungeonName;
	const prevDestroy = sameDungeon ? _data.destroyDate : 0;
	const wasProgress = sameDungeon && _data.state === 'progress';
	if (!sameDungeon && !_data.state) {
		ChatBox.addText(
			msg(1322, 'Memorial Dungeon, [%s] is created.\n Please enter in 5 minutes.').replace('%s', pkt.MemorialDungeonName).replace(/\\n/g, ' '),
			ChatBox.TYPE.INFO,
			ChatBox.FILTER.PUBLIC_LOG
		);
	}
	_data.name = pkt.MemorialDungeonName;
	_data.destroyDate = pkt.DestroyDate > 0 ? pkt.DestroyDate : prevDestroy;
	_data.enterLimitDate = pkt.EnterTimeOutDate > 0 ? pkt.EnterTimeOutDate : 0;
	_data.state = pkt.DestroyDate > 0 || wasProgress ? 'progress' : 'available';
	show();
};

/**
 * 0x2ce ZC_MEMORIALDUNGEON_NOTIFY
 */
MemorialDungeon.onNotify = function onNotify(pkt) {
	switch (pkt.Type) {
		case MD_NOTIFY.ENTER_LIMIT_UPDATE:
			if (pkt.EnterLimitDate > 0) {
				_data.enterLimitDate = pkt.EnterLimitDate;
				show();
			}
			return;
		case MD_NOTIFY.DESTROY_EXPIRED:
			ChatBox.addText(msg(1346, 'The Memorial Dungeon duration expired; it has been destroyed.'), ChatBox.TYPE.INFO, ChatBox.FILTER.PUBLIC_LOG);
			break;
		case MD_NOTIFY.DESTROY_ENTER_TIMEOUT:
			ChatBox.addText(
				msg(1347, "The Memorial Dungeon's entry time limit expired; it has been destroyed."),
				ChatBox.TYPE.INFO,
				ChatBox.FILTER.PUBLIC_LOG
			);
			break;
		case MD_NOTIFY.DESTROY_REMOVED:
			ChatBox.addText(msg(1348, 'The Memorial Dungeon has been removed.'), ChatBox.TYPE.INFO, ChatBox.FILTER.PUBLIC_LOG);
			break;
		default:
			// 4: create failure / left the instance owner group: just close the window
			break;
	}
	close();
};

MemorialDungeon.sendCommand = function sendCommand(command) {
	const pkt = new PACKET.CZ.MEMORIALDUNGEON_COMMAND();
	pkt.Command = command;
	Network.sendPacket(pkt);
};

/**
 * Restore after a map-server change / reconnect.
 */
MemorialDungeon.restore = function restore() {
	if (Session.MemorialDungeon && Session.MemorialDungeon.state) {
		_data = Object.assign(emptyState(), Session.MemorialDungeon);
		if (!MemorialDungeon.__active) MemorialDungeon.append();
	}
};

/** Forget everything (character select / logout). */
MemorialDungeon.reset = function reset() {
	_data = emptyState();
	Session.MemorialDungeon = null;
};

/** For tests */
MemorialDungeon.getState = () => Object.assign({}, _data);

export default UIManager.addComponent(MemorialDungeon);
