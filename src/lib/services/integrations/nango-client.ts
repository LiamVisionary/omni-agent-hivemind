import { platform, release } from "os";
import type { NangoConnectionSummary, NangoHostHealth } from "@/lib/types/integrations";

type NangoProxyConfiguration = {
  endpoint?: string;
  providerConfigKey?: string;
  connectionId?: string;
};

type NangoListConnectionsResponse = {
  connections?: unknown[];
  data?: unknown[];
};

const DEFAULT_NANGO_HOST = "http://localhost:3003";
const NANGO_NODE_CLIENT_VERSION = "adapted-from-nango-node-client";

export function normalizeNangoHost(input?: string | null) {
  const value = input?.trim() || DEFAULT_NANGO_HOST;
  const parsed = new URL(value);
  parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  return parsed.toString().replace(/\/+$/, "");
}

export function getNangoUserAgent(userAgent?: string) {
  const osName = platform().replace(" ", "_");
  const osVersion = release().replace(" ", "_");
  return `hivemindos-nango/${NANGO_NODE_CLIENT_VERSION} (${osName}/${osVersion}; node.js/${process.versions.node})${userAgent ? `; ${userAgent}` : ""}`;
}

export function addNangoQueryParams(url: URL, queries?: Record<string, unknown>) {
  if (!queries) return;
  Object.entries(queries).forEach(([name, value]) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => url.searchParams.set(name, String(entry)));
    } else if (value !== null && typeof value !== "undefined") {
      url.searchParams.set(name, String(value));
    }
  });
}

export function validateNangoProxyConfiguration(config: NangoProxyConfiguration) {
  const requiredParams: Array<keyof NangoProxyConfiguration> = ["endpoint", "providerConfigKey", "connectionId"];
  requiredParams.forEach((param) => {
    if (typeof config[param] === "undefined" || config[param] === "") {
      throw new Error(`${param} is missing and is required to make a Nango proxy call.`);
    }
  });
}

export function nangoAuthHeaders(secretKey?: string) {
  return {
    "User-Agent": getNangoUserAgent(),
    ...(secretKey ? { Authorization: `Bearer ${secretKey}` } : {}),
  };
}

export async function checkNangoHealth(baseUrl: string): Promise<NangoHostHealth> {
  const url = `${normalizeNangoHost(baseUrl)}/health`;
  const started = Date.now();
  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: { "User-Agent": getNangoUserAgent() },
      signal: AbortSignal.timeout(3_500),
    });
    const result = await response.text().then((text) => {
      if (!text.trim()) return "";
      try {
        const data = JSON.parse(text) as { result?: string };
        return data.result ?? text.slice(0, 80);
      } catch {
        return text.slice(0, 80);
      }
    });
    return {
      ok: response.ok,
      checkedAt: new Date().toISOString(),
      url,
      latencyMs: Date.now() - started,
      status: response.status,
      result,
    };
  } catch (error) {
    return {
      ok: false,
      checkedAt: new Date().toISOString(),
      url,
      latencyMs: Date.now() - started,
      error: error instanceof Error ? error.message : "Nango health check failed.",
    };
  }
}

export async function listNangoConnections(input: {
  baseUrl: string;
  secretKey?: string;
  limit?: number;
}): Promise<NangoConnectionSummary[]> {
  if (!input.secretKey?.trim()) return [];
  const url = new URL(`${normalizeNangoHost(input.baseUrl)}/connections`);
  addNangoQueryParams(url, { limit: input.limit ?? 50 });
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...nangoAuthHeaders(input.secretKey),
    },
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) throw new Error(`Nango connections returned HTTP ${response.status}.`);
  const payload = await response.json() as NangoListConnectionsResponse;
  const rows = Array.isArray(payload.connections) ? payload.connections : Array.isArray(payload.data) ? payload.data : [];
  return rows.map(summarizeConnection).filter((connection): connection is NangoConnectionSummary => Boolean(connection));
}

function summarizeConnection(row: unknown): NangoConnectionSummary | null {
  if (!row || typeof row !== "object") return null;
  const record = row as Record<string, unknown>;
  const tags = typeof record.tags === "object" && record.tags ? record.tags as Record<string, unknown> : {};
  const endUser = typeof record.end_user === "object" && record.end_user ? record.end_user as Record<string, unknown> : {};
  const id = stringValue(record.connection_id) || stringValue(record.connectionId) || stringValue(record.id);
  const providerConfigKey = stringValue(record.provider_config_key) || stringValue(record.providerConfigKey);
  if (!id || !providerConfigKey) return null;
  return {
    id,
    providerConfigKey,
    provider: stringValue(record.provider),
    displayName: stringValue(tags.end_user_display_name) || stringValue(tags.displayName) || stringValue(endUser.display_name),
    email: stringValue(tags.end_user_email) || stringValue(tags.email) || stringValue(endUser.email),
    createdAt: stringValue(record.created_at) || stringValue(record.createdAt),
    updatedAt: stringValue(record.updated_at) || stringValue(record.updatedAt),
  };
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
