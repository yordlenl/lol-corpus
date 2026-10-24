// 符文頁的「格子」檢視（第六階段做的畫面）：左半邊主系（基石＋三排小符文），右半邊副系和屬性碎片。
// 點符文會像遊戲一樣選起來，旁邊跳出小視窗顯示三行對照的說明；點別的地方就關掉。
// 選了什麼由外面的符文頁保管（清單和格子兩種檢視共用），這裡改了就發出 picks-change。
import { html } from 'lit';
import { corpusUrl } from '../../shared/index.ts';
import type { RuneData, RuneTree, SourceRef } from '../../shared/types.ts';
import { LightElement } from '../light.ts';
import { RuneTipController } from './rune-tip.ts';
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

export class RuneGrid extends LightElement {
  static properties = {
    data: { attribute: false },
    picks: { attribute: false },
    error: { state: true },
  };

  declare data: RuneData | undefined;
  declare picks: RunePicks | undefined;
  private tips = new RuneTipController(this, '.rune-page');
  declare error: boolean;

  constructor() {
    super();
    this.error = false;
  }

  protected willUpdate() {
    if (this.data && !this.picks) this.picks = defaultPicks(this.data);
  }

  private select(next: RunePicks) {
    this.picks = next;
    this.dispatchEvent(new CustomEvent<RunePicks>('picks-change', { detail: next, bubbles: true }));
  }

  // ---------- 畫面 ----------

  private treeHead(tree: RuneTree, choices: RuneTree[], current: string, onPick: (key: string) => void) {
    return html`<div class="rune-head">
      <button
        class="tree-big"
        aria-label=${tree.name.zh_TW}
        data-tip
        @click=${(e: Event) => this.tips.show(e, { key: `tree-${tree.key}`, icon: tree.icon, name: tree.name })}
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
        this.tips.show(e, { key: `rune-${r.id}`, icon: r.icon, name: r.name, text: r.long, source });
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
                    this.tips.show(e, { key: `shard-${i}-${s.id}`, icon: s.icon, name: s.name, text: s.description, source });
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

  render() {
    if (this.error) return html`<p class="notice">符文資料讀取失敗，請重新整理頁面。</p>`;
    if (!this.data || !this.picks) return html`<p class="notice">載入中…</p>`;
    return html`<div class="rune-page">
      ${this.primary(this.data, this.picks)} ${this.secondary(this.data, this.picks)}
      ${this.tips.render()}
    </div>`;
  }
}

customElements.define('rune-grid', RuneGrid);
