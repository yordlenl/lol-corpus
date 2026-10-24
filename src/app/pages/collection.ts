// 收藏：上方十個子欄目（照遊戲的順序和名稱），下面是選到的那一頁。
import { html } from 'lit';
import type { CollectionLabels, CollectionTab } from '../../shared/types.ts';
import { LightElement } from '../light.ts';
import { COLLECTION_TAB_IDS, collectionHref, href, type Route } from '../router.ts';
import './champion.ts';
import './champions.ts';
import './chromas.ts';
import './collectibles.ts';
import './items.ts';
import './runes.ts';
import './skins.ts';
import './summoners.ts';

/** 翻譯檔還沒載入時先顯示的名稱（和遊戲台服一樣） */
const FALLBACK_TABS: Record<CollectionTab, string> = {
  champions: '英雄',
  skins: '造型',
  emotes: '表情',
  runes: '符文',
  spells: '召喚師技能',
  items: '道具',
  icons: '頭像',
  wards: '偵察守衛',
  chromas: '炫彩造型',
  finishers: '終結特效',
};

export class PageCollection extends LightElement {
  static properties = { route: { attribute: false }, labels: { attribute: false } };

  declare route: Extract<Route, { page: 'collection' }>;
  declare labels: CollectionLabels | undefined;

  private page() {
    const r = this.route;
    switch (r.tab) {
      case 'champions':
        return r.id
          ? html`<page-champion .championId=${r.id} .section=${r.section ?? 'skills'} .skinNum=${r.skin}></page-champion>`
          : html`<page-champions .labels=${this.labels}></page-champions>`;
      case 'skins':
        return html`<page-skins></page-skins>`;
      case 'emotes':
      case 'icons':
      case 'wards':
      case 'finishers':
        return html`<page-collectibles .kind=${r.tab} .selectedId=${r.id}></page-collectibles>`;
      case 'runes':
        return html`<page-runes .labels=${this.labels}></page-runes>`;
      case 'spells':
        return html`<page-summoners .labels=${this.labels} .selectedId=${r.id}></page-summoners>`;
      case 'items':
        return html`<page-items .selectedId=${r.id}></page-items>`;
      case 'chromas':
        return html`<page-chromas></page-chromas>`;
    }
  }

  render() {
    return html`<div class="collection" data-tab=${this.route.tab}>
      <nav class="collection-tabs" aria-label="收藏">
        ${COLLECTION_TAB_IDS.map(
          (tab) =>
            html`<a class="collection-tab ${tab === this.route.tab ? 'on' : ''}" href=${collectionHref(tab)}>${this.labels?.tabs[tab].zh_TW ?? FALLBACK_TABS[tab]}</a>`,
        )}
      </nav>
      <a class="collection-close" href=${href()} aria-label="回首頁">✕</a>
      <div class="collection-page">${this.page()}</div>
    </div>`;
  }
}

customElements.define('page-collection', PageCollection);
