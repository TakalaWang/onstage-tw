<script lang="ts">
	import 'leaflet/dist/leaflet.css';
	import type { Map as LMap, CircleMarker } from 'leaflet';
	import { findVenue, type Venue } from '$lib/venues';
	import { SOURCE_LABELS, type Show } from '$lib/types';
	import { fmtDateRange } from '$lib/format';
	import ShowModal from '$lib/components/ShowModal.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let selected = $state<Show | null>(null);
	let activeVenue = $state<string | null>(null);
	let dark = $state(false);
	let mapEl = $state<HTMLElement | null>(null);

	function venueOf(s: Show): Venue | null {
		const v = findVenue(s.venue);
		if (v) return v;
		for (const ss of s.sessions) {
			const vv = findVenue(ss.venue);
			if (vv) return vv;
		}
		return null;
	}

	const groups = $derived.by(() => {
		const map = new Map<string, { venue: Venue; shows: Show[] }>();
		let unlocated = 0;
		for (const s of data.shows) {
			const v = venueOf(s);
			if (!v) {
				unlocated++;
				continue;
			}
			const g = map.get(v.name) ?? { venue: v, shows: [] };
			g.shows.push(s);
			map.set(v.name, g);
		}
		return { list: [...map.values()].sort((a, b) => b.shows.length - a.shows.length), unlocated };
	});

	const activeShows = $derived(
		activeVenue ? (groups.list.find((g) => g.venue.name === activeVenue)?.shows ?? []) : []
	);

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

	$effect(() => {
		if (!mapEl) return;
		let map: LMap | undefined;
		let cancelled = false;
		(async () => {
			const L = await import('leaflet');
			if (cancelled || !mapEl) return;
			map = L.map(mapEl, { scrollWheelZoom: true }).setView([23.8, 120.95], 7);
			L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
				attribution: '&copy; OpenStreetMap &copy; CARTO',
				maxZoom: 19
			}).addTo(map);
			for (const g of groups.list) {
				const r = Math.min(9 + g.shows.length * 1.5, 26);
				const m: CircleMarker = L.circleMarker([g.venue.lat, g.venue.lng], {
					radius: r,
					color: '#8a1623',
					weight: 1.5,
					fillColor: '#c8323a',
					fillOpacity: 0.7
				}).addTo(map!);
				m.bindTooltip(`${g.venue.name}（${g.shows.length}）`, { direction: 'top' });
				m.on('click', () => (activeVenue = g.venue.name));
			}
		})();
		return () => {
			cancelled = true;
			map?.remove();
		};
	});
</script>

<svelte:head>
	<title>地圖 — 幕間 OnStage TW</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<header class="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
	<a href="/" class="flex items-center gap-2 text-lg font-bold">
		幕間 <span class="font-display text-base font-normal italic text-gray-400">OnStage TW</span>
	</a>
	<div class="flex items-center gap-2">
		<div class="flex overflow-hidden rounded-full border border-gray-200 text-sm dark:border-white/15">
			<a href="/" class="px-3 py-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10">清單</a>
			<a href="/calendar" class="border-l border-gray-200 px-3 py-1.5 text-gray-500 hover:bg-gray-100 dark:border-white/15 dark:text-gray-300 dark:hover:bg-white/10">月曆</a>
			<span class="border-l border-gray-200 bg-curtain-600 px-3 py-1.5 font-medium text-white dark:border-white/15">地圖</span>
		</div>
		<button
			onclick={toggleTheme}
			aria-label="切換深色 / 淺色模式"
			class="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition hover:border-curtain-400 dark:border-white/15 dark:bg-white/5 dark:text-gray-300"
		>
			<Icon name={dark ? 'sun' : 'moon'} size={16} />
		</button>
	</div>
</header>

<main class="mx-auto grid max-w-6xl gap-4 px-4 pb-10 sm:px-5 lg:grid-cols-[1fr_22rem]">
	<div
		bind:this={mapEl}
		class="h-[60vh] w-full overflow-hidden rounded-2xl border border-curtain-100 lg:h-[76vh] dark:border-white/10"
	></div>

	<aside class="rounded-2xl border border-curtain-100 bg-white p-4 dark:border-white/10 dark:bg-[#1e1716]">
		{#if activeVenue}
			<div class="mb-3 flex items-start justify-between gap-2">
				<div>
					<p class="font-semibold text-gray-900 dark:text-gray-100">{activeVenue}</p>
					<p class="text-xs text-gray-400">{activeShows.length} 檔演出</p>
				</div>
				<button onclick={() => (activeVenue = null)} aria-label="清除" class="text-gray-400 hover:text-curtain-600">
					<Icon name="x" size={16} />
				</button>
			</div>
			<ul class="max-h-[64vh] space-y-1 overflow-y-auto">
				{#each activeShows as s (s.id)}
					<li>
						<button
							onclick={() => (selected = s)}
							class="flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left text-sm transition hover:bg-curtain-50 dark:hover:bg-white/5"
						>
							{#if s.imageUrl}
								<img
									src={s.imageUrl}
									alt=""
									loading="lazy"
									decoding="async"
									referrerpolicy="no-referrer"
									class="h-14 w-11 shrink-0 rounded-md object-cover ring-1 ring-black/5 dark:ring-white/10"
								/>
							{/if}
							<span class="min-w-0 flex-1">
								<span class="line-clamp-2 font-medium text-gray-800 dark:text-gray-100">{s.title}</span>
								<span class="mt-0.5 block text-xs text-gray-400">{fmtDateRange(s)} · {SOURCE_LABELS[s.source]}</span>
							</span>
						</button>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-sm text-gray-500 dark:text-gray-400">
				點地圖上的場館看當地演出。圓圈越大，該場館的演出越多。
			</p>
			<p class="mt-3 text-xs text-gray-400">
				已定位 {groups.list.length} 個場館{groups.unlocated ? ` · ${groups.unlocated} 檔未標記（場館未收錄）` : ''}
			</p>
		{/if}
	</aside>
</main>

{#if selected}
	<ShowModal show={selected} onclose={() => (selected = null)} />
{/if}
