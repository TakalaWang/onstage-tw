import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it, expect } from 'vitest';
import {
	parseKhamList,
	parseKhamSessions,
	parseKhamDetail,
	buildKhamShow,
	type Listed,
	type KhamDetail,
} from '../kham';
import type { Show, Session } from '../../../types';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'kham');
const read = (name: string) => readFileSync(join(fixturesDir, name), 'utf-8');

const DETAIL_URL = 'https://kham.com.tw/application/UTK02/UTK0201_.aspx?PRODUCT_ID=P19CQHU9';

const list = read('list.html');
const detailHtml = read('detail-P19CQHU9.html');

// Real meta[name=description] content from the detail fixture. parseKhamSessions
// skips the first comma-segment (the title) and turns the rest into sessions.
const DESCRIPTION =
	'舞台劇 你來的時候,國家戲劇院2026年9月11至13日,衛武營國家藝術文化中心 歌劇院2026年9月26日下午2點30分';

const SESSIONS: Session[] = [
	// venue is the text before the first \d{4}年; date is firstDate (the start of the range).
	{ date: '2026-09-11', venue: '國家戲劇院', city: '臺北市', onSaleAt: null },
	{ date: '2026-09-26', venue: '衛武營國家藝術文化中心 歌劇院', city: '高雄市', onSaleAt: null },
];

describe('parseKhamList', () => {
	it('parses #DIV_CATEGORY > a cards into Listed[] with the passed category label', () => {
		const expected: Listed[] = [
			{
				id: 'P19CQHU9',
				title: '舞台劇〈你來的時候〉',
				image:
					'https://imgs2.utiki.com.tw/Data/KHAM/Images/UTK2401/P19CQHU9_RWD.JPG?v=202606041043',
				category: '戲劇',
			},
			{
				id: 'P17IDZEW',
				title: '李國修紀念作品《半里長城》笑噴版 2026台北加演場',
				image:
					'https://imgs2.utiki.com.tw/Data/KHAM/Images/UTK2401/P17IDZEW_RWD.JPG?v=202606041043',
				category: '戲劇',
			},
		];
		expect(parseKhamList(list, '戲劇')).toEqual(expected);
	});
});

describe('parseKhamSessions', () => {
	it('splits the meta description into Session[] (first segment skipped, city derived)', () => {
		expect(parseKhamSessions(DESCRIPTION)).toEqual(SESSIONS);
	});
});

describe('parseKhamDetail', () => {
	it('extracts sessions, onSaleAt, description, introImages, notes, youthSeat', () => {
		const expected: KhamDetail = {
			sessions: SESSIONS,
			// extractOnSale finds the first 開賣 line in #divbtn03 ("開賣時間：2026年04月22日").
			onSaleAt: '2026-04-22T00:00:00+08:00',
			// #divbtn01 holds only an <img>, so htmlToText collapses to null.
			description: null,
			// The 節目介紹 upload image from #divbtn01 (URL-encoded by contentImages).
			introImages: [
				'https://imgs2.utiki.com.tw/Data/KHAM/Upload/%E7%AF%80%E7%9B%AE%E4%BB%8B%E7%B4%B9_2026%E4%BD%A0%E4%BE%86%E7%9A%84%E6%99%82%E5%80%99.jpg',
			],
			// extractHighlights from #divbtn02: duration + suggested age.
			notes: '演出長度約150分鐘(含中場休息20分鐘) · 建議六歲以上觀賞',
			// 青年席 appears in #showInfo (#divbtn03), so hasYouthSeat is true.
			youthSeat: true,
		};
		expect(parseKhamDetail(detailHtml, DETAIL_URL)).toEqual(expected);
	});
});

describe('buildKhamShow', () => {
	const item = parseKhamList(list, '戲劇')[0];
	const detail = parseKhamDetail(detailHtml, DETAIL_URL);

	it('builds the full Show; sessions override venue/city and date range', () => {
		const expected: Show = {
			id: 'kham:P19CQHU9',
			source: 'kham',
			sourceId: 'P19CQHU9',
			title: '舞台劇〈你來的時候〉',
			// classifyGenre matches 舞台劇 in the title, taking precedence over the list
			// category fallback ('戲劇'). The fallback only applies when no pattern matches.
			category: '舞台劇',
			// Derived from the session date range (kham has no list-level dates).
			startDate: '2026-09-11',
			endDate: '2026-09-26',
			// Overridden by sessions[0].
			venue: '國家戲劇院',
			city: '臺北市',
			onSaleAt: '2026-04-22T00:00:00+08:00',
			// minPrice/maxPrice are always null for kham.
			minPrice: null,
			maxPrice: null,
			imageUrl:
				'https://imgs2.utiki.com.tw/Data/KHAM/Images/UTK2401/P19CQHU9_RWD.JPG?v=202606041043',
			url: DETAIL_URL,
			description: null,
			notes: '演出長度約150分鐘(含中場休息20分鐘) · 建議六歲以上觀賞',
			youthSeat: true,
			introImages: [
				'https://imgs2.utiki.com.tw/Data/KHAM/Upload/%E7%AF%80%E7%9B%AE%E4%BB%8B%E7%B4%B9_2026%E4%BD%A0%E4%BE%86%E7%9A%84%E6%99%82%E5%80%99.jpg',
			],
			organizer: null,
			sessions: SESSIONS,
		};
		expect(buildKhamShow(item, detail)).toEqual(expected);
	});

	it('falls back to the list category when the title matches no genre pattern', () => {
		// '半里長城' (item 2) has no classifyGenre pattern, so category falls back to
		// the list label that flowed through parseKhamList → Listed.category.
		const noPatternItem = parseKhamList(list, '戲劇')[1];
		expect(buildKhamShow(noPatternItem, null).category).toBe('戲劇');
	});

	it('builds a FAST-mode Show (no detail): only list fields, date/venue/city null', () => {
		const expected: Show = {
			id: 'kham:P19CQHU9',
			source: 'kham',
			sourceId: 'P19CQHU9',
			title: '舞台劇〈你來的時候〉',
			category: '舞台劇',
			// Without detail there are no sessions, so kham has no dates/venue/city at all.
			startDate: null,
			endDate: null,
			venue: null,
			city: null,
			onSaleAt: null,
			minPrice: null,
			maxPrice: null,
			imageUrl:
				'https://imgs2.utiki.com.tw/Data/KHAM/Images/UTK2401/P19CQHU9_RWD.JPG?v=202606041043',
			url: DETAIL_URL,
			description: null,
			notes: null,
			youthSeat: false,
			introImages: [],
			organizer: null,
			sessions: [],
		};
		expect(buildKhamShow(item, null)).toEqual(expected);
	});
});
