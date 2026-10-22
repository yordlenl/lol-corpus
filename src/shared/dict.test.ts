import { describe, expect, it } from 'vitest';
import { isClickable, lookupIn, setWordlists } from './dict.ts';
import type { Dictionary } from './types.ts';

describe('哪些字能點', () => {
  setWordlists({ skip: ['the', 'of'], softSkip: ['ahri', 'hextech'] });

  it('功能詞哪裡都不能點', () => {
    expect(isClickable('the', 'body')).toBe(false);
    expect(isClickable('the', 'name')).toBe(false);
  });

  it('英雄名、遊戲自創詞只在名稱裡能點', () => {
    expect(isClickable('ahri', 'body')).toBe(false);
    expect(isClickable('ahri', 'name')).toBe(true);
  });

  it('一般單字都能點', () => {
    expect(isClickable('damage', 'body')).toBe(true);
  });
});

describe('查詞', () => {
  const dict: Dictionary = {
    meta: { count: 1, forms: 1, rare: 0 },
    forms: { attacks: 'attack' },
    words: { attack: { p: "ə'tæk", t: 'n. 攻擊' } },
  };

  it('變形查到原形', () => {
    expect(lookupIn(dict, 'attacks')).toEqual({ surface: 'attacks', lemma: 'attack', entry: { p: "ə'tæk", t: 'n. 攻擊' } });
  });

  it('沒收錄的字', () => {
    expect(lookupIn(dict, 'ahri')).toEqual({ surface: 'ahri', lemma: 'ahri', entry: null });
  });
});
