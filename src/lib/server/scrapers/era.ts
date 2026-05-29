import { parse } from 'node-html-parser';
import type { Show } from '../../types';
import { politeFetch, extractDateRange } from './util';

const LIST_URL = 'https://ticket.com.tw/application/UTK01/UTK0101_06.aspx?TYPE=1&CATEGORY=116';
const DETAIL_URL = (id: string) =>
	`https://ticket.com.tw/application/UTK02/UTK0201_.aspx?PRODUCT_ID=${id}`;

/**
 * ERA: scrape the theatre list page only. ERA actively blocks suspicious IPs, so we
 * deliberately avoid per-item detail pages and leave on-sale time / venue empty.
 */
export async function scrapeEra(): Promise<Show[]> {
	const res = await politeFetch(LIST_URL);
	const root = parse(await res.text());
	const shows: Show[] = [];
	for (const card of root.querySelectorAll('#shows .moreBox')) {
		const href = card.querySelector('a[href]')?.getAttribute('href') ?? '';
		const idMatch = href.match(/PRODUCT_ID=([A-Za-z0-9]+)/);
		if (!idMatch) continue;
		const id = idMatch[1];
		const title = card.querySelector('h4.list-group-item-heading')?.text.trim() ?? '';
		if (!title) continue;
		const img =
			card.querySelector('img.list-group-image')?.getAttribute('data-original') ??
			card.querySelector('img')?.getAttribute('data-original') ??
			null;
		const dateText = card.querySelector('.list-group-item-date')?.text.trim() ?? '';
		const range = extractDateRange(dateText);

		shows.push({
			id: `era:${id}`,
			source: 'era',
			sourceId: id,
			title,
			category: '戲劇',
			startDate: range.start,
			endDate: range.end,
			venue: null,
			city: null,
			onSaleAt: null,
			minPrice: null,
			maxPrice: null,
			imageUrl: img,
			url: DETAIL_URL(id),
			heuristic: false,
			description: null,
			organizer: null,
			sessions: []
		});
	}
	return shows;
}
