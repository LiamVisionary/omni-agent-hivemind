import { NextRequest } from 'next/server';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { verifyAuth } from '@/lib/utils/server-auth';

/**
 * /api/openclaw/skill-env
 *
 * Manages API keys for OpenClaw skills with tiered storage:
 *
 *   1. Per-skill:  ~/.openclaw/openclaw.json → skills.entries.<slug>.env
 *      Highest precedence. Used when a skill needs its own key.
 *
 *   2. Secrets:    ~/.openclaw/secrets.json
 *      Primary global key store. Keys here are mirrored to env.vars.
 *
 *   3. Global:     ~/.openclaw/openclaw.json → env.vars
 *      Runtime fallback. Synced from secrets.json.
 *
 *   4. Legacy:     ~/.baoyu-skills/.env
 *      Written on every save for baoyu scripts that source it directly.
 *
 * GET  ?keys=OPENAI_API_KEY,GOOGLE_API_KEY[&slug=baoyu-image-gen]
 *   Returns masked status per key, resolved in per-skill → secrets → global → legacy order.
 *
 * POST { vars: Record<string, string>, slug?: string, scope?: 'skill' | 'global' }
 *   scope='skill' (default when slug provided): writes to skills.entries.<slug>.env
 *   scope='global' (default when no slug): writes to secrets.json + mirrors to env.vars
 *   Always also writes to ~/.baoyu-skills/.env as legacy fallback.
 */

const OPENCLAW_DIR = join(homedir(), '.openclaw');
const OPENCLAW_JSON_PATH = join(OPENCLAW_DIR, 'openclaw.json');
const SECRETS_JSON_PATH = join(OPENCLAW_DIR, 'secrets.json');

const BAOYU_ENV_DIR = join(homedir(), '.baoyu-skills');
const BAOYU_ENV_PATH = join(BAOYU_ENV_DIR, '.env');

// ── openclaw.json helpers ────────────────────────────────────────────────────

type OpenClawJson = {
  env?: {
    vars?: Record<string, string>;
    [key: string]: unknown;
  };
  skills?: {
    entries?: Record<string, {
      enabled?: boolean;
      env?: Record<string, string>;
      apiKey?: string | { source: string; provider: string; id: string };
      config?: Record<string, unknown>;
    }>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

function readOpenClawJson(): OpenClawJson {
  if (!existsSync(OPENCLAW_JSON_PATH)) return {};
  try {
    // openclaw.json is JSON5 — strip single-line comments before parsing
    const raw = readFileSync(OPENCLAW_JSON_PATH, 'utf-8');
    const stripped = raw.replace(/\/\/[^\n]*/g, '');
    return JSON.parse(stripped) as OpenClawJson;
  } catch {
    return {};
  }
}

function writeOpenClawJson(data: OpenClawJson): void {
  if (!existsSync(OPENCLAW_DIR)) mkdirSync(OPENCLAW_DIR, { recursive: true, mode: 0o700 });
  writeFileSync(OPENCLAW_JSON_PATH, JSON.stringify(data, null, 2) + '\n', { mode: 0o600 });
}

/** Merge vars into global env.vars. Empty string removes the key. */
function _mergeGlobalEnvVars(
  data: OpenClawJson,
  vars: Record<string, string>,
): OpenClawJson {
  const currentVars = { ...(data.env?.vars ?? {}) };
  for (const [key, value] of Object.entries(vars)) {
    if (value === '') delete currentVars[key];
    else currentVars[key] = value;
  }
  return { ...data, env: { ...(data.env ?? {}), vars: currentVars } };
}

/** Merge vars into skills.entries.<slug>.env. Empty string removes the key. */
function mergeSkillEnvVars(
  data: OpenClawJson,
  slug: string,
  vars: Record<string, string>,
): OpenClawJson {
  const entries = { ...(data.skills?.entries ?? {}) };
  const existing = entries[slug] ?? {};
  const currentEnv = { ...(existing.env ?? {}) };
  for (const [key, value] of Object.entries(vars)) {
    if (value === '') delete currentEnv[key];
    else currentEnv[key] = value;
  }
  entries[slug] = { ...existing, env: currentEnv };
  return { ...data, skills: { ...(data.skills ?? {}), entries } };
}

function getGlobalEnvVars(data: OpenClawJson): Map<string, string> {
  const map = new Map<string, string>();
  for (const [k, v] of Object.entries(data.env?.vars ?? {})) {
    if (v) map.set(k, v);
  }
  return map;
}

function isPlaceholder(val: unknown): boolean {
  return typeof val === 'string' && val.startsWith('YOUR_') && val.endsWith('_HERE');
}

function readSecretsJson(): Record<string, unknown> {
  if (!existsSync(SECRETS_JSON_PATH)) return {};
  try {
    return JSON.parse(readFileSync(SECRETS_JSON_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function writeSecretsJson(data: Record<string, unknown>): void {
  if (!existsSync(OPENCLAW_DIR)) mkdirSync(OPENCLAW_DIR, { recursive: true, mode: 0o700 });
  writeFileSync(SECRETS_JSON_PATH, JSON.stringify(data, null, 2) + '\n', { mode: 0o600 });
}

function getSecretsVars(keys: string[]): Map<string, string> {
  const secrets = readSecretsJson();
  const map = new Map<string, string>();
  for (const key of keys) {
    const val = secrets[key];
    if (typeof val === 'string' && val.length > 0 && !isPlaceholder(val)) {
      map.set(key, val);
    }
  }
  return map;
}

/** Mirror real secrets.json values to env.vars in openclaw.json */
function mirrorSecretsToEnvVars(keys: string[]): void {
  const secrets = readSecretsJson();
  const config = readOpenClawJson();
  const currentVars = { ...(config.env?.vars ?? {}) };
  let changed = false;
  for (const key of keys) {
    const val = secrets[key];
    if (typeof val === 'string' && val.length > 0 && !isPlaceholder(val)) {
      if (currentVars[key] !== val) {
        currentVars[key] = val;
        changed = true;
      }
    }
  }
  if (changed) {
    writeOpenClawJson({ ...config, env: { ...(config.env ?? {}), vars: currentVars } });
  }
}

function getSkillEnvVars(data: OpenClawJson, slug: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const [k, v] of Object.entries(data.skills?.entries?.[slug]?.env ?? {})) {
    if (v) map.set(k, v);
  }
  return map;
}

type KeyScope = 'skill' | 'secrets' | 'global' | 'legacy' | null;

/**
 * Resolve effective value for each key: per-skill → secrets → global → legacy.
 */
function resolveKeyStatus(
  keys: string[],
  skillVars: Map<string, string>,
  secretsVars: Map<string, string>,
  globalVars: Map<string, string>,
  legacyVars: Map<string, string>,
): Record<string, { present: boolean; scope: KeyScope }> {
  const result: Record<string, { present: boolean; scope: KeyScope }> = {};
  for (const key of keys) {
    if (skillVars.has(key) && skillVars.get(key)! !== '') {
      result[key] = { present: true, scope: 'skill' };
    } else if (secretsVars.has(key)) {
      result[key] = { present: true, scope: 'secrets' };
    } else if (globalVars.has(key) && globalVars.get(key)! !== '') {
      result[key] = { present: true, scope: 'global' };
    } else if (legacyVars.has(key) && legacyVars.get(key)! !== '') {
      result[key] = { present: true, scope: 'legacy' };
    } else {
      result[key] = { present: false, scope: null };
    }
  }
  return result;
}

// ── Legacy ~/.baoyu-skills/.env helpers ─────────────────────────────────────

function parseLegacyEnvFile(content: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key) map.set(key, value);
  }
  return map;
}

function serializeLegacyEnvFile(existing: string, updates: Map<string, string>): string {
  const lines = existing.split('\n');
  const handled = new Set<string>();
  const updated = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return line;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) return line;
    const key = trimmed.slice(0, eqIdx).trim();
    if (!updates.has(key)) return line;
    handled.add(key);
    const val = updates.get(key)!;
    return val === '' ? null : `${key}=${val}`;
  }).filter((l): l is string => l !== null);
  const newEntries = [...updates.entries()]
    .filter(([k, v]) => !handled.has(k) && v !== '')
    .map(([k, v]) => `${k}=${v}`);
  const base = updated.join('\n').trimEnd();
  return newEntries.length === 0 ? base + '\n' : base + '\n' + newEntries.join('\n') + '\n';
}

function writeLegacyEnvFile(vars: Record<string, string>): void {
  if (!existsSync(BAOYU_ENV_DIR)) mkdirSync(BAOYU_ENV_DIR, { recursive: true, mode: 0o700 });
  const existing = existsSync(BAOYU_ENV_PATH) ? readFileSync(BAOYU_ENV_PATH, 'utf-8') : '';
  const updates = new Map(Object.entries(vars));
  writeFileSync(BAOYU_ENV_PATH, serializeLegacyEnvFile(existing, updates), { mode: 0o600 });
}

// ── Validation ───────────────────────────────────────────────────────────────

const SAFE_KEY = /^[A-Z][A-Z0-9_]{0,63}$/;
const SHELL_INJECTION = /[`$(){}|;&<>]/;

function validateVars(vars: Record<string, string>): string | null {
  for (const key of Object.keys(vars)) {
    if (!SAFE_KEY.test(key)) return `Invalid env var name: ${key}`;
  }
  for (const [key, value] of Object.entries(vars)) {
    if (typeof value !== 'string') continue;
    if (value.length > 512) return `Value too long for ${key}`;
    if (SHELL_INJECTION.test(value)) return `Invalid characters in value for ${key}`;
  }
  return null;
}

// ── Route handlers ───────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { userId } = await verifyAuth(request);
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }

  const keysParam = request.nextUrl.searchParams.get('keys');
  if (!keysParam) {
    return new Response(JSON.stringify({ error: 'keys param required' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const requestedKeys = keysParam.split(',').map(k => k.trim()).filter(Boolean);
  const slug = request.nextUrl.searchParams.get('slug') ?? '';

  const data = readOpenClawJson();
  const skillVars = slug ? getSkillEnvVars(data, slug) : new Map<string, string>();
  const secretsVars = getSecretsVars(requestedKeys);
  const globalVars = getGlobalEnvVars(data);
  const legacyVars = existsSync(BAOYU_ENV_PATH)
    ? parseLegacyEnvFile(readFileSync(BAOYU_ENV_PATH, 'utf-8'))
    : new Map<string, string>();

  // Mirror secrets.json values to env.vars so OpenClaw can use them
  mirrorSecretsToEnvVars(requestedKeys);

  const resolved = resolveKeyStatus(requestedKeys, skillVars, secretsVars, globalVars, legacyVars);

  const status: Record<string, boolean> = {};
  const scopes: Record<string, KeyScope> = {};
  for (const [key, info] of Object.entries(resolved)) {
    status[key] = info.present;
    scopes[key] = info.scope;
  }

  return new Response(JSON.stringify({ status, scopes }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(request: NextRequest) {
  const { userId } = await verifyAuth(request);
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json() as { vars?: Record<string, string>; slug?: string; scope?: 'skill' | 'global' };
  if (!body.vars || typeof body.vars !== 'object') {
    return new Response(JSON.stringify({ error: 'vars object required' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const validationError = validateVars(body.vars);
  if (validationError) {
    return new Response(JSON.stringify({ error: validationError }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
  // If a slug is provided, default scope to 'skill'; otherwise 'global'
  const scope = body.scope ?? (slug ? 'skill' : 'global');

  const existing = readOpenClawJson();
  if (scope === 'skill' && slug) {
    writeOpenClawJson(mergeSkillEnvVars(existing, slug, body.vars));
  } else {
    // Write to secrets.json + mirror to env.vars
    const secrets = readSecretsJson();
    for (const [key, value] of Object.entries(body.vars)) {
      if (value === '') delete secrets[key];
      else secrets[key] = value;
    }
    writeSecretsJson(secrets);
    mirrorSecretsToEnvVars(Object.keys(body.vars));
  }

  // Legacy fallback: also write to ~/.baoyu-skills/.env
  writeLegacyEnvFile(body.vars);

  // Return updated masked status
  const updated = readOpenClawJson();
  const reqKeys = Object.keys(body.vars);
  const skillVars = slug ? getSkillEnvVars(updated, slug) : new Map<string, string>();
  const secretsVars = getSecretsVars(reqKeys);
  const globalVars = getGlobalEnvVars(updated);
  const legacyVars = parseLegacyEnvFile(existsSync(BAOYU_ENV_PATH) ? readFileSync(BAOYU_ENV_PATH, 'utf-8') : '');

  const resolved = resolveKeyStatus(reqKeys, skillVars, secretsVars, globalVars, legacyVars);
  const status: Record<string, boolean> = {};
  const scopes: Record<string, KeyScope> = {};
  for (const [key, info] of Object.entries(resolved)) {
    status[key] = info.present;
    scopes[key] = info.scope;
  }

  return new Response(JSON.stringify({ ok: true, status, scopes }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
