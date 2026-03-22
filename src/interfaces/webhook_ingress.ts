export interface ManualExecutionWebhookPayload {
  planId: string;
  action: 'BUY' | 'REDEEM' | 'SWITCH';
  confirmedAt: string;
  channelOrderRef: string;
}
