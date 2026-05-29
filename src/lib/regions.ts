export const REGIONS: Record<string, string[]> = {
	北部: ['臺北市', '新北市', '基隆市', '桃園市', '新竹市', '新竹縣', '苗栗縣'],
	中部: ['臺中市', '彰化縣', '南投縣', '雲林縣'],
	南部: ['嘉義市', '嘉義縣', '臺南市', '高雄市', '屏東縣'],
	東部: ['宜蘭縣', '花蓮縣', '臺東縣'],
	離島: ['澎湖縣', '金門縣', '連江縣'],
};

export const REGION_ORDER = ['北部', '中部', '南部', '東部', '離島'];

export function citiesInRegion(region: string): string[] {
	return REGIONS[region] ?? [];
}
