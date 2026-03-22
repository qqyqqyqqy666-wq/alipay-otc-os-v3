import type { EffectivePortfolioState } from '../core/types/domain';
import { determineReconciliationStatus } from '../core/recon/reconciliation';

export function runReconciliationPipeline(portfolio: EffectivePortfolioState) {
  return determineReconciliationStatus(portfolio);
}
