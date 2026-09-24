import Network from 'Network/NetworkManager.js';
import PACKET from 'Network/PacketStructure.js';
import Stable from 'UI/Components/Stable/Stable.js';

function onHomunList(pkt) {
	Stable.prepare();
	Stable.setHomunList(pkt);
}

function onPetList(pkt) {
	Stable.prepare();
	Stable.setPetList(pkt);
}

function onResult(pkt) {
	Stable.onResult(pkt);
}

function onOwned(pkt) {
	Stable.setOwnedCounts(pkt);
}

export default function StableEngine() {
	Network.hookPacket(PACKET.ZC.TURORAN_STABLE_HOMUN_LIST, onHomunList);
	Network.hookPacket(PACKET.ZC.TURORAN_STABLE_PET_LIST, onPetList);
	Network.hookPacket(PACKET.ZC.TURORAN_STABLE_RESULT, onResult);
	Network.hookPacket(PACKET.ZC.TURORAN_STABLE_OWNED, onOwned);
}
