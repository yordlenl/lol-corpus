// 複習排程：用 ts-fsrs 算下次複習日。評分由練習結果自動決定（spec「自動評分對應」）。
import { fsrs, generatorParameters, type Grade } from 'ts-fsrs';
import { fsrsToState, stateToFsrs, type LearningStore } from './db.ts';
import type { ReviewLog, ReviewOutcome, StudyCard } from './types.ts';

// 間隔一律以天為單位（不做同一天內隔幾分鐘再考），並加一點隨機錯開，避免同一天收的詞擠在同一天。
const scheduler = fsrs(generatorParameters({ enable_short_term: false, enable_fuzz: true }));

/** FSRS 的「新卡」狀態 */
export const STATE_NEW = 0;

/** 只算出作答後的卡片和紀錄，不存檔 */
export function scheduleReview<T extends StudyCard>(card: T, outcome: ReviewOutcome, now: Date): { card: T; log: ReviewLog } {
  const result = scheduler.next(stateToFsrs(card.fsrs), now, outcome.rating as Grade);
  const next = { ...card, fsrs: fsrsToState(result.card) };
  const log: ReviewLog = {
    cardId: card.id,
    rating: outcome.rating,
    reviewedAt: now.toISOString(),
    mode: outcome.mode,
    hinted: outcome.hinted,
    wasNew: card.fsrs.state === STATE_NEW,
    nextDue: next.fsrs.due,
    ...(outcome.source ? { source: outcome.source } : {}),
  };
  return { card: next, log };
}

/** 算出下次複習、存回卡片、寫一筆複習紀錄 */
export async function recordReviewIn(
  store: LearningStore,
  card: StudyCard,
  outcome: ReviewOutcome,
  now = new Date(),
): Promise<{ card: StudyCard; log: ReviewLog }> {
  const { card: next, log } = scheduleReview(card, outcome, now);
  await store.putCard(next);
  const id = await store.addReviewLog(log);
  return { card: next, log: { ...log, id } };
}
