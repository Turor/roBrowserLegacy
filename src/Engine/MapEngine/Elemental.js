/**
 * Engine/MapEngine/Elemental.js
 *
 * Sorcerer elemental spirit (Agni/Aqua/Ventus/Tera).
 *
 * The official client has no elemental information window. It uses
 * ZC_EL_INIT (0x81d) and ZC_EL_PAR_CHANGE (0x81e) to draw the owner's
 * elemental HP and SP bars under the spirit, and keeps them current.
 */

import PACKET from 'Network/PacketStructure.js';
import Network from 'Network/NetworkManager.js';
import Session from 'Engine/SessionStorage.js';
import EntityManager from 'Renderer/EntityManager.js';
import StatusProperty from 'DB/Status/StatusProperty.js';

/**
 * Packet param -> life field (server sends SP_HP/SP_MAXHP/SP_SP/SP_MAXSP)
 */
const PARAM_FIELD = {
	[StatusProperty.HP]: 'hp',
	[StatusProperty.MAXHP]: 'hp_max',
	[StatusProperty.SP]: 'sp',
	[StatusProperty.MAXSP]: 'sp_max'
};

/**
 * Apply values to the elemental entity (if on screen) and to the life cache
 * (used when the entity spawns after the packet, e.g. after a map change).
 *
 * @param {number} gid
 * @param {object} values - subset of {hp, hp_max, sp, sp_max}
 */
function applyLife(gid, values) {
	EntityManager.storeLife(gid, values);

	const entity = EntityManager.get(gid);
	if (!entity) {
		return;
	}

	Object.keys(values).forEach(key => {
		entity.life[key] = values[key];
	});
	entity.life.update();
}

/**
 * Elemental summoned / owner entered a map
 *
 * @param {object} pkt - PACKET.ZC.EL_INIT
 */
export function onElementalInit(pkt) {
	Session.elementalId = pkt.AID;
	applyLife(pkt.AID, {
		hp: pkt.hp,
		hp_max: pkt.maxHP,
		sp: pkt.sp,
		sp_max: pkt.maxSP
	});
}

/**
 * Elemental HP/SP changed
 *
 * @param {object} pkt - PACKET.ZC.EL_PAR_CHANGE
 */
export function onElementalParameterChange(pkt) {
	const field = PARAM_FIELD[pkt.param];
	if (!field || !Session.elementalId) {
		return;
	}
	applyLife(Session.elementalId, { [field]: pkt.value });
}

/**
 * Initialize
 */
export default function ElementalEngine() {
	Session.elementalId = 0;
	Network.hookPacket(PACKET.ZC.EL_INIT, onElementalInit);
	Network.hookPacket(PACKET.ZC.EL_PAR_CHANGE, onElementalParameterChange);
}
