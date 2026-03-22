export interface MobilePushEvent {
  source: 'IOS_SHORTCUTS' | 'ANDROID_AUTOMATION' | 'EMAIL_FORWARDER';
  receivedAt: string;
  payload: Record<string, unknown>;
}
