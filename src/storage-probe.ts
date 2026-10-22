// 共用資料測試：確認語料庫和學習 App 在 iPad 上能不能讀到彼此寫進 IndexedDB 的資料。
// 這是第一階段的暫時工具，第二階段的共用模組完成後會移除。學習 App 裡有一份相同的檔案。

export const PROBE_DB_NAME = 'lol-shared-probe';
const STORE = 'marks';

export type SiteId = 'lol-corpus' | 'lol-study';
export type OpenMode = 'standalone' | 'browser';

export interface ProbeMark {
  site: SiteId;
  mode: OpenMode;
  writtenAt: string;
}

export type PersistResult = 'granted' | 'denied' | 'unsupported';

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function openProbeDb(idb: IDBFactory = indexedDB): Promise<IDBDatabase> {
  const request = idb.open(PROBE_DB_NAME, 1);
  request.onupgradeneeded = () => {
    request.result.createObjectStore(STORE, { keyPath: ['site', 'mode'] });
  };
  return requestToPromise(request);
}

export async function writeMark(mark: ProbeMark, idb?: IDBFactory): Promise<void> {
  const db = await openProbeDb(idb);
  try {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(mark);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function readMarks(idb?: IDBFactory): Promise<ProbeMark[]> {
  const db = await openProbeDb(idb);
  try {
    const marks = await requestToPromise(
      db.transaction(STORE, 'readonly').objectStore(STORE).getAll(),
    );
    return (marks as ProbeMark[]).sort((a, b) => b.writtenAt.localeCompare(a.writtenAt));
  } finally {
    db.close();
  }
}

// iPadOS 從主畫面開啟時 navigator.standalone 為 true；其他瀏覽器看 display-mode。
export function detectOpenMode(win: Pick<Window, 'navigator' | 'matchMedia'>): OpenMode {
  const nav = win.navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) return 'standalone';
  return win.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser';
}

export async function requestPersist(storage?: StorageManager): Promise<PersistResult> {
  if (!storage?.persist) return 'unsupported';
  return (await storage.persist()) ? 'granted' : 'denied';
}

const SITE_LABELS: Record<SiteId, string> = {
  'lol-corpus': '語料庫',
  'lol-study': '學習 App',
};

const MODE_LABELS: Record<OpenMode, string> = {
  standalone: '主畫面 App',
  browser: 'Safari 分頁',
};

const PERSIST_LABELS: Record<PersistResult, string> = {
  granted: '已核准（資料不會被自動清除）',
  denied: '未核准',
  unsupported: '這個瀏覽器不支援',
};

export const siteLabel = (site: SiteId) => SITE_LABELS[site];
export const modeLabel = (mode: OpenMode) => MODE_LABELS[mode];
export const persistLabel = (result: PersistResult) => PERSIST_LABELS[result];

// 不指定 timeZone 時用裝置自己的時區。自己拼字串，因為各瀏覽器在日期和時間之間放的空白字元不一樣。
export function formatTime(iso: string, timeZone?: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(iso));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)!.value;
  return `${get('year')}/${get('month')}/${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`;
}
