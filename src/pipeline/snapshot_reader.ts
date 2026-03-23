import type { D1Database } from '@cloudflare/workers-types';
import type { PreviewResponse } from './decision_pipeline';

// Raw row shape returned by D1 for decision_preview_snapshots
interface PreviewSnapshotRow {
  snapshot_id: string;
  generated_at: string;
  channel: string;
  observation_as_of: string;
  regime_as_of: string;
  portfolio_as_of: string;
  dynamic_truth_signature: string;
  primary_status: string;
  top_reason_code: string;
  selected_bucket: string | null;
  selected_action: string | null;
  net_edge_after_friction: number | null;
  preview_json: string;
  created_at: string;
}

// Public result: scalar columns + parsed preview_json as typed PreviewResponse
export interface PreviewSnapshotRecord {
  snapshot_id: string;
  generated_at: string;
  channel: string;
  observation_as_of: string;
  regime_as_of: string;
  portfolio_as_of: string;
  dynamic_truth_signature: string;
  primary_status: string;
  top_reason_code: string;
  selected_bucket: string | null;
  selected_action: string | null;
  net_edge_after_friction: number | null;
  created_at: string;
  // Parsed from preview_json. Replay of stored output, not a live recomputation.
  preview: PreviewResponse;
}

export interface ByInputParams {
  observation_as_of: string;
  regime_as_of: string;
  portfolio_as_of: string;
  channel: string;
  dynamic_truth_signature: string;
}

function parseRow(row: PreviewSnapshotRow): PreviewSnapshotRecord {
  let preview: PreviewResponse;
  try {
    preview = JSON.parse(row.preview_json) as PreviewResponse;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw Object.assign(
      new Error(`PREVIEW_JSON_MALFORMED: snapshot_id=${row.snapshot_id} – ${msg}`),
      { code: 'PREVIEW_JSON_MALFORMED', snapshot_id: row.snapshot_id }
    );
  }
  const { preview_json: _dropped, ...scalars } = row;
  return { ...scalars, preview };
}

/**
 * Returns the most recently created preview snapshot, optionally filtered by channel.
 * Returns null if no matching row exists.
 * Throws PREVIEW_JSON_MALFORMED if the stored preview_json cannot be parsed.
 */
export async function readLatestPreviewSnapshot(
  db: D1Database,
  channel?: string
): Promise<PreviewSnapshotRecord | null> {
  const row = channel != null
    ? await db
        .prepare(
          'SELECT * FROM decision_preview_snapshots WHERE channel = ? ORDER BY created_at DESC LIMIT 1'
        )
        .bind(channel)
        .first<PreviewSnapshotRow>()
    : await db
        .prepare(
          'SELECT * FROM decision_preview_snapshots ORDER BY created_at DESC LIMIT 1'
        )
        .first<PreviewSnapshotRow>();

  if (row == null) return null;
  return parseRow(row);
}

/**
 * Returns the snapshot matching the exact persisted unique input key, or null if not found.
 * Throws PREVIEW_JSON_MALFORMED if the stored preview_json cannot be parsed.
 */
export async function readPreviewSnapshotByInput(
  db: D1Database,
  params: ByInputParams
): Promise<PreviewSnapshotRecord | null> {
  const row = await db
    .prepare(
      `SELECT * FROM decision_preview_snapshots
       WHERE observation_as_of = ? AND regime_as_of = ? AND portfolio_as_of = ?
         AND channel = ? AND dynamic_truth_signature = ?
       LIMIT 1`
    )
    .bind(
      params.observation_as_of,
      params.regime_as_of,
      params.portfolio_as_of,
      params.channel,
      params.dynamic_truth_signature
    )
    .first<PreviewSnapshotRow>();

  if (row == null) return null;
  return parseRow(row);
}
