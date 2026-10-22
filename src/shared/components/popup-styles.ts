// 查詞小視窗和挑句子視窗共用的外框樣式。
import { css } from 'lit';

export const popupStyles = css`
  :host {
    position: fixed;
    inset: 0 auto auto 0;
    z-index: 1000;
  }
  .card {
    position: fixed;
    box-sizing: border-box;
    max-width: calc(100vw - 16px);
    max-height: 60vh;
    overflow: auto;
    padding: 14px 16px;
    color: var(--lol-popup-text, var(--lol-text, #222));
    background: var(--lol-popup-bg, #fff);
    border: 1px solid var(--lol-popup-border, var(--lol-line, #ccc));
    border-radius: var(--lol-popup-radius, 8px);
    box-shadow: 0 8px 28px rgba(0, 0, 0, 0.35);
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
`;
