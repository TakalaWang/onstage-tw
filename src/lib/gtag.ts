import { browser } from '$app/environment';
import { env } from '$env/dynamic/public';

// GA4 測量 ID（格式 G-XXXXXXXXXX）。沒設定時所有函式都會自動 no-op，
// 本機開發 / 預覽不會送出任何資料。
export const GA_ID = env.PUBLIC_GA_ID ?? '';

let loaded = false;

// 載入 gtag.js 並初始化。可重複呼叫，只會真正載入一次。
export function initGA() {
	if (!browser || !GA_ID || loaded) return;
	loaded = true;

	const script = document.createElement('script');
	script.async = true;
	script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
	document.head.appendChild(script);

	window.dataLayer = window.dataLayer || [];
	window.gtag = function gtag() {
		// eslint-disable-next-line prefer-rest-params
		window.dataLayer.push(arguments);
	};
	window.gtag('js', new Date());
	// page_view 改由 SvelteKit 換頁時手動送出，這裡關掉自動送出以免首次重複計算。
	window.gtag('config', GA_ID, { send_page_view: false });
}

// 送出一次 page_view。SvelteKit 是 SPA，第一次載入後的換頁不會重新整理頁面，
// 所以需要在每次導覽後手動送出。
export function trackPageview() {
	if (!browser || !GA_ID || !window.gtag) return;
	window.gtag('event', 'page_view', {
		page_location: window.location.href,
		page_title: document.title,
	});
}
