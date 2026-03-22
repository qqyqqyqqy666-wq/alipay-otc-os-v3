INSERT INTO source_registry (source_id, source_type, trust_rank, freshness_sla_minutes, authoritative_fields_json, parser_id, is_active) VALUES
('fred_10y', 'API_JSON', 80, 1440, '["macro_yield_10y"]', 'parse_fred', 1),
('eastmoney_csi300', 'API_JSON', 85, 120, '["cn_equity_proxy"]', 'parse_index', 1),
('nbs_cpi', 'API_JSON', 75, 43200, '["macro_cpi"]', 'parse_nbs', 1),
('tiantian_fund_html', 'HTML_RULES', 70, 360, '["nav","nav_date","subscription_open","redemption_open"]', 'parse_fund_html', 1),
('alipay_channel_manual', 'WEBHOOK', 100, 60, '["subscription_open","redemption_open","switch_in_allowed","switch_out_allowed"]', 'manual_channel_truth', 1);
