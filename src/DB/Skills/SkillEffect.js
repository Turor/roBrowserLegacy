/**
 * DB/Skills/SkillEffect.js
 *
 * List of skills with informations (in progress)
 *
 * @author Vincent Thibault
 */

/**
 *
 *	Possible types
 *	--------------
 *
 *	- effectId: 				Triggers once for every skill use. The packet determines who receives the effect.
 *								Can be used to create regular effects.
 *
 *	- effectIdOnCaster:			Triggers once for every skill use. The caster receives the effect.
 *								Can be used to create skill use effects on the caster.
 *
 *	- groundEffectId: 			Triggers once for every ground skill entity entry. Some skills have multiple entities, like songs, others have only one.
 *								Can be used to create ground effects.
 *
 *	- hitEffectId: 				Triggers on every hit with damage (including every hit of a multi hit skill) on the receiving entity.
 *								Can be used to create damage effects.
 *
 *	- beforeHitEffectId: 		Triggers before every hit (including every hit of a multi hit skill) and after the cast.
 *								Can be used to create pre-damage effects like flying balls and others.
 *								Note: Effect duration in EffectTable has to be equal to the damage display delay to make the effect look like it reaches the target right before the damage. Now it is fixed 200ms.
 *
 *	- beginCastEffectId: 		Triggers once right after the skill is released, before the cast ends.
 *								Can be used to create casting effects.
 *
 *	- successEffectId: 			Triggers when a skill yealds a "successful" result.
 *								Can be used for non-damaging skills that has an effect by a chance
 *
 *	- successEffectIdOnCaster: 	Triggers on the caster when a skill yealds a "successful" result.
 *								Can be used for non-damaging skills that has an effect by a chance
 *
 *	- hideCastBar:				When set to true hides the cast bar when casting.
 *	- hideCastAura:			When set to true hides the elemental magic circle when casting.
 *
 */

import SK from 'DB/Skills/SkillConst.js';
import EntityManager from 'Renderer/EntityManager.js';
import JobId from 'DB/Jobs/JobConst.js';

// _job dont store mount variants, just the real job, so it's ok to check like this
// this is used on monk asura strike effect
const CHAMPION_JOBS = new Set([
	JobId.MONK_H, // 4016
	JobId.SURA, // 4070
	JobId.SURA_H, // 4077
	JobId.SURA_B, // 4106
	JobId.SURA_2ND, // 4342
	JobId.INQUISITOR // 4262
]);

const SkillEffect = {};

// Swordman
SkillEffect[SK.SM_BASH] = { beginCastEffectId: 16, hitEffectId: 1 }; //Bash
SkillEffect[SK.SM_PROVOKE] = { successEffectId: 67 }; //Provoke
SkillEffect[SK.SM_MAGNUM] = { effectIdOnCaster: 17, effectId: 'quake_magnum' }; //Magnum Break
SkillEffect[SK.SM_ENDURE] = { effectId: 11 }; //Endure
// Mage
SkillEffect[SK.MG_SIGHT] = {/* effectId: 22 not here*/}; //Sight
SkillEffect[SK.MG_NAPALMBEAT] = { hitEffectId: 1 }; //Napalm Beat
SkillEffect[SK.MG_SAFETYWALL] = {/*not here*/}; //Safety Wall
SkillEffect[SK.MG_SOULSTRIKE] = { beforeHitEffectId: 15, hitEffectId: 1 }; //Soul Strike
SkillEffect[SK.MG_COLDBOLT] = { beforeHitEffectId: 'ef_coldbolt', hitEffectId: 51 }; //Cold Bolt
SkillEffect[SK.MG_FROSTDIVER] = { effectId: 27, hitEffectId: 28 }; //Frost Diver
SkillEffect[SK.MG_STONECURSE] = { effectId: 23 }; //Stone Curse
SkillEffect[SK.MG_FIREBALL] = { beforeHitEffectId: 24, hitEffectId: 49 }; //Fire Ball
SkillEffect[SK.MG_FIREWALL] = { hitEffectId: 49, groundEffectId: 25 }; //Fire Wall
SkillEffect[SK.MG_FIREBOLT] = { beforeHitEffectId: 'ef_firebolt', hitEffectId: 49 }; //Fire Bolt
SkillEffect[SK.MG_LIGHTNINGBOLT] = { effectId: 29, hitEffectId: 52 }; //Lightning Bolt
SkillEffect[SK.MG_THUNDERSTORM] = { effectId: 30, hitEffectId: 52 }; //Thunderstorm
// Acolyte
SkillEffect[SK.AL_RUWACH] = { hitEffectId: 1 /*state effect not here*/ }; //Ruwach
SkillEffect[SK.AL_PNEUMA] = { groundEffectId: 141 }; //Pneuma
SkillEffect[SK.AL_TELEPORT] = {/*not here*/}; //Teleport
SkillEffect[SK.AL_WARP] = {/*not here*/}; //Warp Portal
SkillEffect[SK.AL_HEAL] = { effectId: 312, hitEffectId: 320 }; //Heal
SkillEffect[SK.AL_INCAGI] = { effectId: 37 }; //Increase AGI
SkillEffect[SK.AL_DECAGI] = { effectId: 38 }; //Decrease AGI
SkillEffect[SK.AL_HOLYWATER] = { effectId: 39 }; //Aqua Benedicta
SkillEffect[SK.AL_CRUCIS] = { effectId: 40 }; //Signum Crucis
SkillEffect[SK.AL_ANGELUS] = { effectId: 41 }; //Angelus
SkillEffect[SK.AL_BLESSING] = { effectId: 42 }; //Blessing
SkillEffect[SK.AL_CURE] = { effectId: 66 }; //Cure
// Merchant
SkillEffect[SK.MC_IDENTIFY] = {}; //Item Appraisal
SkillEffect[SK.MC_VENDING] = {}; //Vending
SkillEffect[SK.MC_MAMMONITE] = { effectId: 10 }; //Mammonite
// Archer
SkillEffect[SK.AC_CONCENTRATION] = { effectId: 153 }; //Improve Concentration
SkillEffect[SK.AC_DOUBLE] = { beginCastEffectId: 16, beforeHitEffectId: 'ef_arrow_projectile', hitEffectId: 1 }; //Double Strafe
SkillEffect[SK.AC_SHOWER] = { effectId: 'ef_arrow_shower_projectile', hitEffectId: 1 }; //Arrow Shower
// Thief
SkillEffect[SK.TF_STEAL] = { successEffectId: 18 }; //Steal
SkillEffect[SK.TF_HIDING] = {/*Handled by state*/}; //Hiding
SkillEffect[SK.TF_POISON] = { hitEffectId: 20 }; //Envenom
SkillEffect[SK.TF_DETOXIFY] = { effectId: 21 }; //Detoxify
// All
SkillEffect[SK.ALL_RESURRECTION] = { effectId: [77, 140] }; //Resurrection
// Knight
SkillEffect[SK.KN_PIERCE] = { effectIdOnCaster: 148, hitEffectId: 147 }; //Pierce
SkillEffect[SK.KN_BRANDISHSPEAR] = { hideCastBar: true, hideCastAura: true, effectId: 70, effectIdOnCaster: 144 }; //Brandish Spear
SkillEffect[SK.KN_SPEARSTAB] = { effectIdOnCaster: 150 }; //Spear Stab
SkillEffect[SK.KN_SPEARBOOMERANG] = {
	effectIdOnCaster: 151,
	beforeHitEffectId: 'ef_spear_projectile',
	hitEffectId: 80
}; //Spear Boomerang
SkillEffect[SK.KN_TWOHANDQUICKEN] = { effectId: 130 }; //Twohand Quicken
SkillEffect[SK.KN_AUTOCOUNTER] = {
	hideCastAura: true /*effectId: 131    NOT USED HERE, but hardcoded in onEntityCastCancel!*/
}; //Counter Attack
SkillEffect[SK.KN_BOWLINGBASH] = { hideCastBar: true, hideCastAura: true, effectIdOnCaster: 149, hitEffectId: 1 }; //Bowling Bash
// Priest
SkillEffect[SK.PR_IMPOSITIO] = { effectId: 84 }; //Impositio Manus
SkillEffect[SK.PR_SUFFRAGIUM] = { effectId: 88 }; //Suffragium
SkillEffect[SK.PR_ASPERSIO] = { effectId: 86 }; //Aspersio
SkillEffect[SK.PR_BENEDICTIO] = { effectId: 91 }; //B.S. Sacramenti
SkillEffect[SK.PR_SANCTUARY] = { effectId: 83, groundEffectId: 319 }; //Sanctuary
SkillEffect[SK.PR_SLOWPOISON] = { effectId: 136 }; //Slow Poison
SkillEffect[SK.PR_STRECOVERY] = { effectId: 78 }; //Status Recovery
SkillEffect[SK.PR_KYRIE] = { effectId: 112 }; //Kyrie Eleison
SkillEffect[SK.PR_MAGNIFICAT] = { effectId: 76 }; //Magnificat
SkillEffect[SK.PR_GLORIA] = { effectId: 75 }; //Gloria
SkillEffect[SK.PR_LEXDIVINA] = { effectId: 87 }; //Lex Divina
SkillEffect[SK.PR_TURNUNDEAD] = { hitEffectId: 152 }; //Turn Undead
SkillEffect[SK.PR_LEXAETERNA] = { effectId: 85 }; //Lex Aeterna
SkillEffect[SK.PR_MAGNUS] = { effectId: 113, hitEffectId: 152, groundEffectId: 318 }; //Magnus Exorcismus
// Wizard
SkillEffect[SK.WZ_FIREPILLAR] = { effectId: 96, groundEffectId: 138, hitEffectId: 97 }; //Fire Pillar
SkillEffect[SK.WZ_SIGHTRASHER] = { effectId: 62, hitEffectId: 49 }; //Sightrasher
SkillEffect[SK.WZ_METEOR] = { effectId: 92, hitEffectId: 49 }; //Meteor Storm
SkillEffect[SK.WZ_JUPITEL] = { effectId: 93, beforeHitEffectId: 94 }; //Jupitel Thunder
SkillEffect[SK.WZ_VERMILION] = { effectId: 90, hitEffectId: 52 }; //Lord of Vermilion
SkillEffect[SK.WZ_WATERBALL] = { beforeHitEffectIdOnCaster: 116, hitEffectIdOnCaster: 117 }; //Water Ball
SkillEffect[SK.WZ_ICEWALL] = { groundEffectId: 74 }; //Ice Wall
SkillEffect[SK.WZ_FROSTNOVA] = { effectIdOnCaster: 28, hitEffectId: 51 }; //Frost Nova
SkillEffect[SK.WZ_STORMGUST] = { effectId: 89, hitEffectId: 51 }; //Storm Gust
SkillEffect[SK.WZ_EARTHSPIKE] = { effectId: 79, hitEffectId: 147 }; //Earth Spike
SkillEffect[SK.WZ_HEAVENDRIVE] = { effectId: 142, hitEffectId: 147 }; //Heaven's Drive
SkillEffect[SK.WZ_QUAGMIRE] = { groundEffectId: 95 }; //Quagmire
SkillEffect[SK.WZ_ESTIMATION] = {}; //Sense
// Blacksmith
SkillEffect[SK.BS_REPAIRWEAPON] = { effectId: 101 }; //Weapon Repair
SkillEffect[SK.BS_HAMMERFALL] = { effectId: 102 }; //Hammer Fall
SkillEffect[SK.BS_ADRENALINE] = { beginCastEffectId: '98_beforecast', effectId: 98 }; //Adrenaline Rush
SkillEffect[SK.BS_WEAPONPERFECT] = { effectId: 103 }; //Weapon Perfection
SkillEffect[SK.BS_OVERTHRUST] = { effectId: 128 }; //Power-Thrust
SkillEffect[SK.BS_MAXIMIZE] = { beginCastEffectId: 'maximize_power_sounds', effectId: 104 }; //Maximize Power
// Hunter
SkillEffect[SK.HT_SKIDTRAP] = { effectId: 69 }; //Skid Trap
SkillEffect[SK.HT_LANDMINE] = {}; //Land Mine
SkillEffect[SK.HT_ANKLESNARE] = { groundEffectId: 'ef_anklesnare' }; //Ankle Snare
SkillEffect[SK.HT_SHOCKWAVE] = { effectId: 145, hitEffectId: 146 }; //Shockwave Trap
SkillEffect[SK.HT_SANDMAN] = { hitEffectId: 139 }; //Sandman
SkillEffect[SK.HT_FLASHER] = { hitEffectId: 99 }; //Flasher
SkillEffect[SK.HT_FREEZINGTRAP] = { hitEffectId: 108 }; //Freezing Trap
SkillEffect[SK.HT_BLASTMINE] = { hitEffectId: 106 }; //Blast Mine
SkillEffect[SK.HT_CLAYMORETRAP] = { hitEffectId: 107 }; //Claymore Trap
SkillEffect[SK.HT_REMOVETRAP] = { effectId: 100 }; //Remove Trap
SkillEffect[SK.HT_TALKIEBOX] = {}; //Talkie Box
SkillEffect[SK.HT_BLITZBEAT] = { effectId: 115 }; //Blitz Beat
SkillEffect[SK.HT_DETECTING] = { effectId: 119 }; //Detect
SkillEffect[SK.HT_SPRINGTRAP] = { effectId: 111 }; //Spring Trap
// Assassin
SkillEffect[SK.AS_CLOAKING] = { effectId: 120 }; //Cloaking
SkillEffect[SK.AS_SONICBLOW] = { effectIdOnCaster: 121, effectId: 143, hitEffectId: 122 }; //Sonic Blow
SkillEffect[SK.AS_GRIMTOOTH] = { effectId: 123, hitEffectId: 132 }; //Grimtooth
SkillEffect[SK.AS_ENCHANTPOISON] = { effectId: 20 }; //Enchant Poison
SkillEffect[SK.AS_POISONREACT] = { effectId: 126, hitEffectId: 127 }; //Poison React
SkillEffect[SK.AS_VENOMDUST] = { effectId: 124, groundEffectId: 171 }; //Venom Dust
SkillEffect[SK.AS_SPLASHER] = { effectId: 129 }; //Venom Splasher
// 1st Class Quest
SkillEffect[SK.NV_FIRSTAID] = { effectId: 309 }; //First Aid
SkillEffect[SK.NV_TRICKDEAD] = {}; //Play Dead
SkillEffect[SK.SM_AUTOBERSERK] = {}; //Auto Berserk
SkillEffect[SK.AC_MAKINGARROW] = {}; //Arrow Crafting
SkillEffect[SK.AC_CHARGEARROW] = { hideCastAura: true, beforeHitEffectId: 'ef_arrow_projectile' }; //Arrow Repel
SkillEffect[SK.TF_SPRINKLESAND] = { effectId: 310 }; //Sand Attack
SkillEffect[SK.TF_BACKSLIDING] = {}; //Back Slide
SkillEffect[SK.TF_PICKSTONE] = { hideCastAura: true }; //Find Stone
SkillEffect[SK.TF_THROWSTONE] = { beforeHitEffectId: 308 }; //Stone Fling
SkillEffect[SK.MC_CARTREVOLUTION] = { beginCastEffectId: 170, hitEffectId: 170 }; //Cart Revolution
SkillEffect[SK.MC_CHANGECART] = {}; //Change Cart
SkillEffect[SK.MC_LOUD] = { effectId: 311 }; //Crazy Uproar
SkillEffect[SK.AL_HOLYLIGHT] = { effectId: 152 }; //Holy Light
SkillEffect[SK.MG_ENERGYCOAT] = { effectId: 169 }; //Energy Coat
// NPC Skills
SkillEffect[SK.NPC_PIERCINGATT] = { effectIdOnCaster: 148 }; //Piercing Attack
SkillEffect[SK.NPC_MENTALBREAKER] = { effectId: 181 }; //Spirit Destruction
SkillEffect[SK.NPC_RANGEATTACK] = {}; //Stand off attack
SkillEffect[SK.NPC_ATTRICHANGE] = {}; //Attribute Change
SkillEffect[SK.NPC_CHANGEWATER] = { effectId: 174 }; //Water Attribute Change
SkillEffect[SK.NPC_CHANGEGROUND] = { effectId: 177 }; //Earth Attribute Change
SkillEffect[SK.NPC_CHANGEFIRE] = { effectId: 173 }; //Fire Attribute Change
SkillEffect[SK.NPC_CHANGEWIND] = { effectId: 175 }; //Wind Attribute Change
SkillEffect[SK.NPC_CHANGEPOISON] = { effectId: 179 }; //Poison Attribute Change
SkillEffect[SK.NPC_CHANGEHOLY] = { effectId: 178 }; //Holy Attribute Change
SkillEffect[SK.NPC_CHANGEDARKNESS] = { effectId: 172 }; //Shadow Attribute Change
SkillEffect[SK.NPC_CHANGETELEKINESIS] = {}; //Ghost Attribute Change
SkillEffect[SK.NPC_CRITICALSLASH] = { effectIdOnCaster: 16 }; //Defense disregard attack
SkillEffect[SK.NPC_COMBOATTACK] = {}; //Multi-stage Attack
SkillEffect[SK.NPC_GUIDEDATTACK] = { effectId: 191 }; //Guided Attack
SkillEffect[SK.NPC_SELFDESTRUCTION] = { effectId: 183 }; //Suicide bombing
SkillEffect[SK.NPC_SPLASHATTACK] = {}; //Splash attack
SkillEffect[SK.NPC_SUICIDE] = { effectId: 185 }; //Suicide
SkillEffect[SK.NPC_POISON] = { effectId: 192 }; //Poison Attack
SkillEffect[SK.NPC_BLINDATTACK] = {}; //Blind Attack
SkillEffect[SK.NPC_SILENCEATTACK] = { effectId: 193 }; //Silence Attack
SkillEffect[SK.NPC_STUNATTACK] = { effectId: 194 }; //Stun Attack
SkillEffect[SK.NPC_PETRIFYATTACK] = { effectId: 195 }; //Petrify Attack
SkillEffect[SK.NPC_CURSEATTACK] = { effectId: 196 }; //Curse Attack
SkillEffect[SK.NPC_SLEEPATTACK] = { effectId: 197 }; //Sleep attack
SkillEffect[SK.NPC_RANDOMATTACK] = {}; //Random Attack
SkillEffect[SK.NPC_WATERATTACK] = { hitEffectId: 51 }; //Water Attribute Attack
SkillEffect[SK.NPC_GROUNDATTACK] = { hitEffectId: 147 }; //Earth Attribute Attack
SkillEffect[SK.NPC_FIREATTACK] = { hitEffectId: 49 }; //Fire Attribute Attack
SkillEffect[SK.NPC_WINDATTACK] = { hitEffectId: 52 }; //Wind Attribute Attack
SkillEffect[SK.NPC_POISONATTACK] = { hitEffectId: 53 }; //Poison Attribute Attack
SkillEffect[SK.NPC_HOLYATTACK] = { hitEffectId: 152 }; //Holy Attribute Attack
SkillEffect[SK.NPC_DARKNESSATTACK] = { effectId: 184, hitEffectId: 180 }; //Shadow Attribute Attack
SkillEffect[SK.NPC_TELEKINESISATTACK] = { effectId: 198 }; //Ghost Attribute Attack
SkillEffect[SK.NPC_MAGICALATTACK] = { hitEffectId: 182 }; //Demon Shock Attack
SkillEffect[SK.NPC_METAMORPHOSIS] = {}; //Metamorphosis
SkillEffect[SK.NPC_PROVOCATION] = { successEffectId: 67 }; //Provocation
SkillEffect[SK.NPC_SMOKING] = {}; //Smoking
SkillEffect[SK.NPC_SUMMONSLAVE] = {}; //Follower Summons
SkillEffect[SK.NPC_EMOTION] = {}; //Emotion
SkillEffect[SK.NPC_TRANSFORMATION] = {}; //Transformation
SkillEffect[SK.NPC_BLOODDRAIN] = { effectIdOnCaster: 216 }; //Sucking Blood
SkillEffect[SK.NPC_ENERGYDRAIN] = { effectIdOnCaster: 217 }; //Energy Drain
SkillEffect[SK.NPC_KEEPING] = { effectId: 214 }; //Keeping
SkillEffect[SK.NPC_DARKBREATH] = { effectId: 212 }; //Dark Breath
SkillEffect[SK.NPC_DARKBLESSING] = {}; //Dark Blessing
SkillEffect[SK.NPC_BARRIER] = {}; //Barrier
SkillEffect[SK.NPC_DEFENDER] = { effectId: 213 }; //Defender
SkillEffect[SK.NPC_LICK] = {}; //Lick
SkillEffect[SK.NPC_HALLUCINATION] = {}; //Hallucination
SkillEffect[SK.NPC_REBIRTH] = {}; //Rebirth
SkillEffect[SK.NPC_SUMMONMONSTER] = {}; //Monster Summons
// Rogue
SkillEffect[SK.RG_STEALCOIN] = { successEffectId: [268, 274] }; //Mug
SkillEffect[SK.RG_BACKSTAP] = { hitEffectId: 275 }; //Back Stab
SkillEffect[SK.RG_RAID] = { effectIdOnCaster: 276 }; //Sightless Mind
SkillEffect[SK.RG_STRIPWEAPON] = { successEffectId: 269 }; //Divest Weapon
SkillEffect[SK.RG_STRIPSHIELD] = { successEffectId: 270 }; //Divest Shield
SkillEffect[SK.RG_STRIPARMOR] = { successEffectId: 271 }; //Divest Armor
SkillEffect[SK.RG_STRIPHELM] = { successEffectId: 272 }; //Divest Helm
SkillEffect[SK.RG_INTIMIDATE] = { effectId: 227 }; //Snatch
SkillEffect[SK.RG_GRAFFITI] = {}; //Scribble
SkillEffect[SK.RG_FLAGGRAFFITI] = {}; //Piece
SkillEffect[SK.RG_CLEANER] = {}; //Remover
// Alchemist
SkillEffect[SK.AM_PHARMACY] = {}; //Prepare Potion
SkillEffect[SK.AM_DEMONSTRATION] = { groundEffectId: 302 }; //Bomb
SkillEffect[SK.AM_ACIDTERROR] = { beforeHitEffectId: 298 }; //Acid Terror
SkillEffect[SK.AM_POTIONPITCHER] = { effectId: 299 }; //Aid Potion
SkillEffect[SK.AM_CANNIBALIZE] = {}; //Summon Flora
SkillEffect[SK.AM_SPHEREMINE] = {}; //Summon Marine Sphere
SkillEffect[SK.AM_CP_WEAPON] = { effectId: 300 }; //Alchemical Weapon
SkillEffect[SK.AM_CP_SHIELD] = { effectId: 300 }; //Synthesized Shield
SkillEffect[SK.AM_CP_ARMOR] = { effectId: 300 }; //Synthetic Armor
SkillEffect[SK.AM_CP_HELM] = { effectId: 300 }; //Biochemical Helm
SkillEffect[SK.AM_CALLHOMUN] = {}; //Call Homunculus
SkillEffect[SK.AM_REST] = {}; //Vaporize
SkillEffect[SK.AM_RESURRECTHOMUN] = {}; //Homunculus Resurrection
// Crusader
SkillEffect[SK.CR_AUTOGUARD] = { effectId: 336 }; //Guard
SkillEffect[SK.CR_SHIELDCHARGE] = { effectId: 246 }; //Smite
SkillEffect[SK.CR_SHIELDBOOMERANG] = { beforeHitEffectId: 'ef_shield_projectile', effectId: 249 }; //Shield Boomerang
SkillEffect[SK.CR_REFLECTSHIELD] = { effectId: 252 }; //Shield Reflect
SkillEffect[SK.CR_HOLYCROSS] = { effectId: 245 }; //Holy Cross
SkillEffect[SK.CR_GRANDCROSS] = { effectId: 226 }; //Grand Cross
SkillEffect[SK.CR_DEVOTION] = { effectId: 251 }; //Sacrifice
SkillEffect[SK.CR_PROVIDENCE] = { effectId: 248 }; //Resistant Souls
SkillEffect[SK.CR_DEFENDER] = { effectId: 222 }; //Defending Aura
SkillEffect[SK.CR_SPEARQUICKEN] = { effectId: 250 }; //Spear Quicken
// Monk
SkillEffect[SK.MO_CALLSPIRITS] = {}; //Summon Spirit Sphere
SkillEffect[SK.MO_ABSORBSPIRITS] = { successEffectIdOnCaster: 253 }; //Absorb Spirit Sphere
SkillEffect[SK.MO_TRIPLEATTACK] = { effectId: 329 }; //Triple Attack
SkillEffect[SK.MO_BODYRELOCATION] = {}; //Snap
SkillEffect[SK.MO_INVESTIGATE] = { effectId: 267 }; //Occult Impaction
SkillEffect[SK.MO_FINGEROFFENSIVE] = { effectId: 265, hitEffectId: 1 }; //Throw Spirit Sphere
SkillEffect[SK.MO_STEELBODY] = { effectId: [254, 'quake'] }; //Mental Strength
SkillEffect[SK.MO_BLADESTOP] = {}; //Root
SkillEffect[SK.MO_EXPLOSIONSPIRITS] = { beginCastEffectId: 12, effectIdOnCaster: [261, 'quake'] }; //Fury
SkillEffect[SK.MO_EXTREMITYFIST] = {
	effectId: srcAID => {
		const src = EntityManager.get(srcAID);
		return src && CHAMPION_JOBS.has(src._job) ? [510, 'quake'] : [328, 'quake']; /* champion 510 */
	},
	hitEffectId: 266,
	beginCastEffectId: 12
}; //Asura Strike
SkillEffect[SK.MO_CHAINCOMBO] = { effectId: [262, 273], effectIdOnCaster: 263 }; //Raging Quadruple Blow
SkillEffect[SK.MO_COMBOFINISH] = { effectId: [330, 'quake'] }; //Raging Thrust
// Sage
SkillEffect[SK.SA_CASTCANCEL] = {}; //Cast Cancel
SkillEffect[SK.SA_MAGICROD] = { successEffectId: 244 }; //Magic Rod
SkillEffect[SK.SA_SPELLBREAKER] = { successEffectId: 234 }; //Spell Breaker
SkillEffect[SK.SA_AUTOSPELL] = {}; //Hindsight
SkillEffect[SK.SA_FLAMELAUNCHER] = { successEffectId: 255 }; //Endow Blaze
SkillEffect[SK.SA_FROSTWEAPON] = { successEffectId: 256 }; //Endow Tsunami
SkillEffect[SK.SA_LIGHTNINGLOADER] = { successEffectId: 257 }; //Endow Tornado
SkillEffect[SK.SA_SEISMICWEAPON] = { successEffectId: 258 }; //Endow Quake
SkillEffect[SK.SA_VOLCANO] = { effectIdOnCaster: 225, groundEffectId: 239 }; //Volcano
SkillEffect[SK.SA_DELUGE] = { effectIdOnCaster: 236, groundEffectId: 240 }; //Deluge
SkillEffect[SK.SA_VIOLENTGALE] = { effectIdOnCaster: 237, groundEffectId: 241 }; //Whirlwind
SkillEffect[SK.SA_LANDPROTECTOR] = { effectIdOnCaster: 238, groundEffectId: 242 }; //Magnetic Earth
SkillEffect[SK.SA_DISPELL] = { successEffectId: 235 }; //Dispell
SkillEffect[SK.SA_ABRACADABRA] = {}; //Hocus-pocus
SkillEffect[SK.SA_MONOCELL] = {}; //Monocell
SkillEffect[SK.SA_CLASSCHANGE] = {}; //Class Change
SkillEffect[SK.SA_SUMMONMONSTER] = {}; //Monster Chant
SkillEffect[SK.SA_REVERSEORCISH] = {}; //Grampus Morph
SkillEffect[SK.SA_DEATH] = {}; //Grim Reaper
SkillEffect[SK.SA_FORTUNE] = {}; //Gold Digger
SkillEffect[SK.SA_TAMINGMONSTER] = {}; //Beastly Hypnosis
SkillEffect[SK.SA_QUESTION] = {}; //Questioning
SkillEffect[SK.SA_GRAVITY] = {}; //Gravity
SkillEffect[SK.SA_LEVELUP] = {}; //Leveling
SkillEffect[SK.SA_INSTANTDEATH] = {}; //Suicide
SkillEffect[SK.SA_FULLRECOVERY] = {}; //Rejuvenation
SkillEffect[SK.SA_COMA] = {}; //Coma
// Bard & Dancer
SkillEffect[SK.BD_ADAPTATION] = {}; //Amp
SkillEffect[SK.BD_ENCORE] = {}; //Encore
SkillEffect[SK.BD_LULLABY] = { effectId: 278, groundEffectId: '278_ground' }; //Lullaby
SkillEffect[SK.BD_RICHMANKIM] = { effectId: 279, groundEffectId: '279_ground' }; //Mental Sensing
SkillEffect[SK.BD_ETERNALCHAOS] = { effectId: 280, groundEffectId: '280_ground' }; //Down Tempo
SkillEffect[SK.BD_DRUMBATTLEFIELD] = { effectId: 281, groundEffectId: '281_ground' }; //Battle Theme
SkillEffect[SK.BD_RINGNIBELUNGEN] = { effectId: 282, groundEffectId: '282_ground' }; //Harmonic Lick
SkillEffect[SK.BD_ROKISWEIL] = { effectId: 283, groundEffectId: '283_ground' }; //Classical Pluck
SkillEffect[SK.BD_INTOABYSS] = { effectId: 284, groundEffectId: '284_ground' }; //Power Chord
SkillEffect[SK.BD_SIEGFRIED] = { effectId: 285, groundEffectId: '285_ground' }; //Acoustic Rhythm
// Bard
SkillEffect[SK.BA_MUSICALSTRIKE] = { hideCastAura: true, beforeHitEffectId: 'ef_arrow_projectile' }; //Melody Strike
SkillEffect[SK.BA_DISSONANCE] = { groundEffectId: '277_ground' }; //Unchained Serenade
SkillEffect[SK.BA_FROSTJOKE] = { beginCastEffectId: 295 }; //Unbarring Octave
SkillEffect[SK.BA_WHISTLE] = { effectId: 286, groundEffectId: '286_ground' }; //Perfect Tablature
SkillEffect[SK.BA_ASSASSINCROSS] = { effectId: 287, groundEffectId: '287_ground' }; //Impressive Riff
SkillEffect[SK.BA_POEMBRAGI] = { effectId: 288, groundEffectId: '288_ground' }; //Magic Strings
SkillEffect[SK.BA_APPLEIDUN] = { effectId: 289, groundEffectId: '289_ground' }; //Song of Lutie
// Dancer
SkillEffect[SK.DC_THROWARROW] = { hideCastAura: true, beforeHitEffectId: 'ef_arrow_projectile' }; //Slinging Arrow
SkillEffect[SK.DC_UGLYDANCE] = { groundEffectId: '290_ground' }; //Hip Shaker
SkillEffect[SK.DC_SCREAM] = { beginCastEffectId: 296 }; //Dazzler
SkillEffect[SK.DC_HUMMING] = { effectId: 291, groundEffectId: '291_ground' }; //Focus Ballet
SkillEffect[SK.DC_DONTFORGETME] = { effectId: 292, groundEffectId: '292_ground' }; //Slow Grace
SkillEffect[SK.DC_FORTUNEKISS] = { effectId: 293, groundEffectId: '293_ground' }; //Lady Luck
SkillEffect[SK.DC_SERVICEFORYOU] = { effectId: 294, groundEffectId: '294_ground' }; //Gypsy's Kiss
// NPC Skills
SkillEffect[SK.NPC_RANDOMMOVE] = {}; //Random Move
SkillEffect[SK.NPC_SPEEDUP] = {}; //Speed UP
SkillEffect[SK.NPC_REVENGE] = {}; //Revenge
// Marriage Skills
SkillEffect[SK.WE_MALE] = {}; //I Will Protect You
SkillEffect[SK.WE_FEMALE] = {}; //I Look up to You
SkillEffect[SK.WE_CALLPARTNER] = {}; //I miss You
// NPC Skills
SkillEffect[SK.ITM_TOMAHAWK] = { beforeHitEffectId: 'ef_tomahawk_projectile', effectId: 494 }; //Throw Tomahawk
SkillEffect[SK.NPC_DARKCROSS] = { effectId: 450 }; //Cross of Darkness
SkillEffect[SK.NPC_GRANDDARKNESS] = {}; //Grand cross of Darkness
SkillEffect[SK.NPC_DARKSTRIKE] = { effectId: 451 }; //Soul Strike of Darkness
SkillEffect[SK.NPC_DARKTHUNDER] = { effectId: 93, hitEffectId: 94 }; //Darkness Jupitel
SkillEffect[SK.NPC_STOP] = { effectId: 453 }; //Stop
SkillEffect[SK.NPC_WEAPONBRAKER] = {}; //Break weapon
SkillEffect[SK.NPC_ARMORBRAKE] = {}; //Break armor
SkillEffect[SK.NPC_HELMBRAKE] = {}; //Break helm
SkillEffect[SK.NPC_SHIELDBRAKE] = {}; //Break shield
SkillEffect[SK.NPC_UNDEADATTACK] = {}; //Undead Element Attack
SkillEffect[SK.NPC_CHANGEUNDEAD] = {}; //Undead Attribute Change
SkillEffect[SK.NPC_POWERUP] = { effectId: 456 }; //Power Up
SkillEffect[SK.NPC_AGIUP] = SkillEffect[SK.AL_INCAGI]; //Agility UP
SkillEffect[SK.NPC_CALLSLAVE] = {}; //Recall Slaves
SkillEffect[SK.NPC_RUN] = {}; //Run
// Lord Knight
SkillEffect[SK.LK_AURABLADE] = { beginCastEffectId: 'white_pulse', effectId: 367 }; //Aura Blade
SkillEffect[SK.LK_PARRYING] = { effectId: 336 }; //Parrying
SkillEffect[SK.LK_CONCENTRATION] = { effectId: 369 }; //Concentration
SkillEffect[SK.LK_TENSIONRELAX] = {}; //Relax
SkillEffect[SK.LK_BERSERK] = { effectId: [368, 'quake'] }; //Frenzy
SkillEffect[SK.LK_FURY] = { effectId: [368, 'quake'] }; //Fury
// High Priest
SkillEffect[SK.HP_ASSUMPTIO] = { effectId: 440 }; //Assumptio
SkillEffect[SK.HP_BASILICA] = { groundEffectId: 374 }; //Basilica
// High Wizard
SkillEffect[SK.HW_MAGICCRASHER] = { effectId: 380 }; //Stave Crasher
SkillEffect[SK.HW_MAGICPOWER] = { hideCastAura: true, beginCastEffectId: 16, effectId: 'ef_magicpower' }; //Mystical Amplification
SkillEffect[SK.HW_SOULDRAIN] = { effectIdOnCaster: 217 };
// Paladin
SkillEffect[SK.PA_PRESSURE] = { beforeHitEffectId: 365 }; //Gloria Domini
SkillEffect[SK.PA_SACRIFICE] = { effectId: 366 }; // Martyr's Reckoning
SkillEffect[SK.PA_GOSPEL] = { effectId: 370, groundEffectId: '370_ground' }; //Battle Chant
// Champion
SkillEffect[SK.CH_PALMSTRIKE] = { hitEffectId: [376, 'quake'] }; //Raging Palm Strike
SkillEffect[SK.CH_TIGERFIST] = { effectIdOnCaster: 263, effectId: [377, 'quake'] }; //Glacier Fist
SkillEffect[SK.CH_CHAINCRUSH] = { effectId: 512 }; //Chain Crush Combo
// Professor
SkillEffect[SK.PF_HPCONVERSION] = { effectId: 383, effectIdOnCaster: 378, successEffectIdOnCaster: 379 }; //Indulge
SkillEffect[SK.PF_SOULCHANGE] = { effectId: 384, successEffectId: 385 }; //Soul Exhale
SkillEffect[SK.PF_SOULBURN] = { effectId: 406 }; //Soul Siphon
// Asassin Cross
SkillEffect[SK.ASC_EDP] = { effectId: 493 }; //Enchant Deadly Poison
SkillEffect[SK.ASC_BREAKER] = { beforeHitEffectId: 361 }; //Soul Destroyer
// Sniper
SkillEffect[SK.SN_SIGHT] = { effectId: 386 }; //Falcon Eyes
SkillEffect[SK.SN_FALCONASSAULT] = { hideCastAura: true, effectId: 387 }; //Falcon Assault
SkillEffect[SK.SN_SHARPSHOOTING] = {
	hitEffectId: 388,
	beforeHitEffectId: 'ef_arrow_projectile',
	beginCastEffectId: '496_beforecast'
}; //Focused Arrow Strike
SkillEffect[SK.SN_WINDWALK] = { effectId: 389 }; //Wind Walker
// Whitesmith
SkillEffect[SK.WS_MELTDOWN] = { effectId: 390 }; //Shattering Strike
SkillEffect[SK.WS_CREATECOIN] = {}; //Create Coins
SkillEffect[SK.WS_CREATENUGGET] = {}; //Create Nuggets
SkillEffect[SK.WS_CARTBOOST] = { effectId: 391 }; //Cart Boost
SkillEffect[SK.WS_SYSTEMCREATE] = {}; //Auto Attack System
// Stalker
SkillEffect[SK.ST_CHASEWALK] = { beginCastEffectId: 501 }; //Stealth
SkillEffect[SK.ST_REJECTSWORD] = { effectId: 392 }; //Counter Instinct
// Creator
SkillEffect[SK.CR_ALCHEMY] = {}; //Alchemy
SkillEffect[SK.CR_SYNTHESISPOTION] = {}; //Potion Synthesis
// Clown & Gypsy
SkillEffect[SK.CG_ARROWVULCAN] = { effectId: 393, beforeHitEffectId: 'ef_arrow_projectile' }; //Vulcan Arrow
SkillEffect[SK.CG_MOONLIT] = { effectId: 394, groundEffectId: '394_ground' }; //Sheltering Bliss
SkillEffect[SK.CG_MARIONETTE] = { effectId: 395, hitEffectId: 396 }; //Marionette Control
// Lord Knight
SkillEffect[SK.LK_SPIRALPIERCE] = {
	hideCastAura: true,
	beginCastEffectId: '339_beforecast',
	effectId: 339,
	hitEffectId: 'spear_hit_sound'
}; //Spiral Pierce
SkillEffect[SK.LK_HEADCRUSH] = { beginCastEffectId: 399, hitEffectId: 'enemy_hit_normal1' }; //Traumatic Blow
SkillEffect[SK.LK_JOINTBEAT] = { beginCastEffectId: 400, hitEffectId: 'enemy_hit_normal1' }; //Vital Strike
// High Wizard
SkillEffect[SK.HW_NAPALMVULCAN] = { effectId: 401 }; //Napalm Vulcan
// Champion
SkillEffect[SK.CH_SOULCOLLECT] = { beginCastEffectId: [402, 12] }; //Zen
// Professor
SkillEffect[SK.PF_MINDBREAKER] = { successEffectId: 403 }; //Mind Breaker
SkillEffect[SK.PF_MEMORIZE] = { effectId: 505 }; //Foresight
SkillEffect[SK.PF_FOGWALL] = { groundEffectId: '405_ground' }; //Blinding Mist
SkillEffect[SK.PF_SPIDERWEB] = { groundEffectId: 404 }; //Fiber Lock
// Assassin Cross
SkillEffect[SK.ASC_METEORASSAULT] = { hideCastAura: true, effectIdOnCaster: 409 }; //Meteor Assault
SkillEffect[SK.ASC_CDP] = {}; //Create Deadly Poison
// Marriage Skills for Baby
SkillEffect[SK.WE_BABY] = { effectId: 408 }; //Baby
SkillEffect[SK.WE_CALLPARENT] = {}; //Call Parent
SkillEffect[SK.WE_CALLBABY] = {}; //Call Baby
// Taekwon
SkillEffect[SK.TK_RUN] = { effectId: 443, groundEffectId: 442 /*wallhit 458*/ }; //Running
SkillEffect[SK.TK_READYSTORM] = {}; //Tornado Stance
SkillEffect[SK.TK_STORMKICK] = { effectId: 435 }; //Tornado Kick
SkillEffect[SK.TK_READYDOWN] = {}; //Heel Drop Stance
SkillEffect[SK.TK_DOWNKICK] = { effectId: 413 }; //Heel Drop
SkillEffect[SK.TK_READYTURN] = {}; //Roundhouse Stance
SkillEffect[SK.TK_TURNKICK] = { effectId: 414 }; //Roundhouse Kick
SkillEffect[SK.TK_READYCOUNTER] = {}; //Counter Kick Stance
SkillEffect[SK.TK_COUNTER] = { effectId: 415 }; //Counter Kick
SkillEffect[SK.TK_DODGE] = {}; //Tumbling
SkillEffect[SK.TK_JUMPKICK] = { effectId: 439, hitEffectId: 457 }; //Flying Kick
SkillEffect[SK.TK_SEVENWIND] = {/* 467 - 473 is done by entity */}; //Mild Wind
SkillEffect[SK.TK_HIGHJUMP] = { hideCastAura: true, groundEffectId: 411, effectIdOnCaster: 445 /*down 446*/ }; //Taekwon Jump
// Star Gladiator
SkillEffect[SK.SG_FEEL] = { effectId: 432 }; //Feeling the Sun Moon and Stars
SkillEffect[SK.SG_SUN_WARM] = { effectId: 488 }; //Warmth of the Sun
SkillEffect[SK.SG_MOON_WARM] = { effectId: 488 }; //Warmth of the Moon
SkillEffect[SK.SG_STAR_WARM] = { effectId: 488 }; //Warmth of the Stars
SkillEffect[SK.SG_SUN_COMFORT] = { effectId: 441 }; //Comfort of the Sun
SkillEffect[SK.SG_MOON_COMFORT] = { effectId: 441 }; //Comfort of the Moon
SkillEffect[SK.SG_STAR_COMFORT] = { effectId: 441 }; //Comfort of the Stars
SkillEffect[SK.SG_HATE] = { /*475 - 484*/ groundEffectId: 487 }; //Hatred of the Sun Moon and Stars
SkillEffect[SK.SG_FUSION] = { effectId: [433, 'quake'] }; //Union of the Sun Moon and Stars
// Alchemist
SkillEffect[SK.AM_BERSERKPITCHER] = { beforeHitEffectId: 541, effectId: 220 }; //Aid Berserk Potion
// Soul Linker
SkillEffect[SK.SL_ALCHEMIST] = //↓		//Spirit of the Alchemist
	SkillEffect[SK.SL_MONK] = //↓		//Spirit of the Monk
	SkillEffect[SK.SL_STAR] = //↓		//Spirit of the Star Gladiator
	SkillEffect[SK.SL_SAGE] = //↓		//Spirit of the Sage
	SkillEffect[SK.SL_CRUSADER] = //↓		//Spirit of the Crusader
	SkillEffect[SK.SL_SUPERNOVICE] = //↓		//Spirit of the Supernovice
	SkillEffect[SK.SL_KNIGHT] = //↓		//Spirit of the Knight
	SkillEffect[SK.SL_WIZARD] = //↓		//Spirit of the Wizard
	SkillEffect[SK.SL_PRIEST] = //↓		//Spirit of the Priest
	SkillEffect[SK.SL_BARDDANCER] = //↓		//Spirit of the Artist
	SkillEffect[SK.SL_ROGUE] = //↓		//Spirit of the Rogue
	SkillEffect[SK.SL_ASSASIN] = //↓		//Spirit of the Assasin
	SkillEffect[SK.SL_BLACKSMITH] =
		{ effectId: [424, 503] }; //Spirit of the Blacksmith
// Blacksmith
SkillEffect[SK.BS_ADRENALINE2] = SkillEffect[SK.BS_ADRENALINE]; //Advanced Adrenaline Rush
// Soul Linker
SkillEffect[SK.SL_HUNTER] = //↓		//Spirit of the Hunter
	SkillEffect[SK.SL_SOULLINKER] = { effectId: [424, 503] }; //Spirit of the Soul Linker
SkillEffect[SK.SL_KAIZEL] = { effectId: 590 }; //Kaizel
SkillEffect[SK.SL_KAAHI] = { effectId: 543 }; //Kaahi
SkillEffect[SK.SL_KAUPE] = { effectId: 546 }; //Kaupe
SkillEffect[SK.SL_KAITE] = { effectId: 419 }; //Kaite
SkillEffect[SK.SL_STIN] = { effectId: 547 }; //Estin
SkillEffect[SK.SL_STUN] = { effectId: 555 }; //Estun
SkillEffect[SK.SL_SMA] = { effectId: 553, successEffectId: 425 }; //Esma
SkillEffect[SK.SL_SWOO] = { effectId: 589, successEffectId: 420 }; //Eswoo
SkillEffect[SK.SL_SKE] = { effectId: 427 }; //Eske
SkillEffect[SK.SL_SKA] = { effectId: [254, 261, 'quake'] }; //Eska
// Other 2nd Skills
SkillEffect[SK.SM_SELFPROVOKE] = {}; //Provoke Self
SkillEffect[SK.NPC_EMOTION_ON] = {}; //Emotion ON
SkillEffect[SK.ST_PRESERVE] = { beginCastEffectId: '496_beforecast', effectId: 496 }; //Preserve
SkillEffect[SK.ST_FULLSTRIP] = { successEffectId: 495 }; //Divest All
SkillEffect[SK.WS_WEAPONREFINE] = {}; //Upgrade Weapon
SkillEffect[SK.WS_ARMORREFINE] = {}; //Upgrade Armor
SkillEffect[SK.CR_SLIMPITCHER] = {}; //Aid Condensed Potion
SkillEffect[SK.CR_FULLPROTECTION] = { effectId: [300, 500] }; //Full Protection
SkillEffect[SK.PA_SHIELDCHAIN] = { beforeHitEffectId: 'ef_shield_projectile' }; //Shield Chain
SkillEffect[SK.PF_DOUBLECASTING] = { effectId: 521 }; //Double Casting
SkillEffect[SK.HW_GANBANTEIN] = { effectId: 223, groundEffectId: 224 }; //Ganbantein
SkillEffect[SK.HW_GRAVITATION] = { groundEffectId: '522_ground' }; //Gravitation Field
SkillEffect[SK.WS_CARTTERMINATION] = { effectId: 518 }; //Cart Termination
SkillEffect[SK.WS_OVERTHRUSTMAX] = SkillEffect[SK.BS_OVERTHRUST]; //Maximum Power Thrust
SkillEffect[SK.CG_LONGINGFREEDOM] = { effectId: 500 }; //Longing for Freedom
SkillEffect[SK.CG_HERMODE] = { effectId: '517_music', groundEffectId: 517 }; //Wand of Hermode
SkillEffect[SK.CG_TAROTCARD] = { successEffectId: 500 }; //Tarot Card of Fate
SkillEffect[SK.CR_ACIDDEMONSTRATION] = { effectId: 537 }; //Acid Demonstration
SkillEffect[SK.CR_CULTIVATION] = {}; //Plant Cultivation
SkillEffect[SK.ITEM_ENCHANTARMS] = {}; //Weapon Enchantment
SkillEffect[SK.TK_MISSION] = {/*effect/piring.wav*/}; //Taekwon Mission
SkillEffect[SK.SL_HIGH] = { effectId: [424, 503] }; //Spirit of Rebirth
SkillEffect[SK.KN_ONEHAND] = SkillEffect[SK.KN_TWOHANDQUICKEN]; //Onehand Quicken
SkillEffect[SK.AM_TWILIGHT1] = { effectId: 497 }; //Twilight Alchemy 1
SkillEffect[SK.AM_TWILIGHT2] = { effectId: 498 }; //Twilight Alchemy 2
SkillEffect[SK.AM_TWILIGHT3] = { effectId: 499 }; //Twilight Alchemy 3
SkillEffect[SK.HT_POWER] = {}; //Beast Strafing
// Gunslinger
SkillEffect[SK.GS_GLITTERING] = { effectId: 'gunslinger_coin' }; //Flip the Coin
SkillEffect[SK.GS_FLING] = {}; //Fling
SkillEffect[SK.GS_TRIPLEACTION] = { effectId: 648 }; //Triple Action
SkillEffect[SK.GS_BULLSEYE] = { effectId: 649 }; //Bulls Eye
SkillEffect[SK.GS_MADNESSCANCEL] = { effectId: 625 }; //Madness Canceller
SkillEffect[SK.GS_ADJUSTMENT] = { effectId: 626 }; //AdJustment
SkillEffect[SK.GS_INCREASING] = { effectId: 456 }; //Increasing Accuracy
SkillEffect[SK.GS_MAGICALBULLET] = { effectId: 644 }; //Magical Bullet
SkillEffect[SK.GS_CRACKER] = {/*effect\\cracker.wav*/}; //Cracker
SkillEffect[SK.GS_TRACKING] = { effectId: 646, hitEffectId: 647 }; //Tracking
SkillEffect[SK.GS_DISARM] = { effectId: 627 }; //Disarm
SkillEffect[SK.GS_PIERCINGSHOT] = {}; //Piercing Shot
SkillEffect[SK.GS_RAPIDSHOWER] = { effectId: 643 }; //Rapid Shower
SkillEffect[SK.GS_DESPERADO] = { effectId: 637 }; //Desperado
SkillEffect[SK.GS_GATLINGFEVER] = { effectId: 626 }; //Gatling Fever
SkillEffect[SK.GS_DUST] = { effectId: 628 }; //Dust
SkillEffect[SK.GS_FULLBUSTER] = { effectId: 584 }; //Full Buster
SkillEffect[SK.GS_SPREADATTACK] = { effectId: 645 }; //Spread Attack
SkillEffect[SK.GS_GROUNDDRIFT] = {}; //Ground Drift
// Ninja
SkillEffect[SK.NJ_SYURIKEN] = { beforeHitEffectId: 613 }; //Throw Shuriken
SkillEffect[SK.NJ_KUNAI] = { beforeHitEffectId: 614 }; //Throw Kunai
SkillEffect[SK.NJ_HUUMA] = { beforeHitEffectId: 615 }; //Throw Huuma Shuriken
SkillEffect[SK.NJ_ZENYNAGE] = { beforeHitEffectId: 616 }; //Throw Zeny
SkillEffect[SK.NJ_TATAMIGAESHI] = { groundEffectId: 631 }; //Improvised Defense
SkillEffect[SK.NJ_KASUMIKIRI] = { effectId: 632 }; //Vanishing Slash
SkillEffect[SK.NJ_SHADOWJUMP] = {}; //Shadow Leap
SkillEffect[SK.NJ_KIRIKAGE] = { effectId: 630 }; //Shadow Slash
SkillEffect[SK.NJ_UTSUSEMI] = {}; //Cicada Skin Sheeding
SkillEffect[SK.NJ_BUNSINJYUTSU] = { effectId: 617 }; //Mirror Image
SkillEffect[SK.NJ_KOUENKA] = { effectId: 618 }; //Crimson Fire Petal
SkillEffect[SK.NJ_KAENSIN] = { groundEffectId: 634 }; //Crimson Fire Formation
SkillEffect[SK.NJ_BAKUENRYU] = { effectId: 635 }; //Raging Fire Dragon
SkillEffect[SK.NJ_HYOUSENSOU] = { effectId: 619 }; //Spear of Ice
SkillEffect[SK.NJ_SUITON] = { groundEffectId: 620 }; //Hidden Water
SkillEffect[SK.NJ_HYOUSYOURAKU] = { effectId: 636 }; //Ice Meteor
SkillEffect[SK.NJ_HUUJIN] = { effectId: 621 }; //Wind Blade
SkillEffect[SK.NJ_RAIGEKISAI] = { effectId: 622 }; //Lightning Strike of Destruction
SkillEffect[SK.NJ_KAMAITACHI] = {}; //Kamaitachi
SkillEffect[SK.NJ_NEN] = {}; //Soul
SkillEffect[SK.NJ_ISSEN] = { effectId: 633 }; //Final Strike
// Additional NPC Skills (Episode 11.3)
SkillEffect[SK.NPC_EARTHQUAKE] = { effectIdOnCaster: 666 }; //Earthquake
SkillEffect[SK.NPC_FIREBREATH] = { effectId: 'ef_firebreath', hitEffectId: 49 }; //Fire Breath
SkillEffect[SK.NPC_ICEBREATH] = {}; //Ice Breath
SkillEffect[SK.NPC_THUNDERBREATH] = { hitEffectId: 52 }; //Thunder Breath
SkillEffect[SK.NPC_ACIDBREATH] = {}; //Acid Breath
SkillEffect[SK.NPC_DARKNESSBREATH] = {}; //Darkness Breath
SkillEffect[SK.NPC_DRAGONFEAR] = { effectId: 668 }; //Dragon Fear
SkillEffect[SK.NPC_BLEEDING] = {}; //Bleeding
SkillEffect[SK.NPC_PULSESTRIKE] = { effectIdOnCaster: 409 }; //Pulse Strike
SkillEffect[SK.NPC_HELLJUDGEMENT] = {}; //Hell's Judgement
SkillEffect[SK.NPC_WIDESILENCE] = {}; //Wide Silence
SkillEffect[SK.NPC_WIDEFREEZE] = { effectIdOnCaster: 89 }; //Wide Freeze
SkillEffect[SK.NPC_WIDEBLEEDING] = { effectIdOnCaster: 669 }; //Wide Bleeding
SkillEffect[SK.NPC_WIDESTONE] = {}; //Wide Petrify
SkillEffect[SK.NPC_WIDECONFUSE] = {}; //Wide Confusion
SkillEffect[SK.NPC_WIDESLEEP] = {}; //Wide Sleep
SkillEffect[SK.NPC_WIDESIGHT] = {}; //Wide Sight
SkillEffect[SK.NPC_EVILLAND] = { groundEffectId: 674 }; //Evil Land
SkillEffect[SK.NPC_MAGICMIRROR] = {}; //Magic Mirror
SkillEffect[SK.NPC_SLOWCAST] = {}; //Slow Cast
SkillEffect[SK.NPC_CRITICALWOUND] = { hitEffectId: 677 }; //Critical Wounds
SkillEffect[SK.NPC_EXPULSION] = {}; //Expulsion
SkillEffect[SK.NPC_STONESKIN] = {}; //Stone Skin
SkillEffect[SK.NPC_ANTIMAGIC] = {}; //Anti Magic
SkillEffect[SK.NPC_WIDECURSE] = {}; //Wide Curse
SkillEffect[SK.NPC_WIDESTUN] = {}; //Wide Stun
SkillEffect[SK.NPC_VAMPIRE_GIFT] = {}; //Vampire Gift
SkillEffect[SK.NPC_WIDESOULDRAIN] = {}; //Wide Soul Drain
// Cash Shop Skill
// Additional NPC skill (Episode 12)
SkillEffect[SK.NPC_TALK] = {}; //Talk
SkillEffect[SK.NPC_HELLPOWER] = {}; //Hell Power
SkillEffect[SK.NPC_WIDEHELLDIGNITY] = {}; //Hell Dignity
SkillEffect[SK.NPC_INVINCIBLE] = {}; //Invincible
SkillEffect[SK.NPC_INVINCIBLEOFF] = {}; //Invincible off
SkillEffect[SK.NPC_ALLHEAL] = {}; //Full Heal
// Additional Skill (??)
SkillEffect[SK.GM_SANDMAN] = {}; //GM Sandman
SkillEffect[SK.CASH_BLESSING] = SkillEffect[SK.AL_BLESSING]; //Party Blessing
SkillEffect[SK.CASH_INCAGI] = SkillEffect[SK.AL_INCAGI]; //Party Increase AGI
SkillEffect[SK.CASH_ASSUMPTIO] = SkillEffect[SK.HP_ASSUMPTIO]; //Party Assumptio
SkillEffect[SK.ALL_PARTYFLEE] = {}; //Party Flee
SkillEffect[SK.ALL_REVERSEORCISH] = {}; //Reverse Orcish
SkillEffect[SK.ALL_WEWISH] = { effectId: 717 }; //Christmas Carol
// New NPC Wide Status AoE Skills And Others
SkillEffect[SK.NPC_VENOMFOG] = { effectId: 1020 }; //Venom Fog
SkillEffect[SK.NPC_MAXPAIN] = {}; //Max Pain
SkillEffect[SK.NPC_MAXPAIN_ATK] = {}; //Max Pain Attack
// 2nd Quest Skills
SkillEffect[SK.KN_CHARGEATK] = { beginCastEffectId: 'white_pulse', hitEffectId: 'enemy_hit_normal1' }; //Charge Attack
SkillEffect[SK.CR_SHRINK] = { effectId: 599 }; //Shrink
SkillEffect[SK.AS_VENOMKNIFE] = { beforeHitEffectId: 600 }; //Throw Venom Knife
SkillEffect[SK.RG_CLOSECONFINE] = { effectId: 602, groundEffectId: 604 }; //Close Confine
SkillEffect[SK.WZ_SIGHTBLASTER] = { effectId: 601 }; //Sight Blaster
SkillEffect[SK.SA_CREATECON] = {}; //Create Elemental Converter
SkillEffect[SK.SA_ELEMENTWATER] = { effectId: 256 }; //Elemental Change Water
SkillEffect[SK.HT_PHANTASMIC] = { beforeHitEffectId: 'ef_arrow_projectile', hitEffectId: 1 }; //Phantasmic Arrow
SkillEffect[SK.BA_PANGVOICE] = { successEffectId: 606 }; //Pang Voice
SkillEffect[SK.DC_WINKCHARM] = { successEffectId: 607 }; //Wink of Charm
SkillEffect[SK.BS_GREED] = { effectId: 'ef_greed_sound' }; //Greed
SkillEffect[SK.PR_REDEMPTIO] = {}; //Redemptio
SkillEffect[SK.MO_KITRANSLATION] = {}; //Ki Translation
SkillEffect[SK.MO_BALKYOUNG] = { effectId: 514 }; //Ki Explosion
SkillEffect[SK.SA_ELEMENTGROUND] = { effectId: 258 }; //Elemental Change Earth
SkillEffect[SK.SA_ELEMENTFIRE] = { effectId: 255 }; //Elemental Change Fire
SkillEffect[SK.SA_ELEMENTWIND] = { effectId: 257 }; //Elemental Change Wind
// RK Rune Knight
SkillEffect[SK.RK_ENCHANTBLADE] = { effectId: 756 }; //Enchant Blade
SkillEffect[SK.RK_SONICWAVE] = { effectId: 832 }; //Sonic Wave
SkillEffect[SK.RK_DEATHBOUND] = { effectId: 67 }; //Death Bound
SkillEffect[SK.RK_HUNDREDSPEAR] = { effectId: 723, hitEffectId: 1 }; //Hundred Spear
SkillEffect[SK.RK_WINDCUTTER] = { effectId: 'ef_rk_windcutter' }; //Wind Cutter
SkillEffect[SK.RK_IGNITIONBREAK] = { effectIdOnCaster: 'ef_rk_ignitionbreak' }; //Ignition Break
SkillEffect[SK.RK_DRAGONBREATH] = { effectId: 'ef_rk_dragonbreath', hitEffectId: 587 }; //Dragon Breath
SkillEffect[SK.RK_DRAGONHOWLING] = { effectId: 731 }; //Dragon Howling
SkillEffect[SK.RK_MILLENNIUMSHIELD] = { effectId: 749 }; //Millenium Shield
SkillEffect[SK.RK_CRUSHSTRIKE] = { effectIdOnCaster: 'ef_rk_ignitionbreak', hitEffectId: 1 }; //Crush Strike
SkillEffect[SK.RK_REFRESH] = { effectId: 66 }; //Refresh
SkillEffect[SK.RK_GIANTGROWTH] = { effectId: 311 }; //Giant Growth
SkillEffect[SK.RK_STONEHARDSKIN] = { effectId: 56 }; //Stone Hard Skin
SkillEffect[SK.RK_VITALITYACTIVATION] = { effectId: 7 }; //Vitality Activation
SkillEffect[SK.RK_STORMBLAST] = { effectId: 89, hitEffectId: 52 }; //Storm Blast
SkillEffect[SK.RK_FIGHTINGSPIRIT] = { effectId: 311 }; //Fighting Spirit //CHECK Is this splash needed?
SkillEffect[SK.RK_ABUNDANCE] = { effectId: 7 }; //Abundance
SkillEffect[SK.RK_PHANTOMTHRUST] = { effectId: 227, hitEffectId: 1 }; //Phantom Thrust
// WL Warlock
SkillEffect[SK.WL_WHITEIMPRISON] = { effectId: 802 }; //White Imprison
SkillEffect[SK.WL_SOULEXPANSION] = { effectId: 'ef_wl_soulexpansion', hitEffectId: 1 }; //Soul Expansion
SkillEffect[SK.WL_FROSTMISTY] = { effectId: 726 }; //Frosty Misty
SkillEffect[SK.WL_JACKFROST] = { effectId: 'ef_jackfrost', groundEffectId: 801 }; //Jack Frost
SkillEffect[SK.WL_MARSHOFABYSS] = { effectId: 729 }; //Marsh of Abyss
SkillEffect[SK.WL_RECOGNIZEDSPELL] = { effectId: 803 }; //Recognized Spell
SkillEffect[SK.WL_SIENNAEXECRATE] = { effectId: 'ef_siennaexecrate' }; //Sienna Execrate
SkillEffect[SK.WL_STASIS] = { effectId: 799 }; //Stasis
SkillEffect[SK.WL_DRAINLIFE] = { effectId: 217 }; //Drain Life
SkillEffect[SK.WL_CRIMSONROCK] = { effectId: 'ef_wl_crimsonrock' }; //Crimson Rock
SkillEffect[SK.WL_HELLINFERNO] = { groundEffectId: 728, effectId: 'ef_wl_hellinferno' }; //Hell Inferno
SkillEffect[SK.WL_COMET] = { effectId: 'ef_wl_comet' }; //Comet
SkillEffect[SK.WL_CHAINLIGHTNING] = { effectId: 'ef_wl_chainlightning' }; //Chain Lightning
SkillEffect[SK.WL_CHAINLIGHTNING_ATK] = { effectId: 734 }; //Chain Lightning Attack
SkillEffect[SK.WL_EARTHSTRAIN] = { groundEffectId: 732 }; //Earth Strain
SkillEffect[SK.WL_TETRAVORTEX] = { effectId: 804, beginCastEffectId: 805 }; //Tetra Vortex
SkillEffect[SK.WL_TETRAVORTEX_FIRE] = { effectId: 49 }; //Tetra Vortex Fire
SkillEffect[SK.WL_TETRAVORTEX_WATER] = { effectId: 51 }; //Tetra Vortex Water
SkillEffect[SK.WL_TETRAVORTEX_WIND] = { effectId: 52 }; //Tetra Vortex Wind
SkillEffect[SK.WL_TETRAVORTEX_GROUND] = { effectId: 54 }; //Tetra Vortex Earth
SkillEffect[SK.WL_SUMMONFB] = { effectId: 49 }; //Summon Fire Ball
SkillEffect[SK.WL_SUMMONBL] = { effectId: 52 }; //Summon Lightning Ball
SkillEffect[SK.WL_SUMMONWB] = { effectId: 51 }; //Summon Water Ball
SkillEffect[SK.WL_SUMMON_ATK_FIRE] = { beforeHitEffectId: 24, hitEffectId: 49 }; //Summon Attack Fire //CHECK Summon attack ID's dont appear to have a range.
SkillEffect[SK.WL_SUMMON_ATK_WIND] = { effectId: 29, hitEffectId: 52 }; //Summon Attack Wind
SkillEffect[SK.WL_SUMMON_ATK_WATER] = { beforeHitEffectId: 'ef_coldbolt', hitEffectId: 51 }; //Summon Attack Water
SkillEffect[SK.WL_SUMMON_ATK_GROUND] = { hitEffectId: 54 }; //Summon Attack Earth
SkillEffect[SK.WL_SUMMONSTONE] = { effectId: 54 }; //Summon Stone
SkillEffect[SK.WL_RELEASE] = { effectId: 751 }; //Release //CHECK Should it be left to do multi hit or single hit?
SkillEffect[SK.WL_READING_SB] = { effectId: 311 }; //Reading Spellbook
// GC Guillotine Cross
SkillEffect[SK.GC_VENOMIMPRESS] = { effectId: 788 }; //Venom Impress
SkillEffect[SK.GC_CROSSIMPACT] = { effectId: 'ef_gc_crossimpact', hitEffectId: 1 }; //Cross Impact
SkillEffect[SK.GC_DARKILLUSION] = { effectId: 227 }; //Dark Illusion
SkillEffect[SK.GC_CREATENEWPOISON] = { effectId: 125 }; //Create New Poison
SkillEffect[SK.GC_ANTIDOTE] = { effectId: 66 }; //Antidote
SkillEffect[SK.GC_POISONINGWEAPON] = { effectId: 125 }; //Poisoning Weapon
SkillEffect[SK.GC_WEAPONBLOCKING] = { effectId: 11 }; //Weapon Blocking
SkillEffect[SK.GC_COUNTERSLASH] = { effectId: 'ef_gc_counterslash', hitEffectId: 1 }; //Counter Slash
SkillEffect[SK.GC_WEAPONCRUSH] = { hitEffectId: 1 }; //Weapon Crush
SkillEffect[SK.GC_VENOMPRESSURE] = { effectId: 125, hitEffectId: 1 }; //Venom Pressure
SkillEffect[SK.GC_POISONSMOKE] = { effectId: 924 }; //Poison Smoke
SkillEffect[SK.GC_CLOAKINGEXCEED] = { effectId: 136 }; //Cloaking Exceed
SkillEffect[SK.GC_PHANTOMMENACE] = { effectId: 773 }; //Phantom Menace
SkillEffect[SK.GC_HALLUCINATIONWALK] = { effectId: 'ef_hallucinationwalk' }; //Hallucination Walk
SkillEffect[SK.GC_ROLLINGCUTTER] = { effectId: 'ef_gc_rollingcutter' }; //Rolling Cutter
SkillEffect[SK.GC_CROSSRIPPERSLASHER] = { effectId: 'ef_gc_crossripperslasher' }; //Cross Ripper Slasher
// AB Arch Bishop
SkillEffect[SK.AB_JUDEX] = { effectId: 'ef_ab_judex', hitEffectId: 152 }; //Judex
SkillEffect[SK.AB_ANCILLA] = { effectId: 'ef_ancilla' }; //Ancilla
SkillEffect[SK.AB_ADORAMUS] = { effectId: 'ef_ab_adoramus' }; //Adoramus
SkillEffect[SK.AB_CLEMENTIA] = { effectId: 42 }; //Crementia
SkillEffect[SK.AB_CANTO] = { effectId: 37 }; //Canto Candidus
SkillEffect[SK.AB_CHEAL] = { effectId: 313 }; //Coluceo Heal
SkillEffect[SK.AB_EPICLESIS] = { effectId: 883, groundEffectId: 754 }; //Epiclesis
SkillEffect[SK.AB_PRAEFATIO] = { effectId: 75 }; //Praefatio
SkillEffect[SK.AB_ORATIO] = { effectId: 755 /*effectId: 725*/ }; //Oratio
SkillEffect[SK.AB_LAUDAAGNUS] = { effectId: 748 }; //Lauda Agnus
SkillEffect[SK.AB_LAUDARAMUS] = { effectId: 747 }; //Lauda Ramus
SkillEffect[SK.AB_RENOVATIO] = { effectId: 719 }; //Renovatio
SkillEffect[SK.AB_HIGHNESSHEAL] = { effectId: 325, hitEffectId: 320 }; //Highness Heal //CHECK Info shows this has magic attack.
SkillEffect[SK.AB_CLEARANCE] = { effectId: 753 }; //Clearance
SkillEffect[SK.AB_EXPIATIO] = { effectId: 311 }; //Expiatio //CHECK Does this also give the buff to party members?
SkillEffect[SK.AB_DUPLELIGHT] = { effectId: 'ef_duplelight' }; //Duple Light //CHECK Had issues adding a skill level check to make the % go higher with the skills level. Will do later.
SkillEffect[SK.AB_DUPLELIGHT_MELEE] = { hitEffectId: 1 }; //Duple Light Melee
SkillEffect[SK.AB_DUPLELIGHT_MAGIC] = { hitEffectId: 152 }; //Duple Light Magic
SkillEffect[SK.AB_SILENTIUM] = { effectId: 70 }; //Silentium //CHECk Marked magic attack as well. Hmmmm....
SkillEffect[SK.AB_SECRAMENT] = { effectId: 'ef_ab_secrament' }; //Secrament
// RA Ranger
SkillEffect[SK.RA_ARROWSTORM] = { effectId: 'ef_ra_arrowstorm' }; //Arrow Storm
SkillEffect[SK.RA_FEARBREEZE] = { effectId: 'ef_ra_fearbreeze' }; //Fear Breeze
SkillEffect[SK.RA_AIMEDBOLT] = { effectId: 'ef_ra_aimedbolt', beforeHitEffectId: 'ef_arrow_projectile' }; //Aimed Bolt
SkillEffect[SK.RA_DETONATOR] = { effectId: 750 }; //Detonator
SkillEffect[SK.RA_ELECTRICSHOCKER] = { groundEffectId: 141 }; //Electric Shocker
SkillEffect[SK.RA_CLUSTERBOMB] = { effectId: 183 }; //Cluster Bomb
SkillEffect[SK.RA_WUGMASTERY] = { effectId: 'ef_wugrider' }; //Warg Mastery
SkillEffect[SK.RA_WUGRIDER] = { effectId: 'ef_wugrider' }; //Warg Rider
SkillEffect[SK.RA_WUGDASH] = { effectId: 'ef_wugstrike' }; //Warg Dash
SkillEffect[SK.RA_WUGSTRIKE] = { effectId: 'ef_wugstrike' }; //Warg Strike
SkillEffect[SK.RA_WUGBITE] = { effectId: 'ef_wugbite' }; //Warg Bite
SkillEffect[SK.RA_SENSITIVEKEEN] = { effectId: 153 }; //Sensitive Keen
SkillEffect[SK.RA_CAMOUFLAGE] = { effectId: 744 }; //Camouflage
SkillEffect[SK.RA_MAGENTATRAP] = { groundEffectId: 739 }; //Magenta Trap
SkillEffect[SK.RA_COBALTTRAP] = { groundEffectId: 740 }; //Cobalt Trap
SkillEffect[SK.RA_MAIZETRAP] = { groundEffectId: 741 }; //Maize Trap
SkillEffect[SK.RA_VERDURETRAP] = { groundEffectId: 742 }; //Verdure Trap
SkillEffect[SK.RA_FIRINGTRAP] = { groundEffectId: 25 }; //Firing Trap
SkillEffect[SK.RA_ICEBOUNDTRAP] = { groundEffectId: 28 }; //Icebound Trap
// NC Mechanic
SkillEffect[SK.NC_BOOSTKNUCKLE] = { hitEffectId: 1 }; //Boost Knuckle
SkillEffect[SK.NC_PILEBUNKER] = { hitEffectId: 1, effectId: 17 }; //Pile Bunker
SkillEffect[SK.NC_VULCANARM] = { effectId: 'ef_nc_vulcanarm', hitEffectId: 1 }; //Vulcan Arm
SkillEffect[SK.NC_FLAMELAUNCHER] = { effectId: 787 }; //Flame Launcher
SkillEffect[SK.NC_COLDSLOWER] = { effectId: 27, hitEffectId: 28 }; //Cold Slower
SkillEffect[SK.NC_ARMSCANNON] = { effectId: 'ef_nc_armscannon' }; //Arm Cannon
SkillEffect[SK.NC_ACCELERATION] = { effectId: 37 }; //Acceleration
SkillEffect[SK.NC_HOVERING] = { effectId: 141 }; //Hovering
SkillEffect[SK.NC_F_SIDESLIDE] = { effectId: 136 }; //Front-Side Slide
SkillEffect[SK.NC_B_SIDESLIDE] = { effectId: 136 }; //Back-Side Slide
SkillEffect[SK.NC_SELFDESTRUCTION] = { effectId: 183 }; //Self Destruction
SkillEffect[SK.NC_SHAPESHIFT] = { effectId: 311 }; //Shape Shift
SkillEffect[SK.NC_EMERGENCYCOOL] = { effectId: 27 }; //Emergency Cool
SkillEffect[SK.NC_INFRAREDSCAN] = { effectId: 794 }; //Infrared Scan
SkillEffect[SK.NC_ANALYZE] = { effectId: 786 }; //Analyze
SkillEffect[SK.NC_MAGNETICFIELD] = { effectId: 781 }; //Magnetic Field
SkillEffect[SK.NC_NEUTRALBARRIER] = { groundEffectId: 783 }; //Neutral Barrier
SkillEffect[SK.NC_STEALTHFIELD] = { groundEffectId: 784 }; //Stealth Field
SkillEffect[SK.NC_REPAIR] = { effectId: 785 }; //Repair
SkillEffect[SK.NC_AXEBOOMERANG] = { effectId: 'ef_nc_axeboomerang' }; //Axe Boomerang
SkillEffect[SK.NC_POWERSWING] = { effectId: 'ef_nc_powerswing' }; //Power Swing
SkillEffect[SK.NC_AXETORNADO] = { effectId: 'ef_nc_axetornado', hitEffectId: 1 }; //Axe Tornado
SkillEffect[SK.NC_SILVERSNIPER] = { effectId: 311 }; //FAW - Silver Sniper
SkillEffect[SK.NC_MAGICDECOY] = { effectId: 311 }; //FAW - Magic Decoy
SkillEffect[SK.NC_DISJOINT] = { effectId: 183 }; //FAW Removal
// SC Shadow Chaser
SkillEffect[SK.SC_FATALMENACE] = { effectId: 'ef_sc_fatalmenace', hitEffectId: 1 }; //Fatal Menace
SkillEffect[SK.SC_REPRODUCE] = { effectId: 'ef_sc_reproduce' }; //Reproduce
SkillEffect[SK.SC_AUTOSHADOWSPELL] = { effectId: 'ef_sc_autoshadowspell' }; //Auto Shadow Spell
SkillEffect[SK.SC_SHADOWFORM] = { effectId: 136 }; //Shadow Form
SkillEffect[SK.SC_TRIANGLESHOT] = { effectId: 'ef_sc_triangleshot', beforeHitEffectId: 'ef_arrow_projectile' }; //Triangle Shot
SkillEffect[SK.SC_BODYPAINT] = { effectId: 811 }; //Body Painting
SkillEffect[SK.SC_INVISIBILITY] = { effectId: 136 }; //Invisibility
SkillEffect[SK.SC_DEADLYINFECT] = { effectId: 125 }; //Deadly Infect
SkillEffect[SK.SC_ENERVATION] = { effectId: 813 }; //Masquerade - Enervation
SkillEffect[SK.SC_GROOMY] = { effectId: 814 }; //Masquerade - Gloomy
SkillEffect[SK.SC_IGNORANCE] = { effectId: 815 }; //Masquerade - Ignorance
SkillEffect[SK.SC_LAZINESS] = { effectId: 816 }; //Masquerade - Laziness
SkillEffect[SK.SC_UNLUCKY] = { effectId: 817 }; //Masquerade - Unlucky
SkillEffect[SK.SC_WEAKNESS] = { effectId: 818 }; //Masquerade - Weakness
SkillEffect[SK.SC_STRIPACCESSARY] = { effectId: 820 }; //Strip Accessory
SkillEffect[SK.SC_MANHOLE] = { groundEffectId: 822, successEffectId: 823 }; //Man Hole
SkillEffect[SK.SC_DIMENSIONDOOR] = { groundEffectId: 825 }; //Dimension Door
SkillEffect[SK.SC_CHAOSPANIC] = { groundEffectId: 827 }; //Chaos Panic
SkillEffect[SK.SC_MAELSTROM] = { groundEffectId: 828 }; //Maelstrom
SkillEffect[SK.SC_BLOODYLUST] = { groundEffectId: 829 }; //Bloody Lust
SkillEffect[SK.SC_FEINTBOMB] = { effectId: 'ef_sc_feintbomb' }; //Feint Bomb
// LG Royal Guard
SkillEffect[SK.LG_CANNONSPEAR] = { effectId: 'ef_lg_cannonspear', hitEffectId: 1 }; //Cannon Spear
SkillEffect[SK.LG_BANISHINGPOINT] = { effectId: 'ef_lg_banishingpoint', hitEffectId: 1 }; //Banishing Point
SkillEffect[SK.LG_TRAMPLE] = { effectId: 'ef_trample' }; //Trample
SkillEffect[SK.LG_SHIELDPRESS] = { beforeHitEffectId: 906 }; //Shield Press
SkillEffect[SK.LG_REFLECTDAMAGE] = { effectId: 'ef_reflectdamage' }; //Reflect Damage
SkillEffect[SK.LG_PINPOINTATTACK] = { effectId: 'ef_pinpointattack' }; //Pinpoint Attack
SkillEffect[SK.LG_FORCEOFVANGUARD] = { effectId: 11 }; //Force of Vanguard
SkillEffect[SK.LG_RAGEBURST] = { effectId: 'ef_rageburst' }; //Rage Burst
SkillEffect[SK.LG_SHIELDSPELL] = { effectId: 'ef_shieldspell' }; //Shield Spell
SkillEffect[SK.LG_EXEEDBREAK] = { effectId: 'ef_exceedbreak' }; //Exceed Break
SkillEffect[SK.LG_OVERBRAND] = { effectId: 'ef_lg_overbrand', hitEffectId: 1 }; //Over Brand
SkillEffect[SK.LG_PRESTIGE] = { effectId: 908 }; //Prestige
SkillEffect[SK.LG_BANDING] = { effectId: 909 }; //Banding //CHECK Splash isnt needed right? Banding has its own UNIT ID.
SkillEffect[SK.LG_MOONSLASHER] = { effectId: 'ef_moonslasher' }; //Moon Slasher
SkillEffect[SK.LG_RAYOFGENESIS] = { effectId: 'ef_lg_rayofgenesis' }; //Ray of Genesis
SkillEffect[SK.LG_PIETY] = { effectId: 'ef_piety' }; //Piety
SkillEffect[SK.LG_EARTHDRIVE] = { effectId: 'ef_lg_earthdrive' }; //Earth Drive
SkillEffect[SK.LG_HESPERUSLIT] = { effectId: 'ef_hesperuslit' }; //Hesperus Lit
SkillEffect[SK.LG_INSPIRATION] = { effectId: 910 }; //Inspiration
SkillEffect[SK.LG_OVERBRAND_BRANDISH] = { effectId: 'ef_lg_overbrand', hitEffectId: 1 }; //Overbrand Brandish
SkillEffect[SK.LG_OVERBRAND_PLUSATK] = { hitEffectId: 1 }; //Overbrand Plus Attack
// SR Sura
SkillEffect[SK.SR_DRAGONCOMBO] = { effectId: 'ef_dragoncombo' }; //Dragon Combo
SkillEffect[SK.SR_SKYNETBLOW] = { effectId: 'ef_skynetblow' }; //Sky Net Blow
SkillEffect[SK.SR_EARTHSHAKER] = { effectId: 888 }; //Earth Shaker
SkillEffect[SK.SR_FALLENEMPIRE] = { effectId: 'ef_sr_fallenempire', hitEffectId: 1 }; //Fallen Empire
SkillEffect[SK.SR_TIGERCANNON] = { effectId: 'ef_sr_tigercannon' }; //Tiger Cannon
SkillEffect[SK.SR_RAMPAGEBLASTER] = { effectId: 'ef_sr_rampageblaster' }; //Rampage Blaster
SkillEffect[SK.SR_CRESCENTELBOW] = { effectId: 'ef_crescentelbow' }; //Crescent Elbow
SkillEffect[SK.SR_CURSEDCIRCLE] = { effectId: 'ef_cursedcircle' }; //Cursed Circle
SkillEffect[SK.SR_LIGHTNINGWALK] = { effectId: 'ef_lightningwalk' }; //Lightning Walk
SkillEffect[SK.SR_KNUCKLEARROW] = { effectId: 'ef_knucklearrow' }; //Knuckle Arrow
SkillEffect[SK.SR_WINDMILL] = { effectId: 'ef_windmill' }; //Windmill
SkillEffect[SK.SR_RAISINGDRAGON] = { effectId: 'ef_raisingdragon' }; //Raising Dragon
SkillEffect[SK.SR_ASSIMILATEPOWER] = { effectId: 7 }; //Assimilate Power
SkillEffect[SK.SR_POWERVELOCITY] = { effectId: 'ef_powervelocity' }; //Power Velocity
SkillEffect[SK.SR_CRESCENTELBOW_AUTOSPELL] = { hitEffectId: 1 }; //Crescent Elbow Autospell
SkillEffect[SK.SR_GATEOFHELL] = { effectId: 'ef_sr_gateofhell' }; //Gate of Hell
SkillEffect[SK.SR_GENTLETOUCH_QUIET] = { effectId: 66 }; //Gentle Touch - Quiet
SkillEffect[SK.SR_GENTLETOUCH_CURE] = { effectId: 312 }; //Gentle Touch - Cure
SkillEffect[SK.SR_GENTLETOUCH_ENERGYGAIN] = { effectId: 7 }; //Gentle Touch - Energy Gain
SkillEffect[SK.SR_GENTLETOUCH_CHANGE] = { effectId: 311 }; //Gentle Touch - Change
SkillEffect[SK.SR_GENTLETOUCH_REVITALIZE] = { effectId: 7 }; //Gentle Touch - Revitalize
//More from Sura but not following ID order
SkillEffect[SK.SR_HOWLINGOFLION] = { effectId: 'ef_howlingoflion' }; //Howling of Lion
SkillEffect[SK.SR_RIDEINLIGHTNING] = { effectId: 'ef_rideinlightning' }; //Ride In Lightening
// WA Wanderer
SkillEffect[SK.WA_SWING_DANCE] = { effectId: 'ef_swing_dance' }; //Swing Dance
SkillEffect[SK.WA_SYMPHONY_OF_LOVER] = { effectId: 'ef_symphony_of_lovers' }; //Symphony of Lovers
SkillEffect[SK.WA_MOONLIT_SERENADE] = { effectId: 'ef_moonlit_serenade' }; //Moonlit Serenade
// MI Minstrel
SkillEffect[SK.MI_RUSH_WINDMILL] = { effectId: 'ef_rush_windmill' }; //Windmill Rush Attack
SkillEffect[SK.MI_ECHOSONG] = { effectId: 'ef_echo_song' }; //Echo Song
SkillEffect[SK.MI_HARMONIZE] = { effectId: 'ef_harmonize' }; //Harmonize
// WM Wanderer/Minstrel
SkillEffect[SK.WM_METALICSOUND] = { effectId: 'ef_wm_metalicsound' }; //Metallic Sound
SkillEffect[SK.WM_REVERBERATION] = { groundEffectId: 856, effectId: 'ef_wm_reverberation' }; //Reverberation
SkillEffect[SK.WM_REVERBERATION_MELEE] = { effectId: 860 }; //Reverberation Melee
SkillEffect[SK.WM_REVERBERATION_MAGIC] = { hitEffectId: 152 }; //Reverberation Magic
SkillEffect[SK.WM_DOMINION_IMPULSE] = { effectId: 863 }; //Dominion Impulse
SkillEffect[SK.WM_SEVERE_RAINSTORM] = { effectId: 'ef_wm_severerainstorm' }; //Severe Rainstorm
SkillEffect[SK.WM_POEMOFNETHERWORLD] = { groundEffectId: 860 }; //Poem of The Netherworld
SkillEffect[SK.WM_VOICEOFSIREN] = { groundEffectId: 879 }; //Voice of Siren
SkillEffect[SK.WM_DEADHILLHERE] = { effectId: 'ef_valley_of_death' }; //Valley of Death
SkillEffect[SK.WM_LULLABY_DEEPSLEEP] = { effectId: 858 }; //Deep Sleep Lullaby
SkillEffect[SK.WM_SIRCLEOFNATURE] = { effectId: 861 }; //Circle of Nature's Sound
SkillEffect[SK.WM_RANDOMIZESPELL] = { effectId: 862 }; //Improvised Song
SkillEffect[SK.WM_GLOOMYDAY] = { effectId: 847 /*848*/ }; //Gloomy Day
SkillEffect[SK.WM_GREAT_ECHO] = { effectId: 'ef_great_echo' }; //Great Echo
SkillEffect[SK.WM_SONG_OF_MANA] = { groundEffectId: 868, effectIdOnCaster: 865 }; //Song of Mana
SkillEffect[SK.WM_DANCE_WITH_WUG] = { groundEffectId: 866, effectIdOnCaster: 867 }; //Dance With A Warg
SkillEffect[SK.WM_SOUND_OF_DESTRUCTION] = { effectId: 'ef_wm_soundofdestruction' }; //Sound of Destruction
SkillEffect[SK.WM_SATURDAY_NIGHT_FEVER] = { groundEffectId: 870, effectIdOnCaster: 871 }; //Saturday Night Fever
SkillEffect[SK.WM_LERADS_DEW] = { groundEffectId: 872, effectIdOnCaster: 871 }; //Lerad's Dew
SkillEffect[SK.WM_MELODYOFSINK] = { groundEffectId: 874, effectIdOnCaster: 873 }; //Melody of Sink
SkillEffect[SK.WM_BEYOND_OF_WARCRY] = { groundEffectId: 876, effectIdOnCaster: 875 }; //Warcry of Beyond
SkillEffect[SK.WM_UNLIMITED_HUMMING_VOICE] = { groundEffectId: 878, effectIdOnCaster: 877 }; //Unlimited Humming Voice
SkillEffect[SK.WM_SEVERE_RAINSTORM_MELEE] = { hitEffectId: 1 }; //Severe Rainstorm Melee
// SO Sorcerer
SkillEffect[SK.SO_FIREWALK] = { groundEffectId: 920 }; //Fire Walk //CHECK Video and data shows each cell only hits once.
SkillEffect[SK.SO_ELECTRICWALK] = { groundEffectId: 926 }; //Electric Walk
SkillEffect[SK.SO_SPELLFIST] = { effectId: 'ef_so_spellfist' }; //Spell Fist
SkillEffect[SK.SO_EARTHGRAVE] = { effectId: 'ef_so_earthgrave' }; //Earth Grave
SkillEffect[SK.SO_DIAMONDDUST] = { effectId: 'ef_so_diamonddust' }; //Diamond Dust
SkillEffect[SK.SO_POISON_BUSTER] = { effectId: 923 }; //Poison Buster
SkillEffect[SK.SO_PSYCHIC_WAVE] = { effectId: 'ef_so_psychicwave' }; //Psychic Wave
SkillEffect[SK.SO_CLOUD_KILL] = { groundEffectId: 924 }; //Cloud Kill
SkillEffect[SK.SO_STRIKING] = { effectId: 311 }; //Striking
SkillEffect[SK.SO_WARMER] = { effectId: 929 }; //Warmer
SkillEffect[SK.SO_VACUUM_EXTREME] = { effectId: 921 }; //Vacuum Extreme
SkillEffect[SK.SO_VARETYR_SPEAR] = { effectId: 'ef_so_varetyr_spear' }; //Varetyr Spear
SkillEffect[SK.SO_ARRULLO] = { effectId: 70 }; //Arrullo
SkillEffect[SK.SO_EL_CONTROL] = { effectId: 311 }; //Spirit Control
SkillEffect[SK.SO_SUMMON_AGNI] = { effectId: 49 }; //Summon Fire Spirit Agni
SkillEffect[SK.SO_SUMMON_AQUA] = { effectId: 51 }; //Summon Water Spirit Aqua
SkillEffect[SK.SO_SUMMON_VENTUS] = { effectId: 52 }; //Summon Wind Spirit Ventus
SkillEffect[SK.SO_SUMMON_TERA] = { effectId: 54 }; //Summon Earth Spirit Tera
SkillEffect[SK.SO_EL_ACTION] = { effectId: 311 }; //Elemental Action
SkillEffect[SK.SO_EL_ANALYSIS] = { effectId: 153 }; //Four Spirit Analysis
SkillEffect[SK.SO_EL_CURE] = { effectId: 312 }; //Spirit Recovery
SkillEffect[SK.SO_FIRE_INSIGNIA] = { effectId: 918 }; //Fire Insignia
SkillEffect[SK.SO_WATER_INSIGNIA] = { effectId: 51 }; //Water Insignia
SkillEffect[SK.SO_WIND_INSIGNIA] = { effectId: 52 }; //Wind Insignia
SkillEffect[SK.SO_EARTH_INSIGNIA] = { effectId: 54 }; //Earth Insignia
// GN Genetic
SkillEffect[SK.GN_CART_TORNADO] = { effectId: 'ef_gn_cart_tornado', hitEffectId: 1 }; //Cart Tornado
SkillEffect[SK.GN_CARTCANNON] = { effectId: 'ef_gn_cartcannon' }; //Cart Cannon
SkillEffect[SK.GN_CARTBOOST] = { effectId: 'ef_gn_cartboost' }; //Cart Boost
SkillEffect[SK.GN_THORNS_TRAP] = { effectId: 'ef_thorntrap' }; //Thorn Trap
SkillEffect[SK.GN_BLOOD_SUCKER] = { effectId: 216 }; //Blood Sucker //CHECK Data says its a magic attack. Hmmmm....
SkillEffect[SK.GN_SPORE_EXPLOSION] = { effectId: 183 }; //Spore Explosion //CHECK Data says its element is set to neutral. Need to confirm.
SkillEffect[SK.GN_WALLOFTHORN] = { groundEffectId: 912, effectId: 'ef_gn_wallofthorn' }; //Wall of Thorns
SkillEffect[SK.GN_CRAZYWEED] = { effectId: 915 }; //Crazy Weed
SkillEffect[SK.GN_CRAZYWEED_ATK] = { effectId: 915 }; //Crazy Weed Attack
SkillEffect[SK.GN_DEMONIC_FIRE] = { effectId: 916 }; //Demonic Fire
SkillEffect[SK.GN_FIRE_EXPANSION] = { effectId: 917 }; //Fire Expansion
SkillEffect[SK.GN_FIRE_EXPANSION_SMOKE_POWDER] = { effectId: 918 }; //Fire Expansion Smoke Powder
SkillEffect[SK.GN_FIRE_EXPANSION_TEAR_GAS] = { effectId: 17 }; //Fire Expansion Tear Gas
SkillEffect[SK.GN_FIRE_EXPANSION_ACID] = { effectId: 183 }; //Fire Expansion Acid
SkillEffect[SK.GN_HELLS_PLANT] = { effectId: 919 }; //Hell's Plant
SkillEffect[SK.GN_HELLS_PLANT_ATK] = { effectId: 919 }; //Hell's Plant Attack
SkillEffect[SK.GN_MANDRAGORA] = { effectId: 'ef_gn_mandragora' }; //Howling of Mandragora
SkillEffect[SK.GN_SLINGITEM] = { effectId: 10 }; //Sling Item
SkillEffect[SK.GN_CHANGEMATERIAL] = { effectId: 311 }; //Change Material
SkillEffect[SK.GN_MIX_COOKING] = { effectId: 311 }; //Mix Cooking
SkillEffect[SK.GN_MAKEBOMB] = { effectId: 183 }; //Create Bomb
SkillEffect[SK.GN_S_PHARMACY] = { effectId: 311 }; //Special Pharmacy
SkillEffect[SK.GN_SLINGITEM_RANGEMELEEATK] = { hitEffectId: 1 }; //Sling Item Attack
// Episode 13.3
SkillEffect[SK.ALL_ODINS_RECALL] = {}; //Odin's Recall
SkillEffect[SK.RETURN_TO_ELDICASTES] = {}; //Return To Eldicastes
SkillEffect[SK.ALL_BUYING_STORE] = {}; //Open Buying Store
SkillEffect[SK.ALL_GUARDIAN_RECALL] = {}; //Guardian's Recall
SkillEffect[SK.ALL_ODINS_POWER] = {}; //Odin's Power
SkillEffect[SK.MC_CARTDECORATE] = {}; //Decorate Cart
// Rebellion
SkillEffect[SK.RL_RICHS_COIN] = { effectId: 10 }; //Rich's Coin
SkillEffect[SK.RL_MASS_SPIRAL] = { effectId: 1063, hitEffectId: 1 }; //Mass Spiral
SkillEffect[SK.RL_BANISHING_BUSTER] = { effectId: 1066 }; //Banishing Buster
SkillEffect[SK.RL_B_TRAP] = { groundEffectId: 1069 }; //Bind Trap
SkillEffect[SK.RL_FLICKER] = { effectId: 1060 }; //Flicker
SkillEffect[SK.RL_S_STORM] = { effectId: 'ef_s_storm' }; //Shatter Storm
SkillEffect[SK.RL_E_CHAIN] = { effectId: 734 }; //Eternal Chain
SkillEffect[SK.RL_QD_SHOT] = { effectId: 1076, hitEffectId: 1 }; //Quick Draw Shot
SkillEffect[SK.RL_C_MARKER] = { successEffectId: 'ef_c_marker1' }; //Crimson Marker
SkillEffect[SK.RL_FIREDANCE] = { effectIdOnCaster: 17, hitEffectId: 49 }; //Fire Dance
SkillEffect[SK.RL_H_MINE] = { effectId: 183 }; //Howling Mine
SkillEffect[SK.RL_P_ALTER] = { effectId: 1077 }; //Platinum Alter
SkillEffect[SK.RL_FALLEN_ANGEL] = { effectId: 136 }; //Fallen Angel
SkillEffect[SK.RL_R_TRIP] = { effectId: 1078 }; //Round Trip
SkillEffect[SK.RL_D_TAIL] = { effectId: 1068 }; //Dragon Tail
SkillEffect[SK.RL_FIRE_RAIN] = { effectId: 1064 }; //Fire Rain
SkillEffect[SK.RL_HEAT_BARREL] = { effectId: 17 }; //Heat Barrel
SkillEffect[SK.RL_AM_BLAST] = { effectId: 183 }; //Anti-Material Blast
SkillEffect[SK.RL_SLUGSHOT] = { effectId: 1067 }; //Slug Shot
SkillEffect[SK.RL_HAMMER_OF_GOD] = { effectId: 1062 }; //Hammer of God
SkillEffect[SK.RL_R_TRIP_PLUSATK] = { hitEffectId: 1 }; //Round Trip Plus Attack
// Kagerou & Oboro
SkillEffect[SK.KO_YAMIKUMO] = { effectId: 136 }; //Shadow Hiding
SkillEffect[SK.KO_JYUMONJIKIRI] = { effectId: 996, hitEffectId: 1 }; //Cross Slash
SkillEffect[SK.KO_SETSUDAN] = { effectId: 997, hitEffectId: 1 }; //Soul Cutter
SkillEffect[SK.KO_BAKURETSU] = { effectId: 983, hitEffectId: 990 }; //Kunai Explosion
SkillEffect[SK.KO_HAPPOKUNAI] = { effectId: 981 }; //Kunai Splash
SkillEffect[SK.KO_MUCHANAGE] = { effectId: 982, hitEffectId: 1 }; //Rapid Throw
SkillEffect[SK.KO_HUUMARANKA] = { effectId: 1002 }; //Swirling Petal
SkillEffect[SK.KO_MAKIBISHI] = { effectId: 1007 }; //Makibishi
SkillEffect[SK.KO_MEIKYOUSISUI] = { beginCastEffectId: 54 }; //Pure Soul
SkillEffect[SK.KO_ZANZOU] = { effectId: 617 }; //Illusion - Shadow
SkillEffect[SK.KO_KYOUGAKU] = { effectId: 23 }; //Illusion - Shock
SkillEffect[SK.KO_JYUSATSU] = { effectId: 183 }; //Illusion - Death
SkillEffect[SK.KO_KAHU_ENTEN] = { effectId: 994 }; //Fire Charm
SkillEffect[SK.KO_HYOUHU_HUBUKI] = { effectId: 992 }; //Ice Charm
SkillEffect[SK.KO_KAZEHU_SEIRAN] = { effectId: 995 }; //Wind Charm
SkillEffect[SK.KO_DOHU_KOUKAI] = { effectId: 993 }; //Earth Charm
SkillEffect[SK.KO_KAIHOU] = { effectId: 989 }; //Release Ninja Spell
SkillEffect[SK.KO_ZENKAI] = { effectId: 994 }; //Cast Ninja Spell
SkillEffect[SK.KO_GENWAKU] = { effectId: 1005 }; //Illusion - Bewitch
SkillEffect[SK.KO_IZAYOI] = { effectId: 999 }; //16th Night
SkillEffect[SK.KG_KAGEHUMI] = {}; //Shadow Trampling
SkillEffect[SK.KG_KYOMU] = {}; //Empty Shadow
SkillEffect[SK.KG_KAGEMUSYA] = {}; //Shadow Warrior
SkillEffect[SK.OB_ZANGETSU] = {}; //Distorted Crescent
SkillEffect[SK.OB_OBOROGENSOU] = {}; //Moonlight Fantasy
SkillEffect[SK.OB_OBOROGENSOU_TRANSITION_ATK] = {}; //Moonlight Fantasy Transition Attack
SkillEffect[SK.OB_AKAITSUKI] = {}; //Ominous Moonlight
// Eclage Skills
SkillEffect[SK.ECL_SNOWFLIP] = {}; //Snow Flip
SkillEffect[SK.ECL_PEONYMAMY] = {}; //Peony Mamy
SkillEffect[SK.ECL_SADAGUI] = {}; //Sadagui
SkillEffect[SK.ECL_SEQUOIADUST] = {}; //Sequoia Dust
SkillEffect[SK.ECLAGE_RECALL] = {}; //Return To Eclage
// Copied Bard / Dancer Skills
// EP 14.3 Part 2 3rd Job Skills
SkillEffect[SK.GC_DARKCROW] = { effectId: 1040 }; //Dark Claw
SkillEffect[SK.RA_UNLIMIT] = { effectId: 'ef_ra_unlimit' }; //Unlimited
SkillEffect[SK.GN_ILLUSIONDOPING] = { effectId: 1049 }; //Illusion Doping
SkillEffect[SK.RK_DRAGONBREATH_WATER] = { effectId: 'ef_rk_dragonbreath_water', hitEffectId: 'ef_dragonbreath_water' }; //Dragon Breath - Water
SkillEffect[SK.RK_LUXANIMA] = { effectId: 1044 }; //Lux Anima
SkillEffect[SK.NC_MAGMA_ERUPTION] = { effectId: 1050 }; //Magma Eruption
SkillEffect[SK.WM_FRIGG_SONG] = { effectId: 'ef_frigg_song' }; //Frigg's Song
SkillEffect[SK.SO_ELEMENTAL_SHIELD] = { effectId: 1046 }; //Elemental Shield
SkillEffect[SK.SR_FLASHCOMBO] = { effectId: 1043 }; //Flash Combo
SkillEffect[SK.SC_ESCAPE] = { effectId: 136 }; //Emergency Escape
SkillEffect[SK.AB_OFFERTORIUM] = { effectId: 1047 }; //Offertorium
SkillEffect[SK.WL_TELEKINESIS_INTENSE] = { effectId: 1048 }; //Intense Telekinesis
SkillEffect[SK.LG_KINGS_GRACE] = { effectId: 'ef_kings_grace' }; //King's Grace
SkillEffect[SK.ALL_FULL_THROTTLE] = { effectId: 1042 }; //Full Throttle
// Summoner
SkillEffect[SK.SU_BITE] = { hitEffectId: 1 }; //Bite
SkillEffect[SK.SU_HIDE] = { effectId: 136 }; //Hide
SkillEffect[SK.SU_SCRATCH] = { hitEffectId: 1 }; //Scratch
SkillEffect[SK.SU_STOOP] = { effectId: 11 }; //Stoop
SkillEffect[SK.SU_LOPE] = { effectId: 411 }; //Lope
SkillEffect[SK.SU_SV_STEMSPEAR] = { beforeHitEffectId: 15, hitEffectId: 1 }; //Silvervine Stem Spear
SkillEffect[SK.SU_CN_POWDERING] = { effectId: 699 }; //Catnip Powdering
SkillEffect[SK.SU_CN_METEOR] = { effectId: 92 }; //Catnip Meteor
SkillEffect[SK.SU_SV_ROOTTWIST] = { groundEffectId: 927 }; //Silvervine Root Twist
SkillEffect[SK.SU_SV_ROOTTWIST_ATK] = { hitEffectId: 1 }; //Silver Vine Root Twist Attack
SkillEffect[SK.SU_SCAROFTAROU] = { hitEffectId: 1 }; //Scar of Tarou
SkillEffect[SK.SU_PICKYPECK] = { beforeHitEffectId: 'ef_arrow_projectile', hitEffectId: 1 }; //Picky Peck
SkillEffect[SK.SU_PICKYPECK_DOUBLE_ATK] = { hitEffectId: 1 }; //Picky Peck Double Attack
SkillEffect[SK.SU_ARCLOUSEDASH] = { effectId: 37 }; //Arclouse Dash
SkillEffect[SK.SU_LUNATICCARROTBEAT] = { hitEffectId: 1 }; //Lunatic Carrot Beat
SkillEffect[SK.SU_TUNABELLY] = { effectId: 312 }; //Tuna Belly
SkillEffect[SK.SU_TUNAPARTY] = { effectId: 312 }; //Tuna Party
SkillEffect[SK.SU_BUNCHOFSHRIMP] = { effectId: 7 }; //Bunch of Shrimp
SkillEffect[SK.SU_FRESHSHRIMP] = { effectId: 312 }; //Fresh Shrimp
// Unknown Unconfirmed Summoner Skills - Animations Show On These
SkillEffect[SK.SU_POWEROFFLOCK] = { effectId: 731 }; //Power of Flock
SkillEffect[SK.SU_SVG_SPIRIT] = { hitEffectId: 1 }; //Spirit of Savage
SkillEffect[SK.SU_HISS] = { effectId: 67 }; //Hiss
SkillEffect[SK.SU_NYANGGRASS] = { groundEffectId: 853 }; //Nyang Grass
SkillEffect[SK.SU_GROOMING] = { effectId: 66 }; //Grooming
SkillEffect[SK.SU_PURRING] = { effectId: 312 }; //Purring
SkillEffect[SK.SU_SHRIMPARTY] = { effectId: 312 }; //Tasty Shrimp Party
SkillEffect[SK.SU_MEOWMEOW] = { effectId: 37 }; //Meow Meow
SkillEffect[SK.SU_CHATTERING] = { effectId: 153 }; //Chattering
// Wedding Skills 3
SkillEffect[SK.WE_CALLALLFAMILY] = {}; //Call All Family
SkillEffect[SK.WE_ONEFOREVER] = {}; //One Forever
SkillEffect[SK.WE_CHEERUP] = {}; //Cheer Up
// Homunculus S
SkillEffect[SK.HLIF_HEAL] = SkillEffect[SK.AL_HEAL]; //Healing Touch
SkillEffect[SK.HLIF_AVOID] = SkillEffect[SK.AL_INCAGI]; //Avoid
SkillEffect[SK.HLIF_CHANGE] = { effectId: 505 }; //Change
SkillEffect[SK.HAMI_CASTLE] = { effectId: 570 }; //Castling
SkillEffect[SK.HAMI_DEFENCE] = { effectId: 569 }; //Defense
SkillEffect[SK.HAMI_BLOODLUST] = { effectId: 571 }; //Bloodlust
SkillEffect[SK.HFLI_MOON] = { effectId: [565, 566, 567], hitEffectId: 1 }; //Moonlight
SkillEffect[SK.HFLI_FLEET] = { effectId: 37 }; //Fleeting Move
SkillEffect[SK.HFLI_SPEED] = { effectId: 37 }; //Speed
SkillEffect[SK.HFLI_SBR44] = { effectId: 183 }; //S.B.R.44
SkillEffect[SK.HVAN_CAPRICE] = { effectId: [29, 24, 27, 92], hitEffectId: 1 }; //Caprice
SkillEffect[SK.HVAN_CHAOTIC] = { effectId: 312 }; //Benediction of Chaos
SkillEffect[SK.HVAN_EXPLOSION] = { effectId: 183 }; //Bio Explosion
SkillEffect[SK.MH_SUMMON_LEGION] = { effectId: 140 }; //Summon Legion
SkillEffect[SK.MH_NEEDLE_OF_PARALYZE] = { effectId: 'ef_mh_needle', hitEffectId: 1 }; //Needle of Paralyze
SkillEffect[SK.MH_POISON_MIST] = { effectId: 959, groundEffectId: 959 }; //Poison Mist
SkillEffect[SK.MH_PAIN_KILLER] = { effectId: 66 }; //Pain Killer
SkillEffect[SK.MH_LIGHT_OF_REGENE] = { effectId: 7 }; //Light of Regene
SkillEffect[SK.MH_OVERED_BOOST] = { effectId: 37 }; //Overed Boost
SkillEffect[SK.MH_ERASER_CUTTER] = { effectId: 960, hitEffectId: 1 }; //Eraser Cutter
SkillEffect[SK.MH_XENO_SLASHER] = { effectId: 1082, hitEffectId: 1 }; //Xeno Slasher
SkillEffect[SK.MH_SILENT_BREEZE] = { effectId: 961 }; //Silent Breeze
SkillEffect[SK.MH_STYLE_CHANGE] = { effectId: 311 }; //Style Change
SkillEffect[SK.MH_SONIC_CRAW] = { effectId: 965, hitEffectId: 1 }; //Sonic Claw
SkillEffect[SK.MH_SILVERVEIN_RUSH] = { effectId: 965, hitEffectId: 1 }; //Silver Bain Rush
SkillEffect[SK.MH_MIDNIGHT_FRENZY] = { effectId: 967, hitEffectId: 1 }; //Midnight Frenzy
SkillEffect[SK.MH_STAHL_HORN] = { effectId: 'ef_mh_stahlhorn', hitEffectId: 1 }; //Steel Horn
SkillEffect[SK.MH_GOLDENE_FERSE] = { effectId: 'ef_mh_goldene' }; //Golden Heel
SkillEffect[SK.MH_STEINWAND] = { groundEffectId: 56, effectId: 11 }; //Stone Wall
SkillEffect[SK.MH_HEILIGE_STANGE] = { effectId: 226, hitEffectId: 152 }; //Holy Pole
SkillEffect[SK.MH_ANGRIFFS_MODUS] = { effectId: [368, 'quake'] }; //Attack Mode
SkillEffect[SK.MH_TINDER_BREAKER] = { effectId: 966, hitEffectId: 1 }; //Tinder Breaker
SkillEffect[SK.MH_CBC] = { effectId: 966, hitEffectId: 1 }; //Continual Break Combo
SkillEffect[SK.MH_EQC] = { effectId: 967, hitEffectId: 1 }; //Eternal Quick Combo
SkillEffect[SK.MH_MAGMA_FLOW] = { effectId: 962 }; //Magma Flow
SkillEffect[SK.MH_GRANITIC_ARMOR] = { effectId: 56 }; //Granitic Armor
SkillEffect[SK.MH_LAVA_SLIDE] = { effectId: 964, groundEffectId: 964 }; //Lava Slide
SkillEffect[SK.MH_PYROCLASTIC] = { effectId: 17, hitEffectId: 49 }; //Pyroclastic
SkillEffect[SK.MH_VOLCANIC_ASH] = { effectId: 975 }; //Volcanic Ash
// Mercenary Skill Place holders
SkillEffect[SK.MS_BASH] = SkillEffect[SK.SM_BASH]; //Bash
SkillEffect[SK.MS_MAGNUM] = SkillEffect[SK.SM_MAGNUM]; //Magnum_Break
SkillEffect[SK.MS_BOWLINGBASH] = SkillEffect[SK.KN_BOWLINGBASH]; //Bowling_Bash
SkillEffect[SK.MS_PARRYING] = SkillEffect[SK.LK_PARRYING]; //Parry
SkillEffect[SK.MS_REFLECTSHIELD] = SkillEffect[SK.CR_REFLECTSHIELD]; //Shield_Reflect
SkillEffect[SK.MS_BERSERK] = SkillEffect[SK.LK_BERSERK]; //Frenzy
SkillEffect[SK.MA_DOUBLE] = SkillEffect[SK.AC_DOUBLE]; //Double_Strafe
SkillEffect[SK.MA_SHOWER] = SkillEffect[SK.AC_SHOWER]; //Arrow_Shower
SkillEffect[SK.MA_SKIDTRAP] = SkillEffect[SK.HT_SKIDTRAP]; //Skid_Trap
SkillEffect[SK.MA_LANDMINE] = SkillEffect[SK.HT_LANDMINE]; //Land_Mine
SkillEffect[SK.MA_SANDMAN] = SkillEffect[SK.HT_SANDMAN]; //Sandman
SkillEffect[SK.MA_FREEZINGTRAP] = SkillEffect[SK.HT_FREEZINGTRAP]; //Freezing_Trap
SkillEffect[SK.MA_REMOVETRAP] = SkillEffect[SK.HT_REMOVETRAP]; //Remove_Trap
SkillEffect[SK.MA_CHARGEARROW] = SkillEffect[SK.AC_CHARGEARROW]; //Arrow_Repel
SkillEffect[SK.MA_SHARPSHOOTING] = SkillEffect[SK.SN_SHARPSHOOTING]; //Focused_Arrow_Strike
SkillEffect[SK.ML_PIERCE] = SkillEffect[SK.KN_PIERCE]; //Pierce
SkillEffect[SK.ML_BRANDISH] = SkillEffect[SK.KN_BRANDISH]; //Brandish_Spear
SkillEffect[SK.ML_SPIRALPIERCE] = SkillEffect[SK.LK_SPIRALPIERCE]; //Spiral_Pierce
SkillEffect[SK.ML_DEFENDER] = SkillEffect[SK.CR_DEFENDER]; //Defending_Aura
SkillEffect[SK.ML_AUTOGUARD] = SkillEffect[SK.CR_AUTOGUARD]; //Guard
SkillEffect[SK.ML_DEVOTION] = SkillEffect[SK.CR_DEVOTION]; //Sacrifice
SkillEffect[SK.MER_MAGNIFICAT] = SkillEffect[SK.PR_MAGNIFICAT]; //Magnificat
SkillEffect[SK.MER_QUICKEN] = SkillEffect[SK.KN_TWOHANDQUICKEN]; //Two-Hand_Quicken
SkillEffect[SK.MER_SIGHT] = SkillEffect[SK.MG_SIGHT]; //Sight
SkillEffect[SK.MER_CRASH] = {}; //Crash
SkillEffect[SK.MER_REGAIN] = {}; //Regain
SkillEffect[SK.MER_TENDER] = {}; //Tender
SkillEffect[SK.MER_BENEDICTION] = {}; //Benediction
SkillEffect[SK.MER_RECUPERATE] = {}; //Recuperate
SkillEffect[SK.MER_MENTALCURE] = {}; //Mental_Cure
SkillEffect[SK.MER_COMPRESS] = {}; //Compress
SkillEffect[SK.MER_PROVOKE] = SkillEffect[SK.SM_PROVOKE]; //Provoke
SkillEffect[SK.MER_AUTOBERSERK] = SkillEffect[SK.SM_AUTOBERSERK]; //Berserk
SkillEffect[SK.MER_DECAGI] = SkillEffect[SK.AL_DECAGI]; //Decrease_AGI
SkillEffect[SK.MER_SCAPEGOAT] = {}; //Scapegoat
SkillEffect[SK.MER_LEXDIVINA] = SkillEffect[SK.PR_LEXDIVINA]; //Lex_Divina
SkillEffect[SK.MER_ESTIMATION] = SkillEffect[SK.WZ_ESTIMATION]; //Sense
SkillEffect[SK.MER_KYRIE] = SkillEffect[SK.PR_KYRIE]; //Kyrie Eleison
SkillEffect[SK.MER_BLESSING] = SkillEffect[SK.AL_BLESSING]; //Blessing
SkillEffect[SK.MER_INCAGI] = SkillEffect[SK.AL_INCAGI]; //Increase Agility
// Elemental Spirits Skills
SkillEffect[SK.EL_CIRCLE_OF_FIRE] = { effectId: 17 }; //Circle of Fire
SkillEffect[SK.EL_FIRE_CLOAK] = { effectId: 49 }; //Fire Cloak
SkillEffect[SK.EL_FIRE_MANTLE] = { effectId: 25 }; //Fire Mantle
SkillEffect[SK.EL_WATER_SCREEN] = { effectId: 51 }; //Water Screen
SkillEffect[SK.EL_WATER_DROP] = { effectId: 51 }; //Water Drop
SkillEffect[SK.EL_WATER_BARRIER] = { effectId: 56 }; //Water Barrier
SkillEffect[SK.EL_WIND_STEP] = { effectId: 37 }; //Wind Step
SkillEffect[SK.EL_WIND_CURTAIN] = { effectId: 52 }; //Wind Curtain
SkillEffect[SK.EL_ZEPHYR] = { effectId: 52 }; //Zephyr
SkillEffect[SK.EL_SOLID_SKIN] = { effectId: 56 }; //Solid Skin
SkillEffect[SK.EL_STONE_SHIELD] = { effectId: 56 }; //Stone Shield
SkillEffect[SK.EL_POWER_OF_GAIA] = { effectId: 1088 }; //Power of Gaia
SkillEffect[SK.EL_PYROTECHNIC] = { effectId: 956 }; //Pyrotechnic
SkillEffect[SK.EL_HEATER] = { effectId: 958 }; //Heater
SkillEffect[SK.EL_TROPIC] = { effectId: 955 }; //Tropic
SkillEffect[SK.EL_AQUAPLAY] = { effectId: 949 }; //Aqua Play
SkillEffect[SK.EL_COOLER] = { effectId: 954 }; //Cooler
SkillEffect[SK.EL_CHILLY_AIR] = { effectId: 952 }; //Cool Air
SkillEffect[SK.EL_GUST] = { effectId: 947 }; //Gust
SkillEffect[SK.EL_BLAST] = { effectId: 948 }; //Blast
SkillEffect[SK.EL_WILD_STORM] = { effectId: 951 }; //Wild Storm
SkillEffect[SK.EL_PETROLOGY] = { effectId: 957 }; //Petrology
SkillEffect[SK.EL_CURSED_SOIL] = { effectId: 953 }; //Cursed Soil
SkillEffect[SK.EL_UPHEAVAL] = { effectId: 950 }; //Upheaval
SkillEffect[SK.EL_FIRE_ARROW] = { beforeHitEffectId: 24, hitEffectId: 49 }; //Fire Arrow
SkillEffect[SK.EL_FIRE_BOMB] = { effectId: 183 }; //Fire Bomb
SkillEffect[SK.EL_FIRE_BOMB_ATK] = { hitEffectId: 49 }; //Fire Bomb Attack
SkillEffect[SK.EL_FIRE_WAVE] = { effectId: 17 }; //Fire Wave
SkillEffect[SK.EL_FIRE_WAVE_ATK] = { hitEffectId: 49 }; //Fire Wave Attack
SkillEffect[SK.EL_ICE_NEEDLE] = { hitEffectId: 51 }; //Ice Needle
SkillEffect[SK.EL_WATER_SCREW] = { effectId: 51 }; //Water Screw
SkillEffect[SK.EL_WATER_SCREW_ATK] = { hitEffectId: 51 }; //Water Screw Attack
SkillEffect[SK.EL_TIDAL_WEAPON] = { hitEffectId: 51 }; //Tidal Weapon
SkillEffect[SK.EL_WIND_SLASH] = { hitEffectId: 52 }; //Wind Slasher
SkillEffect[SK.EL_HURRICANE] = { effectId: 52 }; //Hurricane Rage
SkillEffect[SK.EL_HURRICANE_ATK] = { hitEffectId: 52 }; //Hurricane Rage Attack
SkillEffect[SK.EL_TYPOON_MIS] = { effectId: 29 }; //Typhoon Missile
SkillEffect[SK.EL_TYPOON_MIS_ATK] = { hitEffectId: 52 }; //Typhoon Missile Attack
SkillEffect[SK.EL_STONE_HAMMER] = { hitEffectId: 54 }; //Stone Hammer
SkillEffect[SK.EL_ROCK_CRUSHER] = { effectId: 54 }; //Rock Launcher
SkillEffect[SK.EL_ROCK_CRUSHER_ATK] = { hitEffectId: 54 }; //Rock Launcher Attack
SkillEffect[SK.EL_STONE_RAIN] = { effectId: 92 }; //Stone Rain
//Guild Skills
SkillEffect[SK.GD_BATTLEORDER] = {}; //Battle Orders
SkillEffect[SK.GD_REGENERATION] = {}; //Regeneration
SkillEffect[SK.GD_RESTORE] = {}; //Restoration
SkillEffect[SK.GD_EMERGENCYCALL] = {}; //Urgent Call
SkillEffect[SK.GD_ITEMEMERGENCYCALL] = {}; //Item Emergency Call

SkillEffect[SK.WM_HOWLING_OFLION] = { effectId: 'ef_wm_howlingoflion' };
SkillEffect[SK.MH_NEEDLE_STINGER] = { effectId: 'ef_mh_needle', hitEffectId: 1 };
SkillEffect[SK.MH_GOLDENE_TONE] = { effectId: 'ef_mh_goldene' };
SkillEffect[SK.MH_HEILIGE_PFERD] = { effectId: 'ef_mh_heilige_pferd' };
export default SkillEffect;
