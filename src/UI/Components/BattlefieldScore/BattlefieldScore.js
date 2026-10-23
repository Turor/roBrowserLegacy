/**
 * UI/Components/BattlefieldScore/BattlefieldScore.js
 *
 * Camp A / Camp B points on score battlegrounds (ZC_BATTLEFIELD_NOTIFY_POINT 0x2de).
 * Labels come from msgstringtable MSI_BATTLEFIELD_TEAM (1592, "Camp A: Camp B").
 */

import DB from 'DB/DBManager.js';
import UIManager from 'UI/UIManager.js';
import GUIComponent from 'UI/GUIComponent.js';
import htmlText from './BattlefieldScore.html?raw';
import cssText from './BattlefieldScore.css?raw';

const BattlefieldScore = new GUIComponent('BattlefieldScore', cssText);

BattlefieldScore.render = () => htmlText;

BattlefieldScore.mouseMode = GUIComponent.MouseMode.CROSS;

BattlefieldScore.needFocus = false;

/**
 * Camp labels from msgstringtable 1592
 * @returns {string[]} [campA, campB]
 */
BattlefieldScore.getCampNames = function getCampNames() {
	const msg = DB.getMessage(1592, 'Camp A: Camp B');
	const parts = String(msg).split(':');
	if (parts.length !== 2) {
		return ['Camp A', 'Camp B'];
	}
	return [parts[0].trim(), parts[1].trim()];
};

BattlefieldScore.init = function init() {
	const root = this.getRoot();
	const [a, b] = this.getCampNames();
	root.querySelector('.camp-a').textContent = a;
	root.querySelector('.camp-b').textContent = b;
};

/**
 * Update points
 * @param {number} pointA
 * @param {number} pointB
 */
BattlefieldScore.setPoints = function setPoints(pointA, pointB) {
	if (!this.__active) {
		this.append();
	}
	const root = this.getRoot();
	root.querySelector('.point-a').textContent = String(pointA);
	root.querySelector('.point-b').textContent = String(pointB);
};

export default UIManager.addComponent(BattlefieldScore);
