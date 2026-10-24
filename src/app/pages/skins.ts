// 收藏 → 造型：全部造型的直式卡片，可以搜尋。點一款就到那位英雄的「造型」，停在那一款。
import { html, nothing } from 'lit';
import { corpusUrl, loadChampionIndex, loadSkinCards } from '../../shared/index.ts';
import type { ChampionSummary, SkinCard } from '../../shared/types.ts';
import { championLoading, skinBorder } from '../images.ts';
import { LightElement } from '../light.ts';
import { collectionHref } from '../router.ts';
import { GrowingList } from './growing-list.ts';

export function matchesSkin(skin: SkinCard, champion: ChampionSummary | undefined, query: string, storyOnly: boolean): boolean {
  if (storyOnly && !skin.story) return false;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [...Object.values(skin.name), ...(champion ? Object.values(champion.name) : [])].some((s) => s.toLowerCase().includes(q));
}

export class PageSkins extends LightElement {
  static properties = {
    skins: { state: true },
    champions: { state: true },
    query: { state: true },
    storyOnly: { state: true },
    error: { state: true },
  };

  declare skins: SkinCard[] | undefined;
  declare champions: Map<string, ChampionSummary> | undefined;
  declare query: string;
  declare storyOnly: boolean;
  declare error: boolean;

  private list = new GrowingList(this, 120);

  constructor() {
    super();
    this.query = '';
    this.storyOnly = false;
    this.error = false;
  }

  connectedCallback() {
    super.connectedCallback();
    Promise.all([loadSkinCards(), loadChampionIndex()]).then(
      ([skins, champions]) => {
        this.skins = skins;
        this.champions = new Map(champions.map((c) => [c.id, c]));
      },
      () => (this.error = true),
    );
  }

  render() {
    if (this.error) return html`<p class="notice">造型資料讀取失敗，請重新整理頁面。</p>`;
    if (!this.skins || !this.champions) return html`<p class="notice">載入中…</p>`;
    const shown = this.skins.filter((s) => matchesSkin(s, this.champions!.get(s.champion), this.query, this.storyOnly));
    return html`<div class="collection-split">
      <aside class="control-panel">
        <div class="panel-frame"><span class="panel-big">${shown.length}</span>款造型</div>
        <input
          class="client-search"
          type="search"
          placeholder="搜尋"
          aria-label="搜尋造型或英雄（中文或英文）"
          .value=${this.query}
          @input=${(e: InputEvent) => {
            this.query = (e.target as HTMLInputElement).value;
            this.list.reset();
          }}
        />
        <label class="client-check">
          <input
            type="checkbox"
            .checked=${this.storyOnly}
            @change=${(e: Event) => {
              this.storyOnly = (e.target as HTMLInputElement).checked;
              this.list.reset();
            }}
          />
          只看有故事介紹的
        </label>
      </aside>
      <div class="collection-scroll">
        ${shown.length ? nothing : html`<p class="notice">找不到符合的造型。</p>`}
        <div class="champion-cards skin-cards">
          ${shown.slice(0, this.list.limit).map(
            (s) => html`<a class="champion-card skin-card" href=${collectionHref('champions', s.champion, 'skins', s.num)}>
              <span class="card-art skin-art">
                <img src=${championLoading(s.champion, s.num)} alt="" loading="lazy" />
                <img class="skin-border" src=${corpusUrl(skinBorder(s.rarity))} alt="" />
              </span>
              <span class="card-name">${s.name.zh_TW}<span class="card-en" lang="en">${s.name.en}</span></span>
            </a>`,
          )}
        </div>
        ${this.list.sentinel(shown.length)}
      </div>
    </div>`;
  }
}

customElements.define('page-skins', PageSkins);
