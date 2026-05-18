"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import type { AgentProfile, AgentRuntime, SharedVaultConfig } from "@/lib/types/agent-runtime";
import { createAgentProfile, DEFAULT_SHARED_VAULT, RUNTIME_DEFAULTS, RUNTIME_LABELS } from "@/lib/types/agent-runtime";
import type { AgentPaymentProvider, AgentWalletConfig } from "@/lib/types/agent-wallet";
import type { KanbanBoard, KanbanPriority, KanbanStatus, KanbanTask } from "@/lib/types/kanban";
import { KANBAN_COLUMNS } from "@/lib/types/kanban";
import { AGENT_PAYMENT_PROVIDER_COPY, PAYMENT_SAFETY_RULES, SOVEREIGN_AGENT_LAUNCH_STEPS } from "@/lib/config/agent-payments";
import { buildAgentPaymentPrompt, createDefaultAgentWallet, getSurvivalSnapshot, normalizeMoney } from "@/lib/utils/agent-wallet";
import { groupKanbanTasks } from "@/lib/utils/kanban-board";

type GatewayStatus = {
  ok?: boolean;
  runtime?: AgentRuntime;
  status?: number;
  payload?: unknown;
  error?: string;
};

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type AgentTask = {
  id: string;
  agentId: string;
  title: string;
  lastMessage: string;
  status: "active" | "completed" | "failed" | "unknown";
  startedAt: number;
  updatedAt: number;
  completedAt?: number;
  source?: string;
};

type AgentSnapshot = {
  agentId: string;
  ok: boolean;
  runtimeReachable: boolean;
  processRunning: boolean;
  summary: string;
  sources: string[];
  tasks: AgentTask[];
  checkedAt: number;
  error?: string;
};

type TailscaleDevice = {
  self: boolean;
  name: string;
  dnsName: string;
  os: string;
  online: boolean;
  ip: string;
  collectorUrl: string;
};

type MachineGroup = {
  key: string;
  name: string;
  address: string;
  collectorUrl: string;
  dnsName?: string;
  ip?: string;
  online: boolean;
  self: boolean;
  collector: "ready" | "not-installed" | "offline" | "missing" | "unknown";
  agents: AgentProfile[];
  version?: AppVersion;
};

type DiscoveredMachine = {
  device: TailscaleDevice;
  collector: MachineGroup["collector"];
  agents: AgentProfile[];
  snapshots: AgentSnapshot[];
  version?: AppVersion;
  lastSeenAt?: number;
};

type AppVersion = {
  appDir?: string;
  commit?: string;
  shortCommit?: string;
  branch?: string;
  dirty?: boolean;
  latestCommit?: string;
  latestShortCommit?: string;
  updateCommand?: string;
};

type MachineUpdateStatus = {
  label: string;
  detail?: string;
  tone: "working" | "success" | "error";
};

type KanbanBoardSummary = {
  slug: string;
  name: string;
  description?: string;
  icon?: string;
};

type KanbanResponse = {
  ok?: boolean;
  boards?: KanbanBoardSummary[];
  board?: KanbanBoard;
  tenants?: string[];
  assignees?: string[];
  error?: string;
};

const KANBAN_PRIORITIES: KanbanPriority[] = ["low", "normal", "high", "urgent"];
type DashboardView = "agents" | "kanban" | "wallet" | "vault" | "chat";

const STORAGE_KEY = "openclaw-next.agentProfiles.v1";
const VAULT_STORAGE_KEY = "openclaw-next.sharedVault.v1";
const TASK_STORAGE_KEY = "openclaw-next.agentTasks.v1";
const WALLET_STORAGE_KEY = "openclaw-next.agentWallets.v1";
const REPO_CLONE_URL = "https://github.com/LiamVisionary/omni-agent-hivemind.git";
const QUIET_SNAPSHOT_HOLD_MS = 15 * 60 * 1000;
const STARTER_AGENT_IDS = new Set([
  "openclaw-main",
  "hermes-orchestrator",
  "hermes-seo",
  "hermes-cmo",
  "hermes-dev",
  "hermes-ops",
  "hermes-life",
  "aeon-1",
]);

function seedAgents(): AgentProfile[] {
  return [
    { ...createAgentProfile("openclaw", 1), id: "openclaw-main", name: "OpenClaw Main" },
    { ...createAgentProfile("hermes", 1), id: "hermes-orchestrator", name: "Hermes Orchestrator", agentId: "hermes-orchestrator", gatewayUrl: "http://127.0.0.1:8642" },
    { ...createAgentProfile("hermes", 2), id: "hermes-seo", name: "Hermes SEO", agentId: "hermes-seo", gatewayUrl: "http://127.0.0.1:8643" },
    { ...createAgentProfile("hermes", 3), id: "hermes-cmo", name: "Hermes CMO", agentId: "hermes-cmo", gatewayUrl: "http://127.0.0.1:8644" },
    { ...createAgentProfile("hermes", 4), id: "hermes-dev", name: "Hermes Dev", agentId: "hermes-dev", gatewayUrl: "http://127.0.0.1:8645" },
    { ...createAgentProfile("hermes", 5), id: "hermes-ops", name: "Hermes Ops", agentId: "hermes-ops", gatewayUrl: "http://127.0.0.1:8646" },
    { ...createAgentProfile("hermes", 6), id: "hermes-life", name: "Hermes Life", agentId: "hermes-life", gatewayUrl: "http://127.0.0.1:8647" },
    { ...createAgentProfile("aeon", 1), id: "aeon-1", name: "Aeon Agent 1" },
  ];
}

function parseStoredAgents(): AgentProfile[] {
  if (typeof window === "undefined") return seedAgents();
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return seedAgents();
  try {
    const parsed = JSON.parse(raw) as AgentProfile[];
    if (!Array.isArray(parsed) || parsed.length === 0) return seedAgents();
    return parsed.map((agent) => (
      agent.runtime === "hermes" && agent.id === "hermes-orchestrator" && !agent.localDataDir
        ? { ...agent, localDataDir: "~/.hermes" }
        : agent
    ));
  } catch {
    return seedAgents();
  }
}

function parseStoredVault(): SharedVaultConfig {
  if (typeof window === "undefined") return DEFAULT_SHARED_VAULT;
  const raw = window.localStorage.getItem(VAULT_STORAGE_KEY);
  if (!raw) return DEFAULT_SHARED_VAULT;
  try {
    return { ...DEFAULT_SHARED_VAULT, ...(JSON.parse(raw) as Partial<SharedVaultConfig>) };
  } catch {
    return DEFAULT_SHARED_VAULT;
  }
}

function parseStoredTasks(): AgentTask[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(TASK_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as AgentTask[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseStoredWallets(): Record<string, AgentWalletConfig> {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(WALLET_STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, AgentWalletConfig>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function runtimeCount(agents: AgentProfile[], runtime: AgentRuntime) {
  return agents.filter((agent) => agent.runtime === runtime).length;
}

function formatRelativeTime(timestamp: number) {
  const seconds = Math.max(1, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function inferCurrentTask(messages: ChatMessage[]) {
  return [...messages].reverse().find((message) => message.role === "user")?.content ?? "No task yet";
}

function inferLatestAgentMessage(messages: ChatMessage[]) {
  return [...messages].reverse().find((message) => message.role === "assistant")?.content
    || "No agent response yet.";
}

function collectorKey(url?: string) {
  if (!url?.trim()) return "";
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}:${parsed.port || "80"}`;
  } catch {
    return url.trim();
  }
}

function normalizeAgentPath(path?: string) {
  return path
    ?.trim()
    .replace(/^~(?=$|\/)/, "$home")
    .replace(/\/+$/, "")
    .toLowerCase() ?? "";
}

function agentWorkspaceKey(agent: AgentProfile) {
  const dataDir = normalizeAgentPath(agent.localDataDir);
  if (dataDir) {
    const collector = collectorKey(agent.telemetryUrl) || "unattached";
    const canonicalHermesHome = dataDir === "$home/.hermes" || dataDir.endsWith("/.hermes");
    return `${agent.runtime}:data:${collector}:${canonicalHermesHome ? "$home/.hermes" : dataDir}`;
  }
  const telemetry = collectorKey(agent.telemetryUrl);
  if (telemetry) return `${agent.runtime}:telemetry:${telemetry}:${agent.agentId || agent.name}`;
  return `${agent.runtime}:id:${agent.id}`;
}

function dedupeAgents(configuredAgents: AgentProfile[], autoDiscoveredAgents: AgentProfile[]) {
  const discoveredKeys = new Set(autoDiscoveredAgents.map(agentWorkspaceKey));
  const configured = configuredAgents.filter((agent) => !discoveredKeys.has(agentWorkspaceKey(agent)));
  return [
    ...configured,
    ...autoDiscoveredAgents.filter((agent, index, list) => (
      list.findIndex((item) => agentWorkspaceKey(item) === agentWorkspaceKey(agent)) === index
    )),
  ];
}

function isStarterPlaceholder(agent: AgentProfile, knownWork: Record<string, AgentTask[]>, knownMessages: Record<string, ChatMessage[]>) {
  if (!STARTER_AGENT_IDS.has(agent.id)) return false;
  if (agent.telemetryUrl?.trim()) return false;
  if (agent.localDataDir?.trim() && agent.localDataDir !== "~/.hermes") return false;
  if ((knownWork[agent.id]?.length ?? 0) > 0) return false;
  if ((knownMessages[agent.id]?.length ?? 0) > 0) return false;
  return true;
}

function friendlySource(source?: string) {
  if (!source) return "Activity";
  if (source === "hermes-state") return "Hermes history";
  if (source.startsWith("task-bus")) return "Task handoff";
  if (source.includes("/logs") || source.endsWith("/logs")) return "System signal";
  if (source.startsWith("file/") || source.startsWith("data/")) return "Workspace note";
  if (source === "runtime-status") return "Agent status";
  if (source === "dashboard-chat") return "Dashboard chat";
  return source;
}

function sourcePriority(source?: string) {
  if (source === "hermes-state") return 8;
  if (source === "runtime-status") return 7;
  if (source?.startsWith("task-bus")) return 6;
  if (source === "dashboard-chat") return 5;
  if (source?.includes("/tasks") || source?.includes("/inbox") || source?.includes("/outbox")) return 4;
  if (source?.includes("/cron")) return 2;
  if (source?.includes("/logs") || source?.includes("/sessions")) return 0;
  return 1;
}

function workPriority(task: AgentTask) {
  const statusBoost = task.status === "active" ? 20 : task.status === "failed" ? 15 : 0;
  return statusBoost + sourcePriority(task.source);
}

function isLowValueActivity(task: AgentTask) {
  return sourcePriority(task.source) <= 2
    || /^\s*\{/.test(task.title)
    || /Loaded main app package|Checking for update|gateway\.run|INFO\s+gateway/i.test(task.title + " " + task.lastMessage);
}

function isMeaningfulActive(task: AgentTask) {
  return task.status === "active" && sourcePriority(task.source) >= 4;
}

function cleanActivityTitle(title: string) {
  return title
    .replace(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}[,.\d]*\s*/u, "")
    .replace(/^INFO\s+/i, "")
    .replace(/^Loaded main app package\s+/i, "Opened ")
    .trim();
}

function cleanActivityMarkdown(message: string) {
  return message
    .replace(/\b\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}[,.\d]*\b/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function safeMarkdownHref(href: string) {
  const trimmed = href.trim();
  if (/^(https?:|mailto:|#)/i.test(trimmed)) return trimmed;
  return "#";
}

function renderInlineMarkdown(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    const value = match[0];
    const index = match.index ?? 0;
    if (index > cursor) parts.push(text.slice(cursor, index));
    if (value.startsWith("`")) {
      parts.push(<code key={`${index}-code`}>{value.slice(1, -1)}</code>);
    } else if (value.startsWith("**")) {
      parts.push(<strong key={`${index}-strong`}>{value.slice(2, -2)}</strong>);
    } else if (value.startsWith("*")) {
      parts.push(<em key={`${index}-em`}>{value.slice(1, -1)}</em>);
    } else {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(value);
      parts.push(link ? (
        <a href={safeMarkdownHref(link[2])} key={`${index}-link`} onClick={(event) => event.stopPropagation()}>
          {link[1]}
        </a>
      ) : value);
    }
    cursor = index + value.length;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}

function ActivityMarkdown({ text }: { text: string }) {
  const markdown = cleanActivityMarkdown(text);
  if (!markdown) return <p>No readable message was stored.</p>;
  const lines = markdown.split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.trim().startsWith("```")) {
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        code.push(lines[index]);
        index += 1;
      }
      index += 1;
      blocks.push(<pre key={`code-${index}`}><code>{code.join("\n")}</code></pre>);
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      blocks.push(<strong className="markdownHeading" key={`heading-${index}`}>{renderInlineMarkdown(heading[2])}</strong>);
      index += 1;
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*[-*]\s+/, ""));
        index += 1;
      }
      blocks.push(<ul key={`list-${index}`}>{items.map((item, itemIndex) => <li key={`${index}-${itemIndex}`}>{renderInlineMarkdown(item)}</li>)}</ul>);
      continue;
    }

    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*\d+[.)]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*\d+[.)]\s+/, ""));
        index += 1;
      }
      blocks.push(<ol key={`ordered-${index}`}>{items.map((item, itemIndex) => <li key={`${index}-${itemIndex}`}>{renderInlineMarkdown(item)}</li>)}</ol>);
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      const quote: string[] = [];
      while (index < lines.length && /^\s*>\s?/.test(lines[index])) {
        quote.push(lines[index].replace(/^\s*>\s?/, ""));
        index += 1;
      }
      blocks.push(<blockquote key={`quote-${index}`}>{renderInlineMarkdown(quote.join(" "))}</blockquote>);
      continue;
    }

    const paragraph: string[] = [];
    while (
      index < lines.length
      && lines[index].trim()
      && !lines[index].trim().startsWith("```")
      && !/^(#{1,3})\s+/.test(lines[index])
      && !/^\s*[-*]\s+/.test(lines[index])
      && !/^\s*\d+[.)]\s+/.test(lines[index])
      && !/^\s*>\s?/.test(lines[index])
    ) {
      paragraph.push(lines[index]);
      index += 1;
    }
    blocks.push(<p key={`paragraph-${index}`}>{renderInlineMarkdown(paragraph.join(" "))}</p>);
  }

  return <div className="activityMarkdown">{blocks}</div>;
}

function agentStatusVerb(task: AgentTask | undefined) {
  if (!task) return "Standing by";
  if (task.status === "active") return "Working";
  if (task.status === "failed") return "Needs review";
  return "Last seen";
}

function visibleAgentWork(work: AgentTask[], expanded: boolean) {
  if (expanded) return work;
  const meaningful = work.filter((task) => !isLowValueActivity(task));
  return (meaningful.length > 0 ? meaningful : work).slice(0, 3);
}

function machineVersionCopy(machine: MachineGroup, latestCommit?: string) {
  const versionState = machineVersionState(machine, latestCommit);
  if (!versionState) return null;
  if (versionState.state === "current") return { label: "Synced", detail: "Latest dashboard tools", state: "current" };
  if (versionState.state === "stale") return { label: "Update ready", detail: "New dashboard tools available", state: "stale" };
  if (versionState.state === "dirty") return { label: "Local edits", detail: "Review before updating", state: "dirty" };
  return { label: "Refresh setup", detail: "Collector needs one update", state: "unknown" };
}

function friendlyAgentState(snapshot: AgentSnapshot | undefined, hasTelemetryUrl: boolean, activeCount: number) {
  if (activeCount > 0) return { label: `${activeCount} working`, tone: "working" };
  if (snapshot?.ok) return { label: "Connected", tone: "ready" };
  if (!hasTelemetryUrl) return { label: "Needs machine", tone: "setup" };
  if (snapshot?.error) return { label: "Check connection", tone: "setup" };
  return { label: "Ready", tone: "ready" };
}

function friendlyEmptyTitle(snapshot: AgentSnapshot | undefined, hasTelemetryUrl: boolean) {
  if (!hasTelemetryUrl) return "Waiting for a collector";
  if (snapshot?.summary?.startsWith("Configured data dir is not available")) return "Agent folder needs a path";
  if (snapshot?.summary?.startsWith("Remote collector unavailable")) return "Machine is temporarily unreachable";
  if (snapshot?.processRunning) return "Agent is running";
  return "Waiting for new work";
}

function friendlyEmptyBody(snapshot: AgentSnapshot | undefined, hasTelemetryUrl: boolean) {
  if (!hasTelemetryUrl) return "Install the collector on the machine that runs this agent and it will be placed automatically.";
  if (snapshot?.summary?.startsWith("Configured data dir is not available")) return "Choose the folder where this agent stores its history on that machine.";
  if (snapshot?.summary?.startsWith("Remote collector unavailable")) return "The last known card is being kept while the machine catches up.";
  return "This agent is connected. Its current work and recent history will appear here when activity is recorded.";
}

function shouldKeepSnapshot(previous: AgentSnapshot | undefined, incoming: AgentSnapshot) {
  if (!previous?.tasks?.length || incoming.tasks.length > 0 || incoming.error) return false;
  if (!incoming.ok || !incoming.runtimeReachable) return false;
  const newestPreviousTask = Math.max(...previous.tasks.map((task) => task.updatedAt || previous.checkedAt || 0));
  return Date.now() - newestPreviousTask < QUIET_SNAPSHOT_HOLD_MS;
}

function mergeSnapshot(previous: AgentSnapshot | undefined, incoming: AgentSnapshot) {
  if (!shouldKeepSnapshot(previous, incoming)) return incoming;
  if (!previous) return incoming;
  return {
    ...incoming,
    summary: previous.summary,
    sources: [...new Set([...incoming.sources, ...previous.sources, "recent activity"])],
    tasks: previous.tasks,
    checkedAt: incoming.checkedAt,
  };
}

function mergeSnapshotRecord(current: Record<string, AgentSnapshot>, incoming: AgentSnapshot[]) {
  const next = { ...current };
  for (const snapshot of incoming) {
    next[snapshot.agentId] = mergeSnapshot(current[snapshot.agentId], snapshot);
  }
  return next;
}

function mergeMachineSnapshots(previous: AgentSnapshot[] = [], incoming: AgentSnapshot[] = []) {
  const previousById = new Map(previous.map((snapshot) => [snapshot.agentId, snapshot]));
  return incoming.map((snapshot) => mergeSnapshot(previousById.get(snapshot.agentId), snapshot));
}

function mergeDiscoveredMachines(current: DiscoveredMachine[], incoming: DiscoveredMachine[]) {
  const currentByKey = new Map(current.map((machine) => [collectorKey(machine.device.collectorUrl) || machine.device.name, machine]));
  const now = Date.now();

  return incoming.map((machine) => {
    const key = collectorKey(machine.device.collectorUrl) || machine.device.name;
    const previous = currentByKey.get(key);
    const hasFreshAgentData = machine.collector === "ready" && machine.agents.length > 0;
    const mergedSnapshots = mergeMachineSnapshots(previous?.snapshots, machine.snapshots);
    const hasFreshSnapshots = mergedSnapshots.length > 0;

    if (!previous || hasFreshAgentData || hasFreshSnapshots) {
      return {
        ...machine,
        snapshots: mergedSnapshots,
        lastSeenAt: hasFreshAgentData || hasFreshSnapshots ? now : previous?.lastSeenAt,
      };
    }

    if (previous.agents.length === 0 && previous.snapshots.length === 0) {
      return { ...machine, lastSeenAt: previous.lastSeenAt };
    }

    return {
      ...machine,
      collector: previous.collector === "ready" ? "ready" : machine.collector,
      agents: previous.agents,
      snapshots: previous.snapshots,
      version: previous.version,
      lastSeenAt: previous.lastSeenAt,
    };
  });
}

function machineVersionState(machine: MachineGroup, latestCommit?: string) {
  if (machine.key === "unassigned" || machine.collector !== "ready") return null;
  const version = machine.version;
  const commit = version?.commit;
  const target = latestCommit || version?.latestCommit;
  if (!commit) return { state: "unknown", label: "Update collector", detail: "This machine has an older collector that does not report its version yet." };
  if (version?.dirty) return { state: "dirty", label: "Local changes", detail: `Running ${version.shortCommit ?? commit.slice(0, 7)} with local changes.` };
  if (target && commit !== target) return { state: "stale", label: "Update available", detail: `${version?.shortCommit ?? commit.slice(0, 7)} -> ${version?.latestShortCommit ?? target.slice(0, 7)}` };
  return { state: "current", label: "Up to date", detail: version?.shortCommit ?? commit.slice(0, 7) };
}

function setupCollectorCommand() {
  return [
    `git clone ${REPO_CLONE_URL} omni-agent-hivemind 2>/dev/null || true`,
    "cd omni-agent-hivemind",
    "git pull --ff-only",
    "./setup.sh",
  ].join("\n");
}

export default function Home() {
  const [agents, setAgents] = useState<AgentProfile[]>(() => parseStoredAgents());
  const [selectedAgentId, setSelectedAgentId] = useState(() => parseStoredAgents()[0]?.id ?? "openclaw-main");
  const [draftRuntime, setDraftRuntime] = useState<AgentRuntime>("hermes");
  const [text, setText] = useState("");
  const [status, setStatus] = useState<GatewayStatus | null>(null);
  const [statusAgentId, setStatusAgentId] = useState("");
  const [vaultStatus, setVaultStatus] = useState<Record<string, unknown> | null>(null);
  const [controlRoomStatus, setControlRoomStatus] = useState<Record<string, unknown> | null>(null);
  const [sharedVault, setSharedVault] = useState<SharedVaultConfig>(() => parseStoredVault());
  const [messagesByAgent, setMessagesByAgent] = useState<Record<string, ChatMessage[]>>({});
  const [tasks, setTasks] = useState<AgentTask[]>(() => parseStoredTasks());
  const [walletsByAgent, setWalletsByAgent] = useState<Record<string, AgentWalletConfig>>(() => parseStoredWallets());
  const [expandedAgentId, setExpandedAgentId] = useState<string | null>(null);
  const [fleetSnapshots, setFleetSnapshots] = useState<Record<string, AgentSnapshot>>({});
  const [fleetCheckedAt, setFleetCheckedAt] = useState<number | null>(null);
  const [tailscaleDevices, setTailscaleDevices] = useState<TailscaleDevice[]>([]);
  const [tailscaleStatus, setTailscaleStatus] = useState("Checking Tailnet...");
  const [discoveredMachines, setDiscoveredMachines] = useState<DiscoveredMachine[]>([]);
  const [appVersion, setAppVersion] = useState<AppVersion | null>(null);
  const [updateStatusByMachine, setUpdateStatusByMachine] = useState<Record<string, MachineUpdateStatus>>({});
  const [copiedUpdateDetailKey, setCopiedUpdateDetailKey] = useState("");
  const [setupMachineKey, setSetupMachineKey] = useState("");
  const [setupCommandCopied, setSetupCommandCopied] = useState(false);
  const [kanbanBoard, setKanbanBoard] = useState<KanbanBoard | null>(null);
  const [kanbanBoards, setKanbanBoards] = useState<KanbanBoardSummary[]>([]);
  const [kanbanBoardSlug, setKanbanBoardSlug] = useState("default");
  const [kanbanError, setKanbanError] = useState("");
  const [kanbanIncludeArchived, setKanbanIncludeArchived] = useState(false);
  const [kanbanTenantFilter, setKanbanTenantFilter] = useState("");
  const [kanbanAssigneeFilter, setKanbanAssigneeFilter] = useState("");
  const [kanbanSearch, setKanbanSearch] = useState("");
  const [kanbanTenants, setKanbanTenants] = useState<string[]>([]);
  const [kanbanAssignees, setKanbanAssignees] = useState<string[]>([]);
  const [selectedKanbanTaskId, setSelectedKanbanTaskId] = useState("");
  const [newTaskDraft, setNewTaskDraft] = useState({ title: "", body: "", assignee: "", tenant: "", priority: "normal" as KanbanPriority });
  const [newBoardDraft, setNewBoardDraft] = useState({ slug: "", name: "" });
  const [commentDraft, setCommentDraft] = useState("");
  const [activeView, setActiveView] = useState<DashboardView>("agents");
  const [agentComposer, setAgentComposer] = useState({ name: "", machineKey: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(agents));
  }, [agents]);

  useEffect(() => {
    window.localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(sharedVault));
  }, [sharedVault]);

  useEffect(() => {
    window.localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(tasks.slice(0, 80)));
  }, [tasks]);

  useEffect(() => {
    window.localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(walletsByAgent));
  }, [walletsByAgent]);

  useEffect(() => {
    let cancelled = false;
    async function refreshFleetSnapshot() {
      const response = await fetch("/api/fleet/snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agents, sharedVault }),
      }).catch(() => null);
      if (!response?.ok) return;
      const data = (await response.json().catch(() => null)) as {
        checkedAt?: number;
        snapshots?: AgentSnapshot[];
      } | null;
      if (cancelled || !data?.snapshots) return;
      setFleetSnapshots((current) => mergeSnapshotRecord(current, data.snapshots ?? []));
      setFleetCheckedAt(data.checkedAt ?? Date.now());
    }
    refreshFleetSnapshot();
    const timer = window.setInterval(refreshFleetSnapshot, 10_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [agents, sharedVault]);

  useEffect(() => {
    async function refreshTailscaleDevices() {
      const response = await fetch("/api/tailscale/devices", { cache: "no-store" }).catch(() => null);
      const data = await response?.json().catch(() => null) as {
        ok?: boolean;
        backendState?: string;
        devices?: TailscaleDevice[];
        error?: string;
      } | null;
      setTailscaleDevices(data?.devices ?? []);
      setTailscaleStatus(data?.ok ? `Tailscale ${data.backendState}` : data?.error ?? "Tailscale unavailable");
    }
    refreshTailscaleDevices();
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function refreshDiscovery() {
      const response = await fetch("/api/fleet/discover", { cache: "no-store" }).catch(() => null);
      const data = await response?.json().catch(() => null) as {
        machines?: DiscoveredMachine[];
      } | null;
      if (cancelled || !data?.machines) return;
      const machines = data.machines;
      setDiscoveredMachines((current) => mergeDiscoveredMachines(current, machines));
      const discoveredSnapshots = data.machines.flatMap((machine) => machine.snapshots ?? []);
      if (discoveredSnapshots.length > 0) {
        setFleetSnapshots((current) => mergeSnapshotRecord(current, discoveredSnapshots));
      }
    }
    refreshDiscovery();
    const timer = window.setInterval(refreshDiscovery, 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    async function refreshVersion() {
      const response = await fetch("/api/app/version", { cache: "no-store" }).catch(() => null);
      const data = await response?.json().catch(() => null) as AppVersion | null;
      if (data?.commit) setAppVersion(data);
    }
    refreshVersion();
    const timer = window.setInterval(refreshVersion, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function refreshKanban() {
      const params = new URLSearchParams({
        board: kanbanBoardSlug,
        include_archived: String(kanbanIncludeArchived),
      });
      if (kanbanTenantFilter) params.set("tenant", kanbanTenantFilter);
      if (kanbanAssigneeFilter) params.set("assignee", kanbanAssigneeFilter);
      if (kanbanSearch) params.set("q", kanbanSearch);
      const response = await fetch(`/api/openclaw/kanban?${params.toString()}`, { cache: "no-store" }).catch(() => null);
      const data = await response?.json().catch(() => null) as KanbanResponse | null;
      if (cancelled) return;
      if (!data?.ok || !data.board) {
        setKanbanError(data?.error ?? "Kanban board is unavailable.");
        return;
      }
      setKanbanError("");
      setKanbanBoard(data.board);
      setKanbanBoards(data.boards ?? []);
      setKanbanTenants(data.tenants ?? []);
      setKanbanAssignees(data.assignees ?? []);
      setSelectedKanbanTaskId((current) => (
        current && data.board?.tasks.some((task) => task.id === current) ? current : data.board?.tasks[0]?.id ?? ""
      ));
    }
    refreshKanban();
    const timer = window.setInterval(refreshKanban, 12_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [kanbanBoardSlug, kanbanIncludeArchived, kanbanTenantFilter, kanbanAssigneeFilter, kanbanSearch]);

  const discoveredAgents = useMemo(
    () => discoveredMachines.flatMap((machine) => machine.agents ?? []),
    [discoveredMachines],
  );

  const candidateAgents = useMemo(
    () => dedupeAgents(agents, discoveredAgents),
    [agents, discoveredAgents],
  );

  const candidateWorkById = useMemo(() => {
    return Object.fromEntries(candidateAgents.map((agent) => {
      const agentTasks = tasks
        .filter((task) => task.agentId === agent.id)
        .sort((a, b) => b.updatedAt - a.updatedAt);
      const observedTasks = fleetSnapshots[agent.id]?.tasks ?? [];
      const transcript = messagesByAgent[agent.id] ?? [];
      const transcriptTask: AgentTask | null = transcript.length > 0
        ? {
          id: `recent-${agent.id}`,
          agentId: agent.id,
          title: inferCurrentTask(transcript),
          lastMessage: inferLatestAgentMessage(transcript),
          status: "completed",
          startedAt: 0,
          updatedAt: 0,
          source: "dashboard-chat",
        }
        : null;
      const work = [...agentTasks, ...observedTasks, ...(transcriptTask && agentTasks.length === 0 ? [transcriptTask] : [])]
        .filter((task, index, list) => list.findIndex((item) => item.id === task.id) === index)
        .sort((a, b) => workPriority(b) - workPriority(a) || b.updatedAt - a.updatedAt);
      return [agent.id, work];
    }));
  }, [candidateAgents, fleetSnapshots, messagesByAgent, tasks]);

  const displayAgents = useMemo(
    () => candidateAgents.filter((agent) => !isStarterPlaceholder(agent, candidateWorkById, messagesByAgent)),
    [candidateAgents, candidateWorkById, messagesByAgent],
  );

  const agentWorkById = useMemo(() => {
    return Object.fromEntries(displayAgents.map((agent) => [agent.id, candidateWorkById[agent.id] ?? []]));
  }, [candidateWorkById, displayAgents]);

  const selectedAgent = useMemo(
    () => displayAgents.find((agent) => agent.id === selectedAgentId) ?? displayAgents[0],
    [displayAgents, selectedAgentId],
  );

  const messages = useMemo(
    () => selectedAgent
      ? messagesByAgent[selectedAgent.id] ?? [{
        role: "system" as const,
        content: `Chatting with ${selectedAgent.name}. Pick a machine to start fresh, or resume a previous chat when one is listed.`,
      }]
      : [],
    [messagesByAgent, selectedAgent],
  );

  const lastAssistant = useMemo(
    () => [...messages].reverse().find((message) => message.role === "assistant")?.content ?? "",
    [messages],
  );

  const machineGroups = useMemo<MachineGroup[]>(() => {
    const discoveryByKey = new Map(discoveredMachines.map((machine) => [collectorKey(machine.device.collectorUrl), machine]));
    const selfDevice = tailscaleDevices.find((device) => device.self);
    const groups = tailscaleDevices.map((device) => {
      const discovered = discoveryByKey.get(collectorKey(device.collectorUrl));
      return {
      key: collectorKey(device.collectorUrl) || device.name,
      name: device.self ? "This Mac" : device.name,
      address: device.ip || device.dnsName,
      collectorUrl: device.collectorUrl,
      dnsName: device.dnsName,
      ip: device.ip,
      online: device.online,
      self: device.self,
      collector: (discovered?.collector ?? "unknown") as MachineGroup["collector"],
      agents: [] as AgentProfile[],
      version: discovered?.version,
      };
    });
    const unassigned: MachineGroup = {
      key: "unassigned",
      name: "Not connected yet",
      address: "These saved agents are waiting for a machine collector",
      collectorUrl: "",
      dnsName: "",
      ip: "",
      online: false,
      self: false,
      collector: "missing",
      agents: [],
    };

    for (const agent of displayAgents) {
      const explicitKey = collectorKey(agent.telemetryUrl);
      const localKey = selfDevice && (
        agent.localDataDir?.startsWith("~")
        || agent.localDataDir?.startsWith("/Users/")
      ) ? collectorKey(selfDevice.collectorUrl) : "";
      const key = explicitKey || localKey;
      const group = key ? groups.find((item) => item.key === key) : undefined;
      if (group) {
        group.agents.push(agent);
      } else {
        unassigned.agents.push(agent);
      }
    }

    return groups;
  }, [displayAgents, discoveredMachines, tailscaleDevices]);

  const connectableMachines = useMemo(
    () => machineGroups.filter((machine) => machine.key !== "unassigned" && machine.collector === "ready"),
    [machineGroups],
  );

  const visibleAgentCount = useMemo(
    () => machineGroups.reduce((total, machine) => total + machine.agents.length, 0),
    [machineGroups],
  );

  const kanbanColumns = useMemo(
    () => groupKanbanTasks(kanbanBoard?.tasks ?? [], kanbanIncludeArchived),
    [kanbanBoard, kanbanIncludeArchived],
  );

  const selectedKanbanTask = useMemo(
    () => kanbanBoard?.tasks.find((task) => task.id === selectedKanbanTaskId) ?? null,
    [kanbanBoard, selectedKanbanTaskId],
  );

  const selectedKanbanComments = useMemo(
    () => kanbanBoard?.comments.filter((comment) => comment.taskId === selectedKanbanTaskId)
      .sort((a, b) => a.createdAt - b.createdAt) ?? [],
    [kanbanBoard, selectedKanbanTaskId],
  );

  const selectedKanbanEvents = useMemo(
    () => kanbanBoard?.events.filter((event) => !event.taskId || event.taskId === selectedKanbanTaskId).slice(0, 20) ?? [],
    [kanbanBoard, selectedKanbanTaskId],
  );

  const selectedWallet = useMemo(() => {
    if (!selectedAgent) return null;
    return walletsByAgent[selectedAgent.id] ?? createDefaultAgentWallet(selectedAgent.id);
  }, [selectedAgent, walletsByAgent]);

  const selectedWalletSnapshot = useMemo(
    () => selectedWallet ? getSurvivalSnapshot(selectedWallet) : null,
    [selectedWallet],
  );

  const walletStats = useMemo(() => {
    const walletRows = displayAgents.map((agent) => walletsByAgent[agent.id] ?? createDefaultAgentWallet(agent.id));
    const enabled = walletRows.filter((wallet) => wallet.enabled);
    const survival = enabled.map((wallet) => getSurvivalSnapshot(wallet));
    return {
      enabled: enabled.length,
      critical: survival.filter((snapshot) => snapshot.tier === "critical" || snapshot.tier === "dead").length,
      balance: survival.reduce((total, snapshot) => total + Math.max(0, snapshot.effectiveBalanceUsd), 0),
    };
  }, [displayAgents, walletsByAgent]);

  const kanbanAssigneeOptions = useMemo(() => {
    const local = displayAgents.map((agent) => agent.agentId || agent.id);
    return [...new Set([...local, ...kanbanAssignees].filter(Boolean))].sort();
  }, [displayAgents, kanbanAssignees]);

  const navItems = useMemo(() => [
    {
      id: "agents" as const,
      label: "Agents",
      detail: `${visibleAgentCount} live`,
    },
    {
      id: "kanban" as const,
      label: "Kanban",
      detail: `${kanbanBoard?.tasks.length ?? 0} tasks`,
    },
    {
      id: "wallet" as const,
      label: "Wallet",
      detail: `${walletStats.enabled} funded`,
    },
    {
      id: "vault" as const,
      label: "Vault",
      detail: sharedVault.enabled ? "enabled" : "off",
    },
    {
      id: "chat" as const,
      label: "Chat",
      detail: selectedAgent?.name ?? "none",
    },
  ], [kanbanBoard?.tasks.length, selectedAgent?.name, sharedVault.enabled, visibleAgentCount, walletStats.enabled]);

  const setupMachine = useMemo(
    () => machineGroups.find((machine) => machine.key === setupMachineKey) ?? null,
    [machineGroups, setupMachineKey],
  );

  function updateAgent(patch: Partial<AgentProfile>) {
    if (!selectedAgent) return;
    setAgents((current) => current.map((agent) => (
      agent.id === selectedAgent.id ? { ...agent, ...patch } : agent
    )));
  }

  function updateSharedVault(patch: Partial<SharedVaultConfig>) {
    setSharedVault((current) => ({ ...current, ...patch }));
  }

  function updateWallet(agentId: string, patch: Partial<AgentWalletConfig>) {
    setWalletsByAgent((current) => {
      const existing = current[agentId] ?? createDefaultAgentWallet(agentId);
      return {
        ...current,
        [agentId]: {
          ...existing,
          ...patch,
          updatedAt: Date.now(),
        },
      };
    });
  }

  function resetWalletBurnClock(agentId: string) {
    const wallet = walletsByAgent[agentId] ?? createDefaultAgentWallet(agentId);
    updateWallet(agentId, {
      currentBalanceUsd: normalizeMoney(wallet.currentBalanceUsd, wallet.seedBalanceUsd),
      survivalStartedAt: Date.now(),
    });
  }

  async function copyPaymentPrompt(config: AgentWalletConfig) {
    await navigator.clipboard?.writeText(buildAgentPaymentPrompt(config)).catch(() => undefined);
  }

  function addAgent(runtime: AgentRuntime = draftRuntime) {
    const targetMachine = connectableMachines.find((machine) => machine.key === agentComposer.machineKey)
      ?? connectableMachines[0];
    if (!targetMachine) return;
    const next = {
      ...createAgentProfile(runtime, runtimeCount(agents, runtime) + 1),
      name: agentComposer.name.trim() || `${RUNTIME_LABELS[runtime]} on ${targetMachine.name}`,
      telemetryUrl: targetMachine.collectorUrl,
      machineName: targetMachine.name,
      localDataDir: "",
    };
    setAgents((current) => [...current, next]);
    setSelectedAgentId(next.id);
    setAgentComposer({ name: "", machineKey: targetMachine.key });
  }

  function duplicateAgent() {
    if (!selectedAgent) return;
    const next = {
      ...selectedAgent,
      id: `${selectedAgent.runtime}-${Date.now()}`,
      name: `${selectedAgent.name} Copy`,
    };
    setAgents((current) => [...current, next]);
    setSelectedAgentId(next.id);
  }

  function deleteAgent(agentId = selectedAgent?.id) {
    if (!agentId || agents.length <= 1) return;
    const next = agents.filter((agent) => agent.id !== agentId);
    setAgents(next);
    if (selectedAgentId === agentId) {
      setSelectedAgentId(next[0]?.id ?? "");
    }
    setMessagesByAgent((current) => {
      const nextMessages = { ...current };
      delete nextMessages[agentId];
      return nextMessages;
    });
  }

  function switchRuntime(runtime: AgentRuntime) {
    const defaults = RUNTIME_DEFAULTS[runtime];
    updateAgent({
      runtime,
      gatewayUrl: defaults.gatewayUrl,
      chatPath: defaults.chatPath,
      statusPath: defaults.statusPath,
      agentId: runtime === "openclaw" ? "main" : selectedAgent?.agentId ?? "",
    });
  }

  function appendMessage(agentId: string, message: ChatMessage) {
    setMessagesByAgent((current) => ({
      ...current,
      [agentId]: [...(current[agentId] ?? []), message],
    }));
  }

  function hasConversation(agentId: string) {
    return (messagesByAgent[agentId] ?? []).some((message) => message.role !== "system" && message.content.trim());
  }

  function conversationTitle(agentId: string) {
    const firstUserMessage = (messagesByAgent[agentId] ?? []).find((message) => message.role === "user")?.content.trim();
    return firstUserMessage ? firstUserMessage.slice(0, 56) : "Previous chat";
  }

  function startAgentChat(agentId: string, fresh = false) {
    setSelectedAgentId(agentId);
    setActiveView("chat");
    setStatus(null);
    setStatusAgentId("");
    if (fresh) {
      setMessagesByAgent((current) => {
        const nextMessages = { ...current };
        delete nextMessages[agentId];
        return nextMessages;
      });
    }
  }

  function openSetupModal(machine: MachineGroup) {
    setSetupMachineKey(machine.key);
    setSetupCommandCopied(false);
  }

  async function copySetupCommand() {
    await navigator.clipboard?.writeText(setupCollectorCommand()).catch(() => undefined);
    setSetupCommandCopied(true);
    window.setTimeout(() => setSetupCommandCopied(false), 2500);
  }

  function upsertTask(task: AgentTask) {
    setTasks((current) => [task, ...current.filter((item) => item.id !== task.id)].slice(0, 80));
  }

  function updateTask(taskId: string, patch: Partial<AgentTask>) {
    setTasks((current) => current.map((task) => (
      task.id === taskId ? { ...task, ...patch, updatedAt: Date.now() } : task
    )));
  }

  async function runMachineUpdate(machine: MachineGroup) {
    setUpdateStatusByMachine((current) => ({ ...current, [machine.key]: { label: "Updating...", tone: "working" } }));
    const response = await fetch("/api/fleet/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        collectorUrl: machine.collectorUrl,
        dnsName: machine.dnsName,
        name: machine.name,
        ip: machine.ip || machine.address,
        appDir: machine.version?.appDir,
        updateCommand: machine.version?.updateCommand,
      }),
    }).catch(() => null);
    const data = await response?.json().catch(() => null) as {
      ok?: boolean;
      error?: string;
      method?: string;
      fallbackCommand?: string;
    } | null;
    const detail = data?.ok
      ? "The machine accepted the update. It may disappear briefly while the dashboard restarts."
      : [data?.error ?? "Update failed", data?.fallbackCommand ? `Fallback script:\n${data.fallbackCommand}` : ""].filter(Boolean).join("\n\n");
    setUpdateStatusByMachine((current) => ({
      ...current,
      [machine.key]: {
        label: data?.ok
          ? `Updating via ${data.method === "tailscale-ssh" ? "Tailscale SSH" : "collector"}`
          : "Update failed",
        detail,
        tone: data?.ok ? "success" : "error",
      },
    }));
    if (data?.ok) {
      window.setTimeout(() => {
        setUpdateStatusByMachine((current) => {
          const next = { ...current };
          delete next[machine.key];
          return next;
        });
      }, 8_000);
    }
  }

  async function copyUpdateDetail(machineKey: string) {
    const detail = updateStatusByMachine[machineKey]?.detail;
    if (!detail) return;
    await navigator.clipboard?.writeText(detail).catch(() => undefined);
    setCopiedUpdateDetailKey(machineKey);
    window.setTimeout(() => setCopiedUpdateDetailKey((current) => current === machineKey ? "" : current), 2500);
  }

  async function refreshKanbanOnce() {
    const params = new URLSearchParams({ board: kanbanBoardSlug, include_archived: String(kanbanIncludeArchived) });
    if (kanbanTenantFilter) params.set("tenant", kanbanTenantFilter);
    if (kanbanAssigneeFilter) params.set("assignee", kanbanAssigneeFilter);
    if (kanbanSearch) params.set("q", kanbanSearch);
    const response = await fetch(`/api/openclaw/kanban?${params.toString()}`, { cache: "no-store" });
    const data = await response.json().catch(() => null) as KanbanResponse | null;
    if (!response.ok || !data?.ok || !data.board) throw new Error(data?.error ?? "Kanban refresh failed.");
    setKanbanError("");
    setKanbanBoard(data.board);
    setKanbanBoards(data.boards ?? []);
    setKanbanTenants(data.tenants ?? []);
    setKanbanAssignees(data.assignees ?? []);
  }

  async function createKanbanTask(event: FormEvent) {
    event.preventDefault();
    if (!newTaskDraft.title.trim()) return;
    const response = await fetch(`/api/openclaw/kanban?board=${encodeURIComponent(kanbanBoardSlug)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTaskDraft.title,
        body: newTaskDraft.body,
        assignee: newTaskDraft.assignee,
        tenant: newTaskDraft.tenant,
        priority: newTaskDraft.priority,
        status: "triage",
      }),
    });
    const data = await response.json().catch(() => null) as KanbanResponse | null;
    if (!response.ok || !data?.ok) {
      setKanbanError(data?.error ?? "Could not create task.");
      return;
    }
    setNewTaskDraft({ title: "", body: "", assignee: "", tenant: "", priority: "normal" });
    await refreshKanbanOnce().catch((error) => setKanbanError(error instanceof Error ? error.message : "Kanban refresh failed."));
  }

  async function createKanbanBoard(event: FormEvent) {
    event.preventDefault();
    if (!newBoardDraft.slug.trim()) return;
    const response = await fetch("/api/openclaw/kanban", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create-board", slug: newBoardDraft.slug, name: newBoardDraft.name }),
    });
    const data = await response.json().catch(() => null) as KanbanResponse | null;
    if (!response.ok || !data?.ok || !data.board) {
      setKanbanError(data?.error ?? "Could not create board.");
      return;
    }
    setNewBoardDraft({ slug: "", name: "" });
    setKanbanBoardSlug(data.board.meta.slug);
  }

  async function patchKanbanTask(taskId: string, patch: Partial<KanbanTask>) {
    const response = await fetch(`/api/openclaw/kanban?board=${encodeURIComponent(kanbanBoardSlug)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, patch }),
    });
    const data = await response.json().catch(() => null) as KanbanResponse | null;
    if (!response.ok || !data?.ok) {
      setKanbanError(data?.error ?? "Could not update task.");
      return;
    }
    await refreshKanbanOnce().catch((error) => setKanbanError(error instanceof Error ? error.message : "Kanban refresh failed."));
  }

  async function moveKanbanTask(taskId: string, status: KanbanStatus) {
    const response = await fetch(`/api/openclaw/kanban?board=${encodeURIComponent(kanbanBoardSlug)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, status }),
    });
    const data = await response.json().catch(() => null) as KanbanResponse | null;
    if (!response.ok || !data?.ok) {
      setKanbanError(data?.error ?? "Could not move task.");
      return;
    }
    await refreshKanbanOnce().catch((error) => setKanbanError(error instanceof Error ? error.message : "Kanban refresh failed."));
  }

  async function addKanbanComment(event: FormEvent) {
    event.preventDefault();
    if (!selectedKanbanTask || !commentDraft.trim()) return;
    const response = await fetch(`/api/openclaw/kanban?board=${encodeURIComponent(kanbanBoardSlug)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "comment", taskId: selectedKanbanTask.id, body: commentDraft, author: "dashboard" }),
    });
    const data = await response.json().catch(() => null) as KanbanResponse | null;
    if (!response.ok || !data?.ok) {
      setKanbanError(data?.error ?? "Could not add comment.");
      return;
    }
    setCommentDraft("");
    await refreshKanbanOnce().catch((error) => setKanbanError(error instanceof Error ? error.message : "Kanban refresh failed."));
  }

  async function checkStatus() {
    if (!selectedAgent) return;
    setStatus(null);
    setStatusAgentId(selectedAgent.id);
    const response = await fetch("/api/agents/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agent: selectedAgent }),
    });
    const data = (await response.json().catch(() => ({}))) as GatewayStatus;
    setStatus(data);
  }

  async function checkVaultStatus() {
    setVaultStatus(null);
    const response = await fetch("/api/obsidian/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vaultPath: sharedVault.vaultPath }),
    });
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    setVaultStatus(data);
  }

  async function checkControlRoomStatus() {
    setControlRoomStatus(null);
    const response = await fetch("/api/control-room/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ controlRoomPath: sharedVault.controlRoomPath }),
    });
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    setControlRoomStatus(data);
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const prompt = text.trim();
    if (!selectedAgent || !prompt || busy) return;

    setBusy(true);
    setText("");
    const taskId = `${selectedAgent.id}-${Date.now()}`;
    upsertTask({
      id: taskId,
      agentId: selectedAgent.id,
      title: prompt,
      lastMessage: "Starting...",
      status: "active",
      startedAt: Date.now(),
      updatedAt: Date.now(),
    });
    appendMessage(selectedAgent.id, { role: "user", content: prompt });
    appendMessage(selectedAgent.id, { role: "assistant", content: "" });

    try {
      const response = await fetch("/api/chat/agent-runtime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent: selectedAgent,
          sharedVault,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? `Request failed with ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const eventText of events) {
          const line = eventText.split("\n").find((entry) => entry.startsWith("data: "));
          if (!line) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") continue;
          const parsed = JSON.parse(payload) as {
            choices?: Array<{ delta?: { content?: string } }>;
            error?: string;
          };
          if (parsed.error) throw new Error(parsed.error);
          const chunk = parsed.choices?.[0]?.delta?.content;
          if (chunk) {
            let nextTaskMessage = "";
            setMessagesByAgent((current) => {
              const existing = current[selectedAgent.id] ?? [];
              const next = [...existing];
              const last = next[next.length - 1];
              nextTaskMessage = last.content + chunk;
              next[next.length - 1] = { ...last, content: nextTaskMessage };
              return { ...current, [selectedAgent.id]: next };
            });
            updateTask(taskId, { lastMessage: nextTaskMessage || chunk });
          }
        }
      }
      updateTask(taskId, { status: "completed", completedAt: Date.now() });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown runtime error";
      setMessagesByAgent((current) => {
        const existing = current[selectedAgent.id] ?? [];
        const next = [...existing];
        next[next.length - 1] = { role: "assistant", content: `Error: ${message}` };
        return { ...current, [selectedAgent.id]: next };
      });
      updateTask(taskId, { status: "failed", lastMessage: message, completedAt: Date.now() });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <section className="hero">
        <div className="brandIntro">
          <Image
            className="brandLogo"
            src="/omni-agent-hivemind-logo.png"
            alt="Omni-Agent Hivemind"
            width={190}
            height={194}
            style={{ width: "auto", height: "auto" }}
            priority
          />
          <div className="brandCopy">
            <p className="eyebrow">Multi-runtime local agents</p>
            <h1>Omni-Agent Hivemind</h1>
            <p className="lede">OpenClaw, Hermes, and Aeon agents across your Tailnet.</p>
          </div>
        </div>
        <div className="heroTelemetry" aria-label="Fleet summary">
          <div>
            <span>Machines</span>
            <strong>{machineGroups.filter((machine) => machine.key !== "unassigned").length}</strong>
          </div>
          <div>
            <span>Agents</span>
            <strong>{visibleAgentCount}</strong>
          </div>
          <div>
            <span>Last scan</span>
            <strong>{fleetCheckedAt ? formatRelativeTime(fleetCheckedAt) : "Now"}</strong>
          </div>
        </div>
      </section>

      <nav className="viewTabs" aria-label="Dashboard views">
        {navItems.map((item) => (
          <button
            type="button"
            className={`viewTab ${activeView === item.id ? "active" : ""}`}
            aria-pressed={activeView === item.id}
            key={item.id}
            onClick={() => setActiveView(item.id)}
          >
            <span>{item.label}</span>
            <small>{item.detail}</small>
          </button>
        ))}
      </nav>

      {activeView === "agents" ? (
      <section className="agentRail tabPanel">
        <div className="agentRailHeader">
          <div>
            <h2>Agent Control Room</h2>
            <p>
              Agents are discovered automatically from live collectors. Use Connect only when you want to name a
              specific runtime folder or bind an extra profile to a machine.
              {fleetCheckedAt ? ` Last scan ${formatRelativeTime(fleetCheckedAt)}.` : ""}
              {` ${tailscaleStatus}.`}
            </p>
          </div>
          <div className="addAgent">
            <div className="addAgentIntro">
              <strong>Connect an agent</strong>
              <span>{connectableMachines.length > 0 ? "Pick a live machine; no offline cards." : "Run setup on a machine first."}</span>
            </div>
            <select value={draftRuntime} onChange={(event) => setDraftRuntime(event.target.value as AgentRuntime)} aria-label="Agent runtime">
              {Object.entries(RUNTIME_LABELS).map(([runtime, label]) => (
                <option value={runtime} key={runtime}>{label}</option>
              ))}
            </select>
            <select
              value={agentComposer.machineKey || connectableMachines[0]?.key || ""}
              onChange={(event) => setAgentComposer((current) => ({ ...current, machineKey: event.target.value }))}
              aria-label="Machine"
            >
              {connectableMachines.length === 0 ? <option value="">No live collectors</option> : null}
              {connectableMachines.map((machine) => (
                <option value={machine.key} key={machine.key}>{machine.name}</option>
              ))}
            </select>
            <input
              aria-label="Agent display name"
              placeholder="Name optional"
              value={agentComposer.name}
              onChange={(event) => setAgentComposer((current) => ({ ...current, name: event.target.value }))}
            />
            <button type="button" disabled={connectableMachines.length === 0} onClick={() => addAgent()}>
              Attach
            </button>
          </div>
        </div>

        <div className="machineBoard">
          {machineGroups.map((machine) => (
            <section className={`machineGroup ${machine.key === "unassigned" ? "needsSetup" : ""}`} key={machine.key}>
              <div className="machineHeader">
                <div className="machineIdentity">
                  <div className="machineGlyph" aria-hidden="true">{machine.self ? "MAC" : "VPS"}</div>
                  <div>
                    <span>{machine.self ? "This computer" : machine.online ? "Remote workspace" : "Offline workspace"}</span>
                    <h3>{machine.self ? "This Mac" : machine.name}</h3>
                    <p>
                      {machine.agents.length} agent{machine.agents.length === 1 ? "" : "s"}
                      {machine.online ? " ready across your private Tailnet" : " waiting for its collector"}
                    </p>
                  </div>
                  {(() => {
                    const versionState = machineVersionCopy(machine, appVersion?.latestCommit || appVersion?.commit);
                    return versionState && versionState.state !== "current" ? (
                      <small className={`machineVersion ${versionState.state}`}>
                        {versionState.label} · {versionState.detail}
                      </small>
                    ) : null;
                  })()}
                </div>
                <div className="machineHeaderActions">
                  {(() => {
                    const versionState = machineVersionState(machine, appVersion?.latestCommit || appVersion?.commit);
                    const updateStatus = updateStatusByMachine[machine.key];
                    return versionState && versionState.state !== "current" ? (
                      <button
                        type="button"
                        className="machineUpdateFab"
                        disabled={updateStatus?.tone === "working"}
                        onClick={() => runMachineUpdate(machine)}
                      >
                        {updateStatus?.tone === "working" ? "Syncing..." : "Sync"}
                      </button>
                    ) : null;
                  })()}
                  {machine.collector === "ready" ? (
                    <strong>Live</strong>
                  ) : (
                    <button
                      type="button"
                      className="machineConnectFab"
                      onClick={() => openSetupModal(machine)}
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>

              {updateStatusByMachine[machine.key]?.detail ? (
                <div className={`machineUpdateStatus ${updateStatusByMachine[machine.key].tone}`}>
                  <div>
                    <strong>{updateStatusByMachine[machine.key].label}</strong>
                    <pre>{updateStatusByMachine[machine.key].detail}</pre>
                  </div>
                  <button type="button" onClick={() => copyUpdateDetail(machine.key)}>
                    {copiedUpdateDetailKey === machine.key ? "Copied" : "Copy"}
                  </button>
                </div>
              ) : null}

              <div className="agentList">
                {machine.agents.length > 0 ? machine.agents.map((agent) => {
                  const agentWork = agentWorkById[agent.id] ?? [];
                  const visibleWork = visibleAgentWork(agentWork, expandedAgentId === agent.id);
                  const activeCount = agentWork.filter(isMeaningfulActive).length;
                  const snapshot = fleetSnapshots[agent.id];
                  const state = friendlyAgentState(snapshot, Boolean(agent.telemetryUrl || machine.self), activeCount);
                  const primaryWork = visibleWork[0] ?? agentWork[0];
                  const paymentWallet = walletsByAgent[agent.id] ?? createDefaultAgentWallet(agent.id);
                  const paymentSnapshot = getSurvivalSnapshot(paymentWallet);
                  return (
                    <article
                      className={`agentCard ${agent.id === selectedAgent?.id ? "active" : ""}`}
                      key={agent.id}
                    >
                      <div className="agentCardTop">
                        <button
                          type="button"
                          className="agentSelect"
                          onClick={() => setSelectedAgentId(agent.id)}
                        >
                          <span>{RUNTIME_LABELS[agent.runtime]} agent</span>
                          <strong>{agent.name}</strong>
                          <small>{agentStatusVerb(primaryWork)}{primaryWork ? ` on ${cleanActivityTitle(primaryWork.title)}` : ""}</small>
                        </button>
                        <span className={`agentState ${state.tone}`}>{state.label}</span>
                      </div>

                      <div className="agentBubbleStack" aria-label={`${agent.name} work bubbles`}>
                        {visibleWork.length > 0 ? visibleWork.map((task, index) => (
                          <article
                            role="button"
                            tabIndex={0}
                            className={`agentBubble ${task.status} ${index === 0 ? "primary" : ""}`}
                            key={`${agent.id}-${task.id}`}
                            onClick={() => setSelectedAgentId(agent.id)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") setSelectedAgentId(agent.id);
                            }}
                          >
                            <span>{task.status === "active" ? "Current work" : task.status === "failed" ? "Needs review" : friendlySource(task.source)}</span>
                            <strong>{cleanActivityTitle(task.title)}</strong>
                            <ActivityMarkdown text={task.lastMessage} />
                            <small>{friendlySource(task.source)} · {task.updatedAt > 0 ? formatRelativeTime(task.updatedAt) : "This session"}</small>
                          </article>
                        )) : (
                          <article
                            role="button"
                            tabIndex={0}
                            className="agentBubble idle"
                            onClick={() => setSelectedAgentId(agent.id)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") setSelectedAgentId(agent.id);
                            }}
                          >
                            <span>{state.tone === "setup" ? "Needs attention" : "Quiet"}</span>
                            <strong>{friendlyEmptyTitle(snapshot, Boolean(agent.telemetryUrl || machine.self))}</strong>
                            <p>{friendlyEmptyBody(snapshot, Boolean(agent.telemetryUrl || machine.self))}</p>
                            <small>{machine.name}</small>
                          </article>
                        )}
                      </div>

                      {agentWork.length > 3 ? (
                        <button
                          type="button"
                          className="agentViewMore"
                          onClick={() => setExpandedAgentId((current) => current === agent.id ? null : agent.id)}
                        >
                          {expandedAgentId === agent.id ? "Show less" : `View ${agentWork.length - 3} more`}
                        </button>
                      ) : null}

                      <div className="agentCardActions">
                        <span className="agentEndpoint">{machine.self ? "Local workspace" : machine.name}</span>
                        <button
                          type="button"
                          className={`agentWalletShortcut ${paymentWallet.enabled ? paymentSnapshot.tier : "off"}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedAgentId(agent.id);
                            setActiveView("wallet");
                          }}
                        >
                          {paymentWallet.enabled
                            ? `Wallet ${paymentSnapshot.tier.replace("_", " ")} · $${Math.max(0, paymentSnapshot.effectiveBalanceUsd).toFixed(2)}`
                            : "Set up wallet"}
                        </button>
                        <button
                          aria-label={`Remove ${agent.name}`}
                          className="agentRemove"
                          disabled={agents.length <= 1}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            deleteAgent(agent.id);
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </article>
                  );
                }) : (
                  <div className="machineEmpty">
                    <strong>{machine.collector === "ready" ? "No agents found on this machine" : "Collector not running yet"}</strong>
                    <p>
                      {machine.collector === "ready"
                        ? "The machine is connected, but it did not report any Hermes, OpenClaw, or Aeon agents yet."
                        : "Run the collector installer on this machine once; after that, agents appear here automatically."}
                    </p>
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      </section>
      ) : null}

      {activeView === "kanban" ? (
      <section className="kanbanPanel tabPanel">
        <div className="kanbanHeader">
          <div>
            <p className="eyebrow">Hermes-style durable work queue</p>
            <h2>Multi-Agent Kanban</h2>
            <p>
              Tasks are stored locally by board, with assignees, comments, dependencies, status history,
              and a human-friendly workflow for agent handoffs.
            </p>
          </div>
          <form className="kanbanBoardCreate" onSubmit={createKanbanBoard}>
            <input
              value={newBoardDraft.slug}
              onChange={(event) => setNewBoardDraft((current) => ({ ...current, slug: event.target.value }))}
              placeholder="new-board"
            />
            <input
              value={newBoardDraft.name}
              onChange={(event) => setNewBoardDraft((current) => ({ ...current, name: event.target.value }))}
              placeholder="Display name"
            />
            <button type="submit">New board</button>
          </form>
        </div>

        <div className="kanbanToolbar">
          <label>
            Board
            <select value={kanbanBoardSlug} onChange={(event) => setKanbanBoardSlug(event.target.value)}>
              {kanbanBoards.length > 0 ? kanbanBoards.map((board) => (
                <option value={board.slug} key={board.slug}>{board.name}</option>
              )) : <option value="default">Default</option>}
            </select>
          </label>
          <label>
            Tenant
            <select value={kanbanTenantFilter} onChange={(event) => setKanbanTenantFilter(event.target.value)}>
              <option value="">All tenants</option>
              {kanbanTenants.map((tenant) => <option value={tenant} key={tenant}>{tenant}</option>)}
            </select>
          </label>
          <label>
            Assignee
            <select value={kanbanAssigneeFilter} onChange={(event) => setKanbanAssigneeFilter(event.target.value)}>
              <option value="">All assignees</option>
              {kanbanAssigneeOptions.map((assignee) => <option value={assignee} key={assignee}>{assignee}</option>)}
            </select>
          </label>
          <label>
            Search
            <input value={kanbanSearch} onChange={(event) => setKanbanSearch(event.target.value)} placeholder="Title, body, result..." />
          </label>
          <label className="toggleRow">
            <input
              type="checkbox"
              checked={kanbanIncludeArchived}
              onChange={(event) => setKanbanIncludeArchived(event.target.checked)}
            />
            Archived
          </label>
        </div>

        {kanbanError ? <p className="kanbanError">{kanbanError}</p> : null}

        <form className="kanbanComposer" onSubmit={createKanbanTask}>
          <input
            value={newTaskDraft.title}
            onChange={(event) => setNewTaskDraft((current) => ({ ...current, title: event.target.value }))}
            placeholder="Task title"
          />
          <input
            value={newTaskDraft.body}
            onChange={(event) => setNewTaskDraft((current) => ({ ...current, body: event.target.value }))}
            placeholder="Body or handoff instructions"
          />
          <select
            value={newTaskDraft.assignee}
            onChange={(event) => setNewTaskDraft((current) => ({ ...current, assignee: event.target.value }))}
          >
            <option value="">Unassigned</option>
            {kanbanAssigneeOptions.map((assignee) => <option value={assignee} key={assignee}>{assignee}</option>)}
          </select>
          <input
            value={newTaskDraft.tenant}
            onChange={(event) => setNewTaskDraft((current) => ({ ...current, tenant: event.target.value }))}
            placeholder="Tenant"
          />
          <select
            value={newTaskDraft.priority}
            onChange={(event) => setNewTaskDraft((current) => ({ ...current, priority: event.target.value as KanbanPriority }))}
          >
            {KANBAN_PRIORITIES.map((priority) => <option value={priority} key={priority}>{priority}</option>)}
          </select>
          <button type="submit">Create</button>
        </form>

        <div className="kanbanWorkspace">
          <div className="kanbanBoard" aria-label="Multi-agent Kanban board">
            {kanbanColumns.map((column) => (
              <section
                className={`kanbanColumn ${column.id}`}
                key={column.id}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  const taskId = event.dataTransfer.getData("text/plain");
                  if (taskId) moveKanbanTask(taskId, column.id);
                }}
              >
                <div className="kanbanColumnHeader">
                  <span className={`kanbanDot ${column.id}`} />
                  <div>
                    <h3>{column.title}</h3>
                    <p>{column.description}</p>
                  </div>
                  <strong>{column.tasks.length}</strong>
                </div>
                <div className="kanbanCards">
                  {column.tasks.map((task) => (
                    <button
                      type="button"
                      draggable
                      className={`kanbanCard ${task.id === selectedKanbanTaskId ? "active" : ""}`}
                      key={task.id}
                      onClick={() => setSelectedKanbanTaskId(task.id)}
                      onDragStart={(event) => event.dataTransfer.setData("text/plain", task.id)}
                    >
                      <span className={`priorityPill ${task.priority}`}>{task.priority}</span>
                      <strong>{task.title}</strong>
                      <p>{task.body || task.result || "No task body yet."}</p>
                      <small>
                        {task.assignee || "unassigned"} · {task.tenant || "no tenant"} · {formatRelativeTime(task.updatedAt)}
                      </small>
                    </button>
                  ))}
                  {column.tasks.length === 0 ? <p className="kanbanEmpty">Drop tasks here.</p> : null}
                </div>
              </section>
            ))}
          </div>

          <aside className="kanbanDrawer">
            {selectedKanbanTask ? (
              <>
                <div className="kanbanDrawerHeader">
                  <span className={`priorityPill ${selectedKanbanTask.priority}`}>{selectedKanbanTask.priority}</span>
                  <h3>{selectedKanbanTask.title}</h3>
                  <small>{selectedKanbanTask.id}</small>
                </div>
                <label>
                  Status
                  <select
                    value={selectedKanbanTask.status}
                    onChange={(event) => moveKanbanTask(selectedKanbanTask.id, event.target.value as KanbanStatus)}
                  >
                    {KANBAN_COLUMNS.map((column) => <option value={column.id} key={column.id}>{column.title}</option>)}
                  </select>
                </label>
                <label>
                  Assignee
                  <select
                    value={selectedKanbanTask.assignee ?? ""}
                    onChange={(event) => patchKanbanTask(selectedKanbanTask.id, { assignee: event.target.value })}
                  >
                    <option value="">Unassigned</option>
                    {kanbanAssigneeOptions.map((assignee) => <option value={assignee} key={assignee}>{assignee}</option>)}
                  </select>
                </label>
                <label>
                  Result
                  <textarea
                    key={selectedKanbanTask.id}
                    defaultValue={selectedKanbanTask.result ?? ""}
                    onBlur={(event) => patchKanbanTask(selectedKanbanTask.id, { result: event.target.value })}
                    placeholder="Completion summary, review notes, or blocker evidence"
                  />
                </label>
                <div className="kanbanMetaGrid">
                  <span>Workspace: {selectedKanbanTask.workspace}</span>
                  <span>Created: {formatRelativeTime(selectedKanbanTask.createdAt)}</span>
                  <span>Comments: {selectedKanbanComments.length}</span>
                  <span>Links: {kanbanBoard?.links.filter((link) => link.parentId === selectedKanbanTask.id || link.childId === selectedKanbanTask.id).length ?? 0}</span>
                </div>
                <form className="kanbanCommentForm" onSubmit={addKanbanComment}>
                  <input
                    value={commentDraft}
                    onChange={(event) => setCommentDraft(event.target.value)}
                    placeholder="Add a durable handoff comment"
                  />
                  <button type="submit">Comment</button>
                </form>
                <div className="kanbanThread">
                  {selectedKanbanComments.map((comment) => (
                    <article key={comment.id}>
                      <strong>{comment.author}</strong>
                      <p>{comment.body}</p>
                      <small>{formatRelativeTime(comment.createdAt)}</small>
                    </article>
                  ))}
                  {selectedKanbanComments.length === 0 ? <p className="kanbanEmpty">No comments yet.</p> : null}
                </div>
                <div className="kanbanEvents">
                  <h4>Recent events</h4>
                  {selectedKanbanEvents.map((event) => (
                    <p key={event.id}><span>{event.kind}</span>{event.message}</p>
                  ))}
                </div>
              </>
            ) : (
              <div className="kanbanDrawerEmpty">
                <strong>No task selected</strong>
                <p>Create a triage card or choose an existing task to inspect comments, evidence, and status controls.</p>
              </div>
            )}
          </aside>
        </div>
      </section>
      ) : null}

      {activeView === "wallet" ? (
      <section className="walletPanel tabPanel">
        <div className="walletHeader">
          <div>
            <p className="eyebrow">Bounded agent spend</p>
            <h2>Wallet & Survival Setup</h2>
            <p>
              Give an agent a prepaid payment rail, seed its local compute ledger, and make its spending
              rules explicit before it touches real money.
            </p>
          </div>
          <div className="walletTotals" aria-label="Wallet summary">
            <span>
              Funded
              <strong>{walletStats.enabled}</strong>
            </span>
            <span>
              Balance
              <strong>${walletStats.balance.toFixed(2)}</strong>
            </span>
            <span>
              Critical
              <strong>{walletStats.critical}</strong>
            </span>
          </div>
        </div>

        <div className="walletWorkspace">
          <aside className="walletAgentList" aria-label="Agent wallet list">
            {displayAgents.map((agent) => {
              const wallet = walletsByAgent[agent.id] ?? createDefaultAgentWallet(agent.id);
              const snapshot = getSurvivalSnapshot(wallet);
              return (
                <button
                  type="button"
                  className={`walletAgentButton ${agent.id === selectedAgent?.id ? "active" : ""}`}
                  key={agent.id}
                  onClick={() => setSelectedAgentId(agent.id)}
                >
                  <span>{RUNTIME_LABELS[agent.runtime]}</span>
                  <strong>{agent.name}</strong>
                  <small>{wallet.enabled ? `${snapshot.tier} · $${snapshot.effectiveBalanceUsd.toFixed(2)}` : "wallet not enabled"}</small>
                </button>
              );
            })}
          </aside>

          {selectedAgent && selectedWallet && selectedWalletSnapshot ? (
          <div className="walletDetail">
            <div className={`survivalStrip ${selectedWalletSnapshot.tier}`}>
              <div>
                <span>Survival tier</span>
                <strong>{selectedWalletSnapshot.tier.replace("_", " ")}</strong>
                <p>{selectedWalletSnapshot.statusCopy}</p>
              </div>
              <div>
                <span>Effective balance</span>
                <strong>${selectedWalletSnapshot.effectiveBalanceUsd.toFixed(2)}</strong>
                <p>
                  {selectedWalletSnapshot.daysRemaining == null
                    ? "No burn rate set"
                    : `${selectedWalletSnapshot.daysRemaining.toFixed(1)} days remaining`}
                </p>
              </div>
              <div>
                <span>Runtime behavior</span>
                <strong>{selectedWalletSnapshot.modelHint}</strong>
                <p>{selectedWalletSnapshot.heartbeatHint} heartbeat</p>
              </div>
            </div>

            <div className="walletGrid">
              <section className="walletForm">
                <div className="walletFormHeader">
                  <div>
                    <h3>{selectedAgent.name}</h3>
                    <p>{RUNTIME_LABELS[selectedAgent.runtime]} payment rail</p>
                  </div>
                  <label className="toggleRow">
                    <input
                      type="checkbox"
                      checked={selectedWallet.enabled}
                      onChange={(event) => updateWallet(selectedAgent.id, { enabled: event.target.checked })}
                    />
                    Enabled
                  </label>
                </div>

                <label>
                  Provider
                  <select
                    value={selectedWallet.provider}
                    onChange={(event) => updateWallet(selectedAgent.id, { provider: event.target.value as AgentPaymentProvider })}
                  >
                    {Object.entries(AGENT_PAYMENT_PROVIDER_COPY).map(([provider, copy]) => (
                      <option value={provider} key={provider}>{copy.label}</option>
                    ))}
                  </select>
                  <small>{AGENT_PAYMENT_PROVIDER_COPY[selectedWallet.provider].summary}</small>
                </label>

                <div className="walletTwoCol">
                  <label>
                    Wallet address
                    <input
                      value={selectedWallet.walletAddress}
                      onChange={(event) => updateWallet(selectedAgent.id, { walletAddress: event.target.value })}
                      placeholder="0x... or Solana address"
                    />
                  </label>
                  <label>
                    Network
                    <select
                      value={selectedWallet.network}
                      onChange={(event) => updateWallet(selectedAgent.id, { network: event.target.value })}
                    >
                      <option value="eip155:8453">Base mainnet</option>
                      <option value="eip155:84532">Base Sepolia</option>
                      <option value="solana:mainnet">Solana mainnet</option>
                      <option value="solana:devnet">Solana devnet</option>
                    </select>
                  </label>
                </div>

                <div className="walletThreeCol">
                  <label>
                    Seed
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={selectedWallet.seedBalanceUsd}
                      onChange={(event) => updateWallet(selectedAgent.id, { seedBalanceUsd: normalizeMoney(event.target.value, selectedWallet.seedBalanceUsd) })}
                    />
                  </label>
                  <label>
                    Current
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={selectedWallet.currentBalanceUsd}
                      onChange={(event) => updateWallet(selectedAgent.id, { currentBalanceUsd: normalizeMoney(event.target.value, selectedWallet.currentBalanceUsd) })}
                    />
                  </label>
                  <label>
                    Burn/day
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={selectedWallet.dailyComputeBurnUsd}
                      onChange={(event) => updateWallet(selectedAgent.id, { dailyComputeBurnUsd: normalizeMoney(event.target.value, selectedWallet.dailyComputeBurnUsd) })}
                    />
                  </label>
                </div>

                <div className="walletThreeCol">
                  <label>
                    Max pay
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={selectedWallet.maxPaymentUsd}
                      onChange={(event) => updateWallet(selectedAgent.id, { maxPaymentUsd: normalizeMoney(event.target.value, selectedWallet.maxPaymentUsd) })}
                    />
                  </label>
                  <label>
                    Approval over
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={selectedWallet.approvalRequiredOverUsd}
                      onChange={(event) => updateWallet(selectedAgent.id, { approvalRequiredOverUsd: normalizeMoney(event.target.value, selectedWallet.approvalRequiredOverUsd) })}
                    />
                  </label>
                  <label>
                    Token
                    <input
                      value={selectedWallet.tokenSymbol}
                      onChange={(event) => updateWallet(selectedAgent.id, { tokenSymbol: event.target.value.toUpperCase() })}
                    />
                  </label>
                </div>

                <div className="walletTwoCol">
                  <label>
                    ClawCard env
                    <input
                      value={selectedWallet.clawCardEnvName}
                      onChange={(event) => updateWallet(selectedAgent.id, { clawCardEnvName: event.target.value })}
                    />
                  </label>
                  <label>
                    x402 base URL
                    <input
                      value={selectedWallet.x402BaseUrl}
                      onChange={(event) => updateWallet(selectedAgent.id, { x402BaseUrl: event.target.value })}
                      placeholder="https://paid-api.example.com"
                    />
                  </label>
                </div>

                <label className="toggleRow walletAutopay">
                  <input
                    type="checkbox"
                    checked={selectedWallet.autoPayEnabled}
                    onChange={(event) => updateWallet(selectedAgent.id, { autoPayEnabled: event.target.checked })}
                  />
                  Allow autopay within caps
                </label>

                <label>
                  Notes
                  <textarea
                    value={selectedWallet.notes}
                    onChange={(event) => updateWallet(selectedAgent.id, { notes: event.target.value })}
                    placeholder="Provider dashboard URL, deposit memo, funding policy..."
                  />
                </label>

                <div className="walletActions">
                  <button type="button" onClick={() => resetWalletBurnClock(selectedAgent.id)}>Reset burn clock</button>
                  <button type="button" onClick={() => copyPaymentPrompt(selectedWallet)}>Copy agent prompt</button>
                </div>
              </section>

              <aside className="walletRunbook">
                <section>
                  <h3>Launch path</h3>
                  {SOVEREIGN_AGENT_LAUNCH_STEPS.map((step, index) => (
                    <p key={step}><span>{index + 1}</span>{step}</p>
                  ))}
                </section>
                <section>
                  <h3>Safety rules</h3>
                  {PAYMENT_SAFETY_RULES.map((rule) => (
                    <p key={rule}><span>!</span>{rule}</p>
                  ))}
                </section>
                <section>
                  <h3>Provider setup</h3>
                  <p>{AGENT_PAYMENT_PROVIDER_COPY[selectedWallet.provider].setup}</p>
                </section>
              </aside>
            </div>
          </div>
          ) : (
            <div className="walletEmpty">
              <strong>No agent selected</strong>
              <p>Connect an agent first, then configure its payment rail and survival ledger.</p>
            </div>
          )}
        </div>
      </section>
      ) : null}

      {activeView === "vault" ? (
      <section className="vaultPanel tabPanel">
        <div className="vaultHeader">
          <div>
            <h2>Shared Obsidian Vault</h2>
            <p>One local vault context can be shared across OpenClaw, Hermes, and Aeon agents.</p>
          </div>
          <label className="toggleRow">
            <input
              type="checkbox"
              checked={sharedVault.enabled}
              onChange={(event) => updateSharedVault({ enabled: event.target.checked })}
            />
            Enabled
          </label>
        </div>
        <div className="vaultGrid">
          <label>
            Vault Path
            <input value={sharedVault.vaultPath} onChange={(event) => updateSharedVault({ vaultPath: event.target.value })} />
          </label>
          <label>
            Agent Inbox Folder
            <input value={sharedVault.inboxFolder} onChange={(event) => updateSharedVault({ inboxFolder: event.target.value })} />
          </label>
          <label>
            Shared Note
            <input value={sharedVault.sharedNotePath} onChange={(event) => updateSharedVault({ sharedNotePath: event.target.value })} />
          </label>
          <label>
            Control Room Path
            <input value={sharedVault.controlRoomPath} onChange={(event) => updateSharedVault({ controlRoomPath: event.target.value })} />
          </label>
        </div>
        <label className="vaultInstructions">
          Agent Instructions
          <textarea value={sharedVault.instructions} onChange={(event) => updateSharedVault({ instructions: event.target.value })} />
        </label>
        <div className="vaultFooter">
          <button type="button" onClick={checkVaultStatus}>Check vault</button>
          <button type="button" onClick={checkControlRoomStatus}>Check Control Room</button>
          <pre>{vaultStatus ? JSON.stringify(vaultStatus, null, 2) : "Vault status will appear here. The app only validates the path; it does not write notes."}</pre>
          <pre>{controlRoomStatus ? JSON.stringify(controlRoomStatus, null, 2) : "Control Room status will appear here. Live installer warnings are reported without running them."}</pre>
        </div>
      </section>
      ) : null}

      {activeView === "chat" ? (
        <section className="workspace tabPanel">
          <aside className="settings">
            <div className="settingsHeader">
              <div>
                <p className="eyebrow">Chat</p>
                <h2>Pick a machine</h2>
              </div>
              <span className="runtimeBadge">{displayAgents.length} agents</span>
            </div>

            <div className="machineChatList">
              {machineGroups.length > 0 ? machineGroups.map((machine) => {
                const primaryAgent = machine.agents[0];
                const previousChats = machine.agents.filter((agent) => hasConversation(agent.id));
                return (
                  <article className="machineChatCard" key={machine.key}>
                    <div>
                      <strong>{machine.name}</strong>
                      <small>{machine.collector === "ready" ? `${machine.agents.length} available` : "Collector not ready"}</small>
                    </div>
                    <button
                      type="button"
                      onClick={() => primaryAgent ? startAgentChat(primaryAgent.id, true) : openSetupModal(machine)}
                    >
                      {primaryAgent ? "Chat" : "Connect"}
                    </button>
                    {previousChats.length > 0 ? (
                      <div className="previousChats">
                        {previousChats.map((agent) => (
                          <button type="button" key={agent.id} onClick={() => startAgentChat(agent.id)}>
                            <span>{conversationTitle(agent.id)}</span>
                            <small>{agent.name}</small>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </article>
                );
              }) : (
                <div className="emptyMachineChat">
                  <strong>No machines yet</strong>
                  <p>Connect a machine from Agents, then come back here to start chatting.</p>
                </div>
              )}
            </div>

            {selectedAgent ? (
            <>
            <details className="advancedSettings">
              <summary>Manual setup</summary>
              <div className="advancedFields">
                <label>
                  Name
                  <input value={selectedAgent.name} onChange={(event) => updateAgent({ name: event.target.value })} />
                </label>

                <label>
                  Runtime
                  <select value={selectedAgent.runtime} onChange={(event) => switchRuntime(event.target.value as AgentRuntime)}>
                    {Object.entries(RUNTIME_LABELS).map(([runtime, label]) => (
                      <option value={runtime} key={runtime}>{label}</option>
                    ))}
                  </select>
                </label>

                <label className="toggleRow">
                  <input
                    type="checkbox"
                    checked={selectedAgent.useSharedVault !== false}
                    onChange={(event) => updateAgent({ useSharedVault: event.target.checked })}
                  />
                  Use shared Obsidian vault
                </label>

                <label>
                  Gateway URL
                  <input value={selectedAgent.gatewayUrl} onChange={(event) => updateAgent({ gatewayUrl: event.target.value })} />
                </label>

                <label>
                  Agent ID
                  <input value={selectedAgent.agentId ?? ""} onChange={(event) => updateAgent({ agentId: event.target.value })} placeholder="main, researcher, writer..." />
                </label>

                <label>
                  Token
                  <input value={selectedAgent.token ?? ""} onChange={(event) => updateAgent({ token: event.target.value })} placeholder="Optional if runtime config has one" />
                </label>

                {selectedAgent.runtime !== "openclaw" ? (
                  <>
                    <label>
                      Chat Path
                      <input value={selectedAgent.chatPath ?? "/chat"} onChange={(event) => updateAgent({ chatPath: event.target.value })} />
                    </label>
                    <label>
                      Status Path
                      <input value={selectedAgent.statusPath ?? "/health"} onChange={(event) => updateAgent({ statusPath: event.target.value })} />
                    </label>
                  </>
                ) : (
                  <label>
                    Session Key
                    <input value={selectedAgent.sessionKey ?? ""} onChange={(event) => updateAgent({ sessionKey: event.target.value })} placeholder="Optional OpenClaw session override" />
                  </label>
                )}

                <label>
                  Runtime Data Dir
                  <input
                    value={selectedAgent.localDataDir ?? ""}
                    onChange={(event) => updateAgent({ localDataDir: event.target.value })}
                    placeholder="~/.hermes, /srv/hermes-seo/data, mounted runtime path..."
                  />
                </label>

                <label>
                  Telemetry URL
                  <input
                    value={selectedAgent.telemetryUrl ?? ""}
                    onChange={(event) => updateAgent({ telemetryUrl: event.target.value })}
                    placeholder="http://100.x.y.z:8787"
                  />
                </label>

                <label>
                  Machine Name
                  <input
                    value={selectedAgent.machineName ?? ""}
                    onChange={(event) => updateAgent({ machineName: event.target.value })}
                    placeholder="local, vps-1, macbook, workstation..."
                  />
                </label>
              </div>
            </details>

            <div className="settingsActions">
              <button type="button" onClick={duplicateAgent}>Duplicate</button>
              <button type="button" onClick={() => deleteAgent()} disabled={agents.length <= 1}>Delete</button>
            </div>
            </>
            ) : null}
          </aside>

          {selectedAgent ? (
          <section className="chat">
            <div className="chatHeader">
              <div>
                <h2>{selectedAgent.name}</h2>
                <p>{RUNTIME_LABELS[selectedAgent.runtime]} · {selectedAgent.gatewayUrl}</p>
              </div>
              <button type="button" onClick={checkStatus}>
                Check status
              </button>
            </div>
            {status && statusAgentId === selectedAgent.id ? (
              <pre className="runtimeStatus">{JSON.stringify(status, null, 2)}</pre>
            ) : null}
            <div className="messages">
              {messages.map((message, index) => (
                <div className={`message ${message.role}`} key={`${message.role}-${index}`}>
                  <span>{message.role}</span>
                  <p>{message.content || (message.role === "assistant" && busy ? "Streaming..." : "")}</p>
                </div>
              ))}
            </div>
            <form onSubmit={sendMessage}>
              <textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder={`Ask ${selectedAgent.name} to do something...`}
                disabled={busy}
              />
              <button type="submit" disabled={busy || !text.trim()}>
                {busy ? "Streaming" : "Send"}
              </button>
            </form>
            <p className="hint">
              Last assistant response: {lastAssistant ? `${lastAssistant.slice(0, 120)}...` : "none yet"}
            </p>
          </section>
          ) : (
          <section className="chat chatEmptyState">
            <strong>No machine selected</strong>
            <p>Choose a connected machine on the left to start a chat.</p>
          </section>
          )}
        </section>
      ) : null}

      {setupMachine ? (
        <div
          className="setupModalBackdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSetupMachineKey("");
          }}
        >
          <section className="setupModal" role="dialog" aria-modal="true" aria-labelledby="setup-modal-title">
            <div className="setupModalHeader">
              <div>
                <p className="eyebrow">Connect machine</p>
                <h2 id="setup-modal-title">{setupMachine.self ? "This Mac" : setupMachine.name}</h2>
                <p>Use this when you are physically on the computer you want to add.</p>
              </div>
              <button type="button" aria-label="Close setup instructions" onClick={() => setSetupMachineKey("")}>Close</button>
            </div>

            <div className="setupGuide">
              <article className="setupPrimaryStep">
                <span aria-hidden="true">1</span>
                <div>
                  <strong>Open Terminal on that computer, paste this command and enter.</strong>
                  <p>The setup script does the boring parts for you: checks what is installed, sets up the dashboard tools, starts the read-only collector, and prints what to fix if anything is missing.</p>
                </div>
              </article>

              <div className="setupCommandBox">
                <div>
                  <strong>Command to paste</strong>
                  <button type="button" onClick={copySetupCommand}>
                    {setupCommandCopied ? "Copied" : "Copy"}
                  </button>
                </div>
                <pre>{setupCollectorCommand()}</pre>
              </div>

              <p className="setupAfterCopy">
                When the command finishes, come back here. This dashboard will find the machine automatically on the next scan, and its Chat button will become available.
              </p>
            </div>

            <div className="setupModalActions">
              <button type="button" onClick={() => setSetupMachineKey("")}>Done</button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
