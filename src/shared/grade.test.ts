import { describe, expect, it } from 'vitest';
import { diffWords, hintText, isCorrect, normalizeAnswer, ratingFor, sentenceHint, wordsOf } from './grade.ts';

describe('評分規則', () => {
  it('不分大小寫、忽略標點和多餘空白', () => {
    expect(isCorrect('  Minion. ', ['minion'])).toBe(true);
    expect(isCorrect('let me   END this', ['"Let me end this!"'])).toBe(true);
  });

  it('彎引號和直引號相同', () => {
    expect(normalizeAnswer('Don’t “stop”')).toBe(normalizeAnswer(`don't "stop"`));
  });

  it('拼錯就算錯；空白答案算錯', () => {
    expect(isCorrect('invinsible', ['invincible'])).toBe(false);
    expect(isCorrect('   ', ['a'])).toBe(false);
  });

  it('自動評分對應：一次寫對 Good、用了提示才寫對 Hard、寫錯 Again', () => {
    expect(ratingFor(true, false)).toBe(3);
    expect(ratingFor(true, true)).toBe(2);
    expect(ratingFor(false, false)).toBe(1);
  });

  it('提示：先給首字母，再給答案', () => {
    expect(hintText('heal', 1)).toBe('首字母：h＿＿＿');
    expect(hintText('heal', 2)).toBe('答案：heal');
    expect(sentenceHint('Let me end this!', 1)).toBe('首字母：L＿＿ m＿ e＿＿ t＿＿＿!');
    expect(sentenceHint('Let me end this!', 2)).toBe('答案：Let me end this!');
  });
});

describe('逐字比對', () => {
  const answer = '"Rules are made to be broken… like buildings! Or people!"';

  it('全對（大小寫、標點不同也算）', () => {
    const d = diffWords(answer, 'rules are made to be broken like buildings or people');
    expect(d.correct).toBe(true);
    expect(d.expected.every((m) => m.ok)).toBe(true);
    expect(d.extra).toEqual([]);
  });

  it('寫錯的字標出來，你寫的錯字列為多寫', () => {
    const d = diffWords(answer, 'Rules are made to be broken like building or people');
    expect(d.correct).toBe(false);
    expect(d.expected.filter((m) => !m.ok).map((m) => m.word)).toEqual(['buildings!']);
    expect(d.extra).toEqual(['building']);
  });

  it('漏寫、多寫、順序錯都標得出來', () => {
    const missing = diffWords('Ahri heals for a greater amount.', 'Ahri heals for greater amount');
    expect(missing.expected.filter((m) => !m.ok).map((m) => m.word)).toEqual(['a']);
    const extra = diffWords('Ahri heals.', 'Ahri really heals');
    expect(extra.extra).toEqual(['really']);
    expect(extra.correct).toBe(false);
    const order = diffWords('Let me end this', 'me let end this');
    expect(order.correct).toBe(false);
    expect(order.expected.filter((m) => !m.ok)).toHaveLength(1);
  });

  it('連字號的字要整個寫對；只有標點的部分不計', () => {
    const d = diffWords('the Nine-Tailed Fox — run', 'the nine tailed fox run');
    expect(d.correct).toBe(true);
    expect(diffWords('the Nine-Tailed Fox', 'the nine fox').expected.find((m) => m.word === 'Nine-Tailed')!.ok).toBe(false);
  });

  it('聽寫的橫線數：只數有字母或數字的', () => {
    expect(wordsOf('"Rules are made… like buildings! — Or people!"')).toHaveLength(7);
  });
});
