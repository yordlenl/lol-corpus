// <lol-row-toggles>：三行開關（英文、繁中、簡中），至少要留一行。語料庫導覽列和學習 App 設定頁共用。
import { css, html, LitElement } from 'lit';
import { settings } from '../settings.ts';
import type { Lang } from '../types.ts';
import { define } from './define.ts';

const LABELS: Record<Lang, string> = { en: '英文', zh_TW: '繁中', zh_CN: '簡中' };

export class LolRowToggles extends LitElement {
  static styles = css`
    :host {
      display: inline-flex;
    }
    button {
      min-height: 40px;
      padding: 0 14px;
      font: inherit;
      color: var(--lol-toggle-text, inherit);
      background: var(--lol-toggle-bg, transparent);
      border: 1px solid var(--lol-toggle-border, currentColor);
      cursor: pointer;
    }
    button + button {
      border-left: none;
    }
    button:first-child {
      border-radius: var(--lol-toggle-radius, 0) 0 0 var(--lol-toggle-radius, 0);
    }
    button:last-child {
      border-radius: 0 var(--lol-toggle-radius, 0) var(--lol-toggle-radius, 0) 0;
    }
    button.on {
      color: var(--lol-toggle-on-text, inherit);
      background: var(--lol-toggle-on-bg, transparent);
      border-color: var(--lol-toggle-on-border, var(--lol-toggle-border, currentColor));
    }
    button:disabled {
      cursor: not-allowed;
    }
  `;

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
    return html`${(Object.keys(LABELS) as Lang[]).map((lang) => {
      const on = rows[lang];
      const locked = on && visibleCount === 1;
      return html`<button
        type="button"
        class=${on ? 'on' : ''}
        aria-pressed=${on}
        ?disabled=${locked}
        title=${locked ? '至少要顯示一行' : ''}
        @click=${() => settings.setRow(lang, !on)}
      >${LABELS[lang]}</button>`;
    })}`;
  }
}

define('lol-row-toggles', LolRowToggles);

declare global {
  interface HTMLElementTagNameMap {
    'lol-row-toggles': LolRowToggles;
  }
}
