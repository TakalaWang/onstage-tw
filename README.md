# OnStage TW（看戲）

> See every **theatre** performance in Taiwan in one place. Aggregates drama listings from OPENTIX, udn, KHAM, ERA and tixCraft, with search, filtering, and an RSS feed to follow new on-sales.

🔗 **Live site: [onstage-tw.vercel.app](https://onstage-tw.vercel.app)**

Taiwan's ticketing scene is fragmented: some plays are on OPENTIX, others on KHAM, ERA, udn, or tixCraft. Finding "what's on and when it goes on sale" means checking each site one by one. **OnStage TW** pulls the theatre listings from all of them onto a single page so you can browse once and subscribe via RSS.

It aggregates **theatre only** (drama, stage plays, traditional opera, puppetry, musicals, children's theatre…) and **excludes concerts and music recitals**.

## Features

- 🎭 **Single-page browsing** — drama from five platforms in one grid, with poster, dates, venue and price.
- 🔍 **Instant search & multi-filter** — by title, venue, organizer, source, city, category, date range, and on-sale status.
- 🪟 **Detail modal** — click any card for the full info (description, organizer, sessions, on-sale time, price).
- 📰 **RSS feed** — subscribe to `/feed.xml` in any reader; new shows show up automatically. No account, no email collected.
- 🔗 **Links out, never sells** — every ticket link deep-links back to the official site; we don't sell or re-host their data.

## Sources

| Platform | Method | Theatre category | On-sale time |
|---|---|---|---|
| OPENTIX | Public JSON API | `displayCategory = 戲劇 / 音樂劇` | ✅ (detail API) |
| udn | WebMethod (HTML fragment) | `Category=116` | — |
| KHAM | HTML + detail page | `CATEGORY=116, 80` | from page text |
| ERA | HTML (list only) | `CATEGORY=116` | — |
| tixCraft | HTML list + keyword heuristic | none — guessed by keyword (flagged "heuristic") | — |

> tixCraft has no theatre category and hides on-sale times behind anti-bot detail pages, so we only best-effort scrape its `/activity` list and pick out theatre by keyword. If it blocks us, that source is skipped without affecting the others.

## Architecture

```
ticketing platforms ──(scrapers)──▶ shows[] ──(output)──▶ static/shows.json  (page reads this)
                                                      └──▶ static/feed.xml    (RSS subscribers)

GitHub Actions (cron) ─▶ scrape ─▶ commit refreshed files ─▶ static host redeploys
```

There is **no database and no backend**. The scraper writes two static files; the page is prerendered
from `shows.json`, and notifications are handled entirely by each user's own RSS reader. A scheduled
GitHub Action refreshes the files and the static host redeploys automatically.

## Getting started

```bash
npm install
npm run scrape    # fetch all platforms → static/shows.json + static/feed.xml
npm run dev       # http://localhost:5173
```

Fast scrape (skips detail pages, less complete but quicker):

```bash
ONSTAGE_FAST=1 npm run scrape
```

## Deployment

Any static host works. The repo is configured for Vercel (`vercel.json`): it runs `npm run build`
(prerendered output in `build/`). The included GitHub Action (`.github/workflows/scrape.yml`) refreshes
the data on a schedule and commits it, which triggers an automatic redeploy — **no secrets needed**.

## Data & license

Only **factual fields** are stored (title, dates, venue, on-sale time, source link). Poster images are
hot-linked, not re-hosted, and tickets always link back to the official site. Each program's text and
images remain the copyright of its organizer and ticketing platform. Scraping is low-frequency and
attributed; please don't use it in ways that violate the platforms' terms of service.

Code is released under the [MIT](./LICENSE) license. The UI is in Traditional Chinese (the audience is in Taiwan); code, comments and docs are in English.

## Roadmap / contributing

- [ ] On-sale times for udn / ERA detail pages (mind ERA's IP blocking)
- [ ] Calendar view
- [ ] Per-source and per-keyword RSS feeds
- [ ] Community submissions (small troupes, not-yet-listed runs)
