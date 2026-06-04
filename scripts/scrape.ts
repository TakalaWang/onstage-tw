import { writeFileSync } from 'node:fs';
import { scrapeAll } from '../src/lib/server/scrapers/index';
import { writeOutputs } from '../src/lib/server/output';
import { cityFromText } from '../src/lib/server/scrapers/util';
import { evaluateSourceHealth } from '../src/lib/server/scrapers/health';

const start = Date.now();
const { shows, report } = await scrapeAll();

console.log('\nScrape report:');
for (const r of report) {
	console.log(`  ${r.source.padEnd(10)} ${r.ok ? `ok ${r.count}` : `failed: ${r.error}`}`);
}

const { count } = writeOutputs(shows);
console.log(
	`\nWrote ${count} active shows to static/shows.json + static/feed.xml in ${((Date.now() - start) / 1000).toFixed(1)}s`,
);

const health = evaluateSourceHealth(report, shows);
const failures = health
	.filter((h) => !h.healthy)
	.map((h) => ({ source: h.source, error: h.reason ?? 'unhealthy' }));

const venueCount = new Map<string, number>();
for (const s of shows) {
	for (const v of [s.venue, ...s.sessions.map((x) => x.venue)]) {
		const name = v?.trim();
		if (!name || name.length > 40) continue;
		if (!cityFromText(name)) venueCount.set(name, (venueCount.get(name) ?? 0) + 1);
	}
}
const unresolvedVenues = [...venueCount.entries()]
	.sort((a, b) => b[1] - a[1])
	.map(([venue, occurrences]) => ({ venue, occurrences }));

writeFileSync(
	'scrape-report.json',
	JSON.stringify({ failures, unresolvedVenues, report, health, total: count }, null, 2),
);
if (unresolvedVenues.length) {
	console.log(`\nℹ ${unresolvedVenues.length} venue(s) could not be resolved to a city.`);
}
if (failures.length) {
	console.log(
		`\n⚠ ${failures.length} source(s) need attention:`,
		failures.map((f) => f.source).join(', '),
	);
}
process.exit(0);
