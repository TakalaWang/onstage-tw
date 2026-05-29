/** 抓取共用工具：禮貌性 fetch、日期解析、戲劇關鍵字啟發式判定。 */

const UA =
	'onstage-tw-aggregator/0.1 (+https://github.com/your-name/onstage-tw; theatre listing aggregator, links back, does not resell)';

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

/** 簡單的禮貌性延遲，避免短時間大量請求觸發對方的速率限制 / IP 封鎖。 */
export function sleep(ms: number): Promise<void> {
	return new Promise((r) => setTimeout(r, ms));
}

/** Unix 秒 → YYYY-MM-DD（台北時區）。 */
export function unixToDate(sec: number | null | undefined): string | null {
	if (!sec) return null;
	return new Date(sec * 1000).toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' });
}

/** Unix 秒 → ISO 字串。 */
export function unixToIso(sec: number | null | undefined): string | null {
	if (!sec) return null;
	return new Date(sec * 1000).toISOString();
}

/**
 * 從一段中文文字裡盡量抓出 YYYY-MM-DD（支援 2026/05/30、2026年5月30日、2026-05-30）。
 * 回傳第一個與最後一個日期（當作起訖）。
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

/** 從文字抓「開賣時間」。回傳 ISO（只到日，無精確時間就給當天）。 */
export function extractOnSale(text: string): string | null {
	const idx = text.search(/開賣|售票時間|啟售|開始售票/);
	if (idx < 0) return null;
	const window = text.slice(idx, idx + 60);
	const { start } = extractDateRange(window);
	return start ? `${start}T00:00:00+08:00` : null;
}

/**
 * 戲劇關鍵字白名單：給沒有分類欄位的來源（拓元）做啟發式判定。
 * 命中場館或節目名稱關鍵字才視為戲劇。
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

/** 一看就是演唱會 / 音樂演出的字眼，命中就先排除（避免「○○劇場」這類場館名誤判）。 */
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
