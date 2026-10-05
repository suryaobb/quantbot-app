-- Quantbot Live Sync Tables
-- Run in Supabase SQL editor: https://supabase.com/dashboard/project/swasprnvzseufpgehprh/sql/new
-- These mirror the local quantbot.db SQLite schema exactly.

-- ==================== QB_ALERTS ====================
-- Mirrors: ~/.quantbot/quantbot.db → alerts table
CREATE TABLE IF NOT EXISTS public.qb_alerts (
  id               BIGINT PRIMARY KEY,          -- same id as SQLite source
  ts               TIMESTAMPTZ NOT NULL,
  logged_at        TIMESTAMPTZ,
  symbol           TEXT NOT NULL,
  direction        TEXT NOT NULL,               -- 'long' | 'short'
  tier             TEXT,                        -- 'GO' | 'WATCH' | 'SUPPRESSED'
  score            INTEGER,
  price            NUMERIC,
  vix              NUMERIC,
  rvol             NUMERIC,
  message          TEXT,
  delivered        BOOLEAN DEFAULT false,
  error            TEXT,
  synced_at        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.qb_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qb_alerts_public_read"    ON public.qb_alerts FOR SELECT USING (true);
CREATE POLICY "qb_alerts_service_write"  ON public.qb_alerts FOR ALL    USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS qb_alerts_ts_idx     ON public.qb_alerts(ts DESC);
CREATE INDEX IF NOT EXISTS qb_alerts_symbol_idx ON public.qb_alerts(symbol);
CREATE INDEX IF NOT EXISTS qb_alerts_tier_idx   ON public.qb_alerts(tier);

-- ==================== QB_TRADES ====================
-- Mirrors: ~/.quantbot/quantbot.db → trades table
CREATE TABLE IF NOT EXISTS public.qb_trades (
  id                  BIGINT PRIMARY KEY,       -- same id as SQLite source
  opened_ts           TIMESTAMPTZ NOT NULL,
  symbol              TEXT NOT NULL,
  direction           TEXT NOT NULL,            -- 'long' | 'short'
  contract            TEXT,
  strike              NUMERIC,
  expiry              TEXT,
  entry_underlying    NUMERIC,
  entry_premium       NUMERIC,
  delta               NUMERIC,
  gamma               NUMERIC,
  status              TEXT DEFAULT 'open',      -- 'open' | 'closed'
  trimmed_ts          TIMESTAMPTZ,
  target_ts           TIMESTAMPTZ,
  wall_warned_ts      TIMESTAMPTZ,
  closed_ts           TIMESTAMPTZ,
  close_reason        TEXT,
  close_premium_pct   NUMERIC,
  peak_premium_pct    NUMERIC,
  contracts           NUMERIC,
  risk_dollars        NUMERIC,
  synced_at           TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.qb_trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qb_trades_public_read"    ON public.qb_trades FOR SELECT USING (true);
CREATE POLICY "qb_trades_service_write"  ON public.qb_trades FOR ALL    USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS qb_trades_opened_ts_idx ON public.qb_trades(opened_ts DESC);
CREATE INDEX IF NOT EXISTS qb_trades_symbol_idx    ON public.qb_trades(symbol);
CREATE INDEX IF NOT EXISTS qb_trades_status_idx    ON public.qb_trades(status);
