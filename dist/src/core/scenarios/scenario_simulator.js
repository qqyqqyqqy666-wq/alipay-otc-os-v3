export function simulateScenario(_exposure, regime) {
    return [
        {
            scenarioId: 'base_case',
            expectedEdgePct: (regime.risk_appetite_state['risk_on'] ?? 0.5) * 0.02,
            downsidePct: regime.tail_prob * 0.03
        }
    ];
}
