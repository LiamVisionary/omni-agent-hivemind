import type { AgentProfile, AgentRuntime, AgentRuntimeKind, RuntimeCapabilities } from "@/lib/types/agent-runtime";

export type RuntimeAdapterContext = {
  requestUrl?: string;
  agents?: AgentProfile[];
  vaultPath?: string;
};

export type RuntimeScheduleAction = "run-now" | "enable" | "disable";

export type RuntimeSchedule = {
  id: string;
  runtime: AgentRuntime;
  agentId?: string;
  name: string;
  schedule?: string;
  every?: string;
  everyMs?: number;
  message?: string;
  enabled?: boolean;
  lastRunMs?: number;
  lastStatus?: string;
  lastSummary?: string;
  source?: string;
  metadata?: Record<string, unknown>;
};

export type RuntimeRun = {
  id: string;
  runtime: AgentRuntime;
  name: string;
  status: "queued" | "active" | "completed" | "failed" | "unknown";
  url?: string;
  createdAt?: string;
  updatedAt?: string;
  conclusion?: string | null;
};

export type RuntimeSkill = {
  slug: string;
  name: string;
  description: string;
  category?: string;
  enabled?: boolean;
  schedule?: string;
  var?: string;
  model?: string;
  source?: string;
  path?: string;
  checksum?: string;
  providerLabel?: string;
};

export type RuntimeEnvSyncResult = {
  repo: string;
  synced: Array<{ key: string }>;
  skipped: Array<{ key: string; reason: string }>;
  sources: string[];
};

export type RuntimeAdapter = {
  runtime: AgentRuntime;
  label: string;
  kind: AgentRuntimeKind;
  capabilities: RuntimeCapabilities;
  defaultProfile: Partial<AgentProfile>;
  getStatus?: (profile: AgentProfile, context: RuntimeAdapterContext) => Promise<unknown>;
  listSkills?: (profile: AgentProfile, context: RuntimeAdapterContext) => Promise<RuntimeSkill[]>;
  syncSkills?: (profile: AgentProfile, context: RuntimeAdapterContext) => Promise<unknown>;
  syncEnv?: (
    profile: AgentProfile,
    context: RuntimeAdapterContext & { keys?: string[] },
  ) => Promise<RuntimeEnvSyncResult>;
  listSchedules?: (profile: AgentProfile, context: RuntimeAdapterContext) => Promise<RuntimeSchedule[]>;
  runScheduleAction?: (
    profile: AgentProfile | undefined,
    action: RuntimeScheduleAction,
    jobId: string,
    context: RuntimeAdapterContext,
  ) => Promise<{ ok: boolean; error?: string; result?: unknown }>;
  listRuns?: (profile: AgentProfile, context: RuntimeAdapterContext) => Promise<RuntimeRun[]>;
  listOutputs?: (profile: AgentProfile, context: RuntimeAdapterContext) => Promise<unknown[]>;
};
