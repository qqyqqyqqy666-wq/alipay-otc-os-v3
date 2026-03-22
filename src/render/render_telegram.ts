import type { ExecutionPlan } from '../core/types/domain';
import { renderActionCard } from './render_action_card';

export function renderTelegramPlans(plans: ExecutionPlan[]): string {
  return plans.map(renderActionCard).join('\n\n');
}
