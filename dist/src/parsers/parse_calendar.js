export function parseCalendarSeed(csvText) {
    return csvText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
        const [date, flag] = line.split(',');
        return { date, isTradingDay: flag === '1' };
    });
}
