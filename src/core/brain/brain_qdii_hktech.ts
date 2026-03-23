import type { ObservationFrame, RegimePosterior, SignalCandidate } from '../types/domain';

export function generateQdiiSignal(observation: ObservationFrame, regime: RegimePosterior): SignalCandidate {
  const risk = regime.risk_appetite_state['growth'];
  const policy = regime.policy_state['supportive'];

  // Degrade explicitly if required canonical regime keys are absent rather than
  // fabricating a neutral value.
  if (risk === undefined || policy === undefined) {
    return {
      signal_id: crypto.randomUUID(),
      bucket_id: 'QDII',
      direction: 'HOLD',
      strength: 0,
      confidence: 0,
      horizon_days: 5,
      thesis_code: 'DEGRADED_MISSING_REGIME_STATE',
      evidence_json: JSON.stringify({
        missing: [
          ...(risk === undefined ? ['risk_appetite_state.growth'] : []),
          ...(policy === undefined ? ['policy_state.supportive'] : [])
        ]
      })
    };
  }

  const strength = Math.max(0, Math.min(1, 0.6 * risk + 0.4 * policy));
  // Use 0 if qdii_proxy confidence absent — do not fabricate a neutral value.
  const obsConf = observation.source_confidence['qdii_proxy'] ?? 0;
  const direction = strength > 0.6 ? 'ADD' : strength < 0.3 ? 'REDUCE' : 'HOLD';
  return {
    signal_id: crypto.randomUUID(),
    bucket_id: 'QDII',
    direction,
    strength,
    confidence: obsConf,
    horizon_days: 5,
    thesis_code: direction === 'ADD' ? 'QDII_GROWTH_ADD'
      : direction === 'REDUCE' ? 'QDII_GROWTH_REDUCE'
      : 'QDII_GROWTH_HOLD',
    evidence_json: JSON.stringify({ risk, policy, obsConf })
  };
}
