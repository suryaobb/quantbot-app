"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { supabase, type QbTrade } from "@/lib/supabase";

const STARTING = 40000;

// Cap close_premium_pct at ±500% — values beyond this are data errors
// (e.g. illiquid EOD option prints that don't reflect a real fill).
const MAX_PCT = 500;

/** P&L in dollars for a closed trade. Returns null for open trades. */
function tradePnl(t: QbTrade): number | null {
  if (
    t.status !== "closed" ||
    t.close_premium_pct == null ||
    t.entry_premium == null ||
    t.contracts == null
  )
    return null;
  const pct = Math.max(-MAX_PCT, Math.min(MAX_PCT, t.close_premium_pct));
  return (pct / 100) * t.entry_premium * t.contracts * 100;
}

/** True if this trade's close_pct was capped (data likely unreliable). */
function isCapped(t: QbTrade): boolean {
  return t.close_premium_pct != null && Math.abs(t.close_premium_pct) > MAX_PCT;
}

function isWin(t: QbTrade): boolean {
  const p = tradePnl(t);
  return p != null && p > 0;
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

const ChartTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#262626] bg-[#161616] p-3 shadow-xl text-xs">
      <p style={{ color: "var(--muted)" }} className="mb-1">
        {label}
      </p>
      <p className="font-bold text-white">${payload[0].value.toLocaleString()}</p>
    </div>
  );
};

function ReasonBadge({ reason }: { reason: string | null }) {
  if (!reason) return <span className="pill pill-gray">—</span>;
  if (reason === "target") return <span className="pill pill-green">Target</span>;
  if (reason === "stop") return <span className="pill pill-red">Stopped</span>;
  if (reason === "be_stop") return <span className="pill pill-yellow">BE Stop</span>;
  return <span className="pill pill-gray">{reason}</span>;
}

export default function PortfolioPage() {
  const [trades, setTrades] = useState<QbTrade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from("qb_trades")
          .select("*")
          .order("opened_ts", { ascending: false })
          .limit(200);
        if (data && data.length > 0) setTrades(data);
      } catch {
        /* stay empty */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Derive stats
  const closed = trades.filter((t) => t.status === "closed");
  const open = trades.filter((t) => t.status === "open");
  const wins = closed.filter(isWin);
  const wr = closed.length ? (wins.length / closed.length) * 100 : 0;
  const totalPnl = closed.reduce((sum, t) => sum + (tradePnl(t) ?? 0), 0);
  const bal = STARTING + totalPnl;
  const pnlPct = (totalPnl / STARTING) * 100;

  // Equity curve: sorted by closed_ts, cumulative
  const sortedClosed = [...closed]
    .filter((t) => t.closed_ts)
    .sort(
      (a, b) => new Date(a.closed_ts!).getTime() - new Date(b.closed_ts!).getTime()
    );
  let running = STARTING;
  const chartData = [
    { date: "Start", balance: STARTING },
    ...sortedClosed.map((t) => {
      running += tradePnl(t) ?? 0;
      return { date: fmt(t.closed_ts!), balance: Math.round(running) };
    }),
  ];

  const peak = Math.max(...chartData.map((d) => d.balance), STARTING);
  const dd = peak > STARTING ? ((peak - bal) / peak) * 100 : 0;

  // Gross profit / gross loss for profit factor
  const grossProfit = wins.reduce((s, t) => s + (tradePnl(t) ?? 0), 0);
  const grossLoss = Math.abs(
    closed.filter((t) => !isWin(t)).reduce((s, t) => s + (tradePnl(t) ?? 0), 0)
  );
  const pf = grossLoss > 0 ? grossProfit / grossLoss : null;

  return (
    <div>
      {/* Hero */}
      <div className="mb-8 pt-2">
        <p className="text-sm mb-2" style={{ color: "var(--muted)" }}>
          Live trades · started $40,000
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white leading-none">
          {loading ? "Loading…" : totalPnl >= 0 ? "Up and running." : "In drawdown."}
        </h1>
        <div className="mt-4 flex items-end gap-4 flex-wrap">
          <span
            className="text-4xl sm:text-5xl font-bold tabular-nums"
            style={{ color: "var(--accent)" }}
          >
            ${bal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`pill text-sm ${totalPnl >= 0 ? "pill-green" : "pill-red"}`}
            >
              {totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(0)} (
              {pnlPct >= 0 ? "+" : ""}
              {pnlPct.toFixed(1)}%)
            </span>
            {open.length > 0 && (
              <span className="pill pill-yellow text-sm">
                {open.length} open
              </span>
            )}
          </div>
        </div>
        <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
          Win rate {wr.toFixed(0)}% · {wins.length}W / {closed.length - wins.length}L
          {pf != null && ` · PF ${pf.toFixed(2)}`}
          {dd > 0.1 && ` · DD ${dd.toFixed(1)}%`}
        </p>
      </div>

      {/* Equity curve */}
      {chartData.length > 1 && (
        <div className="card p-5 mb-6">
          <p className="text-sm font-medium text-white mb-4">Equity Curve</p>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 4, right: 0, bottom: 0, left: -20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#555", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: "#555", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  domain={["auto", "auto"]}
                />
                <Tooltip content={<ChartTooltip />} />
                <ReferenceLine y={STARTING} stroke="#333" strokeDasharray="4 4" />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke={totalPnl >= 0 ? "#A8FF3E" : "#FF4D4D"}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: "#A8FF3E" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Open trades */}
      {open.length > 0 && (
        <div className="card overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-[#1E1E1E]">
            <h2 className="text-sm font-semibold text-white">
              Open Positions{" "}
              <span className="pill pill-yellow ml-2">{open.length} live</span>
            </h2>
          </div>
          <div className="divide-y divide-[#1E1E1E]">
            {open.map((t) => (
              <div
                key={t.id}
                className="px-5 py-3 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{t.symbol}</span>
                    <span
                      className={`pill ${
                        t.direction === "long" ? "pill-green" : "pill-red"
                      }`}
                    >
                      {t.direction === "long" ? "CALL" : "PUT"}
                    </span>
                    <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>
                      {t.contract ?? "—"}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                    {t.contracts}× @ ${t.entry_premium?.toFixed(2)} ·{" "}
                    {fmt(t.opened_ts)}
                    {t.trimmed_ts && " · ✂ trimmed"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs" style={{ color: "var(--muted)" }}>Risk</p>
                  <p className="text-sm font-semibold text-white">
                    ${t.risk_dollars?.toFixed(0) ?? "—"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Closed trade ledger */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1E1E1E] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Trade Ledger</h2>
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            {closed.length} closed{loading && " · syncing…"}
          </span>
        </div>

        {/* Empty state */}
        {trades.length === 0 && !loading && (
          <div className="flex min-h-[20vh] items-center justify-center p-8">
            <div className="text-center">
              <p className="text-3xl mb-3">📊</p>
              <p className="text-white">No trades synced yet.</p>
              <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
                Run `bash ~/.quantbot/install_sync.command` to backfill.
              </p>
            </div>
          </div>
        )}

        {/* Desktop table */}
        {closed.length > 0 && (
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1E1E1E]">
                  {[
                    "Date",
                    "Symbol",
                    "Dir",
                    "Contract",
                    "×",
                    "Entry $",
                    "Close %",
                    "P&L",
                    "Result",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-[10px] uppercase tracking-wider font-medium"
                      style={{ color: "var(--muted)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...closed]
                  .sort(
                    (a, b) =>
                      new Date(b.opened_ts).getTime() -
                      new Date(a.opened_ts).getTime()
                  )
                  .map((t) => {
                    const pnl = tradePnl(t);
                    const pos = (pnl ?? 0) > 0;
                    return (
                      <tr
                        key={t.id}
                        className="border-b border-[#0D0D0D] hover:bg-[#161616] transition-colors"
                      >
                        <td
                          className="px-4 py-3 text-xs"
                          style={{ color: "var(--muted)" }}
                        >
                          {fmt(t.opened_ts)}
                        </td>
                        <td className="px-4 py-3 font-semibold text-white">
                          {t.symbol}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`pill ${
                              t.direction === "long" ? "pill-green" : "pill-red"
                            }`}
                          >
                            {t.direction === "long" ? "CALL" : "PUT"}
                          </span>
                        </td>
                        <td
                          className="px-4 py-3 text-xs font-mono max-w-[80px] truncate"
                          style={{ color: "var(--muted)" }}
                        >
                          {t.contract ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-white">{t.contracts}</td>
                        <td className="px-4 py-3 font-mono text-white">
                          ${t.entry_premium?.toFixed(2) ?? "—"}
                        </td>
                        <td
                          className={`px-4 py-3 font-mono ${
                            t.close_premium_pct != null
                              ? t.close_premium_pct >= 0
                                ? "text-[#A8FF3E]"
                                : "text-[#FF4D4D]"
                              : ""
                          }`}
                          style={
                            t.close_premium_pct == null
                              ? { color: "var(--muted)" }
                              : {}
                          }
                        >
                          {t.close_premium_pct != null
                            ? `${t.close_premium_pct >= 0 ? "+" : ""}${t.close_premium_pct.toFixed(1)}%${isCapped(t) ? " ⚠" : ""}`
                            : "—"}
                        </td>
                        <td
                          className={`px-4 py-3 font-semibold ${
                            pnl != null
                              ? pos
                                ? "text-[#A8FF3E]"
                                : "text-[#FF4D4D]"
                              : ""
                          }`}
                          style={pnl == null ? { color: "var(--muted)" } : {}}
                        >
                          {pnl != null
                            ? `${pos ? "+" : ""}$${Math.abs(pnl).toFixed(0)}`
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <ReasonBadge reason={t.close_reason} />
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}

        {/* Mobile list */}
        {closed.length > 0 && (
          <div className="sm:hidden divide-y divide-[#1E1E1E]">
            {[...closed]
              .sort(
                (a, b) =>
                  new Date(b.opened_ts).getTime() -
                  new Date(a.opened_ts).getTime()
              )
              .map((t) => {
                const pnl = tradePnl(t);
                const pos = (pnl ?? 0) > 0;
                return (
                  <div
                    key={t.id}
                    className="px-4 py-3 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{t.symbol}</span>
                        <span
                          className={`pill ${
                            t.direction === "long" ? "pill-green" : "pill-red"
                          }`}
                        >
                          {t.direction === "long" ? "CALL" : "PUT"}
                        </span>
                        <span className="text-xs" style={{ color: "var(--muted)" }}>
                          {t.contracts}×
                        </span>
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                        {t.close_reason ?? "—"} · {fmt(t.opened_ts)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-bold ${
                          pnl != null
                            ? pos
                              ? "text-[#A8FF3E]"
                              : "text-[#FF4D4D]"
                            : ""
                        }`}
                        style={pnl == null ? { color: "var(--muted)" } : {}}
                      >
                        {pnl != null
                          ? `${pos ? "+" : ""}$${Math.abs(pnl).toFixed(0)}`
                          : "—"}
                      </p>
                      {t.close_premium_pct != null && (
                        <p
                          className="text-[10px]"
                          style={{ color: "var(--muted)" }}
                        >
                          {t.close_premium_pct >= 0 ? "+" : ""}
                          {t.close_premium_pct.toFixed(1)}%
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
