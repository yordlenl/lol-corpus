import { describe, expect, it } from 'vitest';
import type { DDItem } from './ddragon-types.ts';
import { CALC_GAP, fillMissingDescriptions, fillTemplate, findUpgrades, isShopItem, itemRoles, itemTier, selectItemIds } from './items.ts';

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

describe('升級後的裝備', () => {
  it('描述說會 transform／upgrade 成另一件裝備的，一路找下去；商店本來就有的不算「只能升級得到」', () => {
    const items = {
      '3119': shop("Winter's Approach", { description: 'Transforms into <rarityLegendary>Fimbulwinter</rarityLegendary>.' }),
      '3121': shop('Fimbulwinter', { gold: { base: 0, total: 2400, sell: 0, purchasable: false } }),
      '3865': shop('World Atlas', { description: 'transform it into <rarityGeneric>Runic Compass</rarityGeneric>' }),
      '3866': shop('Runic Compass', { description: 'transform it into <rarityGeneric>Bounty of Worlds</rarityGeneric>' }),
      '3867': shop('Bounty of Worlds', { description: 'can be upgraded into <rarityLegendary>Bloodsong</rarityLegendary>' }),
      '3877': shop('Bloodsong'),
      // 只是提到名字、沒有說升級的不算
      '3070': shop('Tear', { description: 'Like <rarityGeneric>Fimbulwinter</rarityGeneric>' }),
      // 其他模式的 6 位數 ID 不算
      '323121': shop('Fimbulwinter'),
    };
    const { to, only } = findUpgrades(items, ['3119', '3865', '3877', '3070']);
    expect(Object.fromEntries(to)).toEqual({ '3119': ['3121'], '3865': ['3866'], '3866': ['3867'], '3867': ['3877'] });
    expect(only).toEqual(['3121', '3866', '3867']);
  });

  it('即時計算的數字標成空缺：英文是標籤後直接接空白或單獨的 %，中文是計算公式的名稱', () => {
    const bin = { itemID: 3121, mDataValues: [{ mName: 'Cooldown', mValue: 8 }], mItemCalculations: { BonusHPFromMana: {} } };
    const table = { entries: { Item_Cooldown: '%i:cooldown% (@Cooldown@s)' } };
    expect(fillTemplate('Gain <scaleHealth> Health</scaleHealth>. {{ Item_Cooldown }}', bin, { table, gaps: true })).toBe(
      `Gain <scaleHealth>${CALC_GAP} Health</scaleHealth>. (8s)`,
    );
    expect(fillTemplate('Gain % Heal and Shield Power.', bin, { gaps: true })).toBe(`Gain ${CALC_GAP}% Heal and Shield Power.`);
    expect(fillTemplate('獲得<scaleHealth>@BonusHPFromMana@生命</scaleHealth>', bin, { gaps: true })).toBe(`獲得<scaleHealth>${CALC_GAP}生命</scaleHealth>`);
    // 有寫數字的不動
    expect(fillTemplate('Gain <scaleAD>2% max Mana</scaleAD>', bin, { gaps: true })).toBe('Gain <scaleAD>2% max Mana</scaleAD>');
    // 沒開 gaps 時遇到計算公式還是報錯
    expect(() => fillTemplate('@BonusHPFromMana@', bin)).toThrow();
  });
});
