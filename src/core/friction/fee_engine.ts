import type { PortfolioLotAge } from '../types/domain';

export interface FeeScheduleTier {
  min_days: number;
  max_days: number | null;
  rate: number;
}

export type FeeEvaluationStatus =
  | 'KNOWN'
  | 'UNKNOWN_NO_SCHEDULE'
  | 'UNKNOWN_MALFORMED_SCHEDULE'
  | 'UNKNOWN_NO_MATCHING_TIER';

export interface FeeEvaluation {
  penaltyPct: number;
  status: FeeEvaluationStatus;
}

export function estimateRedemptionFeePct(lotAges: PortfolioLotAge[], sharesToRedeem: number): number {
  let remaining = sharesToRedeem;
  let feeAmount = 0;
  let totalShares = 0;
  for (const lot of lotAges) {
    if (remaining <= 0) break;
    const used = Math.min(lot.shares, remaining);
    feeAmount += used * lot.redemption_fee_rate;
    totalShares += used;
    remaining -= used;
  }
  return totalShares > 0 ? feeAmount / totalShares : 0;
}

/**
 * Parse canonical fee schedule JSON and compute the applicable redemption
 * penalty for a given holding period.
 *
 * Expected format: array of { min_days: number, max_days: number|null, rate: number }
 * Example:
 *   [{ "min_days": 0, "max_days": 7, "rate": 0.015 },
 *    { "min_days": 7, "max_days": 365, "rate": 0.005 },
 *    { "min_days": 365, "max_days": null, "rate": 0 }]
 */
export function evaluateRedemptionPenalty(feeScheduleJson: string, holdingDays: number): FeeEvaluation {
  if (!feeScheduleJson || feeScheduleJson === '{}' || feeScheduleJson === '[]') {
    return { penaltyPct: 0, status: 'UNKNOWN_NO_SCHEDULE' };
  }

  let tiers: unknown;
  try {
    tiers = JSON.parse(feeScheduleJson);
  } catch {
    return { penaltyPct: 0, status: 'UNKNOWN_MALFORMED_SCHEDULE' };
  }

  if (!Array.isArray(tiers) || tiers.length === 0) {
    return { penaltyPct: 0, status: 'UNKNOWN_MALFORMED_SCHEDULE' };
  }

  const parsed: FeeScheduleTier[] = [];
  for (const tier of tiers) {
    if (tier === null || typeof tier !== 'object') {
      return { penaltyPct: 0, status: 'UNKNOWN_MALFORMED_SCHEDULE' };
    }
    const t = tier as Record<string, unknown>;
    if (typeof t['min_days'] !== 'number' || typeof t['rate'] !== 'number') {
      return { penaltyPct: 0, status: 'UNKNOWN_MALFORMED_SCHEDULE' };
    }
    if (t['max_days'] !== null && typeof t['max_days'] !== 'number') {
      return { penaltyPct: 0, status: 'UNKNOWN_MALFORMED_SCHEDULE' };
    }
    parsed.push({
      min_days: t['min_days'] as number,
      max_days: t['max_days'] as number | null,
      rate: t['rate'] as number
    });
  }

  for (const tier of parsed) {
    const aboveMin = holdingDays >= tier.min_days;
    const belowMax = tier.max_days === null || holdingDays < tier.max_days;
    if (aboveMin && belowMax) {
      return { penaltyPct: tier.rate, status: 'KNOWN' };
    }
  }

  return { penaltyPct: 0, status: 'UNKNOWN_NO_MATCHING_TIER' };
}
