/** 同一個標籤只註冊一次（語料庫和學習 App 都可能載入） */
export function define(name: string, element: CustomElementConstructor) {
  if (!customElements.get(name)) customElements.define(name, element);
}
