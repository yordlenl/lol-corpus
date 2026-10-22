// 收藏狀態：哪些單字、句子已經收進生詞本與句子庫。語料庫各頁和學習 App 共用，收藏有變動時通知元件更新。
import { newSentenceCard, newWordCard, type LearningStore } from './db.ts';
import type { CollectionApi, SentenceCard, SentenceUnit, SourceRef, WordCard } from './types.ts';

export class CollectionStore extends EventTarget implements CollectionApi {
  private ids = new Set<string>();
  private store: LearningStore | null = null;

  async load(store: LearningStore) {
    this.store = store;
    await this.reload();
  }

  async reload() {
    if (!this.store) return;
    this.ids = new Set((await this.store.listCards()).map((c) => c.id));
    this.dispatchEvent(new Event('change'));
  }

  has(id: string) {
    return this.ids.has(id);
  }

  private requireStore(): LearningStore {
    if (!this.store) throw new Error('學習紀錄資料庫還沒準備好');
    return this.store;
  }

  /** 已經收過的不會重複，也不會蓋掉原本的複習進度 */
  async addWord(input: { word: string; lemma: string; context?: WordCard['context'] }): Promise<WordCard> {
    const store = this.requireStore();
    const card = newWordCard({ ...input, origin: 'corpus' });
    const existing = await store.getCard(card.id);
    if (existing) return existing as WordCard;
    await store.putCard(card);
    this.ids.add(card.id);
    this.dispatchEvent(new Event('change'));
    return card;
  }

  async addSentence(input: { unit: SentenceUnit; source: SourceRef; audio?: string }): Promise<SentenceCard> {
    const store = this.requireStore();
    const card = newSentenceCard({
      text: input.unit.text,
      source: input.source,
      audio: input.audio,
      alignment: input.unit.alignment,
      origin: 'corpus',
    });
    const existing = await store.getCard(card.id);
    if (existing) return existing as SentenceCard;
    await store.putCard(card);
    this.ids.add(card.id);
    this.dispatchEvent(new Event('change'));
    return card;
  }

  async remove(id: string) {
    await this.requireStore().deleteCard(id);
    this.ids.delete(id);
    this.dispatchEvent(new Event('change'));
  }
}

export const collection = new CollectionStore();
