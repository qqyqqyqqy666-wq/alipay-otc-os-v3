PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS source_registry (
  source_id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL,
  trust_rank INTEGER NOT NULL,
  freshness_sla_minutes INTEGER NOT NULL,
  authoritative_fields_json TEXT NOT NULL,
  parser_id TEXT NOT NULL,
  is_active INTEGER NOT NULL CHECK (is_active IN (0,1))
);

CREATE TABLE IF NOT EXISTS truth_evidence_log (
  evidence_id TEXT PRIMARY KEY,
  instrument_id TEXT,
  source_id TEXT NOT NULL,
  field_name TEXT NOT NULL,
  raw_value TEXT,
  normalized_value TEXT,
  observed_at TEXT NOT NULL,
  confidence REAL NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_truth_evidence_instrument_field ON truth_evidence_log(instrument_id, field_name, observed_at DESC);

CREATE TABLE IF NOT EXISTS truth_resolution_log (
  resolution_id TEXT PRIMARY KEY,
  instrument_id TEXT,
  field_name TEXT NOT NULL,
  chosen_source_id TEXT,
  chosen_value TEXT,
  arbitration_status TEXT NOT NULL,
  rationale TEXT,
  resolved_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_truth_resolution_instrument_field ON truth_resolution_log(instrument_id, field_name, resolved_at DESC);

CREATE TABLE IF NOT EXISTS instrument_static_truth (
  instrument_id TEXT PRIMARY KEY,
  fund_code TEXT NOT NULL UNIQUE,
  fund_name TEXT NOT NULL,
  asset_bucket TEXT NOT NULL,
  asset_subtype TEXT NOT NULL,
  fund_company TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  currency TEXT NOT NULL,
  is_qdii INTEGER NOT NULL CHECK (is_qdii IN (0,1)),
  default_buy_confirm_days INTEGER NOT NULL,
  default_redeem_confirm_days INTEGER NOT NULL,
  default_cash_arrival_days INTEGER NOT NULL,
  default_min_hold_days INTEGER NOT NULL,
  default_fee_schedule_json TEXT NOT NULL,
  is_active INTEGER NOT NULL CHECK (is_active IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_static_bucket_active ON instrument_static_truth(asset_bucket, is_active);

CREATE TABLE IF NOT EXISTS instrument_dynamic_truth (
  instrument_id TEXT NOT NULL REFERENCES instrument_static_truth(instrument_id),
  as_of TEXT NOT NULL,
  nav REAL,
  nav_date TEXT,
  subscription_open INTEGER CHECK (subscription_open IN (0,1)),
  redemption_open INTEGER CHECK (redemption_open IN (0,1)),
  switch_in_allowed INTEGER CHECK (switch_in_allowed IN (0,1)),
  switch_out_allowed INTEGER CHECK (switch_out_allowed IN (0,1)),
  purchase_status_text TEXT,
  redeem_status_text TEXT,
  latest_status_checked_at TEXT,
  latest_nav_checked_at TEXT,
  truth_confidence REAL NOT NULL,
  truth_source TEXT NOT NULL,
  truth_version INTEGER NOT NULL,
  arbitration_status TEXT NOT NULL,
  PRIMARY KEY (instrument_id, as_of)
);
CREATE INDEX IF NOT EXISTS idx_dynamic_latest ON instrument_dynamic_truth(instrument_id, as_of DESC);

CREATE TABLE IF NOT EXISTS truth_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  instrument_id TEXT,
  payload_json TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_truth_events_instrument ON truth_events(instrument_id, created_at DESC);

CREATE TABLE IF NOT EXISTS truth_snapshots (
  snapshot_id TEXT PRIMARY KEY,
  snapshot_date TEXT NOT NULL,
  instrument_id TEXT,
  snapshot_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (snapshot_date, instrument_id)
);

CREATE TABLE IF NOT EXISTS portfolio_positions_truth (
  position_id TEXT PRIMARY KEY,
  instrument_id TEXT NOT NULL REFERENCES instrument_static_truth(instrument_id),
  shares REAL NOT NULL,
  cost_basis REAL NOT NULL,
  buy_date TEXT,
  lot_ages_json TEXT NOT NULL,
  last_confirmed_trade_type TEXT,
  last_confirmed_trade_at TEXT,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_positions_instrument ON portfolio_positions_truth(instrument_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS portfolio_pending_trades (
  pending_trade_id TEXT PRIMARY KEY,
  instrument_from TEXT,
  instrument_to TEXT,
  trade_state TEXT NOT NULL,
  submitted_at TEXT,
  expected_confirm_at TEXT,
  expected_cash_arrival_at TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  manual_confirmation_required INTEGER NOT NULL CHECK (manual_confirmation_required IN (0,1)),
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pending_trade_state ON portfolio_pending_trades(trade_state, updated_at DESC);

CREATE TABLE IF NOT EXISTS portfolio_cash_ledger (
  cash_ledger_id TEXT PRIMARY KEY,
  available_cash REAL NOT NULL,
  pending_cash REAL NOT NULL,
  as_of TEXT NOT NULL,
  reconciliation_status TEXT NOT NULL,
  UNIQUE(as_of)
);

CREATE TABLE IF NOT EXISTS signal_candidates (
  signal_id TEXT PRIMARY KEY,
  bucket_id TEXT NOT NULL,
  direction TEXT NOT NULL,
  strength REAL NOT NULL,
  confidence REAL NOT NULL,
  horizon_days INTEGER NOT NULL,
  thesis_code TEXT NOT NULL,
  evidence_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_signal_bucket_created ON signal_candidates(bucket_id, created_at DESC);

CREATE TABLE IF NOT EXISTS friction_verdicts (
  verdict_id TEXT PRIMARY KEY,
  signal_id TEXT NOT NULL REFERENCES signal_candidates(signal_id),
  can_execute INTEGER NOT NULL CHECK (can_execute IN (0,1)),
  forced_action TEXT,
  fee_cost_pct REAL NOT NULL,
  delay_cost_pct REAL NOT NULL,
  truth_cost_pct REAL NOT NULL,
  capital_lock_days INTEGER NOT NULL,
  replacement_available INTEGER NOT NULL CHECK (replacement_available IN (0,1)),
  channel_blocked INTEGER NOT NULL CHECK (channel_blocked IN (0,1)),
  min_hold_blocked INTEGER NOT NULL CHECK (min_hold_blocked IN (0,1)),
  status_blocked INTEGER NOT NULL CHECK (status_blocked IN (0,1)),
  net_edge_after_friction REAL NOT NULL,
  verdict_reason TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_friction_signal ON friction_verdicts(signal_id, created_at DESC);

CREATE TABLE IF NOT EXISTS execution_plans (
  plan_id TEXT PRIMARY KEY,
  bucket_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  instrument_from TEXT,
  instrument_to TEXT,
  step_mode TEXT NOT NULL,
  earliest_submit_at TEXT,
  expected_confirm_at TEXT,
  expected_cash_arrival_at TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  blocked_reason TEXT,
  user_message_zh TEXT NOT NULL,
  plan_status TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_execution_plans_status ON execution_plans(plan_status, created_at DESC);

CREATE TABLE IF NOT EXISTS action_ledger (
  ledger_id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES execution_plans(plan_id),
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_action_ledger_plan ON action_ledger(plan_id, created_at DESC);

CREATE TABLE IF NOT EXISTS reconciliation_log (
  reconciliation_id TEXT PRIMARY KEY,
  as_of TEXT NOT NULL,
  reconciliation_status TEXT NOT NULL,
  mismatch_summary_json TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(as_of)
);

CREATE TABLE IF NOT EXISTS system_health_log (
  health_id TEXT PRIMARY KEY,
  as_of TEXT NOT NULL,
  degraded_modes_json TEXT NOT NULL,
  source_failures_json TEXT NOT NULL,
  parser_failures_json TEXT NOT NULL,
  reconciliation_backlog INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(as_of)
);

CREATE TABLE IF NOT EXISTS market_observation_snapshots (
  snapshot_id TEXT PRIMARY KEY,
  as_of TEXT NOT NULL,
  channel TEXT NOT NULL,
  observation_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(as_of, channel)
);
CREATE INDEX IF NOT EXISTS idx_obs_snapshots_as_of ON market_observation_snapshots(as_of DESC);

CREATE TABLE IF NOT EXISTS regime_snapshots (
  snapshot_id TEXT PRIMARY KEY,
  as_of TEXT NOT NULL,
  regime_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(as_of)
);
CREATE INDEX IF NOT EXISTS idx_regime_snapshots_as_of ON regime_snapshots(as_of DESC);
