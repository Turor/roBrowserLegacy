/**
 * UI/Components/StylingShop/StylingShop.js
 *
 * Styling Shop window (ZC_UI_OPEN type 1, script command openstylist).
 *
 * Options and prices come from the official data/luafiles514/lua files/stylingshop/
 * StylingShopInfo.lub; the index of an option in its list is what the server receives
 * (CZ_REQ_STYLE_CHANGE 0xa46 / CZ_REQ_STYLE_CHANGE2 0xafc), 0 meaning "keep".
 * Hair and accessories only: the 2nd costume tab needs LOOK_BODY2 sprites, which the
 * renderer does not draw yet, so it stays disabled.
 *
 * This file is part of ROBrowser, (http://www.robrowser.com/).
 */

import DB from 'DB/DBManager.js';
import Preferences from 'Core/Preferences.js';
import Session from 'Engine/SessionStorage.js';
import Network from 'Network/NetworkManager.js';
import PACKET from 'Network/PacketStructure.js';
import PACKETVER from 'Network/PacketVerManager.js';
import Renderer from 'Renderer/Renderer.js';
import SpriteRenderer from 'Renderer/SpriteRenderer.js';
import Camera from 'Renderer/Camera.js';
import Entity from 'Renderer/Entity/Entity.js';
import UIManager from 'UI/UIManager.js';
import GUIComponent from 'UI/GUIComponent.js';
import ChatBox from 'UI/Components/ChatBox/ChatBox.js';
import Inventory from 'UI/Components/Inventory/Inventory.js';
import { KEYS, buildLists, totalCost, selectionToPacket } from './StylingShopData.js';
import htmlText from './StylingShop.html?raw';
import cssText from './StylingShop.css?raw';

const StylingShop = new GUIComponent('StylingShop', cssText);

StylingShop.render = () => htmlText;

const _preferences = Preferences.get('StylingShop', { x: 200, y: 120 }, 1.0);

/** msgstringtable ids (0-based) */
const MSG = {
	HAIR_COLOR: 2763,
	HAIR_STYLE: 2764,
	CLOTH_COLOR: 2765,
	INSUFFICIENT_ZENY: 2780,
	NO_COUPON: 2814,
	STYLE_SAVED: 2819,
	ACCESSORY: 2831,
	CANNOT_DYE: 2834,
	BASIC_STYLE: 2837
};

let _table = null;
let _lists = {};
let _sel = {};
let _tab = 'hair';
let _direction = 0;
let _ctx = null;
let _preview = null;

const _animation = { tick: 0, frame: 0, repeat: true, play: true, next: false, delay: 0, save: false };
const _cleanColor = new Float32Array([1.0, 1.0, 1.0, 1.0]);

/**
 * Whether the current character uses the Doram lists.
 */
function isDoram() {
	return !!(Session.Entity && DB.isDoram(Session.Entity.job));
}

function priceText(payment) {
	if (payment.zeny) {
		return payment.zeny.toLocaleString() + ' z';
	}
	const id = payment.itid || payment.boxitid;
	if (id) {
		const it = DB.getItemInfo(id);
		return it ? it.identifiedDisplayName : '#' + id;
	}
	return '';
}

function accessoryName(goods) {
	const it = DB.getItemInfo(goods);
	return it ? it.identifiedDisplayName : '#' + goods;
}

function hasItem(id) {
	if (!id) {
		return false;
	}
	const inv = Inventory.getUI();
	return !!(inv && inv.getItemById && inv.getItemById(id));
}

/**
 * Initialize UI
 */
StylingShop.init = function init() {
	const root = this.getRoot();

	this.draggable(root.querySelector('.titlebar'));

	root.querySelector('.close').addEventListener('click', () => StylingShop.close());
	root.querySelector('.reset').addEventListener('click', () => {
		_sel = {};
		refresh();
	});
	root.querySelector('.buy').addEventListener('click', buy);
	root.querySelector('.rotate-left').addEventListener('click', () => {
		_direction = (_direction + 1) % 8;
	});
	root.querySelector('.rotate-right').addEventListener('click', () => {
		_direction = (_direction + 7) % 8;
	});

	root.querySelectorAll('.tab[data-tab]').forEach(tab => {
		tab.addEventListener('click', () => {
			_tab = tab.dataset.tab;
			root.querySelectorAll('.tab[data-tab]').forEach(t => t.classList.toggle('active', t === tab));
			refresh();
		});
	});

	_ctx = root.querySelector('canvas.character').getContext('2d');
};

/**
 * Open the window (server asked with ZC_UI_OPEN type 1).
 */
StylingShop.open = function open() {
	DB.loadStylingShop(table => {
		if (!table) {
			console.error('[StylingShop] stylingshopinfo.lub could not be loaded');
			return;
		}
		_table = table;
		_lists = buildLists(table, isDoram());
		_sel = {};
		_tab = 'hair';
		_direction = 0;
		if (!StylingShop.__active) {
			StylingShop.append();
		}
		const root = StylingShop.getRoot();
		root.querySelectorAll('.tab[data-tab]').forEach(t => t.classList.toggle('active', t.dataset.tab === 'hair'));
		refresh();
	});
};

/**
 * Close the window and tell the server.
 */
StylingShop.close = function close() {
	if (StylingShop.__active) {
		StylingShop.remove();
	}
	Network.sendPacket(new PACKET.CZ.CLOSE_UI_STYLINGSHOP());
};

/**
 * Server answer to a purchase (ZC_STYLE_CHANGE_RES 0xa47).
 *
 * @param {object} pkt
 */
StylingShop.onResult = function onResult(pkt) {
	if (pkt.flag === 0) {
		ChatBox.addText(DB.getMessage(MSG.STYLE_SAVED), ChatBox.TYPE.BLUE, ChatBox.FILTER.PUBLIC_LOG);
		_sel = {};
		if (StylingShop.__active) {
			refresh();
		}
	} else {
		ChatBox.addText(DB.getMessage(MSG.INSUFFICIENT_ZENY), ChatBox.TYPE.ERROR, ChatBox.FILTER.PUBLIC_LOG);
	}
};

function buy() {
	const { zeny, items } = totalCost(_lists, _sel);
	if (!zeny && !items.length && !KEYS.some(k => _sel[k])) {
		return;
	}
	if (zeny > (Session.zeny || 0)) {
		ChatBox.addText(DB.getMessage(MSG.INSUFFICIENT_ZENY), ChatBox.TYPE.ERROR, ChatBox.FILTER.PUBLIC_LOG);
		return;
	}
	if (items.some(i => !hasItem(i.itid) && !hasItem(i.boxitid))) {
		ChatBox.addText(DB.getMessage(MSG.NO_COUPON), ChatBox.TYPE.ERROR, ChatBox.FILTER.PUBLIC_LOG);
		return;
	}

	const fields = selectionToPacket(_lists, _sel);
	const pkt = PACKETVER.value >= 20180516 ? new PACKET.CZ.REQ_STYLE_CHANGE2() : new PACKET.CZ.REQ_STYLE_CHANGE();
	Object.assign(pkt, fields);
	Network.sendPacket(pkt);
}

/**
 * Picker row: < value > price
 */
function picker(key, labelText, valueOf) {
	const list = _lists[key] || [];
	const sec = document.createElement('div');
	sec.className = 'section';
	const label = document.createElement('div');
	label.className = 'label';
	label.textContent = labelText;
	sec.appendChild(label);

	const row = document.createElement('div');
	row.className = 'picker';
	const prev = document.createElement('button');
	prev.className = 'prev';
	prev.dataset.background = 'styleshop/chr_arrow_l_out.bmp';
	prev.dataset.hover = 'styleshop/chr_arrow_l_over.bmp';
	prev.dataset.down = 'styleshop/chr_arrow_l_press.bmp';
	const next = document.createElement('button');
	next.className = 'next';
	next.dataset.background = 'styleshop/chr_arrow_r_out.bmp';
	next.dataset.hover = 'styleshop/chr_arrow_r_over.bmp';
	next.dataset.down = 'styleshop/chr_arrow_r_press.bmp';
	const value = document.createElement('span');
	value.className = 'value';
	const price = document.createElement('span');
	price.className = 'price';

	const cur = _sel[key] || 0;
	const opt = cur ? list[cur - 1] : null;
	value.textContent = opt ? `${valueOf(opt)} (${cur}/${list.length})` : DB.getMessage(MSG.BASIC_STYLE);
	price.textContent = opt ? priceText(opt.payment) : '';

	const step = d => {
		const n = list.length + 1;
		_sel[key] = ((((_sel[key] || 0) + d) % n) + n) % n;
		refresh();
	};
	prev.addEventListener('click', () => step(-1));
	next.addEventListener('click', () => step(1));

	row.append(prev, value, next, price);
	[prev, next].forEach(b => GUIComponent.processDataAttrs(b));
	sec.appendChild(row);
	return sec;
}

function hairColors() {
	const list = _lists.HeadPalette || [];
	const sec = document.createElement('div');
	sec.className = 'section';
	const label = document.createElement('div');
	label.className = 'label';
	label.textContent = DB.getMessage(MSG.HAIR_COLOR);
	sec.appendChild(label);

	const style = _sel.HeadStyle ? _lists.HeadStyle[_sel.HeadStyle - 1] : null;
	if (style && !style.isColoring) {
		const note = document.createElement('div');
		note.className = 'note';
		note.textContent = DB.getMessage(MSG.CANNOT_DYE);
		sec.appendChild(note);
		return sec;
	}

	const row = document.createElement('div');
	row.className = 'swatches';
	list.forEach((opt, i) => {
		const sw = document.createElement('button');
		const n = String(Math.min(opt.goods, 8)).padStart(2, '0');
		const on = _sel.HeadPalette === i + 1;
		sw.className = 'swatch';
		sw.title = priceText(opt.payment);
		sw.dataset.background = `styleshop/color${n}_${on ? 'on' : 'off'}.bmp`;
		sw.dataset.hover = `styleshop/color${n}_${on ? 'on' : 'off'}_over.bmp`;
		sw.addEventListener('click', () => {
			_sel.HeadPalette = _sel.HeadPalette === i + 1 ? 0 : i + 1;
			refresh();
		});
		GUIComponent.processDataAttrs(sw);
		row.appendChild(sw);
	});
	const price = document.createElement('span');
	price.className = 'price';
	price.textContent = _sel.HeadPalette ? priceText(list[_sel.HeadPalette - 1].payment) : '';
	row.appendChild(price);
	sec.appendChild(row);
	return sec;
}

/**
 * Redraw option rows and footer.
 */
function refresh() {
	if (!StylingShop.__active) {
		return;
	}
	const root = StylingShop.getRoot();
	const options = root.querySelector('.options');
	options.textContent = '';

	if (_tab === 'hair') {
		options.appendChild(picker('HeadStyle', DB.getMessage(MSG.HAIR_STYLE), o => '#' + o.goods));
		options.appendChild(hairColors());
		options.appendChild(picker('BodyPalette', DB.getMessage(MSG.CLOTH_COLOR), o => '#' + o.goods));
	} else {
		const acc = DB.getMessage(MSG.ACCESSORY);
		options.appendChild(picker('TopAccessory', acc + ' (Top)', o => accessoryName(o.goods)));
		options.appendChild(picker('MidAccessory', acc + ' (Mid)', o => accessoryName(o.goods)));
		options.appendChild(picker('BottomAccessory', acc + ' (Lower)', o => accessoryName(o.goods)));
	}

	// If the chosen Doram hairstyle cannot be dyed, drop the colour.
	const style = _sel.HeadStyle ? _lists.HeadStyle[_sel.HeadStyle - 1] : null;
	if (style && !style.isColoring) {
		_sel.HeadPalette = 0;
	}

	const { zeny, items } = totalCost(_lists, _sel);
	root.querySelector('.total').textContent = zeny.toLocaleString() + ' z';
	root.querySelector('.coupons').textContent = items
		.map(i => '+ ' + priceText({ itid: i.itid, boxitid: i.boxitid }))
		.join(' ');

	const any = KEYS.some(k => _sel[k]);
	root.querySelector('.buy').style.display = any ? 'block' : 'none';
	root.querySelector('.buy-disabled').style.display = any ? 'none' : 'block';
	updatePreview();
}

/**
 * Apply the selection to the preview entity.
 */
function updatePreview() {
	const me = Session.Entity;
	if (!me) {
		return;
	}
	if (!_preview) {
		_preview = new Entity();
	}
	const opt = key => (_sel[key] ? _lists[key][_sel[key] - 1] : null);
	const view = (key, current) => {
		const o = opt(key);
		if (!o) {
			return current;
		}
		const it = DB.getItemInfo(o.goods);
		return it && it.ClassNum ? it.ClassNum : current;
	};
	_preview.set({
		GID: me.GID + '_STYLIST',
		objecttype: _preview.constructor.TYPE_PC,
		job: me.job,
		sex: me.sex,
		name: '',
		hideShadow: true,
		head: opt('HeadStyle') ? opt('HeadStyle').goods : me.head,
		headpalette: opt('HeadPalette') ? opt('HeadPalette').goods : me.headpalette,
		bodypalette: opt('BodyPalette') ? opt('BodyPalette').goods : me.bodypalette,
		accessory: view('BottomAccessory', me.accessory),
		accessory2: view('TopAccessory', me.accessory2),
		accessory3: view('MidAccessory', me.accessory3),
		robe: me.robe
	});
}

function renderPreview() {
	if (!_preview || !_ctx) {
		return;
	}
	const camDir = Camera.direction;
	_preview.effectColor.set(_cleanColor);
	Camera.direction = 0;
	_preview.direction = _direction;
	_preview.headDir = 0;
	_preview.action = _preview.ACTION.IDLE;
	_preview.animation = _animation;
	SpriteRenderer.bind2DContext(_ctx, 54, 120);
	_ctx.clearRect(0, 0, _ctx.canvas.width, _ctx.canvas.height);
	_preview.renderEntity(_ctx);
	Camera.direction = camDir;
}

StylingShop.onAppend = function onAppend() {
	this._host.style.top = Math.min(Math.max(0, _preferences.y), Renderer.height - 330) + 'px';
	this._host.style.left = Math.min(Math.max(0, _preferences.x), Renderer.width - 480) + 'px';
	Renderer.render(renderPreview);
};

StylingShop.onRemove = function onRemove() {
	Renderer.stop(renderPreview);
	_preferences.y = parseInt(this._host.style.top, 10);
	_preferences.x = parseInt(this._host.style.left, 10);
	_preferences.save();
};

StylingShop.onKeyDown = function onKeyDown(event) {
	if ((event.which === 27 || event.key === 'Escape') && StylingShop.__active) {
		StylingShop.close();
		event.stopImmediatePropagation();
		return false;
	}
	return true;
};

export default UIManager.addComponent(StylingShop);
