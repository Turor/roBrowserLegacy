/**
 * UI/Components/WorldMap/DungeonFloorPicker.js
 *
 * Floor picker overlay for world-map dungeon clicks (issue #34).
 * Isolated from BasicInfo / Warpra chrome Bill may touch.
 */

import Warpra from 'UI/Components/Warpra/Warpra.js';

let _root = null;
let _onClose = null;

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

function ensureDom(host) {
	if (_root && _root.isConnected) {
		return _root;
	}
	_root = document.createElement('div');
	_root.className = 'wm-dungeon-picker';
	_root.hidden = true;
	_root.innerHTML =
		'<div class="wm-dp-box">' +
		'<div class="wm-dp-titlebar">' +
		'<span class="wm-dp-title">Dungeon Floors</span>' +
		'<button type="button" class="wm-dp-close" title="Close">×</button>' +
		'</div>' +
		'<div class="wm-dp-intro"></div>' +
		'<div class="wm-dp-list"></div>' +
		'</div>';
	_root.querySelector('.wm-dp-close').addEventListener('click', () => close());
	_root.addEventListener('click', e => {
		if (e.target === _root) {
			close();
		}
	});
	host.appendChild(_root);
	return _root;
}

function render(info) {
	if (!_root) {
		return;
	}
	const price = Warpra.getPrice();
	const zeny = Warpra.getZeny();
	_root.querySelector('.wm-dp-title').textContent = info.name || 'Dungeon Floors';
	_root.querySelector('.wm-dp-intro').textContent = info.unlocked
		? 'Choose a floor to warp to.'
		: `Dungeon locked. Unlock for ${formatZeny(price)} zeny (you have ${formatZeny(zeny)}), then warp to any floor.`;

	const list = _root.querySelector('.wm-dp-list');
	list.innerHTML = '';
	info.floors.forEach(floor => {
		const row = document.createElement('button');
		row.type = 'button';
		row.className = 'wm-dp-row' + (floor.unlocked ? '' : ' locked');
		const mark = floor.unlocked ? '✓' : '✕';
		const markClass = floor.unlocked ? 'explored' : 'unexplored';
		const action = floor.unlocked ? 'Warp' : `Unlock ${formatZeny(price)}`;
		row.innerHTML =
			`<span class="wm-dp-mark ${markClass}">${mark}</span>` +
			`<span class="wm-dp-name">${escapeHtml(floor.name)}</span>` +
			`<span class="wm-dp-map">${escapeHtml(floor.map)}</span>` +
			`<span class="wm-dp-action">${action}</span>`;
		row.addEventListener('click', () => {
			Warpra.unlockOrWarp(floor, { autoWarpAfterBuy: true });
			if (floor.unlocked) {
				close();
			}
		});
		list.appendChild(row);
	});
}

/**
 * Open the floor picker over the WorldMap host element.
 * @param {HTMLElement} host WorldMap component root/host
 * @param {{ name: string, floors: Array, unlocked: boolean }} info
 * @param {Function} [onClose]
 */
export function open(host, info, onClose) {
	if (!host || !info || !info.floors || !info.floors.length) {
		return;
	}
	_onClose = onClose || null;
	ensureDom(host);
	render(info);
	_root.hidden = false;
}

export function close() {
	if (_root) {
		_root.hidden = true;
	}
	const cb = _onClose;
	_onClose = null;
	if (cb) {
		cb();
	}
}

export function isOpen() {
	return !!( _root && !_root.hidden );
}

export function refresh(info) {
	if (isOpen() && info) {
		render(info);
	}
}

export default { open, close, isOpen, refresh };
