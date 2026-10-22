// 詞典：從 ECDICT 只抽出遊戲文字裡出現過的詞，變形歸到原形，中文釋義轉成繁體。
// 規則改寫自 lol-english 的 scripts/build-dictionary.mjs 和 scripts/lib/rarity.mjs。
import { createReadStream } from 'node:fs';
import { parse } from 'csv-parse';
import type { Dictionary, DictWord, Wordlists } from '../../src/shared/types.ts';
import { collectWords } from '../../src/shared/text.ts';

/** ECDICT 一列裡用得到的欄位 */
export interface EcdictRow {
  word: string;
  phonetic?: string;
  translation?: string;
  collins?: string;
  oxford?: string;
  tag?: string;
  bnc?: string;
  frq?: string;
  exchange?: string;
}

/** 常見功能詞：任何地方都不標註 */
export const STOPWORDS = new Set(
  `a an the and or but if then than that this these those of to in on at by for with from into over under about as is are was were be been being am do does did done doing have has had having will would shall should can could may might must not no nor so such it its he she they them their his her him we us our you your me my mine who whom whose what which when where why how there here all any both each few more most other some only own same too very just also even still yet ever never again once always often sometimes now thus hence however therefore because while during before after above below up down out off further either neither every much many little less least`.split(
    /\s+/,
  ),
);

/** 遊戲自創詞與縮寫：正文裡不標註，名稱裡可以點 */
export const GAME_TERMS = new Set(
  `ad ap cc aoe kda cs moba aram smurf jungler gank ganks ult ults ulting proc procs nerf nerfed buffed baron drake nexus inhibitor inhibitors yordle vastaya darkin runeterra hextech chemtech`.split(
    /\s+/,
  ),
);

/** 生詞判定：常見詞（core）或生詞（rare） */
export function classify(e: EcdictRow | undefined): 'core' | 'rare' | 'unknown' {
  if (!e) return 'unknown';
  const collins = Number(e.collins) || 0;
  const oxford = Number(e.oxford) || 0;
  const tags = String(e.tag || '').split(/\s+/).filter(Boolean);
  if (oxford === 1 || collins >= 4) return 'core';
  if (tags.some((t) => t === 'zk' || t === 'gk' || t === 'cet4')) return 'core';
  if (collins >= 3 && tags.some((t) => ['cet6', 'ky', 'toefl', 'ielts', 'gre'].includes(t))) return 'core';
  const rank = Math.min(Number(e.bnc) || Infinity, Number(e.frq) || Infinity);
  return rank <= 8000 ? 'core' : 'rare';
}

/** lemma.en.txt：`原形/詞頻 -> 變形1,變形2`，分號開頭是註解 */
export function parseLemmaFile(text: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith(';')) continue;
    const arrow = line.indexOf('->');
    if (arrow < 0) continue;
    const lemma = line.slice(0, arrow).trim().split('/')[0].trim().toLowerCase();
    if (!lemma) continue;
    for (const f of line.slice(arrow + 2).split(',')) {
      const form = f.trim().toLowerCase();
      if (form && !map.has(form)) map.set(form, lemma);
    }
  }
  return map;
}

/** ECDICT exchange 欄位裡的原形（`0:` 開頭那段） */
export function exchangeLemma(exchange: string | undefined): string | null {
  for (const part of String(exchange || '').split('/')) {
    if (part.startsWith('0:')) return part.slice(2).trim().toLowerCase() || null;
  }
  return null;
}

/** 釋義是「…的複數形式」這類變形說明（判斷前先轉成繁體） */
const INFLECTION = /的複數形式|的過去式|的過去分詞|的現在分詞|的第三人稱|pl\. of/;

/**
 * 決定一個字要歸到哪個原形：
 * 本身有音標、而且釋義不是變形說明 → 自己就是原形；否則若候選原形是完整詞條（有音標）→ 歸過去。
 * 這樣可以避免 soldier→soldi、holy→ho 這類誤判。
 */
export function pickLemma(
  surface: string,
  entry: EcdictRow | undefined,
  candidate: string | null,
  candidateEntry: EcdictRow | undefined,
  toTraditional: (s: string) => string,
): string {
  if (!candidate || candidate === surface || !candidateEntry?.phonetic) return surface;
  if (!entry?.phonetic) return candidate;
  return INFLECTION.test(toTraditional(entry.translation || '')) ? candidate : surface;
}

export function makeWord(e: EcdictRow, toTraditional: (s: string) => string): DictWord {
  const w: DictWord = {};
  const phonetic = String(e.phonetic || '').trim();
  if (phonetic) w.p = phonetic;
  const translation = String(e.translation || '').replace(/\\n/g, '\n').trim();
  if (translation) w.t = toTraditional(translation);
  if (classify(e) === 'rare') w.r = 1;
  const num = (v: string | undefined) => Number(v) || 0;
  if (num(e.collins)) w.c = num(e.collins);
  if (num(e.oxford)) w.o = num(e.oxford);
  if (e.tag?.trim()) w.g = e.tag.trim();
  if (num(e.bnc)) w.bnc = num(e.bnc);
  if (num(e.frq)) w.frq = num(e.frq);
  return w;
}

/** 讀 ECDICT CSV，只留 wanted 裡的詞（同一個詞只收第一次出現的） */
export async function scanEcdict(csvPath: string, wanted: Set<string>): Promise<Map<string, EcdictRow>> {
  const out = new Map<string, EcdictRow>();
  const parser = createReadStream(csvPath).pipe(
    parse({ columns: true, relax_quotes: true, relax_column_count: true, skip_empty_lines: true }),
  );
  for await (const row of parser as AsyncIterable<EcdictRow>) {
    const w = String(row.word || '').toLowerCase();
    if (w && wanted.has(w) && !out.has(w)) out.set(w, row);
  }
  return out;
}

export interface DictionaryReport {
  surfaces: number;
  unresolved: Array<{ word: string; count: number }>;
}

export async function buildDictionary(options: {
  texts: string[];
  properNouns: string[];
  csvPath: string;
  lemmaText: string;
  toTraditional: (s: string) => string;
}): Promise<{ dict: Dictionary; wordlists: Wordlists; report: DictionaryReport }> {
  const { texts, properNouns, csvPath, lemmaText, toTraditional } = options;

  // 1. 每個字出現在幾段文字裡
  const counts = new Map<string, number>();
  for (const t of texts) for (const w of collectWords(t)) counts.set(w, (counts.get(w) ?? 0) + 1);
  const needed = new Set(counts.keys());

  // 2. 要查的字 = 出現的字 + 它們在 lemma 表裡的原形
  const lemmaMap = parseLemmaFile(lemmaText);
  const lookup = new Set(needed);
  for (const w of needed) {
    const lemma = lemmaMap.get(w);
    if (lemma) lookup.add(lemma);
  }
  const entries = await scanEcdict(csvPath, lookup);

  // 3. 候選原形：exchange 的 0: 優先，其次 lemma 表；候選原形不在詞典結果裡就再補查一次
  const candidates = new Map<string, string | null>();
  const missing = new Set<string>();
  for (const s of needed) {
    const cand = exchangeLemma(entries.get(s)?.exchange) ?? lemmaMap.get(s) ?? null;
    candidates.set(s, cand && cand !== s ? cand : null);
    if (cand && !entries.has(cand)) missing.add(cand);
  }
  if (missing.size) for (const [k, v] of await scanEcdict(csvPath, missing)) if (!entries.has(k)) entries.set(k, v);

  // 4. 產出詞表
  const words: Record<string, DictWord> = {};
  const forms: Record<string, string> = {};
  const unresolved: DictionaryReport['unresolved'] = [];
  for (const s of needed) {
    const cand = candidates.get(s) ?? null;
    const lemma = pickLemma(s, entries.get(s), cand, cand ? entries.get(cand) : undefined, toTraditional);
    const e = entries.get(lemma) ?? entries.get(s);
    if (!e) {
      unresolved.push({ word: s, count: counts.get(s) ?? 0 });
      continue;
    }
    if (lemma !== s) forms[s] = lemma;
    words[lemma] ??= makeWord(e, toTraditional);
  }

  // 5. 略過清單
  const softSkip = new Set(GAME_TERMS);
  for (const name of properNouns) for (const w of collectWords(name)) softSkip.add(w);

  const sortedWords = Object.fromEntries(Object.entries(words).sort(([a], [b]) => a.localeCompare(b)));
  const dict: Dictionary = {
    meta: {
      count: Object.keys(words).length,
      forms: Object.keys(forms).length,
      rare: Object.values(words).filter((w) => w.r === 1).length,
    },
    forms: Object.fromEntries(Object.entries(forms).sort(([a], [b]) => a.localeCompare(b))),
    words: sortedWords,
  };
  const wordlists: Wordlists = { skip: [...STOPWORDS].sort(), softSkip: [...softSkip].sort() };
  unresolved.sort((a, b) => b.count - a.count);
  return { dict, wordlists, report: { surfaces: needed.size, unresolved } };
}
