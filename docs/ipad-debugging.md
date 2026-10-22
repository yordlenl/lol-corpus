# 用 Mac Safari 偵錯 iPad 上的網頁

Mac 的 Safari 可以直接檢查 iPad 上正在開的網頁：看錯誤訊息、檢查畫面元素、查 IndexedDB 裡存了什麼。主畫面 App 也可以檢查。

## 一次性設定

**iPad**

1. 打開「設定」→「App」→「Safari」→「進階」，開啟「網頁檢閱器」。
   （iPadOS 17 以前是「設定」→「Safari」→「進階」。）

**Mac**

1. 打開 Safari →「設定…」→「進階」，勾選最下面的「顯示網頁開發者功能」。
2. 選單列會多出「開發」選單。

## 每次連線

1. 用 USB-C 線把 iPad 接到 Mac。第一次會問「要信任這部電腦嗎？」，按「信任」並輸入 iPad 密碼。
2. 在 iPad 上用 Safari 打開網頁，或從主畫面打開 App，保持 iPad 解鎖。
3. Mac Safari →「開發」→ 你的 iPad 名稱 → 點要檢查的網頁，會跳出「網頁檢閱器」視窗。
   - 「主控台」看錯誤訊息。
   - 「儲存空間」→「IndexedDB」看生詞本、複習紀錄存了什麼。

## 不用發布，直接在 iPad 上看 Mac 正在改的版本

1. 在 Mac 的專案資料夾執行 `npm run dev`，終端機會顯示一行 `Network: http://192.168.x.x:5173/lol-corpus/`。
2. iPad 和 Mac 連同一個 Wi-Fi，在 iPad 的 Safari 打開那個網址。
3. 改了程式碼，iPad 上的畫面會自動更新。

注意：這個網址和正式網址（`yordlenl.github.io`）是不同的網站，在這裡存的生詞本、複習紀錄不會出現在正式網站。

## 「開發」選單裡找不到 iPad

- 確認 iPad 已解鎖、按過「信任」、「網頁檢閱器」已開啟。
- 拔掉線重插，或換一條能傳資料的線（有些線只能充電）。
- iPad 上至少要開著一個 Safari 網頁或主畫面 App。
