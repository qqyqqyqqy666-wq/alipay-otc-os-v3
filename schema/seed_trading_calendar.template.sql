CREATE TABLE IF NOT EXISTS trading_calendar (
  trade_date TEXT PRIMARY KEY,
  is_trading_day INTEGER NOT NULL CHECK (is_trading_day IN (0,1))
);

INSERT OR REPLACE INTO trading_calendar (trade_date, is_trading_day) VALUES
('2026-01-02', 1),
('2026-01-05', 1),
('2026-01-06', 1),
('2026-01-07', 1),
('2026-01-08', 1),
('2026-01-09', 1);
