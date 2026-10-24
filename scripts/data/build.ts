// npm run data：下載三語遊戲資料、圖示、詞典，整理後寫到 public/data/ 和 public/img/。
// 原始下載檔放在 .cache/（不進倉庫），重跑時不會重複下載。
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import type { Champion, ChampionSummary, Meta, Rich, Tri } from '../../src/shared/types.ts';
import { richToPlain } from '../../src/shared/text.ts';
import { buildChampion, summarize } from './champions.ts';
import { findSimplified, toTraditional } from './chinese.ts';
import {
  CACHE_DIR,
  CDRAGON,
  CDRAGON_GAME,
  CDRAGON_LOCALE,
  CDRAGON_PLUGINS,
  CDRAGON_VERSION,
  CONTENT_DIR,
  DATA_DIR,
  DATA_SCHEMA,
  DDRAGON,
  DDRAGON_LOCALE,
  DDRAGON_VERSION,
  ECDICT_CSV_URL,
  ECDICT_LEMMA_URL,
  ECDICT_MIN_BYTES,
  IMG_DIR,
  LANGS,
  STRINGTABLE_LOCALE,
} from './config.ts';
import type { CDItemBin, CDPerk, CDPerkStyles, DDChampion, DDItem, DDRuneTree, DDSummoner, StringTable } from './ddragon-types.ts';
import { buildDictionary } from './dictionary.ts';
import { download, getJson, getText, mapLimit } from './http.ts';
import { buildItems, fillMissingDescriptions } from './items.ts';
import {
  buildEmotes,
  buildFinishers,
  buildIcons,
  buildLabels,
  buildSkins,
  buildWards,
  type CDEmote,
  type CDFinisher,
  type CDIcon,
  type CDSkin,
  type CDWard,
  parseClientJson,
} from './collection.ts';
import { decodePng, encodePng } from './png.ts';
import { cutShopIcons, SHOP_ATLASES, type ShopAtlas } from './shop-icons.ts';
import { cdragonAssetUrl, buildRunes } from './runes.ts';
import { buildSummoners } from './summoners.ts';
import { type QuotesFile, validateQuotes } from './quotes.ts';

type Lang = keyof Tri;

const unknownTags = new Map<string, number>();
const onUnknownTag = (tag: string) => unknownTags.set(tag, (unknownTags.get(tag) ?? 0) + 1);

async function ddragon<T>(lang: Lang, file: string): Promise<T> {
  const locale = DDRAGON_LOCALE[lang];
  return getJson<T>(
    `${DDRAGON}/cdn/${DDRAGON_VERSION}/data/${locale}/${file}`,
    join(CACHE_DIR, 'ddragon', DDRAGON_VERSION, locale, file),
  );
}

async function cdragon<T>(lang: Lang, file: string): Promise<T> {
  const locale = CDRAGON_LOCALE[lang];
  return getJson<T>(`${CDRAGON}/${locale}/v1/${file}`, join(CACHE_DIR, 'cdragon', CDRAGON_VERSION, locale, file));
}

/** 遊戲本體的檔案（很大，第一次要下載一陣子） */
async function cdragonGame<T>(path: string): Promise<T> {
  const cachePath = join(CACHE_DIR, 'cdragon', CDRAGON_VERSION, 'game', path);
  await download(`${CDRAGON_GAME}/${path}`, cachePath, { timeoutMs: 600_000 });
  return JSON.parse(await readFile(cachePath, 'utf8')) as T;
}

/** 客戶端收藏頁的翻譯檔（三語） */
async function clientTrans(file: string, lang: Lang): Promise<Record<string, string>> {
  const locale = CDRAGON_LOCALE[lang];
  const text = await getText(
    `${CDRAGON_PLUGINS}/rcp-fe-lol-collections/global/${locale}/${file}`,
    join(CACHE_DIR, 'cdragon', CDRAGON_VERSION, 'collections', locale, file),
  );
  return parseClientJson(text);
}

async function perLang<T>(load: (lang: Lang) => Promise<T>): Promise<Record<Lang, T>> {
  const [en, zh_TW, zh_CN] = await Promise.all(LANGS.map(load));
  return { en, zh_TW, zh_CN };
}

async function writeData(file: string, value: unknown) {
  const path = join(DATA_DIR, file);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value));
}

/** 把圖示下載到 public/img/，並刪掉這一版不再用到的舊圖示 */
async function syncIcons(icons: Map<string, string>): Promise<number> {
  let downloaded = 0;
  await mapLimit([...icons], 12, async ([rel, url]) => {
    if (await download(url, join(IMG_DIR, '..', rel))) downloaded++;
  });
  if (existsSync(IMG_DIR)) {
    for (const entry of await readdir(IMG_DIR, { recursive: true, withFileTypes: true })) {
      if (!entry.isFile()) continue;
      const rel = relative(join(IMG_DIR, '..'), join(entry.parentPath, entry.name)).split('\\').join('/');
      if (!icons.has(rel)) await rm(join(entry.parentPath, entry.name));
    }
  }
  return downloaded;
}

async function main() {
  const started = Date.now();
  console.log(`遊戲資料版本：Data Dragon ${DDRAGON_VERSION}、CommunityDragon ${CDRAGON_VERSION}`);

  console.log('[1/5] 下載三語資料…');
  const [championFull, items, summoners, runeTrees, perks, perkStyles, itemBins, stringTables, cdSkins, cdEmotes, cdIcons, cdWards, cdFinishers, collectionTrans, perksTrans] = await Promise.all([
    perLang((l) => ddragon<{ data: Record<string, DDChampion> }>(l, 'championFull.json')),
    perLang((l) => ddragon<{ data: Record<string, DDItem> }>(l, 'item.json')),
    perLang((l) => ddragon<{ data: Record<string, DDSummoner> }>(l, 'summoner.json')),
    perLang((l) => ddragon<DDRuneTree[]>(l, 'runesReforged.json')),
    perLang((l) => cdragon<CDPerk[]>(l, 'perks.json')),
    perLang((l) => cdragon<CDPerkStyles>(l, 'perkstyles.json')),
    cdragonGame<Record<string, CDItemBin>>('items.cdtb.bin.json'),
    perLang((l) => cdragonGame<StringTable>(`${STRINGTABLE_LOCALE[l]}/data/menu/en_us/lol.stringtable.json`)),
    perLang(async (l) => Object.values(await cdragon<Record<string, CDSkin>>(l, 'skins.json'))),
    perLang((l) => cdragon<CDEmote[]>(l, 'summoner-emotes.json')),
    perLang((l) => cdragon<CDIcon[]>(l, 'summoner-icons.json')),
    perLang((l) => cdragon<CDWard[]>(l, 'ward-skins.json')),
    perLang((l) => cdragon<CDFinisher[]>(l, 'nexusfinishers.json')),
    perLang((l) => clientTrans('trans.json', l)),
    perLang((l) => clientTrans('trans-perks.json', l)),
  ]);

  console.log('[2/5] 整理英雄、台詞、裝備、符文、召喚師技能…');
  const quotesFile = JSON.parse(await readFile(join(CONTENT_DIR, 'quotes.json'), 'utf8')) as QuotesFile;
  const championIds = Object.keys(championFull.en.data).sort();
  validateQuotes(quotesFile, championIds);

  await rm(DATA_DIR, { recursive: true, force: true });
  const champions: Champion[] = championIds.map((id) =>
    buildChampion(
      { en: championFull.en.data[id], zh_TW: championFull.zh_TW.data[id], zh_CN: championFull.zh_CN.data[id] },
      quotesFile.quotes.filter((q) => q.champion === id),
      onUnknownTag,
    ),
  );
  // 造型：原版也列，名稱和故事介紹用 CommunityDragon 的三語官方文字
  const ddSkinIds = new Map(championIds.map((id) => [id, new Set(championFull.en.data[id].skins.filter((sk) => sk.parentSkin == null).map((sk) => sk.id))]));
  const skinData = buildSkins(champions, ddSkinIds, cdSkins, onUnknownTag);
  for (const c of champions) c.skins = skinData.perChampion.get(c.id) ?? [];
  const index: ChampionSummary[] = champions
    .map((c) => summarize({ en: championFull.en.data[c.id], zh_TW: championFull.zh_TW.data[c.id], zh_CN: championFull.zh_CN.data[c.id] }))
    .sort((a, b) => a.name.en.localeCompare(b.name.en));
  await writeData('champions.json', index);
  for (const c of champions) await writeData(`champions/${c.id}.json`, c);

  const itemLocales = fillMissingDescriptions({ en: items.en.data, zh_TW: items.zh_TW.data, zh_CN: items.zh_CN.data }, itemBins, stringTables);
  const builtItems = buildItems(itemLocales, itemBins, stringTables, onUnknownTag);
  await writeData('items.json', builtItems);
  const runes = buildRunes(runeTrees, perks, perkStyles, onUnknownTag);
  await writeData('runes.json', runes);
  const spells = buildSummoners({ en: summoners.en.data, zh_TW: summoners.zh_TW.data, zh_CN: summoners.zh_CN.data }, onUnknownTag);
  await writeData('summoners.json', spells);

  // 收藏頁：造型格子、炫彩、表情、頭像、偵察守衛、終結特效、介面文字
  const emotes = buildEmotes(cdEmotes, onUnknownTag);
  const profileIcons = buildIcons(cdIcons, onUnknownTag);
  const wards = buildWards(cdWards, onUnknownTag);
  const finishers = buildFinishers(cdFinishers, onUnknownTag);
  await writeData('collection/skins.json', skinData.cards);
  await writeData('collection/chromas.json', skinData.chromas);
  await writeData('collection/emotes.json', emotes);
  await writeData('collection/icons.json', profileIcons);
  await writeData('collection/wards.json', wards);
  await writeData('collection/finishers.json', finishers);
  await writeData('collection/labels.json', buildLabels(
      collectionTrans,
      perksTrans,
      runes.trees.map((t) => t.key),
      `${CDRAGON_PLUGINS}/rcp-fe-lol-collections/global/default/perks/images/construct`,
    ));

  // 專有名詞清單（英文）：挖空時整個名稱都不挖。長的排前面，比對時先吃掉長名稱。
  const names = new Set<string>();
  for (const c of champions) {
    names.add(c.name.en);
    names.add(c.passive.name.en);
    for (const sp of c.spells) names.add(sp.name.en);
  }
  for (const it of builtItems) names.add(it.name.en);
  for (const tree of runes.trees) {
    names.add(tree.name.en);
    for (const r of tree.slots.flat()) names.add(r.name.en);
  }
  for (const s of spells) names.add(s.name.en);
  // 變身英雄的技能名寫成「A / B」或「A | B」，拆成兩個名稱
  const nameList = [...names].flatMap((n) => n.split(/\s*[/|]\s*/)).map((n) => n.trim()).filter(Boolean);
  await writeData('names.json', [...new Set(nameList)].sort((a, b) => b.length - a.length || a.localeCompare(b)));

  console.log('[3/5] 下載圖示…');
  const icons = new Map<string, string>();
  const cdn = `${DDRAGON}/cdn/${DDRAGON_VERSION}/img`;
  for (const id of championIds) {
    const c = championFull.en.data[id];
    icons.set(`img/champion/${c.image.full}`, `${cdn}/champion/${c.image.full}`);
    icons.set(`img/passive/${c.passive.image.full}`, `${cdn}/passive/${c.passive.image.full}`);
    for (const sp of c.spells) icons.set(`img/spell/${sp.image.full}`, `${cdn}/spell/${sp.image.full}`);
  }
  for (const item of builtItems) icons.set(item.icon, `${cdn}/item/${item.id}.png`);
  for (const s of Object.values(summoners.en.data)) {
    if (spells.some((x) => x.id === s.id)) icons.set(`img/summoner/${s.image.full}`, `${cdn}/spell/${s.image.full}`);
  }
  for (const tree of runeTrees.en) {
    icons.set(`img/rune/${tree.icon.split('/').pop()}`, `${DDRAGON}/cdn/img/${tree.icon}`);
    for (const slot of tree.slots) for (const r of slot.runes) icons.set(`img/rune/${r.icon.split('/').pop()}`, `${DDRAGON}/cdn/img/${r.icon}`);
  }
  for (const row of runes.shards) {
    for (const shard of row.shards) {
      const perk = perks.en.find((p) => p.id === shard.id)!;
      icons.set(shard.icon, cdragonAssetUrl(CDRAGON, perk.iconPath));
    }
  }
  // 客戶端介面圖：首頁大圖（K/DA ALL OUT 阿璃的造型大圖）、左上角標誌、書包（收藏）圖示、收藏頁背景
  icons.set('img/client/home.jpg', `${DDRAGON}/cdn/img/champion/splash/Ahri_28.jpg`);
  icons.set('img/client/league-logo.svg', `${CDRAGON_PLUGINS}/rcp-fe-lol-navigation/global/default/activity-center/league-logo-rest.svg`);
  icons.set('img/client/nav-collections.svg', `${CDRAGON_PLUGINS}/rcp-fe-lol-static-assets/global/default/images/nav-icon-collections.svg`);
  icons.set('img/client/collection-bg.png', `${CDRAGON_PLUGINS}/rcp-fe-lol-collections/global/default/images/background.png`);
  const downloaded = await syncIcons(icons);

  // 商店篩選圖示是從遊戲圖集切出來的，不在上面的下載清單裡（同步時會被當成舊檔刪掉），所以在這之後才寫
  const atlases = {} as Record<ShopAtlas, ReturnType<typeof decodePng>>;
  for (const name of SHOP_ATLASES) {
    const cachePath = join(CACHE_DIR, 'cdragon', CDRAGON_VERSION, 'game', 'itemshop', name);
    await download(`${CDRAGON_GAME}/assets/ux/itemshop/${name}`, cachePath);
    atlases[name] = decodePng(await readFile(cachePath));
  }
  const shopIcons = cutShopIcons(atlases);
  for (const [rel, image] of shopIcons) {
    await mkdir(dirname(join(IMG_DIR, '..', rel)), { recursive: true });
    await writeFile(join(IMG_DIR, '..', rel), encodePng(image));
  }

  console.log('[4/5] 建詞典（第一次要下載約 60MB 的 ECDICT）…');
  const csvPath = join(CACHE_DIR, 'ecdict.csv');
  await download(ECDICT_CSV_URL, csvPath, { minBytes: ECDICT_MIN_BYTES, timeoutMs: 600_000 });
  const lemmaText = await getText(ECDICT_LEMMA_URL, join(CACHE_DIR, 'lemma.en.txt'));

  const english: string[] = [];
  const zhTW: string[] = [];
  const addTri = (t: Tri<Rich>) => {
    english.push(richToPlain(t.en));
    zhTW.push(richToPlain(t.zh_TW));
  };
  for (const c of champions) {
    addTri(c.name);
    addTri(c.title);
    addTri(c.passive.name);
    addTri(c.passive.description);
    for (const sp of c.spells) (addTri(sp.name), addTri(sp.description));
    for (const sk of c.skins) {
      addTri(sk.name);
      if (sk.description) addTri(sk.description);
    }
    for (const q of c.quotes) {
      english.push(q.text.en);
      zhTW.push(q.text.zh_TW);
    }
  }
  for (const it of builtItems) (addTri(it.name), addTri(it.plaintext), addTri(it.description));
  for (const tree of runes.trees) {
    addTri(tree.name);
    for (const slot of tree.slots) for (const r of slot) (addTri(r.name), addTri(r.short), addTri(r.long));
  }
  for (const row of runes.shards) for (const s of row.shards) (addTri(s.name), addTri(s.description));
  for (const s of spells) (addTri(s.name), addTri(s.description));
  for (const group of skinData.chromas) for (const ch of group.chromas) addTri(ch.name);
  for (const it of [...emotes, ...profileIcons, ...wards, ...finishers]) {
    addTri(it.name);
    if (it.description) addTri(it.description);
  }

  const { dict, wordlists, report } = await buildDictionary({
    texts: english,
    properNouns: champions.map((c) => c.name.en),
    csvPath,
    lemmaText,
    toTraditional,
  });
  await writeData('dict.json', dict);
  await writeData('wordlists.json', wordlists);

  console.log('[5/5] 寫出版本資訊…');
  const counts = {
    champions: champions.length,
    spells: champions.reduce((n, c) => n + c.spells.length, 0),
    skins: champions.reduce((n, c) => n + c.skins.length, 0),
    quotes: champions.reduce((n, c) => n + c.quotes.length, 0),
    items: builtItems.length,
    runes: runes.trees.reduce((n, t) => n + t.slots.flat().length, 0),
    shards: runes.shards.reduce((n, r) => n + r.shards.length, 0),
    summoners: spells.length,
    skinStories: skinData.cards.filter((c) => c.story).length,
    chromas: skinData.chromas.reduce((n, g) => n + g.chromas.length, 0),
    emotes: emotes.length,
    profileIcons: profileIcons.length,
    wards: wards.length,
    finishers: finishers.length,
    icons: icons.size + shopIcons.size,
    dictWords: dict.meta.count,
  };
  const meta: Meta = {
    schema: DATA_SCHEMA,
    ddragon: DDRAGON_VERSION,
    cdragon: CDRAGON_VERSION,
    generatedAt: new Date().toISOString(),
    counts,
  };
  await writeData('meta.json', meta);

  const simplified = new Map<string, string>();
  for (const text of [...zhTW, ...Object.values(dict.words).map((w) => w.t ?? '')]) {
    for (const ch of findSimplified(text)) if (!simplified.has(ch)) simplified.set(ch, text.slice(0, 40));
  }

  console.log('\n===== 完成 =====');
  console.table(counts);
  console.log(`新下載圖示：${downloaded} 個`);
  console.log(`詞典：${dict.meta.count} 個原形、${dict.meta.forms} 個變形、${dict.meta.rare} 個生詞；查不到的字 ${report.unresolved.length} 個`);
  console.log('最常出現但查不到的字：', report.unresolved.slice(0, 30).map((u) => `${u.word}(${u.count})`).join(' '));
  if (unknownTags.size) console.log('沒見過的標籤（內容照留、不加樣式）：', Object.fromEntries(unknownTags));
  if (simplified.size) console.log('⚠ 繁中欄位裡疑似簡體字：', Object.fromEntries(simplified));
  console.log(`耗時 ${((Date.now() - started) / 1000).toFixed(1)} 秒`);
}

main().catch((error) => {
  console.error('建置失敗：', error);
  process.exit(1);
});
