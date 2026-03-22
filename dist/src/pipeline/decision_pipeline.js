import { generateGoldSignal } from '../core/brain/brain_gold';
import { generateCnCoreSignal } from '../core/brain/brain_cn_core';
import { generateQdiiSignal } from '../core/brain/brain_qdii_hktech';
import { rankSignals } from '../core/brain/brain_meta_allocator';
import { evaluateFriction } from '../core/friction/friction_engine';
import { buildExecutionPlan } from '../core/planner/execution_planner';
export function runDecisionPipeline(observation, regime, portfolio, dynamicTruthByBucket, exposure = null) {
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
        return buildExecutionPlan({
            bucketId: signal.bucket_id,
            instrumentFrom: null,
            instrumentTo: null,
            netEdgeAfterFriction: verdict.net_edge_after_friction,
            blockedReason: verdict.forced_action ? verdict.verdict_reason : null
        }, verdict);
    });
    return { signals, plans };
}
