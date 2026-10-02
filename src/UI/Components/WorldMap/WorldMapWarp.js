/**
 * UI/Components/WorldMap/WorldMapWarp.js
 *
 * World-map → Warpra bridge (issue #34): field/town click warps (50m unlock
 * confirm if locked); dungeon click opens floor picker; explore marks.
 * Isolated so BasicInfo menu bar edits stay out of Bill's way.
 */

import ChatBox from 'UI/Components/ChatBox/ChatBox.js';
import Warpra from 'UI/Components/Warpra/Warpra.js';
import DungeonFloorPicker from './DungeonFloorPicker.js';

let _worldMap = null;
let _unsub = null;
let _unsubWarp = null;
let _lastDungeonMapId = null;

function normalizeMapId(mapId) {
	return String(mapId || '').replace(/\.gat$/i, '').replace(/\.rsw$/i, '');
}

/**
 * World-map section id → Warpra catalog map (issue #89).
 * Covers dungeon tiles whose WM id differs from the catalog entry,
 * and ensures every WM dungeon opens the floor picker.
 */
const WM_DUNGEON_ALIAS = {
	izlu2dun: 'iz_dun00', // Byalan entrance island → dungeon floors
	mosk_dun01: 'mosk_dun01',
	mosk_dun02: 'mosk_dun01',
	mosk_dun03: 'mosk_dun01',
	odin_tem01: 'odin_tem01',
	odin_tem02: 'odin_tem01',
	odin_tem03: 'odin_tem01',
	tur_dun01: 'tur_dun01',
	gon_dun01: 'gon_dun01',
	lou_dun01: 'lou_dun01',
	dew_dun01: 'dew_dun01'
};


/**
 * Apply green check / red X marks on warpable tiles.
 */
export function applyExploreMarks() {
	if (!_worldMap) {
		return;
	}
	const root = _worldMap.getRoot && _worldMap.getRoot();
	if (!root) {
		return;
	}
	const byMap = Warpra.getMapIndex();
	root.querySelectorAll('.worldmap .section').forEach(el => {
		const mapId = normalizeMapId(el.id);
		let mark = el.querySelector('.explore-mark');
		const alias = WM_DUNGEON_ALIAS[mapId];
		const loc = byMap.get(mapId) || (alias ? byMap.get(alias) : null);
		if (!loc) {
			if (mark) {
				mark.remove();
			}
			return;
		}
		// Dungeon floors share a group unlock flag — show group state.
		let unlocked = !!loc.unlocked;
		if (loc.kind === Warpra.KIND.DUNGEON) {
			const floors = Warpra.getDungeonFloorsByGroup(loc.group);
			unlocked = floors.some(f => f.unlocked);
		}
		if (!mark) {
			mark = document.createElement('span');
			mark.className = 'explore-mark';
			mark.setAttribute('aria-hidden', 'true');
			el.appendChild(mark);
		}
		mark.classList.toggle('explored', unlocked);
		mark.classList.toggle('unexplored', !unlocked);
		mark.textContent = unlocked ? '✓' : '✕';
		mark.title = unlocked ? 'Explored (warpra unlocked)' : 'Not explored (warpra locked)';
	});

	if (_lastDungeonMapId && DungeonFloorPicker.isOpen()) {
		const info = Warpra.getDungeonFloors(_lastDungeonMapId);
		if (info) {
			DungeonFloorPicker.refresh(info);
		}
	}
}

function overlayHost(host) {
	if (host && typeof host.querySelector === 'function') {
		const inner = host.querySelector('#WorldMap');
		if (inner) {
			return inner;
		}
	}
	return host;
}

function locForMap(mapId) {
	const id = normalizeMapId(mapId);
	const alias = WM_DUNGEON_ALIAS[id];
	const lookupId = alias || id;
	const loc = (lookupId && Warpra.findByMap(lookupId)) || (id && Warpra.findByMap(id)) || null;
	return { id, alias, lookupId, loc };
}

/**
 * Floors of one dungeon share a worldview index and the same rectangle.
 * The topmost floor may not be a Warpra map (buried entrance still is).
 * @param {HTMLElement} sectionEl
 * @returns {object|null}
 */
function dungeonLocFromIndex(sectionEl) {
	if (!sectionEl || !sectionEl.dataset || sectionEl.dataset.wmIndex == null || sectionEl.dataset.wmIndex === '') {
		return null;
	}
	const index = sectionEl.dataset.wmIndex;
	const root = sectionEl.closest('.worldmap') || sectionEl.parentElement;
	if (!root) {
		return null;
	}
	let found = null;
	root.querySelectorAll('.section').forEach(el => {
		if (found || el.dataset.wmIndex !== index || !el.id) {
			return;
		}
		const { loc } = locForMap(el.id);
		if (loc && loc.kind === Warpra.KIND.DUNGEON) {
			found = loc;
		}
	});
	return found;
}

/**
 * Handle a world-map section click.
 * @param {string} mapId section id (map name)
 * @param {HTMLElement} host WorldMap root for overlays
 * @param {HTMLElement} [sectionEl]
 */
function handleResolved(id, host, sectionEl) {
	host = overlayHost(host);
	let { alias, lookupId, loc } = locForMap(id);
	if (!loc || loc.kind !== Warpra.KIND.DUNGEON) {
		const groupLoc = dungeonLocFromIndex(sectionEl);
		if (groupLoc) {
			loc = groupLoc;
			lookupId = groupLoc.map;
			alias = alias || WM_DUNGEON_ALIAS[normalizeMapId(groupLoc.map)];
		}
	}
	if (!loc) {
		ChatBox.addText(`No Warpra destination for ${id}.`, ChatBox.TYPE.ERROR);
		return;
	}

	// World-map dungeon tiles (incl. aliases like izlu2dun → Byalan) open floor picker.
	if (loc.kind === Warpra.KIND.DUNGEON || alias) {
		const floorId = loc.kind === Warpra.KIND.DUNGEON ? loc.map : lookupId;
		const info = Warpra.getDungeonFloors(floorId) || Warpra.getDungeonFloors(lookupId);
		if (!info || !info.floors.length) {
			ChatBox.addText(`No dungeon floors listed for ${id}.`, ChatBox.TYPE.ERROR);
			return;
		}
		_lastDungeonMapId = floorId;
		DungeonFloorPicker.open(host, info);
		return;
	}

	DungeonFloorPicker.close();
	_lastDungeonMapId = null;
	Warpra.unlockOrWarp(loc, { autoWarpAfterBuy: true });
}

export function handleSectionClick(mapId, host, sectionEl) {
	const id = normalizeMapId(mapId);
	if (!id && !(sectionEl && sectionEl.dataset && sectionEl.dataset.wmIndex)) {
		return;
	}

	if (!Warpra.getList().length) {
		const unsub = Warpra.onListChange(() => {
			unsub();
			handleResolved(id, host, sectionEl);
		});
		Warpra.refreshList();
		ChatBox.addText('Loading Warpra destinations…', ChatBox.TYPE.INFO);
		return;
	}

	Warpra.refreshList();
	handleResolved(id, host, sectionEl);
}

/**
 * Bind to a WorldMap component instance (call from onAppend).
 * @param {object} worldMapComp
 */
function closeWorldMapAfterWarp() {
	DungeonFloorPicker.close();
	_lastDungeonMapId = null;
	if (_worldMap && typeof _worldMap.close === 'function') {
		_worldMap.close();
	} else if (_worldMap && _worldMap._host) {
		_worldMap._host.style.display = 'none';
	}
}

export function bind(worldMapComp) {
	_worldMap = worldMapComp;
	Warpra.prepare();
	if (!Warpra._host || !Warpra._host.parentNode) {
		Warpra.append();
		if (Warpra._host) {
			Warpra._host.style.display = 'none';
		}
	}
	Warpra.refreshList();
	if (_unsub) {
		_unsub();
	}
	_unsub = Warpra.onListChange(() => applyExploreMarks());
	if (_unsubWarp) {
		_unsubWarp();
	}
	// Close after WARP RESULT OK (not on unlock prompt cancel / deny).
	_unsubWarp = Warpra.onWarpSuccess(() => closeWorldMapAfterWarp());
	applyExploreMarks();
}

export function unbind() {
	if (_unsub) {
		_unsub();
		_unsub = null;
	}
	if (_unsubWarp) {
		_unsubWarp();
		_unsubWarp = null;
	}
	DungeonFloorPicker.close();
	_worldMap = null;
	_lastDungeonMapId = null;
}

export default {
	bind,
	unbind,
	handleSectionClick,
	applyExploreMarks
};
