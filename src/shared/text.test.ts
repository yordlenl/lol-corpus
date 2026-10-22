import { describe, expect, it } from 'vitest';
import { collectWords, normalize, richToPlain, segment } from './text.ts';

describe('英文分詞', () => {
  it('切成文字和單字，拼回去和原文一樣', () => {
    const text = "Ahri's Q: don't miss!";
    const segs = segment(text);
    expect(segs.map((s) => s.value).join('')).toBe(text);
    expect(segs.filter((s) => s.type === 'word').map((s) => (s.type === 'word' ? s.key : ''))).toEqual(['ahri', 'do', 'miss']);
  });

  it('一個字母的不算單字', () => {
    expect(segment('a I x').every((s) => s.type === 'text')).toBe(true);
  });

  it('歸一：小寫、去所有格、去縮寫', () => {
    expect(normalize("Champion's")).toBe('champion');
    expect(normalize("we'll")).toBe('we');
    expect(normalize('Don’t')).toBe('do');
  });

  it('收集出現過的字', () => {
    expect([...collectWords('Deal magic damage, deal damage.')]).toEqual(['deal', 'magic', 'damage']);
  });

  it('有格式的文字轉純文字', () => {
    expect(richToPlain(['Deal ', ['80', 'num'], ' damage'])).toBe('Deal 80 damage');
    expect(richToPlain('plain')).toBe('plain');
  });
});
