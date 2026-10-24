// @vitest-environment happy-dom
// 收藏頁：欄目、英雄格子、英雄頁三個子欄目、造型輪播、表情／頭像等格子、召喚師技能。資料直接從 public/data 讀。
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../shared/index.ts', () => {
  const read = (file: string) => JSON.parse(readFileSync(`public/data/${file}`, 'utf8'));
  return {
    corpusUrl: (path: string) => `/${path}`,
    loadItems: async () => read('items.json'),
    loadRunes: async () => read('runes.json'),
    loadChampionIndex: async () => read('champions.json'),
    loadChampion: async (id: string) => read(`champions/${id}.json`),
    loadSummoners: async () => read('summoners.json'),
    loadSkinCards: async () => read('collection/skins.json'),
    loadChromas: async () => read('collection/chromas.json'),
    loadCollectibles: async (kind: string) => read(`collection/${kind}.json`),
    loadCollectionLabels: async () => read('collection/labels.json'),
  };
});

const { PageCollection } = await import('./collection.ts');
const { PageChampions, sortChampions } = await import('./champions.ts');
const { PageChampion, thumbWindow } = await import('./champion.ts');
const { PageCollectibles } = await import('./collectibles.ts');
const { PageSummoners, sortSpells, spellModes } = await import('./summoners.ts');
const { skinBorder } = await import('../images.ts');
const labels = JSON.parse(readFileSync('public/data/collection/labels.json', 'utf8'));
const champions = JSON.parse(readFileSync('public/data/champions.json', 'utf8'));

async function mount<T extends HTMLElement & { updateComplete: Promise<boolean> }>(el: T, ready: (el: T) => boolean) {
  document.body.append(el);
  await vi.waitFor(() => expect(ready(el)).toBe(true));
  await el.updateComplete;
  return el;
}

afterEach(() => document.body.replaceChildren());

describe('收藏的欄目', () => {
  it('十個欄目照遊戲順序，名稱用客戶端的官方繁中', async () => {
    const page = new PageCollection();
    page.route = { page: 'collection', tab: 'items' };
    page.labels = labels;
    await mount(page, (p) => Boolean(p.querySelector('lol-client-tabs')));
    const tabs = page.querySelector('lol-client-tabs')!.tabs;
    expect(tabs.map((t) => t.label)).toEqual(['英雄', '造型', '表情', '符文', '召喚師技能', '道具', '頭像', '偵察守衛', '炫彩造型', '終結特效']);
    expect(tabs.find((t) => t.on)?.label).toBe('道具');
    expect(page.querySelector('page-items')).not.toBeNull();
  });
});

describe('英雄格子', () => {
  it('依繁中名稱的筆畫排，第一位是厄薩斯（和遊戲一樣）；可以反過來', () => {
    expect(sortChampions(champions)[0].name.zh_TW).toBe('厄薩斯');
    expect(sortChampions(champions, false).at(-1)?.name.zh_TW).toBe('厄薩斯');
  });

  it('搜尋和職業篩選一起用', async () => {
    const page = await mount(new PageChampions(), (p) => Boolean(p.querySelector('.champion-card')));
    expect(page.querySelectorAll('.champion-card')).toHaveLength(champions.length);
    const select = page.querySelector<HTMLSelectElement>('select')!;
    select.value = 'Mage';
    select.dispatchEvent(new Event('change'));
    const search = page.querySelector<HTMLInputElement>('input')!;
    search.value = '阿璃';
    search.dispatchEvent(new InputEvent('input'));
    await page.updateComplete;
    expect([...page.querySelectorAll('.champion-card')].map((a) => a.getAttribute('href'))).toEqual(['#/collection/champions/Ahri']);
  });
});

describe('英雄頁', () => {
  const mountChampion = (section: 'skills' | 'quotes' | 'skins', skinNum?: number) => {
    const page = new PageChampion();
    page.championId = 'Ahri';
    page.section = section;
    page.skinNum = skinNum;
    return mount(page, (p) => Boolean(p.querySelector('.champion-bar')));
  };

  it('三個子欄目：技能、台詞、造型', async () => {
    const page = await mountChampion('skills');
    expect([...page.querySelectorAll('.champion-section')].map((a) => a.textContent)).toEqual(['技能', '台詞', '造型']);
  });

  it('技能：一排五個圖示，點哪個就顯示那一招', async () => {
    const page = await mountChampion('skills');
    const icons = page.querySelectorAll<HTMLButtonElement>('.ability-icon');
    expect(icons).toHaveLength(5);
    icons[1].click();
    await page.updateComplete;
    expect(page.querySelector('lol-spell')?.getAttribute('slot-label')).toBe('Q');
  });

  it('台詞：選用和禁用台詞都在', async () => {
    const page = await mountChampion('quotes');
    expect(page.querySelectorAll('lol-quote').length).toBeGreaterThanOrEqual(2);
  });

  it('造型：原版也在，停在網址指定的那一款，下面有故事介紹和縮圖', async () => {
    const page = await mountChampion('skins', 28);
    expect(page.querySelector('.skin-title')?.textContent).toContain('K/DA ALL OUT');
    expect(page.querySelector('.skin-story')).not.toBeNull();
    expect(page.querySelector('.skin-thumb.on')?.getAttribute('href')).toBe('#/collection/champions/Ahri/skins/28');
    const original = await mountChampion('skins');
    expect(original.querySelector('.skin-title')?.textContent).toContain('阿璃');
  });

  it('縮圖一次五張，選到的盡量在中間', () => {
    expect(thumbWindow(20, 0)).toEqual([0, 1, 2, 3, 4]);
    expect(thumbWindow(20, 10)).toEqual([8, 9, 10, 11, 12]);
    expect(thumbWindow(20, 19)).toEqual([15, 16, 17, 18, 19]);
    expect(thumbWindow(3, 1)).toEqual([0, 1, 2]);
  });
});

describe('造型卡片的邊框', () => {
  it('依造型等級用客戶端的邊框；原版和 rare 用一般的框', () => {
    expect(skinBorder('epic')).toBe('img/client/ui/skin-border-epic.png');
    expect(skinBorder('ultimate')).toBe('img/client/ui/skin-border-ultimate.png');
    expect(skinBorder('base')).toBe('img/client/ui/skin-border-normal.png');
    expect(skinBorder('rare')).toBe('img/client/ui/skin-border-normal.png');
  });
});

describe('表情、頭像、偵察守衛、終結特效', () => {
  it('頭像五千多個，一次只畫一批；可以搜尋；點了在右邊看三行名稱和說明', async () => {
    const page = new PageCollectibles();
    page.kind = 'icons';
    page.selectedId = '10005';
    await mount(page, (p) => Boolean(p.querySelector('.collectible')));
    expect(page.querySelectorAll('.collectible').length).toBe(150);
    expect(page.querySelector('.grow-sentinel')).not.toBeNull();
    expect(page.querySelector('.collectible-detail lol-trilingual')).not.toBeNull();

    const search = page.querySelector<HTMLInputElement>('input')!;
    search.value = 'Superstar';
    search.dispatchEvent(new InputEvent('input'));
    await page.updateComplete;
    expect(page.querySelectorAll('.collectible').length).toBeLessThan(150);
    expect([...page.querySelectorAll('.collectible')].some((a) => a.getAttribute('href') === '#/collection/icons/10005')).toBe(true);
  });

  it('終結特效六個全部列出', async () => {
    const page = new PageCollectibles();
    page.kind = 'finishers';
    await mount(page, (p) => Boolean(p.querySelector('.collectible')));
    expect(page.querySelectorAll('.collectible')).toHaveLength(6);
  });
});

describe('召喚師技能', () => {
  const spells = JSON.parse(readFileSync('public/data/summoners.json', 'utf8'));

  it('依召喚師等級排；可用模式用客戶端的官方名稱，不重複', () => {
    const sorted = sortSpells(spells);
    for (let i = 1; i < sorted.length; i++) expect(sorted[i].summonerLevel).toBeGreaterThanOrEqual(sorted[i - 1].summonerLevel);
    const heal = spells.find((s: { id: string }) => s.id === 'SummonerHeal');
    expect(spellModes(heal, labels)).toEqual(['教學模式', '經典模式', '隨機單中']);
    expect(new Set(spellModes(heal, labels)).size).toBe(spellModes(heal, labels).length);
  });

  it('選到的顯示名稱、召喚師等級、說明和冷卻時間', async () => {
    const page = new PageSummoners();
    page.labels = labels;
    page.selectedId = 'SummonerFlash';
    await mount(page, (p) => Boolean(p.querySelector('.spell-info')));
    expect(page.querySelector('.spell-cell.on')?.getAttribute('href')).toBe('#/collection/spells/SummonerFlash');
    expect(page.querySelector('.spell-level')?.textContent).toMatch(/召喚師等級 \d+/);
    expect(page.querySelector('.spell-cooldown')?.textContent).toMatch(/冷卻時間：\s*\d+ 秒/);
  });
});
