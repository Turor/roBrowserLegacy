/**
 * UI/Components/SearchStore/SearchStore.js
 *
 * Shop Search window (Universal Catalog / Vending Search Scroll).
 * Opened by ZC_OPEN_SEARCH_STORE_INFO; sends CZ_SEARCH_STORE_INFO and lists
 * the stores the server returns. Clicking a result sends CZ_SSILIST_ITEM_CLICK
 * (shows the shop position, or opens the shop with a Gold catalog).
 *
 * This file is part of ROBrowser, (http://www.robrowser.com/).
 */

import DB from 'DB/DBManager.js';
import ItemTable from 'DB/Items/ItemTable.js';
import Client from 'Core/Client.js';
import KEYS from 'Controls/KeyEventHandler.js';
import Network from 'Network/NetworkManager.js';
import PACKET from 'Network/PacketStructure.js';
import ChatBox from 'UI/Components/ChatBox/ChatBox.js';
import UIManager from 'UI/UIManager.js';
import GUIComponent from 'UI/GUIComponent.js';
import htmlText from './SearchStore.html?raw';
import cssText from './SearchStore.css?raw';

const SearchStore = new GUIComponent('SearchStore', cssText);

/** Hercules searchstore: at most this many item ids per query */
const MAX_ITEM_IDS = 10;

SearchStore.effect = 0; // 0 = show position, 1 = open shop remotely
SearchStore.uses = 0;
SearchStore.results = [];

function _root() {
	return SearchStore._shadow || SearchStore._host;
}

SearchStore.render = () => htmlText;

SearchStore.init = function init() {
	const root = _root();
	root.querySelector('.close').addEventListener('click', e => {
		e.stopImmediatePropagation();
		SearchStore.close();
	});
	root.querySelector('.search').addEventListener('click', e => {
		e.stopImmediatePropagation();
		SearchStore.search();
	});
	root.querySelector('.next').addEventListener('click', e => {
		e.stopImmediatePropagation();
		Network.sendPacket(new PACKET.CZ.SEARCH_STORE_INFO_NEXT_PAGE());
	});
	// keep typing inside the window from triggering game hotkeys
	root.querySelectorAll('input').forEach(input => {
		input.addEventListener('keydown', e => {
			e.stopPropagation();
			if (e.key === 'Enter') {
				SearchStore.search();
			} else if (e.key === 'Escape') {
				SearchStore.close();
			}
		});
	});
	root.querySelector('.term').addEventListener('input', () => {
		const ids = resolveItems(root.querySelector('.term').value);
		const m = root.querySelector('.matches');
		m.textContent = ids.length ? `${ids.length}${ids.length >= MAX_ITEM_IDS ? '+' : ''} matching item(s)` : '';
	});
	root.querySelector('.results').addEventListener('click', e => {
		const li = e.target.closest('li[data-index]');
		if (!li) {
			return;
		}
		const r = SearchStore.results[parseInt(li.dataset.index, 10)];
		if (!r) {
			return;
		}
		const pkt = new PACKET.CZ.SSILIST_ITEM_CLICK();
		pkt.AID = r.AID;
		pkt.SSI_ID = r.SSI_ID;
		pkt.ITID = r.ITID;
		Network.sendPacket(pkt);
	});
	this.draggable(root.querySelector('.titlebar'));
};

SearchStore.onAppend = function onAppend() {
	this._host.style.display = '';
	const term = _root().querySelector('.term');
	if (term) {
		term.focus();
	}
};

SearchStore.onKeyDown = function onKeyDown(event) {
	if ((event.which === KEYS.ESCAPE || event.key === 'Escape') && this._host && this._host.style.display !== 'none') {
		SearchStore.close();
		event.stopImmediatePropagation();
		return false;
	}
	return true;
};

/**
 * Server opened the search window (ZC_OPEN_SEARCH_STORE_INFO)
 */
SearchStore.open = function open(effect, uses) {
	SearchStore.effect = effect;
	SearchStore.uses = uses;
	SearchStore.results = [];
	if (!this.__active) {
		this.append();
	}
	this._host.style.display = '';
	const root = _root();
	root.querySelector('.results').innerHTML = '';
	root.querySelector('.next').style.display = 'none';
	root.querySelector('.hint').textContent =
		effect === 1 ? 'Click a result to open that shop.' : 'Click a result to see where the shop is.';
	updateUses();
	this.focus();
};

/**
 * Close window and tell the server
 */
SearchStore.close = function close() {
	if (this.__active) {
		Network.sendPacket(new PACKET.CZ.CLOSE_SEARCH_STORE_INFO());
		this.remove();
	}
};

function updateUses() {
	const el = _root().querySelector('.uses');
	if (el) {
		el.textContent = `(${SearchStore.uses} search${SearchStore.uses === 1 ? '' : 'es'} left)`;
	}
}

/**
 * Turn the search term into item ids: a number is used as is,
 * otherwise items whose identified name contains the term.
 */
function resolveItems(term) {
	term = (term || '').trim().toLowerCase();
	if (!term) {
		return [];
	}
	if (/^\d+$/.test(term)) {
		return [parseInt(term, 10)];
	}
	const exact = [];
	const partial = [];
	for (const key of Object.keys(ItemTable)) {
		const it = ItemTable[key];
		const name = it && it.identifiedDisplayName ? String(it.identifiedDisplayName).toLowerCase() : '';
		if (!name) {
			continue;
		}
		if (name === term) {
			exact.push(Number(key));
		} else if (name.indexOf(term) !== -1) {
			partial.push(Number(key));
		}
		if (exact.length + partial.length > 200) {
			break;
		}
	}
	// The server rejects the whole query if any id is unknown to it, so an exact name
	// match is searched on its own; partial matches are only used when nothing matches exactly.
	return (exact.length ? exact : partial).slice(0, MAX_ITEM_IDS);
}

SearchStore.search = function search() {
	const root = _root();
	const ids = resolveItems(root.querySelector('.term').value);
	if (!ids.length) {
		root.querySelector('.matches').textContent = 'No item matches that name.';
		return;
	}
	const type = root.querySelector('input[name="sstype"]:checked');
	const min = parseInt(root.querySelector('.min').value, 10) || 0;
	const max = parseInt(root.querySelector('.max').value, 10) || 0;
	const pkt = new PACKET.CZ.SEARCH_STORE_INFO();
	pkt.StoreType = type ? parseInt(type.value, 10) : 0;
	pkt.minPrice = min;
	pkt.maxPrice = max;
	pkt.ItemIDList = ids;
	pkt.CardIDList = [];
	Network.sendPacket(pkt);
};

/**
 * Results (ZC_SEARCH_STORE_INFO_ACK / ACK2)
 */
SearchStore.setResults = function setResults(pkt) {
	if (!this.__active) {
		return;
	}
	const root = _root();
	const list = root.querySelector('.results');
	if (pkt.IsFirstPage) {
		SearchStore.results = [];
		list.innerHTML = '';
	}
	SearchStore.uses = pkt.RemainedSearchCnt;
	updateUses();
	root.querySelector('.next').style.display = pkt.IsNexPage ? '' : 'none';

	pkt.SSI_List.forEach(r => {
		const index = SearchStore.results.push(r) - 1;
		const item = {
			ITID: r.ITID,
			IsIdentified: 1,
			RefiningLevel: r.RefiningLevel,
			slot: r.slot || { card1: r.card1, card2: r.card2, card3: r.card3, card4: r.card4 },
			enchantgrade: r.grade || 0
		};
		const it = DB.getItemInfo(r.ITID);
		const name = DB.getItemName(item);
		const li = document.createElement('li');
		li.dataset.index = index;
		li.innerHTML =
			'<div class="icon"></div><div class="info"><div class="name"></div><div class="shop"></div></div>' +
			'<div class="price"><span class="z"></span><span class="ea"></span></div>';
		li.querySelector('.name').textContent = name;
		li.querySelector('.shop').textContent = r.StoreName;
		li.querySelector('.z').textContent = `${Number(r.price).toLocaleString('en-US')} z`;
		li.querySelector('.ea').textContent = `x ${r.count}`;
		list.appendChild(li);
		if (it && it.identifiedResourceName) {
			Client.loadFile(`${DB.INTERFACE_PATH}item/${it.identifiedResourceName}.bmp`, data => {
				const icon = li.querySelector('.icon');
				if (icon) {
					icon.style.backgroundImage = `url(${data})`;
				}
			});
		}
	});
};

/**
 * Error (ZC_SEARCH_STORE_INFO_FAILED). Reasons map to msgstringtable ids.
 */
SearchStore.onFailed = function onFailed(reason) {
	const msg = { 0: 1803, 1: 1784, 2: 1798, 3: 1800, 4: 1797 }[reason];
	const text = msg
		? DB.getMessage(
				msg,
				[
					'No matching stores were found.',
					'There are too many results. Please enter more detailed search term.',
					'You cannot search anymore.',
					'You cannot search yet.',
					'No sale (purchase) information available.'
				][reason]
			)
		: `Shop search failed (${reason}).`;
	ChatBox.addText(text, ChatBox.TYPE.ERROR, ChatBox.FILTER.PUBLIC_LOG);
	if (this.__active) {
		_root().querySelector('.hint').textContent = text;
	}
};

export default UIManager.addComponent(SearchStore);
