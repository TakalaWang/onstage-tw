<script lang="ts">
	import { SOURCE_LABELS, type Source, type Show } from '$lib/types';
	import ShowCard from '$lib/components/ShowCard.svelte';
	import ShowModal from '$lib/components/ShowModal.svelte';
	import FeedbackModal from '$lib/components/FeedbackModal.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import favicon from '$lib/assets/favicon.svg';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const REPO = 'https://github.com/TakalaWang/onstage-tw';
	const allSources = Object.keys(SOURCE_LABELS) as Source[];

	let query = $state('');
	let activeSources = $state<Set<Source>>(new Set());
	let city = $state('');
	let category = $state('');
	let fromDate = $state('');
	let toDate = $state('');
	let onSale = $state<'all' | 'available' | 'upcoming'>('all');
	let priceMin = $state('');
	let priceMax = $state('');
	let sort = $state<'date-desc' | 'date-asc' | 'onsale' | 'price-asc' | 'price-desc'>('date-desc');
	let selected = $state<Show | null>(null);
	let showSubscribe = $state(false);
	let showFeedback = $state(false);
	let visible = $state(48);
	let sentinel = $state<HTMLElement | null>(null);
	let dark = $state(false);
	let curtain = $state(true); // one-time stage-curtain reveal on load

	// All cities a show plays in (it may run at venues in several cities).
	function showCities(s: Show): string[] {
		const set = new Set<string>();
		if (s.city) set.add(s.city);
		for (const ss of s.sessions) if (ss.city) set.add(ss.city);
		return [...set];
	}

	const cities = $derived([...new Set(data.shows.flatMap(showCities))].sort());
	const categories = $derived(
		[...new Set(data.shows.map((s) => s.category).filter((c): c is string => !!c))].sort()
	);

	function toggleSource(s: Source) {
		const next = new Set(activeSources);
		next.has(s) ? next.delete(s) : next.add(s);
		activeSources = next;
	}

	function sortShows(a: Show, b: Show): number {
		switch (sort) {
			case 'date-asc':
				return (a.startDate ?? '9999').localeCompare(b.startDate ?? '9999');
			case 'onsale':
				return (a.onSaleAt ?? '9999').localeCompare(b.onSaleAt ?? '9999');
			case 'price-asc':
				return (a.minPrice ?? Infinity) - (b.minPrice ?? Infinity);
			case 'price-desc':
				return (b.minPrice ?? -1) - (a.minPrice ?? -1);
			default: // date-desc — newest performance dates first
				return (b.startDate ?? '0000').localeCompare(a.startDate ?? '0000');
		}
	}

	const filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		const nowIso = new Date().toISOString();
		return data.shows
			.filter((s) => {
				if (activeSources.size && !activeSources.has(s.source)) return false;
				if (city && !showCities(s).includes(city)) return false;
				if (category && s.category !== category) return false;
				if (fromDate && (s.endDate ?? s.startDate ?? '9999-12-31') < fromDate) return false;
				if (toDate && (s.startDate ?? s.endDate ?? '0000-01-01') > toDate) return false;
				if (onSale === 'available' && s.onSaleAt && s.onSaleAt > nowIso) return false;
				if (onSale === 'upcoming' && !(s.onSaleAt && s.onSaleAt > nowIso)) return false;
				if (priceMin || priceMax) {
					if (s.minPrice == null) return false;
					if (priceMin && s.minPrice < Number(priceMin)) return false;
					if (priceMax && s.minPrice > Number(priceMax)) return false;
				}
				if (q) {
					const hay =
						`${s.title} ${s.venue ?? ''} ${s.category ?? ''} ${s.organizer ?? ''}`.toLowerCase();
					if (!hay.includes(q)) return false;
				}
				return true;
			})
			.sort(sortShows);
	});

	const hasFilters = $derived(
		!!query ||
			activeSources.size > 0 ||
			!!city ||
			!!category ||
			!!fromDate ||
			!!toDate ||
			onSale !== 'all' ||
			!!priceMin ||
			!!priceMax
	);

	function resetFilters() {
		query = '';
		activeSources = new Set();
		city = '';
		category = '';
		fromDate = '';
		toDate = '';
		onSale = 'all';
		priceMin = '';
		priceMax = '';
	}

	$effect(() => {
		filtered.length;
		visible = 48;
	});

	$effect(() => {
		if (!sentinel) return;
		const io = new IntersectionObserver(
			(entries) => entries[0].isIntersecting && (visible += 36),
			{ rootMargin: '800px' }
		);
		io.observe(sentinel);
		return () => io.disconnect();
	});

	$effect(() => {
		dark = document.documentElement.classList.contains('dark');
		// Skip the curtain reveal when reduced motion is requested.
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) curtain = false;
		else {
			const t = setTimeout(() => (curtain = false), 1150);
			return () => clearTimeout(t);
		}
	});

	function toggleTheme() {
		dark = !dark;
		document.documentElement.classList.toggle('dark', dark);
		try {
			localStorage.setItem('theme', dark ? 'dark' : 'light');
		} catch {
			/* ignore */
		}
	}

	const updatedLabel = $derived(
		data.updatedAt
			? new Date(data.updatedAt).toLocaleString('zh-TW', {
					timeZone: 'Asia/Taipei',
					month: 'numeric',
					day: 'numeric',
					hour: '2-digit',
					minute: '2-digit',
					hour12: false
				})
			: null
	);

	// SEO: schema.org ItemList of events (helps search engines understand the listings).
	const jsonLd = $derived(
		JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'ItemList',
			name: '幕間 OnStage TW — 台灣戲劇演出',
			itemListElement: data.shows.slice(0, 40).map((s, i) => ({
				'@type': 'ListItem',
				position: i + 1,
				item: {
					'@type': 'Event',
					name: s.title,
					url: s.url,
					...(s.startDate ? { startDate: s.startDate } : {}),
					...(s.endDate ? { endDate: s.endDate } : {}),
					...(s.venue ? { location: { '@type': 'Place', name: s.venue } } : {})
				}
			}))
			// Escape `<` so scraped titles/venues can't break out of the <script> (XSS).
		}).replace(/</g, '\\u003c')
	);

	const selectClass =
		'rounded-full border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-700 outline-none transition hover:border-curtain-400 focus:border-curtain-500 cursor-pointer dark:border-white/15 dark:bg-white/5 dark:text-gray-200';
	const fieldBorderless = 'border-0 bg-transparent py-1 text-sm text-gray-600 outline-none dark:text-gray-300';
</script>

<svelte:head>
	<title>幕間 OnStage TW — 台灣戲劇演出整合</title>
	<meta
		name="description"
		content="一個地方看完 OPENTIX、udn、寬宏、年代 的戲劇演出。搜尋、過濾、用 RSS 追蹤開賣。"
	/>
	<link rel="canonical" href={data.siteUrl} />
	<link rel="alternate" type="application/rss+xml" title="幕間 OnStage TW" href="/feed.xml" />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="幕間 OnStage TW" />
	<meta property="og:title" content="幕間 OnStage TW — 台灣戲劇演出整合" />
	<meta property="og:description" content="一個地方看完台灣所有戲劇演出。搜尋、過濾、用 RSS 追蹤開賣。" />
	<meta property="og:url" content={data.siteUrl} />
	<meta property="og:image" content={`${data.siteUrl}/og.svg`} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="幕間 OnStage TW — 台灣戲劇演出整合" />
	<meta name="twitter:description" content="一個地方看完台灣所有戲劇演出。" />
	<meta name="twitter:image" content={`${data.siteUrl}/og.svg`} />
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html `<script type="application/ld+json">${jsonLd}</script>`}
</svelte:head>

<!-- One-time stage-curtain reveal -->
{#if curtain}
	<div class="pointer-events-none fixed inset-0 z-[100] flex" aria-hidden="true">
		<div class="curtain-half curtain-left h-full w-1/2"></div>
		<div class="curtain-half curtain-right h-full w-1/2"></div>
	</div>
{/if}

<!-- Masthead -->
<header class="relative">
	<div class="absolute right-4 top-4 flex items-center gap-2">
		<button
			onclick={toggleTheme}
			aria-label="切換深色 / 淺色模式"
			class="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition hover:border-curtain-400 hover:text-curtain-600 dark:border-white/15 dark:bg-white/5 dark:text-gray-300"
		>
			<Icon name={dark ? 'sun' : 'moon'} size={16} />
		</button>
		<a
			href={REPO}
			target="_blank"
			rel="noopener noreferrer"
			aria-label="GitHub（給顆 Star）"
			class="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition hover:border-curtain-400 hover:text-curtain-600 dark:border-white/15 dark:bg-white/5 dark:text-gray-300"
		>
			<Icon name="github" size={16} />
		</a>
		<button
			onclick={() => (showSubscribe = !showSubscribe)}
			class="flex items-center gap-1.5 rounded-full bg-curtain-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-curtain-700 active:scale-[0.98]"
		>
			<Icon name="rss" size={15} />
			<span class="hidden sm:inline">RSS 訂閱</span>
		</button>
	</div>

	<div class="mx-auto max-w-6xl px-5 pb-4 pt-9 text-center">
		<div class="flex items-center justify-center gap-2.5">
			<img src={favicon} alt="" class="h-8 w-8 rounded-lg shadow-sm" />
			<h1 class="text-3xl font-bold tracking-tight sm:text-4xl">幕間</h1>
			<span class="font-display text-xl italic text-gray-400 dark:text-gray-500">OnStage TW</span>
		</div>
		<p class="mt-1.5 text-sm text-gray-500 dark:text-gray-400">台灣戲劇演出，一站看完。</p>
	</div>
</header>

<!-- Sticky filter bar -->
<div
	class="sticky top-0 z-20 border-y border-curtain-100 bg-curtain-50/80 backdrop-blur-xl dark:border-white/10 dark:bg-[#16100f]/80"
>
	<div class="mx-auto max-w-6xl space-y-3 px-5 py-4">
		<div class="relative">
			<span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
				<Icon name="search" size={16} />
			</span>
			<input
				type="search"
				bind:value={query}
				placeholder="搜尋劇名、場館、主辦、分類…"
				class="w-full rounded-full border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-curtain-500 focus:ring-2 focus:ring-curtain-500/20 dark:border-white/15 dark:bg-white/5 dark:text-gray-100"
			/>
		</div>

		<div class="flex flex-wrap items-center gap-2">
			<select bind:value={city} class={selectClass} aria-label="縣市">
				<option value="">全部縣市</option>
				{#each cities as c (c)}<option value={c}>{c}</option>{/each}
			</select>
			<select bind:value={category} class={selectClass} aria-label="分類">
				<option value="">全部分類</option>
				{#each categories as c (c)}<option value={c}>{c}</option>{/each}
			</select>

			<span
				class="flex items-center gap-1.5 rounded-full border border-gray-300 bg-white py-1 pl-3 pr-2 dark:border-white/15 dark:bg-white/5"
			>
				<Icon name="calendar" size={14} class="text-gray-400" />
				<input type="date" bind:value={fromDate} class={fieldBorderless} aria-label="起始日期" />
				<span class="text-gray-300 dark:text-gray-600">–</span>
				<input type="date" bind:value={toDate} class={fieldBorderless} aria-label="結束日期" />
			</span>

			<span
				class="flex items-center gap-1 rounded-full border border-gray-300 bg-white py-1 pl-3 pr-2 text-sm text-gray-500 dark:border-white/15 dark:bg-white/5 dark:text-gray-400"
			>
				<Icon name="tag" size={14} class="text-gray-400" />
				<span class="text-xs">NT$</span>
				<input type="number" min="0" bind:value={priceMin} placeholder="最低" class="w-14 {fieldBorderless}" aria-label="最低票價" />
				<span class="text-gray-300 dark:text-gray-600">–</span>
				<input type="number" min="0" bind:value={priceMax} placeholder="最高" class="w-14 {fieldBorderless}" aria-label="最高票價" />
			</span>

			<select bind:value={onSale} class={selectClass} aria-label="開賣狀態">
				<option value="all">開賣狀態：全部</option>
				<option value="available">已開賣</option>
				<option value="upcoming">尚未開賣</option>
			</select>
			<select bind:value={sort} class={selectClass} aria-label="排序">
				<option value="date-desc">排序：演出日期新→舊</option>
				<option value="date-asc">演出日期舊→新</option>
				<option value="onsale">開賣時間近→遠</option>
				<option value="price-asc">票價低→高</option>
				<option value="price-desc">票價高→低</option>
			</select>
		</div>

		<div class="flex flex-wrap items-center gap-2 text-sm">
			{#each allSources as s (s)}
				<button
					onclick={() => toggleSource(s)}
					class="rounded-full border px-3 py-1 transition {activeSources.has(s)
						? 'border-curtain-600 bg-curtain-600 text-white'
						: 'border-gray-300 bg-white text-gray-600 hover:border-curtain-400 dark:border-white/15 dark:bg-white/5 dark:text-gray-300'}"
				>
					{SOURCE_LABELS[s]}
				</button>
			{/each}
			{#if hasFilters}
				<button
					onclick={resetFilters}
					class="ml-auto flex items-center gap-1 text-gray-400 underline hover:text-curtain-600"
				>
					<Icon name="x" size={13} /> 清除篩選
				</button>
			{/if}
		</div>
	</div>
</div>

<!-- RSS subscribe panel -->
{#if showSubscribe}
	<div class="border-b border-curtain-100 bg-white dark:border-white/10 dark:bg-[#1e1716]">
		<div class="mx-auto max-w-6xl space-y-3 px-5 py-5 text-sm text-gray-600 dark:text-gray-300">
			<p class="flex items-center gap-2 font-medium text-gray-800 dark:text-gray-100">
				<Icon name="rss" size={16} class="text-curtain-600" /> 用 RSS 訂閱開賣資訊
			</p>
			<p>把下面的 RSS 連結加進你的閱讀器（Feedly、Inoreader、NetNewsWire…），有新戲上架就會出現在你的訂閱裡。</p>
			<div class="flex flex-wrap items-center gap-2">
				<code class="rounded-lg bg-curtain-50 px-3 py-2 text-xs text-curtain-800 dark:bg-white/10 dark:text-gray-200">{data.siteUrl}/feed.xml</code>
				<a
					href="/feed.xml"
					class="flex items-center gap-1.5 rounded-full bg-curtain-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-curtain-700"
				>
					開啟 feed.xml <Icon name="arrow-up-right" size={13} />
				</a>
			</div>
			<p class="text-xs text-gray-400">
				想要 Email 通知？用 Blogtrottr、Follow.it 之類的服務把這個 RSS 轉成信件即可，本站不需收集你的 Email。
			</p>
		</div>
	</div>
{/if}

<!-- Show grid -->
<main class="mx-auto max-w-6xl px-5 py-6">
	<p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
		共 {filtered.length} 檔{#if updatedLabel}<span class="text-gray-400"> · 資料更新於 {updatedLabel}</span>{/if}
	</p>
	{#if filtered.length === 0}
		<p class="py-20 text-center text-gray-400">沒有符合條件的演出，試試調整篩選。</p>
	{:else}
		<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
			{#each filtered.slice(0, visible) as s, i (s.id)}
				<ShowCard show={s} index={i} onopen={(show) => (selected = show)} />
			{/each}
		</div>
		{#if visible < filtered.length}
			<div bind:this={sentinel} class="py-10 text-center text-sm text-gray-400">載入更多…</div>
		{:else}
			<p class="py-10 text-center text-xs text-gray-400">— 已經到底了 · 共 {filtered.length} 檔 —</p>
		{/if}
	{/if}
</main>

{#if selected}
	<ShowModal show={selected} onclose={() => (selected = null)} />
{/if}

<!-- Feedback → prefilled GitHub issue -->
<button
	onclick={() => (showFeedback = true)}
	class="fixed bottom-5 right-5 z-30 flex items-center gap-2 rounded-full bg-curtain-600 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-curtain-900/25 transition hover:bg-curtain-700 active:scale-[0.97]"
>
	<Icon name="message" size={16} />
	<span class="hidden sm:inline">意見回饋</span>
</button>

{#if showFeedback}
	<FeedbackModal repo={REPO} onclose={() => (showFeedback = false)} />
{/if}

<footer class="border-t border-curtain-100 py-8 text-center text-xs text-gray-400 dark:border-white/10">
	<p>
		<a href={REPO} target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 font-medium text-gray-500 hover:text-curtain-600 dark:text-gray-300">
			<Icon name="star" size={12} /> 喜歡的話，在 GitHub 給顆 Star
		</a>
	</p>
	<p class="mx-auto mt-2 max-w-xl px-5">
		幕間 OnStage TW · 開源戲劇演出聚合 · 資料來自各售票平台公開頁面，著作權屬各主辦單位與售票平台 · 本站不販售門票
	</p>
</footer>
