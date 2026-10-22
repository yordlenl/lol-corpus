// <lol-sentence-picker>：一段裡有好幾句時，列出每一句（英文＋對應中文），挑一句收進句子庫。整頁只放一個。
import { css, html, LitElement, nothing } from 'lit';
import { collection } from '../collection.ts';
import { sentenceCardId } from '../db.ts';
import type { SentenceUnit, SourceRef } from '../types.ts';
import { define } from './define.ts';
import { anchorOf, placeNear } from './place.ts';
import { popupStyles } from './popup-styles.ts';
import { themeStyles } from './styles.ts';

export interface PickSentenceDetail {
  units: SentenceUnit[];
  source: SourceRef;
  anchor: ReturnType<typeof anchorOf>;
}

export class LolSentencePicker extends LitElement {
  static properties = { detail: { state: true }, busy: { state: true } };

  static styles = [
    themeStyles,
    popupStyles,
    css`
      .card {
        width: 520px;
      }
      h3 {
        margin: 0 36px 10px 0;
        font-size: 1em;
        color: var(--lol-popup-strong, var(--lol-text-strong, inherit));
      }
      ul {
        margin: 0;
        padding: 0;
        list-style: none;
      }
      li {
        display: flex;
        gap: 12px;
        align-items: center;
        padding: 10px 0;
        border-top: 1px solid var(--lol-line, #ddd);
      }
      .text {
        flex: 1;
        min-width: 0;
      }
      .en {
        color: var(--lol-popup-strong, var(--lol-text-strong, inherit));
      }
      .zh {
        margin-top: 2px;
        font-size: 0.9em;
        white-space: pre-line;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .note {
        font-size: 0.8em;
        color: var(--lol-muted, #666);
      }
    `,
  ];

  declare detail: PickSentenceDetail | null;
  declare busy: string;

  constructor() {
    super();
    this.detail = null;
    this.busy = '';
  }

  private onOutside = (event: PointerEvent) => {
    if (this.detail && !event.composedPath().includes(this)) this.close();
  };
  private onKey = (event: KeyboardEvent) => event.key === 'Escape' && this.close();
  private onChange = () => this.requestUpdate();
  private onNavigate = () => this.close();

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

  open(detail: PickSentenceDetail) {
    this.detail = detail;
  }

  close() {
    this.detail = null;
  }

  protected updated() {
    const card = this.renderRoot.querySelector<HTMLElement>('.card');
    if (card && this.detail) placeNear(card, this.detail.anchor);
  }

  private async add(unit: SentenceUnit) {
    const id = sentenceCardId(this.detail!.source, unit.text.en);
    this.busy = id;
    try {
      await collection.addSentence({ unit, source: this.detail!.source });
    } finally {
      this.busy = '';
    }
  }

  render() {
    if (!this.detail) return nothing;
    const { units, source } = this.detail;
    return html`<div class="card" role="dialog" aria-label="收藏句子">
      <h3>挑一句收進句子庫</h3>
      <ul>
        ${units.map((unit) => {
          const id = sentenceCardId(source, unit.text.en);
          const done = collection.has(id);
          return html`<li>
            <div class="text">
              <div class="en" lang="en">${unit.text.en}</div>
              <div class="zh" lang="zh-Hant-TW">${unit.text.zh_TW}</div>
              ${unit.alignment === 'sentence' ? nothing : html`<div class="note">中文是${unit.alignment === 'line' ? '同一行' : '整段'}的翻譯</div>`}
            </div>
            <button class="collect" type="button" ?disabled=${done || this.busy === id} @click=${() => this.add(unit)}>
              ${done ? '已收藏' : '收藏'}
            </button>
          </li>`;
        })}
      </ul>
      <button class="close" type="button" aria-label="關閉" @click=${this.close}>×</button>
    </div>`;
  }
}

define('lol-sentence-picker', LolSentencePicker);

/** 在頁面放一個挑句子視窗，接住元件發出的 lol-pick-sentence 事件 */
export function installSentencePicker(): LolSentencePicker {
  let picker = document.querySelector('lol-sentence-picker');
  if (!picker) {
    picker = document.createElement('lol-sentence-picker');
    document.body.append(picker);
    document.addEventListener('lol-pick-sentence', (e) => picker!.open((e as CustomEvent<PickSentenceDetail>).detail));
  }
  return picker;
}

declare global {
  interface HTMLElementTagNameMap {
    'lol-sentence-picker': LolSentencePicker;
  }
}
