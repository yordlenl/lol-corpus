// 點符文跳出的說明小視窗（清單和格子兩種檢視共用）：
// 放在點的地方旁邊，右邊放不下就放左邊、上下不超出畫面；點別的地方或按 Esc 就關掉。
import { html, nothing, type ReactiveController, type ReactiveControllerHost } from 'lit';
import { corpusUrl } from '../../shared/index.ts';
import type { Rich, SourceRef, Tri } from '../../shared/types.ts';

export interface Tip {
  /** 用來判斷是不是同一個 */
  key: string;
  icon: string;
  name: Tri;
  text?: Tri<Rich>;
  source?: SourceRef;
}

/** 說明小視窗的寬度和離符文的距離 */
export const TIP_WIDTH = 380;
const TIP_GAP = 14;

/** 點在這些地方不關小視窗：小視窗本身、查詞視窗、挑句子視窗 */
const KEEP_OPEN = ['.rune-tip', 'lol-word-popup', 'lol-sentence-picker'];

export class RuneTipController implements ReactiveController {
  tip: (Tip & { anchor: DOMRect }) | undefined;
  private host: ReactiveControllerHost & HTMLElement;
  /** 小視窗用絕對位置放在這個容器裡 */
  private container: string;

  constructor(host: ReactiveControllerHost & HTMLElement, container: string) {
    this.host = host;
    this.container = container;
    host.addController(this);
  }

  hostConnected() {
    document.addEventListener('pointerdown', this.onOutside, true);
    document.addEventListener('keydown', this.onKey);
  }

  hostDisconnected() {
    document.removeEventListener('pointerdown', this.onOutside, true);
    document.removeEventListener('keydown', this.onKey);
  }

  hostUpdated() {
    this.place();
    // 三行說明是另外的元件，畫好之後高度才確定，再放一次才不會超出畫面
    const card = this.host.querySelector('.rune-tip');
    if (card) {
      const parts = [...card.querySelectorAll<HTMLElement & { updateComplete?: Promise<unknown> }>('lol-trilingual')];
      void Promise.all(parts.map((p) => p.updateComplete)).then(() => this.place());
    }
  }

  show(e: Event, tip: Tip) {
    this.tip = { ...tip, anchor: (e.currentTarget as HTMLElement).getBoundingClientRect() };
    this.host.requestUpdate();
  }

  close() {
    if (!this.tip) return;
    this.tip = undefined;
    this.host.requestUpdate();
  }

  private onOutside = (e: PointerEvent) => {
    if (!this.tip) return;
    const path = e.composedPath();
    const inside = path.some((n) => n instanceof Element && KEEP_OPEN.some((sel) => n.matches(sel)));
    // 點另一個符文時由符文自己的 click 換內容，不在這裡關
    const onRune = path.some((n) => n instanceof Element && n.matches('[data-tip]'));
    if (!inside && !onRune) this.close();
  };

  private onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') this.close();
  };

  private place() {
    const card = this.host.querySelector<HTMLElement>('.rune-tip');
    const box = this.host.querySelector<HTMLElement>(this.container)?.getBoundingClientRect();
    if (!card || !box || !this.tip) return;
    const a = this.tip.anchor;
    let left = a.right + TIP_GAP;
    if (left + TIP_WIDTH > window.innerWidth - 8) left = a.left - TIP_GAP - TIP_WIDTH;
    left = Math.max(8, left);
    let top = a.top - 8;
    top = Math.min(top, window.innerHeight - card.offsetHeight - 8);
    top = Math.max(8, top);
    card.style.left = `${left - box.left}px`;
    card.style.top = `${top - box.top}px`;
  }

  render() {
    const tip = this.tip;
    if (!tip) return nothing;
    return html`<div class="rune-tip" role="dialog" aria-label=${tip.name.zh_TW} style="width:${TIP_WIDTH}px">
      <div class="rune-tip-head">
        <img src=${corpusUrl(tip.icon)} alt="" width="40" height="40" />
        <lol-trilingual class="detail-name" .text=${tip.name} context="name" .source=${tip.source} compact></lol-trilingual>
      </div>
      ${tip.text ? html`<lol-trilingual .text=${tip.text} .source=${tip.source} collectable></lol-trilingual>` : nothing}
    </div>`;
  }
}
