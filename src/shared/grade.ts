// 評分規則（spec）：不分大小寫；忽略標點和多餘空白；彎引號與直引號視為相同；其他一律精確比對。
// 送出後逐字標示對錯。學習 App 的練習、複習和元件的對錯顯示都用這一份。
import type { WordDiff } from './types.ts';

export function normalizeAnswer(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[‘’‛′]/g, "'")
    .replace(/[“”‟″]/g, '"')
    .replace(/\p{P}/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isCorrect(answer: string, accepted: string[]): boolean {
  const a = normalizeAnswer(answer);
  return a !== '' && accepted.some((x) => normalizeAnswer(x) === a);
}

/** 自動評分對應：一次寫對 Good(3)、用了提示才寫對 Hard(2)、寫錯 Again(1) */
export function ratingFor(correct: boolean, hinted: boolean): 1 | 2 | 3 {
  if (!correct) return 1;
  return hinted ? 2 : 3;
}

/** 單字提示：第一次給首字母，第二次給答案 */
export function hintText(answer: string, level: number): string {
  if (level <= 0) return '';
  if (level === 1) return `首字母：${answer[0]}${'＿'.repeat(Math.max(0, answer.length - 1))}`;
  return `答案：${answer}`;
}

/** 整句提示：第一次給每個字的首字母，第二次給整句答案 */
export function sentenceHint(sentence: string, level: number): string {
  if (level <= 0) return '';
  if (level >= 2) return `答案：${sentence}`;
  const masked = sentence.replace(/[A-Za-z]+/g, (w) => w[0] + '＿'.repeat(w.length - 1));
  return `首字母：${masked}`;
}

/** 整句裡「算一個字」的部分（含字母或數字），聽寫的橫線用這個數 */
export function wordsOf(sentence: string): string[] {
  return sentence.split(/\s+/).filter((t) => /[\p{L}\p{N}]/u.test(t));
}

/**
 * 逐字比對：正確答案和你寫的，各自照評分規則正規化後，用最長共同子序列對齊。
 * 一個字裡有連字號時（Nine-Tailed）拆成幾段，全部對上才算這個字對。
 */
export function diffWords(expected: string, answer: string): WordDiff {
  const display = expected.split(/\s+/).filter(Boolean);
  const parts: Array<{ token: string; owner: number }> = [];
  display.forEach((word, owner) => {
    for (const token of normalizeAnswer(word).split(' ').filter(Boolean)) parts.push({ token, owner });
  });
  const given = normalizeAnswer(answer).split(' ').filter(Boolean);

  // 最長共同子序列
  const n = parts.length;
  const m = given.length;
  const table = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      table[i][j] = parts[i].token === given[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const matchedPart = new Array<boolean>(n).fill(false);
  const matchedGiven = new Array<boolean>(m).fill(false);
  for (let i = 0, j = 0; i < n && j < m; ) {
    if (parts[i].token === given[j]) {
      matchedPart[i] = matchedGiven[j] = true;
      i++;
      j++;
    } else if (table[i + 1][j] >= table[i][j + 1]) i++;
    else j++;
  }

  const ok = display.map(() => true);
  const hasPart = display.map(() => false);
  parts.forEach((p, i) => {
    hasPart[p.owner] = true;
    if (!matchedPart[i]) ok[p.owner] = false;
  });
  return {
    correct: normalizeAnswer(expected) === normalizeAnswer(answer),
    // 只有標點的「字」（例如破折號）不計對錯
    expected: display.map((word, i) => ({ word, ok: hasPart[i] ? ok[i] : true })),
    extra: given.filter((_, j) => !matchedGiven[j]),
  };
}
