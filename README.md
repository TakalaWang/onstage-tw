# 看戲 kanxi

> 一個地方看完台灣所有**戲劇**演出。整合 OPENTIX、udn、寬宏、年代、拓元 的戲劇節目，提供搜尋、過濾與開賣訂閱通知。

台灣的售票生態很分散：兩廳院的戲在 OPENTIX、有些在寬宏、有些在年代、有些在 udn、有些在拓元。想知道「最近有什麼戲、什麼時候開賣」得一個一個網站翻。**看戲** 把這些平台的戲劇類節目聚合到同一頁，讓你一次看完、設關鍵字訂閱、不錯過開賣。

只聚合**戲劇**（現代戲劇、舞台劇、戲曲、偶戲、音樂劇、兒童劇…），**排除演唱會與音樂會**。

## 特色

- 🎭 **單頁瀏覽** — 五大售票平台的戲劇節目集中一頁，含主視覺、日期、場館、票價。
- 🔍 **即時搜尋 / 多維過濾** — 依劇名、場館、主辦、來源平台、縣市、分類、演出日期區間、開賣狀態篩選。
- 🪟 **詳情 Modal** — 點任一卡片即看完整資訊（簡介、主辦、各場次、開賣時間、票價）。
- 🔔 **開賣訂閱** — 留下 Email + 關鍵字（劇名／劇團），有符合的新演出時寄信通知。
- 🔗 **只導流、不賣票** — 所有購票連結深連結回原售票網，本站不販售、不轉存對方圖文資料庫。

## 資料來源

| 平台 | 取得方式 | 戲劇分類 | 開賣時間 |
|---|---|---|---|
| OPENTIX 兩廳院 | 公開 JSON API | `displayCategory = 戲劇 / 音樂劇` | ✅（詳情 API） |
| udn 售票網 | WebMethod（HTML 片段） | `Category=116` | — |
| 寬宏售票 | HTML 解析 + 詳情頁 | `CATEGORY=116, 80` | 內文擷取 |
| 年代售票 | HTML 解析（僅列表） | `CATEGORY=116` | — |
| 拓元售票 | HTML 列表 + 關鍵字啟發式 | 無分類，靠關鍵字推測（標記「疑似戲劇」） | — |

> 拓元沒有戲劇分類、開賣時間又藏在會被反爬擋下的詳情頁，因此只 best-effort 抓 `/activity` 列表並用關鍵字挑出戲劇；整站被擋時自動略過，不影響其他來源。

## 技術棧

- [SvelteKit](https://svelte.dev/) (Svelte 5 runes) + TypeScript
- Tailwind CSS v4
- better-sqlite3（抓取去重 / 剪枝 / 訂閱）
- node-html-parser（HTML 來源解析）
- nodemailer（開賣通知）
- adapter-node（自架）／ adapter-static（純瀏覽 demo）

## 架構

```
各售票平台 ──(scrapers)──▶ SQLite（去重・剪枝・訂閱）──(export)──▶ static/shows.json（快照）
                                                                        │
                                              頁面讀快照 ◀──────────────┘
```

抓取資料寫入 SQLite（負責去重、剪除下架節目、儲存訂閱），同時輸出一份 `static/shows.json`
快照。**頁面只讀這份快照**，因此可部署成純靜態站、SSR node 服務、或 serverless —— 同一份程式碼。
排程抓取後重新產生快照即更新資料。

## 開始使用

```bash
npm install
cp .env.example .env        # 視需要填 SMTP / token

npm run scrape              # 抓取各平台戲劇，寫入 data/kanxi.db
npm run dev                 # 啟動網站 http://localhost:5173
```

抓取支援快速模式（略過詳情頁，較快但少了部分場館／開賣時間）：

```bash
KANXI_FAST=1 npm run scrape
```

## 定期更新

自架（node）部署後，用 cron 定期觸發抓取端點（需設 `KANXI_SCRAPE_TOKEN`），會同時刷新快照：

```bash
curl -X POST https://你的網域/api/scrape \
  -H "Authorization: Bearer $KANXI_SCRAPE_TOKEN"
```

或直接在伺服器上跑 CLI，並接著送出通知：

```bash
npm run scrape && npm run notify
```

## 部署

### 純瀏覽 demo（Vercel / GitHub Pages，零後端）

`npm run build:static` 產生純靜態站（首頁 prerender、資料來自 `static/shows.json`）。
搭配內附的 GitHub Action（`.github/workflows/scrape.yml`）定時抓取並 commit 快照，靜態站即自動更新。
訂閱功能在此模式不啟用（無伺服器）。

```bash
npm run build:static   # 輸出到 build/
```

### 全功能自架（Docker，含訂閱 / 通知）

```bash
docker build -t kanxi .
docker run -p 3000:3000 -v $PWD/data:/data \
  -e KANXI_DB=/data/kanxi.db -e KANXI_SNAPSHOT=/data/shows.json \
  -e KANXI_SCRAPE_TOKEN=your-secret kanxi
# 首次部署後觸發一次抓取：
curl -X POST localhost:3000/api/scrape -H "Authorization: Bearer your-secret"
```

Fly.io 可直接用內附的 `fly.toml`（`fly launch --no-deploy` → `fly volumes create kanxi_data --size 1` → `fly deploy`）。
任何支援 Docker + 持久化磁碟的平台（Render、Railway、VPS）皆可。

## 開賣通知

`npm run notify` 會比對所有訂閱與最新節目，對「尚未通知過」的匹配寄信。
未設定 `SMTP_HOST` 時改為 **dry-run** 直接印出內容，方便本地測試。

## 資料與授權

本專案僅整合**事實性資訊**（節目名稱、日期、場館、開賣時間、原始連結），主視覺圖以熱連結方式呈現、不轉存，購票一律導回官方售票頁。各節目的文字、圖片著作權屬各主辦單位與售票平台所有。抓取採低頻率並標註來源，請勿用於違反各平台服務條款的用途。

程式碼以 [MIT](./LICENSE) 授權釋出。

## 待辦 / 歡迎貢獻

- [ ] udn / 年代 詳情頁補開賣時間（注意年代的 IP 封鎖）
- [ ] 行事曆視圖
- [ ] Web Push / LINE 官方帳號通知管道
- [ ] 社群投稿（補小眾劇團、官方尚未上架的場次）
- [ ] 退訂連結與訂閱管理
