// <lol-row-toggles>：三行開關（英文、繁中、簡中），至少要留一行。語料庫導覽列和學習 App 設定頁共用。
// variant="nav"：放在上方導覽列時，長得像客戶端導覽列那排字（開著是亮的加底部光暈，關掉是暗的）。
import { css, html, LitElement } from 'lit';
import { corpusUrl } from '../data.ts';
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
    /* 導覽列版：客戶端導覽列文字（18px、粗體、字距 0.05em；一般 #cdbe91、選中 #f0e6d2 加光暈） */
    :host([variant='nav']) {
      align-items: stretch;
    }
    :host([variant='nav']) button {
      position: relative;
      min-height: 0;
      padding: 0 14px;
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: #5b5a56;
      background: none;
      border: none;
      border-radius: 0;
      transition: color 0.3s;
    }
    :host([variant='nav']) button:hover {
      color: #a09b8c;
    }
    :host([variant='nav']) button.on {
      color: #f0e6d2;
      background: var(--highlight) bottom center / 100% 36px no-repeat;
    }
    /* 開著的下面有一條細線，和分頁選中的底線一樣 */
    :host([variant='nav']) button.on::after {
      content: '';
      position: absolute;
      left: 14px;
      right: 14px;
      bottom: 14px;
      height: 2px;
      background: #c8aa6e;
      opacity: 0.8;
    }
    @media (max-width: 620px) {
      :host([variant='nav']) button {
        padding: 0 8px;
        font-size: 15px;
      }
      :host([variant='nav']) button.on::after {
        left: 8px;
        right: 8px;
      }
    }
  `;

  static properties = { variant: { reflect: true } };

  declare variant: 'nav' | undefined;

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
    if (this.variant === 'nav') this.style.setProperty('--highlight', `url(${corpusUrl('img/client/ui/nav-highlight.png')})`);
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
