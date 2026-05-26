import type { AgentProfile } from "@/lib/types/agent-runtime";
import type { RuntimeAdapter, RuntimeAdapterContext, RuntimeSchedule, RuntimeScheduleAction } from "./types";

function requestUrl(context: RuntimeAdapterContext, path: string) {
  if (!context.requestUrl) throw new Error("Runtime adapter request URL is required.");
  return new URL(path, context.requestUrl);
}

function normalizeCronJob(job: Record<string, unknown>): RuntimeSchedule {
  return {
    id: String(job.id),
    runtime: "openclaw",
    agentId: typeof job.agentId === "string" ? job.agentId : undefined,
    name: String(job.name ?? "Runtime schedule"),
    schedule: typeof job.schedule === "string" ? job.schedule : undefined,
    every: typeof job.every === "string" ? job.every : undefined,
    everyMs: typeof job.everyMs === "number" ? job.everyMs : undefined,
    message: typeof job.message === "string" ? job.message : undefined,
    enabled: job.enabled !== false,
    nextRunMs: typeof job.nextRunMs === "number" ? job.nextRunMs : undefined,
    lastRunMs: typeof job.lastRunMs === "number" ? job.lastRunMs : undefined,
    lastStatus: typeof job.lastStatus === "string" ? job.lastStatus : undefined,
    lastSummary: typeof job.lastSummary === "string" ? job.lastSummary : undefined,
    source: "runtime-adapter",
  };
}

export const openClawAdapter: RuntimeAdapter = {
  runtime: "openclaw",
  label: "OpenClaw",
  kind: "gateway",
  capabilities: {
    status: true,
    chat: true,
    skills: true,
    schedules: true,
    memory: true,
    sessionSearch: true,
    socialPosting: true,
    videoGeneration: true,
    notifications: true,
    setup: true,
    walletTools: true,
  },
  defaultProfile: {
    gatewayUrl: "ws://127.0.0.1:18789",
    agentId: "main",
  },
  async listSchedules(_profile: AgentProfile, context) {
    const response = await fetch(requestUrl(context, "/api/openclaw/status"), { cache: "no-store" });
    const data = await response.json().catch(() => null) as { success?: boolean; cronJobs?: Array<Record<string, unknown>>; error?: string } | null;
    if (!response.ok || !data?.success) throw new Error(data?.error ?? "OpenClaw schedule adapter unavailable");
    return (data.cronJobs ?? []).map(normalizeCronJob);
  },
  async runScheduleAction(_profile, action: RuntimeScheduleAction, jobId, context) {
    const response = await fetch(requestUrl(context, "/api/openclaw/cron"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, jobId }),
    });
    const data = await response.json().catch(() => null) as { success?: boolean; error?: string } | null;
    return {
      ok: response.ok && data?.success !== false,
      error: data?.error,
    };
  },
};
