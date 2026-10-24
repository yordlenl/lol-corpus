// 收藏 → 英雄：照遊戲的英雄格子。左邊搜尋、職業篩選、排序；右邊直式卡片和名字。
import { html, nothing } from 'lit';
import { loadChampionIndex } from '../../shared/index.ts';
import type { ChampionSummary, CollectionLabels } from '../../shared/types.ts';
import { championLoading } from '../images.ts';
import { LightElement } from '../light.ts';
import { collectionHref } from '../router.ts';

export const ROLES: Record<string, string> = {
  Fighter: '鬥士',
  Marksman: '射手',
  Assassin: '刺客',
  Mage: '法師',
  Tank: '坦克',
  Support: '輔助',
};

export function matchesChampion(c: ChampionSummary, query: string, role: string): boolean {
  if (role && !c.tags.includes(role)) return false;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [c.id, ...Object.values(c.name), ...Object.values(c.title)].some((s) => s.toLowerCase().includes(q));
}

/** 和台服客戶端一樣，依繁中名稱的筆畫排 */
const strokeOrder = new Intl.Collator('zh-Hant-TW-u-co-stroke');
export const sortChampions = (list: ChampionSummary[], ascending = true) =>
  [...list].sort((a, b) => strokeOrder.compare(a.name.zh_TW, b.name.zh_TW) * (ascending ? 1 : -1));

export class PageChampions extends LightElement {
  static properties = {
    labels: { attribute: false },
    champions: { state: true },
    query: { state: true },
    role: { state: true },
    ascending: { state: true },
    error: { state: true },
  };

  declare labels: CollectionLabels | undefined;
  declare champions: ChampionSummary[] | undefined;
  declare query: string;
  declare role: string;
  declare ascending: boolean;
  declare error: boolean;

  constructor() {
    super();
    this.query = '';
    this.role = '';
    this.ascending = true;
    this.error = false;
  }

  connectedCallback() {
    super.connectedCallback();
    loadChampionIndex().then(
      (list) => (this.champions = list),
      () => (this.error = true),
    );
  }

  render() {
    if (this.error) return html`<p class="notice">英雄資料讀取失敗，請重新整理頁面。</p>`;
    if (!this.champions) return html`<p class="notice">載入中…</p>`;
    const shown = sortChampions(
      this.champions.filter((c) => matchesChampion(c, this.query, this.role)),
      this.ascending,
    );
    const sortLabel = (this.labels?.alphabetical.zh_TW ?? '依照字首排列 ▲').replace('▲', this.ascending ? '▲' : '▼');
    return html`<div class="collection-split">
      <aside class="control-panel">
        <div class="panel-frame"><span class="panel-big">${this.champions.length}</span>位英雄</div>
        <input
          class="client-search"
          type="search"
          placeholder=${this.labels?.search.zh_TW ?? '搜尋'}
          aria-label="搜尋英雄（中文或英文）"
          .value=${this.query}
          @input=${(e: InputEvent) => (this.query = (e.target as HTMLInputElement).value)}
        />
        <select class="client-select" aria-label="職業" @change=${(e: Event) => (this.role = (e.target as HTMLSelectElement).value)}>
          <option value="" ?selected=${!this.role}>${this.labels?.allChampions.zh_TW ?? '所有英雄'}</option>
          ${Object.entries(ROLES).map(([tag, label]) => html`<option value=${tag} ?selected=${this.role === tag}>${label}</option>`)}
        </select>
        <button type="button" class="client-select" @click=${() => (this.ascending = !this.ascending)}>${sortLabel}</button>
      </aside>
      <div class="collection-scroll">
        ${shown.length ? nothing : html`<p class="notice">找不到符合的英雄。</p>`}
        <div class="champion-cards">
          ${shown.map(
            (c) => html`<a class="champion-card" href=${collectionHref('champions', c.id)}>
              <span class="card-art"><img src=${championLoading(c.id)} alt="" loading="lazy" /></span>
              <span class="card-name">${c.name.zh_TW}<span class="card-en" lang="en">${c.name.en}</span></span>
            </a>`,
          )}
        </div>
      </div>
    </div>`;
  }
}

customElements.define('page-champions', PageChampions);
