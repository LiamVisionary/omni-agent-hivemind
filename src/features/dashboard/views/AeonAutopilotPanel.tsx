"use client";

import { forwardRef, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, HTMLAttributes, KeyboardEvent, ReactNode, SetStateAction } from "react";
import Image from "next/image";
import {
  Activity,
  BarChart3,
  Bot,
  Check,
  ChevronLeft,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  FileUp,
  FolderOpen,
  GitBranch,
  KeyRound,
  ListChecks,
  LoaderCircle,
  MemoryStick,
  Play,
  Plus,
  Power,
  RefreshCcw,
  Rocket,
  Search,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";

import fleetStyles from "@/components/fleet/fleet-tokens.module.css";
import { Button } from "@/components/ui/button";
import { CreateFolderRepoModal, type CreateFolderRepoValue } from "@/features/dashboard/views/shared/CreateFolderRepoModal";
import { InlineRenameControl } from "@/features/dashboard/views/shared/InlineRenameControl";
import type { AgentSettingsPanel } from "@/features/dashboard/agent-settings-types";
import type { BrainSkillInventory, BrainSkillSummary, DashboardView, LinkedDirectory, MachineGroup } from "@/features/dashboard/dashboard-types";
import { groupSkills, runtimeSkillToGroupable, type GroupableSkill } from "@/features/dashboard/skill-grouping";
import type { AgentProfile, SharedVaultConfig } from "@/lib/types/agent-runtime";
import type { KanbanMachineTarget } from "@/lib/types/kanban";
import type { RuntimeAnalytics, RuntimeMemorySnapshot, RuntimeRepoSyncStatus, RuntimeRun, RuntimeRunLog, RuntimeSchedule, RuntimeSecretStatus, RuntimeSkill } from "@/lib/services/runtime-adapters/types";

type AeonStatus = {
  ok?: boolean;
  runtime?: string;
  status?: {
    ok?: boolean;
    root?: string;
    repo?: string;
    hasConfig?: boolean;
    a2aReachable?: boolean;
    localSkillCount?: number;
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

type AeonObsidianSyncStatus = {
  ok?: boolean;
  installed?: boolean;
  running?: boolean;
  repoRoot?: string;
  vaultRepoRoot?: string;
  pid?: number;
  logPath?: string;
  command?: string;
  message?: string;
  error?: string;
};

type UploadedSkillFile = { path: string; content: string };
type ConvertScheduleMode = "manual" | "hourly" | "daily" | "weekdays" | "weekly";
type ConvertBriefMode = "description" | "checklist" | "changes" | "summary";
type ConvertAeonDraft = {
  scheduleMode: ConvertScheduleMode;
  hour: string;
  minute: string;
  weekday: string;
  onDuty: boolean;
  briefMode: ConvertBriefMode;
  model: string;
};
type SkillSourceView = "aeon" | "shared";
type SkillAutomationState = "available" | "ready" | "manual" | "on-duty" | "paused";
type UnifiedSkillRow = GroupableSkill & {
  automationState: SkillAutomationState;
  statusLabel: string;
  actionLabel: string;
  sharedSkill?: BrainSkillSummary;
  runtimeSkill?: RuntimeSkill & { runtimeSchedule?: RuntimeSchedule };
};

type AeonAutopilotPanelProps = {
  activeView: DashboardView;
  displayAgents: AgentProfile[];
  selectedAgentId: string;
  setAgents: Dispatch<SetStateAction<AgentProfile[]>>;
  sharedVault: SharedVaultConfig;
  machineGroups?: MachineGroup[];
  chooseDirectoryForMachine?: (machine: KanbanMachineTarget | null, onChoose: (directory: LinkedDirectory) => void) => void | Promise<void>;
  setActiveView: (view: DashboardView) => void;
  setSelectedAgentId: (agentId: string) => void;
  setAgentRoleModalId: (agentId: string) => void;
  setAgentSettingsPanel: Dispatch<SetStateAction<AgentSettingsPanel>>;
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
const OBSIDIAN_SYNC_CACHE_PREFIX = "hivemindos.aeon.obsidianSync.";

function readCachedObsidianSyncStatuses() {
  if (typeof window === "undefined") return {};
  const statuses: Record<string, AeonObsidianSyncStatus> = {};
  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key?.startsWith(OBSIDIAN_SYNC_CACHE_PREFIX)) continue;
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      statuses[key] = JSON.parse(raw) as AeonObsidianSyncStatus;
    }
  } catch {
    return {};
  }
  return statuses;
}

type AeonFleetHexTone = "default" | "active" | "honey";
type AeonDetailView = "overview" | "work" | "activity" | "settings";

const AEON_FLEET_HEX_W = 292;
const AEON_FLEET_HEX_H = 252;
const AEON_FLEET_HEX_X_STEP = AEON_FLEET_HEX_W * 0.75;
const AEON_FLEET_HEX_Y_STEP = AEON_FLEET_HEX_H / 2;

const AEON_FLEET_HEX_TONES: Record<AeonFleetHexTone, { bg: string; border: string; glow: string }> = {
  default: { bg: "linear-gradient(180deg, rgba(13,18,28,0.88), rgba(8,12,20,0.78))", border: "rgba(148,163,184,0.44)", glow: "transparent" },
  active: { bg: "linear-gradient(180deg, rgba(20,184,166,0.34), rgba(8,47,73,0.32))", border: "var(--hex-active-border)", glow: "var(--hex-active-glow)" },
  honey: { bg: "linear-gradient(180deg, rgba(13,18,28,0.88), rgba(8,12,20,0.78))", border: "var(--hex-honey-border)", glow: "rgba(255,212,90,0.18)" },
};

const AEON_FLEET_HEX_CLIP = "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)";

const AeonFleetHex = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement> & {
  tone?: AeonFleetHexTone;
  width?: number;
  height?: number;
}>(function AeonFleetHex({
  tone = "default",
  width = AEON_FLEET_HEX_W,
  height = AEON_FLEET_HEX_H,
  children,
  className = "",
  style,
  ...props
}, ref) {
  const t = AEON_FLEET_HEX_TONES[tone];
  const points = `${width * 0.25},0 ${width * 0.75},0 ${width},${height / 2} ${width * 0.75},${height} ${width * 0.25},${height} 0,${height / 2}`;

  return (
    <div
      ref={ref}
      className={`relative ${className}`}
      style={{
        width,
        height,
        transition: "transform 180ms ease, filter 180ms ease",
        filter: t.glow !== "transparent" ? `drop-shadow(0 0 14px ${t.glow})` : undefined,
        ...style,
      }}
      {...props}
    >
      <div
        className="absolute inset-0"
        style={{
          clipPath: AEON_FLEET_HEX_CLIP,
          background: t.bg,
          backdropFilter: "blur(10px) saturate(140%)",
          WebkitBackdropFilter: "blur(10px) saturate(140%)",
        }}
      />
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ overflow: "visible" }}
      >
        <polygon
          points={points}
          fill="none"
          stroke={t.border}
          strokeWidth={1}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          style={{ transition: "stroke 160ms ease, stroke-width 160ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
});

const AEON_LANES = [
  {
    title: "Choose the work",
    label: "Skills",
    body: "Pick a skill from AEON or the Shared Brain library, then decide whether it should run by hand or on a schedule.",
  },
  {
    title: "Let it run",
    label: "Autopilot",
    body: "AEON can start work now, pause it, or keep it on duty without asking you to manage the underlying files.",
  },
  {
    title: "Review the result",
    label: "Outputs",
    body: "Recent runs and artifacts stay visible here so you can see what happened and open the evidence when needed.",
  },
  {
    title: "Keep it connected",
    label: "Setup",
    body: "Keys, repository sync, and memory are still available, but they live below the main workflow.",
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

const CONVERT_SCHEDULE_OPTIONS: Array<{ value: ConvertScheduleMode; label: string; detail: string }> = [
  { value: "manual", label: "Manual", detail: "Configured in AEON, off duty until you run or enable it." },
  { value: "hourly", label: "Hourly", detail: "Runs at the top of every hour." },
  { value: "daily", label: "Daily", detail: "Runs once per day at the selected time." },
  { value: "weekdays", label: "Weekdays", detail: "Runs Monday through Friday at the selected time." },
  { value: "weekly", label: "Weekly", detail: "Runs weekly on the selected day and time." },
];

const CONVERT_BRIEF_OPTIONS: Array<{ value: ConvertBriefMode; label: string; detail: string }> = [
  { value: "description", label: "Use description", detail: "Best default. AEON receives the skill's own purpose as the run brief." },
  { value: "checklist", label: "Run checklist", detail: "Ask AEON to follow the skill exactly and report completion." },
  { value: "changes", label: "Watch changes", detail: "Use for monitoring, inbox, feed, repo, or status-check skills." },
  { value: "summary", label: "Summarize output", detail: "Use when the result should be a concise reusable artifact." },
];

const CONVERT_MODEL_OPTIONS = [
  { value: "", label: "AEON default" },
  { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
  { value: "claude-opus-4-1", label: "Claude Opus 4.1" },
  { value: "bankr", label: "Bankr gateway" },
];

const CONVERT_WEEKDAYS = [
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
  { value: "0", label: "Sunday" },
];

const CONVERT_HOURS = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, "0"));
const CONVERT_MINUTES = ["00", "15", "30", "45"];

function defaultConvertDraft(): ConvertAeonDraft {
  return {
    scheduleMode: "manual",
    hour: "09",
    minute: "00",
    weekday: "1",
    onDuty: false,
    briefMode: "description",
    model: "",
  };
}

function scheduleFromConvertDraft(draft: ConvertAeonDraft) {
  if (draft.scheduleMode === "manual") return "manual";
  if (draft.scheduleMode === "hourly") return "0 * * * *";
  if (draft.scheduleMode === "daily") return `${Number(draft.minute)} ${Number(draft.hour)} * * *`;
  if (draft.scheduleMode === "weekdays") return `${Number(draft.minute)} ${Number(draft.hour)} * * 1-5`;
  return `${Number(draft.minute)} ${Number(draft.hour)} * * ${draft.weekday}`;
}

function scheduleSummaryFromConvertDraft(draft: ConvertAeonDraft) {
  const time = `${draft.hour}:${draft.minute}`;
  if (draft.scheduleMode === "manual") return "Manual dispatch";
  if (draft.scheduleMode === "hourly") return "Every hour";
  if (draft.scheduleMode === "daily") return `Daily at ${time}`;
  if (draft.scheduleMode === "weekdays") return `Weekdays at ${time}`;
  return `${CONVERT_WEEKDAYS.find((day) => day.value === draft.weekday)?.label ?? "Weekly"} at ${time}`;
}

function convertBrief(skill: BrainSkillSummary, mode: ConvertBriefMode) {
  const base = skill.description || `Run ${skill.name}.`;
  if (mode === "description") return base;
  if (mode === "checklist") return `Use the ${skill.name} skill as written. Complete the checklist, record what changed, and surface any blocker.`;
  if (mode === "changes") return `Use the ${skill.name} skill to watch for meaningful changes. Report only items that require attention.`;
  return `Use the ${skill.name} skill and produce a concise summary with outputs, decisions, and follow-up actions.`;
}

function automationStateForSkill(runtimeSkill?: RuntimeSkill & { runtimeSchedule?: RuntimeSchedule }): SkillAutomationState {
  const schedule = runtimeSkill?.runtimeSchedule;
  if (schedule) {
    if (schedule.every === "manual" || schedule.schedule === "workflow_dispatch") return "manual";
    return schedule.enabled === false ? "paused" : "on-duty";
  }
  if (runtimeSkill) return "ready";
  return "available";
}

function automationLabels(state: SkillAutomationState) {
  if (state === "available") return { statusLabel: "Shared Brain", actionLabel: "Automate with AEON" };
  if (state === "ready") return { statusLabel: "AEON skill", actionLabel: "Automate" };
  if (state === "manual") return { statusLabel: "Automated", actionLabel: "Run" };
  if (state === "on-duty") return { statusLabel: "On duty", actionLabel: "Pause" };
  return { statusLabel: "Paused", actionLabel: "Resume" };
}

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
  if (source === "shared-brain") return "Shared Brain";
  if (source === "aeon-a2a") return "Live AEON";
  if (source === "aeon.yml") return "Automation";
  if (source === "aeon-skill-folder") return "AEON";
  return source || "AEON";
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

function aeonFleetHexPosition(index: number, columns: number) {
  const safeColumns = Math.max(1, columns);
  const row = Math.floor(index / safeColumns);
  const column = index % safeColumns;
  return {
    x: column * AEON_FLEET_HEX_X_STEP,
    y: row * AEON_FLEET_HEX_H + (column % 2) * AEON_FLEET_HEX_Y_STEP,
  };
}

function aeonFleetHoneycombSize(count: number, columns: number) {
  if (count <= 0) return { width: 0, height: 0 };
  const safeColumns = Math.max(1, columns);
  let maxX = 0;
  let maxY = 0;
  for (let index = 0; index < count; index++) {
    const point = aeonFleetHexPosition(index, safeColumns);
    maxX = Math.max(maxX, point.x + AEON_FLEET_HEX_W);
    maxY = Math.max(maxY, point.y + AEON_FLEET_HEX_H);
  }
  return { width: maxX, height: maxY };
}

function aeonWorkspaceKey(agent: AgentProfile) {
  const repo = agent.aeonRepo?.trim().replace(/\.git$/i, "").toLowerCase();
  if (repo) return `repo:${repo}`;
  const path = (agent.aeonLocalPath || agent.localDataDir || "~/.aeon")
    .trim()
    .replace(/^~(?=$|\/)/, "$home")
    .replace(/^\/users\/[^/]+(?=$|\/)/i, "$home")
    .replace(/\/+$/, "")
    .toLowerCase();
  return `path:${path || "$home/.aeon"}`;
}

function aeonModeBadgeLabel(agent: AgentProfile) {
  if (agent.aeonMode === "a2a") return "A2A";
  if (agent.aeonMode === "local") return "Local path";
  return "GitHub";
}

function preferAeonAgent(left: AgentProfile, right: AgentProfile) {
  const score = (agent: AgentProfile) => (
    (agent.aeonMode === "local" ? 8 : 0)
    + (agent.aeonRepoName ? 4 : 0)
    + ((agent.aeonLocalPath || agent.localDataDir)?.startsWith("~") ? 2 : 0)
    + (agent.aeonRepo ? 1 : 0)
  );
  const primary = score(right) > score(left) ? right : left;
  const secondary = primary === left ? right : left;
  return {
    ...secondary,
    ...primary,
    id: primary.id || secondary.id,
    aeonLocalPath: primary.aeonLocalPath || secondary.aeonLocalPath,
    localDataDir: primary.localDataDir || secondary.localDataDir,
    aeonRepo: primary.aeonRepo || secondary.aeonRepo,
    aeonMode: primary.aeonMode || secondary.aeonMode,
  };
}

function aeonMachineCollectorUrl(machine: MachineGroup) {
  if (machine.self) return machine.collectorUrl || "http://127.0.0.1:8787";
  if (machine.ip) return `http://${machine.ip}:8787`;
  return machine.collectorUrl;
}

export function AeonAutopilotPanel({ activeView, displayAgents, selectedAgentId, setAgents, sharedVault, machineGroups = [], chooseDirectoryForMachine, setActiveView, setSelectedAgentId, setAgentRoleModalId, setAgentSettingsPanel }: AeonAutopilotPanelProps) {
  const aeonAgents = useMemo(() => {
    const byWorkspace = new Map<string, AgentProfile>();
    for (const agent of displayAgents.filter((item) => item.runtime === "aeon")) {
      const key = aeonWorkspaceKey(agent);
      const existing = byWorkspace.get(key);
      byWorkspace.set(key, existing ? preferAeonAgent(existing, agent) : agent);
    }
    return [...byWorkspace.values()];
  }, [displayAgents]);
  const selectedAgent = aeonAgents.find((agent) => agent.id === selectedAgentId) ?? aeonAgents[0] ?? DEFAULT_AEON_AGENT;
  const aeonFleetCardCount = aeonAgents.length + 1;
  const aeonFleetListRef = useRef<HTMLDivElement | null>(null);
  const [aeonFleetColumns, setAeonFleetColumns] = useState(3);
  const [panelMode, setPanelMode] = useState<"fleet" | "detail">("fleet");
  const [detailView, setDetailView] = useState<AeonDetailView>("overview");
  const [status, setStatus] = useState<AeonStatus | null>(null);
  const [skills, setSkills] = useState<RuntimeSkill[]>([]);
  const [allSkills, setAllSkills] = useState<BrainSkillInventory | null>(null);
  const [skillSourceView, setSkillSourceView] = useState<SkillSourceView>("aeon");
  const [skillCategoryFilter, setSkillCategoryFilter] = useState("all");
  const [skillSearch, setSkillSearch] = useState("");
  const [selectedSkillSlug, setSelectedSkillSlug] = useState("");
  const [schedules, setSchedules] = useState<RuntimeSchedule[]>([]);
  const [runs, setRuns] = useState<RuntimeRun[]>([]);
  const [outputs, setOutputs] = useState<AeonOutput[]>([]);
  const [analytics, setAnalytics] = useState<RuntimeAnalytics | null>(null);
  const [memory, setMemory] = useState<RuntimeMemorySnapshot | null>(null);
  const [secrets, setSecrets] = useState<RuntimeSecretStatus | null>(null);
  const [repoSync, setRepoSync] = useState<RuntimeRepoSyncStatus | null>(null);
  const [obsidianSyncByKey, setObsidianSyncByKey] = useState<Record<string, AeonObsidianSyncStatus>>(() => readCachedObsidianSyncStatuses());
  const [selectedRunLog, setSelectedRunLog] = useState<RuntimeRunLog | null>(null);
  const [runLogLoading, setRunLogLoading] = useState("");
  const [skillDraft, setSkillDraft] = useState({ schedule: "", var: "", model: "" });
  const [convertSkill, setConvertSkill] = useState<BrainSkillSummary | null>(null);
  const [convertDraft, setConvertDraft] = useState<ConvertAeonDraft>(() => defaultConvertDraft());
  const [importOpen, setImportOpen] = useState(false);
  const [importFiles, setImportFiles] = useState<UploadedSkillFile[]>([]);
  const [importName, setImportName] = useState("");
  const [cloneRepoOpen, setCloneRepoOpen] = useState(false);
  const [cloneRepoUrl, setCloneRepoUrl] = useState("");
  const [createRepoOpen, setCreateRepoOpen] = useState(false);
  const [repoRenameState, setRepoRenameState] = useState({ agentId: "", editing: false, draft: "" });
  const [loading, setLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState("");
  const [message, setMessage] = useState("");
  const obsidianSyncCacheKey = useMemo(() => `${OBSIDIAN_SYNC_CACHE_PREFIX}${aeonWorkspaceKey(selectedAgent)}`, [selectedAgent]);
  const obsidianSync = obsidianSyncByKey[obsidianSyncCacheKey] ?? null;
  const selectedRepoName = selectedAgent.aeonRepoName || selectedAgent.name;
  const repoRenameEditing = repoRenameState.agentId === selectedAgent.id ? repoRenameState.editing : false;
  const repoRenameDraft = repoRenameState.agentId === selectedAgent.id ? repoRenameState.draft : selectedRepoName;
  const aeonRepoProfileAgents = useMemo(() => {
    const selectedWorkspace = aeonWorkspaceKey(selectedAgent);
    const byId = new Map<string, AgentProfile>();
    for (const agent of displayAgents) {
      if (agent.runtime !== "aeon" || aeonWorkspaceKey(agent) !== selectedWorkspace) continue;
      byId.set(agent.id, agent);
    }
    if (!byId.has(selectedAgent.id)) byId.set(selectedAgent.id, selectedAgent);
    return Array.from(byId.values()).sort((left, right) => left.name.localeCompare(right.name));
  }, [displayAgents, selectedAgent]);
  const obsidianMirrorStatus = obsidianSync
    ? obsidianSync.running
      ? `Running${obsidianSync.pid ? ` · ${obsidianSync.pid}` : ""}`
      : obsidianSync.installed === false ? "Unison missing" : "Stopped"
    : "Checking";
  const obsidianMirrorRunning = obsidianSync ? Boolean(obsidianSync.running) : null;
  const updateObsidianSync = useCallback((status: AeonObsidianSyncStatus | null) => {
    setObsidianSyncByKey((current) => {
      if (!status) {
        const next = { ...current };
        delete next[obsidianSyncCacheKey];
        return next;
      }
      return { ...current, [obsidianSyncCacheKey]: status };
    });
    if (typeof window === "undefined") return;
    try {
      if (status) window.localStorage.setItem(obsidianSyncCacheKey, JSON.stringify(status));
      else window.localStorage.removeItem(obsidianSyncCacheKey);
    } catch {
      // localStorage is best-effort UI hydration only.
    }
  }, [obsidianSyncCacheKey]);
  const aeonRepoMachines = useMemo<KanbanMachineTarget[]>(() => {
    const targets = machineGroups
      .filter((machine) => machine.key !== "unassigned" && machine.collector === "ready")
      .map((machine) => ({
        key: machine.key,
        name: machine.self ? `${machine.name} (This Mac)` : machine.name,
        collectorUrl: aeonMachineCollectorUrl(machine),
      }));
    return targets.length ? targets : [{ key: "local", name: "This Mac", collectorUrl: "http://127.0.0.1" }];
  }, [machineGroups]);

  useLayoutEffect(() => {
    if (activeView !== "aeon" || panelMode !== "fleet") return;
    const container = aeonFleetListRef.current;
    if (!container) return;
    const updateColumns = () => {
      const width = container.clientWidth;
      const nextColumns = Math.max(1, Math.min(
        aeonFleetCardCount,
        Math.floor((width - AEON_FLEET_HEX_W) / AEON_FLEET_HEX_X_STEP) + 1,
      ));
      setAeonFleetColumns(nextColumns);
    };
    updateColumns();
    const observer = new ResizeObserver(updateColumns);
    observer.observe(container);
    window.addEventListener("resize", updateColumns);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateColumns);
    };
  }, [activeView, aeonFleetCardCount, panelMode]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const agent = selectedAgent;
      const body = { agent };
      const [nextStatus, nextSkills, nextSchedules, nextRuns, nextOutputs, nextAnalytics, nextMemory, nextSecrets, nextRepoSync, nextObsidianSync, nextAllSkills] = await Promise.all([
        postJson<AeonStatus>("/api/runtimes/aeon/status", body),
        postJson<{ skills?: RuntimeSkill[] }>("/api/runtimes/aeon/skills", { ...body, vaultPath: sharedVault.vaultPath }),
        postJson<{ schedules?: RuntimeSchedule[] }>("/api/runtimes/aeon/schedules", body),
        postJson<{ runs?: RuntimeRun[] }>("/api/runtimes/aeon/runs", body),
        postJson<{ outputs?: AeonOutput[] }>("/api/runtimes/aeon/outputs", body),
        postJson<{ analytics?: RuntimeAnalytics }>("/api/runtimes/aeon/analytics", { ...body, vaultPath: sharedVault.vaultPath }),
        postJson<{ memory?: RuntimeMemorySnapshot }>("/api/runtimes/aeon/memory", body),
        postJson<{ secrets?: RuntimeSecretStatus }>("/api/runtimes/aeon/secrets/status", { ...body, vaultPath: sharedVault.vaultPath }),
        postJson<{ status?: RuntimeRepoSyncStatus }>("/api/runtimes/aeon/repo/sync", { ...body, action: "status" }),
        postJson<AeonObsidianSyncStatus>("/api/runtimes/aeon/obsidian-sync", { ...body, vaultPath: sharedVault.vaultPath, action: "status" }).catch((error) => ({
          ok: false,
          installed: false,
          running: false,
          error: error instanceof Error ? error.message : "AEON Obsidian sync status failed.",
        })),
        fetch(`/api/obsidian/skills?vaultPath=${encodeURIComponent(sharedVault.vaultPath || "")}`, { cache: "no-store" }).then((response) => response.ok ? response.json() : null).catch(() => null),
      ]);
      setStatus(nextStatus);
      setSkills(nextSkills.skills ?? []);
      setSchedules(nextSchedules.schedules ?? []);
      setRuns(nextRuns.runs ?? []);
      setOutputs(nextOutputs.outputs ?? []);
      setAnalytics(nextAnalytics.analytics ?? null);
      setMemory(nextMemory.memory ?? null);
      setSecrets(nextSecrets.secrets ?? null);
      setRepoSync(nextRepoSync.status ?? null);
      updateObsidianSync(nextObsidianSync ?? null);
      if (nextAllSkills?.ok) setAllSkills(nextAllSkills as BrainSkillInventory);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Aeon refresh failed.");
    } finally {
      setLoading(false);
    }
  }, [selectedAgent, sharedVault.vaultPath, updateObsidianSync]);

  useEffect(() => {
    if (activeView !== "aeon") return;
    const handle = window.setTimeout(() => setPanelMode("fleet"), 0);
    return () => window.clearTimeout(handle);
  }, [activeView]);

  useEffect(() => {
    if (activeView !== "aeon") return;
    const pendingDetailAgentId = window.sessionStorage.getItem("hivemindos.aeon.openDetailAgentId");
    if (pendingDetailAgentId) {
      window.sessionStorage.removeItem("hivemindos.aeon.openDetailAgentId");
      const handle = window.setTimeout(() => {
        setSelectedAgentId(pendingDetailAgentId);
        setPanelMode("detail");
      }, 0);
      return () => window.clearTimeout(handle);
    }
  }, [activeView, selectedAgentId, setSelectedAgentId]);

  useEffect(() => {
    if (activeView !== "aeon" || panelMode !== "detail") return;
    const handle = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(handle);
  }, [activeView, panelMode, refresh]);

  function upsertAeonWorkspaceAgent(agent: AgentProfile) {
    let selectedId = agent.id;
    setAgents((current) => {
      const existingIndex = current.findIndex((item) => (
        item.id === agent.id
        || (item.runtime === "aeon" && agent.runtime === "aeon" && Boolean(item.aeonLocalPath || item.localDataDir) && (item.aeonLocalPath || item.localDataDir) === (agent.aeonLocalPath || agent.localDataDir))
        || (item.runtime === "aeon" && agent.runtime === "aeon" && Boolean(item.aeonRepo) && item.aeonRepo === agent.aeonRepo)
      ));
      if (existingIndex === -1) return [...current, agent];
      selectedId = current[existingIndex]?.id || agent.id;
      return current.map((item, index) => index === existingIndex ? { ...item, ...agent, id: selectedId } : item);
    });
    setSelectedAgentId(selectedId);
    setPanelMode("detail");
  }

  async function runWorkspaceAction(action: "initialize" | "link" | "clone", input: Record<string, string> = {}) {
    setActionBusy(`workspace:${action}`);
    setMessage("");
    try {
      const data = await postJson<{ agent?: AgentProfile; root?: string }>("/api/runtimes/aeon/workspaces", {
        action,
        ...input,
      });
      if (!data.agent) throw new Error("AEON workspace was prepared, but no profile was returned.");
      upsertAeonWorkspaceAgent(data.agent);
      const mirror = await postJson<AeonObsidianSyncStatus>("/api/runtimes/aeon/obsidian-sync", {
        agent: data.agent,
        vaultPath: sharedVault.vaultPath,
        action: "start",
      }).catch((error) => ({
        ok: false,
        installed: false,
        running: false,
        error: error instanceof Error ? error.message : "AEON Obsidian mirror did not start.",
      }));
      updateObsidianSync(mirror);
      setCloneRepoOpen(false);
      setCloneRepoUrl("");
      setCreateRepoOpen(false);
      setMessage(mirror.running
        ? `Linked AEON repo workspace at ${data.root || data.agent.aeonLocalPath || data.agent.localDataDir}. Obsidian mirror is running.`
        : `Linked AEON repo workspace at ${data.root || data.agent.aeonLocalPath || data.agent.localDataDir}. ${mirror.error || "Obsidian mirror is not running yet."}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not prepare AEON workspace.");
    } finally {
      setActionBusy("");
    }
  }

  async function renameSelectedWorkspace(nextName: string) {
    setActionBusy("workspace:rename");
    setMessage("");
    try {
      const data = await postJson<{ agent?: AgentProfile; root?: string }>("/api/runtimes/aeon/workspaces", {
        action: "rename",
        agent: selectedAgent,
        name: nextName,
      });
      if (!data.agent) throw new Error("AEON workspace was renamed, but no profile was returned.");
      const nextAgent = { ...selectedAgent, ...data.agent, id: selectedAgent.id };
      setAgents((current) => {
        const existing = current.some((agent) => agent.id === selectedAgent.id);
        return existing
          ? current.map((agent) => agent.id === selectedAgent.id ? nextAgent : agent)
          : [...current, nextAgent];
      });
      setSelectedAgentId(selectedAgent.id);
      setRepoRenameState({ agentId: selectedAgent.id, editing: false, draft: nextAgent.aeonRepoName || nextAgent.name });
      updateObsidianSync(null);
      setMessage(`Renamed AEON repo folder to ${nextAgent.aeonRepoName || nextAgent.name}${data.root ? ` at ${data.root}` : ""}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not rename AEON repo folder.");
    } finally {
      setActionBusy("");
    }
  }

  async function createAeonWorkspace(value: CreateFolderRepoValue) {
    await runWorkspaceAction("initialize", {
      name: value.name,
      path: value.fullPath,
      machineName: value.machine.name,
      machineKey: value.machine.key,
      collectorUrl: value.machine.collectorUrl || "",
    });
  }

  async function browseCreateRepoLocation(machine: KanbanMachineTarget, onChoose: (directory: LinkedDirectory) => void) {
    if (chooseDirectoryForMachine) {
      await chooseDirectoryForMachine(machine, onChoose);
      return;
    }
    const response = await fetch("/api/agents/browse-folder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPath: "~/.aeon-repos", prompt: "Choose a parent folder for the new AEON repo:" }),
    }).catch(() => null);
    const data = await response?.json().catch(() => null) as { path?: string } | null;
    const path = data?.path?.trim();
    if (!response?.ok || !path) return;
    onChoose({
      id: `${path}-${crypto.randomUUID()}`,
      name: path.replace(/\/+$/, "").split("/").filter(Boolean).at(-1) || path,
      path,
      machineName: machine.name,
      machineKey: machine.key,
      lastUsedAt: Date.now(),
    });
  }

  async function browseAeonWorkspace() {
    setActionBusy("workspace:browse");
    setMessage("");
    try {
      const response = await fetch("/api/agents/browse-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPath: selectedAgent.aeonLocalPath || selectedAgent.localDataDir || "~", prompt: "Choose an existing AEON repo folder:" }),
      });
      const data = await response.json().catch(() => null) as { path?: string; cancelled?: boolean; error?: string } | null;
      if (data?.path) {
        await runWorkspaceAction("link", { path: data.path });
      } else if (!data?.cancelled) {
        setMessage(data?.error ?? "Choose an AEON repo folder.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not browse for an AEON repo.");
    } finally {
      setActionBusy("");
    }
  }

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

  async function loadRunLog(run: RuntimeRun) {
    setRunLogLoading(run.id);
    setMessage("");
    try {
      const data = await postJson<{ log?: RuntimeRunLog }>("/api/runtimes/aeon/runs/logs", { agent: selectedAgent, runId: run.id });
      setSelectedRunLog(data.log ?? null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load Aeon run logs.");
    } finally {
      setRunLogLoading("");
    }
  }

  async function updateSelectedSkill(action: "schedule" | "var" | "model", value: string) {
    const targetSlug = selectedSkill?.slug || selectedSkillSlug;
    if (!targetSlug) return;
    setActionBusy(`${action}:${targetSlug}`);
    setMessage("");
    try {
      await postJson("/api/runtimes/aeon/skills/config", { agent: selectedAgent, skill: targetSlug, action, value });
      setMessage(`Updated ${targetSlug} ${action}.`);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update Aeon skill.");
    } finally {
      setActionBusy("");
    }
  }

  function openConvertModal(skill: BrainSkillSummary) {
    setConvertSkill(skill);
    setConvertDraft(defaultConvertDraft());
    setMessage("");
  }

  async function convertSharedSkillToAeon() {
    if (!convertSkill) return;
    const target = convertSkill;
    const schedule = scheduleFromConvertDraft(convertDraft);
    const brief = convertBrief(target, convertDraft.briefMode);
    setActionBusy(`convert:${target.slug}`);
    setMessage("");
    try {
      await postJson<{ result?: { synced?: unknown[]; skipped?: unknown[] } }>("/api/runtimes/aeon/skills/sync", {
        agent: selectedAgent,
        vaultPath: sharedVault.vaultPath,
      });
      await postJson("/api/runtimes/aeon/skills/config", { agent: selectedAgent, skill: target.slug, action: "schedule", value: schedule });
      await postJson("/api/runtimes/aeon/skills/config", { agent: selectedAgent, skill: target.slug, action: "var", value: brief });
      await postJson("/api/runtimes/aeon/skills/config", { agent: selectedAgent, skill: target.slug, action: "model", value: convertDraft.model });
      await postJson("/api/runtimes/aeon/skills/config", { agent: selectedAgent, skill: target.slug, action: convertDraft.onDuty ? "enable" : "disable", value: convertDraft.onDuty });
      setConvertSkill(null);
      setSkillSourceView("aeon");
      setSelectedSkillSlug(target.slug);
      setSkillDraft({ schedule, var: brief, model: convertDraft.model });
      setMessage(`Converted ${target.name} to AEON as ${convertDraft.onDuty ? "on duty" : "off duty"} · ${scheduleSummaryFromConvertDraft(convertDraft)}.`);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not convert shared skill to AEON.");
    } finally {
      setActionBusy("");
    }
  }

  async function automateAeonSkill(skill: RuntimeSkill) {
    setActionBusy(`automate:${skill.slug}`);
    setMessage("");
    try {
      const data = await postJson<{ result?: { automationYaml?: string } }>("/api/runtimes/aeon/skills/config", {
        agent: selectedAgent,
        skill: skill.slug,
        action: "automate",
        value: skill.description || "",
      });
      setSelectedSkillSlug(skill.slug);
      setSkillDraft({ schedule: "manual", var: skill.description || "", model: "" });
      const yaml = data.result?.automationYaml || skill.automationYaml;
      setMessage(yaml ? `Automated ${skill.name} from ${yaml}. It is off duty until you run or enable it.` : `Automated ${skill.name}. It is off duty until you run or enable it.`);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not automate AEON skill.");
    } finally {
      setActionBusy("");
    }
  }

  async function runRepoAction(action: "pull" | "push") {
    setActionBusy(`repo:${action}`);
    setMessage("");
    try {
      const data = await postJson<{ status?: RuntimeRepoSyncStatus; message?: string }>("/api/runtimes/aeon/repo/sync", { agent: selectedAgent, action });
      setRepoSync(data.status ?? null);
      setMessage(data.message || `Aeon repo ${action} complete.`);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `Aeon repo ${action} failed.`);
    } finally {
      setActionBusy("");
    }
  }

  async function runObsidianSyncAction(action: "start" | "stop" | "once") {
    setActionBusy(`obsidian-sync:${action}`);
    setMessage("");
    try {
      const data = await postJson<AeonObsidianSyncStatus>("/api/runtimes/aeon/obsidian-sync", {
        agent: selectedAgent,
        vaultPath: sharedVault.vaultPath,
        action,
      });
      updateObsidianSync(data);
      setMessage(data.message || data.error || "AEON Obsidian sync updated.");
      if (action === "once") await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "AEON Obsidian sync failed.");
    } finally {
      setActionBusy("");
    }
  }

  async function importUploadedSkill() {
    if (!importFiles.length) return;
    setActionBusy("import-skill");
    setMessage("");
    try {
      const response = await fetch("/api/obsidian/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vaultPath: sharedVault.vaultPath, files: importFiles, name: importName.trim() || undefined }),
      });
      const data = await response.json().catch(() => null) as { ok?: boolean; error?: string } | null;
      if (!response.ok || data?.ok === false) throw new Error(data?.error || "Skill import failed.");
      setImportOpen(false);
      setImportFiles([]);
      setImportName("");
      setMessage("Imported skill folder into Shared Brain. Sync skills to mirror it into AEON.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Skill import failed.");
    } finally {
      setActionBusy("");
    }
  }

  async function readUploadedFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    const files: UploadedSkillFile[] = [];
    for (const file of Array.from(fileList)) {
      files.push({ path: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name, content: await file.text() });
    }
    setImportFiles(files);
    const skillFile = files.find((file) => /(^|\/)SKILL\.md$/i.test(file.path));
    const name = skillFile?.content.match(/^name:\s*["']?(.+?)["']?\s*$/m)?.[1]?.trim();
    if (name) setImportName(name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
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
  const runtimeSkillBySlug = new Map(visibleSkills.map((skill) => [skill.slug, skill]));
  const sharedSkillBySlug = new Map((allSkills?.shared ?? []).map((skill) => [skill.slug, skill]));
  const skillSlugsForView = skillSourceView === "aeon" ? runtimeSkillBySlug.keys() : sharedSkillBySlug.keys();
  const unifiedSkillRows: UnifiedSkillRow[] = [...skillSlugsForView].map((slug) => {
    const sharedSkill = sharedSkillBySlug.get(slug);
    const runtimeSkill = runtimeSkillBySlug.get(slug);
    const state = automationStateForSkill(runtimeSkill);
    const labels = automationLabels(state);
    const groupable = runtimeSkill ? runtimeSkillToGroupable(runtimeSkill) : {
      slug,
      name: sharedSkill?.name ?? slug,
      description: sharedSkill?.description ?? "",
      source: "Shared Brain",
      providerLabel: sharedSkill?.providerLabel,
      enabled: true,
      imported: true,
    };
    return {
      ...groupable,
      automationState: state,
      statusLabel: labels.statusLabel,
      actionLabel: labels.actionLabel,
      sharedSkill,
      runtimeSkill,
    };
  });
  const groupedSkills = groupSkills<UnifiedSkillRow>(
    unifiedSkillRows,
    skillSearch,
  );
  const categoryFilterOptions = groupedSkills.map((group) => ({
    id: group.id,
    label: group.label,
    count: group.skills.length,
    color: group.color,
  }));
  const visibleSkillRows = groupedSkills
    .filter((group) => skillCategoryFilter === "all" || group.id === skillCategoryFilter)
    .flatMap((group) => group.skills.map((skill) => ({
      ...skill,
      categoryLabel: group.label,
      categoryColor: group.color,
    })));
  const selectedSkill = visibleSkills.find((skill) => skill.slug === selectedSkillSlug) ?? visibleSkills[0];
  const selectedSkillRuns = selectedSkill ? runs.filter((run) => run.name.toLowerCase().includes(selectedSkill.slug.toLowerCase()) || run.name.toLowerCase().includes(selectedSkill.name.toLowerCase())) : [];
  const selectedSchedule = selectedSkill ? schedules.find((schedule) => schedule.id === selectedSkill.slug) : undefined;
  const selectedDraftActive = selectedSkill ? selectedSkillSlug === selectedSkill.slug || !selectedSkillSlug : false;
  const selectedDraft = {
    schedule: selectedDraftActive ? skillDraft.schedule : selectedSchedule?.every || selectedSkill?.schedule || "",
    var: selectedDraftActive ? skillDraft.var : selectedSkill?.var || selectedSchedule?.message || "",
    model: selectedDraftActive ? skillDraft.model : selectedSkill?.model || String(selectedSchedule?.metadata?.model || ""),
  };
  const sharedBrainCount = allSkills?.shared.length ?? 0;
  const a2aSkillCount = skills.filter((skill) => skill.source === "aeon-a2a").length;
  const scheduledSkillCount = visibleSkills.filter((skill) => Boolean(skill.runtimeSchedule)).length;
  const localAeonSkillCount = status?.status?.localSkillCount ?? 0;
  const setupItems = [
    { label: "Local AEON folder", ok: Boolean(status?.status?.root || selectedAgent.aeonLocalPath || selectedAgent.localDataDir), detail: status?.status?.root || selectedAgent.aeonLocalPath || selectedAgent.localDataDir || "~/.aeon" },
    { label: "aeon.yml config", ok: Boolean(status?.status?.hasConfig), detail: status?.status?.hasConfig ? "Readable" : "Missing" },
    { label: "GitHub repo", ok: Boolean(status?.status?.repo || selectedAgent.aeonRepo), detail: status?.status?.repo || selectedAgent.aeonRepo || "Not configured" },
    { label: "A2A card", ok: Boolean(status?.status?.a2aReachable), detail: status?.status?.a2aReachable ? "Reachable" : selectedAgent.a2aUrl || selectedAgent.gatewayUrl || "Offline" },
    { label: "Shared Brain", ok: sharedBrainCount > 0, detail: `${sharedBrainCount} skills` },
    { label: "Recent workflow", ok: runs.length > 0, detail: latestRunLabel(runs) },
  ];
  const inventoryRows = [
    { label: "AEON", value: localAeonSkillCount || visibleSkills.length },
    { label: "Shared Brain", value: sharedBrainCount },
    { label: "Automated", value: scheduledSkillCount },
    { label: "On duty", value: enabledSchedules.length },
    { label: "A2A", value: a2aSkillCount },
  ];
  const aeonFleetHoneycomb = aeonFleetHoneycombSize(aeonFleetCardCount, aeonFleetColumns);
  const aeonEmptyText = "No AEON skill files are visible for this profile yet. Sync or import skills to AEON, or use Shared Brain to automate one.";
  const detailTabs: Array<{ id: AeonDetailView; label: string; detail: string }> = [
    { id: "overview", label: "Overview", detail: "Status and next actions" },
    { id: "work", label: "Work", detail: "Skills and automation" },
    { id: "activity", label: "Activity", detail: "Runs and outputs" },
    { id: "settings", label: "Settings", detail: "Repo, keys, memory" },
  ];
  const activateFleetCard = (action: () => void) => (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    action();
  };

  if (panelMode === "fleet") {
    return (
      <section className={`${fleetStyles.root} grid gap-4`}>
        <div className="relative overflow-hidden rounded-lg border border-[rgba(148,163,184,0.16)] bg-[linear-gradient(135deg,rgba(10,14,21,0.94),rgba(18,28,35,0.88)_45%,rgba(16,20,29,0.92))] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.24)]">
          <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(94,234,212,0.65),transparent)]" />
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="grid gap-2">
              <p className="eyebrow">AEON Fleet</p>
              <h2 className="m-0 text-xl font-bold text-[var(--foreground)]">Choose an AEON repo</h2>
              <p className="m-0 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                One AEON repo is a workspace. Open a repo for its skills, schedules, runs, outputs, keys, memory, and GitHub sync.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-[var(--muted)]">
              <span className="rounded-md border border-[rgba(94,234,212,0.20)] bg-[rgba(20,184,166,0.08)] px-2 py-1 text-[var(--accent-strong)]">{aeonAgents.length} AEON repo{aeonAgents.length === 1 ? "" : "s"}</span>
              <span className="rounded-md border border-[rgba(148,163,184,0.16)] bg-[rgba(10,14,21,0.52)] px-2 py-1">Obsidian mirror</span>
            </div>
          </div>
          {message ? (
            <p className="mt-4 rounded-md border border-[rgba(148,163,184,0.16)] bg-[rgba(10,14,21,0.64)] px-3 py-2 text-sm text-[var(--foreground)]">{message}</p>
          ) : null}
        </div>

        {createRepoOpen ? (
          <CreateFolderRepoModal
            open={createRepoOpen}
            eyebrow="AEON repo"
            title="Create AEON repo"
            description="Choose a name and parent folder. HivemindOS will initialize the repo and save the profile to Obsidian automatically."
            nameLabel="Repo name"
            pathLabel="Parent folder"
            defaultName="aeon-workspace"
            defaultParentPath="~/.aeon-repos"
            submitLabel="Create repo"
            busy={actionBusy === "workspace:initialize"}
            machines={aeonRepoMachines}
            icon={<Rocket aria-hidden="true" className="h-5 w-5" />}
            onClose={() => setCreateRepoOpen(false)}
            onBrowseDirectory={browseCreateRepoLocation}
            onSubmit={createAeonWorkspace}
          />
        ) : null}

        {aeonAgents.length === 0 ? (
          <section className="grid gap-4 rounded-lg border border-[rgba(148,163,184,0.16)] bg-[rgba(16,20,29,0.78)] p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="grid gap-2">
                <p className="eyebrow">No AEON repo linked</p>
                <h3 className="m-0 text-lg font-bold text-[var(--foreground)]">Connect a workspace before adding jobs</h3>
                <p className="m-0 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                  HivemindOS will save the repo profile in Obsidian automatically under {`Agents/AEON/<repo>/`}.
                </p>
              </div>
              <span className="relative h-16 w-16 overflow-hidden rounded-2xl border border-[rgba(94,234,212,0.24)] bg-[rgba(20,184,166,0.08)]">
                <Image src="/icons/runtimes/aeon.png?v=20260526-runtime-icons-2" alt="" aria-hidden="true" fill sizes="64px" className="object-contain" unoptimized />
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <button type="button" className="grid gap-2 rounded-md border border-[rgba(94,234,212,0.24)] bg-[rgba(20,184,166,0.08)] p-4 text-left hover:bg-[rgba(20,184,166,0.12)]" onClick={() => setCreateRepoOpen(true)} disabled={actionBusy === "workspace:initialize"}>
                <span className="flex items-center gap-2 text-sm font-bold text-[var(--foreground)]">{actionBusy === "workspace:initialize" ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Plus aria-hidden="true" />} Create local repo</span>
                <span className="text-xs leading-5 text-[var(--muted)]">Name it, choose a machine, and pick where it should live.</span>
              </button>
              <button type="button" className="grid gap-2 rounded-md border border-[rgba(148,163,184,0.16)] bg-[rgba(10,14,21,0.38)] p-4 text-left hover:bg-[rgba(94,234,212,0.08)]" onClick={() => void browseAeonWorkspace()} disabled={actionBusy === "workspace:browse"}>
                <span className="flex items-center gap-2 text-sm font-bold text-[var(--foreground)]">{actionBusy === "workspace:browse" ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <FolderOpen aria-hidden="true" />} Browse existing</span>
                <span className="text-xs leading-5 text-[var(--muted)]">Choose a local AEON repo folder already on this machine.</span>
              </button>
              <button type="button" className="grid gap-2 rounded-md border border-[rgba(148,163,184,0.16)] bg-[rgba(10,14,21,0.38)] p-4 text-left hover:bg-[rgba(94,234,212,0.08)]" onClick={() => setCloneRepoOpen((open) => !open)}>
                <span className="flex items-center gap-2 text-sm font-bold text-[var(--foreground)]"><GitBranch aria-hidden="true" /> Clone from GitHub</span>
                <span className="text-xs leading-5 text-[var(--muted)]">Clone a GitHub AEON repo into `~/.aeon-repos/` and link it.</span>
              </button>
            </div>
            {cloneRepoOpen ? (
              <div className="grid gap-3 rounded-md border border-[rgba(94,234,212,0.18)] bg-[rgba(20,184,166,0.06)] p-3">
                <label className="grid gap-1 text-xs text-[var(--muted)]">
                  GitHub repo URL
                  <input value={cloneRepoUrl} onChange={(event) => setCloneRepoUrl(event.target.value)} placeholder="https://github.com/owner/repo.git" className="rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(2,6,23,0.50)] px-3 py-2 text-sm text-[var(--foreground)] outline-none" />
                </label>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => setCloneRepoOpen(false)}>Cancel</Button>
                  <Button type="button" onClick={() => void runWorkspaceAction("clone", { repoUrl: cloneRepoUrl })} disabled={!cloneRepoUrl.trim() || actionBusy === "workspace:clone"}>
                    {actionBusy === "workspace:clone" ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Download aria-hidden="true" />}
                    Clone and link
                  </Button>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {aeonAgents.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={() => setCreateRepoOpen(true)} disabled={actionBusy === "workspace:initialize"}>
              {actionBusy === "workspace:initialize" ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Plus aria-hidden="true" />}
              New AEON repo
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => void browseAeonWorkspace()} disabled={actionBusy === "workspace:browse"}>
              {actionBusy === "workspace:browse" ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <FolderOpen aria-hidden="true" />}
              Browse repo
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setCloneRepoOpen((open) => !open)}>
              <GitBranch aria-hidden="true" />
              Clone repo
            </Button>
          </div>
        ) : null}

        {aeonAgents.length > 0 && cloneRepoOpen ? (
          <div className="grid gap-3 rounded-lg border border-[rgba(94,234,212,0.18)] bg-[rgba(20,184,166,0.06)] p-3">
            <label className="grid gap-1 text-xs text-[var(--muted)]">
              GitHub repo URL
              <input value={cloneRepoUrl} onChange={(event) => setCloneRepoUrl(event.target.value)} placeholder="https://github.com/owner/repo.git" className="rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(2,6,23,0.50)] px-3 py-2 text-sm text-[var(--foreground)] outline-none" />
            </label>
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setCloneRepoOpen(false)}>Cancel</Button>
              <Button type="button" onClick={() => void runWorkspaceAction("clone", { repoUrl: cloneRepoUrl })} disabled={!cloneRepoUrl.trim() || actionBusy === "workspace:clone"}>
                {actionBusy === "workspace:clone" ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Download aria-hidden="true" />}
                Clone and link
              </Button>
            </div>
          </div>
        ) : null}

        <div
          ref={aeonFleetListRef}
          className="relative isolate"
          role="list"
          aria-label="AEON repos"
          style={{ minHeight: aeonFleetHoneycomb.height }}
        >
          <AeonFleetHex
            width={AEON_FLEET_HEX_W}
            height={AEON_FLEET_HEX_H}
            tone="active"
            role="listitem"
            tabIndex={0}
            aria-label="Create new AEON repo"
            data-aeon-fleet-hex="create"
            className="group absolute z-10 cursor-pointer hover:scale-[1.025] focus:outline-none focus-visible:drop-shadow-[0_0_18px_rgba(94,234,212,0.62)]"
            style={{
              position: "absolute",
              left: aeonFleetHexPosition(0, aeonFleetColumns).x,
              top: aeonFleetHexPosition(0, aeonFleetColumns).y,
            }}
            onClick={() => setCreateRepoOpen(true)}
            onKeyDown={activateFleetCard(() => setCreateRepoOpen(true))}
          >
            <span className="grid w-[62%] justify-items-center gap-2 text-center [line-height:normal]">
              <span className="relative h-16 w-16 transition group-hover:scale-105">
                <span className="absolute inset-0 overflow-hidden rounded-lg border border-[rgba(94,234,212,0.28)] bg-[radial-gradient(circle_at_50%_38%,rgba(94,234,212,0.18),rgba(10,14,21,0.28)_62%)] p-1">
                  <Image src="/icons/runtimes/aeon.png?v=20260526-runtime-icons-2" alt="" aria-hidden="true" fill sizes="64px" className="object-contain drop-shadow-[0_10px_22px_rgba(94,234,212,0.22)]" unoptimized />
                </span>
                <span className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(94,234,212,0.42)] bg-[rgba(10,14,21,0.94)] text-[var(--accent-strong)]">
                  {actionBusy === "workspace:initialize" ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Plus aria-hidden="true" className="h-4 w-4" />}
                </span>
              </span>
              <span className="text-sm font-bold leading-5 text-[var(--foreground)]">New AEON repo</span>
              <span className="text-xs leading-4 text-[var(--muted)]">
                Name it and choose its location.
              </span>
            </span>
          </AeonFleetHex>
          {aeonAgents.map((agent, agentIndex) => {
            const gitBacked = Boolean(agent.aeonRepo?.trim());
            return (
              <AeonFleetHex
                key={agent.id}
                width={AEON_FLEET_HEX_W}
                height={AEON_FLEET_HEX_H}
                tone="default"
                role="listitem"
                tabIndex={0}
                aria-label={`Open AEON repo ${agent.aeonRepoName || agent.name}`}
                data-aeon-fleet-hex="repo"
                className="absolute z-10 cursor-pointer hover:scale-[1.025] focus:outline-none focus-visible:drop-shadow-[0_0_18px_rgba(94,234,212,0.42)]"
                style={{
                  position: "absolute",
                  left: aeonFleetHexPosition(agentIndex + 1, aeonFleetColumns).x,
                  top: aeonFleetHexPosition(agentIndex + 1, aeonFleetColumns).y,
                }}
                onClick={() => {
                  setSelectedAgentId(agent.id);
                  setPanelMode("detail");
                }}
                onKeyDown={activateFleetCard(() => {
                  setSelectedAgentId(agent.id);
                  setPanelMode("detail");
                })}
              >
                <span data-aeon-fleet-content="repo" className="grid w-[62%] max-w-[176px] justify-items-center gap-1.5 text-center [line-height:normal]">
                  <span className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded border border-[rgba(94,234,212,0.28)] bg-[rgba(20,184,166,0.08)] p-0.5 shadow-[0_8px_22px_rgba(0,0,0,0.26)]">
                    <Image src={agent.aeonLogoUrl || "/icons/runtimes/aeon.png?v=20260526-runtime-icons-2"} alt="" aria-hidden="true" fill sizes="44px" className="object-cover" unoptimized />
                  </span>
                  <span className="grid min-w-0 justify-items-center gap-0.5">
                    <span className="min-w-0 break-words text-[18px] font-bold leading-[1.05] text-[var(--foreground)]">{agent.aeonRepoName || agent.name}</span>
                    <span className="min-w-0 break-words text-[10px] font-semibold uppercase leading-3 text-[var(--muted)]">{agent.name}</span>
                  </span>
                  <span className="flex flex-wrap justify-center gap-1">
                    <span
                      className="rounded-full border border-[rgba(94,234,212,0.36)] bg-[rgba(20,184,166,0.14)] px-2 py-0.5 text-[10px] font-bold uppercase leading-3 text-[var(--accent-strong)] shadow-[0_8px_20px_rgba(20,184,166,0.12)]"
                      title="Where this AEON workspace is configured from."
                    >
                      {aeonModeBadgeLabel(agent)}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase leading-3 shadow-[0_8px_20px_rgba(0,0,0,0.16)] ${
                        gitBacked
                          ? "border-[rgba(74,222,128,0.34)] bg-[rgba(34,197,94,0.13)] text-emerald-200"
                          : "border-[rgba(251,191,36,0.32)] bg-[rgba(245,158,11,0.12)] text-amber-200"
                      }`}
                      title={gitBacked ? "Git repo configured." : "No Git repo configured; this AEON workspace is local-only."}
                    >
                      {gitBacked ? "Online" : "Offline"}
                    </span>
                  </span>
                  <span className="grid w-full gap-1 text-[10px] leading-3 text-[var(--muted)]">
                    <AeonFleetMeta label="Folder" value={agent.aeonLocalPath || agent.localDataDir || "~/.aeon"} />
                    <AeonFleetMeta label="Repo" value={agent.aeonRepo || "Not connected"} />
                  </span>
                  <span className="flex flex-wrap justify-center gap-1 text-[9px] font-semibold leading-3 text-[var(--muted)]">
                    <span className="rounded border border-[rgba(148,163,184,0.18)] bg-[rgba(15,23,42,0.62)] px-1.5 py-0.5">{agent.useSharedVault === false ? "Private" : "Brain"}</span>
                    <span className="rounded border border-[rgba(148,163,184,0.18)] bg-[rgba(15,23,42,0.62)] px-1.5 py-0.5">{agent.aeonBranch || "main"}</span>
                  </span>
                </span>
              </AeonFleetHex>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section className={`grid gap-4 ${detailView === "settings" ? "xl:grid-cols-2 xl:items-start" : ""}`}>
      <div className={`relative overflow-hidden rounded-lg border border-[rgba(148,163,184,0.16)] bg-[linear-gradient(135deg,rgba(10,14,21,0.94),rgba(18,28,35,0.88)_45%,rgba(16,20,29,0.92))] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.24)] ${detailView === "settings" ? "xl:col-span-2" : ""}`}>
        <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(94,234,212,0.65),transparent)]" />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="grid min-w-0 gap-2">
            <p className="eyebrow">Aeon Autopilot</p>
            <InlineRenameControl
              value={selectedRepoName}
              draft={repoRenameDraft}
              editing={repoRenameEditing}
              inputId="aeon-repo-name"
              inputAriaLabel="AEON repo name"
              editAriaLabel="Rename AEON repo"
              saveAriaLabel="Save AEON repo name"
              cancelAriaLabel="Cancel AEON repo rename"
              busy={actionBusy === "workspace:rename"}
              formClassName="flex min-w-0 flex-wrap items-center gap-2"
              inputClassName="min-h-10 w-full min-w-0 max-w-[420px] rounded-md border border-[rgba(94,234,212,0.32)] bg-[rgba(10,14,21,0.72)] px-3 text-xl font-bold text-[var(--foreground)] outline-none transition focus:border-[rgba(94,234,212,0.58)]"
              saveButtonClassName="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[rgba(94,234,212,0.28)] bg-[rgba(20,184,166,0.12)] text-[var(--accent-strong)] transition hover:border-[rgba(94,234,212,0.48)] hover:bg-[rgba(20,184,166,0.18)] disabled:cursor-not-allowed disabled:opacity-45 [&_svg]:h-4 [&_svg]:w-4"
              editButtonClassName="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-transparent bg-transparent text-[var(--accent-strong)] transition hover:bg-[rgba(20,184,166,0.10)] hover:text-[#99f6e4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(45,212,191,0.35)] [&_svg]:h-4 [&_svg]:w-4"
              onDraftChange={(draft) => setRepoRenameState({ agentId: selectedAgent.id, editing: true, draft })}
              onStartEditing={() => {
                setRepoRenameState({ agentId: selectedAgent.id, editing: true, draft: selectedRepoName });
              }}
              onCancel={() => {
                setRepoRenameState({ agentId: selectedAgent.id, editing: false, draft: selectedRepoName });
              }}
              onSubmit={renameSelectedWorkspace}
              renderDisplay={({ value, editButton }) => (
                <div className="flex min-w-0 items-center gap-2">
                  <h2 id="aeon-repo-name" className="m-0 min-w-0 break-words text-xl font-bold leading-tight text-[var(--foreground)] [overflow-wrap:anywhere]">{value}</h2>
                  {editButton}
                </div>
              )}
            />
            <p className="m-0 max-w-2xl text-sm leading-6 text-[var(--muted)]">
              One AEON workspace. Start with the overview, then switch tabs only when you need work, activity, or setup details.
            </p>
            <div className="flex flex-wrap gap-2 text-xs text-[var(--muted)]">
              <span className="rounded-md border border-[rgba(94,234,212,0.20)] bg-[rgba(20,184,166,0.08)] px-2 py-1 text-[var(--accent-strong)]">{enabledSchedules.length} on duty</span>
              <span className="rounded-md border border-[rgba(148,163,184,0.16)] bg-[rgba(10,14,21,0.52)] px-2 py-1">{skills.length} ready skills</span>
              <span className="rounded-md border border-[rgba(148,163,184,0.16)] bg-[rgba(10,14,21,0.52)] px-2 py-1">{runs.length} runs checked</span>
              <span className="rounded-md border border-[rgba(148,163,184,0.16)] bg-[rgba(10,14,21,0.52)] px-2 py-1">{outputs.length} outputs</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setPanelMode("fleet")}>
              <ChevronLeft aria-hidden="true" />
              All AEON Repos
            </Button>
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

      <div className={`grid gap-2 rounded-lg border border-[rgba(148,163,184,0.16)] bg-[rgba(10,14,21,0.52)] p-2 sm:grid-cols-4 ${detailView === "settings" ? "xl:col-span-2" : ""}`}>
        {detailTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`grid gap-1 rounded-md px-3 py-2 text-left transition ${detailView === tab.id ? "border border-[rgba(94,234,212,0.34)] bg-[rgba(20,184,166,0.15)] text-[var(--accent-strong)]" : "border border-transparent text-[var(--muted)] hover:bg-[rgba(148,163,184,0.08)] hover:text-[var(--foreground)]"}`}
            onClick={() => setDetailView(tab.id)}
          >
            <span className="text-sm font-bold">{tab.label}</span>
            <span className="text-[11px] leading-4">{tab.detail}</span>
          </button>
        ))}
      </div>

      {convertSkill ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(2,6,23,0.72)] p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`Automate ${convertSkill.name} with AEON`}>
          <div className="grid max-h-[calc(100vh-2rem)] w-full max-w-3xl gap-4 overflow-auto rounded-lg border border-[rgba(94,234,212,0.24)] bg-[rgba(10,14,21,0.96)] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="eyebrow">Automate with AEON</p>
                <h3 id="aeon-convert-title" className="m-0 text-lg font-bold text-[var(--foreground)]">{convertSkill.name}</h3>
                <p className="m-0 mt-1 text-sm leading-6 text-[var(--muted)]">{convertSkill.description || "This shared skill will be mirrored into AEON and attached to runtime config."}</p>
              </div>
              <Button type="button" size="icon" variant="ghost" aria-label="Close convert to AEON" onClick={() => setConvertSkill(null)}>
                <X aria-hidden="true" />
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <ConvertInfo label="From" value="Shared Brain" detail={convertSkill.relativePath || convertSkill.path} />
              <ConvertInfo label="To" value="AEON" detail={`skills/${convertSkill.slug}/SKILL.md`} />
              <ConvertInfo label="Starts as" value={convertDraft.onDuty ? "On duty" : "Off duty"} detail={scheduleSummaryFromConvertDraft(convertDraft)} />
            </div>

            <div className="grid gap-4">
              <section className="grid gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-sm text-[var(--foreground)]">Run cadence</strong>
                  <span className="rounded-md border border-[rgba(94,234,212,0.18)] bg-[rgba(20,184,166,0.07)] px-2 py-1 text-xs text-[var(--accent-strong)]">{scheduleSummaryFromConvertDraft(convertDraft)}</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-5">
                  {CONVERT_SCHEDULE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`grid gap-1 rounded-md border p-3 text-left ${convertDraft.scheduleMode === option.value ? "border-[rgba(94,234,212,0.42)] bg-[rgba(20,184,166,0.12)]" : "border-[rgba(148,163,184,0.14)] bg-[rgba(15,23,42,0.46)]"}`}
                      onClick={() => setConvertDraft((current) => ({ ...current, scheduleMode: option.value, onDuty: option.value === "manual" ? false : current.onDuty }))}
                    >
                      <span className="text-sm font-bold text-[var(--foreground)]">{option.label}</span>
                      <span className="text-[11px] leading-4 text-[var(--muted)]">{option.detail}</span>
                    </button>
                  ))}
                </div>
                {convertDraft.scheduleMode !== "manual" && convertDraft.scheduleMode !== "hourly" ? (
                  <div className="grid gap-2 rounded-md border border-[rgba(148,163,184,0.14)] bg-[rgba(2,6,23,0.30)] p-3 sm:grid-cols-3">
                    {convertDraft.scheduleMode === "weekly" ? (
                      <label className="grid gap-1 text-xs text-[var(--muted)]">
                        Day
                        <select className="min-h-9 rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(15,23,42,0.72)] px-2 text-[var(--foreground)]" value={convertDraft.weekday} onChange={(event) => setConvertDraft((current) => ({ ...current, weekday: event.target.value }))}>
                          {CONVERT_WEEKDAYS.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}
                        </select>
                      </label>
                    ) : null}
                    <label className="grid gap-1 text-xs text-[var(--muted)]">
                      Hour
                      <select className="min-h-9 rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(15,23,42,0.72)] px-2 text-[var(--foreground)]" value={convertDraft.hour} onChange={(event) => setConvertDraft((current) => ({ ...current, hour: event.target.value }))}>
                        {CONVERT_HOURS.map((hour) => <option key={hour} value={hour}>{hour}</option>)}
                      </select>
                    </label>
                    <label className="grid gap-1 text-xs text-[var(--muted)]">
                      Minute
                      <select className="min-h-9 rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(15,23,42,0.72)] px-2 text-[var(--foreground)]" value={convertDraft.minute} onChange={(event) => setConvertDraft((current) => ({ ...current, minute: event.target.value }))}>
                        {CONVERT_MINUTES.map((minute) => <option key={minute} value={minute}>{minute}</option>)}
                      </select>
                    </label>
                  </div>
                ) : null}
              </section>

              <section className="grid gap-2">
                <strong className="text-sm text-[var(--foreground)]">Instructions</strong>
                <div className="grid gap-2 md:grid-cols-4">
                  {CONVERT_BRIEF_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`grid gap-1 rounded-md border p-3 text-left ${convertDraft.briefMode === option.value ? "border-[rgba(94,234,212,0.42)] bg-[rgba(20,184,166,0.12)]" : "border-[rgba(148,163,184,0.14)] bg-[rgba(15,23,42,0.46)]"}`}
                      onClick={() => setConvertDraft((current) => ({ ...current, briefMode: option.value }))}
                    >
                      <span className="text-sm font-bold text-[var(--foreground)]">{option.label}</span>
                      <span className="text-[11px] leading-4 text-[var(--muted)]">{option.detail}</span>
                    </button>
                  ))}
                </div>
                <p className="m-0 rounded-md border border-[rgba(148,163,184,0.12)] bg-[rgba(2,6,23,0.30)] p-3 text-xs leading-5 text-[var(--muted)]">{convertBrief(convertSkill, convertDraft.briefMode)}</p>
              </section>

              <section className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-1 text-xs text-[var(--muted)]">
                  Model
                  <select className="min-h-9 rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(15,23,42,0.72)] px-2 text-[var(--foreground)]" value={convertDraft.model} onChange={(event) => setConvertDraft((current) => ({ ...current, model: event.target.value }))}>
                    {CONVERT_MODEL_OPTIONS.map((model) => <option key={model.value || "default"} value={model.value}>{model.label}</option>)}
                  </select>
                </label>
                <div className="grid gap-1 text-xs text-[var(--muted)]">
                  Duty state
                  <div className="inline-flex rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(2,6,23,0.45)] p-1">
                    {[
                      { value: false, label: "Off duty" },
                      { value: true, label: "On duty" },
                    ].map((option) => (
                      <button
                        key={String(option.value)}
                        type="button"
                        className={`flex-1 rounded px-3 py-2 text-xs font-bold ${convertDraft.onDuty === option.value ? "bg-[rgba(94,234,212,0.18)] text-[var(--accent-strong)]" : "text-[var(--muted)]"}`}
                        onClick={() => setConvertDraft((current) => ({ ...current, onDuty: option.value }))}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            </div>

            <div className="grid gap-2 rounded-md border border-[rgba(148,163,184,0.14)] bg-[rgba(2,6,23,0.30)] p-3 text-xs leading-5 text-[var(--muted)]">
              <div><strong className="text-[var(--foreground)]">What happens:</strong> this skill becomes available in AEON, with the schedule, instructions, model, and duty state you choose here.</div>
              <div><strong className="text-[var(--foreground)]">Keys:</strong> no secret values are copied by this action. Missing keys stay handled by the keys section below.</div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <code className="rounded border border-[rgba(148,163,184,0.14)] bg-[rgba(2,6,23,0.36)] px-2 py-1 text-xs text-[var(--foreground)]">{scheduleFromConvertDraft(convertDraft)}</code>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="ghost" onClick={() => setConvertSkill(null)}>Cancel</Button>
                <Button type="button" onClick={() => void convertSharedSkillToAeon()} disabled={actionBusy === `convert:${convertSkill.slug}`}>
                  {actionBusy === `convert:${convertSkill.slug}` ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Rocket aria-hidden="true" />}
                  Create automation
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className={detailView === "overview" ? "grid gap-3 xl:grid-cols-[1.05fr_0.95fr]" : detailView === "settings" ? "contents" : "hidden"}>
        <section className="hidden rounded-lg border border-[rgba(148,163,184,0.16)] bg-[rgba(16,20,29,0.78)] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow">How it works</p>
              <h3 className="m-0 text-base font-bold">Pick work, let AEON handle the routine</h3>
            </div>
            <a
              className="inline-flex items-center gap-1 rounded-md border border-[rgba(148,163,184,0.18)] px-2 py-1 text-xs text-[var(--accent-strong)]"
              href="https://github.com/aaronjmars/aeon"
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink aria-hidden="true" className="h-3 w-3" />
              AEON project
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

        <section className={`${detailView === "overview" ? "" : "hidden"} rounded-lg border border-[rgba(148,163,184,0.16)] bg-[rgba(16,20,29,0.78)] p-4`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">At a glance</p>
              <h3 className="m-0 text-base font-bold">Recent activity</h3>
            </div>
            <BarChart3 aria-hidden="true" className="h-5 w-5 text-[var(--accent-strong)]" />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <Metric label="Runs" value={analytics?.summary.totalRuns ?? runs.length} />
            <Metric label="Success" value={`${analytics?.summary.successRate ?? 0}%`} />
            <Metric label="Failures" value={analytics?.summary.failure ?? failedRuns} tone={(analytics?.summary.failure ?? failedRuns) > 0 ? "rose" : undefined} />
            <Metric label="Skills used" value={analytics?.summary.uniqueSkills ?? 0} />
          </div>
          <div className="mt-4 grid gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="m-0 text-sm font-bold text-[var(--foreground)]">Agents</h4>
              <span className="rounded border border-[rgba(94,234,212,0.18)] bg-[rgba(20,184,166,0.07)] px-2 py-1 text-[10px] font-bold uppercase leading-3 text-[var(--accent-strong)]">
                {aeonRepoProfileAgents.length}
              </span>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {aeonRepoProfileAgents.map((agent) => (
                <AeonRepoAgentCard
                  key={agent.id}
                  agent={agent}
                  onOpen={() => {
                    setSelectedAgentId(agent.id);
                    setAgentSettingsPanel("memory");
                    setAgentRoleModalId(agent.id);
                  }}
                />
              ))}
            </div>
          </div>
          <div className="mt-4 grid gap-2">
            {(analytics?.insights ?? []).slice(0, 4).map((insight, index) => (
              <div key={`${insight.message}:${index}`} className={`rounded-md border px-3 py-2 text-xs ${insight.type === "warning" ? "border-amber-300/20 bg-amber-400/10 text-amber-100" : insight.type === "success" ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100" : "border-[rgba(148,163,184,0.16)] bg-[rgba(10,14,21,0.42)] text-[var(--muted)]"}`}>
                {insight.message}
              </div>
            ))}
            {(analytics?.skills ?? []).slice(0, 5).map((skill) => (
              <div key={skill.slug} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-xs">
                <span className="truncate text-[var(--muted)]">{skill.name}</span>
                <span className="font-mono text-[var(--foreground)]">{skill.successRate}% · {skill.total}</span>
              </div>
            ))}
          </div>
        </section>

        <section className={`${detailView === "settings" ? "" : "hidden"} rounded-lg border border-[rgba(148,163,184,0.16)] bg-[rgba(16,20,29,0.78)] p-4`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Save and update</p>
              <h3 className="m-0 text-base font-bold">AEON files</h3>
            </div>
            <GitBranch aria-hidden="true" className="h-5 w-5 text-[var(--accent-strong)]" />
          </div>
          <div className="mt-4 grid gap-2 text-sm">
            <StatusRow label="Repo" value={repoSync?.repo || selectedAgent.aeonRepo || "Not configured"} ok={Boolean(repoSync?.repo || selectedAgent.aeonRepo)} />
            <StatusRow label="Branch" value={repoSync?.branch || selectedAgent.aeonBranch || "main"} ok />
            <StatusRow label="Local changes" value={repoSync?.hasChanges ? `${repoSync.changedFiles.length} changed` : "Clean"} ok={!repoSync?.hasChanges} />
            <StatusRow label="Remote delta" value={`${repoSync?.behind ?? 0} behind · ${repoSync?.ahead ?? 0} ahead`} ok={(repoSync?.behind ?? 0) === 0} />
          </div>
          {repoSync?.changedFiles?.length ? (
            <div className="mt-3 max-h-20 overflow-auto rounded-md border border-[rgba(148,163,184,0.14)] bg-[rgba(2,6,23,0.38)] p-2 text-[11px] text-[var(--muted)]">
              {repoSync.changedFiles.slice(0, 12).map((file) => <div key={file}>{file}</div>)}
            </div>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={() => void runRepoAction("pull")} disabled={actionBusy === "repo:pull"}>
              {actionBusy === "repo:pull" ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Download aria-hidden="true" />}
              Update from GitHub
            </Button>
            <Button type="button" size="sm" onClick={() => void runRepoAction("push")} disabled={actionBusy === "repo:push"}>
              {actionBusy === "repo:push" ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Upload aria-hidden="true" />}
              Save to GitHub
            </Button>
          </div>
        </section>

        <section className={`${detailView === "overview" ? "" : "hidden"} rounded-lg border border-[rgba(148,163,184,0.16)] bg-[rgba(16,20,29,0.78)] p-4`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Ready check</p>
              <h3 className="m-0 text-base font-bold">What AEON can use</h3>
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

      <div className={detailView === "work" ? "grid gap-3 xl:grid-cols-[1fr_1.2fr] xl:items-start" : detailView === "settings" ? "contents" : "hidden"}>
        <section className={`${detailView === "settings" ? "" : "hidden"} rounded-lg border border-[rgba(148,163,184,0.16)] bg-[rgba(16,20,29,0.78)] p-4`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Setup</p>
              <h3 className="m-0 text-base font-bold">Connection and sync</h3>
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
              Sync skill library
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => void syncSecrets()} disabled={actionBusy === "sync-secrets" || !(selectedAgent.aeonRepo || status?.status?.repo)}>
              {actionBusy === "sync-secrets" ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Upload aria-hidden="true" />}
              Sync keys
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setActiveView("files")}>
              <FileText aria-hidden="true" />
              Files
            </Button>
          </div>
          <details className="mt-4 rounded-md border border-[rgba(148,163,184,0.12)] bg-[rgba(10,14,21,0.34)] p-3">
            <summary className="flex cursor-pointer items-center gap-2 text-xs font-bold uppercase text-[var(--muted)]">
              <MemoryStick aria-hidden="true" className="h-3.5 w-3.5 text-[var(--accent-strong)]" />
              Advanced file map
            </summary>
            <div className="grid gap-2">
              {AEON_PATHS.map((path) => (
                <div key={path.label} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-[var(--muted)]">{path.label}</span>
                  <code className="rounded border border-[rgba(148,163,184,0.14)] bg-[rgba(2,6,23,0.36)] px-2 py-1 text-[var(--foreground)]">{path.value}</code>
                </div>
              ))}
            </div>
          </details>
        </section>

        <section className={`${detailView === "work" ? "" : "hidden"} rounded-lg border border-[rgba(148,163,184,0.16)] bg-[rgba(16,20,29,0.78)] p-4`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Skills</p>
              <h3 className="m-0 text-base font-bold">{(allSkills?.shared.length ?? 0) + visibleSkills.filter((skill) => !sharedSkillBySlug.has(skill.slug)).length} available · {scheduledSkillCount} set up</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={() => setImportOpen((open) => !open)}>
                <FileUp aria-hidden="true" />
                Import skill
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setActiveView("scheduler")}>
                <Clock3 aria-hidden="true" />
                Scheduler
              </Button>
            </div>
          </div>
          <div className="mt-4 grid gap-3 rounded-md border border-[rgba(148,163,184,0.14)] bg-[rgba(10,14,21,0.34)] p-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(2,6,23,0.45)] p-1">
                {([
                  { value: "aeon" as const, label: "AEON" },
                  { value: "shared" as const, label: "Shared Brain" },
                ]).map((view) => (
                  <button
                    key={view.value}
                    type="button"
                    className={`rounded px-3 py-1.5 text-xs font-bold ${skillSourceView === view.value ? "bg-[rgba(94,234,212,0.18)] text-[var(--accent-strong)]" : "text-[var(--muted)]"}`}
                    onClick={() => {
                      setSkillSourceView(view.value);
                      setSkillCategoryFilter("all");
                    }}
                  >
                    {view.label}
                  </button>
                ))}
              </div>
              <label className="relative min-w-56 flex-1">
                <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  value={skillSearch}
                  onChange={(event) => setSkillSearch(event.target.value)}
                  placeholder="Search skills..."
                  className="w-full rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(2,6,23,0.50)] py-2 pl-9 pr-3 text-sm text-[var(--foreground)] outline-none focus:border-[rgba(94,234,212,0.45)]"
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-bold ${skillCategoryFilter === "all" ? "border-[rgba(94,234,212,0.38)] bg-[rgba(94,234,212,0.14)] text-[var(--accent-strong)]" : "border-[rgba(148,163,184,0.16)] bg-[rgba(2,6,23,0.35)] text-[var(--muted)]"}`}
                onClick={() => setSkillCategoryFilter("all")}
              >
                All
                <span className="rounded border border-[rgba(148,163,184,0.18)] px-1.5 py-0.5 text-[10px]">{groupedSkills.reduce((total, group) => total + group.skills.length, 0)}</span>
              </button>
              {categoryFilterOptions.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-bold ${skillCategoryFilter === category.id ? "border-[rgba(94,234,212,0.38)] bg-[rgba(94,234,212,0.14)] text-[var(--accent-strong)]" : "border-[rgba(148,163,184,0.16)] bg-[rgba(2,6,23,0.35)] text-[var(--muted)]"}`}
                  onClick={() => setSkillCategoryFilter(category.id)}
                >
                  <i className="h-2 w-2 rounded-full" style={{ backgroundColor: category.color }} />
                  {category.label}
                  <span className="rounded border border-[rgba(148,163,184,0.18)] px-1.5 py-0.5 text-[10px]">{category.count}</span>
                </button>
              ))}
            </div>
            {importOpen ? (
              <div className="grid gap-3 rounded-md border border-[rgba(94,234,212,0.18)] bg-[rgba(20,184,166,0.06)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <strong className="text-sm text-[var(--foreground)]">Drop-in skill folder</strong>
                    <p className="m-0 mt-1 text-xs text-[var(--muted)]">Imports into Shared Brain first, then AEON sees it through the same sync path.</p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-[rgba(94,234,212,0.22)] px-3 py-2 text-xs font-bold text-[var(--accent-strong)]">
                    Choose folder
                    <input
                      type="file"
                      className="sr-only"
                      multiple
                      ref={(input) => {
                        if (input) input.setAttribute("webkitdirectory", "");
                      }}
                      onChange={(event) => void readUploadedFiles(event.currentTarget.files)}
                    />
                  </label>
                </div>
                {importFiles.length ? (
                  <div className="grid gap-2">
                    <input
                      value={importName}
                      onChange={(event) => setImportName(event.target.value)}
                      placeholder="optional-skill-name"
                      className="rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(2,6,23,0.50)] px-3 py-2 text-sm text-[var(--foreground)] outline-none"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--muted)]">
                      <span>{importFiles.length} file{importFiles.length === 1 ? "" : "s"} ready</span>
                      <Button type="button" size="sm" onClick={() => void importUploadedSkill()} disabled={actionBusy === "import-skill"}>
                        {actionBusy === "import-skill" ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Download aria-hidden="true" />}
                        Add to Shared Brain
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className="grid gap-2">
              {visibleSkillRows.map((skill) => {
                const canAutomateRuntime = Boolean(skill.runtimeSkill && skill.automationState === "ready");
                const canOpenConvert = Boolean(!canAutomateRuntime && skill.sharedSkill && skill.automationState === "available");
                const canRun = Boolean(skill.runtimeSkill?.runtimeSchedule);
                const actionBusyKey = skill.automationState === "on-duty" ? `disable:${skill.slug}` : skill.automationState === "paused" ? `enable:${skill.slug}` : canAutomateRuntime ? `automate:${skill.slug}` : `convert:${skill.slug}`;
                return (
                  <div
                    key={`${skill.source}:${skill.slug}`}
                    className={`grid gap-3 rounded-md border border-[rgba(148,163,184,0.12)] px-4 py-3 hover:bg-[rgba(94,234,212,0.08)] md:grid-cols-[minmax(0,1fr)_auto] md:items-center ${selectedSkillSlug === skill.slug ? "bg-[rgba(94,234,212,0.12)]" : "bg-[rgba(10,14,21,0.38)]"}`}
                  >
                    <button
                      type="button"
                      className="grid min-w-0 gap-1 text-left"
                      onClick={() => {
                        setSelectedSkillSlug(skill.slug);
                        const runtimeSkill = visibleSkills.find((item) => item.slug === skill.slug);
                        const schedule = schedules.find((item) => item.id === skill.slug);
                        setSkillDraft({
                          schedule: schedule?.every || runtimeSkill?.schedule || "",
                          var: runtimeSkill?.var || schedule?.message || "",
                          model: runtimeSkill?.model || String(schedule?.metadata?.model || ""),
                        });
                      }}
                    >
                      <span className="text-sm font-bold text-[var(--foreground)]">{skill.name}</span>
                      <span className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--muted)]">
                        <span>{skill.statusLabel} · {skill.runtimeSkill ? skillSourceLabel(skill.runtimeSkill.source) : "Shared Brain"}</span>
                        {skill.runtimeSkill?.automationYaml ? (
                          <span className="rounded border border-[rgba(94,234,212,0.18)] px-2 py-0.5 text-[var(--accent-strong)]">Agent recipe</span>
                        ) : null}
                        <span className="inline-flex items-center gap-1 rounded border border-[rgba(148,163,184,0.14)] px-2 py-0.5 uppercase">
                          <i className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: skill.categoryColor }} />
                          {skill.categoryLabel}
                        </span>
                      </span>
                    </button>
                    <div className="flex flex-wrap items-center gap-2 md:justify-end">
                      {canAutomateRuntime && skill.runtimeSkill ? (
                        <Button type="button" size="sm" variant="secondary" onClick={() => void automateAeonSkill(skill.runtimeSkill!)} disabled={actionBusy === actionBusyKey}>
                          {actionBusy === actionBusyKey ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Rocket aria-hidden="true" />}
                          {skill.actionLabel}
                        </Button>
                      ) : canOpenConvert && skill.sharedSkill ? (
                        <Button type="button" size="sm" variant="secondary" onClick={() => openConvertModal(skill.sharedSkill!)} disabled={actionBusy === actionBusyKey}>
                          {actionBusy === actionBusyKey ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Rocket aria-hidden="true" />}
                          {skill.actionLabel}
                        </Button>
                      ) : skill.automationState === "manual" ? (
                        <Button type="button" size="sm" onClick={() => void runScheduleAction("run-now", skill.slug)} disabled={!canRun || actionBusy === `run-now:${skill.slug}`}>
                          {actionBusy === `run-now:${skill.slug}` ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Play aria-hidden="true" />}
                          {skill.actionLabel}
                        </Button>
                      ) : skill.automationState === "on-duty" || skill.automationState === "paused" ? (
                        <Button type="button" size="sm" variant="secondary" onClick={() => void runScheduleAction(skill.automationState === "on-duty" ? "disable" : "enable", skill.slug)} disabled={!canRun || actionBusy === actionBusyKey}>
                          {actionBusy === actionBusyKey ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Power aria-hidden="true" />}
                          {skill.actionLabel}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
              {!visibleSkillRows.length ? (
                <EmptyState
                  icon={<Bot aria-hidden="true" />}
                  text={skillSourceView === "aeon" ? aeonEmptyText : "No Shared Brain skills match this filter yet."}
                />
              ) : null}
            </div>
          </div>
          {selectedSkill ? (
            <div className="mt-4 grid gap-3 rounded-md border border-[rgba(94,234,212,0.18)] bg-[rgba(20,184,166,0.06)] p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="eyebrow">Skill detail</p>
                  <h4 className="m-0 text-base font-bold text-[var(--foreground)]">{selectedSkill.name}</h4>
                  <p className="m-0 mt-1 text-xs leading-5 text-[var(--muted)]">{selectedSkill.description || "No description yet."}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" onClick={() => void runScheduleAction("run-now", selectedSkill.slug)} disabled={!selectedScheduleIds.has(selectedSkill.slug) || actionBusy === `run-now:${selectedSkill.slug}`}>
                    {actionBusy === `run-now:${selectedSkill.slug}` ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Play aria-hidden="true" />}
                    Run now
                  </Button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => void runScheduleAction((selectedSkill.runtimeSchedule?.enabled ?? selectedSkill.enabled) ? "disable" : "enable", selectedSkill.slug)} disabled={!selectedScheduleIds.has(selectedSkill.slug)}>
                    <Power aria-hidden="true" />
                    {(selectedSkill.runtimeSchedule?.enabled ?? selectedSkill.enabled) ? "Off duty" : "On duty"}
                  </Button>
                </div>
              </div>
              <details className="rounded-md border border-[rgba(148,163,184,0.14)] bg-[rgba(2,6,23,0.28)] p-3">
                <summary className="cursor-pointer text-xs font-bold uppercase text-[var(--muted)]">Advanced settings</summary>
                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  <label className="grid gap-1 text-xs text-[var(--muted)]">
                    Schedule
                    <input value={selectedDraft.schedule} onChange={(event) => setSkillDraft((current) => ({ ...current, schedule: event.target.value }))} onBlur={() => void updateSelectedSkill("schedule", selectedDraft.schedule)} className="rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(2,6,23,0.5)] px-3 py-2 text-[var(--foreground)] outline-none" />
                  </label>
                  <label className="grid gap-1 text-xs text-[var(--muted)]">
                    Instructions
                    <input value={selectedDraft.var} onChange={(event) => setSkillDraft((current) => ({ ...current, var: event.target.value }))} onBlur={() => void updateSelectedSkill("var", selectedDraft.var)} className="rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(2,6,23,0.5)] px-3 py-2 text-[var(--foreground)] outline-none" />
                  </label>
                  <label className="grid gap-1 text-xs text-[var(--muted)]">
                    Model
                    <input value={selectedDraft.model} onChange={(event) => setSkillDraft((current) => ({ ...current, model: event.target.value }))} onBlur={() => void updateSelectedSkill("model", selectedDraft.model)} className="rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(2,6,23,0.5)] px-3 py-2 text-[var(--foreground)] outline-none" />
                  </label>
                </div>
              </details>
              <div className="grid gap-2">
                <strong className="text-xs uppercase text-[var(--muted)]">Recent runs for this skill</strong>
                {selectedSkillRuns.slice(0, 4).map((run) => (
                  <button key={run.id} type="button" className="flex items-center justify-between gap-2 rounded-md border border-[rgba(148,163,184,0.12)] bg-[rgba(10,14,21,0.42)] px-3 py-2 text-left text-xs" onClick={() => void loadRunLog(run)}>
                    <span className="text-[var(--foreground)]">{run.name}</span>
                    <span className={`rounded-full border px-2 py-1 font-bold ${statusTone(run.status)}`}>{run.conclusion || run.status}</span>
                  </button>
                ))}
                {!selectedSkillRuns.length ? <p className="m-0 text-xs text-[var(--muted)]">No recent runs matched this skill yet.</p> : null}
              </div>
            </div>
          ) : null}
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            {inventoryRows.map((row) => (
              <div key={row.label} className="rounded-md border border-[rgba(148,163,184,0.12)] bg-[rgba(10,14,21,0.34)] p-3">
                <div className="text-lg font-bold text-[var(--foreground)]">{row.value}</div>
                <div className="text-[11px] uppercase text-[var(--muted)]">{row.label}</div>
              </div>
            ))}
          </div>
          <details className="mt-3 rounded-md border border-[rgba(148,163,184,0.14)] bg-[rgba(10,14,21,0.34)] p-3">
            <summary className="cursor-pointer text-xs font-bold uppercase text-[var(--muted)]">Advanced inventory breakdown</summary>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-[var(--muted)]">
              {sourceCounts(skills).map(([source, count]) => (
                <span key={source} className="rounded-md border border-[rgba(148,163,184,0.14)] px-2 py-1">{source}: {count}</span>
              ))}
              {modelCounts(skills, schedules).map(([model, count]) => (
                <span key={model} className="rounded-md border border-[rgba(94,234,212,0.16)] px-2 py-1 text-[var(--accent-strong)]">{model}: {count}</span>
              ))}
            </div>
          </details>
        </section>
      </div>

      <div className={detailView === "activity" ? "grid gap-3 xl:grid-cols-2" : detailView === "settings" ? "contents" : "hidden"}>
        <section className={`${detailView === "activity" ? "" : "hidden"} rounded-lg border border-[rgba(148,163,184,0.16)] bg-[rgba(16,20,29,0.78)] p-4`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Runs</p>
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
                  <Button type="button" size="sm" variant="ghost" onClick={() => void loadRunLog(run)} disabled={runLogLoading === run.id}>
                    {runLogLoading === run.id ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <FileText aria-hidden="true" />}
                    Logs
                  </Button>
                  {run.url ? (
                    <a className="inline-flex items-center gap-1 rounded-md border border-[rgba(148,163,184,0.18)] px-2 py-1 text-xs text-[var(--accent-strong)]" href={run.url} target="_blank" rel="noreferrer">
                      <ExternalLink aria-hidden="true" className="h-3 w-3" />
                      Open
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
            {!runs.length ? <EmptyState icon={<Activity aria-hidden="true" />} text="No recent AEON runs returned yet." /> : null}
            {selectedRunLog ? (
              <article className="grid gap-2 rounded-md border border-[rgba(94,234,212,0.18)] bg-[rgba(20,184,166,0.06)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-sm text-[var(--foreground)]">Run evidence</strong>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setSelectedRunLog(null)}>Close</Button>
                </div>
                <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-md border border-[rgba(148,163,184,0.14)] bg-[rgba(2,6,23,0.48)] p-3 text-[11px] leading-5 text-[var(--muted)]">{selectedRunLog.summary || selectedRunLog.logs || "No logs returned."}</pre>
                {selectedRunLog.logs && selectedRunLog.logs !== selectedRunLog.summary ? (
                  <details>
                    <summary className="cursor-pointer text-xs text-[var(--accent-strong)]">Full logs</summary>
                    <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-[rgba(148,163,184,0.14)] bg-[rgba(2,6,23,0.48)] p-3 text-[11px] leading-5 text-[var(--muted)]">{selectedRunLog.logs}</pre>
                  </details>
                ) : null}
              </article>
            ) : null}
          </div>
        </section>

        <section className={`${detailView === "activity" ? "" : "hidden"} rounded-lg border border-[rgba(148,163,184,0.16)] bg-[rgba(16,20,29,0.78)] p-4`}>
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

        <section className={`${detailView === "settings" ? "" : "hidden"} rounded-lg border border-[rgba(148,163,184,0.16)] bg-[rgba(16,20,29,0.78)] p-4`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Keys</p>
              <h3 className="m-0 text-base font-bold">What AEON can access</h3>
            </div>
            <KeyRound aria-hidden="true" className="h-5 w-5 text-[var(--accent-strong)]" />
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {(secrets?.keys ?? SECRET_MANIFEST.map((secret) => ({ ...secret, isSet: false, availableInSharedEnv: false, availableLocally: false, usedIn: [] }))).map((secret) => (
              <div key={secret.key} className={`rounded-md border p-3 ${secret.isSet ? "border-emerald-300/20 bg-emerald-400/10" : secret.availableInSharedEnv || secret.availableLocally ? "border-amber-300/20 bg-amber-400/10" : "border-[rgba(148,163,184,0.14)] bg-[rgba(10,14,21,0.48)]"}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-bold text-[var(--foreground)]">{secret.key}</div>
                  <span className="rounded-full border border-[rgba(148,163,184,0.18)] px-2 py-1 text-[10px] text-[var(--muted)]">
                    {secret.isSet ? "Set in AEON" : secret.availableInSharedEnv ? "In shared env" : secret.availableLocally ? "Local only" : "Missing"}
                  </span>
                </div>
                <div className="mt-1 text-xs text-[var(--muted)]">{secret.label}</div>
                {secret.usedIn?.length ? <div className="mt-2 text-[11px] text-[var(--muted)]">Used in: {secret.usedIn.slice(0, 3).join(", ")}</div> : null}
                {!secret.isSet && (secret.availableInSharedEnv || secret.availableLocally) ? (
                  <Button type="button" size="sm" variant="secondary" className="mt-3" onClick={() => void syncSecrets()} disabled={actionBusy === "sync-secrets"}>
                    <Upload aria-hidden="true" />
                    Copy to AEON
                  </Button>
                ) : !secret.isSet ? (
                  <Button type="button" size="sm" variant="ghost" className="mt-3" onClick={() => setActiveView("env")}>
                    <ShieldCheck aria-hidden="true" />
                    Guided setup
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-md border border-[rgba(94,234,212,0.14)] bg-[rgba(20,184,166,0.06)] p-3 text-xs leading-5 text-[var(--muted)]">
            Default sync pushes the core keys only: {DEFAULT_SECRET_KEYS.join(", ")}. Optional notification and provider keys stay visible here as the expected AEON surface.
          </div>
        </section>

        <section className={`${detailView === "settings" ? "" : "hidden"} rounded-lg border border-[rgba(148,163,184,0.16)] bg-[rgba(16,20,29,0.78)] p-4`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Memory</p>
              <h3 className="m-0 text-base font-bold">What AEON remembers</h3>
            </div>
            <MemoryStick aria-hidden="true" className="h-5 w-5 text-[var(--accent-strong)]" />
          </div>
          {memory?.index ? (
            <p className="mt-4 max-h-28 overflow-auto whitespace-pre-wrap rounded-md border border-[rgba(148,163,184,0.14)] bg-[rgba(2,6,23,0.38)] p-3 text-xs leading-5 text-[var(--muted)]">{memory.index.slice(0, 1200)}</p>
          ) : (
            <EmptyState icon={<MemoryStick aria-hidden="true" />} text="No AEON memory index returned yet." />
          )}
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {(["topics", "logs", "issues"] as const).map((kind) => (
              <div key={kind} className="rounded-md border border-[rgba(148,163,184,0.12)] bg-[rgba(10,14,21,0.34)] p-3">
                <div className="mb-2 flex items-center justify-between text-xs uppercase text-[var(--muted)]">
                  <strong>{kind}</strong>
                  <span>{memory?.[kind]?.length ?? 0}</span>
                </div>
                <div className="grid gap-2">
                  {(memory?.[kind] ?? []).slice(0, 3).map((item) => (
                    <article key={item.path} className="grid gap-1 rounded-md bg-[rgba(2,6,23,0.36)] p-2">
                      <strong className="text-xs text-[var(--foreground)]">{item.title}</strong>
                      <span className="text-[11px] leading-4 text-[var(--muted)]">{item.excerpt || item.path}</span>
                    </article>
                  ))}
                  {!(memory?.[kind]?.length) ? <span className="text-xs text-[var(--muted)]">Nothing indexed yet.</span> : null}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-md border border-[rgba(94,234,212,0.14)] bg-[rgba(20,184,166,0.06)] p-3 text-xs leading-5 text-[var(--muted)]">
            Obsidian mirror: keep the AEON repo and {`Agents/AEON/<repo>/`} synced with Unison, then let the shared vault sync carry that repo view across machines.
          </div>
          <div className="mt-3 grid gap-2 rounded-md border border-[rgba(148,163,184,0.14)] bg-[rgba(10,14,21,0.34)] p-3">
            <StatusRow label="Mirror status" value={obsidianMirrorStatus} ok={obsidianMirrorRunning === true} />
            <StatusRow label="Vault folder" value={obsidianSync?.vaultRepoRoot || "Agents/AEON/<repo>"} ok={Boolean(obsidianSync?.vaultRepoRoot)} />
            <div className="flex flex-wrap gap-2">
              <ObsidianMirrorToggle
                running={obsidianMirrorRunning}
                busy={actionBusy === "obsidian-sync:start" || actionBusy === "obsidian-sync:stop"}
                disabled={actionBusy.startsWith("obsidian-sync:") || obsidianSync?.installed === false || obsidianMirrorRunning === null}
                onToggle={() => void runObsidianSyncAction(obsidianSync?.running ? "stop" : "start")}
              />
              <Button type="button" size="sm" variant="ghost" onClick={() => void runObsidianSyncAction("once")} disabled={actionBusy.startsWith("obsidian-sync:") || obsidianSync?.installed === false}>
                {actionBusy === "obsidian-sync:once" ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Upload aria-hidden="true" />}
                Sync once
              </Button>
            </div>
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

function ObsidianMirrorToggle({ running, busy, disabled, onToggle }: { running: boolean | null; busy: boolean; disabled: boolean; onToggle: () => void }) {
  const checked = running === true;
  return (
    <label className={`inline-flex min-h-9 items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-bold ${disabled ? "cursor-not-allowed border-[rgba(148,163,184,0.12)] bg-[rgba(10,14,21,0.26)] text-[var(--muted)] opacity-70" : "cursor-pointer border-[rgba(94,234,212,0.22)] bg-[rgba(20,184,166,0.08)] text-[var(--foreground)] hover:bg-[rgba(20,184,166,0.12)]"}`}>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={onToggle}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border transition-colors ${checked ? "border-[rgba(94,234,212,0.72)] bg-[rgba(94,234,212,0.34)]" : running === null ? "border-[rgba(148,163,184,0.22)] bg-[rgba(148,163,184,0.12)]" : "border-[rgba(148,163,184,0.28)] bg-[rgba(2,6,23,0.58)]"}`}
      >
        <span className={`absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full transition-transform ${checked ? "translate-x-[18px] bg-[var(--accent-strong)]" : running === null ? "translate-x-[10px] bg-[var(--muted)]" : "translate-x-0.5 bg-[var(--muted)]"}`} />
      </span>
      <span>{checked ? "Obsidian mirror on" : running === null ? "Checking mirror" : "Obsidian mirror off"}</span>
      {busy ? <LoaderCircle aria-hidden="true" className="h-3.5 w-3.5 animate-spin text-[var(--accent-strong)]" /> : null}
    </label>
  );
}

function ConvertInfo({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="grid gap-1 rounded-md border border-[rgba(148,163,184,0.14)] bg-[rgba(2,6,23,0.30)] p-3">
      <span className="text-[11px] font-bold uppercase text-[var(--muted)]">{label}</span>
      <span className="text-sm font-bold text-[var(--foreground)]">{value}</span>
      <span className="break-words text-[11px] leading-4 text-[var(--muted)]">{detail}</span>
    </div>
  );
}

function AeonRepoAgentCard({ agent, onOpen }: { agent: AgentProfile; onOpen: () => void }) {
  const gitBacked = Boolean(agent.aeonRepo?.trim());
  const role = agent.beeRole || "worker";
  const workerClass = agent.workerClass || "general";
  return (
    <button
      type="button"
      className="group grid gap-3 rounded-md border border-[rgba(148,163,184,0.14)] bg-[linear-gradient(135deg,rgba(2,6,23,0.54),rgba(20,184,166,0.07))] p-3 text-left shadow-[0_10px_26px_rgba(0,0,0,0.16)] transition duration-200 hover:-translate-y-0.5 hover:border-[rgba(94,234,212,0.38)] hover:bg-[linear-gradient(135deg,rgba(2,6,23,0.62),rgba(20,184,166,0.14))] hover:shadow-[0_16px_34px_rgba(20,184,166,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(45,212,191,0.34)]"
      onClick={onOpen}
      aria-label={`Edit ${agent.name}`}
      title={`Edit ${agent.name}`}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[rgba(94,234,212,0.22)] bg-[rgba(20,184,166,0.10)] text-[var(--accent-strong)] transition group-hover:border-[rgba(94,234,212,0.42)] group-hover:bg-[rgba(20,184,166,0.16)]">
          <Bot aria-hidden="true" className="h-4 w-4" />
        </span>
        <span className="grid min-w-0 gap-1">
          <strong className="min-w-0 break-words text-sm leading-5 text-[var(--foreground)]">{agent.name}</strong>
          <span className="break-words text-[11px] uppercase leading-4 text-[var(--muted)]">{workerClass} · {role}</span>
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5 text-[10px] font-bold uppercase leading-3">
        <span className="rounded border border-[rgba(148,163,184,0.16)] bg-[rgba(15,23,42,0.58)] px-1.5 py-0.5 text-[var(--muted)]">{agent.machineName || "This Mac"}</span>
        <span className="rounded border border-[rgba(148,163,184,0.16)] bg-[rgba(15,23,42,0.58)] px-1.5 py-0.5 text-[var(--muted)]">{aeonModeBadgeLabel(agent)}</span>
        <span className={`rounded border px-1.5 py-0.5 ${gitBacked ? "border-[rgba(74,222,128,0.28)] bg-[rgba(34,197,94,0.10)] text-emerald-200" : "border-[rgba(251,191,36,0.26)] bg-[rgba(245,158,11,0.10)] text-amber-200"}`}>
          {gitBacked ? "Online" : "Offline"}
        </span>
      </div>
    </button>
  );
}

function Metric({ label, value, tone }: { label: string; value: string | number; tone?: "rose" }) {
  return (
    <div className={`rounded-md border p-3 ${tone === "rose" ? "border-rose-300/20 bg-rose-400/10" : "border-[rgba(148,163,184,0.12)] bg-[rgba(10,14,21,0.34)]"}`}>
      <div className="text-lg font-bold text-[var(--foreground)]">{value}</div>
      <div className="text-[11px] uppercase text-[var(--muted)]">{label}</div>
    </div>
  );
}

function AeonFleetMeta({ label, value }: { label: string; value: string }) {
  return (
    <span className="grid min-w-0 justify-items-center gap-0.5 rounded border border-[rgba(148,163,184,0.14)] bg-[rgba(2,6,23,0.50)] px-2 py-1">
      <span className="text-[8px] font-bold uppercase leading-3 text-[var(--muted)]">{label}</span>
      <span className="min-w-0 break-words text-center text-[10px] font-bold leading-3 text-[var(--foreground)]">{value}</span>
    </span>
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
