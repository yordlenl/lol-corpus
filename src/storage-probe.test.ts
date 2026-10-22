import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import {
  detectOpenMode,
  formatTime,
  modeLabel,
  persistLabel,
  readMarks,
  requestPersist,
  siteLabel,
  writeMark,
} from './storage-probe';

function fakeWindow(standalone: boolean | undefined, displayModeStandalone: boolean) {
  return {
    navigator: { standalone } as unknown as Navigator,
    matchMedia: (() => ({ matches: displayModeStandalone })) as unknown as Window['matchMedia'],
  };
}

describe('共用資料測試的讀寫', () => {
  it('還沒寫入時讀到空清單', async () => {
    expect(await readMarks(new IDBFactory())).toEqual([]);
  });

  it('一個網站寫入的資料，另一個網站讀得到（同一個資料庫）', async () => {
    const idb = new IDBFactory();
    await writeMark({ site: 'lol-corpus', mode: 'browser', writtenAt: '2026-10-22T10:00:00.000Z' }, idb);
    await writeMark({ site: 'lol-study', mode: 'browser', writtenAt: '2026-10-22T11:00:00.000Z' }, idb);

    const marks = await readMarks(idb);
    expect(marks.map((m) => m.site)).toEqual(['lol-study', 'lol-corpus']);
  });

  it('同一個網站、同一種開啟方式再寫一次，只留最新的一筆', async () => {
    const idb = new IDBFactory();
    await writeMark({ site: 'lol-corpus', mode: 'standalone', writtenAt: '2026-10-22T10:00:00.000Z' }, idb);
    await writeMark({ site: 'lol-corpus', mode: 'standalone', writtenAt: '2026-10-22T12:00:00.000Z' }, idb);
    await writeMark({ site: 'lol-corpus', mode: 'browser', writtenAt: '2026-10-22T11:00:00.000Z' }, idb);

    const marks = await readMarks(idb);
    expect(marks).toEqual([
      { site: 'lol-corpus', mode: 'standalone', writtenAt: '2026-10-22T12:00:00.000Z' },
      { site: 'lol-corpus', mode: 'browser', writtenAt: '2026-10-22T11:00:00.000Z' },
    ]);
  });
});

describe('判斷開啟方式', () => {
  it('iPadOS 從主畫面開啟（navigator.standalone）', () => {
    expect(detectOpenMode(fakeWindow(true, false))).toBe('standalone');
  });

  it('其他瀏覽器的 display-mode: standalone', () => {
    expect(detectOpenMode(fakeWindow(undefined, true))).toBe('standalone');
  });

  it('一般瀏覽器分頁', () => {
    expect(detectOpenMode(fakeWindow(false, false))).toBe('browser');
  });
});

describe('申請持久儲存', () => {
  it('瀏覽器核准', async () => {
    expect(await requestPersist({ persist: async () => true } as StorageManager)).toBe('granted');
  });

  it('瀏覽器拒絕', async () => {
    expect(await requestPersist({ persist: async () => false } as StorageManager)).toBe('denied');
  });

  it('瀏覽器不支援', async () => {
    expect(await requestPersist(undefined)).toBe('unsupported');
  });
});

describe('畫面文字', () => {
  it('全部是繁體中文', () => {
    expect(siteLabel('lol-corpus')).toBe('語料庫');
    expect(siteLabel('lol-study')).toBe('學習 App');
    expect(modeLabel('standalone')).toBe('主畫面 App');
    expect(modeLabel('browser')).toBe('Safari 分頁');
    expect(persistLabel('granted')).toBe('已核准（資料不會被自動清除）');
  });

  it('時間用 24 小時制顯示', () => {
    expect(formatTime('2026-10-22T15:04:05.000Z', 'UTC')).toBe('2026/10/22 15:04:05');
  });
});
