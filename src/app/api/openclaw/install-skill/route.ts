/**
 * Instant Skill Installation API
 *
 * Downloads skill files to the agent workspace immediately when the user
 * clicks "Add" — no waiting for a full sync.
 *
 * Supports:
 * - Community monorepo skills (full directory from openclaw/skills)
 * - Standalone GitHub repo skills (git clone)
 * - Catalog skills (SKILL.md only)
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { mkdir, writeFile, rm } from 'fs/promises';
import { existsSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

/** Clone a full GitHub repo into the skill directory */
async function cloneGitHubRepo(repoUrl: string, targetDir: string): Promise<boolean> {
  try {
    if (existsSync(targetDir)) {
      await rm(targetDir, { recursive: true, force: true });
    }
    execSync(`git clone --depth 1 ${repoUrl} ${targetDir}`, {
      timeout: 30_000,
      stdio: 'pipe',
    });
    const dotGit = join(targetDir, '.git');
    if (existsSync(dotGit)) {
      await rm(dotGit, { recursive: true, force: true });
    }
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[InstallSkill] git clone failed for ${repoUrl}: ${msg}`);
    if (existsSync(targetDir)) {
      try { await rm(targetDir, { recursive: true, force: true }); } catch { /* ignore */ }
    }
    return false;
  }
}

/** Download all files from a skill directory in the openclaw/skills monorepo */
async function downloadMonorepoSkillDirectory(skillMdUrl: string, targetDir: string): Promise<boolean> {
  const match = skillMdUrl.match(/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)\/SKILL\.md$/);
  if (!match) return false;

  const [, owner, repo, , skillPath] = match;
  const contentsUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${skillPath}`;

  async function downloadDir(apiUrl: string, localDir: string): Promise<void> {
    const res = await fetch(apiUrl, {
      headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'hivemind-os-skill-install' },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      console.warn(`[InstallSkill] GitHub Contents API returned ${res.status} for ${apiUrl}`);
      return;
    }

    const entries = await res.json() as Array<{ name: string; type: string; download_url: string | null; url: string }>;
    if (!Array.isArray(entries)) return;

    await mkdir(localDir, { recursive: true });

    for (const entry of entries) {
      if (entry.type === 'file' && entry.download_url) {
        const fileRes = await fetch(entry.download_url, { signal: AbortSignal.timeout(10_000) });
        if (fileRes.ok) {
          await writeFile(join(localDir, entry.name), await fileRes.text(), 'utf-8');
        }
      } else if (entry.type === 'dir') {
        await downloadDir(entry.url, join(localDir, entry.name));
      }
    }
  }

  try {
    if (existsSync(targetDir)) {
      await rm(targetDir, { recursive: true, force: true });
    }
    await mkdir(targetDir, { recursive: true });
    await downloadDir(contentsUrl, targetDir);
    const hasSkillMd = existsSync(join(targetDir, 'SKILL.md'));
    console.log(`[InstallSkill] Downloaded monorepo skill ${skillPath} (SKILL.md: ${hasSkillMd})`);
    return hasSkillMd;
  } catch (err) {
    console.error(`[InstallSkill] Monorepo download failed for ${skillPath}:`, err);
    return false;
  }
}

/** Download just SKILL.md from a direct URL */
async function downloadSkillMd(url: string, targetDir: string): Promise<boolean> {
  try {
    await mkdir(targetDir, { recursive: true });
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return false;
    await writeFile(join(targetDir, 'SKILL.md'), await res.text(), 'utf-8');
    return true;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { slug, workspacePath, skillMdUrl, githubRepoUrl, githubUrl, config: skillConfig } = body as {
      slug: string;
      workspacePath: string;
      skillMdUrl?: string;
      githubRepoUrl?: string;
      githubUrl?: string;
      config?: Record<string, string | number | boolean>;
    };

    if (!slug || !workspacePath) {
      return NextResponse.json({ error: 'Missing slug or workspacePath' }, { status: 400 });
    }

    const skillDir = join(workspacePath, 'skills', slug);
    let success = false;

    if (githubRepoUrl) {
      // Standalone GitHub repo — clone it
      success = await cloneGitHubRepo(githubRepoUrl, skillDir);
      if (!success) {
        // Fallback: try SKILL.md from main/master
        for (const branch of ['main', 'master']) {
          const match = githubRepoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
          if (match) {
            const rawUrl = `https://raw.githubusercontent.com/${match[1]}/${match[2]}/${branch}/SKILL.md`;
            success = await downloadSkillMd(rawUrl, skillDir);
            if (success) break;
          }
        }
      }
    } else if (skillMdUrl) {
      // Community monorepo skill — download full directory
      success = await downloadMonorepoSkillDirectory(skillMdUrl, skillDir);
      if (!success) {
        success = await downloadSkillMd(skillMdUrl, skillDir);
      }
    } else if (githubUrl) {
      // Catalog skill — SKILL.md only
      const rawUrl = githubUrl
        .replace('github.com', 'raw.githubusercontent.com')
        .replace('/tree/', '/');
      success = await downloadSkillMd(rawUrl, skillDir);
    }

    // Write config if present
    if (success && skillConfig && Object.keys(skillConfig).length > 0) {
      await writeFile(join(skillDir, 'config.json'), JSON.stringify(skillConfig, null, 2), 'utf-8');
    }

    return NextResponse.json({ success, skillDir });
  } catch (err) {
    console.error('[InstallSkill] Error:', err);
    return NextResponse.json({ error: 'Installation failed' }, { status: 500 });
  }
}
