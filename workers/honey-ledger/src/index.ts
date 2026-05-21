type Env = {
  DB: D1Database;
  HONEY_PER_1000_TOKENS?: string;
  HIVE_PER_HONEY?: string;
  HONEY_LEDGER_SECRET?: string;
  HONEY_LEDGER_READ_TOKEN?: string;
  CORS_ORIGIN?: string;
};

type UsageReceipt = {
  eventId: string;
  issuerId: string;
  workspaceId: string;
  agentId: string;
  tokensUsed: number;
  model: string;
  source: string;
  timestamp: string;
  signature?: string;
};

type AgentBalanceRow = {
  workspace_id: string;
  agent_id: string;
  tokens_used: number;
  lifetime_honey: number;
  available_honey: number;
  hive_balance: number;
  updated_at: string;
};

const jsonHeaders = (env: Env) => ({
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": env.CORS_ORIGIN ?? "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Authorization,Content-Type",
});

const worker: ExportedHandler<Env> = {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") return new Response(null, { headers: jsonHeaders(env) });

    const url = new URL(request.url);
    try {
      if (request.method === "GET" && url.pathname === "/health") {
        return ok(env, { ok: true, service: "hivemindos-honey-ledger" });
      }
      if (request.method === "GET" && url.pathname === "/ledger") {
        return handleLedger(request, env, url);
      }
      if (request.method === "POST" && url.pathname === "/receipts") {
        return handleReceipt(request, env);
      }
      if (request.method === "POST" && url.pathname === "/exchange") {
        return handleExchange(request, env);
      }
      return fail(env, "Not found.", 404);
    } catch (error) {
      console.error(error);
      return fail(env, "Internal ledger error.", 500);
    }
  },
};

export default worker;

async function handleReceipt(request: Request, env: Env) {
  if (!env.HONEY_LEDGER_SECRET) return fail(env, "Official Honey receipts require a trusted signer.", 500);

  const receipt = await request.json().catch(() => null);
  if (!isUsageReceipt(receipt)) return fail(env, "Invalid usage receipt.", 400);
  if (!receipt.signature) return fail(env, "Official Honey receipts must be signed by a trusted runtime.", 401);

  const expected = await signReceipt(receipt, env.HONEY_LEDGER_SECRET);
  if (!timingSafeEqual(receipt.signature, expected)) return fail(env, "Invalid receipt signature.", 401);

  const honeyDelta = round2((receipt.tokensUsed / 1000) * positiveNumber(env.HONEY_PER_1000_TOKENS, 1));
  const inserted = await env.DB.prepare(
    `INSERT OR IGNORE INTO usage_receipts
      (event_id, issuer_id, workspace_id, agent_id, tokens_used, model, source, occurred_at, signature)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      receipt.eventId,
      receipt.issuerId,
      receipt.workspaceId,
      receipt.agentId,
      receipt.tokensUsed,
      receipt.model,
      receipt.source,
      receipt.timestamp,
      receipt.signature ?? "",
    )
    .run();

  if ((inserted.meta.changes ?? 0) > 0) {
    await env.DB.prepare(
      `INSERT INTO agent_balances
        (workspace_id, agent_id, tokens_used, lifetime_honey, available_honey, updated_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(workspace_id, agent_id) DO UPDATE SET
          tokens_used = tokens_used + excluded.tokens_used,
          lifetime_honey = ROUND(lifetime_honey + excluded.lifetime_honey, 2),
          available_honey = ROUND(available_honey + excluded.available_honey, 2),
          updated_at = datetime('now')`,
    )
      .bind(receipt.workspaceId, receipt.agentId, receipt.tokensUsed, honeyDelta, honeyDelta)
      .run();
  }

  const balance = await getBalance(env, receipt.workspaceId, receipt.agentId);
  return ok(env, { ok: true, duplicate: (inserted.meta.changes ?? 0) === 0, honeyDelta, balance });
}

async function handleLedger(request: Request, env: Env, url: URL) {
  const auth = requireBearer(request, env.HONEY_LEDGER_READ_TOKEN);
  if (auth) return fail(env, auth, 401);

  const workspaceId = cleanId(url.searchParams.get("workspaceId") ?? "");
  const agentId = cleanId(url.searchParams.get("agentId") ?? "");
  if (!workspaceId) return fail(env, "Missing workspaceId.", 400);

  const query = agentId
    ? env.DB.prepare("SELECT * FROM agent_balances WHERE workspace_id = ? AND agent_id = ? ORDER BY agent_id").bind(workspaceId, agentId)
    : env.DB.prepare("SELECT * FROM agent_balances WHERE workspace_id = ? ORDER BY agent_id").bind(workspaceId);
  const rows = await query.all<AgentBalanceRow>();
  const ledger = toHoneyLedger(rows.results ?? []);
  return ok(env, { ok: true, ledger });
}

async function handleExchange(request: Request, env: Env) {
  const body = await request.json().catch(() => null) as { workspaceId?: string; agentId?: string } | null;
  const workspaceId = cleanId(body?.workspaceId ?? "");
  const agentId = cleanId(body?.agentId ?? "");
  if (!workspaceId) return fail(env, "Missing workspaceId.", 400);

  const balances = agentId
    ? await env.DB.prepare("SELECT * FROM agent_balances WHERE workspace_id = ? AND agent_id = ?").bind(workspaceId, agentId).all<AgentBalanceRow>()
    : await env.DB.prepare("SELECT * FROM agent_balances WHERE workspace_id = ?").bind(workspaceId).all<AgentBalanceRow>();

  const hivePerHoney = positiveNumber(env.HIVE_PER_HONEY, 1);
  const events = [];

  for (const row of balances.results ?? []) {
    const availableHoney = round2(row.available_honey);
    if (availableHoney <= 0) continue;
    const hiveDelta = round2(availableHoney * hivePerHoney);
    const id = crypto.randomUUID();
    await env.DB.batch([
      env.DB.prepare(
        `UPDATE agent_balances
          SET available_honey = 0, hive_balance = ROUND(hive_balance + ?, 2), updated_at = datetime('now')
          WHERE workspace_id = ? AND agent_id = ?`,
      ).bind(hiveDelta, row.workspace_id, row.agent_id),
      env.DB.prepare(
        `INSERT INTO exchange_events (id, workspace_id, agent_id, honey_delta, hive_delta)
          VALUES (?, ?, ?, ?, ?)`,
      ).bind(id, row.workspace_id, row.agent_id, -availableHoney, hiveDelta),
    ]);
    events.push({ id, agentId: row.agent_id, honeyDelta: -availableHoney, hiveDelta });
  }

  const refreshed = agentId
    ? await env.DB.prepare("SELECT * FROM agent_balances WHERE workspace_id = ? AND agent_id = ?").bind(workspaceId, agentId).all<AgentBalanceRow>()
    : await env.DB.prepare("SELECT * FROM agent_balances WHERE workspace_id = ?").bind(workspaceId).all<AgentBalanceRow>();

  return ok(env, { ok: true, ledger: toHoneyLedger(refreshed.results ?? []), events });
}

async function getBalance(env: Env, workspaceId: string, agentId: string) {
  const row = await env.DB.prepare("SELECT * FROM agent_balances WHERE workspace_id = ? AND agent_id = ?")
    .bind(workspaceId, agentId)
    .first<AgentBalanceRow>();
  return row ? toBalance(row) : null;
}

function toHoneyLedger(rows: AgentBalanceRow[]) {
  return {
    honeyPerThousandTokens: 1,
    tokenPerHoney: 1,
    agentTokenUsage: Object.fromEntries(rows.map((row) => [row.agent_id, row.tokens_used])),
    agentHoneyExchanged: Object.fromEntries(rows.map((row) => [row.agent_id, round2(row.lifetime_honey - row.available_honey)])),
    agentHiveBalances: Object.fromEntries(rows.map((row) => [row.agent_id, row.hive_balance])),
    events: [],
    updatedAt: rows.reduce((latest, row) => row.updated_at > latest ? row.updated_at : latest, new Date(0).toISOString()),
    balances: rows.map(toBalance),
  };
}

function toBalance(row: AgentBalanceRow) {
  return {
    workspaceId: row.workspace_id,
    agentId: row.agent_id,
    tokensUsed: row.tokens_used,
    lifetimeHoney: row.lifetime_honey,
    availableHoney: row.available_honey,
    hiveBalance: row.hive_balance,
    updatedAt: row.updated_at,
  };
}

function isUsageReceipt(value: unknown): value is UsageReceipt {
  if (!value || typeof value !== "object") return false;
  const receipt = value as Partial<UsageReceipt>;
  return Boolean(
    cleanId(receipt.eventId ?? "") &&
    cleanId(receipt.issuerId ?? "") &&
    cleanId(receipt.workspaceId ?? "") &&
    cleanId(receipt.agentId ?? "") &&
    typeof receipt.model === "string" &&
    typeof receipt.source === "string" &&
    typeof receipt.timestamp === "string" &&
    typeof receipt.signature === "string" &&
    typeof receipt.tokensUsed === "number" &&
    Number.isInteger(receipt.tokensUsed) &&
    receipt.tokensUsed > 0,
  );
}

async function signReceipt(receipt: Omit<UsageReceipt, "signature">, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(canonicalReceipt(receipt)));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function canonicalReceipt(receipt: Omit<UsageReceipt, "signature">) {
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

function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
}

function requireBearer(request: Request, token?: string) {
  if (!token) return null;
  const header = request.headers.get("Authorization") ?? "";
  return timingSafeEqual(header, `Bearer ${token}`) ? null : "Unauthorized.";
}

function cleanId(value: string) {
  return value.trim().slice(0, 160);
}

function positiveNumber(value: unknown, fallback: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : fallback;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function ok(env: Env, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders(env) });
}

function fail(env: Env, error: string, status: number) {
  return ok(env, { ok: false, error }, status);
}
