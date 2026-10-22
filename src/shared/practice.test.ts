import { describe, expect, it } from 'vitest';
import { setCorpusBase } from './data.ts';
import { unitForWord } from './practice.ts';

setCorpusBase('https://example.test/lol-corpus/');

describe('寫錯的字在哪一句', () => {
  const text = {
    en: 'After killing minions, Ahri heals. After taking down a champion, Ahri heals more.',
    zh_TW: '擊殺小兵後，阿璃回血。參與擊殺後，阿璃回更多血。',
    zh_CN: '击杀小兵后，阿狸回血。参与击杀后，阿狸回更多血。',
  };

  it('找到第二句', () => {
    // 第 6 個字是 taking
    expect(unitForWord(text, 6)?.text).toEqual({
      en: 'After taking down a champion, Ahri heals more.',
      zh_TW: '參與擊殺後，阿璃回更多血。',
      zh_CN: '参与击杀后，阿狸回更多血。',
    });
  });

  it('找不到時回傳 null', () => {
    expect(unitForWord(text, 99)).toBeNull();
  });
});
