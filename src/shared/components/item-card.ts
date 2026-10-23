// <lol-item-card>：一件裝備的圖示、名稱、價格、簡介與完整描述。
import { css, html, LitElement, nothing } from 'lit';
import { corpusUrl } from '../data.ts';
import type { Item, PracticeState, SourceRef } from '../types.ts';
import { define } from './define.ts';
import { themeStyles } from './styles.ts';
import './trilingual.ts';

export class LolItemCard extends LitElement {
  static properties = {
    item: { attribute: false },
    mode: {},
    practice: { attribute: false },
  };

  static styles = [
    themeStyles,
    css`
      :host {
        display: block;
      }
      .head {
        display: flex;
        gap: 14px;
        align-items: center;
        margin-bottom: 12px;
      }
      img.icon {
        width: 64px;
        height: 64px;
      }
      .name {
        --lol-en-size: 1.2em;
        font-weight: 600;
      }
      .gold {
        margin-top: 2px;
        color: var(--lol-gold, #c79b1d);
        font-weight: 600;
      }
      .plain {
        margin-bottom: 12px;
        font-style: italic;
      }
    `,
  ];

  declare item: Item | undefined;
  declare mode: 'read' | 'practice';
  /** 練習模式：挖空在描述上 */
  declare practice: PracticeState | undefined;

  constructor() {
    super();
    this.mode = 'read';
  }

  render() {
    const item = this.item;
    if (!item) return nothing;
    const source: SourceRef = { type: 'item', id: item.id, label: item.name };
    const hasPlain = Boolean(item.plaintext.en);
    return html`
      <div class="head">
        <img class="icon" src=${corpusUrl(item.icon)} alt="" />
        <div>
          <lol-trilingual class="name" .text=${item.name} context="name" .source=${source} compact></lol-trilingual>
          <div class="gold">${item.upgradeOnly ? '升級取得（商店買不到）' : `${item.gold.total} 金幣`}</div>
        </div>
      </div>
      ${hasPlain
        ? html`<lol-trilingual class="plain" .text=${item.plaintext} .source=${source} collectable></lol-trilingual>`
        : nothing}
      <lol-trilingual .text=${item.description} .source=${source} .mode=${this.mode} .practice=${this.practice} collectable></lol-trilingual>
    `;
  }
}

define('lol-item-card', LolItemCard);

declare global {
  interface HTMLElementTagNameMap {
    'lol-item-card': LolItemCard;
  }
}
