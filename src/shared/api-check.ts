// 只給型別檢查用：確認 index.ts 匯出的東西符合 types.ts 的 SharedModule 介面（學習 App 照那個介面呼叫）。
import type * as Shared from './index.ts';
import type { SharedModule } from './types.ts';

export const check = (shared: typeof Shared): SharedModule => shared;
