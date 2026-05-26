import type { AgentRuntime, KnownAgentRuntime } from "@/lib/types/agent-runtime";
import type { RuntimeAdapter } from "./types";
import { aeonAdapter } from "./aeon";
import { hermesAdapter } from "./hermes";
import { openAICompatibleAdapter } from "./openai-compatible";
import { openClawAdapter } from "./openclaw";

export const RUNTIME_ADAPTERS: Record<KnownAgentRuntime, RuntimeAdapter> = {
  openclaw: openClawAdapter,
  hermes: hermesAdapter,
  aeon: aeonAdapter,
  "openai-compatible": openAICompatibleAdapter,
};

export function getRuntimeAdapter(runtime: AgentRuntime): RuntimeAdapter | undefined {
  return RUNTIME_ADAPTERS[runtime as KnownAgentRuntime];
}

export function runtimeSupports(runtime: AgentRuntime, capability: keyof RuntimeAdapter["capabilities"]) {
  return Boolean(getRuntimeAdapter(runtime)?.capabilities?.[capability]);
}

export function runtimeHasAdapter(runtime: string): runtime is AgentRuntime {
  return Boolean(getRuntimeAdapter(runtime as AgentRuntime));
}

export type {
  RuntimeAdapter,
  RuntimeAdapterContext,
  RuntimeEnvSyncResult,
  RuntimeRun,
  RuntimeSchedule,
  RuntimeScheduleAction,
  RuntimeSkill,
} from "./types";
