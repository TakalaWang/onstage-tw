import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it, expect } from 'vitest';
import {
	parseSearchResponse,
	filterAccupass,
	parseEventLd,
	isoToTaipeiDate,
	buildAccupassShow,
} from '../accupass';
import type { SearchItem, LdEvent } from '../accupass';
import type { Show } from '../../../types';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'accupass');
const readFixture = (name: string) => readFileSync(join(fixturesDir, name), 'utf-8');

const searchJson = JSON.parse(readFixture('search.json'));
const eventHtml = readFixture('event-2512031521171252049410.html');

const theatrical: SearchItem = {
	eventIdNumber: '2512031521171252049410',
	name: '公路喜劇《在深夜公路上不小心轉進回憶裡》',
	photoUrl: 'https://static.accupass.com/eventbanner/2604050634415227426170_P520x260.jpg',
	startDateTime: '2026-06-26T10:00:00Z',
	endDateTime: '2026-06-27T14:00:00Z',
	location: 'Taipei City',
	tags: [{ name: '療癒系' }],
};

const workshop: SearchItem = {
	eventIdNumber: '2604290121156654136910',
	name: '音樂劇歌唱工作坊',
	photoUrl: 'https://static.accupass.com/eventbanner/2604291033151583723399_P520x260.jpg',
	startDateTime: '2026-07-24T01:00:00Z',
	endDateTime: '2026-07-26T12:30:00Z',
	location: 'Pingtung County',
	tags: [{ name: '訓練' }],
};

const nonTheatrical: SearchItem = {
	eventIdNumber: '2603240218262119139194',
	name: '【小小音樂大師課】上低音號 × 三隻小豬｜台北',
	photoUrl: 'https://static.accupass.com/eventbanner/2604242116328498653620_P520x260.jpg',
	startDateTime: '2026-08-15T03:00:00Z',
	endDateTime: '2026-08-16T10:00:00Z',
	location: 'Taipei City',
	tags: [{ name: '幼兒音樂啟蒙' }],
};

describe('parseSearchResponse', () => {
	it('extracts the items array from the SearchEvents response', () => {
		expect(parseSearchResponse(searchJson)).toEqual([theatrical, workshop, nonTheatrical]);
	});

	it('returns [] when items is absent', () => {
		expect(parseSearchResponse({ total: 0 })).toEqual([]);
	});
});

describe('filterAccupass', () => {
	it('keeps theatrical items, dropping the workshop (NON_THEATRE) and the non-theatrical one', () => {
		// 公路喜劇 passes looksTheatrical (喜劇); 音樂劇歌唱工作坊 is dropped by the
		// 工作坊 NON_THEATRE word; the 小小音樂大師課 item has no theatre keyword.
		const kept = filterAccupass([theatrical, workshop, nonTheatrical]);
		expect(kept.map((i) => i.eventIdNumber)).toEqual(['2512031521171252049410']);
	});
});

describe('parseEventLd', () => {
	it('extracts the @type Event ld+json object from the event page', () => {
		const expected = {
			'@type': 'Event',
			name: '公路喜劇《在深夜公路上不小心轉進回憶裡》',
			image: 'https://static.accupass.com/eventbanner/2604050634415227426170.jpg',
			startDate: '2026-06-26T18:00:00+08:00',
			endDate: '2026-06-27T22:00:00+08:00',
			eventStatus: 'https://schema.org/EventScheduled',
			eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
			description:
				'◎ 一段深夜的公路廣播，陪你想起那個很久沒見的人\n◎ 用笑聲與故事，談那些來不及說出口的遺憾\n◎ 相聲 × 廣播 × 公路場景，交織成一場笑中帶淚的旅程\n◎ 木目聲劇團十週年作品，陪你面對那些還沒說完的再見',
			performer: [
				{ '@type': 'Person', name: '洪晧倫' },
				{ '@type': 'Person', name: '鄭易川' },
				{ '@type': 'Person', name: '方宸嵩' },
				{ '@type': 'Person', name: '蔡隼' },
			],
			location: {
				'@type': 'Place',
				address: '台灣台北市大同區西寧北路104號2樓',
				name: '課廳演創空間',
			},
			organizer: {
				'@type': 'Organization',
				name: '木目聲劇團',
				url: 'https://www.accupass.com/organizer/detail/2104300528391822258903',
				logo: 'https://static.accupass.com/org/2201241150224931701220.jpg',
				email: 'tainancomedian@gmail.com',
			},
			'@context': 'https://schema.org',
			// parseEventLd returns the raw parsed ld+json (incl. fields not on the
			// LdEvent interface like @context/performer/eventStatus), so cast via unknown.
		} as unknown as LdEvent;
		expect(parseEventLd(eventHtml)).toEqual(expected);
	});

	it('returns null when no Event ld+json is present', () => {
		expect(parseEventLd('<html><body>no ld+json here</body></html>')).toBeNull();
	});
});

describe('isoToTaipeiDate', () => {
	it('returns null for undefined', () => {
		expect(isoToTaipeiDate(undefined)).toBeNull();
	});

	it('keeps the calendar date for a +08:00 timestamp', () => {
		expect(isoToTaipeiDate('2026-06-26T18:00:00+08:00')).toBe('2026-06-26');
	});

	it('converts a UTC (Z) timestamp into the Asia/Taipei calendar date', () => {
		// 2026-06-27T14:00:00Z is 2026-06-27T22:00:00+08:00 → still 2026-06-27.
		expect(isoToTaipeiDate('2026-06-27T14:00:00Z')).toBe('2026-06-27');
	});
});

describe('buildAccupassShow', () => {
	it('builds the full Show from a search item + ld detail (ld overrides venue/city/dates/image)', () => {
		const ld = parseEventLd(eventHtml);
		const expected: Show = {
			id: 'accupass:2512031521171252049410',
			source: 'accupass',
			sourceId: '2512031521171252049410',
			title: '公路喜劇《在深夜公路上不小心轉進回憶裡》',
			category: '喜劇',
			// ld startDate/endDate.slice(0,10) override the search datetimes.
			startDate: '2026-06-26',
			endDate: '2026-06-27',
			// venue from ld location.name.
			venue: '課廳演創空間',
			// cityFromText(ld address '台灣台北市...') normalises 台→臺 → 臺北市.
			city: '臺北市',
			onSaleAt: null,
			minPrice: null,
			maxPrice: null,
			// ld image overrides the search photoUrl.
			imageUrl: 'https://static.accupass.com/eventbanner/2604050634415227426170.jpg',
			url: 'https://www.accupass.com/event/2512031521171252049410',
			description:
				'◎ 一段深夜的公路廣播，陪你想起那個很久沒見的人 ◎ 用笑聲與故事，談那些來不及說出口的遺憾 ◎ 相聲 × 廣播 × 公路場景，交織成一場笑中帶淚的旅程 ◎ 木目聲劇團十週年作品，陪你面對那些還沒說完的再見',
			notes: null,
			youthSeat: false,
			introImages: [],
			organizer: '木目聲劇團',
			sessions: [],
		};
		expect(buildAccupassShow(theatrical, ld)).toEqual(expected);
	});

	it('builds a search-only Show when ld detail is null', () => {
		const expected: Show = {
			id: 'accupass:2512031521171252049410',
			source: 'accupass',
			sourceId: '2512031521171252049410',
			title: '公路喜劇《在深夜公路上不小心轉進回憶裡》',
			category: '喜劇',
			// dates come from isoToTaipeiDate(search datetimes).
			startDate: '2026-06-26',
			endDate: '2026-06-27',
			venue: null,
			// city from EN_CITY['Taipei City'].
			city: '臺北市',
			onSaleAt: null,
			minPrice: null,
			maxPrice: null,
			// image from the search photoUrl.
			imageUrl: 'https://static.accupass.com/eventbanner/2604050634415227426170_P520x260.jpg',
			url: 'https://www.accupass.com/event/2512031521171252049410',
			// detail-derived fields are null/false.
			description: null,
			notes: null,
			youthSeat: false,
			introImages: [],
			organizer: null,
			sessions: [],
		};
		expect(buildAccupassShow(theatrical, null)).toEqual(expected);
	});
});
