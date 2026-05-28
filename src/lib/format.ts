import type { Show, Source } from './types';

const slash = (d: string) => d.replaceAll('-', '/');

/** 演出日期區間文字。 */
export function fmtDateRange(s: { startDate: string | null; endDate: string | null }): string {
	if (!s.startDate) return '日期未定';
	if (!s.endDate || s.endDate === s.startDate) return slash(s.startDate);
	return `${slash(s.startDate)} – ${slash(s.endDate)}`;
}

export function fmtPrice(s: { minPrice: number | null; maxPrice: number | null }): string | null {
	if (s.minPrice == null) return null;
	if (s.maxPrice && s.maxPrice !== s.minPrice)
		return `NT$ ${s.minPrice.toLocaleString()}–${s.maxPrice.toLocaleString()}`;
	return `NT$ ${s.minPrice.toLocaleString()}`;
}

/** 開賣時間 → 「M/D HH:mm 開賣」（台北時區）。 */
export function fmtOnSale(iso: string | null, withTime = false): string | null {
	if (!iso) return null;
	const d = new Date(iso);
	const opts: Intl.DateTimeFormatOptions = {
		timeZone: 'Asia/Taipei',
		month: 'numeric',
		day: 'numeric',
		...(withTime ? { hour: '2-digit', minute: '2-digit', hour12: false } : {})
	};
	return d.toLocaleString('zh-TW', opts);
}

/** 距離開賣的天數（負數代表已開賣）。 */
export function daysUntilOnSale(iso: string | null): number | null {
	if (!iso) return null;
	const ms = new Date(iso).getTime() - Date.now();
	return Math.ceil(ms / 86_400_000);
}

export const SOURCE_COLOR: Record<Source, string> = {
	opentix: 'bg-rose-100 text-rose-800',
	udn: 'bg-amber-100 text-amber-800',
	kham: 'bg-sky-100 text-sky-800',
	era: 'bg-emerald-100 text-emerald-800',
	tixcraft: 'bg-violet-100 text-violet-800'
};

export type { Show };
