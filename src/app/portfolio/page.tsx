"use client";

import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { supabase, type PaperTrade, type PortfolioSnapshot } from "@/lib/supabase";

const STARTING = 40000;

const STATIC_TRADES: PaperTrade[] = [
  { id: "t1", strategy: "ORB 0DTE", ticker: "SPY", direction: "CALL", entry_price: 1.45, size_dollars: 145, contracts: 1, opened_at: "2026-09-02T09:45:00Z", closed_at: "2026-09-02T11:30:00Z", pnl_dollars: 290, pnl_pct: 2.0, status: "closed", exit_reason: "target" },
  { id: "t2", strategy: "VWAP Reclaim", ticker: "QQQ", direction: "CALL", entry_price: 2.10, size_dollars: 210, contracts: 1, opened_at: "2026-09-04T10:15:00Z", closed_at: "2026-09-04T12:45:00Z", pnl_dollars: -105, pnl_pct: -0.5, status: "closed", exit_reason: "stop" },
  { id: "t3", strategy: "ORB 0DTE", ticker: "SPY", direction: "PUT", entry_price: 1.85, size_dollars: 370, contracts: 2, opened_at: "2026-09-09T09:45:00Z", closed_at: "2026-09-09T10:50:00Z", pnl_dollars: 560, pnl_pct: 1.51, status: "closed", exit_reason: "target" },
  { id: "t4", strategy: "GEX Flip", ticker: "SPY", direction: "CALL", entry_price: 3.20, size_dollars: 960, contracts: 3, opened_at: "2026-09-11T10:05:00Z", closed_at: "2026-09-11T13:15:00Z", pnl_dollars: 720, pnl_pct: 0.75, status: "closed", exit_reason: "target" },
  { id: "t5", strategy: "EMA Cross 0DTE", ticker: "QQQ", direction: "PUT", entry_price: 2.45, size_dollars: 490, contracts: 2, opened_at: "2026-09-15T09:50:00Z", closed_at: "2026-09-15T10:30:00Z", pnl_dollars: -245, pnl_pct: -0.5, status: "closed", exit_reason: "stop" },
  { id: "t6", strategy: "ORB 0DTE", ticker: "IWM", direction: "CALL", entry_price: 1.10, size_dollars: 110, contracts: 1, opened_at: "2026-09-18T09:45:00Z", closed_at: "2026-09-18T11:05:00Z", pnl_dollars: 220, pnl_pct: 2.0, status: "closed", exit_reason: "target" },
  { id: "t7", strategy: "IV Skew Play", ticker: "SPY", direction: "PUT", entry_price: 4.50, size_dollars: 450, contracts: 1, opened_at: "2026-09-22T09:55:00Z", closed_at: "2026-09-22T14:00:00Z", pnl_dollars: 630, pnl_pct: 1.4, status: "closed", exit_reason: "target" },
  { id: "t8", strategy: "News Filter", ticker: "QQQ", direction: "CALL", entry_price: 1.75, size_dollars: 175, contracts: 1, opened_at: "2026-09-25T10:05:00Z", closed_at: "2026-09-25T11:35:00Z", pnl_dollars: -88, pnl_pct: -0.5, status: "closed", exit_reason: "stop" },
  { id: "t9", strategy: "VWAP Reclaim", ticker: "SPY", direction: "CALL", entry_price: 2.80, size_dollars: 840, contracts: 3, opened_at: "2026-09-29T10:20:00Z", closed_at: "2026-09-29T13:00:00Z", pnl_dollars: 1080, pnl_pct: 1.29, status: "closed", exit_reason: "target" },
  { id: "t10", strategy: "GEX Flip", ticker: "SPY", direction: "PUT", entry_price: 3.60, size_dollars: 720, contracts: 2, opened_at: "2026-10-02T09:48:00Z", closed_at: "2026-10-02T11:10:00Z", pnl_dollars: 360, pnl_pct: 0.5, status: "closed", exit_reason: "target" },
];

const STATIC_SNAPS: PortfolioSnapshot[] = (() => {
  let b = STARTING;
  return STATIC_TRADES.map((t, i) => {
    b += t.pnl_dollars ?? 0;
    return { id: String(i), snapshot_date: t.closed_at ?? t.opened_at, balance: Math.round(b), total_return_pct: ((b - STARTING) / STARTING) * 100, daily_pnl: t.pnl_dollars, win_rate: 0.6, profit_factor: 1.62, total_trades: i + 1 };
  });
})();

const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

const Tooltip_ = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#262626] bg-[#161616] p-3 shadow-xl text-xs">
      <p style={{ color: "var(--muted)" }} className="mb-1">{label}</p>
      <p className="font-bold text-white">${payload[0].value.toLocaleString()}</p>
    </div>
  );
};

export default function PortfolioPage() {
  const [trades, setTrades] = useState<PaperTrade[]>(STATIC_TRADES);
  const [snaps, setSnaps] = useState<PortfolioSnapshot[]>(STATIC_SNAPS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [tr, sr] = await Promise.all([
          supabase.from("paper_trades").select("*").order("opened_at", { ascending: false }).limit(50),
          supabase.from("portfolio_snapshots").select("*").order("snapshot_date", { ascending: true }).limit(30),
        ]);
        if (!tr.error && tr.data?.length) setTrades(tr.data);
        if (!sr.error && sr.data?.length) setSnaps(sr.data);
      } catch { /* use fallback */ }
      finally { setLoading(false); }
    })();
  }, []);

  const bal = snaps.at(-1)?.balance ?? STARTING;
  const pnl = bal - STARTING;
  const pnlPct = (pnl / STARTING) * 100;
  const closed = trades.filter((t) => t.status === "closed");
  const wins = closed.filter((t) => (t.pnl_dollars ?? 0) > 0);
  const wr = closed.length ? (wins.length / closed.length) * 100 : 0;
  const peak = Math.max(...snaps.map((s) => s.balance), bal);
  const dd = peak ? ((peak - bal) / peak) * 100 : 0;

  const chartData = [
    { date: "Start", balance: STARTING },
    ...snaps.map((s) => ({ date: fmt(s.snapshot_date), balance: s.balance })),
  ];

  return (
    <div>
      {/* Hero */}
      <div className="mb-8 pt-2">
        <p className="text-sm mb-2" style={{ color: "var(--muted)" }}>Paper trading · started $40,000</p>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white leading-none">
          {pnl >= 0 ? "Up and running." : "In drawdown."}
        </h1>
        <div className="mt-4 flex items-end gap-4 flex-wrap">
          <span className="text-4xl sm:text-5xl font-bold tabular-nums" style={{ color: "var(--accent)" }}>
            ${bal.toLocaleString()}
          </span>
          <div className="flex items-center gap-2 mb-1">
            <span className={`pill text-sm ${pnl >= 0 ? "pill-green" : "pill-red"}`}>
              {pnl >= 0 ? "+" : ""}${pnl.toLocaleString()} ({pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(1)}%)
            </span>
          </div>
        </div>
        <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
          Win rate {wr.toFixed(0)}% · {wins.length}W / {closed.length - wins.length}L · Drawdown {dd.toFixed(1)}%
        </p>
      </div>

      {/* Equity curve */}
      <div className="card p-5 mb-6">
        <p className="text-sm font-medium text-white mb-4">Equity Curve</p>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" />
              <XAxis dataKey="date" tick={{ fill: "#555", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#555", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} domain={["auto", "auto"]} />
              <Tooltip content={<Tooltip_ />} />
              <ReferenceLine y={STARTING} stroke="#333" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="balance" stroke="#A8FF3E" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#A8FF3E" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Trade ledger */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1E1E1E] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Trade Ledger</h2>
          <span className="text-xs" style={{ color: "var(--muted)" }}>{trades.length} trades{loading && " · syncing…"}</span>
        </div>
        {/* Desktop */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1E1E1E]">
                {["Date", "Ticker", "Strategy", "Dir", "×", "Entry", "P&L", "Result"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] uppercase tracking-wider font-medium" style={{ color: "var(--muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trades.map((t) => {
                const pos = (t.pnl_dollars ?? 0) > 0;
                return (
                  <tr key={t.id} className="border-b border-[#0D0D0D] hover:bg-[#161616] transition-colors">
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--muted)" }}>{fmt(t.opened_at)}</td>
                    <td className="px-4 py-3 font-semibold text-white">{t.ticker}</td>
                    <td className="px-4 py-3 text-xs truncate max-w-[90px]" style={{ color: "var(--muted)" }}>{t.strategy}</td>
                    <td className="px-4 py-3">
                      <span className={`pill ${t.direction === "CALL" ? "pill-green" : "pill-red"}`}>{t.direction}</span>
                    </td>
                    <td className="px-4 py-3 text-white">{t.contracts}</td>
                    <td className="px-4 py-3 font-mono text-white">${t.entry_price.toFixed(2)}</td>
                    <td className={`px-4 py-3 font-semibold ${pos ? "text-[#A8FF3E]" : "text-[#FF4D4D]"}`}>
                      {t.pnl_dollars != null ? `${pos ? "+" : ""}$${t.pnl_dollars.toFixed(0)}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`pill ${pos ? "pill-green" : "pill-red"}`}>
                        {t.exit_reason === "target" ? "Target" : t.exit_reason === "stop" ? "Stopped" : t.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Mobile */}
        <div className="sm:hidden divide-y divide-[#1E1E1E]">
          {trades.map((t) => {
            const pos = (t.pnl_dollars ?? 0) > 0;
            return (
              <div key={t.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{t.ticker}</span>
                    <span className={`pill ${t.direction === "CALL" ? "pill-green" : "pill-red"}`}>{t.direction}</span>
                    <span className="text-xs" style={{ color: "var(--muted)" }}>{t.contracts}×</span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{t.strategy} · {fmt(t.opened_at)}</p>
                </div>
                <span className={`text-sm font-bold ${pos ? "text-[#A8FF3E]" : "text-[#FF4D4D]"}`}>
                  {t.pnl_dollars != null ? `${pos ? "+" : ""}$${t.pnl_dollars.toFixed(0)}` : "—"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
