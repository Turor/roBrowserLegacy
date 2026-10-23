/**
 * UI/Components/StylingShop/StylingShopData.js
 *
 * Pure helpers for the Styling Shop: turn the StylingShopInfo.lub table into option
 * lists, price a selection and map it to the CZ_REQ_STYLE_CHANGE fields.
 */

/** Option lists sent to the server, in packet order */
export const KEYS = ['HeadPalette', 'HeadStyle', 'BodyPalette', 'TopAccessory', 'MidAccessory', 'BottomAccessory'];

/**
 * Build the option lists for the current race.
 * Each option: { seq: index sent to server, goods, payment, isColoring }
 *
 * @param {object} table - StylingShop table from StylingShopInfo.lub
 * @param {boolean} doram
 * @returns {object}
 */
export function buildLists(table, doram) {
	const asArray = v => (Array.isArray(v) ? v : v ? Object.values(v) : []);
	const human = key =>
		asArray(table[key]).map((e, i) => ({
			seq: i + 1,
			goods: e.goods,
			payment: e.payment || {},
			isDoram: !!e.isDoram,
			isColoring: e.isColoring !== false
		}));
	// Doram lists hold their own prices; the server still takes the index of the
	// same goods in the human list (StylingShop_GetSeqnumber_by_goods).
	const doramOf = (key, doramKey) => {
		const base = human(key);
		return asArray(table[doramKey])
			.map(e => {
				const match = base.find(b => b.goods === e.goods);
				return match
					? {
							seq: match.seq,
							goods: e.goods,
							payment: e.payment || {},
							isDoram: true,
							isColoring: e.isColoring !== false
						}
					: null;
			})
			.filter(Boolean);
	};

	const lists = {};
	lists.HeadPalette = human('HeadPalette');
	lists.TopAccessory = human('TopAccessory');
	lists.MidAccessory = human('MidAccessory');
	lists.BottomAccessory = human('BottomAccessory');
	if (doram) {
		lists.HeadStyle = doramOf('HeadStyle', 'DoramHeadStyle');
		lists.BodyPalette = doramOf('BodyPalette', 'DoramBodyPalette');
		['HeadPalette', 'TopAccessory', 'MidAccessory', 'BottomAccessory'].forEach(k => {
			lists[k] = lists[k].filter(e => e.isDoram);
		});
	} else {
		lists.HeadStyle = human('HeadStyle');
		lists.BodyPalette = human('BodyPalette');
	}
	return lists;
}

/**
 * Total price of a selection.
 *
 * @returns {{zeny: number, items: Array<{itid: number, boxitid: number}>}}
 */
export function totalCost(lists, sel) {
	let zeny = 0;
	const items = [];
	KEYS.forEach(key => {
		const opt = sel[key] ? lists[key][sel[key] - 1] : null;
		if (!opt) {
			return;
		}
		const p = opt.payment;
		if (p.zeny) {
			zeny += p.zeny;
		} else if (p.itid || p.boxitid) {
			items.push({ itid: p.itid || 0, boxitid: p.boxitid || 0 });
		}
	});
	return { zeny, items };
}

/**
 * Packet fields (server indexes) for a selection.
 */
export function selectionToPacket(lists, sel) {
	const out = {};
	KEYS.forEach(key => {
		const opt = sel[key] ? lists[key][sel[key] - 1] : null;
		out[key] = opt ? opt.seq : 0;
	});
	return out;
}
