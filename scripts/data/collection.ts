// 收藏頁的資料：造型（含故事介紹）、炫彩造型、表情、頭像、偵察守衛、終結特效，
// 以及客戶端收藏頁的介面文字（欄目名稱、符文系別標語等）。全部來自 CommunityDragon 的官方三語資料。
// 圖片只記網址（連網載入），不下載進專案。
import type {
  ChampionSummary,
  Chroma,
  ChromaGroup,
  Collectible,
  CollectionLabels,
  CollectionTab,
  Rich,
  Skin,
  SkinCard,
  Tri,
} from '../../src/shared/types.ts';
import { SKIN_RARITY } from './client-ui.ts';
import { CDRAGON } from './config.ts';
import { toPlain, toRich } from './markup.ts';

type Lang = keyof Tri;
type PerLang<T> = Record<Lang, T>;

/** CommunityDragon 資料裡的圖片路徑（/lol-game-data/assets/...）換成可以直接載入的網址 */
export function cdragonAsset(path: string): string {
  return `${CDRAGON}/default/${path.replace(/^\/lol-game-data\/assets\//, '').toLowerCase()}`;
}

export interface CDSkin {
  id: number;
  isBase: boolean;
  name: string;
  description?: string | null;
  tilePath?: string;
  /** 造型等級：kNoRarity、kEpic、kLegendary… */
  rarity?: string;
  chromas?: Array<{ id: number; name: string; chromaPath: string; colors?: string[] }>;
}
export interface CDEmote {
  id: number;
  name: string;
  description?: string;
  inventoryIcon: string;
}
export interface CDIcon {
  id: number;
  title: string;
  yearReleased?: number;
  imagePath: string;
  descriptions?: Array<{ region: string; description: string }>;
}
export interface CDWard {
  id: number;
  name: string;
  description?: string;
  wardImagePath: string;
  regionalDescriptions?: Array<{ region: string; description: string }>;
}
export interface CDFinisher {
  itemId: number;
  translatedName: string;
  translatedDescription?: string;
  iconPath: string;
}

const triOf = <T>(get: (lang: Lang) => T | undefined, fallback: T): Tri<T> => ({
  en: get('en') ?? fallback,
  zh_TW: get('zh_TW') ?? get('en') ?? fallback,
  zh_CN: get('zh_CN') ?? get('en') ?? fallback,
});

const byId = <T extends object>(list: T[], key: keyof T) => new Map(list.map((x) => [x[key] as unknown as number, x]));

/** 三種語言都有文字才算有說明；只有英文有的照樣用（中文行顯示英文） */
function richTri(texts: Tri<string | undefined>, onUnknownTag?: (tag: string) => void): Tri<Rich> | undefined {
  if (!texts.en?.trim()) return undefined;
  return {
    en: toRich(texts.en, onUnknownTag),
    zh_TW: toRich(texts.zh_TW?.trim() ? texts.zh_TW : texts.en, onUnknownTag),
    zh_CN: toRich(texts.zh_CN?.trim() ? texts.zh_CN : texts.en, onUnknownTag),
  };
}

export interface SkinData {
  /** 每位英雄的造型（含原版），放進英雄的資料檔 */
  perChampion: Map<string, Skin[]>;
  /** 收藏「造型」格子用的清單 */
  cards: SkinCard[];
  /** 收藏「炫彩造型」用，依造型分組 */
  chromas: ChromaGroup[];
}

/**
 * 造型：只收 Data Dragon 也有的（才有大圖和直式卡片圖可以載入），再加上原版造型。
 * 名稱和故事介紹用 CommunityDragon 的三語官方文字。
 */
export function buildSkins(
  champions: ChampionSummary[],
  ddSkinIds: Map<string, Set<string>>,
  cdSkins: PerLang<CDSkin[]>,
  onUnknownTag?: (tag: string) => void,
): SkinData {
  const championByKey = new Map(champions.map((c) => [Number(c.key), c]));
  const tw = byId(cdSkins.zh_TW, 'id');
  const cn = byId(cdSkins.zh_CN, 'id');
  const perChampion = new Map<string, Skin[]>();
  const cards: SkinCard[] = [];
  const chromas: ChromaGroup[] = [];

  for (const skin of [...cdSkins.en].sort((a, b) => a.id - b.id)) {
    const champion = championByKey.get(Math.floor(skin.id / 1000));
    if (!champion) continue;
    const num = skin.id % 1000;
    if (!skin.isBase && !ddSkinIds.get(champion.id)?.has(String(skin.id))) continue;
    const local = { en: skin, zh_TW: tw.get(skin.id), zh_CN: cn.get(skin.id) };
    // 原版造型就叫英雄名（CommunityDragon 簡中的原版造型名稱是稱號，和 Data Dragon 一樣對調了）
    const name = skin.isBase ? champion.name : triOf((l) => local[l]?.name?.trim() || undefined, skin.name);
    const description = richTri(
      { en: skin.description ?? undefined, zh_TW: local.zh_TW?.description ?? undefined, zh_CN: local.zh_CN?.description ?? undefined },
      onUnknownTag,
    );
    const tile = skin.tilePath ? cdragonAsset(skin.tilePath) : undefined;
    const rarity = skin.isBase ? 'base' : (SKIN_RARITY[skin.rarity ?? ''] ?? 'normal');
    const skinChromas: Chroma[] = (skin.chromas ?? []).map((c) => {
      const localName = (l: Lang) => (l === 'en' ? c.name : local[l]?.chromas?.find((x) => x.id === c.id)?.name);
      return { id: c.id, name: triOf((l) => toPlain(localName(l)) || undefined, c.name), image: cdragonAsset(c.chromaPath), colors: c.colors ?? [] };
    });

    const entry: Skin = {
      id: String(skin.id),
      num,
      name,
      rarity,
      ...(description ? { description } : {}),
      ...(tile ? { tile } : {}),
      ...(skinChromas.length ? { chromas: skinChromas.length } : {}),
    };
    perChampion.set(champion.id, [...(perChampion.get(champion.id) ?? []), entry]);
    cards.push({ id: skin.id, champion: champion.id, num, name, rarity, story: Boolean(description) });
    if (skinChromas.length) chromas.push({ skinId: skin.id, champion: champion.id, skinName: name, chromas: skinChromas });
  }
  return { perChampion, cards, chromas };
}

/** 表情：沒有圖示的不收 */
export function buildEmotes(emotes: PerLang<CDEmote[]>, onUnknownTag?: (tag: string) => void): Collectible[] {
  const tw = byId(emotes.zh_TW, 'id');
  const cn = byId(emotes.zh_CN, 'id');
  return emotes.en
    .filter((e) => e.name?.trim() && /\.(png|jpg)$/i.test(e.inventoryIcon))
    .map((e) => {
      const local = { en: e, zh_TW: tw.get(e.id), zh_CN: cn.get(e.id) };
      const description = richTri({ en: e.description, zh_TW: local.zh_TW?.description, zh_CN: local.zh_CN?.description }, onUnknownTag);
      return {
        id: e.id,
        name: triOf((l) => local[l]?.name?.trim() || undefined, e.name.trim()),
        ...(description ? { description } : {}),
        image: cdragonAsset(e.inventoryIcon),
      };
    });
}

const riotDescription = (list?: Array<{ region: string; description: string }>) =>
  list?.find((d) => d.region === 'riot')?.description ?? list?.[0]?.description;

export function buildIcons(icons: PerLang<CDIcon[]>, onUnknownTag?: (tag: string) => void): Collectible[] {
  const tw = byId(icons.zh_TW, 'id');
  const cn = byId(icons.zh_CN, 'id');
  return icons.en
    .filter((i) => i.title?.trim() && i.imagePath)
    .map((i) => {
      const local = { en: i, zh_TW: tw.get(i.id), zh_CN: cn.get(i.id) };
      const description = richTri(
        { en: riotDescription(i.descriptions), zh_TW: riotDescription(local.zh_TW?.descriptions), zh_CN: riotDescription(local.zh_CN?.descriptions) },
        onUnknownTag,
      );
      return {
        id: i.id,
        name: triOf((l) => local[l]?.title?.trim() || undefined, i.title.trim()),
        ...(description ? { description } : {}),
        image: cdragonAsset(i.imagePath),
        ...(i.yearReleased ? { year: i.yearReleased } : {}),
      };
    });
}

/** 偵察守衛：短說明（例如「2012 萬聖節守衛」）和較長的官方說明都有的話，兩段都放 */
export function buildWards(wards: PerLang<CDWard[]>, onUnknownTag?: (tag: string) => void): Collectible[] {
  const tw = byId(wards.zh_TW, 'id');
  const cn = byId(wards.zh_CN, 'id');
  const text = (w: CDWard | undefined) =>
    w ? [w.description, riotDescription(w.regionalDescriptions)].filter((t) => t?.trim()).join('<br>') || undefined : undefined;
  return wards.en
    .filter((w) => w.name?.trim() && w.wardImagePath)
    .map((w) => {
      const local = { en: w, zh_TW: tw.get(w.id), zh_CN: cn.get(w.id) };
      const description = richTri({ en: text(w), zh_TW: text(local.zh_TW), zh_CN: text(local.zh_CN) }, onUnknownTag);
      return {
        id: w.id,
        name: triOf((l) => local[l]?.name?.trim() || undefined, w.name.trim()),
        ...(description ? { description } : {}),
        image: cdragonAsset(w.wardImagePath),
      };
    });
}

export function buildFinishers(finishers: PerLang<CDFinisher[]>, onUnknownTag?: (tag: string) => void): Collectible[] {
  const tw = byId(finishers.zh_TW, 'itemId');
  const cn = byId(finishers.zh_CN, 'itemId');
  return [...finishers.en]
    .sort((a, b) => a.itemId - b.itemId)
    .map((f) => {
      const local = { en: f, zh_TW: tw.get(f.itemId), zh_CN: cn.get(f.itemId) };
      const description = richTri(
        { en: f.translatedDescription, zh_TW: local.zh_TW?.translatedDescription, zh_CN: local.zh_CN?.translatedDescription },
        onUnknownTag,
      );
      return {
        id: f.itemId,
        name: triOf((l) => local[l]?.translatedName?.trim() || undefined, f.translatedName),
        ...(description ? { description } : {}),
        image: cdragonAsset(f.iconPath),
      };
    });
}

/** 收藏頁上方欄目的順序，和遊戲一樣；後面是客戶端翻譯檔裡的鍵 */
export const COLLECTION_TABS: Array<[CollectionTab, string]> = [
  ['champions', 'collections_sub_nav_collectibles_champions'],
  ['skins', 'collections_sub_nav_skins_viewer'],
  ['emotes', 'collections_sub_nav_emotes'],
  ['runes', 'collections_sub_nav_rune_book'],
  ['spells', 'collections_sub_nav_summoner_spells'],
  ['items', 'collections_sub_nav_items'],
  ['icons', 'collections_sub_nav_collectibles_icons'],
  ['wards', 'collections_sub_nav_collectibles_wards'],
  ['chromas', 'collections_sub_nav_collectibles_chromas'],
  ['finishers', 'collections_sub_nav_collectibles_finishers'],
];

/** 客戶端翻譯檔開頭可能有 BOM，先拿掉再解析 */
export const parseClientJson = (text: string) => JSON.parse(text.replace(/^﻿/, '')) as Record<string, string>;

/**
 * 介面文字：欄目名稱、符文系別標語（例如「巫術／釋放破壞／強化技能、資源掌控」）、
 * 召喚師技能的模式名稱等，全部取自客戶端收藏頁的翻譯檔。找不到的鍵就報錯，不自己寫。
 */
export function buildLabels(
  trans: PerLang<Record<string, string>>,
  perks: PerLang<Record<string, string>>,
  treeKeys: string[],
  runeArt: string,
): CollectionLabels {
  const pick = (table: PerLang<Record<string, string>>, key: string): Tri => {
    if (!table.en[key]) throw new Error(`客戶端翻譯檔裡找不到 ${key}`);
    return triOf((l) => table[l][key], table.en[key]);
  };
  const runeTrees: CollectionLabels['runeTrees'] = {};
  for (const key of treeKeys) {
    const k = key.toLowerCase();
    runeTrees[key] = { slogan: pick(perks, `perks_${k}_short_desc_1`), tagline: pick(perks, `perks_${k}_short_desc_2`) };
  }
  const spellModes: Record<string, Tri> = {};
  for (const key of Object.keys(trans.en)) {
    const m = /^summoner_spell_game_mode_(.+)$/.exec(key);
    if (m) spellModes[m[1]] = pick(trans, key);
  }
  return {
    tabs: Object.fromEntries(COLLECTION_TABS.map(([tab, key]) => [tab, pick(trans, key)])) as Record<CollectionTab, Tri>,
    runeTrees,
    keystones: pick(perks, 'perks_keystones'),
    spellModes,
    summonerLevel: pick(trans, 'summoner_spell_summoner_level'),
    cooldown: pick(trans, 'summoner_spell_summoner_cooldown_display'),
    search: pick(trans, 'control_panel_search_placeholder'),
    allChampions: pick(trans, 'control_panel_grouping_all_champions'),
    alphabetical: pick(trans, 'control_panel_sorting_alphabetical_ascending'),
    runeArt,
  };
}
