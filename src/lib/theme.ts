export function initialDark(): boolean {
	try {
		return document.documentElement.classList.contains('dark');
	} catch {
		return false;
	}
}

export function applyDark(dark: boolean): void {
	document.documentElement.classList.toggle('dark', dark);
	try {
		localStorage.setItem('theme', dark ? 'dark' : 'light');
	} catch {
		/* ignore */
	}
}
