import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { CollectionStore } from './collection.ts';
import { LearningStore, sentenceCardId } from './db.ts';
import type { SourceRef } from './types.ts';

const source: SourceRef = { type: 'passive', id: 'Ahri' };
const text = { en: 'After killing 9 minions, Ahri heals.', zh_TW: '擊殺9名士兵後，阿璃獲得治療。', zh_CN: '击杀9个小兵后，阿狸会治疗自身。' };

async function setup() {
  const store = new LearningStore(new IDBFactory());
  const collection = new CollectionStore();
  await collection.load(store);
  return { store, collection };
}

describe('收藏', () => {
  it('收藏單字：存原形、字形和例句，並通知更新', async () => {
    const { store, collection } = await setup();
    let changes = 0;
    collection.addEventListener('change', () => changes++);
    await collection.addWord({ word: 'minions', lemma: 'minion', context: { text, source } });
    expect(collection.has('word:minion')).toBe(true);
    expect(changes).toBe(1);
    expect(await store.getCard('word:minion')).toMatchObject({ kind: 'word', word: 'minions', lemma: 'minion', context: { source } });
  });

  it('重複收藏不會變兩張，也不會蓋掉複習進度', async () => {
    const { store, collection } = await setup();
    const first = await collection.addWord({ word: 'minions', lemma: 'minion' });
    await store.putCard({ ...first, fsrs: { ...first.fsrs, reps: 5 } });
    await collection.addWord({ word: 'minion', lemma: 'minion' });
    expect(await store.listCards()).toHaveLength(1);
    expect((await store.getCard('word:minion'))!.fsrs.reps).toBe(5);
  });

  it('收藏句子：記下對齊程度與原聲', async () => {
    const { store, collection } = await setup();
    await collection.addSentence({ unit: { text, alignment: 'sentence' }, source, audio: 'https://wiki.leagueoflegends.com/a.mp3' });
    const id = sentenceCardId(source, text.en);
    expect(collection.has(id)).toBe(true);
    expect(await store.getCard(id)).toMatchObject({ kind: 'sentence', alignment: 'sentence', audio: 'https://wiki.leagueoflegends.com/a.mp3' });
  });

  it('刪除後狀態跟著更新', async () => {
    const { collection } = await setup();
    await collection.addWord({ word: 'orb', lemma: 'orb' });
    await collection.remove('word:orb');
    expect(collection.has('word:orb')).toBe(false);
  });
});
