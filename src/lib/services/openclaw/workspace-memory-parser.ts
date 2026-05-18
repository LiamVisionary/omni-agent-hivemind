/**
 * Parses OpenClaw workspace files (MEMORY.md, USER.md, memory/*.md)
 * back into CompanionMemory format for merging into the app's IndexedDB.
 *
 * PRIVACY: All string memories parsed here are tagged with OPENCLAW_SOURCE_TAG
 * so downstream consumers (e.g. Moltbook post generation) can filter them out
 * and never leak external tool data (Apple Notes, Reminders, etc.).
 */

import type { CompanionMemory, TimestampedMemory } from '@/lib/services/zepService';

/** Tag prepended to every memory string sourced from an OpenClaw workspace. */
export const OPENCLAW_SOURCE_TAG = '[openclaw] ';

/** Check whether a memory string originated from OpenClaw. */
export function isOpenClawSourced(value: string): boolean {
  return value.startsWith(OPENCLAW_SOURCE_TAG);
}

/** Strip the OpenClaw source tag from a memory string for display. */
export function stripOpenClawTag(value: string): string {
  return value.startsWith(OPENCLAW_SOURCE_TAG)
    ? value.slice(OPENCLAW_SOURCE_TAG.length)
    : value;
}

/** Tag a list of timestamped memory entries as OpenClaw-sourced. */
function tagItems(items: TimestampedMemory[]): TimestampedMemory[] {
  return items
    .filter(item => typeof item?.content === 'string' && !item.content.includes('[object Object]'))
    .map(item => ({
      ...item,
      content: item.content.startsWith(OPENCLAW_SOURCE_TAG) ? item.content : `${OPENCLAW_SOURCE_TAG}${item.content}`,
    }));
}

/** Wrap plain strings as legacy TimestampedMemory (createdAt=0 = unknown date). */
function legacy(arr: string[]): TimestampedMemory[] {
  return arr.map(content => ({ content, createdAt: 0 }));
}

/** Parse a section heading from MEMORY.md and return the field mapping */
const SECTION_MAP: Record<string, string> = {
  'things they like': 'userPreferences',
  'things they dislike': 'userDislikes',
  'shared memories': 'sharedMemories',
  'inside jokes': 'insideJokes',
  'relationship milestones': 'relationshipMilestones',
  "stories i've shared": 'characterSharedStories',
  'things i like': 'characterPreferences',
  'things i dislike': 'characterDislikes',
  "promises i've made": 'characterPromises',
  'my opinions': 'characterOpinions',
};

/** Extract list items (lines starting with - ) under a markdown heading */
function extractListItems(content: string, sectionHeading: string): string[] {
  const items: string[] = [];
  const escapedHeading = sectionHeading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const sectionRegex = new RegExp(`^##\\s+${escapedHeading}\\s*$`, 'im');
  const match = sectionRegex.exec(content);
  if (!match) return items;

  const afterHeading = content.slice(match.index + match[0].length);
  const lines = afterHeading.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) break; // next section
    if (trimmed === '---') break;
    if (trimmed.startsWith('- ')) {
      // Strip markdown bold markers and leading dash
      const item = trimmed
        .slice(2)
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .trim();
      if (item) items.push(item);
    }
  }

  return items;
}

/** Parse MEMORY.md into partial CompanionMemory */
export function parseMemoryFile(content: string): Partial<CompanionMemory> {
  const result: Partial<CompanionMemory> = {};

  // Parse structured sections
  for (const [heading, field] of Object.entries(SECTION_MAP)) {
    const items = extractListItems(content, heading);
    if (items.length > 0) {
      (result as Record<string, unknown>)[field] = legacy(items);
    }
  }

  // Parse "About My Human" section for userName/nicknames
  const aboutItems = extractListItems(content, 'About My Human');
  for (const item of aboutItems) {
    const nameMatch = item.match(/^Name:\s*(.+)$/i);
    if (nameMatch) {
      result.userName = nameMatch[1].trim();
    }
    const nickMatch = item.match(/^Nicknames:\s*(.+)$/i);
    if (nickMatch) {
      result.userNicknames = legacy(nickMatch[1].split(',').map(n => n.trim()).filter(Boolean));
    }
  }

  return result;
}

/** Parse USER.md into partial CompanionMemory */
export function parseUserFile(content: string): Partial<CompanionMemory> {
  const result: Partial<CompanionMemory> = {};

  // **Name:** User
  const nameMatch = content.match(/\*\*Name:\*\*\s*(.+)/i);
  if (nameMatch) {
    const name = nameMatch[1].trim();
    if (name && name !== '(will learn through conversation)') {
      result.userName = name;
    }
  }

  // **Nicknames:** ...
  const nickMatch = content.match(/\*\*Nicknames:\*\*\s*(.+)/i);
  if (nickMatch) {
    result.userNicknames = legacy(nickMatch[1].split(',').map(n => n.trim()).filter(Boolean));
  }

  // **Likes:** item1, item2
  const likesMatch = content.match(/\*\*Likes:\*\*\s*(.+)/i);
  if (likesMatch) {
    result.userPreferences = legacy(likesMatch[1].split(',').map(s => s.trim()).filter(Boolean));
  }

  // **Dislikes:** item1, item2
  const dislikesMatch = content.match(/\*\*Dislikes:\*\*\s*(.+)/i);
  if (dislikesMatch) {
    result.userDislikes = legacy(dislikesMatch[1].split(',').map(s => s.trim()).filter(Boolean));
  }

  return result;
}

/**
 * Parse an agent's daily note (memory/YYYY-MM-DD.md) into shared memories.
 * Extracts meaningful list items, skipping operational/system entries.
 */
export function parseDailyNote(content: string): string[] {
  const items: string[] = [];
  const lines = content.split('\n');

  // Skip patterns — operational/system noise + conversation activity summaries
  const SKIP_PATTERNS = [
    /bootstrap/i,
    /IDENTITY\.md/i,
    /BOOTSTRAP\.md/i,
    /config.*patch/i,
    /gateway.*restart/i,
    /gateway.*connected/i,
    /openclaw.*doctor/i,
    /SIGUSR/i,
    /^\s*-\s*✅\s/,  // completed todos
    // Conversation activity summaries (not autonomous tasks)
    /^(skipped|played|paused|resumed|stopped)\s+(to\s+)?(next\s+)?song/i,
    /^played\s+.*playlist/i,
    /^opened\s+https?:\/\//i,
    /^visited\s+https?:\/\//i,
    /^(ongoing|continued|recurring)\s+.*themes?/i,
    /^valentine/i,
    /^(chatted|talked|discussed|conversations?)\s+(about|with|regarding)/i,
    /^(star|night|morning|evening)\s*(gaz|watch|view)/i,
    /chats?\s+with\s+.*references?/i,
    /played\s+.*several\s+times/i,
    /^listened\s+to/i,
    /^(watching|browsing|scrolling|reading)\s/i,
  ];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('- ')) continue;

    const item = trimmed.slice(2).trim();
    if (!item || item.length < 10) continue; // too short to be meaningful

    // Skip operational entries
    if (SKIP_PATTERNS.some(p => p.test(item))) continue;

    // Strip timestamps like "22:44 GMT+7:" or "~22:58-23:14 GMT+7:"
    const cleaned = item
      .replace(/^~?\d{1,2}:\d{2}(?:-\d{1,2}:\d{2})?\s*(?:GMT[+-]\d+:?)?\s*/i, '')
      .replace(/^\s*:\s*/, '')
      .trim();

    if (cleaned.length >= 10) {
      items.push(cleaned);
    }
  }

  return items;
}

/**
 * Combines all parsed workspace data into a single CompanionMemory overlay.
 * MEMORY.md takes priority (structured), USER.md fills gaps, daily notes add context.
 */
export function combineWorkspaceMemories(
  memoryMd: string | null,
  userMd: string | null,
  dailyNotes: string[]
): Partial<CompanionMemory> {
  const fromMemory = memoryMd ? parseMemoryFile(memoryMd) : {};
  const fromUser = userMd ? parseUserFile(userMd) : {};

  // Daily notes become additional shared memories
  const dailyItems: string[] = [];
  for (const note of dailyNotes) {
    dailyItems.push(...parseDailyNote(note));
  }

  // Merge: MEMORY.md is primary, USER.md fills gaps, daily notes add to sharedMemories
  const result: Partial<CompanionMemory> = { ...fromMemory };

  // userName: prefer MEMORY.md, fallback to USER.md
  if (!result.userName && fromUser.userName) {
    result.userName = fromUser.userName;
  }

  // Dedup helper: merge TimestampedMemory arrays, skipping case-insensitive duplicates
  const mergeUnique = (base: TimestampedMemory[], extra: TimestampedMemory[]): TimestampedMemory[] => {
    const seen = new Set(base.map(m => m.content.toLowerCase().trim()));
    const merged = [...base];
    for (const item of extra) {
      const norm = item.content.toLowerCase().trim();
      if (!seen.has(norm)) {
        seen.add(norm);
        merged.push(item);
      }
    }
    return merged;
  };

  // Nicknames: merge both sources
  if (fromUser.userNicknames?.length) {
    result.userNicknames = mergeUnique(result.userNicknames || [], fromUser.userNicknames);
  }

  // User preferences/dislikes from USER.md (agent may have updated them)
  if (fromUser.userPreferences?.length) {
    result.userPreferences = mergeUnique(result.userPreferences || [], fromUser.userPreferences);
  }
  if (fromUser.userDislikes?.length) {
    result.userDislikes = mergeUnique(result.userDislikes || [], fromUser.userDislikes);
  }

  // Daily note items as OpenClaw task history (not shared memories)
  if (dailyItems.length > 0) {
    result.openclawTasks = mergeUnique(result.openclawTasks || [], legacy(dailyItems));
  }

  // Tag every TimestampedMemory-array field so Moltbook (and other consumers) can
  // distinguish OpenClaw-sourced data from app-native memories.
  const tsMemoryArrayKeys: (keyof CompanionMemory)[] = [
    'userPreferences', 'userDislikes', 'sharedMemories', 'insideJokes',
    'relationshipMilestones', 'characterSharedStories', 'characterPreferences',
    'characterDislikes', 'characterPromises', 'characterOpinions',
    'userNicknames', 'musicLikes', 'musicDislikes', 'openclawTasks', 'visionMemories',
  ];
  for (const key of tsMemoryArrayKeys) {
    const arr = result[key];
    if (Array.isArray(arr) && arr.length > 0) {
      (result as Record<string, unknown>)[key] = tagItems(arr as TimestampedMemory[]);
    }
  }

  return result;
}
