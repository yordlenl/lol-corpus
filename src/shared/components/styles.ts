// 元件共用的樣式。顏色都用 CSS 變數，語料庫（深色）和學習 App（淺色）各自設定。
import { css } from 'lit';

export const themeStyles = css`
  :host {
    color: var(--lol-text, inherit);
  }
  .s-b {
    font-weight: 600;
    color: var(--lol-text-strong, inherit);
  }
  .s-num {
    font-weight: 600;
    color: var(--lol-num, inherit);
  }
  .s-magic {
    color: var(--lol-magic, #4f8fdd);
  }
  .s-physical {
    color: var(--lol-physical, #d68531);
  }
  .s-true {
    color: var(--lol-true, inherit);
    font-weight: 600;
  }
  .s-heal {
    color: var(--lol-heal, #2e9d57);
  }
  .s-shield {
    color: var(--lol-shield, #7d8796);
  }
  .s-mana {
    color: var(--lol-mana, #3d79d6);
  }
  .s-status {
    color: var(--lol-status, #a272d6);
  }
  .s-speed {
    color: var(--lol-speed, #b39b3a);
  }
  .s-gold {
    color: var(--lol-gold, #c79b1d);
  }
  .s-flavor {
    font-style: italic;
    color: var(--lol-muted, inherit);
  }
  /* 官方文字沒寫的數字：藏起 □，改顯示一個小標註 */
  .s-gap {
    font-size: 0;
  }
  .s-gap::before {
    content: '依英雄屬性計算';
    display: inline-block;
    margin: 0 3px;
    padding: 0 5px;
    font-size: 0.75rem;
    font-style: normal;
    font-weight: 500;
    line-height: 1.5;
    vertical-align: 1px;
    color: var(--lol-muted, inherit);
    border: 1px dashed var(--lol-line, currentColor);
    border-radius: var(--lol-badge-radius, 3px);
    white-space: nowrap;
  }
  .badge {
    display: inline-block;
    margin-left: 6px;
    padding: 0 6px;
    font-size: 12px;
    font-weight: 500;
    line-height: 18px;
    vertical-align: 1px;
    color: var(--lol-badge-text, var(--lol-muted, inherit));
    border: 1px solid var(--lol-line, currentColor);
    border-radius: var(--lol-badge-radius, 3px);
    white-space: nowrap;
  }
  .collect {
    min-height: 36px;
    padding: 0 14px;
    font: inherit;
    font-size: 0.9em;
    font-weight: 600;
    color: var(--lol-button-text, inherit);
    background: var(--lol-button-bg, transparent);
    border: 1px solid var(--lol-accent, currentColor);
    border-radius: var(--lol-button-radius, 0);
    cursor: pointer;
    white-space: nowrap;
  }
  .collect:disabled {
    opacity: 0.6;
    cursor: default;
  }
  img.icon {
    display: block;
    flex: none;
    border: 1px solid var(--lol-icon-border, var(--lol-line, transparent));
    border-radius: var(--lol-icon-radius, 0);
  }
`;
