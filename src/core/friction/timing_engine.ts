export function estimateDelayCostPct(capitalLockDays: number, annualizedOpportunityCost = 0.12): number {
  return (annualizedOpportunityCost / 365) * capitalLockDays;
}
