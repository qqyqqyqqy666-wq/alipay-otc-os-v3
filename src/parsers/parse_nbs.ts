export interface NbsDataPoint {
  period: string;
  value: number;
}

export function parseNbs(json: Record<string, unknown>): NbsDataPoint[] {
  const returndata = (json.returndata ?? {}) as { datanodes?: unknown[] };
  const datanodes = Array.isArray(returndata.datanodes) ? returndata.datanodes : [];
  return datanodes.map((node) => {
    const row = node as { code?: string; data?: { data?: string } };
    const code = typeof row.code === 'string' ? row.code : '';
    return {
      period: code.slice(-6),
      value: Number(row.data?.data ?? 0)
    };
  });
}
