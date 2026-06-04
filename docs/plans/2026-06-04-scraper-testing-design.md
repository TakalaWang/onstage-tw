# Scraper 測試套件 — 設計與實作計畫

> 日期：2026-06-04 · 分支：`feat/scraper-testing`

## 1. 目標與非目標

**目標**：為 6 個 scraper 與資料管線建立自動化測試，主要防護「解析回歸」（改程式碼時不小心弄壞解析）與「輸出資料劣化」。

**非目標**：不測 scraper 的網路重試/逾時邏輯；不追求 100% 覆蓋率。YAGNI。

## 2. 測試分層與 CI 分流

| 層 | 測什麼 | 跑在哪 | 需網路 |
|----|--------|--------|--------|
| **A. util 純函式** | `extractDateRange`、`cityFromText`、`looksTheatrical`、`classifyGenre`、`extractPriceRange`、`extractHighlights`、`extractOnSale` 等 | PR CI | ❌ |
| **B. 解析回歸** | 抽離出的 `parseXxxList/Detail/Sessions`，餵裁剪 fixture 斷言輸出 | PR CI | ❌ |
| **C. 輸出完整性** | `static/shows.json`：必填欄位、ISO 日期、URL 合法、無 `endDate` 堆積偵測 | PR CI | ❌ |
| **D. 線上 smoke** | 真連 6 來源，斷言「每源 ≥ N 筆 + 欄位齊全」，壞了開 issue | 排程 | ✅ |

A/B/C 走 `pnpm test`，綁進 `ci.yml`，每次 push 跑、快又穩。D 獨立在排程，flaky 也不擋 PR。

## 3. scraper 重構（純抽離，行為不變）

**原則**：只把「raw → 結構」的純解析剪出來變成 `export` 函式；`fetch` 編排、分頁迴圈、`sleep`、`try/catch`、`ONSTAGE_FAST` 全部留在 `run()`。剪下貼上，不改任何解析邏輯。

每個 scraper 抽出 2–4 個純函式，命名統一：

**JSON 型（opentix）**
```ts
export function parseOpenTixList(json: unknown): ProgramListItem[]   // 含 DRAMA_CATEGORIES 過濾
export function buildOpenTixShow(p: ProgramListItem, detail: ProgramDetail | null): Show
```

**HTML 型（udn）**
```ts
export function parseUdnList(listHtml: string): Listed[]
export function parseUdnSessions(html: string): Session[]            // 已存在，補 export
export function parseUdnDetail(detailHtml: string, url: string): Partial<Show>
export function buildUdnShow(item: Listed, sessions, detail): Show
```

其餘 4 個（era/kham/kktix/accupass）套同一模式。

**行為不變保障**：重構前先對 `scrape<Source>()` 跑一次真實輸出存「黃金檔」→ 重構 → 用 fixture 驅動的測試斷言輸出一致（characterization test）。

## 4. fixture 佈局

```
src/lib/server/scrapers/__tests__/
  fixtures/
    opentix/  list.json  detail-<id>.json
    udn/      list.html  sessions-<id>.html  detail-<id>.html
    era/ kham/ kktix/ accupass/   (同上)
    _edge/    udn-no-date.html  opentix-no-price.json   # 手造邊界
  opentix.test.ts  udn.test.ts  …(每源一檔)
  integrity.test.ts                # C 層，讀 static/shows.json
scripts/smoke.ts                   # D 層，真連線
```

裁剪原則：每個 list fixture 留 **1–2 筆真實 entry**（夠涵蓋過濾分支），detail 留 1 筆完整 + `_edge/` 放手造壞資料。

## 5. 各層斷言策略

**A. util 純函式** — 表格驅動 `it.each`，輸入→預期。重點放正則類：`extractDateRange`（各種年/月/日分隔）、`cityFromText`（場館→城市）、`looksTheatrical`（戲劇 vs 演唱會）、`classifyGenre`、`extractPriceRange`、`extractOnSale`。

**B. 解析回歸** — `parseXxxList(fixture)` 用 `toEqual` 斷言完整中間結構；`buildXxxShow(...)` 斷言完整 `Show`。`_edge` case 斷言不丟例外、欄位 fallback 成 `null`。用明確 `toEqual` 而非 `toMatchSnapshot`。

**C. 完整性** — 對 `static/shows.json` 每筆斷言：`id`/`title`/`source`/`url` 非空、`url` 是 `https?://`、`startDate`/`endDate` 是 `YYYY-MM-DD` 或 null、`source` ∈ 合法集合、`endDate >= updatedAt 日期` 或為 null。**外加**：`endDate == null` 的筆數 ≤ 全體 **10%**，超過紅燈（防「無 endDate 永久堆積」）。

**D. 線上 smoke** — `scripts/smoke.ts` 真跑 6 scraper，斷言每源 `count >= MIN[source]`（預設門檻見下），欄位齊全率達標，失敗組裝訊息開 issue。

預設門檻（之後依實際資料微調）：
```
MIN = { opentix: 10, udn: 5, kham: 3, era: 3, kktix: 3, accupass: 5 }
```

## 6. CI 整合

`package.json` 加 `"test": "vitest run"`。`ci.yml` 在 `check` 與 `build` 之間插一行 `pnpm test`。

**D 層的重用機會**：`scrape.yml` 已跑 6 scraper 並產出 `scrape-report.json`（含 `count`/`ok`），告警條件是 `count == 0`。D 層即「把門檻從 `== 0` 升級成 `< MIN[source]` + 欄位齊全率」，直接改 `scrapeAll` 的 report 與既有告警步驟 — 不另開 workflow、不重複連線。

## 7. 實作順序

| 階段 | 內容 | 風險 | 驗證 | PR |
|------|------|------|------|----|
| **0** | 裝 Vitest + config + test script | 無 | `pnpm test` 跑得起來 | PR #1 |
| **1** | A 層 util 純函式測試 | 零重構 | 主要函式覆蓋、綠 | PR #1 |
| **2** | C 層 `shows.json` 完整性測試 | 零重構 | 對現有資料綠（紅=抓到真問題） | PR #1 |
| **4** | `ci.yml` 接 `pnpm test` | 無 | CI 綠 | PR #1 |
| **3** | B 層：逐一 scraper（fixture+黃金檔→抽離→回歸測試），6 個分開 | 重構 | 每 scraper 行為一致 | PR #2+ |
| **5** | D 層：升級 `scrape.yml` 門檻告警 | 低 | 門檻邏輯測試綠 | PR #3 |

**本 PR（feat/scraper-testing）範圍：階段 0 / 1 / 2 / 4** — 不需網路、零重構、最高 CP。

階段 3（需逐一對外抓 fixture）與階段 5 留作後續 PR。

## 執行任務分解（本 PR）

- **Task A**：Vitest 基礎設施（安裝、`vitest.config.ts`、`package.json` test script、tsconfig types）+ A 層 util 純函式測試（`src/lib/server/scrapers/__tests__/util.test.ts`）。驗證：`pnpm test` 綠。
- **Task B**：C 層完整性測試（`src/lib/server/scrapers/__tests__/integrity.test.ts`，讀 `static/shows.json`）。驗證：對現有資料綠。
- **Task C**：`ci.yml` 在 `check` 與 `build` 之間加 `pnpm test`。驗證：YAML 正確、步驟順序合理。
