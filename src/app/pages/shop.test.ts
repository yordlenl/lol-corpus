import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Item } from '../../shared/types.ts';
import {
  buildTree,
  type BuildNode,
  intoSlots,
  itemPriceLabel,
  matchesFilter,
  priceLabel,
  ROLE_FILTERS,
  shopIcon,
  shopSections,
  STAT_FILTERS,
  TIER_SECTIONS,
} from './shop.ts';

const PUBLIC = new URL('../../../public/', import.meta.url);
const items = JSON.parse(readFileSync(new URL('data/items.json', PUBLIC), 'utf8')) as Item[];
const byId = new Map(items.map((i) => [i.id, i]));
const byName = (name: string) => items.find((i) => i.name.en === name)!;
const all = { role: 'all' as const, stats: [], query: '' };
const names = (filter: Parameters<typeof shopSections>[1]) => shopSections(items, filter).flatMap((s) => s.items.map((i) => i.name.en));

describe('商店篩選', () => {
  it('不篩選時四區都在、全部裝備都列出，每區依價格排', () => {
    const sections = shopSections(items, all);
    expect(sections.map((s) => s.tier)).toEqual(TIER_SECTIONS.map((s) => s.tier));
    // 只能升級得到的裝備商店買不到，不列
    expect(sections.reduce((n, s) => n + s.items.length, 0)).toBe(items.filter((i) => !i.upgradeOnly).length);
    expect(sections.flatMap((s) => s.items).some((i) => i.name.en === 'Fimbulwinter')).toBe(false);
    for (const s of sections) {
      const prices = s.items.map((i) => i.gold.total);
      expect(prices).toEqual([...prices].sort((a, b) => a - b));
    }
  });

  it('職業一次一個', () => {
    const marksman = names({ ...all, role: 'Marksman' });
    expect(marksman).toContain('Infinity Edge');
    expect(marksman).not.toContain("Rabadon's Deathcap");
    expect(shopSections(items, { ...all, role: 'Marksman' }).every((s) => s.items.every((i) => i.roles.includes('Marksman')))).toBe(true);
  });

  it('屬性可以複選，要全部符合', () => {
    const crit = names({ ...all, stats: ['crit'] });
    const critAndSpeed = names({ ...all, stats: ['crit', 'attackspeed'] });
    expect(critAndSpeed.length).toBeLessThan(crit.length);
    expect(critAndSpeed).toContain('Phantom Dancer');
    expect(critAndSpeed).not.toContain('Infinity Edge');
    for (const n of critAndSpeed) expect(byName(n).tags).toEqual(expect.arrayContaining(['CriticalStrike', 'AttackSpeed']));
  });

  it('一個屬性對到好幾個標籤時，有其中一個就算', () => {
    expect(names({ ...all, stats: ['movespeed'] })).toEqual(expect.arrayContaining(['Boots', 'Phantom Dancer']));
  });

  it('職業、屬性、搜尋一起用', () => {
    expect(names({ role: 'Mage', stats: ['magicpen'], query: '虛空' })).toEqual(['Void Staff']);
    expect(names({ role: 'Mage', stats: ['magicpen'], query: 'void' })).toEqual(['Void Staff']);
    expect(names({ role: 'Tank', stats: ['magicpen'], query: 'void' })).toEqual([]);
    expect(matchesFilter(byName('Void Staff'), { role: 'all', stats: ['ap', 'magicpen'], query: '' })).toBe(true);
  });

  it('沒有符合的就沒有分區', () => {
    expect(shopSections(items, { ...all, query: '不存在的裝備' })).toEqual([]);
  });

  it('篩選圖示（一般和選中）都有切出來', () => {
    const icons = [
      ...ROLE_FILTERS.flatMap((f) => [shopIcon(`role-${f.icon}`), shopIcon(`role-${f.icon}`, true)]),
      ...STAT_FILTERS.flatMap((s) => [shopIcon(`stat-${s.key}`), shopIcon(`stat-${s.key}`, true)]),
      shopIcon('clear'),
    ];
    expect(icons.filter((icon) => !existsSync(new URL(icon, PUBLIC)))).toEqual([]);
    expect(new Set(STAT_FILTERS.map((s) => s.key)).size).toBe(14);
  });
});

describe('合成樹', () => {
  const flatten = (n: BuildNode, depth = 0): Array<[string, number, number]> => [
    [n.item.name.en, n.item.gold.total, depth],
    ...n.children.flatMap((c) => flatten(c, depth + 1)),
  ];

  it('往下展開到最底層的材料，價格是每件的總價', () => {
    const tree = flatten(buildTree(byName("Death's Dance"), byId));
    expect(tree[0]).toEqual(["Death's Dance", byName("Death's Dance").gold.total, 0]);
    expect(Math.max(...tree.map(([, , d]) => d))).toBe(2);
    for (const [name, price] of tree) expect(price).toBe(byName(name).gold.total);
    // 每一層的材料就是資料裡的 from
    const root = buildTree(byName("Death's Dance"), byId);
    expect(root.children.map((c) => c.item.id)).toEqual(byName("Death's Dance").from);
    for (const c of root.children) expect(c.children.map((g) => g.item.id)).toEqual(c.item.from);
  });

  it('基礎裝備沒有材料', () => {
    expect(buildTree(byName('Long Sword'), byId).children).toEqual([]);
  });

  it('同一個材料要兩個時畫兩個', () => {
    const tree = buildTree(byName('Tiamat'), byId);
    expect(tree.children.map((c) => c.item.name.en)).toEqual(['Long Sword', 'Long Sword']);
  });
});

describe('可合成', () => {
  it('一排 7 格，不夠補空格，比較多就多一排', () => {
    expect(intoSlots(0)).toBe(7);
    expect(intoSlots(4)).toBe(7);
    expect(intoSlots(7)).toBe(7);
    expect(intoSlots(8)).toBe(14);
    expect(intoSlots(20)).toBe(21);
  });

  it('價格 0 顯示「免費」；只能升級得到的寫「升級」', () => {
    expect(priceLabel(0)).toBe('免費');
    expect(priceLabel(850)).toBe('850');
    expect(itemPriceLabel(byName('Fimbulwinter'))).toBe('升級');
    expect(itemPriceLabel(byName("Winter's Approach"))).toBe(String(byName("Winter's Approach").gold.total));
  });
});
