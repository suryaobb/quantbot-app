"use client";

import { useEffect, useState } from "react";

type Status = "running" | "idle" | "error" | "warning";

const DOT: Record<Status, string> = {
  running: "bg-[#A8FF3E]", idle: "bg-[#555]", error: "bg-[#FF4D4D]", warning: "bg-[#F59E0B]",
};
const LABEL: Record<Status, string> = {
  running: "Running", idle: "Idle", error: "Error", warning: "Degraded",
};
const LABEL_COLOR: Record<Status, string> = {
  running: "#A8FF3E", idle: "#666", error: "#FF4D4D", warning: "#F59E0B",
};

type Component = {
  id: string; name: string; desc: string; status: Status;
  ping?: string; metrics?: { k: string; v: string }[];
  agents?: { name: string; desc: string; status: Status }[];
};

const SYSTEMS: Component[] = [
  { id: "brain", name: "Brain", desc: "Central orchestration engine. Coordinates all agents and manages signal lifecycle.", status: "running",
    ping: new Date().toISOString(), metrics: [{ k: "Uptime", v: "14d 6h" }, { k: "Decisions/day", v: "127" }, { k: "Latency", v: "42ms" }] },
  { id: "discovery", name: "Discovery Engine", desc: "Scans market data for setup candidates across SPY, QQQ, IWM and sector ETFs.", status: "running",
    ping: new Date(Date.now() - 12000).toISOString(), metrics: [{ k: "Scanned/min", v: "186" }, { k: "Candidates", v: "14" }, { k: "Hit rate", v: "7.5%" }] },
  { id: "agents", name: "Multi-Agent Fleet", desc: "5 specialized AI agents running in parallel, each trained on a specific strategy edge.", status: "running",
    metrics: [{ k: "Active", v: "4 / 5" }, { k: "Signals today", v: "23" }, { k: "Consensus", v: "71%" }],
    agents: [
      { name: "Momentum Agent", desc: "Scans for momentum signals on SPY/QQQ", status: "running" },
      { name: "Mean Reversion Agent", desc: "Detects VWAP reclaim and fade setups", status: "running" },
      { name: "GEX Monitor Agent", desc: "Tracks dealer gamma exposure shifts", status: "running" },
      { name: "IV Skew Agent", desc: "Monitors put/call IV skew for smart money", status: "warning" },
      { name: "News Filter Agent", desc: "Filters Fed/CPI windows, catches post-news momentum", status: "running" },
    ]},
  { id: "quant_lab", name: "Quant Lab", desc: "Hypothesis generation and backtest validation. Continuously discovers new edges.", status: "idle",
    ping: new Date(Date.now() - 1800000).toISOString(), metrics: [{ k: "Hypotheses tested", v: "342" }, { k: "Validated edges", v: "6" }, { k: "Last run", v: "30m ago" }] },
  { id: "discord", name: "Discord Pipeline", desc: "Sends trade signals and alerts to Discord channels for real-time monitoring.", status: "running",
    ping: new Date(Date.now() - 5000).toISOString(), metrics: [{ k: "Messages/day", v: "48" }, { k: "Latency", v: "180ms" }, { k: "Delivery", v: "99.8%" }] },
  { id: "circuit_breaker", name: "Circuit Breaker", desc: "Halts trading when drawdown limits, VIX thresholds, or consecutive loss limits are hit.", status: "running",
    metrics: [{ k: "Max DD", v: "8.0%" }, { k: "Current DD", v: "1.6%" }, { k: "Consec. losses", v: "0" }, { k: "VIX threshold", v: "30" }] },
];

function pingAge(iso?: string) {
  if (!iso) return "—";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function SystemCard({ c }: { c: Component }) {
  const [open, setOpen] = useState(c.id === "agents");

  return (
    <div className="card p-5">
      <div className="flex items-start gap-3 cursor-pointer" onClick={() => c.agents && setOpen((x) => !x)}>
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT[c.status]} ${c.status === "running" ? "shadow-[0_0_8px_#A8FF3E]" : ""}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-white">{c.name}</h3>
            <span className="text-xs font-medium" style={{ color: LABEL_COLOR[c.status] }}>{LABEL[c.status]}</span>
            {c.ping && <span className="text-xs" style={{ color: "var(--muted)" }}>· {pingAge(c.ping)}</span>}
          </div>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>{c.desc}</p>
        </div>
        {c.agents && <span className="text-xs" style={{ color: "var(--muted)" }}>{open ? "▲" : "▼"}</span>}
      </div>

      {c.metrics && (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {c.metrics.map((m) => (
            <div key={m.k} className="rounded-lg p-2.5" style={{ background: "var(--surface2)" }}>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--muted)" }}>{m.k}</p>
              <p className="mt-0.5 text-sm font-semibold text-white">{m.v}</p>
            </div>
          ))}
        </div>
      )}

      {c.agents && open && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {c.agents.map((a) => (
            <div key={a.name} className="rounded-lg border border-[#1E1E1E] p-3" style={{ background: "var(--bg)" }}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`h-1.5 w-1.5 rounded-full ${DOT[a.status]}`} />
                <span className="text-xs font-semibold text-white">{a.name}</span>
                <span className="ml-auto text-[10px] font-medium" style={{ color: LABEL_COLOR[a.status] }}>{LABEL[a.status]}</span>
              </div>
              <p className="text-[11px]" style={{ color: "var(--muted)" }}>{a.desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BrainPage() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(t);
  }, []);

  const running = SYSTEMS.filter((s) => s.status === "running").length;

  return (
    <div>
      <div className="mb-8 pt-2">
        <p className="text-sm mb-2" style={{ color: "var(--muted)" }}>
          {running}/{SYSTEMS.length} systems online · {now.toLocaleTimeString("en-US", { hour12: false })} EDT
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-white">Mission Control</h1>
        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <span className="text-4xl font-bold" style={{ color: "var(--accent)" }}>{running}/{SYSTEMS.length}</span>
          <div className="flex gap-2 mb-1">
            <span className="pill pill-green text-sm">Operational</span>
            <span className="pill pill-gray text-sm">Drawdown 1.6%</span>
            <span className="pill pill-gray text-sm">4 / 5 agents</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {SYSTEMS.map((c) => <SystemCard key={c.id} c={c} />)}
      </div>
    </div>
  );
}
