import { readFileSync } from 'node:fs';
import type { PageServerLoad } from './$types';
import type { Show } from '$lib/types';

// Static site: the calendar page is prerendered at build time from the committed snapshot.
export const prerender = true;

const SNAPSHOT_PATH = process.env.ONSTAGE_SNAPSHOT ?? 'static/shows.json';
const SITE_URL = (process.env.ONSTAGE_SITE_URL ?? 'https://onstage.takalawang.dev').replace(/\/$/, '');

export const load: PageServerLoad = async () => {
	try {
		const snap = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf-8')) as {
			updatedAt: string;
			shows: Show[];
		};
		return { shows: snap.shows, updatedAt: snap.updatedAt, siteUrl: SITE_URL };
	} catch {
		return { shows: [] as Show[], updatedAt: null, siteUrl: SITE_URL };
	}
};
