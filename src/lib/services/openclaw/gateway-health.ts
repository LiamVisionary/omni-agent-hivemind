/**
 * Gateway health check + auto-recovery utilities.
 *
 * Detects stopped/misconfigured gateways and attempts to fix common issues
 * (e.g. missing gateway.mode, crashed daemon) before surfacing errors to users.
 */

import { execFile } from 'child_process';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const OPENCLAW_CONFIG_PATH = join(homedir(), '.openclaw', 'openclaw.json');
const EXEC_OPTS = { timeout: 10_000, env: { ...process.env, PAGER: 'cat' } };

export interface GatewayHealthResult {
  running: boolean;
  recovered: boolean;
  recoveryAction?: string;
  error?: string;
}

async function readConfig(): Promise<Record<string, unknown>> {
  const raw = await readFile(OPENCLAW_CONFIG_PATH, 'utf-8');
  return JSON.parse(raw);
}

async function writeConfig(config: Record<string, unknown>): Promise<void> {
  await writeFile(OPENCLAW_CONFIG_PATH, JSON.stringify(config, null, 2) + '\n', 'utf-8');
}

/**
 * Ensure `gateway.mode` is set to "local". If missing or wrong, fix it.
 * Returns true if a fix was applied.
 */
export async function ensureGatewayMode(): Promise<boolean> {
  try {
    const config = await readConfig();
    const gateway = (config.gateway ?? {}) as Record<string, unknown>;
    if (gateway.mode === 'local') return false;

    gateway.mode = 'local';
    config.gateway = gateway;
    await writeConfig(config);
    return true;
  } catch {
    // Fallback to CLI
    try {
      await execFileAsync('openclaw', ['config', 'set', 'gateway.mode', 'local'], EXEC_OPTS);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Probe the gateway and attempt recovery if it's down.
 * Call this when you get ECONNREFUSED or similar connection errors.
 */
export async function checkAndRecoverGateway(): Promise<GatewayHealthResult> {
  try {
    // Quick probe via gateway status
    const { stdout } = await execFileAsync('openclaw', ['gateway', 'status'], {
      ...EXEC_OPTS,
      timeout: 15_000,
    });
    const output = stdout.toLowerCase();

    const isRunning = output.includes('runtime: running') || output.includes('rpc probe: ok');

    if (isRunning) {
      return { running: true, recovered: false };
    }

    // Gateway is stopped — check for common causes
    const isModeBlocked = output.includes('gateway.mode') || output.includes('set gateway.mode=local');

    if (isModeBlocked) {
      const fixed = await ensureGatewayMode();
      if (fixed) {
        await restartGateway();
        return {
          running: true,
          recovered: true,
          recoveryAction: 'Set gateway.mode=local and restarted',
        };
      }
    }

    // Try a plain restart
    await restartGateway();

    // Wait a moment and re-check
    await new Promise(r => setTimeout(r, 3000));
    const { stdout: recheck } = await execFileAsync('openclaw', ['gateway', 'status'], EXEC_OPTS).catch(() => ({ stdout: '' }));

    const nowRunning = recheck.toLowerCase().includes('runtime: running') || recheck.toLowerCase().includes('rpc probe: ok');

    return {
      running: nowRunning,
      recovered: nowRunning,
      recoveryAction: nowRunning ? 'Restarted gateway' : undefined,
      error: nowRunning ? undefined : 'Gateway failed to start after restart attempt',
    };
  } catch (err) {
    return {
      running: false,
      recovered: false,
      error: err instanceof Error ? err.message : 'Failed to check gateway status',
    };
  }
}

async function restartGateway(): Promise<void> {
  await execFileAsync('openclaw', ['gateway', 'restart'], {
    timeout: 15_000,
    env: { ...process.env, PAGER: 'cat' },
  }).catch(() => { /* best-effort */ });
}

/**
 * Read the gateway auth token from openclaw.json.
 * Falls back to the provided token if config can't be read.
 */
export async function getGatewayAuthToken(fallback?: string): Promise<string> {
  try {
    const config = await readConfig();
    const gw = (config.gateway ?? {}) as Record<string, unknown>;
    const auth = (gw.auth ?? {}) as Record<string, unknown>;
    const configToken = auth.token as string | undefined;
    if (configToken && configToken.length > 0) return configToken;
  } catch { /* non-fatal */ }
  return fallback ?? '';
}
