import type { Show } from './types';

function pad(n: number): string {
	return String(n).padStart(2, '0');
}

function toUtcStamp(d: Date): string {
	return (
		`${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
		`T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
	);
}

function dateValue(isoDate: string, addDays = 0): string {
	const d = new Date(`${isoDate}T00:00:00Z`);
	d.setUTCDate(d.getUTCDate() + addDays);
	return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

function esc(text: string): string {
	return text.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
}

function fold(line: string): string {
	const enc = new TextEncoder();
	if (enc.encode(line).length <= 75) return line;
	const segments: string[] = [];
	let cur = '';
	let bytes = 0;
	let max = 75;
	for (const ch of line) {
		const b = enc.encode(ch).length;
		if (bytes + b > max) {
			segments.push(cur);
			cur = '';
			bytes = 0;
			max = 74;
		}
		cur += ch;
		bytes += b;
	}
	if (cur) segments.push(cur);
	return segments.join('\r\n ');
}

export function buildShowIcs(show: Show): string {
	const stamp = toUtcStamp(new Date());
	const uid = show.id.replace(/[^\w]/g, '_');
	const loc = [show.venue, show.city].filter(Boolean).join(' ');
	const lines: string[] = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//OnStage TW//onstage-tw//ZH-TW',
		'CALSCALE:GREGORIAN',
	];

	if (show.startDate) {
		lines.push(
			'BEGIN:VEVENT',
			`UID:perf-${uid}@onstage-tw`,
			`DTSTAMP:${stamp}`,
			`DTSTART;VALUE=DATE:${dateValue(show.startDate)}`,
			`DTEND;VALUE=DATE:${dateValue(show.endDate ?? show.startDate, 1)}`,
			`SUMMARY:${esc(`🎭 ${show.title}`)}`,
			...(loc ? [`LOCATION:${esc(loc)}`] : []),
			`URL:${esc(show.url)}`,
			'END:VEVENT',
		);
	}

	if (show.onSaleAt) {
		const d = new Date(show.onSaleAt);
		lines.push(
			'BEGIN:VEVENT',
			`UID:onsale-${uid}@onstage-tw`,
			`DTSTAMP:${stamp}`,
			`DTSTART:${toUtcStamp(d)}`,
			`DTEND:${toUtcStamp(new Date(d.getTime() + 30 * 60000))}`,
			`SUMMARY:${esc(`🎟 開賣：${show.title}`)}`,
			`DESCRIPTION:${esc(show.url)}`,
			'BEGIN:VALARM',
			'ACTION:DISPLAY',
			'TRIGGER:-PT30M',
			`DESCRIPTION:${esc(`開賣提醒：${show.title}`)}`,
			'END:VALARM',
			'END:VEVENT',
		);
	}

	lines.push('END:VCALENDAR');
	return lines.map(fold).join('\r\n');
}

export function downloadShowIcs(show: Show): void {
	const blob = new Blob([buildShowIcs(show)], { type: 'text/calendar;charset=utf-8' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `onstage-${show.sourceId || 'event'}.ics`;
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
}
