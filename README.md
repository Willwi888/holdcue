# HoldCue

Willwi 的手工歌詞對時工作室。

這不是情緒捷運線。捷運線仍在獨立專案：
[Willwi888/willwi](https://github.com/Willwi888/willwi)

HoldCue 只做這件事：

1. 輸入一次性密碼
2. 從 [Willwi Archive](https://willwi-music-db-j3h8.vercel.app/database) 選歌
3. 按住空白鍵對時，放開跳下一句
4. 輸出歌詞影片：專輯封面放大當底、固定躁點、前方 1:1 封面與歌曲資料

## 流程

聽眾用司機室開出的一次性密碼進站。選歌後不可換歌（對時中可 Delete / reset）。完成後可看成品並下載 MP4。

歌曲、歌詞、錄音權利仍屬原創作者。下載不成授權。

## 部署

GitHub：[Willwi888/holdcue](https://github.com/Willwi888/holdcue)

Vercel 專案請另開，不要接在 `emotion-metro-vercel` 上。

環境變數：

- `DATABASE_URL`（Neon）
- `DESK_PASSPHRASE`（司機室口令，不進 Git）
