/**
 * Homunculus + cute-pet account stable (Turoran beta).
 */

import DB from 'DB/DBManager.js';
import MonsterTable from 'DB/Monsters/MonsterTable.js';
import Preferences from 'Core/Preferences.js';
import Renderer from 'Renderer/Renderer.js';
import Entity from 'Renderer/Entity/Entity.js';
import SpriteRenderer from 'Renderer/SpriteRenderer.js';
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
let _selectedPetId = 0;

const _preview = {
	entity: new Entity(),
	ctx: null,
	running: false
};

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
	if (typeof DB.getMonsterName === 'function') {
		const name = DB.getMonsterName(classId);
		if (name) {
			return name;
		}
	}
	return MonsterTable[classId] || `#${classId}`;
}

function intimacyLabel(value, isHomun) {
	if (isHomun) {
		if (value >= 91000) return 'Loyal';
		if (value >= 75000) return 'Cordial';
		if (value >= 25000) return 'Neutral';
		if (value >= 10000) return 'Shy';
		return 'Awkward';
	}
	return DB.getMessage(value < 100 ? 672 : value < 250 ? 673 : value < 600 ? 669 : value < 900 ? 674 : 675);
}

function hungerLabel(value) {
	return DB.getMessage(value < 10 ? 667 : value < 25 ? 668 : value < 75 ? 669 : value < 90 ? 670 : 671);
}

function itemName(nameid) {
	if (!nameid) {
		return 'None';
	}
	const info = DB.getItemInfo(nameid);
	return info?.identifiedDisplayName || `#${nameid}`;
}

function petStatus(row) {
	const egg = (row.flags & 0x04) !== 0;
	const out = (row.flags & 0x02) !== 0;
	if (egg) {
		return 'Legacy egg on this character';
	}
	if (out) {
		return row.ownerName ? `Out · ${row.ownerName}` : 'Out';
	}
	return 'In account stable';
}

function sendPetAction(action, id) {
	const pkt = new PACKET.CZ.TURORAN_STABLE_PET();
	pkt.action = action;
	pkt.id = id;
	Network.sendPacket(pkt);
}

function stopPetPreview() {
	if (_preview.running) {
		Renderer.stop(renderPetPreview);
		_preview.running = false;
	}
	if (_preview.ctx) {
		_preview.ctx.clearRect(0, 0, _preview.ctx.canvas.width, _preview.ctx.canvas.height);
	}
}

function renderPetPreview() {
	if (!_preview.ctx) {
		return;
	}
	const ctx = _preview.ctx;
	SpriteRenderer.bind2DContext(ctx, Math.floor(ctx.canvas.width / 2), ctx.canvas.height - 8);
	ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
	_preview.entity.renderEntity();
}

function startPetPreview(classId) {
	if (!_preview.ctx) {
		const root = Stable.getRoot();
		const canvas = root?.querySelector('.pet-sprite');
		if (!canvas) {
			return;
		}
		_preview.ctx = canvas.getContext('2d');
	}
	_preview.entity.set({
		objecttype: Entity.TYPE_PET,
		job: classId,
		action: 0,
		direction: 0
	});
	if (!_preview.running) {
		_preview.running = true;
		Renderer.render(renderPetPreview);
	}
}

Stable.init = function init() {
	const root = this.getRoot();
	root.querySelector('.close').addEventListener('click', () => {
		this._host.style.display = 'none';
		stopPetPreview();
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
		sendPetAction(0, 0);
	});
	const canvas = root.querySelector('.pet-sprite');
	if (canvas) {
		_preview.ctx = canvas.getContext('2d');
	}
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
	if (tab === 'pets') {
		const selected = _pets.list.find(row => row.petId === _selectedPetId) || _pets.list[0];
		if (selected) {
			Stable.showPetDetail(selected);
		}
	} else {
		stopPetPreview();
	}
};

Stable.onAppend = function onAppend() {
	Object.assign(this._host.style, {
		top: `${Math.min(Math.max(0, _preferences.y), Renderer.height - 500)}px`,
		left: `${Math.min(Math.max(0, _preferences.x), Renderer.width - 540)}px`
	});
	const canvas = this.getRoot().querySelector('.pet-sprite');
	if (canvas) {
		_preview.ctx = canvas.getContext('2d');
	}
	Stable.applyTab();
	Stable.renderLists();
};

Stable.onRemove = function onRemove() {
	stopPetPreview();
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
		stopPetPreview();
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
	if (_selectedPetId && !_pets.list.some(row => row.petId === _selectedPetId)) {
		_selectedPetId = 0;
	}
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

Stable.showPetDetail = function showPetDetail(row) {
	const root = this.getRoot();
	if (!root) {
		return;
	}
	_selectedPetId = row.petId;
	const empty = root.querySelector('.empty-detail');
	const stats = root.querySelector('.stats');
	const actions = root.querySelector('.detail-actions');
	if (empty) {
		empty.hidden = true;
	}
	if (stats) {
		stats.hidden = false;
		root.querySelector('.d-name').textContent = row.name || '';
		root.querySelector('.d-species').textContent = `${monsterName(row.classId)} (${row.classId})`;
		root.querySelector('.d-level').textContent = String(row.level);
		root.querySelector('.d-hunger').textContent = `${hungerLabel(row.hungry)} (${row.hungry}/100)`;
		root.querySelector('.d-intimacy').textContent = `${intimacyLabel(row.intimate, false)} (${row.intimate}/1000)`;
		root.querySelector('.d-equip').textContent = itemName(row.equip);
		root.querySelector('.d-status').textContent = petStatus(row);
		root.querySelector('.d-rename').textContent = row.renameFlag ? 'Yes' : 'No';
		root.querySelector('.d-owner').textContent = row.ownerName || '—';
	}
	if (actions) {
		actions.innerHTML = '';
		const egg = (row.flags & 0x04) !== 0;
		const active = row.petId === _pets.activePetId;
		if (egg) {
			const dep = document.createElement('button');
			dep.textContent = 'Deposit egg';
			dep.addEventListener('click', e => {
				e.stopPropagation();
				sendPetAction(2, row.petId);
			});
			actions.appendChild(dep);
		} else if (!active) {
			const sum = document.createElement('button');
			sum.textContent = 'Summon';
			sum.addEventListener('click', e => {
				e.stopPropagation();
				sendPetAction(1, row.petId);
			});
			actions.appendChild(sum);
		}
		if (!egg) {
			const toEgg = document.createElement('button');
			toEgg.textContent = 'To egg';
			toEgg.addEventListener('click', e => {
				e.stopPropagation();
				sendPetAction(3, row.petId);
			});
			actions.appendChild(toEgg);
		}
	}
	startPetPreview(row.classId);
	root.querySelectorAll('.pet-list .row').forEach(el => {
		el.classList.toggle('selected', Number(el.dataset.petId) === row.petId);
	});
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
		homunList.innerHTML =
			'<div class="empty">No homunculi yet. Alchemists: Call Homunculus with an Embryo, then Store it here to raise another type.</div>';
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
					<div class="sub">Lv ${row.level} · ${intimacyLabel(row.intimacy, true)} · Hunger ${row.hunger} · ${escapeHtml(monsterName(row.classId))}</div>
				</div>
				<div class="row-actions"></div>
			`;
			const actions = el.querySelector('.row-actions');
			if (!active) {
				const btn = document.createElement('button');
				btn.textContent = 'Swap in';
				btn.addEventListener('click', e => {
					e.stopPropagation();
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
		petList.innerHTML =
			'<div class="empty">No pets in the account stable. Hatch or pick up an egg, then Deposit it here. Current pets can be Stored from this tab.</div>';
		const empty = root.querySelector('.empty-detail');
		const stats = root.querySelector('.stats');
		const actions = root.querySelector('.detail-actions');
		if (empty) {
			empty.hidden = false;
		}
		if (stats) {
			stats.hidden = true;
		}
		if (actions) {
			actions.innerHTML = '';
		}
		stopPetPreview();
	} else {
		petList.innerHTML = '';
		_pets.list.forEach(row => {
			const active = row.petId === _pets.activePetId;
			const el = document.createElement('div');
			el.className = 'row' + (active ? ' active' : '') + (row.petId === _selectedPetId ? ' selected' : '');
			el.dataset.petId = String(row.petId);
			el.innerHTML = `
				<div class="meta">
					<div class="name">${escapeHtml(row.name)} <span class="badge">${escapeHtml(monsterName(row.classId))}</span>${active ? '<span class="badge">Active</span>' : ''}</div>
					<div class="sub">Lv ${row.level} · ${intimacyLabel(row.intimate, false)} · Hunger ${row.hungry} · ${escapeHtml(petStatus(row))}</div>
				</div>
			`;
			el.addEventListener('click', () => Stable.showPetDetail(row));
			petList.appendChild(el);
		});
		const selected = _pets.list.find(row => row.petId === _selectedPetId) || _pets.list[0];
		if (selected && (_preferences.tab || 'homun') === 'pets') {
			Stable.showPetDetail(selected);
		}
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
