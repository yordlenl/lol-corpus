import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { CollectionStore } from './collection.ts';
import { LearningStore, newWordCard, sentenceCardId } from './db.ts';
import type { SourceRef, WordCard } from './types.ts';

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

describe('單字筆記本', () => {
  it('一開始只有「預設」；舊的單字卡（沒有筆記本欄位）算在「預設」', async () => {
    const store = new LearningStore(new IDBFactory());
    await store.putCard(newWordCard({ word: 'orb', lemma: 'orb', origin: 'corpus' }));
    const collection = new CollectionStore();
    await collection.load(store);
    expect(collection.notebooks().map((n) => [n.id, n.name])).toEqual([['default', '預設']]);
    expect(collection.notebooksOf('word:orb')).toEqual(['default']);
  });

  it('收藏時選一本；同一個字再收進別本，還是一張卡、複習進度不變', async () => {
    const { store, collection } = await setup();
    const heroes = await collection.createNotebook('英雄技能');
    const first = await collection.addWord({ word: 'minions', lemma: 'minion', notebook: heroes.id });
    expect(collection.notebooksOf('word:minion')).toEqual([heroes.id]);
    await store.putCard({ ...first, fsrs: { ...first.fsrs, reps: 5 } });
    await collection.addWord({ word: 'minion', lemma: 'minion' });
    expect(collection.notebooksOf('word:minion')).toEqual([heroes.id, 'default']);
    expect(await store.listCards()).toHaveLength(1);
    expect(await store.getCard('word:minion')).toMatchObject({ notebooks: [heroes.id, 'default'], fsrs: { reps: 5 } });
  });

  it('筆記本名稱：去掉前後空白；空白、超過 20 個字、同名都擋下', async () => {
    const { store, collection } = await setup();
    expect((await collection.createNotebook('  裝備  ')).name).toBe('裝備');
    await expect(collection.createNotebook('   ')).rejects.toThrow('請輸入筆記本名稱');
    await expect(collection.createNotebook('字'.repeat(21))).rejects.toThrow('最多 20 個字');
    await expect(collection.createNotebook('裝備')).rejects.toThrow('已經有一本叫「裝備」的筆記本');
    await expect(collection.createNotebook('預設')).rejects.toThrow('已經有一本叫「預設」');
    expect((await store.getNotebooks()).map((n) => n.name)).toEqual(['預設', '裝備']);
  });

  it('改名：存起來；改成自己原本的名字不算同名；「預設」也能改名', async () => {
    const { store, collection } = await setup();
    const nb = await collection.createNotebook('裝備');
    await collection.renameNotebook(nb.id, '裝備');
    await collection.renameNotebook(nb.id, '常用裝備');
    await collection.renameNotebook('default', '常用字');
    expect((await store.getNotebooks()).map((n) => n.name)).toEqual(['常用字', '常用裝備']);
    await expect(collection.renameNotebook(nb.id, '常用字')).rejects.toThrow('已經有一本');
  });

  it('刪除筆記本：只在這本的字搬到「預設」，也在別本的只拿掉這本；「預設」不能刪', async () => {
    const { store, collection } = await setup();
    const a = await collection.createNotebook('甲');
    const b = await collection.createNotebook('乙');
    await collection.addWord({ word: 'orb', lemma: 'orb', notebook: a.id });
    await collection.addWord({ word: 'heal', lemma: 'heal', notebook: a.id });
    await collection.addWord({ word: 'heal', lemma: 'heal', notebook: b.id });
    await collection.deleteNotebook(a.id);
    expect(collection.notebooks().map((n) => n.name)).toEqual(['預設', '乙']);
    expect(collection.notebooksOf('word:orb')).toEqual(['default']);
    expect(collection.notebooksOf('word:heal')).toEqual([b.id]);
    expect(await store.listCards()).toHaveLength(2);
    await expect(collection.deleteNotebook('default')).rejects.toThrow('「預設」筆記本不能刪除');
  });

  it('改單字放在哪幾本：至少要一本，不存在的筆記本略過', async () => {
    const { store, collection } = await setup();
    const nb = await collection.createNotebook('裝備');
    await collection.addWord({ word: 'orb', lemma: 'orb' });
    await collection.setWordNotebooks('word:orb', [nb.id, 'nope', nb.id]);
    expect((await store.getCard('word:orb')) as WordCard).toMatchObject({ notebooks: [nb.id] });
    await expect(collection.setWordNotebooks('word:orb', [])).rejects.toThrow('至少要放在一本筆記本');
    await expect(collection.addWord({ word: 'x', lemma: 'x', notebook: 'nope' })).rejects.toThrow('找不到這本筆記本');
  });

  it('刪掉單字卡後不在任何一本', async () => {
    const { collection } = await setup();
    await collection.addWord({ word: 'orb', lemma: 'orb' });
    await collection.remove('word:orb');
    expect(collection.notebooksOf('word:orb')).toEqual([]);
  });
});
