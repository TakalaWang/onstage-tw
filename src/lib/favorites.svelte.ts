const KEY = 'onstage:favorites';

function load(): Set<string> {
	if (typeof localStorage === 'undefined') return new Set();
	try {
		return new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[]);
	} catch {
		return new Set();
	}
}

let ids = $state<Set<string>>(load());

function persist() {
	try {
		localStorage.setItem(KEY, JSON.stringify([...ids]));
	} catch {
	}
}

export const favorites = {
	has(id: string): boolean {
		return ids.has(id);
	},
	toggle(id: string): void {
		const next = new Set(ids);
		next.has(id) ? next.delete(id) : next.add(id);
		ids = next;
		persist();
	},
	get count(): number {
		return ids.size;
	}
};
