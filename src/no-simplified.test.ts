// spec 驗收：任何頁面都沒有簡體介面文字。掃描所有網頁程式（測試檔除外）與 index.html。
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { findSimplified } from '../scripts/data/chinese.ts';

const ROOT = new URL('../', import.meta.url);

function sourceFiles(): string[] {
  const files = readdirSync(new URL('src/', ROOT), { recursive: true, encoding: 'utf8' })
    .filter((f) => /\.(ts|css)$/.test(f) && !f.endsWith('.test.ts'))
    .map((f) => `src/${f}`);
  return [...files, 'index.html'];
}

describe('介面文字沒有簡體字', () => {
  it.each(sourceFiles())('%s', (file) => {
    expect(findSimplified(readFileSync(new URL(file, ROOT), 'utf8'))).toEqual([]);
  });
});
