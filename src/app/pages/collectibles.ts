// 收藏 → 表情、頭像、偵察守衛、終結特效：圖示格子＋名稱，點一個在右邊看三行名稱和說明。
import { html, nothing } from 'lit';
import { loadCollectibles } from '../../shared/index.ts';
import { richToPlain } from '../../shared/text.ts';
import type { CollectibleKind, Collectible, SourceRef } from '../../shared/types.ts';
import { LightElement } from '../light.ts';
import { collectionHref } from '../router.ts';
import { GrowingList } from './growing-list.ts';

const SOURCE_TYPE: Record<CollectibleKind, SourceRef['type']> = {
  emotes: 'emote',
  icons: 'icon',
  wards: 'ward',
  finishers: 'finisher',
};

export function matchesCollectible(item: Collectible, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const texts = [...Object.values(item.name), ...(item.description ? Object.values(item.description).map(richToPlain) : [])];
  return texts.some((s) => s.toLowerCase().includes(q));
}

export class PageCollectibles extends LightElement {
  static properties = {
    kind: { attribute: false },
    selectedId: { attribute: false },
    items: { state: true },
    query: { state: true },
    error: { state: true },
  };

  declare kind: CollectibleKind;
  declare selectedId: string | undefined;
  declare items: Collectible[] | undefined;
  declare query: string;
  declare error: boolean;

  private list = new GrowingList(this, 150);

  constructor() {
    super();
    this.query = '';
    this.error = false;
  }

  protected willUpdate(changed: Map<string, unknown>) {
    if (changed.has('kind')) {
      this.items = undefined;
      this.error = false;
      this.query = '';
      this.list.reset();
      const kind = this.kind;
      loadCollectibles(kind).then(
        (items) => kind === this.kind && (this.items = items),
        () => kind === this.kind && (this.error = true),
      );
    }
  }

  private detail(item: Collectible) {
    const source: SourceRef = { type: SOURCE_TYPE[this.kind], id: String(item.id), label: item.name };
    return html`<div class="collectible-detail">
      <img class="collectible-big" src=${item.image} alt="" />
      <lol-trilingual class="detail-name" .text=${item.name} context="name" .source=${source} compact></lol-trilingual>
      ${item.year ? html`<p class="collectible-year">${item.year} 年</p>` : nothing}
      ${item.description ? html`<lol-trilingual .text=${item.description} .source=${source} collectable></lol-trilingual>` : nothing}
    </div>`;
  }

  render() {
    if (this.error) return html`<p class="notice">資料讀取失敗，請重新整理頁面。</p>`;
    if (!this.items) return html`<p class="notice">載入中…</p>`;
    const shown = this.items.filter((it) => matchesCollectible(it, this.query));
    const selected = this.items.find((it) => String(it.id) === this.selectedId);
    return html`<div class="collection-split collectibles" data-kind=${this.kind}>
      <div class="collection-scroll">
        <div class="collection-toolbar">
          <input
            class="client-search"
            type="search"
            placeholder="搜尋"
            aria-label="搜尋（中文或英文）"
            .value=${this.query}
            @input=${(e: InputEvent) => {
              this.query = (e.target as HTMLInputElement).value;
              this.list.reset();
            }}
          />
          <span class="control-count">${shown.length} 個</span>
        </div>
        ${shown.length ? nothing : html`<p class="notice">找不到符合的項目。</p>`}
        <div class="collectible-grid">
          ${shown.slice(0, this.list.limit).map(
            (it) => html`<a class="collectible ${String(it.id) === this.selectedId ? 'on' : ''}" href=${collectionHref(this.kind, it.id)}>
              <span class="collectible-art"><img src=${it.image} alt="" loading="lazy" /></span>
              <span class="collectible-name">${it.name.zh_TW}</span>
            </a>`,
          )}
        </div>
        ${this.list.sentinel(shown.length)}
      </div>
      <aside class="collectible-side">${selected ? this.detail(selected) : html`<p class="notice">點一個看三行對照的名稱和說明。</p>`}</aside>
    </div>`;
  }
}

customElements.define('page-collectibles', PageCollectibles);
