/** Shared scraper helpers: polite fetch, date parsing, HTML cleanup, genre classification. */
import { convert } from 'html-to-text';
import { parse } from 'node-html-parser';
import { findVenue } from '../../venues';

const UA =
	'onstage-tw-aggregator/0.1 (+https://github.com/TakalaWang/onstage-tw; theatre listing aggregator, links back, does not resell)';

export async function politeFetch(url: string, init?: RequestInit): Promise<Response> {
	const res = await fetch(url, {
		...init,
		headers: {
			'User-Agent': UA,
			'Accept-Language': 'zh-TW,zh;q=0.9',
			...(init?.headers ?? {})
		},
		signal: AbortSignal.timeout(20_000)
	});
	if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
	return res;
}

/** Small polite delay so we don't trip a source's rate limiting / IP ban. */
export function sleep(ms: number): Promise<void> {
	return new Promise((r) => setTimeout(r, ms));
}

/** Unix seconds → YYYY-MM-DD in the Taipei timezone. */
export function unixToDate(sec: number | null | undefined): string | null {
	if (!sec) return null;
	return new Date(sec * 1000).toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' });
}

/** Unix seconds → ISO string. */
export function unixToIso(sec: number | null | undefined): string | null {
	if (!sec) return null;
	return new Date(sec * 1000).toISOString();
}

/**
 * Best-effort extraction of YYYY-MM-DD dates from Chinese text
 * (supports 2026/05/30, 2026年5月30日, 2026-05-30).
 * Returns the first and last date found (treated as start/end).
 */
export function extractDateRange(text: string): { start: string | null; end: string | null } {
	const dates: string[] = [];
	const reSlash = /(\d{4})[/.\-年](\d{1,2})[/.\-月](\d{1,2})/g;
	let m: RegExpExecArray | null;
	while ((m = reSlash.exec(text))) {
		const [, y, mo, d] = m;
		dates.push(`${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`);
	}
	if (dates.length === 0) return { start: null, end: null };
	dates.sort();
	return { start: dates[0], end: dates[dates.length - 1] };
}

/** Convert an HTML fragment to clean plain text (used for scraped descriptions). */
export function htmlToText(html: string | null | undefined): string | null {
	if (!html) return null;
	const text = convert(html, {
		wordwrap: false,
		selectors: [
			{ selector: 'a', options: { ignoreHref: true } },
			{ selector: 'img', format: 'skip' }
		]
	})
		.replace(/\n{3,}/g, '\n\n')
		.trim();
	return text || null;
}

/**
 * Pull a few curated, show-specific highlights out of a detail page's notes
 * (which are mostly generic payment/refund boilerplate). We keep only the bits
 * a theatre-goer actually wants — running time and recommended age — and drop
 * the rest, so the surfaced text is tidied rather than pasted wholesale.
 */
export function extractHighlights(text: string | null | undefined): string | null {
	if (!text) return null;
	const t = text.replace(/\s+/g, ' ');
	const parts: string[] = [];

	// Running time: 演出長度約150分鐘 / 全長 60 分鐘 / 演出時間約 90 分鐘（含中場休息20分鐘）
	const dur = t.match(
		/(?:演出長度|演出時間|節目長度|全長|片長)[約為：: ]*((?:約\s*)?\d{1,3}\s*分鐘(?:\s*[（(][^）)]*中場[^）)]*[）)])?)/
	);
	if (dur) {
		const d = dur[1].replace(/\s+/g, '');
		parts.push(`演出長度${d.startsWith('約') ? '' : '約'}${d}`);
	}

	// Recommended age: 建議觀賞年齡：8歲以上 / 建議6歲以上觀賞 / 7歲以上觀眾入場
	const age = t.match(
		/建議(?:觀賞)?(?:年齡[：: ]*)?([\d一二兩三四五六七八九十]{1,3}\s*歲(?:以上)?)/
	);
	if (age) parts.push(`建議${age[1].replace(/\s+/g, '')}觀賞`);

	return parts.length ? parts.join(' · ') : null;
}

// UI chrome / generic promo banners that show up inside intro containers but
// aren't part of the program graphic.
const NON_CONTENT_IMG =
	/step_select|sns_|_RWD\/images\/|\/images\/(icon|btn|button|arrow|spacer|blank|line)|文化幣|culture|facebook|line\.png|\.svg(\?|$)/i;

/**
 * Collect program-intro graphics from a detail container (kham/udn/era put the
 * artwork — sometimes the entire intro — in <img> tags). Keeps only hot-linkable
 * http(s) content images, dropping data: URIs, UI chrome and generic promos.
 */
export function contentImages(
	el:
		| { querySelectorAll: (s: string) => { getAttribute: (a: string) => string | null | undefined }[] }
		| null
		| undefined,
	baseUrl?: string
): string[] {
	if (!el) return [];
	const urls: string[] = [];
	for (const im of el.querySelectorAll('img')) {
		const raw = im.getAttribute('src') || im.getAttribute('data-original') || '';
		if (!raw || raw.startsWith('data:')) continue; // skip inline data: URIs
		// Resolve protocol-relative / root-relative / relative src against the page URL.
		let abs = raw;
		if (baseUrl) {
			try {
				abs = new URL(raw, baseUrl).href;
			} catch {
				/* keep raw */
			}
		}
		if (!/^https?:\/\//i.test(abs)) continue;
		let decoded = abs;
		try {
			decoded = decodeURIComponent(abs);
		} catch {
			/* keep abs */
		}
		if (NON_CONTENT_IMG.test(decoded)) continue;
		// Upgrade to https so the image isn't blocked as mixed content on our https site.
		const url = abs.replace(/^http:\/\//i, 'https://');
		if (!urls.includes(url)) urls.push(url);
		if (urls.length >= 8) break;
	}
	return urls;
}

/** Extract the on-sale time from text. Returns ISO at day granularity. */
export function extractOnSale(text: string): string | null {
	const idx = text.search(/開賣|售票時間|啟售|開始售票/);
	if (idx < 0) return null;
	const window = text.slice(idx, idx + 60);
	const { start } = extractDateRange(window);
	return start ? `${start}T00:00:00+08:00` : null;
}

// Sub-genre buckets, checked top to bottom; first match wins.
const GENRE_PATTERNS: [string, RegExp][] = [
	['戲曲', /歌仔戲|歌仔|京劇|國劇|崑曲|崑劇|豫劇|粵劇|川劇|南管|北管|亂彈|客家大戲|客家戲|梨園|歌仔調|戲曲|傳統戲/],
	['偶戲', /布袋戲|掌中|偶戲|戲偶|皮影|光影偶|懸絲偶/],
	['音樂劇', /音樂劇|歌舞劇|musical/i],
	['兒童親子', /兒童劇|親子|紙風車|如果兒童|童話|繪本|寶寶/],
	['相聲', /相聲/],
	['喜劇', /脫口秀|單口|漫才|即興|喜劇|roast|stand[\s-]?up/i],
	['舞台劇', /舞台劇|舞臺劇|話劇/]
];

/**
 * Parse a utiki-platform detail page (shared by ERA and udn) for the fields
 * that aren't on the listing page: on-sale time, venue, and lowest price.
 */
export function parseUtikiDetail(html: string): {
	onSaleAt: string | null;
	venue: string | null;
	minPrice: number | null;
} {
	const root = parse(html);
	const orderStart = root.querySelector('[id*="S_ORDER_DATE"]')?.text ?? '';
	const onSaleStart = extractDateRange(orderStart).start;
	const venue =
		root
			.querySelectorAll('[id*="PLACE_NAME"]')
			.map((e) => e.text.trim())
			.find((t) => t.length > 0) ?? null;
	const priceText = root
		.querySelectorAll('[id*="_PRICE"]')
		.map((e) => e.text)
		.join(' ');
	const prices = (priceText.match(/\d[\d,]{1,6}/g) ?? []).map((n) => Number(n.replace(/,/g, '')));
	return {
		onSaleAt: onSaleStart ? `${onSaleStart}T00:00:00+08:00` : null,
		venue,
		minPrice: prices.length ? Math.min(...prices) : null
	};
}

/**
 * Extract the first YYYY-MM-DD date from a mixed Chinese/Western text snippet,
 * e.g. "2026/06/12 (五) 19:00" or "2026年9月11日" → "2026-06-12" / "2026-09-11".
 * Returns null when no date is found.
 */
export function firstDate(text: string | null | undefined): string | null {
	if (!text) return null;
	return extractDateRange(text).start;
}

/**
 * Extract a [min, max] numeric price range from a text snippet that may contain
 * one price, a list of prices, or a "900 ~ 3,000" style range. Returns nulls
 * when no price-like numbers are present.
 */
export function extractPriceRange(text: string | null | undefined): {
	minPrice: number | null;
	maxPrice: number | null;
} {
	if (!text) return { minPrice: null, maxPrice: null };
	const nums = (text.match(/\d[\d,]{1,6}/g) ?? []).map((n) => Number(n.replace(/,/g, '')));
	if (!nums.length) return { minPrice: null, maxPrice: null };
	return { minPrice: Math.min(...nums), maxPrice: Math.max(...nums) };
}

/** Given session dates (YYYY-MM-DD, may contain nulls), return earliest/latest. */
export function dateRangeFromDates(dates: (string | null)[]): {
	start: string | null;
	end: string | null;
} {
	const valid = dates.filter((d): d is string => !!d).sort();
	if (!valid.length) return { start: null, end: null };
	return { start: valid[0], end: valid[valid.length - 1] };
}

const TW_CITIES = [
	'臺北市', '台北市', '新北市', '基隆市', '桃園市', '新竹市', '新竹縣', '苗栗縣',
	'臺中市', '台中市', '彰化縣', '南投縣', '雲林縣', '嘉義市', '嘉義縣',
	'臺南市', '台南市', '高雄市', '屏東縣', '宜蘭縣', '花蓮縣', '臺東縣', '台東縣',
	'澎湖縣', '金門縣', '連江縣'
];

// Well-known venues whose names don't contain a city token → map to a city.
const VENUE_CITY: [RegExp, string][] = [
	[/國家戲劇院|國家音樂廳|兩廳院|實驗劇場|演奏廳|臺灣戲曲中心|臺北表演藝術中心|北藝中心|水源劇場|城市舞台|臺北流行音樂中心|台北流行音樂中心|國父紀念館|中山堂|西門紅樓|紅樓劇場|牯嶺街|松山文創|松菸|大稻埕|Legacy Taipei|Zepp New Taipei|Clapper|Comedy|卡米地|Legacy TERA/i, '臺北市'],
	[/新莊文化藝術中心|新北市藝文中心|蘆洲|淡水/i, '新北市'],
	[/衛武營|高雄流行音樂中心|駁二|大東文化藝術中心|高雄市文化中心|高雄文化中心|高雄市音樂館|高雄科工館/i, '高雄市'],
	[/臺中國家歌劇院|台中國家歌劇院|葫蘆墩|臺中市葫蘆墩|中山堂.*臺中|纳豆|納豆/i, '臺中市'],
	[/臺南文化中心|台南文化中心|南瀛|涴莎|臺南藝術|臺南市立|文賢|321巷/i, '臺南市'],
	[/嘉義縣表演藝術中心|嘉義市政府文化局|嘉義市文化局|嘉北/i, '嘉義市'],
	[/新竹市文化局|新竹縣文化局|鐵玫瑰|新竹市政府文化局/i, '新竹市'],
	[/桃園展演中心|桃園藝文特區|中壢藝術館|桃園市政府文化局|陽光劇場/i, '桃園市'],
	[/宜蘭演藝廳|宜蘭縣政府文化局/i, '宜蘭縣'],
	[/員林演藝廳|彰化縣立|彰化縣員林/i, '彰化縣'],
	[/雲林表演廳|雲林縣政府文化處/i, '雲林縣'],
	[/屏東藝術館|屏東縣政府文化處/i, '屏東縣'],
	[/花蓮縣文化局|花蓮文化創意/i, '花蓮縣'],
	[/臺東縣政府文化處|台東縣政府文化處/i, '臺東縣'],
	[/基隆市文化局|基隆文化中心/i, '基隆市']
];

/** Pull a normalised Taiwan city (臺/台 unified) from an address or venue string. */
export function cityFromText(text: string | null | undefined): string | null {
	if (!text) return null;
	for (const c of TW_CITIES) if (text.includes(c)) return c.replace('台', '臺');
	const venue = findVenue(text); // richer venue registry (also powers the map)
	if (venue) return venue.city;
	for (const [re, city] of VENUE_CITY) if (re.test(text)) return city;
	return null;
}

/** For mixed-content sources (e.g. some KKTIX organizers), decide if an event is theatre. */
const THEATRE_WORDS =
	/音樂劇|舞台劇|舞臺劇|戲劇|劇場|話劇|即興|脫口秀|喜劇|漫才|兒童劇|親子劇|歌仔戲|布袋戲|偶戲|相聲|戲曲/;
const NON_THEATRE_WORDS =
	/演唱會|巡迴演唱|售票演唱|研習|工作坊|課程|報名|營隊|住宿|講座|簽書會|簽名會|見面會|fan\s*meeting|粉絲|球賽|路跑|展覽/i;

export function looksTheatrical(...texts: (string | null | undefined)[]): boolean {
	const hay = texts.filter(Boolean).join(' ');
	if (NON_THEATRE_WORDS.test(hay)) return false;
	return THEATRE_WORDS.test(hay);
}

/**
 * Classify a show into a finer theatre sub-genre from its title.
 * Returns the matched genre label, or `fallback` when nothing matches.
 */
export function classifyGenre(title: string, fallback: string | null = '戲劇'): string | null {
	for (const [label, re] of GENRE_PATTERNS) if (re.test(title)) return label;
	return fallback;
}
