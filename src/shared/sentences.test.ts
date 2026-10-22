import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isSentence, sentenceUnits, splitChinese, splitEnglish } from './sentences.ts';
import type { Champion, Item } from './types.ts';

describe('拆句', () => {
  it('英文照句號拆，縮寫和名字裡的點不拆', () => {
    expect(splitEnglish('Ahri heals. She dashes! Done?')).toEqual(['Ahri heals.', 'She dashes!', 'Done?']);
    expect(splitEnglish('Buy a B. F. Sword first. Then upgrade.')).toEqual(['Buy a B. F. Sword first.', 'Then upgrade.']);
    expect(splitEnglish("'We called them the Thunderlords.' Next")).toEqual(["'We called them the Thunderlords.'", 'Next']);
  });

  it('中文照句號、驚嘆號、問號拆，引號跟著前一句', () => {
    expect(splitChinese('阿璃獲得治療。參與擊殺後，治療更多！')).toEqual(['阿璃獲得治療。', '參與擊殺後，治療更多！']);
    expect(splitChinese('「我們稱呼他們為雷神。」')).toEqual(['「我們稱呼他們為雷神。」']);
  });

  it('數值行不算句子', () => {
    expect(isSentence('105 Ability Power')).toBe(false);
    expect(isSentence('Cooldown: 20s')).toBe(false);
    expect(isSentence('Gain a brief Shield.')).toBe(true);
  });
});

describe('可以收藏的句子與中文對齊', () => {
  it('三種語言句數一樣就逐句對齊', () => {
    const units = sentenceUnits({ en: 'Ahri heals herself. She dashes forward.', zh_TW: '甲。乙。', zh_CN: '甲。乙。' });
    expect(units).toEqual([
      { text: { en: 'Ahri heals herself.', zh_TW: '甲。', zh_CN: '甲。' }, alignment: 'sentence' },
      { text: { en: 'She dashes forward.', zh_TW: '乙。', zh_CN: '乙。' }, alignment: 'sentence' },
    ]);
  });

  it('同一行句數不一樣，中文用整行', () => {
    const units = sentenceUnits({ en: 'Ahri heals herself. She dashes forward.', zh_TW: '甲乙。', zh_CN: '甲乙。' });
    expect(units.map((u) => [u.text.zh_TW, u.alignment])).toEqual([
      ['甲乙。', 'line'],
      ['甲乙。', 'line'],
    ]);
  });

  it('行數不一樣，中文用整段', () => {
    const units = sentenceUnits({ en: 'Ahri heals herself.\nShe dashes forward.', zh_TW: '甲乙。', zh_CN: '甲乙。' });
    expect(units).toHaveLength(2);
    expect(units.every((u) => u.alignment === 'block' && u.text.zh_TW === '甲乙。')).toBe(true);
  });

  it('真實資料：阿璃被動拆成兩句並逐句對齊；中婭沙漏只剩一句', () => {
    const data = new URL('../../public/data/', import.meta.url);
    const ahri = JSON.parse(readFileSync(new URL('champions/Ahri.json', data), 'utf8')) as Champion;
    const passive = sentenceUnits(ahri.passive.description);
    expect(passive.map((u) => u.text.zh_TW)).toEqual(['擊殺9名士兵或野怪後，阿璃獲得治療。', '參與一名敵方英雄的擊殺後，阿璃獲得更大量的治療。']);
    const items = JSON.parse(readFileSync(new URL('items.json', data), 'utf8')) as Item[];
    const zhonya = sentenceUnits(items.find((i) => i.id === '3157')!.description);
    expect(zhonya.map((u) => u.text.en)).toEqual(['Enter Stasis for 2.5 seconds.']);
  });
});
