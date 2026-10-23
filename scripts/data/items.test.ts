import { describe, expect, it } from 'vitest';
import type { DDItem } from './ddragon-types.ts';
import { fillMissingDescriptions, fillTemplate, isShopItem, itemRoles, itemTier, selectItemIds } from './items.ts';

const shop = (name: string, extra: Partial<DDItem> = {}): DDItem => ({
  name,
  description: 'x',
  maps: { '11': true },
  gold: { base: 100, total: 1000, sell: 700, purchasable: true },
  ...extra,
});

describe('召喚峽谷商店的裝備', () => {
  it('其他地圖、不能買、隱藏、英雄專屬的都排除', () => {
    expect(isShopItem(shop('A'))).toBe(true);
    expect(isShopItem(shop('A', { maps: { '12': true } }))).toBe(false);
    expect(isShopItem(shop('A', { gold: { base: 0, total: 0, sell: 0, purchasable: false } }))).toBe(false);
    expect(isShopItem(shop('A', { hideFromAll: true }))).toBe(false);
    expect(isShopItem(shop('A', { requiredChampion: 'Gangplank' }))).toBe(false);
  });

  it('排除其他模式的 6 位數 ID；同名重複只留數字小的', () => {
    const ids = selectItemIds({
      '3003': shop("Archangel's Staff"),
      '323003': shop("Archangel's Staff", { gold: { base: 0, total: 2900, sell: 0, purchasable: true } }),
      '663056': shop("Demon King's Crown"),
      '1107': shop('Scorchclaw Pup'),
      '1101': shop('Scorchclaw Pup'),
      '9999': shop('Hidden', { hideFromAll: true }),
    });
    expect(ids).toEqual(['1101', '3003']);
  });
});

describe('裝備分區（官方等級）', () => {
  it('沒有等級是基礎、1 是起始、4 是中間件、5 和 7 是傳說；消耗品一律放起始', () => {
    expect(itemTier(shop('Long Sword'), {})).toBe('basic');
    expect(itemTier(shop("Doran's Blade"), { epicness: 1 })).toBe('starter');
    expect(itemTier(shop('Seeker'), { epicness: 4 })).toBe('epic');
    expect(itemTier(shop('Zhonya'), { epicness: 5 })).toBe('legendary');
    expect(itemTier(shop('Swiftmarch', { tags: ['Boots'] }), { epicness: 7 })).toBe('legendary');
    expect(itemTier(shop('Elixir', { tags: ['Consumable'] }), { epicness: 7 })).toBe('starter');
    expect(itemTier(shop('Ward', { tags: ['Trinket'] }), {})).toBe('starter');
  });
});

describe('職業（官方欄位）', () => {
  it('依商店篩選的順序排，沒有欄位就是空的', () => {
    expect(itemRoles({ mItemAttributes: [8, 1, 2, 4, 16] })).toEqual(['Fighter', 'Marksman', 'Assassin', 'Mage', 'Tank']);
    expect(itemRoles({ mItemAttributes: [32, 8] })).toEqual(['Tank', 'Support']);
    expect(itemRoles({})).toEqual([]);
  });
});

describe('描述空白時用遊戲文字檔補上', () => {
  const bin = {
    itemID: 3865,
    mEffectAmount: [3],
    mPercentBaseHPRegenMod: 0.5,
    percentBaseMPRegenMod: 0.25,
    mDataValues: [{ mName: 'QuestGoldRequirement', mValue: 400 }],
  };

  it('數值代號換成數字，圖示代號拿掉', () => {
    expect(
      fillTemplate(
        '<attention>%i:scaleHPRegen% @PercentBaseHPRegenMod*100@%</attention> Regen<br><attention>%i:scaleManaRegen% @PercentBaseMPRegenMod*100@%</attention>' +
          '<attention>%i:goldCoins% @Effect1Amount@</attention> Gold<gold>@QuestGoldRequirement@ gold</gold>',
        bin,
      ),
    ).toBe('<attention>50%</attention> Regen<br><attention>25%</attention><attention>3</attention> Gold<gold>400 gold</gold>');
  });

  it('換不了的代號直接報錯，不讓 @…@ 出現在畫面上', () => {
    expect(() => fillTemplate('@Unknown@', bin)).toThrow('Unknown');
    expect(() => fillTemplate('{{ Item_Gold }}', bin)).toThrow();
  });

  it('只補商店買得到、描述空白的裝備，三種語言都補', () => {
    const atlas = shop('World Atlas', { description: '' });
    const hidden = shop('Hidden', { description: '', hideFromAll: true });
    const locales = { en: { '3865': atlas, '9000': hidden }, zh_TW: { '3865': { ...atlas, name: '世界地圖' } }, zh_CN: {} };
    const key = 'generatedtip_item_3865_externaldescription';
    const tables = {
      en: { entries: { [key]: 'Gold @Effect1Amount@', generatedtip_item_9000_externaldescription: 'x' } },
      zh_TW: { entries: { [key]: '金錢 @Effect1Amount@' } },
      zh_CN: { entries: {} },
    };
    const out = fillMissingDescriptions(locales, { 'Items/3865': bin, 'Items/9000': {} }, tables);
    expect(out.en['3865'].description).toBe('Gold 3');
    expect(out.zh_TW['3865']).toMatchObject({ name: '世界地圖', description: '金錢 3' });
    // 沒有簡中翻譯時用英文
    expect(out.zh_CN['3865'].description).toBe('Gold 3');
    expect(out.en['9000'].description).toBe('');
    expect(locales.en['3865'].description).toBe('');
  });
});
