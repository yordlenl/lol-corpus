// @vitest-environment happy-dom
// 裝備商店和符文頁（清單、格子兩種檢視）的互動：資料直接從 public/data 讀，不經過網路。
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../shared/index.ts', () => {
  // happy-dom 環境裡 import.meta.url 不是檔案路徑，改用專案根目錄（測試從根目錄執行）
  const read = (file: string) => JSON.parse(readFileSync(`public/data/${file}`, 'utf8'));
  return {
    corpusUrl: (path: string) => `/${path}`,
    loadItems: async () => read('items.json'),
    loadRunes: async () => read('runes.json'),
  };
});

const { PageItems } = await import('./items.ts');
const { PageRunes } = await import('./runes.ts');
const { RuneGrid } = await import('./rune-grid.ts');
const { defaultPicks } = await import('./rune-picks.ts');
const runeData = JSON.parse(readFileSync('public/data/runes.json', 'utf8'));
const labels = JSON.parse(readFileSync('public/data/collection/labels.json', 'utf8'));

async function mount<T extends HTMLElement & { updateComplete: Promise<boolean> }>(el: T, ready: (el: T) => boolean) {
  document.body.append(el);
  await vi.waitFor(() => expect(ready(el)).toBe(true));
  await el.updateComplete;
  return el;
}

const pointer = (el: Element, type: string, pointerType = 'touch') =>
  el.dispatchEvent(new PointerEvent(type, { bubbles: true, composed: true, pointerType }));

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe('裝備商店', () => {
  const mountShop = (selectedId?: string) => {
    const page = new PageItems();
    page.selectedId = selectedId;
    return mount(page, (p) => Boolean(p.querySelector('.shop')));
  };

  it('點屬性篩選會切換；長按只顯示名稱、不切換', async () => {
    const page = await mountShop();
    const crit = () => page.querySelector<HTMLButtonElement>('.stat-filter[aria-label^="暴擊"]')!;
    crit().click();
    await page.updateComplete;
    expect(crit().getAttribute('aria-pressed')).toBe('true');

    vi.useFakeTimers();
    pointer(crit(), 'pointerdown');
    vi.advanceTimersByTime(500);
    await page.updateComplete;
    expect(page.querySelector('.shop-hint')?.textContent).toBe('暴擊（Critical Strike）');
    pointer(crit(), 'pointerup');
    crit().click();
    await page.updateComplete;
    expect(crit().getAttribute('aria-pressed')).toBe('true');
    vi.advanceTimersByTime(2000);
    await page.updateComplete;
    expect(page.querySelector('.shop-hint')).toBeNull();
  });

  it('清空篩選把職業和屬性都還原', async () => {
    const page = await mountShop();
    page.querySelectorAll<HTMLButtonElement>('.role-filter')[1].click();
    page.querySelector<HTMLButtonElement>('.stat-filter')!.click();
    await page.updateComplete;
    page.querySelector<HTMLButtonElement>('.stat-clear')!.click();
    await page.updateComplete;
    expect(page.querySelector('.role-filter.on')?.getAttribute('aria-label')).toBe('全部道具');
    expect(page.querySelectorAll('.stat-filter.on')).toHaveLength(0);
  });

  it('選了裝備：右側有可合成（補滿 7 格）、合成樹、描述', async () => {
    const page = await mountShop('1036'); // Long Sword
    const slots = page.querySelectorAll('.into-slot');
    const filled = page.querySelectorAll('a.into-slot');
    expect(slots.length % 7).toBe(0);
    expect(filled.length).toBeGreaterThan(7);
    expect(page.querySelector('.tree-item.current')?.getAttribute('href')).toBe('#/items/1036');
    expect(page.querySelector('lol-item-card')).not.toBeNull();
    expect(page.querySelector('.shop-item.current')?.getAttribute('href')).toBe('#/items/1036');
  });

  it('升級前後互相連得到：凜冬將至 ↔ 芬布爾之冬', async () => {
    const page = await mountShop('3119');
    const titles = () => [...page.querySelectorAll('.upgrade-title')].map((h) => h.textContent!.trim());
    expect(titles()).toEqual(['升級後 UPGRADES TO']);
    expect(page.querySelector('.upgrade-link')?.getAttribute('href')).toBe('#/items/3121');

    page.selectedId = '3121';
    await page.updateComplete;
    expect(titles()).toEqual(['升級自 UPGRADED FROM']);
    expect(page.querySelector('.upgrade-link')?.getAttribute('href')).toBe('#/items/3119');
    expect(page.querySelector('.tree-item.current .shop-price')?.textContent).toBe('升級');
  });

  it('還沒選裝備時，可合成是 7 個空格，下面有提示', async () => {
    const page = await mountShop();
    expect(page.querySelectorAll('.into-slot.empty')).toHaveLength(7);
    expect(page.querySelector('.side-hint')).not.toBeNull();
  });
});

describe('符文頁（格子檢視）', () => {
  const mountRunes = () => {
    const grid = new RuneGrid();
    grid.data = runeData;
    grid.picks = defaultPicks(runeData);
    return mount(grid, (p) => Boolean(p.querySelector('.rune-page')));
  };

  it('點符文：選起來並跳出說明、通知外面；點別的地方就關掉', async () => {
    const page = await mountRunes();
    let changed = 0;
    page.addEventListener('picks-change', () => changed++);
    const second = page.querySelectorAll<HTMLButtonElement>('.primary .keystones .rune-pick')[1];
    second.click();
    await page.updateComplete;
    expect(changed).toBe(1);
    expect(page.querySelector('.primary .keystones .rune-pick.on')).toBe(second);
    expect(page.querySelector('.rune-tip')?.getAttribute('aria-label')).toBe(second.getAttribute('aria-label'));

    // 點說明視窗裡面、查詞視窗：不關
    pointer(page.querySelector('.rune-tip')!, 'pointerdown');
    const popup = document.createElement('lol-word-popup');
    document.body.append(popup);
    pointer(popup, 'pointerdown');
    await page.updateComplete;
    expect(page.querySelector('.rune-tip')).not.toBeNull();

    pointer(page.querySelector('.rune-page')!, 'pointerdown');
    await page.updateComplete;
    expect(page.querySelector('.rune-tip')).toBeNull();
  });

  it('副系選單裡沒有主系；點屬性碎片會換掉同一排的', async () => {
    const page = await mountRunes();
    const primary = page.querySelector('.primary .tree-pick.on')!.getAttribute('aria-label');
    const secondaryChoices = [...page.querySelectorAll('.secondary .tree-pick')].map((b) => b.getAttribute('aria-label'));
    expect(secondaryChoices).toHaveLength(4);
    expect(secondaryChoices).not.toContain(primary);

    const row = page.querySelectorAll('.shard-row')[0];
    const third = row.querySelectorAll<HTMLButtonElement>('.rune-pick')[2];
    third.click();
    await page.updateComplete;
    expect(row.querySelectorAll('.rune-pick.on')).toHaveLength(1);
    expect(third.classList.contains('on')).toBe(true);
  });
});

describe('符文頁（清單檢視，照遊戲的選符文畫面）', () => {
  const mountEditor = () => {
    const page = new PageRunes();
    page.labels = labels;
    return mount(page, (p) => Boolean(p.querySelector('.rune-editor')));
  };
  const lineNames = (page: Element, side: string) => [...page.querySelectorAll(`.${side} .rune-line-name`)].map((n) => n.textContent);

  it('主系顯示系別名稱和兩行官方標語、關鍵符文和三排小符文；副系兩個符文和三排碎片', async () => {
    const page = await mountEditor();
    const head = page.querySelector('.primary .rune-tree-text')!.textContent!.replace(/\s+/g, '');
    expect(head).toBe(`精準${labels.runeTrees.Precision.slogan.zh_TW}${labels.runeTrees.Precision.tagline.zh_TW}`.replace(/\s+/g, ''));
    expect(page.querySelector('.primary .keystone-heading')?.textContent).toBe(labels.keystones.zh_TW);
    expect(lineNames(page, 'primary')).toHaveLength(4);
    expect(lineNames(page, 'secondary')).toHaveLength(2);
    expect(page.querySelectorAll('.secondary .rune-line.shard')).toHaveLength(3);
  });

  it('點關鍵符文的圖示跳出那一排的選項，選了就換掉並跳出說明', async () => {
    const page = await mountEditor();
    page.querySelector<HTMLButtonElement>('.primary .rune-line.keystone .rune-line-icon')!.click();
    await page.updateComplete;
    const options = page.querySelectorAll<HTMLButtonElement>('.primary .rune-choices-row .rune-choice');
    expect(options).toHaveLength(runeData.trees.find((t: { key: string }) => t.key === 'Precision').slots[0].length);
    options[2].click();
    await page.updateComplete;
    expect(page.querySelector('.primary .rune-choices-row')).toBeNull();
    expect(lineNames(page, 'primary')[0]).toBe(options[2].getAttribute('aria-label'));
    expect(page.querySelector('.rune-tip')?.getAttribute('aria-label')).toBe(options[2].getAttribute('aria-label'));
  });

  it('副系的選項是三排共九個；換主系成副系那一系時兩系對調', async () => {
    const page = await mountEditor();
    page.querySelector<HTMLButtonElement>('.secondary .rune-line .rune-line-icon')!.click();
    await page.updateComplete;
    expect(page.querySelectorAll('.secondary .rune-choices-row .rune-choice')).toHaveLength(9);

    page.querySelector<HTMLButtonElement>('.primary .rune-tree-ring')!.click();
    await page.updateComplete;
    page.querySelector<HTMLButtonElement>('.primary .rune-choice.tree[aria-label="征服"]')!.click();
    await page.updateComplete;
    expect(page.querySelector('.primary .rune-tree-name')?.textContent).toBe('征服');
    expect(page.querySelector('.secondary .rune-tree-name')?.textContent).toBe('精準');
  });

  it('切到格子檢視，選的還是一樣；在格子裡改了，切回清單也跟著改', async () => {
    const page = await mountEditor();
    page.querySelector<HTMLButtonElement>('.rune-view-toggle button[aria-label="格子"]')!.click();
    await page.updateComplete;
    const grid = page.querySelector('rune-grid')!;
    await (grid as unknown as { updateComplete: Promise<boolean> }).updateComplete;
    const keystone = grid.querySelectorAll<HTMLButtonElement>('.primary .keystones .rune-pick')[3];
    keystone.click();
    await page.updateComplete;
    page.querySelector<HTMLButtonElement>('.rune-view-toggle button[aria-label="清單"]')!.click();
    await page.updateComplete;
    expect(lineNames(page, 'primary')[0]).toBe(keystone.getAttribute('aria-label'));
  });
});
