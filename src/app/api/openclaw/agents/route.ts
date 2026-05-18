/**
 * OpenClaw Agents Management API
 *
 * GET    — List all agents from openclaw.json
 * POST   — Create a new agent entry + scaffold workspace
 * DELETE — Remove an agent (workspace is preserved for safety)
 */

import { NextRequest, NextResponse } from 'next/server';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const OPENCLAW_DIR = join(homedir(), '.openclaw');
const OPENCLAW_JSON_PATH = join(OPENCLAW_DIR, 'openclaw.json');

export interface AgentSummary {
  id: string;
  name: string;
  emoji?: string;
  model?: string;
  workspace?: string;
  default?: boolean;
  heartbeat?: { every?: string };
}

function readConfig(): Record<string, unknown> {
  if (!existsSync(OPENCLAW_JSON_PATH)) return {};
  try {
    const raw = readFileSync(OPENCLAW_JSON_PATH, 'utf-8');
    return JSON.parse(raw.replace(/\/\/[^\n]*/g, ''));
  } catch {
    return {};
  }
}

function writeConfig(data: Record<string, unknown>): void {
  if (!existsSync(OPENCLAW_DIR)) mkdirSync(OPENCLAW_DIR, { recursive: true, mode: 0o700 });
  writeFileSync(OPENCLAW_JSON_PATH, JSON.stringify(data, null, 2) + '\n', { mode: 0o600 });
}

function parseAgents(config: Record<string, unknown>): AgentSummary[] {
  const agents = (config.agents ?? {}) as Record<string, unknown>;
  const list = (agents.list ?? []) as Record<string, unknown>[];
  return list.map(a => {
    const identity = (a.identity ?? {}) as Record<string, unknown>;
    return {
      id: a.id as string,
      name: (identity.name as string) ?? (a.id as string),
      emoji: identity.emoji as string | undefined,
      model: a.model as string | undefined,
      workspace: a.workspace as string | undefined,
      default: a.default as boolean | undefined,
      heartbeat: a.heartbeat as { every?: string } | undefined,
    };
  });
}

function slugifyName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'agent';
}

export async function GET() {
  try {
    const config = readConfig();
    const agents = parseAgents(config);
    return NextResponse.json({ success: true, agents });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to read agents';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, emoji, model } = await request.json() as {
      name: string;
      emoji?: string;
      model?: string;
    };

    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: 'name required' }, { status: 400 });
    }

    const config = readConfig();
    const agents = (config.agents ?? {}) as Record<string, unknown>;
    const list = (agents.list ?? []) as Record<string, unknown>[];

    // Generate unique ID from name
    const slug = slugifyName(name.trim());
    const suffix = Math.random().toString(36).slice(2, 7);
    const id = `${slug}-${suffix}`;
    const workspacePath = join(OPENCLAW_DIR, `workspace-${id}`);

    const newAgent: Record<string, unknown> = {
      id,
      default: list.length === 0,
      workspace: workspacePath,
      model: model ?? 'xai/grok-4-1-fast-non-reasoning',
      identity: {
        name: name.trim(),
        ...(emoji ? { emoji } : {}),
        theme: `You are ${name.trim()}, an AI agent.`,
      },
    };

    list.push(newAgent);
    agents.list = list;
    config.agents = agents;
    writeConfig(config);

    // Scaffold workspace directories
    try {
      mkdirSync(join(workspacePath, 'skills'), { recursive: true });
      mkdirSync(join(workspacePath, 'shared', 'data'), { recursive: true });
      mkdirSync(join(workspacePath, 'shared', 'media'), { recursive: true });
      mkdirSync(join(workspacePath, 'jobs'), { recursive: true });
    } catch { /* non-fatal */ }

    const summary: AgentSummary = {
      id,
      name: name.trim(),
      emoji,
      model: newAgent.model as string,
      workspace: workspacePath,
      default: newAgent.default as boolean,
    };

    return NextResponse.json({ success: true, agent: summary });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to create agent';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json() as { id: string };
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });

    const config = readConfig();
    const agents = (config.agents ?? {}) as Record<string, unknown>;
    const list = (agents.list ?? []) as Record<string, unknown>[];

    const idx = list.findIndex(a => a.id === id);
    if (idx === -1) return NextResponse.json({ success: false, error: 'Agent not found' }, { status: 404 });
    if (list.length <= 1) return NextResponse.json({ success: false, error: 'Cannot delete the only agent' }, { status: 400 });

    const wasDefault = list[idx].default === true;
    list.splice(idx, 1);

    // Promote first remaining agent to default if needed
    if (wasDefault && list.length > 0) {
      list[0] = { ...list[0] as Record<string, unknown>, default: true };
    }

    agents.list = list;
    config.agents = agents;
    writeConfig(config);

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to delete agent';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
