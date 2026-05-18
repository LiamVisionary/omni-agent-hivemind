import { homedir } from 'os';
import { join } from 'path';
import fs from 'fs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/openclaw/autoposter/login
 * Launches Chrome with the x-browser --login flag so the user can log into X.
 * Resolves the baoyu skill directory the same way x-autoposter.mjs does.
 */
export async function POST() {
  const home = homedir();
  const openclawJsonPath = join(home, '.openclaw', 'openclaw.json');
  const SKILL_SLUG = 'baoyu-post-to-x';

  const candidates: string[] = [];

  if (fs.existsSync(openclawJsonPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(openclawJsonPath, 'utf8'));
      const agents: Array<{ default?: boolean; workspace?: string }> = config?.agents?.list ?? [];
      const defaultAgent = agents.find(a => a.default === true);
      if (defaultAgent?.workspace) {
        candidates.push(join(defaultAgent.workspace, 'skills', SKILL_SLUG));
      }
      const defaultWorkspace = config?.agents?.defaults?.workspace;
      if (defaultWorkspace) {
        candidates.push(join(defaultWorkspace, 'skills', SKILL_SLUG));
      }
      for (const agent of agents) {
        if (agent.workspace && agent !== defaultAgent) {
          candidates.push(join(agent.workspace, 'skills', SKILL_SLUG));
        }
      }
    } catch { /* malformed openclaw.json */ }
  }

  const openclawDir = join(home, '.openclaw');
  if (fs.existsSync(openclawDir)) {
    for (const entry of fs.readdirSync(openclawDir, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name.startsWith('workspace')) {
        candidates.push(join(openclawDir, entry.name, 'skills', SKILL_SLUG));
      }
    }
  }

  let skillDir: string | null = null;
  for (const candidate of candidates) {
    if (fs.existsSync(join(candidate, 'SKILL.md'))) {
      skillDir = candidate;
      break;
    }
  }

  if (!skillDir) {
    return new Response(
      JSON.stringify({ error: 'baoyu-post-to-x skill not found' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const xBrowserScript = join(skillDir, 'scripts', 'x-browser.ts');
  if (!fs.existsSync(xBrowserScript)) {
    return new Response(
      JSON.stringify({ error: 'x-browser.ts not found in skill scripts/' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Dynamic import prevents Turbopack from statically resolving spawn args as module paths
  const { spawn } = await import('child_process');
  // Launch detached — this opens a visible Chrome window for the user to log in
  const child = spawn('npx', ['-y', 'bun', xBrowserScript, '--login'], {
    stdio: 'ignore',
    detached: true,
    env: { ...process.env },
  });
  child.unref();

  return new Response(
    JSON.stringify({ ok: true, message: 'Chrome launched for X login' }),
    { headers: { 'Content-Type': 'application/json' } },
  );
}
