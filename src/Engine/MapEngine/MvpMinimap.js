/**
 * Engine/MapEngine/MvpMinimap.js
 *
 * Turoran MVP minimap marker packets (ZC 0x0EF5).
 */

import Network from 'Network/NetworkManager.js';
import PACKET from 'Network/PacketStructure.js';
import MiniMap from 'UI/Components/MiniMap/MiniMap.js';

function onMvpMinimap(pkt) {
	const ui = MiniMap.getUI();
	if (!ui) {
		return;
	}

	if (pkt.flags & 0x01) {
		ui.clearMvpMarks();
	}

	const list = pkt.list || [];
	for (let i = 0; i < list.length; i++) {
		const e = list[i];
		// x/y 0xffff means remove this gid
		if (e.x === 0xffff || e.y === 0xffff) {
			ui.removeMvpMark(e.gid);
			continue;
		}
		ui.addMvpMark(e.gid, e.x, e.y, e.classId);
	}
}

export default function MvpMinimapEngine() {
	Network.hookPacket(PACKET.ZC.TURORAN_MVP_MINIMAP, onMvpMinimap);
}
