import type { PlannerInput } from '../types/dto';
import type { AssetBucket, ExecutionPlan, FrictionVerdict } from '../types/domain';

function buildMessage(bucketId: AssetBucket, netEdgeAfterFriction: number, blockedReason: string | null): string {
  if (blockedReason) return `类别 ${bucketId} 当前阻断：${blockedReason}`;
  return `类别 ${bucketId} 当前净优势 ${netEdgeAfterFriction.toFixed(4)}，可进入人工执行队列。`;
}

export function buildExecutionPlan(input: PlannerInput, verdict: FrictionVerdict): ExecutionPlan {
  return {
    plan_id: crypto.randomUUID(),
    bucket_id: input.bucketId,
    action_type: verdict.forced_action ?? (input.netEdgeAfterFriction > 0 ? 'BUY' : 'HOLD'),
    instrument_from: input.instrumentFrom,
    instrument_to: input.instrumentTo,
    step_mode: input.instrumentFrom && input.instrumentTo ? 'two_step' : 'single',
    earliest_submit_at: new Date().toISOString(),
    expected_confirm_at: null,
    expected_cash_arrival_at: null,
    idempotency_key: crypto.randomUUID(),
    blocked_reason: input.blockedReason ?? (verdict.forced_action ? verdict.verdict_reason : null),
    user_message_zh: buildMessage(input.bucketId, input.netEdgeAfterFriction, input.blockedReason),
    plan_status: 'PROPOSED'
  };
}
