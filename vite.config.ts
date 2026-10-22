import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  // 發布在 yordlenl.github.io/lol-corpus/ 底下
  base: '/lol-corpus/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __COMMIT__: JSON.stringify(process.env.GITHUB_SHA?.slice(0, 7) ?? '本機'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  test: {
    environment: 'node',
  },
});
