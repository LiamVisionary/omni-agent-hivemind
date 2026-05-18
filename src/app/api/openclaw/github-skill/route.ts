import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/openclaw/github-skill
 *
 * Validates a GitHub repo URL for use as an OpenClaw skill.
 * Checks that the repo exists and contains a SKILL.md file.
 * Returns repo metadata (name, description, owner).
 */

interface GitHubRepoMeta {
  owner: string;
  repo: string;
  name: string;
  description: string | null;
  hasSkillMd: boolean;
  repoUrl: string;
}

/** Parse a GitHub URL into owner/repo */
function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const u = new URL(url.trim());
    if (u.hostname !== 'github.com') return null;
    const parts = u.pathname.replace(/^\//, '').replace(/\/$/, '').replace(/\.git$/, '').split('/');
    if (parts.length < 2 || !parts[0] || !parts[1]) return null;
    return { owner: parts[0], repo: parts[1] };
  } catch {
    return null;
  }
}

/** Convert kebab-case repo name to Title Case display name */
function repoToDisplayName(repo: string): string {
  return repo
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    const parsed = parseGitHubUrl(url);
    if (!parsed) {
      return NextResponse.json({ error: 'Invalid GitHub URL. Expected format: https://github.com/owner/repo' }, { status: 400 });
    }

    const { owner, repo } = parsed;
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'withami-skill-browser',
    };

    // Fetch repo metadata + check SKILL.md existence in parallel
    const [repoRes, skillMdRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers,
        signal: AbortSignal.timeout(10_000),
      }),
      fetch(`https://raw.githubusercontent.com/${owner}/${repo}/main/SKILL.md`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(10_000),
      }).catch(() => null),
    ]);

    if (!repoRes.ok) {
      if (repoRes.status === 404) {
        return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
      }
      return NextResponse.json({ error: `GitHub API error: ${repoRes.status}` }, { status: 502 });
    }

    const repoData = await repoRes.json();
    const hasSkillMd = skillMdRes?.ok ?? false;

    // Also check master branch if main didn't have SKILL.md
    let actualHasSkillMd = hasSkillMd;
    if (!hasSkillMd) {
      try {
        const masterRes = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/master/SKILL.md`, {
          method: 'HEAD',
          signal: AbortSignal.timeout(5_000),
        });
        actualHasSkillMd = masterRes.ok;
      } catch {
        // Ignore
      }
    }

    const meta: GitHubRepoMeta = {
      owner,
      repo,
      name: repoData.name ? repoToDisplayName(repoData.name) : repoToDisplayName(repo),
      description: repoData.description || null,
      hasSkillMd: actualHasSkillMd,
      repoUrl: `https://github.com/${owner}/${repo}`,
    };

    return NextResponse.json(meta);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
