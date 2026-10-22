// 查詞與「哪些字能點」的規則（略過規則沿用 lol-english）。
import { loadDictionary } from './data.ts';
import type { Dictionary, LookupResult, TextContext, Wordlists } from './types.ts';

let skip = new Set<string>();
let softSkip = new Set<string>();

export function setWordlists(lists: Wordlists) {
  skip = new Set(lists.skip);
  softSkip = new Set(lists.softSkip);
}

/** 功能詞任何地方都不能點；遊戲自創詞和英雄名只在名稱裡能點 */
export function isClickable(key: string, context: TextContext): boolean {
  if (key.length < 2 || skip.has(key)) return false;
  return context === 'name' || !softSkip.has(key);
}

export function lookupIn(dict: Dictionary, key: string): LookupResult {
  const lemma = dict.forms[key] ?? key;
  const entry = dict.words[lemma] ?? dict.words[key] ?? null;
  return { surface: key, lemma: entry && dict.words[lemma] ? lemma : key, entry };
}

export async function lookupWord(key: string): Promise<LookupResult> {
  return lookupIn(await loadDictionary(), key);
}
