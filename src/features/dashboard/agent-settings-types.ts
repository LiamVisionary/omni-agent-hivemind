import type { AdaptiveOpenRouterConfig, AgentRuntime, BeeWorkerClass, CustomWorkerClassProfile } from "@/lib/types/agent-runtime";

export type AgentCreateDraft = {
  name: string;
  runtime: AgentRuntime;
  provider?: string;
  model?: string;
  adaptiveOpenRouter?: AdaptiveOpenRouterConfig;
  workerClass: BeeWorkerClass;
  customWorkerClass?: CustomWorkerClassProfile;
  customWorkerClasses: CustomWorkerClassProfile[];
  selectedCustomWorkerClassId?: string;
  skillProfilePrompt: string;
  preferredSkillSlugs: string[];
  useSharedVault: boolean;
};

export type RuntimeModelDraft = {
  provider: string;
  model: string;
  contextLength: string;
};

export type AgentSettingsPanel = "role" | "memory" | "tools" | "security";

export type AgentWorkerClassView = "presets" | "create";

export type RuntimeModelSetupMode = "provider" | "model" | null;
