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
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  max_completion_tokens?: number;
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
  "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Hivemind-Workspace-Id,X-Hivemind-Agent-Id,X-Hivemind-Agent-Name,X-Bankr-LLM-Key",
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

    if (request.method === "POST" && url.pathname === "/v1/chat/completions") {
      return handleOpenAIChatCompletions(request, env);
    }

    if (request.method === "GET" && url.pathname === "/v1/models") {
      return proxyModels(request, env);
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

async function handleOpenAIChatCompletions(request: Request, env: Env) {
  if (!env.HONEY_LEDGER_SECRET) return openAIError(env, "Trusted compute gateway is missing HONEY_LEDGER_SECRET.", 500);

  const body = await request.json().catch(() => null) as GatewayRequest | null;
  const auth = parseRewardAuth(request, body, env);
  if (!auth.bankrKey) {
    return openAIError(env, "Reward compute needs a Bankr LLM key. Use Authorization: Bearer bk_... or a Hivemind reward key.", 402);
  }

  const model = cleanId(body?.model ?? env.DEFAULT_MODEL ?? "gpt-5.4-mini");
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  if (!messages.length) return openAIError(env, "Missing messages.", 400);

  const promptTokens = estimateTokens(JSON.stringify(messages));
  const cap = positiveInteger(env.DAILY_TOKEN_CAP, 50_000);
  const current = await readDailyUsage(env, auth.workspaceId);
  if (current + promptTokens > cap) {
    return openAIError(env, `Daily reward compute cap reached for this workspace (${cap.toLocaleString()} tokens).`, 429);
  }

  const upstream = await fetch(env.BANKR_LLM_BASE_URL ?? "https://llm.bankr.bot/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${auth.bankrKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...body,
      model,
      messages,
      stream: false,
    }),
  });

  const data = await upstream.json().catch(async () => ({ error: await upstream.text().catch(() => "") }));
  if (!upstream.ok) return openAIError(env, extractError(data) || `Compute gateway upstream returned ${upstream.status}.`, upstream.status);

  const outputText = extractAssistantText(data);
  const usageTokens = extractUsageTokens(data) ?? estimateTokens(`${JSON.stringify(messages)}\n${outputText}`);
  const acceptedTokens = Math.max(1, Math.min(usageTokens, Math.max(0, cap - current)));
  await addDailyUsage(env, auth.workspaceId, acceptedTokens);

  const receipt = await signedReceipt(env, {
    eventId: crypto.randomUUID(),
    issuerId: "hivemindos-reward-gateway",
    workspaceId: auth.workspaceId,
    agentId: auth.agentId,
    tokensUsed: acceptedTokens,
    model,
    source: "verified-reward-gateway",
    timestamp: new Date().toISOString(),
  });
  const submitted = await submitHoneyReceipt(env, receipt);
  if (!submitted.ok) return openAIError(env, submitted.error ?? "Honey ledger rejected trusted receipt.", 502);
  await env.DB.prepare(
    "INSERT INTO compute_events (event_id, workspace_id, agent_id, model, tokens_used, honey_delta) VALUES (?, ?, ?, ?, ?, ?)",
  ).bind(receipt.eventId, auth.workspaceId, auth.agentId, model, acceptedTokens, submitted.honeyDelta).run();

  const responseBody = openAIChatResponse(data, {
    id: receipt.eventId,
    model,
    outputText,
    tokensUsed: acceptedTokens,
    honeyDelta: submitted.honeyDelta,
  });

  if (body?.stream === true) {
    return openAIStream(env, responseBody, {
      id: receipt.eventId,
      agentId: auth.agentId,
      agentName: auth.agentName,
      tokensUsed: acceptedTokens,
      honeyDelta: submitted.honeyDelta,
      createdAt: receipt.timestamp,
    });
  }

  return json(env, {
    ...responseBody,
    honey: {
      id: receipt.eventId,
      agentId: auth.agentId,
      agentName: auth.agentName,
      kind: "usage",
      source: "verified-reward-gateway",
      tokensUsed: acceptedTokens,
      honeyDelta: submitted.honeyDelta,
      hiveDelta: 0,
      createdAt: receipt.timestamp,
    },
  });
}

async function proxyModels(request: Request, env: Env) {
  const auth = parseRewardAuth(request, null, env);
  if (!auth.bankrKey) return openAIError(env, "Reward compute needs a Bankr LLM key.", 402);
  const baseUrl = (env.BANKR_LLM_BASE_URL ?? "https://llm.bankr.bot/v1/chat/completions").replace(/\/chat\/completions\/?$/, "");
  const upstream = await fetch(`${baseUrl}/models`, {
    headers: { Authorization: `Bearer ${auth.bankrKey}` },
  });
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json", ...corsHeaders(env) },
  });
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
  const usage = (data as { usage?: Record<string, unknown> }).usage;
  if (!usage || typeof usage !== "object") return null;

  const total = firstPositiveNumber(usage, ["total_tokens", "totalTokens", "total", "tokens"]);
  if (total) return total;

  const input = firstPositiveNumber(usage, ["prompt_tokens", "input_tokens", "inputTokens", "promptTokens"]);
  const output = firstPositiveNumber(usage, ["completion_tokens", "output_tokens", "outputTokens", "completionTokens"]);
  const cacheRead = firstPositiveNumber(usage, ["cache_read_tokens", "cacheReadTokens", "cacheRead"]);
  const cacheWrite = firstPositiveNumber(usage, ["cache_write_tokens", "cacheWriteTokens", "cacheWrite"]);
  const reasoning = firstPositiveNumber(usage, ["reasoning_tokens", "reasoningTokens"]);
  const summed = input + output + cacheRead + cacheWrite + reasoning;
  return summed > 0 ? summed : null;
}

function firstPositiveNumber(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = Number(record[key]);
    if (Number.isFinite(value) && value > 0) return Math.floor(value);
  }
  return 0;
}

function extractError(data: unknown) {
  const error = (data as { error?: string | { message?: string } }).error;
  return typeof error === "string" ? error : error?.message;
}

type RewardAuth = {
  bankrKey: string;
  workspaceId: string;
  agentId: string;
  agentName?: string;
};

function parseRewardAuth(request: Request, body: GatewayRequest | null, env: Env): RewardAuth {
  const headerBankrKey = cleanSecret(request.headers.get("X-Bankr-LLM-Key") ?? undefined);
  const bodyBankrKey = cleanSecret(body?.bankrLlmKey);
  const bearer = bearerToken(request);
  const rewardKey = parseRewardKey(bearer);
  const bankrKey = headerBankrKey || bodyBankrKey || rewardKey?.bankrLlmKey || cleanSecret(bearer) || sharedBankrKey(env);
  const workspaceId = cleanId(
    request.headers.get("X-Hivemind-Workspace-Id")
      ?? body?.workspaceId
      ?? rewardKey?.workspaceId
      ?? (bankrKey ? `reward-${shortHash(bankrKey)}` : ""),
  );
  const agentId = cleanId(
    request.headers.get("X-Hivemind-Agent-Id")
      ?? body?.agentId
      ?? rewardKey?.agentId
      ?? "reward-client",
  );
  const agentName = cleanId(request.headers.get("X-Hivemind-Agent-Name") ?? body?.agentName ?? rewardKey?.agentName ?? "");
  return {
    bankrKey,
    workspaceId: workspaceId || "reward-anonymous",
    agentId: agentId || "reward-client",
    ...(agentName ? { agentName } : {}),
  };
}

function bearerToken(request: Request) {
  const header = request.headers.get("Authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() ?? "";
}

function parseRewardKey(token: string): { workspaceId?: string; agentId?: string; agentName?: string; bankrLlmKey?: string } | null {
  if (!token.startsWith("hive-v1.")) return null;
  const parts = token.split(".");
  if (parts.length === 3 || parts.length === 4) {
    return {
      workspaceId: parts[1],
      ...(parts.length === 4 ? { agentId: parts[2] } : {}),
      bankrLlmKey: cleanSecret(parts[parts.length - 1]),
    };
  }
  try {
    const encoded = token.slice("hive-v1.".length);
    const padded = encoded.padEnd(Math.ceil(encoded.length / 4) * 4, "=");
    const jsonText = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
    const parsed = JSON.parse(jsonText) as { workspaceId?: string; agentId?: string; agentName?: string; bankrLlmKey?: string };
    return {
      workspaceId: parsed.workspaceId,
      agentId: parsed.agentId,
      agentName: parsed.agentName,
      bankrLlmKey: cleanSecret(parsed.bankrLlmKey),
    };
  } catch {
    return null;
  }
}

function shortHash(value: string) {
  return [...new Uint8Array(new TextEncoder().encode(value))]
    .reduce((hash, byte) => ((hash * 31) + byte) >>> 0, 0)
    .toString(16)
    .padStart(8, "0");
}

function openAIChatResponse(
  upstreamData: unknown,
  fallback: { id: string; model: string; outputText: string; tokensUsed: number; honeyDelta: number },
) {
  const upstream = upstreamData as {
    id?: string;
    object?: string;
    created?: number;
    model?: string;
    choices?: unknown[];
    usage?: Record<string, unknown>;
  };
  return {
    id: upstream.id ?? `chatcmpl-${fallback.id}`,
    object: upstream.object ?? "chat.completion",
    created: upstream.created ?? Math.floor(Date.now() / 1000),
    model: upstream.model ?? fallback.model,
    choices: Array.isArray(upstream.choices) && upstream.choices.length
      ? upstream.choices
      : [{ index: 0, message: { role: "assistant", content: fallback.outputText }, finish_reason: "stop" }],
    usage: {
      ...(upstream.usage ?? {}),
      total_tokens: fallback.tokensUsed,
    },
  };
}

function openAIStream(env: Env, responseBody: ReturnType<typeof openAIChatResponse>, honey: {
  id: string;
  agentId: string;
  agentName?: string;
  tokensUsed: number;
  honeyDelta: number;
  createdAt: string;
}) {
  const text = extractAssistantText(responseBody);
  const created = Math.floor(Date.now() / 1000);
  const chunk = {
    id: responseBody.id,
    object: "chat.completion.chunk",
    created,
    model: responseBody.model,
    choices: [{ index: 0, delta: { role: "assistant", content: text }, finish_reason: null }],
  };
  const done = {
    id: responseBody.id,
    object: "chat.completion.chunk",
    created,
    model: responseBody.model,
    choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
    usage: responseBody.usage,
    honey: {
      ...honey,
      kind: "usage",
      source: "verified-reward-gateway",
      hiveDelta: 0,
    },
  };
  return new Response([
    `data: ${JSON.stringify(chunk)}`,
    "",
    `data: ${JSON.stringify(done)}`,
    "",
    "data: [DONE]",
    "",
  ].join("\n"), {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", ...corsHeaders(env) },
  });
}

function openAIError(env: Env, message: string, status: number) {
  return json(env, { error: { message, type: "hivemindos_reward_gateway_error" } }, status);
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
