// 讀寫 PNG（只支援 8 位元 RGBA、不交錯，遊戲商店圖集就是這種格式），用來從圖集切出小圖示。
import { crc32, deflateSync, inflateSync } from 'node:zlib';

export interface Image {
  width: number;
  height: number;
  /** RGBA，每個像素 4 個位元組 */
  data: Uint8Array;
}

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function paeth(a: number, b: number, c: number) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

export function decodePng(file: Buffer): Image {
  if (!file.subarray(0, 8).equals(SIGNATURE)) throw new Error('不是 PNG 檔');
  let width = 0;
  let height = 0;
  const idat: Buffer[] = [];
  for (let pos = 8; pos < file.length; ) {
    const length = file.readUInt32BE(pos);
    const type = file.toString('ascii', pos + 4, pos + 8);
    const body = file.subarray(pos + 8, pos + 8 + length);
    if (type === 'IHDR') {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      const [bitDepth, colorType, , , interlace] = [body[8], body[9], body[10], body[11], body[12]];
      if (bitDepth !== 8 || colorType !== 6 || interlace !== 0) throw new Error('只支援 8 位元 RGBA、不交錯的 PNG');
    } else if (type === 'IDAT') idat.push(body);
    pos += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * 4;
  const data = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= 4 ? data[y * stride + x - 4] : 0;
      const b = y > 0 ? data[(y - 1) * stride + x] : 0;
      const c = x >= 4 && y > 0 ? data[(y - 1) * stride + x - 4] : 0;
      const v = line[x];
      data[y * stride + x] =
        filter === 0 ? v : filter === 1 ? v + a : filter === 2 ? v + b : filter === 3 ? v + ((a + b) >> 1) : v + paeth(a, b, c);
    }
  }
  return { width, height, data };
}

function chunk(type: string, data: Buffer) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

export function encodePng(image: Image): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(image.width, 0);
  header.writeUInt32BE(image.height, 4);
  header[8] = 8;
  header[9] = 6;
  const stride = image.width * 4;
  const raw = Buffer.alloc((stride + 1) * image.height);
  for (let y = 0; y < image.height; y++) {
    raw[y * (stride + 1)] = 0;
    raw.set(image.data.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  }
  return Buffer.concat([SIGNATURE, chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function crop(image: Image, box: Box): Image {
  const data = new Uint8Array(box.w * box.h * 4);
  for (let y = 0; y < box.h; y++) {
    const from = ((box.y + y) * image.width + box.x) * 4;
    data.set(image.data.subarray(from, from + box.w * 4), y * box.w * 4);
  }
  return { width: box.w, height: box.h, data };
}

/** 找出區域裡不透明的一塊塊（相連的像素），回傳每塊的外框，由上到下、由左到右排序 */
export function findBlobs(image: Image, region: Box, minAlpha = 24, minSize = 6): Box[] {
  const seen = new Uint8Array(region.w * region.h);
  const opaque = (x: number, y: number) => image.data[((region.y + y) * image.width + region.x + x) * 4 + 3] >= minAlpha;
  const boxes: Box[] = [];
  for (let y0 = 0; y0 < region.h; y0++) {
    for (let x0 = 0; x0 < region.w; x0++) {
      if (seen[y0 * region.w + x0] || !opaque(x0, y0)) continue;
      let [minX, minY, maxX, maxY] = [x0, y0, x0, y0];
      const stack = [[x0, y0]];
      seen[y0 * region.w + x0] = 1;
      while (stack.length) {
        const [x, y] = stack.pop()!;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        // 八方向相連，圖示裡斷開一點點的筆畫也算同一塊
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= region.w || ny >= region.h || seen[ny * region.w + nx] || !opaque(nx, ny)) continue;
            seen[ny * region.w + nx] = 1;
            stack.push([nx, ny]);
          }
        }
      }
      if (maxX - minX + 1 >= minSize && maxY - minY + 1 >= minSize) {
        boxes.push({ x: region.x + minX, y: region.y + minY, w: maxX - minX + 1, h: maxY - minY + 1 });
      }
    }
  }
  return boxes.sort((a, b) => a.y - b.y || a.x - b.x);
}
