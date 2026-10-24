// 網址 #/collection/champions/Ahri 這類形式 ↔ 頁面。可以加書籤、可以按上一頁。
// 舊網址（#/champions/Ahri、#/items/3157、#/runes、#/summoners）照樣能用，會對到收藏裡的同一頁。
import type { CollectionTab } from '../shared/types.ts';

export type ChampionSection = 'skills' | 'quotes' | 'skins';

export type Route =
  | { page: 'home' }
  /** 收藏；id 是英雄、裝備等的代號，section 是英雄頁的子欄目，skin 是造型編號 */
  | { page: 'collection'; tab: CollectionTab; id?: string; section?: ChampionSection; skin?: number };

export const COLLECTION_TAB_IDS: CollectionTab[] = ['champions', 'skins', 'emotes', 'runes', 'spells', 'items', 'icons', 'wards', 'chromas', 'finishers'];
const SECTIONS: ChampionSection[] = ['skills', 'quotes', 'skins'];

function championRoute(id: string | undefined, section?: string, skin?: string): Route {
  if (!id) return { page: 'collection', tab: 'champions' };
  const s = SECTIONS.includes(section as ChampionSection) ? (section as ChampionSection) : 'skills';
  const num = s === 'skins' && skin && Number.isFinite(Number(skin)) ? { skin: Number(skin) } : {};
  return { page: 'collection', tab: 'champions', id, section: s, ...num };
}

export function parseHash(hash: string): Route {
  const parts = hash
    .replace(/^#\/?/, '')
    .split('/')
    .filter(Boolean)
    .map((p) => decodeURIComponent(p));
  switch (parts[0]) {
    case 'collection': {
      const tab = COLLECTION_TAB_IDS.includes(parts[1] as CollectionTab) ? (parts[1] as CollectionTab) : 'champions';
      if (tab === 'champions') return championRoute(parts[2], parts[3], parts[4]);
      return { page: 'collection', tab, ...(parts[2] ? { id: parts[2] } : {}) };
    }
    // 舊網址
    case 'champions':
      return championRoute(parts[1]);
    case 'items':
      return { page: 'collection', tab: 'items', ...(parts[1] ? { id: parts[1] } : {}) };
    case 'runes':
      return { page: 'collection', tab: 'runes' };
    case 'summoners':
      return { page: 'collection', tab: 'spells' };
    default:
      return { page: 'home' };
  }
}

export function href(...parts: Array<string | number>): string {
  return `#/${parts.map((p) => encodeURIComponent(String(p))).join('/')}`;
}

/** 收藏裡某一頁的網址，例如 collectionHref('items', '3157') */
export const collectionHref = (tab: CollectionTab, ...rest: Array<string | number>) => href('collection', tab, ...rest);
