import type { Show, Source } from './types';

const slash = (d: string) => d.replaceAll('-', '/');

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

export function fmtOnSale(iso: string | null, withTime = false): string | null {
	if (!iso) return null;
	const d = new Date(iso);
	const opts: Intl.DateTimeFormatOptions = {
		timeZone: 'Asia/Taipei',
		month: 'numeric',
		day: 'numeric',
		...(withTime ? { hour: '2-digit', minute: '2-digit', hour12: false } : {}),
	};
	return d.toLocaleString('zh-TW', opts);
}

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
	kktix: 'bg-indigo-100 text-indigo-800',
	accupass: 'bg-orange-100 text-orange-800',
};

export type { Show };
