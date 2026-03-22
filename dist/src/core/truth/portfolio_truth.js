export function requiresReconciliation(portfolio) {
    return portfolio.reconciliation_status !== 'SYSTEM_TRUTH_OK';
}
