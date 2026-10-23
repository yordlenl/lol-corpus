// 隨機挑戰的英→中：遮名（spec「遮名」）與干擾項（spec「干擾項規則」）。
import { loadChampion, loadChampionIndex, loadItems, loadRunes, loadSummoners } from './data.ts';
import type {
  Champion,
  ChampionSummary,
  ChallengeOption,
  Item,
  RecognitionQuestion,
  RuneData,
  SourceRef,
  SummonerSpell,
} from './types.ts';

export const MASK = '＿＿＿';

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** 把名稱換成＿＿＿：整個字比對、大小寫相符；長的名稱先遮 */
export function maskNames(text: string, names: string[]): string {
  const list = [...new Set(names.map((n) => n.trim()).filter(Boolean))].sort((a, b) => b.length - a.length);
  let out = text;
  for (const name of list) {
    out = out.replace(new RegExp(`(?<![A-Za-z])${escape(name)}(?![A-Za-z])`, 'g'), MASK);
  }
  return out;
}

/** 名稱去掉頭尾標點（例如 Switcheroo! → Switcheroo），兩種寫法都遮 */
const withBare = (name: string) => [name, name.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '')];

/** 英雄要遮的名字：全名、名字裡大寫開頭三個字母以上的字、被動和 Q/W/E/R 名稱 */
export function championNames(c: Champion): string[] {
  const parts = c.name.en.split(/[\s&.]+/).filter((p) => /^[A-Z][A-Za-z']{2,}$/.test(p));
  const skills = [c.passive.name.en, ...c.spells.map((s) => s.name.en)].flatMap((n) => n.split(/\s*[/|]\s*/));
  return [c.name.en, ...parts, ...skills].flatMap(withBare);
}

function shuffle<T>(list: T[], random: () => number): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 依序從幾個候選池補到三個；名稱不重複、不含答案 */
function fill<T>(answerName: string, pools: T[][], nameOf: (x: T) => string, random: () => number): T[] {
  const picked: T[] = [];
  const names = new Set([answerName]);
  for (const pool of pools) {
    for (const x of shuffle(pool, random)) {
      if (picked.length >= 3) return picked;
      if (names.has(nameOf(x))) continue;
      names.add(nameOf(x));
      picked.push(x);
    }
  }
  return picked;
}

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((t) => b.includes(t));

/** 英雄：先挑職業組合完全相同的，不夠再用主要職業相同的補 */
export function championDistractors(answer: ChampionSummary, all: ChampionSummary[], random: () => number): ChampionSummary[] {
  const others = all.filter((c) => c.id !== answer.id);
  return fill(
    answer.name.zh_TW,
    [others.filter((c) => sameSet(c.tags, answer.tags)), others.filter((c) => c.tags[0] === answer.tags[0])],
    (c) => c.name.zh_TW,
    random,
  );
}

/** 裝備：同等級且至少一個相同屬性標籤；不夠時放寬為只看同等級 */
export function itemDistractors(answer: Item, all: Item[], random: () => number): Item[] {
  const sameDepth = all.filter((i) => i.id !== answer.id && i.depth === answer.depth);
  return fill(
    answer.name.zh_TW,
    [sameDepth.filter((i) => i.tags.some((t) => answer.tags.includes(t))), sameDepth],
    (i) => i.name.zh_TW,
    random,
  );
}

/** 符文在哪一系、哪一排 */
export function runePosition(runes: RuneData, runeId: number): { tree: number; slot: number } | null {
  for (let t = 0; t < runes.trees.length; t++) {
    for (let s = 0; s < runes.trees[t].slots.length; s++) {
      if (runes.trees[t].slots[s].some((r) => r.id === runeId)) return { tree: t, slot: s };
    }
  }
  return null;
}

/** 符文：基石對基石、小符文對同一排；先挑同一系的，不夠再從其他系的同一排補 */
export function runeDistractors(runes: RuneData, runeId: number, random: () => number) {
  const pos = runePosition(runes, runeId)!;
  const answer = runes.trees[pos.tree].slots[pos.slot].find((r) => r.id === runeId)!;
  const sameTree = runes.trees[pos.tree].slots[pos.slot].filter((r) => r.id !== runeId);
  const otherTrees = runes.trees.filter((_, t) => t !== pos.tree).flatMap((t) => t.slots[pos.slot]);
  return fill(answer.name.zh_TW, [sameTree, otherTrees], (r) => r.name.zh_TW, random);
}

/** 召喚師技能：全部召喚師技能都可以當選項 */
export function summonerDistractors(answer: SummonerSpell, all: SummonerSpell[], random: () => number): SummonerSpell[] {
  return fill(answer.name.zh_TW, [all.filter((s) => s.id !== answer.id)], (s) => s.name.zh_TW, random);
}

export type RecognitionSource =
  | { kind: 'champion'; id: string }
  | { kind: 'item'; id: string }
  | { kind: 'rune'; id: number }
  | { kind: 'summoner'; id: string };

/** 卡片出處 → 四選一要選的對象；英雄稱號、皮膚、屬性碎片不出英→中題 */
export function recognitionSourceOf(ref: SourceRef): RecognitionSource | null {
  switch (ref.type) {
    case 'passive':
      return { kind: 'champion', id: ref.id };
    case 'spell':
    case 'quote':
      return { kind: 'champion', id: ref.id.split('/')[0] };
    case 'item':
      return { kind: 'item', id: ref.id };
    case 'rune':
      return { kind: 'rune', id: Number(ref.id) };
    case 'summoner':
      return { kind: 'summoner', id: ref.id };
    default:
      return null;
  }
}

export interface RecognitionData {
  champions: ChampionSummary[];
  champion?: Champion;
  items: Item[];
  runes: RuneData;
  summoners: SummonerSpell[];
}

const option = (kind: ChallengeOption['kind'], x: { id: string | number; name: ChallengeOption['name']; icon: string }): ChallengeOption => ({
  kind,
  id: String(x.id),
  name: x.name,
  icon: x.icon,
});

/** 不讀檔的版本（測試直接餵資料） */
export function recognitionFrom(
  english: string,
  source: RecognitionSource,
  data: RecognitionData,
  random: () => number = Math.random,
): RecognitionQuestion | null {
  let answer: ChallengeOption;
  let distractors: ChallengeOption[];
  let names: string[];
  switch (source.kind) {
    case 'champion': {
      const summary = data.champions.find((c) => c.id === source.id);
      if (!summary || !data.champion) return null;
      answer = option('champion', summary);
      distractors = championDistractors(summary, data.champions, random).map((c) => option('champion', c));
      names = championNames(data.champion);
      break;
    }
    case 'item': {
      const item = data.items.find((i) => i.id === source.id);
      if (!item) return null;
      answer = option('item', item);
      distractors = itemDistractors(item, data.items, random).map((i) => option('item', i));
      names = withBare(item.name.en);
      break;
    }
    case 'rune': {
      const pos = runePosition(data.runes, source.id);
      if (!pos) return null;
      const rune = data.runes.trees[pos.tree].slots[pos.slot].find((r) => r.id === source.id)!;
      answer = option('rune', rune);
      distractors = runeDistractors(data.runes, source.id, random).map((r) => option('rune', r));
      names = withBare(rune.name.en);
      break;
    }
    case 'summoner': {
      const spell = data.summoners.find((s) => s.id === source.id);
      if (!spell) return null;
      answer = option('summoner', spell);
      distractors = summonerDistractors(spell, data.summoners, random).map((s) => option('summoner', s));
      names = withBare(spell.name.en);
      break;
    }
  }
  if (distractors.length < 3) return null;
  return { masked: maskNames(english, names), answer, options: shuffle([answer, ...distractors], random) };
}

/** 學習 App 用：讀需要的資料，出一題英→中 */
export async function recognitionQuestion(
  english: string,
  ref: SourceRef,
  random: () => number = Math.random,
): Promise<RecognitionQuestion | null> {
  const source = recognitionSourceOf(ref);
  if (!source) return null;
  const [champions, items, runes, summoners, champion] = await Promise.all([
    loadChampionIndex(),
    loadItems(),
    loadRunes(),
    loadSummoners(),
    source.kind === 'champion' ? loadChampion(source.id) : Promise.resolve(undefined),
  ]);
  return recognitionFrom(english, source, { champions, champion, items, runes, summoners }, random);
}
