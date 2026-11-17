// 把韓文接到三語資料上：alt 是「簡中那一格放韓文」的同一份資料。
import { describe, expect, it } from 'vitest';
import type { Rich } from '../../src/shared/types.ts';
import { attachKo } from './korean.ts';

const mixed = (text: Rich) => (typeof text === 'string' ? `混:${text}` : text);
const tri = (en: string, zh_TW: string, zh_CN: string) => ({ en, zh_TW, zh_CN });

describe('把韓文接到三語資料上', () => {
  it('每段文字多一個 ko（轉成漢諺混寫），巢狀和清單裡的也會處理', () => {
    const main = { name: tri('Lux', '拉克絲', '拉克丝'), spells: [{ name: tri('Light Binding', '光束縛', '光之束缚') }], icon: 'img/x.png' };
    const alt = { name: tri('Lux', '拉克絲', '럭스'), spells: [{ name: tri('Light Binding', '光束縛', '빛의 속박') }], icon: 'img/x.png' };
    expect(attachKo(main, alt, mixed)).toBe(2);
    expect(main.name).toEqual({ en: 'Lux', zh_TW: '拉克絲', zh_CN: '拉克丝', ko: '混:럭스' });
    expect(main.spells[0].name).toMatchObject({ ko: '混:빛의 속박' });
  });

  it('沒有韓文的不放：韓文是空的、退回英文的、其實是寫死的中文、台詞', () => {
    const main = {
      empty: tri('', '', ''),
      fallback: tri('Emote', '表情', '表情'),
      label: tri('Passive', '被動', '被动'),
      quotes: [{ text: tri('Hello', '你好', '你好') }],
    };
    const alt = {
      empty: tri('', '', ''),
      fallback: tri('Emote', '表情', 'Emote'),
      label: tri('Passive', '被動', '被动'),
      quotes: [{ text: tri('Hello', '你好', '안녕') }],
    };
    expect(attachKo(main, alt, mixed)).toBe(0);
    expect(JSON.stringify(main)).not.toContain('ko');
  });

  it('三種語言都一樣的數字照樣放（不含漢字就不是寫死的中文）', () => {
    const main = { cost: tri('50', '50', '50'), key: tri('Q', 'Q', 'Q') };
    expect(attachKo(main, { cost: tri('50', '50', '50 골드'), key: tri('Q', 'Q', 'Q') }, mixed)).toBe(1);
    expect(main.cost).toMatchObject({ ko: '混:50 골드' });
  });

  it('兩份資料的形狀不一樣就停下來，不會亂接', () => {
    expect(() => attachKo([tri('a', 'b', 'c')], [], mixed)).toThrow('形狀');
  });
});
