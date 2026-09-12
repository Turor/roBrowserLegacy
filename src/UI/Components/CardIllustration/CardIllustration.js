/**
 * UI/Components/CardIllustration/CardIllustration.js
 *
 * Card image
 *
 * This file is part of ROBrowser, (http://www.robrowser.com/).
 *
 * @author Vincent Thibault, AoShinHo
 */

import DB from 'DB/DBManager.js';
import Client from 'Core/Client.js';
import UIManager from 'UI/UIManager.js';
import GUIComponent from 'UI/GUIComponent.js';
import htmlText from './CardIllustration.html?raw';
import cssText from './CardIllustration.css?raw';

/**
 * Create Component
 */
const CardIllustration = new GUIComponent('CardIllustration', cssText);

/**
 * Render HTML
 */
CardIllustration.render = () => htmlText;

/**
 * Initialize events
 */
CardIllustration.init = function init() {
	const root = this.getRoot();
	root.querySelector('.close').addEventListener('click', this.remove.bind(this));
	this.draggable();
};

/**
 * Show image
 *
 * @param {object} item
 */
CardIllustration.setCard = function setCard(item) {
	const root = this.getRoot();
	const id = item.ITID || item.nameid;
	const info = id ? DB.getItemInfo(id) : item;
	const title = (info && info.identifiedDisplayName) || item.identifiedDisplayName || '';
	const illust = (info && info.illustResourcesName) || item.illustResourcesName;
	root.querySelector('.titlebar .text').textContent = title;
	root.querySelector('.content').style.backgroundImage = 'none';
	if (!illust) {
		return;
	}

	Client.loadFile(`${DB.INTERFACE_PATH}cardbmp/${illust}.bmp`, data => {
		const r = CardIllustration.getRoot();
		r.querySelector('.content').style.backgroundImage = `url(${data})`;
	});
};

CardIllustration.mouseMode = GUIComponent.MouseMode.STOP;
CardIllustration.needFocus = true;

/**
 * Create component and export it
 */
export default UIManager.addComponent(CardIllustration);
