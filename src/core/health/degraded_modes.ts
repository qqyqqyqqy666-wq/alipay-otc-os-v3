import type { DegradedMode } from '../types/domain';

export interface DegradedModePolicy {
  mode: DegradedMode;
  triggerCondition: string;
  systemBehavior: string;
  recoveryCondition: string;
}

export const DEGRADED_MODE_POLICIES: DegradedModePolicy[] = [
  {
    mode: 'READ_ONLY_MODE',
    triggerCondition: 'Core truth sources stale or unresolved.',
    systemBehavior: 'Observe and log only; no new execution plans.',
    recoveryCondition: 'Truth freshness and arbitration restored.'
  },
  {
    mode: 'NO_NEW_ACTIONS',
    triggerCondition: 'Pending trade backlog or queue backlog too large.',
    systemBehavior: 'Suppress new action candidates.',
    recoveryCondition: 'Backlog normalized.'
  },
  {
    mode: 'TRUTH_CONFLICT_BLOCK',
    triggerCondition: 'Field-level source conflict on execution-critical truth fields.',
    systemBehavior: 'Block decisions for affected instruments.',
    recoveryCondition: 'Conflict resolved by authoritative source update.'
  },
  {
    mode: 'MANUAL_RECON_REQUIRED',
    triggerCondition: 'Portfolio ledger mismatch or invalid state transition.',
    systemBehavior: 'Require user intervention before new actions.',
    recoveryCondition: 'Manual reconciliation completed.'
  },
  {
    mode: 'HOLD_ONLY_MODE',
    triggerCondition: 'Truth confidence below minimum threshold.',
    systemBehavior: 'Only HOLD plans may be emitted.',
    recoveryCondition: 'Confidence restored above threshold.'
  }
];
