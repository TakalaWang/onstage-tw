// Taiwan performing-arts venue registry (client-safe: NO package/server imports).
//
// Purpose:
//   (a) Infer a city from a scraped venue/address string via findVenue().
//   (b) Provide lat/lng markers for a future map view.
//
// Conventions:
//   - City names use 「臺」 not 「台」 (e.g. 臺北市, 高雄市), matching regions.ts.
//   - `aliases` holds substrings a scraper might emit (hall-level names, common
//     spellings, English/short forms) so findVenue() can match with includes().
//   - Coordinates are the real venue location where known. Entries whose lat/lng
//     are area-level approximations (district/landmark, not the exact building)
//     are flagged with an inline `// approx` comment.
//   - findVenue() matches longest name/alias first to avoid ambiguous short
//     names (e.g. 「中山堂」 exists in both 臺北 and 臺中) resolving wrongly.

export interface Venue {
	name: string;
	aliases: string[];
	city: string;
	lat: number;
	lng: number;
}

export const VENUES: Venue[] = [
	// ---- National-level (國家表演藝術中心 et al.) ----
	{
		name: '國家兩廳院',
		aliases: [
			'國家戲劇院',
			'國家音樂廳',
			'兩廳院',
			'演奏廳',
			'實驗劇場',
			'國家中正文化中心',
			'中正文化中心',
			'NTCH'
		],
		city: '臺北市',
		lat: 25.0359,
		lng: 121.5174
	},
	{
		name: '臺灣戲曲中心',
		aliases: ['台灣戲曲中心', '戲曲中心', '大表演廳', '小表演廳', '3102多功能廳'],
		city: '臺北市',
		lat: 25.1029,
		lng: 121.5256
	},
	{
		name: '臺中國家歌劇院',
		// NOTE: bare hall names (大劇院 / 小劇場) are intentionally omitted — they are
		// ambiguous substrings that would mis-resolve unrelated venues to 臺中市.
		aliases: ['台中國家歌劇院', '臺中歌劇院', '台中歌劇院', '國家歌劇院', 'National Taichung Theater'],
		city: '臺中市',
		lat: 24.1626,
		lng: 120.6403
	},
	{
		name: '衛武營國家藝術文化中心',
		// NOTE: bare hall names (歌劇院 / 戲劇院 / 音樂廳 / 表演廳) omitted — every city has
		// these, so as substrings they would mis-resolve other venues to 高雄市. The
		// 「衛武營」 prefix already matches all real scraped strings for this venue.
		aliases: ['衛武營', 'Weiwuying', 'National Kaohsiung Center for the Arts'],
		city: '高雄市',
		lat: 22.6233,
		lng: 120.3326
	},
	{
		name: '臺北表演藝術中心',
		// 球劇場 / 藍盒子 are unique to this venue; bare 大劇院 omitted (ambiguous, also
		// used by 臺中國家歌劇院 — the 「臺北表演藝術中心」 prefix matches real strings).
		aliases: ['台北表演藝術中心', '北藝中心', '球劇場', '藍盒子', 'TPAC', 'Taipei Performing Arts Center'],
		city: '臺北市',
		lat: 25.0847,
		lng: 121.5211
	},

	// ---- 臺北市 ----
	{
		name: '城市舞台',
		aliases: ['臺北市藝文推廣處', '台北市藝文推廣處', '城市舞臺'],
		city: '臺北市',
		lat: 25.0507,
		lng: 121.5532
	},
	{
		name: '水源劇場',
		aliases: ['水源劇場', '臺大水源劇場'],
		city: '臺北市',
		lat: 25.0143,
		lng: 121.5331
	},
	{
		name: '中山堂',
		// 臺北 中山堂 (vs 臺中 中山堂); hall-level names disambiguate via city below.
		aliases: ['臺北中山堂', '台北中山堂', '中正廳', '光復廳', '中山堂中正廳', '中山堂光復廳'],
		city: '臺北市',
		lat: 25.0432,
		lng: 121.5099
	},
	{
		name: '國父紀念館',
		aliases: ['國立國父紀念館', '中山國家畫廊', '大會堂', '國父紀念館大會堂'],
		city: '臺北市',
		lat: 25.0402,
		lng: 121.5601
	},
	{
		name: '西門紅樓',
		aliases: ['紅樓劇場', '西門紅樓二樓劇場', '西門町紅樓'],
		city: '臺北市',
		lat: 25.0421,
		lng: 121.5069
	},
	{
		name: '牯嶺街小劇場',
		aliases: ['牯嶺街小劇場', '牯嶺街'],
		city: '臺北市',
		lat: 25.0307,
		lng: 121.5147
	},
	{
		name: '松山文創園區',
		aliases: ['松菸', '松山文創', '松菸文創', '松山菸廠', '松菸LAB創意實驗室', '多功能展演廳'],
		city: '臺北市',
		lat: 25.0438,
		lng: 121.5606
	},
	{
		name: '大稻埕戲苑',
		aliases: ['大稻埕戲苑', '永樂市場戲苑'],
		city: '臺北市',
		lat: 25.0556,
		lng: 121.5099
	},
	{
		name: 'Legacy Taipei',
		aliases: ['Legacy', 'Legacy Taipei', '傳音樂展演空間', 'TERA', 'Legacy TERA'],
		city: '臺北市',
		lat: 25.0438,
		lng: 121.5612
	},
	{
		name: '卡米地喜劇俱樂部',
		aliases: ['卡米地', 'Live Comedy Club Taipei', 'Comedy Plus', 'Comedy Club'],
		city: '臺北市',
		lat: 25.0573,
		lng: 121.5439 // approx — 中山區復興北路480號
	},
	{
		name: '納豆劇場',
		aliases: ['納豆劇場'],
		city: '臺北市',
		lat: 25.0469,
		lng: 121.5174 // approx — 中正區
	},
	{
		name: '臺泥大樓士敏廳',
		aliases: ['士敏廳', '臺泥大樓', '台泥大樓'],
		city: '臺北市',
		lat: 25.0444,
		lng: 121.5235
	},
	{
		name: '臺北市中山堂(中山藏藝所)',
		aliases: ['中山藏藝所'],
		city: '臺北市',
		lat: 25.0521,
		lng: 121.5266 // approx — 中山區
	},
	{
		name: '台北國際會議中心',
		aliases: ['臺北國際會議中心', 'TICC', '國際會議中心大會堂'],
		city: '臺北市',
		lat: 25.0331,
		lng: 121.561
	},
	{
		name: '國立臺灣藝術教育館',
		aliases: ['南海劇場', '藝術教育館', '南海藝廊'],
		city: '臺北市',
		lat: 25.0319,
		lng: 121.5142
	},
	{
		name: '臺灣當代文化實驗場',
		aliases: ['空總臺灣當代文化實驗場', '空總台灣當代文化實驗場', 'C-LAB', '空總C-LAB', '空總文化實驗場'],
		city: '臺北市',
		lat: 25.0339,
		lng: 121.5419 // approx — 大安區建國南路一段177號
	},
	{
		name: '思劇場',
		aliases: ['思劇場', 'Thinkers Theatre', '思劇團'],
		city: '臺北市',
		lat: 25.0561,
		lng: 121.5104 // approx — 大同區迪化街一段
	},
	{
		name: '濕地 venue',
		aliases: ['濕地venue', 'Venue濕地', '林森北路濕地'],
		city: '臺北市',
		lat: 25.0494,
		lng: 121.5275 // approx — 中山區林森北路107巷
	},
	{
		name: '永樂座',
		aliases: ['永樂座書店'],
		city: '臺北市',
		lat: 25.0258,
		lng: 121.5337 // approx — 大安區羅斯福路三段
	},
	{
		name: '明日和合製作所空間',
		aliases: ['明日和合製作所', '明日和合空間', '明日和合'],
		city: '臺北市',
		lat: 25.0469,
		lng: 121.5174 // approx — 中正區
	},
	{
		name: '剝皮寮歷史街區',
		aliases: ['剝皮寮', '剝皮寮歷史街區演藝廳', '萬華剝皮寮'],
		city: '臺北市',
		lat: 25.0376,
		lng: 121.5008 // approx — 萬華區廣州街
	},
	{
		name: '樂悠悠之口',
		aliases: ['樂悠悠之口', '樂悠悠'],
		city: '臺北市',
		lat: 25.0464,
		lng: 121.5169 // approx — 中正區
	},
	{
		name: '嘻哈囍哈',
		aliases: ['嘻哈囍哈', 'Comedy Bar'],
		city: '臺北市',
		lat: 25.0265,
		lng: 121.5436 // approx — 大安區
	},
	{
		name: 'The Wall Live House',
		aliases: ['The Wall', 'TheWall', 'The Wall 公館', 'The Wall Music', '這牆音樂'],
		city: '臺北市',
		lat: 25.0144,
		lng: 121.5343 // approx — 中正區羅斯福路四段
	},
	{
		name: 'Zepp New Taipei',
		aliases: ['Zepp New Taipei', 'Zepp', 'Zepp 新北', '宏匯廣場Zepp'],
		city: '新北市',
		lat: 25.0029,
		lng: 121.4636 // approx — 新莊區宏匯廣場
	},
	{
		name: '河岸留言',
		aliases: ['河岸留言', '河岸留言西門紅樓展演館', 'Riverside Live House', '河岸留言音樂藝文咖啡'],
		city: '臺北市',
		lat: 25.0151,
		lng: 121.5331 // approx — 中正區水源路
	},
	{
		name: 'Clapper Studio',
		aliases: ['Clapper Studio', 'Clapper'],
		city: '臺北市',
		lat: 25.0512,
		lng: 121.5179 // approx — 大同區
	},
	{
		name: 'Revolver',
		aliases: ['Revolver Taipei', '左輪'],
		city: '臺北市',
		lat: 25.0337,
		lng: 121.5193 // approx — 中正區師大路
	},
	{
		name: 'SUB Live House',
		aliases: ['SUB Live House', 'PIPE Live Music'],
		city: '臺北市',
		lat: 25.0167,
		lng: 121.5147 // approx — 中正區
	},
	{
		name: '表演36房',
		aliases: ['表演36房', '表演三十六房'],
		city: '臺北市',
		lat: 25.0489,
		lng: 121.5169 // approx — 中正區
	},
	{
		name: '國立臺北藝術大學展演中心',
		aliases: ['北藝大展演中心', '北藝大戲劇廳', '北藝大舞蹈廳', '北藝大音樂廳', '關渡北藝大', '臺北藝術大學', 'TNUA'],
		city: '臺北市',
		lat: 25.1209,
		lng: 121.4683 // approx — 北投區關渡
	},
	{
		name: '國立臺灣師範大學知音劇場',
		aliases: ['臺師大知音劇場', '師大知音劇場', '臺師大表演藝術', '師大綜合大樓'],
		city: '臺北市',
		lat: 25.0265,
		lng: 121.5286 // approx — 大安區師大路
	},
	{
		name: '中國文化大學曉峰紀念館',
		aliases: ['文化大學曉峰館', '文化大學大典館', '陽明山文化大學', '文化大學體育館'],
		city: '臺北市',
		lat: 25.1356,
		lng: 121.5403 // approx — 士林區陽明山
	},
	{
		name: '國立政治大學藝文中心',
		aliases: ['政大藝文中心', '政治大學藝文中心', '政大四維堂', '政大表演廳'],
		city: '臺北市',
		lat: 24.9869,
		lng: 121.5769 // approx — 文山區指南路
	},

	// ---- 新北市 ----
	{
		name: '雲門劇場',
		aliases: ['雲門劇場', '淡水雲門', '雲門舞集劇場', 'Cloud Gate Theater'],
		city: '新北市',
		lat: 25.1819,
		lng: 121.4222 // approx — 淡水區中正路一段6巷36號
	},
	{
		name: '曉劇場',
		aliases: ['曉劇場', '萬座曉劇場', 'Shinehouse Theatre'],
		city: '新北市',
		lat: 25.0145,
		lng: 121.4659 // approx — 板橋區
	},
	{
		name: '新北市藝文中心',
		aliases: ['新北藝文中心', '新北市藝文中心演藝廳', '板橋藝文中心'],
		city: '新北市',
		lat: 25.0119,
		lng: 121.4585
	},
	{
		name: '蘆洲功學社音樂廳',
		aliases: ['功學社音樂廳', 'KHS音樂廳'],
		city: '新北市',
		lat: 25.0843,
		lng: 121.4694 // approx — 蘆洲區
	},
	{
		name: '淡江大學文錙音樂廳',
		aliases: ['淡江大學文錙音樂廳', '文錙音樂廳', '淡江大學學生活動中心'],
		city: '新北市',
		lat: 25.1747,
		lng: 121.4503 // approx — 淡水區英專路
	},
	{
		name: '輔仁大學國璽樓藝術廳',
		aliases: ['輔仁大學藝術學院', '輔大藝術廳', '輔仁大學國璽樓'],
		city: '新北市',
		lat: 25.0382,
		lng: 121.4329 // approx — 新莊區中正路
	},

	// ---- 桃園市 ----
	{
		name: '桃園展演中心',
		aliases: ['桃園展演中心', '鐵玫瑰劇場', '鐵玫瑰', '桃園藝文特區'],
		city: '桃園市',
		lat: 24.9959,
		lng: 121.3066
	},
	{
		name: '中壢藝術館',
		aliases: ['中壢藝術館', '中壢藝術館音樂廳'],
		city: '桃園市',
		lat: 24.9573,
		lng: 121.2244 // approx — 中壢區中美路
	},
	{
		name: '桃園市政府文化局',
		aliases: ['桃園文化局演藝廳', '桃園演藝廳'],
		city: '桃園市',
		lat: 24.9939,
		lng: 121.3009 // approx — 桃園區縣府路
	},
	{
		name: '桃園市中壢區公所中壢光影文化館',
		aliases: ['中壢光影文化館', '中壢光影電影館'],
		city: '桃園市',
		lat: 24.9534,
		lng: 121.2256 // approx — 中壢區延平路
	},
	{
		name: '國立中央大學大講堂',
		aliases: ['中央大學大講堂', '中央大學藝文中心', '中大藝文中心'],
		city: '桃園市',
		lat: 24.9685,
		lng: 121.1953 // approx — 中壢區中大路
	},

	// ---- 新竹市/新竹縣 ----
	{
		name: '新竹市文化局演藝廳',
		aliases: ['新竹演藝廳', '新竹市演藝廳', '新竹市文化局'],
		city: '新竹市',
		lat: 24.8021,
		lng: 120.9716 // approx — 東區東大路二段
	},
	{
		name: '新竹縣政府文化局演藝廳',
		aliases: ['新竹縣演藝廳', '竹北演藝廳', '新竹縣文化局'],
		city: '新竹縣',
		lat: 24.8276,
		lng: 121.0177 // approx — 竹北市縣政九路
	},
	{
		name: '國立清華大學合勤演藝廳',
		aliases: ['清華大學合勤演藝廳', '清大合勤演藝廳', '清華大學大禮堂', '清大藝術中心'],
		city: '新竹市',
		lat: 24.7956,
		lng: 120.9967 // approx — 東區光復路二段清大校內
	},
	{
		name: '國立陽明交通大學演藝廳',
		aliases: ['陽明交通大學演藝廳', '交通大學演藝廳', '交大演藝廳', '陽明交大藝文中心', '交大藝文中心'],
		city: '新竹市',
		lat: 24.7869,
		lng: 120.9966 // approx — 東區大學路交大校內
	},

	// ---- 苗栗縣 ----
	{
		name: '苗北藝文中心',
		aliases: ['苗北藝文中心', '苗北演藝廳', '竹南苗北'],
		city: '苗栗縣',
		lat: 24.6906,
		lng: 120.8801 // approx — 竹南鎮
	},
	{
		name: '苗栗縣政府文化觀光局中正堂',
		aliases: ['苗栗中正堂', '苗栗縣文化觀光局', '苗栗演藝廳'],
		city: '苗栗縣',
		lat: 24.5648,
		lng: 120.8214 // approx — 苗栗市
	},

	// ---- 臺中市 ----
	{
		name: '臺中市中山堂',
		aliases: ['台中中山堂', '臺中中山堂', '臺中市政府文化局中山堂'],
		city: '臺中市',
		lat: 24.1483,
		lng: 120.6707 // approx — 西區英才路600號
	},
	{
		name: '葫蘆墩文化中心',
		aliases: ['葫蘆墩文化中心', '豐原葫蘆墩', '葫蘆墩演奏廳'],
		city: '臺中市',
		lat: 24.2553,
		lng: 120.7217 // approx — 豐原區
	},
	{
		name: '屯區藝文中心',
		aliases: ['屯區藝文中心', '臺中屯區藝文中心', '太平屯區'],
		city: '臺中市',
		lat: 24.1289,
		lng: 120.7186 // approx — 太平區大興路
	},
	{
		name: '臺中市港區藝術中心',
		aliases: ['港區藝術中心', '清水港區藝術中心'],
		city: '臺中市',
		lat: 24.2598,
		lng: 120.5708 // approx — 清水區
	},
	{
		name: '烏梅劇院',
		aliases: ['烏梅劇院', '臺中文化部文化資產園區烏梅劇院', '文化資產園區烏梅劇院'],
		city: '臺中市',
		lat: 24.1357,
		lng: 120.6856 // approx — 南區復興路三段文化資產園區
	},
	{
		name: '文化部文化資產園區',
		aliases: ['文化資產園區', '臺中文化資產園區', '舊酒廠文化資產園區', '雅堂館', '衡道堂'],
		city: '臺中市',
		lat: 24.1361,
		lng: 120.6859 // approx — 南區復興路三段
	},
	{
		name: '國立中興大學惠蓀堂',
		aliases: ['中興大學惠蓀堂', '興大惠蓀堂', '中興大學藝術中心'],
		city: '臺中市',
		lat: 24.1233,
		lng: 120.6753 // approx — 南區國光路興大校內
	},

	// ---- 彰化縣 ----
	{
		name: '員林演藝廳',
		aliases: ['員林演藝廳', '彰化縣文化局員林演藝廳'],
		city: '彰化縣',
		lat: 23.9605,
		lng: 120.5754 // approx — 員林市員林大道
	},
	{
		name: '彰化縣立彰化藝術館',
		aliases: ['彰化藝術館', '彰化縣文化局'],
		city: '彰化縣',
		lat: 24.0789,
		lng: 120.5421 // approx — 彰化市卦山路
	},

	// ---- 南投縣 ----
	{
		name: '南投縣政府文化局演藝廳',
		aliases: ['南投演藝廳', '南投縣文化局', '南投縣政府文化局'],
		city: '南投縣',
		lat: 23.9099,
		lng: 120.6861 // approx — 南投市
	},

	// ---- 雲林縣 ----
	{
		name: '雲林縣文化處表演廳',
		aliases: ['雲林表演廳', '雲林縣文化處', '斗六表演廳'],
		city: '雲林縣',
		lat: 23.7117,
		lng: 120.5454 // approx — 斗六市大學路三段
	},

	// ---- 嘉義市/嘉義縣 ----
	{
		name: '嘉義市政府文化局音樂廳',
		aliases: ['嘉義市音樂廳', '嘉義市文化局', '嘉義音樂廳'],
		city: '嘉義市',
		lat: 23.4791,
		lng: 120.4495 // approx — 嘉義市文化局園區
	},
	{
		name: '嘉義縣表演藝術中心',
		aliases: ['嘉義縣表演藝術中心', '民雄表演藝術中心', '嘉縣表演藝術中心'],
		city: '嘉義縣',
		lat: 23.5503,
		lng: 120.4378 // approx — 民雄鄉建國路二段
	},

	// ---- 臺南市 ----
	{
		name: '臺南文化中心',
		aliases: ['台南文化中心', '臺南市立文化中心', '臺南文化中心演藝廳', '原生劇場'],
		city: '臺南市',
		lat: 22.9881,
		lng: 120.2241 // approx — 東區中華東路三段
	},
	{
		name: '涴莎藝術展演中心',
		aliases: ['涴莎', '涴莎永華館', '涴莎古典音樂沙龍'],
		city: '臺南市',
		lat: 22.9908,
		lng: 120.1988 // approx — 中西區
	},
	{
		name: '321巷藝術聚落',
		aliases: ['321巷藝術聚落', '321藝術聚落', '三二一巷'],
		city: '臺南市',
		lat: 23.0011,
		lng: 120.2086 // approx — 北區公園路321巷
	},
	{
		name: '臺南市新營文化中心',
		aliases: ['新營文化中心', '臺南新營文化中心'],
		city: '臺南市',
		lat: 23.3079,
		lng: 120.3169 // approx — 新營區
	},
	{
		name: '國立成功大學鳳凰樹劇場',
		aliases: ['成功大學鳳凰樹劇場', '成大鳳凰樹劇場', '成大藝術中心', '成功大學成功廳', '成大成功廳'],
		city: '臺南市',
		lat: 22.9967,
		lng: 120.2178 // approx — 東區大學路成大校內
	},
	{
		name: '臺南藍晒圖文創園區',
		aliases: ['藍晒圖文創園區', '藍曬圖文創園區', '臺南藍晒圖'],
		city: '臺南市',
		lat: 22.9869,
		lng: 120.2076 // approx — 南區西門路一段
	},
	{
		name: '臺南市立圖書館新總館演藝廳',
		aliases: ['臺南市立圖書館演藝廳', '臺南新總圖演藝廳'],
		city: '臺南市',
		lat: 22.9847,
		lng: 120.2459 // approx — 永康區康橋大道
	},

	// ---- 高雄市 ----
	{
		name: '高雄市文化中心',
		aliases: ['高雄文化中心', '至德堂', '至善廳', '高雄市立文化中心'],
		city: '高雄市',
		lat: 22.6242,
		lng: 120.3206 // approx — 苓雅區五福一路
	},
	{
		name: '大東文化藝術中心',
		aliases: ['大東文化藝術中心', '大東藝術中心', '鳳山大東'],
		city: '高雄市',
		lat: 22.6262,
		lng: 120.3636 // approx — 鳳山區光遠路
	},
	{
		name: '駁二藝術特區',
		aliases: ['駁二', '駁二藝術特區', '駁二大義倉庫', '駁二正港小劇場'],
		city: '高雄市',
		lat: 22.6202,
		lng: 120.2818
	},
	{
		name: '高雄流行音樂中心',
		aliases: ['高流', '高雄流行音樂中心', '海音館', 'KPMC', '海邊跳浪'],
		city: '高雄市',
		lat: 22.6188,
		lng: 120.3017
	},
	{
		name: '高雄市音樂館',
		aliases: ['高雄市音樂館', '愛河音樂館'],
		city: '高雄市',
		lat: 22.6293,
		lng: 120.2917 // approx — 鼓山區
	},
	{
		name: '國立中山大學逸仙館',
		aliases: ['中山大學逸仙館', '中山大學音樂廳', '中山大學藝文中心', '西灣中山大學'],
		city: '高雄市',
		lat: 22.6263,
		lng: 120.2658 // approx — 鼓山區蓮海路中山大學校內
	},
	{
		name: '高雄市政府文化局岡山文化中心',
		aliases: ['岡山文化中心', '高雄岡山文化中心'],
		city: '高雄市',
		lat: 22.7956,
		lng: 120.2956 // approx — 岡山區岡山路
	},
	{
		name: '正港資訊文化藝術中心',
		aliases: ['正港小劇場', '正港資訊文化', '駁二正港'],
		city: '高雄市',
		lat: 22.6201,
		lng: 120.2823 // approx — 鹽埕區駁二大義區
	},
	{
		name: 'MOONDOG Live House',
		aliases: ['MOONDOG', 'MOONDOG Kaohsiung', '月狗'],
		city: '高雄市',
		lat: 22.6296,
		lng: 120.2989 // approx — 三民區
	},

	// ---- 屏東縣 ----
	{
		name: '屏東藝術館',
		aliases: ['屏東藝術館', '屏東縣藝術館'],
		city: '屏東縣',
		lat: 22.6726,
		lng: 120.4889 // approx — 屏東市
	},
	{
		name: '屏東演藝廳',
		aliases: ['屏東演藝廳', '屏東縣立演藝廳'],
		city: '屏東縣',
		lat: 22.6749,
		lng: 120.4881 // approx — 屏東市
	},

	// ---- 宜蘭縣 ----
	{
		name: '宜蘭演藝廳',
		aliases: ['宜蘭演藝廳', '宜蘭縣政府文化局演藝廳'],
		city: '宜蘭縣',
		lat: 24.7536,
		lng: 121.7559 // approx — 宜蘭市
	},
	{
		name: '國立傳統藝術中心宜蘭園區',
		aliases: ['傳藝中心', '宜蘭傳藝', '傳藝園區', '傳藝中心宜蘭園區'],
		city: '宜蘭縣',
		lat: 24.6829,
		lng: 121.8254 // approx — 五結鄉
	},

	// ---- 花蓮縣 ----
	{
		name: '花蓮縣文化局演藝堂',
		aliases: ['花蓮演藝堂', '花蓮縣文化局', '花蓮演藝廳'],
		city: '花蓮縣',
		lat: 23.9847,
		lng: 121.6045 // approx — 花蓮市文復路
	},

	// ---- 臺東縣 ----
	{
		name: '臺東縣藝文中心',
		aliases: ['台東藝文中心', '臺東藝文中心', '臺東縣政府文化處演藝廳'],
		city: '臺東縣',
		lat: 22.7587,
		lng: 121.1399 // approx — 臺東市
	},

	// ---- 基隆市 ----
	{
		name: '基隆文化中心演藝廳',
		aliases: ['基隆演藝廳', '基隆文化中心', '基隆市文化局演藝廳'],
		city: '基隆市',
		lat: 25.1289,
		lng: 121.7416 // approx — 信一路
	},

	// ---- 澎湖縣 ----
	{
		name: '澎湖縣政府文化局演藝廳',
		aliases: ['澎湖演藝廳', '澎湖縣文化局', '澎湖縣政府文化局'],
		city: '澎湖縣',
		lat: 23.5694,
		lng: 119.5664 // approx — 馬公市中華路
	},

	// ---- 金門縣 ----
	{
		name: '金門縣文化局演藝廳',
		aliases: ['金門演藝廳', '金門縣文化局', '金門文化園區'],
		city: '金門縣',
		lat: 24.4369,
		lng: 118.3169 // approx — 金城鎮環島北路
	},

	// ---- 連江縣（馬祖）----
	{
		name: '連江縣政府文化處中正堂',
		aliases: ['連江縣中正堂', '馬祖中正堂', '連江縣文化處', '馬祖文化處'],
		city: '連江縣',
		lat: 26.1597,
		lng: 119.9512 // approx — 南竿鄉介壽村
	},

	// ---- Live house / 展演空間（多地）----
	{
		name: 'Legacy Taichung',
		aliases: ['Legacy Taichung', 'Legacy 台中', 'Legacy 臺中', '傳音樂展演空間台中'],
		city: '臺中市',
		lat: 24.1357,
		lng: 120.6856 // approx — 南區復興路三段文化資產園區
	},
	{
		name: 'Legacy Taipei 音樂展演空間南港分館',
		aliases: ['Legacy Max', 'LegacyMax', 'Legacy 南港'],
		city: '臺北市',
		lat: 25.0539,
		lng: 121.6066 // approx — 南港區市民大道八段
	},
	{
		name: 'Zepp Kaohsiung',
		aliases: ['Zepp Kaohsiung', 'Zepp 高雄', '高雄流行音樂中心Zepp'],
		city: '高雄市',
		lat: 22.6188,
		lng: 120.3017 // approx — 鹽埕區高雄流行音樂中心
	},
	{
		name: 'TADA方舟',
		aliases: ['TADA方舟', '臺中歌劇院TADA', 'TADA Ark'],
		city: '臺中市',
		lat: 24.1626,
		lng: 120.6403 // approx — 西屯區國家歌劇院旁
	},
	{
		name: 'Live Warehouse',
		aliases: ['Live Warehouse', 'LIVE WAREHOUSE', '高雄Live Warehouse'],
		city: '高雄市',
		lat: 22.6071,
		lng: 120.2901 // approx — 前鎮區復興三路
	},
	{
		name: '幾度咖啡音樂展演空間',
		aliases: ['幾度咖啡', '幾度Cafe', '台南幾度'],
		city: '臺南市',
		lat: 22.9924,
		lng: 120.2056 // approx — 中西區
	},

	// ---- 喜劇/即興（多地）----
	{
		name: '卡米地喜劇俱樂部高雄店',
		aliases: ['卡米地高雄', 'Comedy Plus 高雄', '卡米地喜劇俱樂部高雄'],
		city: '高雄市',
		lat: 22.6312,
		lng: 120.3019 // approx — 新興區
	},
	{
		name: '微笑角即興喜劇',
		aliases: ['微笑角', '微笑角即興', 'Smile Corner'],
		city: '臺北市',
		lat: 25.0469,
		lng: 121.5174 // approx — 中正區
	},

	// ---- Added from scraped-but-unmapped venues (researched coordinates) ----
	{ name: 'PLAYground 南村劇場', aliases: ['南村劇場', 'PLAYground'], city: '臺北市', lat: 25.03196, lng: 121.56168 },
	{ name: '臺北市政大樓親子劇場', aliases: ['市政大樓親子劇場'], city: '臺北市', lat: 25.03763, lng: 121.56398 },
	{ name: '台北偶戲館', aliases: ['台北偶戲館'], city: '臺北市', lat: 25.04896, lng: 121.5615 },
	{ name: '台北車站演藝廳', aliases: ['台北車站演藝廳'], city: '臺北市', lat: 25.04781, lng: 121.51702 },
	{ name: '中影八德大樓演講廳', aliases: ['中影八德大樓', '八德大樓演講廳'], city: '臺北市', lat: 25.04822, lng: 121.5432 },
	{ name: '新莊文化藝術中心', aliases: ['新莊文化藝術中心'], city: '新北市', lat: 25.04722, lng: 121.44417 },
	{ name: '樹林藝文中心', aliases: ['樹林藝文中心'], city: '新北市', lat: 24.99099, lng: 121.42548 },
	{ name: '臺灣文學糧倉', aliases: ['臺灣文學糧倉', '文學糧倉'], city: '臺北市', lat: 25.04539, lng: 121.52455 },
	{ name: '臺灣大學藝文中心遊心劇場', aliases: ['遊心劇場'], city: '臺北市', lat: 25.0167, lng: 121.54057 },
	{ name: '臺北市客家音樂戲劇中心', aliases: ['客家音樂戲劇中心'], city: '臺北市', lat: 25.012, lng: 121.53082 },
	{ name: '信誼好好生活廣場-知新劇場', aliases: ['知新劇場', '信誼好好生活廣場'], city: '臺北市', lat: 25.02953, lng: 121.5138 },
	{ name: '四號公園文創演藝廳', aliases: ['四號公園文創'], city: '新北市', lat: 25.00069, lng: 121.51365 },
	{ name: '米倉劇場', aliases: ['米倉劇場'], city: '桃園市', lat: 24.99607, lng: 121.3113 },
	{ name: '世新大學大禮堂', aliases: ['世新大學大禮堂', '世新大學'], city: '臺北市', lat: 24.9905, lng: 121.54117 },
	{ name: '兒童新樂園 DDBox', aliases: ['兒童新樂園', 'DDBox'], city: '臺北市', lat: 25.09764, lng: 121.51547 },
	{ name: '華山1914文創園區', aliases: ['華山1914', '華山中3館', '華山文創'], city: '臺北市', lat: 25.0442, lng: 121.5295 },
	{ name: '林森59', aliases: ['林森59'], city: '臺北市', lat: 25.04398, lng: 121.5226 },
	{ name: 'iM Dimension 展演空間', aliases: ['DIMEN5ION'], city: '臺北市', lat: 25.0336, lng: 121.5708 }, // approx
	{ name: '台江文化中心台江劇場', aliases: ['台江劇場', '台江文化中心'], city: '臺南市', lat: 23.04617, lng: 120.18795 },
	{ name: '國立臺中教育大學寶成演藝廳', aliases: ['寶成演藝廳'], city: '臺中市', lat: 24.14363, lng: 120.67177 },
	{ name: '臺南文創園區 漂丿白鷺', aliases: ['漂丿白鷺'], city: '臺南市', lat: 22.99948, lng: 120.21273 },
	{ name: '新嘉義座', aliases: ['新嘉義座'], city: '嘉義市', lat: 23.47657, lng: 120.43917 },
	{ name: '雲林縣北港文化中心', aliases: ['北港文化中心'], city: '雲林縣', lat: 23.5783, lng: 120.30157 },
	{ name: '國立科學工藝博物館南館演講廳', aliases: ['科工館南館', '科學工藝博物館'], city: '高雄市', lat: 22.6416, lng: 120.32269 },
	{ name: '高雄市電影館', aliases: ['高雄市電影館'], city: '高雄市', lat: 22.62248, lng: 120.28882 },
	{ name: '鸚鵡螺餐酒館-五福店', aliases: ['鸚鵡螺餐酒館'], city: '高雄市', lat: 22.6227, lng: 120.28485 },
	{ name: '高雄市岡山皮影戲館', aliases: ['岡山皮影戲館'], city: '高雄市', lat: 22.78272, lng: 120.29848 },
	{ name: '內惟藝術中心', aliases: ['內惟藝術中心'], city: '高雄市', lat: 22.6576, lng: 120.28241 },
	{ name: '臺灣豫劇團大排練場', aliases: ['臺灣豫劇團'], city: '高雄市', lat: 22.69124, lng: 120.29073 },
	{ name: '新營火車站大廳', aliases: ['新營火車站'], city: '臺南市', lat: 23.3064, lng: 120.32334 },
	{ name: '臺東縣政府文化處藝文中心演藝廳', aliases: ['臺東縣政府文化處藝文中心'], city: '臺東縣', lat: 22.75653, lng: 121.14465 },
	{ name: '澎湖縣演藝廳', aliases: ['澎湖縣演藝廳'], city: '澎湖縣', lat: 23.57134, lng: 119.57794 },
	{ name: '花蓮豐田大同戲院', aliases: ['花蓮豐田', '大同戲院'], city: '花蓮縣', lat: 23.84924, lng: 121.49509 },
	{ name: 'More cafe 磨咖啡', aliases: ['More cafe 磨咖啡'], city: '苗栗縣', lat: 24.56468, lng: 120.81281 }, // approx
	{ name: '念清居咖啡', aliases: ['念清居'], city: '苗栗縣', lat: 24.4905, lng: 120.6828 }, // approx
	{ name: '幽谷書屋', aliases: ['幽谷書屋'], city: '苗栗縣', lat: 24.48882, lng: 120.68435 }, // approx
	{ name: 'Basis Coffee', aliases: ['Basis Coffee'], city: '臺北市', lat: 25.05314, lng: 121.53998 }, // approx
	{ name: '劉戀藝文空間', aliases: ['劉戀藝文空間'], city: '新北市', lat: 25.03903, lng: 121.4619 }, // approx
	{ name: '群島藝術園區 小劇院', aliases: ['群島藝術園區'], city: '臺中市', lat: 24.18314, lng: 120.6482 }, // approx
	{ name: '大事件劇場', aliases: ['大事件劇場'], city: '高雄市', lat: 22.68879, lng: 120.29656 }, // approx
	{ name: '新藝向玩藝所', aliases: ['新藝向玩藝所'], city: '臺北市', lat: 25.0298, lng: 121.51534 }, // approx
	{ name: '一文錢．烏托邦', aliases: ['一文錢'], city: '臺北市', lat: 25.04996, lng: 121.5578 }, // approx
	{ name: '樂君亭喜劇基地', aliases: ['樂君亭'], city: '桃園市', lat: 24.96636, lng: 121.22652 }, // approx
	{ name: '喜劇開港', aliases: ['喜劇開港'], city: '高雄市', lat: 22.62156, lng: 120.28765 }, // approx
	{ name: '覓蜜基地展演場', aliases: ['覓蜜基地'], city: '高雄市', lat: 22.74935, lng: 120.31592 }, // approx
	{ name: '艸創心演擊樂場', aliases: ['艸創心'], city: '臺北市', lat: 25.04877, lng: 121.53002 }, // approx
	{ name: '肆意咖啡酒館', aliases: ['肆意咖啡酒館'], city: '高雄市', lat: 22.64603, lng: 120.30307 } // approx
];

// Build a lookup list of (matchString, venue) sorted longest-first so that more
// specific names win over shorter ambiguous ones (e.g. 「臺中中山堂」 before 「中山堂」).
const MATCHERS: { needle: string; venue: Venue }[] = VENUES.flatMap((venue) =>
	[venue.name, ...venue.aliases].map((needle) => ({ needle, venue }))
).sort((a, b) => b.needle.length - a.needle.length);

// Return the venue whose name or any alias appears in the given text, or null.
export function findVenue(text: string | null | undefined): Venue | null {
	if (!text) return null;
	for (const { needle, venue } of MATCHERS) {
		if (text.includes(needle)) return venue;
	}
	return null;
}
