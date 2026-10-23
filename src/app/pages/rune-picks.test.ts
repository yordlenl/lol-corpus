import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { RuneData } from '../../shared/types.ts';
import {
  defaultPicks,
  orderedTrees,
  pickPrimaryRune,
  pickPrimaryTree,
  pickSecondaryRune,
  pickSecondaryTree,
  pickShard,
  rowOf,
  TREE_COLORS,
  TREE_ORDER,
} from './rune-picks.ts';

const data = JSON.parse(readFileSync(new URL('../../../public/data/runes.json', import.meta.url), 'utf8')) as RuneData;
const tree = (key: string) => data.trees.find((t) => t.key === key)!;

describe('符文頁的選取', () => {
  it('系別照遊戲的順序和顏色', () => {
    expect(orderedTrees(data).map((t) => t.key)).toEqual(TREE_ORDER);
    for (const key of TREE_ORDER) expect(TREE_COLORS[key]).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('一開始：主系精準、副系是下一系，每排先選第一個', () => {
    const picks = defaultPicks(data);
    expect(picks.primary).toBe('Precision');
    expect(picks.secondary).toBe('Domination');
    expect(picks.primaryRunes).toEqual(tree('Precision').slots.map((row) => row[0].id));
    expect(picks.secondaryRunes).toEqual([tree('Domination').slots[1][0].id, tree('Domination').slots[2][0].id]);
    expect(picks.shards).toEqual(data.shards.map((row) => row.shards[0].id));
  });

  it('網址指定的系別當主系', () => {
    expect(defaultPicks(data, 'Sorcery')).toMatchObject({ primary: 'Sorcery', secondary: 'Precision' });
    expect(defaultPicks(data, '不存在').primary).toBe('Precision');
  });

  it('主系每排只能選一個', () => {
    const p = tree('Precision');
    let picks = defaultPicks(data);
    picks = pickPrimaryRune(data, picks, p.slots[0][2].id);
    picks = pickPrimaryRune(data, picks, p.slots[2][1].id);
    expect(picks.primaryRunes).toEqual([p.slots[0][2].id, p.slots[1][0].id, p.slots[2][1].id, p.slots[3][0].id]);
    // 不是主系的符文不理
    expect(pickPrimaryRune(data, picks, tree('Resolve').slots[1][0].id)).toBe(picks);
  });

  it('副系選兩個、要在不同排；選第三排時換掉比較早選的', () => {
    const d = tree('Domination');
    let picks = defaultPicks(data);
    // 同一排換成新的
    picks = pickSecondaryRune(data, picks, d.slots[1][2].id);
    expect(picks.secondaryRunes).toEqual([d.slots[2][0].id, d.slots[1][2].id]);
    // 不同排：最早選的（第二排那個）被換掉
    picks = pickSecondaryRune(data, picks, d.slots[3][1].id);
    expect(picks.secondaryRunes).toEqual([d.slots[1][2].id, d.slots[3][1].id]);
    const rows = picks.secondaryRunes.map((id) => rowOf(d, id));
    expect(new Set(rows).size).toBe(2);
  });

  it('副系不能選基石', () => {
    const picks = defaultPicks(data);
    expect(pickSecondaryRune(data, picks, tree('Domination').slots[0][0].id)).toBe(picks);
  });

  it('副系不能和主系相同；主系換成副系那一系時，兩系對調', () => {
    let picks = defaultPicks(data);
    expect(pickSecondaryTree(data, picks, 'Precision')).toBe(picks);
    picks = pickSecondaryTree(data, picks, 'Resolve');
    expect(picks.secondary).toBe('Resolve');
    expect(picks.secondaryRunes.every((id) => rowOf(tree('Resolve'), id) > 0)).toBe(true);

    picks = pickPrimaryTree(data, picks, 'Resolve');
    expect(picks).toMatchObject({ primary: 'Resolve', secondary: 'Precision' });
    expect(picks.primaryRunes).toEqual(tree('Resolve').slots.map((row) => row[0].id));
    expect(picks.secondaryRunes.every((id) => rowOf(tree('Precision'), id) > 0)).toBe(true);
  });

  it('換主系成別的系，副系保持原樣', () => {
    let picks = defaultPicks(data);
    const d = tree('Domination');
    picks = pickSecondaryRune(data, picks, d.slots[3][2].id);
    const kept = picks.secondaryRunes;
    picks = pickPrimaryTree(data, picks, 'Sorcery');
    expect(picks).toMatchObject({ primary: 'Sorcery', secondary: 'Domination', secondaryRunes: kept });
  });

  it('屬性碎片每排一個（同一個碎片可以出現在不同排）', () => {
    let picks = defaultPicks(data);
    const row1 = data.shards[1].shards;
    picks = pickShard(picks, 1, row1[2].id);
    expect(picks.shards).toEqual([data.shards[0].shards[0].id, row1[2].id, data.shards[2].shards[0].id]);
  });
});
