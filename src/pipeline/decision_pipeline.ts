import type {
  EffectivePortfolioState,
  ExecutionPlan,
  ExposurePosterior,
  InstrumentDynamicTruth,
  ObservationFrame,
  RegimePosterior,
  SignalCandidate
} from '../core/types/domain';
import { generateGoldSignal } from '../core/brain/brain_gold';
import { generateCnCoreSignal } from '../core/brain/brain_cn_core';
import { generateQdiiSignal } from '../core/brain/brain_qdii_hktech';
import { rankSignals } from '../core/brain/brain_meta_allocator';
import { evaluateFriction } from '../core/friction/friction_engine';
import { buildExecutionPlan } from '../core/planner/execution_planner';

export interface DecisionPipelineResult {
  signals: SignalCandidate[];
  plans: ExecutionPlan[];
}

export function runDecisionPipeline(
  observation: ObservationFrame,
  regime: RegimePosterior,
  portfolio: EffectivePortfolioState,
  dynamicTruthByBucket: Partial<Record<'GOLD' | 'CN_CORE' | 'QDII', InstrumentDynamicTruth | null>>,
  exposure: ExposurePosterior | null = null
): DecisionPipelineResult {
  const signals = rankSignals([
    generateGoldSignal(observation, exposure, regime),
    generateCnCoreSignal(observation, regime),
    generateQdiiSignal(observation, regime)
  ]);

  const plans = signals.map((signal) => {
    const dynamicTruth = signal.bucket_id === 'GOLD'
      ? dynamicTruthByBucket.GOLD ?? null
      : signal.bucket_id === 'CN_CORE'
        ? dynamicTruthByBucket.CN_CORE ?? null
        : dynamicTruthByBucket.QDII ?? null;
    const verdict = evaluateFriction(signal, portfolio, dynamicTruth);
    return buildExecutionPlan(
      {
        bucketId: signal.bucket_id,
        instrumentFrom: null,
        instrumentTo: null,
        netEdgeAfterFriction: verdict.net_edge_after_friction,
        blockedReason: verdict.forced_action ? verdict.verdict_reason : null
      },
      verdict
    );
  });

  return { signals, plans };
}
