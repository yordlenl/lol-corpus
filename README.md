# LoL 英語語料庫

把英雄聯盟的遊戲文字（技能、裝備、符文、召喚師技能、選用／禁用台詞）擺成「英文／台服繁中／簡中」三行對照，外觀像遊戲客戶端。和 [學習 App](https://github.com/yordlenl/lol-study) 共用同一份生詞本與複習紀錄。

- 網址：<https://yordlenl.github.io/lol-corpus/>
- 目前進度：第一階段（準備）— 空白首頁＋共用資料測試

## 常用指令

| 指令 | 做什麼 |
| --- | --- |
| `npm install` | 第一次下載倉庫後安裝套件 |
| `npm run dev` | 在 Mac 上開預覽；iPad 連同一個 Wi-Fi 也能打開（見 [docs/ipad-debugging.md](docs/ipad-debugging.md)） |
| `npm test` | 跑測試 |
| `npm run build` | 建置成網站檔案（放在 `dist/`） |
| `npm run icons` | 重新產生主畫面圖示 |

推到 `main` 之後，GitHub Actions 會自動跑測試、建置、發布；**測試沒過就不會發布**。

## 資料夾

- `src/`：網頁程式
- `public/`：原樣發布的檔案（manifest、圖示）
- `scripts/`：開發用小工具
- `docs/reference/`：遊戲畫面參考截圖，介面完成後和這些圖並排比對
- `docs/ipad-debugging.md`：用 Mac Safari 偵錯 iPad 上網頁的步驟
