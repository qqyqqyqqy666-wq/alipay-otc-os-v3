import type { ObservationFrame } from '../core/types/domain';

export function buildObservationFrame(channel: 'ALIPAY' | 'TIANTIAN', sourceValues: Record<string, unknown>): ObservationFrame {
  return {
    as_of: new Date().toISOString(),
    source_values: sourceValues,
    source_confidence: {},
    source_freshness_minutes: {},
    channel
  };
}
