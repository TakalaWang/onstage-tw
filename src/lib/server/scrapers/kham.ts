import { parse } from 'node-html-parser';
import type { Show, Session } from '../../types';
import {
	politeFetch,
	sleep,
	extractOnSale,
	classifyGenre,
	cityFromText,
	htmlToText,
	firstDate,
	dateRangeFromDates
} from './util';

const LIST_URL = (cat: string) =>
	`https://kham.com.tw/application/UTK01/UTK0101_06.aspx?TYPE=1&CATEGORY=${cat}`;
const DETAIL_URL = (id: string) =>
	`https://kham.com.tw/application/UTK02/UTK0201_.aspx?PRODUCT_ID=${id}`;
// 116 = theatre, 80 = musical, 100 = dance.
const CATEGORIES = ['116', '80', '100'];

interface Listed {
	id: string;
	title: string;
	image: string | null;
	category: string;
}

/** KHAM: list page gives id/title/image; the detail page's meta description supplies dates and venues. */
export async function scrapeKham(): Promise<Show[]> {
	const listed = new Map<string, Listed>();
	for (const cat of CATEGORIES) {
		try {
			const res = await politeFetch(LIST_URL(cat));
			const root = parse(await res.text());
			for (const a of root.querySelectorAll('#DIV_CATEGORY > a')) {
				const href = a.getAttribute('href') ?? '';
				const idMatch = href.match(/PRODUCT_ID=([A-Za-z0-9]+)/);
				if (!idMatch) continue;
				const id = idMatch[1];
				if (listed.has(id)) continue; // de-dupe across categories
				const title = a.querySelector('.title')?.text.trim() ?? '';
				if (!title) continue;
				listed.set(id, {
					id,
					title,
					image: a.querySelector('img')?.getAttribute('src') ?? null,
					category: cat === '80' ? '音樂劇' : cat === '100' ? '舞蹈' : '戲劇'
				});
			}
		} catch {
			/* skip this category on failure */
		}
		await sleep(500);
	}

	const fast = process.env.ONSTAGE_FAST === '1';
	const shows: Show[] = [];
	for (const item of listed.values()) {
		let startDate: string | null = null;
		let endDate: string | null = null;
		let venue: string | null = null;
		let city: string | null = null;
		let onSaleAt: string | null = null;
		let description: string | null = null;
		let sessions: Session[] = [];

		if (!fast) {
			try {
				const res = await politeFetch(DETAIL_URL(item.id));
				const root = parse(await res.text());
				const desc = root.querySelector('meta[name=description]')?.getAttribute('content') ?? '';
				sessions = parseKhamSessions(desc);
				onSaleAt = extractOnSale(root.text);
				description = htmlToText(root.querySelector('#showInfo')?.innerHTML);
				await sleep(500);
			} catch {
				/* on detail failure, keep just the list data */
			}
		}

		if (sessions.length) {
			venue = sessions[0].venue;
			city = sessions[0].city;
			const r = dateRangeFromDates(sessions.map((s) => s.date));
			startDate = r.start;
			endDate = r.end;
		}

		shows.push({
			id: `kham:${item.id}`,
			source: 'kham',
			sourceId: item.id,
			title: item.title,
			category: classifyGenre(item.title, item.category),
			startDate,
			endDate,
			venue,
			city,
			onSaleAt,
			minPrice: null, // KHAM detail pages rarely expose structured prices
			maxPrice: null,
			imageUrl: item.image,
			url: DETAIL_URL(item.id),
			description,
			organizer: null,
			sessions
		});
	}
	return shows;
}

/**
 * The meta description is "title, venue+date, venue+date…". Each segment after
 * the first is one venue with its date(s). Tolerant of a single venue or none.
 */
function parseKhamSessions(desc: string): Session[] {
	const segs = desc
		.split(/[,，]/)
		.map((s) => s.trim())
		.filter(Boolean);
	const sessions: Session[] = [];
	for (const seg of segs.slice(1)) {
		// Split the venue name (leading) from the trailing date text.
		const dm = seg.match(/\d{4}[年/.\-]/);
		const venue = (dm ? seg.slice(0, dm.index).trim() : seg).replace(/\s+/g, ' ') || null;
		const date = firstDate(seg);
		if (!venue && !date) continue;
		sessions.push({ date, venue, city: cityFromText(venue), onSaleAt: null });
	}
	return sessions;
}
