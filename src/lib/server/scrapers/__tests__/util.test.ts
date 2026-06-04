import { describe, it, expect } from 'vitest';
import {
	extractDateRange,
	cityFromText,
	looksTheatrical,
	classifyGenre,
	extractPriceRange,
	extractOnSale,
	extractHighlights,
	dateRangeFromDates,
	firstDate,
	hasYouthSeat,
	unixToDate,
	unixToIso,
	htmlToText,
	parseUtikiDetail,
} from '../util';

describe('extractDateRange', () => {
	it.each([
		['年/月/日 separators', '2025年1月9日', { start: '2025-01-09', end: '2025-01-09' }],
		['slash separators', '2024/3/5', { start: '2024-03-05', end: '2024-03-05' }],
		['dot separators', '2024.3.5', { start: '2024-03-05', end: '2024-03-05' }],
		['dash separators', '2024-03-05', { start: '2024-03-05', end: '2024-03-05' }],
		// separator chars are a single character class, so they can mix within one date
		['mixed separators within a date', '2024年3/5', { start: '2024-03-05', end: '2024-03-05' }],
		[
			'multiple dates → min/max (string sort)',
			'2024/12/01 至 2024/02/03',
			{ start: '2024-02-03', end: '2024-12-01' },
		],
		['no dates', 'no dates here', { start: null, end: null }],
		['empty string', '', { start: null, end: null }],
	])('%s', (_label, input, expected) => {
		expect(extractDateRange(input)).toEqual(expected);
	});
});

describe('cityFromText', () => {
	it.each([
		// TW_CITIES list, with 台→臺 normalization
		['台北市 normalized to 臺北市', '台北市', '臺北市'],
		['already-臺 city', '高雄市', '高雄市'],
		['新北市', '新北市', '新北市'],
		// VENUE_CITY regex table
		['牯嶺街 venue → 臺北市', '牯嶺街小劇場', '臺北市'],
		['新莊文化藝術中心 → 新北市', '新莊文化藝術中心', '新北市'],
		['駁二 → 高雄市', '駁二藝術特區', '高雄市'],
		// findVenue (venues.ts) alias resolution
		['衛武營 alias → 高雄市 via findVenue', '衛武營', '高雄市'],
		// no match
		['no match', 'somewhere unrelated', null],
	])('%s', (_label, input, expected) => {
		expect(cityFromText(input)).toBe(expected);
	});

	it('returns null for null/undefined', () => {
		expect(cityFromText(null)).toBeNull();
		expect(cityFromText(undefined)).toBeNull();
	});
});

describe('looksTheatrical', () => {
	it.each([
		['舞台劇', true],
		['音樂劇', true],
		['歌仔戲', true],
		['脫口秀', true],
		['相聲', true],
		['演唱會', false],
		['講座', false],
		['工作坊', false],
		['粉絲見面會', false],
	])('single arg %s → %s', (input, expected) => {
		expect(looksTheatrical(input)).toBe(expected);
	});

	it('non-theatre word overrides a theatre word', () => {
		expect(looksTheatrical('演唱會 舞台劇')).toBe(false);
	});

	it('joins multiple args before matching', () => {
		expect(looksTheatrical('演唱', '會')).toBe(false);
		expect(looksTheatrical('舞台', '劇')).toBe(false); // joined with space → "舞台 劇"
		expect(looksTheatrical('好看的', '舞台劇')).toBe(true);
	});

	it('filters out falsy args', () => {
		expect(looksTheatrical(null, undefined, '舞台劇')).toBe(true);
		expect(looksTheatrical(null, undefined)).toBe(false);
	});
});

describe('classifyGenre', () => {
	it.each([
		['歌仔戲', '戲曲'],
		['京劇', '戲曲'],
		['布袋戲', '偶戲'],
		['百老匯音樂劇', '音樂劇'],
		['Musical Night', '音樂劇'],
		['紙風車兒童劇', '兒童親子'],
		['相聲瓦舍', '相聲'],
		['搞笑脫口秀', '喜劇'],
		['經典舞台劇', '舞台劇'],
	])('classifies %s as %s', (title, expected) => {
		expect(classifyGenre(title)).toBe(expected);
	});

	it('uses default fallback when nothing matches', () => {
		expect(classifyGenre('某個節目')).toBe('戲劇');
	});

	it('honours a custom fallback (including null)', () => {
		expect(classifyGenre('某個節目', null)).toBeNull();
		expect(classifyGenre('某個節目', '其他')).toBe('其他');
	});
});

describe('extractPriceRange', () => {
	it('extracts min/max from comma-separated numbers', () => {
		expect(extractPriceRange('票價 500, 1,200, 800')).toEqual({ minPrice: 500, maxPrice: 1200 });
	});

	it('single price', () => {
		expect(extractPriceRange('全票 600')).toEqual({ minPrice: 600, maxPrice: 600 });
	});

	it('no numbers → nulls', () => {
		expect(extractPriceRange('免費入場')).toEqual({ minPrice: null, maxPrice: null });
	});

	it('null/undefined → nulls', () => {
		expect(extractPriceRange(null)).toEqual({ minPrice: null, maxPrice: null });
		expect(extractPriceRange(undefined)).toEqual({ minPrice: null, maxPrice: null });
	});
});

describe('extractOnSale', () => {
	it.each([
		['開賣 keyword', '開賣 2025/01/15 開始', '2025-01-15T00:00:00+08:00'],
		['售票時間 keyword', '售票時間：2025/03/20', '2025-03-20T00:00:00+08:00'],
		['啟售 keyword', '啟售 2025/04/01', '2025-04-01T00:00:00+08:00'],
	])('%s → +08:00 timestamp', (_label, input, expected) => {
		expect(extractOnSale(input)).toBe(expected);
	});

	it('keyword present but no date within window → null', () => {
		expect(extractOnSale('開賣 敬請期待')).toBeNull();
	});

	it('no keyword → null', () => {
		expect(extractOnSale('沒有相關資訊')).toBeNull();
	});
});

describe('extractHighlights', () => {
	it('extracts duration and prefixes 約 when missing', () => {
		expect(extractHighlights('演出長度：90分鐘')).toBe('演出長度約90分鐘');
	});

	it('keeps existing 約 without doubling', () => {
		expect(extractHighlights('演出長度約120分鐘')).toBe('演出長度約120分鐘');
	});

	it('extracts suggested age', () => {
		expect(extractHighlights('建議7歲以上觀賞')).toBe('建議7歲以上觀賞');
	});

	it('combines duration and age with separator', () => {
		expect(extractHighlights('演出時間100分鐘 建議年齡：6歲以上')).toBe(
			'演出長度約100分鐘 · 建議6歲以上觀賞',
		);
	});

	it('no relevant info → null', () => {
		expect(extractHighlights('nothing relevant here')).toBeNull();
	});

	it('null/undefined → null', () => {
		expect(extractHighlights(null)).toBeNull();
		expect(extractHighlights(undefined)).toBeNull();
	});
});

describe('dateRangeFromDates', () => {
	it('filters falsy values and returns min/max', () => {
		expect(dateRangeFromDates(['2024-05-01', null, '2024-01-01'])).toEqual({
			start: '2024-01-01',
			end: '2024-05-01',
		});
	});

	it('all-null input → nulls', () => {
		expect(dateRangeFromDates([null])).toEqual({ start: null, end: null });
		expect(dateRangeFromDates([])).toEqual({ start: null, end: null });
	});
});

describe('firstDate', () => {
	it('returns earliest date in text', () => {
		expect(firstDate('2024/05/01 2024/01/01')).toBe('2024-01-01');
	});

	it('returns null when no date', () => {
		expect(firstDate('no date')).toBeNull();
	});

	it('null/undefined → null', () => {
		expect(firstDate(null)).toBeNull();
		expect(firstDate(undefined)).toBeNull();
	});
});

describe('hasYouthSeat', () => {
	it.each([
		[['有青年席'], true],
		[['提供青年票優惠'], true],
		[['青年方案'], true],
		[['青年優惠'], true],
		[['一般座位'], false],
	])('%j → %s', (texts, expected) => {
		expect(hasYouthSeat(...texts)).toBe(expected);
	});

	it('matches across joined args, ignoring falsy', () => {
		expect(hasYouthSeat('普通', null, '青年票')).toBe(true);
		expect(hasYouthSeat(null, undefined)).toBe(false);
	});
});

describe('unixToDate', () => {
	it('converts seconds to Asia/Taipei calendar date', () => {
		// 2024-01-01T00:00:00Z → 2024-01-01 08:00 Taipei
		expect(unixToDate(1704067200)).toBe('2024-01-01');
	});

	it.each([
		['zero', 0],
		['null', null],
		['undefined', undefined],
	])('%s → null', (_label, input) => {
		expect(unixToDate(input)).toBeNull();
	});
});

describe('unixToIso', () => {
	it('converts seconds to ISO string (UTC)', () => {
		expect(unixToIso(1704067200)).toBe('2024-01-01T00:00:00.000Z');
	});

	it.each([
		['zero', 0],
		['null', null],
		['undefined', undefined],
	])('%s → null', (_label, input) => {
		expect(unixToIso(input)).toBeNull();
	});
});

describe('htmlToText', () => {
	it('strips tags and ignores hrefs on anchors', () => {
		expect(htmlToText('<p>Hello <a href="https://x">link</a></p>')).toBe('Hello link');
	});

	it('collapses 3+ newlines to a blank line', () => {
		expect(htmlToText('<p>A</p><p>B</p><p>C</p>')).toBe('A\n\nB\n\nC');
	});

	it.each([
		['null', null],
		['undefined', undefined],
		['empty', ''],
	])('%s → null', (_label, input) => {
		expect(htmlToText(input)).toBeNull();
	});
});

describe('parseUtikiDetail', () => {
	it('extracts onSaleAt, venue and min price from element ids', () => {
		const html =
			'<div id="S_ORDER_DATE">2025/01/15</div>' +
			'<span id="PLACE_NAME"> 衛武營 </span>' +
			'<div id="A_PRICE">500</div>' +
			'<div id="B_PRICE">1,200</div>';
		expect(parseUtikiDetail(html)).toEqual({
			onSaleAt: '2025-01-15T00:00:00+08:00',
			venue: '衛武營',
			minPrice: 500,
		});
	});

	it('returns nulls when nothing matches', () => {
		expect(parseUtikiDetail('<div>no relevant ids</div>')).toEqual({
			onSaleAt: null,
			venue: null,
			minPrice: null,
		});
	});
});
