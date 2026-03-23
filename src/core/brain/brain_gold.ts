import type { ExposurePosterior, ObservationFrame, RegimePosterior, SignalCandidate } from '../types/domain';

export function generateGoldSignal(
  observation: ObservationFrame,
  _exposure: ExposurePosterior | null,
  regime: RegimePosterior
): SignalCandidate {
  // tail_prob is always present — validated by strictParseRegimePosterior
  const riskTail = regime.tail_prob;
  const strength = Math.min(1, 0.35 + riskTail);
  // If gold_proxy confidence is absent from the canonical observation, use 0
  // rather than a fabricated neutral. The signal direction still derives from
  // canonical tail_prob; only the confidence output is lowered.
  const obsConf = observation.source_confidence['gold_proxy'] ?? 0;
  return {
    signal_id: crypto.randomUUID(),
    bucket_id: 'GOLD',
    direction: strength > 0.55 ? 'ADD' : 'HOLD',
    strength,
    confidence: Math.min(0.95, obsConf + riskTail),
    horizon_days: 5,
    thesis_code: riskTail > 0.4 ? 'TAIL_HEDGE_ADD' : 'TAIL_HEDGE_HOLD',
    evidence_json: JSON.stringify({ riskTail, obsConf })
  };
}
