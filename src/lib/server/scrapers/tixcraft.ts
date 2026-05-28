import { parse } from 'node-html-parser';
import type { Show } from '../../types';
import { politeFetch, extractDateRange, looksLikeDrama } from './util';

const LIST_URL = 'https://tixcraft.com/activity';
const BASE = 'https://tixcraft.com';

/**
 * 拓元售票：平台沒有戲劇分類、開賣時間也藏在會被反爬擋下的詳情頁，
 * 所以只能抓 /activity 列表，再用關鍵字啟發式挑出戲劇（標記 heuristic）。
 * 這是 best-effort 來源，整站被擋時直接回空陣列、不影響其他來源。
 */
export async function scrapeTixcraft(): Promise<Show[]> {
	const res = await politeFetch(LIST_URL);
	const root = parse(await res.text());
	const seen = new Set<string>();
	const shows: Show[] = [];
	for (const card of root.querySelectorAll('.eventbl')) {
		const link = card.querySelector('a[href^="/activity/detail/"]');
		const href = link?.getAttribute('href') ?? '';
		const idMatch = href.match(/\/activity\/detail\/([^/?#]+)/);
		if (!idMatch) continue;
		const id = idMatch[1];
		if (seen.has(id)) continue;

		const title = card.querySelector('.text-bold a')?.text.trim() ?? '';
		const venue = card.querySelector('.text-small.text-med-light')?.text.trim() || null;
		if (!title) continue;
		if (!looksLikeDrama(title, venue)) continue; // 只收看起來是戲劇的
		seen.add(id);

		const dateText = card.querySelector('.text-small.date')?.text.trim() ?? '';
		const range = extractDateRange(dateText);
		const img = card.querySelector('img.img-fluid')?.getAttribute('src') ?? null;

		shows.push({
			id: `tixcraft:${id}`,
			source: 'tixcraft',
			sourceId: id,
			title,
			category: null,
			startDate: range.start,
			endDate: range.end,
			venue,
			city: null,
			onSaleAt: null,
			minPrice: null,
			maxPrice: null,
			imageUrl: img,
			url: `${BASE}${href}`,
			heuristic: true,
			description: null,
			organizer: null,
			sessions: []
		});
	}
	return shows;
}
