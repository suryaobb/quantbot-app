import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

// ── Clients ───────────────────────────────────────────────────────────────────

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const GITHUB_TOKEN = process.env.GITHUB_TOKEN!;
const REPO = "suryaobb/quantbot-app";
const GH = "https://api.github.com";

// ── Tools ─────────────────────────────────────────────────────────────────────

const tools: Anthropic.Tool[] = [
  {
    name: "query_alerts",
    description:
      "Query qb_alerts — live trading signals from the quantbot system. Each alert has tier (GO/WATCH/SUPPRESSED), symbol, direction (long/short), score 0-100, price, VIX, RVOL, and the full Telegram message.",
    input_schema: {
      type: "object" as const,
      properties: {
        limit: { type: "number", description: "Rows to return (default 20, max 100)" },
        tier: { type: "string", description: "Filter: GO, WATCH, or SUPPRESSED" },
        symbol: { type: "string", description: "Filter by ticker e.g. NVDA, SPY" },
        direction: { type: "string", description: "Filter: long or short" },
      },
    },
  },
  {
    name: "query_trades",
    description:
      "Query qb_trades — real trade history. Fields: symbol, direction (long/short), entry_premium, contracts, risk_dollars, close_premium_pct, close_reason (target/stop/be_stop/eod), status (open/closed), opened_ts, closed_ts.",
    input_schema: {
      type: "object" as const,
      properties: {
        limit: { type: "number", description: "Rows to return (default 20)" },
        status: { type: "string", description: "Filter: open or closed" },
        symbol: { type: "string", description: "Filter by ticker" },
        close_reason: { type: "string", description: "Filter: target, stop, be_stop, eod" },
      },
    },
  },
  {
    name: "list_strategies",
    description: "List all trading strategies from Supabase with performance metrics.",
    input_schema: { type: "object" as const, properties: {} },
  },
  {
    name: "update_strategy",
    description: "Update a strategy in Supabase — pause it, change its status, or update params.",
    input_schema: {
      type: "object" as const,
      required: ["id", "updates"],
      properties: {
        id: { type: "string", description: "Strategy ID" },
        updates: {
          type: "object",
          description: 'Fields to update e.g. { "status": "paused" } or { "params": { "ema_fast": 5 } }',
        },
      },
    },
  },
  {
    name: "list_files",
    description: "List files/folders in a directory of the quantbot-app GitHub repo.",
    input_schema: {
      type: "object" as const,
      required: ["path"],
      properties: {
        path: { type: "string", description: 'Directory path e.g. "src/app" or "src/lib"' },
      },
    },
  },
  {
    name: "read_file",
    description: "Read the full content of any file in the quantbot-app GitHub repo.",
    input_schema: {
      type: "object" as const,
      required: ["path"],
      properties: {
        path: { type: "string", description: 'File path e.g. "src/app/page.tsx"' },
      },
    },
  },
  {
    name: "write_file",
    description:
      "Write or update a file in the quantbot-app repo and push a commit. Vercel automatically redeploys in ~40s. Always read_file first to understand what you're replacing.",
    input_schema: {
      type: "object" as const,
      required: ["path", "content", "message"],
      properties: {
        path: { type: "string", description: 'File path e.g. "src/app/page.tsx"' },
        content: { type: "string", description: "Complete new file content (UTF-8)" },
        message: { type: "string", description: "Git commit message" },
      },
    },
  },
];

// ── Tool execution ─────────────────────────────────────────────────────────────

async function ghHeaders() {
  return {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github.v3+json",
    "Content-Type": "application/json",
  };
}

async function runTool(name: string, input: Record<string, unknown>): Promise<string> {
  try {
    // ── Supabase reads ────────────────────────────────────────────────────────

    if (name === "query_alerts") {
      let q = supabase.from("qb_alerts").select("*").order("ts", { ascending: false });
      if (input.tier) q = q.eq("tier", input.tier);
      if (input.symbol) q = q.ilike("symbol", String(input.symbol));
      if (input.direction) q = q.eq("direction", input.direction);
      q = q.limit(Number(input.limit) || 20);
      const { data, error } = await q;
      if (error) return `Error: ${error.message}`;
      return JSON.stringify(data, null, 2);
    }

    if (name === "query_trades") {
      let q = supabase.from("qb_trades").select("*").order("opened_ts", { ascending: false });
      if (input.status) q = q.eq("status", input.status);
      if (input.symbol) q = q.ilike("symbol", String(input.symbol));
      if (input.close_reason) q = q.eq("close_reason", input.close_reason);
      q = q.limit(Number(input.limit) || 20);
      const { data, error } = await q;
      if (error) return `Error: ${error.message}`;
      return JSON.stringify(data, null, 2);
    }

    if (name === "list_strategies") {
      const { data, error } = await supabase.from("strategies").select("*").order("name");
      if (error) return `Error: ${error.message}`;
      return JSON.stringify(data, null, 2);
    }

    // ── Supabase write ────────────────────────────────────────────────────────

    if (name === "update_strategy") {
      const { data, error } = await supabase
        .from("strategies")
        .update(input.updates as Record<string, unknown>)
        .eq("id", String(input.id))
        .select();
      if (error) return `Error: ${error.message}`;
      return `Updated strategy: ${JSON.stringify(data, null, 2)}`;
    }

    // ── GitHub reads ──────────────────────────────────────────────────────────

    if (name === "list_files") {
      const res = await fetch(`${GH}/repos/${REPO}/contents/${input.path}`, {
        headers: await ghHeaders(),
      });
      if (!res.ok) return `Error ${res.status}: ${await res.text()}`;
      const json = await res.json();
      if (!Array.isArray(json)) return JSON.stringify(json);
      return JSON.stringify(
        json.map((f: { name: string; type: string; path: string; size: number }) => ({
          name: f.name,
          type: f.type,
          path: f.path,
          size: f.size,
        })),
        null,
        2
      );
    }

    if (name === "read_file") {
      const res = await fetch(`${GH}/repos/${REPO}/contents/${input.path}`, {
        headers: await ghHeaders(),
      });
      if (!res.ok) return `Error ${res.status}: ${await res.text()}`;
      const json = await res.json();
      if (json.encoding === "base64") {
        return Buffer.from(json.content.replace(/\n/g, ""), "base64").toString("utf-8");
      }
      return JSON.stringify(json);
    }

    // ── GitHub write ──────────────────────────────────────────────────────────

    if (name === "write_file") {
      // Get existing SHA (required for updates)
      const getRes = await fetch(`${GH}/repos/${REPO}/contents/${input.path}`, {
        headers: await ghHeaders(),
      });
      let sha: string | undefined;
      if (getRes.ok) {
        const existing = await getRes.json();
        sha = existing.sha;
      }

      const body: Record<string, unknown> = {
        message: input.message,
        content: Buffer.from(String(input.content)).toString("base64"),
      };
      if (sha) body.sha = sha;

      const putRes = await fetch(`${GH}/repos/${REPO}/contents/${input.path}`, {
        method: "PUT",
        headers: await ghHeaders(),
        body: JSON.stringify(body),
      });

      if (!putRes.ok) return `Error ${putRes.status}: ${await putRes.text()}`;
      const result = await putRes.json();
      return `✅ Committed "${input.message}" → ${result.commit?.sha?.slice(0, 7)}. Vercel will redeploy in ~40s.`;
    }

    return `Unknown tool: ${name}`;
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : String(e)}`;
  }
}

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM = `You are the Quantbot AI Agent — an intelligent assistant embedded in the Quantbot trading dashboard (quantbot-app.vercel.app).

You have FULL control over this dashboard: its data, its strategies, and its codebase.

## Your capabilities

**Live data (read):**
- query_alerts → 150+ GO/WATCH/SUPPRESSED signals from the quantbot trading system, synced from a local SQLite database every 60s
- query_trades → 67+ real option trades with entry premium, contracts, close %, P&L, and close reason
- list_strategies → strategy configurations and performance metrics

**Database (write):**
- update_strategy → pause, activate, or change any strategy's parameters

**Full codebase control (read + write → auto-deploys to Vercel):**
- list_files → browse the Next.js app's directory tree
- read_file → read any file (TypeScript, CSS, config, etc.)
- write_file → commit changes to GitHub → Vercel redeploys automatically in ~40s

## Tech stack
- Next.js 14 App Router, TypeScript, Tailwind CSS, Supabase (PostgreSQL), recharts
- Live data comes from qb_alerts and qb_trades Supabase tables
- Home (/), Signals (/signals), Brain (/brain), Backtests (/backtests), Portfolio (/portfolio), Agent (/agent)

## Trading context
- 0DTE options trading bot (real, not paper) targeting SPY, QQQ, NVDA, TSLA, LQDA, etc.
- GO signals = high-confidence, WATCH = moderate, SUPPRESSED = filtered out
- Score 0–100 (70+ is strong), RVOL = relative volume, VIX = fear index
- Trades use EMA 5/20 cross, VWAP reclaim, ORB patterns
- Starting balance: $40,000 paper portfolio, currently ~$42,615

## Guidelines
- When asked to change the site: read the file first, make the change, then write_file. Tell the user to expect the update in ~40s.
- Be concise and direct. Don't ask for confirmation unless the change is clearly destructive.
- When querying data, summarize the results intelligently rather than dumping raw JSON.
- P&L formula: (close_premium_pct / 100) × entry_premium × contracts × 100
- close_premium_pct > 500% is likely a bad data print — exclude from P&L calculations.`;

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { messages } = await req.json();

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      try {
        let currentMessages: Anthropic.MessageParam[] = messages;

        // Agentic loop — keep going until no more tool calls
        while (true) {
          let fullText = "";
          const toolUses: Array<{ id: string; name: string; inputJson: string }> = [];
          let currentTool: { id: string; name: string; inputJson: string } | null = null;
          let stopReason = "";

          const response = anthropic.messages.stream({
            model: "claude-opus-4-5",
            max_tokens: 8096,
            system: SYSTEM,
            tools,
            messages: currentMessages,
          });

          for await (const event of response) {
            if (event.type === "content_block_start") {
              if (event.content_block.type === "tool_use") {
                currentTool = {
                  id: event.content_block.id,
                  name: event.content_block.name,
                  inputJson: "",
                };
                send({ type: "tool_start", name: currentTool.name });
              }
            } else if (event.type === "content_block_delta") {
              if (event.delta.type === "text_delta") {
                fullText += event.delta.text;
                send({ type: "text", text: event.delta.text });
              } else if (event.delta.type === "input_json_delta" && currentTool) {
                currentTool.inputJson += event.delta.partial_json;
              }
            } else if (event.type === "content_block_stop") {
              if (currentTool) {
                toolUses.push({ ...currentTool });
                currentTool = null;
              }
            } else if (event.type === "message_delta") {
              stopReason = event.delta.stop_reason ?? "";
            }
          }

          if (stopReason !== "tool_use" || toolUses.length === 0) {
            send({ type: "done" });
            break;
          }

          // Build assistant message
          const assistantContent: Anthropic.ContentBlock[] = [];
          if (fullText) assistantContent.push({ type: "text", text: fullText });

          const toolResults: Anthropic.ToolResultBlockParam[] = [];

          for (const tool of toolUses) {
            let parsedInput: Record<string, unknown> = {};
            try {
              parsedInput = JSON.parse(tool.inputJson || "{}");
            } catch {
              /* keep empty */
            }

            assistantContent.push({
              type: "tool_use",
              id: tool.id,
              name: tool.name,
              input: parsedInput,
            });

            send({ type: "tool_running", name: tool.name });

            const result = await runTool(tool.name, parsedInput);

            send({ type: "tool_done", name: tool.name, preview: result.slice(0, 100) });

            toolResults.push({
              type: "tool_result",
              tool_use_id: tool.id,
              content: result,
            });
          }

          currentMessages = [
            ...currentMessages,
            { role: "assistant" as const, content: assistantContent },
            { role: "user" as const, content: toolResults },
          ];
        }
      } catch (e) {
        send({ type: "error", message: e instanceof Error ? e.message : "Unknown error" });
      } finally {
        closed = true;
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
