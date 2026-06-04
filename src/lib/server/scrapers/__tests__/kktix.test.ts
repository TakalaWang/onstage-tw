import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { parseEventPage, filterKktixEntries, buildKktixShow } from '../kktix';
import type { FeedEntry, LdEvent } from '../kktix';
import type { Show } from '../../../types';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'kktix');
const readFixture = (name: string) => readFileSync(join(fixturesDir, name), 'utf-8');

const eventsJson = JSON.parse(readFixture('events.json')) as { entry: FeedEntry[] };
const eventHtml = readFixture('event-5minutes-0912.html');

const theatricalEntry = eventsJson.entry.find((e) => e.url.endsWith('5minutes-0912'))!;

describe('parseEventPage', () => {
	it('extracts the ld+json Event and og:image from the event page', () => {
		const expected: { detail: LdEvent | null; image: string | null } = {
			detail: {
				'@context': 'http://schema.org',
				'@type': 'Event',
				name: '【9/12 場次】果陀劇場舞動音樂劇＜生命中最美好的5分鐘＞線上錄播場',
				url: 'https://godot.kktix.cc/events/5minutes-0912',
				startDate: '2021-09-12T14:30:00.000+08:00',
				endDate: '2021-09-12T17:00:00.000+08:00',
				location: { '@type': 'EventVenue', name: '', address: '' },
				offers: [
					{
						'@type': 'Offer',
						name: '果陀 VIP 會員',
						category: 'primary',
						price: 200,
						priceCurrency: 'TWD',
						availability: 'OutOfStock',
						url: 'https://godot.kktix.cc/events/5minutes-0912',
						validFrom: '2021-08-28T12:00:00.000+08:00',
						validThrough: '2021-09-12T14:30:00.000+08:00',
					},
					{
						'@type': 'Offer',
						name: 'KK Points 優惠票',
						category: 'primary',
						price: 200,
						priceCurrency: 'TWD',
						availability: 'OutOfStock',
						url: 'https://godot.kktix.cc/events/5minutes-0912',
						validFrom: '2021-08-28T12:00:00.000+08:00',
						validThrough: '2021-09-12T14:30:00.000+08:00',
					},
					{
						'@type': 'Offer',
						name: '貴賓票',
						category: 'primary',
						price: 0,
						priceCurrency: 'TWD',
						availability: 'OutOfStock',
						url: 'https://godot.kktix.cc/events/5minutes-0912',
						validFrom: '2021-08-28T12:00:00.000+08:00',
						validThrough: '2021-09-12T14:30:00.000+08:00',
					},
					{
						'@type': 'Offer',
						name: '防疫回饋價',
						category: 'primary',
						price: 250,
						priceCurrency: 'TWD',
						availability: 'OutOfStock',
						url: 'https://godot.kktix.cc/events/5minutes-0912',
						validFrom: '2021-08-28T12:00:00.000+08:00',
						validThrough: '2021-09-12T14:30:00.000+08:00',
					},
				],
				// parseEventPage returns the raw parsed ld+json (incl. fields not on the
				// LdEvent interface like @context/category/availability), so cast via unknown.
			} as unknown as LdEvent,
			image: 'https://assets.kktix.io/upload_images/135883/_______5_______1200X630-3_original.jpg',
		};
		expect(parseEventPage(eventHtml)).toEqual(expected);
	});
});

describe('filterKktixEntries', () => {
	it("mode 'all' keeps every entry (capped at MAX_PER_ORG)", () => {
		expect(filterKktixEntries(eventsJson.entry, 'all').map((e) => e.url)).toEqual([
			'https://godot.kktix.cc/events/5minutes-0912',
			'https://godot.kktix.cc/events/ks8fr',
			'https://iwillshare.kktix.cc/events/financial2025',
		]);
	});

	it("mode 'filter' keeps only theatrical entries, dropping the non-theatrical one", () => {
		// The two 音樂劇 (godot) entries pass looksTheatrical; the financial
		// workshop (iwillshare) is dropped.
		expect(filterKktixEntries(eventsJson.entry, 'filter').map((e) => e.url)).toEqual([
			'https://godot.kktix.cc/events/5minutes-0912',
			'https://godot.kktix.cc/events/ks8fr',
		]);
	});
});

describe('buildKktixShow', () => {
	const { detail, image } = parseEventPage(eventHtml);

	it('builds the full Show from an entry + detail (not expired against 2020)', () => {
		const expected: Show = {
			id: 'kktix:godot/5minutes-0912',
			source: 'kktix',
			sourceId: 'godot/5minutes-0912',
			title: '【9/12 場次】果陀劇場舞動音樂劇＜生命中最美好的5分鐘＞線上錄播場',
			category: '音樂劇',
			startDate: '2021-09-12',
			endDate: '2021-09-12',
			// ld+json location.name is an empty string, so venue is '' (not null).
			venue: '',
			// cityFromText('') (empty address falls back to empty venue) → null.
			city: null,
			// validFrom 2021-08-28T12:00+08:00 normalised to UTC.
			onSaleAt: '2021-08-28T04:00:00.000Z',
			// 0-priced offer is dropped; prices 200, 200, 250 remain.
			minPrice: 200,
			maxPrice: 250,
			imageUrl:
				'https://assets.kktix.io/upload_images/135883/_______5_______1200X630-3_original.jpg',
			url: 'https://godot.kktix.cc/events/5minutes-0912',
			// description is null when detail is present.
			description: null,
			notes: null,
			youthSeat: false,
			introImages: [],
			organizer: null,
			sessions: [],
		};
		expect(buildKktixShow(theatricalEntry, detail, image, '2020-01-01')).toEqual(expected);
	});

	it('returns null when the show is expired relative to today', () => {
		// Event ends 2021-09-12, which is before 2099 → dropped by the expiry filter.
		expect(buildKktixShow(theatricalEntry, detail, image, '2099-01-01')).toBeNull();
	});

	it('returns null when the url does not match the kktix id regex', () => {
		const bad: FeedEntry = { ...theatricalEntry, url: 'https://example.com/not-kktix' };
		expect(buildKktixShow(bad, detail, image, '2020-01-01')).toBeNull();
	});

	it('builds an entry-fallback Show when detail is null', () => {
		const expected: Show = {
			id: 'kktix:godot/5minutes-0912',
			source: 'kktix',
			sourceId: 'godot/5minutes-0912',
			// falls back to the feed entry title.
			title: '【9/12 場次】果陀劇場舞動音樂劇＜生命中最美好的5分鐘＞線上錄播場',
			category: '音樂劇',
			// all detail-derived fields are null.
			startDate: null,
			endDate: null,
			venue: null,
			city: null,
			onSaleAt: null,
			minPrice: null,
			maxPrice: null,
			imageUrl:
				'https://assets.kktix.io/upload_images/135883/_______5_______1200X630-3_original.jpg',
			url: 'https://godot.kktix.cc/events/5minutes-0912',
			// description falls back to the entry summary when detail is absent.
			description: theatricalEntry.summary ?? null,
			notes: null,
			youthSeat: false,
			introImages: [],
			organizer: null,
			sessions: [],
		};
		expect(buildKktixShow(theatricalEntry, null, image, '2020-01-01')).toEqual(expected);
	});
});
