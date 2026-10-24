// 遊戲客戶端的上方導覽列和下面那排分頁，語料庫和學習 App 共用。
// <lol-client-nav current="home|play|collection">：左上角標誌（回首頁）、「開始」（進學習）、書包（進收藏）、三行開關。
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
    nav {
      display: flex;
      align-items: center;
      gap: 18px;
      height: calc(64px + env(safe-area-inset-top));
      padding: env(safe-area-inset-top) 20px 0 14px;
      background: linear-gradient(180deg, #0a1428, #010a13);
      border-bottom: 1px solid #785a28;
      box-shadow: 0 1px 0 rgba(200, 170, 110, 0.15);
    }
    .logo img {
      display: block;
    }
    /* 「開始」：客戶端左上角的藍框箭頭按鈕；字照客戶端 play-button-text（#f0e6d2、粗體、字距 0.075em） */
    .play {
      position: relative;
      display: grid;
      place-items: center;
      min-width: 150px;
      height: 42px;
      margin-left: -26px;
      padding: 0 32px 0 34px;
      color: #f0e6d2;
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 0.075em;
      text-decoration: none;
      background: linear-gradient(180deg, #1e2d3d, #0b1a26);
      border: 2px solid #0ac8b9;
      border-left: 0;
      clip-path: polygon(0 0, calc(100% - 18px) 0, 100% 50%, calc(100% - 18px) 100%, 0 100%);
      box-shadow: inset 0 0 12px rgba(10, 200, 185, 0.35);
    }
    .play.on {
      background: linear-gradient(180deg, #0b4f58, #0a2a33);
      box-shadow: inset 0 0 18px rgba(10, 200, 185, 0.7);
    }
    .icons {
      display: flex;
      margin-left: auto;
    }
    .icon {
      position: relative;
      display: grid;
      place-items: center;
      width: 72px;
      height: 64px;
      opacity: 0.85;
    }
    /* 選中：客戶端的光暈（nav-highlight）和上方的小箭頭（nav-pointer） */
    .icon.on {
      opacity: 1;
      background: var(--highlight) bottom center / 100% 32px no-repeat;
    }
    .icon.on::before {
      content: '';
      position: absolute;
      top: 0;
      left: 50%;
      width: 28px;
      height: 14px;
      transform: translateX(-50%);
      background: var(--pointer) center / contain no-repeat;
    }
    lol-row-toggles {
      --lol-toggle-text: #a09b8c;
    }
  `;

  declare current: 'home' | 'play' | 'collection' | undefined;
  declare playHref: string | undefined;

  render() {
    const vars = `--highlight:url(${ui('ui/nav-highlight.png')});--pointer:url(${ui('ui/nav-pointer.png')})`;
    const play = this.playHref ?? new URL('../lol-study/#/home', corpusUrl('')).href;
    return html`<nav style=${vars}>
      <a class="logo" href=${corpusUrl('')} aria-label="首頁"><img src=${ui('league-logo.svg')} alt="" width="44" height="44" /></a>
      <a class="play ${this.current === 'play' ? 'on' : ''}" href=${play}>開始</a>
      <div class="icons">
        <a class="icon ${this.current === 'collection' ? 'on' : ''}" href=${corpusUrl('#/collection/champions')} aria-label="收藏" title="收藏">
          <img src=${ui('nav-collections.svg')} alt="" width="34" height="34" />
        </a>
      </div>
      <lol-row-toggles></lol-row-toggles>
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
      gap: 4px;
      height: 52px;
      padding: 0 64px 0 16px;
      overflow-x: auto;
      scrollbar-width: none;
    }
    /* 客戶端導覽列的分頁：繁中字級 16px，選中有底線和光暈 */
    a.tab {
      flex: none;
      display: grid;
      place-items: center;
      padding: 0 14px;
      color: #a09b8c;
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 0.05em;
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
      background: var(--highlight) bottom center / 100% 32px no-repeat;
    }
    /* 關閉鈕：客戶端 uikit close-button（金色漸層圓環、深色圓心、官方 ✕），放大 1.25 倍 */
    a.close {
      position: absolute;
      top: 10px;
      right: 14px;
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
