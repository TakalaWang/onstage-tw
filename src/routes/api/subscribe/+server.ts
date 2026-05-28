import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { addSubscription } from '$lib/server/db';

export const prerender = false;

/** POST /api/subscribe — 建立關鍵字 / 來源訂閱（需伺服器，靜態 demo 不提供）。 */
export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => ({}));
	const email = String(body.email ?? '').trim();
	const keyword = String(body.keyword ?? '').trim();
	const source = String(body.source ?? '').trim();

	if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw error(400, '請輸入有效的 Email');
	if (!keyword && !source) throw error(400, '請至少設定一個關鍵字或來源');

	addSubscription(email, keyword || null, source || null);
	return json({ success: true });
};
