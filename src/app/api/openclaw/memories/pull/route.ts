/**
 * OpenClaw Memory Pull API Route
 *
 * Reads the agent's workspace files (MEMORY.md, USER.md, memory/*.md)
 * and parses them into CompanionMemory format for merging into the app's IndexedDB.
 */

import { NextRequest } from 'next/server';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { combineWorkspaceMemories } from '@/lib/services/openclaw/workspace-memory-parser';

export async function POST(request: NextRequest) {
  try {
    const { workspacePath } = await request.json();

    if (!workspacePath || typeof workspacePath !== 'string') {
      return Response.json(
        { error: 'Missing workspacePath' },
        { status: 400 }
      );
    }

    // Read MEMORY.md
    let memoryMd: string | null = null;
    try {
      memoryMd = await readFile(join(workspacePath, 'MEMORY.md'), 'utf-8');
    } catch {
      // File may not exist yet
    }

    // Read USER.md
    let userMd: string | null = null;
    try {
      userMd = await readFile(join(workspacePath, 'USER.md'), 'utf-8');
    } catch {
      // File may not exist yet
    }

    // Read daily notes from memory/ directory
    const dailyNotes: string[] = [];
    try {
      const memoryDir = join(workspacePath, 'memory');
      const files = await readdir(memoryDir);
      const mdFiles = files
        .filter(f => f.endsWith('.md'))
        .sort()
        .slice(-7); // Last 7 days only

      for (const file of mdFiles) {
        try {
          const content = await readFile(join(memoryDir, file), 'utf-8');
          dailyNotes.push(content);
        } catch {
          // Skip unreadable files
        }
      }
    } catch {
      // memory/ directory may not exist yet
    }

    const memories = combineWorkspaceMemories(memoryMd, userMd, dailyNotes);

    return Response.json({
      success: true,
      memories,
      sources: {
        memoryMd: !!memoryMd,
        userMd: !!userMd,
        dailyNotes: dailyNotes.length,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[OpenClaw Pull] Error:', msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
