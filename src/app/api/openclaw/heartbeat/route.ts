/**
 * OpenClaw Heartbeat API
 *
 * GET  — Read HEARTBEAT.md from workspace (parsed into sections) + config from openclaw.json
 * POST — Write HEARTBEAT.md sections back to the workspace
 * PATCH — Update heartbeat config in openclaw.json (interval, target, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const OPENCLAW_DIR = join(homedir(), '.openclaw');
const OPENCLAW_JSON_PATH = join(OPENCLAW_DIR, 'openclaw.json');

interface HeartbeatSection {
  id: string;
  title: string;
  content: string;
  every?: string; // per-section frequency e.g. "1h", "30m"
  skills?: string[]; // skill slugs attached to this automation
}

function readOpenClawJson(): Record<string, unknown> {
  if (!existsSync(OPENCLAW_JSON_PATH)) return {};
  try {
    const raw = readFileSync(OPENCLAW_JSON_PATH, 'utf-8');
    return JSON.parse(raw.replace(/\/\/[^\n]*/g, ''));
  } catch {
    return {};
  }
}

function writeOpenClawJson(data: Record<string, unknown>): void {
  if (!existsSync(OPENCLAW_DIR)) mkdirSync(OPENCLAW_DIR, { recursive: true, mode: 0o700 });
  writeFileSync(OPENCLAW_JSON_PATH, JSON.stringify(data, null, 2) + '\n', { mode: 0o600 });
}

/** Find the default agent entry from agents.list[] */
function getDefaultAgent(config: Record<string, unknown>): Record<string, unknown> | null {
  const agents = (config.agents ?? {}) as Record<string, unknown>;
  const list = (agents.list ?? []) as Record<string, unknown>[];
  return list.find(a => a.default === true) ?? list[0] ?? null;
}

function getHeartbeatConfig(config: Record<string, unknown>) {
  // Read from agent entry first (where OpenClaw actually stores it),
  // fall back to agents.defaults.heartbeat for legacy configs
  const agent = getDefaultAgent(config);
  if (agent?.heartbeat) return agent.heartbeat as Record<string, unknown>;

  const agents = (config.agents ?? {}) as Record<string, unknown>;
  const defaults = (agents.defaults ?? {}) as Record<string, unknown>;
  return (defaults.heartbeat ?? null) as Record<string, unknown> | null;
}

const FREQ_RE = /<!--\s*every:\s*([\w]+)\s*-->/;
const SKILLS_RE = /<!--\s*skills:\s*([\w,\s-]+)\s*-->/;

function extractMetadata(content: string): { every?: string; skills?: string[]; cleanContent: string } {
  let clean = content;
  const freqMatch = clean.match(FREQ_RE);
  const every = freqMatch ? freqMatch[1] : undefined;
  if (freqMatch) clean = clean.replace(FREQ_RE, '');

  const skillsMatch = clean.match(SKILLS_RE);
  const skills = skillsMatch ? skillsMatch[1].split(',').map(s => s.trim()).filter(Boolean) : undefined;
  if (skillsMatch) clean = clean.replace(SKILLS_RE, '');

  // Strip the "Use these skills:" agent hint line if present
  clean = clean.replace(/^\*\*Use these skills:\*\*.*\n?/m, '');

  return { every, skills, cleanContent: clean.trim() };
}

function parseHeartbeatMd(raw: string): { preamble: string; sections: HeartbeatSection[] } {
  const lines = raw.split('\n');
  let preamble = '';
  const sections: HeartbeatSection[] = [];
  let currentTitle = '';
  let currentLines: string[] = [];
  let sectionIdx = 0;
  let inPreamble = true;

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (!inPreamble && currentTitle) {
        const rawContent = currentLines.join('\n').trim();
        const { every, skills, cleanContent } = extractMetadata(rawContent);
        sections.push({ id: `section-${sectionIdx++}`, title: currentTitle, content: cleanContent, every, skills });
      }
      inPreamble = false;
      currentTitle = line.replace(/^## \s*/, '').trim();
      currentLines = [];
    } else if (inPreamble) {
      preamble += line + '\n';
    } else {
      currentLines.push(line);
    }
  }

  if (currentTitle) {
    const rawContent = currentLines.join('\n').trim();
    const { every, skills, cleanContent } = extractMetadata(rawContent);
    sections.push({ id: `section-${sectionIdx}`, title: currentTitle, content: cleanContent, every, skills });
  }

  return { preamble: preamble.trim(), sections };
}

const TIMING_MARKER = '<!-- timing-check -->';

const TIMING_INSTRUCTIONS = `${TIMING_MARKER}
**⏱️ Per-step frequency control:**
Before running each step, read \`heartbeat-state.json\` in this workspace (create it if missing as \`{}\`).
Each step may have a \`<!-- every: Xm -->\` or \`<!-- every: Xh -->\` tag.
- If the tag is present, check \`heartbeat-state.json[sectionTitle]\` for the last-run ISO timestamp.
- If the elapsed time since that timestamp is **less than** the frequency, **skip the step entirely**.
- After completing a step with a frequency tag, update \`heartbeat-state.json[sectionTitle]\` to the current ISO timestamp.
- Steps without a frequency tag run on every heartbeat tick.`;

function sectionsToMd(preamble: string, sections: HeartbeatSection[]): string {
  const hasFrequencies = sections.some(s => s.every);
  let effectivePreamble = preamble;

  if (hasFrequencies && !preamble.includes(TIMING_MARKER)) {
    effectivePreamble = effectivePreamble
      ? effectivePreamble + '\n\n' + TIMING_INSTRUCTIONS
      : TIMING_INSTRUCTIONS;
  } else if (!hasFrequencies && preamble.includes(TIMING_MARKER)) {
    const markerIdx = preamble.indexOf(TIMING_MARKER);
    effectivePreamble = preamble.slice(0, markerIdx).trim();
  }

  let md = effectivePreamble ? effectivePreamble + '\n\n' : '';
  for (const s of sections) {
    const freqTag = s.every ? `<!-- every: ${s.every} -->\n` : '';
    const skillsTag = s.skills?.length ? `<!-- skills: ${s.skills.join(', ')} -->\n` : '';
    const skillsHint = s.skills?.length ? `**Use these skills:** ${s.skills.join(', ')}\n\n` : '';
    md += `## ${s.title}\n\n${freqTag}${skillsTag}${skillsHint}${s.content}\n\n`;
  }
  return md.trimEnd() + '\n';
}

function resolveHeartbeatPath(workspacePath: string): string {
  return join(workspacePath, 'HEARTBEAT.md');
}

export async function GET(request: NextRequest) {
  try {
    const workspacePath = request.nextUrl.searchParams.get('workspace');
    if (!workspacePath) {
      return NextResponse.json({ success: false, error: 'workspace param required' }, { status: 400 });
    }

    const config = readOpenClawJson();
    const heartbeatConfig = getHeartbeatConfig(config);

    const mdPath = resolveHeartbeatPath(workspacePath);
    let preamble = '';
    let sections: HeartbeatSection[] = [];
    let raw = '';

    if (existsSync(mdPath)) {
      raw = readFileSync(mdPath, 'utf-8');
      const parsed = parseHeartbeatMd(raw);
      preamble = parsed.preamble;
      sections = parsed.sections;
    }

    return NextResponse.json({
      success: true,
      config: heartbeatConfig,
      preamble,
      sections,
      raw,
      path: mdPath,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to read heartbeat';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { workspace, preamble, sections } = await request.json() as {
      workspace: string;
      preamble: string;
      sections: HeartbeatSection[];
    };

    if (!workspace) {
      return NextResponse.json({ success: false, error: 'workspace required' }, { status: 400 });
    }

    const mdPath = resolveHeartbeatPath(workspace);
    const md = sectionsToMd(preamble, sections);
    writeFileSync(mdPath, md, 'utf-8');

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to write HEARTBEAT.md';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const patch = await request.json() as Record<string, unknown>;
    const config = readOpenClawJson();

    // Write to agent entry (what OpenClaw reads) + defaults (legacy)
    const agent = getDefaultAgent(config);
    if (agent) {
      const existing = (agent.heartbeat ?? {}) as Record<string, unknown>;
      agent.heartbeat = { ...existing, ...patch };
    }

    const agents = (config.agents ?? {}) as Record<string, unknown>;
    const defaults = (agents.defaults ?? {}) as Record<string, unknown>;
    const existingDefaults = (defaults.heartbeat ?? {}) as Record<string, unknown>;
    defaults.heartbeat = { ...existingDefaults, ...patch };
    agents.defaults = defaults;
    config.agents = agents;
    writeOpenClawJson(config);

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to update heartbeat config';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
