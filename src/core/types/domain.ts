export type ISODate = string;
export type ISODateTime = string;
export type UUID = string;

export type ChannelName = 'ALIPAY' | 'TIANTIAN' | 'UNKNOWN';
export type AssetBucket =
  | 'CN_CORE'
  | 'CN_STYLE'
  | 'BANK_DIVIDEND'
  | 'BROKER_BETA'
  | 'SEMI_GROWTH'
  | 'GOLD'
  | 'QDII'
  | 'CASH';

export type AssetSubtype =
  | 'CSI300'
  | 'DIVIDEND'
  | 'BANK'
  | 'BROKER'
  | 'SEMI'
  | 'GOLD'
  | 'HK_TECH'
  | 'MMF'
  | 'OTHER';

export type TruthFieldName =
  | 'nav'
  | 'nav_date'
  | 'subscription_open'
  | 'redemption_open'
  | 'switch_in_allowed'
  | 'switch_out_allowed'
  | 'purchase_status_text'
  | 'redeem_status_text'
  | 'buy_confirm_days'
  | 'redeem_confirm_days'
  | 'cash_arrival_days'
  | 'min_hold_days'
  | 'fee_schedule_json';

export type TruthArbitrationStatus =
  | 'RESOLVED'
  | 'CONFLICT'
  | 'STALE'
  | 'MISSING'
  | 'DEGRADED';

export type TradeState =
  | 'NONE'
  | 'BUY_SUBMITTED'
  | 'BUY_PENDING_CONFIRM'
  | 'BUY_CONFIRMED'
  | 'REDEEM_SUBMITTED'
  | 'REDEEM_PENDING_CONFIRM'
  | 'CASH_PENDING_ARRIVAL'
  | 'CASH_ARRIVED'
  | 'SWITCH_STEP1_SUBMITTED'
  | 'SWITCH_STEP1_CONFIRMED'
  | 'SWITCH_STEP2_SUBMITTED'
  | 'SWITCH_STEP2_CONFIRMED'
  | 'DONE'
  | 'FAILED'
  | 'MANUAL_RECON_REQUIRED';

export type ReconciliationStatus =
  | 'SYSTEM_TRUTH_OK'
  | 'POSITION_MISMATCH'
  | 'PENDING_USER_CONFIRM'
  | 'CHANNEL_CONFIRM_PENDING'
  | 'MANUAL_RECON_REQUIRED';

export type ActionType = 'BUY' | 'REDEEM' | 'SWITCH' | 'DELAY' | 'HOLD';
export type StepMode = 'single' | 'two_step';
export type Direction = 'ADD' | 'REDUCE' | 'HOLD';

export type DegradedMode =
  | 'READ_ONLY_MODE'
  | 'NO_NEW_ACTIONS'
  | 'TRUTH_CONFLICT_BLOCK'
  | 'MANUAL_RECON_REQUIRED'
  | 'HOLD_ONLY_MODE';

export interface ObservationFrame {
  as_of: ISODateTime;
  source_values: Record<string, unknown>;
  source_confidence: Record<string, number>;
  source_freshness_minutes: Record<string, number>;
  channel: ChannelName;
}

export interface ExposurePosterior {
  fund_code: string;
  as_of: ISODateTime;
  beta_mean: Record<string, number>;
  beta_cov: Record<string, Record<string, number>>;
  style_drift_prob: number;
  observation_confidence: number;
}

export interface RegimePosterior {
  as_of: ISODateTime;
  liquidity_state: Record<string, number>;
  risk_appetite_state: Record<string, number>;
  policy_state: Record<string, number>;
  tail_prob: number;
  transition_matrix_1d: number[][];
  half_life_days: number;
}

export interface InstrumentStaticTruth {
  instrument_id: UUID;
  fund_code: string;
  fund_name: string;
  asset_bucket: AssetBucket;
  asset_subtype: AssetSubtype;
  fund_company: string;
  risk_level: string;
  currency: string;
  is_qdii: boolean;
  default_buy_confirm_days: number;
  default_redeem_confirm_days: number;
  default_cash_arrival_days: number;
  default_min_hold_days: number;
  default_fee_schedule_json: string;
  is_active: boolean;
  updated_at: ISODateTime;
}

export interface InstrumentDynamicTruth {
  instrument_id: UUID;
  as_of: ISODateTime;
  nav: number | null;
  nav_date: ISODate | null;
  subscription_open: boolean | null;
  redemption_open: boolean | null;
  switch_in_allowed: boolean | null;
  switch_out_allowed: boolean | null;
  purchase_status_text: string | null;
  redeem_status_text: string | null;
  latest_status_checked_at: ISODateTime | null;
  latest_nav_checked_at: ISODateTime | null;
  truth_confidence: number;
  truth_source: string;
  truth_version: number;
  arbitration_status: TruthArbitrationStatus;
}

export interface PortfolioLotAge {
  age_bucket_days_min: number;
  age_bucket_days_max: number;
  shares: number;
  redemption_fee_rate: number;
}

export interface PortfolioPositionTruth {
  position_id: UUID;
  instrument_id: UUID;
  shares: number;
  cost_basis: number;
  buy_date: ISODate | null;
  lot_ages: PortfolioLotAge[];
  last_confirmed_trade_type: ActionType | null;
  last_confirmed_trade_at: ISODateTime | null;
}

export interface PendingTradeState {
  pending_trade_id: UUID;
  instrument_from: UUID | null;
  instrument_to: UUID | null;
  trade_state: TradeState;
  submitted_at: ISODateTime | null;
  expected_confirm_at: ISODateTime | null;
  expected_cash_arrival_at: ISODateTime | null;
  idempotency_key: string;
  manual_confirmation_required: boolean;
}

export interface EffectivePortfolioState {
  as_of: ISODateTime;
  positions: PortfolioPositionTruth[];
  pending_trades: PendingTradeState[];
  available_cash: number;
  pending_cash: number;
  reconciliation_status: ReconciliationStatus;
}

export interface TruthStatus {
  as_of: ISODateTime;
  field_status: Record<TruthFieldName, TruthArbitrationStatus>;
  confidence_by_field: Record<TruthFieldName, number>;
  active_degraded_modes: DegradedMode[];
}

export interface SignalCandidate {
  signal_id: UUID;
  bucket_id: AssetBucket;
  direction: Direction;
  strength: number;
  confidence: number;
  horizon_days: number;
  thesis_code: string;
  evidence_json: string;
}

export interface FrictionVerdict {
  can_execute: boolean;
  forced_action: 'HOLD' | 'DELAY' | null;
  fee_cost_pct: number;
  delay_cost_pct: number;
  truth_cost_pct: number;
  capital_lock_days: number;
  replacement_available: boolean;
  channel_blocked: boolean;
  min_hold_blocked: boolean;
  status_blocked: boolean;
  net_edge_after_friction: number;
  verdict_reason: string;
}

export interface ExecutionPlan {
  plan_id: UUID;
  bucket_id: AssetBucket;
  action_type: ActionType;
  instrument_from: UUID | null;
  instrument_to: UUID | null;
  step_mode: StepMode;
  earliest_submit_at: ISODateTime | null;
  expected_confirm_at: ISODateTime | null;
  expected_cash_arrival_at: ISODateTime | null;
  idempotency_key: string;
  blocked_reason: string | null;
  user_message_zh: string;
  plan_status: 'PROPOSED' | 'SUBMITTED' | 'SUPERSEDED' | 'EXECUTED' | 'EXPIRED';
}

export interface Genome {
  id: UUID;
  factor_set: string[];
  regime_spec_json: string;
  truth_policy_json: string;
  friction_policy_json: string;
  promotion_version: number;
}

export interface TournamentResult {
  genome_id: UUID;
  score: number;
  worst_decile_score: number;
  calibration_error: number;
  action_instability: number;
  promoted: boolean;
}

export interface SystemHealthState {
  as_of: ISODateTime;
  degraded_modes: DegradedMode[];
  source_failures: Record<string, number>;
  parser_failures: Record<string, number>;
  reconciliation_backlog: number;
}
