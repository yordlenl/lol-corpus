// 把有格式的文字畫出來；英文那一行把單字切出來，可以點。練習模式時把指定的字換成空格。
import { html, nothing, type TemplateResult } from 'lit';
import { isClickable } from '../dict.ts';
import { segment } from '../text.ts';
import type { PracticeBlank, Rich, TextContext, TextStyle } from '../types.ts';

const runsOf = (rich: Rich): Array<[string, TextStyle | null]> =>
  typeof rich === 'string' ? [[rich, null]] : rich.map((r) => (typeof r === 'string' ? [r, null] : [r[0], r[1]]));

export interface EnglishOptions {
  /** 單字可以點（查詞） */
  clickable?: { context: TextContext } | null;
  /** 練習模式的空格（依英文裡第幾個字） */
  blanks?: Map<number, PracticeBlank>;
  revealed?: boolean;
}

function blank(b: PracticeBlank, revealed: boolean): TemplateResult {
  const width = `${Math.max(3, b.answer.length) + 1}ch`;
  if (!revealed) {
    return html`<button type="button" class="blank ${b.value ? 'filled' : ''}" data-index=${b.index} style="min-width:${width}">${b.value || ' '}</button>`;
  }
  if (b.result === 'right') return html`<span class="blank right">${b.value}</span>`;
  return html`<span class="blank wrong">${b.value ? html`<s>${b.value}</s> ` : nothing}<span class="answer">${b.answer}</span></span>`;
}

export function renderRich(rich: Rich, options: EnglishOptions | null = null): TemplateResult {
  let wordIndex = 0;
  const words = (text: string): Array<TemplateResult | string> =>
    segment(text).map((seg) => {
      if (seg.type !== 'word') return seg.value;
      const index = wordIndex++;
      const b = options?.blanks?.get(index);
      if (b) return blank(b, Boolean(options?.revealed));
      return options?.clickable && isClickable(seg.key, options.clickable.context)
        ? html`<span class="w" data-key=${seg.key}>${seg.value}</span>`
        : seg.value;
    });
  return html`${runsOf(rich).map(([text, style]) => {
    const content = options ? words(text) : text;
    return style ? html`<span class="s-${style}">${content}</span>` : html`${content}`;
  })}`;
}
