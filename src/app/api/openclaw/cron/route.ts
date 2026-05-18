/**
 * OpenClaw Cron Job Management API
 *
 * GET  — Fetch run history for a specific cron job.
 * PATCH — Diagnose a failed cron run via Grok.
 * POST — Actions: run-now, enable, disable, edit, create a cron job.
 */

import { NextRequest, NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { rpcCall, runCli, parseJsonFromOutput } from '@/lib/utils/openclaw-cli';

const CRON_TIMEOUT = 120_000;

/** Ensure a model is in the agents.defaults.models allowlist so cron overrides work */
async function ensureModelAllowed(model: string): Promise<void> {
  try {
    const out = await runCli(['config', 'get', 'agents.defaults.models'], { timeout: 10_000 });
    const allowlist = parseJsonFromOutput<Record<string, unknown>>(out);
    if (allowlist && model in allowlist) return; // already allowed
    await runCli(['config', 'set', `agents.defaults.models.${model}`, '{}'], { timeout: 10_000 });
    // Restart gateway so the new allowlist takes effect
    await runCli(['gateway', 'restart'], { timeout: 15_000 });
  } catch {
    // Non-fatal — the model may still work if there's no allowlist
  }
}

const WORKSPACE_README = `# Agent Workspace

This folder is what your AI agent can read and write.
Keep it organized so automations can find what they need.

## Structure

\`\`\`
workspace/
├── skills/              ← installed agent skills (auto-managed)
├── shared/              ← files shared across all automations
│   ├── data/            ← reference docs, knowledge bases
│   └── media/           ← shared images & assets
└── jobs/                ← per-automation directories (auto-created)
    └── social-poster/   ← example: one automation's workspace
        ├── output/      ← generated content, logs, history
        └── input/       ← automation-specific reference files
\`\`\`

## Tips
- Each automation gets its own folder under \`jobs/\` — keeps outputs separate
- Put shared reference files (knowledge bases, brand guides) in \`shared/data/\`
- Automations CANNOT access files outside this workspace
- Use the "Open" button in the app to quickly add files
`;

/** Slugify a job name for use as a directory name */
function slugifyJobName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'unnamed';
}

/** Scaffold workspace directories + README, plus a per-job directory */
async function scaffoldWorkspace(jobName?: string): Promise<void> {
  try {
    const out = await runCli(['config', 'get', 'agents'], { timeout: 10_000 });
    const agents = parseJsonFromOutput<Record<string, { workspace?: string; id?: string }>>(out);
    if (!agents) return;

    for (const agent of Object.values(agents)) {
      const ws = agent.workspace ?? join(homedir(), '.openclaw', `workspace-${agent.id}`);
      if (!existsSync(ws)) continue;

      // Shared directories
      const sharedDirs = ['shared/data', 'shared/media', 'jobs'];
      for (const dir of sharedDirs) {
        await mkdir(join(ws, dir), { recursive: true });
      }

      // Per-job directories
      if (jobName) {
        const slug = slugifyJobName(jobName);
        const jobDir = join(ws, 'jobs', slug);
        await mkdir(join(jobDir, 'output'), { recursive: true });
        await mkdir(join(jobDir, 'input'), { recursive: true });
      }

      const readmePath = join(ws, 'README.md');
      if (!existsSync(readmePath)) {
        await writeFile(readmePath, WORKSPACE_README, 'utf-8');
      }
    }
  } catch {
    // Non-fatal — workspace may already be organized
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');
  if (!jobId) {
    return NextResponse.json({ success: false, error: 'jobId required' }, { status: 400 });
  }
  try {
    // Try RPC first (fast), fall back to CLI
    try {
      const data = await rpcCall('cron.runs', { jobId });
      return NextResponse.json({ success: true, entries: (data.entries as unknown[]) ?? [] });
    } catch {
      const out = await runCli(['cron', 'runs', '--id', jobId], { timeout: CRON_TIMEOUT });
      const data = parseJsonFromOutput<{ entries?: unknown[] }>(out);
      return NextResponse.json({ success: true, entries: data?.entries ?? [] });
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch runs';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { jobName, error, summary } = await request.json() as {
      jobName?: string;
      error?: string;
      summary?: string;
    };
    if (!error) {
      return NextResponse.json({ success: false, error: 'error field required' }, { status: 400 });
    }
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: true, diagnosis: null });
    }

    const context = [
      jobName ? `Automation: ${jobName}` : null,
      summary ? `What happened: ${summary}` : null,
      `Error: ${error}`,
    ].filter(Boolean).join('\n');

    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'grok-4-1-fast-non-reasoning',
        messages: [
          {
            role: 'system',
            content: `You are a helpful assistant explaining why an OpenClaw automation task failed. OpenClaw is an AI agent gateway that runs scheduled tasks using tools like file edit/write/read, Apple Notes, calendar, email, and web search.

Given the error and context, explain in 1–2 plain sentences:
1. What went wrong and why
2. How the user can fix it (be specific, actionable)

Keep it concise. No markdown formatting. No technical jargon unless necessary. Talk directly to the user as "you".`,
          },
          { role: 'user', content: context },
        ],
        temperature: 0.3,
        max_tokens: 150,
      }),
    });

    if (!res.ok) return NextResponse.json({ success: true, diagnosis: null });
    const data = await res.json();
    const diagnosis = (data.choices?.[0]?.message?.content as string | undefined)?.trim() ?? null;
    return NextResponse.json({ success: true, diagnosis });
  } catch {
    return NextResponse.json({ success: true, diagnosis: null });
  }
}

type CronAction = 'run-now' | 'enable' | 'disable' | 'edit' | 'create';

interface CronEditFields {
  name?: string;
  every?: string;
  message?: string;
  model?: string;
}

interface CronCreateFields {
  name: string;
  every: string;
  message: string;
  session?: string;
  model?: string;
  agentId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      action: CronAction;
      jobId?: string;
      fields?: CronEditFields;
      create?: CronCreateFields;
    };
    const { action, jobId, fields, create: createFields } = body;

    if (!action) {
      return NextResponse.json({ success: false, error: 'action required' }, { status: 400 });
    }

    if (action !== 'create' && !jobId) {
      return NextResponse.json({ success: false, error: 'jobId required for this action' }, { status: 400 });
    }

    const validActions: CronAction[] = ['run-now', 'enable', 'disable', 'edit', 'create'];
    if (!validActions.includes(action)) {
      return NextResponse.json({ success: false, error: `Invalid action: ${action}` }, { status: 400 });
    }

    switch (action) {
      case 'run-now': {
        const out = await runCli(['cron', 'run', jobId!], { timeout: CRON_TIMEOUT });
        const result = parseJsonFromOutput(out) ?? { ok: true };
        return NextResponse.json({ success: true, result });
      }
      case 'enable': {
        await runCli(['cron', 'enable', jobId!], { timeout: CRON_TIMEOUT });
        return NextResponse.json({ success: true });
      }
      case 'disable': {
        await runCli(['cron', 'disable', jobId!], { timeout: CRON_TIMEOUT });
        return NextResponse.json({ success: true });
      }
      case 'edit': {
        if (!fields) {
          return NextResponse.json({ success: false, error: 'fields required for edit' }, { status: 400 });
        }
        if (fields.model) await ensureModelAllowed(fields.model);
        const args = ['cron', 'edit', jobId!];
        if (fields.name) args.push('--name', fields.name);
        if (fields.every) args.push('--every', fields.every);
        if (fields.message) args.push('--message', fields.message);
        if (fields.model) args.push('--model', fields.model);
        await runCli(args, { timeout: CRON_TIMEOUT });
        return NextResponse.json({ success: true });
      }
      case 'create': {
        if (!createFields?.name || !createFields?.every || !createFields?.message) {
          return NextResponse.json({ success: false, error: 'name, every, and message required for create' }, { status: 400 });
        }
        if (createFields.model) await ensureModelAllowed(createFields.model);
        await scaffoldWorkspace(createFields.name);
        const args = [
          'cron', 'add',
          '--name', createFields.name,
          '--every', createFields.every,
          '--message', createFields.message,
          '--session', createFields.session ?? 'isolated',
          ...(createFields.model ? ['--model', createFields.model] : []),
          ...(createFields.agentId ? ['--agent', createFields.agentId] : []),
        ];
        const out = await runCli(args, { timeout: CRON_TIMEOUT });
        const result = parseJsonFromOutput(out) ?? { ok: true };
        return NextResponse.json({ success: true, result });
      }
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Cron action failed';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
