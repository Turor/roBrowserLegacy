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
		const loc = byMap.get(mapId);
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

/**
 * Handle a world-map section click.
 * @param {string} mapId section id (map name)
 * @param {HTMLElement} host WorldMap root for overlays
 */
function handleResolved(id, host) {
	const loc = Warpra.findByMap(id);
	if (!loc) {
		ChatBox.addText(`No Warpra destination for ${id}.`, ChatBox.TYPE.ERROR);
		return;
	}

	if (loc.kind === Warpra.KIND.DUNGEON) {
		const info = Warpra.getDungeonFloors(id);
		if (!info || !info.floors.length) {
			ChatBox.addText(`No dungeon floors listed for ${id}.`, ChatBox.TYPE.ERROR);
			return;
		}
		_lastDungeonMapId = id;
		DungeonFloorPicker.open(host, info);
		return;
	}

	DungeonFloorPicker.close();
	_lastDungeonMapId = null;
	Warpra.unlockOrWarp(loc, { autoWarpAfterBuy: true });
}

export function handleSectionClick(mapId, host) {
	const id = normalizeMapId(mapId);
	if (!id) {
		return;
	}

	if (!Warpra.getList().length) {
		const unsub = Warpra.onListChange(() => {
			unsub();
			handleResolved(id, host);
		});
		Warpra.refreshList();
		ChatBox.addText('Loading Warpra destinations…', ChatBox.TYPE.INFO);
		return;
	}

	Warpra.refreshList();
	handleResolved(id, host);
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
