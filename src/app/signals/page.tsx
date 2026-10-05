"use client";

import { useEffect, useState } from "react";
import { supabase, type Signal } from "@/lib/supabase";

const OUTCOME_PILL: Record<string, string> = {
  win: "pill-green", "hit target": "pill-green",
  loss: "pill-red", stopped: "pill-red",
  expired: "pill-gray", active: "pill-gray", pending: "pill-gray",
};
const OUTCOME_LABEL: Record<string, string> = {
  win: "Hit Target", "hit target": "Hit Target",
  loss: "Stopped", stopped: "Stopped",
  expired: "Expired", active: "Active", pending: "Pending",
};

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function SignalCard({ s }: { s: Signal }) {
  const outcome = s.outcome ?? "active";
  const pillClass = OUTCOME_PILL[outcome] ?? "pill-gray";
  const pos = (s.outcome_pnl ?? 0) > 0;

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-white">{s.ticker}</span>
          <span className={`pill ${s.direction === "CALL" ? "pill-green" : "pill-red"}`}>{s.direction}</span>
          {s.strike && <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>${s.strike}</span>}
        </div>
        <span className={`pill ${pillClass}`}>{OUTCOME_LABEL[outcome] ?? outcome}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { label: "Strategy", value: s.strategy ?? "—" },
          { label: "Expiry", value: s.expiry ?? "—" },
          { label: "Conf", value: s.confidence != null ? `${(s.confidence * 100).toFixed(0)}%` : "—" },
        ].map((m) => (
          <div key={m.label}>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--muted)" }}>{m.label}</p>
            <p className="text-xs font-medium text-white mt-0.5 truncate">{m.value}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-[#1E1E1E] pt-2.5">
        {s.outcome_pnl != null ? (
          <span className={`text-sm font-bold ${pos ? "text-[#A8FF3E]" : "text-[#FF4D4D]"}`}>
            {pos ? "+" : ""}${s.outcome_pnl.toFixed(2)}
          </span>
        ) : <span className="text-xs" style={{ color: "var(--muted)" }}>No P&L yet</span>}
        <span className="text-xs" style={{ color: "var(--muted)" }}>{timeAgo(s.fired_at)}</span>
      </div>
    </div>
  );
}

export default function SignalsPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "CALL" | "PUT">("all");

  useEffect(() => {
    async function load() {
      try {
        const { data, error: err } = await supabase.from("signals").select("*").order("fired_at", { ascending: false }).limit(50);
        if (err) throw err;
        setSignals(data ?? []);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally { setLoading(false); }
    }
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  const filtered = filter === "all" ? signals : signals.filter((s) => s.direction === filter);
  const closed = signals.filter((s) => s.outcome && s.outcome !== "active");
  const wins = closed.filter((s) => s.outcome === "win" || s.outcome === "hit target");
  const totalPnl = signals.reduce((sum, s) => sum + (s.outcome_pnl ?? 0), 0);

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#333] border-t-[#A8FF3E]" />
    </div>
  );

  return (
    <div>
      <div className="mb-8 pt-2">
        <p className="text-sm mb-2" style={{ color: "var(--muted)" }}>Live feed · refreshes every 30s</p>
        <h1 className="text-4xl font-bold tracking-tight text-white">Signal Feed</h1>
        {signals.length > 0 && (
          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <span className="text-4xl font-bold tabular-nums" style={{ color: "var(--accent)" }}>{signals.length}</span>
            <div className="flex gap-2 mb-1">
              <span className="pill pill-green text-sm">{closed.length > 0 ? `${((wins.length / closed.length) * 100).toFixed(0)}% win rate` : "No closed signals"}</span>
              <span className={`pill text-sm ${totalPnl >= 0 ? "pill-green" : "pill-red"}`}>
                {totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)} P&L
              </span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-[#3d1212] bg-[#1a0808] p-3 text-sm text-[#FF4D4D]">
          {error} — <button onClick={() => window.location.reload()} className="underline">retry</button>
        </div>
      )}

      <div className="mb-4 flex items-center gap-2">
        {(["all", "CALL", "PUT"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-all border ${
              filter === f ? "text-black border-[#A8FF3E]" : "border-[#262626] text-[#666] hover:text-white hover:border-[#444]"
            }`}
            style={filter === f ? { background: "#A8FF3E" } : {}}
          >
            {f === "all" ? "All" : f}
          </button>
        ))}
        <span className="ml-auto text-xs" style={{ color: "var(--muted)" }}>{filtered.length} signals</span>
      </div>

      {filtered.length === 0 ? (
        <div className="flex min-h-[40vh] items-center justify-center rounded-xl border border-dashed border-[#262626]">
          <div className="text-center p-8">
            <p className="text-3xl mb-3">📡</p>
            <p className="text-white">No signals yet.</p>
            <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>Signals appear here when Quantbot fires them.</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => <SignalCard key={s.id} s={s} />)}
        </div>
      )}
    </div>
  );
}
