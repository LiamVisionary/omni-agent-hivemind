import type { AgentRuntime } from "@/lib/types/agent-runtime";
import type { RuntimeAdapter } from "./types";
import { aeonAdapter } from "./aeon";
import { hermesAdapter } from "./hermes";
import { openClawAdapter } from "./openclaw";

export const RUNTIME_ADAPTERS: Record<AgentRuntime, RuntimeAdapter> = {
  openclaw: openClawAdapter,
  hermes: hermesAdapter,
  aeon: aeonAdapter,
};

export function getRuntimeAdapter(runtime: AgentRuntime): RuntimeAdapter {
  return RUNTIME_ADAPTERS[runtime];
}

export function runtimeSupports(runtime: AgentRuntime, capability: keyof RuntimeAdapter["capabilities"]) {
  return Boolean(RUNTIME_ADAPTERS[runtime]?.capabilities?.[capability]);
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
