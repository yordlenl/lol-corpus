// 召喚師技能：召喚峽谷能用的 9 個。
import { html } from 'lit';
import { loadSummoners } from '../../shared/index.ts';
import type { SourceRef, SummonerSpell } from '../../shared/types.ts';
import { LightElement } from '../light.ts';

export class PageSummoners extends LightElement {
  static properties = { spells: { state: true }, error: { state: true } };

  declare spells: SummonerSpell[] | undefined;
  declare error: boolean;

  constructor() {
    super();
    this.error = false;
  }

  connectedCallback() {
    super.connectedCallback();
    loadSummoners().then(
      (spells) => (this.spells = spells),
      () => (this.error = true),
    );
  }

  render() {
    if (this.error) return html`<p class="notice">召喚師技能資料讀取失敗，請重新整理頁面。</p>`;
    if (!this.spells) return html`<p class="notice">載入中…</p>`;
    return html`<div class="stack">
      ${this.spells.map(
        (s) =>
          html`<lol-spell
            class="panel"
            .ability=${s}
            .source=${{ type: 'summoner', id: s.id, label: s.name } satisfies SourceRef}
          ></lol-spell>`,
      )}
    </div>`;
  }
}

customElements.define('page-summoners', PageSummoners);
