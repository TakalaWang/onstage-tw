<script lang="ts">
	import { SOURCE_LABELS, type Show } from '$lib/types';
	import { fmtDateRange, SOURCE_COLOR } from '$lib/format';
	import ShowModal from '$lib/components/ShowModal.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let selected = $state<Show | null>(null);
	let dark = $state(false);

	$effect(() => {
		dark = document.documentElement.classList.contains('dark');
	});
	function toggleTheme() {
		dark = !dark;
		document.documentElement.classList.toggle('dark', dark);
		try {
			localStorage.setItem('theme', dark ? 'dark' : 'light');
		} catch {}
	}

	function showDates(show: Show): string[] {
		const dates =
			show.sessions.length > 0
				? show.sessions.map((s) => s.date).filter((d): d is string => !!d)
				: show.startDate
					? [show.startDate]
					: [];
		return [...new Set(dates)];
	}

	const byDate = $derived.by(() => {
		const map = new Map<string, Show[]>();
		for (const show of data.shows) {
			for (const date of showDates(show)) {
				const bucket = map.get(date);
				if (bucket) bucket.push(show);
				else map.set(date, [show]);
			}
		}
		return map;
	});

	const today = new Date();
	const todayKey = isoKey(today.getFullYear(), today.getMonth(), today.getDate());

	function isoKey(y: number, m0: number, d: number): string {
		return `${y}-${String(m0 + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
	}

	let view = $state<{ year: number; month: number }>(initialView());
	function initialView() {
		const prefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
		let earliest: string | null = null;
		let hasCurrentMonth = false;
		for (const show of data.shows) {
			for (const d of showDates(show)) {
				if (d.startsWith(prefix)) hasCurrentMonth = true;
				if (!earliest || d < earliest) earliest = d;
			}
		}
		if (hasCurrentMonth) return { year: today.getFullYear(), month: today.getMonth() };
		if (earliest) {
			const [y, m] = earliest.split('-').map(Number);
			return { year: y, month: m - 1 };
		}
		return { year: today.getFullYear(), month: today.getMonth() };
	}

	function changeMonth(delta: number) {
		const d = new Date(view.year, view.month + delta, 1);
		view = { year: d.getFullYear(), month: d.getMonth() };
		activeKey = null;
	}
	function goToday() {
		view = { year: today.getFullYear(), month: today.getMonth() };
		activeKey = byDate.has(todayKey) ? todayKey : null;
	}

	const monthLabel = $derived(`${view.year} 年 ${view.month + 1} 月`);

	const weekdayLabels = ['一', '二', '三', '四', '五', '六', '日'];

	type Cell = {
		key: string;
		day: number;
		shows: Show[];
		isToday: boolean;
		isWeekend: boolean;
	} | null;

	const weeks = $derived.by(() => {
		const first = new Date(view.year, view.month, 1);
		const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
		const lead = (first.getDay() + 6) % 7;

		const cells: Cell[] = [];
		for (let i = 0; i < lead; i++) cells.push(null);
		for (let day = 1; day <= daysInMonth; day++) {
			const key = isoKey(view.year, view.month, day);
			const weekdayIdx = (lead + day - 1) % 7;
			cells.push({
				key,
				day,
				shows: byDate.get(key) ?? [],
				isToday: key === todayKey,
				isWeekend: weekdayIdx >= 5
			});
		}
		while (cells.length % 7 !== 0) cells.push(null);

		const out: Cell[][] = [];
		for (let i = 0; i < cells.length; i += 7) out.push(cells.slice(i, i + 7));
		return out;
	});

	const monthCount = $derived(weeks.flat().reduce((n, c) => n + (c ? c.shows.length : 0), 0));

	let activeKey = $state<string | null>(null);

	const resolvedKey = $derived.by(() => {
		if (activeKey && byDate.has(activeKey)) {
			const prefix = `${view.year}-${String(view.month + 1).padStart(2, '0')}`;
			if (activeKey.startsWith(prefix)) return activeKey;
		}
		if (byDate.has(todayKey) && todayKey.startsWith(`${view.year}-${String(view.month + 1).padStart(2, '0')}`))
			return todayKey;
		for (const week of weeks) for (const cell of week) if (cell && cell.shows.length) return cell.key;
		return null;
	});

	const activeShows = $derived(resolvedKey ? (byDate.get(resolvedKey) ?? []) : []);

	const activeLabel = $derived.by(() => {
		if (!resolvedKey) return null;
		const [y, m, d] = resolvedKey.split('-').map(Number);
		const dow = ['日', '一', '二', '三', '四', '五', '六'][new Date(y, m - 1, d).getDay()];
		return `${m} 月 ${d} 日（週${dow}）`;
	});

	function selectDay(cell: NonNullable<Cell>) {
		if (!cell.shows.length) return;
		activeKey = cell.key;
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
</script>

<svelte:head>
	<title>月曆 — 幕間 OnStage TW</title>
	<meta name="description" content="用月曆檢視台灣戲劇演出，依演出日期一目了然。" />
</svelte:head>

<header class="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
	<div class="flex min-w-0 items-center gap-2.5">
		<h1 class="text-2xl font-bold tracking-tight">幕間</h1>
		<span class="hidden font-display text-lg italic text-gray-400 sm:inline dark:text-gray-500">
			OnStage TW
		</span>
		<a
			href="/"
			class="ml-1 border-l border-gray-200 pl-3 text-sm text-gray-500 transition hover:text-curtain-600 dark:border-white/15 dark:text-gray-400"
		>
			← 清單檢視
		</a>
	</div>
	<div class="flex shrink-0 items-center gap-2">
		<div
			class="flex items-center rounded-full border border-gray-200 bg-white p-0.5 text-sm dark:border-white/15 dark:bg-white/5"
		>
			<a
				href="/"
				class="rounded-full px-3 py-1.5 text-gray-600 transition hover:text-curtain-600 dark:text-gray-300"
			>
				清單
			</a>
			<span
				class="flex items-center gap-1 rounded-full bg-curtain-600 px-3 py-1.5 font-medium text-white"
			>
				<Icon name="calendar" size={14} /> 月曆
			</span>
			<a
				href="/map"
				class="rounded-full px-3 py-1.5 text-gray-600 transition hover:text-curtain-600 dark:text-gray-300"
			>
				地圖
			</a>
		</div>
		<button
			onclick={toggleTheme}
			aria-label="切換深色 / 淺色模式"
			class="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition hover:border-curtain-400 hover:text-curtain-600 dark:border-white/15 dark:bg-white/5 dark:text-gray-300"
		>
			<Icon name={dark ? 'sun' : 'moon'} size={16} />
		</button>
	</div>
</header>

<main class="mx-auto max-w-6xl px-3 py-4 sm:px-5 sm:py-6">
	<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
		<div class="flex items-center gap-2">
			<button
				onclick={() => changeMonth(-1)}
				aria-label="上一月"
				class="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-lg text-gray-600 transition hover:border-curtain-400 hover:text-curtain-600 dark:border-white/15 dark:bg-white/5 dark:text-gray-300"
			>
				‹
			</button>
			<h2
				class="min-w-[7.5rem] text-center text-lg font-semibold text-gray-900 sm:text-xl dark:text-gray-100"
			>
				{monthLabel}
			</h2>
			<button
				onclick={() => changeMonth(1)}
				aria-label="下一月"
				class="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-lg text-gray-600 transition hover:border-curtain-400 hover:text-curtain-600 dark:border-white/15 dark:bg-white/5 dark:text-gray-300"
			>
				›
			</button>
			<button
				onclick={goToday}
				class="ml-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 transition hover:border-curtain-400 hover:text-curtain-600 dark:border-white/15 dark:bg-white/5 dark:text-gray-300"
			>
				今天
			</button>
		</div>
		<div class="flex items-center gap-2 text-sm">
			<span
				class="inline-flex items-center gap-1 rounded-full bg-curtain-50 px-2.5 py-1 font-medium text-curtain-700 dark:bg-white/10 dark:text-curtain-300"
			>
				本月 {monthCount} 場
			</span>
			{#if updatedLabel}
				<span class="hidden text-gray-400 sm:inline">更新於 {updatedLabel}</span>
			{/if}
		</div>
	</div>

	<div class="grid gap-5 lg:grid-cols-[1fr_22rem]">
		<div>
			<div
				class="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-400 dark:text-gray-500"
			>
				{#each weekdayLabels as w, i (w)}
					<div class="py-1.5 {i >= 5 ? 'text-curtain-500 dark:text-curtain-400' : ''}">{w}</div>
				{/each}
			</div>

			<div class="grid grid-cols-7 gap-1 sm:gap-1.5">
				{#each weeks as week, wi (wi)}
					{#each week as cell, ci (ci)}
						{#if cell}
							{@const has = cell.shows.length > 0}
							{@const isActive = cell.key === resolvedKey}
							<button
								type="button"
								onclick={() => selectDay(cell)}
								disabled={!has}
								aria-pressed={isActive}
								aria-label={has
									? `${view.month + 1} 月 ${cell.day} 日，${cell.shows.length} 場演出`
									: `${view.month + 1} 月 ${cell.day} 日`}
								class="group relative flex aspect-square flex-col items-center justify-start rounded-xl border p-1 transition motion-safe:duration-150 sm:aspect-[4/3] sm:p-2
									{has
									? 'cursor-pointer border-curtain-100 bg-white hover:-translate-y-0.5 hover:border-curtain-300 hover:shadow-md dark:border-white/10 dark:bg-[#1e1716] dark:hover:border-white/25'
									: 'cursor-default border-transparent bg-gray-50/60 dark:bg-white/[0.03]'}
									{isActive
									? 'ring-2 ring-curtain-500 ring-offset-1 ring-offset-white dark:ring-offset-[#16100f]'
									: ''}"
							>
								<span
									class="flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium sm:h-7 sm:w-7 sm:text-sm
										{cell.isToday
										? 'bg-curtain-600 font-bold text-white'
										: has
											? cell.isWeekend
												? 'text-curtain-600 dark:text-curtain-400'
												: 'text-gray-700 dark:text-gray-200'
											: cell.isWeekend
												? 'text-curtain-300 dark:text-curtain-500/60'
												: 'text-gray-300 dark:text-gray-600'}"
								>
									{cell.day}
								</span>

								{#if has}
									<span
										class="mt-1 h-1.5 w-1.5 rounded-full bg-curtain-500 sm:hidden"
									></span>
									<span
										class="mt-auto hidden rounded-full bg-curtain-50 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-curtain-700 sm:inline-block dark:bg-white/10 dark:text-curtain-300"
									>
										{cell.shows.length} 場
									</span>
								{/if}
							</button>
						{:else}
							<div class="aspect-square sm:aspect-[4/3]"></div>
						{/if}
					{/each}
				{/each}
			</div>
		</div>

		<aside
			class="rounded-2xl border border-curtain-100 bg-white p-4 lg:sticky lg:top-4 lg:max-h-[80vh] lg:self-start lg:overflow-y-auto dark:border-white/10 dark:bg-[#1e1716]"
		>
			{#if resolvedKey}
				<div class="mb-3">
					<p class="font-semibold text-gray-900 dark:text-gray-100">{activeLabel}</p>
					<p class="text-xs text-gray-400">{activeShows.length} 檔演出</p>
				</div>
				<ul class="space-y-1.5">
					{#each activeShows as show (show.id)}
						<li>
							<button
								type="button"
								onclick={() => (selected = show)}
								class="flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition hover:bg-curtain-50 dark:hover:bg-white/5"
							>
								{#if show.imageUrl}
									<img
										src={show.imageUrl}
										alt=""
										loading="lazy"
										decoding="async"
										referrerpolicy="no-referrer"
										class="h-14 w-11 shrink-0 rounded-md object-cover ring-1 ring-black/5 dark:ring-white/10"
									/>
								{:else}
									<span class="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-curtain-400"></span>
								{/if}
								<span class="min-w-0 flex-1">
									<span
										class="line-clamp-2 text-sm font-medium text-gray-800 dark:text-gray-100"
										>{show.title}</span
									>
									<span class="mt-0.5 block truncate text-xs text-gray-400">
										{#if show.venue}{show.venue}{#if show.city} · {show.city}{/if}{:else if show.city}{show.city}{:else}{fmtDateRange(show)}{/if}
									</span>
									<span
										class="mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium {SOURCE_COLOR[
											show.source
										]}"
									>
										{SOURCE_LABELS[show.source]}
									</span>
								</span>
							</button>
						</li>
					{/each}
				</ul>
			{:else}
				<div class="flex flex-col items-center justify-center py-10 text-center">
					<Icon name="calendar" size={28} class="text-curtain-300 dark:text-curtain-500/60" />
					<p class="mt-3 text-sm text-gray-500 dark:text-gray-400">本月尚無演出</p>
					<p class="mt-1 text-xs text-gray-400">試試切換到其他月份</p>
				</div>
			{/if}
		</aside>
	</div>
</main>

{#if selected}
	<ShowModal show={selected} onclose={() => (selected = null)} />
{/if}
