/**
 * Bidirectional memory sync between the app's IndexedDB and an OpenClaw
 * agent's workspace files.
 *
 * Sync cycle (runs on load, every 10 min, and after skill completions):
 *   1. Pull: fetch workspace → validate → additive-merge into IndexedDB
 *   2. Push: write current IndexedDB → workspace files
 *
 * Safeguards:
 *   - mergeMemories is additive-only (never deletes existing items)
 *   - Incoming data validated: empty/corrupted payloads rejected
 *   - Per-field array cap prevents unbounded growth
 *   - Hash dedup on both pull and push to skip no-op cycles
 */

import { useCallback, useEffect, useRef } from 'react';
import type { OpenClawConfig } from '@/lib/types/llm';
import type { CompanionMemory, TimestampedMemory } from '@/lib/services/zepService';
import { stampMemory } from '@/lib/services/zepService';
import { getLocalMemory, setLocalMemory, mergeMemories } from '@/lib/db/localMemoryDb';
import { useSessionStore } from '@/lib/stores/sessionStore';
import { devLog } from '@/lib/utils/logger';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BUILTIN_TOOLS = new Set([
  'apple_notes', 'reminder', 'calendar', 'music', 'system', 'open_app', 'email', 'tool_in_progress',
]);

const SYNC_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

/** Max items per string-array field to prevent unbounded growth. */
export const MAX_ARRAY_ITEMS = 200;

/** String-array fields we sync (used for hashing and validation). */
export const SYNCED_ARRAY_KEYS: (keyof CompanionMemory)[] = [
  'userPreferences', 'userDislikes', 'sharedMemories', 'insideJokes',
  'relationshipMilestones', 'characterSharedStories', 'characterPreferences',
  'characterDislikes', 'characterPromises', 'characterOpinions',
  'userNicknames', 'musicLikes', 'musicDislikes', 'openclawTasks',
];

// ---------------------------------------------------------------------------
// Helpers (exported for testing)
// ---------------------------------------------------------------------------

interface UseOpenClawMemorySyncParams {
  openClawConfig: OpenClawConfig | null;
  userId: string | null;
  characterId: string | null;
  characterName: string | null;
}

export function createDefaultMemory(): CompanionMemory {
  return {
    userName: 'Unknown',
    userNicknames: [],
    userPreferences: [],
    userDislikes: [],
    relationshipLevel: 1,
    relationshipMilestones: [],
    emotionalState: 'neutral',
    userEmotionalPatterns: '',
    conversationTopics: [],
    userPersonality: '',
    sharedMemories: [],
    insideJokes: [],
    importantDates: [],
    lastConversationSummary: '',
    totalConversations: 0,
    characterSharedStories: [],
    characterPreferences: [],
    characterDislikes: [],
    characterPromises: [],
    characterOpinions: [],
    musicLikes: [],
    musicDislikes: [],
    openclawTasks: [],
    visionMemories: [],
    rejectedNicknames: [],
  };
}

/** Lightweight hash of syncable memory fields. */
export function memoryHash(m: CompanionMemory): string {
  const obj: Record<string, unknown> = { u: m.userName };
  for (const k of SYNCED_ARRAY_KEYS) {
    const val = m[k];
    if (Array.isArray(val)) obj[k] = val;
  }
  return JSON.stringify(obj);
}

/**
 * Validate incoming agent memories. Returns a sanitised overlay or null if
 * the payload is too suspicious to merge.
 */
export function validateIncoming(
  incoming: Partial<CompanionMemory>,
  _local: CompanionMemory,
): CompanionMemory | null {
  // Reject completely empty payloads
  const hasAnyContent = SYNCED_ARRAY_KEYS.some(k => {
    const arr = incoming[k];
    return Array.isArray(arr) && arr.length > 0;
  });
  if (!hasAnyContent && (!incoming.userName || incoming.userName === 'Unknown')) {
    devLog.warn('🦞 [MemorySync] Incoming payload is empty — skipping merge');
    return null;
  }

  // Build overlay: only include fields that have actual data
  const overlay: CompanionMemory = { ...createDefaultMemory() };

  // Scalars
  if (incoming.userName && incoming.userName !== 'Unknown') {
    overlay.userName = incoming.userName;
  }
  if (incoming.relationshipLevel && incoming.relationshipLevel > 0) {
    overlay.relationshipLevel = incoming.relationshipLevel;
  }

  // TimestampedMemory arrays: validate each item, cap length
  for (const k of SYNCED_ARRAY_KEYS) {
    const arr = incoming[k];
    if (!Array.isArray(arr)) continue;
    const clean = (arr as TimestampedMemory[])
      .filter(item => {
        const content = typeof item === 'string' ? item : item?.content;
        return typeof content === 'string' && content.trim().length > 0 && content.length < 2000;
      })
      .map(item => typeof item === 'string' ? { content: item, createdAt: 0 } as TimestampedMemory : item)
      .slice(0, MAX_ARRAY_ITEMS);
    (overlay as unknown as Record<string, unknown>)[k] = clean;
  }

  // Important dates
  if (Array.isArray(incoming.importantDates)) {
    overlay.importantDates = incoming.importantDates.filter(
      d => d && typeof d.date === 'string' && typeof d.label === 'string'
    );
  }

  return overlay;
}

/**
 * Cap all string-array fields in a memory object to MAX_ARRAY_ITEMS.
 * Keeps the most recent items (tail of array).
 */
export function capArrays(m: CompanionMemory): CompanionMemory {
  const capped = { ...m };
  for (const k of SYNCED_ARRAY_KEYS) {
    const arr = capped[k];
    if (Array.isArray(arr) && arr.length > MAX_ARRAY_ITEMS) {
      (capped as unknown as Record<string, unknown>)[k] = (arr as TimestampedMemory[]).slice(-MAX_ARRAY_ITEMS);
    }
  }
  return capped;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useOpenClawMemorySync({
  openClawConfig,
  userId,
  characterId,
  characterName,
}: UseOpenClawMemorySyncParams) {
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPullHashRef = useRef<string>('');
  const lastPushHashRef = useRef<string>('');
  const syncLockRef = useRef(false);

  // -----------------------------------------------------------------------
  // Pull: workspace → IndexedDB (additive merge)
  // -----------------------------------------------------------------------

  const doPull = useCallback(async (reason: string): Promise<boolean> => {
    if (!openClawConfig?.enabled) return false;
    if (!openClawConfig?.pullMemoriesFromAgent) return false;
    if (!openClawConfig.workspacePath) return false;
    if (!userId || !characterId) return false;

    try {
      devLog.logIf('openclaw', `🦞 [Sync:Pull] (${reason})...`);

      const response = await fetch('/api/openclaw/memories/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspacePath: openClawConfig.workspacePath }),
      });

      if (!response.ok) {
        devLog.warn('🦞 [Sync:Pull] Failed:', response.status);
        return false;
      }

      const data = await response.json();
      if (!data.success || !data.memories) {
        devLog.warn('🦞 [Sync:Pull] No memories returned');
        return false;
      }

      // Hash-dedup: skip merge if workspace hasn't changed since last pull
      const incomingHash = JSON.stringify(data.memories);
      if (incomingHash === lastPullHashRef.current) {
        devLog.logIf('openclaw', '🦞 [Sync:Pull] Workspace unchanged — skipped');
        return false;
      }

      const incoming = data.memories as Partial<CompanionMemory>;
      const local = await getLocalMemory(userId, characterId);

      // Validate + sanitise incoming data
      const overlay = validateIncoming(incoming, local);
      if (!overlay) return false;

      const merged = capArrays(mergeMemories(local, overlay));

      const changed = memoryHash(merged) !== memoryHash(local);
      if (changed) {
        await setLocalMemory(userId, characterId, merged);
        lastPullHashRef.current = incomingHash;

        const diff: Record<string, number> = {};
        for (const k of SYNCED_ARRAY_KEYS) {
          const delta = ((merged[k] as unknown[])?.length || 0) - ((local[k] as unknown[])?.length || 0);
          if (delta !== 0) diff[k] = delta;
        }
        devLog.logIf('openclaw', '🦞 [Sync:Pull] Merged:', { sources: data.sources, diff });
        return true;
      }

      lastPullHashRef.current = incomingHash;
      devLog.logIf('openclaw', '🦞 [Sync:Pull] Already up to date');
      return false;
    } catch (error) {
      devLog.warn('🦞 [Sync:Pull] Error:', error);
      return false;
    }
  }, [openClawConfig, userId, characterId]);

  // -----------------------------------------------------------------------
  // Push: IndexedDB → workspace
  // -----------------------------------------------------------------------

  const doPush = useCallback(async (reason: string): Promise<boolean> => {
    if (!openClawConfig?.enabled) return false;
    if (!openClawConfig?.pushMemoriesToAgent) return false;
    if (!openClawConfig.workspacePath) return false;
    if (!userId || !characterId) return false;

    try {
      const memory = await getLocalMemory(userId, characterId);
      const hash = memoryHash(memory);

      if (hash === lastPushHashRef.current) {
        devLog.logIf('openclaw', `🦞 [Sync:Push] (${reason}) No changes — skipped`);
        return false;
      }

      const response = await fetch('/api/openclaw/memories/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspacePath: openClawConfig.workspacePath,
          characterName: characterName || 'Companion',
          memory,
        }),
      });

      if (!response.ok) {
        devLog.warn('🦞 [Sync:Push] Failed:', response.status);
        return false;
      }

      const data = await response.json();
      if (data.success) {
        lastPushHashRef.current = hash;
        devLog.logIf('openclaw', `🦞 [Sync:Push] (${reason}) Done:`, data.updated);
        return true;
      }
      return false;
    } catch (error) {
      devLog.warn('🦞 [Sync:Push] Error:', error);
      return false;
    }
  }, [openClawConfig, userId, characterId, characterName]);

  // -----------------------------------------------------------------------
  // Full sync cycle: pull then push (with lock to prevent overlap)
  // -----------------------------------------------------------------------

  const doSync = useCallback(async (reason: string) => {
    if (syncLockRef.current) {
      devLog.logIf('openclaw', `🦞 [Sync] Skipping (${reason}) — already in progress`);
      return;
    }
    syncLockRef.current = true;
    try {
      await doPull(reason);
      await doPush(reason);
    } finally {
      syncLockRef.current = false;
    }
  }, [doPull, doPush]);

  // Convenience wrappers for external callers
  const pullMemories = useCallback(() => doPull('manual'), [doPull]);
  const pushMemories = useCallback(() => doPush('manual'), [doPush]);

  // -----------------------------------------------------------------------
  // Effects
  // -----------------------------------------------------------------------

  // Initial sync on character load
  useEffect(() => {
    if (!openClawConfig?.enabled) return;
    if (!openClawConfig.workspacePath) return;
    if (!userId || !characterId) return;

    doSync('character load');
  }, [openClawConfig?.enabled, openClawConfig?.workspacePath, userId, characterId, doSync]);

  // Bidirectional sync every 10 minutes
  useEffect(() => {
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }

    if (!openClawConfig?.enabled) return;
    if (!openClawConfig.workspacePath) return;
    if (!userId || !characterId) return;

    syncIntervalRef.current = setInterval(() => doSync('interval'), SYNC_INTERVAL_MS);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [openClawConfig?.enabled, openClawConfig?.workspacePath, userId, characterId, doSync]);

  // Skill tool completion: save task + trigger extra sync
  const activeToolCall = useSessionStore((s) => s.activeToolCall);
  const lastSyncedToolRef = useRef<string>('');

  useEffect(() => {
    if (!activeToolCall) return;
    if (activeToolCall.phase !== 'completed') return;
    if (BUILTIN_TOOLS.has(activeToolCall.toolName)) return;
    if (!userId || !characterId) return;

    if (lastSyncedToolRef.current === activeToolCall.toolName) return;
    lastSyncedToolRef.current = activeToolCall.toolName;

    // Save task to openclawTasks immediately (no network dependency)
    const rawQuery = (activeToolCall.args?.content as string) || (activeToolCall.args?.query as string) || '';
    // _result can be an object if the gateway returns structured data — stringify it
    const rawResult = activeToolCall.args?._result;
    const result = typeof rawResult === 'string'
      ? rawResult
      : (rawResult != null ? JSON.stringify(rawResult) : '');
    const summary = result.substring(0, 120).replace(/\n/g, ' ').trim();
    // Skip query if it's just the tool slug — not useful as a task description
    const query = (rawQuery && rawQuery !== activeToolCall.toolName && !/^baoyu-[\w-]+$/.test(rawQuery.trim()))
      ? rawQuery : '';
    // When result exists, keep the header clean (no summary duplication).
    // Display side uses formatToolDisplayName for a human-readable label.
    const header = query
      ? `[${activeToolCall.toolName}] ${query}`.substring(0, 200)
      : `[${activeToolCall.toolName}]`;
    // Append full result after delimiter so it can be replayed from the memories modal.
    // Fallback: if no result AND no query, use summary so the entry has something readable.
    const taskEntry = result
      ? `${header}||RESULT||${result}`
      : (query ? header : `[${activeToolCall.toolName}] ${summary}`.substring(0, 200));

    (async () => {
      try {
        const current = await getLocalMemory(userId, characterId);
        const existing = current.openclawTasks || [];
        if (!existing.some(t => t.content === taskEntry)) {
          await setLocalMemory(userId, characterId, {
            openclawTasks: [...existing, stampMemory(taskEntry)].slice(-MAX_ARRAY_ITEMS),
          });
          devLog.logIf('openclaw', `🦞 [Sync] Saved skill task: "${taskEntry.substring(0, 80)}"`);
        }
      } catch (err) {
        devLog.warn('🦞 [Sync] Failed to save skill task:', err);
      }
    })();

    // Full sync after delay (agent may have written more to workspace)
    const timer = setTimeout(() => doSync('skill completed'), 3000);
    return () => clearTimeout(timer);
  }, [activeToolCall, userId, characterId, doSync]);

  // Reset hashes when character changes
  useEffect(() => {
    return () => {
      lastPullHashRef.current = '';
      lastPushHashRef.current = '';
      lastSyncedToolRef.current = '';
    };
  }, [characterId]);

  return { pullMemories, pushMemories };
}
