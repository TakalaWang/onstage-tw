import { parse } from 'node-html-parser';
import type { Show } from '../../types';
import { politeFetch, extractDateRange, looksLikeDrama } from './util';

const LIST_URL = 'https://tixcraft.com/activity';
const BASE = 'https://tixcraft.com';

/**
 * tixCraft: no theatre category, and on-sale time lives on detail pages guarded by
 * anti-bot. So we only scrape the /activity list and pick out theatre via a keyword
 * heuristic (marked `heuristic`). Best-effort source — if the site blocks us we return
 * an empty array without affecting the others.
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
		if (!looksLikeDrama(title, venue)) continue; // keep only entries that look like theatre
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
