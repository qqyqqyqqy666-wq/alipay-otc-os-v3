export function estimateDelayCostPct(capitalLockDays, annualizedOpportunityCost = 0.12) {
    return (annualizedOpportunityCost / 365) * capitalLockDays;
}
