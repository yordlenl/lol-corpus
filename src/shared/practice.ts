// 練習用的共用功能：挖空選詞要的資料（詞典、專有名詞、生詞本）、找出某個字所在的句子。
import { chooseBlanks, wordAt as wordAtPlain, wordOffset, type ClozeContext } from './cloze.ts';
import { collection } from './collection.ts';
import { loadDictionary, loadNames } from './data.ts';
import { wordCardId } from './db.ts';
import { isClickable } from './dict.ts';
import { sentenceUnits } from './sentences.ts';
import { richToPlain } from './text.ts';
import type { Rich, SentenceUnit, Tri } from './types.ts';

const EASY_TAGS = new Set(['zk', 'gk', 'cet4']);

export async function clozeContext(): Promise<ClozeContext> {
  const [dict, names] = await Promise.all([loadDictionary(), loadNames()]);
  const lemma = (key: string) => dict.forms[key] ?? key;
  return {
    names,
    allowed: (key) => isClickable(key, 'body'),
    collected: (key) => collection.has(wordCardId(lemma(key))),
    difficulty: (key) => {
      const w = dict.words[lemma(key)] ?? dict.words[key];
      if (!w) return 0;
      const rank = Math.min(w.bnc ?? Infinity, w.frq ?? Infinity);
      const easy = (w.g ?? '').split(' ').some((t) => EASY_TAGS.has(t));
      return (w.r ? 100_000 : 0) + (Number.isFinite(rank) ? rank : 30_000) - (easy ? 5_000 : 0);
    },
  };
}

export async function planCloze(text: Rich): Promise<number[]> {
  return chooseBlanks(richToPlain(text), await clozeContext());
}

export const wordAt = (text: Rich, index: number) => wordAtPlain(richToPlain(text), index);

export function unitForWord(text: Tri<Rich>, index: number): SentenceUnit | null {
  const en = richToPlain(text.en);
  const at = wordOffset(en, index);
  if (at < 0) return null;
  let cursor = 0;
  for (const unit of sentenceUnits(text)) {
    const start = en.indexOf(unit.text.en, cursor);
    if (start < 0) continue;
    cursor = start + unit.text.en.length;
    if (at >= start && at < cursor) return unit;
  }
  return null;
}
