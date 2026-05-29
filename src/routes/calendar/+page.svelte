<script lang="ts">
	import { SOURCE_LABELS, type Show } from '$lib/types';
	import { SOURCE_COLOR } from '$lib/format';
	import ShowModal from '$lib/components/ShowModal.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let selected = $state<Show | null>(null);
	let dark = $state(false);

	// --- Theme toggle (mirrors the home page logic) ---
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

	// --- Bucket shows by performance date (YYYY-MM-DD) ---
	// Each show contributes to every day it plays: its session dates, or [startDate]
	// when there are no sessions. Shows without any date are ignored. A show appears
	// only once per day even if it has several sessions on that date.
	const byDate = $derived.by(() => {
		const map = new Map<string, Show[]>();
		for (const show of data.shows) {
			const dates =
				show.sessions.length > 0
					? show.sessions.map((s) => s.date).filter((d): d is string => !!d)
					: show.startDate
						? [show.startDate]
						: [];
			for (const date of new Set(dates)) {
				const bucket = map.get(date);
				if (bucket) bucket.push(show);
				else map.set(date, [show]);
			}
		}
		return map;
	});

	// Default month: the current month if it has shows, otherwise the earliest month
	// that has any performance. Falls back to today when there is no data at all.
	const earliestKey = $derived.by(() => {
		const keys = [...byDate.keys()];
		return keys.length ? keys.sort()[0] : null;
	});

	const today = new Date();
	const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

	// `view` holds the year & month (0-based) currently shown.
	let view = $state<{ year: number; month: number }>(initialView());
	function initialView() {
		// Initialised once; byDate isn't reactive at module init so we read data directly.
		const hasCurrentMonth = data.shows.some((show) => {
			const dates =
				show.sessions.length > 0
					? show.sessions.map((s) => s.date).filter((d): d is string => !!d)
					: show.startDate
						? [show.startDate]
						: [];
			const prefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
			return dates.some((d) => d.startsWith(prefix));
		});
		if (hasCurrentMonth) return { year: today.getFullYear(), month: today.getMonth() };
		// Earliest performance month, computed from raw data.
		let earliest: string | null = null;
		for (const show of data.shows) {
			const dates =
				show.sessions.length > 0
					? show.sessions.map((s) => s.date).filter((d): d is string => !!d)
					: show.startDate
						? [show.startDate]
						: [];
			for (const d of dates) if (!earliest || d < earliest) earliest = d;
		}
		if (earliest) {
			const [y, m] = earliest.split('-').map(Number);
			return { year: y, month: m - 1 };
		}
		return { year: today.getFullYear(), month: today.getMonth() };
	}

	function changeMonth(delta: number) {
		const d = new Date(view.year, view.month + delta, 1);
		view = { year: d.getFullYear(), month: d.getMonth() };
	}
	function goToday() {
		view = { year: today.getFullYear(), month: today.getMonth() };
	}

	const monthLabel = $derived(`${view.year} 年 ${view.month + 1} 月`);

	// Build the calendar grid: weeks of 7 cells, Monday-first (Taiwan-friendly).
	// Each cell is either null (padding from adjacent months) or a date key + shows.
	const weekdayLabels = ['一', '二', '三', '四', '五', '六', '日'];

	type Cell = { key: string; day: number; shows: Show[]; isToday: boolean } | null;

	const weeks = $derived.by(() => {
		const first = new Date(view.year, view.month, 1);
		const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
		// JS getDay(): 0=Sun..6=Sat. Convert to Monday-first index (0=Mon..6=Sun).
		const lead = (first.getDay() + 6) % 7;

		const cells: Cell[] = [];
		for (let i = 0; i < lead; i++) cells.push(null);
		for (let day = 1; day <= daysInMonth; day++) {
			const key = `${view.year}-${String(view.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
			cells.push({ key, day, shows: byDate.get(key) ?? [], isToday: key === todayKey });
		}
		while (cells.length % 7 !== 0) cells.push(null);

		const out: Cell[][] = [];
		for (let i = 0; i < cells.length; i += 7) out.push(cells.slice(i, i + 7));
		return out;
	});

	// Count of shows in the visible month (deduped per day, summed across days).
	const monthCount = $derived(
		weeks.flat().reduce((n, c) => n + (c ? c.shows.length : 0), 0)
	);

	// Small dot colour per source, reusing SOURCE_COLOR's text-* token as the bg.
	function dotClass(show: Show): string {
		const token = SOURCE_COLOR[show.source].split(' ').find((c) => c.startsWith('text-'));
		return token ? token.replace('text-', 'bg-') : 'bg-gray-400';
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

<!-- Top nav: brand / back link on the left, view switch + theme toggle on the right -->
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
		<!-- View switch: list vs calendar -->
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

<main class="mx-auto max-w-6xl px-2 py-4 sm:px-5 sm:py-6">
	<!-- Month controls -->
	<div class="mb-4 flex items-center justify-between gap-3 px-2 sm:px-0">
		<div class="flex items-center gap-2">
			<button
				onclick={() => changeMonth(-1)}
				aria-label="上一月"
				class="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-lg text-gray-600 transition hover:border-curtain-400 hover:text-curtain-600 dark:border-white/15 dark:bg-white/5 dark:text-gray-300"
			>
				‹
			</button>
			<h2 class="min-w-[7.5rem] text-center text-lg font-semibold text-gray-900 sm:text-xl dark:text-gray-100">
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
		<p class="text-sm text-gray-500 dark:text-gray-400">
			本月 {monthCount} 場{#if updatedLabel}<span class="hidden text-gray-400 sm:inline"> · 更新於 {updatedLabel}</span>{/if}
		</p>
	</div>

	<!-- Weekday header -->
	<div class="grid grid-cols-7 gap-px text-center text-xs font-medium text-gray-400 dark:text-gray-500">
		{#each weekdayLabels as w, i (w)}
			<div class="py-1.5 {i >= 5 ? 'text-curtain-500 dark:text-curtain-400' : ''}">{w}</div>
		{/each}
	</div>

	<!-- Calendar grid -->
	<div class="overflow-hidden rounded-2xl border border-curtain-100 bg-curtain-100 dark:border-white/10 dark:bg-white/10">
		{#each weeks as week, wi (wi)}
			<div class="grid grid-cols-7 gap-px">
				{#each week as cell, ci (ci)}
					{#if cell}
						<div
							class="flex min-h-[4.5rem] flex-col bg-white p-1 sm:min-h-[7rem] sm:p-1.5 dark:bg-[#1e1716] {cell.isToday
								? 'ring-1 ring-inset ring-curtain-400'
								: ''}"
						>
							<div
								class="mb-0.5 flex h-5 w-5 items-center justify-center self-start rounded-full text-xs sm:text-sm {cell.isToday
									? 'bg-curtain-600 font-semibold text-white'
									: 'text-gray-500 dark:text-gray-400'}"
							>
								{cell.day}
							</div>

							<!-- Mobile: just coloured dots (no horizontal scroll). -->
							<div class="flex flex-wrap gap-0.5 sm:hidden">
								{#each cell.shows.slice(0, 4) as show (show.id)}
									<button
										type="button"
										onclick={() => (selected = show)}
										aria-label={show.title}
										class="h-1.5 w-1.5 rounded-full {dotClass(show)}"
									></button>
								{/each}
								{#if cell.shows.length > 4}
									<span class="text-[10px] leading-none text-gray-400">+{cell.shows.length - 4}</span>
								{/if}
							</div>

							<!-- Desktop / tablet: title chips, max 3, then +N. -->
							<div class="hidden flex-col gap-0.5 sm:flex">
								{#each cell.shows.slice(0, 3) as show (show.id)}
									<button
										type="button"
										onclick={() => (selected = show)}
										title={show.title}
										class="flex items-center gap-1 rounded px-1 py-0.5 text-left text-xs leading-tight text-gray-700 transition hover:bg-curtain-50 dark:text-gray-200 dark:hover:bg-white/5"
									>
										<span class="h-1.5 w-1.5 shrink-0 rounded-full {dotClass(show)}"></span>
										<span class="truncate">{show.title}</span>
									</button>
								{/each}
								{#if cell.shows.length > 3}
									<span class="px-1 text-[11px] text-gray-400">+{cell.shows.length - 3} 場</span>
								{/if}
							</div>
						</div>
					{:else}
						<div class="min-h-[4.5rem] bg-gray-50 sm:min-h-[7rem] dark:bg-[#16100f]"></div>
					{/if}
				{/each}
			</div>
		{/each}
	</div>

	<!-- Source legend -->
	<div class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 px-2 text-xs text-gray-500 sm:px-0 dark:text-gray-400">
		{#each Object.entries(SOURCE_LABELS) as [source, label] (source)}
			<span class="flex items-center gap-1.5">
				<span class="h-2 w-2 rounded-full {dotClass({ source } as Show)}"></span>
				{label}
			</span>
		{/each}
	</div>
</main>

{#if selected}
	<ShowModal show={selected} onclose={() => (selected = null)} />
{/if}
