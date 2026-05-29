/** Shared scraper helpers: polite fetch, date parsing, theatre keyword heuristic. */

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

/** Extract the on-sale time from text. Returns ISO at day granularity. */
export function extractOnSale(text: string): string | null {
	const idx = text.search(/開賣|售票時間|啟售|開始售票/);
	if (idx < 0) return null;
	const window = text.slice(idx, idx + 60);
	const { start } = extractDateRange(window);
	return start ? `${start}T00:00:00+08:00` : null;
}

/**
 * Theatre keyword allow-list for sources without a category field (tixCraft):
 * a show counts as theatre only if its title or venue matches one of these.
 */
const DRAMA_KEYWORDS = [
	'劇場',
	'戲劇院',
	'劇團',
	'舞台劇',
	'舞臺劇',
	'話劇',
	'歌劇院',
	'音樂劇',
	'兒童劇',
	'偶戲',
	'戲曲',
	'歌仔戲',
	'布袋戲',
	'相聲',
	'果陀',
	'表演工作坊',
	'故事工廠',
	'全民大劇團',
	'綠光劇團',
	'明華園',
	'唐美雲',
	'紙風車',
	'如果兒童',
	'動見体',
	'阮劇團'
];

/** Obvious concert / music-event terms; if matched, exclude first (avoids venue-name false positives like "○○劇場"). */
const CONCERT_KEYWORDS = [
	'演唱會',
	'巡迴',
	'World Tour',
	'Tour',
	'Live Tour',
	'Concert',
	'Fan Meeting',
	'見面會',
	'音樂節',
	'Festival',
	'演奏會'
];

export function looksLikeDrama(...texts: (string | null | undefined)[]): boolean {
	const hay = texts.filter(Boolean).join(' ');
	if (CONCERT_KEYWORDS.some((k) => hay.toLowerCase().includes(k.toLowerCase()))) return false;
	return DRAMA_KEYWORDS.some((k) => hay.includes(k));
}
