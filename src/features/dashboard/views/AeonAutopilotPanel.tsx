"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Activity,
  Bot,
  Check,
  Clock3,
  ExternalLink,
  FileText,
  GitBranch,
  ListChecks,
  LoaderCircle,
  MemoryStick,
  Play,
  Power,
  RefreshCcw,
  Rocket,
  ShieldCheck,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { DashboardView } from "@/features/dashboard/dashboard-types";
import type { AgentProfile, SharedVaultConfig } from "@/lib/types/agent-runtime";
import type { RuntimeRun, RuntimeSchedule, RuntimeSkill } from "@/lib/services/runtime-adapters/types";

type AeonStatus = {
  ok?: boolean;
  runtime?: string;
  status?: {
    ok?: boolean;
    root?: string;
    repo?: string;
    hasConfig?: boolean;
    a2aReachable?: boolean;
  };
  error?: string;
};

type AeonOutput = {
  filename?: string;
  skill?: string;
  source?: string;
  updatedAt?: string;
  excerpt?: string;
};

type AeonAutopilotPanelProps = {
  activeView: DashboardView;
  displayAgents: AgentProfile[];
  sharedVault: SharedVaultConfig;
  setActiveView: (view: DashboardView) => void;
};

const DEFAULT_AEON_AGENT: AgentProfile = {
  id: "aeon-local",
  name: "Aeon",
  runtime: "aeon",
  runtimeKind: "background",
  runtimeCapabilities: {
    status: true,
    skills: true,
    schedules: true,
    runs: true,
    outputs: true,
    memory: true,
    backgroundTasks: true,
    notifications: true,
    setup: true,
  },
  gatewayUrl: "http://127.0.0.1:41241",
  a2aUrl: "http://127.0.0.1:41241",
  chatPath: "",
  statusPath: "/health",
  agentId: "local-aeon",
  provider: "",
  model: "",
  localDataDir: "~/.aeon",
  aeonLocalPath: "~/.aeon",
  aeonBranch: "main",
  aeonMode: "github",
  machineName: "local",
  telemetryUrl: "",
  useSharedVault: true,
  beeRole: "worker",
  workerClass: "ops",
};

const DEFAULT_SECRET_KEYS = ["ANTHROPIC_API_KEY", "CLAUDE_CODE_OAUTH_TOKEN", "BANKR_LLM_KEY", "GH_GLOBAL"];

const AEON_LANES = [
  {
    title: "Scheduler",
    label: "GitHub Actions",
    body: "Cron and manual dispatch converge on `aeon.yml`, with skill, var, and model as the core run inputs.",
  },
  {
    title: "Memory",
    label: "Versioned files",
    body: "`memory/MEMORY.md`, topics, logs, and issue notes form the durable context AEON carries between runs.",
  },
  {
    title: "Outputs",
    label: ".outputs + dashboard",
    body: "Markdown summaries and json-render payloads land in output folders for dashboard review and downstream reuse.",
  },
  {
    title: "Notifications",
    label: "Optional channels",
    body: "Telegram, Discord, Slack, email, and JSON render channels can be enabled when the matching secrets exist.",
  },
];

const SECRET_MANIFEST = [
  { key: "ANTHROPIC_API_KEY", label: "Claude API" },
  { key: "CLAUDE_CODE_OAUTH_TOKEN", label: "Claude Code OAuth" },
  { key: "BANKR_LLM_KEY", label: "Bankr LLM gateway" },
  { key: "GH_GLOBAL", label: "GitHub automation" },
  { key: "TELEGRAM_BOT_TOKEN", label: "Telegram notify" },
  { key: "DISCORD_WEBHOOK_URL", label: "Discord notify" },
  { key: "SLACK_WEBHOOK_URL", label: "Slack notify" },
  { key: "RESEND_API_KEY", label: "Email notify" },
];

const AEON_PATHS = [
  { label: "Config", value: "aeon.yml" },
  { label: "Skill manifest", value: "skills.json" },
  { label: "Skills", value: "skills/<slug>/SKILL.md" },
  { label: "Memory", value: "memory/MEMORY.md" },
  { label: "Outputs", value: ".outputs/*.md" },
  { label: "Rendered outputs", value: "dashboard/outputs/*.json" },
];

async function postJson<T>(url: string, body: Record<string, unknown>) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => null) as T & { ok?: boolean; error?: string } | null;
  if (!response.ok || data?.ok === false) throw new Error(data?.error || `Request failed with HTTP ${response.status}.`);
  return data as T;
}

function timeLabel(value?: string) {
  if (!value) return "No timestamp";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function statusTone(value?: string) {
  if (value === "completed" || value === "success") return "border-emerald-300/25 bg-emerald-400/10 text-emerald-100";
  if (value === "failed" || value === "failure") return "border-rose-300/25 bg-rose-400/10 text-rose-100";
  if (value === "active" || value === "queued") return "border-amber-300/25 bg-amber-400/10 text-amber-100";
  return "border-slate-300/20 bg-slate-400/10 text-slate-100";
}

function skillSourceLabel(source?: string) {
  if (source === "shared-brain") return "Shared brain";
  if (source === "aeon-a2a") return "A2A";
  if (source === "aeon.yml") return "aeon.yml";
  if (source === "aeon-skill-folder") return "Aeon folder";
  return source || "Aeon";
}

function sourceCounts(skills: RuntimeSkill[]) {
  const counts = new Map<string, number>();
  for (const skill of skills) {
    const label = skillSourceLabel(skill.source);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()].sort((left, right) => right[1] - left[1]);
}

function modelCounts(skills: RuntimeSkill[], schedules: RuntimeSchedule[]) {
  const scheduleBySkill = new Map(schedules.map((schedule) => [schedule.id, schedule]));
  const counts = new Map<string, number>();
  for (const skill of skills) {
    const schedule = scheduleBySkill.get(skill.slug);
    const model = skill.model || (schedule?.metadata?.model as string | undefined) || "default";
    counts.set(model, (counts.get(model) ?? 0) + 1);
  }
  return [...counts.entries()].sort((left, right) => right[1] - left[1]).slice(0, 4);
}

function latestRunLabel(runs: RuntimeRun[]) {
  const latest = runs[0];
  if (!latest) return "No runs yet";
  return `${latest.status} · ${timeLabel(latest.createdAt)}`;
}

export function AeonAutopilotPanel({ activeView, displayAgents, sharedVault, setActiveView }: AeonAutopilotPanelProps) {
  const aeonAgents = useMemo(() => displayAgents.filter((agent) => agent.runtime === "aeon"), [displayAgents]);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const selectedAgent = aeonAgents.find((agent) => agent.id === selectedAgentId) ?? aeonAgents[0] ?? DEFAULT_AEON_AGENT;
  const [status, setStatus] = useState<AeonStatus | null>(null);
  const [skills, setSkills] = useState<RuntimeSkill[]>([]);
  const [schedules, setSchedules] = useState<RuntimeSchedule[]>([]);
  const [runs, setRuns] = useState<RuntimeRun[]>([]);
  const [outputs, setOutputs] = useState<AeonOutput[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState("");
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const agent = selectedAgent;
      const body = { agent };
      const [nextStatus, nextSkills, nextSchedules, nextRuns, nextOutputs] = await Promise.all([
        postJson<AeonStatus>("/api/runtimes/aeon/status", body),
        postJson<{ skills?: RuntimeSkill[] }>("/api/runtimes/aeon/skills", { ...body, vaultPath: sharedVault.vaultPath }),
        postJson<{ schedules?: RuntimeSchedule[] }>("/api/runtimes/aeon/schedules", body),
        postJson<{ runs?: RuntimeRun[] }>("/api/runtimes/aeon/runs", body),
        postJson<{ outputs?: AeonOutput[] }>("/api/runtimes/aeon/outputs", body),
      ]);
      setStatus(nextStatus);
      setSkills(nextSkills.skills ?? []);
      setSchedules(nextSchedules.schedules ?? []);
      setRuns(nextRuns.runs ?? []);
      setOutputs(nextOutputs.outputs ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Aeon refresh failed.");
    } finally {
      setLoading(false);
    }
  }, [selectedAgent, sharedVault.vaultPath]);

  useEffect(() => {
    if (activeView !== "aeon") return;
    const handle = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(handle);
  }, [activeView, refresh]);

  async function runScheduleAction(action: "run-now" | "enable" | "disable", jobId: string) {
    setActionBusy(`${action}:${jobId}`);
    setMessage("");
    try {
      await postJson("/api/runtimes/aeon/schedules/action", { agent: selectedAgent, action, jobId });
      setMessage(action === "run-now" ? `Started ${jobId}.` : `${action === "enable" ? "Enabled" : "Disabled"} ${jobId}.`);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Aeon action failed.");
    } finally {
      setActionBusy("");
    }
  }

  async function syncSharedSkills() {
    setActionBusy("sync-skills");
    setMessage("");
    try {
      const data = await postJson<{ result?: { synced?: unknown[]; skipped?: unknown[] } }>("/api/runtimes/aeon/skills/sync", {
        agent: selectedAgent,
        vaultPath: sharedVault.vaultPath,
      });
      const synced = data.result?.synced?.length ?? 0;
      const skipped = data.result?.skipped?.length ?? 0;
      setMessage(`Synced ${synced} shared skill${synced === 1 ? "" : "s"}${skipped ? `, skipped ${skipped}` : ""}.`);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Aeon skill sync failed.");
    } finally {
      setActionBusy("");
    }
  }

  async function syncSecrets() {
    setActionBusy("sync-secrets");
    setMessage("");
    try {
      const data = await postJson<{ result?: { synced?: unknown[]; skipped?: unknown[]; repo?: string } }>("/api/runtimes/aeon/env/sync", {
        agent: selectedAgent,
        keys: DEFAULT_SECRET_KEYS,
      });
      const synced = data.result?.synced?.length ?? 0;
      const skipped = data.result?.skipped?.length ?? 0;
      setMessage(`Synced ${synced} secret${synced === 1 ? "" : "s"} to ${data.result?.repo || selectedAgent.aeonRepo || "Aeon"}${skipped ? `, skipped ${skipped}` : ""}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Aeon secret sync failed.");
    } finally {
      setActionBusy("");
    }
  }

  if (activeView !== "aeon") return null;

  const enabledSchedules = schedules.filter((schedule) => schedule.enabled !== false);
  const successfulRuns = runs.filter((run) => run.status === "completed").length;
  const failedRuns = runs.filter((run) => run.status === "failed").length;
  const selectedScheduleIds = new Set(schedules.map((schedule) => schedule.id));
  const visibleSkills = skills.map((skill) => ({
    ...skill,
    runtimeSchedule: schedules.find((schedule) => schedule.id === skill.slug),
  }));
  const sharedSkillCount = skills.filter((skill) => skill.source === "shared-brain").length;
  const a2aSkillCount = skills.filter((skill) => skill.source === "aeon-a2a").length;
  const scheduledSkillCount = visibleSkills.filter((skill) => Boolean(skill.runtimeSchedule)).length;
  const setupItems = [
    { label: "Local AEON folder", ok: Boolean(status?.status?.root || selectedAgent.aeonLocalPath || selectedAgent.localDataDir), detail: status?.status?.root || selectedAgent.aeonLocalPath || selectedAgent.localDataDir || "~/.aeon" },
    { label: "aeon.yml config", ok: Boolean(status?.status?.hasConfig), detail: status?.status?.hasConfig ? "Readable" : "Missing" },
    { label: "GitHub repo", ok: Boolean(status?.status?.repo || selectedAgent.aeonRepo), detail: status?.status?.repo || selectedAgent.aeonRepo || "Not configured" },
    { label: "A2A card", ok: Boolean(status?.status?.a2aReachable), detail: status?.status?.a2aReachable ? "Reachable" : selectedAgent.a2aUrl || selectedAgent.gatewayUrl || "Offline" },
    { label: "Shared skills", ok: sharedSkillCount > 0, detail: `${sharedSkillCount} mirrored` },
    { label: "Recent workflow", ok: runs.length > 0, detail: latestRunLabel(runs) },
  ];
  const inventoryRows = [
    { label: "Shared brain", value: sharedSkillCount },
    { label: "A2A card", value: a2aSkillCount },
    { label: "Scheduled", value: scheduledSkillCount },
    { label: "Enabled", value: enabledSchedules.length },
  ];

  return (
    <section className="grid gap-4">
      <div className="relative overflow-hidden rounded-lg border border-[rgba(148,163,184,0.16)] bg-[linear-gradient(135deg,rgba(10,14,21,0.94),rgba(18,28,35,0.88)_45%,rgba(16,20,29,0.92))] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.24)]">
        <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(94,234,212,0.65),transparent)]" />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="grid gap-2">
            <p className="eyebrow">Aeon Autopilot</p>
            <h2 className="m-0 text-xl font-bold text-[var(--foreground)]">Unattended work, runs, and outputs</h2>
            <div className="flex flex-wrap gap-2 text-xs text-[var(--muted)]">
              <span className="rounded-md border border-[rgba(94,234,212,0.20)] bg-[rgba(20,184,166,0.08)] px-2 py-1 text-[var(--accent-strong)]">{enabledSchedules.length} active schedules</span>
              <span className="rounded-md border border-[rgba(148,163,184,0.16)] bg-[rgba(10,14,21,0.52)] px-2 py-1">{skills.length} skills</span>
              <span className="rounded-md border border-[rgba(148,163,184,0.16)] bg-[rgba(10,14,21,0.52)] px-2 py-1">{runs.length} recent runs</span>
              <span className="rounded-md border border-[rgba(148,163,184,0.16)] bg-[rgba(10,14,21,0.52)] px-2 py-1">{outputs.length} outputs</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {aeonAgents.length > 1 ? (
              <label className="grid gap-1 text-xs text-[var(--muted)]">
                Aeon profile
                <select
                  className="min-h-8 rounded-md border border-[rgba(148,163,184,0.22)] bg-[rgba(10,14,21,0.72)] px-2 text-[var(--foreground)]"
                  value={selectedAgent.id}
                  onChange={(event) => setSelectedAgentId(event.target.value)}
                >
                  {aeonAgents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
                </select>
              </label>
            ) : null}
            <Button type="button" variant="secondary" onClick={() => void refresh()} disabled={loading}>
              {loading ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <RefreshCcw aria-hidden="true" />}
              Refresh
            </Button>
          </div>
        </div>
        {message ? (
          <p className="mt-4 rounded-md border border-[rgba(148,163,184,0.16)] bg-[rgba(10,14,21,0.64)] px-3 py-2 text-sm text-[var(--foreground)]">{message}</p>
        ) : null}
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-lg border border-[rgba(148,163,184,0.16)] bg-[rgba(16,20,29,0.78)] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow">Runtime contract</p>
              <h3 className="m-0 text-base font-bold">Configure once, review by evidence</h3>
            </div>
            <a
              className="inline-flex items-center gap-1 rounded-md border border-[rgba(148,163,184,0.18)] px-2 py-1 text-xs text-[var(--accent-strong)]"
              href="https://github.com/aaronjmars/aeon"
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink aria-hidden="true" className="h-3 w-3" />
              Upstream
            </a>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {AEON_LANES.map((lane) => (
              <article key={lane.title} className="rounded-md border border-[rgba(148,163,184,0.14)] bg-[rgba(10,14,21,0.46)] p-3">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="m-0 text-sm font-bold text-[var(--foreground)]">{lane.title}</h4>
                  <span className="rounded-md border border-[rgba(94,234,212,0.18)] bg-[rgba(20,184,166,0.07)] px-2 py-1 text-[11px] text-[var(--accent-strong)]">{lane.label}</span>
                </div>
                <p className="m-0 mt-2 text-xs leading-5 text-[var(--muted)]">{lane.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-[rgba(148,163,184,0.16)] bg-[rgba(16,20,29,0.78)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Readiness</p>
              <h3 className="m-0 text-base font-bold">Setup checklist</h3>
            </div>
            <ListChecks aria-hidden="true" className="h-5 w-5 text-[var(--accent-strong)]" />
          </div>
          <div className="mt-4 grid gap-2">
            {setupItems.map((item) => (
              <StatusRow key={item.label} label={item.label} value={item.detail} ok={item.ok} />
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-3 xl:grid-cols-[1fr_1.2fr] xl:items-start">
        <section className="rounded-lg border border-[rgba(148,163,184,0.16)] bg-[rgba(16,20,29,0.78)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Connection</p>
              <h3 className="m-0 text-base font-bold">Runtime status</h3>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-bold ${status?.status?.ok ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-100" : "border-amber-300/25 bg-amber-400/10 text-amber-100"}`}>
              {status?.status?.ok ? "Ready" : loading ? "Checking" : "Needs setup"}
            </span>
          </div>
          <div className="mt-4 grid gap-2 text-sm">
            <StatusRow label="Local config" value={status?.status?.hasConfig ? "aeon.yml found" : "Not found"} ok={status?.status?.hasConfig} />
            <StatusRow label="A2A card" value={status?.status?.a2aReachable ? "Reachable" : "Not reachable"} ok={status?.status?.a2aReachable} />
            <StatusRow label="GitHub repo" value={status?.status?.repo || selectedAgent.aeonRepo || "Not configured"} ok={Boolean(status?.status?.repo || selectedAgent.aeonRepo)} />
            <StatusRow label="Local path" value={status?.status?.root || selectedAgent.aeonLocalPath || selectedAgent.localDataDir || "~/.aeon"} ok={Boolean(status?.status?.root || selectedAgent.aeonLocalPath || selectedAgent.localDataDir)} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={() => void syncSharedSkills()} disabled={actionBusy === "sync-skills"}>
              {actionBusy === "sync-skills" ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Bot aria-hidden="true" />}
              Sync skills
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => void syncSecrets()} disabled={actionBusy === "sync-secrets" || !(selectedAgent.aeonRepo || status?.status?.repo)}>
              {actionBusy === "sync-secrets" ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Upload aria-hidden="true" />}
              Sync secrets
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setActiveView("files")}>
              <FileText aria-hidden="true" />
              Files
            </Button>
          </div>
          <div className="mt-4 grid gap-2 rounded-md border border-[rgba(148,163,184,0.12)] bg-[rgba(10,14,21,0.34)] p-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-[var(--muted)]">
              <MemoryStick aria-hidden="true" className="h-3.5 w-3.5 text-[var(--accent-strong)]" />
              Aeon file map
            </div>
            <div className="grid gap-2">
              {AEON_PATHS.map((path) => (
                <div key={path.label} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-[var(--muted)]">{path.label}</span>
                  <code className="rounded border border-[rgba(148,163,184,0.14)] bg-[rgba(2,6,23,0.36)] px-2 py-1 text-[var(--foreground)]">{path.value}</code>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-[rgba(148,163,184,0.16)] bg-[rgba(16,20,29,0.78)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Schedules</p>
              <h3 className="m-0 text-base font-bold">Autonomous skills</h3>
            </div>
            <Button type="button" size="sm" variant="ghost" onClick={() => setActiveView("scheduler")}>
              <Clock3 aria-hidden="true" />
              Scheduler
            </Button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            {inventoryRows.map((row) => (
              <div key={row.label} className="rounded-md border border-[rgba(148,163,184,0.12)] bg-[rgba(10,14,21,0.34)] p-3">
                <div className="text-lg font-bold text-[var(--foreground)]">{row.value}</div>
                <div className="text-[11px] uppercase text-[var(--muted)]">{row.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-[var(--muted)]">
            {sourceCounts(skills).map(([source, count]) => (
              <span key={source} className="rounded-md border border-[rgba(148,163,184,0.14)] px-2 py-1">{source}: {count}</span>
            ))}
            {modelCounts(skills, schedules).map(([model, count]) => (
              <span key={model} className="rounded-md border border-[rgba(94,234,212,0.16)] px-2 py-1 text-[var(--accent-strong)]">{model}: {count}</span>
            ))}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {visibleSkills.slice(0, 8).map((skill) => {
              const schedule = skill.runtimeSchedule;
              const enabled = schedule?.enabled ?? skill.enabled ?? false;
              const actionKey = `${enabled ? "disable" : "enable"}:${skill.slug}`;
              return (
                <article key={skill.slug} className="grid gap-3 rounded-md border border-[rgba(148,163,184,0.14)] bg-[rgba(10,14,21,0.48)] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="m-0 text-sm font-bold text-[var(--foreground)]">{skill.name}</h4>
                      <p className="m-0 mt-1 text-xs leading-5 text-[var(--muted)]">{skill.description || skill.var || schedule?.message || "No brief yet."}</p>
                    </div>
                    <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${enabled ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-100" : "border-slate-300/20 bg-slate-400/10 text-slate-200"}`}>
                      {enabled ? "On" : "Off"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px] text-[var(--muted)]">
                    <span className="rounded-md border border-[rgba(148,163,184,0.14)] px-2 py-1">{schedule?.every || skill.schedule || "manual"}</span>
                    <span className="rounded-md border border-[rgba(148,163,184,0.14)] px-2 py-1">{skill.model || (schedule?.metadata?.model as string | undefined) || "default model"}</span>
                    <span className="rounded-md border border-[rgba(148,163,184,0.14)] px-2 py-1">{skillSourceLabel(skill.source)}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" onClick={() => void runScheduleAction("run-now", skill.slug)} disabled={!selectedScheduleIds.has(skill.slug) || actionBusy === `run-now:${skill.slug}`}>
                      {actionBusy === `run-now:${skill.slug}` ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Play aria-hidden="true" />}
                      Run
                    </Button>
                    <Button type="button" size="sm" variant="secondary" onClick={() => void runScheduleAction(enabled ? "disable" : "enable", skill.slug)} disabled={!selectedScheduleIds.has(skill.slug) || actionBusy === actionKey}>
                      {actionBusy === actionKey ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Power aria-hidden="true" />}
                      {enabled ? "Disable" : "Enable"}
                    </Button>
                  </div>
                </article>
              );
            })}
            {!visibleSkills.length ? (
              <div className="rounded-md border border-[rgba(148,163,184,0.14)] bg-[rgba(10,14,21,0.48)] p-4 text-sm text-[var(--muted)]">
                No Aeon skills found for this profile yet.
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <section className="rounded-lg border border-[rgba(148,163,184,0.16)] bg-[rgba(16,20,29,0.78)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">GitHub Actions</p>
              <h3 className="m-0 text-base font-bold">Recent runs</h3>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-md border border-emerald-300/20 bg-emerald-400/10 px-2 py-1 text-emerald-100">{successfulRuns} ok</span>
              <span className="rounded-md border border-rose-300/20 bg-rose-400/10 px-2 py-1 text-rose-100">{failedRuns} failed</span>
            </div>
          </div>
          <div className="mt-4 grid gap-2">
            {runs.slice(0, 8).map((run) => (
              <article key={run.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[rgba(148,163,184,0.14)] bg-[rgba(10,14,21,0.48)] p-3">
                <div className="min-w-0">
                  <h4 className="m-0 text-sm font-bold text-[var(--foreground)]">{run.name}</h4>
                  <p className="m-0 mt-1 text-xs text-[var(--muted)]">{timeLabel(run.createdAt)} · {run.conclusion || run.status}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2 py-1 text-xs font-bold ${statusTone(run.status)}`}>{run.status}</span>
                  {run.url ? (
                    <a className="inline-flex items-center gap-1 rounded-md border border-[rgba(148,163,184,0.18)] px-2 py-1 text-xs text-[var(--accent-strong)]" href={run.url} target="_blank" rel="noreferrer">
                      <ExternalLink aria-hidden="true" className="h-3 w-3" />
                      Open
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
            {!runs.length ? <EmptyState icon={<Activity aria-hidden="true" />} text="No recent Aeon workflow runs returned yet." /> : null}
          </div>
        </section>

        <section className="rounded-lg border border-[rgba(148,163,184,0.16)] bg-[rgba(16,20,29,0.78)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Outputs</p>
              <h3 className="m-0 text-base font-bold">Latest artifacts</h3>
            </div>
            <Rocket aria-hidden="true" className="h-5 w-5 text-[var(--accent-strong)]" />
          </div>
          <div className="mt-4 grid gap-2">
            {outputs.slice(0, 6).map((output) => (
              <article key={`${output.source}:${output.filename}`} className="grid gap-2 rounded-md border border-[rgba(148,163,184,0.14)] bg-[rgba(10,14,21,0.48)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="m-0 text-sm font-bold text-[var(--foreground)]">{output.skill || output.filename || "Aeon output"}</h4>
                  <span className="rounded-md border border-[rgba(148,163,184,0.14)] px-2 py-1 text-[11px] text-[var(--muted)]">{timeLabel(output.updatedAt)}</span>
                </div>
                <p className="m-0 whitespace-pre-wrap text-xs leading-5 text-[var(--muted)]">{output.excerpt || "No preview text."}</p>
                <div className="flex flex-wrap gap-2 text-[11px] text-[var(--muted)]">
                  <span className="rounded-md border border-[rgba(148,163,184,0.14)] px-2 py-1">{output.source || "outputs"}</span>
                  <span className="rounded-md border border-[rgba(148,163,184,0.14)] px-2 py-1">{output.filename || "file"}</span>
                </div>
              </article>
            ))}
            {!outputs.length ? <EmptyState icon={<FileText aria-hidden="true" />} text="No Aeon output files returned yet." /> : null}
          </div>
        </section>

        <section className="rounded-lg border border-[rgba(148,163,184,0.16)] bg-[rgba(16,20,29,0.78)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Secrets</p>
              <h3 className="m-0 text-base font-bold">GitHub Actions manifest</h3>
            </div>
            <ShieldCheck aria-hidden="true" className="h-5 w-5 text-[var(--accent-strong)]" />
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {SECRET_MANIFEST.map((secret) => (
              <div key={secret.key} className="rounded-md border border-[rgba(148,163,184,0.14)] bg-[rgba(10,14,21,0.48)] p-3">
                <div className="text-sm font-bold text-[var(--foreground)]">{secret.key}</div>
                <div className="mt-1 text-xs text-[var(--muted)]">{secret.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-md border border-[rgba(94,234,212,0.14)] bg-[rgba(20,184,166,0.06)] p-3 text-xs leading-5 text-[var(--muted)]">
            Default sync pushes the core keys only: {DEFAULT_SECRET_KEYS.join(", ")}. Optional notification and provider keys stay visible here as the expected AEON surface.
          </div>
        </section>
      </div>
    </section>
  );
}

function StatusRow({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[rgba(148,163,184,0.12)] bg-[rgba(10,14,21,0.42)] px-3 py-2">
      <span className="text-[var(--muted)]">{label}</span>
      <span className="inline-flex items-center gap-2 text-right text-[var(--foreground)]">
        {ok ? <Check aria-hidden="true" className="h-3.5 w-3.5 text-emerald-200" /> : <GitBranch aria-hidden="true" className="h-3.5 w-3.5 text-amber-200" />}
        {value}
      </span>
    </div>
  );
}

function EmptyState({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-[rgba(148,163,184,0.14)] bg-[rgba(10,14,21,0.48)] p-4 text-sm text-[var(--muted)]">
      <span className="flex h-9 w-9 items-center justify-center rounded-md border border-[rgba(148,163,184,0.16)] text-[var(--accent-strong)] [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
      <span>{text}</span>
    </div>
  );
}
