import { determineReconciliationStatus } from '../core/recon/reconciliation';
export function runReconciliationPipeline(portfolio) {
    return determineReconciliationStatus(portfolio);
}
