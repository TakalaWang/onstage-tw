import { parse } from 'node-html-parser';
import type { Show, Session } from '../../types';
import {
	politeFetch,
	sleep,
	classifyGenre,
	cityFromText,
	htmlToText,
	extractHighlights,
	contentImages,
	firstDate,
	extractPriceRange,
	dateRangeFromDates
} from './util';

const API =
	'https://tickets.udnfunlife.com/Application/UTK01/UTK0101_009.aspx/Product_Category_List';
// Main detail page: poster, price range, description, and the public program URL.
const DETAIL_URL = (id: string) =>
	`https://tickets.udnfunlife.com/application/UTK02/UTK0201_.aspx?PRODUCT_ID=${id}`;
// Sessions page: one block per performance (date, venue+address, city label).
const SESSIONS_URL = (id: string) =>
	`https://tickets.udnfunlife.com/application/UTK02/UTK0203_.aspx?PRODUCT_ID=${id}`;
// 116 = theatre, 129 = kids/family, 100 = dance.
const CATEGORIES = ['116', '129', '100'];

interface Listed {
	id: string;
	title: string;
	img: string | null;
	startDate: string | null;
	endDate: string | null;
	venue: string | null;
	minPrice: number | null;
}

/** udn: POST WebMethod returns a category at once; its `script` field is an HTML fragment we parse. */
export async function scrapeUdn(): Promise<Show[]> {
	const listed = new Map<string, Listed>();
	for (const cat of CATEGORIES) {
		try {
			const res = await politeFetch(API, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json; charset=utf-8' },
				body: JSON.stringify({ category: cat, pageNo: '1', pageSize: '999' })
			});
			const json = (await res.json()) as { d?: { ReturnData?: { script?: string } } };
			const html = json.d?.ReturnData?.script;
			if (!html) continue;
			const root = parse(html);
			for (const card of root.querySelectorAll('.yd_card')) {
				const href = card.querySelector('a[href]')?.getAttribute('href') ?? '';
				const idMatch = href.match(/PRODUCT_ID=([A-Za-z0-9]+)/);
				if (!idMatch) continue;
				const id = idMatch[1];
				if (listed.has(id)) continue; // de-dupe across categories
				const title = card.querySelector('.yd_card-title')?.text.trim() ?? '';
				if (!title) continue;
				const priceStr = card.querySelector('meta[itemprop=price]')?.getAttribute('content');
				listed.set(id, {
					id,
					title,
					img: card.querySelector('img')?.getAttribute('src') ?? null,
					startDate:
						card.querySelector('meta[itemprop=startDate]')?.getAttribute('content')?.slice(0, 10) ??
						null,
					endDate:
						card.querySelector('meta[itemprop=endDate]')?.getAttribute('content')?.slice(0, 10) ??
						null,
					venue:
						card.querySelector('[itemprop=location] [itemprop=name]')?.text.trim() ||
						card.querySelector('[itemprop=location]')?.text.trim() ||
						null,
					minPrice: priceStr ? Number(priceStr.replace(/[^\d]/g, '')) || null : null
				});
			}
		} catch {
			/* skip this category on failure */
		}
		await sleep(400);
	}

	const fast = process.env.ONSTAGE_FAST === '1';
	const shows: Show[] = [];
	for (const item of listed.values()) {
		let { startDate, endDate, venue, minPrice } = item;
		let maxPrice: number | null = null;
		let city: string | null = null;
		let description: string | null = null;
		let notes: string | null = null;
		let introImages: string[] = [];
		let sessions: Session[] = [];

		if (!fast) {
			// Sessions page → per-performance dates, venue, city.
			try {
				const res = await politeFetch(SESSIONS_URL(item.id));
				sessions = parseUdnSessions(await res.text());
				await sleep(400);
			} catch {
				/* keep list-only data */
			}
			// Main detail page → price range + description.
			try {
				const res = await politeFetch(DETAIL_URL(item.id));
				const root = parse(await res.text());
				const priceText = root.querySelector('#ctl00_ContentPlaceHolder1_lbl_price')?.text ?? '';
				const range = extractPriceRange(priceText);
				if (range.minPrice != null) minPrice = range.minPrice;
				if (range.maxPrice != null) maxPrice = range.maxPrice;
				const intro = root.querySelector('.showIntro');
				description = htmlToText(intro?.innerHTML);
				introImages = contentImages(intro, DETAIL_URL(item.id));
				// Running time / age live in the collapsed "注意事項" + intro sections.
				notes = extractHighlights(
					`${root.querySelector('.admissionNote')?.text ?? ''} ${root.querySelector('.yd_program-main')?.text ?? ''}`
				);
				await sleep(400);
			} catch {
				/* keep list-only data */
			}
		}

		// Derive show-level venue/city/dates from sessions when available.
		if (sessions.length) {
			venue = sessions[0].venue ?? venue;
			city = sessions[0].city ?? null;
			const r = dateRangeFromDates(sessions.map((s) => s.date));
			startDate = r.start ?? startDate;
			endDate = r.end ?? endDate;
		}
		if (!city) city = cityFromText(venue);

		shows.push({
			id: `udn:${item.id}`,
			source: 'udn',
			sourceId: item.id,
			title: item.title,
			category: classifyGenre(item.title),
			startDate,
			endDate,
			venue,
			city,
			onSaleAt: null, // udn hides on-sale time once a show is on sale
			minPrice,
			maxPrice,
			imageUrl: item.img,
			url: DETAIL_URL(item.id),
			description,
			notes,
			introImages,
			organizer: null,
			sessions
		});
	}
	return shows;
}

/**
 * Parse the udn sessions page. Each `div.yd_session-block` has:
 * - first `.yd_session-time` = "2026/06/12 (五) 19:00"
 * - first `.yd_session-text.fz-13` = "venue (address with city)"
 * - last `.yd_session-text.fz-13` = city label, e.g. "高雄場"
 */
function parseUdnSessions(html: string): Session[] {
	const root = parse(html);
	const sessions: Session[] = [];
	for (const block of root.querySelectorAll('.yd_session-block')) {
		const timeText = block.querySelector('.yd_session-time')?.text.trim() ?? '';
		const date = firstDate(timeText);
		const texts = block.querySelectorAll('.yd_session-text.fz-13').map((e) => e.text.trim());
		const venueLine = texts.find((t) => t.length > 0) ?? null;
		// Venue name = strip the trailing "(address)" portion.
		const venue = venueLine ? venueLine.replace(/\s*[(（].*$/, '').trim() || venueLine : null;
		// City: prefer the address inside the venue line, fall back to the last label tag.
		const lastLabel = [...texts].reverse().find((t) => t.length > 0 && t !== venueLine) ?? null;
		const city = cityFromText(venueLine) ?? cityFromText(lastLabel);
		sessions.push({ date, venue, city, onSaleAt: null });
	}
	return sessions;
}
