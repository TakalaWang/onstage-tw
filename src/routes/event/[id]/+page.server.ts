import { readFileSync } from 'node:fs';
import { error } from '@sveltejs/kit';
import type { PageServerLoad, EntryGenerator } from './$types';
import type { Show } from '$lib/types';
import { eventSlug } from '$lib/slug';

export const prerender = true;

const SNAPSHOT_PATH = process.env.ONSTAGE_SNAPSHOT ?? 'static/shows.json';
const DESC_PATH = process.env.ONSTAGE_DESCRIPTIONS ?? 'static/descriptions.json';
const SITE_URL = (process.env.ONSTAGE_SITE_URL ?? 'https://onstage.takalawang.dev').replace(/\/$/, '');

function loadShows(): Show[] {
	try {
		return (JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf-8')) as { shows: Show[] }).shows;
	} catch {
		return [];
	}
}

export const entries: EntryGenerator = () => loadShows().map((s) => ({ id: eventSlug(s.id) }));

export const load: PageServerLoad = async ({ params }) => {
	const show = loadShows().find((s) => eventSlug(s.id) === params.id);
	if (!show) throw error(404, '找不到這個演出');

	let description = show.description;
	if (!description) {
		try {
			const map = JSON.parse(readFileSync(DESC_PATH, 'utf-8')) as Record<string, string>;
			description = map[show.id] ?? null;
		} catch {
			/* descriptions optional */
		}
	}

	return { show: { ...show, description }, siteUrl: SITE_URL };
};
