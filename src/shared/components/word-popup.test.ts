// @vitest-environment happy-dom
// 查詞小視窗收藏單字：按「收藏單字」列出筆記本，點一本收進去，也能直接新增一本。
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { collection } from '../collection.ts';
import { LearningStore } from '../db.ts';
import type { LookupResult, WordEventDetail } from '../types.ts';

vi.mock('../dict.ts', () => ({
  lookupWord: async (key: string): Promise<LookupResult> => ({
    surface: key,
    lemma: key.replace(/s$/, ''),
    entry: { p: "'minjən", t: 'n. 小兵' } as LookupResult['entry'],
  }),
}));

await import('./word-popup.ts');

let store: LearningStore;

beforeEach(async () => {
  store = new LearningStore(new IDBFactory());
  await collection.load(store);
});
afterEach(() => document.body.replaceChildren());

async function open(word: string) {
  const popup = document.createElement('lol-word-popup');
  document.body.append(popup);
  const detail: WordEventDetail = {
    word,
    key: word,
    context: 'body',
    sentence: word,
    text: { en: word, zh_TW: '', zh_CN: '' },
    anchor: { left: 0, top: 0, right: 10, bottom: 10 },
  };
  await popup.open(detail);
  await popup.updateComplete;
  return popup;
}

const root = (popup: HTMLElement) => popup.shadowRoot!;
const mainButton = (popup: HTMLElement) => root(popup).querySelector<HTMLButtonElement>('.actions > .collect')!;
const notebookButtons = (popup: HTMLElement) => [...root(popup).querySelectorAll<HTMLButtonElement>('.notebooks button')];

async function settle(popup: HTMLElement & { updateComplete: Promise<boolean> }) {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await popup.updateComplete;
}

describe('查詞小視窗：收藏到筆記本', () => {
  it('按「收藏單字」才列出筆記本，點一本就收進去並打 ✓', async () => {
    await collection.createNotebook('英雄技能');
    const popup = await open('minions');
    expect(mainButton(popup).textContent!.trim()).toBe('＋ 收藏單字');
    expect(notebookButtons(popup)).toHaveLength(0);

    mainButton(popup).click();
    await popup.updateComplete;
    expect(notebookButtons(popup).map((b) => b.textContent!.trim())).toEqual(['＋ 預設', '＋ 英雄技能']);

    notebookButtons(popup)[1].click();
    await vi.waitFor(() => expect(collection.notebooksOf('word:minion')).toHaveLength(1));
    await settle(popup);
    expect(await store.getCard('word:minion')).toMatchObject({ word: 'minions', lemma: 'minion' });
    expect(notebookButtons(popup).map((b) => [b.textContent!.trim(), b.disabled])).toEqual([
      ['＋ 預設', false],
      ['✓ 英雄技能', true],
    ]);
    expect(mainButton(popup).textContent!.trim()).toBe('已收藏（1 本）');
  });

  it('清單最下面新增一本：新增後直接收進去', async () => {
    const popup = await open('heals');
    mainButton(popup).click();
    await popup.updateComplete;
    const input = root(popup).querySelector<HTMLInputElement>('.new-notebook input')!;
    input.value = '常用字';
    input.dispatchEvent(new InputEvent('input'));
    root(popup).querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await vi.waitFor(() => expect(collection.notebooksOf('word:heal')).toHaveLength(1));
    await settle(popup);
    const nb = collection.notebooks().find((n) => n.name === '常用字')!;
    expect(collection.notebooksOf('word:heal')).toEqual([nb.id]);
    expect(notebookButtons(popup).map((b) => b.textContent!.trim())).toEqual(['＋ 預設', '✓ 常用字']);
  });

  it('新增失敗（同名）顯示原因', async () => {
    const popup = await open('heals');
    mainButton(popup).click();
    await popup.updateComplete;
    const input = root(popup).querySelector<HTMLInputElement>('.new-notebook input')!;
    input.value = '預設';
    input.dispatchEvent(new InputEvent('input'));
    root(popup).querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await settle(popup);
    expect(root(popup).querySelector('.notice')?.textContent).toBe('已經有一本叫「預設」的筆記本');
  });
});
