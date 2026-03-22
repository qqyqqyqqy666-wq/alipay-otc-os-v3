export interface FredObservation {
  date: string;
  value: number | null;
}

export function parseFred(json: Record<string, unknown>): FredObservation[] {
  const observations = Array.isArray(json.observations) ? json.observations : [];
  return observations.map((item) => {
    const row = item as { date?: unknown; value?: unknown };
    const numericValue = typeof row.value === 'string' && row.value !== '.' ? Number(row.value) : null;
    return {
      date: typeof row.date === 'string' ? row.date : '',
      value: Number.isFinite(numericValue) ? numericValue : null
    };
  });
}
