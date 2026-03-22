INSERT INTO instrument_static_truth (
  instrument_id, fund_code, fund_name, asset_bucket, asset_subtype, fund_company,
  risk_level, currency, is_qdii, default_buy_confirm_days, default_redeem_confirm_days,
  default_cash_arrival_days, default_min_hold_days, default_fee_schedule_json,
  is_active, created_at, updated_at
) VALUES
(
  '11111111-1111-1111-1111-111111111111', '000216', 'Gold Hedge Template', 'GOLD', 'GOLD', 'TEMPLATE_COMPANY',
  'R3', 'CNY', 0, 1, 1, 2, 7,
  '[{"min_days":0,"max_days":6,"fee_rate":0.015},{"min_days":7,"max_days":9999,"fee_rate":0.0}]',
  1, datetime('now'), datetime('now')
),
(
  '22222222-2222-2222-2222-222222222222', '460300', 'CN Core Template', 'CN_CORE', 'CSI300', 'TEMPLATE_COMPANY',
  'R3', 'CNY', 0, 1, 1, 2, 7,
  '[{"min_days":0,"max_days":6,"fee_rate":0.015},{"min_days":7,"max_days":9999,"fee_rate":0.0}]',
  1, datetime('now'), datetime('now')
),
(
  '33333333-3333-3333-3333-333333333333', '013402', 'QDII Template', 'QDII', 'HK_TECH', 'TEMPLATE_COMPANY',
  'R4', 'CNY', 1, 2, 2, 3, 7,
  '[{"min_days":0,"max_days":6,"fee_rate":0.015},{"min_days":7,"max_days":9999,"fee_rate":0.0}]',
  1, datetime('now'), datetime('now')
);
