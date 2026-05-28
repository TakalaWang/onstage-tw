<script lang="ts">
	import { SOURCE_LABELS, type Show } from '$lib/types';
	import { fmtDateRange, fmtPrice, fmtOnSale, daysUntilOnSale, SOURCE_COLOR } from '$lib/format';

	let { show, onopen }: { show: Show; onopen: (s: Show) => void } = $props();

	const onSaleDays = $derived(daysUntilOnSale(show.onSaleAt));
	const soon = $derived(onSaleDays !== null && onSaleDays >= 0 && onSaleDays <= 7);
</script>

<button
	type="button"
	onclick={() => onopen(show)}
	class="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white text-left transition hover:-translate-y-0.5 hover:shadow-lg"
>
	<div class="relative aspect-[3/2] overflow-hidden bg-gray-100">
		{#if show.imageUrl}
			<img
				src={show.imageUrl}
				alt={show.title}
				loading="lazy"
				referrerpolicy="no-referrer"
				class="h-full w-full object-cover transition group-hover:scale-105"
			/>
		{/if}
		{#if soon}
			<span
				class="absolute left-2 top-2 rounded bg-curtain-600 px-2 py-0.5 text-xs font-medium text-white shadow"
			>
				{onSaleDays === 0 ? '今天開賣' : `${onSaleDays} 天後開賣`}
			</span>
		{/if}
	</div>
	<div class="flex flex-1 flex-col gap-2 p-4">
		<div class="flex flex-wrap items-center gap-2">
			<span class="rounded px-1.5 py-0.5 text-xs font-medium {SOURCE_COLOR[show.source]}">
				{SOURCE_LABELS[show.source]}
			</span>
			{#if show.heuristic}
				<span class="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">疑似戲劇</span>
			{/if}
			{#if show.category}
				<span class="text-xs text-gray-400">{show.category}</span>
			{/if}
		</div>
		<h3 class="line-clamp-2 font-semibold leading-snug text-gray-900">{show.title}</h3>
		<div class="mt-auto space-y-1 text-sm text-gray-500">
			<p>🗓 {fmtDateRange(show)}</p>
			{#if show.venue}
				<p class="line-clamp-1">📍 {show.venue}{show.city ? ` · ${show.city}` : ''}</p>
			{:else if show.city}
				<p>📍 {show.city}</p>
			{/if}
			{#if fmtOnSale(show.onSaleAt)}
				<p class="text-curtain-600">🎟 {fmtOnSale(show.onSaleAt)} 開賣</p>
			{/if}
			{#if fmtPrice(show)}<p>{fmtPrice(show)}</p>{/if}
		</div>
	</div>
</button>
