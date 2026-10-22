import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  FORMAT_VERSION,
  LearningStore,
  fsrsToState,
  newSentenceCard,
  newWordCard,
  stateToFsrs,
} from './db.ts';
import type { SourceRef } from './types.ts';

const NOW = new Date('2026-10-22T10:00:00.000Z');
const source: SourceRef = { type: 'spell', id: 'Ahri/Q' };

describe('卡片', () => {
  it('單字卡用原形當 id，排程從新卡開始', () => {
    const card = newWordCard({ word: 'attacks', lemma: 'attack', origin: 'corpus' }, NOW);
    expect(card.id).toBe('word:attack');
    expect(card.fsrs.due).toBe(NOW.toISOString());
    expect(card.fsrs.reps).toBe(0);
  });

  it('同一句話、同一個出處，句子卡 id 一樣', () => {
    const text = { en: 'Ahri throws out her orb.', zh_TW: '阿璃擲出幻玉。', zh_CN: '阿狸掷出宝珠。' };
    const a = newSentenceCard({ text, source, origin: 'corpus' }, NOW);
    const b = newSentenceCard({ text, source, origin: 'practice' }, NOW);
    expect(a.id).toBe(b.id);
    expect(a.id.startsWith('sentence:spell:Ahri/Q:')).toBe(true);
  });

  it('排程欄位轉成字串再轉回來不變', () => {
    const fsrs = stateToFsrs(newWordCard({ word: 'x', lemma: 'x', origin: 'corpus' }, NOW).fsrs);
    expect(fsrs.due).toEqual(NOW);
    expect(fsrsToState(fsrs).due).toBe(NOW.toISOString());
  });
});

describe('學習紀錄資料庫', () => {
  it('沒存過設定時用預設值', async () => {
    const store = new LearningStore(new IDBFactory());
    expect(await store.getSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('存設定、讀設定', async () => {
    const store = new LearningStore(new IDBFactory());
    await store.saveSettings({ rows: { en: true, zh_TW: false, zh_CN: true }, dailyNew: 30 });
    expect(await store.getSettings()).toEqual({ rows: { en: true, zh_TW: false, zh_CN: true }, dailyNew: 30 });
  });

  it('新增、查詢、依種類列出、刪除卡片', async () => {
    const store = new LearningStore(new IDBFactory());
    const word = newWordCard({ word: 'orb', lemma: 'orb', origin: 'corpus' }, NOW);
    const sentence = newSentenceCard({ text: { en: 'A', zh_TW: '甲', zh_CN: '甲' }, source, origin: 'corpus' }, NOW);
    await store.putCard(word);
    await store.putCard(sentence);
    expect(await store.getCard('word:orb')).toEqual(word);
    expect((await store.listCards('sentence')).map((c) => c.id)).toEqual([sentence.id]);
    await store.deleteCard('word:orb');
    expect(await store.getCard('word:orb')).toBeUndefined();
  });

  it('匯出再匯入（取代）後紀錄完整', async () => {
    const a = new LearningStore(new IDBFactory());
    await a.putCard(newWordCard({ word: 'orb', lemma: 'orb', origin: 'corpus' }, NOW));
    await a.addReviewLog({ cardId: 'word:orb', rating: 3, reviewedAt: NOW.toISOString(), mode: 'cloze', hinted: false });
    await a.saveSettings({ ...DEFAULT_SETTINGS, dailyNew: 15 });
    const file = await a.exportAll();
    expect(file.formatVersion).toBe(FORMAT_VERSION);

    const b = new LearningStore(new IDBFactory());
    await b.putCard(newWordCard({ word: 'old', lemma: 'old', origin: 'corpus' }, NOW));
    expect(await b.importAll(JSON.parse(JSON.stringify(file)), 'replace')).toEqual({ cards: 1, reviewLogs: 1 });
    const again = await b.exportAll();
    expect(again.cards).toEqual(file.cards);
    expect(again.reviewLogs).toEqual(file.reviewLogs);
    expect(again.settings.dailyNew).toBe(15);
  });

  it('不是這個網站的備份檔、或格式版本比較新，都拒絕匯入', async () => {
    const store = new LearningStore(new IDBFactory());
    const file = await store.exportAll();
    await expect(store.importAll({ ...file, app: 'other' as 'lol-english' }, 'merge')).rejects.toThrow('不是 LoL 英語的備份檔');
    await expect(store.importAll({ ...file, formatVersion: FORMAT_VERSION + 1 }, 'merge')).rejects.toThrow('請先更新網站');
  });
});
