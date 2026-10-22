// 把一段文字拆成可以收藏的句子，並盡量和中文對齊：
// 先照換行對齊；同一行裡三種語言句數一樣就逐句配對，不一樣時中文用整行；行數不一樣時中文用整段。
import { richToPlain } from './text.ts';
import type { Rich, SentenceUnit, Tri } from './types.ts';

const lines = (text: string) =>
  text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

// 句號後面接空白、再接大寫字母／數字／引號，才算一句結束；
// 單一大寫字母後面的句號是縮寫（B. F. Sword），不切。
const EN_BREAK = /([.!?]["'”’)]*)\s+(?=["'“‘(]?[A-Z0-9])/g;

export function splitEnglish(line: string): string[] {
  const out: string[] = [];
  let start = 0;
  for (const m of line.matchAll(EN_BREAK)) {
    const before = line.slice(start, m.index);
    if (/(^|\s)[A-Z]$/.test(before) || /\b(e\.g|i\.e|vs|etc)$/i.test(before)) continue;
    const end = m.index + m[1].length;
    out.push(line.slice(start, end).trim());
    start = end;
  }
  const rest = line.slice(start).trim();
  if (rest) out.push(rest);
  return out;
}

export function splitChinese(line: string): string[] {
  return (line.match(/[^。！？]+(?:[。！？]+[」』”）)]*)?/g) ?? []).map((s) => s.trim()).filter(Boolean);
}

/** 至少要有三個英文單字才算一句（排除「105 Ability Power」「Cooldown: 20s」這類數值行） */
export function isSentence(en: string): boolean {
  return (en.match(/[A-Za-z]{2,}/g) ?? []).length >= 3;
}

export function sentenceUnits(text: Tri<Rich>): SentenceUnit[] {
  const en = lines(richToPlain(text.en));
  const tw = lines(richToPlain(text.zh_TW));
  const cn = lines(richToPlain(text.zh_CN));
  const units: SentenceUnit[] = [];

  if (en.length === tw.length && en.length === cn.length) {
    en.forEach((line, i) => {
      const e = splitEnglish(line);
      const t = splitChinese(tw[i]);
      const c = splitChinese(cn[i]);
      if (e.length === t.length && e.length === c.length) {
        e.forEach((s, j) => units.push({ text: { en: s, zh_TW: t[j], zh_CN: c[j] }, alignment: 'sentence' }));
      } else {
        for (const s of e) units.push({ text: { en: s, zh_TW: tw[i], zh_CN: cn[i] }, alignment: 'line' });
      }
    });
  } else {
    const twBlock = tw.join('\n');
    const cnBlock = cn.join('\n');
    for (const line of en) {
      for (const s of splitEnglish(line)) units.push({ text: { en: s, zh_TW: twBlock, zh_CN: cnBlock }, alignment: 'block' });
    }
  }
  return units.filter((u) => isSentence(u.text.en));
}
