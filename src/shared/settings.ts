// 設定（三行開關等）。改了就存進資料庫，並通知所有元件重畫。
import { DEFAULT_SETTINGS, type LearningStore } from './db.ts';
import type { Lang, Settings, SettingsApi } from './types.ts';

export class SettingsStore extends EventTarget implements SettingsApi {
  private value: Settings = structuredClone(DEFAULT_SETTINGS);
  private store: LearningStore | null = null;

  get current(): Settings {
    return this.value;
  }

  async load(store: LearningStore) {
    this.store = store;
    await this.reload();
  }

  async reload() {
    if (!this.store) return;
    this.value = await this.store.getSettings();
    this.dispatchEvent(new Event('change'));
  }

  async update(patch: Partial<Settings>) {
    this.value = {
      ...this.value,
      ...patch,
      rows: { ...this.value.rows, ...patch.rows },
      speech: { ...this.value.speech, ...patch.speech },
    };
    this.dispatchEvent(new Event('change'));
    await this.store?.saveSettings(this.value);
  }

  setRow(lang: Lang, visible: boolean) {
    return this.update({ rows: { ...this.value.rows, [lang]: visible } });
  }
}

export const settings = new SettingsStore();
