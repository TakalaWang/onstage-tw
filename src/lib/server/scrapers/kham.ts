import { parse } from 'node-html-parser';
import type { Show, Session } from '../../types';
import {
	politeFetch,
	sleep,
	extractOnSale,
	classifyGenre,
	cityFromText,
	htmlToText,
	extractHighlights,
	contentImages,
	hasYouthSeat,
	firstDate,
	dateRangeFromDates,
} from './util';

const LIST_URL = (cat: string) =>
	`https://kham.com.tw/application/UTK01/UTK0101_06.aspx?TYPE=1&CATEGORY=${cat}`;
const DETAIL_URL = (id: string) =>
	`https://kham.com.tw/application/UTK02/UTK0201_.aspx?PRODUCT_ID=${id}`;
const CATEGORIES = ['116', '80', '100'];

export interface Listed {
	id: string;
	title: string;
	image: string | null;
	category: string;
}

export interface KhamDetail {
	sessions: Session[];
	onSaleAt: string | null;
	description: string | null;
	introImages: string[];
	notes: string | null;
	youthSeat: boolean;
}

export function parseKhamList(listHtml: string, category: string): Listed[] {
	const root = parse(listHtml);
	const items: Listed[] = [];
	for (const a of root.querySelectorAll('#DIV_CATEGORY > a')) {
		const href = a.getAttribute('href') ?? '';
		const idMatch = href.match(/PRODUCT_ID=([A-Za-z0-9]+)/);
		if (!idMatch) continue;
		const id = idMatch[1];
		const title = a.querySelector('.title')?.text.trim() ?? '';
		if (!title) continue;
		items.push({
			id,
			title,
			image: a.querySelector('img')?.getAttribute('src') ?? null,
			category,
		});
	}
	return items;
}

export function parseKhamSessions(desc: string): Session[] {
	const segs = desc
		.split(/[,，]/)
		.map((s) => s.trim())
		.filter(Boolean);
	const sessions: Session[] = [];
	for (const seg of segs.slice(1)) {
		const dm = seg.match(/\d{4}[年/.-]/);
		const venue = (dm ? seg.slice(0, dm.index).trim() : seg).replace(/\s+/g, ' ') || null;
		const date = firstDate(seg);
		if (!venue && !date) continue;
		sessions.push({ date, venue, city: cityFromText(venue), onSaleAt: null });
	}
	return sessions;
}

export function parseKhamDetail(detailHtml: string, detailUrl: string): KhamDetail {
	const root = parse(detailHtml);
	const desc = root.querySelector('meta[name=description]')?.getAttribute('content') ?? '';
	const sessions = parseKhamSessions(desc);
	const onSaleAt = extractOnSale(root.text);
	const intro = root.querySelector('#divbtn01');
	const description = htmlToText(intro?.innerHTML);
	const introImages = contentImages(intro, detailUrl);
	const notes = extractHighlights(root.querySelector('#divbtn02')?.text);
	const youthSeat = hasYouthSeat(root.querySelector('#showInfo')?.text);
	return { sessions, onSaleAt, description, introImages, notes, youthSeat };
}

export function buildKhamShow(item: Listed, detail: KhamDetail | null): Show {
	let startDate: string | null = null;
	let endDate: string | null = null;
	let venue: string | null = null;
	let city: string | null = null;
	let onSaleAt: string | null = null;
	let description: string | null = null;
	let notes: string | null = null;
	let youthSeat = false;
	let introImages: string[] = [];
	let sessions: Session[] = [];

	if (detail) {
		sessions = detail.sessions;
		onSaleAt = detail.onSaleAt;
		description = detail.description;
		introImages = detail.introImages;
		notes = detail.notes;
		youthSeat = detail.youthSeat;
	}

	if (sessions.length) {
		venue = sessions[0].venue;
		city = sessions[0].city;
		const r = dateRangeFromDates(sessions.map((s) => s.date));
		startDate = r.start;
		endDate = r.end;
	}

	return {
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
		minPrice: null,
		maxPrice: null,
		imageUrl: item.image,
		url: DETAIL_URL(item.id),
		description,
		notes,
		youthSeat,
		introImages,
		organizer: null,
		sessions,
	};
}

export async function scrapeKham(): Promise<Show[]> {
	const listed = new Map<string, Listed>();
	for (const cat of CATEGORIES) {
		try {
			const res = await politeFetch(LIST_URL(cat));
			const categoryLabel = cat === '80' ? '音樂劇' : cat === '100' ? '舞蹈' : '戲劇';
			for (const item of parseKhamList(await res.text(), categoryLabel)) {
				if (!listed.has(item.id)) listed.set(item.id, item);
			}
		} catch {}
		await sleep(500);
	}

	const fast = process.env.ONSTAGE_FAST === '1';
	const shows: Show[] = [];
	for (const item of listed.values()) {
		let detail: KhamDetail | null = null;

		if (!fast) {
			try {
				const res = await politeFetch(DETAIL_URL(item.id));
				detail = parseKhamDetail(await res.text(), DETAIL_URL(item.id));
				await sleep(500);
			} catch {}
		}

		shows.push(buildKhamShow(item, detail));
	}
	return shows;
}
