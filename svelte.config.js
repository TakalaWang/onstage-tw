import adapterNode from '@sveltejs/adapter-node';
import adapterStatic from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// ONSTAGE_STATIC=1 → 純靜態 SPA（瀏覽用 demo，可部署到 Vercel / GitHub Pages）
// 預設 → adapter-node（可自架，含訂閱 / 抓取 API）
const isStatic = process.env.ONSTAGE_STATIC === '1';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	compilerOptions: {
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		adapter: isStatic ? adapterStatic({ strict: false }) : adapterNode()
	}
};

export default config;
