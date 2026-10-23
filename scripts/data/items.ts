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
 * 把遊戲文字檔的描述範本變成和 Data Dragon 一樣的描述：數值代號換成數字，圖示代號（%i:xxx%）拿掉。
 * 有換不了的代號就報錯，免得畫面上出現 @…@。
 */
export function fillTemplate(template: string, bin: CDItemBin): string {
  const text = template
    .replace(/%i:[^%]+%\s?/g, '')
    .replace(/@([A-Za-z0-9_]+)(?:\*([\d.]+))?@/g, (whole, name: string, times?: string) => {
      const value = templateValue(name, bin);
      if (value === undefined) throw new Error(`裝備 ${bin.itemID} 的描述有換不了的代號：${whole}`);
      return formatNumber(value * Number(times ?? 1));
    });
  if (/\{\{|@/.test(text)) throw new Error(`裝備 ${bin.itemID} 的描述還有沒處理的代號：${text}`);
  return text;
}

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
    const key = `generatedtip_item_${id}_externaldescription`;
    const bin = bins[`Items/${id}`];
    if (!bin || !tables.en.entries[key]) continue;
    for (const lang of ['en', 'zh_TW', 'zh_CN'] as const) {
      const template = tables[lang].entries[key] ?? tables.en.entries[key];
      out[lang][id] = { ...(locales[lang][id] ?? item), description: fillTemplate(template, bin) };
    }
  }
  return out;
}

export function buildItems(
  locales: Record<keyof Tri, Record<string, DDItem>>,
  bins: Record<string, CDItemBin>,
  onUnknownTag?: (tag: string) => void,
): Item[] {
  const ids = selectItemIds(locales.en);
  const kept = new Set(ids);
  const tri = <T>(fn: (item: DDItem) => T, id: string): Tri<T> => ({
    en: fn(locales.en[id]),
    zh_TW: fn(locales.zh_TW[id] ?? locales.en[id]),
    zh_CN: fn(locales.zh_CN[id] ?? locales.en[id]),
  });
  return ids.map((id) => {
    const en = locales.en[id];
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
    };
  });
}
