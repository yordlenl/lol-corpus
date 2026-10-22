// 英雄列表：可以用中文或英文搜尋，也可以按職業篩選。
import { html, nothing } from 'lit';
import { corpusUrl, loadChampionIndex } from '../../shared/index.ts';
import type { ChampionSummary } from '../../shared/types.ts';
import { LightElement } from '../light.ts';
import { href } from '../router.ts';

const ROLES: Record<string, string> = {
  Assassin: '刺客',
  Fighter: '鬥士',
  Mage: '法師',
  Marksman: '射手',
  Support: '輔助',
  Tank: '坦克',
};

export function matchesChampion(c: ChampionSummary, query: string, role: string): boolean {
  if (role && !c.tags.includes(role)) return false;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [c.id, ...Object.values(c.name), ...Object.values(c.title)].some((s) => s.toLowerCase().includes(q));
}

export class PageChampions extends LightElement {
  static properties = {
    champions: { state: true },
    query: { state: true },
    role: { state: true },
    error: { state: true },
  };

  declare champions: ChampionSummary[] | undefined;
  declare query: string;
  declare role: string;
  declare error: boolean;

  constructor() {
    super();
    this.query = '';
    this.role = '';
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
    const shown = this.champions.filter((c) => matchesChampion(c, this.query, this.role));
    return html`
      <div class="toolbar">
        <input
          class="search"
          type="search"
          placeholder="搜尋英雄（中文或英文）"
          .value=${this.query}
          @input=${(e: InputEvent) => (this.query = (e.target as HTMLInputElement).value)}
        />
        <div class="chips">
          ${[['', '全部'], ...Object.entries(ROLES)].map(
            ([tag, label]) =>
              html`<button type="button" class="chip ${this.role === tag ? 'on' : ''}" @click=${() => (this.role = tag)}>${label}</button>`,
          )}
        </div>
      </div>
      ${shown.length ? nothing : html`<p class="notice">找不到符合的英雄。</p>`}
      <div class="champion-grid">
        ${shown.map(
          (c) => html`<a class="champion-tile panel" href=${href('champions', c.id)}>
            <img src=${corpusUrl(c.icon)} alt="" loading="lazy" width="64" height="64" />
            <lol-trilingual .text=${c.name} context="name" compact .wordsClickable=${false}></lol-trilingual>
          </a>`,
        )}
      </div>
    `;
  }
}

customElements.define('page-champions', PageChampions);
