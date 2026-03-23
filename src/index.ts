import type { Env } from './core/types/db';
import type {
  EffectivePortfolioState,
  PortfolioPositionTruth,
  PendingTradeState
} from './core/types/domain';
import { renderHelpText } from './interfaces/telegram_commands';
import { runDecisionPipeline } from './pipeline/decision_pipeline';
import { loadLatestObservationFrame, loadLatestRegimePosterior } from './pipeline/observation_regime_loader';

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

async function handleDecisionPreview(env: Env): Promise<Response> {
  const observation = await loadLatestObservationFrame(env.DB);
  const regime = await loadLatestRegimePosterior(env.DB);
  const portfolio = await loadPortfolioState(env);

  const result = runDecisionPipeline(observation, regime, portfolio, {});

  return new Response(JSON.stringify(result), {
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
    if (url.pathname === '/webhook/telegram' && request.method === 'POST') {
      return handleTelegramWebhook(request, env);
    }
    return new Response('not found', { status: 404 });
  }
};
