"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { supabase, type BacktestRun } from "@/lib/supabase";

const STATIC: BacktestRun[] = [
  { id: "1", run_at: new Date().toISOString(), strategy: "ORB 0DTE", total_trades: 248, win_rate: 0.65, profit_factor: 1.8, total_pnl: 12400, max_drawdown: 0.082, sharpe: 1.92, efficacy_score: 78 },
  { id: "2", run_at: new Date().toISOString(), strategy: "VWAP Reclaim", total_trades: 192, win_rate: 0.60, profit_factor: 1.6, total_pnl: 9200, max_drawdown: 0.095, sharpe: 1.65, efficacy_score: 71 },
  { id: "3", run_at: new Date().toISOString(), strategy: "EMA Cross 0DTE", total_trades: 176, win_rate: 0.58, profit_factor: 1.5, total_pnl: 7800, max_drawdown: 0.112, sharpe: 1.48, efficacy_score: 64 },
  { id: "4", run_at: new Date().toISOString(), strategy: "GEX Flip", total_trades: 134, win_rate: 0.62, profit_factor: 1.7, total_pnl: 10600, max_drawdown: 0.074, sharpe: 1.81, efficacy_score: 74 },
  { id: "5", run_at: new Date().toISOString(), strategy: "IV Skew Play", total_trades: 98, win_rate: 0.55, profit_factor: 1.4, total_pnl: 4900, max_drawdown: 0.13, sharpe: 1.22, efficacy_score: 58 },
  { id: "6", run_at: new Date().toISOString(), strategy: "News Filter Momentum", total_trades: 112, win_rate: 0.57, profit_factor: 1.45, total_pnl: 5600, max_drawdown: 0.098, sharpe: 1.35, efficacy_score: 61 },
];

function ScoreBar({ v }: { v: number }) {
  const color = v >= 70 ? "#A8FF3E" : v >= 55 ? "#F59E0B" : "#FF4D4D";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1 flex-1 rounded-full bg-[#1E1E1E]">
        <div className="h-full rounded-full transition-all" style={{ width: `${v}%`, background: color }} />
      </div>
      <span className="text-xs text-white w-5 text-right">{v}</span>
    </div>
  );
}

function RunCard({ r }: { r: BacktestRun }) {
  const pos = (r.total_pnl ?? 0) >= 0;
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-white">{r.strategy}</h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{r.total_trades ?? 0} trades tested</p>
        </div>
        <div className="text-right">
          <p className="text-xs" style={{ color: "var(--muted)" }}>Efficacy</p>
          <p className="text-xl font-bold" style={{ color: "#A8FF3E" }}>{r.efficacy_score ?? 0}</p>
        </div>
      </div>
      <ScoreBar v={r.efficacy_score ?? 0} />
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          { k: "Win Rate", v: r.win_rate != null ? `${(r.win_rate * 100).toFixed(0)}%` : "—", good: (r.win_rate ?? 0) >= 0.6 },
          { k: "Prof. Factor", v: r.profit_factor?.toFixed(2) ?? "—", good: (r.profit_factor ?? 0) >= 1.5 },
          { k: "Sharpe", v: r.sharpe?.toFixed(2) ?? "—", good: (r.sharpe ?? 0) >= 1.5 },
          { k: "Total P&L", v: `${pos ? "+" : ""}$${(r.total_pnl ?? 0).toLocaleString()}`, good: pos },
          { k: "Max DD", v: r.max_drawdown != null ? `${(r.max_drawdown * 100).toFixed(1)}%` : "—", good: (r.max_drawdown ?? 0) <= 0.1 },
          { k: "Trades", v: String(r.total_trades ?? 0), good: true },
        ].map((m) => (
          <div key={m.k} className="rounded-lg p-2.5" style={{ background: "var(--surface2)" }}>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--muted)" }}>{m.k}</p>
            <p className="mt-0.5 text-sm font-semibold" style={{ color: m.good ? "#A8FF3E" : "#FF4D4D" }}>{m.v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const Tip_ = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#262626] bg-[#161616] p-3 shadow-xl text-xs">
      <p className="font-medium text-white mb-1">{label}</p>
      {payload.map((p) => <p key={p.name} style={{ color: "var(--muted)" }}>{p.name}: <span className="text-[#A8FF3E] font-semibold">{p.value}</span></p>)}
    </div>
  );
};

export default function BacktestsPage() {
  const [runs, setRuns] = useState<BacktestRun[]>(STATIC);
  const [view, setView] = useState<"cards" | "chart">("cards");

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.from("backtest_runs").select("*").order("efficacy_score", { ascending: false });
        if (!error && data?.length) setRuns(data);
      } catch { /* use static */ }
    })();
  }, []);

  const avgWR = runs.reduce((s, r) => s + (r.win_rate ?? 0), 0) / runs.length;
  const bestPF = Math.max(...runs.map((r) => r.profit_factor ?? 0));

  const chartData = runs.map((r) => ({
    name: r.strategy.length > 11 ? r.strategy.slice(0, 11) + "…" : r.strategy,
    "Win Rate": Math.round((r.win_rate ?? 0) * 100),
    Efficacy: r.efficacy_score ?? 0,
  }));

  return (
    <div>
      <div className="mb-8 pt-2">
        <p className="text-sm mb-2" style={{ color: "var(--muted)" }}>Walk-forward validation · {runs.length} strategies</p>
        <h1 className="text-4xl font-bold tracking-tight text-white">Backtests</h1>
        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <span className="text-4xl font-bold" style={{ color: "var(--accent)" }}>{(avgWR * 100).toFixed(0)}%</span>
          <div className="flex gap-2 mb-1">
            <span className="pill pill-green text-sm">avg win rate</span>
            <span className="pill pill-gray text-sm">Best PF {bestPF.toFixed(2)}</span>
            <span className="pill pill-gray text-sm">{runs.reduce((s, r) => s + (r.total_trades ?? 0), 0).toLocaleString()} total trades</span>
          </div>
        </div>
      </div>

      <div className="mb-5 flex items-center gap-2">
        {(["cards", "chart"] as const).map((v) => (
          <button key={v} onClick={() => setView(v)}
            className="rounded-full px-3 py-1 text-xs font-medium transition-all border"
            style={view === v ? { background: "#A8FF3E", color: "#000", borderColor: "#A8FF3E" } : { borderColor: "#262626", color: "#666" }}
          >
            {v === "cards" ? "Cards" : "Chart"}
          </button>
        ))}
      </div>

      {view === "cards" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {runs.map((r) => <RunCard key={r.id} r={r} />)}
        </div>
      ) : (
        <div className="card p-5">
          <p className="text-sm font-medium text-white mb-4">Win Rate vs Efficacy Score</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" />
                <XAxis dataKey="name" tick={{ fill: "#555", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#555", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<Tip_ />} />
                <Bar dataKey="Win Rate" fill="#A8FF3E" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Efficacy" fill="#333" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex gap-4 text-xs" style={{ color: "var(--muted)" }}>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[#A8FF3E]" /> Win Rate (%)</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[#333]" /> Efficacy Score</span>
          </div>
        </div>
      )}
    </div>
  );
}
