import { createHmac, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

import type { HoneyTreasuryConfig } from "@/lib/types/agent-wallet";
import { calculateHoneyForTokens, createDefaultHoneyTreasuryConfig } from "@/lib/utils/agent-wallet";

export type HoneyLedgerEvent = {
  id: string;
  agentId: string;
  agentName?: string;
  kind: "usage" | "exchange";
  source: "chat" | "kanban-chat" | "scheduler" | "manual";
  tokensUsed: number;
  honeyDelta: number;
  hiveDelta: number;
  createdAt: string;
};

export type HoneyLedger = HoneyTreasuryConfig & {
  events: HoneyLedgerEvent[];
  updatedAt: string;
};

const LEDGER_PATH = join(homedir(), ".hivemindos", "honey-ledger.json");
const INSTALL_ID_PATH = join(homedir(), ".hivemindos", "install-id");

export async function readHoneyLedger(): Promise<HoneyLedger> {
  const remote = getRemoteLedgerConfig();
  if (remote) {
    const remoteLedger = await readRemoteHoneyLedger(remote).catch(() => null);
    if (remoteLedger) return remoteLedger;
  }

  const fallback = createDefaultLedger();
  try {
    const raw = await readFile(LEDGER_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<HoneyLedger>;
    return normalizeLedger(parsed);
  } catch {
    return fallback;
  }
}

export async function recordHoneyUsage(input: {
  agentId: string;
  agentName?: string;
  source?: HoneyLedgerEvent["source"];
  model?: string;
  inputText: string;
  outputText: string;
}) {
  const tokensUsed = estimateTokens([input.inputText, input.outputText].join("\n"));
  const ledger = await readHoneyLedger();
  if (tokensUsed <= 0) return { ledger, event: null };

  const remote = getRemoteLedgerConfig();
  if (remote) {
    const remoteResult = await recordRemoteHoneyUsage(remote, {
      agentId: input.agentId,
      model: input.model ?? "hivemindos/private-runtime",
      source: input.source ?? "chat",
      tokensUsed,
    }).catch(() => null);
    if (remoteResult) {
      return {
        ledger: remoteResult.ledger,
        event: {
          id: remoteResult.eventId,
          agentId: input.agentId,
          agentName: input.agentName,
          kind: "usage" as const,
          source: input.source ?? "chat",
          tokensUsed,
          honeyDelta: remoteResult.honeyDelta,
          hiveDelta: 0,
          createdAt: remoteResult.createdAt,
        },
      };
    }
  }

  const targetHoneyDelta = calculateHoneyForTokens(tokensUsed, ledger.honeyPerThousandTokens);
  const remainingPool = Math.max(0, ledger.rewardPoolHive - ledger.rewardPoolEmittedHive);
  const honeyDelta = Math.min(targetHoneyDelta, remainingPool);
  const event: HoneyLedgerEvent = {
    id: randomUUID(),
    agentId: input.agentId,
    agentName: input.agentName,
    kind: "usage",
    source: input.source ?? "chat",
    tokensUsed,
    honeyDelta,
    hiveDelta: 0,
    createdAt: new Date().toISOString(),
  };

  ledger.agentTokenUsage[input.agentId] = (ledger.agentTokenUsage[input.agentId] ?? 0) + tokensUsed;
  ledger.rewardPoolEmittedHive = Math.round((ledger.rewardPoolEmittedHive + honeyDelta) * 1_000_000) / 1_000_000;
  ledger.rewardPoolRemainingHive = Math.max(0, Math.round((ledger.rewardPoolHive - ledger.rewardPoolEmittedHive) * 1_000_000) / 1_000_000);
  ledger.events.unshift(event);
  ledger.updatedAt = event.createdAt;
  await writeHoneyLedger(ledger);
  return { ledger, event };
}

export async function exchangeHoneyForHive(agentId?: string) {
  const remote = getRemoteLedgerConfig();
  if (remote) {
    const remoteResult = await exchangeRemoteHoneyForHive(remote, agentId).catch(() => null);
    if (remoteResult) return remoteResult;
  }

  const ledger = await readHoneyLedger();
  const agentIds = agentId ? [agentId] : Object.keys(ledger.agentTokenUsage);
  const events: HoneyLedgerEvent[] = [];
  const now = new Date().toISOString();

  for (const id of agentIds) {
    const honeyEarned = calculateHoneyForTokens(ledger.agentTokenUsage[id] ?? 0, ledger.honeyPerThousandTokens);
    const honeyExchanged = Math.min(honeyEarned, Math.max(0, ledger.agentHoneyExchanged[id] ?? 0));
    const remainingPool = Math.max(0, ledger.rewardPoolHive - ledger.rewardPoolEmittedHive);
    const honeyAvailable = Math.max(0, Math.min(remainingPool, Math.round((honeyEarned - honeyExchanged) * 1_000_000) / 1_000_000));
    if (honeyAvailable <= 0) continue;
    const hiveDelta = Math.round(honeyAvailable * ledger.tokenPerHoney * 1_000_000) / 1_000_000;
    ledger.agentHoneyExchanged[id] = Math.round((honeyExchanged + honeyAvailable) * 1_000_000) / 1_000_000;
    ledger.agentHiveBalances[id] = Math.round(((ledger.agentHiveBalances[id] ?? 0) + hiveDelta) * 1_000_000) / 1_000_000;
    ledger.rewardPoolExchangedHive = Math.round((ledger.rewardPoolExchangedHive + hiveDelta) * 1_000_000) / 1_000_000;
    events.push({
      id: randomUUID(),
      agentId: id,
      kind: "exchange",
      source: "manual",
      tokensUsed: 0,
      honeyDelta: -honeyAvailable,
      hiveDelta,
      createdAt: now,
    });
  }

  if (events.length) {
    ledger.events.unshift(...events);
    ledger.updatedAt = now;
    await writeHoneyLedger(ledger);
  }
  return { ledger, events };
}

function estimateTokens(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return Math.max(1, Math.ceil(trimmed.length / 4));
}

type RemoteLedgerConfig = {
  url: string;
  issuerId: string;
  signingSecret?: string;
  readToken?: string;
};

type RemoteUsageReceipt = {
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

function getRemoteLedgerConfig(): RemoteLedgerConfig | null {
  const url = process.env.HONEY_LEDGER_REMOTE_URL?.trim().replace(/\/+$/, "");
  if (!url) return null;
  return {
    url,
    signingSecret: process.env.HONEY_LEDGER_SIGNING_SECRET?.trim(),
    issuerId: process.env.HONEY_LEDGER_ISSUER_ID?.trim() || "hivemindos",
    readToken: process.env.HONEY_LEDGER_READ_TOKEN?.trim(),
  };
}

async function readRemoteHoneyLedger(remote: RemoteLedgerConfig): Promise<HoneyLedger | null> {
  const workspaceId = await getWorkspaceId();
  const response = await fetch(`${remote.url}/ledger?workspaceId=${encodeURIComponent(workspaceId)}`, {
    headers: authHeaders(remote.readToken),
    cache: "no-store",
  });
  if (!response.ok) return null;
  const data = await response.json().catch(() => null) as { ok?: boolean; ledger?: Partial<HoneyLedger> } | null;
  return data?.ok && data.ledger ? normalizeLedger(data.ledger) : null;
}

async function recordRemoteHoneyUsage(
  remote: RemoteLedgerConfig,
  input: { agentId: string; tokensUsed: number; model: string; source: HoneyLedgerEvent["source"] },
) {
  if (!remote.signingSecret) return null;

  const timestamp = new Date().toISOString();
  const receipt: Omit<RemoteUsageReceipt, "signature"> = {
    eventId: randomUUID(),
    issuerId: remote.issuerId,
    workspaceId: await getWorkspaceId(),
    agentId: input.agentId,
    tokensUsed: input.tokensUsed,
    model: input.model,
    source: input.source,
    timestamp,
  };
  const signedReceipt: RemoteUsageReceipt = {
    ...receipt,
    ...(remote.signingSecret ? { signature: signReceipt(receipt, remote.signingSecret) } : {}),
  };
  const response = await fetch(`${remote.url}/receipts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(signedReceipt),
  });
  if (!response.ok) return null;
  const data = await response.json().catch(() => null) as {
    ok?: boolean;
    honeyDelta?: number;
  } | null;
  const ledger = await readRemoteHoneyLedger(remote);
  if (!data?.ok || !ledger) return null;
  return {
    ledger,
    eventId: receipt.eventId,
    honeyDelta: Number(data.honeyDelta) || 0,
    createdAt: timestamp,
  };
}

async function exchangeRemoteHoneyForHive(remote: RemoteLedgerConfig, agentId?: string) {
  const response = await fetch(`${remote.url}/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workspaceId: await getWorkspaceId(), agentId }),
  });
  if (!response.ok) return null;
  const data = await response.json().catch(() => null) as {
    ok?: boolean;
    ledger?: Partial<HoneyLedger>;
    events?: HoneyLedgerEvent[];
  } | null;
  if (!data?.ok || !data.ledger) return null;
  return { ledger: normalizeLedger(data.ledger), events: Array.isArray(data.events) ? data.events : [] };
}

function signReceipt(receipt: Omit<RemoteUsageReceipt, "signature">, secret: string) {
  return createHmac("sha256", secret).update(canonicalReceipt(receipt)).digest("hex");
}

function canonicalReceipt(receipt: Omit<RemoteUsageReceipt, "signature">) {
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

function authHeaders(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getHoneyWorkspaceId() {
  const explicit = process.env.HONEY_LEDGER_WORKSPACE_ID?.trim();
  if (explicit) return explicit;

  try {
    const current = (await readFile(INSTALL_ID_PATH, "utf8")).trim();
    if (current) return current;
  } catch {
    // Create a random install id below; no local machine details are sent.
  }

  const id = `ws_${randomUUID()}`;
  await mkdir(dirname(INSTALL_ID_PATH), { recursive: true });
  await writeFile(INSTALL_ID_PATH, `${id}\n`, "utf8");
  return id;
}

async function getWorkspaceId() {
  return getHoneyWorkspaceId();
}

async function writeHoneyLedger(ledger: HoneyLedger) {
  await mkdir(dirname(LEDGER_PATH), { recursive: true });
  await writeFile(LEDGER_PATH, `${JSON.stringify(ledger, null, 2)}\n`, "utf8");
}

function createDefaultLedger(): HoneyLedger {
  return {
    ...createDefaultHoneyTreasuryConfig(),
    events: [],
    updatedAt: new Date(0).toISOString(),
  };
}

function normalizeLedger(parsed: Partial<HoneyLedger>): HoneyLedger {
  const fallback = createDefaultLedger();
  const rewardPoolHive = positiveNumber(parsed.rewardPoolHive, fallback.rewardPoolHive);
  const rewardPoolEmittedHive = positiveNumber(parsed.rewardPoolEmittedHive, fallback.rewardPoolEmittedHive);
  return {
    ...fallback,
    ...parsed,
    honeyPerThousandTokens: positiveNumber(parsed.honeyPerThousandTokens, fallback.honeyPerThousandTokens),
    tokenPerHoney: positiveNumber(parsed.tokenPerHoney, fallback.tokenPerHoney),
    agentTokenUsage: plainNumberRecord(parsed.agentTokenUsage),
    agentHoneyExchanged: plainNumberRecord(parsed.agentHoneyExchanged),
    agentHiveBalances: plainNumberRecord(parsed.agentHiveBalances),
    rewardPoolHive,
    rewardPoolRemainingHive: positiveNumber(parsed.rewardPoolRemainingHive, Math.max(0, rewardPoolHive - rewardPoolEmittedHive)),
    rewardPoolEmittedHive,
    rewardPoolExchangedHive: positiveNumber(parsed.rewardPoolExchangedHive, fallback.rewardPoolExchangedHive),
    rewardPoolUsd: positiveNumber(parsed.rewardPoolUsd, fallback.rewardPoolUsd),
    rewardPoolVolumeUsd: positiveNumber(parsed.rewardPoolVolumeUsd, fallback.rewardPoolVolumeUsd),
    rewardPoolShareOfVolume: positiveNumber(parsed.rewardPoolShareOfVolume, fallback.rewardPoolShareOfVolume),
    hivePerMillionTokens: positiveNumber(parsed.hivePerMillionTokens, fallback.hivePerMillionTokens),
    hiveTokenAddress: typeof parsed.hiveTokenAddress === "string" ? parsed.hiveTokenAddress : fallback.hiveTokenAddress,
    events: Array.isArray(parsed.events) ? parsed.events.filter(isLedgerEvent).slice(0, 500) : [],
    updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : fallback.updatedAt,
  };
}

function positiveNumber(value: unknown, fallback: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : fallback;
}

function plainNumberRecord(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .map(([key, raw]) => [key, Math.max(0, Number(raw) || 0)] as const)
      .filter(([key]) => Boolean(key)),
  );
}

function isLedgerEvent(value: unknown): value is HoneyLedgerEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<HoneyLedgerEvent>;
  return Boolean(event.id && event.agentId && event.kind && event.createdAt);
}
