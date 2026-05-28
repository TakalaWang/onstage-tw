/** 售票來源平台 */
export type Source = 'opentix' | 'udn' | 'kham' | 'era' | 'tixcraft';

export const SOURCE_LABELS: Record<Source, string> = {
	opentix: 'OPENTIX 兩廳院',
	udn: 'udn 售票網',
	kham: '寬宏售票',
	era: '年代售票',
	tixcraft: '拓元售票'
};

/** 單一場次／場館的演出資訊。 */
export interface Session {
	date: string | null;
	venue: string | null;
	city: string | null;
	onSaleAt: string | null;
}

/**
 * 一檔戲劇演出。只保存「事實性」欄位（名稱、日期、場館、開賣、連結），
 * 購票一律深連結回原始售票頁，本站不販售也不轉存對方的圖文資產。
 */
export interface Show {
	/** 全域唯一 id，格式 `${source}:${sourceId}` */
	id: string;
	source: Source;
	/** 該平台內的節目編號 */
	sourceId: string;
	title: string;
	/** 子分類 / 平台原始分類字串，可能為空 */
	category: string | null;
	/** 演出起始日（YYYY-MM-DD），可能為空 */
	startDate: string | null;
	/** 演出結束日（YYYY-MM-DD），可能為空 */
	endDate: string | null;
	/** 場館名稱，可能為空 */
	venue: string | null;
	/** 縣市，可能為空 */
	city: string | null;
	/** 開賣時間（ISO 8601），可能為空（多數 HTML 站需進詳情頁才有） */
	onSaleAt: string | null;
	minPrice: number | null;
	maxPrice: number | null;
	/** 主視覺圖（熱連結回來源，不轉存） */
	imageUrl: string | null;
	/** 導回原始售票頁的連結 */
	url: string;
	/** 是否由關鍵字啟發式判定為戲劇（拓元無分類時使用） */
	heuristic: boolean;
	/** 節目簡介（目前僅 OPENTIX 提供） */
	description: string | null;
	/** 主辦單位 */
	organizer: string | null;
	/** 各場次／場館明細（目前僅 OPENTIX 提供） */
	sessions: Session[];
}
