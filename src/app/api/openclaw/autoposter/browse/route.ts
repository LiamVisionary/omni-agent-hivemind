import { homedir } from 'os';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/openclaw/autoposter/browse
 * Opens a native macOS folder picker via AppleScript.
 * Returns { path: string } or { cancelled: true }.
 */
export async function POST() {
  const defaultDir = `${homedir()}/social-media-content`;

  const script = `
    set defaultPath to POSIX file "${defaultDir}"
    try
      set chosen to choose folder with prompt "Select your content folder:" default location defaultPath
      POSIX path of chosen
    on error
      ""
    end try
  `;

  const { exec } = await import('child_process');
  return new Promise<Response>((resolve) => {
    exec(`osascript -e '${script.replace(/'/g, "'\\''")}'`, (err, stdout) => {
      const chosen = stdout.trim();
      if (err || !chosen) {
        resolve(new Response(JSON.stringify({ cancelled: true }), {
          headers: { 'Content-Type': 'application/json' },
        }));
      } else {
        // Strip trailing slash AppleScript sometimes adds
        resolve(new Response(JSON.stringify({ path: chosen.replace(/\/$/, '') }), {
          headers: { 'Content-Type': 'application/json' },
        }));
      }
    });
  });
}
