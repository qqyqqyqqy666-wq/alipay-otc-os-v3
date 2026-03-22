export async function fetchFredSeries(env, seriesId) {
    if (!env.FRED_API_KEY)
        throw new Error('FRED_API_KEY missing');
    const url = new URL('https://api.stlouisfed.org/fred/series/observations');
    url.searchParams.set('series_id', seriesId);
    url.searchParams.set('api_key', env.FRED_API_KEY);
    url.searchParams.set('file_type', 'json');
    const response = await fetch(url.toString());
    if (!response.ok)
        throw new Error(`FRED fetch failed: ${response.status}`);
    return await response.json();
}
