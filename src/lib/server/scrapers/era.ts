import { parse } from 'node-html-parser';
import type { Show, Session } from '../../types';
import {
	politeFetch,
	sleep,
	extractDateRange,
	classifyGenre,
	cityFromText,
	htmlToText,
	extractHighlights,
	contentImages,
	firstDate,
	extractPriceRange,
	dateRangeFromDates,
} from './util';

const LIST_URL = (cat: string) =>
	`https://ticket.com.tw/application/UTK01/UTK0101_06.aspx?TYPE=1&CATEGORY=${cat}`;
const DETAIL_URL = (id: string) =>
	`https://ticket.com.tw/application/UTK02/UTK0201_.aspx?PRODUCT_ID=${id}`;
const CATEGORIES = ['116', '129', '100'];

interface Listed {
	id: string;
	title: string;
	img: string | null;
	range: ReturnType<typeof extractDateRange>;
}

export async function scrapeEra(): Promise<Show[]> {
	const listed = new Map<string, Listed>();
	for (const cat of CATEGORIES) {
		try {
			const res = await politeFetch(LIST_URL(cat));
			const root = parse(await res.text());
			for (const card of root.querySelectorAll('#shows .moreBox')) {
				const href = card.querySelector('a[href]')?.getAttribute('href') ?? '';
				const idMatch = href.match(/PRODUCT_ID=([A-Za-z0-9]+)/);
				if (!idMatch) continue;
				const id = idMatch[1];
				if (listed.has(id)) continue;
				const title = card.querySelector('h4.list-group-item-heading')?.text.trim() ?? '';
				if (!title) continue;
				const img =
					card.querySelector('img.list-group-image')?.getAttribute('data-original') ??
					card.querySelector('img')?.getAttribute('data-original') ??
					null;
				const range = extractDateRange(
					card.querySelector('.list-group-item-date')?.text.trim() ?? '',
				);
				listed.set(id, { id, title, img, range });
			}
		} catch {}
		await sleep(700);
	}

	const fast = process.env.ONSTAGE_FAST === '1';
	const shows: Show[] = [];
	for (const item of listed.values()) {
		let startDate = item.range.start;
		let endDate = item.range.end;
		let venue: string | null = null;
		let city: string | null = null;
		let minPrice: number | null = null;
		let maxPrice: number | null = null;
		let description: string | null = null;
		let notes: string | null = null;
		let introImages: string[] = [];
		let organizer: string | null = null;
		let rawSessions: EraSession[] = [];

		if (!fast) {
			try {
				const d = await politeFetch(DETAIL_URL(item.id));
				const root = parse(await d.text());
				rawSessions = parseEraSessions(root);
				const prices = rawSessions
					.map((s) => s._price)
					.filter((p): p is string => !!p)
					.join(' ');
				({ minPrice, maxPrice } = extractPriceRange(prices));
				const intro = root.querySelector('#ctl00_ContentPlaceHolder1_lbProgramInfo_Content');
				description = htmlToText(intro?.innerHTML);
				introImages = contentImages(intro, DETAIL_URL(item.id));
				organizer = root.querySelector('#ctl00_ContentPlaceHolder1_lbOrgName')?.text.trim() || null;
				notes = extractHighlights(root.querySelector('.contents.tab-content')?.text);
				await sleep(700);
			} catch {}
		}

		const cleanSessions: Session[] = rawSessions.map((s) => ({
			date: s.date,
			venue: s.venue,
			city: s.city,
			onSaleAt: s.onSaleAt,
		}));
		if (cleanSessions.length) {
			venue = cleanSessions[0].venue ?? venue;
			city = cleanSessions[0].city ?? city;
			const r = dateRangeFromDates(cleanSessions.map((s) => s.date));
			startDate = r.start ?? startDate;
			endDate = r.end ?? endDate;
		}

		shows.push({
			id: `era:${item.id}`,
			source: 'era',
			sourceId: item.id,
			title: item.title,
			category: classifyGenre(item.title),
			startDate,
			endDate,
			venue,
			city,
			onSaleAt: null,
			minPrice,
			maxPrice,
			imageUrl: item.img,
			url: DETAIL_URL(item.id),
			description,
			notes,
			introImages,
			organizer,
			sessions: cleanSessions,
		});
	}
	return shows;
}

interface EraSession extends Session {
	_price: string | null;
}

function parseEraSessions(root: ReturnType<typeof parse>): EraSession[] {
	const sessions: EraSession[] = [];
	for (const el of root.querySelectorAll('[id*="dgProductList_ctl"][id$="START_DATETIME"]')) {
		const id = el.getAttribute('id') ?? '';
		const base = id.replace(/START_DATETIME$/, '');
		const placeName = root.querySelector(`[id="${base}PLACE_NAME"]`)?.text.trim() ?? '';
		const placeAddr = root.querySelector(`[id="${base}PLACE_ADDRESS"]`)?.text.trim() ?? '';
		const priceText = root.querySelector(`[id="${base}PRICE"]`)?.text.replace(/\s+/g, '') ?? '';
		sessions.push({
			date: firstDate(el.text.trim()),
			venue: placeName || null,
			city: cityFromText(placeAddr) ?? cityFromText(placeName),
			onSaleAt: null,
			_price: priceText || null,
		});
	}
	return sessions;
}
