<script lang="ts">
	import { SOURCE_LABELS, type Show } from '$lib/types';
	import { fmtDateRange, fmtPrice, fmtOnSale, SOURCE_COLOR } from '$lib/format';
	import { downloadShowIcs } from '$lib/ics';
	import { loadDescription } from '$lib/descriptions';
	import { fade, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { prefersReducedMotion } from 'svelte/motion';
	import Icon from './Icon.svelte';

	let { show, onclose }: { show: Show; onclose: () => void } = $props();
	let shared = $state(false);

	let desc = $state<string | null>(null);
	$effect(() => {
		desc = show.description ?? null;
		if (!show.description) {
			const id = show.id;
			loadDescription(id).then((d) => {
				if (d && show.id === id) desc = d;
			});
		}
	});

	const reduce = $derived(prefersReducedMotion.current);

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
	}

	async function share() {
		const data = { title: `${show.title}｜幕間 OnStage TW`, url: show.url };
		try {
			if (navigator.share) await navigator.share(data);
			else {
				await navigator.clipboard.writeText(show.url);
				shared = true;
				setTimeout(() => (shared = false), 1800);
			}
		} catch {
		}
	}
</script>

<svelte:window onkeydown={onKey} />

<div
	class="fixed inset-0 z-[1200] flex items-start justify-center overflow-y-auto bg-curtain-950/70 p-4 backdrop-blur-md sm:p-8"
	role="presentation"
	onclick={(e) => {
		if (e.target === e.currentTarget) onclose();
	}}
	transition:fade={{ duration: reduce ? 0 : 200, easing: cubicOut }}
>
	<div
		class="my-auto w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5 dark:bg-[#1e1716] dark:ring-white/10"
		role="dialog"
		aria-modal="true"
		aria-label={show.title}
		in:scale={{ duration: reduce ? 0 : 250, start: 0.94, opacity: 0, easing: cubicOut }}
		out:scale={{ duration: reduce ? 0 : 180, start: 0.96, opacity: 0, easing: cubicOut }}
	>
		<div class="relative">
			{#if show.imageUrl}
				<img
					src={show.imageUrl}
					alt={show.title}
					referrerpolicy="no-referrer"
					class="max-h-80 w-full bg-curtain-950 object-contain"
				/>
			{/if}
			<button
				type="button"
				onclick={onclose}
				aria-label="關閉"
				class="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-curtain-950/55 text-white backdrop-blur transition hover:bg-curtain-950/80 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
			>
				<Icon name="x" size={18} />
			</button>
		</div>

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

			<h2 class="font-display text-2xl font-semibold leading-snug text-gray-900 dark:text-gray-100">
				{show.title}
			</h2>

			<dl class="grid grid-cols-[1.25rem_auto_1fr] items-center gap-x-2 gap-y-3 text-sm">
				<Icon name="calendar" size={16} class="text-curtain-500" />
				<dt class="text-gray-400">演出日期</dt>
				<dd class="text-gray-800 dark:text-gray-200">{fmtDateRange(show)}</dd>
				{#if show.venue || show.city}
					<Icon name="map-pin" size={16} class="text-curtain-500" />
					<dt class="text-gray-400">場館</dt>
					<dd class="text-gray-800 dark:text-gray-200">{show.venue ?? ''}{show.city ? ` · ${show.city}` : ''}</dd>
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
					<Icon name="share" size={15} /> {shared ? '已複製連結' : '分享'}
				</button>
			</div>

			{#if show.sessions.length > 1}
				<div class="rounded-2xl bg-curtain-50 p-4 dark:bg-white/5">
					<p class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">各場次</p>
					<ul class="space-y-1.5 text-sm text-gray-600 dark:text-gray-300">
						{#each show.sessions as session, i (i)}
							<li class="flex flex-wrap items-center gap-x-2">
								<span class="tabular-nums">{session.date ? session.date.replaceAll('-', '/') : '—'}</span>
								{#if session.venue}<span class="text-gray-300">·</span><span>{session.venue}</span>{/if}
								{#if fmtOnSale(session.onSaleAt)}
									<span class="text-curtain-600">（{fmtOnSale(session.onSaleAt)} 開賣）</span>
								{/if}
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			{#if desc}
				<div class="prose prose-sm max-w-none whitespace-pre-line text-gray-700 dark:prose-invert dark:text-gray-300">
					{desc}
				</div>
			{/if}

			{#if show.introImages?.length}
				<div class="space-y-3">
					{#if !desc}
						<p class="text-sm font-medium text-gray-700 dark:text-gray-200">節目介紹</p>
					{/if}
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

			<p class="text-xs text-gray-400">本站不販售門票，「前往購票」將開啟官方售票頁。</p>
		</div>
	</div>
</div>
