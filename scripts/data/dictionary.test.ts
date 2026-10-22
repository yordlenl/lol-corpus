import { describe, expect, it } from 'vitest';
import { toTraditional } from './chinese.ts';
import { classify, exchangeLemma, makeWord, parseLemmaFile, pickLemma } from './dictionary.ts';

describe('生詞判定', () => {
  it('牛津核心詞、柯林斯 4 星以上、國高中與四級詞彙是常見詞', () => {
    expect(classify({ word: 'a', oxford: '1' })).toBe('core');
    expect(classify({ word: 'a', collins: '4' })).toBe('core');
    expect(classify({ word: 'a', tag: 'zk gk' })).toBe('core');
  });

  it('詞頻排名 8000 以內是常見詞，其餘是生詞', () => {
    expect(classify({ word: 'a', bnc: '5000' })).toBe('core');
    expect(classify({ word: 'a', bnc: '20000', frq: '15000' })).toBe('rare');
    expect(classify(undefined)).toBe('unknown');
  });
});

describe('原形歸併', () => {
  it('讀 lemma 表', () => {
    const map = parseLemmaFile('; comment\nattack/123 -> attacks,attacked,attacking\n');
    expect(map.get('attacks')).toBe('attack');
    expect(map.get('attacking')).toBe('attack');
  });

  it('讀 exchange 欄位的原形', () => {
    expect(exchangeLemma('0:attack/1:p')).toBe('attack');
    expect(exchangeLemma('p:attacked')).toBeNull();
  });

  it('變形歸到原形', () => {
    const attack = { word: 'attack', phonetic: 'ə\'tæk' };
    expect(pickLemma('attacks', { word: 'attacks', translation: 'attack的複數' }, 'attack', attack, toTraditional)).toBe('attack');
    expect(pickLemma('attacks', undefined, 'attack', attack, toTraditional)).toBe('attack');
  });

  it('本身就是完整詞條的不亂歸（soldier 不變成 soldi）', () => {
    const soldier = { word: 'soldier', phonetic: 'ˈsəʊldʒə', translation: 'n. 士兵' };
    expect(pickLemma('soldier', soldier, 'soldi', { word: 'soldi', phonetic: 'x' }, toTraditional)).toBe('soldier');
  });

  it('釋義寫著「…的複數形式」時歸到原形（簡體釋義先轉繁體再判斷）', () => {
    const minions = { word: 'minions', phonetic: 'x', translation: 'minion的复数形式' };
    expect(pickLemma('minions', minions, 'minion', { word: 'minion', phonetic: 'y' }, toTraditional)).toBe('minion');
  });
});

describe('詞條內容', () => {
  it('釋義轉成繁體，\\n 變成換行，標出生詞', () => {
    const w = makeWord({ word: 'stasis', phonetic: 'ˈsteɪsɪs', translation: 'n. 停滞\\n[医] 郁滞', bnc: '30000' }, toTraditional);
    expect(w).toEqual({ p: 'ˈsteɪsɪs', t: 'n. 停滯\n[醫] 鬱滯', r: 1, bnc: 30000 });
  });
});
