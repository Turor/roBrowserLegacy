/**
 * Engine/MapEngine/Warpra.js
 *
 * Warpra menu packets (Turoran).
 */

import Network from 'Network/NetworkManager.js';
import PACKET from 'Network/PacketStructure.js';
import Warpra from 'UI/Components/Warpra/Warpra.js';

function onList(pkt) {
	Warpra.prepare();
	Warpra.setList(pkt);
}

function onResult(pkt) {
	Warpra.onResult(pkt);
}

export default function WarpraEngine() {
	Network.hookPacket(PACKET.ZC.TURORAN_WARPRA_LIST, onList);
	Network.hookPacket(PACKET.ZC.TURORAN_WARPRA_RESULT, onResult);
}
