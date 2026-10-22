# 台詞內容

`quotes.json` 是台詞的正本，目前收錄 173 位英雄的選用、禁用台詞各一條，共 346 條。欄位照 spec 的「台詞資料格式」：

| 欄位 | 說明 |
| --- | --- |
| `champion` | 英雄 id |
| `voiceSet` | 語音組；原版是 `base` |
| `event` | 情境：`pick` 選用、`ban` 禁用 |
| `text` | 各語言文字：`en`、`zh_TW`、`zh_CN`、`ko`（ko 先留空） |
| `audio` | 各語言各自的音檔網址，沒有就留空 |
| `translation` | 各語言的譯文性質：`original` 原文、`official` 官方、`learning` 學習譯文 |
| `source` | 來源網址（LoL Wiki 的固定版本） |
| `nonverbal` | 非語言聲音（嘶吼、樂器等） |
| `fictionalLanguage` | 虛構語言（例如納爾語），不解釋詞義 |

## 出處

- 英文台詞與原聲：[League of Legends Wiki](https://wiki.leagueoflegends.com/en-us/) 的各英雄 Audio 頁，每條的 `source` 指向抓取當時的頁面版本。
- 中文：[lol-english](https://github.com/carefreelove/lol-english) 原作者依英文寫的**學習譯文**（簡體），不是官方配音稿。
- 轉換來源：lol-english `content/voices.json`，版本 `2cc207f`（見 `quotes.json` 的 `derivedFrom`）。

## 本專案做的修改

1. 欄位改成上面的新格式。
2. 繁中行（`zh_TW`）由簡中學習譯文經 OpenCC 字形轉換而來，只換字形、不換用詞；兩行都標為學習譯文。

轉換用的程式是 `scripts/migrate-quotes.ts`（只執行過一次）。之後要修正譯文，直接改 `quotes.json`。

## 授權

台詞轉錄：League of Legends Wiki contributors。轉錄與學習譯文採用 [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/)，本檔案的修改也以相同授權釋出。原始遊戲台詞、角色與音檔的權利屬於 Riot Games。
