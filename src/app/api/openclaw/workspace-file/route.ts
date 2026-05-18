import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import { homedir } from 'os';
import { extname, resolve, normalize } from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_ROOT = resolve(homedir(), '.openclaw');

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
};

/** GET /api/openclaw/workspace-file?path=/Users/.../file.png
 *  Serves a file from the OpenClaw workspace (~/.openclaw/) for local preview.
 *  Only image and PDF files within the workspace root are allowed.
 */
export async function GET(request: NextRequest) {
  const filePath = request.nextUrl.searchParams.get('path');
  if (!filePath) {
    return NextResponse.json({ error: 'path query param is required' }, { status: 400 });
  }

  const resolved = normalize(resolve(filePath.replace(/^~/, homedir())));

  // Security: only allow files within ~/.openclaw/
  if (!resolved.startsWith(ALLOWED_ROOT)) {
    return NextResponse.json({ error: 'Access denied — file must be within ~/.openclaw/' }, { status: 403 });
  }

  const ext = extname(resolved).toLowerCase();
  const mime = MIME_TYPES[ext];
  if (!mime) {
    return NextResponse.json({ error: `File type ${ext} not allowed` }, { status: 400 });
  }

  try {
    const info = await stat(resolved);
    if (!info.isFile() || info.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'File not found or too large (max 20MB)' }, { status: 400 });
    }
    const buffer = await readFile(resolved);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': mime,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
