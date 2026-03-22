export function parseIndexKline(json) {
    const data = (json.data ?? {});
    const klines = Array.isArray(data.klines) ? data.klines : [];
    return klines.map((line) => {
        const fields = String(line).split(',');
        return {
            date: fields[0] ?? '',
            open: Number(fields[1] ?? 0),
            close: Number(fields[2] ?? 0),
            high: Number(fields[3] ?? 0),
            low: Number(fields[4] ?? 0),
            volume: Number(fields[5] ?? 0)
        };
    });
}
