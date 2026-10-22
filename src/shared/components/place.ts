// 小視窗的位置：放在點擊處下方；下方放不下就放上方，左右不超出畫面。
const MARGIN = 8;

export function placeNear(card: HTMLElement, anchor: { left: number; top: number; bottom: number }) {
  const left = Math.min(Math.max(MARGIN, anchor.left), window.innerWidth - card.offsetWidth - MARGIN);
  const below = anchor.bottom + MARGIN;
  const top =
    below + card.offsetHeight <= window.innerHeight - MARGIN
      ? below
      : Math.max(MARGIN, anchor.top - MARGIN - card.offsetHeight);
  card.style.left = `${Math.max(MARGIN, left)}px`;
  card.style.top = `${top}px`;
}

export const anchorOf = (el: Element) => {
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
};
