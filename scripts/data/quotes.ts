// 台詞：讀 content/quotes.json 並檢查。檢查規則改寫自 lol-english 的 scripts/lib/voices.mjs。
import type { Quote } from '../../src/shared/types.ts';

export interface QuotesFile {
  schema: number;
  attribution: string;
  license: string;
  licenseUrl: string;
  derivedFrom: string;
  quotes: Quote[];
}

const WIKI_HOST = 'wiki.leagueoflegends.com';
const TRANSLATION_KINDS = new Set(['original', 'official', 'learning', '']);

function isWikiUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === WIKI_HOST && !url.username && !url.password;
  } catch {
    return false;
  }
}

/** 有問題就丟出錯誤，訊息寫明是哪一條 */
export function validateQuotes(file: QuotesFile, championIds: string[]): void {
  if (file.schema !== 1 || !Array.isArray(file.quotes)) throw new Error('quotes.json 格式不正確');
  const ids = new Set<string>();
  for (const q of file.quotes) {
    const fail = (why: string) => {
      throw new Error(`台詞有問題（${q.id}）：${why}`);
    };
    if (!q.id || ids.has(q.id)) fail('id 空白或重複');
    ids.add(q.id);
    if (q.id !== `${q.champion}/${q.voiceSet}/${q.id.split('/').pop()}`) fail('id 和英雄、語音組不一致');
    for (const lang of ['en', 'zh_TW', 'zh_CN'] as const) {
      const text = q.text[lang];
      if (typeof text !== 'string' || !text.trim()) fail(`${lang} 文字空白`);
      if (/[<>]/.test(text)) fail(`${lang} 文字有角括號`);
    }
    if (/\p{Script=Han}/u.test(q.text.en)) fail('英文裡有中文字');
    if (q.audio.en && !isWikiUrl(q.audio.en)) fail('英文原聲網址不是 LoL Wiki 的 https 網址');
    if (!isWikiUrl(q.source) || !/oldid=\d+/.test(q.source)) fail('來源要是 LoL Wiki 的固定版本網址');
    for (const kind of Object.values(q.translation)) if (!TRANSLATION_KINDS.has(kind)) fail(`譯文性質不認得：${kind}`);
  }
  for (const id of championIds) {
    const own = file.quotes.filter((q) => q.champion === id);
    if (!own.some((q) => q.event === 'pick')) throw new Error(`缺少選用台詞：${id}`);
    if (!own.some((q) => q.event === 'ban')) throw new Error(`缺少禁用台詞：${id}`);
  }
}
