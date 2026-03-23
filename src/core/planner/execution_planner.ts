import type { PlannerInput } from '../types/dto';
import type { ActionType, Direction, ExecutionPlan, FrictionVerdict } from '../types/domain';

function directionToActionType(direction: Direction): ActionType {
  if (direction === 'ADD') return 'BUY';
  if (direction === 'REDUCE') return 'REDEEM';
  return 'HOLD';
}

function buildMessage(input: PlannerInput, verdictReason: string): string {
  if (input.blockedReason) {
    return `${input.bucketId} ${input.signalDirection} 阻断 ${input.blockedReason} [${input.thesisCode}]`;
  }
  return `${input.bucketId} ${input.signalDirection} 净优势 ${input.netEdgeAfterFriction.toFixed(4)} [${input.thesisCode}] ${verdictReason}`;
}

export function buildExecutionPlan(input: PlannerInput, verdict: FrictionVerdict): ExecutionPlan {
  return {
    plan_id: crypto.randomUUID(),
    bucket_id: input.bucketId,
    action_type: verdict.forced_action ?? directionToActionType(input.signalDirection),
    instrument_from: input.instrumentFrom,
    instrument_to: input.instrumentTo,
    step_mode: input.instrumentFrom && input.instrumentTo ? 'two_step' : 'single',
    earliest_submit_at: new Date().toISOString(),
    expected_confirm_at: null,
    expected_cash_arrival_at: null,
    idempotency_key: crypto.randomUUID(),
    blocked_reason: input.blockedReason,
    user_message_zh: buildMessage(input, verdict.verdict_reason),
    plan_status: 'PROPOSED'
  };
}
