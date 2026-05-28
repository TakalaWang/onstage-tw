import { readFileSync } from 'node:fs';
import type { PageServerLoad } from './$types';
import type { Show } from '$lib/types';

// KANXI_STATIC=1 時把首頁 prerender 成靜態 HTML（資料來自 build 時的快照）；
// 自架 node 模式則維持 SSR，每次請求讀最新快照。
export const prerender = process.env.KANXI_STATIC === '1';

// 優先讀自訂快照路徑（持久化 volume），讀不到則退回打包進 image 的初始快照。
const SNAPSHOT_PATHS = [process.env.KANXI_SNAPSHOT, 'static/shows.json'].filter(
	(p): p is string => !!p
);

export const load: PageServerLoad = async () => {
	for (const path of SNAPSHOT_PATHS) {
		try {
			const snap = JSON.parse(readFileSync(path, 'utf-8')) as {
				updatedAt: string;
				shows: Show[];
			};
			return { shows: snap.shows, updatedAt: snap.updatedAt, subscribeEnabled };
		} catch {
			/* 試下一個路徑 */
		}
	}
	return { shows: [] as Show[], updatedAt: null, subscribeEnabled };
};

// 靜態 demo（KANXI_STATIC=1）沒有伺服器，訂閱功能僅自架版提供。
const subscribeEnabled = process.env.KANXI_STATIC !== '1';
