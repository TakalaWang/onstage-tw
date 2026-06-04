import { describe, it, expect } from 'vitest';
import type { Show, Source } from '../../../types';
import {
	evaluateSourceHealth,
	MIN_ROWS,
	COMPLETENESS_THRESHOLD,
	COMPLETENESS_MIN_SAMPLE,
} from '../health';

function makeShow(source: Source, overrides: Partial<Show> = {}): Show {
	return {
		id: 'id',
		source,
		sourceId: 'sid',
		title: 'A Show',
		category: null,
		startDate: '2026-01-01',
		endDate: null,
		venue: null,
		city: null,
		onSaleAt: null,
		minPrice: null,
		maxPrice: null,
		imageUrl: null,
		url: 'https://example.com',
		description: null,
		notes: null,
		youthSeat: false,
		introImages: [],
		organizer: null,
		sessions: [],
		...overrides,
	};
}

function makeShows(source: Source, n: number, complete: boolean): Show[] {
	return Array.from({ length: n }, () =>
		makeShow(source, complete ? {} : { title: '', startDate: null, endDate: null }),
	);
}

describe('evaluateSourceHealth', () => {
	it('marks a source with enough rows and high completeness as healthy', () => {
		const report = [{ source: 'opentix' as Source, count: 20, ok: true }];
		const shows = makeShows('opentix', 20, true);
		const result = evaluateSourceHealth(report, shows);
		expect(result).toEqual([
			{ source: 'opentix', count: 20, ok: true, completeness: 1, healthy: true, reason: null },
		]);
	});

	it('marks a source that threw as unhealthy with the error as reason', () => {
		const report = [{ source: 'udn' as Source, count: 0, ok: false, error: 'fetch failed' }];
		const result = evaluateSourceHealth(report, []);
		expect(result[0].healthy).toBe(false);
		expect(result[0].reason).toBe('fetch failed');
		expect(result[0].completeness).toBe(0);
	});

	it('falls back to "scraper threw" when no error message is present', () => {
		const report = [{ source: 'udn' as Source, count: 0, ok: false }];
		const result = evaluateSourceHealth(report, []);
		expect(result[0].healthy).toBe(false);
		expect(result[0].reason).toBe('scraper threw');
	});

	it('marks a source below MIN_ROWS as unhealthy with the rows reason', () => {
		const count = MIN_ROWS.opentix - 1; // 9
		const report = [{ source: 'opentix' as Source, count, ok: true }];
		const shows = makeShows('opentix', count, true);
		const result = evaluateSourceHealth(report, shows);
		expect(result[0].healthy).toBe(false);
		expect(result[0].reason).toBe(`returned ${count} rows (min ${MIN_ROWS.opentix})`);
	});

	it('marks low completeness with a large sample as unhealthy', () => {
		// 10 rows, 5 complete = 50% < 70%, sample >= COMPLETENESS_MIN_SAMPLE
		const report = [{ source: 'opentix' as Source, count: 10, ok: true }];
		const shows = [...makeShows('opentix', 5, true), ...makeShows('opentix', 5, false)];
		const result = evaluateSourceHealth(report, shows);
		expect(result[0].healthy).toBe(false);
		expect(result[0].completeness).toBe(0.5);
		expect(result[0].reason).toBe(
			`low field completeness 50% (min ${COMPLETENESS_THRESHOLD * 100}%)`,
		);
	});

	it('does not gate on completeness when the sample is small (kham-style)', () => {
		// kham MIN is 3; count 5 (< COMPLETENESS_MIN_SAMPLE of 8), 4/5 = 80% but gate skipped
		const count = COMPLETENESS_MIN_SAMPLE - 3; // 5
		const report = [{ source: 'kham' as Source, count, ok: true }];
		const shows = [...makeShows('kham', 4, true), ...makeShows('kham', 1, false)];
		const result = evaluateSourceHealth(report, shows);
		expect(result[0].healthy).toBe(true);
		expect(result[0].reason).toBe(null);
		expect(result[0].completeness).toBe(0.8);
	});

	it('reports completeness computed over only the matching source rows', () => {
		const report = [
			{ source: 'opentix' as Source, count: 12, ok: true },
			{ source: 'udn' as Source, count: 5, ok: true },
		];
		const shows = [
			...makeShows('opentix', 9, true),
			...makeShows('opentix', 3, false), // 9/12 = 0.75 opentix
			...makeShows('udn', 5, true), // 5/5 = 1 udn, must not bleed into opentix
		];
		const result = evaluateSourceHealth(report, shows);
		expect(result[0].completeness).toBe(0.75);
		expect(result[0].healthy).toBe(true); // count >= 10 and 0.75 >= 0.7
		expect(result[1].completeness).toBe(1);
		expect(result[1].healthy).toBe(true);
	});

	it('sets completeness to 0 when count is 0', () => {
		const report = [{ source: 'era' as Source, count: 0, ok: true }];
		const result = evaluateSourceHealth(report, []);
		expect(result[0].completeness).toBe(0);
		expect(result[0].healthy).toBe(false); // 0 < MIN_ROWS.era
		expect(result[0].reason).toBe(`returned 0 rows (min ${MIN_ROWS.era})`);
	});
});
