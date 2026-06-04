import type { Show, Session } from '../../types';
import {
	politeFetch,
	sleep,
	unixToDate,
	unixToIso,
	classifyGenre,
	htmlToText,
	hasYouthSeat,
} from './util';

const LIST_API = 'https://csm.api.opentix.life/programs';
const DETAIL_API = 'https://csm.api.opentix.life/programs';
const EVENT_URL = (id: string) => `https://www.opentix.life/event/${id}`;

const DRAMA_CATEGORIES = new Set(['戲劇', '音樂劇']);

export interface ProgramListItem {
	id: string;
	name: string;
	displayCategory: string;
	imageUrl?: string;
	startDateTime?: number;
	endDateTime?: number;
	minPrice?: number;
	maxPrice?: number;
	cities?: string[];
}

export interface ProgramDetail {
	onlineStartTime?: number;
	description?: string;
	saleInfoContent?: string;
	saleInfoNotice?: string;
	noticeContent?: string;
	programOrganizers?: { type?: string; info?: { name?: string }[] }[];
	eventVenues?: {
		venue?: { name?: string; city?: string };
		events?: { startDateTime?: number; onSaleStartDateTime?: number }[];
	}[];
}

export function parseOpenTixList(json: unknown): ProgramListItem[] {
	const parsed = json as {
		result?: { nextPage: number | null; data: ProgramListItem[] };
	};
	const data = parsed.result?.data ?? [];
	const drama: ProgramListItem[] = [];
	for (const p of data) {
		if (DRAMA_CATEGORIES.has(p.displayCategory)) drama.push(p);
	}
	return drama;
}

export function buildOpenTixShow(p: ProgramListItem, detail: ProgramDetail | null): Show {
	let onSaleAt: string | null = null;
	let venue: string | null = null;
	let city = p.cities?.[0] ?? null;
	let description: string | null = null;
	let organizer: string | null = null;
	let youthSeat = false;
	let sessions: Session[] = [];
	if (detail) {
		onSaleAt = unixToIso(detail?.onlineStartTime);
		youthSeat = hasYouthSeat(
			detail?.saleInfoContent,
			detail?.saleInfoNotice,
			detail?.noticeContent,
			detail?.description,
		);
		venue = detail?.eventVenues?.[0]?.venue?.name ?? null;
		city = detail?.eventVenues?.[0]?.venue?.city ?? city;
		description = htmlToText(detail?.description);
		organizer =
			detail?.programOrganizers
				?.flatMap((o) => o.info ?? [])
				.map((i) => i.name)
				.filter(Boolean)
				.join('、') || null;
		sessions = (detail?.eventVenues ?? []).flatMap((ev) =>
			(ev.events ?? []).map((e) => ({
				date: unixToDate(e.startDateTime),
				venue: ev.venue?.name ?? null,
				city: ev.venue?.city ?? null,
				onSaleAt: unixToIso(e.onSaleStartDateTime),
			})),
		);
	}
	return {
		id: `opentix:${p.id}`,
		source: 'opentix',
		sourceId: p.id,
		title: p.name,
		category: classifyGenre(p.name, p.displayCategory),
		startDate: unixToDate(p.startDateTime),
		endDate: unixToDate(p.endDateTime),
		venue,
		city,
		onSaleAt,
		minPrice: p.minPrice ?? null,
		maxPrice: p.maxPrice ?? null,
		imageUrl: p.imageUrl ?? null,
		url: EVENT_URL(p.id),
		description,
		notes: null,
		youthSeat,
		introImages: [],
		organizer,
		sessions,
	};
}

export async function scrapeOpenTix(): Promise<Show[]> {
	const drama: ProgramListItem[] = [];
	let page = 1;
	for (;;) {
		const res = await politeFetch(`${LIST_API}?page=${page}&rowCount=30`);
		const json = (await res.json()) as {
			result?: { nextPage: number | null; data: ProgramListItem[] };
		};
		drama.push(...parseOpenTixList(json));
		if (!json.result?.nextPage) break;
		page = json.result.nextPage;
		await sleep(200);
	}

	const fast = process.env.ONSTAGE_FAST === '1';
	const shows: Show[] = [];
	for (const p of drama) {
		let detail: ProgramDetail | null = null;
		if (!fast) {
			try {
				const dRes = await politeFetch(`${DETAIL_API}/${p.id}`);
				const dJson = (await dRes.json()) as { result?: ProgramDetail };
				detail = dJson.result ?? null;
				await sleep(150);
			} catch {}
		}
		shows.push(buildOpenTixShow(p, detail));
	}
	return shows;
}
