import nodemailer from 'nodemailer';
import type { Show } from '../types';
import { SOURCE_LABELS } from '../types';
import { getAllShows, getSubscriptions, wasNotified, markNotified, type Subscription } from './db';

/** 一筆訂閱是否匹配某檔演出。 */
function matches(sub: Subscription, show: Show): boolean {
	if (sub.source && show.source !== sub.source) return false;
	if (sub.keyword) {
		const hay = `${show.title} ${show.venue ?? ''} ${show.category ?? ''}`.toLowerCase();
		if (!hay.includes(sub.keyword.toLowerCase())) return false;
	}
	return true;
}

function buildTransport() {
	const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
	if (!SMTP_HOST) return null;
	return nodemailer.createTransport({
		host: SMTP_HOST,
		port: Number(SMTP_PORT ?? 587),
		secure: Number(SMTP_PORT) === 465,
		auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined
	});
}

function renderEmail(matched: Show[]): string {
	const items = matched
		.map(
			(s) =>
				`• ${s.title}（${SOURCE_LABELS[s.source]}）` +
				`${s.startDate ? ` ${s.startDate.replaceAll('-', '/')}` : ''}` +
				`${s.venue ? ` @ ${s.venue}` : ''}\n  ${s.url}`
		)
		.join('\n\n');
	return `你訂閱的戲劇有新演出：\n\n${items}\n\n— 看戲 OnStage TW`;
}

/**
 * 比對所有訂閱與目前的演出，對「尚未通知過」的匹配寄信。
 * 未設定 SMTP_HOST 時改為印出（dry-run），方便本地測試。
 */
export async function runNotifications(): Promise<{ sent: number; dryRun: boolean }> {
	const transport = buildTransport();
	const dryRun = !transport;
	const from = process.env.MAIL_FROM ?? 'onstage-tw <no-reply@onstage.local>';
	const shows = getAllShows();
	const subs = getSubscriptions();

	let sent = 0;
	for (const sub of subs) {
		const fresh = shows.filter((s) => matches(sub, s) && !wasNotified(sub.id, s.id));
		if (fresh.length === 0) continue;

		const subject = `看戲｜${sub.keyword ?? SOURCE_LABELS[sub.source as keyof typeof SOURCE_LABELS] ?? '戲劇'} 有 ${fresh.length} 檔新演出`;
		const text = renderEmail(fresh);

		if (dryRun) {
			console.log(`\n[dry-run] → ${sub.email}\n主旨：${subject}\n${text}`);
		} else {
			await transport!.sendMail({ from, to: sub.email, subject, text });
		}
		for (const s of fresh) markNotified(sub.id, s.id);
		sent++;
	}
	return { sent, dryRun };
}
