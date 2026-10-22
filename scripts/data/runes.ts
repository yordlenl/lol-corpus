// 符文：系、排、符文的層級照遊戲；屬性碎片來自 CommunityDragon。
import type { RuneData, StatShardRow, Tri } from '../../src/shared/types.ts';
import type { CDPerk, CDPerkStyles, DDRuneTree } from './ddragon-types.ts';
import { toPlain, toRich } from './markup.ts';

const basename = (path: string) => path.split('/').pop()!;

/** CommunityDragon 的圖示路徑 → 下載網址（路徑一律小寫） */
export function cdragonAssetUrl(cdragonBase: string, iconPath: string): string {
  return `${cdragonBase}/default/v1/${iconPath.replace(/^\/lol-game-data\/assets\/v1\//, '').toLowerCase()}`;
}

export function buildRunes(
  trees: Record<keyof Tri, DDRuneTree[]>,
  perks: Record<keyof Tri, CDPerk[]>,
  styles: Record<keyof Tri, CDPerkStyles>,
  onUnknownTag?: (tag: string) => void,
): RuneData {
  const treeIn = (lang: keyof Tri, id: number) => trees[lang].find((t) => t.id === id)!;
  const runeIn = (lang: keyof Tri, treeId: number, slot: number, runeId: number) =>
    treeIn(lang, treeId).slots[slot].runes.find((r) => r.id === runeId)!;

  const builtTrees = trees.en.map((tree) => ({
    id: tree.id,
    key: tree.key,
    name: { en: tree.name, zh_TW: treeIn('zh_TW', tree.id).name, zh_CN: treeIn('zh_CN', tree.id).name },
    icon: `img/rune/${basename(tree.icon)}`,
    slots: tree.slots.map((slot, s) =>
      slot.runes.map((rune) => {
        const tw = runeIn('zh_TW', tree.id, s, rune.id);
        const cn = runeIn('zh_CN', tree.id, s, rune.id);
        return {
          id: rune.id,
          key: rune.key,
          name: { en: rune.name, zh_TW: tw.name, zh_CN: cn.name },
          short: {
            en: toRich(rune.shortDesc, onUnknownTag),
            zh_TW: toRich(tw.shortDesc, onUnknownTag),
            zh_CN: toRich(cn.shortDesc, onUnknownTag),
          },
          long: {
            en: toRich(rune.longDesc, onUnknownTag),
            zh_TW: toRich(tw.longDesc, onUnknownTag),
            zh_CN: toRich(cn.longDesc, onUnknownTag),
          },
          icon: `img/rune/${basename(rune.icon)}`,
        };
      }),
    ),
  }));

  // 屬性碎片的三排在每個系都一樣，取第一個系的
  const statSlots = (lang: keyof Tri) => styles[lang].styles[0].slots.filter((s) => s.type === 'kStatMod');
  const perkIn = (lang: keyof Tri, id: number) => perks[lang].find((p) => p.id === id)!;
  const shards: StatShardRow[] = statSlots('en').map((slot, row) => ({
    label: { en: slot.slotLabel, zh_TW: statSlots('zh_TW')[row].slotLabel, zh_CN: statSlots('zh_CN')[row].slotLabel },
    shards: slot.perks.map((id) => {
      const en = perkIn('en', id);
      return {
        id,
        name: { en: toPlain(en.name), zh_TW: toPlain(perkIn('zh_TW', id).name), zh_CN: toPlain(perkIn('zh_CN', id).name) },
        description: {
          en: toRich(en.shortDesc, onUnknownTag),
          zh_TW: toRich(perkIn('zh_TW', id).shortDesc, onUnknownTag),
          zh_CN: toRich(perkIn('zh_CN', id).shortDesc, onUnknownTag),
        },
        icon: `img/shard/${basename(en.iconPath).toLowerCase()}`,
      };
    }),
  }));

  return { trees: builtTrees, shards };
}
