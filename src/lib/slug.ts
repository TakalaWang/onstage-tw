export function eventSlug(id: string): string {
	return id.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function eventPath(id: string): string {
	return `/event/${eventSlug(id)}`;
}
