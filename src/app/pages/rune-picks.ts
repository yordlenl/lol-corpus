// 符文頁的選取規則（和遊戲一樣，不含畫面，方便測試）：
// 主系每排選一個；副系從另外四系挑，三排小符文裡選兩個、要在不同排；屬性碎片每排選一個。
// 一開始每排先選第一個。這些選擇只是畫面效果，不會存起來。
import type { RuneData, RuneTree } from '../../shared/types.ts';

/** 遊戲裡系別的排列順序和顏色 */
export const TREE_ORDER = ['Precision', 'Domination', 'Sorcery', 'Resolve', 'Inspiration'];
export const TREE_COLORS: Record<string, string> = {
  Precision: '#c8aa6e',
  Domination: '#d44242',
  Sorcery: '#9faafc',
  Resolve: '#a1d586',
  Inspiration: '#49aab9',
};

export interface RunePicks {
  primary: string;
  secondary: string;
  /** 主系每排選的符文（基石、三排小符文，共四個） */
  primaryRunes: number[];
  /** 副系選的兩個符文，先選的在前面 */
  secondaryRunes: number[];
  /** 屬性碎片每排選的 ID */
  shards: number[];
}

export function orderedTrees(data: RuneData): RuneTree[] {
  const rank = (t: RuneTree) => (TREE_ORDER.includes(t.key) ? TREE_ORDER.indexOf(t.key) : TREE_ORDER.length);
  return [...data.trees].sort((a, b) => rank(a) - rank(b));
}

const treeOf = (data: RuneData, key: string) => data.trees.find((t) => t.key === key)!;
const firstOther = (data: RuneData, key: string) => orderedTrees(data).find((t) => t.key !== key)!.key;
const primaryDefaults = (tree: RuneTree) => tree.slots.map((row) => row[0].id);
const secondaryDefaults = (tree: RuneTree) => [tree.slots[1][0].id, tree.slots[2][0].id];

export function defaultPicks(data: RuneData, primaryKey?: string): RunePicks {
  const primary = data.trees.some((t) => t.key === primaryKey) ? primaryKey! : orderedTrees(data)[0].key;
  const secondary = firstOther(data, primary);
  return {
    primary,
    secondary,
    primaryRunes: primaryDefaults(treeOf(data, primary)),
    secondaryRunes: secondaryDefaults(treeOf(data, secondary)),
    shards: data.shards.map((row) => row.shards[0].id),
  };
}

/** 換主系；選到原本的副系時，副系換成原本的主系（和遊戲一樣兩系對調） */
export function pickPrimaryTree(data: RuneData, picks: RunePicks, key: string): RunePicks {
  if (key === picks.primary) return picks;
  const secondary = key === picks.secondary ? picks.primary : picks.secondary;
  return {
    ...picks,
    primary: key,
    primaryRunes: primaryDefaults(treeOf(data, key)),
    secondary,
    secondaryRunes: secondary === picks.secondary ? picks.secondaryRunes : secondaryDefaults(treeOf(data, secondary)),
  };
}

/** 換副系（不能和主系相同） */
export function pickSecondaryTree(data: RuneData, picks: RunePicks, key: string): RunePicks {
  if (key === picks.secondary || key === picks.primary) return picks;
  return { ...picks, secondary: key, secondaryRunes: secondaryDefaults(treeOf(data, key)) };
}

/** 符文在第幾排（0 是基石） */
export function rowOf(tree: RuneTree, runeId: number): number {
  return tree.slots.findIndex((row) => row.some((r) => r.id === runeId));
}

/** 主系：同一排換成這個 */
export function pickPrimaryRune(data: RuneData, picks: RunePicks, runeId: number): RunePicks {
  const row = rowOf(treeOf(data, picks.primary), runeId);
  if (row < 0) return picks;
  return { ...picks, primaryRunes: picks.primaryRunes.map((id, i) => (i === row ? runeId : id)) };
}

/**
 * 副系：只能選小符文（不能選基石）。這一排已經有選的就換掉；
 * 不同排而且已經選了兩個，就把比較早選的那個換掉（遊戲也是這樣）。
 */
export function pickSecondaryRune(data: RuneData, picks: RunePicks, runeId: number): RunePicks {
  const tree = treeOf(data, picks.secondary);
  const row = rowOf(tree, runeId);
  if (row < 1 || picks.secondaryRunes.includes(runeId)) return picks;
  const kept = picks.secondaryRunes.filter((id) => rowOf(tree, id) !== row);
  return { ...picks, secondaryRunes: [...kept, runeId].slice(-2) };
}

export function pickShard(picks: RunePicks, row: number, shardId: number): RunePicks {
  return { ...picks, shards: picks.shards.map((id, i) => (i === row ? shardId : id)) };
}
