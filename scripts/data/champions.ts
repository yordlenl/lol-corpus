// 英雄：名稱、稱號、被動、Q/W/E/R、皮膚名，再接上台詞。
import type { Champion, ChampionSummary, Quote, Spell, Tri } from '../../src/shared/types.ts';
import type { DDChampion } from './ddragon-types.ts';
import { toRich } from './markup.ts';

const SLOTS = ['Q', 'W', 'E', 'R'] as const;

export function summarize(c: Record<keyof Tri, DDChampion>): ChampionSummary {
  // 簡中語言包的 name 和 title 是對調的（name 放「九尾妖狐」、title 放「阿狸」），這裡換回來
  return {
    id: c.en.id,
    key: c.en.key,
    name: { en: c.en.name, zh_TW: c.zh_TW.name, zh_CN: c.zh_CN.title },
    title: { en: c.en.title, zh_TW: c.zh_TW.title, zh_CN: c.zh_CN.name },
    tags: c.en.tags,
    icon: `img/champion/${c.en.image.full}`,
  };
}

export function buildChampion(
  c: Record<keyof Tri, DDChampion>,
  quotes: Quote[],
  onUnknownTag?: (tag: string) => void,
): Champion {
  const spells: Spell[] = c.en.spells.map((sp, i) => ({
    slot: SLOTS[i],
    name: { en: sp.name, zh_TW: c.zh_TW.spells[i].name, zh_CN: c.zh_CN.spells[i].name },
    description: {
      en: toRich(sp.description, onUnknownTag),
      zh_TW: toRich(c.zh_TW.spells[i].description, onUnknownTag),
      zh_CN: toRich(c.zh_CN.spells[i].description, onUnknownTag),
    },
    cooldown: sp.cooldownBurn,
    cost: sp.costBurn,
    range: sp.rangeBurn,
    icon: `img/spell/${sp.image.full}`,
  }));

  return {
    ...summarize(c),
    passive: {
      name: { en: c.en.passive.name, zh_TW: c.zh_TW.passive.name, zh_CN: c.zh_CN.passive.name },
      description: {
        en: toRich(c.en.passive.description, onUnknownTag),
        zh_TW: toRich(c.zh_TW.passive.description, onUnknownTag),
        zh_CN: toRich(c.zh_CN.passive.description, onUnknownTag),
      },
      icon: `img/passive/${c.en.passive.image.full}`,
    },
    spells,
    // 造型在 collection.ts 的 buildSkins 補上（名稱、故事、等級都用 CommunityDragon 的官方資料）
    skins: [],
    quotes,
  };
}
