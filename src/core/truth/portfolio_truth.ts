import type { EffectivePortfolioState } from '../types/domain';

export function requiresReconciliation(portfolio: EffectivePortfolioState): boolean {
  return portfolio.reconciliation_status !== 'SYSTEM_TRUTH_OK';
}
