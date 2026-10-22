import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { LearningStore, newWordCard } from './db.ts';
import { recordReviewIn, scheduleReview } from './schedule.ts';

const NOW = new Date('2026-10-23T10:00:00.000Z');
const DAY = 86_400_000;
const daysUntil = (iso: string) => Math.round((new Date(iso).getTime() - NOW.getTime()) / DAY);
const fresh = () => newWordCard({ word: 'minions', lemma: 'minion', origin: 'corpus' }, NOW);

describe('排程（自動評分對應）', () => {
  it('新卡寫錯（Again）：明天再考', () => {
    const { card, log } = scheduleReview(fresh(), { rating: 1, mode: 'word', hinted: false }, NOW);
    expect(daysUntil(card.fsrs.due)).toBe(1);
    expect(log).toMatchObject({ cardId: 'word:minion', rating: 1, wasNew: true, nextDue: card.fsrs.due });
  });

  it('間隔以天為單位，一次寫對比用提示才對隔得久', () => {
    const hard = scheduleReview(fresh(), { rating: 2, mode: 'word', hinted: true }, NOW).card;
    const good = scheduleReview(fresh(), { rating: 3, mode: 'word', hinted: false }, NOW).card;
    expect(daysUntil(hard.fsrs.due)).toBeGreaterThanOrEqual(1);
    expect(daysUntil(good.fsrs.due)).toBeGreaterThanOrEqual(daysUntil(hard.fsrs.due));
  });

  it('第二次作答就不是新卡了', () => {
    const first = scheduleReview(fresh(), { rating: 3, mode: 'word', hinted: false }, NOW).card;
    const later = new Date(first.fsrs.due);
    const second = scheduleReview(first, { rating: 3, mode: 'word', hinted: false }, later);
    expect(second.log.wasNew).toBe(false);
    expect(new Date(second.card.fsrs.due).getTime()).toBeGreaterThan(later.getTime() + DAY);
  });

  it('練習寫錯記下的紀錄會標成 practice', () => {
    const { log } = scheduleReview(fresh(), { rating: 1, mode: 'cloze', hinted: false, source: 'practice' }, NOW);
    expect(log.source).toBe('practice');
  });

  it('作答結果存回卡片，並寫一筆複習紀錄', async () => {
    const store = new LearningStore(new IDBFactory());
    await store.putCard(fresh());
    const { card } = await recordReviewIn(store, fresh(), { rating: 3, mode: 'word', hinted: false }, NOW);
    expect((await store.getCard('word:minion'))!.fsrs.due).toBe(card.fsrs.due);
    expect(await store.listReviewLogs('word:minion')).toHaveLength(1);
  });
});
