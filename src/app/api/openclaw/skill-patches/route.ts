/**
 * /api/openclaw/skill-patches
 *
 * POST — Apply known patches to installed skills.
 * Called once on app startup when workspace skills are discovered.
 * Each patch is idempotent (safe to run multiple times).
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { verifyAuth } from '@/lib/utils/server-auth';

// ── Types ────────────────────────────────────────────────────────────────────

interface PatchResult {
  skill: string;
  file: string;
  applied: boolean;
  reason: string;
}

interface SkillPatch {
  skill: string;
  file: string;
  /** String that must exist in the file for the patch to apply */
  detect: string;
  /** String that, if present, means the patch was already applied */
  alreadyApplied: string;
  /** Old string to replace */
  oldString: string;
  /** New string to insert */
  newString: string;
}

// ── Patch Registry ───────────────────────────────────────────────────────────
// Add new patches here. Each patch targets a specific file in a specific skill.

const PATCHES: SkillPatch[] = [
  {
    skill: 'baoyu-post-to-x',
    file: 'scripts/x-browser.ts',
    detect: 'copyImageToClipboard(imagePath)',
    alreadyApplied: 'DOM.setFileInputFiles',
    oldString: `    for (const imagePath of images) {
      if (!fs.existsSync(imagePath)) {
        console.warn(\`[x-browser] Image not found: \${imagePath}\`);
        continue;
      }

      console.log(\`[x-browser] Pasting image: \${imagePath}\`);

      if (!copyImageToClipboard(imagePath)) {
        console.warn(\`[x-browser] Failed to copy image to clipboard: \${imagePath}\`);
        continue;
      }

      // Wait for clipboard to be ready
      await sleep(500);

      // Focus the editor
      await cdp.send('Runtime.evaluate', {
        expression: \`document.querySelector('[data-testid="tweetTextarea_0"]')?.focus()\`,
      }, { sessionId });
      await sleep(200);

      // Use paste script (handles platform differences, activates Chrome)
      console.log('[x-browser] Pasting from clipboard...');
      const pasteSuccess = pasteFromClipboard('Google Chrome', 5, 500);

      if (!pasteSuccess) {
        // Fallback to CDP (may not work for images on X)
        console.log('[x-browser] Paste script failed, trying CDP fallback...');
        const modifiers = process.platform === 'darwin' ? 4 : 2;
        await cdp.send('Input.dispatchKeyEvent', {
          type: 'keyDown',
          key: 'v',
          code: 'KeyV',
          modifiers,
          windowsVirtualKeyCode: 86,
        }, { sessionId });
        await cdp.send('Input.dispatchKeyEvent', {
          type: 'keyUp',
          key: 'v',
          code: 'KeyV',
          modifiers,
          windowsVirtualKeyCode: 86,
        }, { sessionId });
      }

      console.log('[x-browser] Waiting for image upload...');
      await sleep(4000);
    }`,
    newString: `    for (const imagePath of images) {
      const absImagePath = path.isAbsolute(imagePath) ? imagePath : path.resolve(process.cwd(), imagePath);
      if (!fs.existsSync(absImagePath)) {
        console.warn(\`[x-browser] Image not found: \${absImagePath}\`);
        continue;
      }

      console.log(\`[x-browser] Uploading image: \${absImagePath}\`);

      // Count uploaded images before upload
      const imgCountBefore = await cdp.send<{ result: { value: number } }>('Runtime.evaluate', {
        expression: \`document.querySelectorAll('img[src^="blob:"]').length\`,
        returnByValue: true,
      }, { sessionId });

      // Primary method: Use DOM.setFileInputFiles on X's hidden file input (most reliable)
      let fileInputUsed = false;
      try {
        await cdp.send('DOM.enable', {}, { sessionId });
        const { root } = await cdp.send<{ root: { nodeId: number } }>('DOM.getDocument', {}, { sessionId });
        const { nodeId } = await cdp.send<{ nodeId: number }>('DOM.querySelector', {
          nodeId: root.nodeId,
          selector: 'input[data-testid="fileInput"], input[type="file"][accept*="image"], input[type="file"]',
        }, { sessionId });

        if (nodeId && nodeId !== 0) {
          await cdp.send('DOM.setFileInputFiles', {
            nodeId,
            files: [absImagePath],
          }, { sessionId });
          fileInputUsed = true;
          console.log('[x-browser] Image set via file input');
        } else {
          console.log('[x-browser] No file input found, falling back to clipboard paste');
        }
      } catch (err) {
        console.log(\`[x-browser] File input method failed: \${err instanceof Error ? err.message : String(err)}, falling back to clipboard paste\`);
      }

      // Fallback: clipboard paste (requires Accessibility permissions on macOS)
      if (!fileInputUsed) {
        if (!copyImageToClipboard(absImagePath)) {
          console.warn(\`[x-browser] Failed to copy image to clipboard: \${absImagePath}\`);
          continue;
        }

        await sleep(500);

        await cdp.send('Runtime.evaluate', {
          expression: \`document.querySelector('[data-testid="tweetTextarea_0"]')?.focus()\`,
        }, { sessionId });
        await sleep(200);

        console.log('[x-browser] Pasting from clipboard...');
        const pasteSuccess = pasteFromClipboard('Google Chrome', 5, 500);

        if (!pasteSuccess) {
          console.log('[x-browser] Paste script failed, trying CDP fallback...');
          const modifiers = process.platform === 'darwin' ? 4 : 2;
          await cdp.send('Input.dispatchKeyEvent', {
            type: 'keyDown',
            key: 'v',
            code: 'KeyV',
            modifiers,
            windowsVirtualKeyCode: 86,
          }, { sessionId });
          await cdp.send('Input.dispatchKeyEvent', {
            type: 'keyUp',
            key: 'v',
            code: 'KeyV',
            modifiers,
            windowsVirtualKeyCode: 86,
          }, { sessionId });
        }
      }

      // Verify image upload (works for both methods)
      console.log('[x-browser] Verifying image upload...');
      const expectedImgCount = imgCountBefore.result.value + 1;
      let imgUploadOk = false;
      const imgWaitStart = Date.now();
      while (Date.now() - imgWaitStart < 15_000) {
        const r = await cdp!.send<{ result: { value: number } }>('Runtime.evaluate', {
          expression: \`document.querySelectorAll('img[src^="blob:"]').length\`,
          returnByValue: true,
        }, { sessionId });
        if (r.result.value >= expectedImgCount) {
          imgUploadOk = true;
          break;
        }
        await sleep(1000);
      }

      if (imgUploadOk) {
        console.log('[x-browser] Image upload verified');
      } else {
        console.warn('[x-browser] Image upload not detected after 15s');
      }
    }`,
  },
  {
    skill: 'baoyu-post-to-x',
    file: 'scripts/x-browser.ts',
    detect: `document.querySelector('[data-testid="tweetButton"]')?.click()`,
    alreadyApplied: 'dispatchMouseEvent',
    oldString: `    if (submit) {
      console.log('[x-browser] Submitting post...');
      await cdp.send('Runtime.evaluate', {
        expression: \`document.querySelector('[data-testid="tweetButton"]')?.click()\`,
      }, { sessionId });
      await sleep(2000);
      console.log('[x-browser] Post submitted!');
    } else {`,
    newString: `    if (submit) {
      console.log('[x-browser] Submitting post...');

      // Wait for post button to be enabled (image may still be processing)
      const btnCheck = await cdp.send<{ result: { value: string } }>('Runtime.evaluate', {
        expression: \`(() => {
          const btn = document.querySelector('[data-testid="tweetButton"]');
          if (!btn) return 'not_found';
          if (btn.getAttribute('aria-disabled') === 'true' || btn.disabled) return 'disabled';
          return 'ready';
        })()\`,
        returnByValue: true,
      }, { sessionId });

      if (btnCheck.result.value === 'disabled') {
        console.log('[x-browser] Post button disabled (image still uploading), waiting...');
        const btnWaitStart = Date.now();
        while (Date.now() - btnWaitStart < 30_000) {
          await sleep(1000);
          const r = await cdp!.send<{ result: { value: boolean } }>('Runtime.evaluate', {
            expression: \`(() => {
              const btn = document.querySelector('[data-testid="tweetButton"]');
              return btn && btn.getAttribute('aria-disabled') !== 'true' && !btn.disabled;
            })()\`,
            returnByValue: true,
          }, { sessionId });
          if (r.result.value) break;
        }
      }

      // Use real CDP mouse click (X may block synthetic JS .click())
      const btnPos = await cdp.send<{ result: { value: { x: number; y: number } | null } }>('Runtime.evaluate', {
        expression: \`(() => {
          const btn = document.querySelector('[data-testid="tweetButton"]');
          if (!btn) return null;
          const r = btn.getBoundingClientRect();
          return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
        })()\`,
        returnByValue: true,
      }, { sessionId });

      if (btnPos.result.value) {
        const { x, y } = btnPos.result.value;
        await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 }, { sessionId });
        await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 }, { sessionId });
      } else {
        console.warn('[x-browser] Post button not found, trying JS click fallback');
        await cdp.send('Runtime.evaluate', {
          expression: \`document.querySelector('[data-testid="tweetButton"]')?.click()\`,
        }, { sessionId });
      }

      // Wait for the compose dialog to close (confirms post was sent)
      console.log('[x-browser] Waiting for post confirmation...');
      let postConfirmed = false;
      const confirmStart = Date.now();
      while (Date.now() - confirmStart < 15_000) {
        await sleep(1000);
        const r = await cdp!.send<{ result: { value: boolean } }>('Runtime.evaluate', {
          expression: \`!document.querySelector('[data-testid="tweetTextarea_0"]')\`,
          returnByValue: true,
        }, { sessionId });
        if (r.result.value) {
          postConfirmed = true;
          break;
        }
      }

      if (postConfirmed) {
        console.log('[x-browser] Post submitted and confirmed!');
      } else {
        console.log('[x-browser] Post button clicked. Waiting for X to process...');
        await sleep(5000);
      }
    } else {`,
  },
  {
    skill: 'baoyu-post-to-x',
    file: 'scripts/x-browser.ts',
    detect: `import process from 'node:process';`,
    alreadyApplied: `import path from 'node:path';`,
    oldString: `import process from 'node:process';`,
    newString: `import path from 'node:path';\nimport process from 'node:process';`,
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function findSkillDirs(slug: string): string[] {
  const dirs: string[] = [];
  try {
    const configPath = join(homedir(), '.openclaw', 'openclaw.json');
    if (!existsSync(configPath)) return dirs;
    const raw = readFileSync(configPath, 'utf-8').replace(/\/\/[^\n]*/g, '');
    const config = JSON.parse(raw);

    const agentList = (config.agents?.list ?? []) as Record<string, unknown>[];
    for (const agent of agentList) {
      const workspace = (agent.workspace as string) ?? join(homedir(), '.openclaw', `workspace-${agent.id}`);
      const skillDir = join(workspace, 'skills', slug);
      if (existsSync(skillDir)) dirs.push(skillDir);
    }
  } catch { /* ignore */ }
  return dirs;
}

function applyPatch(skillDir: string, patch: SkillPatch): PatchResult {
  const filePath = join(skillDir, patch.file);
  const result: PatchResult = { skill: patch.skill, file: patch.file, applied: false, reason: '' };

  if (!existsSync(filePath)) {
    result.reason = 'file not found';
    return result;
  }

  const content = readFileSync(filePath, 'utf-8');

  if (content.includes(patch.alreadyApplied)) {
    result.reason = 'already patched';
    return result;
  }

  if (!content.includes(patch.detect)) {
    result.reason = 'detection string not found (skill version may differ)';
    return result;
  }

  if (!content.includes(patch.oldString)) {
    result.reason = 'exact match not found (skill version may differ)';
    return result;
  }

  const patched = content.replace(patch.oldString, patch.newString);
  writeFileSync(filePath, patched, 'utf-8');
  result.applied = true;
  result.reason = 'patch applied';
  return result;
}

// ── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { userId } = await verifyAuth(req);
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: PatchResult[] = [];
  const skillSlugs = [...new Set(PATCHES.map((p) => p.skill))];

  for (const slug of skillSlugs) {
    const dirs = findSkillDirs(slug);
    if (dirs.length === 0) continue;

    const patches = PATCHES.filter((p) => p.skill === slug);
    for (const dir of dirs) {
      // Apply patches in order (e.g. import patch before code patches)
      const ordered = [...patches].sort((a, b) => {
        if (a.file !== b.file) return a.file.localeCompare(b.file);
        // Import patches first
        if (a.oldString.startsWith('import') && !b.oldString.startsWith('import')) return -1;
        if (!a.oldString.startsWith('import') && b.oldString.startsWith('import')) return 1;
        return 0;
      });
      for (const patch of ordered) {
        results.push(applyPatch(dir, patch));
      }
    }
  }

  return NextResponse.json({
    success: true,
    results,
    appliedCount: results.filter((r) => r.applied).length,
    totalPatches: results.length,
  });
}
