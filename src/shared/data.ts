// 讀語料庫的遊戲資料。語料庫自己、學習 App 都透過這裡讀，讀過一次就記住。
import type {
  Champion,
  ChampionSummary,
  Dictionary,
  Item,
  Meta,
  RuneData,
  SummonerSpell,
  Wordlists,
} from './types.ts';

// 資料放在語料庫網站底下（/lol-corpus/）。用模組自己的網址來推算，
// 所以學習 App 從別的路徑載入共用模組時，也會讀到語料庫的資料。
let corpusBase = new URL(import.meta.env.BASE_URL, import.meta.url).href;

/** 語料庫裡的檔案網址，例如 corpusUrl('img/item/3157.png') */
export function corpusUrl(path: string): string {
  return new URL(path, corpusBase).href;
}

const cache = new Map<string, Promise<unknown>>();

function load<T>(path: string): Promise<T> {
  let pending = cache.get(path) as Promise<T> | undefined;
  if (!pending) {
    pending = fetch(corpusUrl(`data/${path}`)).then((res) => {
      if (!res.ok) throw new Error(`讀不到資料 ${path}（${res.status}）`);
      return res.json() as Promise<T>;
    });
    // 失敗的不記住，下次可以重試
    pending.catch(() => cache.delete(path));
    cache.set(path, pending);
  }
  return pending;
}

export const loadMeta = () => load<Meta>('meta.json');
export const loadChampionIndex = () => load<ChampionSummary[]>('champions.json');
export const loadChampion = (id: string) => load<Champion>(`champions/${encodeURIComponent(id)}.json`);
export const loadItems = () => load<Item[]>('items.json');
export const loadRunes = () => load<RuneData>('runes.json');
export const loadSummoners = () => load<SummonerSpell[]>('summoners.json');
export const loadWordlists = () => load<Wordlists>('wordlists.json');
export const loadDictionary = () => load<Dictionary>('dict.json');

/** 測試用：改資料來源、清掉記住的資料 */
export function setCorpusBase(url: string) {
  corpusBase = url;
  cache.clear();
}
