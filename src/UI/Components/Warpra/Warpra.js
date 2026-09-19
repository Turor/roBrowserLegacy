/**
 * Warpra location window (Turoran).
 */

import Preferences from 'Core/Preferences.js';
import Renderer from 'Renderer/Renderer.js';
import UIManager from 'UI/UIManager.js';
import GUIComponent from 'UI/GUIComponent.js';
import Network from 'Network/NetworkManager.js';
import PACKET from 'Network/PacketStructure.js';
import ChatBox from 'UI/Components/ChatBox/ChatBox.js';
import htmlText from './Warpra.html?raw';
import cssText from './Warpra.css?raw';
import 'UI/Elements/Elements.js';

const Warpra = new GUIComponent('TuroranWarpra', cssText);
Warpra.render = () => htmlText;

const KIND = {
	TOWN: 0,
	FIELD: 1,
	DUNGEON: 2,
	SPECIAL: 3
};

const ACT = {
	LIST: 0,
	WARP: 1,
	BUY: 2
};

const RES = {
	OK: 0,
	ERR: 1,
	LOCKED: 2,
	NOZENY: 3,
	INVALID: 4,
	BUSY: 5
};

const TAB_KIND = {
	town: KIND.TOWN,
	field: KIND.FIELD,
	dungeon: KIND.DUNGEON,
	special: KIND.SPECIAL
};

const _preferences = Preferences.get(
	'TuroranWarpra',
	{ x: 160, y: 90, tab: 'town' },
	1.0
);

let _list = [];
let _zeny = 0;
let _price = 50000000;
let _fieldGroup = null;
let _pending = null;

function escapeHtml(value) {
	return String(value ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function formatZeny(n) {
	return String(n || 0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function thumbUrl(map) {
	return `warpra/${encodeURIComponent(map)}.jpg`;
}

function sendAction(action, kind, locId) {
	const pkt = new PACKET.CZ.TURORAN_WARPRA_REQ();
	pkt.action = action;
	pkt.kind = kind || 0;
	pkt.locId = locId || 0;
	Network.sendPacket(pkt);
}

function ofKind(kind) {
	return _list.filter(loc => loc.kind === kind);
}

function fieldGroups() {
	const groups = new Map();
	ofKind(KIND.FIELD).forEach(loc => {
		const key = loc.group;
		if (!groups.has(key)) {
			groups.set(key, {
				id: key,
				name: loc.groupName || `Region ${key}`,
				locs: [],
				unlocked: 0
			});
		}
		const g = groups.get(key);
		g.locs.push(loc);
		if (loc.unlocked) {
			g.unlocked += 1;
		}
	});
	return Array.from(groups.values());
}

function updateZeny() {
	const root = Warpra.getRoot();
	if (!root) {
		return;
	}
	const el = root.querySelector('.zeny-count');
	if (el) {
		el.textContent = formatZeny(_zeny);
	}
}

function hideModal() {
	const root = Warpra.getRoot();
	if (!root) {
		return;
	}
	root.querySelector('.modal').hidden = true;
	_pending = null;
}

function showModal(loc) {
	const root = Warpra.getRoot();
	if (!root || !loc) {
		return;
	}
	_pending = loc;
	root.querySelector('.m-title').textContent = `Unlock ${loc.name}?`;
	root.querySelector('.m-body').textContent =
		`${loc.name} is locked. Buy this warp for ${formatZeny(_price)} zeny?`;
	root.querySelector('.m-zeny').textContent = `You have ${formatZeny(_zeny)} zeny.`;
	root.querySelector('.buy').disabled = _zeny < _price;
	root.querySelector('.modal').hidden = false;
}

function onTileClick(loc) {
	if (!loc) {
		return;
	}
	if (!loc.unlocked) {
		showModal(loc);
		return;
	}
	sendAction(ACT.WARP, loc.kind, loc.id);
}

function renderGrid() {
	const root = Warpra.getRoot();
	if (!root) {
		return;
	}
	updateZeny();
	const tab = _preferences.tab || 'town';
	root.querySelectorAll('.tab').forEach(el => {
		el.classList.toggle('active', el.dataset.tab === tab);
	});
	const crumb = root.querySelector('.crumb');
	const grid = root.querySelector('.grid');
	grid.innerHTML = '';

	if (tab === 'field' && _fieldGroup === null) {
		crumb.hidden = true;
		const groups = fieldGroups();
		if (!groups.length) {
			grid.innerHTML = '<div class="empty">No field regions loaded.</div>';
			return;
		}
		groups.forEach(g => {
			const sample = g.locs[0];
			const tile = document.createElement('button');
			tile.type = 'button';
			tile.className = 'tile';
			tile.innerHTML =
				`<img class="thumb" alt="" src="${thumbUrl(sample.map)}" />` +
				`<div class="meta"><span class="name">${escapeHtml(g.name)}</span>` +
				`<span class="sub">${g.locs.length} maps</span>` +
				`<span class="stamp">${g.unlocked} / ${g.locs.length} visited</span></div>`;
			tile.querySelector('img').addEventListener('error', ev => {
				ev.target.style.visibility = 'hidden';
			});
			tile.addEventListener('click', () => {
				_fieldGroup = g.id;
				renderGrid();
			});
			grid.appendChild(tile);
		});
		return;
	}

	let rows = ofKind(TAB_KIND[tab] ?? KIND.TOWN);
	if (tab === 'field') {
		const groups = fieldGroups();
		const g = groups.find(x => x.id === _fieldGroup);
		crumb.hidden = false;
		root.querySelector('.crumb-label').textContent = g ? `${g.name} Fields` : 'Fields';
		rows = rows.filter(loc => loc.group === _fieldGroup);
	} else {
		crumb.hidden = true;
		_fieldGroup = null;
	}

	if (!rows.length) {
		grid.innerHTML = '<div class="empty">No locations in this list.</div>';
		return;
	}

	rows.forEach(loc => {
		const tile = document.createElement('button');
		tile.type = 'button';
		tile.className = 'tile' + (loc.unlocked ? '' : ' locked');
		const extra = loc.kind === KIND.SPECIAL && loc.groupName
			? `<span class="sub">${escapeHtml(loc.groupName)}</span>`
			: '';
		tile.innerHTML =
			`<img class="thumb" alt="" src="${thumbUrl(loc.map)}" />` +
			`<div class="meta"><span class="name">${escapeHtml(loc.name)}</span>${extra}` +
			`<span class="stamp">${loc.unlocked ? 'Visited' : 'Locked'}</span></div>`;
		tile.querySelector('img').addEventListener('error', ev => {
			ev.target.style.visibility = 'hidden';
		});
		tile.addEventListener('click', () => onTileClick(loc));
		grid.appendChild(tile);
	});
}

Warpra.init = function init() {
	const root = this.getRoot();

	root.querySelector('.close')?.addEventListener('click', () => {
		Warpra._host.style.display = 'none';
		hideModal();
	});

	root.querySelectorAll('.tab').forEach(el => {
		el.addEventListener('click', () => {
			_preferences.tab = el.dataset.tab;
			_preferences.save();
			_fieldGroup = null;
			hideModal();
			renderGrid();
		});
	});

	root.querySelector('.back').addEventListener('click', () => {
		_fieldGroup = null;
		renderGrid();
	});

	root.querySelector('.cancel').addEventListener('click', hideModal);
	root.querySelector('.buy').addEventListener('click', () => {
		if (!_pending) {
			return;
		}
		sendAction(ACT.BUY, _pending.kind, _pending.id);
	});

	this.draggable(root.querySelector('.titlebar'));
};

Warpra.onAppend = function onAppend() {
	Object.assign(this._host.style, {
		top: `${Math.min(Math.max(0, _preferences.y), Renderer.height - 540)}px`,
		left: `${Math.min(Math.max(0, _preferences.x), Renderer.width - 720)}px`
	});
	renderGrid();
	sendAction(ACT.LIST, 0, 0);
};

Warpra.toggle = function toggle() {
	const closed =
		!this._host || this._host.style.display === 'none' || !this._host.parentNode;
	if (closed) {
		this.append();
		this._host.style.display = '';
		this.focus();
		sendAction(ACT.LIST, 0, 0);
	} else {
		this._host.style.display = 'none';
		hideModal();
	}
};

Warpra.onRemove = function onRemove() {
	hideModal();
};

Warpra.setList = function setList(pkt) {
	_zeny = pkt.zeny || 0;
	_price = pkt.price || _price;
	_list = pkt.list || [];
	if (_pending) {
		const next = _list.find(loc => loc.kind === _pending.kind && loc.id === _pending.id);
		if (next && next.unlocked) {
			hideModal();
		}
	}
	renderGrid();
};

Warpra.onResult = function onResult(pkt) {
	const loc = _list.find(l => l.kind === pkt.kind && l.id === pkt.locId);
	const name = loc ? loc.name : 'that location';
	switch (pkt.result) {
	case RES.OK:
		if (_pending && _pending.kind === pkt.kind && _pending.id === pkt.locId) {
			ChatBox.addText(`Unlocked ${name}.`, ChatBox.TYPE.INFO);
			hideModal();
		} else if (loc && loc.unlocked) {
			Warpra._host.style.display = 'none';
			hideModal();
		}
		break;
	case RES.LOCKED:
		if (loc) {
			showModal(loc);
		}
		ChatBox.addText(`${name} is locked.`, ChatBox.TYPE.ERROR);
		break;
	case RES.NOZENY:
		ChatBox.addText(`Need ${formatZeny(_price)} zeny to unlock ${name}.`, ChatBox.TYPE.ERROR);
		if (_pending) {
			const root = Warpra.getRoot();
			if (root) {
				root.querySelector('.m-zeny').textContent =
					`Not enough zeny. You have ${formatZeny(_zeny)}.`;
			}
		}
		break;
	case RES.BUSY:
		ChatBox.addText('You cannot warp right now.', ChatBox.TYPE.ERROR);
		break;
	case RES.INVALID:
	case RES.ERR:
		ChatBox.addText('Warp failed.', ChatBox.TYPE.ERROR);
		break;
	default:
		break;
	}
};

export default UIManager.addComponent(Warpra);
