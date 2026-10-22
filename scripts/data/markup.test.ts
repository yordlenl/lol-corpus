import { describe, expect, it } from 'vitest';
import { toPlain, toRich } from './markup.ts';

describe('遊戲文字的標記整理', () => {
  it('沒有樣式時回傳一般字串', () => {
    expect(toRich('Deals damage.')).toBe('Deals damage.');
  });

  it('傷害類型、數值、粗體變成樣式片段', () => {
    expect(toRich('<mainText><stats><attention>105</attention> Ability Power</stats><br><active>Time Stop</active></mainText>')).toEqual([
      ['105', 'num'],
      ' Ability Power\n',
      ['Time Stop', 'b'],
    ]);
    expect(toRich('deals <magicDamage>80 magic damage</magicDamage>')).toEqual(['deals ', ['80 magic damage', 'magic']]);
  });

  it('清掉佔位符與 HTML 實體，空白收成一個', () => {
    expect(toRich('Deals {{ qdamage }} damage&nbsp;to   @Target@ enemies')).toBe('Deals damage to enemies');
  });

  it('換行最多保留一個空行，頭尾不留空白', () => {
    expect(toRich('<br>a<br><br><br><br>b<br>')).toBe('a\n\nb');
  });

  it('沒見過的標籤：內容保留、通知建置報告', () => {
    const seen: string[] = [];
    expect(toRich('<weirdTag>hello</weirdTag>', (t) => seen.push(t))).toBe('hello');
    expect(seen).toEqual(['weirdTag']);
  });

  it('faction… 這類標籤不算沒見過', () => {
    const seen: string[] = [];
    toRich('<factionIonia1>Ionia</factionIonia1>', (t) => seen.push(t));
    expect(seen).toEqual([]);
  });

  it('toPlain 只留文字', () => {
    expect(toPlain('<b>Bold</b> text')).toBe('Bold text');
  });
});
