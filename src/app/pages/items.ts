// 裝備：依等級分區列出；點一件在右側看三行描述與合成關係。照遊戲商店的排版在第六階段做。
import { html, nothing } from 'lit';
import { corpusUrl, loadItems } from '../../shared/index.ts';
import type { Item, ItemTier } from '../../shared/types.ts';
import { LightElement } from '../light.ts';
import { href } from '../router.ts';

export const TIER_SECTIONS: Array<[ItemTier, string]> = [
  ['starter', '起始'],
  ['consumable', '消耗品與飾品'],
  ['boots', '鞋子'],
  ['basic', '基礎'],
  ['epic', '中間件'],
  ['legendary', '傳說'],
];

export function matchesItem(item: Item, query: string): boolean {
  const q = query.trim().toLowerCase();
  return !q || Object.values(item.name).some((n) => n.toLowerCase().includes(q));
}

export class PageItems extends LightElement {
  static properties = {
    selectedId: { attribute: false },
    items: { state: true },
    query: { state: true },
    error: { state: true },
  };

  declare selectedId: string | undefined;
  declare items: Item[] | undefined;
  declare query: string;
  declare error: boolean;

  constructor() {
    super();
    this.query = '';
    this.error = false;
  }

  connectedCallback() {
    super.connectedCallback();
    loadItems().then(
      (items) => (this.items = items),
      () => (this.error = true),
    );
  }

  private icons(ids: string[], byId: Map<string, Item>) {
    return html`<div class="item-row">
      ${ids.map((id) => {
        const it = byId.get(id);
        return it
          ? html`<a class="item-tile" href=${href('items', id)} title=${it.name.zh_TW}>
              <img src=${corpusUrl(it.icon)} alt=${it.name.zh_TW} width="40" height="40" loading="lazy" />
            </a>`
          : nothing;
      })}
    </div>`;
  }

  render() {
    if (this.error) return html`<p class="notice">裝備資料讀取失敗，請重新整理頁面。</p>`;
    if (!this.items) return html`<p class="notice">載入中…</p>`;
    const byId = new Map(this.items.map((it) => [it.id, it]));
    const selected = this.selectedId ? byId.get(this.selectedId) : undefined;
    const shown = this.items.filter((it) => matchesItem(it, this.query));
    return html`<div class="split">
      <div class="split-main">
        <input
          class="search"
          type="search"
          placeholder="搜尋裝備（中文或英文）"
          .value=${this.query}
          @input=${(e: InputEvent) => (this.query = (e.target as HTMLInputElement).value)}
        />
        ${TIER_SECTIONS.map(([tier, label]) => {
          const list = shown.filter((it) => it.tier === tier).sort((a, b) => a.gold.total - b.gold.total);
          return list.length
            ? html`<h2 class="section-title">${label}</h2>
                <div class="item-grid">
                  ${list.map(
                    (it) => html`<a class="item-cell ${it.id === this.selectedId ? 'current' : ''}" href=${href('items', it.id)}>
                      <img src=${corpusUrl(it.icon)} alt="" width="48" height="48" loading="lazy" />
                      <span class="price">${it.gold.total}</span>
                    </a>`,
                  )}
                </div>`
            : nothing;
        })}
      </div>
      <aside class="split-side panel">
        ${selected
          ? html`<lol-item-card .item=${selected}></lol-item-card>
              ${selected.from.length ? html`<h3 class="mini-title">合成材料</h3>${this.icons(selected.from, byId)}` : nothing}
              ${selected.into.length ? html`<h3 class="mini-title">可合成</h3>${this.icons(selected.into, byId)}` : nothing}`
          : html`<p class="notice">點左邊的裝備，這裡會顯示三行對照的說明。</p>`}
      </aside>
    </div>`;
  }
}

customElements.define('page-items', PageItems);
