// 遊戲客戶端自己的介面圖片（按鈕框、面板外框、造型邊框、符文頁的光暈等），照客戶端樣式檔裡的路徑下載，
// 存到 public/img/client/ui/，讓語料庫的外觀和遊戲一樣。
// 左邊是存檔名，右邊是客戶端樣式檔裡寫的原始路徑（/fe/外掛名稱/...）；遊戲改版時照這個清單對照。
import { CDRAGON, CDRAGON_PLUGINS } from './config.ts';

/** 造型等級（CommunityDragon 的 rarity 欄位）→ 客戶端邊框圖的名稱 */
export const SKIN_RARITY: Record<string, string> = {
  kNoRarity: 'normal',
  kRare: 'rare',
  kEpic: 'epic',
  kLegendary: 'legendary',
  kMythic: 'mythic',
  kUltimate: 'ultimate',
  kTranscendent: 'transcendent',
  kExalted: 'exalted',
};

/** 客戶端有的造型邊框圖（原版和 rare 沒有自己的框，用 normal；transcendent 的檔名多一個 _0） */
const SKIN_BORDER_FILES: Record<string, string> = {
  normal: 'borders_normal.png',
  epic: 'borders_epic.png',
  legendary: 'borders_legendary.png',
  mythic: 'borders_mythic.png',
  ultimate: 'borders_ultimate.png',
  transcendent: 'borders_transcendent_0.png',
  exalted: 'borders_exalted.png',
};

const TREES: Array<[string, string]> = [
  ['precision', 'p'],
  ['domination', 'd'],
  ['sorcery', 's'],
  ['resolve', 'r'],
  ['inspiration', 'i'],
];

export const CLIENT_UI: Array<[string, string]> = [
  // 上方導覽列：「開始」按鈕框、選中圖示的光暈和小箭頭
  ['play-button-frame.png', '/fe/lol-static-assets/images/play-button-frame-default.png'],
  ['nav-highlight.png', '/fe/lol-uikit/images/nav-highlight.png'],
  ['nav-pointer.png', '/fe/lol-uikit/images/nav-pointer.png'],
  // 共用元件：關閉鈕的 ✕、搜尋框的放大鏡、下拉選單、勾選框
  ['x-icon.png', '/fe/lol-uikit/images/x-icon.png'],
  ['magnifying-glass.png', '/fe/lol-static-assets/images/uikit/magnifying-glass-icon.png'],
  ['up-down-arrow.png', '/fe/lol-uikit/images/up-down-arrow.png'],
  ['checkbox.png', '/fe/lol-uikit/images/checkbox-spritesheet.png'],
  // 單字朗讀的喇叭（客戶端設定頁的音效開關圖）
  ['speaker.png', '/fe/lol-settings/audioon.png'],
  // 「開始」畫面的菱形選項（一張圖六種狀態，每格 20px）
  ['radio.png', '/fe/lol-parties/btn_icon.png'],
  // 收藏「英雄」左上角的方框（上、中、下三段）
  ['panel-frame-top.png', '/fe/lol-collections/images/control-panel/square-hextech-frame-top.png'],
  ['panel-frame-mid.png', '/fe/lol-collections/images/control-panel/square-hextech-frame-mid.png'],
  ['panel-frame-bot.png', '/fe/lol-collections/images/control-panel/square-hextech-frame-bot.png'],
  // 造型卡片的邊框，依造型等級
  ...Object.entries(SKIN_BORDER_FILES).map(([b, file]): [string, string] => [`skin-border-${b}.png`, `/fe/lol-collections/images/skins-viewer/borders/${file}`]),
  // 符文頁：每一系的圖示和特效、關鍵符文那一排的金線
  ...TREES.flatMap(([tree, k]): Array<[string, string]> => [
    [`rune-${tree}-icon.png`, `/fe/lol-collections/perks/images/${tree}/icon-${k}.png`],
    [`rune-${tree}-vfx.png`, `/fe/lol-collections/perks/images/${tree}/vfx-${k}.png`],
  ]),
  ['keystone-border.svg', '/fe/lol-collections/perks/images/primary-perk-selector/keystone-border.svg'],
];

/** 客戶端路徑換成 CommunityDragon 的網址：/fe/lol-collections/x → rcp-fe-lol-collections/global/default/x（全部小寫） */
export function clientUiUrl(fePath: string): string {
  const m = /^\/fe\/([^/]+)\/(.+)$/.exec(fePath);
  if (!m) throw new Error(`看不懂的客戶端路徑：${fePath}`);
  return `${CDRAGON_PLUGINS}/rcp-fe-${m[1]}/global/default/${m[2].toLowerCase()}`;
}

/**
 * 學習 App 練習分頁的五個大圖示：遊戲「開始」畫面的模式圖示（一般、滑過、選中）。
 * 順序照截圖：召喚峽谷、經典召喚峽谷、隨機單中、競技場（輪替模式的燒瓶）、聯盟戰棋。
 */
const MODE_ICONS: Array<[string, string, Record<'default' | 'hover' | 'active', string>]> = [
  ['champions', 'classic_sru', { default: 'game-select-icon-default', hover: 'game-select-icon-hover', active: 'game-select-icon-active' }],
  ['skills', 'jade', { default: 'game-select-mode-icon-default', hover: 'game-select-mode-icon-hover', active: 'game-select-mode-icon-selected' }],
  ['items', 'aram', { default: 'game-select-icon-default', hover: 'game-select-icon-hover', active: 'game-select-icon-active' }],
  ['runes', 'gamemodex', { default: 'game-select-icon-default', hover: 'game-select-icon-hover', active: 'game-select-icon-active' }],
  ['summoners', 'tft', { default: 'game-select-icon-default', hover: 'game-select-icon-hover', active: 'game-select-icon-active' }],
];

/** 「開始」畫面的官方背景圖：召喚峽谷（山景）、隨機單中；其他類別沒有對應的背景，用召喚峽谷的 */
export const MODE_BACKGROUNDS: Array<[string, string]> = [
  ['mode-bg-classic.jpg', `${CDRAGON}/default/content/src/leagueclient/gamemodeassets/classic_sru/img/parties-background.jpg`],
  ['mode-bg-aram.jpg', `${CDRAGON}/default/content/src/leagueclient/gamemodeassets/aram/img/parties-background.jpg`],
];

/** 練習分頁圖示：存檔名 → 網址（例如 mode-champions-active.png） */
export const MODE_ICON_FILES: Array<[string, string]> = MODE_ICONS.flatMap(([category, mode, files]) =>
  (Object.entries(files) as Array<[string, string]>).map(([state, file]): [string, string] => [
    `mode-${category}-${state}.png`,
    `${CDRAGON}/default/content/src/leagueclient/gamemodeassets/${mode}/img/${file}.png`,
  ]),
);
