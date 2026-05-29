import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Show, Source } from '../types';

const DB_PATH = process.env.ONSTAGE_DB ?? 'data/onstage.db';
mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
	CREATE TABLE IF NOT EXISTS shows (
		id          TEXT PRIMARY KEY,
		source      TEXT NOT NULL,
		source_id   TEXT NOT NULL,
		title       TEXT NOT NULL,
		category    TEXT,
		start_date  TEXT,
		end_date    TEXT,
		venue       TEXT,
		city        TEXT,
		on_sale_at  TEXT,
		min_price   INTEGER,
		max_price   INTEGER,
		image_url   TEXT,
		url         TEXT NOT NULL,
		heuristic   INTEGER NOT NULL DEFAULT 0,
		description TEXT,
		organizer   TEXT,
		sessions    TEXT,
		first_seen_at TEXT NOT NULL,
		updated_at  TEXT NOT NULL
	);

	CREATE TABLE IF NOT EXISTS subscriptions (
		id          INTEGER PRIMARY KEY AUTOINCREMENT,
		email       TEXT NOT NULL,
		keyword     TEXT,
		source      TEXT,
		created_at  TEXT NOT NULL
	);

	-- 已通知過的 (訂閱, 演出) 組合，避免重複寄信
	CREATE TABLE IF NOT EXISTS notified (
		subscription_id INTEGER NOT NULL,
		show_id         TEXT NOT NULL,
		notified_at     TEXT NOT NULL,
		PRIMARY KEY (subscription_id, show_id)
	);
`);

// 為舊資料庫補上新欄位（已存在會丟錯，忽略即可）。
for (const col of ['description TEXT', 'organizer TEXT', 'sessions TEXT']) {
	try {
		db.exec(`ALTER TABLE shows ADD COLUMN ${col}`);
	} catch {
		/* 欄位已存在 */
	}
}

interface ShowRow {
	id: string;
	source: string;
	source_id: string;
	title: string;
	category: string | null;
	start_date: string | null;
	end_date: string | null;
	venue: string | null;
	city: string | null;
	on_sale_at: string | null;
	min_price: number | null;
	max_price: number | null;
	image_url: string | null;
	url: string;
	heuristic: number;
	description: string | null;
	organizer: string | null;
	sessions: string | null;
	first_seen_at: string;
}

function rowToShow(r: ShowRow): Show {
	return {
		id: r.id,
		source: r.source as Source,
		sourceId: r.source_id,
		title: r.title,
		category: r.category,
		startDate: r.start_date,
		endDate: r.end_date,
		venue: r.venue,
		city: r.city,
		onSaleAt: r.on_sale_at,
		minPrice: r.min_price,
		maxPrice: r.max_price,
		imageUrl: r.image_url,
		url: r.url,
		heuristic: r.heuristic === 1,
		description: r.description,
		organizer: r.organizer,
		sessions: r.sessions ? JSON.parse(r.sessions) : []
	};
}

const upsertStmt = db.prepare(`
	INSERT INTO shows (id, source, source_id, title, category, start_date, end_date,
		venue, city, on_sale_at, min_price, max_price, image_url, url, heuristic,
		description, organizer, sessions, first_seen_at, updated_at)
	VALUES (@id, @source, @source_id, @title, @category, @start_date, @end_date,
		@venue, @city, @on_sale_at, @min_price, @max_price, @image_url, @url, @heuristic,
		@description, @organizer, @sessions, @now, @now)
	ON CONFLICT(id) DO UPDATE SET
		title = excluded.title,
		category = excluded.category,
		start_date = excluded.start_date,
		end_date = excluded.end_date,
		venue = excluded.venue,
		city = excluded.city,
		on_sale_at = excluded.on_sale_at,
		min_price = excluded.min_price,
		max_price = excluded.max_price,
		image_url = excluded.image_url,
		url = excluded.url,
		heuristic = excluded.heuristic,
		description = excluded.description,
		organizer = excluded.organizer,
		sessions = excluded.sessions,
		updated_at = excluded.updated_at
`);

/** 批次寫入（upsert）一組演出，回傳這批裡「新出現」的演出數量。 */
export function upsertShows(shows: Show[]): { inserted: number; total: number } {
	const now = new Date().toISOString();
	let inserted = 0;
	const existing = db.prepare('SELECT 1 FROM shows WHERE id = ?');
	const tx = db.transaction((batch: Show[]) => {
		for (const s of batch) {
			const isNew = !existing.get(s.id);
			if (isNew) inserted++;
			upsertStmt.run({
				id: s.id,
				source: s.source,
				source_id: s.sourceId,
				title: s.title,
				category: s.category,
				start_date: s.startDate,
				end_date: s.endDate,
				venue: s.venue,
				city: s.city,
				on_sale_at: s.onSaleAt,
				min_price: s.minPrice,
				max_price: s.maxPrice,
				image_url: s.imageUrl,
				url: s.url,
				heuristic: s.heuristic ? 1 : 0,
				description: s.description,
				organizer: s.organizer,
				sessions: s.sessions?.length ? JSON.stringify(s.sessions) : null,
				now
			});
		}
	});
	tx(shows);
	return { inserted, total: shows.length };
}

/**
 * 剪除過期資料：對「本次抓取成功」的來源，刪掉這次沒更新到的舊節目
 * （代表已從來源下架）。失敗的來源不剪，避免暫時性錯誤把資料清空。
 */
export function pruneStaleShows(sources: Source[], before: string): number {
	if (sources.length === 0) return 0;
	const placeholders = sources.map(() => '?').join(',');
	const result = db
		.prepare(`DELETE FROM shows WHERE source IN (${placeholders}) AND updated_at < ?`)
		.run(...sources, before);
	return result.changes;
}

/** 取得用於瀏覽的演出清單：尚未結束（或無日期）的，依演出日排序。 */
export function getActiveShows(): Show[] {
	const today = new Date().toISOString().slice(0, 10);
	const rows = db
		.prepare(
			`SELECT * FROM shows
			 WHERE end_date IS NULL OR end_date >= @today
			 ORDER BY (start_date IS NULL), start_date ASC`
		)
		.all({ today }) as ShowRow[];
	return rows.map(rowToShow);
}

/** 給通知用：所有演出。 */
export function getAllShows(): Show[] {
	const rows = db.prepare('SELECT * FROM shows').all() as ShowRow[];
	return rows.map(rowToShow);
}

export interface Subscription {
	id: number;
	email: string;
	keyword: string | null;
	source: string | null;
}

export function addSubscription(email: string, keyword: string | null, source: string | null): void {
	db.prepare(
		'INSERT INTO subscriptions (email, keyword, source, created_at) VALUES (?, ?, ?, ?)'
	).run(email, keyword, source, new Date().toISOString());
}

export function getSubscriptions(): Subscription[] {
	return db.prepare('SELECT id, email, keyword, source FROM subscriptions').all() as Subscription[];
}

export function wasNotified(subscriptionId: number, showId: string): boolean {
	return !!db
		.prepare('SELECT 1 FROM notified WHERE subscription_id = ? AND show_id = ?')
		.get(subscriptionId, showId);
}

export function markNotified(subscriptionId: number, showId: string): void {
	db.prepare(
		'INSERT OR IGNORE INTO notified (subscription_id, show_id, notified_at) VALUES (?, ?, ?)'
	).run(subscriptionId, showId, new Date().toISOString());
}
