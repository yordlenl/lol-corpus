// 把有格式的文字畫出來；英文那一行把單字切出來，可以點。
import { html, type TemplateResult } from 'lit';
import { isClickable } from '../dict.ts';
import { segment } from '../text.ts';
import type { Rich, TextContext, TextStyle } from '../types.ts';

const runsOf = (rich: Rich): Array<[string, TextStyle | null]> =>
  typeof rich === 'string' ? [[rich, null]] : rich.map((r) => (typeof r === 'string' ? [r, null] : [r[0], r[1]]));

function words(text: string, context: TextContext): Array<TemplateResult | string> {
  return segment(text).map((seg) =>
    seg.type === 'word' && isClickable(seg.key, context)
      ? html`<span class="w" data-key=${seg.key}>${seg.value}</span>`
      : seg.value,
  );
}

export function renderRich(rich: Rich, clickable: { context: TextContext } | null = null): TemplateResult {
  return html`${runsOf(rich).map(([text, style]) => {
    const content = clickable ? words(text, clickable.context) : text;
    return style ? html`<span class="s-${style}">${content}</span>` : html`${content}`;
  })}`;
}
