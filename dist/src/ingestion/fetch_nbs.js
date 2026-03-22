export async function fetchNbs(indicatorCode) {
    const dfwds = JSON.stringify([{ wdcode: 'zb', valuecode: indicatorCode }, { wdcode: 'sj', valuecode: 'LAST13' }]);
    const url = `https://data.stats.gov.cn/easyquery.htm?m=QueryData&dbcode=hgyd&rowcode=zb&colcode=sj&wds=[]&dfwds=${encodeURIComponent(dfwds)}`;
    const response = await fetch(url);
    if (!response.ok)
        throw new Error(`NBS fetch failed: ${response.status}`);
    return await response.json();
}
