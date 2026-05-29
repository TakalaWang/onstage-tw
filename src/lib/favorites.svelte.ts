import { SvelteSet } from 'svelte/reactivity';

const KEY = 'onstage:favorites';

function load(): string[] {
	if (typeof localStorage === 'undefined') return [];
	try {
		return JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[];
	} catch {
		return [];
	}
}

const ids = new SvelteSet<string>(load());

function persist() {
	try {
		localStorage.setItem(KEY, JSON.stringify([...ids]));
	} catch {
		/* ignore */
	}
}

export const favorites = {
	has(id: string): boolean {
		return ids.has(id);
	},
	toggle(id: string): void {
		if (ids.has(id)) ids.delete(id);
		else ids.add(id);
		persist();
	},
	get count(): number {
		return ids.size;
	},
};
