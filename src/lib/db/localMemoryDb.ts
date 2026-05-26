import type { CompanionMemory } from "@/lib/services/zepService";

const memoryByKey = new Map<string, CompanionMemory>();

function createDefaultMemory(): CompanionMemory {
  return {
    userName: "Unknown",
    userNicknames: [],
    userPreferences: [],
    userDislikes: [],
    relationshipLevel: 1,
    relationshipMilestones: [],
    emotionalState: "neutral",
    userEmotionalPatterns: "",
    conversationTopics: [],
    userPersonality: "",
    sharedMemories: [],
    insideJokes: [],
    importantDates: [],
    lastConversationSummary: "",
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

function key(userId: string, characterId: string) {
  return `${userId}:${characterId}`;
}

export async function getLocalMemory(userId: string, characterId: string): Promise<CompanionMemory> {
  return memoryByKey.get(key(userId, characterId)) ?? createDefaultMemory();
}

export async function setLocalMemory(userId: string, characterId: string, memory: Partial<CompanionMemory>): Promise<void> {
  const current = await getLocalMemory(userId, characterId);
  memoryByKey.set(key(userId, characterId), { ...current, ...memory });
}

export function mergeMemories(local: CompanionMemory, incoming: CompanionMemory): CompanionMemory {
  const merged: CompanionMemory = { ...local };
  for (const [field, value] of Object.entries(incoming)) {
    if (Array.isArray(value)) {
      const existing = (merged as unknown as Record<string, unknown>)[field];
      const seen = new Set((Array.isArray(existing) ? existing : []).map((item) => JSON.stringify(item)));
      const additions = value.filter((item) => !seen.has(JSON.stringify(item)));
      (merged as unknown as Record<string, unknown>)[field] = [...(Array.isArray(existing) ? existing : []), ...additions];
    } else if (value) {
      (merged as unknown as Record<string, unknown>)[field] = value;
    }
  }
  return merged;
}
