import type { Source, Show } from '../../types';

export const MIN_ROWS: Record<Source, number> = {
	opentix: 10,
	udn: 5,
	kham: 3,
	era: 3,
	kktix: 3,
	accupass: 5,
};
export const COMPLETENESS_THRESHOLD = 0.7; // min fraction of rows with title && (startDate||endDate)
export const COMPLETENESS_MIN_SAMPLE = 8; // only check completeness when raw count >= this (small samples are too noisy)

export interface SourceHealth {
	source: Source;
	count: number; // raw scraped count (from report)
	ok: boolean; // scraper ran without throwing
	completeness: number; // fraction of this source's shows with title && (startDate||endDate); 0 when count is 0
	healthy: boolean;
	reason: string | null; // human-readable reason when unhealthy, else null
}

export function evaluateSourceHealth(
	report: { source: Source; count: number; ok: boolean; error?: string }[],
	shows: Show[],
): SourceHealth[] {
	return report.map((entry) => {
		const { source, count, ok, error } = entry;

		const sourceShows = shows.filter((s) => s.source === source);
		const complete = sourceShows.filter(
			(s) => Boolean(s.title) && Boolean(s.startDate || s.endDate),
		).length;
		const completeness = count === 0 ? 0 : complete / sourceShows.length;

		let healthy = true;
		let reason: string | null = null;

		if (!ok) {
			healthy = false;
			reason = error ?? 'scraper threw';
		} else if (count < MIN_ROWS[source]) {
			healthy = false;
			reason = `returned ${count} rows (min ${MIN_ROWS[source]})`;
		} else if (count >= COMPLETENESS_MIN_SAMPLE && completeness < COMPLETENESS_THRESHOLD) {
			healthy = false;
			reason = `low field completeness ${(completeness * 100).toFixed(0)}% (min ${COMPLETENESS_THRESHOLD * 100}%)`;
		}

		return { source, count, ok, completeness, healthy, reason };
	});
}
