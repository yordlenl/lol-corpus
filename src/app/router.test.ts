import { describe, expect, it } from 'vitest';
import { collectionHref, href, parseHash } from './router.ts';

describe('網址與頁面', () => {
  it('沒有網址或看不懂的網址是首頁', () => {
    expect(parseHash('')).toEqual({ page: 'home' });
    expect(parseHash('#/')).toEqual({ page: 'home' });
    expect(parseHash('#/nonsense')).toEqual({ page: 'home' });
  });

  it('收藏的十個欄目', () => {
    expect(parseHash('#/collection/champions')).toEqual({ page: 'collection', tab: 'champions' });
    expect(parseHash('#/collection/emotes')).toEqual({ page: 'collection', tab: 'emotes' });
    expect(parseHash('#/collection/icons/10005')).toEqual({ page: 'collection', tab: 'icons', id: '10005' });
    expect(parseHash('#/collection/items/3157')).toEqual({ page: 'collection', tab: 'items', id: '3157' });
    expect(parseHash('#/collection/xyz')).toEqual({ page: 'collection', tab: 'champions' });
  });

  it('英雄頁的子欄目：技能（預設）、台詞、造型（可以指定第幾款）', () => {
    expect(parseHash('#/collection/champions/Ahri')).toEqual({ page: 'collection', tab: 'champions', id: 'Ahri', section: 'skills' });
    expect(parseHash('#/collection/champions/Ahri/quotes')).toEqual({ page: 'collection', tab: 'champions', id: 'Ahri', section: 'quotes' });
    expect(parseHash('#/collection/champions/Ahri/skins/28')).toEqual({ page: 'collection', tab: 'champions', id: 'Ahri', section: 'skins', skin: 28 });
    expect(parseHash('#/collection/champions/Ahri/whatever')).toEqual({ page: 'collection', tab: 'champions', id: 'Ahri', section: 'skills' });
  });

  it('舊網址對到收藏裡的同一頁', () => {
    expect(parseHash('#/champions')).toEqual({ page: 'collection', tab: 'champions' });
    expect(parseHash('#/champions/Ahri')).toEqual({ page: 'collection', tab: 'champions', id: 'Ahri', section: 'skills' });
    expect(parseHash('#/items/3157')).toEqual({ page: 'collection', tab: 'items', id: '3157' });
    expect(parseHash('#/runes/Domination/8112')).toEqual({ page: 'collection', tab: 'runes' });
    expect(parseHash('#/summoners')).toEqual({ page: 'collection', tab: 'spells' });
  });

  it('產生網址，特殊字元會編碼', () => {
    expect(href()).toBe('#/');
    expect(collectionHref('champions', "Kai'Sa")).toBe("#/collection/champions/Kai'Sa");
    expect(parseHash(collectionHref('champions', 'A B'))).toEqual({ page: 'collection', tab: 'champions', id: 'A B', section: 'skills' });
  });
});
