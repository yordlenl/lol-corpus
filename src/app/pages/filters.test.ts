// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import type { ChampionSummary, Item } from '../../shared/types.ts';
import { matchesChampion } from './champions.ts';
import { matchesItem } from './items.ts';

const ahri: ChampionSummary = {
  id: 'Ahri',
  key: '103',
  name: { en: 'Ahri', zh_TW: '阿璃', zh_CN: '阿狸' },
  title: { en: 'the Nine-Tailed Fox', zh_TW: '九尾妖狐', zh_CN: '九尾妖狐' },
  tags: ['Mage', 'Assassin'],
  icon: 'img/champion/Ahri.png',
};

describe('英雄搜尋', () => {
  it('中文、英文、稱號都搜得到', () => {
    expect(matchesChampion(ahri, '阿璃', '')).toBe(true);
    expect(matchesChampion(ahri, 'ahri', '')).toBe(true);
    expect(matchesChampion(ahri, '九尾', '')).toBe(true);
    expect(matchesChampion(ahri, '亞索', '')).toBe(false);
  });

  it('依職業篩選', () => {
    expect(matchesChampion(ahri, '', 'Mage')).toBe(true);
    expect(matchesChampion(ahri, '', 'Tank')).toBe(false);
  });
});

describe('裝備搜尋', () => {
  const item = { name: { en: "Zhonya's Hourglass", zh_TW: '中婭沙漏', zh_CN: '中娅沙漏' } } as Item;
  it('中英文名稱都搜得到', () => {
    expect(matchesItem(item, '中婭')).toBe(true);
    expect(matchesItem(item, 'zhonya')).toBe(true);
    expect(matchesItem(item, '')).toBe(true);
    expect(matchesItem(item, '無盡')).toBe(false);
  });
});
