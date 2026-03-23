import type { Env } from './core/types/db';
import type {
  AssetBucket,
  EffectivePortfolioState,
  InstrumentStaticTruth,
  PortfolioPositionTruth,
  PendingTradeState
} from './core/types/domain';
import { renderHelpText } from './interfaces/telegram_commands';
import { buildPreviewResponse, runDecisionPipeline } from './pipeline/decision_pipeline';
import { loadDynamicTruthByBucket, loadLatestObservationFrame, loadLatestRegimePosterior } from './pipeline/observation_regime_loader';
import { writeObservationSnapshot, writeRegimeSnapshot } from './pipeline/snapshot_writer';

async function handleRoot(): Promise<Response> {
  return new Response(JSON.stringify({ status: 'ok', system: 'alipay-otc-os-v3' }), {
    headers: { 'content-type': 'application/json' }
  });
}

async function handleHealth(env: Env): Promise<Response> {
  const result = await env.DB.prepare('SELECT 1 as ok').first<{ ok: number }>();
  return new Response(JSON.stringify({ db: result?.ok === 1 ? 'ok' : 'unknown', worker: 'ok' }), {
    headers: { 'content-type': 'application/json' }
  });
}

async function handleTelegramWebhook(request: Request, env: Env): Promise<Response> {
  const secret = request.headers.get('x-telegram-webhook-secret-token');
  if (secret !== env.TELEGRAM_WEBHOOK_SECRET) {
    return new Response('forbidden', { status: 403 });
  }
  return new Response(renderHelpText());
}

async function loadPortfolioState(env: Env): Promise<EffectivePortfolioState> {
  const cashRow = await env.DB
    .prepare('SELECT available_cash, pending_cash, reconciliation_status, as_of FROM portfolio_cash_ledger ORDER BY as_of DESC LIMIT 1')
    .first<{ available_cash: number; pending_cash: number; reconciliation_status: string; as_of: string }>();

  if (cashRow === null || cashRow === undefined) {
    throw new Error('MISSING_PORTFOLIO_CASH: no rows in portfolio_cash_ledger');
  }

  const posRows = await env.DB
    .prepare('SELECT position_id, instrument_id, shares, cost_basis, buy_date, lot_ages_json, last_confirmed_trade_type, last_confirmed_trade_at FROM portfolio_positions_truth')
    .all<{
      position_id: string;
      instrument_id: string;
      shares: number;
      cost_basis: number;
      buy_date: string | null;
      lot_ages_json: string;
      last_confirmed_trade_type: string | null;
      last_confirmed_trade_at: string | null;
    }>();

  const positions: PortfolioPositionTruth[] = (posRows.results ?? []).map((p) => ({
    position_id: p.position_id,
    instrument_id: p.instrument_id,
    shares: p.shares,
    cost_basis: p.cost_basis,
    buy_date: p.buy_date,
    lot_ages: JSON.parse(p.lot_ages_json) as PortfolioPositionTruth['lot_ages'],
    last_confirmed_trade_type: p.last_confirmed_trade_type as PortfolioPositionTruth['last_confirmed_trade_type'],
    last_confirmed_trade_at: p.last_confirmed_trade_at
  }));

  const pendingRows = await env.DB
    .prepare("SELECT pending_trade_id, instrument_from, instrument_to, trade_state, submitted_at, expected_confirm_at, expected_cash_arrival_at, idempotency_key, manual_confirmation_required FROM portfolio_pending_trades WHERE trade_state NOT IN ('DONE', 'FAILED')")
    .all<{
      pending_trade_id: string;
      instrument_from: string | null;
      instrument_to: string | null;
      trade_state: string;
      submitted_at: string | null;
      expected_confirm_at: string | null;
      expected_cash_arrival_at: string | null;
      idempotency_key: string;
      manual_confirmation_required: number;
    }>();

  const pending_trades: PendingTradeState[] = (pendingRows.results ?? []).map((t) => ({
    pending_trade_id: t.pending_trade_id,
    instrument_from: t.instrument_from,
    instrument_to: t.instrument_to,
    trade_state: t.trade_state as PendingTradeState['trade_state'],
    submitted_at: t.submitted_at,
    expected_confirm_at: t.expected_confirm_at,
    expected_cash_arrival_at: t.expected_cash_arrival_at,
    idempotency_key: t.idempotency_key,
    manual_confirmation_required: Boolean(t.manual_confirmation_required)
  }));

  return {
    as_of: cashRow.as_of,
    positions,
    pending_trades,
    available_cash: cashRow.available_cash,
    pending_cash: cashRow.pending_cash,
    reconciliation_status: cashRow.reconciliation_status as EffectivePortfolioState['reconciliation_status']
  };
}

function requireOpsSecret(request: Request, env: Env): boolean {
  return request.headers.get('x-ops-secret') === env.OPS_WEBHOOK_SECRET;
}

async function handleWriteObservationSnapshot(request: Request, env: Env): Promise<Response> {
  if (!requireOpsSecret(request, env)) {
    return new Response('forbidden', { status: 403 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'INVALID_JSON: request body is not valid JSON' }), {
      status: 400,
      headers: { 'content-type': 'application/json' }
    });
  }
  let obsResult;
  try {
    obsResult = await writeObservationSnapshot(env.DB, body);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'content-type': 'application/json' }
    });
  }
  return new Response(JSON.stringify(obsResult), {
    status: obsResult.written ? 201 : 200,
    headers: { 'content-type': 'application/json' }
  });
}

async function handleWriteRegimeSnapshot(request: Request, env: Env): Promise<Response> {
  if (!requireOpsSecret(request, env)) {
    return new Response('forbidden', { status: 403 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'INVALID_JSON: request body is not valid JSON' }), {
      status: 400,
      headers: { 'content-type': 'application/json' }
    });
  }
  let regimeResult;
  try {
    regimeResult = await writeRegimeSnapshot(env.DB, body);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'content-type': 'application/json' }
    });
  }
  return new Response(JSON.stringify(regimeResult), {
    status: regimeResult.written ? 201 : 200,
    headers: { 'content-type': 'application/json' }
  });
}

async function loadStaticTruthByBucket(env: Env): Promise<Partial<Record<'GOLD' | 'CN_CORE' | 'QDII', InstrumentStaticTruth>>> {
  const rows = await env.DB
    .prepare("SELECT instrument_id, fund_code, fund_name, asset_bucket, asset_subtype, fund_company, risk_level, currency, is_qdii, default_buy_confirm_days, default_redeem_confirm_days, default_cash_arrival_days, default_min_hold_days, default_fee_schedule_json, is_active FROM instrument_static_truth WHERE asset_bucket IN ('GOLD', 'CN_CORE', 'QDII') AND is_active = 1")
    .all<{
      instrument_id: string;
      fund_code: string;
      fund_name: string;
      asset_bucket: string;
      asset_subtype: string;
      fund_company: string;
      risk_level: string;
      currency: string;
      is_qdii: number;
      default_buy_confirm_days: number;
      default_redeem_confirm_days: number;
      default_cash_arrival_days: number;
      default_min_hold_days: number;
      default_fee_schedule_json: string;
      is_active: number;
    }>();

  const result: Partial<Record<'GOLD' | 'CN_CORE' | 'QDII', InstrumentStaticTruth>> = {};
  for (const r of rows.results ?? []) {
    const bucket = r.asset_bucket as AssetBucket;
    if (bucket === 'GOLD' || bucket === 'CN_CORE' || bucket === 'QDII') {
      result[bucket] = {
        instrument_id: r.instrument_id,
        fund_code: r.fund_code,
        fund_name: r.fund_name,
        asset_bucket: bucket,
        asset_subtype: r.asset_subtype as InstrumentStaticTruth['asset_subtype'],
        fund_company: r.fund_company,
        risk_level: r.risk_level,
        currency: r.currency,
        is_qdii: Boolean(r.is_qdii),
        default_buy_confirm_days: r.default_buy_confirm_days,
        default_redeem_confirm_days: r.default_redeem_confirm_days,
        default_cash_arrival_days: r.default_cash_arrival_days,
        default_min_hold_days: r.default_min_hold_days,
        default_fee_schedule_json: r.default_fee_schedule_json,
        is_active: Boolean(r.is_active)
      };
    }
  }
  return result;
}

async function handleDecisionPreview(env: Env): Promise<Response> {
  const observation = await loadLatestObservationFrame(env.DB);
  const regime = await loadLatestRegimePosterior(env.DB);
  const portfolio = await loadPortfolioState(env);
  const staticTruthByBucket = await loadStaticTruthByBucket(env);
  const dynamicTruthByBucket = await loadDynamicTruthByBucket(env.DB);

  const result = runDecisionPipeline(observation, regime, portfolio, dynamicTruthByBucket, staticTruthByBucket);
  const preview = buildPreviewResponse(result, observation, regime, portfolio, dynamicTruthByBucket, staticTruthByBucket);

  return new Response(JSON.stringify(preview), {
    headers: { 'content-type': 'application/json' }
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/') return handleRoot();
    if (url.pathname === '/health') return handleHealth(env);
    if (url.pathname === '/decision/preview' && request.method === 'GET') {
      return handleDecisionPreview(env);
    }
    if (url.pathname === '/snapshots/observation' && request.method === 'POST') {
      return handleWriteObservationSnapshot(request, env);
    }
    if (url.pathname === '/snapshots/regime' && request.method === 'POST') {
      return handleWriteRegimeSnapshot(request, env);
    }
    if (url.pathname === '/webhook/telegram' && request.method === 'POST') {
      return handleTelegramWebhook(request, env);
    }
    return new Response('not found', { status: 404 });
  }
};
