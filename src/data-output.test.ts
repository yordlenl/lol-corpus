// 檢查 npm run data 產出的資料（存在倉庫裡的 public/data、public/img）。
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { findSimplified } from '../scripts/data/chinese.ts';
import { DDRAGON_VERSION } from '../scripts/data/config.ts';
import type { Champion, ChampionSummary, Dictionary, Item, Meta, RuneData, SummonerSpell, Tri, Rich } from './shared/types.ts';
import { richToPlain } from './shared/text.ts';

const PUBLIC = new URL('../public/', import.meta.url);
const read = <T>(path: string): T => JSON.parse(readFileSync(new URL(`data/${path}`, PUBLIC), 'utf8')) as T;

const meta = read<Meta>('meta.json');
const index = read<ChampionSummary[]>('champions.json');
const champions = index.map((c) => read<Champion>(`champions/${c.id}.json`));
const items = read<Item[]>('items.json');
const runes = read<RuneData>('runes.json');
const summoners = read<SummonerSpell[]>('summoners.json');
const dict = read<Dictionary>('dict.json');

/** Riot 台服官方資料裡本來就有的簡體字（不是我們轉換造成的），列在這裡；出現新的就要檢查 */
const OFFICIAL_KNOWN = new Set(['并']);

describe('遊戲資料', () => {
  it('版本與設定一致', () => {
    expect(meta.ddragon).toBe(DDRAGON_VERSION);
  });

  it('英雄 173 位，每位都有被動、四個技能、選用和禁用台詞', () => {
    expect(champions).toHaveLength(173);
    for (const c of champions) {
      expect(c.spells.map((s) => s.slot)).toEqual(['Q', 'W', 'E', 'R']);
      expect(c.quotes.some((q) => q.event === 'pick') && c.quotes.some((q) => q.event === 'ban')).toBe(true);
    }
    expect(champions.reduce((n, c) => n + c.quotes.length, 0)).toBe(346);
  });

  it('簡中的英雄名放在 name、稱號放在 title（已對調回來）', () => {
    const ahri = index.find((c) => c.id === 'Ahri')!;
    expect(ahri.name).toEqual({ en: 'Ahri', zh_TW: '阿璃', zh_CN: '阿狸' });
    expect(ahri.title.zh_CN).toBe('九尾妖狐');
  });

  it('裝備名稱不重複，也沒有其他模式的 6 位數 ID', () => {
    expect(new Set(items.map((i) => i.name.en)).size).toBe(items.length);
    expect(items.every((i) => i.id.length <= 4)).toBe(true);
    expect(items.filter((i) => i.name.en === "Archangel's Staff").map((i) => i.id)).toEqual(['3003']);
  });

  it('裝備分成起始、基礎、中間件、傳說四區（官方等級）', () => {
    const tierOf = (name: string) => items.find((i) => i.name.en === name)!.tier;
    expect(new Set(items.map((i) => i.tier))).toEqual(new Set(['starter', 'basic', 'epic', 'legendary']));
    expect(tierOf("Doran's Blade")).toBe('starter');
    expect(tierOf('Health Potion')).toBe('starter');
    expect(tierOf('Long Sword')).toBe('basic');
    expect(tierOf('Boots')).toBe('basic');
    expect(tierOf("Berserker's Greaves")).toBe('epic');
    expect(tierOf('Swiftmarch')).toBe('legendary');
    expect(tierOf("Rabadon's Deathcap")).toBe('legendary');
  });

  it('裝備的職業是官方欄位', () => {
    const rolesOf = (name: string) => items.find((i) => i.name.en === name)!.roles;
    expect(rolesOf('Infinity Edge')).toEqual(['Marksman']);
    expect(rolesOf('Sunfire Aegis')).toEqual(['Tank']);
    expect(rolesOf("Rabadon's Deathcap")).toEqual(['Mage']);
    expect(rolesOf('Moonstone Renewer')).toEqual(['Support']);
    expect(rolesOf("Doran's Blade")).toEqual(['Fighter', 'Marksman', 'Assassin']);
  });

  it('升級後的裝備（例如芬布爾之冬）有收進來、標明由哪一件升級，商店格子不列', () => {
    const byId = new Map(items.map((i) => [i.id, i]));
    const chain = (id: string) => byId.get(id)!.upgradesTo ?? [];
    expect(chain('3119')).toEqual(['3121']); // 凜冬將至 → 芬布爾之冬
    expect(chain('3004')).toEqual(['3042']); // 魔劍正宗 → 終極魔劍
    expect(chain('3003')).toEqual(['3040']); // 大天使之杖 → 熾天使的擁抱
    expect(chain('2526')).toEqual(['2530']); // 低語之環 → 歌謠之冠
    expect(chain('3865')).toEqual(['3866']); // 世界地圖 → 符文指針 → 跨界獎賞 → 五件輔助傳說裝備
    expect(chain('3866')).toEqual(['3867']);
    expect(chain('3867')).toHaveLength(5);
    const only = items.filter((i) => i.upgradeOnly).map((i) => i.id).sort();
    expect(only).toEqual(['2530', '3040', '3042', '3121', '3866', '3867']);
    for (const id of only) {
      const it = byId.get(id)!;
      const source = byId.get(it.upgradedFrom!)!;
      expect(source.upgradesTo).toContain(id);
      expect(it.tier).toBe(source.tier);
    }
    for (const id of chain('3867')) expect(byId.get(id)!.upgradedFrom).toBe('3867');
  });

  it('升級後裝備的描述是官方文字，即時計算的數字標成空缺（三種語言都有標）', () => {
    const gaps = (text: Rich) => (typeof text === 'string' ? [] : text.filter((r) => typeof r !== 'string' && r[1] === 'gap'));
    const fimbulwinter = items.find((i) => i.id === '3121')!;
    for (const text of Object.values(fimbulwinter.description)) expect(gaps(text)).toHaveLength(1);
    expect(richToPlain(fimbulwinter.description.zh_TW)).toContain('獲得□生命');
    // 符文指針的任務金額 Data Dragon 寫 0，遊戲文字檔有正確的數字
    expect(richToPlain(items.find((i) => i.id === '3866')!.description.en)).toContain('Earn 800 gold');
    // 終極魔劍沒有即時計算的數字
    expect(gaps(items.find((i) => i.id === '3042')!.description.en)).toHaveLength(0);
  });

  it('所有裝備描述都沒有留下沒處理的代號', () => {
    for (const it of items) for (const text of Object.values(it.description)) expect(richToPlain(text)).not.toMatch(/@\w+@|\{\{|%i:/);
  });

  it('世界地圖（描述原本是空的）補上了三語官方描述', () => {
    const atlas = items.find((i) => i.id === '3865')!;
    expect(atlas.name.zh_TW).toBe('世界地圖');
    expect(atlas.tier).toBe('starter');
    expect(atlas.roles).toContain('Support');
    for (const text of Object.values(atlas.description)) {
      expect(richToPlain(text)).toMatch(/400/);
      expect(richToPlain(text)).not.toMatch(/[@%]i:|\{\{/);
    }
    expect(richToPlain(atlas.description.zh_TW)).toContain('輔助任務');
  });

  it('符文有五系，每系一排基石加三排小符文；屬性碎片三排', () => {
    expect(runes.trees).toHaveLength(5);
    for (const t of runes.trees) expect(t.slots).toHaveLength(4);
    expect(runes.shards).toHaveLength(3);
  });

  it('召喚師技能 9 個', () => {
    expect(summoners).toHaveLength(9);
  });

  it('所有圖示檔都在', () => {
    const icons = [
      ...index.map((c) => c.icon),
      ...champions.flatMap((c) => [c.passive.icon, ...c.spells.map((s) => s.icon)]),
      ...items.map((i) => i.icon),
      ...runes.trees.flatMap((t) => [t.icon, ...t.slots.flat().map((r) => r.icon)]),
      ...runes.shards.flatMap((r) => r.shards.map((s) => s.icon)),
      ...summoners.map((s) => s.icon),
    ];
    const missing = icons.filter((icon) => !existsSync(new URL(icon, PUBLIC)));
    expect(missing).toEqual([]);
  });
});

describe('繁中沒有簡體字', () => {
  it('台詞的繁中（OpenCC 轉換）', () => {
    const found = champions.flatMap((c) => c.quotes.flatMap((q) => findSimplified(q.text.zh_TW)));
    expect(found).toEqual([]);
  });

  it('詞典的繁體釋義', () => {
    const found = Object.values(dict.words).flatMap((w) => findSimplified(w.t ?? ''));
    expect([...new Set(found)]).toEqual([]);
  });

  it('台服官方文字只有已知的幾個字', () => {
    const texts: string[] = [];
    const add = (t: Tri<Rich>) => texts.push(richToPlain(t.zh_TW));
    for (const c of champions) {
      add(c.name);
      add(c.title);
      add(c.passive.name);
      add(c.passive.description);
      for (const s of c.spells) (add(s.name), add(s.description));
      for (const s of c.skins) add(s.name);
    }
    for (const i of items) (add(i.name), add(i.plaintext), add(i.description));
    for (const t of runes.trees) for (const r of t.slots.flat()) (add(r.name), add(r.long));
    for (const s of summoners) (add(s.name), add(s.description));
    const unexpected = [...new Set(texts.flatMap(findSimplified))].filter((ch) => !OFFICIAL_KNOWN.has(ch));
    expect(unexpected).toEqual([]);
  });
});
