import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { parseOpenTixList, buildOpenTixShow } from '../opentix';
import type { Show } from '../../../types';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'opentix');
const readFixture = (name: string) => JSON.parse(readFileSync(join(fixturesDir, name), 'utf-8'));

const list = readFixture('list.json');
const detail = readFixture('detail-2051591825313611777.json');

describe('parseOpenTixList', () => {
	it('keeps only DRAMA_CATEGORIES items, dropping others', () => {
		const items = parseOpenTixList(list);
		// The 親子 item is filtered out; only the 戲劇 item survives.
		expect(items.map((i) => i.id)).toEqual(['2051591825313611777']);
		expect(items.map((i) => i.displayCategory)).toEqual(['戲劇']);
		// Returns the raw list item unchanged.
		expect(items[0]).toEqual(list.result.data[0]);
	});
});

describe('buildOpenTixShow', () => {
	const item = parseOpenTixList(list)[0];

	it('builds the full Show from a list item + detail', () => {
		const expected: Show = {
			id: 'opentix:2051591825313611777',
			source: 'opentix',
			sourceId: '2051591825313611777',
			title: '躍演《勸世三姊妹》中文音樂劇',
			category: '音樂劇',
			startDate: '2026-08-08',
			endDate: '2026-10-25',
			venue: '國家戲劇院',
			city: '臺北市',
			onSaleAt: '2026-05-08T12:00:00.000Z',
			minPrice: 500,
			maxPrice: 4200,
			imageUrl: 'https://s3.resource.opentix.life/upload/program/1778237887903TJbIo61xZ3.jpeg',
			url: 'https://www.opentix.life/event/2051591825313611777',
			description: '躍演《勸世三姊妹》中文音樂劇\n\n一齣關於家庭與成長的台灣原創音樂劇。',
			notes: null,
			youthSeat: true,
			introImages: [],
			// programOrganizers uses a nested { type, info } shape, not the flat { name }
			// the parser reads, so o.name is undefined and organizer collapses to null.
			organizer: null,
			sessions: [
				{
					date: '2026-08-08',
					venue: '國家戲劇院',
					city: '臺北市',
					onSaleAt: '2026-05-15T03:30:00.000Z',
				},
				{
					date: '2026-08-09',
					venue: '國家戲劇院',
					city: '臺北市',
					onSaleAt: '2026-05-15T03:30:00.000Z',
				},
				{
					date: '2026-09-04',
					venue: '臺中國家歌劇院大劇院',
					city: '臺中市',
					onSaleAt: '2026-05-14T11:30:00.000Z',
				},
				{
					date: '2026-09-05',
					venue: '臺中國家歌劇院大劇院',
					city: '臺中市',
					onSaleAt: '2026-05-14T11:30:00.000Z',
				},
			],
		};
		expect(buildOpenTixShow(item, detail.result)).toEqual(expected);
	});

	it('builds a FAST-mode Show (no detail): detail fields empty, list fields present', () => {
		const expected: Show = {
			id: 'opentix:2051591825313611777',
			source: 'opentix',
			sourceId: '2051591825313611777',
			title: '躍演《勸世三姊妹》中文音樂劇',
			category: '音樂劇',
			startDate: '2026-08-08',
			endDate: '2026-10-25',
			venue: null,
			// city falls back to the list item's first city (un-normalized).
			city: '臺北',
			onSaleAt: null,
			minPrice: 500,
			maxPrice: 4200,
			imageUrl: 'https://s3.resource.opentix.life/upload/program/1778237887903TJbIo61xZ3.jpeg',
			url: 'https://www.opentix.life/event/2051591825313611777',
			description: null,
			notes: null,
			youthSeat: false,
			introImages: [],
			organizer: null,
			sessions: [],
		};
		expect(buildOpenTixShow(item, null)).toEqual(expected);
	});
});
