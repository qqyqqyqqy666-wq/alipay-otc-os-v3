export function generateQdiiSignal(observation, regime) {
    const risk = regime.risk_appetite_state['growth'] ?? 0.4;
    const policy = regime.policy_state['supportive'] ?? 0.4;
    const strength = Math.max(0, Math.min(1, 0.6 * risk + 0.4 * policy));
    return {
        signal_id: crypto.randomUUID(),
        bucket_id: 'QDII',
        direction: strength > 0.6 ? 'ADD' : strength < 0.3 ? 'REDUCE' : 'HOLD',
        strength,
        confidence: observation.source_confidence['qdii_proxy'] ?? 0.55,
        horizon_days: 5,
        thesis_code: 'QDII_GROWTH_ROUTE',
        evidence_json: JSON.stringify({ risk, policy })
    };
}
