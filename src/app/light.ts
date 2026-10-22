// 語料庫自己的頁面元件不用 Shadow DOM，直接吃 style.css 的樣式。
import { LitElement } from 'lit';

export class LightElement extends LitElement {
  protected createRenderRoot() {
    return this;
  }
}
