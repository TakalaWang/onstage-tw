import type { Show, Session } from '../../types';
import {
	politeFetch,
	sleep,
	classifyGenre,
	looksTheatrical,
	cityFromText,
	hasYouthSeat,
} from './util';

const ORGANIZERS: { slug: string; mode: 'all' | 'filter' }[] = [
	{ slug: 'godot', mode: 'all' },
	{ slug: 'storyworks', mode: 'all' },
	{ slug: 'allupe0ple', mode: 'all' },
	{ slug: 'ourtheatrenet', mode: 'all' },
	{ slug: 'ourtheatre', mode: 'all' },
	{ slug: 'greenray', mode: 'all' },
	{ slug: 'cmusical', mode: 'all' },
	{ slug: 'thepoint', mode: 'all' },
	{ slug: 'paperwindmill', mode: 'all' },
	{ slug: 'theuumouth', mode: 'all' },
	{ slug: 'comedyclub', mode: 'all' },
	{ slug: 'cohesionmusic', mode: 'filter' },
	{ slug: 'iwillshare', mode: 'filter' },
	{ slug: 'ntt', mode: 'filter' },
	{ slug: 'weiwuying', mode: 'filter' },
	{ slug: 'kafka', mode: 'filter' },
];

const MAX_PER_ORG = 12;

export interface FeedEntry {
	url: string;
	published: string;
	title: string;
	summary?: string;
	content?: string;
}

export interface LdEvent {
	'@type'?: string;
	name?: string;
	startDate?: string;
	endDate?: string;
	location?: { name?: string; address?: string };
	offers?: { price?: number; priceCurrency?: string; validFrom?: string }[];
}

export function parseEventPage(html: string): {
	detail: LdEvent | null;
	image: string | null;
} {
	let detail: LdEvent | null = null;
	const blocks = html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi);
	for (const m of blocks) {
		try {
			const parsed = JSON.parse(m[1].trim());
			const arr = Array.isArray(parsed) ? parsed : [parsed];
			const ev = arr.find((o) => o && o['@type'] === 'Event');
			if (ev) {
				detail = ev as LdEvent;
				break;
			}
		} catch {}
	}
	const image = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i)?.[1] ?? null;
	return { detail, image };
}

export function filterKktixEntries(entries: FeedEntry[], mode: 'all' | 'filter'): FeedEntry[] {
	return entries
		.filter((e) => mode === 'all' || looksTheatrical(e.title, e.summary, e.content))
		.slice(0, MAX_PER_ORG);
}

export function buildKktixShow(
	entry: FeedEntry,
	detail: LdEvent | null,
	image: string | null,
	today: string,
): Show | null {
	const idMatch = entry.url.match(/\/\/([^.]+)\.kktix\.cc\/events\/([^/?#]+)/);
	if (!idMatch) return null;
	const id = `${idMatch[1]}/${idMatch[2]}`;

	const offers = detail?.offers ?? [];
	const prices = offers.map((o) => o.price).filter((p): p is number => !!p && p > 0);
	const onSale = offers
		.map((o) => o.validFrom)
		.filter((v): v is string => !!v)
		.sort()[0];
	const venue = detail?.location?.name ?? null;
	const title = detail?.name ?? entry.title;
	const startDate = detail?.startDate?.slice(0, 10) ?? null;
	const endDate = detail?.endDate?.slice(0, 10) ?? null;

	const effectiveEnd = endDate ?? startDate;
	if (effectiveEnd && effectiveEnd < today) return null;

	const youthSeat = hasYouthSeat(entry.summary, entry.content, entry.title);

	return {
		id: `kktix:${id}`,
		source: 'kktix',
		sourceId: id,
		title,
		category: classifyGenre(title),
		startDate,
		endDate,
		venue,
		city: cityFromText(detail?.location?.address ?? venue),
		onSaleAt: onSale ? new Date(onSale).toISOString() : null,
		minPrice: prices.length ? Math.min(...prices) : null,
		maxPrice: prices.length ? Math.max(...prices) : null,
		imageUrl: image,
		url: entry.url,
		description: detail ? null : (entry.summary ?? null),
		notes: null,
		youthSeat,
		introImages: [],
		organizer: null,
		sessions: [] as Session[],
	};
}

export async function scrapeKktix(): Promise<Show[]> {
	const today = new Date().toISOString().slice(0, 10);
	const shows: Show[] = [];

	for (const org of ORGANIZERS) {
		let entries: FeedEntry[];
		try {
			const res = await politeFetch(`https://${org.slug}.kktix.cc/events.json`);
			entries = ((await res.json()) as { entry?: FeedEntry[] }).entry ?? [];
		} catch {
			continue;
		}

		const candidates = filterKktixEntries(entries, org.mode);

		for (const entry of candidates) {
			try {
				const page = await politeFetch(entry.url);
				const { detail, image } = parseEventPage(await page.text());
				await sleep(500);

				const show = buildKktixShow(entry, detail, image, today);
				if (show) shows.push(show);
			} catch {}
		}
	}
	return shows;
}
