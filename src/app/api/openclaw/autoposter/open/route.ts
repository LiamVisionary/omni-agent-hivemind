import { NextRequest } from 'next/server';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/openclaw/autoposter/open
 * Opens the content folder in Finder (macOS). Creates it first if needed.
 * Body: { contentDir?: string }
 */
export async function POST(request: NextRequest) {
  const { contentDir } = await request.json();

  const resolved = contentDir?.trim()
    ? contentDir.trim().replace(/^~/, homedir())
    : join(homedir(), 'social-media-content');

  const unpostedDir = join(resolved, 'unposted');
  const postedDir = join(resolved, 'posted');

  if (!existsSync(unpostedDir)) {
    mkdirSync(unpostedDir, { recursive: true });
    mkdirSync(postedDir, { recursive: true });
  }

  const { exec } = await import('child_process');
  return new Promise<Response>((resolve) => {
    exec(`open "${resolved}"`, (err) => {
      if (err) {
        resolve(new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }));
      } else {
        resolve(new Response(JSON.stringify({ ok: true, path: resolved }), {
          headers: { 'Content-Type': 'application/json' },
        }));
      }
    });
  });
}
