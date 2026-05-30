<script lang="ts">
	import Icon from './Icon.svelte';

	type Opt = { value: string; label: string };
	let { value = $bindable<string>(''), options = [] }: { value?: string; options?: Opt[] } =
		$props();

	let open = $state(false);
	let root = $state<HTMLElement | null>(null);

	const current = $derived(options.find((o) => o.value === value)?.label ?? '');

	$effect(() => {
		if (!open) return;
		const onDoc = (e: MouseEvent) => {
			if (root && !root.contains(e.target as Node)) open = false;
		};
		document.addEventListener('click', onDoc);
		return () => document.removeEventListener('click', onDoc);
	});

	function pick(v: string) {
		value = v;
		open = false;
	}
</script>

<div class="relative" bind:this={root}>
	<button
		type="button"
		onclick={() => (open = !open)}
		aria-expanded={open}
		aria-label="排序"
		class="flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-700 transition hover:border-curtain-400 dark:border-white/15 dark:bg-white/5 dark:text-gray-200"
	>
		<span class="text-gray-400 dark:text-gray-500">排序</span>
		{current}
		<Icon name="chevron-down" size={14} class="transition-transform {open ? 'rotate-180' : ''}" />
	</button>
	{#if open}
		<div
			class="absolute right-0 z-40 mt-1 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl dark:border-white/15 dark:bg-[#241b1a]"
		>
			{#each options as o (o.value)}
				<button
					type="button"
					onclick={() => pick(o.value)}
					class="block w-full rounded-lg px-2.5 py-1.5 text-left text-sm transition {value ===
					o.value
						? 'bg-curtain-50 font-medium text-curtain-700 dark:bg-white/10 dark:text-curtain-300'
						: 'text-gray-700 hover:bg-curtain-50 dark:text-gray-200 dark:hover:bg-white/5'}"
				>
					{o.label}
				</button>
			{/each}
		</div>
	{/if}
</div>
