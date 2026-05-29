// Sub-genre → ASCII slug, so per-genre RSS feeds have clean URLs
// (e.g. /feed-genre-xiqu.xml). Shared by the feed writer and the UI.
export const GENRE_SLUG: Record<string, string> = {
	戲劇: 'drama',
	舞台劇: 'play',
	音樂劇: 'musical',
	戲曲: 'xiqu',
	偶戲: 'puppet',
	兒童親子: 'family',
	相聲: 'crosstalk',
	喜劇: 'comedy'
};
