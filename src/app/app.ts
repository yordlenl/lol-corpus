// <corpus-app>：像遊戲客戶端。上方導覽列（左上角「開始」進學習、右邊書包進收藏），下面是首頁或收藏。
import { html, nothing } from 'lit';
import { corpusUrl, loadCollectionLabels, loadMeta } from '../shared/index.ts';
import type { CollectionLabels, Meta } from '../shared/types.ts';
import { LightElement } from './light.ts';
import './pages/collection.ts';
import { parseHash, type Route } from './router.ts';

export class CorpusApp extends LightElement {
  static properties = { route: { state: true }, meta: { state: true }, labels: { state: true } };

  declare route: Route;
  declare meta: Meta | undefined;
  declare labels: CollectionLabels | undefined;

  constructor() {
    super();
    this.route = parseHash(location.hash);
  }

  private onHash = () => {
    const next = parseHash(location.hash);
    const prev = this.route;
    // 同一頁裡換選取（例如點另一件裝備）不要捲回頂端
    const samePage = next.page === prev.page && (next.page !== 'collection' || (prev.page === 'collection' && next.tab === prev.tab && next.id === prev.id));
    if (!samePage) window.scrollTo(0, 0);
    this.route = next;
  };

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('hashchange', this.onHash);
    loadMeta().then((meta) => (this.meta = meta), () => {});
    loadCollectionLabels().then((labels) => (this.labels = labels), () => {});
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('hashchange', this.onHash);
  }

  private home() {
    return html`<section class="client-home" style="--home-bg:url(${corpusUrl('home/home.jpg')})">
      <footer class="home-footer">
        ${this.meta ? html`<p>遊戲資料版本 ${this.meta.ddragon}・英雄 ${this.meta.counts.champions} 位・裝備 ${this.meta.counts.items} 件</p>` : nothing}
        <p>本站是非官方的學習用網站，未經 Riot Games 認可，也不代表 Riot Games 的立場。英雄聯盟的名稱、文字、圖示、圖片與語音的權利屬於 Riot Games, Inc.</p>
        <p>台詞轉錄與原聲來自 League of Legends Wiki（CC BY-SA 3.0），中文為學習譯文；音標與釋義來自 ECDICT。</p>
        <p>網站版本 ${__APP_VERSION__}・${__COMMIT__}</p>
      </footer>
    </section>`;
  }

  render() {
    const inCollection = this.route.page === 'collection';
    return html`
      <lol-client-nav current=${inCollection ? 'collection' : 'home'}></lol-client-nav>
      <main class="client-main">
        ${this.route.page === 'collection'
          ? html`<page-collection .route=${this.route} .labels=${this.labels}></page-collection>`
          : this.home()}
      </main>
    `;
  }
}

customElements.define('corpus-app', CorpusApp);
