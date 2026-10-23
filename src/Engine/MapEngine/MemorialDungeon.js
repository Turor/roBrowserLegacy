/**
 * Engine/MapEngine/MemorialDungeon.js
 *
 * Memorial Dungeon (instance) packets -> UI/Components/MemorialDungeon
 */

import Network from 'Network/NetworkManager.js';
import PACKET from 'Network/PacketStructure.js';
import MemorialDungeon from 'UI/Components/MemorialDungeon/MemorialDungeon.js';

export default function MemorialDungeonEngine() {
	Network.hookPacket(PACKET.ZC.MEMORIALDUNGEON_SUBSCRIPTION_INFO, pkt => MemorialDungeon.onSubscriptionInfo(pkt));
	Network.hookPacket(PACKET.ZC.MEMORIALDUNGEON_SUBSCRIPTION_NOTIFY, pkt => MemorialDungeon.onSubscriptionNotify(pkt));
	Network.hookPacket(PACKET.ZC.MEMORIALDUNGEON_INFO, pkt => MemorialDungeon.onInfo(pkt));
	Network.hookPacket(PACKET.ZC.MEMORIALDUNGEON_NOTIFY, pkt => MemorialDungeon.onNotify(pkt));
}
