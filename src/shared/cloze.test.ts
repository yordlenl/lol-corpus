import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { chooseBlanks, wordAt, wordOffset, type ClozeContext } from './cloze.ts';
import { richToPlain } from './text.ts';
import type { Champion } from './types.ts';

const SKIP = new Set(['the', 'of', 'and', 'for', 'an', 'or', 'to', 'with', 'by', 'on', 'her', 'she', 'when']);
const ctx = (overrides: Partial<ClozeContext> = {}): ClozeContext => ({
  names: ['Spirit Rush', 'Ahri'],
  allowed: (k) => !SKIP.has(k) && k !== 'ahri',
  collected: () => false,
  difficulty: (k) => k.length,
  ...overrides,
});
const blanksOf = (text: string, c = ctx()) => chooseBlanks(text, c).map((i) => wordAt(text, i));

describe('挖空選詞', () => {
  it('每句挖 1 個；能挖的字 8 個以上的長句挖 2 個', () => {
    expect(blanksOf('Ahri gains movement speed briefly.')).toHaveLength(1);
    const long = 'Ahri dashes forward and fires essence bolts, damaging nearby enemies after taking down champions quickly.';
    expect(blanksOf(long)).toHaveLength(2);
    expect(blanksOf('Ahri heals herself. She dashes forward quickly.')).toHaveLength(2);
  });

  it('生詞本裡的詞優先，其次較難的詞', () => {
    expect(blanksOf('Ahri throws her orb forward.', ctx({ collected: (k) => k === 'orb' }))).toEqual(['orb']);
    expect(blanksOf('Ahri throws her orb forward.', ctx({ difficulty: (k) => (k === 'throws' ? 99 : 1) }))).toEqual(['throws']);
  });

  it('不挖數值公式、專有名詞、功能詞、短字、句中大寫的名稱', () => {
    const text = 'Spirit Rush deals magic damage (+0.1 bonus AD) to an enemy. Pow-Pow fires at Fishbones target.';
    const picked = blanksOf(text, ctx({ difficulty: (k) => (['spirit', 'rush', 'bonus', 'pow', 'fishbones'].includes(k) ? 100 : 1) }));
    expect(picked).not.toContain('Spirit');
    expect(picked).not.toContain('Rush');
    expect(picked).not.toContain('bonus');
    expect(picked).not.toContain('Fishbones');
    expect(picked).toHaveLength(2);
  });

  it('太短不算句子的行不挖（例如主動效果的名稱）', () => {
    expect(blanksOf('Time Stop\nEnter Stasis for seconds now.')).toEqual(['seconds']);
  });

  it('兩個空格不相鄰', () => {
    const text = 'Massive enormous gigantic colossal titanic huge giant tremendous beasts appear.';
    const idx = chooseBlanks(text, ctx());
    expect(idx).toHaveLength(2);
    expect(Math.abs(idx[0] - idx[1])).toBeGreaterThan(1);
  });

  it('真實資料：阿璃的技能都挖得出空格，而且不挖技能名', () => {
    const ahri = JSON.parse(readFileSync(new URL('../../public/data/champions/Ahri.json', import.meta.url), 'utf8')) as Champion;
    const names = JSON.parse(readFileSync(new URL('../../public/data/names.json', import.meta.url), 'utf8')) as string[];
    for (const sp of [ahri.passive, ...ahri.spells]) {
      const text = richToPlain(sp.description.en);
      const picked = blanksOf(text, ctx({ names }));
      expect(picked.length).toBeGreaterThan(0);
      expect(picked).not.toContain('Spirit');
    }
  });

  it('第幾個字的文字與位置', () => {
    expect(wordAt("Ahri's orb returns.", 1)).toBe('orb');
    expect(wordOffset("Ahri's orb returns.", 2)).toBe(11);
  });
});
