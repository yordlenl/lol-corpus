// 裝備商店的篩選、分區與合成樹（不含畫面，方便測試）。
// 篩選的名稱用遊戲台服商店的官方文字；圖示是 npm run data 從遊戲圖集切出來的（public/img/shop/）。
import type { Item, ItemRole, ItemTier } from '../../shared/types.ts';

export type RoleFilter = ItemRole | 'all';

export const ROLE_FILTERS: Array<{ role: RoleFilter; icon: string; label: string }> = [
  { role: 'all', icon: 'all', label: '全部道具' },
  { role: 'Fighter', icon: 'fighter', label: '鬥士' },
  { role: 'Marksman', icon: 'marksman', label: '射手' },
  { role: 'Assassin', icon: 'assassin', label: '刺客' },
  { role: 'Mage', icon: 'mage', label: '法師' },
  { role: 'Tank', icon: 'tank', label: '坦克' },
  { role: 'Support', icon: 'support', label: '輔助' },
];

export interface StatFilter {
  key: string;
  label: string;
  en: string;
  /** 裝備有其中任何一個標籤就算符合 */
  tags: string[];
}

/** 左側的屬性篩選，分成物理、魔法、防禦、其他四組（組和組之間畫一條線） */
export const STAT_GROUPS: StatFilter[][] = [
  [
    { key: 'ad', label: '物理攻擊', en: 'Attack Damage', tags: ['Damage'] },
    { key: 'crit', label: '暴擊', en: 'Critical Strike', tags: ['CriticalStrike'] },
    { key: 'attackspeed', label: '攻擊速度', en: 'Attack Speed', tags: ['AttackSpeed'] },
    { key: 'onhit', label: '命中效果', en: 'On-Hit Effects', tags: ['OnHit'] },
    { key: 'armorpen', label: '物理穿透', en: 'Armor Penetration', tags: ['ArmorPenetration'] },
  ],
  [
    { key: 'ap', label: '魔法攻擊', en: 'Ability Power', tags: ['SpellDamage'] },
    { key: 'mana', label: '魔力 & 回復', en: 'Mana & Regeneration', tags: ['Mana', 'ManaRegen'] },
    { key: 'magicpen', label: '魔法穿透', en: 'Magic Penetration', tags: ['MagicPenetration'] },
  ],
  [
    { key: 'health', label: '生命 & 回復', en: 'Health & Regeneration', tags: ['Health', 'HealthRegen'] },
    { key: 'armor', label: '物理防禦', en: 'Armor', tags: ['Armor'] },
    { key: 'mr', label: '魔法防禦', en: 'Magic Resistance', tags: ['SpellBlock', 'MagicResist'] },
  ],
  [
    { key: 'haste', label: '技能加速', en: 'Ability Haste', tags: ['AbilityHaste', 'CooldownReduction'] },
    { key: 'movespeed', label: '跑速', en: 'Movement', tags: ['Boots', 'NonbootsMovement'] },
    { key: 'lifesteal', label: '普攻吸血與全能吸血', en: 'Life Steal & Omnivamp', tags: ['LifeSteal', 'SpellVamp'] },
  ],
];

export const STAT_FILTERS = STAT_GROUPS.flat();

export const TIER_SECTIONS: Array<{ tier: ItemTier; label: string; en: string }> = [
  { tier: 'starter', label: '起始', en: 'STARTER' },
  { tier: 'basic', label: '基礎', en: 'BASIC' },
  { tier: 'epic', label: '中間件', en: 'EPIC' },
  { tier: 'legendary', label: '傳說', en: 'LEGENDARY' },
];

export const shopIcon = (name: string, on = false) => `img/shop/${name}${on ? '-on' : ''}.png`;

export function matchesItem(item: Item, query: string): boolean {
  const q = query.trim().toLowerCase();
  return !q || Object.values(item.name).some((n) => n.toLowerCase().includes(q));
}

export interface ShopFilter {
  role: RoleFilter;
  /** 選了的屬性篩選（key），要全部符合 */
  stats: string[];
  query: string;
}

export function matchesFilter(item: Item, filter: ShopFilter): boolean {
  if (filter.role !== 'all' && !item.roles.includes(filter.role)) return false;
  for (const key of filter.stats) {
    const stat = STAT_FILTERS.find((s) => s.key === key);
    if (stat && !stat.tags.some((t) => item.tags.includes(t))) return false;
  }
  return matchesItem(item, filter.query);
}

/** 照四區分好，每區依價格排；沒有東西的區不列。只能升級得到的裝備商店買不到，不列 */
export function shopSections(items: Item[], filter: ShopFilter) {
  const shown = items.filter((it) => !it.upgradeOnly && matchesFilter(it, filter));
  return TIER_SECTIONS.map((section) => ({
    ...section,
    items: shown
      .filter((it) => it.tier === section.tier)
      .sort((a, b) => a.gold.total - b.gold.total || a.name.en.localeCompare(b.name.en)),
  })).filter((section) => section.items.length);
}

export interface BuildNode {
  item: Item;
  children: BuildNode[];
}

/** 合成樹：這件裝備在最上面，下面是材料，材料還有材料就再往下一層 */
export function buildTree(item: Item, byId: Map<string, Item>): BuildNode {
  return {
    item,
    children: item.from.flatMap((id) => {
      const part = byId.get(id);
      return part ? [buildTree(part, byId)] : [];
    }),
  };
}

/** 「可合成」那一排的格數：一排 7 格，裝備比較多就多排幾排，不夠的補空格 */
export const INTO_SLOTS_PER_ROW = 7;
export function intoSlots(count: number): number {
  return Math.max(1, Math.ceil(count / INTO_SLOTS_PER_ROW)) * INTO_SLOTS_PER_ROW;
}

export const priceLabel = (gold: number) => (gold === 0 ? '免費' : String(gold));

/** 合成樹上的價格；只能升級得到的裝備寫「升級」 */
export const itemPriceLabel = (item: Item) => (item.upgradeOnly ? '升級' : priceLabel(item.gold.total));
