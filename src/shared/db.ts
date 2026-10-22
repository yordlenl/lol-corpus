// 學習紀錄資料庫：生詞本、句子庫、複習紀錄、設定。
// 格式只在這裡定義一次，語料庫和學習 App 都透過它讀寫。
import { createEmptyCard, type Card } from 'ts-fsrs';
import type {
  Alignment,
  CardOrigin,
  ExportFile,
  FsrsState,
  LearningStoreApi,
  ReviewLog,
  SentenceCard,
  Settings,
  SourceRef,
  StudyCard,
  Tri,
  WordCard,
} from './types.ts';

export const DB_NAME = 'lol-english';
/** IndexedDB 的結構版本：加資料表或索引時加一 */
export const DB_VERSION = 1;
/** 匯出 JSON 的格式版本：欄位有不相容的變動時加一 */
export const FORMAT_VERSION = 1;

export const DEFAULT_SETTINGS: Settings = {
  rows: { en: true, zh_TW: true, zh_CN: true },
  dailyNew: 20,
};

const CARDS = 'cards';
const LOGS = 'reviewLogs';
const SETTINGS = 'settings';
const SETTINGS_KEY = 'app';

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export function openLearningDb(idb: IDBFactory = indexedDB): Promise<IDBDatabase> {
  const req = idb.open(DB_NAME, DB_VERSION);
  req.onupgradeneeded = () => {
    const db = req.result;
    const cards = db.createObjectStore(CARDS, { keyPath: 'id' });
    cards.createIndex('kind', 'kind');
    cards.createIndex('due', 'fsrs.due');
    const logs = db.createObjectStore(LOGS, { keyPath: 'id', autoIncrement: true });
    logs.createIndex('cardId', 'cardId');
    logs.createIndex('reviewedAt', 'reviewedAt');
    db.createObjectStore(SETTINGS, { keyPath: 'key' });
  };
  return request(req);
}

export function fsrsToState(card: Card): FsrsState {
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    ...(card.last_review ? { last_review: card.last_review.toISOString() } : {}),
  };
}

export function stateToFsrs(state: FsrsState): Card {
  return {
    ...state,
    due: new Date(state.due),
    last_review: state.last_review ? new Date(state.last_review) : undefined,
  };
}

/** 短雜湊（FNV-1a），用來替句子卡產生固定的 id */
function hash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

export const wordCardId = (lemma: string) => `word:${lemma}`;
export const sentenceCardId = (source: SourceRef, en: string) => `sentence:${source.type}:${source.id}:${hash(en)}`;

export function newWordCard(
  input: { word: string; lemma: string; origin: CardOrigin; context?: WordCard['context'] },
  now = new Date(),
): WordCard {
  return {
    id: wordCardId(input.lemma),
    kind: 'word',
    word: input.word,
    lemma: input.lemma,
    ...(input.context ? { context: input.context } : {}),
    addedAt: now.toISOString(),
    origin: input.origin,
    fsrs: fsrsToState(createEmptyCard(now)),
  };
}

export function newSentenceCard(
  input: { text: Tri; source: SourceRef; origin: CardOrigin; audio?: string; alignment?: Alignment },
  now = new Date(),
): SentenceCard {
  return {
    id: sentenceCardId(input.source, input.text.en),
    kind: 'sentence',
    text: input.text,
    source: input.source,
    ...(input.audio ? { audio: input.audio } : {}),
    ...(input.alignment ? { alignment: input.alignment } : {}),
    addedAt: now.toISOString(),
    origin: input.origin,
    fsrs: fsrsToState(createEmptyCard(now)),
  };
}

export class LearningStore implements LearningStoreApi {
  private readonly idb: IDBFactory;
  private db: Promise<IDBDatabase> | null = null;

  constructor(idb: IDBFactory = indexedDB) {
    this.idb = idb;
  }

  private open() {
    this.db ??= openLearningDb(this.idb);
    return this.db;
  }

  private async store(name: string, mode: IDBTransactionMode) {
    const tx = (await this.open()).transaction(name, mode);
    return { tx, store: tx.objectStore(name) };
  }

  async getSettings(): Promise<Settings> {
    const { store } = await this.store(SETTINGS, 'readonly');
    const row = (await request(store.get(SETTINGS_KEY))) as { value: Settings } | undefined;
    const saved = row?.value;
    return {
      ...DEFAULT_SETTINGS,
      ...saved,
      rows: { ...DEFAULT_SETTINGS.rows, ...saved?.rows },
    };
  }

  async saveSettings(settings: Settings): Promise<void> {
    const { tx, store } = await this.store(SETTINGS, 'readwrite');
    store.put({ key: SETTINGS_KEY, value: settings });
    await done(tx);
  }

  async putCard(card: StudyCard): Promise<void> {
    const { tx, store } = await this.store(CARDS, 'readwrite');
    store.put(card);
    await done(tx);
  }

  async getCard(id: string): Promise<StudyCard | undefined> {
    const { store } = await this.store(CARDS, 'readonly');
    return request(store.get(id));
  }

  async listCards(kind?: StudyCard['kind']): Promise<StudyCard[]> {
    const { store } = await this.store(CARDS, 'readonly');
    return request(kind ? store.index('kind').getAll(kind) : store.getAll());
  }

  async deleteCard(id: string): Promise<void> {
    const { tx, store } = await this.store(CARDS, 'readwrite');
    store.delete(id);
    await done(tx);
  }

  async addReviewLog(log: ReviewLog): Promise<number> {
    const { tx, store } = await this.store(LOGS, 'readwrite');
    const { id: _ignored, ...rest } = log;
    const id = (await request(store.add(rest))) as number;
    await done(tx);
    return id;
  }

  async listReviewLogs(cardId?: string): Promise<ReviewLog[]> {
    const { store } = await this.store(LOGS, 'readonly');
    return request(cardId ? store.index('cardId').getAll(cardId) : store.getAll());
  }

  async exportAll(): Promise<ExportFile> {
    return {
      app: 'lol-english',
      formatVersion: FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      cards: await this.listCards(),
      reviewLogs: await this.listReviewLogs(),
      settings: await this.getSettings(),
    };
  }

  /**
   * replace：先清空再匯入。
   * merge：同 id 的卡片以檔案為準，其餘保留；同一張卡、同一時間的複習紀錄已經有了就跳過（同一個檔案匯入兩次不會重複）。
   * 回傳匯入的卡片數與實際新增的複習紀錄數。
   */
  async importAll(file: ExportFile, mode: 'replace' | 'merge'): Promise<{ cards: number; reviewLogs: number }> {
    if (file?.app !== 'lol-english') throw new Error('這不是 LoL 英語的備份檔');
    if (typeof file.formatVersion !== 'number' || file.formatVersion > FORMAT_VERSION) {
      throw new Error(`備份檔格式版本 ${file.formatVersion} 比這個網站新，請先更新網站再匯入`);
    }
    const logKey = (log: ReviewLog) => `${log.cardId}|${log.reviewedAt}`;
    const existing = mode === 'merge' ? new Set((await this.listReviewLogs()).map(logKey)) : new Set<string>();
    const db = await this.open();
    const tx = db.transaction([CARDS, LOGS, SETTINGS], 'readwrite');
    const cards = tx.objectStore(CARDS);
    const logs = tx.objectStore(LOGS);
    if (mode === 'replace') {
      cards.clear();
      logs.clear();
    }
    for (const card of file.cards) cards.put(card);
    let added = 0;
    for (const log of file.reviewLogs) {
      if (existing.has(logKey(log))) continue;
      existing.add(logKey(log));
      const { id: _ignored, ...rest } = log;
      logs.add(mode === 'replace' && log.id != null ? log : rest);
      added++;
    }
    tx.objectStore(SETTINGS).put({ key: SETTINGS_KEY, value: file.settings });
    await done(tx);
    return { cards: file.cards.length, reviewLogs: added };
  }
}

/** 刪掉第一階段的「共用資料測試」資料庫 */
export function removeLegacyProbe(idb: IDBFactory = indexedDB) {
  idb.deleteDatabase('lol-shared-probe');
}
