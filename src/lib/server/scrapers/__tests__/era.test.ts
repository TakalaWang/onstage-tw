import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { parseEraList, parseEraDetail, buildEraShow, type Listed, type EraDetail } from '../era';
import type { Show, Session } from '../../../types';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'era');
const read = (name: string) => readFileSync(join(fixturesDir, name), 'utf-8');

const DETAIL_URL = 'https://ticket.com.tw/application/UTK02/UTK0201_.aspx?PRODUCT_ID=P192ILGJ';

const list = read('list.html');
const detailHtml = read('detail-P192ILGJ.html');

const DESCRIPTION = [
	'★為尊重大、小觀眾權益，0歲以上一律一人一票、憑票進場、對號入座。 ',
	'',
	'銀河怪盜現身！勇氣小隊出動！  ',
	'',
	'擁有強大力量的「神祕碎片」被銀河怪盜搶走了！',
	'',
	'巧虎和好朋友們一起勇闖銀河，幫助勇氣隊長找回勇氣，守護宇宙的安全。',
	'',
	'票價 2000 / 1700 / 1500 / 1200 / 900 / 700 / 500',
].join('\n');

const SESSIONS: Session[] = [
	{ date: '2026-06-13', venue: '桃園展演中心展演廳', city: '桃園市', onSaleAt: null },
	{ date: '2026-06-27', venue: '臺北市政大樓親子劇場', city: '臺北市', onSaleAt: null },
];

describe('parseEraList', () => {
	it('parses #shows .moreBox cards into Listed[]', () => {
		const expected: Listed[] = [
			{
				id: 'P192ILGJ',
				title: '2026年夏季巧虎大型舞臺劇「銀河怪盜的祕密」',
				img: 'https://imgs2.utiki.com.tw/Data/ERA/Images/UTK2401/P192ILGJ.JPG?v=202605071056',
				range: { start: '2026-06-13', end: '2026-08-29' },
			},
			{
				id: 'P1889W7X',
				title: '嘉北國小管樂班×嘉頌重奏團《彩虹鴉》',
				img: 'https://imgs2.utiki.com.tw/Data/ERA/Images/UTK2401/P1889W7X.JPG?v=202606021533',
				// Single-day card: extractDateRange yields the same start and end.
				range: { start: '2026-06-24', end: '2026-06-24' },
			},
		];
		expect(parseEraList(list)).toEqual(expected);
	});
});

describe('parseEraDetail', () => {
	it('extracts sessions, prices, description, organizer, notes, youthSeat, introImages', () => {
		const expected: EraDetail = {
			sessions: SESSIONS,
			// Prices aggregated from the session PRICE spans (2000…500).
			minPrice: 500,
			maxPrice: 2000,
			description: DESCRIPTION,
			introImages: [],
			organizer: '日商倍樂生股份有限公司台北分公司',
			// tab-content has no duration/age pattern, so extractHighlights → null.
			notes: null,
			youthSeat: false,
		};
		expect(parseEraDetail(detailHtml, DETAIL_URL)).toEqual(expected);
	});
});

describe('buildEraShow', () => {
	const item = parseEraList(list)[0];
	const detail = parseEraDetail(detailHtml, DETAIL_URL);

	it('builds the full Show; sessions override venue/city and date range', () => {
		const expected: Show = {
			id: 'era:P192ILGJ',
			source: 'era',
			sourceId: 'P192ILGJ',
			title: '2026年夏季巧虎大型舞臺劇「銀河怪盜的祕密」',
			// classifyGenre matches 舞臺劇 → 舞台劇.
			category: '舞台劇',
			// Overridden by the session date range, not the list item's 2026-06-13~2026-08-29.
			startDate: '2026-06-13',
			endDate: '2026-06-27',
			// Overridden by sessions[0].
			venue: '桃園展演中心展演廳',
			city: '桃園市',
			onSaleAt: null,
			minPrice: 500,
			maxPrice: 2000,
			imageUrl: 'https://imgs2.utiki.com.tw/Data/ERA/Images/UTK2401/P192ILGJ.JPG?v=202605071056',
			url: DETAIL_URL,
			description: DESCRIPTION,
			notes: null,
			youthSeat: false,
			introImages: [],
			organizer: '日商倍樂生股份有限公司台北分公司',
			sessions: SESSIONS,
		};
		expect(buildEraShow(item, detail)).toEqual(expected);
	});

	it('builds a FAST-mode Show (no detail): list range/title/img kept, detail fields empty', () => {
		const expected: Show = {
			id: 'era:P192ILGJ',
			source: 'era',
			sourceId: 'P192ILGJ',
			title: '2026年夏季巧虎大型舞臺劇「銀河怪盜的祕密」',
			category: '舞台劇',
			// List item dates are kept when there is no detail.
			startDate: '2026-06-13',
			endDate: '2026-08-29',
			venue: null,
			city: null,
			onSaleAt: null,
			minPrice: null,
			maxPrice: null,
			imageUrl: 'https://imgs2.utiki.com.tw/Data/ERA/Images/UTK2401/P192ILGJ.JPG?v=202605071056',
			url: DETAIL_URL,
			description: null,
			notes: null,
			youthSeat: false,
			introImages: [],
			organizer: null,
			sessions: [],
		};
		expect(buildEraShow(item, null)).toEqual(expected);
	});
});
