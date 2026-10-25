import { readFileSync } from 'node:fs';
import { VitePWA } from 'vite-plugin-pwa';
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
  plugins: [
    // 離線使用：第一次打開時，把網頁、全部遊戲資料和圖示存進裝置；改版時只更新有變的檔案。
    // 範圍只限 /lol-corpus/。主畫面圖示用學習 App 的 manifest，所以這裡不產生 manifest。
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      manifest: false,
      scope: '/lol-corpus/',
      workbox: {
        // 新版本下載好就立刻接手，不用等 App 完全關掉再開（我們自己註冊 service worker，外掛不會自動加這兩項）
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{html,js,css,json,png}', 'img/client/**/*.{svg,jpg}', 'home/*.jpg'],
        // 收藏頁的大圖（英雄卡片、造型、頭像…）不預先下載；看過的存起來，之後離線也看得到
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/(ddragon\.leagueoflegends\.com|raw\.communitydragon\.org)\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'collection-images',
              expiration: { maxEntries: 3000, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    environment: 'node',
  },
});
