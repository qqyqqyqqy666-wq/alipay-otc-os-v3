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

// Explicit staleness thresholds. All values in minutes.
const OBSERVATION_STALE_MINUTES = 60;    // market snapshot must be within 1 hour
const REGIME_STALE_MINUTES = 1440;       // regime posterior valid for 24 hours
const DYNAMIC_TRUTH_STALE_MINUTES = 60; // subscription/NAV status must be within 1 hour

function ageMinutes(isoTimestamp: string, nowMs: number): number {
  return (nowMs - new Date(isoTimestamp).getTime()) / 60_000;
}

function freshnessStatus(ageMin: number, thresholdMin: number): 'FRESH' | 'STALE' {
  return ageMin <= thresholdMin ? 'FRESH' : 'STALE';
}

// Precedence order for bucket health codes.
// Index 0 = highest priority. determineBucketHealthCode applies these in order;
// the first matching condition becomes the top_blocking_reason.
export type PreviewHealthCode =
  | 'MISSING_STATIC_TRUTH'     // 0 – can't evaluate fee/min-hold/channel at all
  | 'MISSING_DYNAMIC_TRUTH'    // 1 – conservative channel block; no real subscription data
  | 'STALE_OBSERVATION'        // 2 – global: market snapshot too old
  | 'STALE_REGIME'             // 3 – global: regime posterior too old
  | 'STALE_DYNAMIC_TRUTH'      // 4 – per-bucket: subscription/NAV status too old
  | 'MANUAL_RECON_REQUIRED'    // 5 – portfolio recon must be resolved first
  | 'BLOCKED_CHANNEL'          // 6 – real subscription/redemption window closed
  | 'BLOCKED_STATUS_CONFLICT'  // 7 – truth arbitration conflict
  | 'BLOCKED_MIN_HOLD'         // 8 – youngest lot below min-hold days
  | 'BLOCKED_NEGATIVE_EDGE'    // 9 – net edge after all friction costs is <= 0
  | 'ACTIONABLE';              // 10 – no blockers

const HEALTH_CODE_PRECEDENCE: PreviewHealthCode[] = [
  'MISSING_STATIC_TRUTH',
  'MISSING_DYNAMIC_TRUTH',
  'STALE_OBSERVATION',
  'STALE_REGIME',
  'STALE_DYNAMIC_TRUTH',
  'MANUAL_RECON_REQUIRED',
  'BLOCKED_CHANNEL',
  'BLOCKED_STATUS_CONFLICT',
  'BLOCKED_MIN_HOLD',
  'BLOCKED_NEGATIVE_EDGE',
  'ACTIONABLE'
];

const DEGRADED_CODES = new Set<PreviewHealthCode>([
  'MISSING_STATIC_TRUTH',
  'MISSING_DYNAMIC_TRUTH',
  'STALE_OBSERVATION',
  'STALE_REGIME',
  'STALE_DYNAMIC_TRUTH'
]);

interface BucketHealthInput {
  hasStaticTruth: boolean;
  hasDynamicTruth: boolean;
  observationStale: boolean;
  regimeStale: boolean;
  dynamicTruthStale: boolean;
  reconRequired: boolean;
  channelBlocked: boolean;
  statusBlocked: boolean;
  minHoldBlocked: boolean;
  netEdge: number;
}

function determineBucketHealthCode(h: BucketHealthInput): PreviewHealthCode {
  if (!h.hasStaticTruth) return 'MISSING_STATIC_TRUTH';
  if (!h.hasDynamicTruth) return 'MISSING_DYNAMIC_TRUTH';
  if (h.observationStale) return 'STALE_OBSERVATION';
  if (h.regimeStale) return 'STALE_REGIME';
  if (h.dynamicTruthStale) return 'STALE_DYNAMIC_TRUTH';
  if (h.reconRequired) return 'MANUAL_RECON_REQUIRED';
  if (h.channelBlocked) return 'BLOCKED_CHANNEL';
  if (h.statusBlocked) return 'BLOCKED_STATUS_CONFLICT';
  if (h.minHoldBlocked) return 'BLOCKED_MIN_HOLD';
  if (h.netEdge <= 0) return 'BLOCKED_NEGATIVE_EDGE';
  return 'ACTIONABLE';
}

function highestPriorityCode(codes: PreviewHealthCode[]): PreviewHealthCode {
  for (const code of HEALTH_CODE_PRECEDENCE) {
    if (codes.includes(code)) return code;
  }
  return 'ACTIONABLE';
}

export type PreviewRecommendationStatus = 'ACTIONABLE' | 'HOLD' | 'DEGRADED' | 'BLOCKED';

// Canonical top-level audit bundle. Exposed on every live and replay response.
// source='LIVE': snapshot_id/snapshot_persisted_at are null (persist happens after response build).
// source='REPLAY': snapshot_id/snapshot_persisted_at come from the persisted row.
export interface PreviewAuditBundle {
  source: 'LIVE' | 'REPLAY';
  snapshot_id: string | null;
  snapshot_persisted_at: string | null;
  provenance: {
    observation_as_of: string;
    regime_as_of: string;
    portfolio_as_of: string;
    channel: string;
    dynamic_truth_signature: string;
    static_truth_signature: string;
  };
  freshness: {
    observation_status: 'FRESH' | 'STALE';
    regime_status: 'FRESH' | 'STALE';
    any_global_stale: boolean;
  };
  health: {
    is_actionable: boolean;
    any_degraded: boolean;
    any_blocked: boolean;
    top_blocking_reason: PreviewHealthCode;
  };
  recommendation: {
    status: PreviewRecommendationStatus;
    selected_bucket: string | null;
    selected_action: string | null;
    top_reason_code: PreviewHealthCode;
  };
}

export interface PreviewResponse {
  generated_at: string;
  inputs_summary: {
    observation_as_of: string;
    regime_as_of: string;
    portfolio_as_of: string;
    channel: string;
    dynamic_truth_loaded_buckets: PreviewBucket[];
    static_truth_loaded_buckets: PreviewBucket[];
    // Canonical signature of the dynamic truth rows used by this preview.
    // Format: "GOLD=<as_of>|CN_CORE=<as_of>|QDII=<as_of>", MISSING when bucket absent.
    // Stable ordering matches PREVIEW_BUCKETS. Used as part of the dedupe key.
    dynamic_truth_signature: string;
    // Canonical signature of the static truth rows used by this preview.
    // Format: "GOLD=<updated_at>|CN_CORE=<updated_at>|QDII=<updated_at>", MISSING when bucket absent.
    // Stable ordering matches PREVIEW_BUCKETS. Used as part of the dedupe key.
    static_truth_signature: string;
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
    stale_dynamic_truth_buckets: PreviewBucket[];
  };
  freshness_summary: {
    observation: { as_of: string; age_minutes: number; threshold_minutes: number; status: 'FRESH' | 'STALE' };
    regime: { as_of: string; age_minutes: number; threshold_minutes: number; status: 'FRESH' | 'STALE' };
    dynamic_truth_by_bucket: Partial<Record<PreviewBucket, { as_of: string; age_minutes: number; threshold_minutes: number; status: 'FRESH' | 'STALE' }>>;
    any_global_stale: boolean;
  };
  health_summary: {
    global: {
      is_actionable: boolean;
      any_degraded: boolean;
      any_blocked: boolean;
      top_blocking_reason: PreviewHealthCode;
    };
    by_bucket: Array<{
      bucket: string;
      is_actionable: boolean;
      is_degraded: boolean;
      top_blocking_reason: PreviewHealthCode;
    }>;
  };
  // Canonical audit bundle. Read this first for provenance, health, and recommendation.
  // source='LIVE' on fresh generation; source='REPLAY' when returned from a stored snapshot.
  audit_bundle: PreviewAuditBundle;
  // Single top-level conclusion. Callers should read this first.
  primary_recommendation: {
    // ACTIONABLE  – a real trade (BUY/REDEEM/SWITCH) is ready to submit
    // HOLD        – no blockers, but highest-ranked plan says no trade now
    // DEGRADED    – missing or stale inputs; conclusion is unreliable
    // BLOCKED     – hard blocker (channel/status/min-hold/recon) prevents execution
    status: PreviewRecommendationStatus;
    selected_bucket: string | null;           // null when DEGRADED or BLOCKED
    selected_action: string | null;           // ActionType | null
    top_reason_code: PreviewHealthCode;       // always set; 'ACTIONABLE' when status is ACTIONABLE/HOLD
    supporting_thesis_code: string | null;    // null when DEGRADED or BLOCKED
    net_edge_after_friction: number | null;   // null when DEGRADED or BLOCKED
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
  // Deterministic signature: fixed PREVIEW_BUCKETS order, MISSING when absent.
  const dynamic_truth_signature = PREVIEW_BUCKETS
    .map((b) => `${b}=${dynamicTruthByBucket[b]?.as_of ?? 'MISSING'}`)
    .join('|');
  const static_truth_signature = PREVIEW_BUCKETS
    .map((b) => `${b}=${staticTruthByBucket[b]?.updated_at ?? 'MISSING'}`)
    .join('|');

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

  const nowMs = Date.now();

  const obsAgeMin = ageMinutes(observation.as_of, nowMs);
  const regimeAgeMin = ageMinutes(regime.as_of, nowMs);

  const dynamicTruthFreshness: Partial<Record<PreviewBucket, { as_of: string; age_minutes: number; threshold_minutes: number; status: 'FRESH' | 'STALE' }>> = {};
  for (const b of PREVIEW_BUCKETS) {
    const dt = dynamicTruthByBucket[b];
    if (dt != null) {
      const ageMin = ageMinutes(dt.as_of, nowMs);
      dynamicTruthFreshness[b] = {
        as_of: dt.as_of,
        age_minutes: Math.round(ageMin),
        threshold_minutes: DYNAMIC_TRUTH_STALE_MINUTES,
        status: freshnessStatus(ageMin, DYNAMIC_TRUTH_STALE_MINUTES)
      };
    }
  }

  const staleDynamicBuckets = PREVIEW_BUCKETS.filter(
    (b) => dynamicTruthFreshness[b]?.status === 'STALE'
  );

  const obsStatus = freshnessStatus(obsAgeMin, OBSERVATION_STALE_MINUTES);
  const regimeStatus = freshnessStatus(regimeAgeMin, REGIME_STALE_MINUTES);
  const reconRequired = portfolio.reconciliation_status === 'MANUAL_RECON_REQUIRED';

  const bucketHealthEntries = result.signals.map((signal, i) => {
    const bucket = signal.bucket_id as PreviewBucket;
    const verdict = result.verdicts[i];
    const code = determineBucketHealthCode({
      hasStaticTruth: staticTruthByBucket[bucket] != null,
      hasDynamicTruth: dynamicTruthByBucket[bucket] != null,
      observationStale: obsStatus === 'STALE',
      regimeStale: regimeStatus === 'STALE',
      dynamicTruthStale: dynamicTruthFreshness[bucket]?.status === 'STALE',
      reconRequired,
      channelBlocked: verdict.channel_blocked,
      statusBlocked: verdict.status_blocked,
      minHoldBlocked: verdict.min_hold_blocked,
      netEdge: verdict.net_edge_after_friction
    });
    return { bucket: signal.bucket_id, is_actionable: code === 'ACTIONABLE', is_degraded: DEGRADED_CODES.has(code), top_blocking_reason: code };
  });

  const allCodes = bucketHealthEntries.map((e) => e.top_blocking_reason);
  const globalTopCode = highestPriorityCode(allCodes);

  // Primary recommendation: pick the first health-clear bucket (rankSignals order is preserved
  // in result.signals), then classify by the plan's action_type.
  const primaryIdx = bucketHealthEntries.findIndex((e) => e.is_actionable);
  let primary_recommendation: PreviewResponse['primary_recommendation'];
  if (primaryIdx !== -1) {
    const plan = result.plans[primaryIdx];
    const signal = result.signals[primaryIdx];
    const verdict = result.verdicts[primaryIdx];
    const isRealTrade = plan.action_type === 'BUY' || plan.action_type === 'REDEEM' || plan.action_type === 'SWITCH';
    primary_recommendation = {
      status: isRealTrade ? 'ACTIONABLE' : 'HOLD',
      selected_bucket: signal.bucket_id,
      selected_action: plan.action_type,
      top_reason_code: 'ACTIONABLE',
      supporting_thesis_code: signal.thesis_code,
      net_edge_after_friction: verdict.net_edge_after_friction
    };
  } else {
    primary_recommendation = {
      status: DEGRADED_CODES.has(globalTopCode) ? 'DEGRADED' : 'BLOCKED',
      selected_bucket: null,
      selected_action: null,
      top_reason_code: globalTopCode,
      supporting_thesis_code: null,
      net_edge_after_friction: null
    };
  }

  const audit_bundle: PreviewAuditBundle = {
    source: 'LIVE',
    snapshot_id: null,
    snapshot_persisted_at: null,
    provenance: {
      observation_as_of: observation.as_of,
      regime_as_of: regime.as_of,
      portfolio_as_of: portfolio.as_of,
      channel: observation.channel,
      dynamic_truth_signature,
      static_truth_signature
    },
    freshness: {
      observation_status: obsStatus,
      regime_status: regimeStatus,
      any_global_stale: obsStatus === 'STALE' || regimeStatus === 'STALE'
    },
    health: {
      is_actionable: globalTopCode === 'ACTIONABLE',
      any_degraded: bucketHealthEntries.some((e) => e.is_degraded),
      any_blocked: bucketHealthEntries.some((e) => !e.is_actionable && !e.is_degraded),
      top_blocking_reason: globalTopCode
    },
    recommendation: {
      status: primary_recommendation.status,
      selected_bucket: primary_recommendation.selected_bucket,
      selected_action: primary_recommendation.selected_action,
      top_reason_code: primary_recommendation.top_reason_code
    }
  };

  return {
    generated_at: new Date().toISOString(),
    audit_bundle,
    inputs_summary: {
      observation_as_of: observation.as_of,
      regime_as_of: regime.as_of,
      portfolio_as_of: portfolio.as_of,
      channel: observation.channel,
      dynamic_truth_loaded_buckets: dynamicLoadedBuckets,
      static_truth_loaded_buckets: staticLoadedBuckets,
      dynamic_truth_signature,
      static_truth_signature
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
      conservative_channel_blocked_buckets: conservativeChannelBlocked,
      stale_dynamic_truth_buckets: staleDynamicBuckets
    },
    freshness_summary: {
      observation: {
        as_of: observation.as_of,
        age_minutes: Math.round(obsAgeMin),
        threshold_minutes: OBSERVATION_STALE_MINUTES,
        status: obsStatus
      },
      regime: {
        as_of: regime.as_of,
        age_minutes: Math.round(regimeAgeMin),
        threshold_minutes: REGIME_STALE_MINUTES,
        status: regimeStatus
      },
      dynamic_truth_by_bucket: dynamicTruthFreshness,
      any_global_stale: obsStatus === 'STALE' || regimeStatus === 'STALE'
    },
    health_summary: {
      global: {
        is_actionable: globalTopCode === 'ACTIONABLE',
        any_degraded: bucketHealthEntries.some((e) => e.is_degraded),
        any_blocked: bucketHealthEntries.some((e) => !e.is_actionable && !e.is_degraded),
        top_blocking_reason: globalTopCode
      },
      by_bucket: bucketHealthEntries
    },
    primary_recommendation
  };
}
