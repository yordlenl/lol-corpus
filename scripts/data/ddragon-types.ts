// Data Dragon / CommunityDragon 原始資料裡用得到的欄位。

export interface DDImage {
  full: string;
}

export interface DDSpell {
  name: string;
  description: string;
  cooldownBurn: string;
  costBurn: string;
  rangeBurn: string;
  image: DDImage;
}

export interface DDChampion {
  id: string;
  key: string;
  name: string;
  title: string;
  tags: string[];
  image: DDImage;
  passive: { name: string; description: string; image: DDImage };
  spells: DDSpell[];
  skins: Array<{ id: string; num: number; name: string; parentSkin?: number }>;
}

export interface DDItem {
  name: string;
  description?: string;
  plaintext?: string;
  from?: string[];
  into?: string[];
  tags?: string[];
  depth?: number;
  maps?: Record<string, boolean>;
  gold?: { base: number; total: number; sell: number; purchasable: boolean };
  hideFromAll?: boolean;
  requiredChampion?: string;
  requiredAlly?: string;
  inStore?: boolean;
}

/** CommunityDragon 遊戲裝備資料（items.cdtb.bin.json）裡用到的欄位 */
export interface CDItemBin {
  itemID?: number;
  /** 官方等級：沒有這欄是基礎，1 起始，4 中間件，5 傳說，7 三階鞋和藥劑 */
  epicness?: number;
  /** 官方職業，每個值是一種：1 鬥士、2 射手、4 刺客、8 坦克、16 法師、32 輔助 */
  mItemAttributes?: number[];
  mEffectAmount?: number[];
  mDataValues?: Array<{ mName: string; mValue: number }>;
  /** 依英雄屬性即時計算的公式（文字檔裡寫成 @公式名稱@） */
  mItemCalculations?: Record<string, unknown>;
  [field: string]: unknown;
}

/** 遊戲文字檔（lol.stringtable.json） */
export interface StringTable {
  entries: Record<string, string>;
}

export interface DDRune {
  id: number;
  key: string;
  icon: string;
  name: string;
  shortDesc: string;
  longDesc: string;
}

export interface DDRuneTree {
  id: number;
  key: string;
  icon: string;
  name: string;
  slots: Array<{ runes: DDRune[] }>;
}

export interface DDSummoner {
  id: string;
  key: string;
  name: string;
  description: string;
  cooldownBurn: string;
  modes: string[];
  image: DDImage;
}

export interface CDPerk {
  id: number;
  name: string;
  shortDesc: string;
  longDesc: string;
  iconPath: string;
}

export interface CDPerkStyles {
  styles: Array<{
    id: number;
    slots: Array<{ type: string; slotLabel: string; perks: number[] }>;
  }>;
}
