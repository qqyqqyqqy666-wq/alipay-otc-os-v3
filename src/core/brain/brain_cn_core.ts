import type { ObservationFrame, RegimePosterior, SignalCandidate } from '../types/domain';

export function generateCnCoreSignal(observation: ObservationFrame, regime: RegimePosterior): SignalCandidate {
  const risk = regime.risk_appetite_state['risk_on'] ?? 0.5;
  const liquidity = regime.liquidity_state['easy'] ?? 0.5;
  const strength = Math.max(0, Math.min(1, 0.5 * risk + 0.5 * liquidity));
  return {
    signal_id: crypto.randomUUID(),
    bucket_id: 'CN_CORE',
    direction: strength >= 0.55 ? 'ADD' : strength <= 0.35 ? 'REDUCE' : 'HOLD',
    strength,
    confidence: Math.min(1, (observation.source_confidence['cn_equity'] ?? 0.6) * 0.9),
    horizon_days: 5,
    thesis_code: 'CN_CORE_ROUTE',
    evidence_json: JSON.stringify({ risk, liquidity })
  };
}
