<script lang="ts">
	import { SOURCE_LABELS, type Source, type Show } from '$lib/types';
	import ShowCard from '$lib/components/ShowCard.svelte';
	import ShowModal from '$lib/components/ShowModal.svelte';
	import FeedbackModal from '$lib/components/FeedbackModal.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import favicon from '$lib/assets/favicon.svg';
	import type { PageData } from './$types';

	const REPO = 'https://github.com/TakalaWang/onstage-tw';

	let { data }: { data: PageData } = $props();

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
	let sort = $state<'date' | 'onsale'>('date');
	let selected = $state<Show | null>(null);
	let showSubscribe = $state(false);
	let showFeedback = $state(false);
	let visible = $state(48);
	let sentinel = $state<HTMLElement | null>(null);
	let dark = $state(false);

	const cities = $derived(
		[...new Set(data.shows.map((s) => s.city).filter((c): c is string => !!c))].sort()
	);
	const categories = $derived(
		[...new Set(data.shows.map((s) => s.category).filter((c): c is string => !!c))].sort()
	);

	function toggleSource(s: Source) {
		const next = new Set(activeSources);
		next.has(s) ? next.delete(s) : next.add(s);
		activeSources = next;
	}

	const filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		const nowIso = new Date().toISOString();

		let list = data.shows.filter((s) => {
			if (activeSources.size && !activeSources.has(s.source)) return false;
			if (city && s.city !== city) return false;
			if (category && s.category !== category) return false;
			if (fromDate && (s.endDate ?? s.startDate ?? '9999-12-31') < fromDate) return false;
			if (toDate && (s.startDate ?? s.endDate ?? '0000-01-01') > toDate) return false;
			// On-sale status. No on-sale info is treated as already on sale.
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
		});
		list = [...list].sort((a, b) =>
			sort === 'onsale'
				? (a.onSaleAt ?? '9999').localeCompare(b.onSaleAt ?? '9999')
				: (a.startDate ?? '9999').localeCompare(b.startDate ?? '9999')
		);
		return list;
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
			(entries) => {
				if (entries[0].isIntersecting) visible += 36;
			},
			{ rootMargin: '800px' }
		);
		io.observe(sentinel);
		return () => io.disconnect();
	});

	$effect(() => {
		dark = document.documentElement.classList.contains('dark');
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

	const selectClass =
		'rounded-full border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-700 outline-none transition hover:border-curtain-400 focus:border-curtain-500 cursor-pointer dark:border-white/15 dark:bg-white/5 dark:text-gray-200';
	const dateBorderless = 'border-0 bg-transparent py-1 text-sm text-gray-600 outline-none dark:text-gray-300';
</script>

<svelte:head>
	<title>幕間 — 台灣戲劇演出整合</title>
	<meta
		name="description"
		content="一個地方看完 OPENTIX、udn、寬宏、年代 的戲劇演出。搜尋、過濾、用 RSS 追蹤開賣。"
	/>
	<link rel="alternate" type="application/rss+xml" title="OnStage TW" href="/feed.xml" />
</svelte:head>

<!-- Masthead: centered name at the top; controls in the top-right corner -->
<header class="relative">
	<div class="absolute right-4 top-4 flex items-center gap-2">
		<button
			onclick={toggleTheme}
			aria-label="切換深色 / 淺色模式"
			class="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition hover:border-curtain-400 hover:text-curtain-600 dark:border-white/15 dark:bg-white/5 dark:text-gray-300"
		>
			<Icon name={dark ? 'sun' : 'moon'} size={16} />
		</button>
		<button
			onclick={() => (showSubscribe = !showSubscribe)}
			class="flex items-center gap-1.5 rounded-full bg-curtain-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-curtain-700 active:scale-[0.98]"
		>
			<Icon name="rss" size={15} />
			<span class="hidden sm:inline">RSS 訂閱</span>
		</button>
	</div>

	<div class="mx-auto max-w-6xl px-5 pb-7 pt-16 text-center">
		<div class="flex items-center justify-center gap-3">
			<img src={favicon} alt="" class="h-10 w-10 rounded-xl shadow-sm" />
			<h1 class="text-5xl font-bold tracking-tight sm:text-6xl">幕間</h1>
			<span class="font-display text-2xl italic text-gray-400 dark:text-gray-500">OnStage TW</span>
		</div>
		<p class="mt-3 text-base text-gray-500 dark:text-gray-400">台灣戲劇演出，一站看完。</p>
	</div>
</header>

<!-- Sticky filter bar -->
<div
	class="sticky top-0 z-20 border-y border-curtain-100 bg-curtain-50/80 backdrop-blur-xl dark:border-white/10 dark:bg-[#16100f]/80"
>
	<div class="mx-auto max-w-6xl space-y-3 px-5 py-4">
		<div class="flex flex-wrap items-center gap-2">
			<div class="relative min-w-50 flex-1">
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
				<input type="date" bind:value={fromDate} class={dateBorderless} aria-label="起始日期" />
				<span class="text-gray-300 dark:text-gray-600">–</span>
				<input type="date" bind:value={toDate} class={dateBorderless} aria-label="結束日期" />
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
					class="w-16 {dateBorderless}"
					aria-label="最低票價"
				/>
				<span class="text-gray-300 dark:text-gray-600">–</span>
				<input
					type="number"
					min="0"
					bind:value={priceMax}
					placeholder="最高"
					class="w-16 {dateBorderless}"
					aria-label="最高票價"
				/>
			</span>

			<select bind:value={onSale} class={selectClass} aria-label="開賣狀態">
				<option value="all">開賣狀態：全部</option>
				<option value="available">已開賣</option>
				<option value="upcoming">尚未開賣</option>
			</select>
			<select bind:value={sort} class={selectClass} aria-label="排序">
				<option value="date">排序：演出日期</option>
				<option value="onsale">排序：開賣時間</option>
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
	<p class="mb-4 text-sm text-gray-500 dark:text-gray-400">符合條件：{filtered.length} 檔</p>
	{#if filtered.length === 0}
		<p class="py-20 text-center text-gray-400">沒有符合條件的演出，試試調整篩選。</p>
	{:else}
		<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
			{#each filtered.slice(0, visible) as s, i (s.id)}
				<ShowCard show={s} index={i} onopen={(show) => (selected = show)} />
			{/each}
		</div>
		{#if visible < filtered.length}
			<div bind:this={sentinel} class="h-12"></div>
		{/if}
	{/if}
</main>

{#if selected}
	<ShowModal show={selected} onclose={() => (selected = null)} />
{/if}

<!-- Feedback → opens a prefilled GitHub issue -->
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

<footer
	class="mt-8 border-t border-curtain-100 bg-curtain-950 py-10 text-center text-xs text-curtain-100/50 dark:border-white/10"
>
	<p class="font-display text-base italic text-curtain-100/80">幕間 · OnStage TW</p>
	<p class="mx-auto mt-2 max-w-xl px-5">
		開源戲劇演出聚合 · 資料來自各售票平台公開頁面，著作權屬各主辦單位與售票平台 · 本站不販售門票，購票連結皆導回官方售票網
	</p>
	<div class="mt-4 flex flex-wrap items-center justify-center gap-3">
		<a
			href="https://github.com/TakalaWang/onstage-tw"
			target="_blank"
			rel="noopener noreferrer"
			class="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 font-medium text-curtain-100/90 transition hover:border-gold-400 hover:text-gold-400"
		>
			<Icon name="star" size={13} /> 喜歡的話，在 GitHub 給顆 Star
		</a>
		<a href="/feed.xml" class="inline-flex items-center gap-1 hover:text-gold-400">
			<Icon name="rss" size={13} /> RSS
		</a>
	</div>
</footer>
