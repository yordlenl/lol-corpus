import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  championNames,
  MASK,
  maskNames,
  recognitionFrom,
  recognitionSourceOf,
  runePosition,
  type RecognitionData,
  type RecognitionSource,
} from './challenge.ts';
import { sentenceUnits } from './sentences.ts';
import type { Champion, ChampionSummary, Item, RuneData, SummonerSpell } from './types.ts';

const DATA = new URL('../../public/data/', import.meta.url);
const read = <T>(path: string): T => JSON.parse(readFileSync(new URL(path, DATA), 'utf8')) as T;

const champions = read<ChampionSummary[]>('champions.json');
const details = new Map(champions.map((c) => [c.id, read<Champion>(`champions/${c.id}.json`)]));
const items = read<Item[]>('items.json');
const runes = read<RuneData>('runes.json');
const summoners = read<SummonerSpell[]>('summoners.json');

/** 固定種子的亂數，測試結果每次都一樣 */
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const appears = (text: string, name: string) =>
  new RegExp(`(?<![A-Za-z])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z])`).test(text);

describe('遮名', () => {
  it('整個字比對、大小寫相符；所有格也遮', () => {
    expect(maskNames("Ahri's orb hits Ahri.", ['Ahri'])).toBe(`${MASK}'s orb hits ${MASK}.`);
    expect(maskNames('Sahrisa and ahri stay.', ['Ahri'])).toBe('Sahrisa and ahri stay.');
  });

  it('長的名稱先遮', () => {
    expect(maskNames('Nunu & Willump roll. Willump eats.', ['Nunu & Willump', 'Nunu', 'Willump'])).toBe(`${MASK} roll. ${MASK} eats.`);
  });

  it('英雄要遮的名字包含名字的一部分和自己的技能名', () => {
    const jarvan = details.get('JarvanIV')!;
    expect(championNames(jarvan)).toContain('Jarvan');
    expect(championNames(details.get('Ahri')!)).toEqual(expect.arrayContaining(['Ahri', 'Spirit Rush', 'Orb of Deception']));
    expect(championNames(details.get('Jinx')!)).toEqual(expect.arrayContaining(['Switcheroo!', 'Switcheroo']));
  });

  it('出處對應到四選一的對象；稱號、皮膚、屬性碎片不出題', () => {
    expect(recognitionSourceOf({ type: 'spell', id: 'Ahri/Q' })).toEqual({ kind: 'champion', id: 'Ahri' });
    expect(recognitionSourceOf({ type: 'quote', id: 'Jinx/base/pick-1' })).toEqual({ kind: 'champion', id: 'Jinx' });
    expect(recognitionSourceOf({ type: 'rune', id: '8112' })).toEqual({ kind: 'rune', id: 8112 });
    expect(recognitionSourceOf({ type: 'champion', id: 'Ahri' })).toBeNull();
    expect(recognitionSourceOf({ type: 'skin', id: '103001' })).toBeNull();
    expect(recognitionSourceOf({ type: 'shard', id: '5008' })).toBeNull();
  });
});

/** 所有可以出英→中題的句子 */
function allSentences(): Array<{ english: string; source: RecognitionSource }> {
  const out: Array<{ english: string; source: RecognitionSource }> = [];
  for (const c of details.values()) {
    for (const t of [c.passive.description, ...c.spells.map((s) => s.description)]) {
      for (const u of sentenceUnits(t)) out.push({ english: u.text.en, source: { kind: 'champion', id: c.id } });
    }
    for (const q of c.quotes) if (!q.nonverbal && !q.fictionalLanguage) out.push({ english: q.text.en, source: { kind: 'champion', id: c.id } });
  }
  for (const i of items) {
    for (const t of [i.plaintext, i.description]) for (const u of sentenceUnits(t)) out.push({ english: u.text.en, source: { kind: 'item', id: i.id } });
  }
  for (const r of runes.trees.flatMap((t) => t.slots.flat())) {
    for (const u of sentenceUnits(r.long)) out.push({ english: u.text.en, source: { kind: 'rune', id: r.id } });
  }
  for (const s of summoners) for (const u of sentenceUnits(s.description)) out.push({ english: u.text.en, source: { kind: 'summoner', id: s.id } });
  return out;
}

const dataFor = (source: RecognitionSource): RecognitionData => ({
  champions,
  champion: source.kind === 'champion' ? details.get(source.id) : undefined,
  items,
  runes,
  summoners,
});

describe('驗收的自動版：連抽 500 題英→中', () => {
  const pool = allSentences();
  const random = seeded(20261023);
  const picks = Array.from({ length: 500 }, () => pool[Math.floor(random() * pool.length)]);
  // 四類各至少抽到一些（全部 500 題裡）
  it('四類都有抽到', () => {
    const kinds = new Set(picks.map((p) => p.source.kind));
    expect([...kinds].sort()).toEqual(['champion', 'item', 'rune', 'summoner']);
  });

  it.each(picks.map((p, i) => [i, p] as const))('第 %i 題：答案名字不在題目裡，干擾項符合規則', (_, { english, source }) => {
    const q = recognitionFrom(english, source, dataFor(source), random)!;
    expect(q).not.toBeNull();

    // 四個選項、不重複、包含答案
    expect(q.options).toHaveLength(4);
    expect(new Set(q.options.map((o) => o.id)).size).toBe(4);
    expect(new Set(q.options.map((o) => o.name.zh_TW)).size).toBe(4);
    expect(q.options.some((o) => o.id === q.answer.id)).toBe(true);
    const distractors = q.options.filter((o) => o.id !== q.answer.id);

    // 答案名字不在題目裡
    expect(appears(q.masked, q.answer.name.en)).toBe(false);

    switch (source.kind) {
      case 'champion': {
        const answer = champions.find((c) => c.id === source.id)!;
        for (const part of championNames(details.get(source.id)!)) expect(appears(q.masked, part)).toBe(false);
        const others = distractors.map((d) => champions.find((c) => c.id === d.id)!);
        // 職業組合完全相同（不管順序，Fighter+Assassin 等於 Assassin+Fighter），或主要職業相同；
        // 職業組合完全相同的英雄夠三位時，三個都是
        const exactPool = champions.filter((c) => c.id !== answer.id && c.tags.length === answer.tags.length && c.tags.every((t) => answer.tags.includes(t)));
        for (const o of others) expect(exactPool.includes(o) || o.tags[0] === answer.tags[0]).toBe(true);
        const exact = others.filter((o) => exactPool.includes(o)).length;
        expect(exact).toBe(Math.min(3, exactPool.length));
        break;
      }
      case 'item': {
        const answer = items.find((i) => i.id === source.id)!;
        const others = distractors.map((d) => items.find((i) => i.id === d.id)!);
        for (const o of others) expect(o.depth).toBe(answer.depth);
        const strictPool = items.filter((i) => i.id !== answer.id && i.depth === answer.depth && i.tags.some((t) => answer.tags.includes(t)));
        const sharing = others.filter((o) => o.tags.some((t) => answer.tags.includes(t))).length;
        expect(sharing).toBeGreaterThanOrEqual(Math.min(3, strictPool.length));
        break;
      }
      case 'rune': {
        const pos = runePosition(runes, source.id)!;
        const sameTree = runes.trees[pos.tree].slots[pos.slot].filter((r) => r.id !== source.id);
        for (const d of distractors) expect(runePosition(runes, Number(d.id))!.slot).toBe(pos.slot);
        const fromSameTree = distractors.filter((d) => runePosition(runes, Number(d.id))!.tree === pos.tree).length;
        expect(fromSameTree).toBe(Math.min(3, sameTree.length));
        break;
      }
      case 'summoner':
        for (const d of distractors) expect(summoners.some((s) => s.id === d.id)).toBe(true);
        break;
    }
  });
});
