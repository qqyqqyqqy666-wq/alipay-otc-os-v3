import type { D1Database } from '@cloudflare/workers-types';
import {
  strictParseObservationFrame,
  strictParseRegimePosterior
} from './observation_regime_loader';

export interface SnapshotWriteResult {
  snapshot_id: string;
  as_of: string;
  /** true = row inserted; false = duplicate (as_of/channel already exists, row ignored) */
  written: boolean;
}

/**
 * Validates rawPayload strictly as an ObservationFrame-compatible shape and
 * persists it into market_observation_snapshots.
 *
 * Idempotency: INSERT OR IGNORE on the UNIQUE(as_of, channel) constraint.
 * A duplicate write (same as_of + channel) is silently ignored; written=false
 * is returned so callers can distinguish new from duplicate writes.
 *
 * Throws MALFORMED_OBSERVATION / MISSING_OBSERVATION codes on validation failure.
 */
export async function writeObservationSnapshot(
  db: D1Database,
  rawPayload: unknown
): Promise<SnapshotWriteResult> {
  const frame = strictParseObservationFrame(rawPayload);
  const snapshot_id = crypto.randomUUID();
  const created_at = new Date().toISOString();

  const result = await db
    .prepare(
      'INSERT OR IGNORE INTO market_observation_snapshots (snapshot_id, as_of, channel, observation_json, created_at) VALUES (?, ?, ?, ?, ?)'
    )
    .bind(snapshot_id, frame.as_of, frame.channel, JSON.stringify(frame), created_at)
    .run();

  return { snapshot_id, as_of: frame.as_of, written: result.meta.changes > 0 };
}

/**
 * Validates rawPayload strictly as a RegimePosterior-compatible shape and
 * persists it into regime_snapshots.
 *
 * Idempotency: INSERT OR IGNORE on the UNIQUE(as_of) constraint.
 * A duplicate write (same as_of) is silently ignored; written=false is returned.
 *
 * Throws MALFORMED_REGIME / MISSING_REGIME codes on validation failure.
 */
export async function writeRegimeSnapshot(
  db: D1Database,
  rawPayload: unknown
): Promise<SnapshotWriteResult> {
  const posterior = strictParseRegimePosterior(rawPayload);
  const snapshot_id = crypto.randomUUID();
  const created_at = new Date().toISOString();

  const result = await db
    .prepare(
      'INSERT OR IGNORE INTO regime_snapshots (snapshot_id, as_of, regime_json, created_at) VALUES (?, ?, ?, ?)'
    )
    .bind(snapshot_id, posterior.as_of, JSON.stringify(posterior), created_at)
    .run();

  return { snapshot_id, as_of: posterior.as_of, written: result.meta.changes > 0 };
}
