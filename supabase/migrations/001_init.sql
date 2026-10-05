-- Quantbot App — Initial Schema
-- Run this in your Supabase SQL editor: https://supabase.com/dashboard/project/swasprnvzseufpgehprh/sql/new

-- ==================== STRATEGIES ====================
CREATE TABLE IF NOT EXISTS public.strategies (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name              TEXT UNIQUE NOT NULL,
  display_name      TEXT NOT NULL,
  description       TEXT,
  params            JSONB DEFAULT '{}',
  efficacy_score    NUMERIC,
  win_rate          NUMERIC,
  profit_factor     NUMERIC,
  total_trades      INTEGER DEFAULT 0,
  virtual_balance   NUMERIC DEFAULT 40000,
  last_updated      TIMESTAMPTZ DEFAULT now(),
  status            TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cold')),
  consecutive_losses INTEGER DEFAULT 0,
  health_label      TEXT DEFAULT 'Steady' CHECK (health_label IN ('Strong', 'Steady', 'Cold', 'Struggling')),
  created_at        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "strategies_public_read" ON public.strategies FOR SELECT USING (true);
CREATE POLICY "strategies_service_write" ON public.strategies FOR ALL USING (auth.role() = 'service_role');

-- ==================== SIGNALS ====================
CREATE TABLE IF NOT EXISTS public.signals (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fired_at          TIMESTAMPTZ DEFAULT now(),
  ticker            TEXT NOT NULL,
  direction         TEXT NOT NULL CHECK (direction IN ('CALL', 'PUT')),
  strike            NUMERIC,
  expiry            TEXT,
  entry_price       NUMERIC,
  stop_price        NUMERIC,
  target_price      NUMERIC,
  strategy          TEXT REFERENCES public.strategies(name),
  confidence        NUMERIC,
  vix_at_signal     NUMERIC,
  regime            TEXT,
  outcome           TEXT,
  outcome_pnl       NUMERIC,
  created_at        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "signals_public_read" ON public.signals FOR SELECT USING (true);
CREATE POLICY "signals_service_write" ON public.signals FOR ALL USING (auth.role() = 'service_role');

-- ==================== PAPER TRADES ====================
CREATE TABLE IF NOT EXISTS public.paper_trades (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  strategy          TEXT,
  ticker            TEXT NOT NULL,
  direction         TEXT NOT NULL CHECK (direction IN ('CALL', 'PUT')),
  entry_price       NUMERIC NOT NULL,
  size_dollars      NUMERIC,
  contracts         INTEGER DEFAULT 1,
  opened_at         TIMESTAMPTZ DEFAULT now(),
  closed_at         TIMESTAMPTZ,
  pnl_dollars       NUMERIC,
  pnl_pct           NUMERIC,
  status            TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'expired')),
  exit_reason       TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.paper_trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "paper_trades_public_read" ON public.paper_trades FOR SELECT USING (true);
CREATE POLICY "paper_trades_service_write" ON public.paper_trades FOR ALL USING (auth.role() = 'service_role');

-- ==================== PORTFOLIO SNAPSHOTS ====================
CREATE TABLE IF NOT EXISTS public.portfolio_snapshots (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date     TIMESTAMPTZ DEFAULT now(),
  balance           NUMERIC NOT NULL,
  total_return_pct  NUMERIC,
  daily_pnl         NUMERIC,
  win_rate          NUMERIC,
  profit_factor     NUMERIC,
  total_trades      INTEGER,
  created_at        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.portfolio_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "snapshots_public_read" ON public.portfolio_snapshots FOR SELECT USING (true);
CREATE POLICY "snapshots_service_write" ON public.portfolio_snapshots FOR ALL USING (auth.role() = 'service_role');

-- ==================== BACKTEST RUNS ====================
CREATE TABLE IF NOT EXISTS public.backtest_runs (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  run_at            TIMESTAMPTZ DEFAULT now(),
  strategy          TEXT,
  total_trades      INTEGER,
  win_rate          NUMERIC,
  profit_factor     NUMERIC,
  total_pnl         NUMERIC,
  max_drawdown      NUMERIC,
  sharpe            NUMERIC,
  efficacy_score    NUMERIC,
  created_at        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.backtest_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "backtests_public_read" ON public.backtest_runs FOR SELECT USING (true);
CREATE POLICY "backtests_service_write" ON public.backtest_runs FOR ALL USING (auth.role() = 'service_role');
