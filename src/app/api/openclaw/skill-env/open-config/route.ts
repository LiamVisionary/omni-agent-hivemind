export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { execSync } from 'child_process';
import { verifyAuth } from '@/lib/utils/server-auth';

/**
 * POST /api/openclaw/skill-env/open-config
 *
 * Global keys (no slug): opens ~/.openclaw/secrets.json with placeholders,
 * then mirrors real values to env.vars in openclaw.json so OpenClaw can use them.
 *
 * Per-skill overrides (slug provided): opens openclaw.json with placeholders
 * under skills.entries.<slug>.env.
 *
 * Body: { keys: string[], slug?: string }
 */

const OPENCLAW_DIR = join(homedir(), '.openclaw');
const OPENCLAW_JSON_PATH = join(OPENCLAW_DIR, 'openclaw.json');
const SECRETS_JSON_PATH = join(OPENCLAW_DIR, 'secrets.json');

type OpenClawJson = {
  env?: {
    vars?: Record<string, string>;
    [key: string]: unknown;
  };
  skills?: {
    entries?: Record<string, {
      env?: Record<string, string>;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

function readJsonFile(path: string): Record<string, unknown> {
  if (!existsSync(path)) return {};
  try {
    const raw = readFileSync(path, 'utf-8');
    return JSON.parse(raw.replace(/\/\/[^\n]*/g, ''));
  } catch {
    return {};
  }
}

function writeJsonFile(path: string, data: Record<string, unknown>): void {
  if (!existsSync(OPENCLAW_DIR)) mkdirSync(OPENCLAW_DIR, { recursive: true, mode: 0o700 });
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', { mode: 0o600 });
}

function isPlaceholder(val: unknown): boolean {
  return typeof val === 'string' && val.startsWith('YOUR_') && val.endsWith('_HERE');
}

/** Copy real (non-placeholder) values from secrets.json to env.vars in openclaw.json */
function mirrorSecretsToEnvVars(keys: string[]): void {
  const secrets = readJsonFile(SECRETS_JSON_PATH);
  const config = readJsonFile(OPENCLAW_JSON_PATH) as OpenClawJson;
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
    config.env = { ...(config.env ?? {}), vars: currentVars };
    writeJsonFile(OPENCLAW_JSON_PATH, config);
  }
}

export async function POST(request: NextRequest) {
  const { userId } = await verifyAuth(request);
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json() as { keys?: string[]; slug?: string };
  const keys = Array.isArray(body.keys) ? body.keys.filter(k => typeof k === 'string' && /^[A-Z0-9_]+$/.test(k)) : [];
  const slug = typeof body.slug === 'string' ? body.slug.trim() : '';

  if (slug && keys.length > 0) {
    // Per-skill overrides: placeholders in openclaw.json → skills.entries.<slug>.env
    const data = readJsonFile(OPENCLAW_JSON_PATH) as OpenClawJson;
    const entries = { ...(data.skills?.entries ?? {}) } as Record<string, Record<string, unknown>>;
    const existing = entries[slug] ?? {};
    const currentEnv = { ...((existing.env ?? {}) as Record<string, string>) };
    let modified = false;
    for (const key of keys) {
      if (!currentEnv[key]) {
        currentEnv[key] = `YOUR_${key}_HERE`;
        modified = true;
      }
    }
    if (modified) {
      entries[slug] = { ...existing, env: currentEnv };
      data.skills = { ...(data.skills ?? {}), entries } as OpenClawJson['skills'];
      writeJsonFile(OPENCLAW_JSON_PATH, data);
    }

    // Open openclaw.json for per-skill overrides
    try {
      const opener = process.platform === 'darwin' ? 'open' : 'xdg-open';
      execSync(`${opener} "${OPENCLAW_JSON_PATH}"`, { timeout: 5000 });
    } catch { /* non-fatal */ }

    return new Response(JSON.stringify({ ok: true, path: OPENCLAW_JSON_PATH }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Global keys: placeholders in secrets.json
  const secrets = readJsonFile(SECRETS_JSON_PATH);
  let modified = false;
  for (const key of keys) {
    if (!secrets[key] || isPlaceholder(secrets[key])) {
      secrets[key] = `YOUR_${key}_HERE`;
      modified = true;
    }
  }
  if (modified || !existsSync(SECRETS_JSON_PATH)) {
    writeJsonFile(SECRETS_JSON_PATH, secrets);
  }

  // Mirror any existing real values to env.vars in openclaw.json
  mirrorSecretsToEnvVars(keys);

  // Open secrets.json
  try {
    const opener = process.platform === 'darwin' ? 'open' : 'xdg-open';
    execSync(`${opener} "${SECRETS_JSON_PATH}"`, { timeout: 5000 });
  } catch { /* non-fatal */ }

  return new Response(JSON.stringify({ ok: true, path: SECRETS_JSON_PATH }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
