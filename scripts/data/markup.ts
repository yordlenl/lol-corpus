// 把遊戲文字裡的標記（<magicDamage>、<br>、{{ 佔位符 }} 等）整理成少數幾種樣式。
// 清掉佔位符的規則改寫自 lol-english 的 scripts/lib/text.mjs。
import type { Rich, StyledRun, TextStyle } from '../../src/shared/types.ts';

/** 已知標籤 → 樣式；null 表示認得、但不加樣式 */
const TAG_STYLES: Record<string, TextStyle | null> = {
  b: 'b',
  strong: 'b',
  active: 'b',
  passive: 'b',
  spellname: 'b',
  spellpassive: 'b',
  unique: 'b',
  keyword: 'b',
  keywordmajor: 'b',
  keywordname: 'b',
  keywordstealth: 'b',
  titleleft: 'b',
  titleright: 'b',
  onhit: 'b',
  attention: 'num',
  buffedstat: 'num',
  statgood: 'num',
  magicdamage: 'magic',
  scaleap: 'magic',
  physicaldamage: 'physical',
  scalead: 'physical',
  scalelethality: 'physical',
  armorpen: 'physical',
  truedamage: 'true',
  healing: 'heal',
  health: 'heal',
  scalehealth: 'heal',
  lifesteal: 'heal',
  omnivamp: 'heal',
  shield: 'shield',
  scalemana: 'mana',
  status: 'status',
  speed: 'speed',
  ms: 'speed',
  attackspeed: 'speed',
  gold: 'gold',
  flavortext: 'flavor',
  rules: 'flavor',
  i: 'flavor',
  maintext: null,
  stats: null,
  font: null,
  span: null,
  'lol-uikit-tooltipped-keyword': null,
  prismatic: null,
  raritygeneric: null,
  raritylegendary: null,
  raritymythic: null,
  jadeunique: null,
  jadelimit: null,
  jaderules: null,
  ornnbonus: null,
  danger: null,
  scalelevel: null,
  scalearmor: null,
  scalemr: null,
  scalecrit: null,
};

const ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&#x27;': "'",
};

function decodeEntities(s: string): string {
  return s.replace(/&(?:nbsp|amp|lt|gt|quot|#39|#x27);/gi, (m) => ENTITIES[m.toLowerCase()] ?? m);
}

const TAG_RE = /<\s*(\/)?\s*([a-zA-Z][\w-]*)[^>]*>/g;

/**
 * 遊戲文字 → 有格式的文字。
 * @param onUnknownTag 遇到沒見過的標籤時通知（建置報告用），內容照樣保留、只是不加樣式
 */
export function toRich(raw: string | null | undefined, onUnknownTag?: (tag: string) => void): Rich {
  const source = String(raw ?? '')
    .replace(/\{\{[^}]*\}\}/g, ' ')
    .replace(/%i:[^%]*%/g, ' ')
    .replace(/@[A-Za-z0-9_.]+@/g, ' ');

  const runs: Array<[string, TextStyle | null]> = [];
  const stack: Array<TextStyle | null> = [];
  const currentStyle = () => {
    for (let i = stack.length - 1; i >= 0; i--) if (stack[i]) return stack[i];
    return null;
  };
  const lastText = () => (runs.length ? runs[runs.length - 1][0] : '');

  const push = (text: string, style: TextStyle | null) => {
    if (!text) return;
    const last = runs[runs.length - 1];
    if (last && last[1] === style) last[0] += text;
    else runs.push([text, style]);
  };

  const addText = (rawText: string) => {
    let text = decodeEntities(rawText).replace(/[^\S\n]+/g, ' ').replace(/\n/g, ' ');
    const before = lastText();
    if (text.startsWith(' ') && (before === '' || /[ \n]$/.test(before))) text = text.slice(1);
    push(text, currentStyle());
  };

  const addNewline = () => {
    const last = runs[runs.length - 1];
    if (last) last[0] = last[0].replace(/ +$/, '');
    const trailing = /\n*$/.exec(runs.map((r) => r[0]).join(''))![0].length;
    if (runs.length && trailing < 2) push('\n', null);
  };

  let pos = 0;
  for (const m of source.matchAll(TAG_RE)) {
    addText(source.slice(pos, m.index));
    pos = m.index + m[0].length;
    const closing = Boolean(m[1]);
    const tag = m[2].toLowerCase();
    if (tag === 'br' || tag === 'hr') {
      addNewline();
      continue;
    }
    if (tag === 'li') {
      if (!closing && runs.length) addNewline();
      continue;
    }
    // faction…、rarity… 這類標籤很多種，一律只留內容
    if (!closing && !(tag in TAG_STYLES) && !/^(faction|rarity)/.test(tag)) onUnknownTag?.(m[2]);
    const style = TAG_STYLES[tag] ?? null;
    if (closing) {
      const i = stack.lastIndexOf(style);
      if (i >= 0) stack.splice(i, 1);
    } else {
      stack.push(style);
    }
  }
  addText(source.slice(pos));

  // 去掉頭尾空白與換行
  while (runs.length && !runs[0][0].trim()) runs.shift();
  while (runs.length && !runs[runs.length - 1][0].trim()) runs.pop();
  if (!runs.length) return '';
  runs[0][0] = runs[0][0].replace(/^\s+/, '');
  runs[runs.length - 1][0] = runs[runs.length - 1][0].replace(/\s+$/, '');

  if (runs.every(([, style]) => style === null)) return runs.map(([text]) => text).join('');
  return runs.map(([text, style]) => (style ? ([text, style] as StyledRun) : text));
}

/** 只要純文字（名稱、簡短說明） */
export function toPlain(raw: string | null | undefined): string {
  const rich = toRich(raw);
  return typeof rich === 'string' ? rich : rich.map((r) => (typeof r === 'string' ? r : r[0])).join('');
}
