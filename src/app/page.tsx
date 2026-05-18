"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import {
  Activity,
  Bot,
  BrainCircuit,
  Check,
  ChevronRight,
  CircleAlert,
  Copy,
  CopyPlus,
  CreditCard,
  KanbanSquare,
  MessageSquare,
  Monitor,
  Network,
  Plus,
  PlugZap,
  RefreshCcw,
  Send,
  Settings2,
  ShieldCheck,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";
import type { AgentProfile, AgentRuntime, SharedVaultConfig } from "@/lib/types/agent-runtime";
import { createAgentProfile, DEFAULT_SHARED_VAULT, RUNTIME_DEFAULTS, RUNTIME_LABELS } from "@/lib/types/agent-runtime";
import type { AgentPaymentProvider, AgentWalletConfig } from "@/lib/types/agent-wallet";
import type { KanbanBoard, KanbanPriority, KanbanStatus, KanbanTask } from "@/lib/types/kanban";
import { KANBAN_COLUMNS } from "@/lib/types/kanban";
import { AGENT_PAYMENT_PROVIDER_COPY, PAYMENT_SAFETY_RULES, SOVEREIGN_AGENT_LAUNCH_STEPS } from "@/lib/config/agent-payments";
import { buildAgentPaymentPrompt, createDefaultAgentWallet, getSurvivalSnapshot, normalizeMoney } from "@/lib/utils/agent-wallet";
import { groupKanbanTasks } from "@/lib/utils/kanban-board";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AgentCell,
  AgentTaskList,
  Cell,
  CellMenu,
  MachineCell,
  MemoryCell,
  SetupCell,
  WalletCell,
  type AgentTaskRow,
  type CellMenuItem,
  type SetupStep,
} from "@/components/cells";

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
  messages?: ChatMessage[];
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
  capabilities?: AgentProfile["collectorCapabilities"];
};

type DiscoveredMachine = {
  device: TailscaleDevice;
  collector: MachineGroup["collector"];
  agents: AgentProfile[];
  snapshots: AgentSnapshot[];
  version?: AppVersion;
  capabilities?: AgentProfile["collectorCapabilities"];
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

type MiroSharkStatus = {
  configured: boolean;
  ok: boolean;
  phase: "connected" | "starting" | "installing" | "installed-stopped" | "not-installed" | "needs-config" | "unreachable";
  baseUrl: string;
  service?: string;
  status?: string;
  installPath?: string;
  installSource?: string;
  apiDocsUrl?: string;
  templatesUrl?: string;
  simulationsUrl?: string;
  checkedAt: number;
  latencyMs?: number;
  error?: string;
  requirements: { name: string; ok: boolean; detail: string }[];
  install: {
    running: boolean;
    phase?: string;
    startedAt?: number;
    finishedAt?: number;
    exitCode?: number | null;
    logPath: string;
    message?: string;
  };
  actions: { id: "install" | "start" | "open"; label: string; disabled?: boolean }[];
  startCommand?: string;
  installCommand?: string;
  configHint?: string;
  endpoints: {
    health: string;
    openapi: string;
    templates: string;
    simulations: string;
    createSimulation: string;
  };
};

type MiroSharkRunResult = {
  ok?: boolean;
  jobId?: string;
  status?: "queued" | "running" | "started" | "failed";
  step?: string;
  message?: string;
  error?: string;
  projectId?: string;
  graphId?: string;
  simulationId?: string;
  rounds?: number;
  platform?: string;
  links?: Record<string, string>;
  runStatus?: unknown;
  actions?: unknown;
  posts?: unknown;
  timeline?: unknown;
};

type MiroSharkPost = {
  post_id?: number;
  user_id?: number;
  content?: string;
  quote_content?: string | null;
  created_at?: number;
};

type VisibleMiroSharkPost = MiroSharkPost & {
  displayText: string;
};

function getMiroSharkRunStatus(run: MiroSharkRunResult | null) {
  return (run?.runStatus as { data?: { runner_status?: string; current_round?: number; total_rounds?: number; twitter_actions_count?: number; total_actions_count?: number } } | undefined)?.data;
}

function isMiroSharkRunTerminal(status?: string) {
  return status === "completed" || status === "failed" || status === "stopped";
}

function getMiroSharkPosts(run: MiroSharkRunResult | null) {
  const data = (run?.posts as { data?: { count?: number; raw_count?: number; posts?: MiroSharkPost[] } } | undefined)?.data;
  const posts = (data?.posts ?? []).flatMap<VisibleMiroSharkPost>((post) => {
    const displayText = (post.quote_content || post.content || "").trim();
    return displayText ? [{ ...post, displayText }] : [];
  });
  return {
    count: posts.length,
    sourceCount: data?.raw_count ?? data?.count ?? posts.length,
    posts,
  };
}

const KANBAN_PRIORITIES: KanbanPriority[] = ["low", "normal", "high", "urgent"];
type DashboardView = "agents" | "kanban" | "swarm" | "wallet" | "vault" | "chat";

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

function chatSetupIssue(agent: AgentProfile) {
  if (STARTER_AGENT_IDS.has(agent.id) && agent.runtime !== "openclaw" && !agent.telemetryUrl?.trim()) {
    return "This starter shortcut is not connected to a running chat runtime. Pick a discovered machine agent or connect a real Hermes/Aeon chat URL.";
  }
  if (agent.runtime === "openclaw") {
    return agent.gatewayUrl.trim() ? "" : "Add the OpenClaw gateway URL before chatting.";
  }
  if (agent.runtime === "hermes" && agent.telemetryUrl?.trim() && agent.collectorCapabilities?.chat === false) {
    return `${agent.machineName || "This machine"} is connected, but its collector does not have the Hermes chat bridge installed yet. Run setup/update on that machine after these dashboard changes are available there.`;
  }
  if (!agent.gatewayUrl.trim()) {
    if (agent.runtime === "hermes" && agent.telemetryUrl?.trim()) return "";
    return agent.telemetryUrl
      ? "This agent was found through the read-only collector. Add its Hermes/Aeon chat URL in setup before sending messages."
      : "Add the runtime chat URL before sending messages.";
  }
  return "";
}

function viewIcon(view: DashboardView) {
  if (view === "agents") return <Network aria-hidden="true" />;
  if (view === "kanban") return <KanbanSquare aria-hidden="true" />;
  if (view === "swarm") return <Activity aria-hidden="true" />;
  if (view === "wallet") return <WalletCards aria-hidden="true" />;
  if (view === "vault") return <BrainCircuit aria-hidden="true" />;
  return <MessageSquare aria-hidden="true" />;
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

function isRuntimeSetupNoise(text: string) {
  return /not reachable|Chat URL needed|runtime chat URL|Request failed with 500|fetch failed|Check that the .* runtime is running/i.test(text);
}

function isStarterPlaceholder(agent: AgentProfile, knownWork: Record<string, AgentTask[]>, knownMessages: Record<string, ChatMessage[]>) {
  if (!STARTER_AGENT_IDS.has(agent.id)) return false;
  if (agent.telemetryUrl?.trim()) return false;
  if (agent.runtime !== "openclaw") return true;
  if (agent.localDataDir?.trim() && agent.localDataDir !== "~/.hermes") return false;
  const work = knownWork[agent.id] ?? [];
  const messages = knownMessages[agent.id] ?? [];
  const meaningfulWork = work.filter((task) => (
    !isRuntimeSetupNoise(task.title)
    && !isRuntimeSetupNoise(task.lastMessage)
  ));
  const nonSystemMessages = messages.filter((message) => message.role !== "system");
  const hasSuccessfulAssistantMessage = nonSystemMessages.some((message) => (
    message.role === "assistant"
    && !isRuntimeSetupNoise(message.content)
  ));
  if (meaningfulWork.length > 0) return false;
  if (hasSuccessfulAssistantMessage) return false;
  return true;
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

function isMeaningfulActive(task: AgentTask) {
  return task.status === "active" && sourcePriority(task.source) >= 4;
}

function cleanActivityTitle(title: string) {
  const cleaned = title
    .replace(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}[,.\d]*\s*/u, "")
    .replace(/^INFO\s+/i, "")
    .replace(/^Loaded main app package\s+/i, "Opened ")
    .trim();
  // Hide raw JSON / log payloads from primary surfaces (philosophy rule 6).
  // If the title looks like structured data, return a generic plain-English
  // fallback instead of leaking `{` or `[` into the UI.
  if (/^[\[{]/.test(cleaned) || cleaned.length <= 1) return "Background activity";
  return cleaned;
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

function ChatMarkdown({ text }: { text: string }) {
  if (!text.trim()) return null;
  const lines = text.trim().split("\n");
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
    const paragraph: string[] = [];
    while (
      index < lines.length
      && lines[index].trim()
      && !lines[index].trim().startsWith("```")
      && !/^(#{1,3})\s+/.test(lines[index])
      && !/^\s*[-*]\s+/.test(lines[index])
      && !/^\s*\d+[.)]\s+/.test(lines[index])
    ) {
      paragraph.push(lines[index]);
      index += 1;
    }
    blocks.push(<p key={`paragraph-${index}`}>{renderInlineMarkdown(paragraph.join("\n"))}</p>);
  }

  return <div className="messageMarkdown">{blocks}</div>;
}

function machineVersionCopy(machine: MachineGroup, latestCommit?: string) {
  const versionState = machineVersionState(machine, latestCommit);
  if (!versionState) return null;
  if (versionState.state === "current") return { label: "Synced", detail: "Latest dashboard tools", state: "current" };
  if (versionState.state === "stale") return { label: "Update ready", detail: "New dashboard tools available", state: "stale" };
  return { label: "Refresh setup", detail: "Collector needs one update", state: "unknown" };
}

function isCollectorAutoUpdateable(versionCopy: ReturnType<typeof machineVersionCopy>) {
  return Boolean(versionCopy && versionCopy.state !== "current");
}

function machineNeedsChatBridgeRepair(machine: MachineGroup) {
  return machine.collector === "ready" && machine.capabilities?.chat === false;
}

function localDashboardHasUnpublishedChanges(version?: AppVersion | null) {
  if (!version) return false;
  if (version.dirty) return true;
  return Boolean(version.commit && version.latestCommit && version.commit !== version.latestCommit);
}

function friendlyEmptyTitle(snapshot: AgentSnapshot | undefined, hasTelemetryUrl: boolean) {
  if (!hasTelemetryUrl) return "Waiting for a collector";
  if (snapshot?.summary?.startsWith("Configured data dir is not available")) return "Agent folder needs a path";
  if (snapshot?.summary?.startsWith("Remote collector unavailable")) return "Machine is temporarily unreachable";
  if (snapshot?.processRunning) return "Agent is running";
  return "Waiting for new work";
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
  if (version?.dirty) return { state: "current", label: "Up to date", detail: `Running ${version.shortCommit ?? commit.slice(0, 7)} with local changes present.` };
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
  // Initialize all persisted state with deterministic seed values so SSR and
  // first client render match. localStorage is read inside a useEffect below.
  const [hydrated, setHydrated] = useState(false);
  const [agents, setAgents] = useState<AgentProfile[]>(seedAgents);
  const [selectedAgentId, setSelectedAgentId] = useState(() => seedAgents()[0]?.id ?? "openclaw-main");
  const [draftRuntime, setDraftRuntime] = useState<AgentRuntime>("hermes");
  const [text, setText] = useState("");
  const [status, setStatus] = useState<GatewayStatus | null>(null);
  const [statusAgentId, setStatusAgentId] = useState("");
  const [vaultStatus, setVaultStatus] = useState<Record<string, unknown> | null>(null);
  const [controlRoomStatus, setControlRoomStatus] = useState<Record<string, unknown> | null>(null);
  const [sharedVault, setSharedVault] = useState<SharedVaultConfig>(DEFAULT_SHARED_VAULT);
  const [messagesByAgent, setMessagesByAgent] = useState<Record<string, ChatMessage[]>>({});
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [walletsByAgent, setWalletsByAgent] = useState<Record<string, AgentWalletConfig>>({});
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
  const [mirosharkStatus, setMirosharkStatus] = useState<MiroSharkStatus | null>(null);
  const [mirosharkActionPending, setMirosharkActionPending] = useState("");
  const [mirosharkRun, setMirosharkRun] = useState<MiroSharkRunResult | null>(null);
  const [mirosharkRunPending, setMirosharkRunPending] = useState(false);
  const [mirosharkScenario, setMirosharkScenario] = useState("Nom launches a neighborhood food-sharing app. Local cooks, restaurants, parents, and city health officials debate safety, affordability, trust, and regulation.");
  const [mirosharkRounds, setMirosharkRounds] = useState(5);
  const [mirosharkPlatform, setMirosharkPlatform] = useState<"twitter" | "reddit" | "parallel">("twitter");
  const [activeView, setActiveView] = useState<DashboardView>("agents");
  const [agentComposer, setAgentComposer] = useState({ name: "", machineKey: "" });
  const [busy, setBusy] = useState(false);
  const [busyAgentId, setBusyAgentId] = useState("");
  const [chatMessageWindow, setChatMessageWindow] = useState<{ agentId: string; limit: number } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Hydrate persisted state on the client after the first render. Reading
  // localStorage inside useState init would diverge from SSR and trigger
  // a hydration mismatch — this is the canonical pattern to avoid it,
  // even though the lint rule flags setState-in-effect in general.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const storedAgents = parseStoredAgents();
    setAgents(storedAgents);
    setSelectedAgentId((current) => (
      storedAgents.some((agent) => agent.id === current) ? current : storedAgents[0]?.id ?? current
    ));
    setSharedVault(parseStoredVault());
    setTasks(parseStoredTasks());
    setWalletsByAgent(parseStoredWallets());
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(agents));
  }, [hydrated, agents]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(sharedVault));
  }, [hydrated, sharedVault]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(tasks.slice(0, 80)));
  }, [hydrated, tasks]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(walletsByAgent));
  }, [hydrated, walletsByAgent]);

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
    async function refreshMirosharkStatus() {
      const response = await fetch("/api/miroshark/status", { cache: "no-store" }).catch(() => null);
      const data = await response?.json().catch(() => null) as MiroSharkStatus | null;
      if (!cancelled && data?.baseUrl) setMirosharkStatus(data);
    }
    refreshMirosharkStatus();
    const timer = window.setInterval(refreshMirosharkStatus, mirosharkStatus?.install.running ? 5_000 : 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [mirosharkStatus?.install.running]);

  async function runMirosharkAction(action: "install" | "start" | "open") {
    if (action === "open") {
      window.open(mirosharkStatus?.apiDocsUrl ?? mirosharkStatus?.baseUrl ?? "http://127.0.0.1:5101/api/docs", "_blank", "noopener,noreferrer");
      return;
    }
    setMirosharkActionPending(action);
    const response = await fetch("/api/miroshark/manage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    }).catch(() => null);
    const data = await response?.json().catch(() => null) as MiroSharkStatus | null;
    if (data?.baseUrl) setMirosharkStatus(data);
    setMirosharkActionPending("");
  }

  async function runMirosharkSwarm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMirosharkRunPending(true);
    setMirosharkRun(null);
    const response = await fetch("/api/miroshark/swarm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scenario: mirosharkScenario,
        rounds: mirosharkRounds,
        platform: mirosharkPlatform,
      }),
    }).catch(() => null);
    const data = await response?.json().catch(() => null) as MiroSharkRunResult | null;
    setMirosharkRun(data ?? { ok: false, error: "MiroShark run request failed" });
    if (!data?.jobId) setMirosharkRunPending(false);
  }

  const refreshMirosharkRun = useCallback(async () => {
    const shouldFetchRun = mirosharkRun?.simulationId && mirosharkRun.status === "started";
    const query = shouldFetchRun
      ? `simulation_id=${encodeURIComponent(mirosharkRun.simulationId ?? "")}&platform=${encodeURIComponent(mirosharkRun.platform ?? mirosharkPlatform)}`
      : mirosharkRun?.jobId
        ? `job_id=${encodeURIComponent(mirosharkRun.jobId)}`
        : mirosharkRun?.simulationId
          ? `simulation_id=${encodeURIComponent(mirosharkRun.simulationId)}&platform=${encodeURIComponent(mirosharkRun.platform ?? mirosharkPlatform)}`
          : "";
    if (!query) return;
    const response = await fetch(`/api/miroshark/swarm?${query}`, {
      cache: "no-store",
    }).catch(() => null);
    const data = await response?.json().catch(() => null) as MiroSharkRunResult | null;
    if (data) {
      setMirosharkRun((current) => ({ ...(current ?? {}), ...data }));
      if (data.status === "started" || data.status === "failed" || data.simulationId) setMirosharkRunPending(false);
    }
  }, [mirosharkPlatform, mirosharkRun]);

  const mirosharkRunStatus = getMiroSharkRunStatus(mirosharkRun);
  const mirosharkRunnerStatus = mirosharkRunStatus?.runner_status;
  const mirosharkPosts = getMiroSharkPosts(mirosharkRun);
  const mirosharkFeedIsWaiting = mirosharkRun?.status === "started"
    && !!mirosharkRun.simulationId
    && !isMiroSharkRunTerminal(mirosharkRunnerStatus)
    && mirosharkPosts.count === 0;
  const mirosharkFeedIsLive = mirosharkRun?.status === "started"
    && !!mirosharkRun.simulationId
    && !isMiroSharkRunTerminal(mirosharkRunnerStatus);

  useEffect(() => {
    if (!mirosharkRun?.jobId || mirosharkRun.status === "started" || mirosharkRun.status === "failed") return;
    const timer = window.setInterval(refreshMirosharkRun, 3_000);
    return () => window.clearInterval(timer);
  }, [mirosharkRun?.jobId, mirosharkRun?.status, refreshMirosharkRun]);

  useEffect(() => {
    if (mirosharkRun?.status !== "started" || !mirosharkRun.simulationId || mirosharkRun.posts) return;
    const timer = window.setTimeout(() => {
      void refreshMirosharkRun();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [mirosharkRun?.posts, mirosharkRun?.simulationId, mirosharkRun?.status, refreshMirosharkRun]);

  useEffect(() => {
    if (mirosharkRun?.status !== "started" || !mirosharkRun.simulationId) return;
    if (isMiroSharkRunTerminal(mirosharkRunnerStatus)) return;

    const simulationId = mirosharkRun.simulationId;
    const platform = mirosharkRun.platform ?? mirosharkPlatform;
    const pollRun = async () => {
      const response = await fetch(`/api/miroshark/swarm?simulation_id=${encodeURIComponent(simulationId)}&platform=${encodeURIComponent(platform)}`, {
        cache: "no-store",
      }).catch(() => null);
      const data = await response?.json().catch(() => null) as MiroSharkRunResult | null;
      if (data) {
        setMirosharkRun((current) => ({ ...(current ?? {}), ...data }));
      }
    };

    const kickoff = window.setTimeout(() => {
      void pollRun();
    }, 250);
    const timer = window.setInterval(() => {
      void pollRun();
    }, 2_000);
    return () => {
      window.clearTimeout(kickoff);
      window.clearInterval(timer);
    };
  }, [
    mirosharkPlatform,
    mirosharkRun?.platform,
    mirosharkRun?.simulationId,
    mirosharkRun?.status,
    mirosharkRunnerStatus,
  ]);

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
    () => {
      if (!selectedAgent) return [];
      const selectedMessages = messagesByAgent[selectedAgent.id] ?? [{
        role: "system" as const,
        content: `Chatting with ${selectedAgent.name}. Pick a machine to start fresh, or resume a previous chat when one is listed.`,
      }];
      return chatMessageWindow?.agentId === selectedAgent.id
        ? selectedMessages.slice(-chatMessageWindow.limit)
        : selectedMessages;
    },
    [chatMessageWindow, messagesByAgent, selectedAgent],
  );

  const lastAssistant = useMemo(
    () => [...messages].reverse().find((message) => message.role === "assistant")?.content ?? "",
    [messages],
  );

  const visibleMessages = useMemo(
    () => messages.filter((message) => message.role !== "system"),
    [messages],
  );

  const sessionNotice = useMemo(
    () => [...messages].reverse().find((message) => message.role === "system")?.content ?? "",
    [messages],
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [visibleMessages, busy]);

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
      capabilities: discovered?.capabilities,
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

  const setupNeededCount = useMemo(
    () => machineGroups.filter((machine) => machine.collector !== "ready").length,
    [machineGroups],
  );

  const kanbanAssigneeOptions = useMemo(() => {
    const local = displayAgents.map((agent) => agent.agentId || agent.id);
    return [...new Set([...local, ...kanbanAssignees].filter(Boolean))].sort();
  }, [displayAgents, kanbanAssignees]);

  const navItems = useMemo(() => [
    {
      id: "agents" as const,
      label: "Fleet",
      detail: `${visibleAgentCount} agents`,
    },
    {
      id: "kanban" as const,
      label: "Work",
      detail: `${kanbanBoard?.tasks.length ?? 0} tasks`,
    },
    {
      id: "swarm" as const,
      label: "Swarm",
      detail: mirosharkStatus?.ok ? "rehearsal ready" : "companion off",
    },
    {
      id: "wallet" as const,
      label: "Wallets",
      detail: walletStats.critical > 0 ? `${walletStats.critical} need funding` : `${walletStats.enabled} ready`,
    },
    {
      id: "vault" as const,
      label: "Brain",
      detail: sharedVault.enabled ? "enabled" : "off",
    },
    {
      id: "chat" as const,
      label: "Chat",
      detail: selectedAgent?.name ?? "none",
    },
  ], [kanbanBoard?.tasks.length, mirosharkStatus?.ok, selectedAgent?.name, sharedVault.enabled, visibleAgentCount, walletStats.critical, walletStats.enabled]);

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

  function addAgentToMachine(machine: MachineGroup, runtime: AgentRuntime = draftRuntime) {
    if (machine.collector !== "ready" || !machine.collectorUrl) {
      openSetupModal(machine);
      return;
    }
    const next = {
      ...createAgentProfile(runtime, runtimeCount(agents, runtime) + 1),
      name: `${RUNTIME_LABELS[runtime]} on ${machine.name}`,
      telemetryUrl: machine.collectorUrl,
      machineName: machine.name,
      localDataDir: "",
    };
    setAgents((current) => [...current, next]);
    setSelectedAgentId(next.id);
    setActiveView("chat");
    setMessagesByAgent((current) => ({
      ...current,
      [next.id]: [
        {
          role: "assistant",
          content: `Added ${next.name}. This profile is attached to ${machine.name}; send a message when you are ready.`,
        },
      ],
    }));
    setAgentComposer({ name: "", machineKey: machine.key });
  }

  function duplicateAgent(agentId?: string) {
    const source = agentId
      ? displayAgents.find((agent) => agent.id === agentId) ?? selectedAgent
      : selectedAgent;
    if (!source) return;
    const next = {
      ...source,
      // eslint-disable-next-line react-hooks/purity
      id: `${source.runtime}-${Date.now()}`,
      name: `${source.name} Copy`,
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

  function startAgentChat(agentId: string, options: { fresh?: boolean; messageLimit?: number; seedMessages?: ChatMessage[] } = {}) {
    setSelectedAgentId(agentId);
    setActiveView("chat");
    setStatus(null);
    setStatusAgentId("");
    setChatMessageWindow(options.messageLimit ? { agentId, limit: options.messageLimit } : null);
    if (options.fresh) {
      setMessagesByAgent((current) => {
        const nextMessages = { ...current };
        delete nextMessages[agentId];
        return nextMessages;
      });
    } else if (options.seedMessages?.length) {
      setMessagesByAgent((current) => {
        const existing = current[agentId] ?? [];
        const hasExistingConversation = existing.some((message) => message.role !== "system" && message.content.trim());
        return hasExistingConversation ? current : { ...current, [agentId]: options.seedMessages ?? [] };
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

  async function refreshAppVersionNow() {
    const response = await fetch("/api/app/version", { cache: "no-store" }).catch(() => null);
    const data = await response?.json().catch(() => null) as AppVersion | null;
    if (data?.commit) setAppVersion(data);
  }

  async function refreshDiscoveryNow() {
    const response = await fetch("/api/fleet/discover", { cache: "no-store" }).catch(() => null);
    const data = await response?.json().catch(() => null) as {
      machines?: DiscoveredMachine[];
    } | null;
    if (!data?.machines) return;
    setDiscoveredMachines((current) => mergeDiscoveredMachines(current, data.machines ?? []));
    const discoveredSnapshots = data.machines.flatMap((machine) => machine.snapshots ?? []);
    if (discoveredSnapshots.length > 0) {
      setFleetSnapshots((current) => mergeSnapshotRecord(current, discoveredSnapshots));
    }
  }

  async function runMachineUpdate(machine: MachineGroup) {
    const versionCopy = machineVersionCopy(machine, appVersion?.latestCommit || appVersion?.commit);
    const needsChatBridgeRepair = machineNeedsChatBridgeRepair(machine);
    if (needsChatBridgeRepair && localDashboardHasUnpublishedChanges(appVersion)) {
      setUpdateStatusByMachine((current) => ({
        ...current,
        [machine.key]: {
          label: "Publish update first",
          detail: "This machine is missing the Hermes chat bridge, but the bridge code only exists in this local dashboard checkout right now. Commit and push these dashboard changes first, then Update can pull them on that machine.",
          tone: "error",
        },
      }));
      return;
    }
    if (!isCollectorAutoUpdateable(versionCopy) && !needsChatBridgeRepair) {
      setUpdateStatusByMachine((current) => ({
        ...current,
        [machine.key]: {
          label: "Already up to date",
          detail: "This collector is already reporting the latest dashboard tools.",
          tone: "success",
        },
      }));
      return;
    }
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
        requiredCapabilities: {
          chat: needsChatBridgeRepair || undefined,
        },
      }),
    }).catch(() => null);
    const data = await response?.json().catch(() => null) as {
      ok?: boolean;
      error?: string;
      method?: string;
      verified?: boolean;
      fallbackCommand?: string;
    } | null;
    const detail = data?.ok
      ? "The update command finished. The machine pulled the latest changes, installed dependencies, and restarted the collector."
      : [data?.error ?? "Update failed", data?.fallbackCommand ? `Fallback script:\n${data.fallbackCommand}` : ""].filter(Boolean).join("\n\n");
    setUpdateStatusByMachine((current) => ({
      ...current,
      [machine.key]: {
        label: data?.ok ? "Updated!" : "Update failed",
        detail,
        tone: data?.ok ? "success" : "error",
      },
    }));
    if (data?.ok) {
      void refreshAppVersionNow();
      void refreshDiscoveryNow();
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
    const setupIssue = chatSetupIssue(selectedAgent);
    if (setupIssue) {
      appendMessage(selectedAgent.id, { role: "user", content: prompt });
      appendMessage(selectedAgent.id, { role: "assistant", content: `Error: ${setupIssue}` });
      return;
    }

    setBusy(true);
    setBusyAgentId(selectedAgent.id);
    setText("");
    const taskId = `${selectedAgent.id}-${Date.now()}`;
    const contextMessages = (messagesByAgent[selectedAgent.id] ?? [])
      .filter((message) => message.role !== "system" && message.content.trim())
      .slice(-5);
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
          messages: [...contextMessages, { role: "user", content: prompt }],
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
      setBusyAgentId("");
    }
  }

  return (
    <motion.main
        className="shell commandShell"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
      >
        <aside className="commandSidebar" aria-label="Control room navigation">
          <div className="sidebarBrand">
            <Image
              className="brandLogo"
              src="/omni-agent-hivemind-logo.png"
              alt="Omni-Agent Hivemind"
              width={190}
              height={194}
              style={{ display: "block", width: "auto", height: "auto", margin: "0 auto" }}
              priority
            />
            <div>
              <p className="eyebrow">Private swarm command</p>
              <h1>Omni-Agent Hivemind</h1>
            </div>
          </div>

          <nav className="viewTabs" aria-label="Dashboard views">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`viewTab ${activeView === item.id ? "active" : ""}`}
                aria-pressed={activeView === item.id}
                title={item.detail}
                onClick={() => setActiveView(item.id)}
              >
                {viewIcon(item.id)}
                <span>{item.label}</span>
                <small>{item.detail}</small>
                {activeView === item.id ? <ChevronRight aria-hidden="true" /> : null}
              </button>
            ))}
          </nav>

          <div className="sidebarTrust">
            <Badge variant="success"><ShieldCheck aria-hidden="true" /> Tailnet private</Badge>
            <span>Collectors are read-only until you explicitly configure runtime chat or payments.</span>
          </div>
        </aside>

        <div className="commandMain">
          <section className="flex items-center justify-end gap-4 px-2 py-1.5 text-xs text-[var(--muted)]" aria-label="Fleet summary">
            <span className="flex items-center gap-1.5">
              <Monitor aria-hidden="true" className="size-3.5 text-[var(--accent-strong)]" />
              <strong className="text-[var(--foreground)]">{machineGroups.filter((machine) => machine.key !== "unassigned").length}</strong>
              machines
            </span>
            <span className="flex items-center gap-1.5">
              <Bot aria-hidden="true" className="size-3.5 text-[var(--accent-strong)]" />
              <strong className="text-[var(--foreground)]">{visibleAgentCount}</strong>
              agents
            </span>
            {setupNeededCount > 0 ? (
              <span className="flex items-center gap-1.5 text-[#fde68a]">
                <CircleAlert aria-hidden="true" className="size-3.5" />
                <strong>{setupNeededCount}</strong>
                need setup
              </span>
            ) : null}
          </section>

      {activeView === "agents" ? (
      <section className="agentRail tabPanel">
        <div className="agentRailHeader">
          <div>
            <h2>Fleet</h2>
            <p className="text-xs text-[var(--muted)]">
              {fleetCheckedAt ? `Scanned ${formatRelativeTime(fleetCheckedAt)} · ` : ""}{tailscaleStatus}
            </p>
          </div>
          <details className="quickConnect">
            <summary>Connect an agent</summary>
          <div className="addAgent">
            <div className="addAgentIntro">
              <strong>Add a saved shortcut</strong>
              <span>{connectableMachines.length > 0 ? "Pick a machine that is already connected." : "Connect a machine first."}</span>
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
            <Button type="button" size="sm" disabled={connectableMachines.length === 0} onClick={() => addAgent()}>
              <PlugZap aria-hidden="true" />
              Attach
            </Button>
          </div>
          </details>
        </div>

        <div className="machineBoard">
          {machineGroups.map((machine) => {
            const versionCopy = machineVersionCopy(machine, appVersion?.latestCommit || appVersion?.commit);
            const updateStatus = updateStatusByMachine[machine.key];
            const isReady = machine.collector === "ready";
            const needsChatBridgeRepair = machineNeedsChatBridgeRepair(machine);
            const needsPublishedBridge = needsChatBridgeRepair && localDashboardHasUnpublishedChanges(appVersion);
            const canAutoUpdate = isCollectorAutoUpdateable(versionCopy) || (needsChatBridgeRepair && !needsPublishedBridge);

            // Connect chip and Sync icon both live in MachineCell's
            // top-right header slot — see the MachineCell component for the
            // rendering. We just hand it the callbacks and the loading state.
            const isSyncing = updateStatus?.tone === "working";
            const syncSucceeded = updateStatus?.tone === "success";
            const primaryAgent = machine.agents[0];
            const machineMenuItems: CellMenuItem[] = [
              ...(needsPublishedBridge ? [{
                key: "publish-first",
                label: "Publish update first",
                icon: <CircleAlert aria-hidden="true" />,
                disabled: true,
                onClick: () => undefined,
              }] : canAutoUpdate ? [{
                key: "update-collector",
                label: isSyncing
                  ? "Updating collector"
                  : syncSucceeded
                    ? "Collector synced"
                    : needsChatBridgeRepair
                      ? "Repair chat bridge"
                      : "Update collector",
                icon: syncSucceeded
                  ? <Check aria-hidden="true" />
                  : <RefreshCcw aria-hidden="true" className={isSyncing ? "animate-spin" : ""} />,
                disabled: !isReady || isSyncing || syncSucceeded,
                onClick: () => runMachineUpdate(machine),
              }] : []),
              {
                key: "new-chat",
                label: primaryAgent ? "New chat" : "Connect for chat",
                icon: primaryAgent ? <MessageSquare aria-hidden="true" /> : <PlugZap aria-hidden="true" />,
                onClick: () => {
                  if (primaryAgent) {
                    startAgentChat(primaryAgent.id, { fresh: true });
                  } else {
                    openSetupModal(machine);
                  }
                },
              },
              {
                key: "add-agent",
                label: machine.collector === "ready" ? "Add agent" : "Connect first",
                icon: <Bot aria-hidden="true" />,
                disabled: machine.collector !== "ready",
                onClick: () => addAgentToMachine(machine),
              },
            ];

            // The update banner is rendered inline only while the machine is mid-update,
            // matching the "calm motion for live activity" guidance.
            const updateBanner = updateStatus?.detail ? (
              <div className={`machineUpdateStatus ${updateStatus.tone}`}>
                <div>
                <strong>{updateStatus.label}</strong>
                <pre>{updateStatus.detail}</pre>
              </div>
                <Button type="button" size="sm" variant="secondary" onClick={() => copyUpdateDetail(machine.key)}>
                  {copiedUpdateDetailKey === machine.key ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                  {copiedUpdateDetailKey === machine.key ? "Copied" : "Copy"}
                </Button>
              </div>
            ) : null;

            // Technical machine detail — address, IP, collector URL, version commit —
            // moved entirely behind a Details disclosure (rule 6).
            const details = (
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {machine.dnsName ? <span><strong className="text-[var(--foreground)]">Tailnet name:</strong> {machine.dnsName}</span> : null}
                {machine.ip ? <span><strong className="text-[var(--foreground)]">IP:</strong> {machine.ip}</span> : null}
                {machine.collectorUrl ? <span className="truncate"><strong className="text-[var(--foreground)]">Collector:</strong> {machine.collectorUrl}</span> : null}
                {machine.capabilities ? <span><strong className="text-[var(--foreground)]">Chat bridge:</strong> {machine.capabilities.chat ? "Installed" : "Missing"}</span> : null}
                {versionCopy ? <span><strong className="text-[var(--foreground)]">Dashboard tools:</strong> {versionCopy.label} ({versionCopy.detail})</span> : null}
              </div>
            );

            return (
              <MachineCell
                key={machine.key}
                name={machine.self ? "This Mac" : machine.name}
                address={machine.address}
                agentCount={machine.agents.length}
                collector={machine.collector}
                online={machine.online}
                self={machine.self}
                versionState={versionCopy}
                updateBanner={updateBanner}
                onConnect={() => openSetupModal(machine)}
                onSyncUpdate={() => runMachineUpdate(machine)}
                isSyncing={isSyncing}
                syncSucceeded={syncSucceeded}
                forceUpdateAvailable={canAutoUpdate}
                actionMenu={(
                  <CellMenu
                    items={machineMenuItems}
                    ariaLabel={`Actions for ${machine.self ? "This Mac" : machine.name}`}
                    triggerIcon={<Plus aria-hidden="true" />}
                    className="size-7 rounded-full border border-[rgba(148,163,184,0.24)] bg-[rgba(15,23,42,0.7)]"
                  />
                )}
                details={details}
              >
                {machine.agents.length > 0 ? (
                  <div className="flex flex-col">
                    {machine.agents.map((agent) => {
                      const agentWork = agentWorkById[agent.id] ?? [];
                      const activeCount = agentWork.filter(isMeaningfulActive).length;
                      const snapshot = fleetSnapshots[agent.id];
                      const primaryWorkRaw = agentWork[0];
                      const primaryWork = primaryWorkRaw ? {
                        title: cleanActivityTitle(primaryWorkRaw.title),
                      } : null;
                      const hasMachineWiring = Boolean(agent.telemetryUrl || machine.self);

                      const menuItems: CellMenuItem[] = [
                        {
                          key: "chat",
                          label: "Open chat",
                          icon: <MessageSquare aria-hidden="true" />,
                          onClick: () => startAgentChat(agent.id),
                        },
                        {
                          key: "wallet",
                          label: "Wallet & limits",
                          icon: <WalletCards aria-hidden="true" />,
                          onClick: () => {
                            setSelectedAgentId(agent.id);
                            setActiveView("wallet");
                          },
                        },
                        {
                          key: "settings",
                          label: "Edit settings",
                          icon: <Settings2 aria-hidden="true" />,
                          onClick: () => {
                            setSelectedAgentId(agent.id);
                            setActiveView("chat");
                          },
                        },
                        {
                          key: "duplicate",
                          label: "Duplicate",
                          icon: <CopyPlus aria-hidden="true" />,
                          onClick: () => duplicateAgent(agent.id),
                        },
                        {
                          key: "remove",
                          label: "Remove agent",
                          icon: <Trash2 aria-hidden="true" />,
                          onClick: () => deleteAgent(agent.id),
                          disabled: agents.length <= 1,
                          destructive: true,
                        },
                      ];

                      const isSelected = agent.id === selectedAgent?.id;

                      // Build the task rows shown inline when this agent is selected.
                      // We surface up to 6 most-recent tasks to keep the machine list compact.
                      const taskRows: AgentTaskRow[] = isSelected
                        ? agentWork.slice(0, 6).map((task) => ({
                            id: task.id,
                            title: cleanActivityTitle(task.title),
                            status: task.status,
                            isBusy: task.status === "active"
                              && (busyAgentId === agent.id || Date.now() - task.updatedAt <= QUIET_SNAPSHOT_HOLD_MS),
                            messageCount: task.messages?.length,
                            when: task.updatedAt > 0 ? formatRelativeTime(task.updatedAt) : undefined,
                            source: task.source,
                          }))
                        : [];

                      return (
                        <AgentCell
                          key={agent.id}
                          name={agent.name}
                          runtime={agent.runtime}
                          hasTelemetryUrl={hasMachineWiring}
                          activeCount={activeCount}
                          snapshotOk={snapshot?.ok}
                          snapshotError={snapshot?.error}
                          primaryWork={primaryWork}
                          primaryWorkTime={primaryWorkRaw && primaryWorkRaw.updatedAt > 0
                            ? formatRelativeTime(primaryWorkRaw.updatedAt)
                            : undefined}
                          emptyTitle={friendlyEmptyTitle(snapshot, hasMachineWiring)}
                          selected={isSelected}
                          onSelect={() => setSelectedAgentId(agent.id)}
                          menu={<CellMenu items={menuItems} ariaLabel={`Actions for ${agent.name}`} />}
                          expandedContent={(
                            <AgentTaskList
                              tasks={taskRows}
                              onResumeTask={(taskRow) => {
                                const task = agentWork.find((item) => item.id === taskRow.id);
                                const seedMessages = task?.messages?.length
                                  ? task.messages.slice(-5)
                                  : [
                                    { role: "user" as const, content: cleanActivityTitle(task?.title ?? taskRow.title) },
                                    { role: "assistant" as const, content: task?.lastMessage ?? "No readable response was stored for this task." },
                                  ].filter((message) => message.content.trim());
                                startAgentChat(agent.id, { messageLimit: 5, seedMessages });
                              }}
                              emptyTitle={friendlyEmptyTitle(snapshot, hasMachineWiring)}
                              emptyBody="Activity will show up here as soon as this agent records work."
                            />
                          )}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--muted)]">
                    {isReady ? "No agents yet on this machine." : "Run the collector once to see agents."}
                  </p>
                )}
              </MachineCell>
            );
          })}
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

      {activeView === "swarm" ? (
      <section className="swarmPanel">
        <div className={`mirosharkControl ${mirosharkStatus?.ok ? "connected" : ""}`}>
          <div className="mirosharkIdentity">
            <span className="mirosharkDot" aria-hidden="true" />
            <div>
              <p>MiroShark</p>
              <h2>
                {mirosharkStatus?.ok
                  ? "Connected"
                  : mirosharkStatus?.install.running
                    ? "Starting"
                    : mirosharkStatus?.installPath
                      ? "Detected"
                      : "Not installed"}
              </h2>
              <span>{mirosharkStatus?.ok ? mirosharkStatus.baseUrl : mirosharkStatus?.configHint ?? mirosharkStatus?.error ?? "Ready to install locally"}</span>
            </div>
          </div>

          <div className="mirosharkActions">
            {(mirosharkStatus?.actions ?? [{ id: "install" as const, label: "Install & start" }]).map((action) => (
              <Button
                key={action.id}
                type="button"
                size="sm"
                variant={action.id === "open" ? "secondary" : "default"}
                onClick={() => runMirosharkAction(action.id)}
                disabled={Boolean(action.disabled) || mirosharkActionPending === action.id}
              >
                {action.id === "open" ? <ChevronRight aria-hidden="true" /> : <PlugZap aria-hidden="true" />}
                {mirosharkActionPending === action.id ? "Working..." : action.label}
              </Button>
            ))}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={async () => {
                const response = await fetch("/api/miroshark/status", { cache: "no-store" }).catch(() => null);
                const data = await response?.json().catch(() => null) as MiroSharkStatus | null;
                if (data?.baseUrl) setMirosharkStatus(data);
              }}
            >
              <RefreshCcw aria-hidden="true" />
              Recheck
            </Button>
          </div>
        </div>

        {!mirosharkStatus?.ok ? (
          <details className="mirosharkSetup">
            <summary>Setup details</summary>
            <div>
                <p>
                  <strong className="text-[var(--foreground)]">Backend:</strong>{" "}
                  {mirosharkStatus?.baseUrl ?? "http://127.0.0.1:5001"}{" "}
                  {mirosharkStatus?.configured ? "(set via environment)" : mirosharkStatus?.installPath ? "(auto-detected)" : "(default address)"}
                </p>
                <p>
                  <strong className="text-[var(--foreground)]">Install:</strong>{" "}
                  {mirosharkStatus?.installPath ?? "Not found yet"}
                  {mirosharkStatus?.installSource ? ` (${mirosharkStatus.installSource})` : ""}
                </p>
                {mirosharkStatus?.requirements?.length ? (
                  <div className="grid gap-1">
                    <strong className="text-[var(--foreground)]">Readiness:</strong>
                    {mirosharkStatus.requirements.map((requirement) => (
                      <span key={requirement.name} className="flex flex-wrap items-center gap-1">
                        <span className={requirement.ok ? "text-emerald-300" : "text-rose-300"}>
                          {requirement.ok ? "Ready" : "Needs setup"}
                        </span>
                        <span>{requirement.name}</span>
                        <code className="font-mono text-[0.66rem] text-[var(--muted)]">{requirement.detail}</code>
                      </span>
                    ))}
                  </div>
                ) : null}
                <p>
                  <strong className="text-[var(--foreground)]">Endpoints:</strong>{" "}
                  <code className="font-mono text-[0.7rem]">{mirosharkStatus?.endpoints.health ?? "GET /health"}</code>
                  {" · "}
                  <code className="font-mono text-[0.7rem]">{mirosharkStatus?.endpoints.templates ?? "GET /api/templates/list"}</code>
                  {" · "}
                  <code className="font-mono text-[0.7rem]">{mirosharkStatus?.endpoints.createSimulation ?? "POST /api/simulation/create"}</code>
                </p>
                {mirosharkStatus?.startCommand ? (
                  <p>
                    <strong className="text-[var(--foreground)]">Manual fallback:</strong>{" "}
                    <code className="font-mono text-[0.66rem]">{mirosharkStatus.startCommand}</code>
                  </p>
                ) : null}
                {mirosharkStatus?.configHint ? <p className="text-amber-200">{mirosharkStatus.configHint}</p> : null}
                {mirosharkStatus?.install.logPath ? (
                  <p className="text-[var(--muted)]">Setup log: <code>{mirosharkStatus.install.logPath}</code></p>
                ) : null}
              </div>
          </details>
        ) : null}

        <form className="mirosharkRunner" onSubmit={runMirosharkSwarm}>
          <label className="mirosharkScenario">
            <span>Scenario</span>
            <textarea
              value={mirosharkScenario}
              onChange={(event) => setMirosharkScenario(event.target.value)}
              placeholder="Describe the market, community, launch, crisis, or decision you want the agents to simulate."
            />
          </label>

          <div className="mirosharkRunControls">
            <label>
              <span>Surface</span>
              <select value={mirosharkPlatform} onChange={(event) => setMirosharkPlatform(event.target.value as "twitter" | "reddit" | "parallel")}>
                <option value="twitter">Twitter</option>
                <option value="reddit">Reddit</option>
                <option value="parallel">Twitter + Reddit</option>
              </select>
            </label>
            <label>
              <span>Rounds</span>
              <input
                type="number"
                min={1}
                max={200}
                value={mirosharkRounds}
                onChange={(event) => setMirosharkRounds(Number(event.target.value))}
              />
            </label>
            <Button type="submit" disabled={!mirosharkStatus?.ok || mirosharkRunPending || !mirosharkScenario.trim()}>
              <Activity aria-hidden="true" />
              {mirosharkRunPending ? "Running setup..." : "Run swarm"}
            </Button>
          </div>
        </form>

        {mirosharkRun ? (
          <section className={`mirosharkRunResult ${mirosharkRun.ok ? "ready" : "failed"}`}>
            <header>
              <div>
                <p>{mirosharkRun.ok ? (mirosharkRun.status === "started" ? "Run started" : "Run progress") : "Run failed"}</p>
                <h3>{mirosharkRun.simulationId ?? mirosharkRun.message ?? mirosharkRun.error}</h3>
              </div>
              {mirosharkRun.jobId || mirosharkRun.simulationId ? (
                <Button type="button" size="sm" variant="ghost" onClick={refreshMirosharkRun}>
                  <RefreshCcw aria-hidden="true" />
                  Refresh run
                </Button>
              ) : null}
            </header>
            {mirosharkRun.ok ? (
              <div className="mirosharkRunGrid">
                <span><strong>Step</strong>{mirosharkRun.step ?? "queued"}</span>
                <span><strong>Status</strong>{mirosharkRunStatus?.runner_status ?? mirosharkRun.status ?? "queued"}</span>
                <span><strong>Posts</strong>{mirosharkPosts.count}</span>
                <span><strong>Project</strong>{mirosharkRun.projectId}</span>
                <span><strong>Graph</strong>{mirosharkRun.graphId}</span>
                <span><strong>Surface</strong>{mirosharkRun.platform}</span>
                <span><strong>Rounds</strong>{mirosharkRun.rounds}</span>
              </div>
            ) : null}
            {mirosharkRun.error ? <p className="mirosharkRunError">{mirosharkRun.error}</p> : null}
            {mirosharkRun.links ? (
              <div className="mirosharkRunLinks">
                {Object.entries(mirosharkRun.links).map(([label, href]) => (
                  <a href={href} target="_blank" rel="noreferrer" key={label}>{label}</a>
                ))}
              </div>
            ) : null}
            {mirosharkPosts.posts.length || mirosharkFeedIsWaiting ? (
              <div className={`mirosharkRunFeed ${mirosharkFeedIsLive ? "isLive" : ""}`}>
                <div>
                  <strong>Live posts</strong>
                  <span>
                    {mirosharkFeedIsWaiting
                      ? "listening..."
                      : `showing ${mirosharkPosts.count}${mirosharkPosts.sourceCount > mirosharkPosts.count ? ` · ${mirosharkPosts.sourceCount - mirosharkPosts.count} blank hidden` : ""}`}
                  </span>
                </div>
                {mirosharkFeedIsWaiting ? (
                  <div className="mirosharkFeedLoading" aria-live="polite">
                    <span />
                    <p>Waiting for MiroShark to publish the first posts</p>
                  </div>
                ) : (
                  <ol>
                    {mirosharkPosts.posts.map((post, index) => (
                      <li key={`${post.post_id ?? index}-${post.created_at ?? "tick"}`}>
                        <span>User {post.user_id ?? "?"}{typeof post.post_id === "number" ? ` · post #${post.post_id}` : ""}</span>
                        <p>{post.displayText}</p>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            ) : null}
          </section>
        ) : null}
      </section>
      ) : null}

      {activeView === "wallet" ? (
      <section className="walletPanel tabPanel">
        <div className="walletHeader">
          <div>
            <p className="eyebrow">Spending safety</p>
            <h2>Wallets</h2>
            <p>
              Decide which agents can spend, how much they can spend, and when they must stop or ask you.
            </p>
          </div>
          <div className="walletTotals" aria-label="Wallet summary">
            <span>
              Can spend
              <strong>{walletStats.enabled}</strong>
            </span>
            <span>
              Available
              <strong>${walletStats.balance.toFixed(2)}</strong>
            </span>
            <span>
              Need funding
              <strong>{walletStats.critical}</strong>
            </span>
          </div>
        </div>

        <div className="walletWorkspace">
          <aside className="walletAgentList" aria-label="Agent wallet list">
            {displayAgents.map((agent) => {
              const wallet = walletsByAgent[agent.id] ?? createDefaultAgentWallet(agent.id);
              const snapshot = getSurvivalSnapshot(wallet);
              const summary = !wallet.enabled
                ? "Wallet off"
                : snapshot.tier === "critical" || snapshot.tier === "dead"
                  ? "Needs funding"
                  : snapshot.tier === "low_compute"
                    ? "Slowing down"
                    : "Can spend safely";
              return (
                <button
                  type="button"
                  className={`walletAgentButton ${agent.id === selectedAgent?.id ? "active" : ""}`}
                  key={agent.id}
                  onClick={() => setSelectedAgentId(agent.id)}
                >
                  <span>{RUNTIME_LABELS[agent.runtime]}</span>
                  <strong>{agent.name}</strong>
                  <small>
                    {summary}
                    {wallet.enabled ? ` · $${Math.max(0, snapshot.effectiveBalanceUsd).toFixed(2)}` : ""}
                  </small>
                </button>
              );
            })}
          </aside>

          {selectedAgent && selectedWallet && selectedWalletSnapshot ? (
            <div className="walletDetail">
              <WalletCell
                agentName={selectedAgent.name}
                wallet={selectedWallet}
                survival={selectedWalletSnapshot}
                simpleLimits={(
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
                      Current balance
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={selectedWallet.currentBalanceUsd}
                        onChange={(event) => updateWallet(selectedAgent.id, { currentBalanceUsd: normalizeMoney(event.target.value, selectedWallet.currentBalanceUsd) })}
                        className="rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(10,14,21,0.7)] px-2 py-1 text-[var(--foreground)]"
                      />
                      <small>How much money is available for this agent.</small>
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
                      Ask me over
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={selectedWallet.approvalRequiredOverUsd}
                        onChange={(event) => updateWallet(selectedAgent.id, { approvalRequiredOverUsd: normalizeMoney(event.target.value, selectedWallet.approvalRequiredOverUsd) })}
                        className="rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(10,14,21,0.7)] px-2 py-1 text-[var(--foreground)]"
                      />
                      <small>The agent must ask before spending more than this.</small>
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
                      Max per payment
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={selectedWallet.maxPaymentUsd}
                        onChange={(event) => updateWallet(selectedAgent.id, { maxPaymentUsd: normalizeMoney(event.target.value, selectedWallet.maxPaymentUsd) })}
                        className="rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(10,14,21,0.7)] px-2 py-1 text-[var(--foreground)]"
                      />
                      <small>Hard cap for any single payment.</small>
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
                      Daily running cost
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={selectedWallet.dailyComputeBurnUsd}
                        onChange={(event) => updateWallet(selectedAgent.id, { dailyComputeBurnUsd: normalizeMoney(event.target.value, selectedWallet.dailyComputeBurnUsd) })}
                        className="rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(10,14,21,0.7)] px-2 py-1 text-[var(--foreground)]"
                      />
                      <small>Used only for the runway estimate.</small>
                    </label>
                  </div>
                )}
                advancedSetup={(
                  <div className="grid gap-3">
                    <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
                      Payment method
                      <select
                        value={selectedWallet.provider}
                        onChange={(event) => updateWallet(selectedAgent.id, { provider: event.target.value as AgentPaymentProvider })}
                        className="rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(10,14,21,0.7)] px-2 py-1 text-[var(--foreground)]"
                      >
                        {Object.entries(AGENT_PAYMENT_PROVIDER_COPY).map(([provider, copy]) => (
                          <option value={provider} key={provider}>{copy.label}</option>
                        ))}
                      </select>
                      <small>{AGENT_PAYMENT_PROVIDER_COPY[selectedWallet.provider].summary}</small>
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
                      Wallet address
                      <input
                        value={selectedWallet.walletAddress}
                        onChange={(event) => updateWallet(selectedAgent.id, { walletAddress: event.target.value })}
                        placeholder="0x... or Solana address"
                        className="rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(10,14,21,0.7)] px-2 py-1 text-[var(--foreground)]"
                      />
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
                        Starting balance
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={selectedWallet.seedBalanceUsd}
                          onChange={(event) => updateWallet(selectedAgent.id, { seedBalanceUsd: normalizeMoney(event.target.value, selectedWallet.seedBalanceUsd) })}
                          className="rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(10,14,21,0.7)] px-2 py-1 text-[var(--foreground)]"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
                        Network
                        <select
                          value={selectedWallet.network}
                          onChange={(event) => updateWallet(selectedAgent.id, { network: event.target.value })}
                          className="rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(10,14,21,0.7)] px-2 py-1 text-[var(--foreground)]"
                        >
                          <option value="eip155:8453">Base mainnet</option>
                          <option value="eip155:84532">Base Sepolia</option>
                          <option value="solana:mainnet">Solana mainnet</option>
                          <option value="solana:devnet">Solana devnet</option>
                        </select>
                      </label>
                      <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
                        Token
                        <input
                          value={selectedWallet.tokenSymbol}
                          onChange={(event) => updateWallet(selectedAgent.id, { tokenSymbol: event.target.value.toUpperCase() })}
                          className="rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(10,14,21,0.7)] px-2 py-1 text-[var(--foreground)]"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
                        ClawCard env name
                        <input
                          value={selectedWallet.clawCardEnvName}
                          onChange={(event) => updateWallet(selectedAgent.id, { clawCardEnvName: event.target.value })}
                          className="rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(10,14,21,0.7)] px-2 py-1 text-[var(--foreground)]"
                        />
                      </label>
                    </div>
                    <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
                      x402 base URL
                      <input
                        value={selectedWallet.x402BaseUrl}
                        onChange={(event) => updateWallet(selectedAgent.id, { x402BaseUrl: event.target.value })}
                        placeholder="https://paid-api.example.com"
                        className="rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(10,14,21,0.7)] px-2 py-1 text-[var(--foreground)]"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
                      Private setup notes
                      <textarea
                        value={selectedWallet.notes}
                        onChange={(event) => updateWallet(selectedAgent.id, { notes: event.target.value })}
                        placeholder="Provider dashboard URL, deposit memo, funding policy..."
                        className="min-h-[64px] rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(10,14,21,0.7)] px-2 py-1 text-[var(--foreground)]"
                      />
                    </label>
                  </div>
                )}
                moneyMovingControls={(
                  <>
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#fecdd3]">
                      <input
                        type="checkbox"
                        checked={selectedWallet.enabled}
                        onChange={(event) => updateWallet(selectedAgent.id, { enabled: event.target.checked })}
                      />
                      {selectedWallet.enabled ? "Wallet on" : "Wallet off"}
                    </label>
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#fecdd3]">
                      <input
                        type="checkbox"
                        checked={selectedWallet.autoPayEnabled}
                        onChange={(event) => updateWallet(selectedAgent.id, { autoPayEnabled: event.target.checked })}
                      />
                      Allow autopay within caps
                    </label>
                    <Button type="button" size="sm" variant="secondary" onClick={() => resetWalletBurnClock(selectedAgent.id)}>
                      <RefreshCcw aria-hidden="true" />
                      Reset runway clock
                    </Button>
                    <Button type="button" size="sm" variant="danger" onClick={() => copyPaymentPrompt(selectedWallet)}>
                      <CreditCard aria-hidden="true" />
                      Copy agent prompt
                    </Button>
                  </>
                )}
              />

              <Cell
                glyph="NXT"
                eyebrow="Next safe steps"
                title="Activate one cell at a time"
                subtitle="Set up, fund, verify, then assign work."
                status="memory-synced"
                tone="info"
              >
                <ol className="m-0 grid gap-2 p-0 [list-style:none] text-xs">
                  {SOVEREIGN_AGENT_LAUNCH_STEPS.slice(0, 4).map((step, index) => (
                    <li key={step} className="flex items-start gap-3">
                      <span aria-hidden="true" className="mt-[2px] inline-flex h-5 w-5 items-center justify-center rounded-full bg-[rgba(45,212,191,0.15)] text-[0.65rem] font-semibold text-[#99f6e4]">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
                <details
                  className="mt-3 rounded-md border border-[rgba(148,163,184,0.16)] bg-[rgba(15,23,42,0.55)] px-3 py-2"
                  onClick={(event) => event.stopPropagation()}
                >
                  <summary className="cursor-pointer text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                    Safety rules
                  </summary>
                  <ul className="m-0 mt-2 grid gap-1 p-0 [list-style:none] text-[0.78rem]">
                    {PAYMENT_SAFETY_RULES.map((rule) => (
                      <li key={rule} className="flex items-start gap-2">
                        <span aria-hidden="true" className="mt-[2px] text-[#fde68a]">!</span>
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ul>
                </details>
                <details
                  className="mt-2 rounded-md border border-[rgba(148,163,184,0.16)] bg-[rgba(15,23,42,0.55)] px-3 py-2"
                  onClick={(event) => event.stopPropagation()}
                >
                  <summary className="cursor-pointer text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                    Provider notes
                  </summary>
                  <p className="mt-2 text-[0.78rem] text-[var(--foreground)]/85">
                    {AGENT_PAYMENT_PROVIDER_COPY[selectedWallet.provider].setup}
                  </p>
                </details>
              </Cell>
            </div>
          ) : (
            <div className="walletEmpty">
              <strong>No agent selected</strong>
              <p>Connect an agent first, then configure its spending limits and survival rails.</p>
            </div>
          )}
        </div>
      </section>
      ) : null}

      {activeView === "vault" ? (
      <section className="vaultPanel tabPanel">
        <div className="vaultHeader">
          <div>
            <p className="eyebrow">Shared brain</p>
            <h2>One memory, many agents</h2>
            <p>Connect an Obsidian vault to give your agents a common place for memory, handoffs, and shared project context.</p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <MemoryCell
            enabled={sharedVault.enabled}
            vaultPath={sharedVault.vaultPath}
            optedInAgentCount={displayAgents.filter((agent) => agent.useSharedVault !== false).length}
            totalAgentCount={displayAgents.length}
            primaryAction={(
              <label className="inline-flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={sharedVault.enabled}
                  onChange={(event) => updateSharedVault({ enabled: event.target.checked })}
                />
                {sharedVault.enabled ? "Shared brain on" : "Turn on shared brain"}
              </label>
            )}
            details={(
              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
                  Vault folder
                  <input
                    value={sharedVault.vaultPath}
                    onChange={(event) => updateSharedVault({ vaultPath: event.target.value })}
                    className="rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(10,14,21,0.7)] px-2 py-1 text-[var(--foreground)]"
                  />
                  <small>Where shared notes live. Read-only until the vault is reachable.</small>
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
                    Inbox subfolder
                    <input
                      value={sharedVault.inboxFolder}
                      onChange={(event) => updateSharedVault({ inboxFolder: event.target.value })}
                      className="rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(10,14,21,0.7)] px-2 py-1 text-[var(--foreground)]"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
                    Shared note path
                    <input
                      value={sharedVault.sharedNotePath}
                      onChange={(event) => updateSharedVault({ sharedNotePath: event.target.value })}
                      className="rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(10,14,21,0.7)] px-2 py-1 text-[var(--foreground)]"
                    />
                  </label>
                </div>
                <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
                  Control Room folder
                  <input
                    value={sharedVault.controlRoomPath}
                    onChange={(event) => updateSharedVault({ controlRoomPath: event.target.value })}
                    className="rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(10,14,21,0.7)] px-2 py-1 text-[var(--foreground)]"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
                  Agent instructions
                  <textarea
                    value={sharedVault.instructions}
                    onChange={(event) => updateSharedVault({ instructions: event.target.value })}
                    className="min-h-[80px] rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(10,14,21,0.7)] px-2 py-1 text-[var(--foreground)]"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="secondary" onClick={checkVaultStatus}>
                    Check vault path
                  </Button>
                  <Button type="button" size="sm" variant="secondary" onClick={checkControlRoomStatus}>
                    Check Control Room
                  </Button>
                </div>
              </div>
            )}
          />

          {/* Vault status surfaces are translated into plain sentences instead of raw JSON. */}
          <Cell
            glyph="OK"
            eyebrow="Vault checks"
            title="Path verification"
            subtitle="The app only validates paths — it never writes to your vault unless an agent explicitly does."
            status={(() => {
              if (!vaultStatus && !controlRoomStatus) return "unknown";
              const vaultOk = Boolean((vaultStatus as { ok?: boolean } | null)?.ok);
              const controlOk = Boolean((controlRoomStatus as { ok?: boolean } | null)?.ok);
              if (vaultStatus && !vaultOk) return "blocked";
              if (controlRoomStatus && !controlOk) return "blocked";
              return "healthy";
            })()}
            tone={(() => {
              if (!vaultStatus && !controlRoomStatus) return "muted";
              const vaultOk = Boolean((vaultStatus as { ok?: boolean } | null)?.ok);
              const controlOk = Boolean((controlRoomStatus as { ok?: boolean } | null)?.ok);
              if ((vaultStatus && !vaultOk) || (controlRoomStatus && !controlOk)) return "danger";
              return "success";
            })()}
          >
            <ul className="m-0 grid gap-2 p-0 [list-style:none] text-xs">
              <li className="rounded-md border border-[rgba(148,163,184,0.14)] bg-[rgba(10,14,21,0.55)] px-3 py-2">
                <strong className="block text-[var(--foreground)]">Vault path</strong>
                <span className="text-[var(--muted)]">
                  {vaultStatus
                    ? (vaultStatus as { ok?: boolean; reason?: string }).ok
                      ? "Reachable. Notes can be read by opted-in agents."
                      : `Cannot read this folder — ${(vaultStatus as { reason?: string }).reason ?? "check that it exists."}`
                    : "Press Check vault path above to verify."}
                </span>
              </li>
              <li className="rounded-md border border-[rgba(148,163,184,0.14)] bg-[rgba(10,14,21,0.55)] px-3 py-2">
                <strong className="block text-[var(--foreground)]">Control Room</strong>
                <span className="text-[var(--muted)]">
                  {controlRoomStatus
                    ? (controlRoomStatus as { ok?: boolean; reason?: string }).ok
                      ? "Connected. Agents see the operating manual and registry."
                      : `Not connected — ${(controlRoomStatus as { reason?: string }).reason ?? "verify the folder path."}`
                    : "Press Check Control Room to verify."}
                </span>
              </li>
            </ul>
          </Cell>
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
                      onClick={() => primaryAgent ? startAgentChat(primaryAgent.id, { fresh: true }) : openSetupModal(machine)}
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
              <button type="button" onClick={() => duplicateAgent()}>Duplicate</button>
              <button type="button" onClick={() => deleteAgent()} disabled={agents.length <= 1}>Delete</button>
            </div>
            </>
            ) : null}
          </aside>

          {selectedAgent ? (
          <section className="chat">
            <div className="chatHeader">
              <div>
                <p className="eyebrow">Live conversation</p>
                <h2>{selectedAgent.name}</h2>
                <p>{RUNTIME_LABELS[selectedAgent.runtime]} · {selectedAgent.gatewayUrl || "Chat URL needed"}</p>
              </div>
              <Button type="button" variant="secondary" onClick={() => checkStatus()}>
                <Activity aria-hidden="true" />
                Check status
              </Button>
            </div>
            {sessionNotice && visibleMessages.length > 0 ? (
              <div className="chatSessionNote">
                <MessageSquare aria-hidden="true" />
                <span>{sessionNotice}</span>
              </div>
            ) : null}
            {status && statusAgentId === selectedAgent.id ? (
              // Plain-English status summary in place of raw runtime JSON (rule 6).
              <div className="flex items-center gap-2 rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(10,14,21,0.55)] px-3 py-2 text-xs">
                <strong className={status.ok ? "text-[#bbf7d0]" : "text-[#fecdd3]"}>
                  {status.ok ? "Runtime is responding." : "Runtime did not respond."}
                </strong>
                <span className="text-[var(--muted)]">
                  {status.runtime ? `${RUNTIME_LABELS[status.runtime]} agent` : "Unknown runtime"}
                  {status.status ? ` · code ${status.status}` : ""}
                  {status.error ? ` · ${status.error}` : ""}
                </span>
                <details className="ml-auto" onClick={(event) => event.stopPropagation()}>
                  <summary className="cursor-pointer text-[0.65rem] uppercase tracking-[0.12em] text-[var(--muted)]">
                    Raw payload
                  </summary>
                  <pre className="mt-2 max-w-full overflow-auto text-[0.7rem] text-[var(--muted)]">{JSON.stringify(status, null, 2)}</pre>
                </details>
              </div>
            ) : null}
            <div className={`messages ${visibleMessages.length === 0 ? "empty" : ""}`}>
              {visibleMessages.length === 0 ? (
                <div className="chatEmptyPrompt">
                  <strong>No messages yet</strong>
                  <p>Messages with {selectedAgent.name} will appear here.</p>
                </div>
              ) : null}
              {visibleMessages.map((message, index) => (
                <div className={`message ${message.role}`} key={`${message.role}-${index}`}>
                  <span className="messageRole">{message.role}</span>
                  {message.content ? (
                    <ChatMarkdown text={message.content} />
                  ) : (
                    <p>{message.role === "assistant" && busy ? "Streaming..." : ""}</p>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} aria-hidden="true" />
            </div>
            {visibleMessages.length === 0 ? (
              <div className="chatSuggestions" aria-label="Suggested prompts">
                {[
                  "What are you working on?",
                  "Summarize latest task",
                  "Check workspace status",
                ].map((prompt) => (
                  <button type="button" key={prompt} onClick={() => setText(prompt)}>
                    {prompt}
                  </button>
                ))}
              </div>
            ) : null}
            <form onSubmit={sendMessage}>
              <div className="chatComposerField">
                <textarea
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder={`Ask ${selectedAgent.name} to do something...`}
                  disabled={busy}
                />
              </div>
              <Button type="submit" disabled={busy || !text.trim()} isLoading={busy}>
                {busy ? null : <Send aria-hidden="true" />}
                {busy ? "Streaming" : "Send"}
              </Button>
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
        </div>

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
              <Button type="button" variant="ghost" aria-label="Close setup instructions" onClick={() => setSetupMachineKey("")}>
                <X aria-hidden="true" />
                Close
              </Button>
            </div>

            <div className="setupGuide">
              {/* Progressive five-step setup, "activating cells in a hive" — rule from the
                  design philosophy's Setup Rules section. */}
              <SetupCell
                title="Add this machine"
                subtitle="Each step makes the system safer and clearer."
                steps={((): SetupStep[] => {
                  const steps: SetupStep[] = [
                    { label: "Connect", hint: "Open Terminal on the machine and run the setup command.", state: "current" },
                    { label: "Verify", hint: "We auto-detect the collector once it starts.", state: "pending" },
                    { label: "Configure limits", hint: "Set wallet caps and approval thresholds when you fund agents.", state: "pending" },
                    { label: "Enable shared brain", hint: "Optional — opt this machine's agents into the vault.", state: "pending" },
                    { label: "Advanced rails", hint: "Provider keys, x402, debug — only when you need them.", state: "pending" },
                  ];
                  if (setupMachine?.collector === "ready") {
                    steps[0].state = "done";
                    steps[1].state = "done";
                    steps[2].state = "current";
                  }
                  return steps;
                })()}
                primaryAction={(
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={copySetupCommand}
                  >
                    {setupCommandCopied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                    {setupCommandCopied ? "Copied setup command" : "Copy setup command"}
                  </Button>
                )}
                details={(
                  <div className="flex flex-col gap-2 text-xs">
                    <p>
                      Open Terminal on <strong className="text-[var(--foreground)]">{setupMachine?.self ? "this Mac" : setupMachine?.name}</strong>, paste this command, then press Return:
                    </p>
                    <pre className="overflow-auto rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(10,14,21,0.7)] p-3 text-[0.78rem] text-[var(--foreground)]">{setupCollectorCommand()}</pre>
                    <p className="text-[var(--muted)]">
                      When it finishes, come back here. The dashboard finds the machine on the next scan, and Chat becomes available.
                    </p>
                  </div>
                )}
              />
            </div>

            <div className="setupModalActions">
              <Button type="button" onClick={() => setSetupMachineKey("")}>
                <Check aria-hidden="true" />
                Done
              </Button>
            </div>
          </section>
        </div>
      ) : null}
    </motion.main>
  );
}
