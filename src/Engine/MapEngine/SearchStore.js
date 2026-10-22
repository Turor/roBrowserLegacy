/**
 * Engine/MapEngine/SearchStore.js
 *
 * Shop search (Universal Catalog / Vending Search Scroll) packets.
 *
 * This file is part of ROBrowser, (http://www.robrowser.com/).
 */

import Network from 'Network/NetworkManager.js';
import PACKET from 'Network/PacketStructure.js';
import ChatBox from 'UI/Components/ChatBox/ChatBox.js';
import SearchStore from 'UI/Components/SearchStore/SearchStore.js';

function onOpen(pkt) {
	SearchStore.open(pkt.openType, pkt.SearchCntMax);
}

function onResults(pkt) {
	SearchStore.setResults(pkt);
}

function onFailed(pkt) {
	SearchStore.onFailed(pkt.Reason);
}

function onClickAck(pkt) {
	ChatBox.addText(`The shop is at (${pkt.x}, ${pkt.y}).`, ChatBox.TYPE.INFO, ChatBox.FILTER.PUBLIC_LOG);
}

export default function SearchStoreEngine() {
	Network.hookPacket(PACKET.ZC.OPEN_SEARCH_STORE_INFO, onOpen);
	Network.hookPacket(PACKET.ZC.SEARCH_STORE_INFO_ACK, onResults);
	Network.hookPacket(PACKET.ZC.SEARCH_STORE_INFO_ACK2, onResults);
	Network.hookPacket(PACKET.ZC.SEARCH_STORE_INFO_FAILED, onFailed);
	Network.hookPacket(PACKET.ZC.SSILIST_ITEM_CLICK_ACK, onClickAck);
}
