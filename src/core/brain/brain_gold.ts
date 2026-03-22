import type { ExposurePosterior, ObservationFrame, RegimePosterior, SignalCandidate } from '../types/domain';

export function generateGoldSignal(
  observation: ObservationFrame,
  _exposure: ExposurePosterior | null,
  regime: RegimePosterior
): SignalCandidate {
  const riskTail = regime.tail_prob;
  const strength = Math.min(1, 0.35 + riskTail);
  return {
    signal_id: crypto.randomUUID(),
    bucket_id: 'GOLD',
    direction: strength > 0.55 ? 'ADD' : 'HOLD',
    strength,
    confidence: Math.min(0.95, 0.5 + (observation.source_confidence['gold_proxy'] ?? 0.5)),
    horizon_days: 5,
    thesis_code: riskTail > 0.4 ? 'TAIL_HEDGE_ADD' : 'TAIL_HEDGE_HOLD',
    evidence_json: JSON.stringify({ riskTail })
  };
}
