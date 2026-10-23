/**
 * Engine/MapEngine/Battleground.js
 *
 * Battleground (battlefield) packets:
 *  - 0x2dc ZC_BATTLEFIELD_CHAT           camp chat -> ChatBox (Battlefield filter)
 *  - 0x2dd ZC_BATTLEFIELD_NOTIFY_CAMPINFO camp of a player
 *  - 0x2de ZC_BATTLEFIELD_NOTIFY_POINT    camp points -> BattlefieldScore
 *  - 0x2df ZC_BATTLEFIELD_NOTIFY_POSITION camp member on the minimap (-1,-1 = remove)
 *  - 0x2e0 / 0xa0e ZC_BATTLEFIELD_NOTIFY_HP(2) camp member HP bar
 * and /battlechat (MSI_BATTLECHAT_ON/OFF 1365/1366), which sends chat as CZ_BATTLEFIELD_CHAT (0x2db).
 */

import DB from 'DB/DBManager.js';
import PACKET from 'Network/PacketStructure.js';
import Network from 'Network/NetworkManager.js';
import Session from 'Engine/SessionStorage.js';
import EntityManager from 'Renderer/EntityManager.js';
import ChatBox from 'UI/Components/ChatBox/ChatBox.js';
import MiniMap from 'UI/Components/MiniMap/MiniMap.js';
import BattlefieldScore from 'UI/Components/BattlefieldScore/BattlefieldScore.js';

/** account id -> camp */
const _camps = new Map();
/** account ids shown on the minimap */
const _marks = new Set();

export function getCamp(aid) {
	return _camps.has(aid) ? _camps.get(aid) : null;
}

export function onBattlefieldChat(pkt) {
	ChatBox.addText(pkt.msg, ChatBox.TYPE.GUILD, ChatBox.FILTER.BATTLEFIELD);
}

export function onCampInfo(pkt) {
	_camps.set(pkt.accountID, pkt.camp);
	const entity = EntityManager.get(pkt.accountID);
	if (entity) {
		entity.bgCamp = pkt.camp;
	}
}

export function onPoint(pkt) {
	BattlefieldScore.setPoints(pkt.pointCampA, pkt.pointCampB);
}

export function onPosition(pkt) {
	const ui = MiniMap.getUI();
	if (pkt.x < 0 || pkt.y < 0 || pkt.x === 0xffff || pkt.y === 0xffff) {
		ui.removePartyMemberMark(pkt.accountID);
		_marks.delete(pkt.accountID);
		return;
	}
	ui.addPartyMemberMark(pkt.accountID, pkt.x, pkt.y);
	_marks.add(pkt.accountID);
}

export function onHp(pkt) {
	const hp = pkt.hp;
	const hp_max = pkt.maxHp;
	EntityManager.storeLife(pkt.accountID, { hp, hp_max });
	const entity = EntityManager.get(pkt.accountID);
	if (entity) {
		entity.life.hp = hp;
		entity.life.hp_max = hp_max;
		entity.life.update();
	}
}

/**
 * Leaving a battlefield map: drop score window and camp minimap marks.
 */
export function leaveBattlefield() {
	if (BattlefieldScore.__active) {
		BattlefieldScore.remove();
	}
	if (_marks.size) {
		const ui = MiniMap.getUI();
		_marks.forEach(aid => {
			if (!Session.hasParty) {
				ui.removePartyMemberMark(aid);
			}
		});
		_marks.clear();
	}
	_camps.clear();
}

/**
 * /battlechat toggle
 */
export function toggleBattleChat() {
	Session.battleChat = !Session.battleChat;
	ChatBox.addText(DB.getMessage(Session.battleChat ? 1365 : 1366), ChatBox.TYPE.INFO, ChatBox.FILTER.PUBLIC_LOG);
}

/**
 * Send camp chat
 * @param {string} text - "name : message"
 */
export function sendBattleChat(text) {
	const pkt = new PACKET.CZ.BATTLEFIELD_CHAT();
	pkt.msg = text;
	Network.sendPacket(pkt);
}

export default function BattlegroundEngine() {
	Session.battleChat = false;
	Network.hookPacket(PACKET.ZC.BATTLEFIELD_CHAT, onBattlefieldChat);
	Network.hookPacket(PACKET.ZC.BATTLEFIELD_NOTIFY_CAMPINFO, onCampInfo);
	Network.hookPacket(PACKET.ZC.BATTLEFIELD_NOTIFY_POINT, onPoint);
	Network.hookPacket(PACKET.ZC.BATTLEFIELD_NOTIFY_POSITION, onPosition);
	Network.hookPacket(PACKET.ZC.BATTLEFIELD_NOTIFY_HP, onHp);
	Network.hookPacket(PACKET.ZC.BATTLEFIELD_NOTIFY_HP2, onHp);
}
