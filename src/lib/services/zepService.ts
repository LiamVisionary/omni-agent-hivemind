export interface TimestampedMemory {
  content: string;
  createdAt: number;
}

export interface ImportantDate {
  type: string;
  date: string;
  label: string;
  year?: number;
}

export interface CompanionMemory {
  userName: string;
  userNicknames: TimestampedMemory[];
  userPreferences: TimestampedMemory[];
  userDislikes: TimestampedMemory[];
  relationshipLevel: number;
  relationshipMilestones: TimestampedMemory[];
  emotionalState: string;
  userEmotionalPatterns: string;
  conversationTopics: TimestampedMemory[];
  userPersonality: string;
  sharedMemories: TimestampedMemory[];
  insideJokes: TimestampedMemory[];
  importantDates: ImportantDate[];
  lastConversationSummary: string;
  totalConversations: number;
  characterSharedStories: TimestampedMemory[];
  characterPreferences: TimestampedMemory[];
  characterDislikes: TimestampedMemory[];
  characterPromises: TimestampedMemory[];
  characterOpinions: TimestampedMemory[];
  musicLikes: TimestampedMemory[];
  musicDislikes: TimestampedMemory[];
  openclawTasks: TimestampedMemory[];
  visionMemories: TimestampedMemory[];
  rejectedNicknames: TimestampedMemory[];
}

export function stampMemory(content: string): TimestampedMemory {
  return { content, createdAt: Date.now() };
}
