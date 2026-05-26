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
  source: "chat" | "kanban-chat" | "scheduler" | "manual" | "observed-hermes-usage" | "observed-openclaw-usage" | "observed-runtime-usage";
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
const REMOTE_HONEY_TIMEOUT_MS = 8_000;

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
    const model = input.model ?? "hivemindos/private-runtime";
    const timestamp = new Date().toISOString();
    const remoteResult = remote.signingSecret
      ? await recordRemoteHoneyUsage(remote, {
        agentId: input.agentId,
        model,
        source: input.source ?? "chat",
        tokensUsed,
      }).catch(() => null)
      : await recordRemoteHoneyObservation(remote, {
        eventId: randomUUID(),
        agentId: input.agentId,
        model,
        source: "observed-runtime-usage",
        tokensUsed,
        timestamp,
      }).catch(() => null);
    if (remoteResult) {
      return {
        ledger: remoteResult.ledger,
        event: {
          id: remoteResult.eventId,
          agentId: input.agentId,
          agentName: input.agentName,
          kind: "usage" as const,
          source: remote.signingSecret ? input.source ?? "chat" : "observed-runtime-usage",
          tokensUsed: remote.signingSecret ? tokensUsed : remoteResult.acceptedTokens,
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

export async function recordObservedHoneyUsage(input: {
  eventId: string;
  agentId: string;
  agentName?: string;
  source: Extract<HoneyLedgerEvent["source"], "observed-hermes-usage" | "observed-openclaw-usage" | "observed-runtime-usage">;
  model: string;
  tokensUsed: number;
  timestamp?: string;
}) {
  const tokensUsed = Math.max(0, Math.round(input.tokensUsed));
  const ledger = await readHoneyLedger();
  if (!input.eventId.trim() || tokensUsed <= 0) return { ledger, event: null };

  const remote = getRemoteLedgerConfig();
  if (remote) {
    const remoteResult = await recordRemoteHoneyObservation(remote, {
      eventId: input.eventId,
      agentId: input.agentId,
      model: input.model,
      source: input.source,
      tokensUsed,
      timestamp: input.timestamp ?? new Date().toISOString(),
    }).catch(() => null);
    if (remoteResult) {
      return {
        ledger: remoteResult.ledger,
        event: remoteResult.acceptedTokens > 0 ? {
          id: input.eventId,
          agentId: input.agentId,
          agentName: input.agentName,
          kind: "usage" as const,
          source: input.source,
          tokensUsed: remoteResult.acceptedTokens,
          honeyDelta: remoteResult.honeyDelta,
          hiveDelta: 0,
          createdAt: remoteResult.createdAt,
        } : null,
      };
    }
  }

  if (ledger.events.some((event) => event.id === input.eventId)) return { ledger, event: null };
  const targetHoneyDelta = calculateHoneyForTokens(tokensUsed, ledger.honeyPerThousandTokens);
  const remainingPool = Math.max(0, ledger.rewardPoolHive - ledger.rewardPoolEmittedHive);
  const honeyDelta = Math.min(targetHoneyDelta, remainingPool);
  const event: HoneyLedgerEvent = {
    id: input.eventId,
    agentId: input.agentId,
    agentName: input.agentName,
    kind: "usage",
    source: input.source,
    tokensUsed,
    honeyDelta,
    hiveDelta: 0,
    createdAt: input.timestamp ?? new Date().toISOString(),
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
    signal: AbortSignal.timeout(REMOTE_HONEY_TIMEOUT_MS),
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
    signal: AbortSignal.timeout(REMOTE_HONEY_TIMEOUT_MS),
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
    acceptedTokens: input.tokensUsed,
    createdAt: timestamp,
  };
}

async function recordRemoteHoneyObservation(
  remote: RemoteLedgerConfig,
  input: { eventId: string; agentId: string; tokensUsed: number; model: string; source: HoneyLedgerEvent["source"]; timestamp: string },
) {
  const receipt: Omit<RemoteUsageReceipt, "issuerId"> & { issuerId?: string } = {
    eventId: input.eventId,
    workspaceId: await getWorkspaceId(),
    agentId: input.agentId,
    tokensUsed: input.tokensUsed,
    model: input.model,
    source: input.source,
    timestamp: input.timestamp,
  };
  const response = await fetch(`${remote.url}/observations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(receipt),
    signal: AbortSignal.timeout(REMOTE_HONEY_TIMEOUT_MS),
  });
  if (!response.ok) return null;
  const data = await response.json().catch(() => null) as {
    ok?: boolean;
    honeyDelta?: number;
    acceptedTokens?: number;
  } | null;
  const ledger = await readRemoteHoneyLedger(remote);
  if (!data?.ok || !ledger) return null;
  return {
    ledger,
    eventId: input.eventId,
    honeyDelta: Number(data.honeyDelta) || 0,
    acceptedTokens: Math.max(0, Math.round(Number(data.acceptedTokens ?? input.tokensUsed) || 0)),
    createdAt: input.timestamp,
  };
}

async function exchangeRemoteHoneyForHive(remote: RemoteLedgerConfig, agentId?: string) {
  const response = await fetch(`${remote.url}/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workspaceId: await getWorkspaceId(), agentId }),
    signal: AbortSignal.timeout(REMOTE_HONEY_TIMEOUT_MS),
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
  await writeIfChanged(INSTALL_ID_PATH, `${id}\n`);
  return id;
}

async function getWorkspaceId() {
  return getHoneyWorkspaceId();
}

async function writeHoneyLedger(ledger: HoneyLedger) {
  await mkdir(dirname(LEDGER_PATH), { recursive: true });
  await writeIfChanged(LEDGER_PATH, `${JSON.stringify(ledger, null, 2)}\n`);
}

async function writeIfChanged(path: string, content: string) {
  const current = await readFile(path, "utf8").catch(() => null);
  if (current === content) return;
  await writeFile(path, content, "utf8");
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
    balances: normalizeBalances(parsed.balances),
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

function normalizeBalances(value: unknown): HoneyTreasuryConfig["balances"] {
  if (!Array.isArray(value)) return undefined;
  return value
    .map((raw) => {
      if (!raw || typeof raw !== "object") return null;
      const balance = raw as Partial<NonNullable<HoneyTreasuryConfig["balances"]>[number]>;
      if (typeof balance.agentId !== "string" || !balance.agentId.trim()) return null;
      return {
        workspaceId: typeof balance.workspaceId === "string" ? balance.workspaceId : "",
        agentId: balance.agentId,
        tokensUsed: Math.max(0, Math.round(Number(balance.tokensUsed ?? 0) || 0)),
        lifetimeHoney: positiveNumber(balance.lifetimeHoney, 0),
        availableHoney: positiveNumber(balance.availableHoney, 0),
        hiveBalance: positiveNumber(balance.hiveBalance, 0),
        updatedAt: typeof balance.updatedAt === "string" ? balance.updatedAt : new Date(0).toISOString(),
      };
    })
    .filter((balance): balance is NonNullable<HoneyTreasuryConfig["balances"]>[number] => Boolean(balance));
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
