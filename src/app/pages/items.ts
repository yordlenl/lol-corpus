// 裝備：照遊戲的裝備商店排版。上方職業篩選、左側屬性篩選、中間依四區列出裝備；
// 點一件，右側顯示「可合成」、合成樹和三行對照的描述。
import { html, nothing, type PropertyValues } from 'lit';
import { corpusUrl, loadItems } from '../../shared/index.ts';
import type { Item } from '../../shared/types.ts';
import { LightElement } from '../light.ts';
import { href } from '../router.ts';
import {
  type BuildNode,
  buildTree,
  intoSlots,
  itemPriceLabel,
  priceLabel,
  ROLE_FILTERS,
  type RoleFilter,
  shopIcon,
  shopSections,
  STAT_GROUPS,
} from './shop.ts';

/** 長按多久算長按（顯示篩選名稱，不切換） */
const LONG_PRESS_MS = 450;

interface Hint {
  label: string;
  x: number;
  y: number;
  side: 'right' | 'below';
}

export class PageItems extends LightElement {
  static properties = {
    selectedId: { attribute: false },
    items: { state: true },
    query: { state: true },
    role: { state: true },
    stats: { state: true },
    hint: { state: true },
    error: { state: true },
  };

  declare selectedId: string | undefined;
  declare items: Item[] | undefined;
  declare query: string;
  declare role: RoleFilter;
  declare stats: string[];
  declare hint: Hint | undefined;
  declare error: boolean;

  private pressTimer: number | undefined;
  private hideTimer: number | undefined;
  private longPressed = false;

  constructor() {
    super();
    this.query = '';
    this.role = 'all';
    this.stats = [];
    this.error = false;
  }

  connectedCallback() {
    super.connectedCallback();
    loadItems().then(
      (items) => (this.items = items),
      () => (this.error = true),
    );
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this.pressTimer);
    clearTimeout(this.hideTimer);
  }

  protected updated(changed: PropertyValues<this>) {
    // 換看另一件時，右側捲回最上面
    if (changed.has('selectedId')) this.querySelector('.shop-side')?.scrollTo(0, 0);
  }

  private toggleStat(key: string) {
    this.stats = this.stats.includes(key) ? this.stats.filter((k) => k !== key) : [...this.stats, key];
  }

  private clearFilters() {
    this.stats = [];
    this.role = 'all';
  }

  // ---------- 篩選名稱的小提示：滑鼠移上去，或手指長按 ----------

  private showHint(el: HTMLElement) {
    clearTimeout(this.hideTimer);
    const rect = el.getBoundingClientRect();
    const side = el.dataset.hintSide === 'right' ? 'right' : 'below';
    this.hint = {
      label: el.dataset.hint ?? '',
      side,
      x: side === 'right' ? rect.right + 8 : rect.left + rect.width / 2,
      y: side === 'right' ? rect.top + rect.height / 2 : rect.bottom + 6,
    };
  }

  private hideHint(delay = 0) {
    clearTimeout(this.hideTimer);
    this.hideTimer = window.setTimeout(() => (this.hint = undefined), delay);
  }

  private onPointerDown = (e: PointerEvent) => {
    const el = (e.target as Element).closest<HTMLElement>('[data-hint]');
    clearTimeout(this.pressTimer);
    this.longPressed = false;
    if (!el || e.pointerType === 'mouse') return;
    this.pressTimer = window.setTimeout(() => {
      this.longPressed = true;
      this.showHint(el);
    }, LONG_PRESS_MS);
  };

  private onPointerEnd = () => {
    clearTimeout(this.pressTimer);
    if (this.longPressed) this.hideHint(1500);
  };

  /** 長按放開時不要切換篩選 */
  private onClickCapture = (e: Event) => {
    if (!this.longPressed) return;
    this.longPressed = false;
    e.preventDefault();
    e.stopPropagation();
  };

  private onMouseOver = (e: MouseEvent) => {
    const el = (e.target as Element).closest<HTMLElement>('[data-hint]');
    if (el && matchMedia('(hover: hover)').matches) this.showHint(el);
  };

  private onMouseOut = (e: MouseEvent) => {
    if ((e.target as Element).closest('[data-hint]')) this.hideHint();
  };

  // ---------- 畫面 ----------

  private filters() {
    return html`
      <div class="role-bar" role="group" aria-label="職業篩選">
        ${ROLE_FILTERS.map(
          (f) => html`<button
            class="role-filter ${this.role === f.role ? 'on' : ''}"
            aria-pressed=${this.role === f.role}
            aria-label=${f.label}
            data-hint=${f.label}
            @click=${() => (this.role = f.role)}
          >
            <img src=${corpusUrl(shopIcon(`role-${f.icon}`, this.role === f.role))} alt="" width="32" height="32" />
          </button>`,
        )}
      </div>
    `;
  }

  private statColumn() {
    const any = this.stats.length > 0 || this.role !== 'all';
    return html`<div class="stat-bar" role="group" aria-label="屬性篩選">
      <button class="stat-clear ${any ? '' : 'idle'}" aria-label="清空篩選" data-hint="清空篩選" data-hint-side="right" @click=${this.clearFilters}>
        <img src=${corpusUrl(shopIcon('clear'))} alt="" width="30" height="30" />
      </button>
      ${STAT_GROUPS.map(
        (group) => html`<div class="stat-group">
          ${group.map((s) => {
            const on = this.stats.includes(s.key);
            const label = `${s.label}（${s.en}）`;
            return html`<button
              class="stat-filter ${on ? 'on' : ''}"
              aria-pressed=${on}
              aria-label=${label}
              data-hint=${label}
              data-hint-side="right"
              @click=${() => this.toggleStat(s.key)}
            >
              <img src=${corpusUrl(shopIcon(`stat-${s.key}`, on))} alt="" width="32" height="32" />
            </button>`;
          })}
        </div>`,
      )}
    </div>`;
  }

  private grid(items: Item[]) {
    const sections = shopSections(items, { role: this.role, stats: this.stats, query: this.query });
    if (!sections.length) return html`<p class="shop-empty">沒有符合的裝備。</p>`;
    return sections.map(
      (section) => html`<h3 class="shop-section">${section.label} <span lang="en">${section.en}</span></h3>
        <div class="shop-grid">
          ${section.items.map(
            (it) => html`<a
              class="shop-item ${it.id === this.selectedId ? 'current' : ''}"
              href=${href('items', it.id)}
              aria-label=${it.name.zh_TW}
              aria-current=${it.id === this.selectedId ? 'true' : 'false'}
            >
              <img src=${corpusUrl(it.icon)} alt="" width="44" height="44" loading="lazy" />
              <span class="shop-price">${priceLabel(it.gold.total)}</span>
            </a>`,
          )}
        </div>`,
    );
  }

  private treeNode(node: BuildNode, root: boolean): unknown {
    const it = node.item;
    return html`<li>
      <a class="tree-item ${root ? 'current' : ''}" href=${href('items', it.id)} aria-label=${it.name.zh_TW}>
        <img src=${corpusUrl(it.icon)} alt="" width=${root ? 48 : 40} height=${root ? 48 : 40} />
        <span class="shop-price">${itemPriceLabel(it)}</span>
      </a>
      ${node.children.length ? html`<ul>${node.children.map((c) => this.treeNode(c, false))}</ul>` : nothing}
    </li>`;
  }

  /** 升級前後的裝備（例如冬之臨 ↔ 芬布爾之冬）：圖示加名稱，點了換成看那一件 */
  private upgradeRow(label: string, en: string, ids: string[], byId: Map<string, Item>) {
    const list = ids.map((id) => byId.get(id)).filter((it): it is Item => Boolean(it));
    if (!list.length) return nothing;
    return html`<h3 class="side-title upgrade-title">${label} <span lang="en">${en}</span></h3>
      <div class="upgrade-row">
        ${list.map(
          (it) => html`<a class="upgrade-link" href=${href('items', it.id)}>
            <img src=${corpusUrl(it.icon)} alt="" width="40" height="40" loading="lazy" />
            <span>${it.name.zh_TW}<span class="upgrade-en" lang="en">${it.name.en}</span></span>
          </a>`,
        )}
      </div>`;
  }

  private side(selected: Item | undefined, byId: Map<string, Item>) {
    const into = (selected?.into ?? []).map((id) => byId.get(id)).filter((it): it is Item => Boolean(it));
    const slots = intoSlots(into.length);
    return html`
      <h3 class="side-title">可合成 <span lang="en">BUILDS INTO</span></h3>
      <div class="into-row">
        ${Array.from({ length: slots }, (_, i) => {
          const it = into[i];
          return it
            ? html`<a class="into-slot" href=${href('items', it.id)} aria-label=${it.name.zh_TW}>
                <img src=${corpusUrl(it.icon)} alt="" width="40" height="40" loading="lazy" />
              </a>`
            : html`<span class="into-slot empty"></span>`;
        })}
      </div>
      ${this.upgradeRow('升級後', 'UPGRADES TO', selected?.upgradesTo ?? [], byId)}
      ${this.upgradeRow('升級自', 'UPGRADED FROM', selected?.upgradedFrom ? [selected.upgradedFrom] : [], byId)}
      ${selected
        ? html`<div class="build-tree"><ul class="tree-root">${this.treeNode(buildTree(selected, byId), true)}</ul></div>
            <div class="side-detail"><lol-item-card .item=${selected}></lol-item-card></div>`
        : html`<p class="side-hint">點左邊的裝備，這裡會顯示合成樹和三行對照的說明。</p>`}
    `;
  }

  render() {
    if (this.error) return html`<p class="notice">裝備資料讀取失敗，請重新整理頁面。</p>`;
    if (!this.items) return html`<p class="notice">載入中…</p>`;
    const byId = new Map(this.items.map((it) => [it.id, it]));
    const selected = this.selectedId ? byId.get(this.selectedId) : undefined;
    return html`<div
        class="shop"
        @pointerdown=${this.onPointerDown}
        @pointerup=${this.onPointerEnd}
        @pointercancel=${this.onPointerEnd}
        @click=${{ handleEvent: this.onClickCapture, capture: true }}
        @mouseover=${this.onMouseOver}
        @mouseout=${this.onMouseOut}
        @contextmenu=${(e: Event) => (e.target as Element).closest('[data-hint]') && e.preventDefault()}
      >
        <section class="shop-main">
          <div class="shop-tabs"><h2 class="shop-tab">全部裝備 <span lang="en">ALL ITEMS</span></h2></div>
          <input
            class="shop-search"
            type="search"
            placeholder="點這裡搜尋（中文或英文）"
            aria-label="搜尋裝備"
            .value=${this.query}
            @input=${(e: InputEvent) => (this.query = (e.target as HTMLInputElement).value)}
          />
          ${this.filters()}
          <div class="shop-body">
            ${this.statColumn()}
            <div class="shop-list">${this.grid(this.items)}</div>
          </div>
        </section>
        <aside class="shop-side">${this.side(selected, byId)}</aside>
      </div>
      ${this.hint
        ? html`<div class="shop-hint ${this.hint.side}" role="tooltip" style="left:${this.hint.x}px;top:${this.hint.y}px">${this.hint.label}</div>`
        : nothing}`;
  }
}

customElements.define('page-items', PageItems);
