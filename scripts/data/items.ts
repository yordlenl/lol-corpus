// 裝備：只留召喚峽谷可購買的，去掉其他模式的重複版本，並分出等級區。
import type { Item, ItemTier, Tri } from '../../src/shared/types.ts';
import { SR_MAP_ID } from './config.ts';
import type { DDItem } from './ddragon-types.ts';
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

export function itemTier(item: DDItem): ItemTier {
  const tags = item.tags ?? [];
  const from = item.from ?? [];
  const into = item.into ?? [];
  if (tags.includes('Consumable') || tags.includes('Trinket')) return 'consumable';
  if (tags.includes('Boots')) return 'boots';
  if (!from.length && !into.length && (tags.includes('Lane') || tags.includes('Jungle'))) return 'starter';
  if (!into.length && from.length) return 'legendary';
  if ((item.depth ?? 1) >= 2) return 'epic';
  return 'basic';
}

export function buildItems(
  locales: Record<keyof Tri, Record<string, DDItem>>,
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
      tier: itemTier(en),
      icon: `img/item/${id}.png`,
    };
  });
}
