import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/openclaw/amiclaw-skills
 *
 * Returns the list of AmiClaw-exclusive skills from the amiclaw-skills GitHub repo.
 * Each skill is a subdirectory under /skills/ that contains a SKILL.md.
 *
 * The repo structure mirrors the openclaw/skills monorepo:
 *   skills/{slug}/SKILL.md
 *   skills/{slug}/scripts/...
 */

const AMICLAW_REPO_OWNER = process.env.AMICLAW_REPO_OWNER ?? 'openclaw';
const AMICLAW_REPO_NAME = 'amiclaw-skills';
const AMICLAW_REPO_BRANCH = 'main';
const AMICLAW_SKILLS_PATH = 'skills';

const GITHUB_CONTENTS_URL = `https://api.github.com/repos/${AMICLAW_REPO_OWNER}/${AMICLAW_REPO_NAME}/contents/${AMICLAW_SKILLS_PATH}?ref=${AMICLAW_REPO_BRANCH}`;
const RAW_BASE = `https://raw.githubusercontent.com/${AMICLAW_REPO_OWNER}/${AMICLAW_REPO_NAME}/${AMICLAW_REPO_BRANCH}`;

/** Built-in skills that are auto-installed by the sync route (not from a repo) */
const BUILTIN_AMICLAW_SKILLS: AmiClawSkillMeta[] = [
  {
    slug: 'apple-notes',
    name: 'Apple Notes',
    description: 'Create and save notes to Apple Notes via osascript. Auto-installed on macOS.',
    icon: '📝',
    skillMdUrl: '',
    githubUrl: '',
  },
];

export interface AmiClawSkillMeta {
  slug: string;
  name: string;
  description: string;
  icon: string;
  skillMdUrl: string;
  githubUrl: string;
}

/** Convert kebab-case slug to Title Case */
function slugToName(slug: string): string {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/** Parse description and icon from SKILL.md content (first few lines) */
function parseSkillMd(content: string): { description: string; icon: string } {
  const lines = content.split('\n').slice(0, 20);
  let description = '';
  let icon = '🔧';

  for (const line of lines) {
    const descMatch = line.match(/^>\s*(.+)/) || line.match(/^description:\s*(.+)/i);
    if (descMatch && !description) {
      description = descMatch[1].trim();
    }
    const iconMatch = line.match(/^icon:\s*(.+)/i) || line.match(/^emoji:\s*(.+)/i);
    if (iconMatch) {
      icon = iconMatch[1].trim();
    }
  }

  if (!description) {
    const h2 = lines.find(l => l.startsWith('## '));
    if (h2) description = h2.replace(/^##\s*/, '').trim();
  }

  return { description: description || 'AmiClaw exclusive skill', icon };
}

export async function GET(_req: NextRequest) {
  try {
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'amiclaw-skill-browser',
    };
    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    // List top-level skill directories
    const res = await fetch(GITHUB_CONTENTS_URL, {
      headers,
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      if (res.status === 404) {
        return NextResponse.json({ skills: BUILTIN_AMICLAW_SKILLS });
      }
      return NextResponse.json({ skills: BUILTIN_AMICLAW_SKILLS, error: `GitHub API error: ${res.status}` });
    }

    const entries = await res.json() as Array<{ name: string; type: string; url: string }>;
    const skillDirs = entries.filter(e => e.type === 'dir');

    // For each skill dir, fetch SKILL.md to get description/icon
    const skills = await Promise.all(
      skillDirs.map(async (dir): Promise<AmiClawSkillMeta> => {
        const slug = dir.name;
        const skillMdUrl = `${RAW_BASE}/${AMICLAW_SKILLS_PATH}/${slug}/SKILL.md`;
        const githubUrl = `https://github.com/${AMICLAW_REPO_OWNER}/${AMICLAW_REPO_NAME}/tree/${AMICLAW_REPO_BRANCH}/${AMICLAW_SKILLS_PATH}/${slug}`;

        let description = 'AmiClaw exclusive skill';
        let icon = '🔧';

        try {
          const mdRes = await fetch(skillMdUrl, {
            headers: { 'User-Agent': 'amiclaw-skill-browser' },
            signal: AbortSignal.timeout(5_000),
          });
          if (mdRes.ok) {
            const text = await mdRes.text();
            const parsed = parseSkillMd(text);
            description = parsed.description;
            icon = parsed.icon;
          }
        } catch {
          // Use defaults if SKILL.md fetch fails
        }

        return {
          slug,
          name: slugToName(slug),
          description,
          icon,
          skillMdUrl,
          githubUrl,
        };
      })
    );

    return NextResponse.json({ skills: [...BUILTIN_AMICLAW_SKILLS, ...skills] });
  } catch (err) {
    console.error('[AmiClawSkills] Error:', err);
    // Still return built-ins even if remote fetch fails
    return NextResponse.json({ skills: BUILTIN_AMICLAW_SKILLS, error: 'Failed to fetch remote AmiClaw skills' });
  }
}
