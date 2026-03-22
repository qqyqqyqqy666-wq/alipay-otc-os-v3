export interface IndexKlineRow {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
}

export function parseIndexKline(json: Record<string, unknown>): IndexKlineRow[] {
  const data = (json.data ?? {}) as { klines?: unknown };
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
