// <lol-word-popup>：點英文單字後的查詞小視窗（音標、繁體釋義、收藏單字）。整頁只放一個。
import { css, html, LitElement, nothing } from 'lit';
import { collection } from '../collection.ts';
import { wordCardId } from '../db.ts';
import { lookupWord } from '../dict.ts';
import type { LookupResult, WordEventDetail } from '../types.ts';
import { define } from './define.ts';
import { placeNear } from './place.ts';
import { popupStyles } from './popup-styles.ts';
import './speak-button.ts';
import { themeStyles } from './styles.ts';

export class LolWordPopup extends LitElement {
  static properties = {
    detail: { state: true },
    result: { state: true },
    failed: { state: true },
    saving: { state: true },
  };

  static styles = [
    themeStyles,
    popupStyles,
    css`
      .card {
        width: 320px;
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
      lol-speak-button {
        align-self: center;
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
      .actions {
        margin-top: 12px;
      }
    `,
  ];

  declare detail: WordEventDetail | null;
  declare result: LookupResult | null;
  declare failed: boolean;
  declare saving: boolean;

  constructor() {
    super();
    this.detail = null;
    this.result = null;
    this.failed = false;
    this.saving = false;
  }

  private onOutside = (event: PointerEvent) => {
    if (this.detail && !event.composedPath().includes(this)) this.close();
  };
  private onKey = (event: KeyboardEvent) => event.key === 'Escape' && this.close();
  private onNavigate = () => this.close();
  private onChange = () => this.requestUpdate();

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('pointerdown', this.onOutside, true);
    document.addEventListener('keydown', this.onKey);
    window.addEventListener('hashchange', this.onNavigate);
    collection.addEventListener('change', this.onChange);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('pointerdown', this.onOutside, true);
    document.removeEventListener('keydown', this.onKey);
    window.removeEventListener('hashchange', this.onNavigate);
    collection.removeEventListener('change', this.onChange);
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

  protected updated() {
    const card = this.renderRoot.querySelector<HTMLElement>('.card');
    if (card && this.detail) placeNear(card, this.detail.anchor);
  }

  private async collect() {
    const { detail, result } = this;
    if (!detail || !result) return;
    this.saving = true;
    try {
      await collection.addWord({
        word: detail.word,
        lemma: result.lemma,
        ...(detail.source ? { context: { text: detail.text, source: detail.source } } : {}),
      });
    } finally {
      this.saving = false;
    }
  }

  private body() {
    if (this.failed) return html`<div class="missing">詞典載入失敗，請檢查網路後再試一次</div>`;
    if (!this.result) return html`<div class="def">查詢中…</div>`;
    const { entry, lemma, surface } = this.result;
    if (!entry) return html`<div class="missing">辭典沒有收錄這個字</div>`;
    const collected = collection.has(wordCardId(lemma));
    return html`
      ${lemma !== surface ? html`<div class="lemma">原形：${lemma}</div>` : nothing}
      <div class="def">${entry.t ?? '（沒有中文釋義）'}</div>
      <div class="actions">
        <button class="collect" type="button" ?disabled=${collected || this.saving} @click=${this.collect}>
          ${collected ? '已收藏單字' : '＋ 收藏單字'}
        </button>
      </div>
    `;
  }

  render() {
    if (!this.detail) return nothing;
    const phonetic = this.result?.entry?.p;
    return html`<div class="card" role="dialog" aria-label="查詞">
      <div class="top">
        <span class="word" lang="en">${this.detail.word}</span>
        ${phonetic ? html`<span class="phonetic">/${phonetic}/</span>` : nothing}
        ${this.result?.entry ? html`<lol-speak-button .word=${this.detail.word}></lol-speak-button>` : nothing}
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
