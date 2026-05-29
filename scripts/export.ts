/** Regenerate shows.json + all RSS feeds from the existing snapshot (no scraping). */
import { readFileSync } from 'node:fs';
import { writeOutputs } from '../src/lib/server/output';
import type { Show } from '../src/lib/types';

const snap = JSON.parse(readFileSync('static/shows.json', 'utf-8')) as { shows: Show[] };
const { count } = writeOutputs(snap.shows);
console.log(`Re-exported ${count} shows + feeds.`);
process.exit(0);
