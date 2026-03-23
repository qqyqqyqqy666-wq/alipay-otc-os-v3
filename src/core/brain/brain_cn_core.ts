import type { ObservationFrame, RegimePosterior, SignalCandidate } from '../types/domain';

export function generateCnCoreSignal(observation: ObservationFrame, regime: RegimePosterior): SignalCandidate {
  const risk = regime.risk_appetite_state['risk_on'];
  const liquidity = regime.liquidity_state['easy'];

  // Degrade explicitly if required canonical regime keys are absent rather than
  // fabricating a neutral value. The caller supplied regime data; missing keys
  // mean the regime snapshot does not cover these states.
  if (risk === undefined || liquidity === undefined) {
    return {
      signal_id: crypto.randomUUID(),
      bucket_id: 'CN_CORE',
      direction: 'HOLD',
      strength: 0,
      confidence: 0,
      horizon_days: 5,
      thesis_code: 'DEGRADED_MISSING_REGIME_STATE',
      evidence_json: JSON.stringify({
        missing: [
          ...(risk === undefined ? ['risk_appetite_state.risk_on'] : []),
          ...(liquidity === undefined ? ['liquidity_state.easy'] : [])
        ]
      })
    };
  }

  const strength = Math.max(0, Math.min(1, 0.5 * risk + 0.5 * liquidity));
  // Use 0 if cn_equity confidence absent — do not fabricate a neutral value.
  const obsConf = observation.source_confidence['cn_equity'] ?? 0;
  const direction = strength >= 0.55 ? 'ADD' : strength <= 0.35 ? 'REDUCE' : 'HOLD';
  return {
    signal_id: crypto.randomUUID(),
    bucket_id: 'CN_CORE',
    direction,
    strength,
    confidence: Math.min(1, obsConf * 0.9),
    horizon_days: 5,
    thesis_code: direction === 'ADD' ? 'CN_CORE_RISK_ADD'
      : direction === 'REDUCE' ? 'CN_CORE_RISK_REDUCE'
      : 'CN_CORE_RISK_HOLD',
    evidence_json: JSON.stringify({ risk, liquidity, obsConf })
  };
}
