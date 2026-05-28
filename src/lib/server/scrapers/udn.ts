import { parse } from 'node-html-parser';
import type { Show } from '../../types';
import { politeFetch } from './util';

const API =
	'https://tickets.udnfunlife.com/Application/UTK01/UTK0101_009.aspx/Product_Category_List';
const DETAIL_URL = (id: string) =>
	`https://tickets.udnfunlife.com/application/UTK02/UTK0201_.aspx?PRODUCT_ID=${id}`;
const DRAMA_CATEGORY = '116';

/** udn 售票網：POST WebMethod 一次取回整個戲劇類，回傳的 script 欄位是 HTML 片段，再解析。 */
export async function scrapeUdn(): Promise<Show[]> {
	const res = await politeFetch(API, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json; charset=utf-8' },
		body: JSON.stringify({ category: DRAMA_CATEGORY, pageNo: '1', pageSize: '999' })
	});
	const json = (await res.json()) as { d?: { ReturnData?: { script?: string } } };
	const html = json.d?.ReturnData?.script;
	if (!html) return [];

	const root = parse(html);
	const shows: Show[] = [];
	for (const card of root.querySelectorAll('.yd_card')) {
		const link = card.querySelector('a[href]');
		const href = link?.getAttribute('href') ?? '';
		const idMatch = href.match(/PRODUCT_ID=([A-Za-z0-9]+)/);
		if (!idMatch) continue;
		const id = idMatch[1];

		const title = card.querySelector('.yd_card-title')?.text.trim() ?? '';
		if (!title) continue;
		const img = card.querySelector('img')?.getAttribute('src') ?? null;
		const startDate =
			card.querySelector('meta[itemprop=startDate]')?.getAttribute('content') ?? null;
		const endDate =
			card.querySelector('meta[itemprop=endDate]')?.getAttribute('content') ?? null;
		const venue =
			card.querySelector('[itemprop=location] [itemprop=name]')?.text.trim() ||
			card.querySelector('[itemprop=location]')?.text.trim() ||
			null;
		const priceStr = card
			.querySelector('meta[itemprop=price]')
			?.getAttribute('content');
		const minPrice = priceStr ? Number(priceStr.replace(/[^\d]/g, '')) || null : null;

		shows.push({
			id: `udn:${id}`,
			source: 'udn',
			sourceId: id,
			title,
			category: '戲劇',
			startDate: startDate?.slice(0, 10) ?? null,
			endDate: endDate?.slice(0, 10) ?? null,
			venue,
			city: null,
			onSaleAt: null, // 開賣時間僅在詳情頁，MVP 不逐頁抓
			minPrice,
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
