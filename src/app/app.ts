// <corpus-app>：上方導覽列、目前頁面、頁尾。
import { html, nothing } from 'lit';
import { loadMeta } from '../shared/index.ts';
import type { Meta } from '../shared/types.ts';
import { LightElement } from './light.ts';
import './pages/champion.ts';
import './pages/champions.ts';
import './pages/items.ts';
import './pages/runes.ts';
import './pages/summoners.ts';
import './row-toggles.ts';
import { href, parseHash, type Route } from './router.ts';

const NAV: Array<{ page: Route['page']; label: string; to: string; also?: Route['page'] }> = [
  { page: 'champions', label: '英雄', to: href('champions'), also: 'champion' },
  { page: 'items', label: '裝備', to: href('items') },
  { page: 'runes', label: '符文', to: href('runes') },
  { page: 'summoners', label: '召喚師技能', to: href('summoners') },
];

export class CorpusApp extends LightElement {
  static properties = { route: { state: true }, meta: { state: true } };

  declare route: Route;
  declare meta: Meta | undefined;

  constructor() {
    super();
    this.route = parseHash(location.hash);
  }

  private onHash = () => {
    const next = parseHash(location.hash);
    // 同一頁裡換選取（例如點另一件裝備）不要捲回頂端
    if (next.page !== this.route.page || (next.page === 'champion' && this.route.page === 'champion' && next.id !== this.route.id)) {
      window.scrollTo(0, 0);
    }
    this.route = next;
  };

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('hashchange', this.onHash);
    loadMeta().then((meta) => (this.meta = meta), () => {});
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('hashchange', this.onHash);
  }

  private page() {
    const r = this.route;
    switch (r.page) {
      case 'champions':
        return html`<page-champions></page-champions>`;
      case 'champion':
        return html`<page-champion .championId=${r.id}></page-champion>`;
      case 'items':
        return html`<page-items .selectedId=${r.id}></page-items>`;
      case 'runes':
        return html`<page-runes .treeKey=${r.tree} .runeId=${r.rune}></page-runes>`;
      case 'summoners':
        return html`<page-summoners></page-summoners>`;
    }
  }

  render() {
    return html`
      <header class="topbar">
        <a class="brand" href=${href('champions')}>LoL 英語語料庫</a>
        <nav class="nav">
          ${NAV.map(
            (n) =>
              html`<a href=${n.to} class=${this.route.page === n.page || this.route.page === n.also ? 'current' : ''}>${n.label}</a>`,
          )}
        </nav>
        <row-toggles></row-toggles>
        <a class="switch" href="/lol-study/">學習 App →</a>
      </header>
      <main class="content">${this.page()}</main>
      <footer class="footer">
        ${this.meta ? html`<p>遊戲資料版本 ${this.meta.ddragon}・英雄 ${this.meta.counts.champions} 位・裝備 ${this.meta.counts.items} 件</p>` : nothing}
        <p>本站是非官方的學習用網站，未經 Riot Games 認可，也不代表 Riot Games 的立場。英雄聯盟的名稱、文字、圖示與語音的權利屬於 Riot Games, Inc.</p>
        <p>台詞轉錄與原聲來自 League of Legends Wiki（CC BY-SA 3.0），中文為學習譯文；音標與釋義來自 ECDICT。</p>
        <p>網站版本 ${__APP_VERSION__}・${__COMMIT__}</p>
      </footer>
    `;
  }
}

customElements.define('corpus-app', CorpusApp);
