export async function fetchIndexKline(secid) {
    const url = `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${secid}&fields1=f1,f2,f3&fields2=f51,f52,f53,f54,f55,f56&klt=101&fqt=0&end=20500101&lmt=90`;
    const response = await fetch(url);
    if (!response.ok)
        throw new Error(`Index fetch failed: ${response.status}`);
    return await response.json();
}
