import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it, expect } from 'vitest';
import {
	parseUdnList,
	parseUdnSessions,
	parseUdnDetail,
	buildUdnShow,
	type Listed,
	type UdnDetail,
} from '../udn';
import type { Show, Session } from '../../../types';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'udn');
const read = (name: string) => readFileSync(join(fixturesDir, name), 'utf-8');

const DETAIL_URL =
	'https://tickets.udnfunlife.com/application/UTK02/UTK0201_.aspx?PRODUCT_ID=P14XCO98';

const list = JSON.parse(read('list.json'));

// The trimmed showIntro keeps the lead anchor, the bullet highlights, the first
// two content sections, and all 7 images. htmlToText collapses it to this.
const DESCRIPTION = [
	'自2026年1月13日起雙人套票9折\u00a0由此進入',
	'',
	'一場充滿詩意的奇幻之旅，\u00a0',
	'獻給所有渴求童真與純粹歡樂的大小朋友\u00a0',
	'',
	'✨睽違九年再度登台，首度北中高三地巡演\u00a0',
	'✨全球巡演30年，走遍數百座城市、上萬場演出\u00a0',
	'✨累積觀眾突破千萬，橫掃世界口碑的經典丑劇傳奇\u00a0',
	'✨300萬片「雪花」跨越語言與年齡，超沈浸的夢幻劇場體驗\u00a0',
	'✨榮獲奧利佛獎「最佳娛樂節目獎」、百老匯戲劇桌獎 「獨特戲劇體驗獎」等多項國際大獎項肯定',
	'',
	'席捲全球的「劇場暴風雪」，2026年夏天再度降臨！',
	'',
	'｜活動內容',
	'❄ 風靡全球的丑劇傳奇',
	'',
	'由丑劇大師——斯拉法·帕拉尼（Slava Polunin）打造的經典作品《下雪了》自1993年首演以來，以夢幻體驗與細膩情感風靡超過40國、數百個城市，吸引了超過1200萬觀眾，好評不斷。作品曾榮獲奧利佛獎「最佳娛樂節目獎」、百老匯戲劇桌獎「獨特戲劇體驗獎」等多項國際大獎肯定，堪稱劇場的傳奇之作，一生必看的劇場魔法。',
	'',
	'❄ 感動與童心的回歸\u00a0',
	'',
	'故事由天真的主角黃色小丑「Yellow」與一群奇異、充滿好奇心的綠色小丑「Grynzzz」展開，帶領觀眾進入一場充滿幻想與詩意的白色冒險。Yellow在旅程中與Grynzzz建立友情、面對孤獨，最終在風雪中消失。全劇沒有台詞，用肢體、音樂和光影探索關於友情、喜悅、孤獨、好奇等情感與故事，打破文化與年齡的界限，讓每位觀眾都能從中找到屬於自己的感動與歡樂。',
	'',
	'彩虹泡泡漫天飛舞、白色「蜘蛛網」層層覆蓋、「暴風雪」撲面而來、巨型彩球從天而降...各種沈浸式體驗宛如置身童話世界，保證顛覆你對劇場的所有想像！這部讓大朋友找回童心、讓小朋友目不轉睛的夢幻作品將於2026年夏天重返台灣，並首度開展北中高三地巡演，絕對不容錯過！',
	'',
	'｜創作人介紹',
	'',
	'斯拉法・帕拉尼（Slava Polunin）',
].join('\n');

const INTRO_IMAGES = [
	'https://imgs2.utiki.com.tw/Data/UTIKI_UDN/Images/UTK2411/P1AEB9NX.JPG',
	'https://imgs2.utiki.com.tw/Data/UTIKI_UDN/Images/UTK2411/P154IW9C.JPG',
	'https://imgs2.utiki.com.tw/Data/UTIKI_UDN/Images/UTK2411/P154IW9D.JPG',
	'https://imgs2.utiki.com.tw/Data/UTIKI_UDN/Images/UTK2411/P154J11M.JPG',
	'https://imgs2.utiki.com.tw/Data/UTIKI_UDN/Images/UTK2411/P154J11N.JPG',
	'https://imgs2.utiki.com.tw/Data/UTIKI_UDN/Images/UTK2411/P154J11O.JPG',
	'https://imgs2.utiki.com.tw/Data/UTIKI_UDN/Images/UTK2411/P154J11P.JPG',
];

describe('parseUdnList', () => {
	it('parses .yd_card blocks of one category into Listed[]', () => {
		const expected: Listed[] = [
			{
				id: 'P14XCO98',
				title: '丑劇大師─斯拉法《下雪了》',
				img: 'https://imgs2.utiki.com.tw/Data/UTIKI_UDN//Images/UTK2401/P14XCO98_Product_202605110944292347.JPG?v=202605111123',
				startDate: '2025-12-26',
				endDate: '2026-06-28',
				venue: '衛武營國家藝術文化中心 歌劇院,臺中國家歌劇院 大劇院,臺北表演藝術中心 大劇院',
				minPrice: 900,
			},
			{
				id: 'P137BHCT',
				title: '舞台劇《謝謝大家收看》',
				img: 'https://imgs2.utiki.com.tw/Data/UTIKI_UDN//Images/UTK2401/P137BHCT_Product.JPG?v=202604160843',
				startDate: '2025-11-08',
				endDate: '2026-06-28',
				// This trimmed card has no [itemprop=location] node, so venue is null.
				venue: null,
				minPrice: 800,
			},
		];
		expect(parseUdnList(list)).toEqual(expected);
	});
});

describe('parseUdnSessions', () => {
	it('parses .yd_session-block blocks into Session[] with derived city', () => {
		const expected: Session[] = [
			{
				date: '2026-06-12',
				venue: '衛武營國家藝術文化中心 歌劇院',
				city: '高雄市',
				onSaleAt: null,
			},
			{
				date: '2026-06-19',
				venue: '臺中國家歌劇院 大劇院',
				city: '臺中市',
				onSaleAt: null,
			},
		];
		expect(parseUdnSessions(read('sessions-P14XCO98.html'))).toEqual(expected);
	});
});

describe('parseUdnDetail', () => {
	it('extracts price range, description, intro images, notes, youthSeat', () => {
		const expected: UdnDetail = {
			minPrice: 900,
			maxPrice: 3000,
			description: DESCRIPTION,
			introImages: INTRO_IMAGES,
			notes: '建議8歲以上觀賞',
			youthSeat: true,
		};
		expect(parseUdnDetail(read('detail-P14XCO98.html'), DETAIL_URL)).toEqual(expected);
	});
});

describe('buildUdnShow', () => {
	const item = parseUdnList(list)[0];
	const sessions = parseUdnSessions(read('sessions-P14XCO98.html'));
	const detail = parseUdnDetail(read('detail-P14XCO98.html'), DETAIL_URL);

	it('builds the full Show; sessions override venue/city and date range', () => {
		const expected: Show = {
			id: 'udn:P14XCO98',
			source: 'udn',
			sourceId: 'P14XCO98',
			title: '丑劇大師─斯拉法《下雪了》',
			// classifyGenre has no clown/physical-theatre pattern, so the title falls
			// through to the default '戲劇'.
			category: '戲劇',
			// Overridden by the session date range, not the list item's 2025-12-26~2026-06-28.
			startDate: '2026-06-12',
			endDate: '2026-06-19',
			// Overridden by sessions[0], not the list item's multi-venue string.
			venue: '衛武營國家藝術文化中心 歌劇院',
			city: '高雄市',
			onSaleAt: null,
			minPrice: 900,
			maxPrice: 3000,
			imageUrl:
				'https://imgs2.utiki.com.tw/Data/UTIKI_UDN//Images/UTK2401/P14XCO98_Product_202605110944292347.JPG?v=202605111123',
			url: DETAIL_URL,
			description: DESCRIPTION,
			notes: '建議8歲以上觀賞',
			youthSeat: true,
			introImages: INTRO_IMAGES,
			organizer: null,
			sessions,
		};
		expect(buildUdnShow(item, sessions, detail)).toEqual(expected);
	});

	it('builds a FAST-mode Show (no sessions, no detail): list fields preserved', () => {
		const expected: Show = {
			id: 'udn:P14XCO98',
			source: 'udn',
			sourceId: 'P14XCO98',
			title: '丑劇大師─斯拉法《下雪了》',
			category: '戲劇',
			// List item dates are kept when there are no sessions.
			startDate: '2025-12-26',
			endDate: '2026-06-28',
			venue: '衛武營國家藝術文化中心 歌劇院,臺中國家歌劇院 大劇院,臺北表演藝術中心 大劇院',
			// city derived from the list venue string via cityFromText (衛武營 → 高雄市).
			city: '高雄市',
			onSaleAt: null,
			minPrice: 900,
			maxPrice: null,
			imageUrl:
				'https://imgs2.utiki.com.tw/Data/UTIKI_UDN//Images/UTK2401/P14XCO98_Product_202605110944292347.JPG?v=202605111123',
			url: DETAIL_URL,
			description: null,
			notes: null,
			youthSeat: false,
			introImages: [],
			organizer: null,
			sessions: [],
		};
		expect(buildUdnShow(item, [], null)).toEqual(expected);
	});
});
