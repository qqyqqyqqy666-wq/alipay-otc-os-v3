import type {
  EffectivePortfolioState,
  ExecutionPlan,
  ExposurePosterior,
  FrictionVerdict,
  InstrumentDynamicTruth,
  InstrumentStaticTruth,
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
  verdicts: FrictionVerdict[];
  plans: ExecutionPlan[];
}

export function runDecisionPipeline(
  observation: ObservationFrame,
  regime: RegimePosterior,
  portfolio: EffectivePortfolioState,
  dynamicTruthByBucket: Partial<Record<'GOLD' | 'CN_CORE' | 'QDII', InstrumentDynamicTruth | null>>,
  staticTruthByBucket: Partial<Record<'GOLD' | 'CN_CORE' | 'QDII', InstrumentStaticTruth | null>>,
  exposure: ExposurePosterior | null = null
): DecisionPipelineResult {
  const signals = rankSignals([
    generateGoldSignal(observation, exposure, regime),
    generateCnCoreSignal(observation, regime),
    generateQdiiSignal(observation, regime)
  ]);

  const verdicts: FrictionVerdict[] = [];
  const plans = signals.map((signal) => {
    const bucketKey = signal.bucket_id as 'GOLD' | 'CN_CORE' | 'QDII';
    const dynamicTruth = dynamicTruthByBucket[bucketKey] ?? null;
    const staticTruth = staticTruthByBucket[bucketKey] ?? null;
    const verdict = evaluateFriction(signal, portfolio, dynamicTruth, staticTruth);
    verdicts.push(verdict);
    return buildExecutionPlan(
      {
        bucketId: signal.bucket_id,
        instrumentFrom: null,
        instrumentTo: null,
        netEdgeAfterFriction: verdict.net_edge_after_friction,
        blockedReason: verdict.forced_action ? verdict.verdict_reason : null,
        thesisCode: signal.thesis_code,
        signalDirection: signal.direction
      },
      verdict
    );
  });

  return { signals, verdicts, plans };
}

const PREVIEW_BUCKETS = ['GOLD', 'CN_CORE', 'QDII'] as const;
type PreviewBucket = 'GOLD' | 'CN_CORE' | 'QDII';

export interface PreviewResponse {
  generated_at: string;
  inputs_summary: {
    observation_as_of: string;
    regime_as_of: string;
    portfolio_as_of: string;
    channel: string;
    dynamic_truth_loaded_buckets: PreviewBucket[];
    static_truth_loaded_buckets: PreviewBucket[];
  };
  signal_summary: Array<{
    bucket: string;
    direction: string;
    strength: number;
    confidence: number;
    thesis_code: string;
    horizon_days: number;
  }>;
  friction_summary: Array<{
    bucket: string;
    dynamic_truth_source: 'REAL' | 'MISSING';
    channel_blocked: boolean;
    status_blocked: boolean;
    min_hold_blocked: boolean;
    truth_cost_pct: number;
    fee_cost_pct: number;
    delay_cost_pct: number;
    net_edge_after_friction: number;
    verdict_reason: string;
  }>;
  execution_plan_summary: Array<{
    bucket: string;
    action_type: string;
    plan_status: string;
    blocked_reason: string | null;
    net_edge_after_friction: number;
    user_message_zh: string;
  }>;
  degraded_summary: {
    missing_dynamic_truth_buckets: PreviewBucket[];
    missing_static_truth_buckets: PreviewBucket[];
    conservative_channel_blocked_buckets: PreviewBucket[];
  };
}

export function buildPreviewResponse(
  result: DecisionPipelineResult,
  observation: ObservationFrame,
  regime: RegimePosterior,
  portfolio: EffectivePortfolioState,
  dynamicTruthByBucket: Partial<Record<PreviewBucket, InstrumentDynamicTruth>>,
  staticTruthByBucket: Partial<Record<PreviewBucket, InstrumentStaticTruth>>
): PreviewResponse {
  const dynamicLoadedBuckets = PREVIEW_BUCKETS.filter((b) => dynamicTruthByBucket[b] != null);
  const staticLoadedBuckets = PREVIEW_BUCKETS.filter((b) => staticTruthByBucket[b] != null);

  const friction_summary = result.signals.map((signal, i) => {
    const verdict = result.verdicts[i];
    const bucket = signal.bucket_id as PreviewBucket;
    return {
      bucket: signal.bucket_id,
      dynamic_truth_source: (dynamicTruthByBucket[bucket] != null ? 'REAL' : 'MISSING') as 'REAL' | 'MISSING',
      channel_blocked: verdict.channel_blocked,
      status_blocked: verdict.status_blocked,
      min_hold_blocked: verdict.min_hold_blocked,
      truth_cost_pct: verdict.truth_cost_pct,
      fee_cost_pct: verdict.fee_cost_pct,
      delay_cost_pct: verdict.delay_cost_pct,
      net_edge_after_friction: verdict.net_edge_after_friction,
      verdict_reason: verdict.verdict_reason
    };
  });

  const missingDynamic = PREVIEW_BUCKETS.filter((b) => dynamicTruthByBucket[b] == null);
  const missingStatic = PREVIEW_BUCKETS.filter((b) => staticTruthByBucket[b] == null);
  const conservativeChannelBlocked = friction_summary
    .filter((f) => f.channel_blocked && f.dynamic_truth_source === 'MISSING')
    .map((f) => f.bucket as PreviewBucket);

  return {
    generated_at: new Date().toISOString(),
    inputs_summary: {
      observation_as_of: observation.as_of,
      regime_as_of: regime.as_of,
      portfolio_as_of: portfolio.as_of,
      channel: observation.channel,
      dynamic_truth_loaded_buckets: dynamicLoadedBuckets,
      static_truth_loaded_buckets: staticLoadedBuckets
    },
    signal_summary: result.signals.map((s) => ({
      bucket: s.bucket_id,
      direction: s.direction,
      strength: s.strength,
      confidence: s.confidence,
      thesis_code: s.thesis_code,
      horizon_days: s.horizon_days
    })),
    friction_summary,
    execution_plan_summary: result.plans.map((p, i) => ({
      bucket: p.bucket_id,
      action_type: p.action_type,
      plan_status: p.plan_status,
      blocked_reason: p.blocked_reason,
      net_edge_after_friction: result.verdicts[i].net_edge_after_friction,
      user_message_zh: p.user_message_zh
    })),
    degraded_summary: {
      missing_dynamic_truth_buckets: missingDynamic,
      missing_static_truth_buckets: missingStatic,
      conservative_channel_blocked_buckets: conservativeChannelBlocked
    }
  };
}
