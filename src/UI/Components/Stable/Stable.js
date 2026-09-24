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
import KEYS from 'Controls/KeyEventHandler.js';
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
	entity: null,
	cardEntity: null,
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

function getPreviewEntity() {
	if (typeof Entity !== 'function') {
		return null;
	}
	if (!_preview.entity) {
		_preview.entity = new Entity();
	}
	return _preview.entity;
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
	if (!_preview.ctx || !_preview.entity) {
		return;
	}
	const ctx = _preview.ctx;
	SpriteRenderer.bind2DContext(ctx, Math.floor(ctx.canvas.width / 2), ctx.canvas.height - 8);
	ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
	_preview.entity.renderEntity();
}

function startPetPreview(classId) {
	const entity = getPreviewEntity();
	if (!entity) {
		return;
	}
	const root = Stable.getRoot();
	const canvas = root?.querySelector('.pet-sprite');
	if (!canvas) {
		return;
	}
	_preview.ctx = canvas.getContext('2d');
	entity.set({
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

const _stillQueue = [];
let _stillBusy = false;

function paintStill(canvas, classId) {
	_stillQueue.push({ canvas, classId });
	pumpStillQueue();
}

function pumpStillQueue() {
	if (_stillBusy || !_stillQueue.length) {
		return;
	}
	if (typeof Entity !== 'function') {
		return;
	}
	if (!_preview.cardEntity) {
		_preview.cardEntity = new Entity();
	}
	const item = _stillQueue.shift();
	if (!item.canvas?.isConnected) {
		pumpStillQueue();
		return;
	}
	_stillBusy = true;
	const entity = _preview.cardEntity;
	entity.set({
		objecttype: Entity.TYPE_PET,
		job: item.classId,
		action: 0,
		direction: 0
	});
	const ctx = item.canvas.getContext('2d');
	let frames = 0;
	const paint = () => {
		if (!item.canvas.isConnected) {
			_stillBusy = false;
			pumpStillQueue();
			return;
		}
		SpriteRenderer.bind2DContext(ctx, Math.floor(item.canvas.width / 2), item.canvas.height - 4);
		ctx.clearRect(0, 0, item.canvas.width, item.canvas.height);
		entity.renderEntity();
		frames++;
		if (frames < 18) {
			requestAnimationFrame(paint);
		} else {
			_stillBusy = false;
			pumpStillQueue();
		}
	};
	requestAnimationFrame(paint);
}

function closeSidePanel() {
	const root = Stable.getRoot();
	const side = root?.querySelector('.pet-side');
	if (side) {
		side.hidden = true;
	}
	_selectedPetId = 0;
	stopPetPreview();
	root?.querySelectorAll('.pet-card').forEach(el => el.classList.remove('selected'));
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
	root.querySelector('.side-close')?.addEventListener('click', () => {
		closeSidePanel();
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
	if (tab !== 'pets') {
		stopPetPreview();
	} else if (_selectedPetId) {
		const selected = _pets.list.find(row => row.petId === _selectedPetId);
		if (selected) {
			Stable.showPetDetail(selected);
		}
	}
};

Stable.onAppend = function onAppend() {
	Object.assign(this._host.style, {
		top: `${Math.min(Math.max(0, _preferences.y), Renderer.height - 500)}px`,
		left: `${Math.min(Math.max(0, _preferences.x), Renderer.width - 640)}px`
	});
	Stable.applyTab();
	Stable.renderLists();
	Stable.requestLists();
};

Stable.onRemove = function onRemove() {
	stopPetPreview();
};

Stable.requestLists = function requestLists() {
	Network.sendPacket(new PACKET.CZ.TURORAN_STABLE_OPEN());
};

Stable.toggle = function toggle() {
	const closed =
		!this._host || this._host.style.display === 'none' || !this._host.parentNode;
	if (closed) {
		this.append();
		this._host.style.display = '';
		this.focus();
		this.requestLists();
	} else {
		this._host.style.display = 'none';
		stopPetPreview();
	}
};

Stable.captureKeyEvents = true;

Stable.onKeyDown = function onKeyDown(event) {
	if (
		(event.which === KEYS.ESCAPE || event.key === 'Escape') &&
		this._host &&
		this._host.style.display !== 'none'
	) {
		this.toggle();
		event.stopImmediatePropagation();
		return false;
	}
	return true;
};

Stable.setHomunList = function setHomunList(pkt) {
	_homun = { activeHomunId: pkt.activeHomunId, list: pkt.list || [] };
	Stable.renderLists();
};

Stable.setPetList = function setPetList(pkt) {
	_pets = { activePetId: pkt.activePetId, list: pkt.list || [] };
	if (_selectedPetId && !_pets.list.some(row => row.petId === _selectedPetId)) {
		_selectedPetId = 0;
		closeSidePanel();
	}
	Stable.renderLists();
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
	const side = root.querySelector('.pet-side');
	if (side) {
		side.hidden = false;
	}
	const nameEl = root.querySelector('.side-name');
	if (nameEl) {
		nameEl.textContent = row.name || 'Pet details';
	}
	root.querySelector('.d-name').textContent = row.name || '';
	root.querySelector('.d-species').textContent = `${monsterName(row.classId)} (${row.classId})`;
	root.querySelector('.d-level').textContent = String(row.level);
	root.querySelector('.d-atk').textContent = `${row.atk ?? 0} ~ ${row.atk2 ?? 0}`;
	root.querySelector('.d-aspd').textContent = String(row.aspd ?? '—');
	root.querySelector('.d-hunger').textContent = `${hungerLabel(row.hungry)} (${row.hungry}/100)`;
	root.querySelector('.d-intimacy').textContent = `${intimacyLabel(row.intimate, false)} (${row.intimate}/1000)`;
	root.querySelector('.d-equip').textContent = itemName(row.equip);
	root.querySelector('.d-food').textContent = itemName(row.foodId);
	root.querySelector('.d-status').textContent = petStatus(row);
	root.querySelector('.d-rename').textContent = row.renameFlag ? 'Yes' : 'No';
	root.querySelector('.d-owner').textContent = row.ownerName || '—';

	const evoBlock = root.querySelector('.evo-block');
	const evoList = root.querySelector('.d-evo-materials');
	if (evoBlock && evoList) {
		evoList.innerHTML = '';
		const evolution =
			typeof DB.getPetEvolutionByJob === 'function' ? DB.getPetEvolutionByJob(row.classId) : null;
		if (evolution && Object.keys(evolution).length) {
			evoBlock.hidden = false;
			for (const targetEggID of Object.keys(evolution)) {
				const evoPet = DB.getPetByEggID(Number(targetEggID));
				const target = document.createElement('div');
				target.className = 'evo-target';
				target.textContent = evoPet
					? evoPet.PetString || evoPet.PetName || `Egg ${targetEggID}`
					: `Egg ${targetEggID}`;
				evoList.appendChild(target);
				const materials = evolution[targetEggID] || [];
				for (const mat of materials) {
					const item = DB.getItemInfo(mat.MaterialID);
					const name = item ? item.identifiedDisplayName || item.Name : `Item ${mat.MaterialID}`;
					const rowEl = document.createElement('div');
					rowEl.className = 'evo-mat';
					const nameEl = document.createElement('span');
					nameEl.textContent = name;
					const qtyEl = document.createElement('span');
					qtyEl.className = 'qty';
					qtyEl.textContent = String(mat.Amount);
					rowEl.appendChild(nameEl);
					rowEl.appendChild(qtyEl);
					evoList.appendChild(rowEl);
				}
			}
		} else {
			evoBlock.hidden = true;
		}
	}

	const next = Number(row.nextExp) || 0;
	const exp = Number(row.exp) || 0;
	const fill = root.querySelector('.exp-fill');
	const expText = root.querySelector('.d-exp');
	if (next <= 0) {
		if (fill) {
			fill.style.width = '100%';
		}
		if (expText) {
			expText.textContent = 'Max';
		}
	} else {
		const pct = Math.max(0, Math.min(100, Math.floor((exp / next) * 100)));
		if (fill) {
			fill.style.width = `${pct}%`;
		}
		if (expText) {
			expText.textContent = `${exp} / ${next} (${pct}%)`;
		}
	}

	const actions = root.querySelector('.detail-actions');
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
	root.querySelectorAll('.pet-card').forEach(el => {
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
		closeSidePanel();
	} else {
		petList.innerHTML = '';
		_pets.list.forEach(row => {
			const active = row.petId === _pets.activePetId;
			const el = document.createElement('div');
			el.className = 'pet-card' + (active ? ' active' : '') + (row.petId === _selectedPetId ? ' selected' : '');
			el.dataset.petId = String(row.petId);
			el.innerHTML = `
				<canvas width="96" height="96"></canvas>
				<div class="card-name">${escapeHtml(row.name)}</div>
				<div class="card-sub">Lv ${row.level}${active ? ' · Out' : ''}</div>
			`;
			el.addEventListener('click', () => Stable.showPetDetail(row));
			petList.appendChild(el);
			paintStill(el.querySelector('canvas'), row.classId);
		});
		if (_selectedPetId) {
			const selected = _pets.list.find(row => row.petId === _selectedPetId);
			if (selected) {
				Stable.showPetDetail(selected);
			}
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
