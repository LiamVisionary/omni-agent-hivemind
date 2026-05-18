/**
 * OpenClaw Memory Push API Route
 *
 * Writes MEMORY.md and USER.md to the agent's workspace from app memories.
 * Used by the 10-minute auto-sync interval.
 */

import { NextRequest } from 'next/server';
import { mkdir, writeFile, readFile } from 'fs/promises';
import { join } from 'path';

/** A memory array item can be a plain string or a TimestampedMemory object. */
type MemoryItem = string | { content: string; createdAt?: number };

/** Extract the display string from a memory item (handles both formats). */
function itemStr(item: MemoryItem): string {
  return typeof item === 'string' ? item : item?.content ?? '';
}

interface PushMemory {
  userName?: string;
  userNicknames?: MemoryItem[];
  userPreferences?: MemoryItem[];
  userDislikes?: MemoryItem[];
  sharedMemories?: MemoryItem[];
  insideJokes?: MemoryItem[];
  relationshipMilestones?: MemoryItem[];
  characterSharedStories?: MemoryItem[];
  characterPreferences?: MemoryItem[];
  characterDislikes?: MemoryItem[];
  characterPromises?: MemoryItem[];
  characterOpinions?: MemoryItem[];
  importantDates?: Array<{ type: string; date: string; label: string; year?: number }>;
  totalConversations?: number;
  openclawTasks?: MemoryItem[];
}

function generateMemoryFile(characterName: string, memory: PushMemory): string {
  const sections: string[] = [`# ${characterName}'s Memories`, ''];

  const addList = (title: string, items: MemoryItem[] | undefined) => {
    if (!items?.length) return;
    sections.push(`## ${title}`, '');
    items.forEach(item => sections.push(`- ${itemStr(item)}`));
    sections.push('');
  };

  if (memory.userName && memory.userName !== 'Unknown') {
    sections.push('## About My Human', '');
    sections.push(`- **Name:** ${memory.userName}`);
    if (memory.userNicknames?.length) {
      sections.push(`- **Nicknames:** ${memory.userNicknames.map(itemStr).join(', ')}`);
    }
    sections.push('');
  }

  addList('Things They Like', memory.userPreferences);
  addList('Things They Dislike', memory.userDislikes);
  addList('Shared Memories', memory.sharedMemories);
  addList('Inside Jokes', memory.insideJokes);
  addList('Relationship Milestones', memory.relationshipMilestones);
  addList('Stories I\'ve Shared', memory.characterSharedStories);
  addList('Things I Like', memory.characterPreferences);
  addList('Things I Dislike', memory.characterDislikes);
  addList('Promises I\'ve Made', memory.characterPromises);
  addList('My Opinions', memory.characterOpinions);
  addList('Recent Tasks', memory.openclawTasks);

  if (memory.importantDates?.length) {
    sections.push('## Important Dates', '');
    memory.importantDates.forEach(d => {
      const yearStr = d.year ? ` (${d.year})` : '';
      sections.push(`- **${d.label}:** ${d.date}${yearStr} [${d.type}]`);
    });
    sections.push('');
  }

  if (memory.totalConversations && memory.totalConversations > 0) {
    sections.push(`---`, '', `_Total conversations: ${memory.totalConversations}_`);
  }

  return sections.join('\n');
}

function generateUserFile(memory: PushMemory): string {
  const name = memory.userName && memory.userName !== 'Unknown' ? memory.userName : '(will learn through conversation)';
  const nicknames = memory.userNicknames?.length ? memory.userNicknames.map(itemStr).join(', ') : null;

  const lines = [
    '# USER.md - About Your Human',
    '',
    `- **Name:** ${name}`,
  ];
  if (nicknames) lines.push(`- **Nicknames:** ${nicknames}`);
  lines.push(
    '- **Notes:** Chats with you through Ami: AI Companion and messaging channels.',
    '',
    '## Context',
  );

  if (memory.userPreferences?.length) {
    lines.push('', '**Likes:** ' + memory.userPreferences.map(itemStr).join(', '));
  }
  if (memory.userDislikes?.length) {
    lines.push('', '**Dislikes:** ' + memory.userDislikes.map(itemStr).join(', '));
  }

  lines.push('', '_(Update with what you learn about them.)_');
  return lines.join('\n');
}

export async function POST(request: NextRequest) {
  try {
    const { workspacePath, characterName, memory } = await request.json();

    if (!workspacePath || typeof workspacePath !== 'string') {
      return Response.json({ error: 'Missing workspacePath' }, { status: 400 });
    }
    if (!memory) {
      return Response.json({ error: 'Missing memory data' }, { status: 400 });
    }

    const name = characterName || 'Companion';
    await mkdir(workspacePath, { recursive: true });

    const newMemoryContent = generateMemoryFile(name, memory);
    const newUserContent = generateUserFile(memory);

    // Content-hash dedupe: skip write if file content is unchanged
    let memoryChanged = true;
    let userChanged = true;

    try {
      const existing = await readFile(join(workspacePath, 'MEMORY.md'), 'utf-8');
      if (existing === newMemoryContent) memoryChanged = false;
    } catch {
      // File doesn't exist, will write
    }

    try {
      const existing = await readFile(join(workspacePath, 'USER.md'), 'utf-8');
      if (existing === newUserContent) userChanged = false;
    } catch {
      // File doesn't exist, will write
    }

    if (memoryChanged) {
      await writeFile(join(workspacePath, 'MEMORY.md'), newMemoryContent, 'utf-8');
    }
    if (userChanged) {
      await writeFile(join(workspacePath, 'USER.md'), newUserContent, 'utf-8');
    }

    return Response.json({
      success: true,
      updated: { memoryMd: memoryChanged, userMd: userChanged },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[OpenClaw Push] Error:', msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
