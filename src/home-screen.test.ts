import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const linkHref = (rel: string) => html.match(new RegExp(`<link rel="${rel}" href="([^"]+)"`))?.[1];

describe('加入主畫面', () => {
  it('從語料庫加入時，用的是學習 App 的設定和圖示（iPad 上只有一個 App，紀錄才共用）', () => {
    expect(linkHref('manifest')).toBe('https://yordlenl.github.io/lol-study/manifest.webmanifest');
    expect(linkHref('apple-touch-icon')).toBe('https://yordlenl.github.io/lol-study/icons/icon-180.png');
  });
});
