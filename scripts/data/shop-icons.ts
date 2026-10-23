// 從遊戲商店的圖集切出篩選圖示：上方的職業、左側的屬性、「全部」和「清除篩選」。
// 每個圖示在圖集裡有好幾種狀態（一般、選中、變暗…），這裡只取「一般」和「選中」。
// 位置是對照圖集量出來的；遊戲改版換了圖集，要重新量（測試會檢查切出來的圖不是空的）。
import { type Box, crop, findBlobs, type Image } from './png.ts';

export const SHOP_ATLASES = ['itemshop_texture_atlas.png', 'itemshop_texture_atlas_2.png', 'itemshop_texture_atlas4.png'] as const;
export type ShopAtlas = (typeof SHOP_ATLASES)[number];

const at = (x: number, y: number, w: number, h: number): Box => ({ x, y, w, h });

/** 職業篩選：[檔名, 一般, 選中]，都在第一張圖集 */
const ROLE_BOXES: Array<[string, Box, Box]> = [
  ['all', at(222, 95, 22, 22), at(188, 131, 22, 22)],
  ['fighter', at(870, 28, 23, 27), at(898, 28, 23, 26)],
  ['marksman', at(869, 86, 28, 22), at(899, 86, 28, 22)],
  ['assassin', at(940, 205, 24, 21), at(940, 232, 24, 21)],
  ['mage', at(869, 60, 24, 23), at(898, 60, 24, 23)],
  ['tank', at(876, 112, 17, 25), at(906, 112, 17, 25)],
  ['support', at(843, 216, 26, 22), at(843, 244, 26, 22)],
];

/** 屬性篩選：第四張圖集裡一排一個，由上到下 */
export const STAT_ICONS = [
  'ad',
  'crit',
  'attackspeed',
  'onhit',
  'armorpen',
  'ap',
  'mana',
  'magicpen',
  'health',
  'armor',
  'mr',
  'haste',
  'movespeed',
  'lifesteal',
] as const;
const STAT_ROW_TOPS = [2, 30, 55, 83, 110, 138, 168, 195, 223, 251, 278, 306, 333, 363];
/** 每一欄是一種狀態：第 0 欄灰色是一般，第 2 欄彩色是選中 */
const STAT_COLUMNS = [
  [0, 25],
  [51, 79],
] as const;

/** 清除篩選（第二張圖集，64×64） */
const CLEAR_BOX = at(71, 511, 64, 64);

/** 把一塊區域裡所有不透明的部分合成一個外框（有些圖示是好幾塊拼成的） */
function unionBlobs(image: Image, region: Box): Box {
  const blobs = findBlobs(image, region, 24, 2);
  if (!blobs.length) throw new Error(`圖集這一格是空的：${JSON.stringify(region)}`);
  const x = Math.min(...blobs.map((b) => b.x));
  const y = Math.min(...blobs.map((b) => b.y));
  const right = Math.max(...blobs.map((b) => b.x + b.w));
  const bottom = Math.max(...blobs.map((b) => b.y + b.h));
  return { x, y, w: right - x, h: bottom - y };
}

/** 放到固定大小的透明方格正中間，同一組圖示大小一致、排版才整齊 */
function centerOn(icon: Image, size: number): Image {
  const data = new Uint8Array(size * size * 4);
  const left = Math.floor((size - icon.width) / 2);
  const top = Math.floor((size - icon.height) / 2);
  for (let y = 0; y < icon.height; y++) {
    data.set(icon.data.subarray(y * icon.width * 4, (y + 1) * icon.width * 4), ((top + y) * size + left) * 4);
  }
  return { width: size, height: size, data };
}

/** 回傳 { 'img/shop/檔名.png': 圖 }；選中狀態的檔名後面加 -on */
export function cutShopIcons(atlases: Record<ShopAtlas, Image>): Map<string, Image> {
  const out = new Map<string, Image>();
  const roleAtlas = atlases['itemshop_texture_atlas.png'];
  for (const [name, normal, selected] of ROLE_BOXES) {
    out.set(`img/shop/role-${name}.png`, centerOn(crop(roleAtlas, unionBlobs(roleAtlas, normal)), 32));
    out.set(`img/shop/role-${name}-on.png`, centerOn(crop(roleAtlas, unionBlobs(roleAtlas, selected)), 32));
  }

  const statAtlas = atlases['itemshop_texture_atlas4.png'];
  STAT_ICONS.forEach((name, row) => {
    const top = STAT_ROW_TOPS[row] - 2;
    const bottom = (STAT_ROW_TOPS[row + 1] ?? STAT_ROW_TOPS[row] + 30) - 2;
    const [normal, selected] = STAT_COLUMNS.map(([x0, x1]) => unionBlobs(statAtlas, at(x0, top, x1 - x0, bottom - top)));
    out.set(`img/shop/stat-${name}.png`, centerOn(crop(statAtlas, normal), 32));
    out.set(`img/shop/stat-${name}-on.png`, centerOn(crop(statAtlas, selected), 32));
  });

  const clearAtlas = atlases['itemshop_texture_atlas_2.png'];
  out.set('img/shop/clear.png', crop(clearAtlas, CLEAR_BOX));
  return out;
}
