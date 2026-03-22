import type {
  EffectivePortfolioState,
  FrictionVerdict,
  InstrumentDynamicTruth,
  SignalCandidate
} from '../types/domain';
import { estimateRedemptionFeePct } from './fee_engine';
import { estimateDelayCostPct } from './timing_engine';
import { isChannelBlocked } from './channel_rules';

export function evaluateFriction(
  signal: SignalCandidate,
  portfolio: EffectivePortfolioState,
  dynamicTruth: InstrumentDynamicTruth | null
): FrictionVerdict {
  const position = portfolio.positions[0] ?? null;
  const feeCostPct = position ? estimateRedemptionFeePct(position.lot_ages, position.shares * 0.1) : 0;
  const capitalLockDays = dynamicTruth?.redemption_open === false ? 0 : 2;
  const delayCostPct = estimateDelayCostPct(capitalLockDays);
  const truthCostPct = dynamicTruth ? Math.max(0, 0.3 - dynamicTruth.truth_confidence) : 0.3;
  const channelBlocked = dynamicTruth ? isChannelBlocked(dynamicTruth) : true;
  const minHoldBlocked = feeCostPct >= 0.015;
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
    verdict_reason: forcedAction === null ? 'Executable under current placeholder friction policy.' : 'Blocked by placeholder friction constraints.'
  };
}
