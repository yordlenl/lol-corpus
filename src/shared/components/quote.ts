// <lol-quote>：一句台詞：情境、播放原聲、三行文字（標示學習譯文）、來源連結。
import { css, html, LitElement, nothing } from 'lit';
import type { Lang, Quote, SourceRef } from '../types.ts';
import { define } from './define.ts';
import { themeStyles } from './styles.ts';
import './trilingual.ts';

const EVENT_LABELS: Record<string, string> = { pick: '選用台詞', ban: '禁用台詞' };

/** 同時只播一句 */
let playing: { audio: HTMLAudioElement; owner: LolQuote } | null = null;

export class LolQuote extends LitElement {
  static properties = {
    quote: { attribute: false },
    mode: {},
    state: { state: true },
  };

  static styles = [
    themeStyles,
    css`
      :host {
        display: block;
      }
      .head {
        display: flex;
        flex-wrap: wrap;
        gap: 8px 12px;
        align-items: center;
        margin-bottom: 6px;
        font-size: 0.85em;
        color: var(--lol-muted, inherit);
      }
      .event {
        font-weight: 600;
        color: var(--lol-accent, inherit);
      }
      button {
        min-height: 36px;
        padding: 0 14px;
        font: inherit;
        color: var(--lol-button-text, inherit);
        background: var(--lol-button-bg, transparent);
        border: 1px solid var(--lol-accent, currentColor);
        border-radius: var(--lol-button-radius, 0);
        cursor: pointer;
      }
      a {
        color: var(--lol-muted, inherit);
      }
      .error {
        margin-top: 6px;
        font-size: 0.85em;
        color: var(--lol-danger, #d6455d);
      }
      .badge {
        margin-left: 0;
      }
    `,
  ];

  declare quote: Quote | undefined;
  declare mode: 'read' | 'practice';
  declare state: 'idle' | 'loading' | 'playing' | 'error';

  constructor() {
    super();
    this.mode = 'read';
    this.state = 'idle';
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (playing?.owner === this) this.stop();
  }

  stop() {
    if (playing?.owner !== this) return;
    playing.audio.pause();
    playing = null;
    this.state = 'idle';
  }

  private toggle() {
    if (this.state === 'playing' || this.state === 'loading') return this.stop();
    if (playing) playing.owner.stop();
    const audio = new Audio(this.quote!.audio.en);
    playing = { audio, owner: this };
    this.state = 'loading';
    audio.addEventListener('playing', () => (this.state = 'playing'));
    audio.addEventListener('ended', () => this.stop());
    audio.addEventListener('error', () => {
      if (playing?.owner === this) playing = null;
      this.state = 'error';
    });
    audio.play().catch(() => {
      if (playing?.owner === this) playing = null;
      this.state = 'error';
    });
  }

  render() {
    const q = this.quote;
    if (!q) return nothing;
    const source: SourceRef = { type: 'quote', id: q.id };
    const badges: Partial<Record<Lang, string>> = {};
    for (const lang of ['zh_TW', 'zh_CN'] as const) {
      if (q.translation[lang] === 'learning') badges[lang] = '學習譯文';
    }
    const playLabel = this.state === 'playing' ? '■ 停止' : this.state === 'loading' ? '載入中…' : '▶ 播放原聲';
    return html`
      <div class="head">
        <span class="event">${EVENT_LABELS[q.event] ?? q.event}</span>
        ${q.nonverbal ? html`<span class="badge">非語言聲音</span>` : nothing}
        ${q.fictionalLanguage ? html`<span class="badge">虛構語言</span>` : nothing}
        ${q.audio.en ? html`<button type="button" @click=${this.toggle}>${playLabel}</button>` : nothing}
        <a href=${q.source} target="_blank" rel="noopener">來源</a>
      </div>
      <lol-trilingual
        .text=${{ en: q.text.en, zh_TW: q.text.zh_TW, zh_CN: q.text.zh_CN }}
        .badges=${badges}
        .source=${source}
        .mode=${this.mode}
        .wordsClickable=${!q.nonverbal && !q.fictionalLanguage}
      ></lol-trilingual>
      ${this.state === 'error' ? html`<div class="error">原聲暫時無法播放（需要網路連線）</div>` : nothing}
    `;
  }
}

define('lol-quote', LolQuote);

declare global {
  interface HTMLElementTagNameMap {
    'lol-quote': LolQuote;
  }
}
