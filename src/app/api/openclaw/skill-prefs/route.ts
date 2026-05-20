/**
 * /api/openclaw/skill-prefs
 *
 * Reads and writes EXTEND.md preferences for OpenClaw skills.
 *
 * GET  ?slug=baoyu-image-gen
 *   Returns { schema, values } where schema is parsed from
 *   references/config/preferences-schema.md and values from EXTEND.md.
 *
 * POST { slug, values: Record<string, string|null> }
 *   Writes updated EXTEND.md with the provided values.
 */

import { NextRequest } from 'next/server';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { verifyAuth } from '@/lib/utils/server-auth';

// ── Types ────────────────────────────────────────────────────────────────────

interface SchemaField {
  key: string;
  label: string;
  type: 'select' | 'text' | 'toggle';
  options?: string[];
  defaultValue: string | null;
  group?: string;       // e.g. "default_model" for nested fields
  description?: string;
}

interface ParsedSchema {
  version: number;
  fields: SchemaField[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Find the workspace skills directory for a given skill slug */
function findSkillDir(slug: string): string | null {
  try {
    const configPath = join(/*turbopackIgnore: true*/ homedir(), '.openclaw', 'openclaw.json');
    if (!existsSync(configPath)) return null;
    const raw = readFileSync(configPath, 'utf-8').replace(/\/\/[^\n]*/g, '');
    const config = JSON.parse(raw);

    const agentList = (config.agents?.list ?? []) as Record<string, unknown>[];
    for (const agent of agentList) {
      const workspace = (agent.workspace as string) ?? join(/*turbopackIgnore: true*/ homedir(), '.openclaw', `workspace-${agent.id}`);
      const skillDir = join(/*turbopackIgnore: true*/ workspace, 'skills', slug);
      if (existsSync(skillDir)) return skillDir;
    }
  } catch { /* ignore */ }
  return null;
}

/** Find EXTEND.md for a skill. Priority: project → user home → workspace skill dir */
function findExtendMd(slug: string, skillDir: string | null): string | null {
  const candidates = [
    join(/*turbopackIgnore: true*/ homedir(), '.baoyu-skills', slug, 'EXTEND.md'),
    ...(skillDir ? [join(/*turbopackIgnore: true*/ skillDir, 'EXTEND.md')] : []),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}

/** Get the writable path for EXTEND.md (user home level) */
function getExtendMdWritePath(slug: string): string {
  return join(/*turbopackIgnore: true*/ homedir(), '.baoyu-skills', slug, 'EXTEND.md');
}

/** Extract YAML between --- delimiters */
function extractYamlFrontmatter(content: string): string | null {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/m);
  return match ? match[1] : null;
}

/** Parse simple YAML (flat + one level of nesting) */
function parseSimpleYaml(yaml: string): Record<string, string | Record<string, string>> {
  const result: Record<string, string | Record<string, string>> = {};
  let currentGroup: string | null = null;

  for (const line of yaml.split('\n')) {
    const trimmed = line.replace(/#.*$/, '').trimEnd();
    if (!trimmed) continue;

    const indent = line.length - line.trimStart().length;

    if (indent >= 2 && currentGroup) {
      // Nested key
      const colonIdx = trimmed.indexOf(':');
      if (colonIdx === -1) continue;
      const key = trimmed.slice(0, colonIdx).trim();
      const val = trimmed.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');
      const group = result[currentGroup];
      if (typeof group === 'object') {
        group[key] = val === 'null' || val === '' ? '' : val;
      }
    } else {
      const colonIdx = trimmed.indexOf(':');
      if (colonIdx === -1) continue;
      const key = trimmed.slice(0, colonIdx).trim();
      const val = trimmed.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');

      if (val === '' || val === 'null') {
        // Check if next lines are indented (nested object)
        currentGroup = key;
        result[key] = {};
      } else {
        currentGroup = null;
        result[key] = val === 'null' ? '' : val;
      }
    }
  }

  return result;
}

/** Serialize values back to YAML frontmatter EXTEND.md */
function serializeExtendMd(
  values: Record<string, string | null>,
  schema: ParsedSchema,
): string {
  const lines: string[] = ['---'];

  lines.push(`version: ${schema.version}`);

  // Separate flat fields from grouped fields
  const groups = new Map<string, SchemaField[]>();
  const flat: SchemaField[] = [];

  for (const field of schema.fields) {
    if (field.key === 'version') continue;
    if (field.group) {
      const list = groups.get(field.group) ?? [];
      list.push(field);
      groups.set(field.group, list);
    } else {
      flat.push(field);
    }
  }

  for (const field of flat) {
    const val = values[field.key];
    if (val === null || val === undefined || val === '') {
      lines.push(`${field.key}: null`);
    } else {
      lines.push(`${field.key}: ${val}`);
    }
  }

  for (const [groupKey, fields] of groups) {
    lines.push(`${groupKey}:`);
    for (const field of fields) {
      const subKey = field.key.replace(`${groupKey}.`, '');
      const val = values[field.key];
      if (val === null || val === undefined || val === '') {
        lines.push(`  ${subKey}: null`);
      } else {
        lines.push(`  ${subKey}: ${val}`);
      }
    }
  }

  lines.push('---');
  return lines.join('\n') + '\n';
}

/** Parse the preferences-schema.md to extract field definitions */
function parsePreferencesSchema(schemaPath: string): ParsedSchema | null {
  try {
    const content = readFileSync(schemaPath, 'utf-8');

    // Extract the full schema YAML block (first ```yaml ... ``` block)
    const yamlMatch = content.match(/```yaml\s*\n([\s\S]*?)```/);
    if (!yamlMatch) return null;

    const yamlContent = extractYamlFrontmatter('---\n' + yamlMatch[1].trim() + '\n---')
      ?? yamlMatch[1].trim();
    const parsed = parseSimpleYaml(yamlContent);

    const version = parsed.version ? parseInt(parsed.version as string, 10) : 1;
    const fields: SchemaField[] = [];

    // Extract field reference table for descriptions and types
    const tableRows = [...content.matchAll(/\|\s*`([^`]+)`\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|/g)];
    const fieldMeta = new Map<string, { type: string; defaultVal: string; desc: string }>();
    for (const row of tableRows) {
      fieldMeta.set(row[1], {
        type: row[2].trim(),
        defaultVal: row[3].trim(),
        desc: row[4].trim(),
      });
    }

    for (const [key, value] of Object.entries(parsed)) {
      if (key === 'version') continue;

      if (typeof value === 'object') {
        // Nested group (e.g. default_model)
        for (const [subKey, subVal] of Object.entries(value)) {
          const fullKey = `${key}.${subKey}`;
          const meta = fieldMeta.get(fullKey);
          fields.push({
            key: fullKey,
            label: subKey.charAt(0).toUpperCase() + subKey.slice(1),
            type: 'text',
            defaultValue: (subVal as string) || null,
            group: key,
            description: meta?.desc,
          });
        }
      } else {
        const meta = fieldMeta.get(key);
        const comment = (value as string);

        // Detect select fields from inline comments like "google|openai|dashscope"
        const optionsMatch = comment.match(/^(null|[a-zA-Z0-9_.-]+)$/);
        const typeComment = meta?.type ?? '';
        const optionsFromType = typeComment.match(/^string\\?\|null$/i)
          ? null
          : typeComment.match(/([a-zA-Z0-9_-]+(?:\|[a-zA-Z0-9_-]+)+)/)?.[1];

        if (optionsFromType) {
          const options = optionsFromType.split('|').filter(o => o !== 'null');
          fields.push({
            key,
            label: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            type: 'select',
            options,
            defaultValue: optionsMatch && comment !== 'null' ? comment : null,
            description: meta?.desc,
          });
        } else {
          fields.push({
            key,
            label: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            type: 'text',
            defaultValue: comment === 'null' ? null : comment,
            description: meta?.desc,
          });
        }
      }
    }

    return { version, fields };
  } catch {
    return null;
  }
}

// ── Route handlers ───────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { userId } = await verifyAuth(request);
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const slug = request.nextUrl.searchParams.get('slug');
  if (!slug) {
    return Response.json({ error: 'slug param required' }, { status: 400 });
  }

  const skillDir = findSkillDir(slug);

  // Try to find and parse the preferences schema (structured UI)
  const schemaPath = skillDir ? join(/*turbopackIgnore: true*/ skillDir, 'references', 'config', 'preferences-schema.md') : null;
  const schema = schemaPath && existsSync(schemaPath) ? parsePreferencesSchema(schemaPath) : null;

  // Read current EXTEND.md — check user override first, then skill default
  const userExtendPath = getExtendMdWritePath(slug);
  const skillExtendPath = skillDir ? join(/*turbopackIgnore: true*/ skillDir, 'EXTEND.md') : null;
  const extendPath = findExtendMd(slug, skillDir);

  const values: Record<string, string> = {};
  let rawExtend: string | null = null;
  const hasUserOverride = existsSync(userExtendPath);

  if (extendPath) {
    const content = readFileSync(extendPath, 'utf-8');
    rawExtend = content;

    // Parse YAML frontmatter values if schema exists
    if (schema) {
      const yaml = extractYamlFrontmatter(content);
      if (yaml) {
        const parsed = parseSimpleYaml(yaml);
        for (const [key, val] of Object.entries(parsed)) {
          if (key === 'version') continue;
          if (typeof val === 'object') {
            for (const [subKey, subVal] of Object.entries(val)) {
              const v = subVal as string;
              values[`${key}.${subKey}`] = v === 'null' || v === '' ? '' : v;
            }
          } else {
            const v = val as string;
            values[key] = v === 'null' || v === '' ? '' : v;
          }
        }
      }
    }
  }

  // Also provide the default (skill-bundled) EXTEND.md for "reset to default"
  let defaultExtend: string | null = null;
  if (skillExtendPath && existsSync(skillExtendPath)) {
    defaultExtend = readFileSync(skillExtendPath, 'utf-8');
  }

  // Check if the skill supports EXTEND.md (mentioned in SKILL.md) even if none exists yet
  let supportsExtend = schema !== null || rawExtend !== null || defaultExtend !== null;
  if (!supportsExtend && skillDir) {
    const skillMdPath = join(/*turbopackIgnore: true*/ skillDir, 'SKILL.md');
    if (existsSync(skillMdPath)) {
      const skillMd = readFileSync(skillMdPath, 'utf-8');
      supportsExtend = skillMd.includes('EXTEND.md');
    }
  }

  return Response.json({ schema, values, rawExtend, hasUserOverride, defaultExtend, supportsExtend });
}

export async function POST(request: NextRequest) {
  const { userId } = await verifyAuth(request);
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json() as {
    slug?: string;
    values?: Record<string, string | null>;
    rawExtend?: string;
    resetToDefault?: boolean;
  };
  if (!body.slug) {
    return Response.json({ error: 'slug required' }, { status: 400 });
  }

  const { slug } = body;
  const writePath = getExtendMdWritePath(slug);
  const dir = join(/*turbopackIgnore: true*/ writePath, '..');

  // Reset to default = delete user override
  if (body.resetToDefault) {
    if (existsSync(writePath)) {
      const { unlinkSync } = await import('fs');
      unlinkSync(writePath);
    }
    return Response.json({ ok: true });
  }

  // Raw EXTEND.md write (for skills without a schema, or manual edits)
  if (body.rawExtend !== undefined) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(writePath, body.rawExtend, 'utf-8');
    return Response.json({ ok: true });
  }

  // Structured values write (for skills with a schema)
  if (body.values) {
    const skillDir = findSkillDir(slug);
    if (!skillDir) {
      return Response.json({ error: 'Skill not found' }, { status: 404 });
    }
    const schemaPath = join(/*turbopackIgnore: true*/ skillDir, 'references', 'config', 'preferences-schema.md');
    const schema = existsSync(schemaPath) ? parsePreferencesSchema(schemaPath) : null;
    if (!schema) {
      return Response.json({ error: 'No schema found for this skill' }, { status: 404 });
    }
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const content = serializeExtendMd(body.values, schema);
    writeFileSync(writePath, content, 'utf-8');
    return Response.json({ ok: true });
  }

  return Response.json({ error: 'values or rawExtend required' }, { status: 400 });
}
