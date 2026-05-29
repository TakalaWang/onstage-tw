<script lang="ts">
	import Icon from './Icon.svelte';

	let { repo, onclose }: { repo: string; onclose: () => void } = $props();

	const TYPES = ['功能建議', '回報問題', '資料有誤'] as const;
	let type = $state<(typeof TYPES)[number]>('功能建議');
	let text = $state('');

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
	}

	// Build a prefilled "new issue" URL. Static site → no backend/token needed;
	// the visitor reviews and submits on GitHub (where they're already authed).
	function issueUrl(): string {
		const firstLine = text.trim().split('\n')[0].slice(0, 50);
		const title = `[回饋] ${type}${firstLine ? `：${firstLine}` : ''}`;
		const body = `${text.trim()}\n\n---\n類型：${type}\n來自：${location.href}`;
		const params = new URLSearchParams({ title, body, labels: 'feedback' });
		return `${repo}/issues/new?${params.toString()}`;
	}

	function submit(e: SubmitEvent) {
		e.preventDefault();
		window.open(issueUrl(), '_blank', 'noopener');
		onclose();
	}
</script>

<svelte:window onkeydown={onKey} />

<div
	class="animate-overlay-in fixed inset-0 z-50 flex items-center justify-center bg-curtain-950/70 p-4 backdrop-blur-md"
	role="presentation"
	onclick={(e) => {
		if (e.target === e.currentTarget) onclose();
	}}
>
	<div
		class="animate-pop-in w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-black/5 dark:bg-[#1e1716] dark:ring-white/10"
		role="dialog"
		aria-modal="true"
		aria-label="意見回饋"
	>
	<form onsubmit={submit} class="space-y-4">
		<div class="flex items-center justify-between">
			<h2 class="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
				<Icon name="message" size={18} class="text-curtain-600" /> 意見回饋
			</h2>
			<button
				type="button"
				onclick={onclose}
				aria-label="關閉"
				class="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
			>
				<Icon name="x" size={16} />
			</button>
		</div>

		<div class="flex flex-wrap gap-2">
			{#each TYPES as t (t)}
				<button
					type="button"
					onclick={() => (type = t)}
					class="rounded-full border px-3 py-1 text-sm transition {type === t
						? 'border-curtain-600 bg-curtain-600 text-white'
						: 'border-gray-300 text-gray-600 hover:border-curtain-400 dark:border-white/15 dark:text-gray-300'}"
				>
					{t}
				</button>
			{/each}
		</div>

		<textarea
			bind:value={text}
			required
			rows="4"
			placeholder="想補充的演出、發現的錯誤、想要的功能…"
			class="w-full resize-none rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-curtain-500 focus:ring-2 focus:ring-curtain-500/20 dark:border-white/15 dark:bg-white/5 dark:text-gray-100"
		></textarea>

		<button
			type="submit"
			class="flex w-full items-center justify-center gap-2 rounded-xl bg-curtain-600 py-3 font-medium text-white transition hover:bg-curtain-700 active:scale-[0.99]"
		>
			<Icon name="github" size={16} /> 在 GitHub 送出回饋
		</button>
		<p class="text-center text-xs text-gray-400">
			會開啟 GitHub 的 issue 頁面（內容已帶好），確認後送出即可，需 GitHub 帳號。
		</p>
	</form>
	</div>
</div>
