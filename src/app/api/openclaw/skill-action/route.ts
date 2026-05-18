import { NextRequest } from 'next/server';
import { homedir } from 'os';
import { join } from 'path';
import { proxySkillAction } from '@/lib/services/openclaw/security-proxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/openclaw/skill-action
 * Runs a skill CLI action (e.g. --login) for a given skill.
 * Body: { workspacePath: string; slug: string; args: string[]; chromeProfile?: string }
 *
 * The process is fire-and-forget (detached) for GUI actions like --login.
 * Returns immediately once the process has started.
 */
export async function POST(request: NextRequest) {
  try {
    const { workspacePath, slug, args = [], chromeProfile } = await request.json() as {
      workspacePath?: string;
      slug: string;
      args: string[];
      chromeProfile?: string;
    };

    if (!slug) {
      return new Response(JSON.stringify({ error: 'slug is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const base = workspacePath?.trim() || join(homedir(), '.openclaw', 'workspace-ami-ault-ami');
    const skillDir = join(base, 'skills', slug);

    // Determine the script to run based on slug
    const scriptMap: Record<string, string> = {
      'baoyu-post-to-x': join(skillDir, 'scripts', 'x-browser.ts'),
    };

    const scriptPath = scriptMap[slug];
    if (!scriptPath) {
      return new Response(JSON.stringify({ error: `No known script for skill: ${slug}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const finalArgs = [...args];
    if (chromeProfile?.trim()) {
      finalArgs.push('--profile', chromeProfile.trim().replace(/^~/, homedir()));
    }

    // ── Security Proxy: Skill Action ────────────────────────────────────────
    const actionCheck = proxySkillAction(slug, finalArgs);
    if (actionCheck.verdict === 'block') {
      return new Response(JSON.stringify({ error: actionCheck.reason || 'Blocked by security policy' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const safeArgs = actionCheck.args;

    // Dynamic import prevents Turbopack from statically resolving spawn args as module paths
    const { spawn } = await import('child_process');
    // Spawn detached so the GUI window (--login) stays open after this request returns
    const child = spawn('npx', ['-y', 'bun', scriptPath, ...safeArgs], {
      detached: true,
      stdio: 'ignore',
      env: { ...process.env },
    });
    child.unref();

    return new Response(JSON.stringify({ ok: true, pid: child.pid }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
