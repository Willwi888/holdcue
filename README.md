# 手工歌詞 HoldCue

獨立專案。不是情緒捷運線，不共用那個網站、不共用那組資料庫。

- 捷運線：[Willwi888/willwi](https://github.com/Willwi888/willwi)
- 本專案：[Willwi888/holdcue](https://github.com/Willwi888/holdcue)

只做手工歌詞：公開看成片 → NT$100／320／2,800 支持 → 一次性密碼 → Archive 選歌 → 空白鍵對時 → 封面＋躁點成片。

## Vercel

專案名稱用 `holdcue`，Git 只接這個 repo。Root Directory 留空。

自己開一組 Neon，不要貼捷運線的 `DATABASE_URL`。

環境變數（只加在 holdcue）：

- `DATABASE_URL`：HoldCue 專用
- `DESK_PASSPHRASE`：司機室口令，不要跟捷運線同一組

驗收：[https://holdcue.vercel.app/](https://holdcue.vercel.app/)
