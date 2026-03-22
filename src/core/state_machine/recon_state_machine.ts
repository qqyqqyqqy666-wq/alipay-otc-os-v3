import type { ReconciliationStatus } from '../types/domain';

const TRANSITIONS: Record<ReconciliationStatus, ReconciliationStatus[]> = {
  SYSTEM_TRUTH_OK: ['POSITION_MISMATCH', 'PENDING_USER_CONFIRM', 'CHANNEL_CONFIRM_PENDING', 'MANUAL_RECON_REQUIRED'],
  POSITION_MISMATCH: ['MANUAL_RECON_REQUIRED', 'SYSTEM_TRUTH_OK'],
  PENDING_USER_CONFIRM: ['SYSTEM_TRUTH_OK', 'MANUAL_RECON_REQUIRED'],
  CHANNEL_CONFIRM_PENDING: ['SYSTEM_TRUTH_OK', 'MANUAL_RECON_REQUIRED'],
  MANUAL_RECON_REQUIRED: ['SYSTEM_TRUTH_OK']
};

export function canTransitionReconciliation(from: ReconciliationStatus, to: ReconciliationStatus): boolean {
  return TRANSITIONS[from].includes(to);
}
