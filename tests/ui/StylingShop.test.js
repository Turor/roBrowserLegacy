import { describe, expect, it } from 'vitest';
import table from './fixtures/stylingshopinfo.json';
import { buildLists, selectionToPacket, totalCost } from '../../src/UI/Components/StylingShop/StylingShopData.js';

// Fixture: kRO data/luafiles514/lua files/stylingshop/StylingShopInfo.lub (2023-12-20), as
// DB.loadStylingShop returns it.

describe('StylingShop option lists', () => {
	it('human lists follow the lub order', () => {
		const l = buildLists(table, false);
		expect(l.HeadStyle).toHaveLength(42);
		expect(l.HeadPalette).toHaveLength(8);
		expect(l.BodyPalette.map(o => o.goods)).toEqual([0, 2, 3, 4, 5, 6, 7]);
		expect(l.MidAccessory[2]).toMatchObject({ seq: 3, goods: 2242, payment: { zeny: 24000 } });
	});

	it('Doram lists use the Doram prices but the human index', () => {
		const l = buildLists(table, true);
		expect(l.HeadStyle).toHaveLength(10);
		expect(l.HeadStyle[6]).toMatchObject({ seq: 7, goods: 7, isColoring: false, payment: { itid: 25736 } });
		expect(l.HeadStyle[0].isColoring).toBe(true);
		expect(l.BodyPalette).toHaveLength(7);
		expect(l.TopAccessory).toHaveLength(3);
	});

	it('prices and packet fields for a selection', () => {
		const l = buildLists(table, false);
		// hairstyle 33 (3,000,000z), colour 2 (100,000z), clothes colour 2 (dye coupon), Sunglasses
		const sel = { HeadStyle: 33, HeadPalette: 2, BodyPalette: 2, MidAccessory: 2 };
		const cost = totalCost(l, sel);
		expect(cost.zeny).toBe(3000000 + 100000 + 5000);
		expect(cost.items).toEqual([{ itid: 6046, boxitid: 16854 }]);
		expect(selectionToPacket(l, sel)).toEqual({
			HeadPalette: 2,
			HeadStyle: 33,
			BodyPalette: 2,
			TopAccessory: 0,
			MidAccessory: 2,
			BottomAccessory: 0
		});
	});

	it('empty selection sends all zeros', () => {
		const l = buildLists(table, false);
		expect(totalCost(l, {})).toEqual({ zeny: 0, items: [] });
		expect(Object.values(selectionToPacket(l, {}))).toEqual([0, 0, 0, 0, 0, 0]);
	});
});
