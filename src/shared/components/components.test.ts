// @vitest-environment happy-dom
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { collection } from '../collection.ts';
import { LearningStore, sentenceCardId } from '../db.ts';
import { setWordlists } from '../dict.ts';
import { settings } from '../settings.ts';
import type { Quote, WordEventDetail } from '../types.ts';
import './quote.ts';
import './trilingual.ts';

beforeAll(async () => {
  setWordlists({ skip: ['the', 'of'], softSkip: ['ahri'] });
  await collection.load(new LearningStore(new IDBFactory()));
});
afterEach(async () => {
  document.body.replaceChildren();
  await settings.update({ rows: { en: true, zh_TW: true, zh_CN: true } });
});

async function mount<K extends 'lol-trilingual' | 'lol-quote'>(tag: K, props: Partial<HTMLElementTagNameMap[K]>) {
  const el = Object.assign(document.createElement(tag), props);
  document.body.append(el);
  await el.updateComplete;
  return el;
}

const rowsOf = (el: Element) => [...el.shadowRoot!.querySelectorAll('.row')].map((r) => r.classList[1]);

describe('<lol-trilingual>', () => {
  const text = { en: 'Ahri throws the orb.', zh_TW: '阿璃擲出幻玉。', zh_CN: '阿狸掷出宝珠。' };

  it('三行都顯示，關掉一行就隱藏', async () => {
    const el = await mount('lol-trilingual', { text });
    expect(rowsOf(el)).toEqual(['en', 'zh_TW', 'zh_CN']);
    await settings.setRow('zh_CN', false);
    await el.updateComplete;
    expect(rowsOf(el)).toEqual(['en', 'zh_TW']);
  });

  it('正文裡功能詞和英雄名不能點，其餘可以', async () => {
    const el = await mount('lol-trilingual', { text });
    const words = [...el.shadowRoot!.querySelectorAll('.w')].map((w) => w.textContent);
    expect(words).toEqual(['throws', 'orb']);
  });

  it('名稱裡英雄名可以點', async () => {
    const el = await mount('lol-trilingual', { text: { en: 'Ahri', zh_TW: '阿璃', zh_CN: '阿狸' }, context: 'name' });
    expect([...el.shadowRoot!.querySelectorAll('.w')].map((w) => w.textContent)).toEqual(['Ahri']);
  });

  it('收藏句子：只有一句時按了直接收，按鈕變成已收藏', async () => {
    const source = { type: 'spell' as const, id: 'Ahri/Q' };
    const el = await mount('lol-trilingual', { text, source, collectable: true });
    const button = el.shadowRoot!.querySelector<HTMLButtonElement>('.collect')!;
    expect(button.textContent).toContain('收藏句子');
    button.click();
    await new Promise((r) => setTimeout(r, 50));
    await el.updateComplete;
    expect(collection.has(sentenceCardId(source, 'Ahri throws the orb.'))).toBe(true);
    expect(el.shadowRoot!.querySelector('.collect')!.textContent).toContain('已收藏句子');
  });

  it('好幾句時，按了發出挑句子事件', async () => {
    const source = { type: 'passive' as const, id: 'Ahri' };
    const el = await mount('lol-trilingual', {
      text: { en: 'Ahri heals a bit. Ahri heals much more.', zh_TW: '阿璃回一點血。阿璃回更多血。', zh_CN: '阿狸回一点血。阿狸回更多血。' },
      source,
      collectable: true,
    });
    let units = 0;
    document.addEventListener('lol-pick-sentence', (e) => (units = (e as CustomEvent).detail.units.length), { once: true });
    el.shadowRoot!.querySelector<HTMLButtonElement>('.collect')!.click();
    expect(units).toBe(2);
  });

  it('名稱、沒有出處、數值行都沒有收藏句子按鈕', async () => {
    const name = await mount('lol-trilingual', { text: { en: 'Ahri', zh_TW: '阿璃', zh_CN: '阿狸' }, context: 'name', collectable: true, source: { type: 'champion', id: 'Ahri' } });
    const noSource = await mount('lol-trilingual', { text, collectable: true });
    const stats = await mount('lol-trilingual', { text: { en: '105 Ability Power', zh_TW: '105 魔法攻擊', zh_CN: '105 法术强度' }, collectable: true, source: { type: 'item', id: '3157' } });
    for (const el of [name, noSource, stats]) expect(el.shadowRoot!.querySelector('.collect')).toBeNull();
  });

  it('點單字發出 lol-word 事件，帶著整段英文', async () => {
    const el = await mount('lol-trilingual', { text });
    let detail: WordEventDetail | null = null;
    document.addEventListener('lol-word', (e) => (detail = (e as CustomEvent<WordEventDetail>).detail), { once: true });
    el.shadowRoot!.querySelector<HTMLElement>('.w')!.click();
    expect(detail).toMatchObject({ word: 'throws', key: 'throws', sentence: 'Ahri throws the orb.', context: 'body' });
  });
});

describe('<lol-quote>', () => {
  const quote: Quote = {
    id: 'Ahri/base/pick-1',
    champion: 'Ahri',
    voiceSet: 'base',
    event: 'pick',
    text: { en: '"A clever fox is never caught."', zh_TW: '聰明的狐狸從不會被抓住。', zh_CN: '聪明的狐狸从不会被抓住。', ko: '' },
    audio: { en: 'https://wiki.leagueoflegends.com/a.mp3', zh_TW: '', zh_CN: '', ko: '' },
    translation: { en: 'original', zh_TW: 'learning', zh_CN: 'learning', ko: '' },
    source: 'https://wiki.leagueoflegends.com/en-us/Ahri/Audio?oldid=1',
  };

  it('顯示情境、播放鍵、來源，兩行中文都標學習譯文', async () => {
    const el = await mount('lol-quote', { quote });
    const root = el.shadowRoot!;
    expect(root.querySelector('.event')!.textContent).toBe('選用台詞');
    expect(root.querySelector('button')!.textContent).toContain('播放原聲');
    expect(root.querySelector('a')!.getAttribute('href')).toBe(quote.source);
    const tri = root.querySelector('lol-trilingual')!;
    await tri.updateComplete;
    expect([...tri.shadowRoot!.querySelectorAll('.badge')].map((b) => b.textContent)).toEqual(['學習譯文', '學習譯文']);
  });

  it('虛構語言的台詞，英文單字不能點', async () => {
    const el = await mount('lol-quote', { quote: { ...quote, text: { ...quote.text, en: '"Gnar gada!"' }, fictionalLanguage: true } });
    const tri = el.shadowRoot!.querySelector('lol-trilingual')!;
    await tri.updateComplete;
    expect(tri.shadowRoot!.querySelectorAll('.w')).toHaveLength(0);
    expect(el.shadowRoot!.textContent).toContain('虛構語言');
  });
});
