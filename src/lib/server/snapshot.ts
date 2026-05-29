import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { getActiveShows } from './db';

const SNAPSHOT_PATH = process.env.ONSTAGE_SNAPSHOT ?? 'static/shows.json';

/**
 * 把目前的演出輸出成靜態 JSON 快照。頁面讀這份快照（而非直接讀 DB），
 * 因此可部署到任何靜態 / serverless 主機；排程抓取後重新產生即更新。
 */
export function writeSnapshot(): { path: string; count: number } {
	const shows = getActiveShows();
	mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
	writeFileSync(
		SNAPSHOT_PATH,
		JSON.stringify({ updatedAt: new Date().toISOString(), count: shows.length, shows })
	);
	return { path: SNAPSHOT_PATH, count: shows.length };
}
