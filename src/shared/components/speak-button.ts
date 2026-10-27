// <lol-speak-button word="minion">：念單字的小喇叭（遊戲客戶端設定頁的喇叭圖）。
// 不是一般英文單字、或瀏覽器不能朗讀時什麼都不顯示。詞典有沒有這個字由放按鈕的地方判斷。
import { css, html, LitElement, nothing } from 'lit';
import { corpusUrl } from '../data.ts';
import { canSpeak, speakWord, speechAvailable } from '../speech.ts';
import { define } from './define.ts';

export class LolSpeakButton extends LitElement {
  static properties = { word: {} };

  static styles = css`
    :host {
      display: inline-block;
      vertical-align: middle;
      line-height: 0;
    }
    button {
      width: 28px;
      height: 28px;
      padding: 0;
      border: 0;
      border-radius: 50%;
      background: var(--speaker) center / contain no-repeat;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }
    button:hover {
      filter: brightness(1.25);
    }
    button:active {
      transform: scale(0.92);
    }
  `;

  declare word: string;

  constructor() {
    super();
    this.word = '';
  }

  private speak(event: Event) {
    // 別讓外面的元件把這一下當成點字或點卡片
    event.stopPropagation();
    speakWord(this.word);
  }

  render() {
    if (!speechAvailable() || !canSpeak(this.word)) return nothing;
    return html`<button
      type="button"
      style="--speaker:url(${corpusUrl('img/client/ui/speaker.png')})"
      aria-label="念出 ${this.word}"
      title="朗讀"
      @click=${this.speak}
    ></button>`;
  }
}

define('lol-speak-button', LolSpeakButton);

declare global {
  interface HTMLElementTagNameMap {
    'lol-speak-button': LolSpeakButton;
  }
}
