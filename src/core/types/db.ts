import type { D1Database, KVNamespace, Queue, R2Bucket } from '@cloudflare/workers-types';

export interface Env {
  DB: D1Database;
  RAW_CACHE: KVNamespace;
  SNAPSHOTS: R2Bucket;
  TRUTH_EVENTS_QUEUE: Queue;
  RECON_EVENTS_QUEUE: Queue;
  TOURNAMENT_QUEUE: Queue;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_ALLOWED_USER_ID: string;
  TELEGRAM_WEBHOOK_SECRET: string;
  OPS_WEBHOOK_SECRET: string;
  ALIPAY_CHANNEL: string;
  FRED_API_KEY?: string;
}
