import type { D1Database } from '@cloudflare/workers-types';
import type { ObservationFrame, RegimePosterior } from '../core/types/domain';

interface ObsRow {
  observation_json: string;
}

interface RegimeRow {
  regime_json: string;
}

export async function loadLatestObservationFrame(db: D1Database): Promise<ObservationFrame> {
  const row = await db
    .prepare('SELECT observation_json FROM market_observation_snapshots ORDER BY as_of DESC LIMIT 1')
    .first<ObsRow>();

  if (row === null || row === undefined) {
    throw new Error('MISSING_OBSERVATION: no rows in market_observation_snapshots');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(row.observation_json);
  } catch {
    throw new Error('MALFORMED_OBSERVATION: observation_json is not valid JSON');
  }

  return strictParseObservationFrame(parsed);
}

export async function loadLatestRegimePosterior(db: D1Database): Promise<RegimePosterior> {
  const row = await db
    .prepare('SELECT regime_json FROM regime_snapshots ORDER BY as_of DESC LIMIT 1')
    .first<RegimeRow>();

  if (row === null || row === undefined) {
    throw new Error('MISSING_REGIME: no rows in regime_snapshots');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(row.regime_json);
  } catch {
    throw new Error('MALFORMED_REGIME: regime_json is not valid JSON');
  }

  return strictParseRegimePosterior(parsed);
}

export function strictParseObservationFrame(raw: unknown): ObservationFrame {
  if (raw === null || typeof raw !== 'object') {
    throw new Error('MALFORMED_OBSERVATION: root must be an object');
  }
  const r = raw as Record<string, unknown>;

  if (typeof r['as_of'] !== 'string' || r['as_of'] === '') {
    throw new Error('MALFORMED_OBSERVATION: missing or invalid field as_of');
  }
  if (r['source_values'] === null || typeof r['source_values'] !== 'object' || Array.isArray(r['source_values'])) {
    throw new Error('MALFORMED_OBSERVATION: missing or invalid field source_values');
  }
  if (r['source_confidence'] === null || typeof r['source_confidence'] !== 'object' || Array.isArray(r['source_confidence'])) {
    throw new Error('MALFORMED_OBSERVATION: missing or invalid field source_confidence');
  }
  if (r['source_freshness_minutes'] === null || typeof r['source_freshness_minutes'] !== 'object' || Array.isArray(r['source_freshness_minutes'])) {
    throw new Error('MALFORMED_OBSERVATION: missing or invalid field source_freshness_minutes');
  }
  if (r['channel'] !== 'ALIPAY' && r['channel'] !== 'TIANTIAN' && r['channel'] !== 'UNKNOWN') {
    throw new Error(`MALFORMED_OBSERVATION: channel must be ALIPAY|TIANTIAN|UNKNOWN, got ${String(r['channel'])}`);
  }

  const source_confidence: Record<string, number> = {};
  for (const [k, v] of Object.entries(r['source_confidence'] as Record<string, unknown>)) {
    if (typeof v !== 'number') {
      throw new Error(`MALFORMED_OBSERVATION: source_confidence["${k}"] must be a number`);
    }
    source_confidence[k] = v;
  }

  const source_freshness_minutes: Record<string, number> = {};
  for (const [k, v] of Object.entries(r['source_freshness_minutes'] as Record<string, unknown>)) {
    if (typeof v !== 'number') {
      throw new Error(`MALFORMED_OBSERVATION: source_freshness_minutes["${k}"] must be a number`);
    }
    source_freshness_minutes[k] = v;
  }

  return {
    as_of: r['as_of'] as string,
    source_values: r['source_values'] as Record<string, unknown>,
    source_confidence,
    source_freshness_minutes,
    channel: r['channel'] as ObservationFrame['channel']
  };
}

export function strictParseRegimePosterior(raw: unknown): RegimePosterior {
  if (raw === null || typeof raw !== 'object') {
    throw new Error('MALFORMED_REGIME: root must be an object');
  }
  const r = raw as Record<string, unknown>;

  if (typeof r['as_of'] !== 'string' || r['as_of'] === '') {
    throw new Error('MALFORMED_REGIME: missing or invalid field as_of');
  }
  if (r['liquidity_state'] === null || typeof r['liquidity_state'] !== 'object' || Array.isArray(r['liquidity_state'])) {
    throw new Error('MALFORMED_REGIME: missing or invalid field liquidity_state');
  }
  if (r['risk_appetite_state'] === null || typeof r['risk_appetite_state'] !== 'object' || Array.isArray(r['risk_appetite_state'])) {
    throw new Error('MALFORMED_REGIME: missing or invalid field risk_appetite_state');
  }
  if (r['policy_state'] === null || typeof r['policy_state'] !== 'object' || Array.isArray(r['policy_state'])) {
    throw new Error('MALFORMED_REGIME: missing or invalid field policy_state');
  }
  if (typeof r['tail_prob'] !== 'number') {
    throw new Error('MALFORMED_REGIME: missing or invalid field tail_prob');
  }
  if (!Array.isArray(r['transition_matrix_1d'])) {
    throw new Error('MALFORMED_REGIME: transition_matrix_1d must be an array');
  }
  if (typeof r['half_life_days'] !== 'number') {
    throw new Error('MALFORMED_REGIME: missing or invalid field half_life_days');
  }

  const liquidity_state: Record<string, number> = {};
  for (const [k, v] of Object.entries(r['liquidity_state'] as Record<string, unknown>)) {
    if (typeof v !== 'number') {
      throw new Error(`MALFORMED_REGIME: liquidity_state["${k}"] must be a number`);
    }
    liquidity_state[k] = v;
  }

  const risk_appetite_state: Record<string, number> = {};
  for (const [k, v] of Object.entries(r['risk_appetite_state'] as Record<string, unknown>)) {
    if (typeof v !== 'number') {
      throw new Error(`MALFORMED_REGIME: risk_appetite_state["${k}"] must be a number`);
    }
    risk_appetite_state[k] = v;
  }

  const policy_state: Record<string, number> = {};
  for (const [k, v] of Object.entries(r['policy_state'] as Record<string, unknown>)) {
    if (typeof v !== 'number') {
      throw new Error(`MALFORMED_REGIME: policy_state["${k}"] must be a number`);
    }
    policy_state[k] = v;
  }

  const transition_matrix_1d = r['transition_matrix_1d'] as unknown[];
  for (let i = 0; i < transition_matrix_1d.length; i++) {
    if (!Array.isArray(transition_matrix_1d[i])) {
      throw new Error(`MALFORMED_REGIME: transition_matrix_1d[${i}] must be an array`);
    }
    for (let j = 0; j < (transition_matrix_1d[i] as unknown[]).length; j++) {
      if (typeof (transition_matrix_1d[i] as unknown[])[j] !== 'number') {
        throw new Error(`MALFORMED_REGIME: transition_matrix_1d[${i}][${j}] must be a number`);
      }
    }
  }

  return {
    as_of: r['as_of'] as string,
    liquidity_state,
    risk_appetite_state,
    policy_state,
    tail_prob: r['tail_prob'] as number,
    transition_matrix_1d: transition_matrix_1d as number[][],
    half_life_days: r['half_life_days'] as number
  };
}
