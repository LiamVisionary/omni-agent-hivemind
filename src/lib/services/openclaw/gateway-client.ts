/**
 * OpenClaw Gateway Client
 *
 * Handles WebSocket communication with a self-hosted OpenClaw gateway.
 * Protocol: JSON text frames over WebSocket.
 *   - First frame must be `connect` handshake
 *   - Requests:  { type: "req", id, method, params }
 *   - Responses: { type: "res", id, ok, payload | error }
 *   - Events:    { type: "event", event, payload, seq?, stateVersion? }
 *
 * This client is used server-side (in API routes) to proxy user messages
 * through the gateway and stream agent responses back as SSE.
 */

import { devLog } from '@/lib/utils/logger';
import { proxyInput, proxyOutput } from './security-proxy';

// ── Protocol types ──────────────────────────────────────────────────────────

export interface GatewayRequest {
  type: 'req';
  id: string;
  method: string;
  params: Record<string, unknown>;
}

export interface GatewayResponse {
  type: 'res';
  id: string;
  ok: boolean;
  payload?: Record<string, unknown>;
  error?: { code: string; message: string };
}

export interface GatewayEvent {
  type: 'event';
  event: string;
  payload: Record<string, unknown>;
  seq?: number;
  stateVersion?: number;
}

export type GatewayFrame = GatewayResponse | GatewayEvent;

export interface ConnectParams {
  gatewayUrl: string;
  token: string;
}

export interface ChatSendParams {
  text: string;
  /** Agent ID to route to (e.g. 'ami'). Falls back to default agent. */
  agentId?: string;
  sessionKey?: string;
  idempotencyKey?: string;
}

export interface GatewayConnectionResult {
  success: boolean;
  error?: string;
  channels?: string[];
}

// ── Helpers ─────────────────────────────────────────────────────────────────

let requestCounter = 0;
function nextRequestId(): string {
  return `req_${Date.now()}_${++requestCounter}`;
}

/** Convert ws:// URL to the WebSocket endpoint */
export function normalizeGatewayUrl(url: string): string {
  let normalized = url.trim();
  // Accept http/https and convert to ws/wss
  if (normalized.startsWith('http://')) {
    normalized = 'ws://' + normalized.slice(7);
  } else if (normalized.startsWith('https://')) {
    normalized = 'wss://' + normalized.slice(8);
  }
  // Strip trailing slash
  return normalized.replace(/\/+$/, '');
}

// ── Server-side gateway interaction (used in API routes) ────────────────────

/** Returns true for transient network errors worth retrying */
function isRetryableError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message;
  return (
    msg.includes('ECONNRESET') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('connection closed unexpectedly') ||
    msg.includes('WebSocket was closed before') ||
    msg.includes('socket hang up')
  );
}

/**
 * Opens a WebSocket to the OpenClaw gateway, performs the connect handshake,
 * sends a chat.send request, collects streaming agent events, and returns
 * the full response text.
 *
 * Designed for use inside Next.js API route handlers (server-side only).
 * Automatically retries once on transient connection errors (ECONNRESET, etc.).
 */
export async function sendMessageViaGateway(
  params: ConnectParams & ChatSendParams,
  onChunk?: (text: string) => void,
  signal?: AbortSignal,
  onToolCall?: (toolData: Record<string, unknown>) => void,
  onStatus?: (status: { type: string; data?: Record<string, unknown> }) => void,
): Promise<{ text: string; toolResults?: Record<string, unknown>[] }> {
  // ── Security Proxy: Input ────────────────────────────────────────────────
  const inputCheck = proxyInput(params.text);
  if (inputCheck.verdict === 'block') {
    throw new Error(`Message blocked by security policy: ${inputCheck.reason}`);
  }
  const secureParams = { ...params, text: inputCheck.text };

  try {
    const result = await sendMessageViaGatewayOnce(secureParams, onChunk, signal, onToolCall, onStatus);

    // ── Security Proxy: Output ─────────────────────────────────────────────
    const outputCheck = proxyOutput(result.text);
    if (outputCheck.verdict === 'block') {
      throw new Error(`Response blocked by security policy`);
    }
    return { ...result, text: outputCheck.text };
  } catch (err) {
    if (isRetryableError(err) && !signal?.aborted) {
      devLog.warn(`🦞 [OpenClaw] Transient error — retrying in 1s: ${(err as Error).message}`);
      await new Promise((r) => setTimeout(r, 1_000));
      const retryResult = await sendMessageViaGatewayOnce(secureParams, onChunk, signal, onToolCall, onStatus);
      const retryOutputCheck = proxyOutput(retryResult.text);
      if (retryOutputCheck.verdict === 'block') {
        throw new Error(`Response blocked by security policy`);
      }
      return { ...retryResult, text: retryOutputCheck.text };
    }
    throw err;
  }
}

async function sendMessageViaGatewayOnce(
  params: ConnectParams & ChatSendParams,
  onChunk?: (text: string) => void,
  signal?: AbortSignal,
  onToolCall?: (toolData: Record<string, unknown>) => void,
  onStatus?: (status: { type: string; data?: Record<string, unknown> }) => void,
): Promise<{ text: string; toolResults?: Record<string, unknown>[] }> {
  const wsUrl = normalizeGatewayUrl(params.gatewayUrl);

  // Dynamic import — ws is only available server-side
  const { default: WebSocket } = await import('ws');

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('Request aborted'));
      return;
    }

    const ws = new WebSocket(wsUrl);
    let handshakeComplete = false;
    let chatRequestId: string | null = null;
    let runId: string | null = null;
    let ackReceived = false;
    let resolved = false;
    let fullText = '';
    const toolResults: Record<string, unknown>[] = [];
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let phaseEndTimer: ReturnType<typeof setTimeout> | null = null;
    let agentTurnCount = 0;
    let toolCallsSeen = 0;
    let agentEventCount = 0;

    // Timing instrumentation
    const t0 = Date.now();
    const elapsed = () => `${((Date.now() - t0) / 1000).toFixed(1)}s`;

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (phaseEndTimer) clearTimeout(phaseEndTimer);
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };

    // Abort handling
    const onAbort = () => {
      cleanup();
      reject(new Error('Request aborted'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });

    // Activity-based timeout: resets on every received frame.
    // The gateway sends tick/health events periodically, so this only fires
    // if the connection goes completely silent for 60s.
    const resetTimeout = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        cleanup();
        if (!resolved) {
          resolved = true;
          reject(new Error('OpenClaw gateway timeout (60s inactivity)'));
        }
      }, 60_000);
    };
    resetTimeout();

    ws.on('open', () => {
      devLog.logIf('openclaw', `🦞 [OpenClaw] WebSocket connected [${elapsed()}], sending handshake...`);

      const connectReq: GatewayRequest = {
        type: 'req',
        id: nextRequestId(),
        method: 'connect',
        params: {
          minProtocol: 3,
          maxProtocol: 3,
          client: {
            id: 'gateway-client',
            version: '1.0.0',
            platform: 'web',
            mode: 'backend',
          },
          role: 'operator',
          scopes: ['operator.read', 'operator.write'],
          caps: [],
          commands: [],
          permissions: {},
          auth: { token: params.token },
          locale: 'en-US',
          userAgent: 'ami-companion/1.0.0',
        },
      };
      ws.send(JSON.stringify(connectReq));
    });

    ws.on('message', (data: Buffer | string) => {
      try {
        const raw = typeof data === 'string' ? data : data.toString('utf-8');
        resetTimeout();
        const frame = JSON.parse(raw) as GatewayFrame;

        // Handle connect.challenge (nonce) — just wait for hello-ok response
        if (frame.type === 'event' && (frame as GatewayEvent).event === 'connect.challenge') {
          devLog.logIf('openclaw', `🦞 [OpenClaw] Received connect challenge [${elapsed()}]`);
          return;
        }

        // Handle hello-ok handshake response
        if (frame.type === 'res' && !handshakeComplete) {
          const res = frame as GatewayResponse;
          if (!res.ok) {
            cleanup();
            reject(new Error(`OpenClaw handshake failed: ${res.error?.message || 'Unknown error'}`));
            return;
          }
          handshakeComplete = true;
          devLog.logIf('openclaw', `🦞 [OpenClaw] Handshake complete [${elapsed()}], sending chat.send...`);

          // Send the chat message
          chatRequestId = nextRequestId();
          const agentTarget = params.agentId || 'main';
          const sessionKey = params.sessionKey || `agent:${agentTarget}:webchat:dm:ami-companion`;
          const idempotencyKey = params.idempotencyKey || `idem-${Date.now()}`;
          const chatReq: GatewayRequest = {
            type: 'req',
            id: chatRequestId,
            method: 'chat.send',
            params: {
              message: params.text,
              sessionKey,
              idempotencyKey,
            },
          };
          ws.send(JSON.stringify(chatReq));
          return;
        }

        // Handle streaming agent events
        if (frame.type === 'event') {
          const evt = frame as GatewayEvent;

          if (evt.event === 'agent') {
            agentEventCount++;
            const data = (evt.payload as any)?.data as Record<string, unknown> | undefined;

            // Log every non-delta agent event for debugging tool execution
            if (data && !data.delta) {
              const keys = Object.keys(data);
              devLog.logIf('openclaw', `🦞 [OpenClaw] Agent event #${agentEventCount} keys=[${keys.join(',')}] [${elapsed()}]`, JSON.stringify(data).slice(0, 500));
            }

            if (data?.delta && typeof data.delta === 'string') {
              fullText += data.delta;
              onChunk?.(data.delta);
            }

            // Detect tool calls — check multiple possible field names
            if (data?.toolCall || data?.tool || data?.toolUse || data?.function_call) {
              toolCallsSeen++;
              devLog.logIf('openclaw', `🦞 [OpenClaw] 🔧 TOOL CALL #${toolCallsSeen} [${elapsed()}]:`, JSON.stringify(data).slice(0, 800));
              toolResults.push(data);
              onToolCall?.(data);
            }

            // Capture tool_result / tool_output events (agent reporting back after tool execution)
            if (data?.toolResult || data?.tool_output || data?.tool_result || data?.observation) {
              devLog.logIf('openclaw', `🦞 [OpenClaw] 🔧 TOOL RESULT [${elapsed()}]:`, JSON.stringify(data).slice(0, 800));
              toolResults.push(data);
            }

            // Forward phase events so frontend knows agent is working
            if (data?.phase === 'start') {
              agentTurnCount++;
              // Cancel any pending phase=end resolution — the agent is starting another turn
              // (e.g. multi-step skills: turn 1 generates prompts, turn 2 runs image gen)
              if (phaseEndTimer) {
                clearTimeout(phaseEndTimer);
                phaseEndTimer = null;
                devLog.logIf('openclaw', `🦞 [OpenClaw] Cancelled phase=end timer — new turn ${agentTurnCount} starting [${elapsed()}]`);
              }
              devLog.logIf('openclaw', `🦞 [OpenClaw] Agent phase=start (turn ${agentTurnCount}) [${elapsed()}]`);
              onStatus?.({ type: 'agent_phase_start', data: { turn: agentTurnCount } });
            }

            // Agent phase=end fires per-turn.
            // chat.send does NOT send a final res — phase=end is the completion signal.
            if (data?.phase === 'end') {
              devLog.logIf('openclaw', `🦞 [OpenClaw] Agent phase=end (turn ${agentTurnCount}, text=${fullText.length}chars, toolCalls=${toolCallsSeen}, events=${agentEventCount}) [${elapsed()}]`);
              onStatus?.({ type: 'agent_phase_end', data: { turn: agentTurnCount, hasText: fullText.length > 0 } });

              // If we have text, the agent is done — resolve after a short delay
              // to catch any trailing events.
              // If no text yet (tool-only turn), wait longer for the next turn.
              if (phaseEndTimer) clearTimeout(phaseEndTimer);
              const delay = fullText.length > 0 ? 500 : 3_000;
              phaseEndTimer = setTimeout(() => {
                if (resolved) return;
                devLog.logIf('openclaw', `🦞 [OpenClaw] Resolving on phase=end (text=${fullText.length}chars, toolCalls=${toolCallsSeen}, turns=${agentTurnCount})`);
                if (toolCallsSeen === 0) {
                  console.warn(`🦞 [OpenClaw] ⚠️ NO TOOL CALLS detected — agent may have responded conversationally without executing tools`);
                }
                resolved = true;
                signal?.removeEventListener('abort', onAbort);
                cleanup();
                resolve({ text: fullText, toolResults: toolResults.length > 0 ? toolResults : undefined });
              }, delay);
            }
          }

          // chat state=final is the definitive completion signal (confirmed in protocol)
          if (evt.event === 'chat') {
            const chatPayload = evt.payload as any;
            const state = chatPayload?.state;
            devLog.logIf('openclaw', `🦞 [OpenClaw] Chat event: state=${state} [${elapsed()}]`, JSON.stringify(evt.payload).slice(0, 300));
            if (state === 'final') {
              if (phaseEndTimer) clearTimeout(phaseEndTimer);
              if (!resolved) {
                devLog.logIf('openclaw', `🦞 [OpenClaw] Chat state=final, resolving (text=${fullText.length}chars, toolCalls=${toolCallsSeen}, turns=${agentTurnCount}) [${elapsed()}]`);
                if (toolCallsSeen === 0) {
                  console.warn(`🦞 [OpenClaw] ⚠️ NO TOOL CALLS detected — agent may have responded conversationally without executing tools`);
                }
                resolved = true;
                signal?.removeEventListener('abort', onAbort);
                cleanup();
                resolve({ text: fullText, toolResults: toolResults.length > 0 ? toolResults : undefined });
              }
            }
          }
          return;
        }

        // Two-stage res handling per OpenClaw protocol:
        // 1. Ack: {runId, status:"accepted"|"started"} — store runId
        // 2. Final: {runId, status:"ok"|"error", summary} — resolve/reject
        if (frame.type === 'res' && handshakeComplete) {
          const res = frame as GatewayResponse;
          const payload = res.payload as any;

          if (!res.ok) {
            devLog.logIf('openclaw', '🦞 [OpenClaw] Res error:', res.error);
            signal?.removeEventListener('abort', onAbort);
            cleanup();
            if (!resolved) {
              resolved = true;
              reject(new Error(`OpenClaw error: ${res.error?.message || 'Unknown error'}`));
            }
            return;
          }

          const status = payload?.status as string | undefined;

          // Ack response (first stage)
          if (status === 'accepted' || status === 'started') {
            runId = payload?.runId || null;
            ackReceived = true;
            devLog.logIf('openclaw', `🦞 [OpenClaw] Ack received (runId=${runId}, status=${status}) [${elapsed()}]`);
            return;
          }

          // Final response (second stage) — the definitive completion signal
          if (ackReceived && (status === 'ok' || status === 'error' || status === 'done')) {
            devLog.logIf('openclaw', `🦞 [OpenClaw] Final res (status=${status}, toolCalls=${toolCallsSeen}, turns=${agentTurnCount}) [${elapsed()}]`);
            if (toolCallsSeen === 0) {
              console.warn(`🦞 [OpenClaw] ⚠️ NO TOOL CALLS detected — agent responded text-only`);
            }
            signal?.removeEventListener('abort', onAbort);
            cleanup();
            if (!resolved) {
              resolved = true;
              if (status === 'error') {
                const errMsg = payload?.summary || payload?.message || 'Agent run failed';
                // If we got text before the error, return it anyway
                if (fullText) {
                  resolve({ text: fullText, toolResults: toolResults.length > 0 ? toolResults : undefined });
                } else {
                  reject(new Error(`OpenClaw agent error: ${errMsg}`));
                }
              } else {
                resolve({ text: fullText, toolResults: toolResults.length > 0 ? toolResults : undefined });
              }
            }
            return;
          }

          // Unknown res payload — log for debugging
          devLog.logIf('openclaw', '🦞 [OpenClaw] Unhandled res:', JSON.stringify(payload).slice(0, 300));
        }
      } catch (parseError) {
        devLog.warn('🦞 [OpenClaw] Failed to parse frame:', parseError);
      }
    });

    ws.on('error', (error: Error) => {
      signal?.removeEventListener('abort', onAbort);
      cleanup();
      if (!resolved) {
        resolved = true;
        reject(new Error(`OpenClaw WebSocket error: ${error.message}`));
      }
    });

    ws.on('close', (code: number, reason: Buffer) => {
      signal?.removeEventListener('abort', onAbort);
      if (timeoutId) clearTimeout(timeoutId);

      if (!resolved) {
        resolved = true;
        // If we got some text, return it even on unexpected close
        if (fullText) {
          resolve({ text: fullText, toolResults: toolResults.length > 0 ? toolResults : undefined });
        } else {
          reject(new Error(`OpenClaw connection closed unexpectedly: ${code} ${reason.toString()}`));
        }
      }
    });
  });
}

/**
 * Tests connectivity to an OpenClaw gateway.
 * Opens a WebSocket, performs the handshake, then closes.
 */
export async function testGatewayConnection(
  params: ConnectParams
): Promise<GatewayConnectionResult> {
  const wsUrl = normalizeGatewayUrl(params.gatewayUrl);

  const { default: WebSocket } = await import('ws');

  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      ws.close();
      resolve({ success: false, error: 'Connection timed out (10s)' });
    }, 10_000);

    const ws = new WebSocket(wsUrl);

    ws.on('open', () => {
      const connectReq: GatewayRequest = {
        type: 'req',
        id: nextRequestId(),
        method: 'connect',
        params: {
          minProtocol: 3,
          maxProtocol: 3,
          client: {
            id: 'gateway-client',
            version: '1.0.0',
            platform: 'web',
            mode: 'test',
          },
          role: 'operator',
          scopes: ['operator.read'],
          caps: [],
          commands: [],
          permissions: {},
          auth: { token: params.token },
          locale: 'en-US',
          userAgent: 'ami-companion/1.0.0',
        },
      };
      ws.send(JSON.stringify(connectReq));
    });

    ws.on('message', (data: Buffer | string) => {
      try {
        const raw = typeof data === 'string' ? data : data.toString('utf-8');
        const frame = JSON.parse(raw);

        // Skip challenge event
        if (frame.type === 'event' && frame.event === 'connect.challenge') return;

        if (frame.type === 'res') {
          clearTimeout(timeoutId);
          ws.close();
          if (frame.ok) {
            resolve({ success: true });
          } else {
            resolve({ success: false, error: frame.error?.message || 'Handshake rejected' });
          }
        }
      } catch {
        // Ignore parse errors during test
      }
    });

    ws.on('error', (error: Error) => {
      clearTimeout(timeoutId);
      resolve({ success: false, error: error.message });
    });
  });
}

/**
 * Pushes a character identity configuration to the OpenClaw gateway
 * via config.patch RPC. This sets the agent's system prompt / identity.
 */
export async function syncCharacterIdentity(
  params: ConnectParams & {
    characterName: string;
    systemPrompt: string;
    /** Character ID for workspace isolation (prevents memory sharing between characters) */
    characterId?: string;
    /** App's LLM provider: 'default' (Grok/xAI), 'custom', or 'nsfw' */
    llmProvider?: string;
    /** Custom endpoint config (when llmProvider is 'custom') */
    customLlm?: { endpoint: string; apiKey: string; modelName?: string };
    /** When true, ensures heartbeat is enabled for Moltbook auto-posting */
    moltbookAutoPost?: boolean;
  }
): Promise<{ success: boolean; error?: string; agentId?: string; workspacePath?: string }> {
  const wsUrl = normalizeGatewayUrl(params.gatewayUrl);

  const { default: WebSocket } = await import('ws');

  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      ws.close();
      resolve({ success: false, error: 'Sync timed out (15s)' });
    }, 15_000);

    const ws = new WebSocket(wsUrl);
    let handshakeComplete = false;
    let configGetId: string | null = null;
    let configPatchId: string | null = null;
    let agentId = '';
    let workspacePath = '';

    ws.on('open', () => {
      const connectReq: GatewayRequest = {
        type: 'req',
        id: nextRequestId(),
        method: 'connect',
        params: {
          minProtocol: 3,
          maxProtocol: 3,
          client: {
            id: 'gateway-client',
            version: '1.0.0',
            platform: 'web',
            mode: 'backend',
          },
          role: 'operator',
          scopes: ['operator.read', 'operator.write', 'operator.admin'],
          caps: [],
          commands: [],
          permissions: {},
          auth: { token: params.token },
          locale: 'en-US',
          userAgent: 'ami-companion/1.0.0',
        },
      };
      ws.send(JSON.stringify(connectReq));
    });

    ws.on('message', (data: Buffer | string) => {
      try {
        const raw = typeof data === 'string' ? data : data.toString('utf-8');
        const frame = JSON.parse(raw);

        if (frame.type === 'event' && frame.event === 'connect.challenge') return;

        if (frame.type === 'res' && !handshakeComplete) {
          if (!frame.ok) {
            clearTimeout(timeoutId);
            ws.close();
            resolve({ success: false, error: `Handshake failed: ${frame.error?.message}` });
            return;
          }
          handshakeComplete = true;

          // Step 1: Get current config hash
          configGetId = nextRequestId();
          ws.send(JSON.stringify({
            type: 'req',
            id: configGetId,
            method: 'config.get',
            params: {},
          }));
          return;
        }

        // Step 2: Patch config with character identity
        if (frame.type === 'res' && frame.id === configGetId) {
          if (!frame.ok) {
            clearTimeout(timeoutId);
            ws.close();
            resolve({ success: false, error: `Failed to get config: ${frame.error?.message}` });
            return;
          }

          const baseHash = frame.payload?.hash as string | undefined;

          // Create or update a character-named agent and set it as default
          const existingConfig = (frame.payload?.config ?? {}) as Record<string, any>;
          const existingAgents: any[] = [...(existingConfig?.agents?.list ?? [])];

          // Use characterId suffix for workspace isolation (prevents memory sharing between characters with same name)
          const nameSlug = params.characterName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'companion';
          const idSuffix = params.characterId ? `-${params.characterId.slice(-8)}` : '';
          agentId = `${nameSlug}${idSuffix}`;
          const openclawHome = (existingConfig?.meta?.home as string) || process.env.OPENCLAW_HOME || `${process.env.HOME}/.openclaw`;
          workspacePath = `${openclawHome}/workspace-${agentId}`;

          const agentIdentity = {
            name: params.characterName,
            theme: params.systemPrompt.slice(0, 200),
            emoji: '💕',
          };

          // Resolve model config for OpenClaw
          const extraPatch: Record<string, any> = {};
          let agentModelString: string | undefined;

          if (params.llmProvider === 'custom' && params.customLlm?.endpoint) {
            const providerKey = 'ami-custom';
            const modelId = params.customLlm.modelName || 'default';
            const modelRef = `${providerKey}/${modelId}`;

            // Strip /chat/completions — OpenClaw adds it for openai-completions API
            const baseUrl = params.customLlm.endpoint
              .replace(/\/chat\/completions\/?$/, '')
              .replace(/\/+$/, '');

            extraPatch.models = {
              mode: 'merge',
              providers: {
                [providerKey]: {
                  baseUrl,
                  api: 'openai-completions',
                  ...(params.customLlm.apiKey ? { apiKey: params.customLlm.apiKey } : {}),
                  models: [{
                    id: modelId,
                    name: modelId,
                    reasoning: false,
                    input: ['text'],
                    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                    contextWindow: 131072,
                    maxTokens: 8192,
                  }],
                },
              },
            };
            agentModelString = modelRef;
          } else if (params.llmProvider === 'nsfw') {
            // RunPod vLLM doesn't support tool-calling — OpenClaw always sends
            // tools in requests, causing vLLM to return empty responses.
            // Skip model sync; let OpenClaw use its default model for WhatsApp.
            agentModelString = undefined;
          } else if (!params.llmProvider || params.llmProvider === 'default') {
            agentModelString = 'xai/grok-4-1-fast-non-reasoning';
          }

          // Heartbeat config — heartbeat is for periodic awareness checks (feed, DMs),
          // NOT for scheduling tasks. Scheduled tasks (Moltbook posting, Memory Noter)
          // are handled by OpenClaw cron jobs (`openclaw cron add`).
          // We preserve the user's existing heartbeat config; only ensure it's enabled.
          const existingAgent = existingAgents.find((a) => a.id === agentId);
          const existingHeartbeat = existingAgent?.heartbeat as Record<string, unknown> | undefined;
          const heartbeatConfig = existingHeartbeat
            ? {
                ...existingHeartbeat,
                // Re-enable if user had disabled heartbeat entirely
                ...(existingHeartbeat?.every === '0m' ? { every: '30m' } : {}),
              }
            : { every: '30m' };

          // Snapshot existing state BEFORE mutation for change detection
          const preSnapshotList = JSON.stringify(existingAgents);

          const ourIndex = existingAgents.findIndex((a) => a.id === agentId);
          if (ourIndex >= 0) {
            existingAgents[ourIndex] = {
              ...existingAgents[ourIndex],
              default: true,
              workspace: existingAgents[ourIndex].workspace || workspacePath,
              ...(agentModelString ? { model: agentModelString } : {}),
              ...(heartbeatConfig ? { heartbeat: heartbeatConfig } : {}),
              identity: {
                ...(existingAgents[ourIndex].identity ?? {}),
                ...agentIdentity,
              },
            };
          } else {
            existingAgents.push({
              id: agentId,
              default: true,
              workspace: workspacePath,
              ...(agentModelString ? { model: agentModelString } : {}),
              ...(heartbeatConfig ? { heartbeat: heartbeatConfig } : {}),
              identity: agentIdentity,
            });
          }

          // Clear default flag from other agents
          for (let i = 0; i < existingAgents.length; i++) {
            if (existingAgents[i].id !== agentId) {
              delete existingAgents[i].default;
            }
          }

          // Skip config.patch if nothing actually changed — avoids unnecessary
          // gateway restart which resets the heartbeat timer.
          const postSnapshotList = JSON.stringify(existingAgents);
          const existingDefaultModels = existingConfig?.agents?.defaults?.models;
          const proposedDefaultModels = agentModelString
            ? { ...existingDefaultModels, [agentModelString]: {} }
            : existingDefaultModels;
          const agentListChanged = preSnapshotList !== postSnapshotList;
          const defaultModelsChanged = JSON.stringify(existingDefaultModels) !== JSON.stringify(proposedDefaultModels);
          const hasExtraPatch = Object.keys(extraPatch).length > 0;

          if (!agentListChanged && !defaultModelsChanged && !hasExtraPatch) {
            clearTimeout(timeoutId);
            ws.close();
            resolve({ success: true, agentId, workspacePath });
            return;
          }

          const identityPatch = JSON.stringify({
            agents: {
              list: existingAgents,
              ...(agentModelString ? { defaults: { models: { [agentModelString]: {} } } } : {}),
            },
            ...extraPatch,
          });

          configPatchId = nextRequestId();
          ws.send(JSON.stringify({
            type: 'req',
            id: configPatchId,
            method: 'config.patch',
            params: {
              raw: identityPatch,
              ...(baseHash ? { baseHash } : {}),
              note: `Synced from Ami: AI Companion — ${params.characterName}`,
              restartDelayMs: 2000,
            },
          }));
          return;
        }

        // Step 3: Confirm patch result
        if (frame.type === 'res' && frame.id === configPatchId) {
          clearTimeout(timeoutId);
          ws.close();
          if (frame.ok) {
            resolve({ success: true, agentId, workspacePath });
          } else {
            resolve({ success: false, error: `Config patch failed: ${frame.error?.message}` });
          }
        }
      } catch {
        // Ignore parse errors
      }
    });

    ws.on('error', (error: Error) => {
      clearTimeout(timeoutId);
      resolve({ success: false, error: error.message });
    });
  });
}
