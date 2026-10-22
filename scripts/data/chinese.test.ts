import { describe, expect, it } from 'vitest';
import { findSimplified, toTraditional } from './chinese.ts';

describe('簡繁轉換', () => {
  it('只換字形，詞語判斷正確', () => {
    expect(toTraditional('让我终结这一切！干扰 头发 皇后')).toBe('讓我終結這一切！干擾 頭髮 皇后');
  });
});

describe('簡體字檢查', () => {
  it('抓得到簡體字', () => {
    expect(findSimplified('这是学习页面')).toEqual(['这', '学', '习', '页']);
  });

  it('兩岸共用字和台灣字形不算簡體', () => {
    expect(findSimplified('干擾 台灣 游標 污染 杰西 痴 床 峰 唇 祕 么點 傢伙 倒霉 占星')).toEqual([]);
  });

  it('繁體介面文字沒有問題', () => {
    expect(findSimplified('英雄聯盟遊戲文字・三行對照、點字查義')).toEqual([]);
  });
});
