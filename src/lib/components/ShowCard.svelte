<script lang="ts">
	import { SOURCE_LABELS, type Show } from '$lib/types';
	import { fmtDateRange, fmtPrice, fmtOnSale, daysUntilOnSale, SOURCE_COLOR } from '$lib/format';
	import { favorites } from '$lib/favorites.svelte';
	import { eventPath } from '$lib/slug';
	import Icon from './Icon.svelte';

	let {
		show,
		index = 0,
		onopen
	}: { show: Show; index?: number; onopen: (s: Show) => void } = $props();

	const onSaleDays = $derived(daysUntilOnSale(show.onSaleAt));
	const soon = $derived(onSaleDays !== null && onSaleDays >= 0 && onSaleDays <= 7);
	const delay = $derived(Math.min(index, 12) * 45);

	// Real link to the show's own page (crawlable / shareable); a plain click opens
	// the quick-view modal instead, while ⌘/Ctrl/middle-click follows the link.
	function openModal(e: MouseEvent) {
		if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
		e.preventDefault();
		onopen(show);
	}
</script>

<article
	style="animation-delay: {delay}ms; content-visibility: auto; contain-intrinsic-size: 360px;"
	class="animate-fade-up group relative flex flex-col overflow-hidden rounded-2xl border border-curtain-100 bg-white shadow-sm transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:shadow-2xl hover:shadow-curtain-900/15 focus-within:ring-2 focus-within:ring-curtain-500 dark:border-white/10 dark:bg-[#1e1716]"
>
	<a
		href={eventPath(show.id)}
		onclick={openModal}
		data-sveltekit-preload-data="off"
		aria-label={`查看「${show.title}」詳情`}
		class="absolute inset-0 z-10 cursor-pointer outline-none"
	></a>

	<div class="relative aspect-[3/2] overflow-hidden bg-curtain-950">
		{#if show.imageUrl}
			<img
				src={show.imageUrl}
				alt={show.title}
				loading="lazy"
				decoding="async"
				referrerpolicy="no-referrer"
				class="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
			/>
		{/if}
		<div
			class="pointer-events-none absolute inset-0 z-0 bg-gradient-to-t from-curtain-950/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
		></div>

		<div
			aria-hidden="true"
			class="spotlight-sweep pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
		></div>

		<a
			href={show.url}
			target="_blank"
			rel="noopener noreferrer"
			aria-label={`前往 ${SOURCE_LABELS[show.source]} 購票`}
			class="absolute bottom-2 right-2 z-20 flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-curtain-700 shadow backdrop-blur transition hover:bg-white active:scale-95 dark:bg-black/55 dark:text-gray-50"
		>
			購票 <Icon name="arrow-up-right" size={12} />
		</a>

		{#if soon}
			<span
				class="absolute left-3 top-3 z-20 flex items-center gap-1 rounded-full bg-gold-400 px-2.5 py-1 text-xs font-semibold text-curtain-950 shadow"
			>
				<Icon name="clock" size={12} />
				{onSaleDays === 0 ? '今天開賣' : `${onSaleDays} 天後開賣`}
			</span>
		{/if}

		<button
			type="button"
			onclick={() => favorites.toggle(show.id)}
			aria-label={favorites.has(show.id) ? '取消收藏' : '收藏'}
			aria-pressed={favorites.has(show.id)}
			class="absolute right-2 top-2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/85 shadow backdrop-blur transition hover:bg-white active:scale-90 dark:bg-black/50 {favorites.has(
				show.id
			)
				? 'text-curtain-600'
				: 'text-gray-500 dark:text-gray-200'}"
		>
			<Icon name="heart" size={15} filled={favorites.has(show.id)} />
		</button>
	</div>

	<div class="relative z-0 flex flex-1 flex-col gap-2 p-4">
		<div class="flex flex-wrap items-center gap-2">
			<span class="rounded-full px-2 py-0.5 text-xs font-medium {SOURCE_COLOR[show.source]}">
				{SOURCE_LABELS[show.source]}
			</span>
			{#if show.category}
				<span class="text-xs text-gray-400">{show.category}</span>
			{/if}
		</div>

		<h3
			class="line-clamp-2 text-[15px] font-semibold leading-snug text-gray-900 transition-colors group-hover:text-curtain-700 dark:text-gray-100 dark:group-hover:text-curtain-400"
		>
			{show.title}
		</h3>

		<div class="mt-auto space-y-1.5 pt-1 text-sm text-gray-500 dark:text-gray-400">
			<p class="flex items-center gap-1.5">
				<Icon name="calendar" size={14} class="shrink-0 text-gray-400" />
				{fmtDateRange(show)}
			</p>
			{#if show.venue || show.city}
				<p class="flex items-center gap-1.5">
					<Icon name="map-pin" size={14} class="shrink-0 text-gray-400" />
					<span class="line-clamp-1">{show.venue ?? ''}{show.city ? ` · ${show.city}` : ''}</span>
				</p>
			{/if}
			{#if fmtOnSale(show.onSaleAt)}
				<p class="flex items-center gap-1.5 font-medium text-curtain-600">
					<Icon name="ticket" size={14} class="shrink-0" />
					{fmtOnSale(show.onSaleAt)} 開賣
				</p>
			{/if}
			{#if fmtPrice(show)}
				<p class="flex items-center gap-1.5 text-gray-400">
					<Icon name="tag" size={14} class="shrink-0" />
					{fmtPrice(show)}
				</p>
			{/if}
		</div>
	</div>
</article>

<style>
	.spotlight-sweep {
		background: linear-gradient(
			105deg,
			transparent 35%,
			rgba(255, 255, 255, 0.22) 48%,
			rgba(255, 255, 255, 0.35) 50%,
			rgba(255, 255, 255, 0.22) 52%,
			transparent 65%
		);
		transform: translate3d(-130%, 0, 0);
	}

	:global(.group:hover) .spotlight-sweep {
		transform: translate3d(130%, 0, 0);
		transition: transform 600ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	@media (prefers-reduced-motion: reduce) {
		.spotlight-sweep {
			display: none;
		}
	}
</style>
