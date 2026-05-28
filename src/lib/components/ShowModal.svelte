<script lang="ts">
	import { SOURCE_LABELS, type Show } from '$lib/types';
	import { fmtDateRange, fmtPrice, fmtOnSale, SOURCE_COLOR } from '$lib/format';

	let { show, onclose }: { show: Show; onclose: () => void } = $props();

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
	}
</script>

<svelte:window onkeydown={onKey} />

<!-- backdrop -->
<div
	class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm sm:p-8"
	role="presentation"
	onclick={(e) => {
		if (e.target === e.currentTarget) onclose();
	}}
>
	<div
		class="my-auto w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
		role="dialog"
		aria-modal="true"
		aria-label={show.title}
	>
		<div class="relative">
			{#if show.imageUrl}
				<img
					src={show.imageUrl}
					alt={show.title}
					referrerpolicy="no-referrer"
					class="max-h-80 w-full object-contain bg-gray-900"
				/>
			{/if}
			<button
				type="button"
				onclick={onclose}
				aria-label="關閉"
				class="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-lg text-white hover:bg-black/70"
			>
				✕
			</button>
		</div>

		<div class="space-y-4 p-6">
			<div class="flex flex-wrap items-center gap-2">
				<span class="rounded px-2 py-0.5 text-xs font-medium {SOURCE_COLOR[show.source]}">
					{SOURCE_LABELS[show.source]}
				</span>
				{#if show.category}<span class="text-xs text-gray-500">{show.category}</span>{/if}
				{#if show.heuristic}
					<span class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">疑似戲劇（關鍵字推測）</span>
				{/if}
			</div>

			<h2 class="text-xl font-bold leading-snug text-gray-900">{show.title}</h2>

			<dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
				<dt class="text-gray-400">演出日期</dt>
				<dd class="text-gray-800">{fmtDateRange(show)}</dd>
				{#if show.venue || show.city}
					<dt class="text-gray-400">場館</dt>
					<dd class="text-gray-800">{show.venue ?? ''}{show.city ? ` · ${show.city}` : ''}</dd>
				{/if}
				{#if fmtOnSale(show.onSaleAt, true)}
					<dt class="text-gray-400">開賣時間</dt>
					<dd class="font-medium text-curtain-600">{fmtOnSale(show.onSaleAt, true)}</dd>
				{/if}
				{#if fmtPrice(show)}
					<dt class="text-gray-400">票價</dt>
					<dd class="text-gray-800">{fmtPrice(show)}</dd>
				{/if}
				{#if show.organizer}
					<dt class="text-gray-400">主辦</dt>
					<dd class="text-gray-800">{show.organizer}</dd>
				{/if}
			</dl>

			{#if show.sessions.length > 1}
				<div>
					<p class="mb-1 text-sm font-medium text-gray-700">各場次</p>
					<ul class="space-y-1 text-sm text-gray-600">
						{#each show.sessions as session, i (i)}
							<li class="flex flex-wrap gap-x-2">
								<span>{session.date ? session.date.replaceAll('-', '/') : '—'}</span>
								{#if session.venue}<span class="text-gray-400">·</span><span>{session.venue}</span>{/if}
								{#if fmtOnSale(session.onSaleAt)}
									<span class="text-curtain-600">（{fmtOnSale(session.onSaleAt)} 開賣）</span>
								{/if}
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			{#if show.description}
				<div class="prose prose-sm max-w-none whitespace-pre-line text-gray-700">
					{show.description}
				</div>
			{/if}

			<a
				href={show.url}
				target="_blank"
				rel="noopener noreferrer"
				class="block w-full rounded-lg bg-curtain-600 py-3 text-center font-medium text-white transition hover:bg-curtain-700"
			>
				前往 {SOURCE_LABELS[show.source]} 購票 ↗
			</a>
			<p class="text-center text-xs text-gray-400">本站不販售門票，點擊將前往官方售票頁</p>
		</div>
	</div>
</div>
