/**
 * Homunculus + cute-pet account stable (Turoran beta).
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
import htmlText from './Stable.html?raw';
import cssText from './Stable.css?raw';
import 'UI/Elements/Elements.js';

const Stable = new GUIComponent('TuroranStable', cssText);
Stable.render = () => htmlText;

const _preferences = Preferences.get('TuroranStable', { x: 220, y: 140, tab: 'homun' }, 1.0);

let _homun = { activeHomunId: 0, list: [] };
let _pets = { activePetId: 0, list: [] };

const HOMUN_LINEAGE = {
	0: 'Lif',
	1: 'Amistr',
	2: 'Filir',
	3: 'Vanilmirth',
	4: 'Eleanor'
};

function lineageOf(classId, prevClass) {
	const s = [6048, 6049, 6050, 6051, 6052];
	let c = classId;
	if (s.includes(classId) && prevClass > 0) {
		c = prevClass;
	}
	if ([6001, 6005, 6009, 6013, 6048].includes(c)) return 0;
	if ([6002, 6006, 6010, 6014, 6049].includes(c)) return 1;
	if ([6003, 6007, 6011, 6015, 6051].includes(c)) return 2;
	if ([6004, 6008, 6012, 6016, 6050].includes(c)) return 3;
	if (c === 6052) return 4;
	return -1;
}

function monsterName(classId) {
	return MonsterTable[classId] || DB.getItemInfo?.(classId)?.identifiedDisplayName || `#${classId}`;
}

function intimacyLabel(value, isHomun) {
	if (isHomun) {
		if (value >= 91000) return 'Loyal';
		if (value >= 75000) return 'Cordial';
		if (value >= 25000) return 'Neutral';
		if (value >= 10000) return 'Shy';
		return 'Awkward';
	}
	if (value >= 900) return 'Loyal';
	if (value >= 750) return 'Cordial';
	if (value >= 250) return 'Neutral';
	if (value >= 100) return 'Shy';
	return 'Awkward';
}

Stable.init = function init() {
	const root = this.getRoot();
	root.querySelector('.close').addEventListener('click', () => {
		this._host.style.display = 'none';
	});
	root.querySelectorAll('.tab').forEach(tab => {
		tab.addEventListener('click', () => {
			_preferences.tab = tab.dataset.tab;
			_preferences.save();
			Stable.applyTab();
		});
	});
	root.querySelector('.store-homun').addEventListener('click', () => {
		const pkt = new PACKET.CZ.TURORAN_STABLE_HOMUN();
		pkt.homunId = 0;
		Network.sendPacket(pkt);
	});
	root.querySelector('.store-pet').addEventListener('click', () => {
		const pkt = new PACKET.CZ.TURORAN_STABLE_PET();
		pkt.action = 0;
		pkt.id = 0;
		Network.sendPacket(pkt);
	});
	this.draggable(root.querySelector('.titlebar'));
};

Stable.applyTab = function applyTab() {
	const root = this.getRoot();
	const tab = _preferences.tab || 'homun';
	root.querySelectorAll('.tab').forEach(el => {
		el.classList.toggle('active', el.dataset.tab === tab);
	});
	root.querySelector('.panel-homun').style.display = tab === 'homun' ? '' : 'none';
	root.querySelector('.panel-pets').style.display = tab === 'pets' ? '' : 'none';
};

Stable.onAppend = function onAppend() {
	Object.assign(this._host.style, {
		top: `${Math.min(Math.max(0, _preferences.y), Renderer.height - 420)}px`,
		left: `${Math.min(Math.max(0, _preferences.x), Renderer.width - 420)}px`
	});
	Stable.applyTab();
	Stable.renderLists();
};

Stable.toggle = function toggle() {
	if (!this._host || this._host.style.display === 'none' || !this._host.parentNode) {
		const pkt = new PACKET.CZ.TURORAN_STABLE_OPEN();
		Network.sendPacket(pkt);
		this.append();
		this._host.style.display = '';
		this.focus();
	} else {
		this._host.style.display = 'none';
	}
};

Stable.setHomunList = function setHomunList(pkt) {
	_homun = { activeHomunId: pkt.activeHomunId, list: pkt.list || [] };
	Stable.renderLists();
	if (this._host && this._host.style.display === 'none') {
		this._host.style.display = '';
		this.focus();
	}
};

Stable.setPetList = function setPetList(pkt) {
	_pets = { activePetId: pkt.activePetId, list: pkt.list || [] };
	Stable.renderLists();
	if (this._host && this._host.style.display === 'none') {
		this._host.style.display = '';
		this.focus();
	}
};

Stable.onResult = function onResult(pkt) {
	if (pkt.result === 0) {
		return;
	}
	const messages = {
		2: 'No homunculus in that slot.',
		3: 'You already have that homunculus type.',
		4: 'That pet is already out on another character.',
		5: 'Inventory is full.',
		6: 'That companion does not belong here.',
		7: 'No pet found.',
		8: 'Return your current pet to its egg first, or Store it.',
		9: 'Revive your homunculus first.'
	};
	ChatBox.addText(messages[pkt.result] || 'Stable action failed.', ChatBox.TYPE.ERROR | ChatBox.TYPE.SELF);
};

Stable.renderLists = function renderLists() {
	if (!this._host) {
		return;
	}
	const root = this.getRoot();
	const homunList = root.querySelector('.homun-list');
	const petList = root.querySelector('.pet-list');
	if (!homunList || !petList) {
		return;
	}

	if (!_homun.list.length) {
		homunList.innerHTML = '<div class="empty">No homunculi yet. Alchemists: Call Homunculus with an Embryo, then Store it here to raise another type.</div>';
	} else {
		homunList.innerHTML = '';
		_homun.list.forEach(row => {
			const lin = lineageOf(row.classId, row.prevClass);
			const typeName = HOMUN_LINEAGE[lin] || monsterName(row.classId);
			const active = row.homunId === _homun.activeHomunId;
			const el = document.createElement('div');
			el.className = 'row' + (active ? ' active' : '');
			el.innerHTML = `
				<div class="meta">
					<div class="name">${escapeHtml(row.name)} <span class="badge">${escapeHtml(typeName)}</span>${active ? '<span class="badge">Active</span>' : ''}</div>
					<div class="sub">Lv ${row.level} · ${intimacyLabel(row.intimacy, true)} · Hunger ${row.hunger} · ${monsterName(row.classId)}</div>
				</div>
				<div class="row-actions"></div>
			`;
			const actions = el.querySelector('.row-actions');
			if (!active) {
				const btn = document.createElement('button');
				btn.textContent = 'Swap in';
				btn.addEventListener('click', () => {
					const pkt = new PACKET.CZ.TURORAN_STABLE_HOMUN();
					pkt.homunId = row.homunId;
					Network.sendPacket(pkt);
				});
				actions.appendChild(btn);
			}
			homunList.appendChild(el);
		});
	}

	if (!_pets.list.length) {
		petList.innerHTML = '<div class="empty">No pets in the account stable. Hatch or pick up an egg, then Deposit it here. Current pets can be Stored from this tab.</div>';
	} else {
		petList.innerHTML = '';
		_pets.list.forEach(row => {
			const active = row.petId === _pets.activePetId;
			const egg = (row.flags & 0x04) !== 0;
			const out = (row.flags & 0x02) !== 0;
			const status = egg ? 'Legacy egg on this character' : out ? `Out${row.ownerName ? ' · ' + row.ownerName : ''}` : 'In stable';
			const el = document.createElement('div');
			el.className = 'row' + (active ? ' active' : '');
			el.innerHTML = `
				<div class="meta">
					<div class="name">${escapeHtml(row.name)} <span class="badge">${escapeHtml(monsterName(row.classId))}</span>${active ? '<span class="badge">Active</span>' : ''}</div>
					<div class="sub">Lv ${row.level} · ${intimacyLabel(row.intimate, false)} · Hunger ${row.hungry} · ${escapeHtml(status)}</div>
				</div>
				<div class="row-actions"></div>
			`;
			const actions = el.querySelector('.row-actions');
			if (egg) {
				const dep = document.createElement('button');
				dep.textContent = 'Deposit egg';
				dep.addEventListener('click', () => {
					const pkt = new PACKET.CZ.TURORAN_STABLE_PET();
					pkt.action = 2;
					pkt.id = row.inventoryIndex >= 0 ? row.inventoryIndex : row.petId;
					Network.sendPacket(pkt);
				});
				actions.appendChild(dep);
			} else if (!active) {
				const sum = document.createElement('button');
				sum.textContent = 'Summon';
				sum.addEventListener('click', () => {
					const pkt = new PACKET.CZ.TURORAN_STABLE_PET();
					pkt.action = 1;
					pkt.id = row.petId;
					Network.sendPacket(pkt);
				});
				actions.appendChild(sum);
			}
			if (!egg) {
				const toEgg = document.createElement('button');
				toEgg.textContent = 'To egg';
				toEgg.addEventListener('click', () => {
					const pkt = new PACKET.CZ.TURORAN_STABLE_PET();
					pkt.action = 3;
					pkt.id = row.petId;
					Network.sendPacket(pkt);
				});
				actions.appendChild(toEgg);
			}
			petList.appendChild(el);
		});
	}
};

function escapeHtml(value) {
	return String(value || '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

export default UIManager.addComponent(Stable);
