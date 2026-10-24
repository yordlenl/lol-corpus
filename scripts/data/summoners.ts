// 召喚師技能：只留召喚峽谷（CLASSIC 模式）能用的。
import type { SummonerSpell, Tri } from '../../src/shared/types.ts';
import type { DDSummoner } from './ddragon-types.ts';
import { toRich } from './markup.ts';

export function buildSummoners(
  locales: Record<keyof Tri, Record<string, DDSummoner>>,
  onUnknownTag?: (tag: string) => void,
): SummonerSpell[] {
  return Object.values(locales.en)
    .filter((s) => s.modes.includes('CLASSIC'))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((s) => ({
      id: s.id,
      key: s.key,
      name: { en: s.name, zh_TW: locales.zh_TW[s.id].name, zh_CN: locales.zh_CN[s.id].name },
      description: {
        en: toRich(s.description, onUnknownTag),
        zh_TW: toRich(locales.zh_TW[s.id].description, onUnknownTag),
        zh_CN: toRich(locales.zh_CN[s.id].description, onUnknownTag),
      },
      cooldown: s.cooldownBurn,
      icon: `img/summoner/${s.image.full}`,
      summonerLevel: s.summonerLevel,
      modes: s.modes,
    }));
}
