import type { ExposurePosterior, RegimePosterior } from '../types/domain';

export interface ScenarioResult {
  scenarioId: string;
  expectedEdgePct: number;
  downsidePct: number;
}

export function simulateScenario(_exposure: ExposurePosterior | null, regime: RegimePosterior): ScenarioResult[] {
  return [
    {
      scenarioId: 'base_case',
      expectedEdgePct: (regime.risk_appetite_state['risk_on'] ?? 0.5) * 0.02,
      downsidePct: regime.tail_prob * 0.03
    }
  ];
}
