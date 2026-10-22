// 簡繁轉換與簡體字檢查。
import * as OpenCC from 'opencc-js';

/** 簡體 → 台灣繁體，只換字形、不換用語（spec：OpenCC 字形轉換） */
export const toTraditional = OpenCC.Converter({ from: 'cn', to: 'tw' });

const pairs = (dict: string) =>
  dict
    .split('|')
    .filter(Boolean)
    .map((p) => p.split(' ') as [string, string]);

/**
 * 只出現在簡體、繁體不會用的字。
 * 做法：OpenCC 簡轉繁字表裡「會被換掉的字」，扣掉在任何繁體詞句裡出現過的字
 * （例如「干擾」的干、「台灣」的台、「游標」的游都是兩岸共用字，不算簡體）。
 */
const SIMPLIFIED_ONLY: Set<string> = (() => {
  const [[stPhrases, stChars]] = OpenCC.Locale.from.cn as unknown as [[string, string]];
  const [[tsPhrases, tsChars]] = OpenCC.Locale.to.cn as unknown as [[string, string]];
  // 台灣標準字形（例如痴、床、峰、唇），OpenCC 的標準繁體寫成癡、牀、峯、脣。
  // 只用它的單字表；詞語表的左邊混有簡體字（例如「这么」）。
  const [[, twChars]] = OpenCC.Locale.from.tw as unknown as [[string, string]];
  const traditional = new Set<string>();
  for (const [, t] of [...pairs(stPhrases), ...pairs(stChars)]) for (const ch of t) traditional.add(ch);
  for (const [t] of [...pairs(tsPhrases), ...pairs(tsChars), ...pairs(twChars)]) for (const ch of t) traditional.add(ch);
  return new Set(pairs(stChars).filter(([s, t]) => s !== t && !traditional.has(s)).map(([s]) => s));
})();

/** 找出文字裡的簡體字（不重複） */
export function findSimplified(text: string): string[] {
  const found = new Set<string>();
  for (const ch of text) if (SIMPLIFIED_ONLY.has(ch)) found.add(ch);
  return [...found];
}
