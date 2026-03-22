import type { PortfolioLotAge } from '../types/domain';

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
