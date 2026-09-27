/**
 * Pre-re Vulture's Eye range helpers.
 *
 * Map-server attack_range already includes Vulture on a bow. Use that packet
 * as the source of truth, and fall back to 5 + skill level when the packet is
 * still the bare weapon range. Bow skills with RangeModByVulture do the same
 * when the skill list did not send the modified range.
 */

import SkillId from 'DB/Skills/SkillConst.js';
import SkillInfo from 'DB/Skills/SkillInfo.js';
import SkillWindow from 'UI/Components/SkillList/SkillList.js';

const VULTURE_RANGE_SKILLS = {
	[SkillId.AC_DOUBLE]: true,
	[SkillId.AC_SHOWER]: true,
	[SkillId.HT_BLITZBEAT]: true,
	[SkillId.AC_CHARGEARROW]: true,
	[SkillId.SN_FALCONASSAULT]: true,
	[SkillId.HT_POWER]: true,
	[SkillId.RA_ARROWSTORM]: true,
	[SkillId.RA_AIMEDBOLT]: true,
	[SkillId.RA_WUGBITE]: true
};

function getVultureLevel() {
	const ui = SkillWindow.getUI && SkillWindow.getUI();
	if (!ui || typeof ui.getSkillById !== 'function') {
		return 0;
	}
	const v = ui.getSkillById(SkillId.AC_VULTURE);
	return (v && v.level) || 0;
}

function playerAttackRange(entity) {
	let range = (entity && entity.attack_range) || 1;
	if (range > 1) {
		const v = getVultureLevel();
		if (v > 0 && range < 5 + v) {
			range = 5 + v;
		}
	}
	return range;
}

function skillSearchRange(id, level, entity) {
	const ui = SkillWindow.getUI && SkillWindow.getUI();
	const skill = ui && typeof ui.getSkillById === 'function' ? ui.getSkillById(id) : null;
	let range;
	if (skill && skill.attackRange > 0) {
		range = skill.attackRange;
	} else if (SkillInfo[id] && SkillInfo[id].AttackRange) {
		range = SkillInfo[id].AttackRange[level - 1] || 1;
		if (VULTURE_RANGE_SKILLS[id]) {
			range += getVultureLevel();
		}
	} else {
		range = playerAttackRange(entity);
	}
	return range + 1;
}

export default {
	getVultureLevel,
	playerAttackRange,
	skillSearchRange
};
