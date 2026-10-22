import type { SiteId } from './storage-probe';

// 這個網站的基本資料。學習 App 有一份對應的設定。
export const SITE: {
  id: SiteId;
  title: string;
  tagline: string;
  intro: string;
  other: { label: string; href: string };
} = {
  id: 'lol-corpus',
  title: 'LoL 英語語料庫',
  tagline: '英雄聯盟遊戲文字・三行對照',
  intro: '這是開發中的空白首頁。之後會在這裡放英雄、裝備商店、符文頁、召喚師技能。',
  other: { label: '學習 App', href: '/lol-study/' },
};
