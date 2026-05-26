import { NextRequest } from "next/server";
import { execFile } from "child_process";
import { stat } from "fs/promises";
import { resolve } from "path";
import { promisify } from "util";
import type { AgentProfile, SharedVaultConfig } from "@/lib/types/agent-runtime";
import { getRuntimeUrl } from "@/lib/types/agent-runtime";
import { sendMessageViaGateway } from "@/lib/services/openclaw/gateway-client";
import { getGatewayAuthToken } from "@/lib/services/openclaw/gateway-health";
import { proxyInput, proxyOutput } from "@/lib/services/agent-security-proxy";
import type { AgentWalletConfig } from "@/lib/types/agent-wallet";
import { summarizeX402Policy } from "@/lib/services/wallet/x402-agent-fetch";
import { getRuntimeAdapter } from "@/lib/services/runtime-adapters/registry";
import { recordHoneyUsage } from "@/lib/services/wallet/honey-ledger";
import { recordTelemetryBatch } from "@/lib/services/telemetry/local-telemetry";
import { normalizeRuntimeStreamEvent, RUNTIME_STREAM_EVENT_TYPES } from "@/lib/services/runtime-stream-events";

export const runtime = "nodejs";
export const maxDuration = 600;

type IncomingMessage = {
  role: string;
  content: string | Array<{
    type: string;
    text?: string;
    image_url?: { url?: string };
    file?: { filename?: string; file_data?: string };
  }>;
};

type RuntimeRouteTelemetry = {
  request: NextRequest;
  routeStartedAt: number;
};

const INTERACTIVE_RUNTIME_LOCK_MS = 130_000;
const RUNTIME_FETCH_TIMEOUT_MS = 10 * 60 * 1000;
const interactiveRuntimeLocks = new Map<string, number>();
const execFileAsync = promisify(execFile);

type WorkspaceSnapshot = {
  head: string;
  dirty: boolean;
  statusLines: string[];
  signature: string;
};

function telemetryPayloadForProfile(profile?: AgentProfile) {
  if (!profile) return {};
  return {
    agentId: profile.id,
    agentName: profile.name,
    runtime: profile.runtime,
    runtimeKind: profile.runtimeKind ?? null,
    hasGatewayUrl: Boolean(profile.gatewayUrl?.trim()),
    hasTelemetryUrl: Boolean(profile.telemetryUrl?.trim()),
    hasToken: Boolean(profile.token?.trim()),
    machineName: profile.machineName ?? null,
  };
}

async function recordRouteTelemetry(request: NextRequest, type: string, payload: Record<string, unknown> = {}) {
  const runId = request.headers.get("x-hivemind-run-id");
  await recordTelemetryBatch([{
    source: "route",
    type,
    runId,
    payload,
  }]).catch(() => undefined);
}

function recordRuntimeTelemetry(telemetry: RuntimeRouteTelemetry | undefined, type: string, payload: Record<string, unknown> = {}) {
  if (!telemetry) return;
  void recordRouteTelemetry(telemetry.request, type, {
    ...payload,
    elapsedMs: Date.now() - telemetry.routeStartedAt,
  });
}

function userFacingMachineName(profile: AgentProfile) {
  const name = profile.machineName?.trim();
  if (!name || /^this machine$/i.test(name)) return "This Mac";
  return name;
}

function interactiveRuntimeLockKey(profile: AgentProfile, url: string) {
  if (profile.runtime !== "hermes" && profile.runtime !== "openai-compatible") return "";
  if ((profile.runtimeKind ?? "interactive") !== "interactive") return "";
  return url;
}

function reserveInteractiveRuntime(key: string) {
  if (!key) return true;
  const now = Date.now();
  const lockedAt = interactiveRuntimeLocks.get(key) ?? 0;
  if (lockedAt && now - lockedAt < INTERACTIVE_RUNTIME_LOCK_MS) return false;
  interactiveRuntimeLocks.set(key, now);
  return true;
}

function releaseInteractiveRuntime(key: string) {
  if (!key) return;
  interactiveRuntimeLocks.delete(key);
}

function buildWorkingDirectoryContext(workingDirectory?: string): string {
  const trimmed = workingDirectory?.trim();
  if (!trimmed) return "";
  return [
    "Working directory context:",
    `- Use this directory for the chat unless the user says otherwise: ${trimmed}`,
  ].join("\n");
}

async function readWorkspaceSnapshot(workingDirectory?: string): Promise<WorkspaceSnapshot | null> {
  const trimmed = workingDirectory?.trim();
  if (!trimmed) return null;
  try {
    const cwd = resolve(trimmed);
    const pathStats = await stat(cwd);
    if (!pathStats.isDirectory()) return null;
    const [head, status] = await Promise.all([
      execFileAsync("git", ["-C", cwd, "rev-parse", "HEAD"], { timeout: 5_000 }).then(({ stdout }) => stdout.trim()),
      execFileAsync("git", ["-C", cwd, "status", "--porcelain"], { timeout: 5_000, maxBuffer: 500_000 }).then(({ stdout }) => stdout.trim()),
    ]);
    return {
      head,
      dirty: status.length > 0,
      statusLines: status ? status.split("\n").slice(0, 12) : [],
      signature: `${head}:${status}`,
    };
  } catch {
    return null;
  }
}

function workspaceChangeSummary(before: WorkspaceSnapshot | null, after: WorkspaceSnapshot | null) {
  if (!after || before?.signature === after.signature) return "";
  const changedFiles = after.statusLines.map((line) => line.slice(3).trim()).filter(Boolean);
  const headChanged = before?.head && before.head !== after.head;
  return [
    "Runtime completed with observable workspace changes.",
    headChanged ? `HEAD changed from ${before.head.slice(0, 7)} to ${after.head.slice(0, 7)}.` : "",
    changedFiles.length ? `Changed files: ${changedFiles.slice(0, 8).join(", ")}${changedFiles.length > 8 ? ", ..." : ""}.` : "",
  ].filter(Boolean).join(" ");
}

function activeSharedVault(profile: AgentProfile, sharedVault?: SharedVaultConfig): SharedVaultConfig | null {
  if (!sharedVault?.enabled || profile.useSharedVault === false) return null;
  if (!sharedVault.vaultPath.trim()) return null;
  return sharedVault;
}

function buildVaultContext(sharedVault: SharedVaultConfig | null): string {
  if (!sharedVault) return "";
  const lines = [
    "Shared Obsidian vault context:",
    `- Vault path: ${sharedVault.vaultPath}`,
    "- Shared skills folder: Skills/. Read Skills/README.md for the index, then read the relevant Skills/<slug>/SKILL.md before using a shared skill.",
    `- Agent inbox folder: ${sharedVault.inboxFolder || "(not set)"}`,
    `- Shared note: ${sharedVault.sharedNotePath || "(not set)"}`,
    `- Shared Kanban folder: ${sharedVault.kanbanFolder || "Projects/HivemindOS/Kanban"}`,
    `- Agent notifications folder: ${sharedVault.notificationsFolder || "agent-notifications"}`,
    `- Vault sync owner: ${sharedVault.syncProvider === "syncthing" ? "HivemindOS Syncthing over Tailscale" : sharedVault.syncProvider === "manual" ? "manual Tailscale SSH repair only" : "external provider such as Obsidian Sync, iCloud, Dropbox, Git, or another folder sync tool"}.`,
    "- Kanban workflow: Ideas are inert; Ready for Queen is the pickup lane; Working is claimed work; Needs Human is only for decisions/access/approval; Done is completed work.",
    "- Queen Bee behavior: if you are the Queen Bee, watch Ready for Queen, choose yourself or a worker class, move claimed cards to Working, comment with the routing reason, and move straight to Done when no human intervention is needed.",
    "- Kanban API: use the dashboard's /api/kanban endpoint for task creation, status moves, comments, and board reads when available. Use /api/orchestrator for the MCP-ready tool/agent/task surface when the dashboard provides agent role metadata.",
    "- Kanban storage: boards are stored as kanban.json files under the shared Kanban folder. Collaboration can use any folder sync provider, including Obsidian Sync, iCloud Drive, Dropbox, Syncthing, Git, or the built-in Syncthing-over-Tailscale pairing.",
    "- Notifications: when you need the user's attention outside chat, write a markdown notification under the notifications folder using priority low, normal, high, or urgent. High-priority messaging escalation is only a preference flag; a configured messaging agent should handle Telegram, iMessage, Discord, or similar delivery when configured.",
    "- Brain access tracking: when you inspect a vault note through the dashboard, call /api/obsidian/access with vaultPath, notePath, agentName, agentId, runtime, machineName, and action so the shared brain records who accessed what and when.",
    `- HivemindOS folder path: ${sharedVault.controlRoomPath || "(not set)"}`,
    `- Instructions: ${sharedVault.instructions || "Read AGENTS.md before durable vault edits."}`,
  ];
  return lines.join("\n");
}

function buildWalletToolContext(wallet?: AgentWalletConfig): string {
  if (!wallet) return "";
  const lines = [
    "Agent wallet/payment context:",
    summarizeX402Policy(wallet),
    "- Tool: x402_fetch",
    "- Dashboard endpoint: POST /api/wallet/x402 with { agentId, url, method, headers, body, policy, confirmation }.",
    "- Approval gate: if autopay is off or the payment is over the approval threshold, do not proceed until the user explicitly supplies PAY_X402.",
    "- Hard rule: never ask for or reveal private keys; the dashboard signs from its encrypted local vault.",
  ];
  return lines.join("\n");
}

function buildAgentProfileContext(profile: AgentProfile): string {
  const lines = [
    "Agent profile context:",
    `- Name: ${profile.name || profile.id}`,
    `- Runtime: ${profile.runtime}`,
    profile.machineName ? `- Machine: ${profile.machineName}` : "",
    profile.beeRole ? `- Bee role: ${profile.beeRole}` : "",
    profile.workerClass ? `- Worker class: ${profile.workerClass}` : "",
    profile.provider || profile.model ? `- Preferred model: ${[profile.provider, profile.model].filter(Boolean).join("/")}` : "",
    profile.skillProfilePrompt?.trim() ? `- Role instructions: ${profile.skillProfilePrompt.trim()}` : "",
    profile.preferredSkillSlugs?.length ? `- Preferred skills: ${profile.preferredSkillSlugs.join(", ")}` : "",
    "- HivemindOS chat bridge: do not use terminal-only interactive clarification prompts. If a question is unavoidable, emit or return a concise question with explicit choices so the dashboard can render it, otherwise make a reasonable assumption and continue.",
  ].filter(Boolean);
  return lines.length > 2 ? lines.join("\n") : "";
}

function safeAgentEnv(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const env: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) && typeof entry === "string") env[key] = entry;
  }
  return Object.keys(env).length ? env : undefined;
}

function extractUserText(messages: IncomingMessage[]): string {
  const lastUserMessage = [...messages].reverse().find((message) => message.role === "user");
  if (!lastUserMessage) return "";
  if (typeof lastUserMessage.content === "string") return lastUserMessage.content;
  return lastUserMessage.content
    .filter((part) => part.type === "text")
    .map((part) => part.text ?? "")
    .join(" ");
}

function messageHasContent(message: IncomingMessage) {
  if (typeof message.content === "string") return Boolean(message.content.trim());
  return message.content.some((part) => {
    if (part.type === "text") return Boolean(part.text?.trim());
    if (part.type === "image_url") return Boolean(part.image_url?.url);
    if (part.type === "file") return Boolean(part.file?.file_data);
    return false;
  });
}

function latestUserMessage(messages: IncomingMessage[]) {
  return [...messages].reverse().find((message) => message.role === "user" && messageHasContent(message));
}

function attachmentPromptSummary(message?: IncomingMessage) {
  if (!message || typeof message.content === "string") return "";
  const images = message.content.filter((part) => part.type === "image_url" && part.image_url?.url).length;
  const files = message.content.filter((part) => part.type === "file" && part.file?.file_data).length;
  const pieces = [
    images ? `${images} image${images === 1 ? "" : "s"}` : "",
    files ? `${files} file${files === 1 ? "" : "s"}` : "",
  ].filter(Boolean);
  return pieces.length ? `Please respond to the attached ${pieces.join(" and ")}.` : "";
}

function streamEventForPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") return undefined;
  const record = payload as Record<string, unknown>;
  if (typeof record.error === "string") {
    return normalizeRuntimeStreamEvent({ type: RUNTIME_STREAM_EVENT_TYPES.ERROR, error: record.error });
  }
  const chunk = extractChunk(payload);
  if (chunk) {
    return normalizeRuntimeStreamEvent({ type: RUNTIME_STREAM_EVENT_TYPES.TEXT_DELTA, delta: chunk });
  }
  if (record.tool_call && typeof record.tool_call === "object") {
    return normalizeRuntimeStreamEvent({ type: RUNTIME_STREAM_EVENT_TYPES.TOOL_DONE, ...(record.tool_call as Record<string, unknown>) });
  }
  if (record.status && typeof record.status === "object") {
    return normalizeRuntimeStreamEvent({ type: "chat.status", ...(record.status as Record<string, unknown>) });
  }
  if (record.clarify && typeof record.clarify === "object") {
    return normalizeRuntimeStreamEvent({ type: RUNTIME_STREAM_EVENT_TYPES.CLARIFY, ...(record.clarify as Record<string, unknown>) });
  }
  if (record.prompt && typeof record.prompt === "object") {
    return normalizeRuntimeStreamEvent({ type: RUNTIME_STREAM_EVENT_TYPES.CLARIFY, ...(record.prompt as Record<string, unknown>) });
  }
  if (record.session && typeof record.session === "object") {
    return normalizeRuntimeStreamEvent({ type: RUNTIME_STREAM_EVENT_TYPES.SESSION, ...(record.session as Record<string, unknown>) });
  }
  return undefined;
}

function ssePayload(payload: unknown): string {
  const event = streamEventForPayload(payload);
  const enriched = event && payload && typeof payload === "object" && !("event" in payload)
    ? { ...(payload as Record<string, unknown>), event }
    : payload;
  return `data: ${JSON.stringify(enriched)}\n\n`;
}

function extractChunk(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const value = payload as {
    delta?: string;
    text?: string;
    content?: string;
    message?: { content?: string };
    choices?: Array<{ delta?: { content?: string }; text?: string; message?: { content?: string } }>;
  };
  return (
    value.choices?.[0]?.delta?.content ??
    value.choices?.[0]?.text ??
    value.choices?.[0]?.message?.content ??
    value.delta ??
    value.text ??
    value.content ??
    value.message?.content ??
    ""
  );
}

function isOpenAICompatibleRuntime(profile: AgentProfile) {
  return profile.runtime === "openai-compatible";
}

function buildOpenAICompatibleUrl(profile: AgentProfile) {
  const base = profile.gatewayUrl.trim().replace(/\/+$/, "");
  const suffix = profile.chatPath?.trim() || "/v1/chat/completions";
  return `${base}${suffix.startsWith("/") ? suffix : `/${suffix}`}`;
}

function openAICompatibleModel(profile: AgentProfile) {
  return profile.model?.trim() || process.env.LOCAL_OPENAI_MODEL?.trim() || process.env.NEXT_PUBLIC_LOCAL_OPENAI_MODEL?.trim() || "local-model";
}

async function recordChatHoney(profile: AgentProfile, inputText: string, outputText: string, enabled: boolean, source: "chat" | "kanban-chat" = "chat") {
  if (!enabled) return null;
  if (!outputText.trim()) return null;
  const result = await recordHoneyUsage({
    agentId: profile.id,
    agentName: profile.name,
    source,
    model: profile.runtime,
    inputText,
    outputText,
  });
  return result.event;
}

function validateHttpRuntimeProfile(profile: AgentProfile): string | null {
  const gatewayUrl = profile.gatewayUrl?.trim();
  if (!gatewayUrl) {
    return profile.telemetryUrl
      ? "This discovered agent is connected through a local agent bridge. Add a runtime chat URL before sending messages."
      : "Missing runtime chat URL.";
  }

  try {
    const parsed = new URL(gatewayUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return "Runtime chat URL must start with http:// or https://.";
    }
  } catch {
    return "Runtime chat URL is invalid.";
  }

  return null;
}

function runtimeFetchError(profile: AgentProfile, url: string, error: unknown) {
  const reason = error instanceof Error ? error.message : "Runtime did not respond";
  if (profile.runtime === "hermes" && profile.telemetryUrl?.trim() && /fetch failed/i.test(reason)) {
    return `${profile.name || "This agent"} is connected through ${userFacingMachineName(profile)}, but the local agent bridge did not respond. Try again in a moment.`;
  }
  if (error instanceof Error && error.name === "TimeoutError") {
    return `${profile.name || profile.runtime} accepted the chat connection at ${url}, but the delegated work did not produce a response before the dashboard timeout. The runtime may still be working; check the agent activity before retrying. (${reason})`;
  }
  if (error instanceof Error && error.name === "AbortError") {
    return `${profile.name || profile.runtime} chat request was interrupted at ${url}. The runtime may still be working; check the agent activity before retrying. (${reason})`;
  }
  return `${profile.name || profile.runtime} is not reachable at ${url}. Check that the ${profile.runtime} runtime is running and that the chat URL is correct. (${reason})`;
}

function runtimeStreamErrorMessage(profile: AgentProfile, error: unknown) {
  const reason = error instanceof Error ? error.message : "";
  const aborted = error instanceof Error && error.name === "AbortError";
  if (aborted || /^(terminated|aborted)$/i.test(reason)) {
    return `Connection to ${profile.name || profile.runtime} closed before a final response arrived. The local agent bridge may have restarted or the stream was interrupted; retry the message.`;
  }
  return reason || "Runtime stream failed";
}

function collectorChatProfile(profile: AgentProfile): AgentProfile | null {
  if (profile.runtime !== "hermes") return null;
  if (!profile.telemetryUrl?.trim()) return null;
  return {
    ...profile,
    gatewayUrl: profile.telemetryUrl,
    chatPath: "/chat",
  };
}

async function streamHttpRuntime(
  profile: AgentProfile,
  messages: IncomingMessage[],
  userText: string,
  sharedVault: SharedVaultConfig | null,
  workingDirectory?: string,
  wallet?: AgentWalletConfig,
  honeyLedgerEnabled = false,
  runtimeSessionId = "",
  telemetry?: RuntimeRouteTelemetry,
) {
  const inputCheck = proxyInput(userText);
  if (inputCheck.verdict === "block") {
    return Response.json({ error: inputCheck.reason ?? "Message blocked by security policy" }, { status: 400 });
  }
  if (isOpenAICompatibleRuntime(profile)) {
    return streamOpenAICompatibleRuntime(profile, messages, userText, sharedVault, workingDirectory, wallet, honeyLedgerEnabled, telemetry);
  }
  const url = getRuntimeUrl(profile, profile.chatPath || "/chat");
  const lockKey = interactiveRuntimeLockKey(profile, url);
  if (!reserveInteractiveRuntime(lockKey)) {
    const message = `${profile.name || profile.runtime} is already running another interactive request at ${url}. Wait for that run to finish before sending another chat, scheduler run, or Kanban assignment.`;
    recordRuntimeTelemetry(telemetry, "agent_runtime.http.busy", {
      ...telemetryPayloadForProfile(profile),
      url,
    });
    return Response.json({ error: message }, { status: 409 });
  }
  const vaultContext = buildVaultContext(sharedVault);
  const walletContext = buildWalletToolContext(wallet);
  const context = [buildAgentProfileContext(profile), buildWorkingDirectoryContext(workingDirectory), vaultContext, walletContext].filter(Boolean).join("\n\n");
  const hermesSlashCommand = profile.runtime === "hermes" && /^\/[^\s/]*(?:\s|$)/.test(inputCheck.text.trim());
  const runtimeMessages = context && !hermesSlashCommand
    ? [{ role: "system", content: context }, ...messages]
    : messages;
  const runtimeMessage = inputCheck.text;
  const workspaceBefore = await readWorkspaceSnapshot(workingDirectory);
  let upstream: Response;
  const fetchStartedAt = Date.now();
  let fetchSettled = false;
  const slowTimers = [10_000, 30_000, 60_000].map((waitMs) => setTimeout(() => {
    if (fetchSettled) return;
    recordRuntimeTelemetry(telemetry, "agent_runtime.http.fetch.slow", {
      ...telemetryPayloadForProfile(profile),
      url,
      waitMs,
      fetchElapsedMs: Date.now() - fetchStartedAt,
    });
  }, waitMs));
  try {
    recordRuntimeTelemetry(telemetry, "agent_runtime.http.fetch.start", {
      ...telemetryPayloadForProfile(profile),
      url,
      contextLength: context.length,
      messageCount: runtimeMessages.length,
      runtimeMessageLength: runtimeMessage.length,
    });
    upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(profile.token ? { Authorization: `Bearer ${profile.token}` } : {}),
      },
      body: JSON.stringify({
        agent: profile,
        agentId: profile.agentId || profile.id,
        sessionKey: profile.sessionKey,
        provider: profile.provider || undefined,
        model: profile.model || undefined,
        agentEnv: safeAgentEnv(profile.agentEnv),
        rawUserMessage: inputCheck.text,
        runtimeSessionId: runtimeSessionId || undefined,
        hermesSessionId: runtimeSessionId || undefined,
        message: runtimeMessage,
        messages: runtimeMessages,
        stream: true,
        sharedVault,
        obsidianVault: sharedVault,
        workingDirectory,
        controlRoomPath: sharedVault?.controlRoomPath,
        wallet,
        walletTools: wallet ? { x402Fetch: "/api/wallet/x402" } : undefined,
        context: context || undefined,
      }),
      signal: AbortSignal.timeout(RUNTIME_FETCH_TIMEOUT_MS),
    });
    recordRuntimeTelemetry(telemetry, "agent_runtime.http.fetch.response", {
      ...telemetryPayloadForProfile(profile),
      url,
      status: upstream.status,
      ok: upstream.ok,
      contentType: upstream.headers.get("content-type") ?? null,
      fetchElapsedMs: Date.now() - fetchStartedAt,
    });
  } catch (error) {
    releaseInteractiveRuntime(lockKey);
    recordRuntimeTelemetry(telemetry, "agent_runtime.http.fetch.failed", {
      ...telemetryPayloadForProfile(profile),
      url,
      errorName: error instanceof Error ? error.name : null,
      errorMessage: error instanceof Error ? error.message : String(error),
      fetchElapsedMs: Date.now() - fetchStartedAt,
    });
    return Response.json(
      {
        error: runtimeFetchError(profile, url, error),
      },
      { status: 502 },
    );
  } finally {
    fetchSettled = true;
    slowTimers.forEach(clearTimeout);
  }

  if (!upstream.ok) {
    const errorText = await upstream.text().catch(() => "");
    const message = upstream.status === 404 && profile.runtime === "hermes" && profile.telemetryUrl
      ? "This machine's local agent bridge is connected but does not have the Hermes chat bridge yet. Run Update/Setup on that machine, then try again."
      : errorText || `${profile.runtime} returned ${upstream.status}`;
    recordRuntimeTelemetry(telemetry, "agent_runtime.http.upstream_error", {
      ...telemetryPayloadForProfile(profile),
      url,
      status: upstream.status,
      bodyPreview: message.slice(0, 500),
      fetchElapsedMs: Date.now() - fetchStartedAt,
    });
    releaseInteractiveRuntime(lockKey);
    return new Response(
      ssePayload({ error: message }) + "data: [DONE]\n\n",
      { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } },
    );
  }

  const contentType = upstream.headers.get("content-type") ?? "";
  if (!contentType.includes("text/event-stream")) {
    recordRuntimeTelemetry(telemetry, "agent_runtime.http.non_stream_response", {
      ...telemetryPayloadForProfile(profile),
      url,
      contentType,
      fetchElapsedMs: Date.now() - fetchStartedAt,
    });
    const json = await upstream.json().catch(async () => ({ text: await upstream.text().catch(() => "") }));
    const outputCheck = proxyOutput(extractChunk(json));
    if (outputCheck.verdict === "block") {
      releaseInteractiveRuntime(lockKey);
      return new Response(
        ssePayload({ error: outputCheck.reason ?? "Response blocked by security policy" }) + "data: [DONE]\n\n",
        { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } },
      );
    }
    const chunk = outputCheck.text;
    const event = await recordChatHoney(profile, userText, chunk, honeyLedgerEnabled);
    releaseInteractiveRuntime(lockKey);
    return new Response(
      ssePayload({ choices: [{ delta: { content: chunk || JSON.stringify(json) } }] })
      + (event ? ssePayload({ honey: event }) : "")
      + "data: [DONE]\n\n",
      { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } },
    );
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const readable = new ReadableStream({
    async start(controller) {
      const reader = upstream.body?.getReader();
      if (!reader) {
        controller.enqueue(encoder.encode(ssePayload({ error: "Runtime response body is empty" })));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        releaseInteractiveRuntime(lockKey);
        controller.close();
        return;
      }

      let buffer = "";
      let fullText = "";
      let sawFirstChunk = false;
      recordRuntimeTelemetry(telemetry, "agent_runtime.http.stream.start", {
        ...telemetryPayloadForProfile(profile),
        url,
        fetchElapsedMs: Date.now() - fetchStartedAt,
      });
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (!sawFirstChunk) {
            sawFirstChunk = true;
            recordRuntimeTelemetry(telemetry, "agent_runtime.http.stream.first_chunk", {
              ...telemetryPayloadForProfile(profile),
              url,
              byteLength: value.byteLength,
              streamElapsedMs: Date.now() - fetchStartedAt,
            });
          }
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";
          for (const eventText of events) {
            const dataLine = eventText.split("\n").find((line) => line.startsWith("data:"));
            if (!dataLine) {
              if (eventText.trim().startsWith(":")) {
                controller.enqueue(encoder.encode(`${eventText}\n\n`));
              }
              continue;
            }
            const raw = dataLine.replace(/^data:\s*/, "");
            if (raw === "[DONE]") continue;
            try {
              const parsed = JSON.parse(raw);
              const outputCheck = proxyOutput(extractChunk(parsed));
              if (outputCheck.verdict === "block") {
                controller.enqueue(encoder.encode(ssePayload({ error: outputCheck.reason ?? "Response blocked by security policy" })));
                continue;
              }
              const chunk = outputCheck.text;
              if (chunk) fullText += chunk;
              controller.enqueue(encoder.encode(chunk
                ? ssePayload({ choices: [{ delta: { content: chunk } }] })
                : ssePayload(parsed)));
            } catch {
              const outputCheck = proxyOutput(raw);
              if (outputCheck.verdict !== "block") fullText += outputCheck.text;
              controller.enqueue(encoder.encode(outputCheck.verdict === "block"
                ? ssePayload({ error: outputCheck.reason ?? "Response blocked by security policy" })
                : ssePayload({ choices: [{ delta: { content: outputCheck.text } }] })));
            }
          }
        }
        if (!fullText.trim()) {
          const workspaceAfter = await readWorkspaceSnapshot(workingDirectory);
          const summary = workspaceChangeSummary(workspaceBefore, workspaceAfter);
          if (summary) {
            fullText = summary;
            controller.enqueue(encoder.encode(ssePayload({ choices: [{ delta: { content: summary } }] })));
            recordRuntimeTelemetry(telemetry, "agent_runtime.http.workspace_completed", {
              ...telemetryPayloadForProfile(profile),
              url,
              changedFiles: workspaceAfter?.statusLines.length ?? 0,
              headChanged: Boolean(workspaceBefore?.head && workspaceAfter?.head && workspaceBefore.head !== workspaceAfter.head),
            });
          }
        }
        const event = await recordChatHoney(profile, userText, fullText, honeyLedgerEnabled);
        if (event) controller.enqueue(encoder.encode(ssePayload({ honey: event })));
        recordRuntimeTelemetry(telemetry, "agent_runtime.http.stream.completed", {
          ...telemetryPayloadForProfile(profile),
          url,
          outputLength: fullText.length,
          sawFirstChunk,
          streamElapsedMs: Date.now() - fetchStartedAt,
        });
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (error) {
        const message = runtimeStreamErrorMessage(profile, error);
        recordRuntimeTelemetry(telemetry, "agent_runtime.http.stream.failed", {
          ...telemetryPayloadForProfile(profile),
          url,
          message,
          streamElapsedMs: Date.now() - fetchStartedAt,
        });
        controller.enqueue(encoder.encode(ssePayload({ error: message })));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } finally {
        releaseInteractiveRuntime(lockKey);
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

async function streamOpenAICompatibleRuntime(
  profile: AgentProfile,
  messages: IncomingMessage[],
  userText: string,
  sharedVault: SharedVaultConfig | null,
  workingDirectory?: string,
  wallet?: AgentWalletConfig,
  honeyLedgerEnabled = false,
  telemetry?: RuntimeRouteTelemetry,
) {
  const inputCheck = proxyInput(userText);
  if (inputCheck.verdict === "block") {
    return Response.json({ error: inputCheck.reason ?? "Message blocked by security policy" }, { status: 400 });
  }
  const url = buildOpenAICompatibleUrl(profile);
  const lockKey = interactiveRuntimeLockKey(profile, url);
  if (!reserveInteractiveRuntime(lockKey)) {
    return Response.json({ error: `${profile.name || profile.runtime} is already running another interactive request at ${url}.` }, { status: 409 });
  }

  const context = [
    buildAgentProfileContext(profile),
    buildWorkingDirectoryContext(workingDirectory),
    buildVaultContext(sharedVault),
    buildWalletToolContext(wallet),
  ].filter(Boolean).join("\n\n");
  const modelMessages = context ? [{ role: "system", content: context }, ...messages] : messages;
  const fetchStartedAt = Date.now();
  let upstream: Response;
  try {
    recordRuntimeTelemetry(telemetry, "agent_runtime.openai_compatible.fetch.start", {
      ...telemetryPayloadForProfile(profile),
      url,
      model: openAICompatibleModel(profile),
      messageCount: modelMessages.length,
    });
    upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(profile.token ? { Authorization: `Bearer ${profile.token}` } : {}),
      },
      body: JSON.stringify({
        model: openAICompatibleModel(profile),
        messages: modelMessages,
        stream: true,
      }),
      signal: AbortSignal.timeout(RUNTIME_FETCH_TIMEOUT_MS),
    });
  } catch (error) {
    releaseInteractiveRuntime(lockKey);
    return Response.json({ error: runtimeFetchError(profile, url, error) }, { status: 502 });
  }

  if (!upstream.ok) {
    const errorText = await upstream.text().catch(() => "");
    releaseInteractiveRuntime(lockKey);
    return new Response(
      ssePayload({ error: errorText || `${profile.runtime} returned ${upstream.status}` }) + "data: [DONE]\n\n",
      { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } },
    );
  }

  if (!upstream.body) {
    releaseInteractiveRuntime(lockKey);
    return new Response(
      ssePayload({ error: "OpenAI-compatible runtime response body is empty" }) + "data: [DONE]\n\n",
      { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } },
    );
  }

  const contentType = upstream.headers.get("content-type") ?? "";
  if (!contentType.includes("text/event-stream")) {
    const json = await upstream.json().catch(async () => ({ text: await upstream.text().catch(() => "") }));
    const outputCheck = proxyOutput(extractChunk(json));
    const chunk = outputCheck.text || JSON.stringify(json);
    const event = outputCheck.verdict === "block" ? null : await recordChatHoney(profile, userText, chunk, honeyLedgerEnabled);
    releaseInteractiveRuntime(lockKey);
    return new Response(
      ssePayload(outputCheck.verdict === "block"
        ? { error: outputCheck.reason ?? "Response blocked by security policy" }
        : { choices: [{ delta: { content: chunk } }] })
      + (event ? ssePayload({ honey: event }) : "")
      + "data: [DONE]\n\n",
      { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } },
    );
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const readable = new ReadableStream({
    async start(controller) {
      const reader = upstream.body?.getReader();
      let buffer = "";
      let fullText = "";
      try {
        while (reader) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";
          for (const eventText of events) {
            const dataLine = eventText.split("\n").find((line) => line.startsWith("data:"));
            if (!dataLine) continue;
            const raw = dataLine.replace(/^data:\s*/, "");
            if (raw === "[DONE]") continue;
            try {
              const parsed = JSON.parse(raw);
              const outputCheck = proxyOutput(extractChunk(parsed));
              if (outputCheck.verdict === "block") {
                controller.enqueue(encoder.encode(ssePayload({ error: outputCheck.reason ?? "Response blocked by security policy" })));
                continue;
              }
              if (outputCheck.text) fullText += outputCheck.text;
              controller.enqueue(encoder.encode(outputCheck.text
                ? ssePayload({ choices: [{ delta: { content: outputCheck.text } }] })
                : ssePayload(parsed)));
            } catch {
              controller.enqueue(encoder.encode(ssePayload({ choices: [{ delta: { content: raw } }] })));
              fullText += raw;
            }
          }
        }
        const event = await recordChatHoney(profile, userText, fullText, honeyLedgerEnabled);
        if (event) controller.enqueue(encoder.encode(ssePayload({ honey: event })));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        recordRuntimeTelemetry(telemetry, "agent_runtime.openai_compatible.stream.done", {
          ...telemetryPayloadForProfile(profile),
          url,
          outputLength: fullText.length,
          elapsedMs: Date.now() - fetchStartedAt,
        });
      } catch (error) {
        controller.enqueue(encoder.encode(ssePayload({ error: error instanceof Error ? error.message : "OpenAI-compatible stream failed" })));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } finally {
        releaseInteractiveRuntime(lockKey);
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export async function POST(request: NextRequest) {
  const routeStartedAt = Date.now();
  let profile: AgentProfile;
  let messages: IncomingMessage[];
  let sharedVault: SharedVaultConfig | undefined;
  let workingDirectory: string | undefined;
  let wallet: AgentWalletConfig | undefined;
  let honeyLedgerEnabled = false;
  let runtimeSessionId = "";
  try {
    const body = (await request.json()) as {
      agent?: AgentProfile;
      messages?: IncomingMessage[];
      sharedVault?: SharedVaultConfig;
      workingDirectory?: string;
      wallet?: AgentWalletConfig;
      honeyLedgerEnabled?: boolean;
      runtimeSessionId?: string;
      hermesSessionId?: string;
    };
    if (!body.agent || !Array.isArray(body.messages)) throw new Error("Missing agent or messages");
    profile = body.agent;
    messages = body.messages;
    sharedVault = body.sharedVault;
    workingDirectory = body.workingDirectory;
    wallet = body.wallet;
    honeyLedgerEnabled = body.honeyLedgerEnabled === true;
    runtimeSessionId = typeof body.runtimeSessionId === "string"
      ? body.runtimeSessionId
      : typeof body.hermesSessionId === "string"
        ? body.hermesSessionId
        : "";
  } catch {
    await recordRouteTelemetry(request, "agent_runtime.request.invalid", { elapsedMs: Date.now() - routeStartedAt });
    return Response.json({ error: "Expected { agent, messages }" }, { status: 400 });
  }
  await recordRouteTelemetry(request, "agent_runtime.request.received", {
    ...telemetryPayloadForProfile(profile),
    messageCount: messages.length,
    workingDirectorySet: Boolean(workingDirectory?.trim()),
    runtimeSessionIdSet: Boolean(runtimeSessionId.trim()),
    sharedVaultEnabled: Boolean(sharedVault?.enabled),
    honeyLedgerEnabled,
    elapsedMs: Date.now() - routeStartedAt,
  });

  const userMessage = latestUserMessage(messages);
  const userText = extractUserText(messages).trim();
  const userPrompt = userText || attachmentPromptSummary(userMessage);
  if (!userMessage || !userPrompt) {
    await recordRouteTelemetry(request, "agent_runtime.request.invalid", {
      reason: "empty-user-message",
      ...telemetryPayloadForProfile(profile),
      elapsedMs: Date.now() - routeStartedAt,
    });
    return Response.json({ error: "User message is empty" }, { status: 400 });
  }
  const promptCheck = proxyInput(userPrompt);
  if (promptCheck.verdict === "block") {
    await recordRouteTelemetry(request, "agent_runtime.security.blocked", {
      reason: promptCheck.reason ?? null,
      ...telemetryPayloadForProfile(profile),
      elapsedMs: Date.now() - routeStartedAt,
    });
    return Response.json({ error: promptCheck.reason ?? "Message blocked by security policy" }, { status: 400 });
  }
  const vault = activeSharedVault(profile, sharedVault);
  const runtimeContexts = [buildAgentProfileContext(profile), buildWorkingDirectoryContext(workingDirectory), buildVaultContext(vault), buildWalletToolContext(wallet)].filter(Boolean).join("\n\n");
  const textWithVaultContext = runtimeContexts
    ? `${runtimeContexts}\n\nUser message:\n${userPrompt}`
    : promptCheck.text;
  if (profile.runtime !== "openclaw") {
    const adapter = getRuntimeAdapter(profile.runtime);
    if (adapter && !adapter.capabilities.chat) {
      await recordRouteTelemetry(request, "agent_runtime.validation_failed", {
        reason: "adapter-chat-unavailable",
        adapterKind: adapter.kind,
        adapterLabel: adapter.label,
        ...telemetryPayloadForProfile(profile),
        elapsedMs: Date.now() - routeStartedAt,
      });
      return Response.json({
        error: `${adapter.label} is configured as a ${adapter.kind} runtime here and does not expose interactive chat. Use Scheduler, skills, or runs for this runtime.`,
      }, { status: 400 });
    }
    if (profile.runtime === "hermes" && profile.telemetryUrl?.trim() && profile.collectorCapabilities?.chat === false) {
      await recordRouteTelemetry(request, "agent_runtime.validation_failed", {
        reason: "collector-chat-unavailable",
        ...telemetryPayloadForProfile(profile),
        elapsedMs: Date.now() - routeStartedAt,
      });
      return Response.json({
        error: `${userFacingMachineName(profile)} is connected, but its local agent bridge does not have the Hermes chat bridge installed yet. Run setup/update on that machine after these dashboard changes are available there.`,
      }, { status: 400 });
    }
    const effectiveProfile = collectorChatProfile(profile) ?? profile;
    const profileError = validateHttpRuntimeProfile(effectiveProfile);
    if (profileError) {
      await recordRouteTelemetry(request, "agent_runtime.validation_failed", {
        reason: "profile-error",
        message: profileError,
        ...telemetryPayloadForProfile(effectiveProfile),
        elapsedMs: Date.now() - routeStartedAt,
      });
      return Response.json({ error: profileError }, { status: 400 });
    }
    await recordRouteTelemetry(request, "agent_runtime.dispatch.http", {
      ...telemetryPayloadForProfile(effectiveProfile),
      promptLength: userPrompt.length,
      contextLength: runtimeContexts.length,
      elapsedMs: Date.now() - routeStartedAt,
    });
    return streamHttpRuntime(effectiveProfile, messages, promptCheck.text, vault, workingDirectory, wallet, honeyLedgerEnabled, runtimeSessionId, {
      request,
      routeStartedAt,
    });
  }

  const token = await getGatewayAuthToken(profile.token);
  if (!profile.gatewayUrl || !token) {
    await recordRouteTelemetry(request, "agent_runtime.validation_failed", {
      reason: "missing-openclaw-gateway-or-token",
      ...telemetryPayloadForProfile(profile),
      elapsedMs: Date.now() - routeStartedAt,
    });
    return Response.json({ error: "Missing OpenClaw gateway URL or token" }, { status: 400 });
  }
  await recordRouteTelemetry(request, "agent_runtime.dispatch.openclaw", {
    ...telemetryPayloadForProfile(profile),
    promptLength: userPrompt.length,
    contextLength: runtimeContexts.length,
    elapsedMs: Date.now() - routeStartedAt,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          clearInterval(heartbeat);
        }
      }, 5_000);

      try {
        let fullText = "";
        let contentChunkCount = 0;
        let statusEventCount = 0;
        let toolEventCount = 0;
        await sendMessageViaGateway(
          {
            gatewayUrl: profile.gatewayUrl,
            token,
            text: textWithVaultContext,
            agentId: profile.agentId,
            ...(runtimeSessionId || profile.sessionKey ? { sessionKey: runtimeSessionId || profile.sessionKey } : {}),
          },
          (chunk) => {
            fullText += chunk;
            contentChunkCount += 1;
            if (contentChunkCount === 1 || contentChunkCount % 5 === 0) {
              void recordRouteTelemetry(request, "agent_runtime.openclaw.content", {
                ...telemetryPayloadForProfile(profile),
                contentChunkCount,
                outputLength: fullText.length,
                elapsedMs: Date.now() - routeStartedAt,
              });
            }
            controller.enqueue(encoder.encode(ssePayload({ choices: [{ delta: { content: chunk } }] })));
          },
          undefined,
          (toolData) => {
            toolEventCount += 1;
            void recordRouteTelemetry(request, "agent_runtime.openclaw.tool_call", {
              ...telemetryPayloadForProfile(profile),
              toolEventCount,
              toolName: typeof toolData.name === "string" ? toolData.name : typeof toolData.tool === "string" ? toolData.tool : null,
              elapsedMs: Date.now() - routeStartedAt,
            });
            controller.enqueue(encoder.encode(ssePayload({ tool_call: toolData })));
          },
          (status) => {
            statusEventCount += 1;
            void recordRouteTelemetry(request, "agent_runtime.openclaw.status", {
              ...telemetryPayloadForProfile(profile),
              statusEventCount,
              statusType: status.type,
              elapsedMs: Date.now() - routeStartedAt,
            });
            controller.enqueue(encoder.encode(ssePayload({ status })));
          },
        );
        const event = await recordChatHoney(profile, textWithVaultContext, fullText, honeyLedgerEnabled);
        if (event) controller.enqueue(encoder.encode(ssePayload({ honey: event })));
        await recordRouteTelemetry(request, "agent_runtime.openclaw.completed", {
          ...telemetryPayloadForProfile(profile),
          outputLength: fullText.length,
          contentChunkCount,
          statusEventCount,
          toolEventCount,
          elapsedMs: Date.now() - routeStartedAt,
        });
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Agent runtime error";
        await recordRouteTelemetry(request, "agent_runtime.openclaw.failed", {
          ...telemetryPayloadForProfile(profile),
          errorName: error instanceof Error ? error.name : "unknown",
          message,
          elapsedMs: Date.now() - routeStartedAt,
        });
        controller.enqueue(encoder.encode(ssePayload({ error: message })));
      } finally {
        clearInterval(heartbeat);
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
