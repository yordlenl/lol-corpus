// 資料建置的設定。遊戲改版時，改 DDRAGON_VERSION 和 CDRAGON_VERSION，再執行 npm run data。
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const DDRAGON_VERSION = '16.21.1';
export const CDRAGON_VERSION = '16.21';

/** 輸出資料的格式版本；欄位有不相容的變動時加一 */
export const DATA_SCHEMA = 1;

export const ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const CACHE_DIR = join(ROOT, '.cache');
export const CONTENT_DIR = join(ROOT, 'content');
export const DATA_DIR = join(ROOT, 'public', 'data');
export const IMG_DIR = join(ROOT, 'public', 'img');

export const DDRAGON = 'https://ddragon.leagueoflegends.com';
export const CDRAGON = `https://raw.communitydragon.org/${CDRAGON_VERSION}/plugins/rcp-be-lol-game-data/global`;
/** 遊戲本體的檔案（官方裝備欄位、文字檔、商店圖集） */
export const CDRAGON_GAME = `https://raw.communitydragon.org/${CDRAGON_VERSION}/game`;

/** 三行對照用的語言包 */
export const LANGS = ['en', 'zh_TW', 'zh_CN'] as const;
export const DDRAGON_LOCALE = { en: 'en_US', zh_TW: 'zh_TW', zh_CN: 'zh_CN' } as const;
export const CDRAGON_LOCALE = { en: 'default', zh_TW: 'zh_tw', zh_CN: 'zh_cn' } as const;
/** 遊戲文字檔的資料夾（三種語言的檔案都放在各自資料夾的 menu/en_us/ 底下） */
export const STRINGTABLE_LOCALE = { en: 'en_us', zh_TW: 'zh_tw', zh_CN: 'zh_cn' } as const;

export const ECDICT_CSV_URL = 'https://unpkg.com/ecdict@0.0.4/assets/ecdict.csv';
export const ECDICT_LEMMA_URL = 'https://unpkg.com/ecdict@0.0.4/assets/lemma.en.txt';
export const ECDICT_MIN_BYTES = 60 * 1024 * 1024;

/** 召喚峽谷的地圖編號 */
export const SR_MAP_ID = '11';
