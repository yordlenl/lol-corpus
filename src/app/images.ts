// 收藏頁的大圖（英雄直式卡片、造型大圖）直接從 Riot 的 Data Dragon 載入，不存進專案，要連網才看得到。
const DDRAGON_IMG = 'https://ddragon.leagueoflegends.com/cdn/img/champion';

/** 直式卡片圖（收藏的英雄格子用），num 是造型編號，0 是原版 */
export const championLoading = (championId: string, num = 0) => `${DDRAGON_IMG}/loading/${championId}_${num}.jpg`;

/** 造型大圖 */
export const championSplash = (championId: string, num = 0) => `${DDRAGON_IMG}/splash/${championId}_${num}.jpg`;

/** 收藏「造型」卡片的官方邊框，依造型等級（原版和 rare 用一般的框，和客戶端一樣） */
const BORDERS = new Set(['normal', 'epic', 'legendary', 'mythic', 'ultimate', 'transcendent', 'exalted']);
export const skinBorder = (rarity: string) => `img/client/ui/skin-border-${BORDERS.has(rarity) ? rarity : 'normal'}.png`;
