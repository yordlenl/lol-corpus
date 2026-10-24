// 收藏 → 符文：直接進選符文的畫面，照遊戲的「清單」檢視。
// 左邊主系（系別＋兩行標語、關鍵符文、三排小符文），中間副系（兩個符文）和三排屬性碎片，右邊是這一系的官方插畫。
// 點圖示換那一排的選擇，點文字跳出完整的三行說明。左下角可以切到「格子」檢視（第六階段的畫面），兩邊選的一樣。
import { html, nothing } from 'lit';
import { corpusUrl, loadRunes } from '../../shared/index.ts';
import { richToPlain } from '../../shared/text.ts';
import type { CollectionLabels, Rich, Rune, RuneData, RuneTree, SourceRef, StatShard, Tri } from '../../shared/types.ts';
import { LightElement } from '../light.ts';
import './rune-grid.ts';
import {
  defaultPicks,
  orderedTrees,
  pickPrimaryRune,
  pickPrimaryTree,
  pickSecondaryRune,
  pickSecondaryTree,
  pickShard,
  type RunePicks,
  rowOf,
  TREE_COLORS,
} from './rune-picks.ts';
import { RuneTipController } from './rune-tip.ts';

/** 現在打開了哪一排的選項 */
export type RuneChooser =
  | { kind: 'primaryTree' }
  | { kind: 'secondaryTree' }
  | { kind: 'primary'; row: number }
  | { kind: 'secondary' }
  | { kind: 'shard'; row: number };

const sameChooser = (a: RuneChooser | undefined, b: RuneChooser) =>
  Boolean(a) && a!.kind === b.kind && ('row' in a! ? a.row : -1) === ('row' in b ? b.row : -1);

const color = (tree: RuneTree) => TREE_COLORS[tree.key] ?? '#c8aa6e';

/** 系別名稱加兩行標語，當成說明視窗的內文 */
function treeText(labels: CollectionLabels | undefined, tree: RuneTree): Tri<Rich> | undefined {
  const t = labels?.runeTrees[tree.key];
  if (!t) return undefined;
  return { en: `${t.slogan.en}\n${t.tagline.en}`, zh_TW: `${t.slogan.zh_TW}\n${t.tagline.zh_TW}`, zh_CN: `${t.slogan.zh_CN}\n${t.tagline.zh_CN}` };
}

export class PageRunes extends LightElement {
  static properties = {
    labels: { attribute: false },
    data: { state: true },
    picks: { state: true },
    view: { state: true },
    chooser: { state: true },
    error: { state: true },
  };

  declare labels: CollectionLabels | undefined;
  declare data: RuneData | undefined;
  declare picks: RunePicks | undefined;
  declare view: 'list' | 'grid';
  declare chooser: RuneChooser | undefined;
  declare error: boolean;

  private tips = new RuneTipController(this, '.rune-editor');

  constructor() {
    super();
    this.view = 'list';
    this.error = false;
  }

  connectedCallback() {
    super.connectedCallback();
    loadRunes().then(
      (data) => {
        this.data = data;
        this.picks ??= defaultPicks(data);
      },
      () => (this.error = true),
    );
  }

  private toggle(chooser: RuneChooser) {
    this.chooser = sameChooser(this.chooser, chooser) ? undefined : chooser;
    this.tips.close();
  }

  private choose(next: RunePicks) {
    this.picks = next;
    this.chooser = undefined;
  }

  private runeTip(e: Event, rune: Rune) {
    const source: SourceRef = { type: 'rune', id: String(rune.id), label: rune.name };
    this.tips.show(e, { key: `rune-${rune.id}`, icon: rune.icon, name: rune.name, text: rune.long, source });
  }

  private shardTip(e: Event, shard: StatShard, row: number) {
    const source: SourceRef = { type: 'shard', id: String(shard.id), label: shard.name };
    this.tips.show(e, { key: `shard-${row}-${shard.id}`, icon: shard.icon, name: shard.name, text: shard.description, source });
  }

  // ---------- 畫面 ----------

  private treeHeader(tree: RuneTree, chooser: RuneChooser) {
    const t = this.labels?.runeTrees[tree.key];
    return html`<div class="rune-tree-head">
      <button
        type="button"
        class="rune-tree-ring ${sameChooser(this.chooser, chooser) ? 'open' : ''}"
        aria-label=${`換系別（目前：${tree.name.zh_TW}）`}
        @click=${() => this.toggle(chooser)}
      >
        <span class="rune-tree-art" aria-hidden="true">
          <img src=${corpusUrl(`img/client/ui/rune-${tree.key.toLowerCase()}-vfx.png`)} alt="" />
          <img src=${corpusUrl(`img/client/ui/rune-${tree.key.toLowerCase()}-icon.png`)} alt="" />
        </span>
      </button>
      <button
        type="button"
        class="rune-tree-text"
        data-tip
        @click=${(e: Event) => this.tips.show(e, { key: `tree-${tree.key}`, icon: tree.icon, name: tree.name, text: treeText(this.labels, tree) })}
      >
        <span class="rune-tree-name">${tree.name.zh_TW}</span>
        ${t ? html`<span class="rune-tree-line">${t.slogan.zh_TW}</span><span class="rune-tree-line">${t.tagline.zh_TW}</span>` : nothing}
      </button>
    </div>`;
  }

  private treeChoices(trees: RuneTree[], current: string, onPick: (key: string) => void) {
    return html`<div class="rune-choices-row trees">
      ${trees.map(
        (t) => html`<button
          type="button"
          class="rune-choice tree ${t.key === current ? 'on' : ''}"
          style="--tree:${color(t)}"
          aria-pressed=${t.key === current}
          aria-label=${t.name.zh_TW}
          @click=${() => onPick(t.key)}
        >
          <img src=${corpusUrl(t.icon)} alt="" width="40" height="40" />
        </button>`,
      )}
    </div>`;
  }

  private runeLine(rune: Rune, chooser: RuneChooser, keystone = false) {
    return html`<div class="rune-line ${keystone ? 'keystone' : ''}">
      <button
        type="button"
        class="rune-line-icon ${sameChooser(this.chooser, chooser) ? 'open' : ''}"
        aria-label=${`換一個（目前：${rune.name.zh_TW}）`}
        @click=${() => this.toggle(chooser)}
      >
        <img src=${corpusUrl(rune.icon)} alt="" width=${keystone ? 96 : 52} height=${keystone ? 96 : 52} />
      </button>
      <button type="button" class="rune-line-text" data-tip @click=${(e: Event) => this.runeTip(e, rune)}>
        <span class="rune-line-name">${rune.name.zh_TW}</span>
        <span class="rune-line-short">${richToPlain(rune.short.zh_TW)}</span>
      </button>
    </div>`;
  }

  private runeChoices(runes: Rune[], selected: (r: Rune) => boolean, onPick: (r: Rune) => RunePicks) {
    return html`<div class="rune-choices-row">
      ${runes.map(
        (r) => html`<button
          type="button"
          class="rune-choice ${selected(r) ? 'on' : ''}"
          aria-pressed=${selected(r)}
          aria-label=${r.name.zh_TW}
          data-tip
          @click=${(e: Event) => {
            this.choose(onPick(r));
            this.runeTip(e, r);
          }}
        >
          <img src=${corpusUrl(r.icon)} alt="" width="48" height="48" />
        </button>`,
      )}
    </div>`;
  }

  private primary(data: RuneData, picks: RunePicks) {
    const tree = data.trees.find((t) => t.key === picks.primary)!;
    return html`<section class="rune-col primary" style="--tree:${color(tree)}" aria-label="主系">
      ${this.treeHeader(tree, { kind: 'primaryTree' })}
      ${this.chooser?.kind === 'primaryTree' ? this.treeChoices(orderedTrees(data), picks.primary, (key) => this.choose(pickPrimaryTree(data, picks, key))) : nothing}
      <div class="rune-col-body">
        <div class="keystone-heading">${this.labels?.keystones.zh_TW ?? '關鍵符文'}</div>
        ${tree.slots.map((row, i) => {
          const rune = row.find((r) => r.id === picks.primaryRunes[i]) ?? row[0];
          const chooser: RuneChooser = { kind: 'primary', row: i };
          return html`${this.runeLine(rune, chooser, i === 0)}
            ${sameChooser(this.chooser, chooser)
              ? this.runeChoices(row, (r) => r.id === picks.primaryRunes[i], (r) => pickPrimaryRune(data, picks, r.id))
              : nothing}`;
        })}
      </div>
    </section>`;
  }

  private secondary(data: RuneData, picks: RunePicks) {
    const tree = data.trees.find((t) => t.key === picks.secondary)!;
    const others = orderedTrees(data).filter((t) => t.key !== picks.primary);
    const chosen = picks.secondaryRunes
      .map((id) => tree.slots.flat().find((r) => r.id === id))
      .filter((r): r is Rune => Boolean(r))
      .sort((a, b) => rowOf(tree, a.id) - rowOf(tree, b.id));
    const open = this.chooser?.kind === 'secondary';
    return html`<section class="rune-col secondary" style="--tree:${color(tree)}" aria-label="副系">
      ${this.treeHeader(tree, { kind: 'secondaryTree' })}
      ${this.chooser?.kind === 'secondaryTree' ? this.treeChoices(others, picks.secondary, (key) => this.choose(pickSecondaryTree(data, picks, key))) : nothing}
      <div class="rune-col-body">
        ${chosen.map((r) => this.runeLine(r, { kind: 'secondary' }))}
        ${open
          ? tree.slots
              .slice(1)
              .map((row) => this.runeChoices(row, (r) => picks.secondaryRunes.includes(r.id), (r) => pickSecondaryRune(data, picks, r.id)))
          : nothing}
        <div class="shard-lines" style="--tree:#c8aa6e">
          ${data.shards.map((row, i) => {
            const shard = row.shards.find((s) => s.id === picks.shards[i]) ?? row.shards[0];
            const chooser: RuneChooser = { kind: 'shard', row: i };
            return html`<div class="rune-line shard">
                <button
                  type="button"
                  class="rune-line-icon ${sameChooser(this.chooser, chooser) ? 'open' : ''}"
                  aria-label=${`換一個（${row.label.zh_TW}，目前：${shard.name.zh_TW}）`}
                  @click=${() => this.toggle(chooser)}
                >
                  <img src=${corpusUrl(shard.icon)} alt="" width="28" height="28" />
                </button>
                <button type="button" class="rune-line-text" data-tip @click=${(e: Event) => this.shardTip(e, shard, i)}>
                  <span class="rune-line-short">${richToPlain(shard.description.zh_TW)}</span>
                </button>
              </div>
              ${sameChooser(this.chooser, chooser)
                ? html`<div class="rune-choices-row shards">
                    ${row.shards.map(
                      (s) => html`<button
                        type="button"
                        class="rune-choice shard ${s.id === picks.shards[i] ? 'on' : ''}"
                        aria-pressed=${s.id === picks.shards[i]}
                        aria-label=${s.name.zh_TW}
                        data-tip
                        @click=${(e: Event) => {
                          this.choose(pickShard(picks, i, s.id));
                          this.shardTip(e, s, i);
                        }}
                      >
                        <img src=${corpusUrl(s.icon)} alt="" width="28" height="28" />
                      </button>`,
                    )}
                  </div>`
                : nothing}`;
          })}
        </div>
      </div>
    </section>`;
  }

  /** 右邊的官方插畫：環境、石碑、關鍵符文、副系的裝飾，疊在一起（載入失敗的那層就不顯示） */
  private art(data: RuneData, picks: RunePicks) {
    if (!this.labels) return nothing;
    const tree = data.trees.find((t) => t.key === picks.primary)!;
    const secondary = data.trees.find((t) => t.key === picks.secondary)!;
    const base = `${this.labels.runeArt}/${tree.id}`;
    const hide = (e: Event) => ((e.target as HTMLElement).hidden = true);
    return html`<div class="rune-art" aria-hidden="true" style="--env:url(${base}/environment.jpg)">
      <div class="rune-art-stack">
        <img class="rune-art-layer" src=${`${base}/construct.png`} alt="" @error=${hide} />
        <img class="rune-art-layer" src=${`${base}/second/${secondary.id}.png`} alt="" @error=${hide} />
        <img class="rune-art-layer keystone" src=${`${base}/keystones/${picks.primaryRunes[0]}.png`} alt="" @error=${hide} />
      </div>
    </div>`;
  }

  private viewToggle() {
    return html`<div class="rune-view-toggle" role="group" aria-label="檢視方式">
      <button type="button" class="${this.view === 'list' ? 'on' : ''}" aria-pressed=${this.view === 'list'} aria-label="清單" @click=${() => (this.view = 'list')}>☰</button>
      <button type="button" class="${this.view === 'grid' ? 'on' : ''}" aria-pressed=${this.view === 'grid'} aria-label="格子" @click=${() => (this.view = 'grid')}>⠿</button>
    </div>`;
  }

  render() {
    if (this.error) return html`<p class="notice">符文資料讀取失敗，請重新整理頁面。</p>`;
    if (!this.data || !this.picks) return html`<p class="notice">載入中…</p>`;
    if (this.view === 'grid') {
      return html`<div class="rune-grid-view">
        <rune-grid .data=${this.data} .picks=${this.picks} @picks-change=${(e: CustomEvent<RunePicks>) => (this.picks = e.detail)}></rune-grid>
        ${this.viewToggle()}
      </div>`;
    }
    return html`<div class="rune-editor">
      ${this.art(this.data, this.picks)}
      <div class="rune-cols">${this.primary(this.data, this.picks)} ${this.secondary(this.data, this.picks)}</div>
      ${this.viewToggle()} ${this.tips.render()}
    </div>`;
  }
}

customElements.define('page-runes', PageRunes);
