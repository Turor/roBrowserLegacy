/**
 * Eden Group hunting board (Turoran). Accept and turn in from the menu.
 */

import DB from 'DB/DBManager.js';
import MonsterTable from 'DB/Monsters/MonsterTable.js';
import Preferences from 'Core/Preferences.js';
import Renderer from 'Renderer/Renderer.js';
import UIManager from 'UI/UIManager.js';
import GUIComponent from 'UI/GUIComponent.js';
import Network from 'Network/NetworkManager.js';
import PACKET from 'Network/PacketStructure.js';
import ChatBox from 'UI/Components/ChatBox/ChatBox.js';
import htmlText from './EdenGroup.html?raw';
import cssText from './EdenGroup.css?raw';
import 'UI/Elements/Elements.js';

const EdenGroup = new GUIComponent('TuroranEden', cssText);
EdenGroup.render = () => htmlText;

const ST = {
	AVAILABLE: 0,
	ACTIVE: 1,
	TURNIN: 2,
	COOLDOWN: 3
};

const ACT = {
	LIST: 0,
	ACCEPT: 1,
	COMPLETE: 2,
	ABANDON: 3
};

const _preferences = Preferences.get('TuroranEden', { x: 180, y: 120, tab: 'available' }, 1.0);

let _list = [];
let _baseLevel = 1;
let _selectedId = 0;

function monsterName(id) {
	if (!id) {
		return '';
	}
	if (typeof DB.getMonsterName === 'function') {
		const name = DB.getMonsterName(id);
		if (name) {
			return name;
		}
	}
	return MonsterTable[id] || `#${id}`;
}

function escapeHtml(value) {
	return String(value ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function itemName(id) {
	if (!id) {
		return '';
	}
	const info = DB.getItemInfo(id);
	return info?.identifiedDisplayName || `#${id}`;
}

function stateLabel(state) {
	switch (state) {
		case ST.ACTIVE:
			return 'In progress';
		case ST.TURNIN:
			return 'Ready';
		case ST.COOLDOWN:
			return 'Cooldown';
		default:
			return 'Available';
	}
}

function sendAction(action, questId) {
	const pkt = new PACKET.CZ.TURORAN_EDEN_REQ();
	pkt.action = action;
	pkt.questId = questId || 0;
	Network.sendPacket(pkt);
}

function selectedQuest() {
	return _list.find(q => q.questId === _selectedId) || null;
}

function matchesTab(q, tab) {
	if (tab === 'all') {
		return true;
	}
	if (tab === 'available') {
		return q.state === ST.AVAILABLE;
	}
	if (tab === 'active') {
		return q.state === ST.ACTIVE;
	}
	if (tab === 'turnin') {
		return q.state === ST.TURNIN;
	}
	return true;
}

EdenGroup.init = function init() {
	const root = this.getRoot();

	root.querySelector('.close')?.addEventListener('click', () => {
		EdenGroup._host.style.display = 'none';
	});

	root.querySelectorAll('.tab').forEach(el => {
		el.addEventListener('click', () => {
			_preferences.tab = el.dataset.tab;
			_preferences.save();
			EdenGroup.applyTab();
			EdenGroup.renderList();
		});
	});

	root.querySelector('.accept').addEventListener('click', () => {
		const q = selectedQuest();
		if (q) {
			sendAction(ACT.ACCEPT, q.questId);
		}
	});
	root.querySelector('.complete').addEventListener('click', () => {
		const q = selectedQuest();
		if (q) {
			sendAction(ACT.COMPLETE, q.questId);
		}
	});
	root.querySelector('.abandon').addEventListener('click', () => {
		const q = selectedQuest();
		if (q) {
			sendAction(ACT.ABANDON, q.questId);
		}
	});

	this.draggable(root.querySelector('.titlebar'));
};

EdenGroup.applyTab = function applyTab() {
	const root = this.getRoot();
	const tab = _preferences.tab || 'available';
	root.querySelectorAll('.tab').forEach(el => {
		el.classList.toggle('active', el.dataset.tab === tab);
	});
};

EdenGroup.onAppend = function onAppend() {
	Object.assign(this._host.style, {
		top: `${Math.min(Math.max(0, _preferences.y), Renderer.height - 460)}px`,
		left: `${Math.min(Math.max(0, _preferences.x), Renderer.width - 640)}px`
	});
	EdenGroup.applyTab();
	EdenGroup.renderList();
	sendAction(ACT.LIST, 0);
};

EdenGroup.toggle = function toggle() {
	const closed =
		!this._host || this._host.style.display === 'none' || !this._host.parentNode;
	if (closed) {
		this.append();
		this._host.style.display = '';
		this.focus();
		sendAction(ACT.LIST, 0);
	} else {
		this._host.style.display = 'none';
	}
};

EdenGroup.setList = function setList(pkt) {
	_baseLevel = pkt.baseLevel || _baseLevel;
	_list = pkt.list || [];
	if (_selectedId && !_list.some(q => q.questId === _selectedId)) {
		_selectedId = 0;
	}
	if (!_selectedId) {
		const ready = _list.find(q => q.state === ST.TURNIN);
		const active = _list.find(q => q.state === ST.ACTIVE);
		_selectedId = (ready || active || _list[0] || {}).questId || 0;
	}
	EdenGroup.renderList();
};

EdenGroup.onResult = function onResult(pkt) {
	const messages = {
		1: 'Eden Group could not process that request.',
		2: 'That mission is not for your base level.',
		3: 'Finish or abandon your current Eden mission first.',
		4: 'You are not on that mission.',
		5: 'The hunt is not finished yet.',
		6: 'You are missing the required items.',
		7: 'That mission is still on cooldown.',
		8: 'Not enough inventory space for the reward.'
	};
	if (pkt.result !== 0) {
		ChatBox.addText(messages[pkt.result] || messages[1], ChatBox.TYPE.ERROR | ChatBox.TYPE.SELF);
	}
};

EdenGroup.renderList = function renderList() {
	const root = EdenGroup.getRoot();
	if (!root) {
		return;
	}
	const listEl = root.querySelector('.list');
	const tab = _preferences.tab || 'available';
	const rows = _list.filter(q => matchesTab(q, tab));

	listEl.innerHTML = '';
	if (!rows.length) {
		const empty = document.createElement('div');
		empty.className = 'empty';
		if (tab === 'turnin') {
			empty.textContent = 'No missions ready to turn in.';
		} else if (tab === 'active') {
			empty.textContent = 'No mission in progress.';
		} else if (tab === 'available' && _baseLevel < 11) {
			empty.textContent = `No hunts for base level ${_baseLevel}. Eden hunting starts at level 11.`;
		} else if (tab === 'available') {
			empty.textContent = `No available hunts for base level ${_baseLevel}.`;
		} else {
			empty.textContent = 'No Eden missions for this filter.';
		}
		listEl.appendChild(empty);
		EdenGroup.renderDetail();
		return;
	}

	rows.forEach(q => {
		const row = document.createElement('div');
		row.className = 'row';
		if (q.questId === _selectedId) {
			row.classList.add('selected');
		}
		if (q.state === ST.TURNIN) {
			row.classList.add('turnin');
		}
		if (q.state === ST.COOLDOWN) {
			row.classList.add('cooldown');
		}
		row.dataset.questId = String(q.questId);

		const hunt =
			q.huntMax > 0 ? `${q.huntCount}/${q.huntMax} ${monsterName(q.mobId)}` : '';
		row.innerHTML =
			`<div class="meta"><div class="name">${escapeHtml(q.name)}</div>` +
			`<div class="sub">${escapeHtml(hunt || q.hint)}</div></div>` +
			`<span class="badge${q.state === ST.TURNIN ? ' turnin' : ''}${q.state === ST.COOLDOWN ? ' cooldown' : ''}">${stateLabel(q.state)}</span>`;
		row.addEventListener('click', () => {
			_selectedId = q.questId;
			EdenGroup.renderList();
		});
		listEl.appendChild(row);
	});

	EdenGroup.renderDetail();
};

EdenGroup.renderDetail = function renderDetail() {
	const root = EdenGroup.getRoot();
	if (!root) {
		return;
	}
	const emptyEl = root.querySelector('.empty-detail');
	const body = root.querySelector('.detail-body');
	const q = selectedQuest();
	if (!q) {
		emptyEl.hidden = false;
		body.hidden = true;
		return;
	}
	emptyEl.hidden = true;
	body.hidden = false;

	root.querySelector('.d-name').textContent = q.name;
	root.querySelector('.d-range').textContent = `Lv ${q.minLv}–${q.maxLv}  ·  you are ${ _baseLevel}`;
	root.querySelector('.d-hint').textContent = q.hint;
	if (q.huntMax > 0) {
		root.querySelector('.d-hunt').textContent =
			`Hunt: ${q.huntCount} / ${q.huntMax} ${monsterName(q.mobId)}`;
		root.querySelector('.hunt-bar').style.display = '';
		root.querySelector('.hunt-fill').style.width =
			`${Math.min(100, Math.floor((q.huntCount / q.huntMax) * 100))}%`;
	} else {
		root.querySelector('.d-hunt').textContent = '';
		root.querySelector('.hunt-bar').style.display = 'none';
	}

	const itemEl = root.querySelector('.d-item');
	if (q.itemId > 0 && q.itemNeed > 0) {
		itemEl.hidden = false;
		itemEl.textContent = `Bring: ${q.itemHave} / ${q.itemNeed} ${itemName(q.itemId)}`;
	} else {
		itemEl.hidden = true;
	}

	const rewards = [];
	if (q.baseExp > 0) {
		rewards.push(`${q.baseExp} Base EXP`);
	}
	if (q.jobExp > 0) {
		rewards.push(`${q.jobExp} Job EXP`);
	}
	if (q.rewardItem > 0 && q.rewardItemAmount > 0) {
		rewards.push(`${q.rewardItemAmount}× ${itemName(q.rewardItem)}`);
	}
	root.querySelector('.d-reward').textContent = rewards.length
		? `Reward: ${rewards.join(', ')}`
		: 'Reward: none listed';

	root.querySelector('.accept').disabled = q.state !== ST.AVAILABLE;
	root.querySelector('.complete').disabled = q.state !== ST.TURNIN;
	root.querySelector('.abandon').disabled = q.state !== ST.ACTIVE && q.state !== ST.TURNIN;
};

export default UIManager.addComponent(EdenGroup);
