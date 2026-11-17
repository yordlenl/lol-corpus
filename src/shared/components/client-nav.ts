// 遊戲客戶端的上方導覽列和下面那排分頁，語料庫和學習 App 共用。
// <lol-client-nav current="home|play|collection">：左上角圓形標誌（回首頁）、「開始」（進學習）、語言開關、最右邊是書包（進收藏）。
// <lol-client-tabs .tabs=${[...]} close-href="…">：一排分頁（收藏的十個欄目、學習的主頁／練習…）和右上角關閉鈕。
// 樣式照客戶端自己的樣式檔（uikit 導覽列、關閉鈕），圖片是 npm run data 下載的客戶端介面圖。
import { css, html, LitElement } from 'lit';
import { corpusUrl } from '../data.ts';
import { define } from './define.ts';
import './row-toggles.ts';

const ui = (name: string) => corpusUrl(`img/client/${name}`);

export class LolClientNav extends LitElement {
  static properties = { current: {}, playHref: { attribute: 'play-href' } };

  static styles = css`
    :host {
      position: sticky;
      top: 0;
      z-index: 10;
      display: block;
    }
    /* 客戶端導覽列：高 80px（right-nav-menu 79px 加底線） */
    nav {
      display: flex;
      align-items: center;
      height: calc(80px + env(safe-area-inset-top));
      padding: env(safe-area-inset-top) 12px 0 18px;
      background: linear-gradient(180deg, #0a1428, #010a13);
      border-bottom: 1px solid #785a28;
      box-shadow: 0 1px 0 rgba(200, 170, 110, 0.15);
    }
    /* 左上角的圓形 L 標誌：金色漸層圓環（和關閉鈕同一組金色）、深藍圓心、金色的 L */
    .logo {
      position: relative;
      z-index: 1;
      flex: none;
      display: grid;
      place-items: center;
      width: 62px;
      height: 62px;
      border-radius: 50%;
      background: linear-gradient(to top, #463714 4%, #785a28 23%, #c89b3c 90%, #c8aa6e 100%);
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.8);
    }
    .logo::before {
      content: '';
      grid-area: 1 / 1;
      width: 54px;
      height: 54px;
      border-radius: 50%;
      background: radial-gradient(circle at 50% 35%, #1f6f86 0%, #0a323c 45%, #010a13 100%);
      box-shadow: inset 0 0 8px rgba(0, 0, 0, 0.9);
    }
    /* L 字用官方標誌圖當遮罩，只取上面的字（圖最下面那條橫線切掉） */
    .logo span {
      grid-area: 1 / 1;
      z-index: 1;
      width: 54px;
      height: 54px;
      background: linear-gradient(180deg, #f0e6d2 10%, #c8aa6e 50%, #785a28 95%);
      -webkit-mask: var(--logo) -15.8px -8.75px / 88px 71.5px no-repeat;
      mask: var(--logo) -15.8px -8.75px / 88px 71.5px no-repeat;
    }
    /* 「開始」：從標誌後面伸出來的藍框箭頭按鈕；字照客戶端 play-button-text（#f0e6d2、粗體、字距 0.075em） */
    .play {
      position: relative;
      flex: none;
      display: grid;
      place-items: center;
      min-width: 176px;
      height: 46px;
      margin-left: -30px;
      padding: 0 34px 0 46px;
      color: #f0e6d2;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 0.075em;
      text-decoration: none;
      background: linear-gradient(180deg, #1e2d3d, #0b1a26);
      border: 2px solid #0ac8b9;
      border-left: 0;
      clip-path: polygon(0 0, calc(100% - 20px) 0, 100% 50%, calc(100% - 20px) 100%, 0 100%);
      box-shadow: inset 0 0 12px rgba(10, 200, 185, 0.35);
    }
    .play.on {
      background: linear-gradient(180deg, #0b4f58, #0a2a33);
      box-shadow: inset 0 0 18px rgba(10, 200, 185, 0.7);
    }
    /* 語言開關靠右，中間隔一條客戶端的金色直線，最右邊是書包 */
    lol-row-toggles {
      align-self: stretch;
      margin-left: auto;
    }
    /* 客戶端 right-nav-vertical-rule：2×57px、上下淡出的金線 */
    .rule {
      flex: none;
      width: 2px;
      height: 57px;
      margin: 0 6px 0 14px;
      background: linear-gradient(0deg, hsla(45, 37%, 69%, 0) 0, #cdbe91 50%, hsla(45, 37%, 69%, 0));
      opacity: 0.6;
    }
    .icons {
      align-self: stretch;
      display: flex;
    }
    .icon {
      position: relative;
      display: grid;
      place-items: center;
      width: 84px;
      height: 100%;
    }
    /* 圖示照客戶端 menu-item-icon：#cdbe91，滑過或選中變 #f0e6d2 */
    .icon span {
      width: 40px;
      height: 40px;
      background-color: #cdbe91;
      -webkit-mask: var(--bag) center / contain no-repeat;
      mask: var(--bag) center / contain no-repeat;
    }
    .icon:hover span,
    .icon.on span {
      background-color: #f0e6d2;
    }
    /* 選中：客戶端的光暈（nav-highlight）和上方的小箭頭（nav-pointer） */
    .icon.on {
      background: var(--highlight) bottom center / 100% 40px no-repeat;
    }
    .icon.on::before {
      content: '';
      position: absolute;
      top: 0;
      left: 50%;
      width: 32px;
      height: 16px;
      transform: translateX(-50%);
      background: var(--pointer) center / contain no-repeat;
    }
    /* 窄螢幕（手機直放）排不下時，「開始」縮短 */
    @media (max-width: 620px) {
      .play {
        min-width: 0;
        padding: 0 28px 0 40px;
        font-size: 17px;
      }
      .rule {
        display: none;
      }
      .icon {
        width: 60px;
      }
    }
  `;

  declare current: 'home' | 'play' | 'collection' | undefined;
  declare playHref: string | undefined;

  render() {
    const vars = [
      `--highlight:url(${ui('ui/nav-highlight.png')})`,
      `--pointer:url(${ui('ui/nav-pointer.png')})`,
      `--logo:url(${ui('league-logo.svg')})`,
      `--bag:url(${ui('nav-collections.svg')})`,
    ].join(';');
    const play = this.playHref ?? new URL('../lol-study/#/home', corpusUrl('')).href;
    return html`<nav style=${vars}>
      <a class="logo" href=${corpusUrl('')} aria-label="首頁"><span></span></a>
      <a class="play ${this.current === 'play' ? 'on' : ''}" href=${play}>開始</a>
      <lol-row-toggles variant="nav"></lol-row-toggles>
      <span class="rule" aria-hidden="true"></span>
      <div class="icons">
        <a class="icon ${this.current === 'collection' ? 'on' : ''}" href=${corpusUrl('#/collection/champions')} aria-label="收藏" title="收藏">
          <span></span>
        </a>
      </div>
    </nav>`;
  }
}

export interface ClientTab {
  label: string;
  href: string;
  on: boolean;
}

export class LolClientTabs extends LitElement {
  static properties = { tabs: { attribute: false }, closeHref: { attribute: 'close-href' } };

  static styles = css`
    :host {
      position: relative;
      display: block;
    }
    nav {
      display: flex;
      gap: 6px;
      height: 60px;
      padding: 0 68px 0 18px;
      overflow-x: auto;
      scrollbar-width: none;
    }
    /* 客戶端導覽列的分頁：照參考截圖的比例，字 18px、字距 0.1em，選中有底線和光暈 */
    a.tab {
      flex: none;
      display: grid;
      place-items: center;
      padding: 0 16px;
      color: #a09b8c;
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-decoration: none;
      border-bottom: 2px solid transparent;
      transition: color 0.3s;
    }
    a.tab:hover {
      color: #f0e6d2;
    }
    a.tab.on {
      color: #f0e6d2;
      border-bottom-color: #f0e6d2;
      background: var(--highlight) bottom center / 100% 36px no-repeat;
    }
    /* 關閉鈕：客戶端 uikit close-button（金色漸層圓環、深色圓心、官方 ✕），放大 1.25 倍 */
    a.close {
      position: absolute;
      top: 13px;
      right: 16px;
      display: grid;
      place-items: center;
      width: 35px;
      height: 35px;
      font-size: 0;
      border-radius: 50%;
      background: linear-gradient(to top, #463714 4%, #785a28 23%, #c89b3c 90%, #c8aa6e 100%);
    }
    a.close::before {
      content: '';
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: #1e282d;
    }
    a.close::after {
      content: '';
      position: absolute;
      inset: 0;
      margin: auto;
      width: 12px;
      height: 12px;
      background-color: #cdbe91;
      -webkit-mask: var(--x) center / 12px no-repeat;
      mask: var(--x) center / 12px no-repeat;
    }
    a.close:hover {
      background: linear-gradient(to top, #c89b3c 0%, #f0e6d2 100%);
    }
    a.close:hover::before {
      background: linear-gradient(to top, #3c3c41 0%, #1e2328 100%);
    }
    a.close:hover::after {
      background-color: #f0e6d2;
    }
  `;

  declare tabs: ClientTab[];
  declare closeHref: string | undefined;

  constructor() {
    super();
    this.tabs = [];
  }

  render() {
    const vars = `--highlight:url(${ui('ui/nav-highlight.png')});--x:url(${ui('ui/x-icon.png')})`;
    return html`<div style=${vars}>
      <nav>${this.tabs.map((t) => html`<a class="tab ${t.on ? 'on' : ''}" href=${t.href} aria-current=${t.on ? 'page' : 'false'}>${t.label}</a>`)}</nav>
      <a class="close" href=${this.closeHref ?? corpusUrl('')} aria-label="回首頁">✕</a>
    </div>`;
  }
}

define('lol-client-nav', LolClientNav);
define('lol-client-tabs', LolClientTabs);

declare global {
  interface HTMLElementTagNameMap {
    'lol-client-nav': LolClientNav;
    'lol-client-tabs': LolClientTabs;
  }
}
