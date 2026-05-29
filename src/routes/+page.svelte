<script lang="ts">
	import { SOURCE_LABELS, type Source, type Show } from '$lib/types';
	import ShowCard from '$lib/components/ShowCard.svelte';
	import ShowModal from '$lib/components/ShowModal.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const allSources = Object.keys(SOURCE_LABELS) as Source[];

	let query = $state('');
	let activeSources = $state<Set<Source>>(new Set());
	let city = $state('');
	let category = $state('');
	let dateRange = $state<'all' | 'week' | 'month' | 'quarter'>('all');
	let onSale = $state<'all' | 'soon' | 'available'>('all');
	let includeHeuristic = $state(true);
	let sort = $state<'date' | 'onsale'>('date');
	let selected = $state<Show | null>(null);
	let showSubscribe = $state(false);

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

	function isoOffsetDays(days: number): string {
		return new Date(Date.now() + days * 86_400_000).toISOString();
	}

	const filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		const nowIso = new Date().toISOString();
		const windowEnd =
			dateRange === 'week'
				? isoOffsetDays(7).slice(0, 10)
				: dateRange === 'month'
					? isoOffsetDays(31).slice(0, 10)
					: dateRange === 'quarter'
						? isoOffsetDays(92).slice(0, 10)
						: null;
		const soonEnd = isoOffsetDays(14);

		let list = data.shows.filter((s) => {
			if (!includeHeuristic && s.heuristic) return false;
			if (activeSources.size && !activeSources.has(s.source)) return false;
			if (city && s.city !== city) return false;
			if (category && s.category !== category) return false;
			if (windowEnd && s.startDate && s.startDate > windowEnd) return false;
			if (onSale === 'soon') {
				if (!s.onSaleAt || s.onSaleAt < nowIso || s.onSaleAt > soonEnd) return false;
			} else if (onSale === 'available') {
				if (!s.onSaleAt || s.onSaleAt > nowIso) return false;
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

	function resetFilters() {
		query = '';
		activeSources = new Set();
		city = '';
		category = '';
		dateRange = 'all';
		onSale = 'all';
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

	const selectClass =
		'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-curtain-500';
</script>

<svelte:head>
	<title>看戲 — 台灣戲劇演出整合</title>
	<meta
		name="description"
		content="一個地方看完 OPENTIX、udn、寬宏、年代、拓元 的戲劇演出。搜尋、過濾、RSS 訂閱開賣資訊。"
	/>
	<link rel="alternate" type="application/rss+xml" title="OnStage TW" href="/feed.xml" />
</svelte:head>

<header class="bg-curtain-900 text-white">
	<div class="mx-auto max-w-6xl px-5 py-10">
		<h1 class="text-4xl font-bold tracking-tight sm:text-5xl">看戲</h1>
		<p class="mt-2 text-lg text-curtain-100/90">一個地方看完台灣所有戲劇演出</p>
		<p class="mt-1 text-sm text-curtain-100/60">
			整合 OPENTIX · udn · 寬宏 · 年代 · 拓元，共 {data.shows.length} 檔戲劇。本站僅整合資訊，購票導回原售票網。{#if updatedLabel}　·　資料更新於 {updatedLabel}{/if}
		</p>
	</div>
</header>

<!-- Sticky filter bar -->
<div class="sticky top-0 z-10 border-b border-curtain-100 bg-curtain-50/95 backdrop-blur">
	<div class="mx-auto max-w-6xl space-y-3 px-5 py-4">
		<div class="flex flex-wrap items-center gap-3">
			<input
				type="search"
				bind:value={query}
				placeholder="搜尋劇名、場館、主辦、分類…"
				class="min-w-50 flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm outline-none focus:border-curtain-500 focus:ring-2 focus:ring-curtain-500/20"
			/>
			<button
				onclick={() => (showSubscribe = !showSubscribe)}
				class="rounded-lg bg-curtain-600 px-4 py-2 text-sm font-medium text-white hover:bg-curtain-700"
			>
				RSS 訂閱
			</button>
		</div>

		<div class="flex flex-wrap items-center gap-2">
			<select bind:value={city} class={selectClass}>
				<option value="">全部縣市</option>
				{#each cities as c (c)}<option value={c}>{c}</option>{/each}
			</select>
			<select bind:value={category} class={selectClass}>
				<option value="">全部分類</option>
				{#each categories as c (c)}<option value={c}>{c}</option>{/each}
			</select>
			<select bind:value={dateRange} class={selectClass}>
				<option value="all">不限日期</option>
				<option value="week">本週內</option>
				<option value="month">一個月內</option>
				<option value="quarter">三個月內</option>
			</select>
			<select bind:value={onSale} class={selectClass}>
				<option value="all">開賣狀態</option>
				<option value="soon">即將開賣（14天內）</option>
				<option value="available">已開賣</option>
			</select>
			<select bind:value={sort} class={selectClass}>
				<option value="date">依演出日期</option>
				<option value="onsale">依開賣時間</option>
			</select>
		</div>

		<div class="flex flex-wrap items-center gap-2 text-sm">
			{#each allSources as s (s)}
				<button
					onclick={() => toggleSource(s)}
					class="rounded-full border px-3 py-1 transition {activeSources.has(s)
						? 'border-curtain-600 bg-curtain-600 text-white'
						: 'border-gray-300 bg-white text-gray-600 hover:border-curtain-400'}"
				>
					{SOURCE_LABELS[s]}
				</button>
			{/each}
			<label class="flex items-center gap-2 text-gray-500">
				<input type="checkbox" bind:checked={includeHeuristic} class="accent-curtain-600" />
				含疑似戲劇
			</label>
			<button onclick={resetFilters} class="ml-auto text-gray-400 underline hover:text-curtain-600">
				清除篩選
			</button>
		</div>
	</div>
</div>

<!-- RSS subscribe panel: notifications handled by the user's own RSS reader, no backend -->
{#if showSubscribe}
	<div class="border-b border-curtain-100 bg-white">
		<div class="mx-auto max-w-6xl space-y-3 px-5 py-5 text-sm text-gray-600">
			<p class="font-medium text-gray-800">用 RSS 訂閱開賣資訊</p>
			<p>
				把下面的 RSS 連結加進你的閱讀器（Feedly、Inoreader、NetNewsWire…），有新戲上架就會出現在你的訂閱裡。
			</p>
			<div class="flex flex-wrap items-center gap-2">
				<code class="rounded bg-gray-100 px-3 py-2 text-xs">{data.siteUrl}/feed.xml</code>
				<a
					href="/feed.xml"
					class="rounded-lg bg-curtain-600 px-4 py-2 text-xs font-medium text-white hover:bg-curtain-700"
				>
					開啟 feed.xml
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
	<p class="mb-4 text-sm text-gray-500">符合條件：{filtered.length} 檔</p>
	{#if filtered.length === 0}
		<p class="py-20 text-center text-gray-400">沒有符合條件的演出，試試調整篩選。</p>
	{:else}
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each filtered as s (s.id)}
				<ShowCard show={s} onopen={(show) => (selected = show)} />
			{/each}
		</div>
	{/if}
</main>

{#if selected}
	<ShowModal show={selected} onclose={() => (selected = null)} />
{/if}

<footer class="border-t border-curtain-100 py-8 text-center text-xs text-gray-400">
	<p>看戲 OnStage TW · 開源戲劇演出聚合 · 資料即時來自各售票平台公開頁面，著作權屬各主辦單位與售票平台</p>
	<p class="mt-1">
		本站不販售門票，所有購票連結皆導回官方售票網 ·
		<a href="/feed.xml" class="underline hover:text-curtain-600">RSS</a>
	</p>
</footer>
