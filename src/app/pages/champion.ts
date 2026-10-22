// 英雄頁：稱號、被動、Q/W/E/R、選用／禁用台詞、皮膚名。
import { html, nothing } from 'lit';
import { corpusUrl, loadChampion } from '../../shared/index.ts';
import type { Champion, SourceRef } from '../../shared/types.ts';
import { LightElement } from '../light.ts';
import { href } from '../router.ts';

export class PageChampion extends LightElement {
  static properties = {
    championId: { attribute: false },
    champion: { state: true },
    error: { state: true },
  };

  declare championId: string;
  declare champion: Champion | undefined;
  declare error: boolean;

  constructor() {
    super();
    this.error = false;
  }

  protected willUpdate(changed: Map<string, unknown>) {
    if (changed.has('championId')) this.load(this.championId);
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

  render() {
    const back = html`<a class="back" href=${href('champions')}>← 英雄列表</a>`;
    if (this.error) return html`${back}<p class="notice">找不到這位英雄的資料。</p>`;
    const c = this.champion;
    if (!c) return html`${back}<p class="notice">載入中…</p>`;
    const self: SourceRef = { type: 'champion', id: c.id, label: c.name };
    return html`
      ${back}
      <section class="champion-head panel">
        <img src=${corpusUrl(c.icon)} alt="" width="96" height="96" />
        <div>
          <lol-trilingual class="champion-name" .text=${c.name} context="name" .source=${self} compact></lol-trilingual>
          <lol-trilingual class="champion-title" .text=${c.title} context="name" .source=${self}></lol-trilingual>
        </div>
      </section>

      <h2 class="section-title">技能</h2>
      <div class="stack">
        <lol-spell
          class="panel"
          .ability=${c.passive}
          slot-label="被動"
          .source=${{ type: 'passive', id: c.id, label: c.passive.name } satisfies SourceRef}
        ></lol-spell>
        ${c.spells.map(
          (sp) =>
            html`<lol-spell
              class="panel"
              .ability=${sp}
              slot-label=${sp.slot}
              .source=${{ type: 'spell', id: `${c.id}/${sp.slot}`, label: sp.name } satisfies SourceRef}
            ></lol-spell>`,
        )}
      </div>

      <h2 class="section-title">選用／禁用台詞</h2>
      <div class="stack">${c.quotes.map((q) => html`<lol-quote class="panel" .quote=${q}></lol-quote>`)}</div>

      ${c.skins.length
        ? html`<h2 class="section-title">皮膚名</h2>
            <div class="skin-grid">
              ${c.skins.map(
                (s) =>
                  html`<lol-trilingual
                    class="panel skin"
                    .text=${s.name}
                    context="name"
                    compact
                    .source=${{ type: 'skin', id: s.id, label: s.name } satisfies SourceRef}
                  ></lol-trilingual>`,
              )}
            </div>`
        : nothing}
    `;
  }
}

customElements.define('page-champion', PageChampion);
