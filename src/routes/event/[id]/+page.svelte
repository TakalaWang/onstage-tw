<script lang="ts">
	import { SOURCE_LABELS } from '$lib/types';
	import { fmtDateRange, fmtPrice, fmtOnSale, SOURCE_COLOR } from '$lib/format';
	import { downloadShowIcs } from '$lib/ics';
	import { eventPath } from '$lib/slug';
	import { initialDark, applyDark } from '$lib/theme';
	import Icon from '$lib/components/Icon.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const show = $derived(data.show);

	let dark = $state(initialDark());
	let shared = $state(false);

	function toggleTheme() {
		dark = !dark;
		applyDark(dark);
	}

	const canonical = $derived(`${data.siteUrl}${eventPath(show.id)}`);

	const metaDescription = $derived(
		[
			fmtDateRange(show),
			show.venue ? `${show.venue}${show.city ? ` · ${show.city}` : ''}` : show.city,
			fmtPrice(show) ? `票價 ${fmtPrice(show)}` : null,
			show.category,
		]
			.filter(Boolean)
			.join('｜'),
	);

	const ogImage = $derived(show.imageUrl ?? `${data.siteUrl}/og.svg`);

	const jsonLd = $derived(
		JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'Event',
			name: show.title,
			url: canonical,
			...(show.startDate ? { startDate: show.startDate } : {}),
			...(show.endDate ? { endDate: show.endDate } : {}),
			...(show.imageUrl ? { image: show.imageUrl } : {}),
			...(show.description ? { description: show.description } : {}),
			...(show.venue
				? { location: { '@type': 'Place', name: show.venue + (show.city ? ` ${show.city}` : '') } }
				: {}),
			...(show.organizer ? { organizer: { '@type': 'Organization', name: show.organizer } } : {}),
			...(show.minPrice != null
				? {
						offers: {
							'@type': 'Offer',
							price: show.minPrice,
							priceCurrency: 'TWD',
							url: show.url,
						},
					}
				: {}),
		}).replace(/</g, '\\u003c'),
	);

	async function share() {
		try {
			if (navigator.share)
				await navigator.share({ title: `${show.title}｜幕間 OnStage TW`, url: canonical });
			else {
				await navigator.clipboard.writeText(canonical);
				shared = true;
				setTimeout(() => (shared = false), 1800);
			}
		} catch {
			/* cancelled / unsupported */
		}
	}
</script>

<svelte:head>
	<title>{show.title}｜幕間 OnStage TW</title>
	<meta name="description" content={metaDescription} />
	<link rel="canonical" href={canonical} />
	<meta property="og:type" content="article" />
	<meta property="og:title" content={`${show.title}｜幕間 OnStage TW`} />
	<meta property="og:description" content={metaDescription} />
	<meta property="og:url" content={canonical} />
	<meta property="og:image" content={ogImage} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={`${show.title}｜幕間 OnStage TW`} />
	<meta name="twitter:description" content={metaDescription} />
	<meta name="twitter:image" content={ogImage} />
	{@html `<script type="application/ld+json">${jsonLd}</` + `script>`}
</svelte:head>

<header class="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
	<a href="/" class="flex items-center gap-2 text-lg font-bold">
		幕間 <span class="font-display text-base font-normal italic text-gray-400">OnStage TW</span>
	</a>
	<div class="flex items-center gap-2">
		<a
			href="/"
			class="rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition hover:border-curtain-400 hover:text-curtain-600 dark:border-white/15 dark:text-gray-300"
		>
			← 所有演出
		</a>
		<button
			onclick={toggleTheme}
			aria-label="切換深色 / 淺色模式"
			class="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition hover:border-curtain-400 dark:border-white/15 dark:bg-white/5 dark:text-gray-300"
		>
			<Icon name={dark ? 'sun' : 'moon'} size={16} />
		</button>
	</div>
</header>

<main class="mx-auto max-w-3xl px-4 pb-16 sm:px-5">
	<article
		class="overflow-hidden rounded-3xl border border-curtain-100 bg-white shadow-sm dark:border-white/10 dark:bg-[#1e1716]"
	>
		{#if show.imageUrl}
			<img
				src={show.imageUrl}
				alt={show.title}
				referrerpolicy="no-referrer"
				class="max-h-96 w-full bg-curtain-950 object-contain"
			/>
		{/if}

		<div class="space-y-5 p-6">
			<div class="flex items-start justify-between gap-3">
				<div class="flex flex-wrap items-center gap-2 pt-1">
					<span class="rounded-full px-2 py-0.5 text-xs font-medium {SOURCE_COLOR[show.source]}">
						{SOURCE_LABELS[show.source]}
					</span>
					{#if show.category}<span class="text-xs text-gray-500">{show.category}</span>{/if}
				</div>
				<a
					href={show.url}
					target="_blank"
					rel="noopener noreferrer"
					class="flex shrink-0 items-center gap-1.5 rounded-full bg-curtain-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-curtain-700 active:scale-95"
				>
					前往購票 <Icon name="arrow-up-right" size={15} />
				</a>
			</div>

			<h1
				class="font-display text-2xl font-semibold leading-snug text-gray-900 sm:text-3xl dark:text-gray-100"
			>
				{show.title}
			</h1>

			<dl class="grid grid-cols-[1.25rem_auto_1fr] items-center gap-x-2 gap-y-3 text-sm">
				<Icon name="calendar" size={16} class="text-curtain-500" />
				<dt class="text-gray-400">演出日期</dt>
				<dd class="text-gray-800 dark:text-gray-200">{fmtDateRange(show)}</dd>
				{#if show.venue || show.city}
					<Icon name="map-pin" size={16} class="text-curtain-500" />
					<dt class="text-gray-400">場館</dt>
					<dd class="text-gray-800 dark:text-gray-200">
						{show.venue ?? ''}{show.city ? ` · ${show.city}` : ''}
					</dd>
				{/if}
				{#if fmtOnSale(show.onSaleAt, true)}
					<Icon name="ticket" size={16} class="text-curtain-500" />
					<dt class="text-gray-400">開賣時間</dt>
					<dd class="font-medium text-curtain-600">{fmtOnSale(show.onSaleAt, true)}</dd>
				{/if}
				{#if fmtPrice(show)}
					<Icon name="tag" size={16} class="text-curtain-500" />
					<dt class="text-gray-400">票價</dt>
					<dd class="text-gray-800 dark:text-gray-200">{fmtPrice(show)}</dd>
				{/if}
				{#if show.organizer}
					<Icon name="building" size={16} class="text-curtain-500" />
					<dt class="text-gray-400">主辦</dt>
					<dd class="text-gray-800 dark:text-gray-200">{show.organizer}</dd>
				{/if}
				{#if show.notes}
					<Icon name="clock" size={16} class="text-curtain-500" />
					<dt class="text-gray-400">演出資訊</dt>
					<dd class="text-gray-800 dark:text-gray-200">{show.notes}</dd>
				{/if}
			</dl>

			<div class="flex flex-wrap gap-2">
				<button
					type="button"
					onclick={() => downloadShowIcs(show)}
					class="flex items-center gap-1.5 rounded-full border border-gray-300 px-3.5 py-1.5 text-sm text-gray-600 transition hover:border-curtain-400 hover:text-curtain-600 dark:border-white/15 dark:text-gray-300"
				>
					<Icon name="calendar-plus" size={15} /> 加入行事曆{show.onSaleAt ? '（含開賣提醒）' : ''}
				</button>
				<button
					type="button"
					onclick={share}
					class="flex items-center gap-1.5 rounded-full border border-gray-300 px-3.5 py-1.5 text-sm text-gray-600 transition hover:border-curtain-400 hover:text-curtain-600 dark:border-white/15 dark:text-gray-300"
				>
					<Icon name="share" size={15} />
					{shared ? '已複製連結' : '分享'}
				</button>
			</div>

			{#if show.sessions.length > 1}
				<div class="rounded-2xl bg-curtain-50 p-4 dark:bg-white/5">
					<p class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">各場次</p>
					<ul class="space-y-1.5 text-sm text-gray-600 dark:text-gray-300">
						{#each show.sessions as session, i (i)}
							<li class="flex flex-wrap items-center gap-x-2">
								<span class="tabular-nums"
									>{session.date ? session.date.replaceAll('-', '/') : '—'}</span
								>
								{#if session.venue}<span class="text-gray-300">·</span><span>{session.venue}</span
									>{/if}
								{#if fmtOnSale(session.onSaleAt)}
									<span class="text-curtain-600">（{fmtOnSale(session.onSaleAt)} 開賣）</span>
								{/if}
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			{#if show.description}
				<div
					class="prose prose-sm max-w-none whitespace-pre-line text-gray-700 dark:prose-invert dark:text-gray-300"
				>
					{show.description}
				</div>
			{/if}

			{#if show.introImages?.length}
				<div class="space-y-3">
					{#each show.introImages as img, i (i)}
						<img
							src={img}
							alt={`${show.title} 節目介紹圖 ${i + 1}`}
							loading="lazy"
							decoding="async"
							referrerpolicy="no-referrer"
							class="w-full rounded-xl ring-1 ring-black/5 dark:ring-white/10"
						/>
					{/each}
				</div>
			{/if}

			<p class="text-xs text-gray-400">
				本站不販售門票，「前往購票」將開啟 {SOURCE_LABELS[show.source]} 官方售票頁。
			</p>
		</div>
	</article>
</main>
