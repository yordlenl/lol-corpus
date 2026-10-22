// 三行開關：英文、繁中、簡中各一個，至少要留一行。
import { html } from 'lit';
import { settings } from '../shared/index.ts';
import type { Lang } from '../shared/types.ts';
import { LightElement } from './light.ts';

const LABELS: Record<Lang, string> = { en: '英文', zh_TW: '繁中', zh_CN: '簡中' };

export class RowToggles extends LightElement {
  private onSettings = () => this.requestUpdate();

  connectedCallback() {
    super.connectedCallback();
    settings.addEventListener('change', this.onSettings);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    settings.removeEventListener('change', this.onSettings);
  }

  render() {
    const rows = settings.current.rows;
    const visibleCount = Object.values(rows).filter(Boolean).length;
    return html`<div class="toggles" role="group" aria-label="三行對照">
      ${(Object.keys(LABELS) as Lang[]).map((lang) => {
        const on = rows[lang];
        const locked = on && visibleCount === 1;
        return html`<button
          type="button"
          class="toggle ${on ? 'on' : ''}"
          aria-pressed=${on}
          ?disabled=${locked}
          title=${locked ? '至少要顯示一行' : ''}
          @click=${() => settings.setRow(lang, !on)}
        >${LABELS[lang]}</button>`;
      })}
    </div>`;
  }
}

customElements.define('row-toggles', RowToggles);
