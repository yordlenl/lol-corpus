// 很長的格子（頭像五千多個）一次只畫一部分，捲到底再多畫一批，iPad 才不會卡。
import { html, nothing, type ReactiveController, type ReactiveControllerHost } from 'lit';

export class GrowingList implements ReactiveController {
  limit: number;
  private observer: IntersectionObserver | undefined;
  private host: ReactiveControllerHost & HTMLElement;
  private step: number;

  constructor(host: ReactiveControllerHost & HTMLElement, step: number) {
    this.host = host;
    this.step = step;
    this.limit = step;
    host.addController(this);
  }

  /** 換了搜尋條件時，從頭開始 */
  reset() {
    this.limit = this.step;
  }

  more() {
    this.limit += this.step;
    this.host.requestUpdate();
  }

  hostUpdated() {
    // 每次畫完都重新觀察：加了一批之後如果按鈕還在畫面附近，會馬上再收到通知、繼續加
    this.observer?.disconnect();
    const sentinel = this.host.querySelector('.grow-sentinel');
    if (!sentinel || typeof IntersectionObserver === 'undefined') return;
    this.observer ??= new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) this.more();
    }, { rootMargin: '600px' });
    this.observer.observe(sentinel);
  }

  hostDisconnected() {
    this.observer?.disconnect();
  }

  /** 放在格子下面：還有沒畫的就顯示一個「再顯示」按鈕（捲到時也會自動多畫） */
  sentinel(total: number) {
    if (total <= this.limit) return nothing;
    return html`<button type="button" class="grow-sentinel" @click=${() => this.more()}>再顯示更多（還有 ${total - this.limit} 個）</button>`;
  }
}
