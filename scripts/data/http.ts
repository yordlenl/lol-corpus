// 下載與快取：檔案已經在 .cache/ 就直接用，不重複下載；失敗會重試。
import { existsSync } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const RETRIES = 4;

async function fetchWithRetry(url: string, timeoutMs: number): Promise<Buffer> {
  let lastError: unknown;
  for (let attempt = 0; attempt < RETRIES; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (error) {
      lastError = error;
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
    }
  }
  throw new Error(`下載失敗：${url}（${lastError}）`);
}

/** 下載到 dest；已存在且大小足夠就跳過。回傳是否真的下載了。 */
export async function download(
  url: string,
  dest: string,
  { minBytes = 1, timeoutMs = 30_000 }: { minBytes?: number; timeoutMs?: number } = {},
): Promise<boolean> {
  if (existsSync(dest) && (await stat(dest)).size >= minBytes) return false;
  const body = await fetchWithRetry(url, timeoutMs);
  if (body.length < minBytes) throw new Error(`檔案太小：${url}（${body.length} bytes）`);
  await mkdir(dirname(dest), { recursive: true });
  await writeFile(dest, body);
  return true;
}

export async function getJson<T>(url: string, cachePath: string): Promise<T> {
  await download(url, cachePath);
  return JSON.parse(await readFile(cachePath, 'utf8')) as T;
}

export async function getText(url: string, cachePath: string): Promise<string> {
  await download(url, cachePath);
  return readFile(cachePath, 'utf8');
}

/** 同時最多跑 limit 個 */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
