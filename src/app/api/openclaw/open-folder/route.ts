import { NextRequest } from 'next/server';
import { existsSync } from 'fs';
import { homedir } from 'os';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/openclaw/open-folder
 * Opens the agent workspace folder in Finder (macOS).
 * Body: { path: string }
 */
export async function POST(request: NextRequest) {
  const { path } = await request.json();

  if (!path?.trim()) {
    return new Response(JSON.stringify({ error: 'path is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const resolved = path.trim().replace(/^~/, homedir());

  if (!existsSync(resolved)) {
    return new Response(JSON.stringify({ error: 'Folder does not exist', path: resolved }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
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
