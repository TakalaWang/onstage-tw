import { parse } from 'node-html-parser';
import type { Show } from '../../types';
import { politeFetch, sleep, extractDateRange, extractOnSale } from './util';

const LIST_URL = (cat: string) =>
	`https://kham.com.tw/application/UTK01/UTK0101_06.aspx?TYPE=1&CATEGORY=${cat}`;
const DETAIL_URL = (id: string) =>
	`https://kham.com.tw/application/UTK02/UTK0201_.aspx?PRODUCT_ID=${id}`;
// 116=戲劇, 80=音樂劇
const CATEGORIES = ['116', '80'];

interface Listed {
	id: string;
	title: string;
	image: string | null;
	category: string;
}

/** 寬宏售票：列表頁取 id/標題/圖，再進詳情頁用 meta description 補日期與場館。 */
export async function scrapeKham(): Promise<Show[]> {
	const listed = new Map<string, Listed>();
	for (const cat of CATEGORIES) {
		const res = await politeFetch(LIST_URL(cat));
		const root = parse(await res.text());
		for (const a of root.querySelectorAll('#DIV_CATEGORY > a')) {
			const href = a.getAttribute('href') ?? '';
			const idMatch = href.match(/PRODUCT_ID=([A-Za-z0-9]+)/);
			if (!idMatch) continue;
			const id = idMatch[1];
			if (listed.has(id)) continue;
			const title = a.querySelector('.title')?.text.trim() ?? '';
			if (!title) continue;
			listed.set(id, {
				id,
				title,
				image: a.querySelector('img')?.getAttribute('src') ?? null,
				category: cat === '80' ? '音樂劇' : '戲劇'
			});
		}
		await sleep(500);
	}

	const fast = process.env.KANXI_FAST === '1';
	const shows: Show[] = [];
	for (const item of listed.values()) {
		let startDate: string | null = null;
		let endDate: string | null = null;
		let venue: string | null = null;
		let onSaleAt: string | null = null;
		if (!fast) {
			try {
				const res = await politeFetch(DETAIL_URL(item.id));
				const root = parse(await res.text());
				const desc = root.querySelector('meta[name=description]')?.getAttribute('content') ?? '';
				const range = extractDateRange(desc);
				startDate = range.start;
				endDate = range.end;
				venue = parseVenue(desc);
				onSaleAt = extractOnSale(root.text);
				await sleep(500);
			} catch {
				/* 詳情失敗就只留列表資料 */
			}
		}
		shows.push({
			id: `kham:${item.id}`,
			source: 'kham',
			sourceId: item.id,
			title: item.title,
			category: item.category,
			startDate,
			endDate,
			venue,
			city: null,
			onSaleAt,
			minPrice: null,
			maxPrice: null,
			imageUrl: item.image,
			url: DETAIL_URL(item.id),
			heuristic: false,
			description: null,
			organizer: null,
			sessions: []
		});
	}
	return shows;
}

/** meta description 格式為「標題, 場館+日期, 場館+日期…」，取第一個場館段、去掉日期文字。 */
function parseVenue(desc: string): string | null {
	const segs = desc.split(/[,，]/).map((s) => s.trim());
	for (const seg of segs.slice(1)) {
		const venue = seg.replace(/\d{4}年.*$/, '').replace(/\d{4}[/.\-].*$/, '').trim();
		if (venue) return venue;
	}
	return null;
}
