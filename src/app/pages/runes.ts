// 符文：照遊戲的符文頁排版。左半邊主系（基石＋三排小符文），右半邊副系（三排小符文）和屬性碎片。
// 點符文會像遊戲一樣選起來，旁邊跳出小視窗顯示三行對照的說明；點別的地方就關掉。
import { html, nothing, type PropertyValues } from 'lit';
import { corpusUrl, loadRunes } from '../../shared/index.ts';
import type { Rich, RuneData, RuneTree, SourceRef, Tri } from '../../shared/types.ts';
import { LightElement } from '../light.ts';
import {
  defaultPicks,
  orderedTrees,
  pickPrimaryRune,
  pickPrimaryTree,
  pickSecondaryRune,
  pickSecondaryTree,
  pickShard,
  type RunePicks,
  TREE_COLORS,
} from './rune-picks.ts';

interface Tip {
  /** 用來判斷是不是同一個（再點一次就關掉） */
  key: string;
  icon: string;
  name: Tri;
  text?: Tri<Rich>;
  source?: SourceRef;
  anchor: DOMRect;
}

/** 說明小視窗的寬度和離符文的距離 */
const TIP_WIDTH = 380;
const TIP_GAP = 14;

/** 點在這些地方不關小視窗：小視窗本身、查詞視窗、挑句子視窗 */
const KEEP_OPEN = ['.rune-tip', 'lol-word-popup', 'lol-sentence-picker'];

export class PageRunes extends LightElement {
  static properties = {
    treeKey: { attribute: false },
    runeId: { attribute: false },
    data: { state: true },
    picks: { state: true },
    tip: { state: true },
    error: { state: true },
  };

  declare treeKey: string | undefined;
  declare runeId: number | undefined;
  declare data: RuneData | undefined;
  declare picks: RunePicks | undefined;
  declare tip: Tip | undefined;
  declare error: boolean;

  constructor() {
    super();
    this.error = false;
  }

  connectedCallback() {
    super.connectedCallback();
    loadRunes().then(
      (data) => (this.data = data),
      () => (this.error = true),
    );
    document.addEventListener('pointerdown', this.onOutside, true);
    document.addEventListener('keydown', this.onKey);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('pointerdown', this.onOutside, true);
    document.removeEventListener('keydown', this.onKey);
  }

  protected willUpdate(changed: PropertyValues<this>) {
    // 網址 #/runes/系別/符文：用那一系當主系，選起那個符文
    if (this.data && (changed.has('data') || changed.has('treeKey') || changed.has('runeId'))) {
      let picks = defaultPicks(this.data, this.treeKey);
      if (this.runeId != null) picks = pickPrimaryRune(this.data, picks, this.runeId);
      this.picks = picks;
      this.tip = undefined;
    }
  }

  protected updated() {
    this.placeTip();
    // 三行說明是另外的元件，畫好之後高度才確定，再放一次才不會超出畫面
    const card = this.querySelector('.rune-tip');
    if (card) {
      const parts = [...card.querySelectorAll<HTMLElement & { updateComplete?: Promise<unknown> }>('lol-trilingual')];
      void Promise.all(parts.map((p) => p.updateComplete)).then(() => this.placeTip());
    }
  }

  private onOutside = (e: PointerEvent) => {
    if (!this.tip) return;
    const path = e.composedPath();
    const inside = path.some((n) => n instanceof Element && KEEP_OPEN.some((sel) => n.matches(sel)));
    // 點另一個符文時由符文自己的 click 換內容，不在這裡關
    const onRune = path.some((n) => n instanceof Element && n.matches('[data-tip]'));
    if (!inside && !onRune) this.tip = undefined;
  };

  private onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') this.tip = undefined;
  };

  private showTip(e: Event, tip: Omit<Tip, 'anchor'>) {
    const anchor = (e.currentTarget as HTMLElement).getBoundingClientRect();
    this.tip = { ...tip, anchor };
  }

  /** 小視窗放在符文右邊，右邊放不下就放左邊；上下不超出畫面 */
  private placeTip() {
    const card = this.querySelector<HTMLElement>('.rune-tip');
    const page = this.querySelector<HTMLElement>('.rune-page');
    if (!card || !page || !this.tip) return;
    const box = page.getBoundingClientRect();
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

  private select(next: RunePicks) {
    this.picks = next;
  }

  // ---------- 畫面 ----------

  private treeHead(tree: RuneTree, choices: RuneTree[], current: string, onPick: (key: string) => void) {
    return html`<div class="rune-head">
      <button
        class="tree-big"
        aria-label=${tree.name.zh_TW}
        data-tip
        @click=${(e: Event) => this.showTip(e, { key: `tree-${tree.key}`, icon: tree.icon, name: tree.name })}
      >
        <img src=${corpusUrl(tree.icon)} alt="" width="80" height="80" />
      </button>
      <div class="tree-pickers" role="group" aria-label="選系別">
        ${choices.map(
          (t) => html`<button
            class="tree-pick ${t.key === current ? 'on' : ''}"
            style="--tree:${TREE_COLORS[t.key] ?? '#c8aa6e'}"
            aria-pressed=${t.key === current}
            aria-label=${t.name.zh_TW}
            @click=${() => onPick(t.key)}
          >
            <img src=${corpusUrl(t.icon)} alt="" width="42" height="42" />
          </button>`,
        )}
      </div>
    </div>`;
  }

  private runeButton(r: RuneTree['slots'][number][number], on: boolean, size: number, onPick: () => void) {
    const source: SourceRef = { type: 'rune', id: String(r.id), label: r.name };
    return html`<button
      class="rune-pick ${on ? 'on' : ''}"
      aria-pressed=${on}
      aria-label=${r.name.zh_TW}
      data-tip
      @click=${(e: Event) => {
        onPick();
        this.showTip(e, { key: `rune-${r.id}`, icon: r.icon, name: r.name, text: r.long, source });
      }}
    >
      <img src=${corpusUrl(r.icon)} alt="" width=${size} height=${size} />
    </button>`;
  }

  private primary(data: RuneData, picks: RunePicks) {
    const tree = data.trees.find((t) => t.key === picks.primary)!;
    return html`<section class="rune-side primary" style="--tree:${TREE_COLORS[tree.key] ?? '#c8aa6e'}" aria-label="主系">
      ${this.treeHead(tree, orderedTrees(data), picks.primary, (key) => this.select(pickPrimaryTree(data, picks, key)))}
      <div class="rune-track">
        <div class="track-row label-row"><span class="keystone-label">基石</span></div>
        ${tree.slots.map(
          (row, i) => html`<div class="track-row ${i === 0 ? 'keystones' : 'minor'}">
            <span class="track-dot"></span>
            <div class="rune-choices">
              ${row.map((r) =>
                this.runeButton(r, picks.primaryRunes[i] === r.id, i === 0 ? 66 : 56, () =>
                  this.select(pickPrimaryRune(data, picks, r.id)),
                ),
              )}
            </div>
          </div>`,
        )}
      </div>
    </section>`;
  }

  private secondary(data: RuneData, picks: RunePicks) {
    const tree = data.trees.find((t) => t.key === picks.secondary)!;
    const others = orderedTrees(data).filter((t) => t.key !== picks.primary);
    return html`<section class="rune-side secondary" style="--tree:${TREE_COLORS[tree.key] ?? '#c8aa6e'}" aria-label="副系">
      ${this.treeHead(tree, others, picks.secondary, (key) => this.select(pickSecondaryTree(data, picks, key)))}
      <div class="rune-track">
        ${tree.slots.slice(1).map(
          (row) => html`<div class="track-row minor">
            <span class="track-dot"></span>
            <div class="rune-choices">
              ${row.map((r) =>
                this.runeButton(r, picks.secondaryRunes.includes(r.id), 52, () => this.select(pickSecondaryRune(data, picks, r.id))),
              )}
            </div>
          </div>`,
        )}
      </div>
      <div class="rune-track shards" style="--tree:#c8aa6e" aria-label="屬性碎片">
        ${data.shards.map(
          (row, i) => html`<div class="track-row shard-row">
            <span class="track-dot"></span>
            <div class="rune-choices">
              ${row.shards.map((s) => {
                const on = picks.shards[i] === s.id;
                const source: SourceRef = { type: 'shard', id: String(s.id), label: s.name };
                return html`<button
                  class="rune-pick shard ${on ? 'on' : ''}"
                  aria-pressed=${on}
                  aria-label=${`${row.label.zh_TW}：${s.name.zh_TW}`}
                  data-tip
                  @click=${(e: Event) => {
                    this.select(pickShard(picks, i, s.id));
                    this.showTip(e, { key: `shard-${i}-${s.id}`, icon: s.icon, name: s.name, text: s.description, source });
                  }}
                >
                  <img src=${corpusUrl(s.icon)} alt="" width="30" height="30" />
                </button>`;
              })}
            </div>
          </div>`,
        )}
      </div>
    </section>`;
  }

  private tipCard(tip: Tip) {
    return html`<div class="rune-tip" role="dialog" aria-label=${tip.name.zh_TW} style="width:${TIP_WIDTH}px">
      <div class="rune-tip-head">
        <img src=${corpusUrl(tip.icon)} alt="" width="40" height="40" />
        <lol-trilingual class="detail-name" .text=${tip.name} context="name" .source=${tip.source} compact></lol-trilingual>
      </div>
      ${tip.text ? html`<lol-trilingual .text=${tip.text} .source=${tip.source} collectable></lol-trilingual>` : nothing}
    </div>`;
  }

  render() {
    if (this.error) return html`<p class="notice">符文資料讀取失敗，請重新整理頁面。</p>`;
    if (!this.data || !this.picks) return html`<p class="notice">載入中…</p>`;
    return html`<div class="rune-page">
      ${this.primary(this.data, this.picks)} ${this.secondary(this.data, this.picks)}
      ${this.tip ? this.tipCard(this.tip) : nothing}
    </div>`;
  }
}

customElements.define('page-runes', PageRunes);
