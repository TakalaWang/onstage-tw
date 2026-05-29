import type { Show, Source } from '../../types';
import { scrapeOpenTix } from './opentix';
import { scrapeUdn } from './udn';
import { scrapeKham } from './kham';
import { scrapeEra } from './era';
import { scrapeKktix } from './kktix';

type Scraper = { source: Source; run: () => Promise<Show[]> };

const SCRAPERS: Scraper[] = [
	{ source: 'opentix', run: scrapeOpenTix },
	{ source: 'udn', run: scrapeUdn },
	{ source: 'kham', run: scrapeKham },
	{ source: 'era', run: scrapeEra },
	{ source: 'kktix', run: scrapeKktix }
];

export interface ScrapeResult {
	shows: Show[];
	report: { source: Source; count: number; ok: boolean; error?: string }[];
}

/** Run every source; a single source failing is recorded but does not affect the others. */
export async function scrapeAll(): Promise<ScrapeResult> {
	const shows: Show[] = [];
	const report: ScrapeResult['report'] = [];
	for (const { source, run } of SCRAPERS) {
		try {
			const result = await run();
			shows.push(...result);
			report.push({ source, count: result.length, ok: true });
		} catch (err) {
			report.push({
				source,
				count: 0,
				ok: false,
				error: err instanceof Error ? err.message : String(err)
			});
		}
	}
	return { shows, report };
}
