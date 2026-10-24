# LoL 英語語料庫

把英雄聯盟的遊戲文字（技能、裝備、符文、召喚師技能、選用／禁用台詞）擺成「英文／台服繁中／簡中」三行對照，外觀像遊戲客戶端；點英文單字可以查音標和繁體釋義，並收藏單字或句子到學習 App 複習。第一次打開後會把資料和圖示存進裝置，之後離線也能看（原聲需要網路）。和 [學習 App](https://github.com/yordlenl/lol-study) 共用同一份生詞本與複習紀錄。

- 網址：<https://yordlenl.github.io/lol-corpus/>（iPad 上從主畫面的「LoL 英語」打開，再切到語料庫）
- 規格：[docs/spec.md](docs/spec.md)
- 目前進度：第九階段（學習 App 改成客戶端的「開始」畫面；上方導覽列和分頁是共用元件 `lol-client-nav`、`lol-client-tabs`）；第八階段等驗收；第七階段查詞擴充暫緩

## 常用指令

| 指令 | 做什麼 |
| --- | --- |
| `npm install` | 第一次下載倉庫後安裝套件 |
| `npm run dev` | 在 Mac 上開預覽；iPad 連同一個 Wi-Fi 也能打開（見 [docs/ipad-debugging.md](docs/ipad-debugging.md)） |
| `npm test` | 跑測試 |
| `npm run build` | 建置網站（`dist/`），另外打包共用模組（`dist/shared/`） |
| `npm run data` | 重新下載並整理遊戲資料、圖示、詞典（寫到 `public/data/`、`public/img/`） |
| `npm run icons` | 重新產生網頁圖示 |

推到 `main` 之後，GitHub Actions 會自動跑測試、建置、發布；**測試沒過就不會發布**。

## 遊戲改版時

1. 改 `scripts/data/config.ts` 裡的 `DDRAGON_VERSION`（例如 `16.22.1`）和 `CDRAGON_VERSION`（例如 `16.22`）。
2. 執行 `npm run data`，看最後的報告：數量、查不到的字、沒見過的標籤、繁中裡的簡體字。
   - 第一次會從 CommunityDragon 下載遊戲本體的裝備資料和三語文字檔（約 110MB，存在 `.cache/`）。
   - 商店篩選圖示是從遊戲商店圖集切出來的，位置寫在 `scripts/data/shop-icons.ts`；切到空白的格子時 `npm run data` 會報錯；遊戲換了圖集，要打開新圖集重新量位置，再看一次商店頁的圖示對不對。
3. 有新英雄時，`content/quotes.json` 要補上牠的選用、禁用台詞，不然建置會報錯。
4. `npm test` 通過後推上去。

## 共用模組

`src/shared/` 是兩個專案共用的部分：資料讀取、三行對照與卡片元件（Lit 自訂標籤，含練習模式的挖空）、收藏、拆句、挖空選詞、評分規則與逐字比對、隨機挑戰的遮名與干擾項、學習紀錄資料庫（格式版本號在 `src/shared/db.ts`）、ts-fsrs 複習排程。

- 語料庫直接使用；建置時另外打包成 `https://yordlenl.github.io/lol-corpus/shared/lol-shared.js` 給學習 App 載入。
- 對外的型別寫在 `src/shared/types.ts`，發布成 `shared/lol-shared.d.ts`。改了介面之後，在學習 App 執行 `npm run sync-types`。

## 資料來源與授權

| 內容 | 來源 |
| --- | --- |
| 技能、裝備、符文、召喚師技能、皮膚名、圖示 | Riot [Data Dragon](https://developer.riotgames.com/docs/lol#data-dragon)（en_US／zh_TW／zh_CN） |
| 屬性碎片；裝備的職業和商店分區（遊戲本體的官方欄位）；商店篩選圖示（從遊戲商店圖集切出）；Data Dragon 描述空白的裝備（「世界地圖」）和升級後裝備（例如芬布爾之冬）的三語官方描述；遊戲裡依英雄屬性即時計算的數字，官方文字沒寫，頁面上標成「依英雄屬性計算」 | [CommunityDragon](https://www.communitydragon.org/) |
| 收藏頁：造型名稱與故事介紹、炫彩造型、表情、頭像、偵察守衛、終結特效；收藏頁的欄目名稱、符文系別標語、召喚師技能模式名稱；客戶端介面圖（書包圖示、收藏背景、符文頁插畫） | [CommunityDragon](https://www.communitydragon.org/)（三語官方資料；大圖連網載入，不存進倉庫） |
| 英雄直式卡片圖、造型大圖、首頁大圖 | Riot Data Dragon（連網載入；首頁大圖存進倉庫） |
| 選用／禁用台詞與原聲 | League of Legends Wiki，經 [lol-english](https://github.com/carefreelove/lol-english) 整理，CC BY-SA 3.0（見 [content/README.md](content/README.md)） |
| 音標與釋義 | [ECDICT](https://github.com/skywind3000/ECDICT)（MIT），釋義用 OpenCC 轉成繁體 |

本站是非官方的學習用網站，未經 Riot Games 認可。英雄聯盟的名稱、文字、圖示與語音的權利屬於 Riot Games, Inc.

## 資料夾

- `src/app/`：語料庫的頁面
- `src/shared/`：共用模組
- `scripts/data/`：資料建置（`npm run data`）
- `content/quotes.json`：台詞正本
- `public/data/`、`public/img/`：建置好的遊戲資料與圖示（存在倉庫裡）
- `docs/reference/`：遊戲畫面參考截圖
- `docs/ipad-debugging.md`：用 Mac Safari 偵錯 iPad 上網頁的步驟
