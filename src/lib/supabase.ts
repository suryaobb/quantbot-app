import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Strategy = {
  id: string
  name: string
  display_name: string
  params: Record<string, unknown>
  efficacy_score: number | null
  win_rate: number | null
  profit_factor: number | null
  total_trades: number
  virtual_balance: number
  last_updated: string
  status: 'active' | 'paused' | 'cold'
  consecutive_losses: number
  health_label: 'Strong' | 'Steady' | 'Cold' | 'Struggling'
}

export type Signal = {
  id: string
  fired_at: string
  ticker: string
  direction: string
  strike: number | null
  expiry: string | null
  entry_price: number | null
  stop_price: number | null
  target_price: number | null
  strategy: string | null
  confidence: number | null
  vix_at_signal: number | null
  regime: string | null
  outcome: string | null
  outcome_pnl: number | null
}

export type PaperTrade = {
  id: string
  strategy: string
  ticker: string
  direction: string
  entry_price: number
  size_dollars: number
  contracts: number
  opened_at: string
  closed_at: string | null
  pnl_dollars: number | null
  pnl_pct: number | null
  status: 'open' | 'closed' | 'expired'
  exit_reason: string | null
}

export type PortfolioSnapshot = {
  id: string
  snapshot_date: string
  balance: number
  total_return_pct: number | null
  daily_pnl: number | null
  win_rate: number | null
  profit_factor: number | null
  total_trades: number | null
}

export type BacktestRun = {
  id: string
  run_at: string
  strategy: string
  total_trades: number | null
  win_rate: number | null
  profit_factor: number | null
  total_pnl: number | null
  max_drawdown: number | null
  sharpe: number | null
  efficacy_score: number | null
}

// ── Live sync types (from quantbot.db via quantbot_sync.py) ──

export type QbAlert = {
  id: number
  ts: string
  logged_at: string | null
  symbol: string
  direction: 'long' | 'short'
  tier: 'GO' | 'WATCH' | 'SUPPRESSED' | string
  score: number | null
  price: number | null
  vix: number | null
  rvol: number | null
  message: string | null
  delivered: boolean
  error: string | null
  synced_at: string
}

export type QbTrade = {
  id: number
  opened_ts: string
  symbol: string
  direction: 'long' | 'short'
  contract: string | null
  strike: number | null
  expiry: string | null
  entry_underlying: number | null
  entry_premium: number | null
  delta: number | null
  gamma: number | null
  status: 'open' | 'closed' | string
  trimmed_ts: string | null
  target_ts: string | null
  wall_warned_ts: string | null
  closed_ts: string | null
  close_reason: string | null
  close_premium_pct: number | null
  peak_premium_pct: number | null
  contracts: number | null
  risk_dollars: number | null
  synced_at: string
}
