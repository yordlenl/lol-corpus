// 收藏狀態：哪些單字、句子已經收進生詞本與句子庫，單字在哪幾本筆記本。
// 語料庫各頁和學習 App 共用，收藏有變動時通知元件更新。
import {
  DEFAULT_NOTEBOOK_ID,
  NOTEBOOK_NAME_MAX,
  newNotebookId,
  newSentenceCard,
  newWordCard,
  withDefaultNotebook,
  wordNotebooks,
  type LearningStore,
} from './db.ts';
import type { CardOrigin, CollectionApi, Notebook, SentenceCard, SentenceUnit, SourceRef, WordCard } from './types.ts';

export class CollectionStore extends EventTarget implements CollectionApi {
  private ids = new Set<string>();
  /** 單字卡 id → 在哪幾本筆記本 */
  private words = new Map<string, string[]>();
  private list: Notebook[] = withDefaultNotebook([]);
  private store: LearningStore | null = null;

  async load(store: LearningStore) {
    this.store = store;
    await this.reload();
  }

  async reload() {
    if (!this.store) return;
    const [cards, notebooks] = await Promise.all([this.store.listCards(), this.store.getNotebooks()]);
    this.ids = new Set(cards.map((c) => c.id));
    this.words = new Map(cards.filter((c): c is WordCard => c.kind === 'word').map((c) => [c.id, wordNotebooks(c)]));
    this.list = notebooks;
    this.changed();
  }

  has(id: string) {
    return this.ids.has(id);
  }

  notebooks(): Notebook[] {
    return this.list;
  }

  notebooksOf(id: string): string[] {
    return this.words.get(id) ?? [];
  }

  private changed() {
    this.dispatchEvent(new Event('change'));
  }

  private requireStore(): LearningStore {
    if (!this.store) throw new Error('學習紀錄資料庫還沒準備好');
    return this.store;
  }

  private requireNotebook(id: string): Notebook {
    const notebook = this.list.find((n) => n.id === id);
    if (!notebook) throw new Error('找不到這本筆記本');
    return notebook;
  }

  /** 檢查筆記本名稱，回傳去掉前後空白的名稱；不行就丟出可以直接顯示的錯誤 */
  private checkName(name: string, self?: string): string {
    const clean = name.trim();
    if (!clean) throw new Error('請輸入筆記本名稱');
    if ([...clean].length > NOTEBOOK_NAME_MAX) throw new Error(`筆記本名稱最多 ${NOTEBOOK_NAME_MAX} 個字`);
    if (this.list.some((n) => n.name === clean && n.id !== self)) throw new Error(`已經有一本叫「${clean}」的筆記本`);
    return clean;
  }

  private async saveWord(card: WordCard, notebooks: string[]) {
    await this.requireStore().putCard({ ...card, notebooks });
    this.words.set(card.id, notebooks);
  }

  /** 已經收過的不會重複，也不會蓋掉原本的複習進度，只是多放進這一本 */
  async addWord(input: { word: string; lemma: string; context?: WordCard['context']; notebook?: string }): Promise<WordCard> {
    const store = this.requireStore();
    const notebook = this.requireNotebook(input.notebook ?? DEFAULT_NOTEBOOK_ID).id;
    const card = newWordCard({ word: input.word, lemma: input.lemma, origin: 'corpus', ...(input.context ? { context: input.context } : {}) });
    const existing = (await store.getCard(card.id)) as WordCard | undefined;
    if (existing) {
      const now = wordNotebooks(existing);
      if (now.includes(notebook)) return existing;
      await this.saveWord(existing, [...now, notebook]);
      this.changed();
      return { ...existing, notebooks: [...now, notebook] };
    }
    await this.saveWord(card, [notebook]);
    this.ids.add(card.id);
    this.changed();
    return { ...card, notebooks: [notebook] };
  }

  async createNotebook(name: string): Promise<Notebook> {
    const notebook: Notebook = { id: newNotebookId(), name: this.checkName(name), createdAt: new Date().toISOString() };
    this.list = [...this.list, notebook];
    await this.requireStore().saveNotebooks(this.list);
    this.changed();
    return notebook;
  }

  async renameNotebook(id: string, name: string) {
    this.requireNotebook(id);
    const clean = this.checkName(name, id);
    this.list = this.list.map((n) => (n.id === id ? { ...n, name: clean } : n));
    await this.requireStore().saveNotebooks(this.list);
    this.changed();
  }

  async deleteNotebook(id: string) {
    if (id === DEFAULT_NOTEBOOK_ID) throw new Error('「預設」筆記本不能刪除');
    this.requireNotebook(id);
    const store = this.requireStore();
    for (const card of (await store.listCards('word')) as WordCard[]) {
      const now = wordNotebooks(card);
      if (!now.includes(id)) continue;
      const rest = now.filter((n) => n !== id);
      await this.saveWord(card, rest.length ? rest : [DEFAULT_NOTEBOOK_ID]);
    }
    this.list = this.list.filter((n) => n.id !== id);
    await store.saveNotebooks(this.list);
    this.changed();
  }

  async setWordNotebooks(id: string, notebooks: string[]) {
    const known = new Set(this.list.map((n) => n.id));
    const ids = [...new Set(notebooks)].filter((n) => known.has(n));
    if (!ids.length) throw new Error('至少要放在一本筆記本');
    const card = await this.requireStore().getCard(id);
    if (card?.kind !== 'word') throw new Error('找不到這個單字');
    await this.saveWord(card, ids);
    this.changed();
  }

  async addSentence(input: {
    unit: SentenceUnit;
    source: SourceRef;
    audio?: string;
    origin?: CardOrigin;
  }): Promise<SentenceCard> {
    const store = this.requireStore();
    const card = newSentenceCard({
      text: input.unit.text,
      source: input.source,
      audio: input.audio,
      alignment: input.unit.alignment,
      origin: input.origin ?? 'corpus',
    });
    const existing = await store.getCard(card.id);
    if (existing) return existing as SentenceCard;
    await store.putCard(card);
    this.ids.add(card.id);
    this.changed();
    return card;
  }

  async remove(id: string) {
    await this.requireStore().deleteCard(id);
    this.ids.delete(id);
    this.words.delete(id);
    this.changed();
  }
}

export const collection = new CollectionStore();
