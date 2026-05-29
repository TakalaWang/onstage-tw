/**
 * 抓取 CLI：跑所有來源、寫入資料庫。
 * 用法：npm run scrape        （完整抓取，含 OPENTIX/寬宏 的詳情補抓）
 *      ONSTAGE_FAST=1 npm run scrape  （快速抓取，略過詳情頁）
 */
import { scrapeAll } from '../src/lib/server/scrapers/index';
import { upsertShows, pruneStaleShows } from '../src/lib/server/db';
import { writeSnapshot } from '../src/lib/server/snapshot';

const start = Date.now();
const runAt = new Date().toISOString();
const { shows, report } = await scrapeAll();

console.log('\n抓取結果：');
for (const r of report) {
	const status = r.ok ? `✓ ${r.count} 筆` : `✗ 失敗：${r.error}`;
	console.log(`  ${r.source.padEnd(10)} ${status}`);
}

const { inserted, total } = upsertShows(shows);
const okSources = report.filter((r) => r.ok).map((r) => r.source);
const pruned = pruneStaleShows(okSources, runAt);
const snapshot = writeSnapshot();
console.log(
	`\n寫入 ${total} 筆（其中 ${inserted} 筆為新節目），剪除 ${pruned} 筆已下架，耗時 ${((Date.now() - start) / 1000).toFixed(1)}s`
);
console.log(`快照已輸出：${snapshot.path}（${snapshot.count} 筆）`);
