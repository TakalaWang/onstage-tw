import { writeFileSync, mkdirSync } from 'node:fs';
import type { Show, Source } from '../types';
import { SOURCE_LABELS } from '../types';
import { GENRE_SLUG } from '../genres';

const OUT_DIR = process.env.ONSTAGE_OUT_DIR ?? 'static';
const SITE_URL = (process.env.ONSTAGE_SITE_URL ?? 'https://onstage.takalawang.dev').replace(/\/$/, '');
const MAX_FEED_ITEMS = 100;

function activeShows(shows: Show[]): Show[] {
	const today = new Date().toISOString().slice(0, 10);
	return shows
		.filter((s) => !s.endDate || s.endDate >= today)
		.sort((a, b) => (a.startDate ?? '9999').localeCompare(b.startDate ?? '9999'));
}

function escapeXml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

function feedDate(s: Show): Date {
	const iso = s.onSaleAt ?? (s.startDate ? `${s.startDate}T00:00:00+08:00` : null);
	const d = iso ? new Date(iso) : new Date(0);
	return Number.isNaN(d.getTime()) ? new Date(0) : d;
}

function renderFeed(shows: Show[], builtAt: string, titleSuffix = ''): string {
	const items = [...shows]
		.sort((a, b) => feedDate(b).getTime() - feedDate(a).getTime())
		.slice(0, MAX_FEED_ITEMS)
		.map((s) => {
			const parts = [
				s.startDate ? `Date: ${s.startDate}${s.endDate && s.endDate !== s.startDate ? ` – ${s.endDate}` : ''}` : null,
				s.venue ? `Venue: ${s.venue}${s.city ? `, ${s.city}` : ''}` : null,
				s.onSaleAt ? `On sale: ${s.onSaleAt.slice(0, 10)}` : null,
				`Source: ${SOURCE_LABELS[s.source]}`
			].filter(Boolean);
			return `    <item>
      <title>${escapeXml(s.title)}</title>
      <link>${escapeXml(s.url)}</link>
      <guid isPermaLink="false">${escapeXml(s.id)}</guid>
      <pubDate>${feedDate(s).toUTCString()}</pubDate>
      ${s.category ? `<category>${escapeXml(s.category)}</category>` : ''}
      <description>${escapeXml(parts.join(' · '))}</description>
    </item>`;
		})
		.join('\n');

	return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(`幕間 OnStage TW — 台灣戲劇演出${titleSuffix}`)}</title>
    <link>${SITE_URL}</link>
    <description>Aggregated theatre performances from OPENTIX, udn, KHAM, ERA and KKTIX.</description>
    <language>zh-TW</language>
    <lastBuildDate>${new Date(builtAt).toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;
}

export function writeOutputs(shows: Show[]): { count: number } {
	const active = activeShows(shows);
	const builtAt = new Date().toISOString();
	mkdirSync(OUT_DIR, { recursive: true });

	const descriptions: Record<string, string> = {};
	const light = active.map((s) => {
		if (s.description) descriptions[s.id] = s.description;
		const imageUrl = s.imageUrl?.replace(/^http:\/\//i, 'https://') ?? null;
		return { ...s, imageUrl, description: null };
	});
	writeFileSync(
		`${OUT_DIR}/shows.json`,
		JSON.stringify({ updatedAt: builtAt, count: light.length, shows: light })
	);
	writeFileSync(`${OUT_DIR}/descriptions.json`, JSON.stringify(descriptions));
	writeFileSync(`${OUT_DIR}/feed.xml`, renderFeed(active, builtAt));

	const sources = [...new Set(active.map((s) => s.source))] as Source[];
	for (const src of sources) {
		writeFileSync(
			`${OUT_DIR}/feed-${src}.xml`,
			renderFeed(
				active.filter((s) => s.source === src),
				builtAt,
				`（${SOURCE_LABELS[src]}）`
			)
		);
	}

	const genres = [...new Set(active.map((s) => s.category).filter((c): c is string => !!c))];
	for (const genre of genres) {
		const slug = GENRE_SLUG[genre];
		if (!slug) continue;
		writeFileSync(
			`${OUT_DIR}/feed-genre-${slug}.xml`,
			renderFeed(
				active.filter((s) => s.category === genre),
				builtAt,
				`（${genre}）`
			)
		);
	}
	return { count: active.length };
}
