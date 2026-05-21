type Env = {
  DB: D1Database;
  BANKR_LLM_KEY?: string;
  BANKR_MANAGEMENT_KEY?: string;
  BANKR_LLM_BASE_URL?: string;
  DEFAULT_MODEL?: string;
  HONEY_LEDGER_URL?: string;
  HONEY_LEDGER_SECRET?: string;
  ALLOW_SHARED_BANKR_KEY?: string;
  DAILY_TOKEN_CAP?: string;
  CORS_ORIGIN?: string;
};

type ChatMessage = {
  role: string;
  content: string | Array<{ type: string; text?: string }>;
};

type GatewayRequest = {
  workspaceId?: string;
  agentId?: string;
  agentName?: string;
  runtime?: string;
  model?: string;
  bankrLlmKey?: string;
  messages?: ChatMessage[];
};

type LedgerReceipt = {
  eventId: string;
  issuerId: string;
  workspaceId: string;
  agentId: string;
  tokensUsed: number;
  model: string;
  source: string;
  timestamp: string;
  signature: string;
};

type LedgerSubmitResult = {
  ok: boolean;
  honeyDelta: number;
  error?: string;
};

const corsHeaders = (env: Env) => ({
  "Access-Control-Allow-Origin": env.CORS_ORIGIN ?? "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
});

const worker: ExportedHandler<Env> = {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders(env) });
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return json(env, { ok: true, service: "hivemindos-compute-gateway" });
    }

    if (request.method === "POST" && url.pathname === "/chat") {
      return handleChat(request, env);
    }

    return json(env, { ok: false, error: "Not found." }, 404);
  },
};

export default worker;

async function handleChat(request: Request, env: Env) {
  if (!env.HONEY_LEDGER_SECRET) return sse(env, { error: "Trusted compute gateway is missing HONEY_LEDGER_SECRET." }, 500);

  const body = await request.json().catch(() => null) as GatewayRequest | null;
  const bankrKey = cleanSecret(body?.bankrLlmKey) || sharedBankrKey(env);
  if (!bankrKey) {
    return sse(env, {
      error: "Honey rewards need your own Bankr LLM key. Add Bankr LLM credits funded with HIVE, set BANKR_LLM_KEY locally, then retry.",
    }, 402);
  }
  const workspaceId = cleanId(body?.workspaceId ?? "");
  const agentId = cleanId(body?.agentId ?? "");
  const model = cleanId(body?.model ?? env.DEFAULT_MODEL ?? "gpt-5.4-mini");
  const messages = Array.isArray(body?.messages) ? body.messages : [];

  if (!workspaceId || !agentId || messages.length === 0) {
    return sse(env, { error: "Missing workspaceId, agentId, or messages." }, 400);
  }

  const promptTokens = estimateTokens(JSON.stringify(messages));
  const cap = positiveInteger(env.DAILY_TOKEN_CAP, 50_000);
  const current = await readDailyUsage(env, workspaceId);
  if (current + promptTokens > cap) {
    return sse(env, { error: `Daily reward compute cap reached for this workspace (${cap.toLocaleString()} tokens).` }, 429);
  }

  const upstream = await fetch(env.BANKR_LLM_BASE_URL ?? "https://llm.bankr.bot/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${bankrKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
    }),
  });

  const data = await upstream.json().catch(async () => ({ error: await upstream.text().catch(() => "") }));
  if (!upstream.ok) {
    return sse(env, { error: extractError(data) || `Compute gateway upstream returned ${upstream.status}.` }, upstream.status);
  }

  const outputText = extractAssistantText(data);
  const usageTokens = extractUsageTokens(data) ?? estimateTokens(`${JSON.stringify(messages)}\n${outputText}`);
  const acceptedTokens = Math.max(1, Math.min(usageTokens, Math.max(0, cap - current)));
  await addDailyUsage(env, workspaceId, acceptedTokens);

  const receipt = await signedReceipt(env, {
    eventId: crypto.randomUUID(),
    issuerId: "hivemindos-compute-gateway",
    workspaceId,
    agentId,
    tokensUsed: acceptedTokens,
    model,
    source: "trusted-compute-gateway",
    timestamp: new Date().toISOString(),
  });
  const submitted = await submitHoneyReceipt(env, receipt);
  if (!submitted.ok) return sse(env, { error: submitted.error }, 502);
  await env.DB.prepare(
    "INSERT INTO compute_events (event_id, workspace_id, agent_id, model, tokens_used, honey_delta) VALUES (?, ?, ?, ?, ?, ?)",
  ).bind(receipt.eventId, workspaceId, agentId, model, acceptedTokens, submitted.honeyDelta).run();

  return new Response(
    [
      `data: ${JSON.stringify({ choices: [{ delta: { content: outputText } }] })}`,
      "",
      `data: ${JSON.stringify({ honey: { id: receipt.eventId, agentId, agentName: body?.agentName, kind: "usage", source: "chat", tokensUsed: acceptedTokens, honeyDelta: submitted.honeyDelta, hiveDelta: 0, createdAt: receipt.timestamp } })}`,
      "",
      "data: [DONE]",
      "",
    ].join("\n"),
    {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        ...corsHeaders(env),
      },
    },
  );
}

async function readDailyUsage(env: Env, workspaceId: string) {
  const row = await env.DB.prepare("SELECT tokens_used FROM workspace_daily_usage WHERE workspace_id = ? AND usage_date = ?")
    .bind(workspaceId, today()).first<{ tokens_used: number }>();
  return Number(row?.tokens_used ?? 0);
}

async function addDailyUsage(env: Env, workspaceId: string, tokens: number) {
  await env.DB.prepare(
    `INSERT INTO workspace_daily_usage (workspace_id, usage_date, tokens_used, updated_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(workspace_id, usage_date) DO UPDATE SET
        tokens_used = tokens_used + excluded.tokens_used,
        updated_at = datetime('now')`,
  ).bind(workspaceId, today(), tokens).run();
}

async function submitHoneyReceipt(env: Env, receipt: LedgerReceipt): Promise<LedgerSubmitResult> {
  const response = await fetch(`${(env.HONEY_LEDGER_URL ?? "").replace(/\/+$/, "")}/receipts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(receipt),
  }).catch(() => null);
  if (!response?.ok) return { ok: false, honeyDelta: 0, error: `Honey ledger rejected trusted receipt${response ? `: ${response.status}` : "."}` };
  const data = await response.json().catch(() => null) as { honeyDelta?: number } | null;
  return { ok: true, honeyDelta: Number(data?.honeyDelta ?? 0) || 0 };
}

async function signedReceipt(env: Env, receipt: Omit<LedgerReceipt, "signature">): Promise<LedgerReceipt> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(env.HONEY_LEDGER_SECRET ?? ""),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(canonicalReceipt(receipt)));
  return {
    ...receipt,
    signature: [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join(""),
  };
}

function canonicalReceipt(receipt: Omit<LedgerReceipt, "signature">) {
  return [
    receipt.issuerId,
    receipt.eventId,
    receipt.workspaceId,
    receipt.agentId,
    receipt.tokensUsed,
    receipt.model,
    receipt.source,
    receipt.timestamp,
  ].join(".");
}

function extractAssistantText(data: unknown) {
  const value = data as { choices?: Array<{ message?: { content?: string }; text?: string }> };
  return value.choices?.[0]?.message?.content ?? value.choices?.[0]?.text ?? JSON.stringify(data);
}

function extractUsageTokens(data: unknown) {
  const usage = (data as { usage?: { total_tokens?: number; prompt_tokens?: number; completion_tokens?: number } }).usage;
  const total = usage?.total_tokens ?? ((usage?.prompt_tokens ?? 0) + (usage?.completion_tokens ?? 0));
  return Number.isFinite(total) && total > 0 ? total : null;
}

function extractError(data: unknown) {
  const error = (data as { error?: string | { message?: string } }).error;
  return typeof error === "string" ? error : error?.message;
}

function estimateTokens(text: string) {
  return Math.max(1, Math.ceil(text.trim().length / 4));
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function cleanId(value: string) {
  return value.trim().slice(0, 160);
}

function cleanSecret(value?: string) {
  const secret = value?.trim();
  return secret && secret.startsWith("bk_") ? secret : "";
}

function sharedBankrKey(env: Env) {
  if (env.ALLOW_SHARED_BANKR_KEY !== "true") return "";
  return cleanSecret(env.BANKR_LLM_KEY) || cleanSecret(env.BANKR_MANAGEMENT_KEY);
}

function positiveInteger(value: unknown, fallback: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : fallback;
}

function json(env: Env, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders(env) },
  });
}

function sse(env: Env, body: unknown, status = 200) {
  return new Response(`data: ${JSON.stringify(body)}\n\ndata: [DONE]\n\n`, {
    status,
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", ...corsHeaders(env) },
  });
}
