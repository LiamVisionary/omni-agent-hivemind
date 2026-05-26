import "server-only";

export interface MoneyClawClientOptions {
  apiKey?: string;
  apiKeyEnvName?: string;
  baseUrl?: string;
}

export interface MoneyClawStatus {
  configured: boolean;
  apiKeyEnvName: string;
  baseUrl: string;
  account?: unknown;
  balance?: unknown;
  depositAddress?: unknown;
  paymentIntents?: unknown;
  errors: Record<string, string>;
}

export type { MoneyClawStatus as AgentMoneyClawStatus };

const DEFAULT_API_KEY_ENV = "MONEYCLAW_API_KEY";
const DEFAULT_BASE_URL = "https://moneyclaw.ai/api";

export async function getMoneyClawStatus(options: MoneyClawClientOptions = {}): Promise<MoneyClawStatus> {
  const client = createMoneyClawClient(options);
  if (!client.apiKey) {
    return {
      configured: false,
      apiKeyEnvName: client.apiKeyEnvName,
      baseUrl: client.baseUrl,
      errors: {
        auth: `Set ${client.apiKeyEnvName} with a MoneyClaw API key that starts with mcl_.`,
      },
    };
  }

  const [account, balance, depositAddress, paymentIntents] = await Promise.allSettled([
    client.request("/me"),
    client.request("/me/balance"),
    client.request("/me/deposit-address"),
    client.request("/payment-intents?limit=10"),
  ]);

  const errors: Record<string, string> = {};
  return {
    configured: true,
    apiKeyEnvName: client.apiKeyEnvName,
    baseUrl: client.baseUrl,
    account: settledValue("account", account, errors),
    balance: settledValue("balance", balance, errors),
    depositAddress: settledValue("depositAddress", depositAddress, errors),
    paymentIntents: settledValue("paymentIntents", paymentIntents, errors),
    errors,
  };
}

function createMoneyClawClient(options: MoneyClawClientOptions) {
  const apiKeyEnvName = cleanEnvName(options.apiKeyEnvName) || DEFAULT_API_KEY_ENV;
  const apiKey = options.apiKey || process.env[apiKeyEnvName] || (apiKeyEnvName === DEFAULT_API_KEY_ENV ? "" : process.env[DEFAULT_API_KEY_ENV]) || "";
  const baseUrl = normalizeBaseUrl(options.baseUrl || process.env.MONEYCLAW_BASE_URL || DEFAULT_BASE_URL);
  return {
    apiKeyEnvName,
    apiKey,
    baseUrl,
    async request(path: string) {
      const response = await fetch(`${baseUrl}${path}`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        cache: "no-store",
      });
      const text = await response.text();
      const data = parseJson(text);
      if (!response.ok) {
        const detail = extractErrorMessage(data) || response.statusText || "MoneyClaw request failed";
        throw new Error(`MoneyClaw ${response.status}: ${detail}`);
      }
      return data;
    },
  };
}

function cleanEnvName(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return "";
  if (!/^[A-Z0-9_]+$/.test(trimmed)) throw new Error("MoneyClaw env name must contain only A-Z, 0-9, and underscores.");
  return trimmed;
}

function normalizeBaseUrl(value: string) {
  const trimmed = value.trim().replace(/\/+$/, "");
  const url = new URL(trimmed || DEFAULT_BASE_URL);
  if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    throw new Error("MoneyClaw base URL must use HTTPS unless it is localhost.");
  }
  return url.toString().replace(/\/+$/, "");
}

function parseJson(text: string) {
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function extractErrorMessage(data: unknown) {
  if (!data || typeof data !== "object") return "";
  const record = data as Record<string, unknown>;
  return stringValue(record.error) || stringValue(record.message) || stringValue(record.detail);
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function settledValue<T>(key: string, result: PromiseSettledResult<T>, errors: Record<string, string>) {
  if (result.status === "fulfilled") return result.value;
  errors[key] = result.reason instanceof Error ? result.reason.message : "MoneyClaw request failed";
  return undefined;
}
