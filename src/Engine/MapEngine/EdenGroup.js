/**
 * Engine/MapEngine/EdenGroup.js
 *
 * Eden Group board packets (Turoran).
 */

import Network from 'Network/NetworkManager.js';
import PACKET from 'Network/PacketStructure.js';
import EdenGroup from 'UI/Components/EdenGroup/EdenGroup.js';

function onList(pkt) {
	EdenGroup.prepare();
	EdenGroup.setList(pkt);
}

function onResult(pkt) {
	EdenGroup.onResult(pkt);
}

export default function EdenGroupEngine() {
	Network.hookPacket(PACKET.ZC.TURORAN_EDEN_LIST, onList);
	Network.hookPacket(PACKET.ZC.TURORAN_EDEN_RESULT, onResult);
}
