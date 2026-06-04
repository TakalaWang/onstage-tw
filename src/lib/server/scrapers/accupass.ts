import type { Show, Session } from '../../types';
import {
	politeFetch,
	sleep,
	classifyGenre,
	looksTheatrical,
	cityFromText,
	htmlToText,
	hasYouthSeat,
} from './util';

const SEARCH_API = 'https://api.accupass.com/v3/search/SearchEvents';
const EVENT_URL = (id: string) => `https://www.accupass.com/event/${id}`;

const KEYWORDS = [
	'音樂劇',
	'舞台劇',
	'戲劇',
	'劇場',
	'話劇',
	'即興',
	'脫口秀',
	'喜劇',
	'兒童劇',
	'歌仔戲',
	'相聲',
	'偶戲',
];

const PAGES_PER_KEYWORD = 2;
const MAX_DETAIL_FETCHES = 80;

const EXTRA_NON_THEATRE =
	/線上課|學士班|碩士班|進修|招生|甄試|導覽|讀書|書店|工藝|體驗營|夏令營|冬令營|營隊|徵件|徵選|甄選|比賽|競賽/;

const EN_CITY: Record<string, string> = {
	'Taipei City': '臺北市',
	'New Taipei City': '新北市',
	'Keelung City': '基隆市',
	'Taoyuan City': '桃園市',
	'Hsinchu City': '新竹市',
	'Hsinchu County': '新竹縣',
	'Miaoli County': '苗栗縣',
	'Taichung City': '臺中市',
	'Changhua County': '彰化縣',
	'Nantou County': '南投縣',
	'Yunlin County': '雲林縣',
	'Chiayi City': '嘉義市',
	'Chiayi County': '嘉義縣',
	'Tainan City': '臺南市',
	'Kaohsiung City': '高雄市',
	'Pingtung County': '屏東縣',
	'Yilan County': '宜蘭縣',
	'Hualien County': '花蓮縣',
	'Taitung County': '臺東縣',
	'Penghu County': '澎湖縣',
	'Kinmen County': '金門縣',
	'Lienchiang County': '連江縣',
};

export interface SearchItem {
	eventIdNumber: string;
	name: string;
	photoUrl?: string;
	startDateTime?: string;
	endDateTime?: string;
	location?: string;
	tags?: { name: string }[];
}

interface SearchResponse {
	total?: number;
	items?: SearchItem[];
}

export interface LdEvent {
	'@type'?: string;
	name?: string;
	startDate?: string;
	endDate?: string;
	description?: string;
	image?: string;
	location?: { name?: string; address?: string };
	organizer?: { name?: string };
}

export function isoToTaipeiDate(iso: string | undefined): string | null {
	if (!iso) return null;
	const t = new Date(iso);
	if (Number.isNaN(t.getTime())) return null;
	return t.toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' });
}

export function parseSearchResponse(json: unknown): SearchItem[] {
	const data = json as SearchResponse;
	return data.items ?? [];
}

export function filterAccupass(items: SearchItem[]): SearchItem[] {
	return items.filter((it) => {
		const tagText = (it.tags ?? []).map((t) => t.name).join(' ');
		if (EXTRA_NON_THEATRE.test(it.name)) return false;
		return looksTheatrical(it.name, tagText);
	});
}

export function buildAccupassShow(item: SearchItem, ld: LdEvent | null): Show {
	const id = item.eventIdNumber;
	let venue: string | null = null;
	let city: string | null = item.location ? (EN_CITY[item.location] ?? null) : null;
	let description: string | null = null;
	let organizer: string | null = null;
	let youthSeat = false;
	let imageUrl: string | null = item.photoUrl ?? null;
	let startDate = isoToTaipeiDate(item.startDateTime);
	let endDate = isoToTaipeiDate(item.endDateTime);

	if (ld) {
		venue = ld.location?.name ?? venue;
		city = cityFromText(ld.location?.address ?? ld.location?.name) ?? city;
		description = htmlToText(ld.description);
		youthSeat = hasYouthSeat(ld.description);
		organizer = ld.organizer?.name ?? null;
		imageUrl = ld.image ?? imageUrl;
		startDate = ld.startDate ? ld.startDate.slice(0, 10) : startDate;
		endDate = ld.endDate ? ld.endDate.slice(0, 10) : endDate;
	}

	return {
		id: `accupass:${id}`,
		source: 'accupass',
		sourceId: id,
		title: item.name,
		category: classifyGenre(item.name),
		startDate,
		endDate,
		venue,
		city,
		onSaleAt: null,
		minPrice: null,
		maxPrice: null,
		imageUrl,
		url: EVENT_URL(id),
		description,
		notes: null,
		youthSeat,
		introImages: [],
		organizer,
		sessions: [] as Session[],
	};
}

async function searchPage(keyword: string, currentIndex: number): Promise<SearchItem[]> {
	try {
		const res = await politeFetch(SEARCH_API, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', referer: 'https://www.accupass.com/' },
			body: JSON.stringify({
				categoryTypeList: [],
				simpleEventPlaceTypeList: [],
				cityLocationList: [],
				sortBy: '4',
				timeType: '0',
				keyword,
				currentIndex,
			}),
		});
		return parseSearchResponse(await res.json());
	} catch {
		return [];
	}
}

export function parseEventLd(html: string): LdEvent | null {
	const blocks = html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi);
	for (const m of blocks) {
		try {
			const parsed = JSON.parse(m[1].trim());
			const arr = Array.isArray(parsed) ? parsed : [parsed];
			const ev = arr.find((o) => o && o['@type'] === 'Event');
			if (ev) return ev as LdEvent;
		} catch {}
	}
	return null;
}

export async function scrapeAccupass(): Promise<Show[]> {
	try {
		const fast = process.env.ONSTAGE_FAST === '1';

		const candidates = new Map<string, SearchItem>();
		for (const keyword of KEYWORDS) {
			for (let page = 0; page < PAGES_PER_KEYWORD; page++) {
				const items = await searchPage(keyword, page);
				if (items.length === 0) break;
				for (const it of items) {
					if (it.eventIdNumber && !candidates.has(it.eventIdNumber)) {
						candidates.set(it.eventIdNumber, it);
					}
				}
				await sleep(400);
			}
		}

		const kept = filterAccupass([...candidates.values()]);

		const shows: Show[] = [];
		let detailFetches = 0;
		for (const it of kept) {
			const id = it.eventIdNumber;
			let ld: LdEvent | null = null;

			if (!fast && detailFetches < MAX_DETAIL_FETCHES) {
				try {
					const page = await politeFetch(EVENT_URL(id));
					ld = parseEventLd(await page.text());
					detailFetches++;
					await sleep(400);
				} catch {}
			}

			shows.push(buildAccupassShow(it, ld));
		}
		return shows;
	} catch {
		return [];
	}
}
