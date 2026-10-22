// 共用模組的入口。語料庫直接 import；建置時另外打包成 shared/lol-shared.js 給學習 App 載入。
import './components/item-card.ts';
import './components/quote.ts';
import './components/spell.ts';
import './components/trilingual.ts';
import { installWordPopup } from './components/word-popup.ts';
import { loadWordlists } from './data.ts';
import { LearningStore, removeLegacyProbe } from './db.ts';
import { setWordlists } from './dict.ts';
import { settings } from './settings.ts';

export const API_VERSION = 1;

export {
  corpusUrl,
  loadChampion,
  loadChampionIndex,
  loadItems,
  loadMeta,
  loadRunes,
  loadSummoners,
} from './data.ts';
export { lookupWord } from './dict.ts';
export { settings };

let store: LearningStore | null = null;

export function learningStore(): LearningStore {
  store ??= new LearningStore();
  return store;
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
      settings.load(learningStore()).catch(() => {
        // 讀不到資料庫（例如私密瀏覽）時用預設設定
      }),
    ]);
    setWordlists(lists);
    installWordPopup();
  })();
  return initialized;
}
