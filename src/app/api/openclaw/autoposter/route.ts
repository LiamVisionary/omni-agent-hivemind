import { NextRequest } from 'next/server';
import { join } from 'path';
import { existsSync } from 'fs';
import { homedir } from 'os';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/openclaw/autoposter
 * Runs x-autoposter.mjs and streams its output line-by-line as SSE.
 * Body: { contentDir?: string; dryRun?: boolean; limit?: number }
 */
export async function POST(request: NextRequest) {
  const { contentDir, dryRun = false, limit, noCaption = false, aiRewrite = false } = await request.json();

  const resolvedContentDir = contentDir?.trim()
    ? contentDir.trim().replace(/^~/, homedir())
    : join(homedir(), 'social-media-content');

  const scriptPath = join(process.cwd(), 'scripts', 'x-autoposter.mjs');
  if (!existsSync(scriptPath)) {
    return new Response(
      JSON.stringify({ error: 'x-autoposter.mjs not found in scripts/' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const args = [scriptPath, resolvedContentDir];
  if (dryRun) args.push('--dry-run');
  if (noCaption) args.push('--no-caption');
  if (aiRewrite) args.push('--ai-rewrite');
  if (limit && limit > 0) args.push('--limit', String(limit));

  const encoder = new TextEncoder();
  // Dynamic import prevents Turbopack from statically resolving spawn args as module paths
  const { spawn } = await import('child_process');

  // Spread into a new array to prevent Turbopack from tracing args as module paths
  const spawnArgs = [...args];
  const stream = new ReadableStream({
    start(controller) {
      const child = spawn('node', spawnArgs, {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env },
      });

      const emit = (line: string) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ line })}\n\n`));
      };

      let stdoutBuf = '';
      child.stdout.on('data', (chunk: Buffer) => {
        stdoutBuf += chunk.toString();
        const lines = stdoutBuf.split('\n');
        stdoutBuf = lines.pop() ?? '';
        for (const line of lines) emit(line);
      });

      let stderrBuf = '';
      child.stderr.on('data', (chunk: Buffer) => {
        stderrBuf += chunk.toString();
        const lines = stderrBuf.split('\n');
        stderrBuf = lines.pop() ?? '';
        for (const line of lines) emit(line);
      });

      child.on('close', (code) => {
        if (stdoutBuf) emit(stdoutBuf);
        if (stderrBuf) emit(stderrBuf);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, exitCode: code })}\n\n`));
        controller.close();
      });

      child.on('error', (err) => {
        emit(`[autoposter] Error: ${err.message}`);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, exitCode: 1 })}\n\n`));
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

/** GET /api/openclaw/autoposter?contentDir=...
 * Returns the resolved content dir path and whether it exists.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const contentDir = searchParams.get('contentDir');

  const resolved = contentDir?.trim()
    ? contentDir.trim().replace(/^~/, homedir())
    : join(homedir(), 'social-media-content');

  const unpostedDir = join(resolved, 'unposted');
  const postedDir = join(resolved, 'posted');

  // Count pending folders
  let pendingCount = 0;
  let postedCount = 0;
  if (existsSync(unpostedDir)) {
    const { readdirSync, statSync } = await import('fs');
    pendingCount = readdirSync(unpostedDir).filter(f => {
      try { return statSync(join(unpostedDir, f)).isDirectory(); } catch { return false; }
    }).length;
  }
  if (existsSync(postedDir)) {
    const { readdirSync, statSync } = await import('fs');
    postedCount = readdirSync(postedDir).filter(f => {
      try { return statSync(join(postedDir, f)).isDirectory(); } catch { return false; }
    }).length;
  }

  return new Response(JSON.stringify({
    resolvedPath: resolved,
    exists: existsSync(resolved),
    pendingCount,
    postedCount,
  }), { headers: { 'Content-Type': 'application/json' } });
}
