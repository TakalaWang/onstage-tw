import type { Show, Session } from '../../types';
import { politeFetch, sleep, unixToDate, unixToIso } from './util';

const LIST_API = 'https://csm.api.opentix.life/programs';
const DETAIL_API = 'https://csm.api.opentix.life/programs';
const EVENT_URL = (id: string) => `https://www.opentix.life/event/${id}`;

/** 視為戲劇的 displayCategory（音樂劇在 OPENTIX 歸在戲劇底下，一併納入；排除音樂/舞蹈/演唱會）。 */
const DRAMA_CATEGORIES = new Set(['戲劇', '音樂劇']);

interface ProgramListItem {
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

interface ProgramDetail {
	onlineStartTime?: number;
	description?: string;
	programOrganizers?: { name?: string }[];
	eventVenues?: {
		venue?: { name?: string; city?: string };
		events?: { startDateTime?: number; onSaleStartDateTime?: number }[];
	}[];
}

/** OPENTIX：逐頁抓 /programs，前端過濾戲劇，再對每檔補抓詳情拿開賣時間與場館。 */
export async function scrapeOpenTix(): Promise<Show[]> {
	const drama: ProgramListItem[] = [];
	let page = 1;
	for (;;) {
		const res = await politeFetch(`${LIST_API}?page=${page}&rowCount=30`);
		const json = (await res.json()) as {
			result?: { nextPage: number | null; data: ProgramListItem[] };
		};
		const data = json.result?.data ?? [];
		for (const p of data) {
			if (DRAMA_CATEGORIES.has(p.displayCategory)) drama.push(p);
		}
		if (!json.result?.nextPage) break;
		page = json.result.nextPage;
		await sleep(200);
	}

	const fast = process.env.KANXI_FAST === '1';
	const shows: Show[] = [];
	for (const p of drama) {
		let onSaleAt: string | null = null;
		let venue: string | null = null;
		let city = p.cities?.[0] ?? null;
		let description: string | null = null;
		let organizer: string | null = null;
		let sessions: Session[] = [];
		if (!fast) {
			try {
				const dRes = await politeFetch(`${DETAIL_API}/${p.id}`);
				const dJson = (await dRes.json()) as { result?: ProgramDetail };
				const detail = dJson.result;
				onSaleAt = unixToIso(detail?.onlineStartTime);
				venue = detail?.eventVenues?.[0]?.venue?.name ?? null;
				city = detail?.eventVenues?.[0]?.venue?.city ?? city;
				description = detail?.description?.trim() || null;
				organizer = detail?.programOrganizers?.map((o) => o.name).filter(Boolean).join('、') || null;
				sessions = (detail?.eventVenues ?? []).flatMap((ev) =>
					(ev.events ?? []).map((e) => ({
						date: unixToDate(e.startDateTime),
						venue: ev.venue?.name ?? null,
						city: ev.venue?.city ?? null,
						onSaleAt: unixToIso(e.onSaleStartDateTime)
					}))
				);
				await sleep(150);
			} catch {
				/* 詳情補抓失敗不影響列表資料 */
			}
		}
		shows.push({
			id: `opentix:${p.id}`,
			source: 'opentix',
			sourceId: p.id,
			title: p.name,
			category: p.displayCategory,
			startDate: unixToDate(p.startDateTime),
			endDate: unixToDate(p.endDateTime),
			venue,
			city,
			onSaleAt,
			minPrice: p.minPrice ?? null,
			maxPrice: p.maxPrice ?? null,
			imageUrl: p.imageUrl ?? null,
			url: EVENT_URL(p.id),
			heuristic: false,
			description,
			organizer,
			sessions
		});
	}
	return shows;
}
