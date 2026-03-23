import type {
  EffectivePortfolioState,
  FrictionVerdict,
  InstrumentDynamicTruth,
  InstrumentStaticTruth,
  SignalCandidate
} from '../types/domain';
import { estimateRedemptionFeePct, evaluateRedemptionPenalty } from './fee_engine';
import { estimateDelayCostPct } from './timing_engine';
import { isChannelBlocked } from './channel_rules';

function deriveVerdictReasonCode(
  channelBlocked: boolean,
  statusBlocked: boolean,
  minHoldBlocked: boolean,
  netEdge: number
): string {
  if (channelBlocked) return 'BLOCKED_CHANNEL';
  if (statusBlocked) return 'BLOCKED_STATUS_CONFLICT';
  if (minHoldBlocked) return 'BLOCKED_MIN_HOLD';
  if (netEdge <= 0) return 'BLOCKED_NEGATIVE_EDGE';
  return 'EXECUTABLE';
}

export function evaluateFriction(
  signal: SignalCandidate,
  portfolio: EffectivePortfolioState,
  dynamicTruth: InstrumentDynamicTruth | null,
  staticTruth: InstrumentStaticTruth | null
): FrictionVerdict {
  const position = portfolio.positions[0] ?? null;

  // --- Fee evaluation ---
  // If static truth provides a canonical fee schedule, use it against the
  // youngest lot age. Otherwise fall back to the existing lot-level rates.
  let feeCostPct: number;
  if (staticTruth && position && position.lot_ages.length > 0) {
    const youngestDays = Math.min(...position.lot_ages.map((l) => l.age_bucket_days_min));
    const feeEval = evaluateRedemptionPenalty(staticTruth.default_fee_schedule_json, youngestDays);
    feeCostPct = feeEval.status === 'KNOWN'
      ? feeEval.penaltyPct
      : estimateRedemptionFeePct(position.lot_ages, position.shares * 0.1);
  } else {
    feeCostPct = position ? estimateRedemptionFeePct(position.lot_ages, position.shares * 0.1) : 0;
  }

  // --- Min-hold evaluation ---
  // Use canonical default_min_hold_days against youngest lot age rather than
  // the placeholder "feeCostPct >= 0.015" proxy.
  let minHoldBlocked: boolean;
  if (staticTruth && position && position.lot_ages.length > 0) {
    const youngestDays = Math.min(...position.lot_ages.map((l) => l.age_bucket_days_min));
    minHoldBlocked = youngestDays < staticTruth.default_min_hold_days;
  } else if (staticTruth && !position) {
    // No position to redeem → min-hold is not applicable
    minHoldBlocked = false;
  } else {
    // No static truth → conservative: assume blocked if fee rate is high
    minHoldBlocked = feeCostPct >= 0.015;
  }

  // --- Cash-arrival / capital lock evaluation ---
  // Use canonical default_cash_arrival_days instead of hardcoded 2.
  const capitalLockDays = staticTruth
    ? staticTruth.default_cash_arrival_days
    : (dynamicTruth?.redemption_open === false ? 0 : 2);
  const delayCostPct = estimateDelayCostPct(capitalLockDays);

  const truthCostPct = dynamicTruth ? Math.max(0, 0.3 - dynamicTruth.truth_confidence) : 0.3;
  const channelBlocked = dynamicTruth ? isChannelBlocked(dynamicTruth) : true;
  const statusBlocked = dynamicTruth?.arbitration_status === 'CONFLICT';
  const replacementAvailable = !channelBlocked;
  const grossEdge = signal.strength * signal.confidence * 0.03;
  const netEdgeAfterFriction = grossEdge - feeCostPct - delayCostPct - truthCostPct;
  const forcedAction = channelBlocked || statusBlocked || minHoldBlocked || netEdgeAfterFriction <= 0
    ? 'HOLD'
    : null;

  return {
    can_execute: forcedAction === null,
    forced_action: forcedAction,
    fee_cost_pct: feeCostPct,
    delay_cost_pct: delayCostPct,
    truth_cost_pct: truthCostPct,
    capital_lock_days: capitalLockDays,
    replacement_available: replacementAvailable,
    channel_blocked: channelBlocked,
    min_hold_blocked: minHoldBlocked,
    status_blocked: Boolean(statusBlocked),
    net_edge_after_friction: netEdgeAfterFriction,
    verdict_reason: deriveVerdictReasonCode(channelBlocked, Boolean(statusBlocked), minHoldBlocked, netEdgeAfterFriction)
  };
}
