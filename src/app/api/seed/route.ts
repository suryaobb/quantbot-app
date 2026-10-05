import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use service role key for seeding (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const STRATEGIES = [
  {
    name: "orb_0dte",
    display_name: "ORB 0DTE",
    status: "active",
    win_rate: 0.65,
    profit_factor: 1.8,
    total_trades: 248,
    virtual_balance: 44200,
    health_label: "Strong",
    consecutive_losses: 0,
    efficacy_score: 78,
    params: { breakout_candle: "9:45", chart: "5m", rr: 2 },
    description: "Buys breakout of first 15-min candle on SPY/QQQ. Enter at 9:45 on 5-min chart, stop below open range, target 2:1 R:R",
  },
  {
    name: "vwap_reclaim",
    display_name: "VWAP Reclaim",
    status: "active",
    win_rate: 0.60,
    profit_factor: 1.6,
    total_trades: 192,
    virtual_balance: 43200,
    health_label: "Strong",
    consecutive_losses: 1,
    efficacy_score: 71,
    params: { chart: "5m", volume_confirm: true },
    description: "Price pulls back below VWAP then reclaims. Enter on 5-min close above VWAP with volume confirmation",
  },
  {
    name: "ema_cross_0dte",
    display_name: "EMA Cross 0DTE",
    status: "active",
    win_rate: 0.58,
    profit_factor: 1.5,
    total_trades: 176,
    virtual_balance: 42400,
    health_label: "Steady",
    consecutive_losses: 0,
    efficacy_score: 64,
    params: { fast_ema: 5, slow_ema: 20, chart: "5m" },
    description: "5 EMA crosses above 20 EMA on 5-min chart with VWAP slope positive. Enter at cross, stop at 20 EMA",
  },
  {
    name: "gex_flip",
    display_name: "GEX Flip",
    status: "active",
    win_rate: 0.62,
    profit_factor: 1.7,
    total_trades: 134,
    virtual_balance: 43600,
    health_label: "Strong",
    consecutive_losses: 0,
    efficacy_score: 74,
    params: { gamma_direction: "flip_long_to_short" },
    description: "Dealer gamma flips from long to short gamma. Amplifies directional moves. Trade with momentum after flip",
  },
  {
    name: "iv_skew_play",
    display_name: "IV Skew Play",
    status: "paused",
    win_rate: 0.55,
    profit_factor: 1.4,
    total_trades: 98,
    virtual_balance: 40800,
    health_label: "Cold",
    consecutive_losses: 2,
    efficacy_score: 58,
    params: { delta: 25, skew_threshold: 1.2 },
    description: "25-delta put IV > call IV = smart money buying puts = bearish. Trade direction of skew on 0DTE",
  },
  {
    name: "news_filter_momentum",
    display_name: "News Filter Momentum",
    status: "active",
    win_rate: 0.57,
    profit_factor: 1.45,
    total_trades: 112,
    virtual_balance: 41600,
    health_label: "Steady",
    consecutive_losses: 0,
    efficacy_score: 61,
    params: { filter_events: ["FOMC", "CPI", "NFP"], delay_mins: 5 },
    description: "Post-news momentum play. Filters out noisy Fed/CPI windows. Enter 5min after catalyst confirms direction",
  },
];

const PAPER_TRADES = [
  { strategy: "orb_0dte", ticker: "SPY", direction: "CALL", entry_price: 1.45, size_dollars: 145, contracts: 1, opened_at: "2026-09-02T09:45:00Z", closed_at: "2026-09-02T11:30:00Z", pnl_dollars: 290, pnl_pct: 2.0, status: "closed", exit_reason: "target" },
  { strategy: "vwap_reclaim", ticker: "QQQ", direction: "CALL", entry_price: 2.10, size_dollars: 210, contracts: 1, opened_at: "2026-09-04T10:15:00Z", closed_at: "2026-09-04T12:45:00Z", pnl_dollars: -105, pnl_pct: -0.5, status: "closed", exit_reason: "stop" },
  { strategy: "orb_0dte", ticker: "SPY", direction: "PUT", entry_price: 1.85, size_dollars: 370, contracts: 2, opened_at: "2026-09-09T09:45:00Z", closed_at: "2026-09-09T10:50:00Z", pnl_dollars: 560, pnl_pct: 1.51, status: "closed", exit_reason: "target" },
  { strategy: "gex_flip", ticker: "SPY", direction: "CALL", entry_price: 3.20, size_dollars: 960, contracts: 3, opened_at: "2026-09-11T10:05:00Z", closed_at: "2026-09-11T13:15:00Z", pnl_dollars: 720, pnl_pct: 0.75, status: "closed", exit_reason: "target" },
  { strategy: "ema_cross_0dte", ticker: "QQQ", direction: "PUT", entry_price: 2.45, size_dollars: 490, contracts: 2, opened_at: "2026-09-15T09:50:00Z", closed_at: "2026-09-15T10:30:00Z", pnl_dollars: -245, pnl_pct: -0.5, status: "closed", exit_reason: "stop" },
  { strategy: "orb_0dte", ticker: "IWM", direction: "CALL", entry_price: 1.10, size_dollars: 110, contracts: 1, opened_at: "2026-09-18T09:45:00Z", closed_at: "2026-09-18T11:05:00Z", pnl_dollars: 220, pnl_pct: 2.0, status: "closed", exit_reason: "target" },
  { strategy: "iv_skew_play", ticker: "SPY", direction: "PUT", entry_price: 4.50, size_dollars: 450, contracts: 1, opened_at: "2026-09-22T09:55:00Z", closed_at: "2026-09-22T14:00:00Z", pnl_dollars: 630, pnl_pct: 1.4, status: "closed", exit_reason: "target" },
  { strategy: "news_filter_momentum", ticker: "QQQ", direction: "CALL", entry_price: 1.75, size_dollars: 175, contracts: 1, opened_at: "2026-09-25T10:05:00Z", closed_at: "2026-09-25T11:35:00Z", pnl_dollars: -88, pnl_pct: -0.5, status: "closed", exit_reason: "stop" },
  { strategy: "vwap_reclaim", ticker: "SPY", direction: "CALL", entry_price: 2.80, size_dollars: 840, contracts: 3, opened_at: "2026-09-29T10:20:00Z", closed_at: "2026-09-29T13:00:00Z", pnl_dollars: 1080, pnl_pct: 1.29, status: "closed", exit_reason: "target" },
  { strategy: "gex_flip", ticker: "SPY", direction: "PUT", entry_price: 3.60, size_dollars: 720, contracts: 2, opened_at: "2026-10-02T09:48:00Z", closed_at: "2026-10-02T11:10:00Z", pnl_dollars: 360, pnl_pct: 0.5, status: "closed", exit_reason: "target" },
];

const PORTFOLIO_SNAPSHOTS = (() => {
  let balance = 40000;
  return PAPER_TRADES.map((t) => {
    balance += t.pnl_dollars;
    return {
      snapshot_date: t.closed_at,
      balance,
      total_return_pct: ((balance - 40000) / 40000) * 100,
      daily_pnl: t.pnl_dollars,
      win_rate: 0.6,
      profit_factor: 1.62,
      total_trades: PAPER_TRADES.indexOf(t) + 1,
    };
  });
})();

const BACKTEST_RUNS = [
  { strategy: "orb_0dte", total_trades: 248, win_rate: 0.65, profit_factor: 1.8, total_pnl: 12400, max_drawdown: 0.082, sharpe: 1.92, efficacy_score: 78 },
  { strategy: "vwap_reclaim", total_trades: 192, win_rate: 0.60, profit_factor: 1.6, total_pnl: 9200, max_drawdown: 0.095, sharpe: 1.65, efficacy_score: 71 },
  { strategy: "ema_cross_0dte", total_trades: 176, win_rate: 0.58, profit_factor: 1.5, total_pnl: 7800, max_drawdown: 0.112, sharpe: 1.48, efficacy_score: 64 },
  { strategy: "gex_flip", total_trades: 134, win_rate: 0.62, profit_factor: 1.7, total_pnl: 10600, max_drawdown: 0.074, sharpe: 1.81, efficacy_score: 74 },
  { strategy: "iv_skew_play", total_trades: 98, win_rate: 0.55, profit_factor: 1.4, total_pnl: 4900, max_drawdown: 0.13, sharpe: 1.22, efficacy_score: 58 },
  { strategy: "news_filter_momentum", total_trades: 112, win_rate: 0.57, profit_factor: 1.45, total_pnl: 5600, max_drawdown: 0.098, sharpe: 1.35, efficacy_score: 61 },
];

export async function GET() {
  const results: Record<string, unknown> = {};

  // Seed strategies
  const { data: stratData, error: stratErr } = await supabaseAdmin
    .from("strategies")
    .upsert(STRATEGIES, { onConflict: "name" })
    .select();
  results.strategies = stratErr ? { error: stratErr.message } : { inserted: stratData?.length };

  // Seed paper trades (truncate first to avoid duplicates on re-run)
  await supabaseAdmin.from("paper_trades").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  const { data: tradeData, error: tradeErr } = await supabaseAdmin
    .from("paper_trades")
    .insert(PAPER_TRADES)
    .select();
  results.paper_trades = tradeErr ? { error: tradeErr.message } : { inserted: tradeData?.length };

  // Seed portfolio snapshots
  await supabaseAdmin.from("portfolio_snapshots").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  const { data: snapData, error: snapErr } = await supabaseAdmin
    .from("portfolio_snapshots")
    .insert(PORTFOLIO_SNAPSHOTS)
    .select();
  results.portfolio_snapshots = snapErr ? { error: snapErr.message } : { inserted: snapData?.length };

  // Seed backtest runs
  await supabaseAdmin.from("backtest_runs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  const { data: btData, error: btErr } = await supabaseAdmin
    .from("backtest_runs")
    .insert(BACKTEST_RUNS)
    .select();
  results.backtest_runs = btErr ? { error: btErr.message } : { inserted: btData?.length };

  const hasErrors = Object.values(results).some((r) => typeof r === "object" && r !== null && "error" in (r as object));

  return NextResponse.json({
    success: !hasErrors,
    results,
    note: "Visit / to see the dashboard with seeded data",
  });
}
