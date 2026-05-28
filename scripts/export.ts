/** 從現有資料庫輸出 static/shows.json 快照（不重新抓取）。 */
import { writeSnapshot } from '../src/lib/server/snapshot';

const { path, count } = writeSnapshot();
console.log(`快照已輸出：${path}（${count} 筆）`);
