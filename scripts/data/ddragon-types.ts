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
