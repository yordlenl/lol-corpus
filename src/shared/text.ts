// 英文分詞與歸一。建置腳本（收集詞典要查的詞）和網頁（點字查義）共用這一份，兩邊才不會切得不一樣。
// 規則改寫自 lol-english 的 scripts/lib/text.mjs。

import type { Rich } from './types.ts';

export interface TextSegment {
  type: 'text';
  value: string;
}

export interface WordSegment {
  type: 'word';
  value: string;
  /** 歸一後的查詢鍵 */
  key: string;
}

export type Segment = TextSegment | WordSegment;

// 只抓拉丁字母詞，保留撇號，champion's、don't 才切得對
const TOKEN_RE = /[A-Za-z]+(?:['’][A-Za-z]+)*/g;

/** 歸一：小寫 → 去所有格 → 去縮寫字尾 */
export function normalize(token: string): string {
  return token
    .toLowerCase()
    .replace(/’/g, "'")
    .replace(/^(.+)'s$/, '$1')
    .replace(/n't$/, '')
    .replace(/'(ll|re|ve|d|m)$/, '');
}

/** 把英文切成「一般文字」和「單字」，拼回去和原文完全一樣。一個字母的（a、I）不算單字。 */
export function segment(text: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN_RE)) {
    if (m[0].length < 2) continue;
    if (m.index > last) out.push({ type: 'text', value: text.slice(last, m.index) });
    out.push({ type: 'word', value: m[0], key: normalize(m[0]) });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ type: 'text', value: text.slice(last) });
  return out;
}

/** 一段文字裡出現過的所有詞（歸一後） */
export function collectWords(text: string): Set<string> {
  const words = new Set<string>();
  for (const seg of segment(text)) {
    if (seg.type === 'word' && seg.key.length >= 2) words.add(seg.key);
  }
  return words;
}

/** 有格式的文字轉成純文字 */
export function richToPlain(rich: Rich): string {
  if (typeof rich === 'string') return rich;
  return rich.map((run) => (typeof run === 'string' ? run : run[0])).join('');
}

// ---------- 韓文的漢字標註 ----------
// 漢諺混寫的韓文把「漢字和它上面的諺文」直接寫在文字裡：RUBY_OPEN 漢字 RUBY_MID 諺文 RUBY_CLOSE。
// 這三個是 Unicode 專門給行間註解用的符號，遊戲文字裡不會出現。

export const RUBY_OPEN = '\uFFF9';
export const RUBY_MID = '\uFFFA';
export const RUBY_CLOSE = '\uFFFB';

const RUBY_PATTERN = /\uFFF9([^\uFFF9-\uFFFB]*)\uFFFA([^\uFFF9-\uFFFB]*)\uFFFB/g;

/** 把一段漢字寫成帶標註的形式 */
export const ruby = (base: string, reading: string) => `${RUBY_OPEN}${base}${RUBY_MID}${reading}${RUBY_CLOSE}`;

/** 拆成一段一段：一般文字是字串，帶標註的是 [漢字, 諺文] */
export function rubyParts(text: string): Array<string | [base: string, reading: string]> {
  const parts: Array<string | [string, string]> = [];
  let last = 0;
  for (const m of text.matchAll(RUBY_PATTERN)) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push([m[1], m[2]]);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

/** 去掉標註，漢字換回諺文（等於官方的韓文原文） */
export const rubyToReading = (text: string) => text.replace(RUBY_PATTERN, '$2');

/** 去掉標註，只留漢字（漢諺混寫的純文字） */
export const rubyToBase = (text: string) => text.replace(RUBY_PATTERN, '$1');
