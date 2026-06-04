import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import type { Show, Source } from '../../../types';

const VALID_SOURCES: Source[] = ['opentix', 'udn', 'kham', 'era', 'kktix', 'accupass'];
const URL_RE = /^https?:\/\//;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

interface ShowsFile {
	updatedAt: string;
	count: number;
	shows: Show[];
}

// Vitest runs with cwd = repo root.
const data: ShowsFile = JSON.parse(readFileSync('static/shows.json', 'utf-8'));
const { updatedAt, count, shows } = data;

describe('shows.json structure', () => {
	it('shows is a non-empty array', () => {
		expect(Array.isArray(shows)).toBe(true);
		expect(shows.length).toBeGreaterThan(0);
	});

	it('count equals shows.length', () => {
		expect(count).toBe(shows.length);
	});

	it('updatedAt is a valid ISO date string', () => {
		expect(typeof updatedAt).toBe('string');
		const parsed = new Date(updatedAt);
		expect(Number.isNaN(parsed.getTime())).toBe(false);
		// Round-trips back to the same instant → genuine ISO string, not a loose Date-parseable string.
		expect(parsed.toISOString()).toBe(updatedAt);
	});
});

describe('per-show field validity', () => {
	it('every show passes field validity checks', () => {
		const violations: string[] = [];

		for (const show of shows) {
			const id = show.id;

			const nonEmpty = (field: string, value: unknown) => {
				if (typeof value !== 'string' || value.length === 0) {
					violations.push(`[${id}] ${field} is not a non-empty string: ${JSON.stringify(value)}`);
				}
			};

			nonEmpty('id', show.id);
			nonEmpty('sourceId', show.sourceId);
			nonEmpty('title', show.title);
			nonEmpty('url', show.url);

			if (!VALID_SOURCES.includes(show.source)) {
				violations.push(`[${id}] invalid source: ${JSON.stringify(show.source)}`);
			}

			if (typeof show.url !== 'string' || !URL_RE.test(show.url)) {
				violations.push(`[${id}] url does not match ${URL_RE}: ${JSON.stringify(show.url)}`);
			}

			for (const field of ['startDate', 'endDate'] as const) {
				const value = show[field];
				if (value !== null && (typeof value !== 'string' || !DATE_RE.test(value))) {
					violations.push(`[${id}] ${field} is not null or YYYY-MM-DD: ${JSON.stringify(value)}`);
				}
			}

			if (!Array.isArray(show.sessions)) {
				violations.push(`[${id}] sessions is not an array: ${JSON.stringify(show.sessions)}`);
			} else {
				for (const [i, session] of show.sessions.entries()) {
					const value = session.date;
					if (value !== null && (typeof value !== 'string' || !DATE_RE.test(value))) {
						violations.push(
							`[${id}] sessions[${i}].date is not null or YYYY-MM-DD: ${JSON.stringify(value)}`,
						);
					}
				}
			}

			if (typeof show.youthSeat !== 'boolean') {
				violations.push(`[${id}] youthSeat is not a boolean: ${JSON.stringify(show.youthSeat)}`);
			}

			if (!Array.isArray(show.introImages)) {
				violations.push(`[${id}] introImages is not an array: ${JSON.stringify(show.introImages)}`);
			}
		}

		expect(violations).toEqual([]);
	});
});

describe('no expired residue', () => {
	it('no show with non-null endDate is expired relative to updatedAt', () => {
		const today = updatedAt.slice(0, 10);
		const violations: string[] = [];

		for (const show of shows) {
			if (show.endDate !== null && show.endDate < today) {
				violations.push(`[${show.id}] endDate ${show.endDate} is before updatedAt date ${today}`);
			}
		}

		expect(violations).toEqual([]);
	});
});

describe('aggregate health', () => {
	it('proportion of shows with null endDate is <= 10%', () => {
		const nullCount = shows.filter((s) => s.endDate === null).length;
		const pct = (nullCount / shows.length) * 100;
		expect(
			pct,
			`null endDate proportion is ${pct.toFixed(1)}% (${nullCount}/${shows.length})`,
		).toBeLessThanOrEqual(10);
	});
});
