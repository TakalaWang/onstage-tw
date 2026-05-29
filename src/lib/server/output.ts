import { writeFileSync, mkdirSync } from 'node:fs';
import type { Show } from '../types';
import { SOURCE_LABELS } from '../types';

const OUT_DIR = process.env.ONSTAGE_OUT_DIR ?? 'static';
const SITE_URL = (process.env.ONSTAGE_SITE_URL ?? 'https://onstage-tw.vercel.app').replace(/\/$/, '');
const MAX_FEED_ITEMS = 100;

/** Keep only shows that have not finished yet, sorted by performance date. */
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

/** Pick the most relevant date for the feed item's pubDate. */
function feedDate(s: Show): Date {
	const iso = s.onSaleAt ?? (s.startDate ? `${s.startDate}T00:00:00+08:00` : null);
	const d = iso ? new Date(iso) : new Date(0);
	return Number.isNaN(d.getTime()) ? new Date(0) : d;
}

function renderFeed(shows: Show[], builtAt: string): string {
	// Most recently on-sale / upcoming items first so readers surface new entries.
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
    <title>OnStage TW — Taiwan theatre listings</title>
    <link>${SITE_URL}</link>
    <description>Aggregated theatre performances from OPENTIX, udn, KHAM, ERA and tixCraft.</description>
    <language>zh-TW</language>
    <lastBuildDate>${new Date(builtAt).toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;
}

/**
 * Write the two static artifacts the site serves:
 *   - shows.json : full snapshot the page reads
 *   - feed.xml   : RSS feed users subscribe to in their own reader
 */
export function writeOutputs(shows: Show[]): { count: number } {
	const active = activeShows(shows);
	const builtAt = new Date().toISOString();
	mkdirSync(OUT_DIR, { recursive: true });
	writeFileSync(
		`${OUT_DIR}/shows.json`,
		JSON.stringify({ updatedAt: builtAt, count: active.length, shows: active })
	);
	writeFileSync(`${OUT_DIR}/feed.xml`, renderFeed(active, builtAt));
	return { count: active.length };
}
