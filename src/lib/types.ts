/** Ticketing source platform. */
export type Source = 'opentix' | 'udn' | 'kham' | 'era' | 'tixcraft';

export const SOURCE_LABELS: Record<Source, string> = {
	opentix: 'OPENTIX 兩廳院',
	udn: 'udn 售票網',
	kham: '寬宏售票',
	era: '年代售票',
	tixcraft: '拓元售票'
};

/** One performance occurrence (a date at a venue). */
export interface Session {
	date: string | null;
	venue: string | null;
	city: string | null;
	onSaleAt: string | null;
}

/**
 * A theatre show. We store only factual fields (name, dates, venue, on-sale, link);
 * tickets always deep-link back to the source site — we neither sell nor re-host their assets.
 */
export interface Show {
	/** Global unique id, formatted `${source}:${sourceId}`. */
	id: string;
	source: Source;
	/** Program id within the source platform. */
	sourceId: string;
	title: string;
	/** Sub-category / source's raw category string; may be null. */
	category: string | null;
	/** Performance start date (YYYY-MM-DD); may be null. */
	startDate: string | null;
	/** Performance end date (YYYY-MM-DD); may be null. */
	endDate: string | null;
	/** Venue name; may be null. */
	venue: string | null;
	/** City; may be null. */
	city: string | null;
	/** On-sale time (ISO 8601); often null for HTML sources that hide it on detail pages. */
	onSaleAt: string | null;
	minPrice: number | null;
	maxPrice: number | null;
	/** Poster image (hot-linked from the source, not re-hosted). */
	imageUrl: string | null;
	/** Link back to the original ticketing page. */
	url: string;
	/** Whether classified as theatre by keyword heuristic (used when a source has no category, e.g. tixCraft). */
	heuristic: boolean;
	/** Program description (currently OPENTIX only). */
	description: string | null;
	/** Organizer. */
	organizer: string | null;
	/** Per-session / per-venue details (currently OPENTIX only). */
	sessions: Session[];
}
