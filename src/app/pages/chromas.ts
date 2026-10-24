// 收藏 → 炫彩造型：依造型分組，每個炫彩一張小圖和名字。
import { html, nothing } from 'lit';
import { loadChampionIndex, loadChromas } from '../../shared/index.ts';
import type { ChampionSummary, ChromaGroup } from '../../shared/types.ts';
import { LightElement } from '../light.ts';
import { collectionHref } from '../router.ts';
import { GrowingList } from './growing-list.ts';

export function matchesChromaGroup(group: ChromaGroup, champion: ChampionSummary | undefined, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [...Object.values(group.skinName), ...(champion ? Object.values(champion.name) : []), ...group.chromas.flatMap((c) => Object.values(c.name))].some((s) =>
    s.toLowerCase().includes(q),
  );
}

export class PageChromas extends LightElement {
  static properties = {
    groups: { state: true },
    champions: { state: true },
    query: { state: true },
    error: { state: true },
  };

  declare groups: ChromaGroup[] | undefined;
  declare champions: Map<string, ChampionSummary> | undefined;
  declare query: string;
  declare error: boolean;

  private list = new GrowingList(this, 30);

  constructor() {
    super();
    this.query = '';
    this.error = false;
  }

  connectedCallback() {
    super.connectedCallback();
    Promise.all([loadChromas(), loadChampionIndex()]).then(
      ([groups, champions]) => {
        this.groups = groups;
        this.champions = new Map(champions.map((c) => [c.id, c]));
      },
      () => (this.error = true),
    );
  }

  render() {
    if (this.error) return html`<p class="notice">炫彩造型資料讀取失敗，請重新整理頁面。</p>`;
    if (!this.groups || !this.champions) return html`<p class="notice">載入中…</p>`;
    const shown = this.groups.filter((g) => matchesChromaGroup(g, this.champions!.get(g.champion), this.query));
    return html`<div class="collection-scroll chromas">
      <div class="collection-toolbar">
        <input
          class="client-search"
          type="search"
          placeholder="搜尋"
          aria-label="搜尋造型、英雄或炫彩（中文或英文）"
          .value=${this.query}
          @input=${(e: InputEvent) => {
            this.query = (e.target as HTMLInputElement).value;
            this.list.reset();
          }}
        />
        <span class="control-count">${shown.reduce((n, g) => n + g.chromas.length, 0)} 個</span>
      </div>
      ${shown.length ? nothing : html`<p class="notice">找不到符合的炫彩造型。</p>`}
      ${shown.slice(0, this.list.limit).map(
        (g) => html`<section class="chroma-group">
          <h3 class="chroma-skin">
            <a href=${collectionHref('champions', g.champion, 'skins', g.skinId % 1000)}>${g.skinName.zh_TW}</a>
            <span lang="en">${g.skinName.en}</span>
          </h3>
          <div class="chroma-row">
            ${g.chromas.map(
              (c) => html`<figure class="chroma">
                <img src=${c.image} alt="" loading="lazy" />
                <figcaption>${c.name.zh_TW}<span lang="en">${c.name.en}</span></figcaption>
              </figure>`,
            )}
          </div>
        </section>`,
      )}
      ${this.list.sentinel(shown.length)}
    </div>`;
  }
}

customElements.define('page-chromas', PageChromas);
