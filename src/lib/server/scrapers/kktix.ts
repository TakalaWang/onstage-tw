import type { Show, Session } from '../../types';
import { politeFetch, sleep, classifyGenre, looksTheatrical, cityFromText } from './util';

// KKTIX's site-wide drama discovery page is Cloudflare-blocked, but each organizer's
// `events.json` and event pages are openly fetchable. We track known theatre organizers.
//   mode 'all'    — the whole account is theatre
//   mode 'filter' — mixed account; keep only events that look theatrical
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
	{ slug: 'kafka', mode: 'filter' }
];

const MAX_PER_ORG = 12;

interface FeedEntry {
	url: string;
	published: string;
	title: string;
	summary?: string;
	content?: string;
}

interface LdEvent {
	'@type'?: string;
	name?: string;
	startDate?: string;
	endDate?: string;
	location?: { name?: string; address?: string };
	offers?: { price?: number; priceCurrency?: string; validFrom?: string }[];
}

function parseEventPage(html: string): {
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
		} catch {
			/* skip malformed block */
		}
	}
	const image = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i)?.[1] ?? null;
	return { detail, image };
}

/** KKTIX: per-organizer events.json → per-event schema.org JSON-LD. No browser needed. */
export async function scrapeKktix(): Promise<Show[]> {
	const nowIso = new Date().toISOString();
	const shows: Show[] = [];

	for (const org of ORGANIZERS) {
		let entries: FeedEntry[] = [];
		try {
			const res = await politeFetch(`https://${org.slug}.kktix.cc/events.json`);
			entries = ((await res.json()) as { entry?: FeedEntry[] }).entry ?? [];
		} catch {
			continue; // organizer feed missing / unreachable
		}

		const upcoming = entries
			.filter((e) => e.published && new Date(e.published).toISOString() >= nowIso)
			.filter((e) => org.mode === 'all' || looksTheatrical(e.title, e.summary, e.content))
			.slice(0, MAX_PER_ORG);

		for (const entry of upcoming) {
			const idMatch = entry.url.match(/\/\/([^.]+)\.kktix\.cc\/events\/([^/?#]+)/);
			if (!idMatch) continue;
			const id = `${idMatch[1]}/${idMatch[2]}`;
			try {
				const page = await politeFetch(entry.url);
				const { detail, image } = parseEventPage(await page.text());
				await sleep(500);

				const offers = detail?.offers ?? [];
				const prices = offers.map((o) => o.price).filter((p): p is number => !!p && p > 0);
				const onSale = offers
					.map((o) => o.validFrom)
					.filter((v): v is string => !!v)
					.sort()[0];
				const venue = detail?.location?.name ?? null;
				const title = detail?.name ?? entry.title;

				shows.push({
					id: `kktix:${id}`,
					source: 'kktix',
					sourceId: id,
					title,
					category: classifyGenre(title),
					startDate: (detail?.startDate ?? entry.published)?.slice(0, 10) ?? null,
					endDate: detail?.endDate?.slice(0, 10) ?? null,
					venue,
					city: cityFromText(detail?.location?.address ?? venue),
					onSaleAt: onSale ? new Date(onSale).toISOString() : null,
					minPrice: prices.length ? Math.min(...prices) : null,
					maxPrice: prices.length ? Math.max(...prices) : null,
					imageUrl: image,
					url: entry.url,
					description: detail ? null : (entry.summary ?? null),
					organizer: null,
					sessions: [] as Session[]
				});
			} catch {
				/* skip this event */
			}
		}
	}
	return shows;
}
