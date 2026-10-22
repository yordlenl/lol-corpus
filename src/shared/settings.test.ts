import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { LearningStore } from './db.ts';
import { SettingsStore } from './settings.ts';

describe('設定', () => {
  it('關掉一行：通知元件重畫，並存進資料庫', async () => {
    const db = new LearningStore(new IDBFactory());
    const settings = new SettingsStore();
    await settings.load(db);
    let changes = 0;
    settings.addEventListener('change', () => changes++);
    await settings.setRow('zh_CN', false);
    expect(changes).toBe(1);
    expect(settings.current.rows).toEqual({ en: true, zh_TW: true, zh_CN: false });
    expect((await db.getSettings()).rows.zh_CN).toBe(false);
  });
});
