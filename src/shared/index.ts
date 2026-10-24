// 共用模組的入口。語料庫直接 import；建置時另外打包成 shared/lol-shared.js 給學習 App 載入。
import './components/client-nav.ts';
import './components/item-card.ts';
import './components/quote.ts';
import './components/row-toggles.ts';
import './components/spell.ts';
import './components/trilingual.ts';
import { installSentencePicker } from './components/sentence-picker.ts';
import { installWordPopup } from './components/word-popup.ts';
import { collection } from './collection.ts';
import { loadWordlists } from './data.ts';
import { LearningStore, removeLegacyProbe } from './db.ts';
import { setWordlists } from './dict.ts';
import { diffWords, hintText, isCorrect, normalizeAnswer, ratingFor, sentenceHint, wordsOf } from './grade.ts';
import { recordReviewIn } from './schedule.ts';
import { settings } from './settings.ts';
import type { GradeApi, ReviewOutcome, StudyCard } from './types.ts';

export const API_VERSION = 1;

export const grade: GradeApi = { normalizeAnswer, isCorrect, ratingFor, hintText, sentenceHint, wordsOf, diffWords };

export {
  corpusUrl,
  loadChampion,
  loadChampionIndex,
  loadItems,
  loadMeta,
  loadRunes,
  loadSummoners,
  loadSkinCards,
  loadChromas,
  loadCollectibles,
  loadCollectionLabels,
} from './data.ts';
export { recognitionQuestion } from './challenge.ts';
export { lookupWord } from './dict.ts';
export { planCloze, unitForWord, wordAt } from './practice.ts';
export { sentenceUnits } from './sentences.ts';
export { collection, settings };

let store: LearningStore | null = null;

export function learningStore(): LearningStore {
  store ??= new LearningStore();
  return store;
}

export function recordReview(card: StudyCard, outcome: ReviewOutcome, now?: Date) {
  return recordReviewIn(learningStore(), card, outcome, now);
}

let initialized: Promise<void> | null = null;

export function initShared(): Promise<void> {
  initialized ??= (async () => {
    try {
      removeLegacyProbe();
      await navigator.storage?.persist?.();
    } catch {
      // 不支援就算了，不影響瀏覽
    }
    const [lists] = await Promise.all([
      loadWordlists(),
      // 讀不到資料庫（例如私密瀏覽）時用預設設定，也不能收藏
      settings.load(learningStore()).catch(() => {}),
      collection.load(learningStore()).catch(() => {}),
    ]);
    setWordlists(lists);
    installWordPopup();
    installSentencePicker();
  })();
  return initialized;
}
