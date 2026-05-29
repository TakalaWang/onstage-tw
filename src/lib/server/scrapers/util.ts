/** Shared scraper helpers: polite fetch, date parsing, HTML cleanup, genre classification. */
import { convert } from 'html-to-text';
import { parse } from 'node-html-parser';

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

const TW_CITIES = [
	'臺北市', '台北市', '新北市', '基隆市', '桃園市', '新竹市', '新竹縣', '苗栗縣',
	'臺中市', '台中市', '彰化縣', '南投縣', '雲林縣', '嘉義市', '嘉義縣',
	'臺南市', '台南市', '高雄市', '屏東縣', '宜蘭縣', '花蓮縣', '臺東縣', '台東縣',
	'澎湖縣', '金門縣', '連江縣'
];

/** Pull a normalised Taiwan city (臺/台 unified) from an address or venue string. */
export function cityFromText(text: string | null | undefined): string | null {
	if (!text) return null;
	for (const c of TW_CITIES) if (text.includes(c)) return c.replace('台', '臺');
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
