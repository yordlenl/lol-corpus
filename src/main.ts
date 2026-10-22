import './style.css';
import './app/app.ts';
import { initShared } from './shared/index.ts';

const root = document.querySelector<HTMLDivElement>('#app')!;

initShared().then(
  () => root.replaceChildren(document.createElement('corpus-app')),
  () => {
    root.innerHTML = '<p class="notice">資料載入失敗，請檢查網路後重新整理頁面。</p>';
  },
);
