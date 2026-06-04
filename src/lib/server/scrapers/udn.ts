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
	hasYouthSeat,
	firstDate,
	extractPriceRange,
	dateRangeFromDates,
} from './util';

const API =
	'https://tickets.udnfunlife.com/Application/UTK01/UTK0101_009.aspx/Product_Category_List';
const DETAIL_URL = (id: string) =>
	`https://tickets.udnfunlife.com/application/UTK02/UTK0201_.aspx?PRODUCT_ID=${id}`;
const SESSIONS_URL = (id: string) =>
	`https://tickets.udnfunlife.com/application/UTK02/UTK0203_.aspx?PRODUCT_ID=${id}`;
const CATEGORIES = ['116', '129', '100'];

export interface Listed {
	id: string;
	title: string;
	img: string | null;
	startDate: string | null;
	endDate: string | null;
	venue: string | null;
	minPrice: number | null;
}

export interface UdnDetail {
	minPrice: number | null;
	maxPrice: number | null;
	description: string | null;
	introImages: string[];
	notes: string | null;
	youthSeat: boolean;
}

export function parseUdnList(listResponseJson: unknown): Listed[] {
	const json = listResponseJson as { d?: { ReturnData?: { script?: string } } };
	const html = json.d?.ReturnData?.script;
	if (!html) return [];
	const root = parse(html);
	const items: Listed[] = [];
	for (const card of root.querySelectorAll('.yd_card')) {
		const href = card.querySelector('a[href]')?.getAttribute('href') ?? '';
		const idMatch = href.match(/PRODUCT_ID=([A-Za-z0-9]+)/);
		if (!idMatch) continue;
		const id = idMatch[1];
		const title = card.querySelector('.yd_card-title')?.text.trim() ?? '';
		if (!title) continue;
		const priceStr = card.querySelector('meta[itemprop=price]')?.getAttribute('content');
		items.push({
			id,
			title,
			img: card.querySelector('img')?.getAttribute('src') ?? null,
			startDate:
				card.querySelector('meta[itemprop=startDate]')?.getAttribute('content')?.slice(0, 10) ??
				null,
			endDate:
				card.querySelector('meta[itemprop=endDate]')?.getAttribute('content')?.slice(0, 10) ?? null,
			venue:
				card.querySelector('[itemprop=location] [itemprop=name]')?.text.trim() ||
				card.querySelector('[itemprop=location]')?.text.trim() ||
				null,
			minPrice: priceStr ? Number(priceStr.replace(/[^\d]/g, '')) || null : null,
		});
	}
	return items;
}

export function parseUdnDetail(detailHtml: string, detailUrl: string): UdnDetail {
	const root = parse(detailHtml);
	const priceText = root.querySelector('#ctl00_ContentPlaceHolder1_lbl_price')?.text ?? '';
	const range = extractPriceRange(priceText);
	const intro = root.querySelector('.showIntro');
	return {
		minPrice: range.minPrice,
		maxPrice: range.maxPrice,
		description: htmlToText(intro?.innerHTML),
		introImages: contentImages(intro, detailUrl),
		notes: extractHighlights(
			`${root.querySelector('.admissionNote')?.text ?? ''} ${root.querySelector('.yd_program-main')?.text ?? ''}`,
		),
		youthSeat: hasYouthSeat(root.querySelector('.yd_program-main')?.text),
	};
}

export function buildUdnShow(item: Listed, sessions: Session[], detail: UdnDetail | null): Show {
	let { startDate, endDate, venue, minPrice } = item;
	let maxPrice: number | null = null;
	let city: string | null = null;
	let description: string | null = null;
	let notes: string | null = null;
	let youthSeat = false;
	let introImages: string[] = [];

	if (detail) {
		if (detail.minPrice != null) minPrice = detail.minPrice;
		if (detail.maxPrice != null) maxPrice = detail.maxPrice;
		description = detail.description;
		introImages = detail.introImages;
		notes = detail.notes;
		youthSeat = detail.youthSeat;
	}

	if (sessions.length) {
		venue = sessions[0].venue ?? venue;
		city = sessions[0].city ?? null;
		const r = dateRangeFromDates(sessions.map((s) => s.date));
		startDate = r.start ?? startDate;
		endDate = r.end ?? endDate;
	}
	if (!city) city = cityFromText(venue);

	return {
		id: `udn:${item.id}`,
		source: 'udn',
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
		youthSeat,
		introImages,
		organizer: null,
		sessions,
	};
}

export async function scrapeUdn(): Promise<Show[]> {
	const listed = new Map<string, Listed>();
	for (const cat of CATEGORIES) {
		try {
			const res = await politeFetch(API, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json; charset=utf-8' },
				body: JSON.stringify({ category: cat, pageNo: '1', pageSize: '999' }),
			});
			const json = await res.json();
			for (const item of parseUdnList(json)) {
				if (!listed.has(item.id)) listed.set(item.id, item);
			}
		} catch {}
		await sleep(400);
	}

	const fast = process.env.ONSTAGE_FAST === '1';
	const shows: Show[] = [];
	for (const item of listed.values()) {
		let sessions: Session[] = [];
		let detail: UdnDetail | null = null;

		if (!fast) {
			try {
				const res = await politeFetch(SESSIONS_URL(item.id));
				sessions = parseUdnSessions(await res.text());
				await sleep(400);
			} catch {}
			try {
				const res = await politeFetch(DETAIL_URL(item.id));
				detail = parseUdnDetail(await res.text(), DETAIL_URL(item.id));
				await sleep(400);
			} catch {}
		}

		shows.push(buildUdnShow(item, sessions, detail));
	}
	return shows;
}

export function parseUdnSessions(html: string): Session[] {
	const root = parse(html);
	const sessions: Session[] = [];
	for (const block of root.querySelectorAll('.yd_session-block')) {
		const timeText = block.querySelector('.yd_session-time')?.text.trim() ?? '';
		const date = firstDate(timeText);
		const texts = block.querySelectorAll('.yd_session-text.fz-13').map((e) => e.text.trim());
		const venueLine = texts.find((t) => t.length > 0) ?? null;
		const venue = venueLine ? venueLine.replace(/\s*[(（].*$/, '').trim() || venueLine : null;
		const lastLabel = [...texts].reverse().find((t) => t.length > 0 && t !== venueLine) ?? null;
		const city = cityFromText(venueLine) ?? cityFromText(lastLabel);
		sessions.push({ date, venue, city, onSaleAt: null });
	}
	return sessions;
}
