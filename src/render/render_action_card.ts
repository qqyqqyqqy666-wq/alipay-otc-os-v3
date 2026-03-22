import type { ExecutionPlan } from '../core/types/domain';

export function renderActionCard(plan: ExecutionPlan): string {
  return [
    `Plan: ${plan.plan_id}`,
    `Bucket: ${plan.bucket_id}`,
    `Action: ${plan.action_type}`,
    `Blocked: ${plan.blocked_reason ?? 'NO'}`,
    `Message: ${plan.user_message_zh}`
  ].join('\n');
}
