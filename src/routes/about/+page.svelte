<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';

	const REPO = 'https://github.com/TakalaWang/onstage-tw';

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
</script>

<svelte:head>
	<title>關於 — 幕間 OnStage TW</title>
	<meta name="description" content="關於幕間 OnStage TW：免責聲明、著作權、隱私權政策與使用條款。" />
</svelte:head>

<header class="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
	<div class="flex min-w-0 items-center gap-2.5">
		<h1 class="text-2xl font-bold tracking-tight">幕間</h1>
		<span class="hidden font-display text-lg italic text-gray-400 sm:inline dark:text-gray-500">
			OnStage TW
		</span>
		<a
			href="/"
			class="ml-1 border-l border-gray-200 pl-3 text-sm text-gray-500 transition hover:text-curtain-600 dark:border-white/15 dark:text-gray-400"
		>
			← 幕間
		</a>
	</div>
	<button
		onclick={toggleTheme}
		aria-label="切換深色 / 淺色模式"
		class="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition hover:border-curtain-400 hover:text-curtain-600 dark:border-white/15 dark:bg-white/5 dark:text-gray-300"
	>
		<Icon name={dark ? 'sun' : 'moon'} size={16} />
	</button>
</header>

<main class="mx-auto max-w-3xl px-4 py-6 sm:px-5 sm:py-10">
	<div class="mb-8">
		<h2 class="font-display text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-gray-50">
			關於 / 法律資訊
		</h2>
		<p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
			幕間 OnStage TW · 開源的台灣戲劇演出資訊聚合
		</p>
	</div>

	<div class="space-y-5">
		<section
			class="rounded-2xl border border-curtain-100 bg-white p-5 sm:p-6 dark:border-white/10 dark:bg-[#1e1716]"
		>
			<h3 class="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
				<Icon name="ticket" size={18} class="text-curtain-600" /> 關於本站
			</h3>
			<div class="mt-3 space-y-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
				<p>
					本站是一個<strong class="font-semibold text-gray-800 dark:text-gray-100">開源</strong
					>的台灣戲劇演出資訊聚合平台，整合 OPENTIX、udn、寬宏、年代、KKTIX、Accupass
					等售票平台的公開戲劇演出資訊，讓你能在一個地方瀏覽、搜尋與追蹤。
				</p>
				<p
					class="rounded-xl border border-curtain-100 bg-curtain-50 px-4 py-3 text-curtain-800 dark:border-white/10 dark:bg-white/5 dark:text-curtain-200"
				>
					本站<strong class="font-semibold">不販售門票</strong
					>，所有購票連結皆導回各官方售票頁面完成交易。
				</p>
			</div>
		</section>

		<section
			class="rounded-2xl border border-curtain-100 bg-white p-5 sm:p-6 dark:border-white/10 dark:bg-[#1e1716]"
		>
			<h3 class="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
				<Icon name="clock" size={18} class="text-curtain-600" /> 免責聲明 (Disclaimer)
			</h3>
			<div class="mt-3 space-y-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
				<p>
					演出資訊（包含名稱、時間、地點、票價、開賣時間等）擷取自各售票平台的公開頁面，可能存在誤差、延遲或變動。所有資訊請一律以<strong
						class="font-semibold text-gray-800 dark:text-gray-100">官方售票頁為準</strong
					>。
				</p>
				<p>
					本站不對資訊之正確性、即時性或完整性負責，亦不參與、不擔保任何票券交易。
				</p>
			</div>
		</section>

		<section
			class="rounded-2xl border border-curtain-100 bg-white p-5 sm:p-6 dark:border-white/10 dark:bg-[#1e1716]"
		>
			<h3 class="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
				<Icon name="tag" size={18} class="text-curtain-600" /> 著作權 (Copyright)
			</h3>
			<div class="mt-3 space-y-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
				<p>
					各演出之文字、圖片、海報等內容，著作權均屬各主辦單位與售票平台所有。本站僅整合事實性資訊、標註資料來源並導流回官方頁面；海報以<strong
						class="font-semibold text-gray-800 dark:text-gray-100">熱連結（hotlink）</strong
					>方式呈現，未另行轉存。
				</p>
				<p>
					本站之<strong class="font-semibold text-gray-800 dark:text-gray-100">程式碼以 MIT 授權開源</strong
					>，歡迎參考與貢獻：
					<a
						href={REPO}
						target="_blank"
						rel="noopener noreferrer"
						class="inline-flex items-center gap-1 font-medium text-curtain-600 underline hover:text-curtain-700 dark:text-curtain-400"
					>
						<Icon name="github" size={14} /> GitHub 原始碼 <Icon name="arrow-up-right" size={12} />
					</a>
				</p>
			</div>
		</section>

		<section
			class="rounded-2xl border border-curtain-100 bg-white p-5 sm:p-6 dark:border-white/10 dark:bg-[#1e1716]"
		>
			<h3 class="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
				<Icon name="building" size={18} class="text-curtain-600" /> 隱私權政策 (Privacy)
			</h3>
			<div class="mt-3 space-y-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
				<p>
					本站為<strong class="font-semibold text-gray-800 dark:text-gray-100">純靜態網站</strong
					>，<strong class="font-semibold text-gray-800 dark:text-gray-100"
						>不需註冊、不收集個人資料、無後端資料庫</strong
					>。
				</p>
				<p>
					本站僅使用瀏覽器的 <code class="rounded bg-curtain-50 px-1.5 py-0.5 text-xs text-curtain-800 dark:bg-white/10 dark:text-gray-200">localStorage</code
					>，將你的「深色模式偏好」與「收藏清單」儲存在<strong
						class="font-semibold text-gray-800 dark:text-gray-100">你自己的裝置</strong
					>，這些資料不會上傳到任何伺服器。
				</p>
				<p>
					本站<strong class="font-semibold text-gray-800 dark:text-gray-100"
						>不使用追蹤型 Cookie，亦無第三方廣告或分析追蹤</strong
					>。其中地圖功能的圖磚由 OpenStreetMap / CARTO
					提供，瀏覽地圖時對方可能因連線而取得你的 IP 位址。
				</p>
			</div>
		</section>

		<section
			class="rounded-2xl border border-curtain-100 bg-white p-5 sm:p-6 dark:border-white/10 dark:bg-[#1e1716]"
		>
			<h3 class="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
				<Icon name="sliders" size={18} class="text-curtain-600" /> Cookie
			</h3>
			<div class="mt-3 space-y-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
				<p>
					本站不主動設定 Cookie；前述偏好設定皆以 localStorage 儲存，因此<strong
						class="font-semibold text-gray-800 dark:text-gray-100">不需要 Cookie 同意橫幅</strong
					>。若日後加入分析等功能，將於此處補充說明。
				</p>
			</div>
		</section>

		<section
			class="rounded-2xl border border-curtain-100 bg-white p-5 sm:p-6 dark:border-white/10 dark:bg-[#1e1716]"
		>
			<h3 class="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
				<Icon name="star" size={18} class="text-curtain-600" /> 使用條款 (Terms)
			</h3>
			<div class="mt-3 space-y-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
				<p>
					本站免費提供資訊整合服務，並以「<strong
						class="font-semibold text-gray-800 dark:text-gray-100">依現狀（as-is）</strong
					>」提供，不附帶任何明示或默示之擔保。使用本站時，請一併尊重各售票平台的服務條款。
				</p>
			</div>
		</section>

		<section
			class="rounded-2xl border border-curtain-100 bg-white p-5 sm:p-6 dark:border-white/10 dark:bg-[#1e1716]"
		>
			<h3 class="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
				<Icon name="message" size={18} class="text-curtain-600" /> 聯絡 / 回饋
			</h3>
			<div class="mt-3 space-y-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
				<p>
					有任何問題、錯誤回報或建議，歡迎透過 GitHub issue 與我們聯繫：
				</p>
				<a
					href={`${REPO}/issues`}
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-1.5 rounded-full bg-curtain-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-curtain-700"
				>
					<Icon name="github" size={15} /> 在 GitHub 回報 <Icon name="arrow-up-right" size={13} />
				</a>
			</div>
		</section>
	</div>

	<div class="mt-8 text-center">
		<a
			href="/"
			class="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition hover:text-curtain-600 dark:text-gray-400"
		>
			← 返回幕間
		</a>
	</div>
</main>

<footer class="border-t border-curtain-100 py-8 text-center text-xs text-gray-400 dark:border-white/10">
	<p class="mx-auto max-w-xl px-5">
		幕間 OnStage TW · 開源戲劇演出聚合 · 本站不販售門票，購票請至各官方售票頁
	</p>
</footer>
