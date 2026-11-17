// 官方韓文（純諺文）→ 漢諺混寫：把漢字詞換成漢字，上面標原本的諺文。
// Riot 沒有混寫版本，所以漢字是照詞典轉出來的：
//   1. 用 Kiwi 斷詞（把「공격력이」拆成名詞「공격력」和助詞「이」），只看名詞類的詞；
//   2. 先查 hanja-table.ts 的 LoL 對照表（同音字照遊戲裡的意思選、固有詞和外來語不轉）；
//   3. 再查 libhangul 的漢字詞表，取排在最前面（最常用）的寫法；
//   4. 轉完把漢字換回諺文，必須和官方原文一字不差，不然整段不轉。
import { ruby, rubyToReading, richToPlain } from '../../src/shared/text.ts';
import type { Rich } from '../../src/shared/types.ts';
import { HANJA_CONTEXT, HANJA_OVERRIDES } from './hanja-table.ts';

/** 斷詞結果的一個詞：str 是詞的原形，position、length 是它在原文裡的位置 */
export interface KoToken {
  str: string;
  tag: string;
  position: number;
  length: number;
}

export type KoTokenizer = (text: string) => KoToken[];

export interface HanjaDict {
  /** 諺文詞 → 可能的漢字寫法，照詞表的順序（常用的在前） */
  words: Map<string, string[]>;
  /** 單一個漢字 → 它的讀音 */
  readings: Map<string, Set<string>>;
}

const HANGUL = /^[가-힣]+$/;
const HAN = /^\p{Script=Han}+$/u;

/** 讀 libhangul 的 hanja.txt：每行「諺文:漢字:說明」，# 開頭是註解 */
export function parseHanjaDict(text: string): HanjaDict {
  const words = new Map<string, string[]>();
  const readings = new Map<string, Set<string>>();
  for (const line of text.split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const [hangul, hanja] = line.split(':');
    if (!hangul || !hanja || !HANGUL.test(hangul) || !HAN.test(hanja)) continue;
    const chars = [...hanja];
    if (chars.length !== hangul.length) continue;
    if (chars.length === 1) {
      const set = readings.get(hanja) ?? new Set<string>();
      set.add(hangul);
      readings.set(hanja, set);
    } else {
      const list = words.get(hangul) ?? [];
      if (!list.includes(hanja)) list.push(hanja);
      words.set(hangul, list);
    }
  }
  return { words, readings };
}

// 頭音法則：詞頭的 ㄹ、ㄴ 會變（力 력→역、女 녀→여、來 래→내），檢查讀音時要算進去
const DUEUM: Record<string, string> = {
  녀: '여', 뇨: '요', 뉴: '유', 니: '이', 랴: '야', 려: '여', 례: '예', 료: '요', 류: '유', 리: '이',
  라: '나', 래: '내', 로: '노', 뢰: '뇌', 루: '누', 르: '느',
};

function dueum(syllable: string): string {
  const code = syllable.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return syllable;
  const final = code % 28;
  const open = String.fromCharCode(0xac00 + code - final);
  const changed = DUEUM[open];
  return changed ? String.fromCharCode(changed.charCodeAt(0) + final) : syllable;
}

/** 這個漢字寫法的讀音是不是這個諺文（逐字檢查，容許頭音法則） */
export function readsAs(dict: HanjaDict, hanja: string, hangul: string): boolean {
  const chars = [...hanja];
  if (chars.length !== hangul.length) return false;
  if (dict.words.get(hangul)?.includes(hanja)) return true;
  return chars.every((ch, i) => {
    const set = dict.readings.get(ch);
    if (!set) return false;
    const s = hangul[i];
    return [...set].some((r) => r === s || dueum(r) === s);
  });
}

/** 會查詞典的詞性：一般名詞、詞根、專有名詞。其他詞性（依存名詞、數詞、冠形詞、副詞、前後綴）只看對照表 */
const DICT_TAGS = new Set(['NNG', 'XR', 'NNP']);
/** 會考慮轉換的詞性 */
const CANDIDATE_TAGS = new Set(['NNG', 'NNP', 'NNB', 'NR', 'XR', 'XPN', 'XSN', 'MM', 'MAG', 'MAJ']);
/** 可以和前後的詞合起來查的詞性（재+사용 → 再使用、암살+자 → 暗殺者） */
const JOIN_TAGS = new Set(['NNG', 'XR', 'XPN', 'XSN', 'NNB']);

export interface Span {
  start: number;
  end: number;
  hanja: string;
}

export interface HanjaStats {
  /** 「諺文→漢字」各轉了幾次 */
  converted: Map<string, number>;
  /** 沒轉的詞（詞/詞性）各出現幾次 */
  kept: Map<string, number>;
}

export class HanjaConverter {
  readonly stats: HanjaStats = { converted: new Map(), kept: new Map() };
  private cache = new Map<string, Span[]>();
  private tokenize: KoTokenizer;
  private dict: HanjaDict;
  private keep: Set<string>;
  private overrides: Record<string, string>;
  private context: Array<[string, RegExp, string]>;

  /** keep：不轉的詞（英雄名之類的專有名詞） */
  constructor(
    tokenize: KoTokenizer,
    dict: HanjaDict,
    keep: Iterable<string> = [],
    overrides: Record<string, string> = HANJA_OVERRIDES,
    context: Array<[string, RegExp, string]> = HANJA_CONTEXT,
  ) {
    this.tokenize = tokenize;
    this.dict = dict;
    this.keep = new Set(keep);
    this.overrides = overrides;
    this.context = context;
  }

  /** 查一個詞的漢字；null 是不轉 */
  lookup(word: string, tag: string): string | null {
    if (this.keep.has(word)) return null;
    const exact = this.overrides[`${word}/${tag}`] ?? this.overrides[word];
    if (exact !== undefined) return exact || null;
    // 專有名詞（造型系列名之類）三個字以上才查詞典；兩個字的容易是外來語碰巧同音，只看對照表
    const minLength = tag === 'NNP' ? 3 : 2;
    if (!DICT_TAGS.has(tag) || word.length < minLength) return null;
    return this.dict.words.get(word)?.[0] ?? null;
  }

  /** 詞典沒有整個詞時，試著拆成兩段（주문력 → 呪文 + 力）；兩段都要查得到 */
  private split(word: string): Array<[string, string]> | null {
    if (word.length < 3 || this.keep.has(word)) return null;
    for (let i = word.length - 1; i >= 1; i--) {
      const a = word.slice(0, i);
      const b = word.slice(i);
      const ha = this.lookup(a, a.length === 1 ? 'XPN' : 'NNG');
      const hb = this.lookup(b, b.length === 1 ? 'XSN' : 'NNG');
      if (ha && hb) return [[a, ha], [b, hb]];
    }
    return null;
  }

  private count(map: Map<string, number>, key: string) {
    map.set(key, (map.get(key) ?? 0) + 1);
  }

  /** 找出一段韓文裡要換成漢字的位置 */
  annotate(text: string): Span[] {
    const cached = this.cache.get(text);
    if (cached) return cached;
    const spans: Span[] = [];
    const add = (start: number, word: string, hanja: string) => {
      if ([...hanja].length !== word.length) return;
      spans.push({ start, end: start + word.length, hanja });
      this.count(this.stats.converted, `${word}→${hanja}`);
    };
    // 英雄名出現的位置整段不碰（「리 신」的 신 不是 神）
    const names: Array<[number, number]> = [];
    for (const name of this.keep) {
      for (let at = text.indexOf(name); at >= 0; at = text.indexOf(name, at + name.length)) names.push([at, at + name.length]);
    }
    const inName = (t: KoToken) => names.some(([start, end]) => t.position < end && t.position + t.length > start);
    // 只留「原文裡的字和詞的原形一樣」的名詞類（縮約、變形的不碰）
    const tokens = this.tokenize(text).filter(
      (t) => CANDIDATE_TAGS.has(t.tag) && HANGUL.test(t.str) && text.substr(t.position, t.length) === t.str && !inName(t),
    );
    let i = 0;
    while (i < tokens.length) {
      // 連在一起（中間沒有空白）的一串詞
      let n = i + 1;
      while (n < tokens.length && tokens[n].position === tokens[n - 1].position + tokens[n - 1].length && JOIN_TAGS.has(tokens[n].tag) && JOIN_TAGS.has(tokens[n - 1].tag)) n++;
      let a = i;
      while (a < n) {
        let done = false;
        // 從最長的開始試：整串合起來查得到就整串轉
        for (let b = n; b > a + 1 && !done; b--) {
          const word = tokens.slice(a, b).map((t) => t.str).join('');
          const hanja = this.lookup(word, 'NNG');
          if (hanja) {
            add(tokens[a].position, word, hanja);
            a = b;
            done = true;
          }
        }
        if (done) continue;
        const t = tokens[a];
        // 「맞은 적에게」的 적 被當成依存名詞，其實是敵人；只有「～한 적이 있다／없다」（曾經）才是固有詞
        const enemy = t.str === '적' && t.tag === 'NNB' && !/^(이|은|도)?\s*(있|없)/.test(text.slice(t.position + 1));
        const after = text.slice(t.position + t.length);
        const byContext = this.context.find(([word, pattern]) => word === t.str && pattern.test(after))?.[2];
        const hanja = enemy ? '敵' : (byContext ?? this.lookup(t.str, t.tag));
        if (hanja) add(t.position, t.str, hanja);
        else {
          const parts = DICT_TAGS.has(t.tag) ? this.split(t.str) : null;
          if (parts) {
            let at = t.position;
            for (const [word, h] of parts) {
              add(at, word, h);
              at += word.length;
            }
          } else this.count(this.stats.kept, `${t.str}/${t.tag}`);
        }
        a++;
      }
      i = n;
    }
    // 緊接在一起的漢字合成一段（被害 + 量 → 被害量），讀起來是一個詞
    const merged: Span[] = [];
    for (const s of spans) {
      const last = merged[merged.length - 1];
      if (last && last.end === s.start) {
        last.end = s.end;
        last.hanja += s.hanja;
      } else merged.push({ ...s });
    }
    this.cache.set(text, merged);
    return merged;
  }

  /** 純文字：回傳帶標註的字串 */
  convert(text: string): string {
    return applySpans(text, this.annotate(text), 0);
  }

  /** 有格式的文字：整段一起斷詞，再把標註放回各個片段；跨片段的詞不轉 */
  convertRich(rich: Rich): Rich {
    const plain = richToPlain(rich);
    const spans = this.annotate(plain);
    if (typeof rich === 'string') return check(applySpans(rich, spans, 0), plain);
    let offset = 0;
    const out = rich.map((run) => {
      const text = typeof run === 'string' ? run : run[0];
      const converted = applySpans(text, spans, offset);
      offset += text.length;
      return typeof run === 'string' ? converted : ([converted, run[1]] as [string, typeof run[1]]);
    });
    check(out.map((run) => (typeof run === 'string' ? run : run[0])).join(''), plain);
    return out;
  }
}

/** 把落在這個片段裡的標註套上去（offset 是這個片段在整段裡的起點） */
function applySpans(text: string, spans: Span[], offset: number): string {
  let out = '';
  let last = 0;
  for (const s of spans) {
    const start = s.start - offset;
    const end = s.end - offset;
    if (start < last || end > text.length) continue;
    out += text.slice(last, start) + ruby(s.hanja, text.slice(start, end));
    last = end;
  }
  return out + text.slice(last);
}

/** 漢字換回諺文後要和官方原文一樣 */
function check(converted: string, original: string): string {
  if (rubyToReading(converted) !== original) throw new Error(`漢字轉換後和原文不一樣：${original}`);
  return converted;
}
