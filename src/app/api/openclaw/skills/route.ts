import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const GITHUB_TREE_URL = 'https://api.github.com/repos/openclaw/skills/git/trees/main?recursive=1';
const SKILLS_BASE_URL = 'https://github.com/openclaw/skills/tree/main';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.PRIVATE_SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key);
}

/** Convert kebab-case slug to Title Case display name */
function slugToName(slug: string): string {
  return slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Parse a SKILL.md tree path into skill metadata */
function parseSkillPath(path: string): { author: string; slug: string; name: string } | null {
  // Pattern: skills/{author}/{skill-name}/SKILL.md
  const match = path.match(/^skills\/([^/]+)\/([^/]+)\/SKILL\.md$/);
  if (!match) return null;
  return {
    author: match[1],
    slug: match[2],
    name: slugToName(match[2]),
  };
}

/** Refresh the skill cache from GitHub */
async function refreshSkillCache(supabase: ReturnType<typeof getSupabase>): Promise<number> {
  const res = await fetch(GITHUB_TREE_URL, {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'withami-skill-browser',
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw new Error(`GitHub API returned ${res.status}`);
  }

  const data = await res.json();
  const tree = data.tree as Array<{ path: string; type: string }>;
  if (!Array.isArray(tree)) throw new Error('Invalid GitHub tree response');

  const skills = tree
    .filter(t => t.path.endsWith('/SKILL.md') && t.path.startsWith('skills/'))
    .map(t => parseSkillPath(t.path))
    .filter(Boolean) as Array<{ author: string; slug: string; name: string }>;

  // Batch upsert in chunks of 500
  const CHUNK_SIZE = 500;
  for (let i = 0; i < skills.length; i += CHUNK_SIZE) {
    const chunk = skills.slice(i, i + CHUNK_SIZE);
    const rows = chunk.map(s => ({
      skill_path: `skills/${s.author}/${s.slug}/SKILL.md`,
      author: s.author,
      skill_slug: s.slug,
      skill_name: s.name,
      updated_at: new Date().toISOString(),
    }));

    await supabase
      .from('openclaw_skill_cache')
      .upsert(rows, { onConflict: 'skill_path' });
  }

  // Update cache timestamp
  await supabase
    .from('openclaw_skill_cache_meta')
    .upsert({
      key: 'last_sync',
      value: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'key' });

  return skills.length;
}

/** Check if cache needs refresh */
async function isCacheStale(supabase: ReturnType<typeof getSupabase>): Promise<boolean> {
  const { data } = await supabase
    .from('openclaw_skill_cache_meta')
    .select('value')
    .eq('key', 'last_sync')
    .maybeSingle();

  if (!data?.value) return true;
  const lastSync = new Date(data.value).getTime();
  return Date.now() - lastSync > CACHE_TTL_MS;
}

/**
 * GET /api/openclaw/skills?q=search&offset=0&limit=50
 * Returns paginated, searchable skill list from cached GitHub index.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const q = req.nextUrl.searchParams.get('q')?.trim() || '';
    const offset = Math.max(0, parseInt(req.nextUrl.searchParams.get('offset') || '0', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') || '50', 10)));

    // Check if cache needs refresh (fire-and-forget if stale)
    const stale = await isCacheStale(supabase);
    if (stale) {
      // Attempt refresh inline for first call, background for subsequent
      try {
        await refreshSkillCache(supabase);
      } catch (err) {
        console.error('Skill cache refresh failed:', err);
        // Continue with stale/empty cache
      }
    }

    // Query with optional search
    let query = supabase
      .from('openclaw_skill_cache')
      .select('skill_slug, skill_name, author, skill_path', { count: 'exact' });

    if (q) {
      // Use trigram similarity search on name and slug
      query = query.or(`skill_name.ilike.%${q}%,skill_slug.ilike.%${q}%,author.ilike.%${q}%`);
    }

    query = query
      .order('skill_name', { ascending: true })
      .range(offset, offset + limit - 1);

    const { data: skills, count, error } = await query;

    if (error) {
      console.error('Skill cache query error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const results = (skills || []).map(s => ({
      slug: s.skill_slug,
      name: s.skill_name,
      author: s.author,
      githubUrl: `${SKILLS_BASE_URL}/${s.skill_path.replace('/SKILL.md', '')}`,
      skillMdUrl: `https://raw.githubusercontent.com/openclaw/skills/main/${s.skill_path}`,
    }));

    return NextResponse.json({
      skills: results,
      total: count ?? 0,
      offset,
      limit,
      hasMore: (count ?? 0) > offset + limit,
    });
  } catch (err) {
    console.error('Skills API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
