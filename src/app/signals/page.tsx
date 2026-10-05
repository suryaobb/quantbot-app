"use client";

import { useEffect, useState } from "react";
import { supabase, type QbAlert } from "@/lib/supabase";

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

const TIER_PILL: Record<string, string> = {
  GO: "pill-green",
  WATCH: "pill-yellow",
  SUPPRESSED: "pill-gray",
};

const TIER_ICON: Record<string, string> = {
  GO: "🟢",
  WATCH: "🟡",
  SUPPRESSED: "⚫",
};

function AlertCard({ a }: { a: QbAlert }) {
  const [expanded, setExpanded] = useState(false);
  const direction = a.direction === "long" ? "CALL" : "PUT";
  const tierPill = TIER_PILL[a.tier] ?? "pill-gray";
  const tier = a.tier ?? "—";

  // Strip Telegram markdown chars for readable preview
  const cleanMsg = a.message
    ? a.message.replace(/[*_`[\]()~>#+=|{}!\\]/g, "").trim()
    : null;
  const preview = cleanMsg ? cleanMsg.slice(0, 130) : null;
  const hasMore = cleanMsg && cleanMsg.length > 130;

  return (
    <div className="card p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base font-bold text-white">{a.symbol}</span>
          <span className={`pill ${direction === "CALL" ? "pill-green" : "pill-red"}`}>
            {direction}
          </span>
          <span className={`pill ${tierPill}`}>
            {TIER_ICON[tier]} {tier}
          </span>
        </div>
        <span className="text-xs shrink-0 ml-2" style={{ color: "var(--muted)" }}>
          {timeAgo(a.ts)}
        </span>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {[
          { label: "Score", value: a.score != null ? String(a.score) : "—" },
          { label: "Price", value: a.price != null ? `$${a.price.toFixed(2)}` : "—" },
          { label: "VIX", value: a.vix != null ? a.vix.toFixed(1) : "—" },
          { label: "RVOL", value: a.rvol != null ? `${a.rvol.toFixed(1)}×` : "—" },
        ].map((m) => (
          <div key={m.label}>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--muted)" }}>
              {m.label}
            </p>
            <p className="text-xs font-semibold text-white mt-0.5">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Score bar */}
      {a.score != null && (
        <div className="mb-3">
          <div className="h-1 rounded-full bg-[#1E1E1E] overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${a.score}%`,
                background:
                  a.score >= 70 ? "#A8FF3E" : a.score >= 50 ? "#F59E0B" : "#FF4D4D",
              }}
            />
          </div>
        </div>
      )}

      {/* Message preview */}
      {preview && (
        <div className="border-t border-[#1E1E1E] pt-2.5">
          <p
            className="text-xs leading-relaxed"
            style={{ color: "var(--muted)" }}
          >
            {expanded ? cleanMsg : `${preview}${hasMore ? "…" : ""}`}
          </p>
          {hasMore && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-[10px] mt-1.5 font-medium"
              style={{ color: "var(--accent)" }}
            >
              {expanded ? "Show less" : "Show more"}
            </button>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-[#1E1E1E]">
        <span className="text-[10px] font-mono" style={{ color: "var(--muted)" }}>
          {new Date(a.ts).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
        {a.delivered && (
          <span
            className="text-[10px] flex items-center gap-1"
            style={{ color: "var(--muted)" }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#A8FF3E]" />
            Delivered
          </span>
        )}
      </div>
    </div>
  );
}

type TierFilter = "ALL" | "GO" | "WATCH" | "SUPPRESSED";

export default function SignalsPage() {
  const [alerts, setAlerts] = useState<QbAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<TierFilter>("ALL");

  useEffect(() => {
    async function load() {
      try {
        const { data, error: err } = await supabase
          .from("qb_alerts")
          .select("*")
          .order("ts", { ascending: false })
          .limit(150);
        if (err) throw err;
        setAlerts(data ?? []);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  const filtered =
    filter === "ALL" ? alerts : alerts.filter((a) => a.tier === filter);
  const goCount = alerts.filter((a) => a.tier === "GO").length;
  const watchCount = alerts.filter((a) => a.tier === "WATCH").length;

  if (loading)
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#333] border-t-[#A8FF3E]" />
      </div>
    );

  return (
    <div>
      <div className="mb-8 pt-2">
        <p className="text-sm mb-2" style={{ color: "var(--muted)" }}>
          Quantbot alerts · refreshes every 30s
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-white">
          Signal Feed
        </h1>
        {alerts.length > 0 && (
          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <span
              className="text-4xl font-bold tabular-nums"
              style={{ color: "var(--accent)" }}
            >
              {alerts.length}
            </span>
            <div className="flex gap-2 mb-1">
              <span className="pill pill-green text-sm">🟢 {goCount} GO</span>
              <span className="pill pill-yellow text-sm">🟡 {watchCount} WATCH</span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-[#3d1212] bg-[#1a0808] p-3 text-sm text-[#FF4D4D]">
          {error} —{" "}
          <button onClick={() => window.location.reload()} className="underline">
            retry
          </button>
        </div>
      )}

      <div className="mb-4 flex items-center gap-2">
        {(["ALL", "GO", "WATCH", "SUPPRESSED"] as TierFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-all border ${
              filter === f
                ? "text-black border-[#A8FF3E]"
                : "border-[#262626] text-[#666] hover:text-white hover:border-[#444]"
            }`}
            style={filter === f ? { background: "#A8FF3E" } : {}}
          >
            {f === "ALL" ? "All" : f}
          </button>
        ))}
        <span className="ml-auto text-xs" style={{ color: "var(--muted)" }}>
          {filtered.length} alerts
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="flex min-h-[40vh] items-center justify-center rounded-xl border border-dashed border-[#262626]">
          <div className="text-center p-8">
            <p className="text-3xl mb-3">📡</p>
            <p className="text-white">No alerts yet.</p>
            <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
              {alerts.length === 0
                ? "Run `bash ~/.quantbot/install_sync.command` to backfill."
                : "No alerts match this filter."}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => (
            <AlertCard key={a.id} a={a} />
          ))}
        </div>
      )}
    </div>
  );
}
