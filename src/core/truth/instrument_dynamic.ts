import type { InstrumentDynamicTruth } from '../types/domain';

export function hasUsableDynamicTruth(input: InstrumentDynamicTruth): boolean {
  return input.arbitration_status === 'RESOLVED' && input.truth_confidence >= 0.6;
}
