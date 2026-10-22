// 產生主畫面圖示（PNG）。改了圖案再執行 npm run icons，產生的檔案要一起存進倉庫。
import { mkdirSync, writeFileSync } from 'node:fs';
import { crc32, deflateSync } from 'node:zlib';

const SIZES = [180, 192, 512];
const SUPERSAMPLE = 4;

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const NAVY_TOP = hex('#0a1428');
const NAVY_BOTTOM = hex('#010a13');
const GOLD = hex('#c8aa6e');
const GOLD_LIGHT = hex('#f0e6d2');

// 座標 x、y 都在 0～1 之間，回傳該點的顏色。
// 圖案：深藍漸層底、金色細框、中央一顆金色菱形。
function paint(x, y) {
  const dx = Math.abs(x - 0.5);
  const dy = Math.abs(y - 0.5);
  const box = Math.max(dx, dy);
  const diamond = dx + dy;
  if (diamond < 0.1) return GOLD_LIGHT;
  if (diamond < 0.15) return NAVY_TOP;
  if (diamond < 0.22) return GOLD;
  if (box > 0.355 && box < 0.37) return GOLD;
  return NAVY_TOP.map((top, i) => top + (NAVY_BOTTOM[i] - top) * y);
}

function render(size) {
  const row = size * 3 + 1;
  const raw = Buffer.alloc(row * size);
  for (let py = 0; py < size; py++) {
    raw[py * row] = 0;
    for (let px = 0; px < size; px++) {
      const sum = [0, 0, 0];
      for (let sy = 0; sy < SUPERSAMPLE; sy++) {
        for (let sx = 0; sx < SUPERSAMPLE; sx++) {
          const c = paint((px + (sx + 0.5) / SUPERSAMPLE) / size, (py + (sy + 0.5) / SUPERSAMPLE) / size);
          for (let i = 0; i < 3; i++) sum[i] += c[i];
        }
      }
      for (let i = 0; i < 3; i++) {
        raw[py * row + 1 + px * 3 + i] = Math.round(sum[i] / SUPERSAMPLE ** 2);
      }
    }
  }
  return encodePng(size, raw);
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(size, raw) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // 每個顏色 8 位元
  header[9] = 2; // RGB，不透明（iPadOS 主畫面圖示不能有透明）
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const outDir = new URL('../public/icons/', import.meta.url);
mkdirSync(outDir, { recursive: true });
for (const size of SIZES) {
  writeFileSync(new URL(`icon-${size}.png`, outDir), render(size));
  console.log(`public/icons/icon-${size}.png`);
}
