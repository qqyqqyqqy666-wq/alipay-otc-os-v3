export function parseFred(json) {
    const observations = Array.isArray(json.observations) ? json.observations : [];
    return observations.map((item) => {
        const row = item;
        const numericValue = typeof row.value === 'string' && row.value !== '.' ? Number(row.value) : null;
        return {
            date: typeof row.date === 'string' ? row.date : '',
            value: Number.isFinite(numericValue) ? numericValue : null
        };
    });
}
