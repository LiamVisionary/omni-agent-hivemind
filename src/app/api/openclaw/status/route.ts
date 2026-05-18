/**
 * OpenClaw Automation Status API
 *
 * GET — Returns gateway health, heartbeat status, and cron job list.
 *
 * Uses direct WebSocket RPC to the gateway (~30ms total) instead of spawning
 * CLI subprocesses (~7-10s total). Falls back to CLI if gateway is unreachable.
 *
 * Workspace skills are opt-in via ?includeSkills=true (filesystem scan).
 * Server-side response cache (10s TTL) prevents redundant calls.
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { rpcCall, runCli, parseJsonFromOutput } from '@/lib/utils/openclaw-cli';
import { cacheKey, getCached, setCached } from '@/lib/utils/openclaw-cache';

// ── Types ───────────────────────────────────────────────────────────────────

interface GatewayStatus {
  running: boolean;
  agent?: string;
  heartbeatInterval?: string;
  whatsappLinked?: boolean;
  error?: string;
}

interface HeartbeatStatus {
  lastTickTs?: number;
  status?: string;
  reason?: string;
  durationMs?: number;
  silent?: boolean;
  enabled?: boolean;
  error?: string;
}

interface CronJob {
  id: string;
  name: string;
  schedule: string;
  every?: string;
  everyMs?: number;
  message?: string;
  model?: string;
  nextRunMs?: number;
  lastRunMs?: number;
  nextRun?: string;
  lastRun?: string;
  lastStatus?: string;
  lastDurationMs?: number;
  lastSummary?: string;
  lastError?: string;
  enabled: boolean;
  agentId?: string;
  sessionTarget?: string;
}

interface WorkspaceSkill {
  slug: string;
  name: string;
}

interface StatusResponse {
  success: boolean;
  gateway: GatewayStatus;
  heartbeat: HeartbeatStatus;
  cronJobs: CronJob[];
  workspaceSkills: WorkspaceSkill[];
  fetchedAt: number;
}

// ── Data fetchers (RPC with CLI fallback) ───────────────────────────────────

async function getGatewayHealth(): Promise<GatewayStatus> {
  try {
    const data = await rpcCall('health') as {
      ok?: boolean;
      defaultAgentId?: string;
      heartbeatSeconds?: number;
      agents?: { agentId: string; heartbeat?: { every?: string } }[];
      channels?: Record<string, { linked?: boolean }>;
    };
    const firstAgent = data.agents?.[0];
    const waLinked = Object.values(data.channels ?? {}).some(c => c.linked);
    return {
      running: data.ok === true && (data.agents?.length ?? 0) > 0,
      agent: data.defaultAgentId ?? firstAgent?.agentId,
      heartbeatInterval: firstAgent?.heartbeat?.every,
      whatsappLinked: waLinked,
    };
  } catch (err) {
    console.warn(`[openclaw-status] RPC health failed, falling back to CLI:`, err instanceof Error ? err.message : err);
    // Fall back to CLI
    try {
      const output = await runCli(['health', '--json']);
      const data = parseJsonFromOutput<{
        ok?: boolean;
        defaultAgentId?: string;
        agents?: { agentId: string; heartbeat?: { every?: string } }[];
        channels?: Record<string, { linked?: boolean }>;
      }>(output);
      if (data) {
        const firstAgent = data.agents?.[0];
        const waLinked = Object.values(data.channels ?? {}).some(c => c.linked);
        return {
          running: data.ok === true && (data.agents?.length ?? 0) > 0,
          agent: data.defaultAgentId ?? firstAgent?.agentId,
          heartbeatInterval: firstAgent?.heartbeat?.every,
          whatsappLinked: waLinked,
        };
      }
    } catch { /* fall through */ }
    const msg = err instanceof Error ? err.message : 'Unknown error';
    const isDown = /ENOENT|ECONNREFUSED|timed out|WS/i.test(msg);
    return { running: false, error: isDown ? 'Gateway is not running' : msg };
  }
}

async function getHeartbeatStatus(): Promise<HeartbeatStatus> {
  try {
    const data = await rpcCall('last-heartbeat') as Record<string, unknown>;
    return {
      lastTickTs: data.ts as number,
      status: data.status as string,
      reason: data.reason as string,
      durationMs: data.durationMs as number,
      silent: data.silent as boolean,
      enabled: true,
    };
  } catch {
    // Fall back to CLI
    try {
      const output = await runCli(['system', 'heartbeat', 'last']);
      const data = parseJsonFromOutput(output);
      if (data) {
        return {
          lastTickTs: data.ts as number,
          status: data.status as string,
          reason: data.reason as string,
          durationMs: data.durationMs as number,
          silent: data.silent as boolean,
          enabled: true,
        };
      }
    } catch { /* fall through */ }
    return { error: 'Could not fetch heartbeat status' };
  }
}

async function getCronJobs(): Promise<CronJob[]> {
  try {
    const data = await rpcCall('cron.list') as { jobs?: Record<string, unknown>[] };
    const jobs = data.jobs ?? [];
    return jobs.map(normalizeCronJob);
  } catch {
    // Fall back to CLI
    try {
      const output = await runCli(['cron', 'list', '--all', '--json']);
      const parsed = parseJsonFromOutput<{ jobs?: Record<string, unknown>[] } | Record<string, unknown>[]>(output);
      if (parsed) {
        const jobs = Array.isArray(parsed) ? parsed : (parsed as { jobs?: Record<string, unknown>[] }).jobs ?? [];
        return jobs.map(normalizeCronJob);
      }
      return parseCronTable(output);
    } catch {
      try {
        const output = await runCli(['cron', 'list', '--all']);
        return parseCronTable(output);
      } catch {
        return [];
      }
    }
  }
}

function normalizeCronJob(raw: Record<string, unknown>): CronJob {
  const schedule = raw.schedule as Record<string, unknown> | undefined;
  const state = raw.state as Record<string, unknown> | undefined;

  let scheduleStr = 'unknown';
  let everyMs: number | undefined;
  if (schedule?.kind === 'every') {
    const ms = schedule.everyMs as number;
    everyMs = ms;
    if (ms >= 3600000) scheduleStr = `every ${ms / 3600000}h`;
    else if (ms >= 60000) scheduleStr = `every ${ms / 60000}m`;
    else scheduleStr = `every ${ms / 1000}s`;
  } else if (schedule?.kind === 'cron') {
    scheduleStr = (schedule.expression as string) ?? 'cron';
  }

  const payload = raw.payload as Record<string, unknown> | undefined;
  const nextRunAtMs = state?.nextRunAtMs as number | undefined;
  const lastRunAtMs = state?.lastRunAtMs as number | undefined;

  return {
    id: raw.id as string,
    name: raw.name as string,
    schedule: scheduleStr,
    every: schedule?.kind === 'every' ? scheduleStr.replace('every ', '') : undefined,
    everyMs,
    message: (payload?.message as string) ?? undefined,
    model: (payload?.model as string) ?? undefined,
    nextRunMs: nextRunAtMs,
    lastRunMs: lastRunAtMs,
    nextRun: formatRelativeTime(nextRunAtMs),
    lastRun: formatRelativeTime(lastRunAtMs),
    lastStatus: (state?.lastStatus as string) ?? undefined,
    lastDurationMs: (state?.lastDurationMs as number) ?? undefined,
    lastSummary: (state?.lastSummary as string) ?? undefined,
    lastError: (state?.lastError as string) ?? undefined,
    enabled: raw.enabled as boolean ?? true,
    agentId: raw.agentId as string,
    sessionTarget: raw.sessionTarget as string,
  };
}

function parseCronTable(output: string): CronJob[] {
  const lines = output.split('\n').filter(l => l.includes('every') || l.includes('cron'));
  return lines.map((line, i) => {
    const parts = line.trim().split(/\s{2,}/);
    return {
      id: parts[0] ?? `unknown-${i}`,
      name: parts[1] ?? 'Unknown',
      schedule: parts[2] ?? 'unknown',
      nextRun: parts[3],
      lastRun: parts[4],
      lastStatus: parts[5],
      enabled: !line.includes('disabled'),
    };
  }).filter(j => j.id.length > 8);
}

function getWorkspaceSkills(): WorkspaceSkill[] {
  try {
    const configPath = join(homedir(), '.openclaw', 'openclaw.json');
    if (!existsSync(configPath)) return [];
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));

    const agents = config.agents as Record<string, unknown> | undefined;
    if (!agents) return [];
    const agentList = (agents.list ?? []) as Record<string, unknown>[];

    const skills: WorkspaceSkill[] = [];
    const seen = new Set<string>();

    for (const agent of agentList) {
      const workspace = (agent.workspace as string) ?? join(homedir(), '.openclaw', `workspace-${agent.id}`);
      const skillsDir = join(workspace, 'skills');
      if (!existsSync(skillsDir)) continue;

      const entries = readdirSync(skillsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() || seen.has(entry.name)) continue;
        seen.add(entry.name);

        let name = entry.name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const skillMdPath = join(skillsDir, entry.name, 'SKILL.md');
        if (existsSync(skillMdPath)) {
          const md = readFileSync(skillMdPath, 'utf-8');
          const titleMatch = md.match(/^#\s+(.+)/m);
          if (titleMatch) name = titleMatch[1].trim();
        }

        skills.push({ slug: entry.name, name });
      }
    }

    return skills.sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

function formatRelativeTime(ms: number | undefined): string | undefined {
  if (!ms) return undefined;
  const diff = ms - Date.now();
  const absDiff = Math.abs(diff);

  if (absDiff < 60_000) return diff > 0 ? 'in <1m' : '<1m ago';
  if (absDiff < 3600_000) {
    const mins = Math.round(absDiff / 60_000);
    return diff > 0 ? `in ${mins}m` : `${mins}m ago`;
  }
  const hrs = Math.round(absDiff / 3600_000);
  return diff > 0 ? `in ${hrs}h` : `${hrs}h ago`;
}

// ── Route handler ───────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const t0 = Date.now();
  const { searchParams } = new URL(request.url);
  const includeSkills = searchParams.get('includeSkills') === 'true';
  const workspace = searchParams.get('workspace') ?? undefined;

  const key = cacheKey('openclaw:status', workspace);
  const cached = getCached<StatusResponse>(key);
  if (cached) {
    if (!includeSkills || cached.workspaceSkills.length > 0) {
      console.log(`[openclaw-status] Served from cache in ${Date.now() - t0}ms`);
      return NextResponse.json(cached);
    }
  }

  try {
    const [gateway, heartbeat, cronJobs] = await Promise.all([
      getGatewayHealth(),
      getHeartbeatStatus(),
      getCronJobs(),
    ]);
    console.log(`[openclaw-status] All RPC calls done in ${Date.now() - t0}ms`);
    const workspaceSkills = includeSkills ? getWorkspaceSkills() : [];
    const response: StatusResponse = {
      success: true, gateway, heartbeat, cronJobs, workspaceSkills, fetchedAt: Date.now(),
    };
    setCached(key, response);
    console.log(`[openclaw-status] Total response time: ${Date.now() - t0}ms`);
    return NextResponse.json(response);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch status';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
