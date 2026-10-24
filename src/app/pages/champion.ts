// 收藏 → 英雄 → 一位英雄：左上角名字和稱號，三個子欄目：
// 技能（純色背景，點圖示看那一招的三行說明）、台詞（選用／禁用）、造型（大圖、左右切換、故事介紹）。
import { html, nothing } from 'lit';
import { corpusUrl, loadChampion } from '../../shared/index.ts';
import type { Ability, Champion, Skin, SourceRef, Spell } from '../../shared/types.ts';
import { championSplash } from '../images.ts';
import { LightElement } from '../light.ts';
import { type ChampionSection, collectionHref } from '../router.ts';

const SECTIONS: Array<[ChampionSection, string]> = [
  ['skills', '技能'],
  ['quotes', '台詞'],
  ['skins', '造型'],
];

/** 縮圖一次顯示幾張（選到的那張在中間） */
const VISIBLE_THUMBS = 5;

/** 造型輪播：選到第 index 張時，下面要顯示哪幾張（盡量讓選到的在中間） */
export function thumbWindow(count: number, index: number, size = VISIBLE_THUMBS): number[] {
  const n = Math.min(size, count);
  const start = Math.min(Math.max(0, index - Math.floor(n / 2)), count - n);
  return Array.from({ length: n }, (_, i) => start + i);
}

export class PageChampion extends LightElement {
  static properties = {
    championId: { attribute: false },
    section: { attribute: false },
    skinNum: { attribute: false },
    champion: { state: true },
    ability: { state: true },
    error: { state: true },
  };

  declare championId: string;
  declare section: ChampionSection;
  declare skinNum: number | undefined;
  declare champion: Champion | undefined;
  /** 技能分頁選到哪一招：-1 是被動，0–3 是 Q/W/E/R */
  declare ability: number;
  declare error: boolean;

  private swipeStart: number | undefined;

  constructor() {
    super();
    this.section = 'skills';
    this.ability = -1;
    this.error = false;
  }

  protected willUpdate(changed: Map<string, unknown>) {
    if (changed.has('championId')) {
      this.ability = -1;
      this.load(this.championId);
    }
  }

  private async load(id: string) {
    this.champion = undefined;
    this.error = false;
    try {
      const c = await loadChampion(id);
      if (id === this.championId) this.champion = c;
    } catch {
      if (id === this.championId) this.error = true;
    }
  }

  private skills(c: Champion) {
    const abilities: Array<[string, Ability | Spell, SourceRef]> = [
      ['被動', c.passive, { type: 'passive', id: c.id, label: c.passive.name }],
      ...c.spells.map((sp): [string, Spell, SourceRef] => [sp.slot, sp, { type: 'spell', id: `${c.id}/${sp.slot}`, label: sp.name }]),
    ];
    const [slot, ability, source] = abilities[this.ability + 1];
    return html`<div class="champion-skills">
      <div class="ability-icons" role="tablist" aria-label="技能">
        ${abilities.map(
          ([label, a], i) => html`<button
            type="button"
            role="tab"
            class="ability-icon ${i === this.ability + 1 ? 'on' : ''}"
            aria-selected=${i === this.ability + 1}
            aria-label=${`${label} ${a.name.zh_TW}`}
            @click=${() => (this.ability = i - 1)}
          >
            <img src=${corpusUrl(a.icon)} alt="" width="64" height="64" />
            <span class="ability-key">${label}</span>
          </button>`,
        )}
      </div>
      <lol-spell class="ability-detail" .ability=${ability} slot-label=${slot} .source=${source}></lol-spell>
    </div>`;
  }

  private quotes(c: Champion) {
    return html`<div class="champion-quotes">${c.quotes.map((q) => html`<lol-quote class="panel" .quote=${q}></lol-quote>`)}</div>`;
  }

  private skinHref(c: Champion, skin: Skin) {
    return collectionHref('champions', c.id, 'skins', skin.num);
  }

  private go(c: Champion, index: number) {
    const skin = c.skins[(index + c.skins.length) % c.skins.length];
    location.hash = this.skinHref(c, skin);
  }

  private skins(c: Champion) {
    if (!c.skins.length) return html`<p class="notice">沒有造型資料。</p>`;
    const index = Math.max(0, c.skins.findIndex((s) => s.num === (this.skinNum ?? 0)));
    const skin = c.skins[index];
    const source: SourceRef = { type: 'skin', id: skin.id, label: skin.name };
    return html`<div
      class="skin-viewer"
      style="--splash:url(${championSplash(c.id, skin.num)})"
      @pointerdown=${(e: PointerEvent) => (this.swipeStart = e.clientX)}
      @pointerup=${(e: PointerEvent) => {
        // 在大圖上左右滑動也能換造型
        if (this.swipeStart === undefined) return;
        const dx = e.clientX - this.swipeStart;
        this.swipeStart = undefined;
        if (Math.abs(dx) > 60 && !(e.target as Element).closest('.skin-story, .skin-strip')) this.go(c, index + (dx < 0 ? 1 : -1));
      }}
    >
      ${skin.description
        ? html`<aside class="skin-story">
            <lol-trilingual class="skin-story-name" .text=${skin.name} context="name" .source=${source} compact></lol-trilingual>
            <lol-trilingual .text=${skin.description} .source=${source} collectable></lol-trilingual>
          </aside>`
        : nothing}
      <div class="skin-strip">
        <div class="skin-title">${skin.name.zh_TW}<span class="skin-title-en" lang="en">${skin.name.en}</span></div>
        <div class="skin-dots" aria-hidden="true">
          ${c.skins.map((_, i) => html`<span class="skin-dot ${i === index ? 'on' : ''}"></span>`)}
        </div>
        <div class="skin-thumbs">
          <button type="button" class="skin-arrow" aria-label="上一款" @click=${() => this.go(c, index - 1)}>‹</button>
          ${thumbWindow(c.skins.length, index).map((i) => {
            const s = c.skins[i];
            return html`<a class="skin-thumb ${i === index ? 'on' : ''}" href=${this.skinHref(c, s)} aria-label=${s.name.zh_TW}>
              <img src=${s.tile ?? championSplash(c.id, s.num)} alt="" loading="lazy" />
            </a>`;
          })}
          <button type="button" class="skin-arrow" aria-label="下一款" @click=${() => this.go(c, index + 1)}>›</button>
        </div>
      </div>
    </div>`;
  }

  render() {
    if (this.error) return html`<p class="notice">找不到這位英雄的資料。</p>`;
    const c = this.champion;
    if (!c) return html`<p class="notice">載入中…</p>`;
    return html`<div class="champion-detail" data-section=${this.section}>
      <header class="champion-bar">
        <a class="champion-back" href=${collectionHref('champions')} aria-label="回英雄列表">‹</a>
        <img class="champion-bar-icon" src=${corpusUrl(c.icon)} alt="" width="48" height="48" />
        <div class="champion-bar-names">
          <div class="champion-bar-name">${c.name.zh_TW}<span lang="en">${c.name.en}</span></div>
          <div class="champion-bar-title">${c.title.zh_TW}<span lang="en">${c.title.en}</span></div>
        </div>
        <nav class="champion-sections">
          ${SECTIONS.map(
            ([id, label]) =>
              html`<a class="champion-section ${id === this.section ? 'on' : ''}" href=${collectionHref('champions', c.id, id)}>${label}</a>`,
          )}
        </nav>
      </header>
      <div class="champion-body">${this.section === 'skins' ? this.skins(c) : this.section === 'quotes' ? this.quotes(c) : this.skills(c)}</div>
    </div>`;
  }
}

customElements.define('page-champion', PageChampion);
