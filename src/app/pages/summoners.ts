// 收藏 → 召喚師技能：照遊戲，左邊圖示格子＋名稱，下面是選到那個的名稱、召喚師等級、可用模式、三行說明、冷卻時間。
import { html, nothing } from 'lit';
import { corpusUrl, loadSummoners } from '../../shared/index.ts';
import type { CollectionLabels, SourceRef, SummonerSpell } from '../../shared/types.ts';
import { LightElement } from '../light.ts';
import { collectionHref } from '../router.ts';

/** 遊戲裡的召喚師技能頁，依召喚師等級排；同等級照名稱 */
export const sortSpells = (spells: SummonerSpell[]) =>
  [...spells].sort((a, b) => a.summonerLevel - b.summonerLevel || a.name.en.localeCompare(b.name.en));

/** 客戶端列模式的順序：教學、經典、隨機單中，其他排後面 */
const MODE_ORDER = ['TUTORIAL', 'CLASSIC', 'ARAM'];
const modeRank = (m: string) => {
  const i = MODE_ORDER.findIndex((x) => m.startsWith(x));
  return i < 0 ? MODE_ORDER.length : i;
};

/** 可用模式：只列客戶端有翻譯的模式名稱，重複的（教學模式有好幾個代號）只列一次 */
export function spellModes(spell: SummonerSpell, labels: CollectionLabels | undefined): string[] {
  if (!labels) return [];
  const modes = [...spell.modes].sort((a, b) => modeRank(a) - modeRank(b));
  return [...new Set(modes.map((m) => labels.spellModes[m]?.zh_TW).filter((m): m is string => Boolean(m)))];
}

export class PageSummoners extends LightElement {
  static properties = {
    labels: { attribute: false },
    selectedId: { attribute: false },
    spells: { state: true },
    error: { state: true },
  };

  declare labels: CollectionLabels | undefined;
  declare selectedId: string | undefined;
  declare spells: SummonerSpell[] | undefined;
  declare error: boolean;

  constructor() {
    super();
    this.error = false;
  }

  connectedCallback() {
    super.connectedCallback();
    loadSummoners().then(
      (spells) => (this.spells = sortSpells(spells)),
      () => (this.error = true),
    );
  }

  render() {
    if (this.error) return html`<p class="notice">召喚師技能資料讀取失敗，請重新整理頁面。</p>`;
    if (!this.spells) return html`<p class="notice">載入中…</p>`;
    const selected = this.spells.find((s) => s.id === this.selectedId) ?? this.spells[0];
    const source: SourceRef = { type: 'summoner', id: selected.id, label: selected.name };
    const cooldown = (this.labels?.cooldown.zh_TW ?? '冷卻時間： {{duration}} 秒').replace('{{duration}}', selected.cooldown);
    return html`<div class="spells-page">
      <div class="spell-grid">
        ${this.spells.map(
          (s) => html`<a class="spell-cell ${s === selected ? 'on' : ''}" href=${collectionHref('spells', s.id)}>
            <img src=${corpusUrl(s.icon)} alt="" width="64" height="64" />
            <span>${s.name.zh_TW}</span>
          </a>`,
        )}
      </div>
      <section class="spell-info">
        <lol-trilingual class="spell-info-name" .text=${selected.name} context="name" .source=${source} compact></lol-trilingual>
        <p class="spell-level">${this.labels?.summonerLevel.zh_TW ?? '召喚師等級'} ${selected.summonerLevel}</p>
        ${spellModes(selected, this.labels).length ? html`<p class="spell-modes">${spellModes(selected, this.labels).join(', ')}</p>` : nothing}
        <lol-trilingual .text=${selected.description} .source=${source} collectable></lol-trilingual>
        <p class="spell-cooldown">${cooldown}</p>
      </section>
    </div>`;
  }
}

customElements.define('page-summoners', PageSummoners);
