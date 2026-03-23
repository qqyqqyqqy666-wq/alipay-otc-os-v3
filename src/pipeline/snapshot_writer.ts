import type { D1Database } from '@cloudflare/workers-types';
import type { PreviewResponse } from './decision_pipeline';
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

export interface PreviewSnapshotWriteResult {
  snapshot_id: string;
  /** true = row inserted; false = duplicate (same observation/regime/portfolio/channel, row ignored) */
  written: boolean;
}

/**
 * Persists the fully-built PreviewResponse into decision_preview_snapshots.
 *
 * Idempotency: INSERT OR IGNORE on UNIQUE(observation_as_of, regime_as_of, portfolio_as_of, channel).
 * A duplicate preview run with the same input timestamps is silently ignored;
 * written=false is returned so callers can distinguish new from duplicate writes.
 *
 * Throws with code PREVIEW_SNAPSHOT_WRITE_FAILED on D1 error.
 */
export async function writePreviewSnapshot(
  db: D1Database,
  preview: PreviewResponse
): Promise<PreviewSnapshotWriteResult> {
  const snapshot_id = crypto.randomUUID();
  const rec = preview.primary_recommendation;

  let result: { meta: { changes: number } };
  try {
    result = await db
      .prepare(
        `INSERT OR IGNORE INTO decision_preview_snapshots
          (snapshot_id, generated_at, channel, observation_as_of, regime_as_of, portfolio_as_of,
           dynamic_truth_signature, primary_status, top_reason_code, selected_bucket, selected_action,
           net_edge_after_friction, preview_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        snapshot_id,
        preview.generated_at,
        preview.inputs_summary.channel,
        preview.inputs_summary.observation_as_of,
        preview.inputs_summary.regime_as_of,
        preview.inputs_summary.portfolio_as_of,
        preview.inputs_summary.dynamic_truth_signature,
        rec.status,
        rec.top_reason_code,
        rec.selected_bucket ?? null,
        rec.selected_action ?? null,
        rec.net_edge_after_friction ?? null,
        JSON.stringify(preview)
      )
      .run();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw Object.assign(new Error(`PREVIEW_SNAPSHOT_WRITE_FAILED: ${msg}`), {
      code: 'PREVIEW_SNAPSHOT_WRITE_FAILED'
    });
  }

  return { snapshot_id, written: result.meta.changes > 0 };
}
