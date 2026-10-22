// 挖空選詞（spec「挖空選詞規則」）：
// 每句挖 1 個，長句（能挖的字 8 個以上）挖 2 個；優先挖生詞本裡的詞，其次挖較難的詞。
// 不挖：數字和數值公式、專有名詞（整個名稱）、功能詞與遊戲自創詞、兩個字母以下的字、句中大寫開頭的字（多半是名稱）。
import { isSentence, splitEnglish } from './sentences.ts';
import { segment } from './text.ts';

export interface ClozeContext {
  /** 專有名詞，長的在前 */
  names: string[];
  /** 這個字能不能挖（略過規則） */
  allowed(key: string): boolean;
  /** 這個字在生詞本裡嗎 */
  collected(key: string): boolean;
  /** 難度：數字越大越難；查不到的字回傳 0 */
  difficulty(key: string): number;
}

interface Candidate {
  index: number;
  start: number;
  value: string;
  key: string;
}

const LONG_SENTENCE = 8;

function protectedRanges(text: string, names: string[]): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  for (const m of text.matchAll(/\([^)]*\d[^)]*\)/g)) ranges.push([m.index, m.index + m[0].length]);
  for (const name of names) {
    let from = 0;
    for (;;) {
      const at = text.indexOf(name, from);
      if (at < 0) break;
      const before = text[at - 1];
      const after = text[at + name.length];
      if (!(before && /[A-Za-z]/.test(before)) && !(after && /[A-Za-z]/.test(after))) ranges.push([at, at + name.length]);
      from = at + name.length;
    }
  }
  return ranges;
}

/** 回傳要挖的字在 segment() 裡的「第幾個字」（只數單字段，從 0 開始） */
export function chooseBlanks(text: string, ctx: ClozeContext): number[] {
  const ranges = protectedRanges(text, ctx.names);
  const inRange = (start: number, end: number) => ranges.some(([a, b]) => start < b && end > a);

  // 每個字在原文的位置
  const words: Candidate[] = [];
  let offset = 0;
  let index = 0;
  for (const seg of segment(text)) {
    if (seg.type === 'word') words.push({ index: index++, start: offset, value: seg.value, key: seg.key });
    offset += seg.value.length;
  }

  // 每句的範圍
  const sentences: Array<[number, number]> = [];
  let cursor = 0;
  for (const line of text.split('\n')) {
    for (const s of splitEnglish(line)) {
      const at = text.indexOf(s, cursor);
      if (at < 0) continue;
      cursor = at + s.length;
      // 太短的（數值行、主動效果名稱）不算句子，不挖
      if (isSentence(s)) sentences.push([at, at + s.length]);
    }
  }

  const chosen: number[] = [];
  for (const [from, to] of sentences) {
    const inSentence = words.filter((w) => w.start >= from && w.start < to);
    const first = inSentence[0];
    const eligible = inSentence.filter(
      (w) =>
        w.value.length >= 3 &&
        ctx.allowed(w.key) &&
        !inRange(w.start, w.start + w.value.length) &&
        (w === first || !/^[A-Z]/.test(w.value)),
    );
    if (!eligible.length) continue;
    const count = eligible.length >= LONG_SENTENCE ? 2 : 1;
    const ranked = [...eligible].sort(
      (a, b) =>
        Number(ctx.collected(b.key)) - Number(ctx.collected(a.key)) ||
        ctx.difficulty(b.key) - ctx.difficulty(a.key) ||
        b.value.length - a.value.length ||
        a.index - b.index,
    );
    const picks: Candidate[] = [];
    for (const w of ranked) {
      if (picks.length >= count) break;
      // 兩個空格不要相鄰
      if (picks.some((p) => Math.abs(p.index - w.index) <= 1)) continue;
      picks.push(w);
    }
    chosen.push(...picks.map((p) => p.index));
  }
  return chosen.sort((a, b) => a - b);
}

/** 第幾個字的原樣文字 */
export function wordAt(text: string, index: number): string {
  let i = 0;
  for (const seg of segment(text)) {
    if (seg.type !== 'word') continue;
    if (i++ === index) return seg.value;
  }
  return '';
}

/** 第幾個字在原文的位置（給「錯在哪一句」用） */
export function wordOffset(text: string, index: number): number {
  let i = 0;
  let offset = 0;
  for (const seg of segment(text)) {
    if (seg.type === 'word' && i++ === index) return offset;
    offset += seg.value.length;
  }
  return -1;
}
