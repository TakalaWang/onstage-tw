<script module lang="ts">
	let introPlayed = false;
</script>

<script lang="ts">
	import { SOURCE_LABELS, type Source, type Show } from '$lib/types';
	import ShowCard from '$lib/components/ShowCard.svelte';
	import ShowModal from '$lib/components/ShowModal.svelte';
	import FeedbackModal from '$lib/components/FeedbackModal.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import favicon from '$lib/assets/favicon.svg';
	import { favorites } from '$lib/favorites.svelte';
	import { GENRE_SLUG } from '$lib/genres';
	import { REGION_ORDER, REGIONS } from '$lib/regions';
	import { findVenue } from '$lib/venues';
	import { initialDark, applyDark } from '$lib/theme';
	import FilterDropdown from '$lib/components/FilterDropdown.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const REPO = 'https://github.com/TakalaWang/onstage-tw';
	const allSources = Object.keys(SOURCE_LABELS) as Source[];

	let query = $state('');
	let activeSources = $state<string[]>([]);
	let selectedCities = $state<string[]>([]);
	let selectedCategories = $state<string[]>([]);
	let fromDate = $state('');
	let toDate = $state('');
	let priceMin = $state('');
	let priceMax = $state('');
	let youthOnly = $state(false);
	let sort = $state<'date-desc' | 'date-asc' | 'onsale' | 'price-asc' | 'price-desc'>('date-asc');
	let selected = $state<Show | null>(null);
	let showSubscribe = $state(false);
	let showFeedback = $state(false);
	let onlyFavorites = $state(false);
	let showFilters = $state(false);
	let visible = $state(24);
	let sentinel = $state<HTMLElement | null>(null);
	let dark = $state(initialDark());
	let curtain = $state(!introPlayed);

	function cityOf(
		city: string | null | undefined,
		venue: string | null | undefined,
	): string | null {
		if (city) return city;
		if (venue) return findVenue(venue)?.city ?? null;
		return null;
	}

	function showCities(s: Show): string[] {
		const all = [cityOf(s.city, s.venue), ...s.sessions.map((ss) => cityOf(ss.city, ss.venue))];
		return [...new Set(all.filter((c): c is string => !!c))];
	}

	function occurrences(
		s: Show,
	): { start: string | null; end: string | null; city: string | null }[] {
		if (s.sessions.length)
			return s.sessions.map((o) => ({
				start: o.date,
				end: o.date,
				city: cityOf(o.city, o.venue) ?? cityOf(s.city, s.venue),
			}));
		return [{ start: s.startDate, end: s.endDate, city: cityOf(s.city, s.venue) }];
	}

	const cities = $derived([...new Set(data.shows.flatMap(showCities))]);
	const categories = $derived(
		[...new Set(data.shows.map((s) => s.category).filter((c): c is string => !!c))].sort(),
	);
	const presentSources = $derived(allSources.filter((s) => data.shows.some((x) => x.source === s)));

	const regionGroups = $derived(
		REGION_ORDER.map((r) => ({
			label: r,
			children: REGIONS[r].filter((c) => cities.includes(c)).map((c) => ({ value: c, label: c })),
		})).filter((g) => g.children.length),
	);
	const categoryOptions = $derived(categories.map((c) => ({ value: c, label: c })));
	const sourceOptions = $derived(
		presentSources.map((s) => ({ value: s, label: SOURCE_LABELS[s] })),
	);
	const allCityValues = $derived(regionGroups.flatMap((g) => g.children.map((c) => c.value)));

	const isSubset = (sel: string[], total: number) => sel.length > 0 && sel.length < total;

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
			default:
				return (b.startDate ?? '0000').localeCompare(a.startDate ?? '0000');
		}
	}

	const filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		return data.shows
			.filter((s) => {
				if (onlyFavorites && !favorites.has(s.id)) return false;
				if (isSubset(activeSources, presentSources.length) && !activeSources.includes(s.source))
					return false;
				if (
					isSubset(selectedCategories, categories.length) &&
					(!s.category || !selectedCategories.includes(s.category))
				)
					return false;
				const cityTargets = isSubset(selectedCities, allCityValues.length) ? selectedCities : null;
				const dateActive = !!fromDate || !!toDate;
				if (cityTargets || dateActive) {
					const lo = fromDate || '0000-01-01';
					const hi = toDate || '9999-12-31';
					const ok = occurrences(s).some((o) => {
						const cityOk = !cityTargets || (o.city != null && cityTargets.includes(o.city));
						const dateOk =
							!dateActive ||
							((o.end ?? o.start ?? '9999-12-31') >= lo &&
								(o.start ?? o.end ?? '0000-01-01') <= hi);
						return cityOk && dateOk;
					});
					if (!ok) return false;
				}
				if (priceMin || priceMax) {
					if (s.minPrice == null) return false;
					if (priceMin && s.minPrice < Number(priceMin)) return false;
					if (priceMax && s.minPrice > Number(priceMax)) return false;
				}
				if (youthOnly && !s.youthSeat) return false;
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
			isSubset(activeSources, presentSources.length) ||
			isSubset(selectedCities, allCityValues.length) ||
			isSubset(selectedCategories, categories.length) ||
			!!fromDate ||
			!!toDate ||
			!!priceMin ||
			!!priceMax ||
			youthOnly,
	);

	const activeFilterCount = $derived(
		(isSubset(activeSources, presentSources.length) ? 1 : 0) +
			(isSubset(selectedCities, allCityValues.length) ? 1 : 0) +
			(isSubset(selectedCategories, categories.length) ? 1 : 0) +
			(fromDate || toDate ? 1 : 0) +
			(priceMin || priceMax ? 1 : 0) +
			(youthOnly ? 1 : 0),
	);

	function resetFilters() {
		query = '';
		activeSources = [];
		selectedCities = [];
		selectedCategories = [];
		fromDate = '';
		toDate = '';
		priceMin = '';
		priceMax = '';
		youthOnly = false;
	}

	$effect(() => {
		if (filtered) visible = 24;
	});

	$effect(() => {
		if (!sentinel) return;
		const io = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) visible += 36;
			},
			{ rootMargin: '800px' },
		);
		io.observe(sentinel);
		return () => io.disconnect();
	});

	$effect(() => {
		showFilters = matchMedia('(min-width: 640px)').matches;
		if (introPlayed || matchMedia('(prefers-reduced-motion: reduce)').matches) {
			curtain = false;
			return;
		}
		introPlayed = true;
		const t = setTimeout(() => (curtain = false), 1900);
		return () => clearTimeout(t);
	});

	function toggleTheme() {
		dark = !dark;
		applyDark(dark);
	}

	const updatedLabel = $derived(
		data.updatedAt
			? new Date(data.updatedAt).toLocaleString('zh-TW', {
					timeZone: 'Asia/Taipei',
					month: 'numeric',
					day: 'numeric',
					hour: '2-digit',
					minute: '2-digit',
					hour12: false,
				})
			: null,
	);

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
					...(s.venue ? { location: { '@type': 'Place', name: s.venue } } : {}),
				},
			})),
		}).replace(/</g, '\\u003c'),
	);

	const selectClass =
		'rounded-full border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-700 outline-none transition hover:border-curtain-400 focus:border-curtain-500 cursor-pointer dark:border-white/15 dark:bg-white/5 dark:text-gray-200';
	const fieldBorderless =
		'border-0 bg-transparent py-1 text-sm text-gray-600 outline-none dark:text-gray-300';
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
	<meta
		property="og:description"
		content="一個地方看完台灣所有戲劇演出。搜尋、過濾、用 RSS 追蹤開賣。"
	/>
	<meta property="og:url" content={data.siteUrl} />
	<meta property="og:image" content={`${data.siteUrl}/og.png`} />
	<meta property="og:image:type" content="image/png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="幕間 OnStage TW — 台灣戲劇演出整合" />
	<meta name="twitter:description" content="一個地方看完台灣所有戲劇演出。" />
	<meta name="twitter:image" content={`${data.siteUrl}/og.png`} />
	{@html `<script type="application/ld+json">${jsonLd}</` + `script>`}
</svelte:head>

{#if curtain}
	<div
		class="curtain-root pointer-events-none fixed inset-0 z-[100] overflow-hidden"
		aria-hidden="true"
	>
		<div class="absolute inset-0 flex">
			<div class="curtain-half curtain-left h-full w-1/2"></div>
			<div class="curtain-half curtain-right h-full w-1/2"></div>
		</div>
		<div class="curtain-hoist absolute inset-x-0 top-0 flex flex-col items-center">
			<div class="curtain-rope h-[24vh]"></div>
			<div class="curtain-sign relative -mt-1 flex w-64 flex-col items-center px-7 py-8 sm:w-72">
				<span class="curtain-eyelet absolute -top-2 left-1/2 -translate-x-1/2"></span>
				<img src={favicon} alt="" class="h-14 w-14 rounded-2xl shadow-lg" />
				<div class="mt-3 text-4xl font-bold tracking-tight text-amber-50">幕間</div>
				<div class="mt-1 font-display text-lg italic text-gold-400">OnStage TW</div>
				<div class="mt-3 text-xs tracking-[0.25em] text-amber-100/70">台灣戲劇演出整合平台</div>
			</div>
		</div>
	</div>
{/if}

<div
	class="sticky top-0 z-30 border-b border-curtain-100 bg-curtain-50/90 backdrop-blur-xl dark:border-white/10 dark:bg-[#16100f]/90"
>
	<header class="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 pt-3 pb-1 sm:px-5">
		<div class="flex min-w-0 items-center gap-2.5">
			<img src={favicon} alt="" class="h-9 w-9 shrink-0 rounded-lg shadow-sm" />
			<div class="flex items-baseline gap-2">
				<h1 class="whitespace-nowrap text-2xl font-bold tracking-tight">幕間</h1>
				<span class="hidden font-display text-lg italic text-gray-400 sm:inline dark:text-gray-500">
					OnStage TW
				</span>
			</div>
			<span
				class="ml-1 hidden border-l border-gray-200 pl-3 text-sm text-gray-400 lg:inline dark:border-white/15"
			>
				台灣戲劇演出整合平台
			</span>
		</div>
		<div class="flex shrink-0 items-center gap-1.5 sm:gap-2">
			<a
				href="/about"
				class="rounded-full px-2 py-2 text-sm text-gray-500 transition hover:text-curtain-600 dark:text-gray-400 dark:hover:text-curtain-400"
			>
				關於
			</a>
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
				onclick={() => (showFeedback = true)}
				aria-label="意見回饋"
				class="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition hover:border-curtain-400 hover:text-curtain-600 dark:border-white/15 dark:bg-white/5 dark:text-gray-300"
			>
				<Icon name="message" size={16} />
			</button>
			<button
				onclick={() => (onlyFavorites = !onlyFavorites)}
				aria-pressed={onlyFavorites}
				aria-label="只看收藏"
				class="flex items-center gap-1.5 rounded-full border px-2.5 py-2 text-sm font-medium transition active:scale-[0.98] sm:px-3 {onlyFavorites
					? 'border-curtain-600 bg-curtain-600 text-white'
					: 'border-gray-200 bg-white text-gray-600 hover:border-curtain-400 dark:border-white/15 dark:bg-white/5 dark:text-gray-300'}"
			>
				<Icon name="heart" size={15} filled={onlyFavorites} />
				<span class="hidden sm:inline">收藏</span>
				{#if favorites.count}<span class="text-xs sm:text-sm">{favorites.count}</span>{/if}
			</button>
			<button
				onclick={() => (showSubscribe = !showSubscribe)}
				class="flex items-center gap-1.5 rounded-full bg-curtain-600 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-curtain-700 active:scale-[0.98]"
			>
				<Icon name="rss" size={15} />
				<span class="hidden sm:inline">RSS 訂閱</span>
			</button>
		</div>
	</header>
	<div class="mx-auto max-w-6xl px-4 pb-2 sm:px-5">
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
		<button
			onclick={() => (showFilters = !showFilters)}
			aria-expanded={showFilters}
			aria-controls="advanced-filters"
			class="mx-auto mt-1 flex items-center gap-1 px-3 py-1 text-xs font-medium transition {activeFilterCount
				? 'text-curtain-600 dark:text-curtain-400'
				: 'text-gray-400 hover:text-curtain-600 dark:hover:text-curtain-400'}"
		>
			{showFilters ? '收合篩選' : '進階篩選'}{!showFilters && activeFilterCount
				? `（已套用 ${activeFilterCount}）`
				: ''}
			<Icon
				name="chevron-down"
				size={14}
				class="transition-transform duration-200 {showFilters ? 'rotate-180' : ''}"
			/>
		</button>
	</div>
	{#if showFilters}
		<div
			id="advanced-filters"
			class="border-b border-curtain-100 bg-curtain-50/70 dark:border-white/10 dark:bg-[#16100f]/70"
		>
			<div class="mx-auto max-w-6xl space-y-3 px-5 py-3">
				<div class="flex flex-wrap items-center gap-2">
					<FilterDropdown
						label="地區 / 縣市"
						groups={regionGroups}
						bind:selected={selectedCities}
					/>
					<FilterDropdown
						label="分類"
						options={categoryOptions}
						bind:selected={selectedCategories}
					/>
					<FilterDropdown label="售票系統" options={sourceOptions} bind:selected={activeSources} />

					<span
						class="flex items-center gap-1.5 rounded-full border border-gray-300 bg-white py-1 pl-3 pr-2 dark:border-white/15 dark:bg-white/5"
					>
						<Icon name="calendar" size={14} class="text-gray-400" />
						<input
							type="date"
							bind:value={fromDate}
							class={fieldBorderless}
							aria-label="起始日期"
						/>
						<span class="text-gray-300 dark:text-gray-600">–</span>
						<input type="date" bind:value={toDate} class={fieldBorderless} aria-label="結束日期" />
					</span>

					<span
						class="flex items-center gap-1 rounded-full border border-gray-300 bg-white py-1 pl-3 pr-2 text-sm text-gray-500 dark:border-white/15 dark:bg-white/5 dark:text-gray-400"
					>
						<Icon name="tag" size={14} class="text-gray-400" />
						<span class="text-xs">NT$</span>
						<input
							type="number"
							min="0"
							bind:value={priceMin}
							placeholder="最低"
							class="w-14 {fieldBorderless}"
							aria-label="最低票價"
						/>
						<span class="text-gray-300 dark:text-gray-600">–</span>
						<input
							type="number"
							min="0"
							bind:value={priceMax}
							placeholder="最高"
							class="w-14 {fieldBorderless}"
							aria-label="最高票價"
						/>
					</span>

					<label
						class="flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-2 text-sm transition {youthOnly
							? 'border-curtain-600 bg-curtain-600 text-white'
							: 'border-gray-300 bg-white text-gray-600 hover:border-curtain-400 dark:border-white/15 dark:bg-white/5 dark:text-gray-300'}"
					>
						<input type="checkbox" bind:checked={youthOnly} class="sr-only" />
						<Icon name="ticket" size={14} /> 青年席
					</label>

					<select bind:value={sort} class={selectClass} aria-label="排序">
						<option value="date-asc">排序：演出日期早→晚</option>
						<option value="date-desc">演出日期晚→早</option>
						<option value="onsale">開賣時間近→遠</option>
						<option value="price-asc">票價低→高</option>
						<option value="price-desc">票價高→低</option>
					</select>
				</div>

				{#if hasFilters}
					<div class="flex">
						<button
							onclick={resetFilters}
							class="ml-auto flex items-center gap-1 text-sm text-gray-400 underline hover:text-curtain-600"
						>
							<Icon name="x" size={13} /> 清除篩選
						</button>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

{#if showSubscribe}
	<div class="border-b border-curtain-100 bg-white dark:border-white/10 dark:bg-[#1e1716]">
		<div class="mx-auto max-w-6xl space-y-3 px-5 py-5 text-sm text-gray-600 dark:text-gray-300">
			<p class="flex items-center gap-2 font-medium text-gray-800 dark:text-gray-100">
				<Icon name="rss" size={16} class="text-curtain-600" /> 用 RSS 訂閱開賣資訊
			</p>
			<p>
				把下面的 RSS
				連結加進你的閱讀器（Feedly、Inoreader、NetNewsWire…），有新戲上架就會出現在你的訂閱裡。
			</p>
			<div class="flex flex-wrap items-center gap-2">
				<code
					class="rounded-lg bg-curtain-50 px-3 py-2 text-xs text-curtain-800 dark:bg-white/10 dark:text-gray-200"
					>{data.siteUrl}/feed.xml</code
				>
				<a
					href="/feed.xml"
					class="flex items-center gap-1.5 rounded-full bg-curtain-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-curtain-700"
				>
					開啟 feed.xml <Icon name="arrow-up-right" size={13} />
				</a>
			</div>
			<div class="flex flex-wrap items-center gap-2 pt-1">
				<span class="text-xs text-gray-400">只訂單一來源：</span>
				{#each presentSources as s (s)}
					<a
						href={`/feed-${s}.xml`}
						class="rounded-full border border-gray-300 px-2.5 py-1 text-xs text-gray-500 transition hover:border-curtain-400 hover:text-curtain-600 dark:border-white/15 dark:text-gray-400"
					>
						{SOURCE_LABELS[s]}
					</a>
				{/each}
			</div>
			<div class="flex flex-wrap items-center gap-2">
				<span class="text-xs text-gray-400">只訂單一分類：</span>
				{#each categories.filter((c) => GENRE_SLUG[c]) as c (c)}
					<a
						href={`/feed-genre-${GENRE_SLUG[c]}.xml`}
						class="rounded-full border border-gray-300 px-2.5 py-1 text-xs text-gray-500 transition hover:border-curtain-400 hover:text-curtain-600 dark:border-white/15 dark:text-gray-400"
					>
						{c}
					</a>
				{/each}
			</div>
			<p class="text-xs text-gray-400">
				想要 Email 通知？用 Blogtrottr、Follow.it 之類的服務把這個 RSS
				轉成信件即可，本站不需收集你的 Email。
			</p>
		</div>
	</div>
{/if}

<main class="mx-auto max-w-6xl px-5 py-6">
	<div
		class="mb-4 flex items-center justify-between gap-3 text-sm text-gray-500 dark:text-gray-400"
	>
		<p>
			共 {filtered.length} 檔{#if updatedLabel}<span class="text-gray-400">
					· 資料更新於 {updatedLabel}</span
				>{/if}
		</p>
		<div class="flex shrink-0 items-center gap-2">
			<a
				href="/calendar"
				class="flex items-center gap-1.5 rounded-full border border-gray-300 px-3 py-1.5 font-medium transition hover:border-curtain-400 hover:text-curtain-600 dark:border-white/15"
			>
				<Icon name="calendar" size={15} /> 月曆
			</a>
			<a
				href="/map"
				class="flex items-center gap-1.5 rounded-full border border-gray-300 px-3 py-1.5 font-medium transition hover:border-curtain-400 hover:text-curtain-600 dark:border-white/15"
			>
				<Icon name="map-pin" size={15} /> 地圖
			</a>
		</div>
	</div>
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
			<p class="py-10 text-center text-xs text-gray-400">
				— 已經到底了 · 共 {filtered.length} 檔 —
			</p>
		{/if}
	{/if}
</main>

{#if selected}
	<ShowModal show={selected} onclose={() => (selected = null)} />
{/if}

{#if showFeedback}
	<FeedbackModal repo={REPO} onclose={() => (showFeedback = false)} />
{/if}

<footer
	class="border-t border-curtain-100 py-8 text-center text-xs text-gray-400 dark:border-white/10"
>
	<p>
		<a
			href={REPO}
			target="_blank"
			rel="noopener noreferrer"
			class="inline-flex items-center gap-1 font-medium text-gray-500 hover:text-curtain-600 dark:text-gray-300"
		>
			<Icon name="star" size={12} /> 喜歡的話，在 GitHub 給顆 Star
		</a>
	</p>
	<p class="mx-auto mt-2 max-w-xl px-5">
		幕間 OnStage TW · 開源戲劇演出聚合 · 資料來自各售票平台公開頁面，著作權屬各主辦單位與售票平台 ·
		本站不販售門票
	</p>
	<p class="mt-2">
		<a href="/about" class="text-gray-500 underline hover:text-curtain-600 dark:text-gray-300">
			關於・免責聲明・隱私權政策
		</a>
	</p>
</footer>
