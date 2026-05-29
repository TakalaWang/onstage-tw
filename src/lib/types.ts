export type Source = 'opentix' | 'udn' | 'kham' | 'era' | 'kktix' | 'accupass';

export const SOURCE_LABELS: Record<Source, string> = {
	opentix: 'OPENTIX 兩廳院',
	udn: 'udn 售票網',
	kham: '寬宏售票',
	era: '年代售票',
	kktix: 'KKTIX',
	accupass: 'Accupass 活動通',
};

export interface Session {
	date: string | null;
	venue: string | null;
	city: string | null;
	onSaleAt: string | null;
}

export interface Show {
	id: string;
	source: Source;
	sourceId: string;
	title: string;
	category: string | null;
	startDate: string | null;
	endDate: string | null;
	venue: string | null;
	city: string | null;
	onSaleAt: string | null;
	minPrice: number | null;
	maxPrice: number | null;
	imageUrl: string | null;
	url: string;
	description: string | null;
	notes: string | null;
	introImages: string[];
	organizer: string | null;
	sessions: Session[];
}
