// 裝備：只留召喚峽谷可購買的，去掉其他模式的重複版本，再加上官方的分區和職業。
import type { Item, ItemRole, ItemTier, Tri } from '../../src/shared/types.ts';
import { SR_MAP_ID } from './config.ts';
import type { CDItemBin, DDItem, StringTable } from './ddragon-types.ts';
import { toPlain, toRich } from './markup.ts';

/** 召喚峽谷商店買得到的裝備 */
export function isShopItem(item: DDItem): boolean {
  return (
    item.maps?.[SR_MAP_ID] === true &&
    item.gold?.purchasable === true &&
    Boolean(item.description) &&
    !item.hideFromAll &&
    !item.requiredChampion &&
    !item.requiredAlly &&
    item.inStore !== false
  );
}

/**
 * ID 超過 4 位數的是其他模式的版本（例如 323003 是另一個模式的 Archangel's Staff，
 * 663056 是競技場的裝備），資料裡雖然標成召喚峽谷，商店買不到，一律排除。
 * 剩下同名的只留 ID 數字小的那筆。
 */
export function selectItemIds(items: Record<string, DDItem>): string[] {
  const byName = new Map<string, string>();
  for (const [id, item] of Object.entries(items)) {
    if (id.length > 4 || !isShopItem(item)) continue;
    const kept = byName.get(item.name);
    if (!kept || Number(id) < Number(kept)) byName.set(item.name, id);
  }
  return [...byName.values()].sort((a, b) => Number(a) - Number(b));
}

/** 官方職業欄位的值，照商店上方篩選的順序 */
export const ROLE_FLAGS: Array<[ItemRole, number]> = [
  ['Fighter', 1],
  ['Marksman', 2],
  ['Assassin', 4],
  ['Mage', 16],
  ['Tank', 8],
  ['Support', 32],
];

export function itemRoles(bin: CDItemBin): ItemRole[] {
  const flags = bin.mItemAttributes ?? [];
  return ROLE_FLAGS.filter(([, flag]) => flags.includes(flag)).map(([role]) => role);
}

/**
 * 商店的四區照官方等級（epicness）：沒有這欄是基礎、1 是起始、4 是中間件、5 以上是傳說
 * （7 是三階鞋和藥劑）。藥水、飾品、藥劑這些消耗品一律放「起始」。
 */
export function itemTier(item: DDItem, bin: CDItemBin): ItemTier {
  const tags = item.tags ?? [];
  if (tags.includes('Consumable') || tags.includes('Trinket')) return 'starter';
  const epicness = bin.epicness;
  if (epicness === undefined) return 'basic';
  if (epicness <= 1) return 'starter';
  if (epicness <= 4) return 'epic';
  return 'legendary';
}

/** 遊戲文字檔範本裡的數值代號（@Name@、@Name*100@）要換成的數字 */
function templateValue(name: string, bin: CDItemBin): number | undefined {
  const effect = /^Effect(\d+)Amount$/.exec(name);
  if (effect) return bin.mEffectAmount?.[Number(effect[1]) - 1];
  const data = bin.mDataValues?.find((v) => v.mName === name);
  if (data) return data.mValue;
  // 其他是裝備本身的屬性欄位，名稱前面可能多一個 m，大小寫也不一定
  const wanted = name.toLowerCase();
  for (const [field, value] of Object.entries(bin)) {
    if (typeof value === 'number' && field.toLowerCase().replace(/^m(?=[a-z])/, '') === wanted.replace(/^m(?=[a-z])/, '')) return value;
  }
  return undefined;
}

const formatNumber = (n: number) => String(Math.round(n * 100) / 100);

/**
 * 遊戲裡有些數字是依英雄當下的屬性即時算出來的，官方文字本身沒有寫（例如芬布爾之冬「獲得□生命」）。
 * 這些地方放一個 <calcGap>，畫面上顯示「依英雄屬性計算」。
 */
export const CALC_GAP = '<calcGap>□</calcGap>';

/** 文字檔的鍵大小寫不一定（{{ Item_Cooldown }} 對到 item_cooldown），建一份小寫的索引 */
const lowerIndex = new WeakMap<StringTable, Map<string, string>>();
function entryOf(table: StringTable, key: string): string | undefined {
  let index = lowerIndex.get(table);
  if (!index) {
    index = new Map(Object.entries(table.entries).map(([k, v]) => [k.toLowerCase(), v]));
    lowerIndex.set(table, index);
  }
  return index.get(key.toLowerCase());
}

export interface TemplateOptions {
  /** 用來展開 {{ 鍵 }}（引用文字檔裡的另一段文字） */
  table?: StringTable;
  /** 依英雄屬性即時計算的數字換成 CALC_GAP；沒開的話遇到就報錯 */
  gaps?: boolean;
}

/**
 * 把遊戲文字檔的描述範本變成和 Data Dragon 一樣的描述：數值代號換成數字，圖示代號（%i:xxx%）拿掉。
 * 有換不了的代號就報錯，免得畫面上出現 @…@。
 */
export function fillTemplate(template: string, bin: CDItemBin, options: TemplateOptions = {}): string {
  let text = template;
  // {{ 鍵 }} 可能一層包一層
  for (let depth = 0; depth < 4 && options.table && /\{\{/.test(text); depth++) {
    text = text.replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (whole, key: string) => entryOf(options.table!, key) ?? whole);
  }
  if (options.gaps) {
    // 英文範本裡即時計算的數字直接留空：標籤後面緊接空白再接單字（Gain <scaleHealth> Health），
    // 或是單獨一個 %（Gain % Heal and Shield Power）
    text = text
      .replace(/<(scale\w+|shield|healing)>\s+(?=[A-Za-z])/gi, (_, tag: string) => `<${tag}>${CALC_GAP} `)
      .replace(/(\s)%(?=\s)/g, `$1${CALC_GAP}%`);
  }
  text = text
    .replace(/%i:[^%]+%\s?/g, '')
    .replace(/@([A-Za-z0-9_]+)(?:\*([\d.]+))?@/g, (whole, name: string, times?: string) => {
      const value = templateValue(name, bin);
      if (value !== undefined) return formatNumber(value * Number(times ?? 1));
      // 中文範本把即時計算的數字寫成計算公式的名稱（@BonusHPFromMana@）
      const calculations = (bin.mItemCalculations ?? {}) as Record<string, unknown>;
      if (options.gaps && name in calculations) return CALC_GAP;
      throw new Error(`裝備 ${bin.itemID} 的描述有換不了的代號：${whole}`);
    });
  if (/\{\{|@/.test(text)) throw new Error(`裝備 ${bin.itemID} 的描述還有沒處理的代號：${text}`);
  return text;
}

const descriptionKey = (id: string) => `generatedtip_item_${id}_externaldescription`;

/**
 * Data Dragon 有些商店裝備的描述是空的（目前只有輔助的起始裝備 World Atlas），
 * 改用遊戲文字檔裡的官方描述補上，三種語言都補。回傳補好的新資料，不改原本的。
 */
export function fillMissingDescriptions(
  locales: Record<keyof Tri, Record<string, DDItem>>,
  bins: Record<string, CDItemBin>,
  tables: Record<keyof Tri, StringTable>,
): Record<keyof Tri, Record<string, DDItem>> {
  const out = { en: { ...locales.en }, zh_TW: { ...locales.zh_TW }, zh_CN: { ...locales.zh_CN } };
  for (const [id, item] of Object.entries(locales.en)) {
    if (item.description || id.length > 4 || !isShopItem({ ...item, description: '-' })) continue;
    const bin = bins[`Items/${id}`];
    if (!bin || !tables.en.entries[descriptionKey(id)]) continue;
    for (const lang of ['en', 'zh_TW', 'zh_CN'] as const) {
      const template = tables[lang].entries[descriptionKey(id)] ?? tables.en.entries[descriptionKey(id)];
      out[lang][id] = { ...(locales[lang][id] ?? item), description: fillTemplate(template, bin) };
    }
  }
  return out;
}

export interface Upgrades {
  /** 每件裝備升級後會變成哪幾件 */
  to: Map<string, string[]>;
  /** 商店買不到、只能升級得到的裝備（照找到的順序） */
  only: string[];
}

/**
 * 找出「升級」關係：描述裡提到 transform／upgrade，又用 <rarity…> 標出另一件召喚峽谷裝備的名稱
 * （例如冬之臨 → 芬布爾之冬、世界地圖 → 符文指針 → 跨界獎賞）。升級後又能再升級的，一路找下去。
 */
export function findUpgrades(items: Record<string, DDItem>, shopIds: string[]): Upgrades {
  const byName = new Map<string, string>();
  for (const [id, item] of Object.entries(items)) {
    if (id.length > 4 || item.maps?.[SR_MAP_ID] !== true) continue;
    const kept = byName.get(item.name);
    if (!kept || Number(id) < Number(kept)) byName.set(item.name, id);
  }
  const shop = new Set(shopIds);
  const to = new Map<string, string[]>();
  const only: string[] = [];
  const queue = [...shopIds];
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i];
    const description = items[id]?.description ?? '';
    if (!/transform|upgrade/i.test(description)) continue;
    for (const m of description.matchAll(/<(rarity\w+)>([^<]+)<\/\1>/gi)) {
      const target = byName.get(m[2].trim());
      if (!target || target === id) continue;
      to.set(id, [...(to.get(id) ?? []), target]);
      if (!shop.has(target) && !only.includes(target)) {
        only.push(target);
        queue.push(target);
      }
    }
  }
  return { to, only };
}

export function buildItems(
  locales: Record<keyof Tri, Record<string, DDItem>>,
  bins: Record<string, CDItemBin>,
  tables: Record<keyof Tri, StringTable>,
  onUnknownTag?: (tag: string) => void,
): Item[] {
  const shopIds = selectItemIds(locales.en);
  const kept = new Set(shopIds);
  const upgrades = findUpgrades(locales.en, shopIds);
  const from = new Map<string, string>();
  for (const [source, targets] of upgrades.to) for (const t of targets) from.set(t, source);

  // 只能升級得到的裝備：Data Dragon 的描述裡即時計算的數字變成 0 或空白，改用遊戲文字檔，缺的地方標出來
  const texts = { en: { ...locales.en }, zh_TW: { ...locales.zh_TW }, zh_CN: { ...locales.zh_CN } };
  for (const id of upgrades.only) {
    const bin = bins[`Items/${id}`];
    if (!bin) throw new Error(`遊戲裝備資料裡找不到 ${id}（${locales.en[id].name}）`);
    for (const lang of ['en', 'zh_TW', 'zh_CN'] as const) {
      const template = tables[lang].entries[descriptionKey(id)] ?? tables.en.entries[descriptionKey(id)];
      if (!template) throw new Error(`遊戲文字檔裡找不到 ${id} 的描述`);
      texts[lang][id] = { ...(locales[lang][id] ?? locales.en[id]), description: fillTemplate(template, bin, { table: tables[lang], gaps: true }) };
    }
  }

  const tri = <T>(fn: (item: DDItem) => T, id: string): Tri<T> => ({
    en: fn(texts.en[id]),
    zh_TW: fn(texts.zh_TW[id] ?? texts.en[id]),
    zh_CN: fn(texts.zh_CN[id] ?? texts.en[id]),
  });
  const build = (id: string): Item => {
    const en = texts.en[id];
    const bin = bins[`Items/${id}`];
    if (!bin) throw new Error(`遊戲裝備資料裡找不到 ${id}（${en.name}）`);
    return {
      id,
      name: tri((i) => i.name, id),
      plaintext: tri((i) => toPlain(i.plaintext), id),
      description: tri((i) => toRich(i.description, onUnknownTag), id),
      gold: { total: en.gold!.total, base: en.gold!.base, sell: en.gold!.sell },
      from: (en.from ?? []).filter((x) => kept.has(x)),
      into: (en.into ?? []).filter((x) => kept.has(x)),
      tags: en.tags ?? [],
      depth: en.depth ?? 1,
      tier: itemTier(en, bin),
      roles: itemRoles(bin),
      icon: `img/item/${id}.png`,
      ...(upgrades.to.has(id) ? { upgradesTo: upgrades.to.get(id) } : {}),
      ...(from.has(id) ? { upgradedFrom: from.get(id) } : {}),
    };
  };
  const items = shopIds.map(build);
  // 升級得到的裝備：分區和合成深度跟著升級前的那件（出題挑干擾項時才會和同等級的比）
  const byId = new Map(items.map((it) => [it.id, it]));
  for (const id of upgrades.only) {
    const source = byId.get(from.get(id)!)!;
    const item: Item = { ...build(id), tier: source.tier, depth: source.depth, upgradeOnly: true };
    items.push(item);
    byId.set(id, item);
  }
  return items;
}
