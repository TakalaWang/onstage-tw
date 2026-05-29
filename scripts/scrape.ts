/**
 * Scrape CLI: fetch every source and write static/shows.json + static/feed.xml.
 *   npm run scrape              full scrape (includes OPENTIX / KHAM detail pages)
 *   ONSTAGE_FAST=1 npm run scrape   fast scrape (skip detail pages)
 */
import { scrapeAll } from '../src/lib/server/scrapers/index';
import { writeOutputs } from '../src/lib/server/output';

const start = Date.now();
const { shows, report } = await scrapeAll();

console.log('\nScrape report:');
for (const r of report) {
	console.log(`  ${r.source.padEnd(10)} ${r.ok ? `ok ${r.count}` : `failed: ${r.error}`}`);
}

const { count } = writeOutputs(shows);
console.log(
	`\nWrote ${count} active shows to static/shows.json + static/feed.xml in ${((Date.now() - start) / 1000).toFixed(1)}s`
);
process.exit(0);
