/**
 * Shared OpenClaw utilities.
 *
 * Two communication paths:
 * 1. **WebSocket RPC** (fast, ~30ms): Persistent connection to the gateway for
 *    read operations (health, cron.list, channels.status, config.get, etc.)
 * 2. **CLI subprocess** (slow, ~2-4s): Fallback for write operations that the
 *    WS RPC doesn't support well, or when the gateway is unreachable.
 */

import { execFile } from 'child_process';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// ═══════════════════════════════════════════════════════════════════════════════
// ── WebSocket RPC Client (fast path) ────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

interface RpcResponse {
  ok: boolean;
  payload?: Record<string, unknown>;
  error?: { code: string; message: string };
}

interface PendingRequest {
  resolve: (res: RpcResponse) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

let _ws: any = null;
let _wsConnecting: Promise<void> | null = null;
let _wsReady = false;
let _reqCounter = 0;
const _pending = new Map<string, PendingRequest>();

/** Resolve gateway connection params from openclaw.json or env vars. */
function resolveGatewayParams(): { url: string; token: string } | null {
  try {
    const port = process.env.OPENCLAW_GATEWAY_PORT || '18789';
    const host = process.env.OPENCLAW_GATEWAY_HOST || '127.0.0.1';

    // Read auth token from config
    let token = process.env.OPENCLAW_GATEWAY_TOKEN || '';
    if (!token) {
      const configPath = join(homedir(), '.openclaw', 'openclaw.json');
      if (existsSync(configPath)) {
        const raw = readFileSync(configPath, 'utf-8');
        // Extract gateway auth token — handles both standard JSON ("token":)
        // and relaxed JSON (token:) formats.
        const tokenMatch = raw.match(/"?token"?\s*:\s*['"]([a-f0-9]{20,})['"]/);
        if (tokenMatch) token = tokenMatch[1];
      }
    }

    if (!token) return null;
    return { url: `ws://${host}:${port}`, token };
  } catch {
    return null;
  }
}

function nextId(): string {
  return `rpc_${++_reqCounter}`;
}

async function ensureWsConnection(): Promise<void> {
  if (_wsReady && _ws?.readyState === 1) return;

  // If already connecting, wait for it
  if (_wsConnecting) return _wsConnecting;

  _wsConnecting = (async () => {
    const t0 = Date.now();
    try {
      const params = resolveGatewayParams();
      if (!params) throw new Error('No gateway config — token not found');
      console.log(`[openclaw-rpc] Connecting to ${params.url} (token=${params.token.slice(0, 8)}...)`);

      const { default: WebSocket } = await import('ws');
      console.log(`[openclaw-rpc] ws import took ${Date.now() - t0}ms`);

      await new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(params.url);
        const connTimeout = setTimeout(() => {
          ws.close();
          reject(new Error('WS connect timeout'));
        }, 3_000);

        ws.on('open', () => {
          ws.send(JSON.stringify({
            type: 'req', id: nextId(), method: 'connect',
            params: {
              minProtocol: 3, maxProtocol: 3,
              client: { id: 'gateway-client', version: '1.0.0', platform: 'web', mode: 'backend' },
              role: 'operator',
              scopes: ['operator.read', 'operator.write', 'operator.admin'],
              caps: [], commands: [], permissions: {},
              auth: { token: params.token },
              locale: 'en-US', userAgent: 'ami-companion/1.0.0',
            },
          }));
        });

        ws.on('message', (data: Buffer | string) => {
          const raw = typeof data === 'string' ? data : data.toString('utf-8');
          let frame: Record<string, unknown>;
          try { frame = JSON.parse(raw); } catch { return; }

          // Skip challenge events
          if (frame.type === 'event' && (frame as { event?: string }).event === 'connect.challenge') return;

          // Handle connect handshake response
          if (frame.type === 'res' && !_wsReady) {
            clearTimeout(connTimeout);
            if ((frame as { ok?: boolean }).ok) {
              _ws = ws;
              _wsReady = true;
              console.log(`[openclaw-rpc] Connected in ${Date.now() - t0}ms`);

              // Route subsequent messages to pending requests
              ws.on('message', handleWsMessage);
              // Clean up on close
              ws.on('close', handleWsClose);
              ws.on('error', handleWsClose);

              resolve();
            } else {
              ws.close();
              reject(new Error(`WS handshake failed: ${JSON.stringify((frame as { error?: unknown }).error)}`));
            }
            return;
          }
        });

        ws.on('error', (err: Error) => {
          clearTimeout(connTimeout);
          reject(err);
        });
      });
    } finally {
      _wsConnecting = null;
    }
  })();

  return _wsConnecting;
}

function handleWsMessage(data: Buffer | string): void {
  const raw = typeof data === 'string' ? data : data.toString('utf-8');
  let frame: Record<string, unknown>;
  try { frame = JSON.parse(raw); } catch { return; }

  if (frame.type !== 'res') return;
  const id = frame.id as string;
  const req = _pending.get(id);
  if (!req) return;

  _pending.delete(id);
  clearTimeout(req.timer);
  req.resolve({
    ok: (frame as { ok?: boolean }).ok ?? false,
    payload: (frame as { payload?: Record<string, unknown> }).payload,
    error: (frame as { error?: { code: string; message: string } }).error,
  });
}

function handleWsClose(): void {
  _wsReady = false;
  _ws = null;
  // Reject all pending requests
  for (const [id, req] of _pending) {
    clearTimeout(req.timer);
    req.reject(new Error('WS connection closed'));
    _pending.delete(id);
  }
}

const RPC_TIMEOUT = 5_000;

/**
 * Send an RPC request to the gateway via WebSocket.
 * Returns the response payload, or throws on error.
 * ~30ms total for parallel calls vs ~2-4s per CLI subprocess.
 */
export async function rpcCall(
  method: string,
  params: Record<string, unknown> = {},
  timeout = RPC_TIMEOUT,
): Promise<Record<string, unknown>> {
  await ensureWsConnection();
  if (!_ws || _ws.readyState !== 1) {
    throw new Error('WS not connected');
  }

  const id = nextId();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      _pending.delete(id);
      reject(new Error(`RPC timeout: ${method}`));
    }, timeout);

    _pending.set(id, {
      resolve: (res) => {
        if (res.ok) {
          resolve(res.payload ?? {});
        } else {
          reject(new Error(`RPC error (${method}): ${res.error?.message ?? 'unknown'}`));
        }
      },
      reject,
      timer,
    });

    _ws!.send(JSON.stringify({ type: 'req', id, method, params }));
  });
}

/**
 * Try RPC first, fall back to CLI if gateway is unreachable.
 * For read-only operations where we want maximum speed.
 */
export async function rpcCallWithCliFallback(
  method: string,
  rpcParams: Record<string, unknown>,
  cliArgs: string[],
  cliOpts?: RunCliOptions,
): Promise<Record<string, unknown>> {
  try {
    return await rpcCall(method, rpcParams);
  } catch {
    // Gateway unreachable — fall back to CLI
    const output = await runCli(cliArgs, cliOpts);
    return parseJsonFromOutput(output) ?? {};
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── CLI subprocess (slow fallback) ──────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

let _cachedBin: string | null = null;

function resolveOpenClawBin(): string {
  if (process.env.OPENCLAW_BIN) return process.env.OPENCLAW_BIN;

  const fixed = [
    '/usr/local/bin/openclaw',
    '/usr/bin/openclaw',
    join(homedir(), '.local', 'bin', 'openclaw'),
    join(homedir(), '.volta', 'bin', 'openclaw'),
  ];
  for (const p of fixed) {
    if (existsSync(p)) return p;
  }

  const nvmBase = join(homedir(), '.nvm', 'versions', 'node');
  if (existsSync(nvmBase)) {
    try {
      const versions = readdirSync(nvmBase).sort((a, b) => {
        const pa = a.replace(/^v/, '').split('.').map(Number);
        const pb = b.replace(/^v/, '').split('.').map(Number);
        for (let i = 0; i < 3; i++) {
          if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pb[i] ?? 0) - (pa[i] ?? 0);
        }
        return 0;
      });
      for (const v of versions) {
        const p = join(nvmBase, v, 'bin', 'openclaw');
        if (existsSync(p)) return p;
      }
    } catch { /* skip */ }
  }

  return 'openclaw';
}

export function getOpenClawBin(): string {
  if (!_cachedBin) _cachedBin = resolveOpenClawBin();
  return _cachedBin;
}

export function clearBinCache(): void {
  _cachedBin = null;
}

const DEFAULT_TIMEOUT = 8_000;
const DEFAULT_MAX_BUFFER = 10 * 1024 * 1024;

export interface RunCliOptions {
  timeout?: number;
  maxBuffer?: number;
}

export async function runCli(args: string[], opts?: RunCliOptions): Promise<string> {
  const timeout = opts?.timeout ?? DEFAULT_TIMEOUT;
  const maxBuffer = opts?.maxBuffer ?? DEFAULT_MAX_BUFFER;

  const execute = (bin: string): Promise<string> =>
    new Promise((resolve, reject) => {
      const proc = execFile(bin, args, {
        timeout,
        maxBuffer,
        env: { ...process.env, PAGER: 'cat' },
      });
      let out = '';
      let err = '';
      proc.stdout?.on('data', (d: Buffer) => { out += d.toString(); });
      proc.stderr?.on('data', (d: Buffer) => { err += d.toString(); });
      const timer = setTimeout(() => { proc.kill(); reject(new Error('timed out')); }, timeout);
      proc.on('close', (code) => {
        clearTimeout(timer);
        const combined = (out + err).trim();
        if (code !== 0 && !combined) return reject(new Error(`openclaw exited ${code}`));
        resolve(combined);
      });
      proc.on('error', reject);
    });

  try {
    return await execute(getOpenClawBin());
  } catch (err) {
    if (err instanceof Error && err.message.includes('ENOENT') && _cachedBin) {
      clearBinCache();
      return execute(getOpenClawBin());
    }
    throw err;
  }
}

// ── JSON extraction ─────────────────────────────────────────────────────────

export function parseJsonFromOutput<T = Record<string, unknown>>(output: string): T | null {
  const match = output.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}
