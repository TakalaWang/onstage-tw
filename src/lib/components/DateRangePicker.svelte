<script lang="ts">
	import Icon from './Icon.svelte';

	let { from = $bindable<string>(''), to = $bindable<string>('') }: { from?: string; to?: string } =
		$props();

	let open = $state(false);
	let root = $state<HTMLElement | null>(null);

	const today = new Date();
	const todayKey = iso(today.getFullYear(), today.getMonth(), today.getDate());

	function iso(y: number, m0: number, d: number): string {
		return `${y}-${String(m0 + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
	}
	function parse(s: string): { y: number; m: number; d: number } | null {
		if (!s) return null;
		const [y, m, d] = s.split('-').map(Number);
		if (!y || !m || !d) return null;
		return { y, m: m - 1, d };
	}

	let view = $state(initView());
	function initView() {
		const base = parse(from) ?? parse(to);
		if (base) return { year: base.y, month: base.m };
		return { year: today.getFullYear(), month: today.getMonth() };
	}

	const weekdayLabels = ['一', '二', '三', '四', '五', '六', '日'];
	const monthLabel = $derived(`${view.year} 年 ${view.month + 1} 月`);

	type Cell = { key: string; day: number } | null;
	const cells = $derived.by(() => {
		const first = new Date(view.year, view.month, 1);
		const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
		const lead = (first.getDay() + 6) % 7;
		const out: Cell[] = [];
		for (let i = 0; i < lead; i++) out.push(null);
		for (let day = 1; day <= daysInMonth; day++)
			out.push({ key: iso(view.year, view.month, day), day });
		return out;
	});

	function changeMonth(delta: number) {
		const d = new Date(view.year, view.month + delta, 1);
		view = { year: d.getFullYear(), month: d.getMonth() };
	}

	function clickDay(key: string) {
		if (!from || (from && to)) {
			from = key;
			to = '';
		} else if (key < from) {
			to = from;
			from = key;
		} else {
			to = key;
		}
	}

	function inRange(key: string): boolean {
		return !!(from && to) && key >= from && key <= to;
	}

	function clear() {
		from = '';
		to = '';
	}

	const triggerLabel = $derived.by(() => {
		const f = parse(from);
		const t = parse(to);
		if (f && t) return `${f.m + 1}/${f.d} – ${t.m + 1}/${t.d}`;
		if (f) return `${f.m + 1}/${f.d} 起`;
		if (t) return `– ${t.m + 1}/${t.d}`;
		return '演出日期';
	});
	const hasValue = $derived(!!from || !!to);

	$effect(() => {
		if (!open) return;
		const onDoc = (e: MouseEvent) => {
			if (root && !root.contains(e.target as Node)) open = false;
		};
		document.addEventListener('click', onDoc);
		return () => document.removeEventListener('click', onDoc);
	});
</script>

<div class="relative" bind:this={root}>
	<button
		type="button"
		onclick={() => (open = !open)}
		aria-expanded={open}
		aria-label="演出日期區間"
		class="flex items-center gap-1.5 rounded-full border bg-white px-3.5 py-2 text-sm transition dark:bg-white/5 {hasValue
			? 'border-curtain-500 text-curtain-600 dark:text-curtain-300'
			: 'border-gray-300 text-gray-700 hover:border-curtain-400 dark:border-white/15 dark:text-gray-200'}"
	>
		<Icon name="calendar" size={14} class={hasValue ? '' : 'text-gray-400'} />
		{triggerLabel}
		<Icon name="chevron-down" size={14} class="transition-transform {open ? 'rotate-180' : ''}" />
	</button>
	{#if open}
		<div
			class="absolute left-0 z-40 mt-1 w-72 rounded-xl border border-gray-200 bg-white p-3 shadow-xl dark:border-white/15 dark:bg-[#241b1a]"
		>
			<div class="mb-2 flex items-center justify-between">
				<button
					type="button"
					onclick={() => changeMonth(-1)}
					aria-label="上一月"
					class="flex h-7 w-7 items-center justify-center rounded-full text-lg text-gray-500 transition hover:bg-curtain-50 hover:text-curtain-600 dark:text-gray-300 dark:hover:bg-white/5"
				>
					‹
				</button>
				<span class="text-sm font-semibold text-gray-800 dark:text-gray-100">{monthLabel}</span>
				<button
					type="button"
					onclick={() => changeMonth(1)}
					aria-label="下一月"
					class="flex h-7 w-7 items-center justify-center rounded-full text-lg text-gray-500 transition hover:bg-curtain-50 hover:text-curtain-600 dark:text-gray-300 dark:hover:bg-white/5"
				>
					›
				</button>
			</div>
			<div
				class="grid grid-cols-7 gap-0.5 text-center text-[11px] text-gray-400 dark:text-gray-500"
			>
				{#each weekdayLabels as w (w)}<div class="py-1">{w}</div>{/each}
			</div>
			<div class="grid grid-cols-7 gap-0.5">
				{#each cells as cell, i (i)}
					{#if cell}
						{@const isEnd = cell.key === from || cell.key === to}
						<button
							type="button"
							onclick={() => clickDay(cell.key)}
							class="flex aspect-square items-center justify-center rounded-lg text-sm transition {isEnd
								? 'bg-curtain-600 font-semibold text-white'
								: inRange(cell.key)
									? 'bg-curtain-100 text-curtain-700 dark:bg-curtain-500/20 dark:text-curtain-200'
									: 'text-gray-700 hover:bg-curtain-50 dark:text-gray-200 dark:hover:bg-white/5'} {cell.key ===
								todayKey && !isEnd
								? 'ring-1 ring-curtain-300 dark:ring-curtain-500/50'
								: ''}"
						>
							{cell.day}
						</button>
					{:else}
						<div class="aspect-square"></div>
					{/if}
				{/each}
			</div>
			<div class="mt-2 flex items-center justify-between">
				<button
					type="button"
					onclick={clear}
					class="text-xs text-gray-400 transition hover:text-curtain-600"
				>
					清除
				</button>
				<button
					type="button"
					onclick={() => (open = false)}
					class="rounded-full bg-curtain-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-curtain-700"
				>
					完成
				</button>
			</div>
		</div>
	{/if}
</div>
