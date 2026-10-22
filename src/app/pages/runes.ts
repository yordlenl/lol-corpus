// 符文：選一個系，看基石、三排小符文；點符文看描述。屬性碎片在下方。完整符文頁排版在第六階段做。
import { html, nothing } from 'lit';
import { corpusUrl, loadRunes } from '../../shared/index.ts';
import type { Rune, RuneData, SourceRef, StatShard } from '../../shared/types.ts';
import { LightElement } from '../light.ts';
import { href } from '../router.ts';

export class PageRunes extends LightElement {
  static properties = {
    treeKey: { attribute: false },
    runeId: { attribute: false },
    data: { state: true },
    shardId: { state: true },
    error: { state: true },
  };

  declare treeKey: string | undefined;
  declare runeId: number | undefined;
  declare data: RuneData | undefined;
  declare shardId: number | undefined;
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
  }

  protected willUpdate(changed: Map<string, unknown>) {
    if (changed.has('runeId') && this.runeId != null) this.shardId = undefined;
  }

  private detail(rune: Rune | undefined, shard: StatShard | undefined) {
    if (shard) {
      const source: SourceRef = { type: 'shard', id: String(shard.id), label: shard.name };
      return html`<div class="rune-detail-head">
          <img class="rune-icon" src=${corpusUrl(shard.icon)} alt="" width="40" height="40" />
          <lol-trilingual class="detail-name" .text=${shard.name} context="name" .source=${source} compact></lol-trilingual>
        </div>
        <lol-trilingual .text=${shard.description} .source=${source}></lol-trilingual>`;
    }
    if (!rune) return html`<p class="notice">點一個符文，這裡會顯示三行對照的說明。</p>`;
    const source: SourceRef = { type: 'rune', id: String(rune.id), label: rune.name };
    return html`<div class="rune-detail-head">
        <img class="rune-icon" src=${corpusUrl(rune.icon)} alt="" width="56" height="56" />
        <lol-trilingual class="detail-name" .text=${rune.name} context="name" .source=${source} compact></lol-trilingual>
      </div>
      <lol-trilingual .text=${rune.long} .source=${source}></lol-trilingual>`;
  }

  render() {
    if (this.error) return html`<p class="notice">符文資料讀取失敗，請重新整理頁面。</p>`;
    if (!this.data) return html`<p class="notice">載入中…</p>`;
    const { trees, shards } = this.data;
    const tree = trees.find((t) => t.key === this.treeKey) ?? trees[0];
    const rune = tree.slots.flat().find((r) => r.id === this.runeId);
    const shard = shards.flatMap((row) => row.shards).find((s) => s.id === this.shardId);
    return html`
      <div class="tree-tabs">
        ${trees.map(
          (t) => html`<a class="tree-tab ${t === tree ? 'current' : ''}" href=${href('runes', t.key)}>
            <img src=${corpusUrl(t.icon)} alt="" width="32" height="32" />
            <span>${t.name.zh_TW}</span>
          </a>`,
        )}
      </div>
      <div class="split">
        <div class="split-main panel">
          <lol-trilingual class="tree-name" .text=${tree.name} context="name" compact></lol-trilingual>
          ${tree.slots.map(
            (slot, i) => html`<div class="rune-row ${i === 0 ? 'keystones' : ''}">
              ${i === 0 ? html`<span class="row-label">基石</span>` : nothing}
              ${slot.map(
                (r) => html`<a
                  class="rune ${r.id === rune?.id && !shard ? 'current' : ''}"
                  href=${href('runes', tree.key, r.id)}
                  title=${r.name.zh_TW}
                >
                  <img src=${corpusUrl(r.icon)} alt=${r.name.zh_TW} width=${i === 0 ? 64 : 44} height=${i === 0 ? 64 : 44} />
                  <span>${r.name.zh_TW}</span>
                </a>`,
              )}
            </div>`,
          )}
          <h2 class="section-title">屬性碎片</h2>
          ${shards.map(
            (row) => html`<div class="rune-row shards">
              <span class="row-label">${row.label.zh_TW}</span>
              ${row.shards.map(
                (s) => html`<button
                  type="button"
                  class="rune shard ${s.id === this.shardId ? 'current' : ''}"
                  title=${s.name.zh_TW}
                  @click=${() => (this.shardId = s.id)}
                >
                  <img src=${corpusUrl(s.icon)} alt=${s.name.zh_TW} width="32" height="32" />
                  <span>${s.name.zh_TW}</span>
                </button>`,
              )}
            </div>`,
          )}
        </div>
        <aside class="split-side panel">${this.detail(rune, shard)}</aside>
      </div>
    `;
  }
}

customElements.define('page-runes', PageRunes);
