import { renderActionCard } from './render_action_card';
export function renderTelegramPlans(plans) {
    return plans.map(renderActionCard).join('\n\n');
}
