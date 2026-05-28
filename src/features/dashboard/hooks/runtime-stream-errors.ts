function parseJsonLikeString(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed || !/^[{[]/.test(trimmed)) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function userFacingRuntimeError(message: string, code?: string) {
  const normalizedMessage = message.trim();
  const normalizedCode = String(code ?? "").trim();
  if (!normalizedMessage) return "";

  const authCode = normalizedCode === "401" || normalizedCode === "403";
  const providerAuthMessage = /user not found|invalid api key|incorrect api key|unauthorized|forbidden|authentication|permission/i.test(normalizedMessage);
  if (authCode || providerAuthMessage) {
    const suffix = normalizedCode ? ` (${normalizedCode})` : "";
    return `The model provider rejected this request because its API key is invalid, expired, or not linked to an active account. Update the provider key, then try again.${suffix}`;
  }

  if (normalizedCode === "429" || /rate.?limit|too many requests|promo capacity|capacity|provider returned error \(429\)/i.test(normalizedMessage)) {
    return "The model provider is rate-limiting this request. Adaptive will try another free model when possible; otherwise try again shortly or choose a paid fallback model. (429)";
  }

  if (/openrouter .*network issue|not reachable at https:\/\/openrouter\.ai|fetch failed/i.test(normalizedMessage)) {
    return "OpenRouter had a temporary network issue while Adaptive was trying free models. Try again shortly, or set a paid fallback model in Adaptive advanced settings.";
  }

  if (normalizedMessage && normalizedCode) return `${normalizedMessage} (${normalizedCode})`;
  return normalizedMessage;
}

export function runtimeErrorMessage(payload: unknown): string {
  if (typeof payload === "string") {
    const nested = parseJsonLikeString(payload);
    if (nested) return runtimeErrorMessage(nested) || payload.trim();
    return userFacingRuntimeError(payload);
  }
  if (!payload || typeof payload !== "object") return "";
  const record = payload as Record<string, unknown>;
  const error = record.error;
  if (typeof error === "string") return runtimeErrorMessage(error);
  if (error && typeof error === "object") {
    const errorRecord = error as Record<string, unknown>;
    const message = String(errorRecord.message ?? errorRecord.error ?? errorRecord.detail ?? "").trim();
    const code = String(errorRecord.code ?? errorRecord.type ?? "").trim();
    if (message) return userFacingRuntimeError(message, code);
    try {
      const serialized = JSON.stringify(error);
      if (serialized && serialized !== "{}") return serialized;
    } catch {
      return "Runtime returned an error.";
    }
  }
  const event = record.event && typeof record.event === "object" ? record.event as Record<string, unknown> : null;
  if (typeof event?.error === "string") return userFacingRuntimeError(event.error);
  if (typeof event?.message === "string" && /error|failed|unauthorized|forbidden|invalid/i.test(String(event.type ?? ""))) {
    return userFacingRuntimeError(event.message);
  }
  if (typeof record.message === "string" && /error|failed|unauthorized|forbidden|invalid/i.test(String(record.type ?? event?.type ?? ""))) {
    return userFacingRuntimeError(record.message);
  }
  return "";
}

export async function responseErrorMessage(response: Response, fallback: string) {
  const text = await response.text().catch(() => "");
  if (!text.trim()) return fallback;
  try {
    const parsed = JSON.parse(text);
    return runtimeErrorMessage(parsed) || runtimeErrorMessage((parsed as Record<string, unknown>).message) || fallback;
  } catch {
    return text.trim().slice(0, 1000) || fallback;
  }
}

export function parseRuntimeSsePayload(payload: string): unknown {
  try {
    return JSON.parse(payload);
  } catch {
    return { error: `Runtime returned malformed stream data: ${payload.slice(0, 240)}` };
  }
}
