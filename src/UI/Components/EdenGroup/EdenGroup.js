/**
 * Eden Group hunting board, merit shop, and gear (Turoran).
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
import Quest from 'UI/Components/Quest/Quest.js';
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
	ABANDON: 3,
	BUY: 4
};

const CAT = {
	SUPPLY: 0,
	GEAR: 1,
	UPGRADE: 2
};

const _preferences = Preferences.get(
	'TuroranEden',
	{ x: 180, y: 120, tab: 'available', main: 'missions' },
	1.0
);

let _list = [];
let _shop = [];
let _baseLevel = 1;
let _merit = 0;
let _selectedId = 0;
let _syncedQuestIds = new Set();

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

function huntName(q) {
	return monsterName(q.mobId) || q.name;
}

function buildLogQuest(q) {
	const huntID = q.questId;
	const hunt_list = [];
	if (q.huntMax > 0 || q.mobId) {
		hunt_list[huntID] = {
			huntID: huntID,
			huntIDCount: 0,
			mobType: 0,
			mobGID: q.mobId,
			lvlMin: 0,
			lvlMax: 0,
			huntCount: q.huntCount || 0,
			maxCount: q.huntMax || 0,
			mobName: huntName(q)
		};
	}
	return {
		questID: q.questId,
		title: q.name || 'Eden mission',
		summary: q.hint || '',
		description: q.hint ? [q.hint] : [],
		icon: 'ico_nq.bmp',
		npc_spr: null,
		npc_navi: null,
		npc_pos_x: null,
		npc_pos_y: null,
		reward_item_list: [],
		reward_exp_base: q.baseExp || 0,
		reward_exp_job: q.jobExp || 0,
		active: 1,
		start_time: 0,
		end_time: 0,
		count: q.huntMax > 0 ? 1 : 0,
		hunt_list: hunt_list
	};
}

function syncQuestLog(list) {
	const ui = typeof Quest.getUI === 'function' ? Quest.getUI() : Quest;
	if (!ui || typeof ui.addQuest !== 'function') {
		return;
	}
	const keep = new Set();
	(list || []).forEach(q => {
		if (q.state !== ST.ACTIVE && q.state !== ST.TURNIN) {
			return;
		}
		keep.add(q.questId);
		ui.addQuest(buildLogQuest(q), q.questId);
		_syncedQuestIds.add(q.questId);
	});
	for (const id of Array.from(_syncedQuestIds)) {
		if (!keep.has(id) && typeof ui.removeQuest === 'function') {
			ui.removeQuest(id);
			_syncedQuestIds.delete(id);
		}
	}
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

function updateMerit() {
	const root = EdenGroup.getRoot();
	if (!root) {
		return;
	}
	const el = root.querySelector('.merit-count');
	if (el) {
		el.textContent = String(_merit);
	}
}

EdenGroup.init = function init() {
	const root = this.getRoot();

	root.querySelector('.close')?.addEventListener('click', () => {
		EdenGroup._host.style.display = 'none';
	});

	root.querySelectorAll('.main-tab').forEach(el => {
		el.addEventListener('click', () => {
			_preferences.main = el.dataset.main;
			_preferences.save();
			EdenGroup.applyTab();
		});
	});

	root.querySelectorAll('.sub-tab').forEach(el => {
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
	const main = _preferences.main || 'missions';
	const tab = _preferences.tab || 'available';
	root.querySelectorAll('.main-tab').forEach(el => {
		el.classList.toggle('active', el.dataset.main === main);
	});
	root.querySelectorAll('.sub-tab').forEach(el => {
		el.classList.toggle('active', el.dataset.tab === tab);
	});
	root.querySelector('.panel-missions').hidden = main !== 'missions';
	root.querySelector('.panel-shop').hidden = main !== 'shop';
	root.querySelector('.panel-gear').hidden = main !== 'gear';
	root.querySelector('.panel-upgrade').hidden = main !== 'upgrade';
};

EdenGroup.onAppend = function onAppend() {
	Object.assign(this._host.style, {
		top: `${Math.min(Math.max(0, _preferences.y), Renderer.height - 500)}px`,
		left: `${Math.min(Math.max(0, _preferences.x), Renderer.width - 640)}px`
	});
	EdenGroup.applyTab();
	EdenGroup.renderList();
	EdenGroup.renderShop();
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
	if (typeof pkt.merit === 'number') {
		_merit = pkt.merit;
	}
	_list = pkt.list || [];
	if (_selectedId && !_list.some(q => q.questId === _selectedId)) {
		_selectedId = 0;
	}
	if (!_selectedId) {
		const ready = _list.find(q => q.state === ST.TURNIN);
		const active = _list.find(q => q.state === ST.ACTIVE);
		_selectedId = (ready || active || _list[0] || {}).questId || 0;
	}
	syncQuestLog(_list);
	updateMerit();
	EdenGroup.renderList();
};

EdenGroup.setShop = function setShop(pkt) {
	if (typeof pkt.merit === 'number') {
		_merit = pkt.merit;
	}
	_shop = pkt.list || [];
	updateMerit();
	EdenGroup.renderShop();
};

EdenGroup.onResult = function onResult(pkt) {
	const messages = {
		1: 'Eden Group could not process that request.',
		2: 'That is not available at your base level.',
		3: 'Finish or abandon your current Eden mission first.',
		4: 'You are not on that mission.',
		5: 'The hunt is not finished yet.',
		6: 'You are missing the required items.',
		7: 'That mission is still on cooldown.',
		8: 'Not enough inventory space for the reward.',
		9: 'Not enough Eden Merit Badges.'
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
	updateMerit();
	const listEl = root.querySelector('.mission-list');
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
	root.querySelector('.d-range').textContent = `Lv ${q.minLv}–${q.maxLv}  ·  you are ${_baseLevel}`;
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
	rewards.push('Eden Merit Badges');
	root.querySelector('.d-reward').textContent = `Reward: ${rewards.join(', ')}`;

	root.querySelector('.accept').disabled = q.state !== ST.AVAILABLE;
	root.querySelector('.complete').disabled = q.state !== ST.TURNIN;
	root.querySelector('.abandon').disabled = q.state !== ST.ACTIVE && q.state !== ST.TURNIN;
};

EdenGroup.renderShop = function renderShop() {
	const root = EdenGroup.getRoot();
	if (!root) {
		return;
	}
	updateMerit();
	root.querySelectorAll('.shop-list').forEach(listEl => {
		const cat = Number(listEl.dataset.cat);
		const rows = _shop.filter(it => it.cat === cat);
		listEl.innerHTML = '';
		if (!rows.length) {
			const empty = document.createElement('div');
			empty.className = 'empty';
			empty.textContent = 'Nothing in this shop right now.';
			listEl.appendChild(empty);
			return;
		}
		rows.forEach(it => {
			const locked = _baseLevel < it.minLv;
			const row = document.createElement('div');
			row.className = 'row shop' + (locked ? ' locked' : '');
			const price = it.priceMerit > 0 ? `${it.priceMerit} Merit` : `${it.priceZeny} z`;
			row.innerHTML =
				`<div class="meta"><div class="name">${escapeHtml(itemName(it.itemId))}</div>` +
				`<div class="sub">${it.amount}× · Lv ${it.minLv}+ · ${price}</div></div>` +
				`<button class="buy" ${locked || _merit < it.priceMerit ? 'disabled' : ''}>Buy</button>`;
			const btn = row.querySelector('.buy');
			btn.addEventListener('click', () => sendAction(ACT.BUY, it.slot));
			listEl.appendChild(row);
		});
	});
};

export default UIManager.addComponent(EdenGroup);
