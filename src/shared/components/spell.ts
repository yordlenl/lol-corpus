// <lol-spell>：一個技能或被動：圖示、名稱、數值、描述。
import { css, html, LitElement, nothing } from 'lit';
import { corpusUrl } from '../data.ts';
import type { Ability, PracticeState, SourceRef, Spell } from '../types.ts';
import { define } from './define.ts';
import { themeStyles } from './styles.ts';
import './trilingual.ts';

export class LolSpell extends LitElement {
  static properties = {
    ability: { attribute: false },
    slotLabel: { attribute: 'slot-label' },
    source: { attribute: false },
    mode: {},
    practice: { attribute: false },
  };

  static styles = [
    themeStyles,
    css`
      :host {
        display: block;
      }
      .spell {
        display: flex;
        gap: 16px;
        align-items: flex-start;
      }
      img.icon {
        width: 56px;
        height: 56px;
      }
      .body {
        flex: 1;
        min-width: 0;
      }
      .head {
        display: flex;
        gap: 10px;
        align-items: baseline;
      }
      .slot {
        flex: none;
        min-width: 28px;
        padding: 0 6px;
        font-weight: 700;
        text-align: center;
        color: var(--lol-slot-text, var(--lol-text-strong, inherit));
        background: var(--lol-slot-bg, transparent);
        border: 1px solid var(--lol-line, currentColor);
        border-radius: var(--lol-badge-radius, 3px);
      }
      .name {
        --lol-en-size: 1.1em;
        font-weight: 600;
      }
      .stats {
        margin: 4px 0 8px;
        font-size: 0.85em;
        color: var(--lol-muted, inherit);
      }
      .stats span + span::before {
        content: '・';
      }
    `,
  ];

  declare ability: Ability | Spell | undefined;
  declare slotLabel: string | undefined;
  declare source: SourceRef | undefined;
  declare mode: 'read' | 'practice';
  declare practice: PracticeState | undefined;

  constructor() {
    super();
    this.mode = 'read';
  }

  private stats() {
    const sp = this.ability as Partial<Spell>;
    const parts = [
      sp.cooldown && sp.cooldown !== '0' ? `冷卻 ${sp.cooldown} 秒` : '',
      sp.cost && sp.cost !== '0' ? `消耗 ${sp.cost}` : '',
      sp.range && sp.range !== '0' && sp.range !== '25000' ? `距離 ${sp.range}` : '',
    ].filter(Boolean);
    return parts.length ? html`<div class="stats">${parts.map((p) => html`<span>${p}</span>`)}</div>` : nothing;
  }

  render() {
    const a = this.ability;
    if (!a) return nothing;
    return html`<div class="spell">
      <img class="icon" src=${corpusUrl(a.icon)} alt="" loading="lazy" />
      <div class="body">
        <div class="head">
          ${this.slotLabel ? html`<span class="slot">${this.slotLabel}</span>` : nothing}
          <lol-trilingual class="name" .text=${a.name} context="name" .source=${this.source} compact></lol-trilingual>
        </div>
        ${this.stats()}
        <lol-trilingual .text=${a.description} .source=${this.source} .mode=${this.mode} .practice=${this.practice} collectable></lol-trilingual>
      </div>
    </div>`;
  }
}

define('lol-spell', LolSpell);

declare global {
  interface HTMLElementTagNameMap {
    'lol-spell': LolSpell;
  }
}
