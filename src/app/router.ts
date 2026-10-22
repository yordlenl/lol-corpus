// 網址 #/champions/Ahri 這類形式 ↔ 頁面。可以加書籤、可以按上一頁。

export type Route =
  | { page: 'champions' }
  | { page: 'champion'; id: string }
  | { page: 'items'; id?: string }
  | { page: 'runes'; tree?: string; rune?: number }
  | { page: 'summoners' };

export function parseHash(hash: string): Route {
  const parts = hash
    .replace(/^#\/?/, '')
    .split('/')
    .filter(Boolean)
    .map((p) => decodeURIComponent(p));
  switch (parts[0]) {
    case 'champions':
      return parts[1] ? { page: 'champion', id: parts[1] } : { page: 'champions' };
    case 'items':
      return parts[1] ? { page: 'items', id: parts[1] } : { page: 'items' };
    case 'runes':
      return {
        page: 'runes',
        ...(parts[1] ? { tree: parts[1] } : {}),
        ...(parts[2] && Number.isFinite(Number(parts[2])) ? { rune: Number(parts[2]) } : {}),
      };
    case 'summoners':
      return { page: 'summoners' };
    default:
      return { page: 'champions' };
  }
}

export function href(...parts: Array<string | number>): string {
  return `#/${parts.map((p) => encodeURIComponent(String(p))).join('/')}`;
}
