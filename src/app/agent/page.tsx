"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Role = "user" | "assistant";

interface Message {
  role: Role;
  content: string;
}

interface StreamEvent {
  type: "text" | "tool_start" | "tool_running" | "tool_done" | "done" | "error";
  text?: string;
  name?: string;
  preview?: string;
  message?: string;
}

// ── Tool labels ───────────────────────────────────────────────────────────────

const TOOL_LABEL: Record<string, string> = {
  query_alerts:    "📡 Querying alerts",
  query_trades:    "📊 Querying trades",
  list_strategies: "🎯 Loading strategies",
  update_strategy: "✏️ Updating strategy",
  list_files:      "📁 Browsing files",
  read_file:       "📄 Reading file",
  write_file:      "🚀 Committing & deploying",
};

// ── Suggestions ───────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  "Show me today's GO alerts",
  "What's my win rate on NVDA trades?",
  "Which strategies are currently active?",
  "Add a live P&L ticker to the home page header",
  "Show me all open positions",
  "Pause the IV Skew Play strategy",
];

// ── Markdown-lite renderer ────────────────────────────────────────────────────
// Handles **bold**, `code`, and newlines for chat bubbles.

function RenderText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <span>
      {lines.map((line, li) => {
        // Split by bold **text**
        const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
        return (
          <span key={li}>
            {parts.map((part, pi) => {
              if (part.startsWith("**") && part.endsWith("**")) {
                return <strong key={pi}>{part.slice(2, -2)}</strong>;
              }
              if (part.startsWith("`") && part.endsWith("`")) {
                return (
                  <code
                    key={pi}
                    className="rounded px-1 py-0.5 text-[11px] font-mono"
                    style={{ background: "rgba(168,255,62,0.1)", color: "var(--accent)" }}
                  >
                    {part.slice(1, -1)}
                  </code>
                );
              }
              return <span key={pi}>{part}</span>;
            })}
            {li < lines.length - 1 && <br />}
          </span>
        );
      })}
    </span>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AgentPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [toolStatus, setToolStatus] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, toolStatus]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = inputRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [input]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setLoading(true);
    setToolStatus(null);

    const outgoing: Message[] = [...messages, { role: "user", content: text }];
    setMessages(outgoing);

    // Add empty assistant message placeholder
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: outgoing }),
        signal: abort.signal,
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const lines = decoder.decode(value).split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;

          let event: StreamEvent;
          try {
            event = JSON.parse(raw);
          } catch {
            continue;
          }

          if (event.type === "text" && event.text) {
            assistantText += event.text;
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: "assistant", content: assistantText };
              return updated;
            });
          } else if (event.type === "tool_start" || event.type === "tool_running") {
            setToolStatus(TOOL_LABEL[event.name ?? ""] ?? `Running ${event.name}`);
          } else if (event.type === "tool_done") {
            setToolStatus(null);
          } else if (event.type === "done") {
            setToolStatus(null);
          } else if (event.type === "error") {
            assistantText += `\n\n⚠️ ${event.message}`;
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: "assistant", content: assistantText };
              return updated;
            });
          }
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === "assistant" && last.content === "") {
            updated[updated.length - 1] = {
              role: "assistant",
              content: `⚠️ ${e instanceof Error ? e.message : "Something went wrong"}`,
            };
          }
          return updated;
        });
      }
    } finally {
      setLoading(false);
      setToolStatus(null);
      abortRef.current = null;
      inputRef.current?.focus();
    }
  }, [input, loading, messages]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function stop() {
    abortRef.current?.abort();
    setLoading(false);
    setToolStatus(null);
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 57px)" }}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#1E1E1E] shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="h-9 w-9 rounded-xl flex items-center justify-center text-black font-bold text-base shrink-0"
              style={{ background: "var(--accent)" }}
            >
              ⚡
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-tight">Quantbot Agent</h1>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                Alerts · Trades · Strategies · Site control
              </p>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={() => { setMessages([]); setInput(""); setToolStatus(null); }}
              className="text-xs px-3 py-1.5 rounded-lg border border-[#262626] hover:border-[#444] transition-colors"
              style={{ color: "var(--muted)" }}
            >
              New chat
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 min-h-0">
        {/* Empty state */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full pb-8 gap-4">
            <div
              className="h-16 w-16 rounded-2xl flex items-center justify-center text-3xl"
              style={{ background: "rgba(168,255,62,0.08)", border: "1px solid rgba(168,255,62,0.15)" }}
            >
              ⚡
            </div>
            <div className="text-center">
              <p className="text-white font-semibold text-lg">What do you need?</p>
              <p className="text-sm mt-1 max-w-xs" style={{ color: "var(--muted)" }}>
                I can query your live data, edit strategies, or rebuild any part of this site.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg mt-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => { setInput(s); setTimeout(() => inputRef.current?.focus(), 50); }}
                  className="text-left px-4 py-3 rounded-xl border border-[#1E1E1E] text-xs hover:border-[#333] hover:bg-[#111] transition-all"
                  style={{ color: "var(--muted)" }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message bubbles */}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} gap-2`}>
            {m.role === "assistant" && (
              <div
                className="h-7 w-7 rounded-lg flex items-center justify-center text-sm shrink-0 mt-0.5"
                style={{ background: "rgba(168,255,62,0.1)", color: "var(--accent)" }}
              >
                ⚡
              </div>
            )}
            <div
              className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === "user"
                  ? "rounded-br-sm text-black"
                  : "card rounded-bl-sm text-white"
              }`}
              style={m.role === "user" ? { background: "var(--accent)" } : {}}
            >
              {m.content ? (
                <RenderText text={m.content} />
              ) : loading && i === messages.length - 1 ? (
                <span className="flex items-center gap-1" style={{ color: "var(--muted)" }}>
                  {[0, 150, 300].map((d) => (
                    <span
                      key={d}
                      className="h-1.5 w-1.5 rounded-full animate-bounce"
                      style={{ background: "currentColor", animationDelay: `${d}ms` }}
                    />
                  ))}
                </span>
              ) : null}
            </div>
          </div>
        ))}

        {/* Tool activity */}
        {toolStatus && (
          <div className="flex justify-start gap-2">
            <div className="h-7 w-7 shrink-0" />
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs border border-[#1E1E1E]"
              style={{ color: "var(--muted)" }}
            >
              <span className="h-3 w-3 animate-spin rounded-full border border-[#333] border-t-[#A8FF3E] shrink-0" />
              {toolStatus}…
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 px-4 pb-4 pt-3 border-t border-[#1E1E1E]">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question or request a change…"
            rows={1}
            className="flex-1 resize-none rounded-xl border border-[#262626] bg-[#111] px-4 py-3 text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-[#A8FF3E] transition-colors"
            style={{ minHeight: "44px", maxHeight: "120px", lineHeight: "1.5" }}
            disabled={loading}
          />
          {loading ? (
            <button
              onClick={stop}
              className="h-11 w-11 rounded-xl flex items-center justify-center border border-[#333] hover:border-[#555] transition-all shrink-0"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" style={{ color: "var(--muted)" }}>
                <rect x="2" y="2" width="10" height="10" rx="1.5" />
              </svg>
            </button>
          ) : (
            <button
              onClick={send}
              disabled={!input.trim()}
              className="h-11 w-11 rounded-xl flex items-center justify-center transition-all disabled:opacity-25 shrink-0"
              style={{ background: "var(--accent)" }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M2 8L14 8M14 8L9 3M14 8L9 13"
                  stroke="black"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </div>
        <p className="text-[10px] mt-2 text-center" style={{ color: "#333" }}>
          Enter to send · Shift+Enter for newline · Code changes deploy in ~40s
        </p>
      </div>
    </div>
  );
}
