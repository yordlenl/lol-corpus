// <lol-trilingual>：同一段文字的英文、繁中、簡中三行，依設定個別顯示或隱藏。
import { css, html, LitElement, nothing, type PropertyValues } from 'lit';
import { collection } from '../collection.ts';
import { sentenceCardId } from '../db.ts';
import { sentenceUnits } from '../sentences.ts';
import { settings } from '../settings.ts';
import { richToPlain } from '../text.ts';
import type { Lang, Rich, SentenceUnit, SourceRef, TextContext, Tri, WordEventDetail } from '../types.ts';
import { define } from './define.ts';
import { renderRich } from './rich.ts';
import type { PickSentenceDetail } from './sentence-picker.ts';
import { anchorOf } from './place.ts';
import { themeStyles } from './styles.ts';

export const LANGS: Lang[] = ['en', 'zh_TW', 'zh_CN'];
const HTML_LANG: Record<Lang, string> = { en: 'en', zh_TW: 'zh-Hant-TW', zh_CN: 'zh-Hans-CN' };

export class LolTrilingual extends LitElement {
  static properties = {
    text: { attribute: false },
    context: {},
    mode: {},
    badges: { attribute: false },
    source: { attribute: false },
    wordsClickable: { type: Boolean, attribute: 'words-clickable' },
    compact: { type: Boolean, reflect: true },
    collectable: { type: Boolean },
  };

  static styles = [
    themeStyles,
    css`
      :host {
        display: block;
      }
      .row {
        white-space: pre-line;
        overflow-wrap: anywhere;
      }
      .row + .row {
        margin-top: var(--lol-row-gap, 4px);
      }
      :host([compact]) .row + .row {
        margin-top: 0;
      }
      .en {
        color: var(--lol-en, var(--lol-text-strong, inherit));
        font-size: var(--lol-en-size, 1em);
        line-height: 1.5;
      }
      .zh_TW {
        color: var(--lol-zh-tw, inherit);
        font-size: var(--lol-zh-tw-size, 0.95em);
      }
      .zh_CN {
        color: var(--lol-zh-cn, var(--lol-muted, inherit));
        font-size: var(--lol-zh-cn-size, 0.9em);
      }
      .w {
        cursor: pointer;
        border-radius: 2px;
        -webkit-tap-highlight-color: transparent;
      }
      .w:hover,
      .w.active {
        background: var(--lol-word-hover, rgba(127, 127, 127, 0.22));
      }
      .tools {
        display: flex;
        justify-content: flex-end;
        margin-top: 6px;
      }
    `,
  ];

  declare text: Tri<Rich> | undefined;
  /** 名稱或正文：影響哪些字能點 */
  declare context: TextContext;
  /** read 閱讀；practice 練習（第四階段實作挖空） */
  declare mode: 'read' | 'practice';
  /** 每一行後面的小標籤，例如「學習譯文」 */
  declare badges: Partial<Record<Lang, string>> | undefined;
  declare source: SourceRef | undefined;
  declare wordsClickable: boolean;
  declare compact: boolean;
  /** 顯示「收藏句子」按鈕（要有 source） */
  declare collectable: boolean;

  /** 這段可以收藏的句子（text 變了才重算） */
  private units: SentenceUnit[] = [];

  constructor() {
    super();
    this.context = 'body';
    this.mode = 'read';
    this.wordsClickable = true;
    this.compact = false;
    this.collectable = false;
  }

  private onChange = () => this.requestUpdate();

  connectedCallback() {
    super.connectedCallback();
    settings.addEventListener('change', this.onChange);
    collection.addEventListener('change', this.onChange);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    settings.removeEventListener('change', this.onChange);
    collection.removeEventListener('change', this.onChange);
  }

  protected willUpdate(changed: PropertyValues<this>) {
    if (changed.has('text') || changed.has('collectable')) {
      this.units = this.collectable && this.text ? sentenceUnits(this.text) : [];
    }
  }

  private async collect(event: Event) {
    const source = this.source!;
    if (this.units.length === 1) {
      await collection.addSentence({ unit: this.units[0], source });
      return;
    }
    const detail: PickSentenceDetail = { units: this.units, source, anchor: anchorOf(event.currentTarget as Element) };
    this.dispatchEvent(new CustomEvent('lol-pick-sentence', { detail, bubbles: true, composed: true }));
  }

  private tools() {
    if (!this.source || !this.units.length || this.mode !== 'read') return nothing;
    const collected = this.units.filter((u) => collection.has(sentenceCardId(this.source!, u.text.en))).length;
    const single = this.units.length === 1;
    const label = single
      ? collected
        ? '已收藏句子'
        : '＋ 收藏句子'
      : `＋ 收藏句子${collected ? `（已收 ${collected}）` : ''}`;
    return html`<div class="tools">
      <button class="collect" type="button" ?disabled=${single && collected === 1} @click=${this.collect}>${label}</button>
    </div>`;
  }

  private onClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.classList?.contains('w') || !this.text) return;
    const rect = target.getBoundingClientRect();
    const detail: WordEventDetail = {
      word: target.textContent ?? '',
      key: target.dataset.key ?? '',
      context: this.context,
      sentence: richToPlain(this.text.en),
      text: { en: richToPlain(this.text.en), zh_TW: richToPlain(this.text.zh_TW), zh_CN: richToPlain(this.text.zh_CN) },
      source: this.source,
      anchor: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
    };
    this.dispatchEvent(new CustomEvent('lol-word', { detail, bubbles: true, composed: true }));
  }

  render() {
    if (!this.text) return nothing;
    const visible = LANGS.filter((lang) => settings.current.rows[lang]);
    // 每一行用 white-space: pre-line 顯示換行，所以 <div> 裡不能有多餘的空白或換行
    return html`${visible.map((lang) => {
      const clickable = lang === 'en' && this.wordsClickable ? { context: this.context } : null;
      const badge = this.badges?.[lang] ? html`<span class="badge">${this.badges[lang]}</span>` : nothing;
      return html`<div class="row ${lang}" lang=${HTML_LANG[lang]} @click=${clickable ? this.onClick : nothing}>${renderRich(this.text![lang], clickable)}${badge}</div>`;
    })}${this.tools()}`;
  }
}

define('lol-trilingual', LolTrilingual);

declare global {
  interface HTMLElementTagNameMap {
    'lol-trilingual': LolTrilingual;
  }
}
