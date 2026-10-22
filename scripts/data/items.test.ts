import { describe, expect, it } from 'vitest';
import type { DDItem } from './ddragon-types.ts';
import { isShopItem, itemTier, selectItemIds } from './items.ts';

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

describe('裝備分區', () => {
  it('依標籤與合成關係分出六區', () => {
    expect(itemTier(shop('Potion', { tags: ['Consumable'] }))).toBe('consumable');
    expect(itemTier(shop('Ward', { tags: ['Trinket'] }))).toBe('consumable');
    expect(itemTier(shop('Greaves', { tags: ['Boots'], from: ['1001'] }))).toBe('boots');
    expect(itemTier(shop("Doran's Blade", { tags: ['Lane'] }))).toBe('starter');
    expect(itemTier(shop('Zhonya', { from: ['1058', '2420'], depth: 3 }))).toBe('legendary');
    expect(itemTier(shop('Seeker', { from: ['1029'], into: ['3157'], depth: 2 }))).toBe('epic');
    expect(itemTier(shop('Long Sword', { into: ['3133'] }))).toBe('basic');
  });
});
