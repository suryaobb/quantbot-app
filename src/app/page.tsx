"use client";

import { useEffect, useState } from "react";
import { supabase, type Strategy, type QbTrade } from "@/lib/supabase";

// Mini sparkline SVG
function Sparkline({
  points,
  positive = true,
  height = 48,
  width = 120,
}: {
  points: number[];
  positive?: boolean;
  height?: number;
  width?: number;
}) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = width / (points.length - 1);

  const coords = points.map((p, i) => [
    i * step,
    height - ((p - min) / range) * height * 0.85 - height * 0.05,
  ]);

  const pathD = coords
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const areaD = `${pathD} L${width},${height} L0,${height} Z`;
  const color = positive ? "#A8FF3E" : "#FF4D4D";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={`grad-${positive}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#grad-${positive})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

function makeSparkPoints(winRate: number, trades: number): number[] {
  const n = Math.min(trades, 20);
  let val = 40000;
  const pts = [val];
  for (let i = 0; i < n; i++) {
    const win = Math.random() < winRate;
    val += win ? val * 0.018 : -val * 0.009;
    pts.push(val);
  }
  return pts;
}

const STATUS_PILL: Record<string, string> = {
  active: "pill pill-green",
  paused: "pill pill-gray",
  cold: "pill pill-gray",
};

const HEALTH_COLOR: Record<string, string> = {
  Strong: "#A8FF3E",
  Steady: "#60A5FA",
  Cold: "#F59E0B",
  Struggling: "#FF4D4D",
};

function StrategyCard({ s }: { s: Strategy }) {
  const balance = s.virtual_balance ?? 40000;
  const returnPct = ((balance - 40000) / 40000) * 100;
  const positive = returnPct >= 0;
  const sparkPoints = makeSparkPoints(s.win_rate ?? 0.55, s.total_trades ?? 12);

  return (
    <div className="card p-0 overflow-hidden">
      <div className="relative h-16 bg-[#0D0D0D]">
        <Sparkline points={sparkPoints} positive={positive} height={64} width={300} />
        <span
          className={`absolute top-2 right-3 ${
            positive ? "pill pill-green" : "pill pill-red"
          }`}
        >
          {positive ? "+" : ""}
          {returnPct.toFixed(1)}%
        </span>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-semibold text-white text-sm leading-tight">
              {s.display_name}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
              {s.name}
            </p>
          </div>
          <span className={STATUS_PILL[s.status] ?? "pill pill-gray"}>{s.status}</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <p
              className="text-[10px] uppercase tracking-wider"
              style={{ color: "var(--muted)" }}
            >
              Balance
            </p>
            <p className="text-sm font-bold text-white mt-0.5">
              ${(balance / 1000).toFixed(1)}k
            </p>
          </div>
          <div>
            <p
              className="text-[10px] uppercase tracking-wider"
              style={{ color: "var(--muted)" }}
            >
              Win Rate
            </p>
            <p className="text-sm font-bold text-white mt-0.5">
              {s.win_rate != null ? `${(s.win_rate * 100).toFixed(0)}%` : "—"}
            </p>
          </div>
          <div>
            <p
              className="text-[10px] uppercase tracking-wider"
              style={{ color: "var(--muted)" }}
            >
              PF
            </p>
            <p className="text-sm font-bold text-white mt-0.5">
              {s.profit_factor?.toFixed(2) ?? "—"}
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1.5 border-t border-[#1E1E1E] pt-3">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: HEALTH_COLOR[s.health_label] ?? "#666" }}
          />
          <span
            className="text-xs font-medium"
            style={{ color: HEALTH_COLOR[s.health_label] ?? "#666" }}
          >
            {s.health_label}
          </span>
          <span className="ml-auto text-xs" style={{ color: "var(--muted)" }}>
            {s.total_trades ?? 0} trades
          </span>
        </div>
      </div>
    </div>
  );
}

const FALLBACK_STRATEGIES: Strategy[] = [
  { id: "1", name: "orb_0dte", display_name: "ORB 0DTE", params: {}, efficacy_score: 78, win_rate: 0.65, profit_factor: 1.8, total_trades: 248, virtual_balance: 44200, last_updated: new Date().toISOString(), status: "active", consecutive_losses: 0, health_label: "Strong" },
  { id: "2", name: "vwap_reclaim", display_name: "VWAP Reclaim", params: {}, efficacy_score: 71, win_rate: 0.60, profit_factor: 1.6, total_trades: 192, virtual_balance: 43200, last_updated: new Date().toISOString(), status: "active", consecutive_losses: 1, health_label: "Strong" },
  { id: "3", name: "ema_cross_0dte", display_name: "EMA Cross 0DTE", params: {}, efficacy_score: 64, win_rate: 0.58, profit_factor: 1.5, total_trades: 176, virtual_balance: 42400, last_updated: new Date().toISOString(), status: "active", consecutive_losses: 0, health_label: "Steady" },
  { id: "4", name: "gex_flip", display_name: "GEX Flip", params: {}, efficacy_score: 74, win_rate: 0.62, profit_factor: 1.7, total_trades: 134, virtual_balance: 43600, last_updated: new Date().toISOString(), status: "active", consecutive_losses: 0, health_label: "Strong" },
  { id: "5", name: "iv_skew_play", display_name: "IV Skew Play", params: {}, efficacy_score: 58, win_rate: 0.55, profit_factor: 1.4, total_trades: 98, virtual_balance: 40800, last_updated: new Date().toISOString(), status: "paused", consecutive_losses: 2, health_label: "Cold" },
  { id: "6", name: "news_filter_momentum", display_name: "News Filter Momentum", params: {}, efficacy_score: 61, win_rate: 0.57, profit_factor: 1.45, total_trades: 112, virtual_balance: 41600, last_updated: new Date().toISOString(), status: "active", consecutive_losses: 0, health_label: "Steady" },
];

function tradePnl(t: QbTrade): number | null {
  if (
    t.status !== "closed" ||
    t.close_premium_pct == null ||
    t.entry_premium == null ||
    t.contracts == null
  )
    return null;
  const pct = Math.max(-500, Math.min(500, t.close_premium_pct));
  return (pct / 100) * t.entry_premium * t.contracts * 100;
}

export default function HomePage() {
  const [strategies, setStrategies] = useState<Strategy[]>(FALLBACK_STRATEGIES);
  const [trades, setTrades] = useState<QbTrade[]>([]);
  const [alertCount, setAlertCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [stratResult, tradeResult, alertResult] = await Promise.all([
          supabase.from("strategies").select("*").order("name"),
          supabase
            .from("qb_trades")
            .select("*")
            .order("opened_ts", { ascending: false })
            .limit(200),
          supabase
            .from("qb_alerts")
            .select("id", { count: "exact", head: true }),
        ]);

        if (!stratResult.error && stratResult.data?.length) {
          setStrategies(stratResult.data);
        }
        if (!tradeResult.error && tradeResult.data?.length) {
          setTrades(tradeResult.data);
        }
        if (!alertResult.error) {
          setAlertCount(alertResult.count ?? null);
        }
      } catch {
        // keep fallbacks
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Live stats from qb_trades
  const closed = trades.filter((t) => t.status === "closed");
  const open = trades.filter((t) => t.status === "open");
  const totalPnl = closed.reduce((sum, t) => sum + (tradePnl(t) ?? 0), 0);
  const bal = 40000 + totalPnl;
  const pnlPct = (totalPnl / 40000) * 100;
  const wins = closed.filter((t) => (tradePnl(t) ?? 0) > 0);
  const wr = closed.length ? (wins.length / closed.length) * 100 : null;

  // Today's P&L
  const todayStr = new Date().toDateString();
  const todayPnl = closed
    .filter((t) => t.closed_ts && new Date(t.closed_ts).toDateString() === todayStr)
    .reduce((sum, t) => sum + (tradePnl(t) ?? 0), 0);

  const hasLiveData = trades.length > 0;
  const activeCount = strategies.filter((s) => s.status === "active").length;

  const returnPositive = hasLiveData ? totalPnl >= 0 : true;
  const pnlPositive = todayPnl >= 0;

  return (
    <div>
      {/* Hero */}
      <div className="mb-8 pt-2">
        <p className="text-sm mb-2" style={{ color: "var(--muted)" }}>
          {hasLiveData
            ? `${trades.length} trades tracked · ${alertCount != null ? `${alertCount} alerts fired` : ""}`
            : `Paper portfolio · ${activeCount} strategies running`}
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white leading-none">
          {loading
            ? "Loading…"
            : returnPositive
            ? "Looking good."
            : "Needs attention."}
        </h1>
        <div className="mt-4 flex items-end gap-4 flex-wrap">
          <span
            className="text-4xl sm:text-5xl font-bold tabular-nums"
            style={{ color: "var(--accent)" }}
          >
            ${bal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            {hasLiveData && (
              <span
                className={`pill text-sm ${
                  returnPositive ? "pill-green" : "pill-red"
                }`}
              >
                {returnPositive ? "+" : ""}
                {pnlPct.toFixed(1)}% all-time
              </span>
            )}
            {todayPnl !== 0 && (
              <span
                className={`pill text-sm ${pnlPositive ? "pill-green" : "pill-red"}`}
              >
                {pnlPositive ? "+" : ""}${todayPnl.toFixed(0)} today
              </span>
            )}
            {open.length > 0 && (
              <span className="pill pill-yellow text-sm">
                {open.length} open
              </span>
            )}
          </div>
        </div>
        {hasLiveData ? (
          <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
            {wr != null && `Win rate ${wr.toFixed(0)}% · `}
            {wins.length}W / {closed.length - wins.length}L · {closed.length} closed trades
          </p>
        ) : (
          <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
            Sync running · run `bash ~/.quantbot/install_sync.command`
          </p>
        )}
      </div>

      {/* Section header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Strategies</h2>
        {loading && (
          <span
            className="flex items-center gap-1.5 text-xs"
            style={{ color: "var(--muted)" }}
          >
            <span className="h-3 w-3 animate-spin rounded-full border border-[#333] border-t-[#A8FF3E]" />
            Syncing
          </span>
        )}
      </div>

      {/* Strategy cards */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {strategies.map((s) => (
          <StrategyCard key={s.id} s={s} />
        ))}
      </div>
    </div>
  );
}
