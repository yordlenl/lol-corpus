import { describe, expect, it } from 'vitest';
import { href, parseHash } from './router.ts';

describe('網址與頁面', () => {
  it('解析各頁網址', () => {
    expect(parseHash('')).toEqual({ page: 'champions' });
    expect(parseHash('#/champions')).toEqual({ page: 'champions' });
    expect(parseHash('#/champions/Ahri')).toEqual({ page: 'champion', id: 'Ahri' });
    expect(parseHash('#/items/3157')).toEqual({ page: 'items', id: '3157' });
    expect(parseHash('#/runes/Domination/8112')).toEqual({ page: 'runes', tree: 'Domination', rune: 8112 });
    expect(parseHash('#/summoners')).toEqual({ page: 'summoners' });
    expect(parseHash('#/nonsense')).toEqual({ page: 'champions' });
  });

  it('產生網址，特殊字元會編碼', () => {
    expect(href('champions', "Kai'Sa")).toBe("#/champions/Kai'Sa");
    expect(parseHash(href('champions', 'A B'))).toEqual({ page: 'champion', id: 'A B' });
  });
});
