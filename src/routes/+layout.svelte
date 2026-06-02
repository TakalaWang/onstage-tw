<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { afterNavigate } from '$app/navigation';
	import { env } from '$env/dynamic/public';
	import { initGA, trackPageview } from '$lib/gtag';

	let { children } = $props();

	// 選填：Google Search Console 的 meta tag 驗證碼（備案，沒設就不渲染）。
	const siteVerification = env.PUBLIC_GOOGLE_SITE_VERIFICATION;

	// afterNavigate 在首次載入與之後每次換頁都會觸發，剛好對應每一次 page_view。
	afterNavigate(() => {
		initGA();
		trackPageview();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	{#if siteVerification}
		<meta name="google-site-verification" content={siteVerification} />
	{/if}
</svelte:head>
{@render children()}
