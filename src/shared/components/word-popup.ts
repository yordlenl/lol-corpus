// <lol-word-popup>：點英文單字後的查詞小視窗（音標、繁體釋義）。整頁只放一個。
import { css, html, LitElement, nothing } from 'lit';
import { lookupWord } from '../dict.ts';
import type { LookupResult, WordEventDetail } from '../types.ts';
import { define } from './define.ts';
import { themeStyles } from './styles.ts';

const WIDTH = 320;
const MARGIN = 8;

export class LolWordPopup extends LitElement {
  static properties = {
    detail: { state: true },
    result: { state: true },
    failed: { state: true },
  };

  static styles = [
    themeStyles,
    css`
      :host {
        position: fixed;
        inset: 0 auto auto 0;
        z-index: 1000;
      }
      .card {
        position: fixed;
        box-sizing: border-box;
        width: ${WIDTH}px;
        max-width: calc(100vw - ${MARGIN * 2}px);
        max-height: 50vh;
        overflow: auto;
        padding: 14px 16px;
        color: var(--lol-popup-text, var(--lol-text, #222));
        background: var(--lol-popup-bg, #fff);
        border: 1px solid var(--lol-popup-border, var(--lol-line, #ccc));
        border-radius: var(--lol-popup-radius, 8px);
        box-shadow: 0 8px 28px rgba(0, 0, 0, 0.35);
      }
      .top {
        display: flex;
        align-items: baseline;
        gap: 10px;
        padding-right: 28px;
      }
      .word {
        font-size: 1.3em;
        font-weight: 700;
        color: var(--lol-popup-strong, var(--lol-text-strong, inherit));
      }
      .phonetic {
        color: var(--lol-muted, #666);
      }
      .lemma {
        margin-top: 2px;
        font-size: 0.85em;
        color: var(--lol-muted, #666);
      }
      .def {
        margin-top: 8px;
        white-space: pre-line;
        line-height: 1.6;
      }
      .missing {
        margin-top: 8px;
        padding: 8px 10px;
        font-weight: 600;
        color: var(--lol-popup-warn-text, #8a5a00);
        background: var(--lol-popup-warn-bg, #fff4d6);
        border-radius: 4px;
      }
      .close {
        position: absolute;
        top: 6px;
        right: 6px;
        width: 36px;
        height: 36px;
        font-size: 22px;
        line-height: 1;
        color: var(--lol-muted, #666);
        background: none;
        border: none;
        cursor: pointer;
      }
    `,
  ];

  declare detail: WordEventDetail | null;
  declare result: LookupResult | null;
  declare failed: boolean;

  constructor() {
    super();
    this.detail = null;
    this.result = null;
    this.failed = false;
  }

  private onOutside = (event: PointerEvent) => {
    if (!event.composedPath().includes(this)) this.close();
  };

  private onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') this.close();
  };

  private onNavigate = () => this.close();

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('pointerdown', this.onOutside, true);
    document.addEventListener('keydown', this.onKey);
    window.addEventListener('hashchange', this.onNavigate);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('pointerdown', this.onOutside, true);
    document.removeEventListener('keydown', this.onKey);
    window.removeEventListener('hashchange', this.onNavigate);
  }

  async open(detail: WordEventDetail) {
    this.detail = detail;
    this.result = null;
    this.failed = false;
    try {
      const result = await lookupWord(detail.key);
      if (this.detail === detail) this.result = result;
    } catch {
      if (this.detail === detail) this.failed = true;
    }
  }

  close() {
    this.detail = null;
  }

  /** 放在單字下方；下方放不下就放上方，左右不超出畫面 */
  protected updated() {
    const card = this.renderRoot.querySelector<HTMLElement>('.card');
    if (!card || !this.detail) return;
    const { anchor } = this.detail;
    const left = Math.min(Math.max(MARGIN, anchor.left), window.innerWidth - card.offsetWidth - MARGIN);
    const below = anchor.bottom + MARGIN;
    const top = below + card.offsetHeight <= window.innerHeight - MARGIN ? below : Math.max(MARGIN, anchor.top - MARGIN - card.offsetHeight);
    card.style.left = `${left}px`;
    card.style.top = `${top}px`;
  }

  private body() {
    if (this.failed) return html`<div class="missing">詞典載入失敗，請檢查網路後再試一次</div>`;
    if (!this.result) return html`<div class="def">查詢中…</div>`;
    const { entry, lemma, surface } = this.result;
    if (!entry) return html`<div class="missing">辭典沒有收錄這個字</div>`;
    return html`
      ${lemma !== surface ? html`<div class="lemma">原形：${lemma}</div>` : nothing}
      <div class="def">${entry.t ?? '（沒有中文釋義）'}</div>
    `;
  }

  render() {
    if (!this.detail) return nothing;
    const phonetic = this.result?.entry?.p;
    return html`<div class="card" role="dialog" aria-label="查詞">
      <div class="top">
        <span class="word" lang="en">${this.detail.word}</span>
        ${phonetic ? html`<span class="phonetic">/${phonetic}/</span>` : nothing}
      </div>
      ${this.body()}
      <button class="close" type="button" aria-label="關閉" @click=${this.close}>×</button>
    </div>`;
  }
}

define('lol-word-popup', LolWordPopup);

/** 在頁面放一個查詞小視窗，接住所有元件發出的 lol-word 事件 */
export function installWordPopup(): LolWordPopup {
  let popup = document.querySelector('lol-word-popup');
  if (!popup) {
    popup = document.createElement('lol-word-popup');
    document.body.append(popup);
    document.addEventListener('lol-word', (event) => popup!.open((event as CustomEvent<WordEventDetail>).detail));
  }
  return popup;
}

declare global {
  interface HTMLElementTagNameMap {
    'lol-word-popup': LolWordPopup;
  }
}
