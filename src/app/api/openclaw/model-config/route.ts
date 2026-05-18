/**
 * OpenClaw Model Config API
 *
 * GET   — Read current model + key status from auth-profiles.json + secrets.json
 * PATCH — Update primary model in openclaw.json
 * POST  — Open secrets.json for editing, then sync real values to auth-profiles.json
 *
 * Key storage flow:
 *   User edits ~/.openclaw/secrets.json (single source of truth)
 *   App syncs real values → auth-profiles.json for each agent (runtime auth store)
 */

import { NextRequest, NextResponse } from 'next/server';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const OPENCLAW_DIR = join(homedir(), '.openclaw');
const OPENCLAW_JSON_PATH = join(OPENCLAW_DIR, 'openclaw.json');
const SECRETS_JSON_PATH = join(OPENCLAW_DIR, 'secrets.json');
const AGENTS_DIR = join(OPENCLAW_DIR, 'agents');

const PROVIDER_ENV_KEYS: Record<string, string> = {
  xai: 'XAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  google: 'GOOGLE_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
};

function readJsonFile(path: string): Record<string, unknown> {
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, 'utf-8').replace(/\/\/[^\n]*/g, ''));
  } catch {
    return {};
  }
}

function writeJsonFile(path: string, data: Record<string, unknown>): void {
  const dir = join(path, '..');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true, mode: 0o700 });
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', { mode: 0o600 });
}

function isPlaceholder(val: unknown): boolean {
  return typeof val === 'string' && val.startsWith('YOUR_') && val.endsWith('_HERE');
}

function getNested(obj: Record<string, unknown>, path: string): unknown {
  let cur: unknown = obj;
  for (const p of path.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function setNested(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (cur[key] == null || typeof cur[key] !== 'object') cur[key] = {};
    cur = cur[key] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]] = value;
}

/** Find all agent auth-profiles.json files */
function listAuthProfilePaths(): string[] {
  if (!existsSync(AGENTS_DIR)) return [];
  const paths: string[] = [];
  try {
    for (const agentId of readdirSync(AGENTS_DIR)) {
      const p = join(AGENTS_DIR, agentId, 'agent', 'auth-profiles.json');
      if (existsSync(p)) paths.push(p);
    }
  } catch { /* non-fatal */ }
  return paths;
}

/** Check if a provider has a key in any auth-profiles.json or secrets.json */
function hasKeyForProvider(provider: string): boolean {
  const envKey = PROVIDER_ENV_KEYS[provider];
  if (!envKey) return false;

  // Check secrets.json first
  const secrets = readJsonFile(SECRETS_JSON_PATH);
  const secretVal = secrets[envKey];
  if (typeof secretVal === 'string' && secretVal.length > 0 && !isPlaceholder(secretVal)) return true;

  // Check auth-profiles.json for any agent
  const profileId = `${provider}:default`;
  for (const path of listAuthProfilePaths()) {
    const auth = readJsonFile(path);
    const profiles = (auth.profiles ?? {}) as Record<string, Record<string, unknown>>;
    const profile = profiles[profileId];
    if (profile?.key && typeof profile.key === 'string' && profile.key.length > 0) return true;
  }
  return false;
}

/** Sync real (non-placeholder) keys from secrets.json to auth-profiles.json for all agents */
function syncSecretsToAuthProfiles(): void {
  const secrets = readJsonFile(SECRETS_JSON_PATH);
  const paths = listAuthProfilePaths();
  if (paths.length === 0) return;

  for (const [provider, envKey] of Object.entries(PROVIDER_ENV_KEYS)) {
    const val = secrets[envKey];
    if (typeof val !== 'string' || val.length === 0 || isPlaceholder(val)) continue;

    const profileId = `${provider}:default`;
    for (const path of paths) {
      const auth = readJsonFile(path);
      if (!auth.profiles) auth.profiles = {};
      const profiles = auth.profiles as Record<string, Record<string, unknown>>;
      const existing = profiles[profileId];

      if (!existing || existing.key !== val) {
        profiles[profileId] = { type: 'api_key', provider, key: val };
        writeJsonFile(path, auth);
      }
    }
  }
}

/** Find the default agent entry from agents.list[] */
function getDefaultAgent(config: Record<string, unknown>): Record<string, unknown> | null {
  const agents = (config.agents ?? {}) as Record<string, unknown>;
  const list = (agents.list ?? []) as Record<string, unknown>[];
  return list.find(a => a.default === true) ?? list[0] ?? null;
}

export async function GET() {
  try {
    const config = readJsonFile(OPENCLAW_JSON_PATH);

    // Read model from agent entry first (where OpenClaw actually stores it),
    // fall back to agents.defaults.model.primary for legacy configs
    const agent = getDefaultAgent(config);
    const agentModel = agent?.model as string | undefined;
    const legacyPrimary = getNested(config, 'agents.defaults.model.primary') as string | undefined;
    const primary = agentModel || legacyPrimary;

    let provider = '';
    let model = '';
    if (primary && primary.includes('/')) {
      const idx = primary.indexOf('/');
      provider = primary.slice(0, idx);
      model = primary.slice(idx + 1);
    } else if (primary) {
      model = primary;
    }

    const keyStatus: Record<string, boolean> = {};
    for (const prov of Object.keys(PROVIDER_ENV_KEYS)) {
      keyStatus[prov] = hasKeyForProvider(prov);
    }

    return NextResponse.json({ success: true, provider, model, primary: primary ?? '', keyStatus });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to read model config';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { provider, model } = await request.json() as { provider?: string; model?: string };
    const config = readJsonFile(OPENCLAW_JSON_PATH);

    if (provider && model) {
      const fullModel = `${provider}/${model}`;

      // Write to both the agent entry (what OpenClaw reads) and defaults (legacy)
      const agent = getDefaultAgent(config);
      if (agent) agent.model = fullModel;
      setNested(config, 'agents.defaults.model.primary', fullModel);
    }

    writeJsonFile(OPENCLAW_JSON_PATH, config);
    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to update model config';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/** Open secrets.json in editor with placeholder, then sync to auth-profiles */
export async function POST(request: NextRequest) {
  try {
    const { provider } = await request.json() as { provider?: string };
    const envKey = provider ? PROVIDER_ENV_KEYS[provider] : undefined;

    const secrets = readJsonFile(SECRETS_JSON_PATH);
    if (envKey && !secrets[envKey]) {
      secrets[envKey] = `YOUR_${envKey}_HERE`;
    }
    writeJsonFile(SECRETS_JSON_PATH, secrets);

    // Sync any real values to auth-profiles before opening
    syncSecretsToAuthProfiles();

    const { execSync } = await import('child_process');
    const opener = process.platform === 'darwin' ? 'open' : 'xdg-open';
    try { execSync(`${opener} "${SECRETS_JSON_PATH}"`, { timeout: 5000 }); } catch { /* non-fatal */ }

    return NextResponse.json({ success: true, path: SECRETS_JSON_PATH });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to open secrets file';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
