export function determineReconciliationStatus(portfolio) {
    if (portfolio.pending_trades.some((x) => x.trade_state === 'MANUAL_RECON_REQUIRED')) {
        return 'MANUAL_RECON_REQUIRED';
    }
    return portfolio.reconciliation_status;
}
