// 把共用模組另外打包成固定網址的 shared/lol-shared.js，給學習 App 從語料庫的網址載入。
import { copyFileSync, mkdirSync } from 'node:fs';
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/lol-corpus/',
  publicDir: false,
  build: {
    outDir: 'dist/shared',
    emptyOutDir: false,
    lib: {
      entry: 'src/shared/index.ts',
      formats: ['es'],
      fileName: () => 'lol-shared.js',
    },
  },
  plugins: [
    {
      name: 'publish-shared-types',
      // types.ts 只有型別，原樣發布成 .d.ts，學習 App 用 npm run sync-types 取得
      closeBundle() {
        mkdirSync('dist/shared', { recursive: true });
        copyFileSync('src/shared/types.ts', 'dist/shared/lol-shared.d.ts');
      },
    },
  ],
});
