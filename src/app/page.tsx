"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type PointerEvent, type ReactNode } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import {
  Activity,
  ArrowUp,
  Bell,
  Bot,
  BrainCircuit,
  Check,
  CheckCheck,
  ChevronRight,
  Clock3,
  CircleAlert,
  BarChart3,
  Copy,
  CopyPlus,
  CreditCard,
  Download,
  Eye,
  FileText,
  FlaskConical,
  Folder,
  FileUp,
  GitBranch,
  Heart,
  Hexagon,
  KanbanSquare,
  Layers3,
  LineChart,
  LoaderCircle,
  MessageSquare,
  MoreHorizontal,
  Monitor,
  Network,
  Plus,
  PlugZap,
  RefreshCcw,
  Repeat2,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Moon,
  Paperclip,
  Pencil,
  Sun,
  Mic,
  Trash2,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import type { AgentProfile, AgentRuntime, BeeAgentRole, BeeWorkerClass, SharedVaultConfig } from "@/lib/types/agent-runtime";
import type { AgentNotification, AgentNotificationSettings, AgentNotificationSummary } from "@/lib/types/agent-notifications";
import { createAgentProfile, DEFAULT_SHARED_VAULT, RUNTIME_DEFAULTS, RUNTIME_LABELS } from "@/lib/types/agent-runtime";
import type { AgentPaymentProvider, AgentWalletConfig } from "@/lib/types/agent-wallet";
import type { KanbanBoard, KanbanStatus, KanbanTask } from "@/lib/types/kanban";
import { KANBAN_COLUMNS } from "@/lib/types/kanban";
import { AGENT_PAYMENT_PROVIDER_COPY, PAYMENT_SAFETY_RULES, SOVEREIGN_AGENT_LAUNCH_STEPS } from "@/lib/config/agent-payments";
import { buildAgentPaymentPrompt, createDefaultAgentWallet, getSurvivalSnapshot, normalizeMoney } from "@/lib/utils/agent-wallet";
import { groupKanbanTasks } from "@/lib/utils/kanban-board";
import {
  BEE_AGENT_ROLES,
  BEE_WORKER_CLASSES,
  beeWorkerClassLabel,
  chooseBeeAssignment,
} from "@/lib/services/orchestration/bee-roles";
import chatStyles from "./chat.module.css";
import fleetStyles from "./fleet.module.css";
import kanbanStyles from "./kanban-board.module.css";
import mirosharkStyles from "./miroshark.module.css";
import notificationStyles from "./notifications.module.css";
import vaultStyles from "./vault.module.css";
import walletStyles from "./wallets.module.css";
import xThreadStyles from "./miroshark-x-thread.module.css";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
import { LottiePlayer } from "@/components/ui/lottie-player";

type GatewayStatus = {
  ok?: boolean;
  runtime?: AgentRuntime;
  status?: number;
  payload?: unknown;
  error?: string;
};

type VaultSyncStatus = {
  ok?: boolean;
  error?: string;
  method?: "syncthing" | "rsync";
  message?: string;
  folderId?: string;
  dryRun?: boolean;
  direction?: "bidirectional" | "push" | "pull";
  command?: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number | null;
  conflicts?: string[];
  changedFiles?: string[];
};

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  attachments?: ChatAttachment[];
};

type ChatAttachment = {
  id: string;
  kind: "image" | "audio" | "file";
  name: string;
  mimeType: string;
  size: number;
  dataUrl: string;
};

type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | { type: "file"; file: { filename: string; file_data: string } };

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  length: number;
  [index: number]: { transcript: string };
};

type SpeechRecognitionEventLike = Event & {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
};

type SpeechRecognitionLike = EventTarget & {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event & { error?: string; message?: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function kanbanClass(...names: Array<string | false | null | undefined>) {
  return cssClass(kanbanStyles, ...names);
}

function cssClass(styles: Record<string, string>, ...names: Array<string | false | null | undefined>) {
  return names
    .filter((name): name is string => Boolean(name))
    .map((name) => styles[name] ?? name)
    .join(" ");
}

function fleetClass(...names: Array<string | false | null | undefined>) {
  return cssClass(fleetStyles, ...names);
}

function chatClass(...names: Array<string | false | null | undefined>) {
  return cssClass(chatStyles, ...names);
}

function mirosharkClass(...names: Array<string | false | null | undefined>) {
  return cssClass(mirosharkStyles, ...names);
}

function notificationClass(...names: Array<string | false | null | undefined>) {
  return cssClass(notificationStyles, ...names);
}

function vaultClass(...names: Array<string | false | null | undefined>) {
  return cssClass(vaultStyles, ...names);
}

function walletClass(...names: Array<string | false | null | undefined>) {
  return cssClass(walletStyles, ...names);
}

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

type WalletActionState = {
  busy?: boolean;
  message?: string;
  error?: string;
  sendTo?: string;
  sendAmount?: string;
  confirmation?: string;
  x402Url?: string;
  x402Method?: string;
  x402Confirmation?: string;
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

type ChatTreeItem = {
  key: string;
  title: string;
  subtitle: string;
  updatedAt?: number;
  rank: number;
  active: boolean;
  onOpen: () => void;
};

type ChatTreeFolder = {
  key: string;
  label: string;
  chats: ChatTreeItem[];
  onStartChat?: () => void;
};

type ChatTreeMachine = {
  key: string;
  name: string;
  detail: string;
  folders: ChatTreeFolder[];
  onStartChat?: () => void;
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
  task?: KanbanTask;
  tenants?: string[];
  assignees?: string[];
  storage?: {
    source: "obsidian" | "local";
    root: string;
    boardsRoot: string;
    file: string;
    fallbackReason?: string;
  };
  error?: string;
};

type NoteTaskCandidate = {
  idempotencyKey: string;
  title: string;
  body: string;
  sourcePath: string;
  line: number;
  project?: string;
  section?: string;
  kind: "checkbox" | "next-action";
};

type NoteIntakeResponse = {
  ok?: boolean;
  candidates?: NoteTaskCandidate[];
  imported?: NoteTaskCandidate[];
  skipped?: number;
  board?: KanbanBoard;
  error?: string;
};

type NotificationsResponse = Partial<AgentNotificationSummary> & {
  ok?: boolean;
  notifications?: AgentNotification[];
  nextCursor?: number | null;
  limit?: number;
  error?: string;
};

type BrainAccessEvent = {
  id: string;
  notePath: string;
  agentName: string;
  agentId?: string;
  runtime?: string;
  machineName: string;
  dashboardMachine: string;
  accessedAt: string;
  action: "view" | "read" | "write" | "inspect";
};

type BrainGraphNode = {
  id: string;
  label: string;
  folder: string;
  tags: string[];
  byteSize: number;
  incoming: number;
  outgoing: number;
  accessCount: number;
  lastAccessedAt?: string;
  recentAccesses: BrainAccessEvent[];
};

type BrainGraphLink = {
  source: string;
  target: string;
  unresolved?: boolean;
};

type BrainGraph = {
  vaultPath: string;
  accessLogPath: string;
  generatedAt: string;
  nodes: BrainGraphNode[];
  links: BrainGraphLink[];
  recentAccesses: BrainAccessEvent[];
  truncated: boolean;
};

type BrainGraphResponse = {
  ok?: boolean;
  graph?: BrainGraph;
  error?: string;
};

type BrainSkillProviderId = "claude" | "codex" | "hermes" | "gemini" | "openclaw";

type BrainSkillSummary = {
  id: string;
  slug: string;
  name: string;
  description: string;
  provider: BrainSkillProviderId | "shared";
  providerLabel: string;
  path: string;
  relativePath: string;
  checksum: string;
  imported: boolean;
  importedAs?: string;
};

type BrainSkillProviderInventory = {
  id: BrainSkillProviderId;
  label: string;
  home: string;
  skills: BrainSkillSummary[];
  installed: boolean;
};

type BrainSkillInventory = {
  ok?: boolean;
  vaultPath: string;
  skillsFolder: string;
  readmePath: string;
  shared: BrainSkillSummary[];
  providers: BrainSkillProviderInventory[];
  totals: {
    shared: number;
    providerSkills: number;
    importable: number;
  };
  imported?: BrainSkillSummary[];
  skipped?: BrainSkillSummary[];
  provider?: BrainSkillProviderId | "all";
  error?: string;
};

const BRAIN_SKILL_PROVIDER_FALLBACK: BrainSkillProviderInventory[] = [
  { id: "claude", label: "Claude", home: "~/.claude", skills: [], installed: false },
  { id: "codex", label: "Codex", home: "~/.codex", skills: [], installed: false },
  { id: "hermes", label: "Hermes", home: "~/.hermes", skills: [], installed: false },
  { id: "gemini", label: "Gemini", home: "~/.gemini", skills: [], installed: false },
  { id: "openclaw", label: "OpenClaw", home: "~/.openclaw", skills: [], installed: false },
];

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
  adminAuth: {
    configured: boolean;
    source?: "environment" | "miroshark-env";
    hint: string;
  };
  actions: { id: "install" | "start" | "open" | "configure-admin"; label: string; disabled?: boolean }[];
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
  archived?: boolean;
  archivedAt?: string;
  archivedSummary?: MiroSharkArchivedRun;
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
  profiles?: unknown;
  realtimeProfiles?: unknown;
  beliefDrift?: unknown;
  counterfactual?: unknown;
  agentStats?: unknown;
  influence?: unknown;
  interactionNetwork?: unknown;
  demographics?: unknown;
  quality?: unknown;
  markets?: unknown;
  surfaceStats?: unknown;
  lineage?: unknown;
  threadJson?: unknown;
  observabilityStats?: unknown;
  observabilityEvents?: unknown;
  llmCalls?: unknown;
};

type MiroSharkArchivedRun = {
  simulationId: string;
  projectId?: string;
  graphId?: string;
  platform?: string;
  status?: string;
  scenario?: string;
  rounds?: number;
  postCount: number;
  savedAt: string;
  folder: string;
};

type MiroSharkPost = {
  post_id?: number;
  user_id?: number;
  content?: string;
  quote_content?: string | null;
  created_at?: number;
  num_likes?: number;
  num_shares?: number;
  num_dislikes?: number;
  num_reports?: number;
  original_post_id?: number | null;
};

type VisibleMiroSharkPost = MiroSharkPost & {
  displayText: string;
};

type MiroSharkTemplate = {
  id?: string;
  name?: string;
  category?: string;
  description?: string;
  difficulty?: string;
  estimated_agents?: number;
  estimated_rounds?: number;
  platforms?: string[];
  tags?: string[];
  has_counterfactuals?: boolean;
  counterfactual_count?: number;
};

type MiroSharkMetadata = {
  ok?: boolean;
  baseUrl?: string;
  templates?: unknown;
  history?: unknown;
  trending?: unknown;
  observabilityStats?: unknown;
  observabilityEvents?: unknown;
  llmCalls?: unknown;
  error?: string;
};

type MiroSharkWorkbenchTab = "surface" | "analysis" | "agents" | "experiments" | "observability" | "exports";
type MiroSharkSurfaceView = "x" | "reddit" | "polymarket" | "timeline";
type MiroSharkWorkspaceMode = "new" | "run";

const MIROSHARK_WORKBENCH_TABS: Array<{ id: MiroSharkWorkbenchTab; label: string; icon: ReactNode }> = [
  { id: "surface", label: "Surfaces", icon: <Layers3 aria-hidden="true" /> },
  { id: "analysis", label: "Analysis", icon: <LineChart aria-hidden="true" /> },
  { id: "agents", label: "Agents", icon: <Users aria-hidden="true" /> },
  { id: "experiments", label: "Experiments", icon: <FlaskConical aria-hidden="true" /> },
  { id: "observability", label: "Telemetry", icon: <Activity aria-hidden="true" /> },
  { id: "exports", label: "Exports", icon: <Download aria-hidden="true" /> },
];

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function payloadData(value: unknown): unknown {
  const record = asRecord(value);
  return Object.prototype.hasOwnProperty.call(record, "data") ? record.data : value;
}

function payloadArray<T = Record<string, unknown>>(value: unknown): T[] {
  const data = payloadData(value);
  if (Array.isArray(data)) return data as T[];
  const record = asRecord(data);
  for (const key of ["items", "events", "calls", "profiles", "actions", "markets", "nodes", "edges", "history", "posts"]) {
    const candidate = record[key];
    if (Array.isArray(candidate)) return candidate as T[];
  }
  return [];
}

function payloadCount(value: unknown): number {
  const data = payloadData(value);
  if (Array.isArray(data)) return data.length;
  const record = asRecord(data);
  for (const key of ["count", "total", "node_count", "edge_count", "posts_count", "actions_count"]) {
    const candidate = record[key];
    if (typeof candidate === "number") return candidate;
  }
  const firstArray = Object.values(record).find(Array.isArray);
  return Array.isArray(firstArray) ? firstArray.length : Object.keys(record).length;
}

function payloadPreview(value: unknown, max = 6): Array<[string, string]> {
  const data = payloadData(value);
  if (Array.isArray(data)) {
    return data.slice(0, max).map((item, index) => [`#${index + 1}`, compactValue(item)]);
  }
  const record = asRecord(data);
  return Object.entries(record)
    .filter(([, item]) => item !== null && item !== undefined && typeof item !== "object")
    .slice(0, max)
    .map(([key, item]) => [key, String(item)]);
}

function compactValue(value: unknown): string {
  if (value === null || value === undefined) return "empty";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  const record = asRecord(value);
  const preferred = record.name ?? record.title ?? record.label ?? record.agent_name ?? record.username ?? record.content ?? record.text ?? record.event_type ?? record.type ?? record.status;
  if (preferred !== undefined && preferred !== null) return String(preferred);
  return JSON.stringify(value).slice(0, 180);
}

function getMiroSharkTemplates(metadata: MiroSharkMetadata | null): MiroSharkTemplate[] {
  return payloadArray<MiroSharkTemplate>(metadata?.templates);
}

function getMiroSharkRunStatus(run: MiroSharkRunResult | null) {
  return (run?.runStatus as { data?: { runner_status?: string; current_round?: number; twitter_current_round?: number; total_rounds?: number; progress_percent?: number; twitter_actions_count?: number; total_actions_count?: number } } | undefined)?.data;
}

function isMiroSharkRunTerminal(status?: string) {
  return status === "completed" || status === "failed" || status === "stopped";
}

function getMiroSharkPosts(run: MiroSharkRunResult | null) {
  const data = (run?.posts as { data?: { count?: number; raw_count?: number; posts?: MiroSharkPost[] } } | undefined)?.data;
  const posts = (data?.posts ?? []).flatMap<VisibleMiroSharkPost>((post) => {
    const displayText = (post.quote_content || post.content || "").trim();
    return displayText ? [{ ...post, displayText }] : [];
  }).sort((a, b) => {
    const tickA = typeof a.created_at === "number" ? a.created_at : Number.MAX_SAFE_INTEGER;
    const tickB = typeof b.created_at === "number" ? b.created_at : Number.MAX_SAFE_INTEGER;
    if (tickA !== tickB) return tickA - tickB;
    const postA = typeof a.post_id === "number" ? a.post_id : Number.MAX_SAFE_INTEGER;
    const postB = typeof b.post_id === "number" ? b.post_id : Number.MAX_SAFE_INTEGER;
    return postA - postB;
  });
  return {
    count: posts.length,
    sourceCount: data?.raw_count ?? data?.count ?? posts.length,
    posts,
  };
}

function mirosharkUserName(userId?: number) {
  const names = ["Nora Singh", "Maya Chen", "Ravi Patel", "Diego Morales", "Lena Brooks"];
  return typeof userId === "number" ? names[userId % names.length] ?? `User ${userId}` : "Swarm Agent";
}

function mirosharkHandle(userId?: number) {
  const handles = ["@healthdesk", "@nomlaunch", "@cafeledger", "@routeops", "@parentswatch"];
  return typeof userId === "number" ? handles[userId % handles.length] ?? `@agent${userId}` : "@swarm";
}

function mirosharkAvatar(userId?: number) {
  const initials = mirosharkUserName(userId).split(" ").map((part) => part[0]).join("").slice(0, 2);
  return initials || "SW";
}

function mirosharkStat(seed: number | undefined, base: number, spread: number) {
  return base + ((seed ?? 0) * 17) % spread;
}

type DashboardView = "agents" | "kanban" | "swarm" | "wallet" | "vault" | "notifications" | "chat";
type DashboardTheme = "dark" | "hive-light";

const STORAGE_KEY = "openclaw-next.agentProfiles.v1";
const VAULT_STORAGE_KEY = "openclaw-next.sharedVault.v1";
const TASK_STORAGE_KEY = "openclaw-next.agentTasks.v1";
const WALLET_STORAGE_KEY = "openclaw-next.agentWallets.v1";
const THEME_STORAGE_KEY = "openclaw-next.theme.v1";
const LEGACY_OBSIDIAN_VAULT_PATH = "~/Documents/Obsidian/Omni Agent Vault";
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

function normalizeAgentProfile(agent: AgentProfile): AgentProfile {
  const inferredQueen = agent.beeRole === "queen" || /queen|orchestrat|lead|main/i.test(agent.name) || agent.runtime === "openclaw";
  return {
    ...agent,
    localDataDir: agent.runtime === "hermes" && agent.id === "hermes-orchestrator" && !agent.localDataDir
      ? "~/.hermes"
      : agent.localDataDir,
    beeRole: agent.beeRole ?? (inferredQueen ? "queen" : "worker"),
    workerClass: agent.workerClass ?? "general",
  };
}

function parseStoredAgents(): AgentProfile[] {
  if (typeof window === "undefined") return seedAgents();
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return seedAgents();
  try {
    const parsed = JSON.parse(raw) as AgentProfile[];
    if (!Array.isArray(parsed) || parsed.length === 0) return seedAgents();
    return parsed.map(normalizeAgentProfile);
  } catch {
    return seedAgents();
  }
}

function parseStoredVault(): SharedVaultConfig {
  if (typeof window === "undefined") return DEFAULT_SHARED_VAULT;
  const raw = window.localStorage.getItem(VAULT_STORAGE_KEY);
  if (!raw) return DEFAULT_SHARED_VAULT;
  try {
    const parsed = JSON.parse(raw) as Partial<SharedVaultConfig>;
    return {
      ...DEFAULT_SHARED_VAULT,
      ...parsed,
      vaultPath: parsed.vaultPath === LEGACY_OBSIDIAN_VAULT_PATH
        ? DEFAULT_SHARED_VAULT.vaultPath
        : parsed.vaultPath ?? DEFAULT_SHARED_VAULT.vaultPath,
    };
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

function notificationDayLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Undated";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - day.getTime()) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: "long" });
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function groupNotifications(notifications: AgentNotification[]) {
  return notifications.reduce<Array<{ label: string; items: AgentNotification[] }>>((groups, notification) => {
    const label = notificationDayLabel(notification.createdAt);
    const group = groups.find((item) => item.label === label);
    if (group) group.items.push(notification);
    else groups.push({ label, items: [notification] });
    return groups;
  }, []);
}

function notificationIcon(kind: AgentNotification["kind"], priority: AgentNotification["priority"]) {
  if (priority === "urgent" || priority === "high") return <CircleAlert aria-hidden="true" />;
  if (kind === "task" || kind === "decision") return <Check aria-hidden="true" />;
  if (kind === "system") return <Settings2 aria-hidden="true" />;
  return <MessageSquare aria-hidden="true" />;
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

function collectorRuntimeKey(agent: AgentProfile) {
  const collector = collectorKey(agent.telemetryUrl);
  return collector ? `${agent.runtime}:collector:${collector}` : "";
}

function agentAliasTarget(agent: AgentProfile, autoDiscoveredAgents: AgentProfile[]) {
  const exactKey = agentWorkspaceKey(agent);
  const exact = autoDiscoveredAgents.find((candidate) => candidate.id !== agent.id && agentWorkspaceKey(candidate) === exactKey);
  if (exact) return exact;

  const collectorRuntime = collectorRuntimeKey(agent);
  if (!collectorRuntime || normalizeAgentPath(agent.localDataDir)) return undefined;
  const matches = autoDiscoveredAgents.filter((candidate) => (
    candidate.id !== agent.id
    && collectorRuntimeKey(candidate) === collectorRuntime
  ));
  return matches.length === 1 ? matches[0] : undefined;
}

function agentAliasMap(configuredAgents: AgentProfile[], autoDiscoveredAgents: AgentProfile[]) {
  const entries = configuredAgents.flatMap((agent) => {
    const target = agentAliasTarget(agent, autoDiscoveredAgents);
    return target ? [[target.id, agent.id] as const] : [];
  });
  return new Map(entries);
}

function workspaceLabelFromPath(path?: string) {
  const trimmed = path?.trim();
  if (!trimmed) return "Stray chats";
  const withoutTrailingSlash = trimmed.replace(/\/+$/, "");
  if (withoutTrailingSlash === "~" || withoutTrailingSlash === "$home") return "Home";
  return withoutTrailingSlash.split("/").filter(Boolean).at(-1) ?? withoutTrailingSlash;
}

function chatFolderLabel(agent: AgentProfile, machine: MachineGroup) {
  return workspaceLabelFromPath(machine.version?.appDir || agent.localDataDir);
}

function chatDedupeKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 96);
}

function chatPreviewDedupeKey(title: string, subtitle: string) {
  return `${chatDedupeKey(title)}:${chatDedupeKey(subtitle).slice(0, 80)}`;
}

function preferChatTreeItem(current: ChatTreeItem | undefined, candidate: ChatTreeItem) {
  if (!current) return candidate;
  if (candidate.active !== current.active) return candidate.active ? candidate : current;
  if (candidate.rank !== current.rank) return candidate.rank > current.rank ? candidate : current;
  return (candidate.updatedAt ?? 0) > (current.updatedAt ?? 0) ? candidate : current;
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

function kanbanTaskMeta(task: KanbanTask) {
  if (task.status === "ideas") return "Parked until you move it to Ready for Queen";
  if (task.status === "ready") return "Waiting for Queen Bee";
  if (task.status === "working") return task.assignee ? `${task.assignee} is working` : "Claimed by the colony";
  if (task.status === "needs-human") return "Needs your input";
  if (task.status === "done") return "Completed";
  return "Archived";
}

function kanbanTaskBee(task: KanbanTask, agents: AgentProfile[]) {
  if (task.status === "ready") {
    return {
      icon: "/icons/queen-bee.png",
      roleLabel: "Queen Bee",
      assignee: "Waiting for pickup",
    };
  }
  const assignee = task.assignee?.trim();
  const agent = assignee
    ? agents.find((item) => item.name === assignee || item.id === assignee || item.agentId === assignee)
    : undefined;
  if (task.status === "done") {
    const completedBy = agent?.name || assignee || "user";
    const completedByQueen = agent?.beeRole === "queen";
    return {
      icon: agent ? (completedByQueen ? "/icons/queen-bee.png" : "/icons/worker-bee.png") : "",
      roleLabel: "Completed by:",
      assignee: completedBy,
    };
  }
  const queen = task.tenant === "queen-bee" || agent?.beeRole === "queen";
  const workerClass = agent?.workerClass
    ?? (task.tenant?.endsWith("-worker") ? task.tenant.replace(/-worker$/, "") as BeeWorkerClass : undefined);
  const roleLabel = queen ? "Queen bee" : `${beeWorkerClassLabel(workerClass)} worker bee`;
  return {
    icon: queen ? "/icons/queen-bee.png" : "/icons/worker-bee.png",
    roleLabel,
    assignee: assignee || "Unassigned",
  };
}

function kanbanTaskBadge(task: KanbanTask) {
  if (task.status === "ready") return "ready";
  if (task.status === "working") return "working";
  if (task.status === "needs-human") return "needs human";
  return task.status.replace("-", " ");
}

function kanbanTaskDispatchPrompt(task: KanbanTask, assignment: ReturnType<typeof chooseBeeAssignment>) {
  return [
    "You are receiving an automated Kanban assignment from the Queen Bee orchestrator.",
    `Task: ${task.title}`,
    task.body ? `Task details:\n${task.body}` : "Task details: none provided.",
    task.result ? `Existing notes:\n${task.result}` : "",
    `Suggested worker class: ${beeWorkerClassLabel(assignment.workerClass)}.`,
    "Complete the task as far as your runtime/tools allow. If you are blocked, say exactly what human input, access, or setup is needed. End with a concise result summary and any evidence.",
  ].filter(Boolean).join("\n\n");
}

function kanbanReadyPickupSignature(task: KanbanTask, agents: AgentProfile[]) {
  const agentSignature = agents
    .map((agent) => [
      agent.id,
      agent.name,
      agent.beeRole ?? "",
      agent.workerClass ?? "",
      agent.telemetryUrl || agent.gatewayUrl ? "online" : "offline",
    ].join(":"))
    .sort()
    .join("|");
  return `${task.id}:${task.updatedAt}:${agentSignature}`;
}

function kanbanTaskAssigneeAgent(task: KanbanTask, agents: AgentProfile[]) {
  const assignee = task.assignee?.trim();
  if (!assignee) return undefined;
  return agents.find((agent) => agent.name === assignee || agent.id === assignee || agent.agentId === assignee);
}

function kanbanTaskAssignmentForAgent(task: KanbanTask, agent: AgentProfile): ReturnType<typeof chooseBeeAssignment> {
  const fallback = chooseBeeAssignment(task, [agent]);
  return {
    ...fallback,
    queen: agent.beeRole === "queen" ? agent : fallback.queen,
    worker: agent,
    mode: agent.beeRole === "queen" ? "queen" : "worker",
    reason: `${agent.name} was already assigned on the Work board, so this is a retry of the claimed task.`,
  };
}

function viewIcon(view: DashboardView) {
  if (view === "agents") return <Network aria-hidden="true" />;
  if (view === "kanban") return <KanbanSquare aria-hidden="true" />;
  if (view === "swarm") return <Activity aria-hidden="true" />;
  if (view === "wallet") return <WalletCards aria-hidden="true" />;
  if (view === "vault") return <BrainCircuit aria-hidden="true" />;
  if (view === "notifications") return <Bell aria-hidden="true" />;
  return <MessageSquare aria-hidden="true" />;
}

function dedupeAgents(configuredAgents: AgentProfile[], autoDiscoveredAgents: AgentProfile[]) {
  const aliases = agentAliasMap(configuredAgents, autoDiscoveredAgents);
  const configuredKeys = new Set(configuredAgents.map(agentWorkspaceKey));
  const configured = configuredAgents;
  return [
    ...configured,
    ...autoDiscoveredAgents.filter((agent, index, list) => {
      const key = agentWorkspaceKey(agent);
      return !aliases.has(agent.id)
        && !configuredKeys.has(key)
        && list.findIndex((item) => agentWorkspaceKey(item) === key) === index;
    }),
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

function isChatSidebarTask(task: AgentTask) {
  return task.source === "hermes-state" || task.source === "dashboard-chat";
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
      blocks.push(<strong className={chatClass("markdownHeading")} key={`heading-${index}`}>{renderInlineMarkdown(heading[2])}</strong>);
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

  return <div className={chatClass("messageMarkdown")}>{blocks}</div>;
}

function attachmentSummary(attachments: ChatAttachment[]) {
  if (attachments.length === 0) return "";
  const images = attachments.filter((attachment) => attachment.kind === "image").length;
  const audio = attachments.filter((attachment) => attachment.kind === "audio").length;
  const files = attachments.filter((attachment) => attachment.kind === "file").length;
  return [
    images ? `${images} image${images === 1 ? "" : "s"}` : "",
    audio ? `${audio} audio clip${audio === 1 ? "" : "s"}` : "",
    files ? `${files} file${files === 1 ? "" : "s"}` : "",
  ].filter(Boolean).join(", ");
}

function messageContentParts(text: string, attachments: ChatAttachment[]): string | ChatContentPart[] {
  if (attachments.length === 0) return text;
  const parts: ChatContentPart[] = [];
  if (text.trim()) parts.push({ type: "text", text: text.trim() });
  attachments.forEach((attachment) => {
    if (attachment.kind === "image") {
      parts.push({ type: "image_url", image_url: { url: attachment.dataUrl } });
      return;
    }
    if (attachment.kind === "file") {
      parts.push({
        type: "file",
        file: {
          filename: attachment.name,
          file_data: attachment.dataUrl,
        },
      });
      return;
    }
    parts.push({
      type: "file",
      file: {
        filename: attachment.name,
        file_data: attachment.dataUrl,
      },
    });
  });
  return parts;
}

function readAttachmentFile(file: File, kind: "image" | "file"): Promise<ChatAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!dataUrl) {
        reject(new Error(`Could not read ${file.name}`));
        return;
      }
      resolve({
        id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
        kind,
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        dataUrl,
      });
    };
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function attachmentSizeLabel(size: number) {
  if (size >= 1_000_000) return `${(size / 1_000_000).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(size / 1000))} KB`;
}

function speechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const speechWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

function MessageAttachments({ attachments }: { attachments?: ChatAttachment[] }) {
  if (!attachments?.length) return null;
  return (
    <div className={chatClass("messageAttachments")}>
      {attachments.map((attachment) => (
        <figure className={chatClass("messageAttachment", attachment.kind)} key={attachment.id}>
          {attachment.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={attachment.dataUrl} alt={attachment.name} />
          ) : attachment.kind === "audio" ? (
            <audio src={attachment.dataUrl} controls preload="metadata" />
          ) : (
            <a href={attachment.dataUrl} download={attachment.name}>
              <FileText aria-hidden="true" />
              {attachment.name}
            </a>
          )}
          <figcaption>{attachment.name}</figcaption>
        </figure>
      ))}
    </div>
  );
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

function formatBrainDate(value?: string) {
  if (!value) return "never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function brainNodePoints(cx: number, cy: number, radius: number) {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = (Math.PI / 3) * index + Math.PI / 6;
    return `${cx + Math.cos(angle) * radius},${cy + Math.sin(angle) * radius}`;
  }).join(" ");
}

function splitBrainLabel(label: string): string[] {
  const compact = label.replace(/\.md$/, "");
  if (compact.length <= 13) return [compact];
  const first = compact.slice(0, 13);
  const second = compact.slice(13, 25);
  return [first, second ? `${second}${compact.length > 25 ? "..." : ""}` : ""].filter(Boolean);
}

type BrainHexCoord = { q: number; r: number };
type BrainPoint = { x: number; y: number };

function brainHexVertex(center: BrainPoint, radius: number, index: number): BrainPoint {
  const angle = (Math.PI / 3) * index + Math.PI / 6;
  return {
    x: center.x + Math.cos(angle) * radius,
    y: center.y + Math.sin(angle) * radius,
  };
}

function brainPointKey(point: BrainPoint) {
  return `${Math.round(point.x * 1000) / 1000},${Math.round(point.y * 1000) / 1000}`;
}

function brainGraphEdgePath(
  source: BrainHexCoord,
  target: BrainHexCoord,
  positions: Map<string, BrainPoint>,
  radius: number,
) {
  const sourceCenter = positions.get(`${source.q},${source.r}`);
  const targetCenter = positions.get(`${target.q},${target.r}`);
  if (!sourceCenter || !targetCenter) return "";

  const points = new Map<string, BrainPoint>();
  const edges = new Map<string, Set<string>>();
  const addEdge = (a: BrainPoint, b: BrainPoint) => {
    const aKey = brainPointKey(a);
    const bKey = brainPointKey(b);
    points.set(aKey, a);
    points.set(bKey, b);
    edges.set(aKey, edges.get(aKey) ?? new Set<string>());
    edges.set(bKey, edges.get(bKey) ?? new Set<string>());
    edges.get(aKey)!.add(bKey);
    edges.get(bKey)!.add(aKey);
  };

  for (const center of positions.values()) {
    const vertices = Array.from({ length: 6 }, (_, index) => brainHexVertex(center, radius, index));
    vertices.forEach((vertex, index) => addEdge(vertex, vertices[(index + 1) % vertices.length]));
  }

  const sourceKeys = Array.from({ length: 6 }, (_, index) => brainPointKey(brainHexVertex(sourceCenter, radius, index)));
  const targetKeys = new Set(Array.from({ length: 6 }, (_, index) => brainPointKey(brainHexVertex(targetCenter, radius, index))));
  const preferredSource = sourceKeys
    .map((key) => ({ key, point: points.get(key)! }))
    .sort((a, b) => Math.hypot(a.point.x - targetCenter.x, a.point.y - targetCenter.y) - Math.hypot(b.point.x - targetCenter.x, b.point.y - targetCenter.y))
    .map((entry) => entry.key);

  const queue = [...preferredSource];
  const previous = new Map<string, string | null>(preferredSource.map((key) => [key, null]));
  let found = "";

  while (queue.length && !found) {
    const current = queue.shift()!;
    if (targetKeys.has(current)) {
      found = current;
      break;
    }
    for (const next of edges.get(current) ?? []) {
      if (previous.has(next)) continue;
      previous.set(next, current);
      queue.push(next);
    }
  }

  if (!found) return "";
  const pathKeys: string[] = [];
  for (let current: string | null = found; current; current = previous.get(current) ?? null) {
    pathKeys.unshift(current);
  }
  return pathKeys
    .map((key, index) => {
      const point = points.get(key)!;
      return `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`;
    })
    .join(" ");
}

function brainGraphLayout(nodes: BrainGraphNode[]) {
  const radius = 66;
  const stepX = Math.sqrt(3) * radius;
  const stepY = 1.5 * radius;
  const centerX = 560;
  const centerY = 420;
  const positions = new Map<string, { x: number; y: number }>();
  const coordsByNode = new Map<string, BrainHexCoord>();
  const positionsByCoord = new Map<string, { x: number; y: number }>();
  const coords: Array<{ q: number; r: number }> = [{ q: 0, r: 0 }];
  const directions = [
    { q: 1, r: 0 },
    { q: 1, r: -1 },
    { q: 0, r: -1 },
    { q: -1, r: 0 },
    { q: -1, r: 1 },
    { q: 0, r: 1 },
  ];

  for (let ring = 1; coords.length < nodes.length; ring += 1) {
    let q = -ring;
    let r = ring;
    for (const direction of directions) {
      for (let side = 0; side < ring && coords.length < nodes.length; side += 1) {
        coords.push({ q, r });
        q += direction.q;
        r += direction.r;
      }
    }
  }

  nodes.forEach((node, index) => {
    const coord = coords[index] ?? { q: 0, r: 0 };
    const position = {
      x: centerX + stepX * (coord.q + coord.r / 2),
      y: centerY + stepY * coord.r,
    };
    positions.set(node.id, position);
    coordsByNode.set(node.id, coord);
    positionsByCoord.set(`${coord.q},${coord.r}`, position);
  });

  return { positions, coordsByNode, positionsByCoord, radius, width: 1120, height: 840 };
}

export default function Home() {
  // Initialize all persisted state with deterministic seed values so SSR and
  // first client render match. localStorage is read inside a useEffect below.
  const [hydrated, setHydrated] = useState(false);
  const [agents, setAgents] = useState<AgentProfile[]>(seedAgents);
  const [selectedAgentId, setSelectedAgentId] = useState(() => seedAgents()[0]?.id ?? "openclaw-main");
  const [text, setText] = useState("");
  const [chatAttachments, setChatAttachments] = useState<ChatAttachment[]>([]);
  const [attachmentError, setAttachmentError] = useState("");
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceBands, setVoiceBands] = useState<number[]>(() => Array(18).fill(0));
  const [status, setStatus] = useState<GatewayStatus | null>(null);
  const [statusAgentId, setStatusAgentId] = useState("");
  const [vaultStatus, setVaultStatus] = useState<Record<string, unknown> | null>(null);
  const [controlRoomStatus, setControlRoomStatus] = useState<Record<string, unknown> | null>(null);
  const [vaultSyncStatus, setVaultSyncStatus] = useState<VaultSyncStatus | null>(null);
  const [vaultSyncPending, setVaultSyncPending] = useState("");
  const [sharedVault, setSharedVault] = useState<SharedVaultConfig>(DEFAULT_SHARED_VAULT);
  const [brainGraph, setBrainGraph] = useState<BrainGraph | null>(null);
  const [brainGraphStatus, setBrainGraphStatus] = useState("");
  const [brainGraphLoading, setBrainGraphLoading] = useState(false);
  const [selectedBrainNodeId, setSelectedBrainNodeId] = useState("");
  const [brainPan, setBrainPan] = useState({ x: 0, y: 0 });
  const [brainSkills, setBrainSkills] = useState<BrainSkillInventory | null>(null);
  const [brainSkillsStatus, setBrainSkillsStatus] = useState("");
  const [brainSkillsLoading, setBrainSkillsLoading] = useState(false);
  const [brainSkillImportProvider, setBrainSkillImportProvider] = useState<BrainSkillProviderId | "all" | "">("");
  const [brainSkillImportSuccess, setBrainSkillImportSuccess] = useState<BrainSkillProviderId | "all" | "">("");
  const [brainSkillProviderModalOpen, setBrainSkillProviderModalOpen] = useState(false);
  const [messagesByAgent, setMessagesByAgent] = useState<Record<string, ChatMessage[]>>({});
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [walletsByAgent, setWalletsByAgent] = useState<Record<string, AgentWalletConfig>>({});
  const [walletActionsByAgent, setWalletActionsByAgent] = useState<Record<string, WalletActionState>>({});
  const [fleetSnapshots, setFleetSnapshots] = useState<Record<string, AgentSnapshot>>({});
  const [fleetCheckedAt, setFleetCheckedAt] = useState<number | null>(null);
  const [tailscaleDevices, setTailscaleDevices] = useState<TailscaleDevice[]>([]);
  const [tailscaleStatus, setTailscaleStatus] = useState("Checking Tailnet...");
  const [discoveredMachines, setDiscoveredMachines] = useState<DiscoveredMachine[]>([]);
  const [appVersion, setAppVersion] = useState<AppVersion | null>(null);
  const [updateStatusByMachine, setUpdateStatusByMachine] = useState<Record<string, MachineUpdateStatus>>({});
  const [copiedUpdateDetailKey, setCopiedUpdateDetailKey] = useState("");
  const [setupMachineKey, setSetupMachineKey] = useState("");
  const [agentRoleModalId, setAgentRoleModalId] = useState("");
  const [agentCreateMachineKey, setAgentCreateMachineKey] = useState("");
  const [agentCreateDraft, setAgentCreateDraft] = useState<{
    name: string;
    runtime: AgentRuntime;
    beeRole: BeeAgentRole;
    workerClass: BeeWorkerClass;
  }>({
    name: "",
    runtime: "hermes",
    beeRole: "worker",
    workerClass: "general",
  });
  const [agentRenameDraft, setAgentRenameDraft] = useState("");
  const [agentRenameEditing, setAgentRenameEditing] = useState(false);
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
  const [kanbanStorage, setKanbanStorage] = useState<KanbanResponse["storage"] | null>(null);
  const [noteIntakeStatus, setNoteIntakeStatus] = useState("");
  const [noteIntakePreview, setNoteIntakePreview] = useState<NoteTaskCandidate[]>([]);
  const [noteIntakePending, setNoteIntakePending] = useState("");
  const [notifications, setNotifications] = useState<AgentNotification[]>([]);
  const [notificationSummary, setNotificationSummary] = useState<AgentNotificationSummary | null>(null);
  const [notificationCursor, setNotificationCursor] = useState<number | null>(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsStatus, setNotificationsStatus] = useState("");
  const [selectedKanbanTaskId, setSelectedKanbanTaskId] = useState("");
  const [quickAddStatus, setQuickAddStatus] = useState<KanbanStatus | "">("");
  const [quickAddDrafts, setQuickAddDrafts] = useState<Record<string, string>>({});
  const [newBoardDraft, setNewBoardDraft] = useState({ slug: "", name: "" });
  const [commentDraft, setCommentDraft] = useState("");
  const [mirosharkStatus, setMirosharkStatus] = useState<MiroSharkStatus | null>(null);
  const [mirosharkActionPending, setMirosharkActionPending] = useState("");
  const [mirosharkRun, setMirosharkRun] = useState<MiroSharkRunResult | null>(null);
  const [mirosharkRunPending, setMirosharkRunPending] = useState(false);
  const [mirosharkScenario, setMirosharkScenario] = useState("Nom launches a neighborhood food-sharing app. Local cooks, restaurants, parents, and city health officials debate safety, affordability, trust, and regulation.");
  const [mirosharkRounds, setMirosharkRounds] = useState(5);
  const [mirosharkPlatform, setMirosharkPlatform] = useState<"twitter" | "reddit" | "parallel" | "polymarket">("twitter");
  const [mirosharkArchiveRuns, setMirosharkArchiveRuns] = useState<MiroSharkArchivedRun[]>([]);
  const [mirosharkArchiveStatus, setMirosharkArchiveStatus] = useState("");
  const [mirosharkMetadata, setMirosharkMetadata] = useState<MiroSharkMetadata | null>(null);
  const [mirosharkWorkspaceMode, setMirosharkWorkspaceMode] = useState<MiroSharkWorkspaceMode>("new");
  const [mirosharkWorkbenchTab, setMirosharkWorkbenchTab] = useState<MiroSharkWorkbenchTab>("surface");
  const [mirosharkSurfaceView, setMirosharkSurfaceView] = useState<MiroSharkSurfaceView>("x");
  const [mirosharkSelectedTemplateId, setMirosharkSelectedTemplateId] = useState("");
  const [mirosharkExperimentEvent, setMirosharkExperimentEvent] = useState("A city health official issues a public warning and demands proof of food handling compliance.");
  const [mirosharkExperimentStatus, setMirosharkExperimentStatus] = useState("");
  const [mirosharkExperimentPending, setMirosharkExperimentPending] = useState("");
  const [activeView, setActiveView] = useState<DashboardView>("agents");
  const [dashboardTheme, setDashboardTheme] = useState<DashboardTheme>("dark");
  const [busy, setBusy] = useState(false);
  const [busyAgentId, setBusyAgentId] = useState("");
  const [hasStreamingChunk, setHasStreamingChunk] = useState(false);
  const [chatMessageWindow, setChatMessageWindow] = useState<{ agentId: string; limit: number } | null>(null);
  const [selectedChatLeafKey, setSelectedChatLeafKey] = useState("");
  const [selectedChatPreview, setSelectedChatPreview] = useState<{ agentId: string; leafKey: string; messages: ChatMessage[] } | null>(null);
  const [expandedChatFolders, setExpandedChatFolders] = useState<Set<string>>(() => new Set());
  const [chatContextMenu, setChatContextMenu] = useState<"machine" | "directory" | "">("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const chatFileInputRef = useRef<HTMLInputElement | null>(null);
  const chatImageInputRef = useRef<HTMLInputElement | null>(null);
  const attachmentMenuRef = useRef<HTMLDivElement | null>(null);
  const chatContextMenuRef = useRef<HTMLDivElement | null>(null);
  const voiceRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const voiceStreamRef = useRef<MediaStream | null>(null);
  const voiceAudioContextRef = useRef<AudioContext | null>(null);
  const voiceAnimationRef = useRef<number | null>(null);
  const voiceTranscriptRef = useRef("");
  const notificationCursorRef = useRef<number | null>(0);
  const notificationCountRef = useRef(0);
  const mirosharkArchiveSaveKeyRef = useRef("");
  const noteIntakeAutoInFlightRef = useRef(false);
  const kanbanReadyPickupAttemptRef = useRef<Map<string, string>>(new Map());
  const kanbanReadyPickupInFlightRef = useRef<Set<string>>(new Set());
  const brainDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    panX: number;
    panY: number;
    moved: boolean;
    nodeId: string;
  } | null>(null);
  const brainDragMovedRef = useRef(false);

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
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    setDashboardTheme(storedTheme === "hive-light" ? "hive-light" : "dark");
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    document.documentElement.dataset.theme = dashboardTheme;
    if (!hydrated) return;
    window.localStorage.setItem(THEME_STORAGE_KEY, dashboardTheme);
  }, [dashboardTheme, hydrated]);

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
    notificationCursorRef.current = notificationCursor;
    notificationCountRef.current = notifications.length;
  }, [notificationCursor, notifications.length]);

  useEffect(() => {
    if (!attachmentMenuOpen) return;
    function closeAttachmentMenu(event: MouseEvent | TouchEvent) {
      const target = event.target;
      if (target instanceof Node && attachmentMenuRef.current?.contains(target)) return;
      setAttachmentMenuOpen(false);
    }
    function closeAttachmentMenuOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setAttachmentMenuOpen(false);
    }
    document.addEventListener("mousedown", closeAttachmentMenu);
    document.addEventListener("touchstart", closeAttachmentMenu);
    document.addEventListener("keydown", closeAttachmentMenuOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeAttachmentMenu);
      document.removeEventListener("touchstart", closeAttachmentMenu);
      document.removeEventListener("keydown", closeAttachmentMenuOnEscape);
    };
  }, [attachmentMenuOpen]);

  useEffect(() => {
    if (!chatContextMenu) return;
    function closeChatContextMenu(event: MouseEvent | TouchEvent) {
      const target = event.target;
      if (target instanceof Node && chatContextMenuRef.current?.contains(target)) return;
      setChatContextMenu("");
    }
    function closeChatContextMenuOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setChatContextMenu("");
    }
    document.addEventListener("mousedown", closeChatContextMenu);
    document.addEventListener("touchstart", closeChatContextMenu);
    document.addEventListener("keydown", closeChatContextMenuOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeChatContextMenu);
      document.removeEventListener("touchstart", closeChatContextMenu);
      document.removeEventListener("keydown", closeChatContextMenuOnEscape);
    };
  }, [chatContextMenu]);

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

  const refreshMirosharkMetadata = useCallback(async () => {
    const response = await fetch("/api/miroshark/swarm?metadata=1", { cache: "no-store" }).catch(() => null);
    const data = await response?.json().catch(() => null) as MiroSharkMetadata | null;
    if (data) setMirosharkMetadata(data);
  }, []);

  useEffect(() => {
    if (activeView !== "swarm" || !mirosharkStatus?.ok) return;
    const kickoff = window.setTimeout(() => {
      void refreshMirosharkMetadata();
    }, 0);
    const timer = window.setInterval(() => {
      void refreshMirosharkMetadata();
    }, 20_000);
    return () => {
      window.clearTimeout(kickoff);
      window.clearInterval(timer);
    };
  }, [activeView, mirosharkStatus?.ok, refreshMirosharkMetadata]);

  async function runMirosharkAction(action: "install" | "start" | "open" | "configure-admin") {
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

  function startNewMirosharkSimulation() {
    setMirosharkWorkspaceMode("new");
    setMirosharkRun(null);
    setMirosharkRunPending(false);
    setMirosharkArchiveStatus("");
    setMirosharkWorkbenchTab("surface");
  }

  function applyMirosharkTemplate(template: MiroSharkTemplate) {
    if (!template.id) return;
    setMirosharkWorkspaceMode("new");
    setMirosharkSelectedTemplateId(template.id);
    const platform = template.platforms?.includes("polymarket")
      ? "polymarket"
      : template.platforms?.includes("reddit") && template.platforms?.includes("twitter")
        ? "parallel"
        : template.platforms?.includes("reddit")
          ? "reddit"
          : "twitter";
    setMirosharkPlatform(platform);
    if (template.estimated_rounds) setMirosharkRounds(Math.min(24, Math.max(1, template.estimated_rounds)));
    setMirosharkScenario([
      `${template.name ?? template.id}: ${template.description ?? "Run this MiroShark template."}`,
      template.tags?.length ? `Focus tags: ${template.tags.join(", ")}.` : "",
      template.has_counterfactuals ? "Include counterfactual branch opportunities and decision points." : "",
    ].filter(Boolean).join("\n\n"));
  }

  async function runMirosharkSwarm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMirosharkRunPending(true);
    setMirosharkWorkspaceMode("run");
    setMirosharkRun(null);
    setMirosharkArchiveStatus("");
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

  async function runMirosharkExperiment(action: "stop" | "inject" | "fork" | "branch" | "publish") {
    if (!mirosharkRun?.simulationId) return;
    setMirosharkExperimentPending(action);
    setMirosharkExperimentStatus("");
    const response = await fetch("/api/miroshark/swarm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        simulationId: mirosharkRun.simulationId,
        event: mirosharkExperimentEvent,
      }),
    }).catch(() => null);
    const data = await response?.json().catch(() => null) as { ok?: boolean; error?: string; payload?: unknown } | null;
    setMirosharkExperimentPending("");
    if (!data?.ok) {
      setMirosharkExperimentStatus(data?.error ?? "Experiment request failed");
      return;
    }
    setMirosharkExperimentStatus(`${action} sent to MiroShark`);
    if (action === "stop" || action === "inject" || action === "publish") void refreshMirosharkRun();
  }

  const refreshMirosharkArchive = useCallback(async () => {
    if (!sharedVault.enabled) {
      setMirosharkArchiveRuns([]);
      return;
    }
    const params = new URLSearchParams();
    if (sharedVault.vaultPath.trim()) params.set("vaultPath", sharedVault.vaultPath.trim());
    const response = await fetch(`/api/miroshark/runs?${params.toString()}`, { cache: "no-store" }).catch(() => null);
    const data = await response?.json().catch(() => null) as { ok?: boolean; runs?: MiroSharkArchivedRun[]; error?: string } | null;
    if (data?.ok && Array.isArray(data.runs)) {
      setMirosharkArchiveRuns(data.runs);
      setMirosharkArchiveStatus(data.runs.length ? `Loaded ${data.runs.length} saved run${data.runs.length === 1 ? "" : "s"}` : "No saved MiroShark runs yet");
    } else {
      setMirosharkArchiveStatus(data?.error ?? "Could not load saved MiroShark runs");
    }
  }, [sharedVault.enabled, sharedVault.vaultPath]);

  const refreshBrainGraph = useCallback(async () => {
    if (!sharedVault.enabled) {
      setBrainGraph(null);
      setBrainGraphStatus("Shared brain is off.");
      return;
    }
    setBrainGraphLoading(true);
    const response = await fetch("/api/obsidian/graph", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vaultPath: sharedVault.vaultPath.trim() || undefined }),
    }).catch(() => null);
    const data = await response?.json().catch(() => null) as BrainGraphResponse | null;
    setBrainGraphLoading(false);
    if (!response?.ok || !data?.ok || !data.graph) {
      setBrainGraphStatus(data?.error ?? "Could not build brain graph.");
      return;
    }
    setBrainGraph(data.graph);
    setSelectedBrainNodeId((current) => current || data.graph?.nodes[0]?.id || "");
    setBrainGraphStatus(data.graph.truncated
      ? `Loaded first ${data.graph.nodes.length} notes and links.`
      : `Loaded ${data.graph.nodes.length} notes and ${data.graph.links.length} links.`);
  }, [sharedVault.enabled, sharedVault.vaultPath]);

  const refreshBrainSkills = useCallback(async () => {
    if (!sharedVault.enabled) {
      setBrainSkills(null);
      setBrainSkillsStatus("Shared brain is off.");
      return;
    }
    setBrainSkillsLoading(true);
    const params = new URLSearchParams();
    if (sharedVault.vaultPath.trim()) params.set("vaultPath", sharedVault.vaultPath.trim());
    const response = await fetch(`/api/obsidian/skills?${params.toString()}`, { cache: "no-store" }).catch(() => null);
    const data = await response?.json().catch(() => null) as BrainSkillInventory | null;
    setBrainSkillsLoading(false);
    if (!response?.ok || !data?.ok) {
      setBrainSkillsStatus(data?.error ?? "Could not read skill inventory.");
      return;
    }
    setBrainSkills(data);
    setBrainSkillsStatus(data.totals.shared
      ? `Loaded ${data.totals.shared} shared skill${data.totals.shared === 1 ? "" : "s"}.`
      : "The shared brain Skills folder is empty.");
  }, [sharedVault.enabled, sharedVault.vaultPath]);

  const importBrainSkills = useCallback(async (provider: BrainSkillProviderId | "all") => {
    if (!sharedVault.enabled) {
      setBrainSkillsStatus("Turn on the shared brain before importing skills.");
      return;
    }
    setBrainSkillImportProvider(provider);
    setBrainSkillImportSuccess("");
    const response = await fetch("/api/obsidian/skills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vaultPath: sharedVault.vaultPath.trim() || undefined,
        provider,
      }),
    }).catch(() => null);
    const data = await response?.json().catch(() => null) as BrainSkillInventory | null;
    setBrainSkillImportProvider("");
    if (!response?.ok || !data?.ok) {
      setBrainSkillsStatus(data?.error ?? "Could not import skills.");
      return;
    }
    setBrainSkills(data);
    setBrainSkillImportSuccess(provider);
    setBrainSkillsStatus(`Imported ${data.imported?.length ?? 0} skill${(data.imported?.length ?? 0) === 1 ? "" : "s"} into the shared brain.`);
    void refreshBrainGraph();
    window.setTimeout(() => setBrainSkillImportSuccess(""), 1800);
  }, [refreshBrainGraph, sharedVault.enabled, sharedVault.vaultPath]);

  const refreshNotifications = useCallback(async (options: { append?: boolean } = {}) => {
    if (!sharedVault.enabled) {
      setNotifications([]);
      setNotificationSummary(null);
      setNotificationCursor(0);
      setNotificationsStatus("Shared vault sync is off.");
      return;
    }
    const cursor = options.append ? notificationCursorRef.current ?? 0 : 0;
    if (options.append && notificationCursorRef.current === null) return;
    setNotificationsLoading(true);
    const params = new URLSearchParams({ cursor: String(cursor), limit: "40" });
    if (sharedVault.vaultPath.trim()) params.set("vaultPath", sharedVault.vaultPath.trim());
    if (sharedVault.notificationsFolder?.trim()) params.set("notificationsFolder", sharedVault.notificationsFolder.trim());
    const response = await fetch(`/api/openclaw/notifications?${params.toString()}`, { cache: "no-store" }).catch(() => null);
    const data = await response?.json().catch(() => null) as NotificationsResponse | null;
    setNotificationsLoading(false);
    if (!response?.ok || !data?.ok) {
      setNotificationsStatus(data?.error ?? "Could not load notifications.");
      return;
    }
    setNotifications((current) => {
      const next = options.append ? [...current, ...(data.notifications ?? [])] : data.notifications ?? [];
      const seen = new Set<string>();
      return next.filter((notification) => {
        if (seen.has(notification.id)) return false;
        seen.add(notification.id);
        return true;
      });
    });
    setNotificationSummary({
      total: data.total ?? 0,
      unread: data.unread ?? 0,
      highUnread: data.highUnread ?? 0,
      urgentUnread: data.urgentUnread ?? 0,
      folder: data.folder ?? sharedVault.notificationsFolder ?? "agent-notifications",
      settings: data.settings ?? {
        highPriorityMessagingEnabled: false,
        messagingHandledBy: "Hermes/OpenClaw messaging agent",
        updatedAt: new Date().toISOString(),
      },
    });
    setNotificationCursor(data.nextCursor ?? null);
    setNotificationsStatus(data.total ? `Loaded ${Math.min((options.append ? notificationCountRef.current : 0) + (data.notifications?.length ?? 0), data.total)} of ${data.total}` : "No notifications yet.");
  }, [sharedVault.enabled, sharedVault.notificationsFolder, sharedVault.vaultPath]);

  async function loadMirosharkArchivedRun(simulationId: string) {
    setMirosharkArchiveStatus("Loading saved run...");
    const params = new URLSearchParams({ simulation_id: simulationId });
    if (sharedVault.vaultPath.trim()) params.set("vaultPath", sharedVault.vaultPath.trim());
    const response = await fetch(`/api/miroshark/runs?${params.toString()}`, { cache: "no-store" }).catch(() => null);
    const data = await response?.json().catch(() => null) as {
      ok?: boolean;
      summary?: MiroSharkArchivedRun;
      run?: { scenario?: string; run?: MiroSharkRunResult };
      error?: string;
    } | null;
    if (!data?.ok || !data.run?.run) {
      setMirosharkArchiveStatus(data?.error ?? "Could not load saved run");
      return;
    }
    if (data.run.scenario) setMirosharkScenario(data.run.scenario);
    if (data.summary?.rounds) setMirosharkRounds(data.summary.rounds);
    if (data.summary?.platform === "twitter" || data.summary?.platform === "reddit" || data.summary?.platform === "parallel" || data.summary?.platform === "polymarket") {
      setMirosharkPlatform(data.summary.platform);
    }
    setMirosharkWorkspaceMode("run");
    setMirosharkWorkbenchTab("surface");
    setMirosharkRun({
      ...data.run.run,
      archived: true,
      archivedAt: data.summary?.savedAt,
      archivedSummary: data.summary,
    });
    setMirosharkRunPending(false);
    setMirosharkArchiveStatus(`Loaded ${simulationId}`);
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
  const mirosharkRunIsArchived = Boolean(mirosharkRun?.archived);
  const mirosharkRunnerStatus = mirosharkRunStatus?.runner_status;
  const mirosharkPosts = getMiroSharkPosts(mirosharkRun);
  const mirosharkFeedIsWaiting = mirosharkRun?.status === "started"
    && !mirosharkRunIsArchived
    && !!mirosharkRun.simulationId
    && !isMiroSharkRunTerminal(mirosharkRunnerStatus)
    && mirosharkPosts.count === 0;
  const mirosharkFeedIsLive = mirosharkRun?.status === "started"
    && !mirosharkRunIsArchived
    && !!mirosharkRun.simulationId
    && !isMiroSharkRunTerminal(mirosharkRunnerStatus);
  const mirosharkObservedRound = mirosharkPosts.posts.reduce((max, post) => (
    typeof post.created_at === "number" ? Math.max(max, post.created_at) : max
  ), 0);
  const mirosharkTotalRounds = Math.max(
    0,
    Number(mirosharkRunStatus?.total_rounds ?? mirosharkRun?.rounds ?? 0) || 0,
  );
  const mirosharkCurrentRound = Math.max(
    0,
    Number(mirosharkRunStatus?.current_round ?? 0) || 0,
    Number(mirosharkRunStatus?.twitter_current_round ?? 0) || 0,
    mirosharkObservedRound,
  );
  const mirosharkProgressPercent = mirosharkTotalRounds > 0
    ? Math.min(100, Math.round((mirosharkCurrentRound / mirosharkTotalRounds) * 100))
    : 0;
  const mirosharkRunIsWorking = mirosharkRunPending
    || (!mirosharkRunIsArchived && mirosharkRun?.status === "queued")
    || (!mirosharkRunIsArchived && mirosharkRun?.status === "running")
    || mirosharkFeedIsWaiting;
  const mirosharkDisplayStep = mirosharkRunIsArchived ? "complete" : (mirosharkRun?.step ?? "queued");
  const mirosharkDisplayStatus = mirosharkRunIsArchived
    ? "complete"
    : (mirosharkRunnerStatus ?? mirosharkRun?.status ?? "queued");
  const mirosharkProgressLabel = (() => {
    if (mirosharkFeedIsWaiting) return "Waiting for first posts";
    if (mirosharkRun?.step === "ontology") return "Building scenario ontology";
    if (mirosharkRun?.step === "graph") return "Building interaction graph";
    if (mirosharkRun?.step === "simulation") return "Creating simulation";
    if (mirosharkRun?.step === "prepare") return "Preparing agents";
    if (mirosharkRun?.step === "start") return "Starting swarm";
    if (mirosharkRun?.step === "connect") return "Connecting to MiroShark";
    if (mirosharkRun?.step === "queued") return "Queued";
    return mirosharkRunPending ? "Starting run" : "Working";
  })();
  const mirosharkTemplates = getMiroSharkTemplates(mirosharkMetadata);
  const mirosharkTelemetryCount = payloadCount(mirosharkRun?.observabilityEvents ?? mirosharkMetadata?.observabilityEvents);
  const mirosharkActionCount = payloadCount(mirosharkRun?.actions);
  const mirosharkMarketCount = payloadCount(mirosharkRun?.markets);
  const mirosharkTimelineItems = payloadArray<Record<string, unknown>>(mirosharkRun?.timeline).slice(0, 24);
  const mirosharkActionItems = payloadArray<Record<string, unknown>>(mirosharkRun?.actions).slice(0, 24);
  const mirosharkProfileItems = payloadArray<Record<string, unknown>>(mirosharkRun?.profiles ?? mirosharkRun?.realtimeProfiles).slice(0, 12);
  const mirosharkMarketItems = payloadArray<Record<string, unknown>>(mirosharkRun?.markets).slice(0, 8);
  const mirosharkObservabilityItems = payloadArray<Record<string, unknown>>(mirosharkRun?.observabilityEvents ?? mirosharkMetadata?.observabilityEvents).slice(0, 18);
  const mirosharkLlmCallItems = payloadArray<Record<string, unknown>>(mirosharkRun?.llmCalls ?? mirosharkMetadata?.llmCalls).slice(0, 10);

  useEffect(() => {
    if (!hydrated || activeView !== "swarm") return;
    const timer = window.setTimeout(() => {
      void refreshMirosharkArchive();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activeView, hydrated, refreshMirosharkArchive]);

  useEffect(() => {
    if (!hydrated || activeView !== "vault") return;
    const timer = window.setTimeout(() => {
      void refreshBrainGraph();
      void refreshBrainSkills();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activeView, hydrated, refreshBrainGraph, refreshBrainSkills]);

  useEffect(() => {
    if (!hydrated || !sharedVault.enabled) return;
    const timer = window.setTimeout(() => {
      void refreshNotifications();
    }, activeView === "notifications" ? 0 : 300);
    const interval = window.setInterval(() => {
      void refreshNotifications();
    }, 30_000);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, [activeView, hydrated, refreshNotifications, sharedVault.enabled]);

  useEffect(() => {
    if (!hydrated || !sharedVault.enabled || !mirosharkRun?.simulationId) return;
    const saveKey = [
      mirosharkRun.simulationId,
      mirosharkPosts.count,
      mirosharkRunnerStatus ?? mirosharkRun.status ?? "",
      mirosharkRun.step ?? "",
    ].join(":");
    if (mirosharkArchiveSaveKeyRef.current === saveKey) return;

    const timer = window.setTimeout(async () => {
      const response = await fetch("/api/miroshark/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vaultPath: sharedVault.vaultPath.trim() || undefined,
          scenario: mirosharkScenario,
          run: mirosharkRun,
        }),
      }).catch(() => null);
      const data = await response?.json().catch(() => null) as { ok?: boolean; summary?: MiroSharkArchivedRun; error?: string } | null;
      if (data?.ok) {
        mirosharkArchiveSaveKeyRef.current = saveKey;
        setMirosharkArchiveStatus(`Saved ${data.summary?.postCount ?? mirosharkPosts.count} posts to Obsidian`);
        void refreshMirosharkArchive();
      } else {
        setMirosharkArchiveStatus(data?.error ?? "Could not save MiroShark run to Obsidian");
      }
    }, 900);

    return () => window.clearTimeout(timer);
  }, [
    hydrated,
    mirosharkPosts.count,
    mirosharkRunnerStatus,
    mirosharkRun,
    mirosharkScenario,
    refreshMirosharkArchive,
    sharedVault.enabled,
    sharedVault.vaultPath,
  ]);

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

  const addKanbanStorageParams = useCallback((params: URLSearchParams) => {
    if (!sharedVault.enabled) return;
    if (sharedVault.vaultPath.trim()) params.set("vaultPath", sharedVault.vaultPath.trim());
    if (sharedVault.kanbanFolder?.trim()) params.set("kanbanFolder", sharedVault.kanbanFolder.trim());
  }, [sharedVault.enabled, sharedVault.kanbanFolder, sharedVault.vaultPath]);

  useEffect(() => {
    let cancelled = false;
    async function refreshKanban() {
      const params = new URLSearchParams({
        board: kanbanBoardSlug,
        include_archived: String(kanbanIncludeArchived),
      });
      if (sharedVault.enabled) {
        if (sharedVault.vaultPath.trim()) params.set("vaultPath", sharedVault.vaultPath.trim());
        if (sharedVault.kanbanFolder?.trim()) params.set("kanbanFolder", sharedVault.kanbanFolder.trim());
      }
      if (kanbanTenantFilter) params.set("tenant", kanbanTenantFilter);
      if (kanbanAssigneeFilter) params.set("assignee", kanbanAssigneeFilter);
      if (kanbanSearch) params.set("q", kanbanSearch);
      const response = await fetch(`/api/kanban?${params.toString()}`, { cache: "no-store" }).catch(() => null);
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
      setKanbanStorage(data.storage ?? null);
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
  }, [
    kanbanBoardSlug,
    kanbanIncludeArchived,
    kanbanTenantFilter,
    kanbanAssigneeFilter,
    kanbanSearch,
    sharedVault.enabled,
    sharedVault.kanbanFolder,
    sharedVault.vaultPath,
  ]);

  const discoveredAgents = useMemo(
    () => discoveredMachines.flatMap((machine) => machine.agents ?? []),
    [discoveredMachines],
  );

  const agentAliases = useMemo(
    () => agentAliasMap(agents, discoveredAgents),
    [agents, discoveredAgents],
  );

  const candidateAgents = useMemo(
    () => dedupeAgents(agents, discoveredAgents),
    [agents, discoveredAgents],
  );

  const candidateWorkById = useMemo(() => {
    const idsForAgent = (agentId: string) => [agentId, ...[...agentAliases.entries()]
      .filter(([, canonicalId]) => canonicalId === agentId)
      .map(([aliasId]) => aliasId)];
    return Object.fromEntries(candidateAgents.map((agent) => {
      const relatedIds = idsForAgent(agent.id);
      const agentTasks = tasks
        .filter((task) => relatedIds.includes(task.agentId))
        .map((task) => ({ ...task, agentId: agent.id }))
        .sort((a, b) => b.updatedAt - a.updatedAt);
      const observedTasks = relatedIds.flatMap((agentId) => fleetSnapshots[agentId]?.tasks ?? []);
      const transcript = relatedIds.flatMap((agentId) => messagesByAgent[agentId] ?? []);
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
  }, [agentAliases, candidateAgents, fleetSnapshots, messagesByAgent, tasks]);

  const displayAgents = useMemo(
    () => candidateAgents.filter((agent) => !isStarterPlaceholder(agent, candidateWorkById, messagesByAgent)),
    [candidateAgents, candidateWorkById, messagesByAgent],
  );

  const agentWorkById = useMemo(() => {
    return Object.fromEntries(displayAgents.map((agent) => [agent.id, candidateWorkById[agent.id] ?? []]));
  }, [candidateWorkById, displayAgents]);

  const effectiveSelectedAgentId = agentAliases.get(selectedAgentId) ?? selectedAgentId;

  const selectedAgent = useMemo(
    () => displayAgents.find((agent) => agent.id === effectiveSelectedAgentId) ?? displayAgents[0],
    [displayAgents, effectiveSelectedAgentId],
  );

  const selectedBrainNode = useMemo(
    () => brainGraph?.nodes.find((node) => node.id === selectedBrainNodeId) ?? brainGraph?.nodes[0] ?? null,
    [brainGraph, selectedBrainNodeId],
  );

  const visibleBrainNodes = useMemo(
    () => (brainGraph?.nodes ?? []).slice(0, 72),
    [brainGraph],
  );

  const brainLayout = useMemo(
    () => brainGraphLayout(visibleBrainNodes),
    [visibleBrainNodes],
  );

  const brainGraphStats = useMemo(() => {
    const notes = brainGraph?.nodes.filter((node) => !node.id.startsWith("unresolved:")).length ?? 0;
    const accessed = brainGraph?.nodes.filter((node) => node.accessCount > 0).length ?? 0;
    return {
      notes,
      links: brainGraph?.links.length ?? 0,
      accessed,
      recent: brainGraph?.recentAccesses.length ?? 0,
    };
  }, [brainGraph]);

  const selectedBrainTargetIds = useMemo(() => {
    if (!brainGraph || !selectedBrainNode) return new Set<string>();
    const targetIds = new Set<string>();
    for (const link of brainGraph.links) {
      if (link.source === selectedBrainNode.id && brainLayout.positions.has(link.target)) targetIds.add(link.target);
      if (link.target === selectedBrainNode.id && brainLayout.positions.has(link.source)) targetIds.add(link.source);
    }
    return targetIds;
  }, [brainGraph, brainLayout.positions, selectedBrainNode]);

  const messages = useMemo(
    () => {
      if (!selectedAgent) return [];
      if (
        selectedChatPreview
        && selectedChatPreview.agentId === selectedAgent.id
        && selectedChatPreview.leafKey === selectedChatLeafKey
      ) {
        return chatMessageWindow?.agentId === selectedAgent.id
          ? selectedChatPreview.messages.slice(-chatMessageWindow.limit)
          : selectedChatPreview.messages;
      }
      const relatedIds = [selectedAgent.id, ...[...agentAliases.entries()]
        .filter(([, canonicalId]) => canonicalId === selectedAgent.id)
        .map(([aliasId]) => aliasId)];
      const mergedMessages = relatedIds.flatMap((agentId) => messagesByAgent[agentId] ?? []);
      const selectedMessages = mergedMessages.length ? mergedMessages : [{
        role: "system" as const,
        content: `Chatting with ${selectedAgent.name}. Pick a machine to start fresh, or resume a previous chat when one is listed.`,
      }];
      return chatMessageWindow?.agentId === selectedAgent.id
        ? selectedMessages.slice(-chatMessageWindow.limit)
        : selectedMessages;
    },
    [agentAliases, chatMessageWindow, messagesByAgent, selectedAgent, selectedChatLeafKey, selectedChatPreview],
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

  const visibleAgentCount = useMemo(
    () => machineGroups.reduce((total, machine) => total + machine.agents.length, 0),
    [machineGroups],
  );

  const kanbanColumns = useMemo(
    () => groupKanbanTasks(kanbanBoard?.tasks ?? [], kanbanIncludeArchived),
    [kanbanBoard, kanbanIncludeArchived],
  );
  const hasKanbanTasks = (kanbanBoard?.tasks.length ?? 0) > 0;
  const visibleKanbanColumns = useMemo(() => {
    const core = new Set<KanbanStatus>(["ideas", "ready", "working", "needs-human", "done"]);
    return kanbanColumns.filter((column) => core.has(column.id) || column.tasks.length > 0 || kanbanIncludeArchived);
  }, [kanbanColumns, kanbanIncludeArchived]);

  const selectedKanbanTask = useMemo(
    () => kanbanBoard?.tasks.find((task) => task.id === selectedKanbanTaskId) ?? null,
    [kanbanBoard, selectedKanbanTaskId],
  );

  const selectedKanbanComments = useMemo(
    () => kanbanBoard?.comments.filter((comment) => comment.taskId === selectedKanbanTaskId)
      .sort((a, b) => b.createdAt - a.createdAt) ?? [],
    [kanbanBoard, selectedKanbanTaskId],
  );

  const notificationGroups = useMemo(() => groupNotifications(notifications), [notifications]);

  const selectedKanbanEvents = useMemo(
    () => kanbanBoard?.events
      .filter((event) => !event.taskId || event.taskId === selectedKanbanTaskId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 20) ?? [],
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

  const colonySummary = useMemo(() => {
    const queens = displayAgents.filter((agent) => agent.beeRole === "queen").length;
    const workers = displayAgents.filter((agent) => agent.beeRole === "worker").length;
    return { queens, workers };
  }, [displayAgents]);

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
      id: "notifications" as const,
      label: "Alerts",
      detail: notificationSummary?.unread ? `${notificationSummary.unread} new` : `${notificationSummary?.total ?? 0} total`,
    },
    {
      id: "chat" as const,
      label: "Chat",
      detail: selectedAgent?.name ?? "none",
    },
  ], [kanbanBoard?.tasks.length, mirosharkStatus?.ok, notificationSummary, selectedAgent?.name, sharedVault.enabled, visibleAgentCount, walletStats.critical, walletStats.enabled]);

  const setupMachine = useMemo(
    () => machineGroups.find((machine) => machine.key === setupMachineKey) ?? null,
    [machineGroups, setupMachineKey],
  );
  const roleModalAgent = useMemo(
    () => displayAgents.find((agent) => agent.id === agentRoleModalId) ?? null,
    [agentRoleModalId, displayAgents],
  );
  const agentCreateMachine = useMemo(
    () => machineGroups.find((machine) => machine.key === agentCreateMachineKey) ?? null,
    [agentCreateMachineKey, machineGroups],
  );

  function updateAgent(patch: Partial<AgentProfile>) {
    if (!selectedAgent) return;
    setAgents((current) => current.map((agent) => (
      agent.id === selectedAgent.id ? { ...agent, ...patch } : agent
    )));
  }

  function updateAgentProfile(agentId: string, patch: Partial<AgentProfile>) {
    setAgents((current) => {
      const existing = current.find((agent) => agent.id === agentId);
      if (existing) {
        return current.map((agent) => (
          agent.id === agentId ? { ...agent, ...patch } : agent
        ));
      }
      const discovered = displayAgents.find((agent) => agent.id === agentId);
      return discovered ? [...current, { ...discovered, ...patch }] : current;
    });
  }

  function openAgentCreationModal(machine: MachineGroup, runtime: AgentRuntime = "hermes", name = "") {
    if (machine.collector !== "ready" || !machine.collectorUrl) {
      openSetupModal(machine);
      return;
    }
    setAgentRoleModalId("");
    setAgentRenameEditing(false);
    setAgentCreateMachineKey(machine.key);
    setAgentCreateDraft({
      name,
      runtime,
      beeRole: runtime === "openclaw" ? "queen" : "worker",
      workerClass: "general",
    });
  }

  function closeAgentSettingsModal() {
    setAgentRoleModalId("");
    setAgentCreateMachineKey("");
    setAgentRenameDraft("");
    setAgentRenameEditing(false);
  }

  function createAgentFromModal() {
    if (!agentCreateMachine?.collectorUrl) return;
    const runtime = agentCreateDraft.runtime;
    const next: AgentProfile = {
      ...createAgentProfile(runtime, runtimeCount(agents, runtime) + 1),
      name: agentCreateDraft.name.trim() || `${RUNTIME_LABELS[runtime]} on ${agentCreateMachine.name}`,
      telemetryUrl: agentCreateMachine.collectorUrl,
      machineName: agentCreateMachine.name,
      agentId: runtime === "hermes" ? "local-hermes" : runtime === "openclaw" ? "main" : "",
      localDataDir: runtime === "hermes" ? "~/.hermes" : "",
      beeRole: agentCreateDraft.beeRole,
      workerClass: agentCreateDraft.workerClass,
    };
    setAgents((current) => [...current, next]);
    setSelectedAgentId(next.id);
    closeAgentSettingsModal();
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

  function updateWalletAction(agentId: string, patch: Partial<WalletActionState>) {
    setWalletActionsByAgent((current) => ({
      ...current,
      [agentId]: { ...(current[agentId] ?? {}), ...patch },
    }));
  }

  async function createLocalWallet(agentId: string, network: string) {
    updateWalletAction(agentId, { busy: true, error: "", message: "Creating local wallet..." });
    const response = await fetch("/api/wallet/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId, network }),
    }).catch(() => null);
    const data = await response?.json().catch(() => null) as {
      ok?: boolean;
      wallet?: { address: string; network: string };
      error?: string;
    } | null;
    if (!response?.ok || !data?.ok || !data.wallet) {
      updateWalletAction(agentId, { busy: false, error: data?.error ?? "Could not create wallet.", message: "" });
      return;
    }
    updateWallet(agentId, {
      custodyMode: "local",
      vaultAddress: data.wallet.address,
      walletAddress: data.wallet.address,
      network: data.wallet.network,
      enabled: true,
      survivalStartedAt: Date.now(),
    });
    updateWalletAction(agentId, { busy: false, error: "", message: "Wallet created. Send a tiny test amount to the address, then refresh balance." });
  }

  async function refreshWalletBalance(agentId: string) {
    const wallet = walletsByAgent[agentId] ?? createDefaultAgentWallet(agentId);
    const address = wallet.walletAddress || wallet.vaultAddress;
    if (!address) {
      updateWalletAction(agentId, { error: "Create or paste a wallet address first.", message: "" });
      return;
    }
    updateWalletAction(agentId, { busy: true, error: "", message: "Checking on-chain balance..." });
    const response = await fetch("/api/wallet/balance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, network: wallet.network }),
    }).catch(() => null);
    const data = await response?.json().catch(() => null) as {
      ok?: boolean;
      balance?: { tokenBalance: number; nativeBalance: number; fetchedAt: number };
      error?: string;
    } | null;
    if (!response?.ok || !data?.ok || !data.balance) {
      updateWalletAction(agentId, { busy: false, error: data?.error ?? "Could not fetch balance.", message: "" });
      return;
    }
    updateWallet(agentId, {
      currentBalanceUsd: normalizeMoney(data.balance.tokenBalance),
      onchainBalanceUsd: normalizeMoney(data.balance.tokenBalance),
      nativeBalance: data.balance.nativeBalance,
      lastOnchainSyncAt: data.balance.fetchedAt,
      survivalStartedAt: Date.now(),
    });
    updateWalletAction(agentId, { busy: false, error: "", message: `Balance refreshed: ${data.balance.tokenBalance.toFixed(6)} USDC.` });
  }

  async function sendWalletUsdc(agentId: string) {
    const wallet = walletsByAgent[agentId] ?? createDefaultAgentWallet(agentId);
    const action = walletActionsByAgent[agentId] ?? {};
    const amount = Number(action.sendAmount);
    updateWalletAction(agentId, { busy: true, error: "", message: "Sending USDC..." });
    const response = await fetch("/api/wallet/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentId,
        toAddress: action.sendTo,
        amountUsd: amount,
        maxPaymentUsd: wallet.maxPaymentUsd,
        confirmation: action.confirmation,
      }),
    }).catch(() => null);
    const data = await response?.json().catch(() => null) as {
      ok?: boolean;
      signature?: string;
      network?: string;
      error?: string;
    } | null;
    if (!response?.ok || !data?.ok) {
      updateWalletAction(agentId, { busy: false, error: data?.error ?? "Could not send USDC.", message: "" });
      return;
    }
    updateWalletAction(agentId, { busy: false, error: "", message: `Sent. Transaction: ${data.signature}`, confirmation: "" });
    await refreshWalletBalance(agentId);
  }

  async function testX402Fetch(agentId: string) {
    const wallet = walletsByAgent[agentId] ?? createDefaultAgentWallet(agentId);
    const action = walletActionsByAgent[agentId] ?? {};
    const url = (action.x402Url || wallet.x402BaseUrl || "http://localhost:5020/api/wallet/x402/mock-paid").trim();
    updateWalletAction(agentId, { busy: true, error: "", message: "Calling paid x402 endpoint..." });
    const response = await fetch("/api/wallet/x402", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentId,
        url,
        method: action.x402Method || "GET",
        policy: wallet,
        confirmation: action.x402Confirmation,
      }),
    }).catch(() => null);
    const data = await response?.json().catch(() => null) as {
      ok?: boolean;
      error?: string;
      result?: { status?: number; amountUsd?: number; paid?: boolean };
    } | null;
    if (!response?.ok || !data?.ok) {
      updateWalletAction(agentId, { busy: false, error: data?.error ?? "x402 request failed.", message: "" });
      return;
    }
    updateWalletAction(agentId, {
      busy: false,
      error: "",
      x402Confirmation: "",
      message: `x402 returned ${data.result?.status ?? "ok"}${data.result?.paid ? ` after $${(data.result.amountUsd ?? 0).toFixed(4)} payment` : ""}.`,
    });
    await refreshWalletBalance(agentId);
  }

  function addAgentToMachine(machine: MachineGroup, runtime: AgentRuntime = "hermes") {
    openAgentCreationModal(machine, runtime);
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

  const hasConversation = useCallback((agentId: string) => {
    return (messagesByAgent[agentId] ?? []).some((message) => message.role !== "system" && message.content.trim());
  }, [messagesByAgent]);

  const conversationTitle = useCallback((agentId: string) => {
    const firstUserMessage = (messagesByAgent[agentId] ?? []).find((message) => message.role === "user")?.content.trim();
    return firstUserMessage ? firstUserMessage.slice(0, 56) : "Previous chat";
  }, [messagesByAgent]);

  function startAgentChat(agentId: string, options: { fresh?: boolean; messageLimit?: number; seedMessages?: ChatMessage[]; chatLeafKey?: string } = {}) {
    const leafKey = options.chatLeafKey ?? `agent-${agentId}`;
    setSelectedAgentId(agentId);
    setSelectedChatLeafKey(leafKey);
    setSelectedChatPreview(options.seedMessages?.length ? { agentId, leafKey, messages: options.seedMessages } : null);
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

  const chatSidebarTree = useMemo<ChatTreeMachine[]>(() => (
    machineGroups.map((machine) => {
      const folderMap = new Map<string, ChatTreeFolder>();
      const ensureFolder = (label: string, onStartChat?: () => void) => {
        const key = label.toLowerCase();
        const existing = folderMap.get(key);
        if (existing) {
          if (!existing.onStartChat && onStartChat) existing.onStartChat = onStartChat;
          return existing;
        }
        const next: ChatTreeFolder = { key: `${machine.key}-${key}`, label, chats: [], onStartChat };
        folderMap.set(key, next);
        return next;
      };

      for (const agent of machine.agents) {
        const folder = ensureFolder(chatFolderLabel(agent, machine), () => startAgentChat(agent.id, {
          fresh: true,
          chatLeafKey: `folder-${machine.key}-${chatDedupeKey(chatFolderLabel(agent, machine))}-${agent.id}`,
        }));
        const hasDirectConversation = hasConversation(agent.id);
        const agentWork = (agentWorkById[agent.id] ?? []).filter(isChatSidebarTask);
        const latestAgentWork = agentWork.find((task) => task.updatedAt > 0);
        const hasRecentHistory = agentWork.some((task) => task.source !== "dashboard-chat");
        const agentChatKey = `agent-${agent.id}`;
        const shouldShowDirectChat = !hasRecentHistory;
        if (shouldShowDirectChat) {
          folder.chats.push({
            key: agentChatKey,
            title: hasDirectConversation ? conversationTitle(agent.id) : agent.name,
            subtitle: hasDirectConversation ? agent.name : `${RUNTIME_LABELS[agent.runtime]} chat`,
            updatedAt: latestAgentWork?.updatedAt,
            rank: hasRecentHistory ? 1 : 3,
            active: selectedChatLeafKey ? selectedChatLeafKey === agentChatKey : agent.id === selectedAgent?.id && !chatMessageWindow,
            onOpen: () => startAgentChat(agent.id, { chatLeafKey: agentChatKey }),
          });
        }

        for (const [taskIndex, task] of agentWork.entries()) {
          if (task.source === "dashboard-chat" && hasDirectConversation) continue;
          const seedMessages = task.messages?.some((message) => message.content.trim())
            ? task.messages
            : [
              { role: "system" as const, content: `Resuming ${task.title || "previous chat"} from recent collector metadata.` },
              { role: "assistant" as const, content: task.lastMessage || task.title || "Recent chat metadata is available, but the full transcript was not cached locally." },
            ];
          const taskChatKey = `task-${agent.id}-${task.id}-${task.source ?? "unknown"}-${task.updatedAt || task.startedAt || taskIndex}`;
          folder.chats.push({
            key: taskChatKey,
            title: task.title || "Previous chat",
            subtitle: task.lastMessage || agent.name,
            updatedAt: task.updatedAt > 0 ? task.updatedAt : task.startedAt > 0 ? task.startedAt : undefined,
            rank: workPriority(task) + (task.messages?.length ? 3 : 0),
            active: selectedChatLeafKey === taskChatKey,
            onOpen: () => startAgentChat(agent.id, { messageLimit: 5, seedMessages, chatLeafKey: taskChatKey }),
          });
        }
      }

      return {
        key: machine.key,
        name: machine.name,
        detail: machine.collector === "ready" ? `${machine.agents.length} available` : "Collector not ready",
        onStartChat: machine.agents.length > 0
          ? () => startAgentChat(machine.agents[0].id, { fresh: true, chatLeafKey: `machine-${machine.key}-${machine.agents[0].id}` })
          : undefined,
        folders: [...folderMap.values()]
          .map((folder) => ({
            ...folder,
            chats: [...folder.chats.reduce((deduped, chat) => {
              const key = chatPreviewDedupeKey(chat.title, chat.subtitle);
              deduped.set(key, preferChatTreeItem(deduped.get(key), chat));
              return deduped;
            }, new Map<string, ChatTreeItem>()).values()]
              .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0) || a.title.localeCompare(b.title)),
          }))
          .sort((a, b) => (
            a.label === "Stray chats" ? 1 : b.label === "Stray chats" ? -1 : a.label.localeCompare(b.label)
          )),
      };
    })
  ), [agentWorkById, chatMessageWindow, conversationTitle, hasConversation, machineGroups, selectedAgent?.id, selectedChatLeafKey]);

  const selectedChatMachine = useMemo(() => (
    selectedAgent
      ? chatSidebarTree.find((machine) => machine.folders.some((folder) => (
        folder.chats.some((chat) => chat.active) || machineGroups.find((group) => group.key === machine.key)?.agents.some((agent) => agent.id === selectedAgent.id)
      ))) ?? null
      : null
  ), [chatSidebarTree, machineGroups, selectedAgent]);

  const selectedChatDirectory = useMemo(() => {
    if (!selectedAgent) return "";
    const activeFolder = selectedChatMachine?.folders.find((folder) => folder.chats.some((chat) => chat.active));
    if (activeFolder) return activeFolder.label;
    const machine = machineGroups.find((group) => group.agents.some((agent) => agent.id === selectedAgent.id));
    return machine ? chatFolderLabel(selectedAgent, machine) : workspaceLabelFromPath(selectedAgent.localDataDir);
  }, [machineGroups, selectedAgent, selectedChatMachine]);

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
    addKanbanStorageParams(params);
    if (kanbanTenantFilter) params.set("tenant", kanbanTenantFilter);
    if (kanbanAssigneeFilter) params.set("assignee", kanbanAssigneeFilter);
    if (kanbanSearch) params.set("q", kanbanSearch);
    const response = await fetch(`/api/kanban?${params.toString()}`, { cache: "no-store" });
    const data = await response.json().catch(() => null) as KanbanResponse | null;
    if (!response.ok || !data?.ok || !data.board) throw new Error(data?.error ?? "Kanban refresh failed.");
    setKanbanError("");
    setKanbanBoard(data.board);
    setKanbanBoards(data.boards ?? []);
    setKanbanTenants(data.tenants ?? []);
    setKanbanAssignees(data.assignees ?? []);
    setKanbanStorage(data.storage ?? null);
  }

  function kanbanStorageBody() {
    return sharedVault.enabled
      ? {
        vaultPath: sharedVault.vaultPath.trim(),
        kanbanFolder: sharedVault.kanbanFolder?.trim() || DEFAULT_SHARED_VAULT.kanbanFolder,
      }
      : {};
  }

  function notificationStorageBody() {
    return sharedVault.enabled
      ? {
        vaultPath: sharedVault.vaultPath.trim(),
        notificationsFolder: sharedVault.notificationsFolder?.trim() || DEFAULT_SHARED_VAULT.notificationsFolder,
      }
      : {};
  }

  function noteIntakeBody() {
    return {
      ...kanbanStorageBody(),
      folders: sharedVault.noteTaskImportFolders || DEFAULT_SHARED_VAULT.noteTaskImportFolders,
      board: kanbanBoardSlug,
    };
  }

  async function scanNoteIntake(quiet = false) {
    if (!sharedVault.enabled) {
      setNoteIntakeStatus("Turn on the shared brain before scanning note tasks.");
      return;
    }
    if (!quiet) {
      setNoteIntakePending("scan");
      setNoteIntakeStatus("");
    }
    const params = new URLSearchParams({ board: kanbanBoardSlug });
    if (sharedVault.vaultPath.trim()) params.set("vaultPath", sharedVault.vaultPath.trim());
    params.set("kanbanFolder", sharedVault.kanbanFolder?.trim() || DEFAULT_SHARED_VAULT.kanbanFolder);
    params.set("folders", sharedVault.noteTaskImportFolders || DEFAULT_SHARED_VAULT.noteTaskImportFolders);
    const response = await fetch(`/api/note-intake?${params.toString()}`, { cache: "no-store" }).catch(() => null);
    const data = await response?.json().catch(() => null) as NoteIntakeResponse | null;
    setNoteIntakePending("");
    if (!response?.ok || !data?.ok) {
      setNoteIntakeStatus(data?.error ?? "Could not scan note tasks.");
      return;
    }
    setNoteIntakePreview(data.candidates ?? []);
    setNoteIntakeStatus(`${data.candidates?.length ?? 0} note tasks found.`);
  }

  async function importNoteIntake(quiet = false) {
    if (!sharedVault.enabled) {
      setNoteIntakeStatus("Turn on the shared brain before importing note tasks.");
      return;
    }
    if (!quiet) {
      setNoteIntakePending("import");
      setNoteIntakeStatus("");
    }
    const response = await fetch(`/api/note-intake?board=${encodeURIComponent(kanbanBoardSlug)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(noteIntakeBody()),
    }).catch(() => null);
    const data = await response?.json().catch(() => null) as NoteIntakeResponse | null;
    setNoteIntakePending("");
    if (!response?.ok || !data?.ok) {
      setNoteIntakeStatus(data?.error ?? "Could not import note tasks.");
      return;
    }
    if (data.board) setKanbanBoard(data.board);
    setNoteIntakePreview(data.candidates ?? []);
    setNoteIntakeStatus(`Imported ${data.imported?.length ?? 0} note tasks into Ideas. Skipped ${data.skipped ?? 0} already present.`);
    await refreshKanbanOnce().catch((error) => setKanbanError(error instanceof Error ? error.message : "Kanban refresh failed."));
  }

  useEffect(() => {
    if (!hydrated || !sharedVault.enabled || !sharedVault.noteTaskImportEnabled) return;
    if (noteIntakeAutoInFlightRef.current) return;
    const runQuietImport = () => {
      if (noteIntakeAutoInFlightRef.current) return;
      noteIntakeAutoInFlightRef.current = true;
      void importNoteIntake(true).finally(() => {
        noteIntakeAutoInFlightRef.current = false;
      });
    };
    runQuietImport();
    const timer = window.setInterval(runQuietImport, 120_000);
    return () => window.clearInterval(timer);
    // `importNoteIntake` is intentionally gated by the persisted config values below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hydrated,
    kanbanBoardSlug,
    sharedVault.enabled,
    sharedVault.kanbanFolder,
    sharedVault.noteTaskImportEnabled,
    sharedVault.noteTaskImportFolders,
    sharedVault.vaultPath,
  ]);

  async function markNotificationRead(id: string) {
    const response = await fetch("/api/openclaw/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...notificationStorageBody(), id }),
    }).catch(() => null);
    const data = await response?.json().catch(() => null) as NotificationsResponse | null;
    if (!response?.ok || !data?.ok) {
      setNotificationsStatus(data?.error ?? "Could not mark notification read.");
      return;
    }
    setNotifications((current) => current.map((notification) => (
      notification.id === id ? { ...notification, read: true, readAt: new Date().toISOString() } : notification
    )));
    setNotificationSummary((current) => current ? {
      ...current,
      unread: Math.max(0, current.unread - 1),
      highUnread: Math.max(0, current.highUnread - (notifications.find((item) => item.id === id)?.priority === "high" ? 1 : 0)),
      urgentUnread: Math.max(0, current.urgentUnread - (notifications.find((item) => item.id === id)?.priority === "urgent" ? 1 : 0)),
    } : current);
  }

  async function markAllNotificationsRead() {
    const response = await fetch("/api/openclaw/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...notificationStorageBody(), action: "mark-all-read" }),
    }).catch(() => null);
    const data = await response?.json().catch(() => null) as NotificationsResponse | null;
    if (!response?.ok || !data?.ok) {
      setNotificationsStatus(data?.error ?? "Could not mark notifications read.");
      return;
    }
    const now = new Date().toISOString();
    setNotifications((current) => current.map((notification) => ({ ...notification, read: true, readAt: notification.readAt ?? now })));
    setNotificationSummary((current) => current ? { ...current, unread: 0, highUnread: 0, urgentUnread: 0 } : current);
    setNotificationsStatus("Badge cleared. New agent notifications will light it back up.");
  }

  async function updateNotificationSettings(settings: Partial<AgentNotificationSettings>) {
    const response = await fetch("/api/openclaw/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...notificationStorageBody(), action: "settings", settings }),
    }).catch(() => null);
    const data = await response?.json().catch(() => null) as NotificationsResponse | null;
    if (!response?.ok || !data?.ok) {
      setNotificationsStatus(data?.error ?? "Could not update notification settings.");
      return;
    }
    if (data.settings) {
      setNotificationSummary((current) => current ? { ...current, settings: data.settings! } : {
        total: data.total ?? 0,
        unread: data.unread ?? 0,
        highUnread: data.highUnread ?? 0,
        urgentUnread: data.urgentUnread ?? 0,
        folder: data.folder ?? sharedVault.notificationsFolder ?? "agent-notifications",
        settings: data.settings!,
      });
    }
  }

  async function trackAgentTaskOnKanban(agent: AgentProfile, taskRow: AgentTaskRow, task?: AgentTask) {
    const status: KanbanStatus = taskRow.status === "active"
      ? "working"
      : taskRow.status === "completed"
        ? "done"
        : taskRow.status === "failed"
          ? "needs-human"
          : "ideas";
    const response = await fetch(`/api/kanban?board=${encodeURIComponent(kanbanBoardSlug)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...kanbanStorageBody(),
        title: cleanActivityTitle(task?.title ?? taskRow.title),
        body: [
          task?.lastMessage ? `Latest agent note: ${task.lastMessage}` : "",
          task?.source ? `Source: ${task.source}` : taskRow.source ? `Source: ${taskRow.source}` : "",
          agent.machineName ? `Machine: ${agent.machineName}` : "",
        ].filter(Boolean).join("\n\n"),
        assignee: agent.agentId || agent.id,
        tenant: agent.machineName || agent.runtime,
        priority: taskRow.status === "failed" ? "high" : "normal",
        status,
        idempotencyKey: `agent-task:${agent.id}:${taskRow.id}`,
      }),
    });
    const data = await response.json().catch(() => null) as KanbanResponse | null;
    if (!response.ok || !data?.ok) {
      setKanbanError(data?.error ?? "Could not track agent task on the Work board.");
      setActiveView("kanban");
      return;
    }
    if (data.board) {
      setKanbanBoard(data.board);
      setKanbanStorage(data.storage ?? null);
    }
    if (data.task?.id) setSelectedKanbanTaskId(data.task.id);
    setActiveView("kanban");
    await refreshKanbanOnce().catch((error) => setKanbanError(error instanceof Error ? error.message : "Kanban refresh failed."));
  }

  async function createKanbanTask(event: FormEvent, status: KanbanStatus) {
    event.preventDefault();
    const title = quickAddDrafts[status]?.trim();
    if (!title) return;
    const response = await fetch(`/api/kanban?board=${encodeURIComponent(kanbanBoardSlug)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...kanbanStorageBody(),
        title,
        body: "",
        assignee: "",
        tenant: "",
        priority: "normal",
        status,
      }),
    });
    const data = await response.json().catch(() => null) as KanbanResponse | null;
    if (!response.ok || !data?.ok) {
      setKanbanError(data?.error ?? "Could not create task.");
      return;
    }
    setQuickAddDrafts((current) => ({ ...current, [status]: "" }));
    setQuickAddStatus("");
    if (status === "ready" && data.task) {
      await orchestrateReadyKanbanTask(data.task);
      return;
    }
    await refreshKanbanOnce().catch((error) => setKanbanError(error instanceof Error ? error.message : "Kanban refresh failed."));
  }

  async function createKanbanBoard(event: FormEvent) {
    event.preventDefault();
    if (!newBoardDraft.slug.trim()) return;
    const response = await fetch("/api/kanban", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...kanbanStorageBody(), action: "create-board", slug: newBoardDraft.slug, name: newBoardDraft.name }),
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
    const response = await fetch(`/api/kanban?board=${encodeURIComponent(kanbanBoardSlug)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...kanbanStorageBody(), taskId, patch }),
    });
    const data = await response.json().catch(() => null) as KanbanResponse | null;
    if (!response.ok || !data?.ok) {
      setKanbanError(data?.error ?? "Could not update task.");
      return;
    }
    await refreshKanbanOnce().catch((error) => setKanbanError(error instanceof Error ? error.message : "Kanban refresh failed."));
  }

  async function moveKanbanTask(taskId: string, status: KanbanStatus) {
    const response = await fetch(`/api/kanban?board=${encodeURIComponent(kanbanBoardSlug)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...kanbanStorageBody(), taskId, status }),
    });
    const data = await response.json().catch(() => null) as KanbanResponse | null;
    if (!response.ok || !data?.ok) {
      setKanbanError(data?.error ?? "Could not move task.");
      return;
    }
    if (status === "ready" && data.task) {
      await orchestrateReadyKanbanTask(data.task);
      return;
    }
    await refreshKanbanOnce().catch((error) => setKanbanError(error instanceof Error ? error.message : "Kanban refresh failed."));
  }

  async function orchestrateReadyKanbanTask(task: KanbanTask) {
    const assignment = chooseBeeAssignment(task, displayAgents);
    if (assignment.mode === "pending") {
      await addKanbanSystemComment(task.id, `Ready for Queen, but no Queen Bee or eligible worker is available yet. ${assignment.reason}`);
      await refreshKanbanOnce().catch((error) => setKanbanError(error instanceof Error ? error.message : "Kanban refresh failed."));
      return;
    }

    const owner = assignment.worker ?? assignment.queen;
    if (!owner) return;
    const setupIssue = chatSetupIssue(owner);
    if (setupIssue) {
      await addKanbanSystemComment(task.id, `Ready for Queen, but ${owner.name} cannot receive delegated work yet: ${setupIssue}`);
      await refreshKanbanOnce().catch((error) => setKanbanError(error instanceof Error ? error.message : "Kanban refresh failed."));
      return;
    }
    const response = await fetch(`/api/kanban?board=${encodeURIComponent(kanbanBoardSlug)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...kanbanStorageBody(),
        taskId: task.id,
        patch: {
          assignee: owner.name,
          tenant: assignment.mode === "queen" ? "queen-bee" : `${assignment.workerClass}-worker`,
          status: "working",
        },
      }),
    });
    const data = await response.json().catch(() => null) as KanbanResponse | null;
    if (!response.ok || !data?.ok) {
      setKanbanError(data?.error ?? "Queen Bee could not claim the task.");
      return;
    }
    await addKanbanSystemComment(
      task.id,
      [
        assignment.queen
          ? `${assignment.queen.name} reviewed this from Ready for Queen.`
          : "No Queen Bee is assigned yet, so the dashboard pickup loop used the best available worker.",
        `Assigned to ${owner.name} as ${beeWorkerClassLabel(assignment.workerClass)} work.`,
        assignment.reason,
      ].join(" "),
    );
    await refreshKanbanOnce().catch((error) => setKanbanError(error instanceof Error ? error.message : "Kanban refresh failed."));
    await dispatchKanbanTaskToAgent(task, owner, assignment);
  }

  async function addKanbanSystemComment(taskId: string, body: string) {
    const response = await fetch(`/api/kanban?board=${encodeURIComponent(kanbanBoardSlug)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...kanbanStorageBody(), action: "comment", taskId, body, author: "queen-bee" }),
    });
    const data = await response.json().catch(() => null) as KanbanResponse | null;
    if (!response.ok || !data?.ok) {
      setKanbanError(data?.error ?? "Could not record Queen Bee note.");
    }
  }

  /* eslint-disable react-hooks/immutability, react-hooks/purity */
  async function dispatchKanbanTaskToAgent(task: KanbanTask, agent: AgentProfile, assignment: ReturnType<typeof chooseBeeAssignment>) {
    const prompt = kanbanTaskDispatchPrompt(task, assignment);
    const localTaskId = `kanban-${task.id}-${Date.now()}`;
    let fullText = "";

    upsertTask({
      id: localTaskId,
      agentId: agent.id,
      title: task.title,
      lastMessage: "Delegated from Work board...",
      status: "active",
      startedAt: Date.now(),
      updatedAt: Date.now(),
      source: "kanban",
    });
    appendMessage(agent.id, { role: "user", content: prompt });
    appendMessage(agent.id, { role: "assistant", content: "" });

    try {
      const response = await fetch("/api/chat/agent-runtime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent,
          sharedVault,
          wallet: walletsByAgent[agent.id] ?? createDefaultAgentWallet(agent.id),
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({}));
        throw new Error(typeof data.error === "string" ? data.error : `Request failed with ${response.status}`);
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
          if (!chunk) continue;
          fullText += chunk;
          setMessagesByAgent((current) => {
            const existing = current[agent.id] ?? [];
            const next = [...existing];
            const last = next[next.length - 1] ?? { role: "assistant" as const, content: "" };
            if (next.length === 0) next.push(last);
            next[next.length - 1] = { ...last, content: fullText };
            return { ...current, [agent.id]: next };
          });
          updateTask(localTaskId, { lastMessage: fullText });
        }
      }

      const result = fullText.trim() || `${agent.name} accepted the delegated work.`;
      updateTask(localTaskId, { status: "completed", lastMessage: result, completedAt: Date.now() });
      await patchKanbanTask(task.id, { status: "done", result });
      await addKanbanSystemComment(task.id, `${agent.name} completed the delegated work from the Work board.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown runtime error";
      setMessagesByAgent((current) => {
        const existing = current[agent.id] ?? [];
        const next = [...existing];
        const last = next[next.length - 1] ?? { role: "assistant" as const, content: "" };
        if (next.length === 0) next.push(last);
        next[next.length - 1] = { ...last, content: `Error: ${message}` };
        return { ...current, [agent.id]: next };
      });
      updateTask(localTaskId, { status: "failed", lastMessage: message, completedAt: Date.now() });
      await patchKanbanTask(task.id, { status: "needs-human", result: `Delegation failed for ${agent.name}: ${message}` });
      await addKanbanSystemComment(task.id, `Delegation failed for ${agent.name}: ${message}`);
    }
  }
  /* eslint-enable react-hooks/immutability, react-hooks/purity */

  useEffect(() => {
    if (!hydrated || !kanbanBoard) return;
    const readyTasks = kanbanBoard.tasks.filter((task) => task.status === "ready");
    for (const task of readyTasks) {
      if (kanbanReadyPickupInFlightRef.current.has(task.id)) continue;
      const signature = kanbanReadyPickupSignature(task, displayAgents);
      if (kanbanReadyPickupAttemptRef.current.get(task.id) === signature) continue;
      kanbanReadyPickupAttemptRef.current.set(task.id, signature);
      kanbanReadyPickupInFlightRef.current.add(task.id);
      void orchestrateReadyKanbanTask(task).finally(() => {
        kanbanReadyPickupInFlightRef.current.delete(task.id);
      });
    }

    const retryableWorkingTasks = kanbanBoard.tasks.filter((task) => task.status === "working" && task.assignee?.trim());
    for (const task of retryableWorkingTasks) {
      if (kanbanReadyPickupInFlightRef.current.has(task.id)) continue;
      const assignee = kanbanTaskAssigneeAgent(task, displayAgents);
      if (!assignee) continue;
      const signature = `working:${kanbanReadyPickupSignature(task, displayAgents)}`;
      if (kanbanReadyPickupAttemptRef.current.get(task.id) === signature) continue;
      kanbanReadyPickupAttemptRef.current.set(task.id, signature);
      kanbanReadyPickupInFlightRef.current.add(task.id);
      void dispatchKanbanTaskToAgent(task, assignee, kanbanTaskAssignmentForAgent(task, assignee)).finally(() => {
        kanbanReadyPickupInFlightRef.current.delete(task.id);
      });
    }
    // `orchestrateReadyKanbanTask` intentionally stays out of this dependency list:
    // the pickup signature gates retries, while the function itself changes each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayAgents, hydrated, kanbanBoard]);

  async function addKanbanComment(event: FormEvent) {
    event.preventDefault();
    if (!selectedKanbanTask || !commentDraft.trim()) return;
    const response = await fetch(`/api/kanban?board=${encodeURIComponent(kanbanBoardSlug)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...kanbanStorageBody(), action: "comment", taskId: selectedKanbanTask.id, body: commentDraft, author: "dashboard" }),
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
      body: JSON.stringify({ vaultPath: sharedVault.vaultPath.trim() || undefined }),
    });
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    setVaultStatus(data);
    if (data.ok && typeof data.vaultPath === "string" && data.vaultPath.trim()) {
      updateSharedVault({ vaultPath: data.vaultPath });
    }
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

  const runVaultTailnetSync = useCallback(async (dryRun: boolean, quiet = false) => {
    setVaultSyncPending(dryRun ? "dry-run" : "sync");
    if (!quiet) setVaultSyncStatus(null);
    const response = await fetch("/api/obsidian/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vaultPath: sharedVault.vaultPath.trim() || undefined,
        remoteHost: sharedVault.tailnetSyncHost,
        remotePath: sharedVault.tailnetSyncPath,
        direction: sharedVault.tailnetSyncDirection,
        dryRun,
      }),
    }).catch(() => null);
    const data = await response?.json().catch(() => null) as VaultSyncStatus | null;
    setVaultSyncPending("");
    setVaultSyncStatus(data ?? { ok: false, error: "Tailnet vault sync request failed." });
  }, [
    sharedVault.tailnetSyncDirection,
    sharedVault.tailnetSyncHost,
    sharedVault.tailnetSyncPath,
    sharedVault.vaultPath,
  ]);

  const pairSyncthingVaultSync = useCallback(async () => {
    const remoteHost = sharedVault.tailnetSyncHost.trim();
    const remotePath = sharedVault.tailnetSyncPath.trim();
    if (!remoteHost || !remotePath) {
      setVaultSyncStatus({ ok: false, method: "syncthing", error: "Choose a Tailnet machine and remote folder first." });
      return;
    }
    setVaultSyncPending("syncthing");
    setVaultSyncStatus(null);
    const cleanHost = remoteHost.replace(/^.+@/, "").replace(/\.$/, "");
    const hostKey = cleanHost.toLowerCase();
    const localTailscaleIp = tailscaleDevices.find((device) => device.self)?.ip;
    const remoteDevice = tailscaleDevices.find((device) => (
      device.ip === cleanHost
      || device.name.toLowerCase() === hostKey
      || device.dnsName.toLowerCase().replace(/\.$/, "") === hostKey
      || device.collectorUrl.toLowerCase().includes(hostKey)
    ));
    const response = await fetch("/api/syncthing/pair", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        localPath: sharedVault.vaultPath.trim(),
        remotePath,
        remoteCollectorUrl: /^https?:\/\//.test(cleanHost) ? cleanHost : `http://${cleanHost}:8787`,
        remoteName: cleanHost,
        localTailscaleIp,
        remoteTailscaleIp: remoteDevice?.ip || (cleanHost.startsWith("100.") ? cleanHost : undefined),
        remoteAddressHost: /^https?:\/\//.test(cleanHost) ? undefined : cleanHost,
        folderId: "omni-agent-hivemind-vault",
        label: "Omni-Agent Hivemind Vault",
      }),
    }).catch(() => null);
    const data = await response?.json().catch(() => null) as VaultSyncStatus | null;
    setVaultSyncPending("");
    setVaultSyncStatus(data?.ok
      ? { ...data, method: "syncthing", message: `Syncthing paired ${data.folderId ?? "vault"} for realtime sync.` }
      : { ok: false, method: "syncthing", error: data?.error ?? "Syncthing pairing failed." });
  }, [
    sharedVault.tailnetSyncHost,
    sharedVault.tailnetSyncPath,
    sharedVault.vaultPath,
    tailscaleDevices,
  ]);

  useEffect(() => {
    if (!hydrated || !sharedVault.enabled || !sharedVault.tailnetSyncEnabled) return;
    if (!sharedVault.tailnetSyncHost.trim() || !sharedVault.tailnetSyncPath.trim()) return;
    const intervalMs = Math.max(10, sharedVault.tailnetSyncIntervalSeconds || 20) * 1000;
    const timer = window.setInterval(() => {
      if (!vaultSyncPending) void runVaultTailnetSync(false, true);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [
    hydrated,
    runVaultTailnetSync,
    sharedVault.enabled,
    sharedVault.tailnetSyncEnabled,
    sharedVault.tailnetSyncHost,
    sharedVault.tailnetSyncIntervalSeconds,
    sharedVault.tailnetSyncPath,
    vaultSyncPending,
  ]);

  async function inspectBrainNode(node: BrainGraphNode) {
    if (brainDragMovedRef.current) {
      brainDragMovedRef.current = false;
      return;
    }
    if (selectedBrainNodeId === node.id) {
      if (node.id.startsWith("unresolved:")) {
        setBrainGraphStatus("That cell is an unresolved link, so there is no note file to open yet.");
        return;
      }
      const response = await fetch("/api/obsidian/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vaultPath: sharedVault.vaultPath, notePath: node.id, newtab: true }),
      }).catch(() => null);
      const data = await response?.json().catch(() => null) as { ok?: boolean; error?: string } | null;
      setBrainGraphStatus(data?.ok ? `Opened ${node.label} in Obsidian.` : data?.error ?? "Could not open note in Obsidian.");
      return;
    }
    setSelectedBrainNodeId(node.id);
    if (node.id.startsWith("unresolved:")) return;
    const response = await fetch("/api/obsidian/access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vaultPath: sharedVault.vaultPath,
        notePath: node.id,
        agentName: selectedAgent?.name ?? "Dashboard",
        agentId: selectedAgent?.agentId || selectedAgent?.id,
        runtime: selectedAgent?.runtime,
        machineName: selectedAgent?.machineName || "local",
        action: "inspect",
      }),
    }).catch(() => null);
    const data = await response?.json().catch(() => null) as { ok?: boolean; event?: BrainAccessEvent; error?: string } | null;
    if (!data?.ok || !data.event) {
      setBrainGraphStatus(data?.error ?? "Could not record access.");
      return;
    }
    setBrainGraph((current) => {
      if (!current) return current;
      return {
        ...current,
        recentAccesses: [data.event!, ...current.recentAccesses].slice(0, 24),
        nodes: current.nodes.map((item) => item.id === node.id
          ? {
            ...item,
            accessCount: item.accessCount + 1,
            lastAccessedAt: data.event!.accessedAt,
            recentAccesses: [data.event!, ...item.recentAccesses].slice(0, 6),
          }
          : item),
      };
    });
    setBrainGraphStatus(`Recorded ${selectedAgent?.name ?? "Dashboard"} inspecting ${node.label}.`);
  }

  function startBrainPan(event: PointerEvent<SVGSVGElement>) {
    if (event.button !== 0) return;
    const target = event.target instanceof Element
      ? event.target.closest("[data-brain-node-id]") as HTMLElement | null
      : null;
    brainDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      panX: brainPan.x,
      panY: brainPan.y,
      moved: false,
      nodeId: target?.dataset.brainNodeId ?? "",
    };
    brainDragMovedRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveBrainPan(event: PointerEvent<SVGSVGElement>) {
    const drag = brainDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;
    drag.moved = true;
    brainDragMovedRef.current = true;
    setBrainPan({ x: drag.panX - dx, y: drag.panY - dy });
  }

  function endBrainPan(event: PointerEvent<SVGSVGElement>) {
    const drag = brainDragRef.current;
    if (drag?.pointerId === event.pointerId) {
      brainDragMovedRef.current = drag.moved;
      brainDragRef.current = null;
      if (!drag.moved && drag.nodeId) {
        const node = brainGraph?.nodes.find((item) => item.id === drag.nodeId);
        if (node) void inspectBrainNode(node);
      }
      if (drag.moved) window.setTimeout(() => {
        brainDragMovedRef.current = false;
      }, 0);
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  async function addChatFiles(files: FileList | File[], kind: "image" | "file") {
    const incoming = Array.from(files);
    if (incoming.length === 0) {
      setAttachmentError("Choose at least one file.");
      return;
    }
    const maxAttachmentBytes = 8_000_000;
    const oversized = incoming.find((file) => file.size > maxAttachmentBytes);
    if (oversized) {
      setAttachmentError(`${oversized.name} is too large. Keep attachments under 8 MB.`);
      return;
    }
    try {
      const next = await Promise.all(incoming.map((file) => readAttachmentFile(file, kind)));
      setChatAttachments((current) => [...current, ...next].slice(0, 6));
      setAttachmentError("");
      setAttachmentMenuOpen(false);
    } catch (error) {
      setAttachmentError(error instanceof Error ? error.message : "Could not attach that file.");
    }
  }

  function handleChatFileChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files?.length) void addChatFiles(event.target.files, "file");
    event.target.value = "";
  }

  function handleChatImageChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files?.length) void addChatFiles(event.target.files, "image");
    event.target.value = "";
  }

  function removeChatAttachment(id: string) {
    setChatAttachments((current) => current.filter((attachment) => attachment.id !== id));
  }

  function updateVoiceTranscript(value: string) {
    voiceTranscriptRef.current = value;
    setVoiceTranscript(value);
  }

  function appendVoiceTranscriptToInput() {
    const transcript = voiceTranscriptRef.current.trim();
    if (!transcript) return;
    setText((current) => [current.trim(), transcript].filter(Boolean).join(current.trim() ? " " : ""));
    updateVoiceTranscript("");
  }

  function cleanupVoiceCapture(commitTranscript: boolean) {
    if (voiceAnimationRef.current !== null) {
      cancelAnimationFrame(voiceAnimationRef.current);
      voiceAnimationRef.current = null;
    }
    voiceStreamRef.current?.getTracks().forEach((track) => track.stop());
    voiceStreamRef.current = null;
    void voiceAudioContextRef.current?.close().catch(() => undefined);
    voiceAudioContextRef.current = null;
    voiceRecognitionRef.current = null;
    setVoiceBands(Array(18).fill(0));
    setRecording(false);
    if (commitTranscript) appendVoiceTranscriptToInput();
  }

  function startVoiceWaveform(stream: MediaStream) {
    const audioWindow = window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };
    const AudioContextClass = audioWindow.AudioContext || audioWindow.webkitAudioContext;
    if (!AudioContextClass) return;
    const audioContext = new AudioContextClass();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    voiceAudioContextRef.current = audioContext;
    const data = new Uint8Array(analyser.frequencyBinCount);
    const bands = 18;
    const tick = () => {
      analyser.getByteFrequencyData(data);
      const binSize = Math.max(1, Math.floor(data.length / bands));
      const next = Array.from({ length: bands }, (_, index) => {
        const start = index * binSize;
        const slice = data.slice(start, start + binSize);
        const average = slice.reduce((total, value) => total + value, 0) / Math.max(1, slice.length);
        return Math.min(1, average / 180);
      });
      setVoiceBands(next);
      voiceAnimationRef.current = requestAnimationFrame(tick);
    };
    tick();
  }

  async function startAudioRecording() {
    if (recording || busy) return;
    const Recognition = speechRecognitionConstructor();
    if (!Recognition) {
      setAttachmentError("Speech transcription is not available in this browser.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setAttachmentError("Microphone access is not available in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recognition = new Recognition();
      let committedTranscript = "";
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = navigator.language || "en-US";
      recognition.onresult = (event) => {
        let interimTranscript = "";
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          const transcript = Array.from({ length: result.length }, (_, partIndex) => result[partIndex]?.transcript ?? "").join("");
          if (result.isFinal) committedTranscript = `${committedTranscript} ${transcript}`.trim();
          else interimTranscript = `${interimTranscript} ${transcript}`.trim();
        }
        updateVoiceTranscript(`${committedTranscript} ${interimTranscript}`.trim());
      };
      recognition.onerror = (event) => {
        setAttachmentError(event.error ? `Speech transcription failed: ${event.error}` : "Speech transcription failed.");
      };
      recognition.onend = () => cleanupVoiceCapture(true);
      voiceStreamRef.current = stream;
      voiceRecognitionRef.current = recognition;
      updateVoiceTranscript("");
      startVoiceWaveform(stream);
      recognition.start();
      setRecording(true);
      setAttachmentError("");
    } catch (error) {
      cleanupVoiceCapture(false);
      setAttachmentError(error instanceof Error ? error.message : "Could not start audio recording.");
    }
  }

  function stopAudioRecording() {
    const recognition = voiceRecognitionRef.current;
    if (!recognition) {
      cleanupVoiceCapture(true);
      return;
    }
    recognition.stop();
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (recording) {
      stopAudioRecording();
      return;
    }
    const prompt = text.trim();
    const outgoingAttachments = chatAttachments;
    if (!selectedAgent || busy || (!prompt && outgoingAttachments.length === 0)) return;
    const outgoingLabel = prompt || attachmentSummary(outgoingAttachments) || "Media message";
    const setupIssue = chatSetupIssue(selectedAgent);
    if (setupIssue) {
      appendMessage(selectedAgent.id, { role: "user", content: outgoingLabel, attachments: outgoingAttachments });
      appendMessage(selectedAgent.id, { role: "assistant", content: `Error: ${setupIssue}` });
      return;
    }

    setBusy(true);
    setBusyAgentId(selectedAgent.id);
    setHasStreamingChunk(false);
    setSelectedChatPreview(null);
    setText("");
    setChatAttachments([]);
    setAttachmentError("");
    setAttachmentMenuOpen(false);
    const taskId = `${selectedAgent.id}-${Date.now()}`;
    const contextMessages = (messagesByAgent[selectedAgent.id] ?? [])
      .filter((message) => message.role !== "system" && (message.content.trim() || message.attachments?.length))
      .slice(-5);
    const outgoingContent = messageContentParts(prompt, outgoingAttachments);
    upsertTask({
      id: taskId,
      agentId: selectedAgent.id,
      title: outgoingLabel,
      lastMessage: "Starting...",
      status: "active",
      startedAt: Date.now(),
      updatedAt: Date.now(),
    });
    appendMessage(selectedAgent.id, { role: "user", content: outgoingLabel, attachments: outgoingAttachments });
    appendMessage(selectedAgent.id, { role: "assistant", content: "" });

    try {
      const response = await fetch("/api/chat/agent-runtime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent: selectedAgent,
          sharedVault,
          wallet: walletsByAgent[selectedAgent.id] ?? createDefaultAgentWallet(selectedAgent.id),
          messages: [
            ...contextMessages.map((message) => ({
              role: message.role,
              content: messageContentParts(message.content, message.attachments ?? []),
            })),
            { role: "user", content: outgoingContent },
          ],
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
            setHasStreamingChunk(true);
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
      setHasStreamingChunk(false);
    }
  }

  const agentSettingsMachineName = agentCreateMachine?.name ?? roleModalAgent?.machineName ?? "this machine";
  const agentSettingsTitle = agentCreateMachine ? "Add agent" : "Agent settings";
  const agentSettingsDescription = agentCreateMachine
    ? `Create a profile attached to ${agentSettingsMachineName}.`
    : "Set how the Queen Bee should treat this agent when work is delegated.";
  const agentSettingsRole = agentCreateMachine ? agentCreateDraft.beeRole : roleModalAgent?.beeRole ?? "worker";
  const agentSettingsWorkerClass = agentCreateMachine ? agentCreateDraft.workerClass : roleModalAgent?.workerClass ?? "general";

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
                <small>
                  {item.detail}
                  {item.id === "notifications" && notificationSummary?.unread ? (
                    <i className={notificationClass("navBadge")} aria-label={`${notificationSummary.unread} unread notifications`}>
                      {notificationSummary.unread > 99 ? "99+" : notificationSummary.unread}
                    </i>
                  ) : null}
                </small>
                {activeView === item.id ? <ChevronRight aria-hidden="true" /> : null}
              </button>
            ))}
          </nav>

          <div className="sidebarTrust">
            <button
              type="button"
              className="themeToggle"
              aria-label={dashboardTheme === "hive-light" ? "Switch to dark mode" : "Switch to light mode"}
              aria-pressed={dashboardTheme === "hive-light"}
              onClick={() => setDashboardTheme((current) => current === "hive-light" ? "dark" : "hive-light")}
            >
              <Sun aria-hidden="true" />
              <span>{dashboardTheme === "hive-light" ? "Hive light" : "Night hive"}</span>
              <Moon aria-hidden="true" />
            </button>
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
      <section className={fleetClass("agentRail", "tabPanel")}>
        <div className={fleetClass("agentRailHeader")}>
          <div>
            <h2>Fleet</h2>
            <p className="text-xs text-[var(--muted)]">
              {fleetCheckedAt ? `Scanned ${formatRelativeTime(fleetCheckedAt)} · ` : ""}{tailscaleStatus}
            </p>
          </div>
        </div>

        <div className={fleetClass("machineBoard")}>
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
              <div className={fleetClass("machineUpdateStatus", updateStatus.tone)}>
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
                    className="!size-6 rounded-full border !border-[var(--line)] !bg-[var(--surface-soft)] !text-[var(--accent-strong)] hover:!border-[var(--accent-strong)] hover:!bg-[var(--surface-strong)] [&_svg]:!size-3"
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
                            setAgentRenameDraft(agent.name);
                            setAgentRenameEditing(false);
                            setAgentRoleModalId(agent.id);
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
                              onTrackTask={(taskRow) => {
                                const task = agentWork.find((item) => item.id === taskRow.id);
                                void trackAgentTaskOnKanban(agent, taskRow, task);
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
      <section className={kanbanClass("kanbanPanel", "tabPanel")}>
        <div className={kanbanClass("kanbanHeader")}>
          <div>
            <p className="eyebrow">Shared work queue</p>
            <h2>Work Board</h2>
            <p>
              Drop ideas here, then move them to Ready for Queen when the colony should pick them up.
            </p>
          </div>
          <div className={kanbanClass("kanbanHeaderActions")}>
            <span className={kanbanClass("kanbanSyncPill", colonySummary.queens > 0 ? "synced" : "local")}>
              {colonySummary.queens > 0
                ? `${colonySummary.queens} queen · ${colonySummary.workers} workers`
                : "No queen assigned"}
            </span>
            <span
              className={kanbanClass("kanbanSyncPill", kanbanStorage?.source === "obsidian" ? "synced" : "local")}
              title={kanbanStorage?.file}
            >
              {kanbanStorage?.source === "obsidian" ? "Vault folder" : "Local fallback"}
            </span>
            <details className={kanbanClass("kanbanAdvanced")}>
              <summary>Board options</summary>
              <div className={kanbanClass("kanbanAdvancedPanel")}>
                <label>
                  Board
                  <select value={kanbanBoardSlug} onChange={(event) => setKanbanBoardSlug(event.target.value)}>
                    {kanbanBoards.length > 0 ? kanbanBoards.map((board) => (
                      <option value={board.slug} key={board.slug}>{board.name}</option>
                    )) : <option value="default">Default</option>}
                  </select>
                </label>
                <form className={kanbanClass("kanbanBoardCreate")} onSubmit={createKanbanBoard}>
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
                <div className={kanbanClass("kanbanNoteIntake")}>
                  <label className={kanbanClass("toggleRow")}>
                    <input
                      type="checkbox"
                      checked={sharedVault.noteTaskImportEnabled}
                      onChange={(event) => updateSharedVault({ noteTaskImportEnabled: event.target.checked })}
                    />
                    Auto-import note tasks to Ideas
                  </label>
                  <label>
                    Note task folders
                    <textarea
                      value={sharedVault.noteTaskImportFolders || DEFAULT_SHARED_VAULT.noteTaskImportFolders}
                      onChange={(event) => updateSharedVault({ noteTaskImportFolders: event.target.value })}
                      rows={3}
                      placeholder="Projects&#10;Inbox"
                    />
                  </label>
                  <div className={kanbanClass("kanbanBoardCreate")}>
                    <button type="button" disabled={Boolean(noteIntakePending)} onClick={() => scanNoteIntake()}>
                      {noteIntakePending === "scan" ? "Scanning..." : "Scan notes"}
                    </button>
                    <button type="button" disabled={Boolean(noteIntakePending)} onClick={() => importNoteIntake()}>
                      {noteIntakePending === "import" ? "Importing..." : "Import to Ideas"}
                    </button>
                  </div>
                  <small>
                    {noteIntakeStatus || "Reads markdown project notes for unchecked tasks and Next action sections. Auto-import stays off until you enable it."}
                  </small>
                  {noteIntakePreview.length > 0 ? (
                    <ul>
                      {noteIntakePreview.slice(0, 5).map((candidate) => (
                        <li key={candidate.idempotencyKey}>
                          <span>{candidate.title}</span>
                          <small>{candidate.sourcePath}:{candidate.line}</small>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <small>{kanbanStorage?.file ?? "Storage path loading..."}</small>
              </div>
            </details>
          </div>
        </div>

        {kanbanError ? <p className={kanbanClass("kanbanError")}>{kanbanError}</p> : null}

        {hasKanbanTasks ? (
          <details className={kanbanClass("kanbanFilters")}>
            <summary>Filter tasks</summary>
            <div className={kanbanClass("kanbanToolbar")}>
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
              <label className={kanbanClass("toggleRow")}>
                <input
                  type="checkbox"
                  checked={kanbanIncludeArchived}
                  onChange={(event) => setKanbanIncludeArchived(event.target.checked)}
                />
                Archived
              </label>
            </div>
          </details>
        ) : (
          <div className={kanbanClass("kanbanFirstRun")}>
            <strong>Add an idea</strong>
            <span>Ideas stay quiet. Ready for Queen is the automation pickup lane.</span>
          </div>
        )}

        <div className={kanbanClass("kanbanWorkspace", selectedKanbanTask ? "withDrawer" : "noDrawer")}>
          <div className={kanbanClass("kanbanBoard")} aria-label="Multi-agent Kanban board">
            {visibleKanbanColumns.map((column) => (
              <section
                className={kanbanClass("kanbanColumn", column.id)}
                key={column.id}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  const taskId = event.dataTransfer.getData("text/plain");
                  if (taskId) moveKanbanTask(taskId, column.id);
                }}
              >
                <div className={kanbanClass("kanbanColumnHeader")}>
                  <span className={kanbanClass("kanbanDot", column.id)} />
                  <div>
                    <h3>{column.title}</h3>
                    <p>{column.description}</p>
                  </div>
                  <strong>{column.tasks.length}</strong>
                  <button
                    type="button"
                    className={kanbanClass("kanbanAddColumnTask")}
                    onClick={() => setQuickAddStatus((current) => current === column.id ? "" : column.id)}
                    aria-label={`Add task to ${column.title}`}
                    title={`Add task to ${column.title}`}
                  >
                    <Plus aria-hidden="true" />
                  </button>
                </div>
                <div className={kanbanClass("kanbanCards")}>
                  {quickAddStatus === column.id ? (
                    <form className={kanbanClass("kanbanInlineAdd")} onSubmit={(event) => createKanbanTask(event, column.id)}>
                      <input
                        autoFocus
                        value={quickAddDrafts[column.id] ?? ""}
                        onChange={(event) => setQuickAddDrafts((current) => ({ ...current, [column.id]: event.target.value }))}
                        placeholder={`Add to ${column.title}`}
                      />
                      <div>
                        <button type="button" onClick={() => setQuickAddStatus("")}>Cancel</button>
                        <button type="submit">Add</button>
                      </div>
                    </form>
                  ) : null}
                  {column.tasks.map((task) => {
                    const bee = kanbanTaskBee(task, displayAgents);
                    return (
                      <button
                        type="button"
                        draggable
                        className={kanbanClass("kanbanCard", task.id === selectedKanbanTaskId && "active")}
                        key={task.id}
                        onClick={() => setSelectedKanbanTaskId(task.id)}
                        onDragStart={(event) => event.dataTransfer.setData("text/plain", task.id)}
                      >
                        <span className={kanbanClass("priorityPill", task.status)}>{kanbanTaskBadge(task)}</span>
                        <strong>{task.title}</strong>
                        <p>{task.body || task.result || "No task body yet."}</p>
                        <span className={kanbanClass("kanbanBeeAssignment")}>
                          {bee.icon ? <Image src={bee.icon} alt="" width={20} height={20} aria-hidden="true" /> : null}
                          <span>
                            <b>{bee.roleLabel}</b>
                            <small>{bee.assignee}</small>
                          </span>
                        </span>
                        <small>
                          {kanbanTaskMeta(task)} · {formatRelativeTime(task.updatedAt)}
                        </small>
                      </button>
                    );
                  })}
                  {column.tasks.length === 0 && quickAddStatus !== column.id ? (
                    <button
                      type="button"
                      className={kanbanClass("kanbanEmpty", "kanbanEmptyAction")}
                      onClick={() => setQuickAddStatus(column.id)}
                    >
                      <Plus aria-hidden="true" />
                      Add task
                    </button>
                  ) : null}
                </div>
              </section>
            ))}
          </div>

          {selectedKanbanTask ? (
          <aside className={kanbanClass("kanbanDrawer")}>
              <>
                <div className={kanbanClass("kanbanDrawerHeader")}>
                  <span className={kanbanClass("priorityPill", selectedKanbanTask.priority)}>{selectedKanbanTask.priority}</span>
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
                  {selectedKanbanTask.status === "done" ? "Completed by" : "Assignee"}
                  <select
                    value={selectedKanbanTask.assignee ?? ""}
                    onChange={(event) => patchKanbanTask(selectedKanbanTask.id, { assignee: event.target.value })}
                  >
                    <option value="">{selectedKanbanTask.status === "done" ? "user" : "Unassigned"}</option>
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
                <div className={kanbanClass("kanbanMetaGrid")}>
                  <span>Workspace: {selectedKanbanTask.workspace}</span>
                  <span>Created: {formatRelativeTime(selectedKanbanTask.createdAt)}</span>
                  <span>Comments: {selectedKanbanComments.length}</span>
                  <span>Links: {kanbanBoard?.links.filter((link) => link.parentId === selectedKanbanTask.id || link.childId === selectedKanbanTask.id).length ?? 0}</span>
                </div>
                <form className={kanbanClass("kanbanCommentForm")} onSubmit={addKanbanComment}>
                  <input
                    value={commentDraft}
                    onChange={(event) => setCommentDraft(event.target.value)}
                    placeholder="Add a durable handoff comment"
                  />
                  <button type="submit">Comment</button>
                </form>
                <div className={kanbanClass("kanbanThread")}>
                  {selectedKanbanComments.map((comment) => (
                    <article key={comment.id}>
                      <strong>{comment.author}</strong>
                      <p>{comment.body}</p>
                      <small>{formatRelativeTime(comment.createdAt)}</small>
                    </article>
                  ))}
                  {selectedKanbanComments.length === 0 ? <p className={kanbanClass("kanbanEmpty")}>No comments yet.</p> : null}
                </div>
                <div className={kanbanClass("kanbanEvents")}>
                  <h4>Recent events</h4>
                  {selectedKanbanEvents.map((event) => (
                    <p key={event.id}><span>{event.kind}</span>{event.message}</p>
                  ))}
                </div>
              </>
          </aside>
          ) : null}
        </div>
      </section>
      ) : null}

      {activeView === "swarm" ? (
      <section className={mirosharkClass("swarmPanel")}>
        <div className={mirosharkClass("mirosharkControl", mirosharkStatus?.ok && "connected")}>
          <div className={mirosharkClass("mirosharkIdentity")}>
            <span className={mirosharkClass("mirosharkAvatar")} aria-hidden="true">
              {mirosharkStatus?.install.running ? (
                <LottiePlayer src="/animations/Load%20HIVE.lottie" size={48} ariaLabel="MiroShark starting" />
              ) : (
                <Image
                  src="/icons/miroshark.png"
                  alt=""
                  width={48}
                  height={48}
                  className={mirosharkClass("mirosharkAvatarImg")}
                  priority
                />
              )}
              <span className={mirosharkClass("mirosharkDot")} aria-hidden="true" />
            </span>
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

          <div className={mirosharkClass("mirosharkActions")}>
            {(mirosharkStatus?.actions ?? [{ id: "install" as const, label: "Install & start" }]).map((action) => (
              <Button
                key={action.id}
                type="button"
                size="sm"
                variant={action.id === "open" || action.id === "configure-admin" ? "secondary" : "default"}
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
          <details className={mirosharkClass("mirosharkSetup")}>
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

        <div className={mirosharkClass("mirosharkWorkbench")}>
          <aside className={mirosharkClass("mirosharkHistoryRail")} aria-label="MiroShark simulation history">
            <Button
              type="button"
              className={mirosharkClass("mirosharkNewSimulation")}
              onClick={startNewMirosharkSimulation}
              disabled={mirosharkRunPending}
            >
              <Sparkles aria-hidden="true" />
              New Simulation
            </Button>

            <div className={mirosharkClass("mirosharkHistoryHeader")}>
              <div>
                <p>Past runs</p>
                <h3>Saved simulations</h3>
              </div>
              <Button type="button" size="sm" variant="ghost" onClick={refreshMirosharkArchive}>
                <RefreshCcw aria-hidden="true" />
                Refresh
              </Button>
            </div>

            <div className={mirosharkClass("mirosharkHistoryMeta")}>
              <span>{sharedVault.enabled ? "Obsidian archive" : "Shared brain off"}</span>
              <span>{mirosharkArchiveStatus || (sharedVault.enabled ? "Auto-saving runs" : "Enable vault sync to save")}</span>
            </div>

            {mirosharkArchiveRuns.length ? (
              <ol className={mirosharkClass("mirosharkHistoryList")}>
                {mirosharkArchiveRuns.slice(0, 12).map((run) => (
                  <li key={run.simulationId}>
                    <button
                      type="button"
                      className={mirosharkClass(mirosharkWorkspaceMode === "run" && mirosharkRun?.simulationId === run.simulationId && "active")}
                      onClick={() => loadMirosharkArchivedRun(run.simulationId)}
                    >
                      <strong>{run.simulationId}</strong>
                      <span>{run.postCount} posts · {run.platform ?? "surface"} · complete</span>
                    </button>
                  </li>
                ))}
              </ol>
            ) : (
              <p className={mirosharkClass("mirosharkHistoryEmpty")}>No saved simulations yet.</p>
            )}
          </aside>

          <main className={mirosharkClass("mirosharkWorkbenchBody")} aria-label="MiroShark workspace">
            {mirosharkWorkspaceMode === "new" ? (
              <section className={mirosharkClass("mirosharkBuilderSurface")} aria-label="MiroShark run builder">
                <div className={mirosharkClass("mirosharkBuilderHeader")}>
                  <div>
                    <p>New simulation</p>
                    <h3>Design the swarm</h3>
                  </div>
                </div>

                <form className={mirosharkClass("mirosharkRunner")} onSubmit={runMirosharkSwarm}>
                  <label className={mirosharkClass("mirosharkScenario")}>
                    <span>Scenario</span>
                    <textarea
                      value={mirosharkScenario}
                      onChange={(event) => setMirosharkScenario(event.target.value)}
                      placeholder="Describe the market, community, launch, crisis, policy fight, prediction market, or decision you want the agents to simulate."
                    />
                  </label>

                  <div className={mirosharkClass("mirosharkRunControls")}>
                    <label>
                      <span>Surface</span>
                      <select value={mirosharkPlatform} onChange={(event) => setMirosharkPlatform(event.target.value as "twitter" | "reddit" | "parallel" | "polymarket")}>
                        <option value="twitter">X / Twitter</option>
                        <option value="reddit">Reddit</option>
                        <option value="polymarket">Polymarket</option>
                        <option value="parallel">X + Reddit + markets</option>
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
                    <Button type="submit" disabled={!mirosharkStatus?.ok || mirosharkRunPending || !mirosharkScenario.trim()} isLoading={mirosharkRunPending}>
                      {mirosharkRunPending ? null : <Activity aria-hidden="true" />}
                      {mirosharkRunPending ? "Starting..." : "Run swarm"}
                    </Button>
                  </div>
                </form>

                <div className={mirosharkClass("mirosharkTemplateShelf")}>
                  <div className={mirosharkClass("mirosharkShelfHeader")}>
                    <span><Sparkles aria-hidden="true" /> Templates</span>
                    <div>
                      <small>{mirosharkTemplates.length ? `${mirosharkTemplates.length} available` : "loading"}</small>
                      <Button type="button" size="sm" variant="ghost" onClick={refreshMirosharkMetadata} disabled={!mirosharkStatus?.ok}>
                        <RefreshCcw aria-hidden="true" />
                        Refresh templates
                      </Button>
                    </div>
                  </div>
                  <div className={mirosharkClass("mirosharkTemplateList")}>
                    {mirosharkTemplates.slice(0, 8).map((template) => (
                      <button
                        type="button"
                        key={template.id ?? template.name}
                        className={mirosharkClass(template.id === mirosharkSelectedTemplateId && "active")}
                        onClick={() => applyMirosharkTemplate(template)}
                      >
                        <strong>{template.name ?? template.id}</strong>
                        <span>{template.category ?? "Simulation"} · {template.difficulty ?? "standard"} · {template.platforms?.join(" + ") ?? "multi-surface"}</span>
                      </button>
                    ))}
                    {!mirosharkTemplates.length ? <p>Connect MiroShark to load templates.</p> : null}
                  </div>
                </div>
              </section>
            ) : null}

            {mirosharkWorkspaceMode === "run" && mirosharkRunIsWorking ? (
              <section className={mirosharkClass("mirosharkRunLoading")} aria-live="polite" aria-busy="true">
                <LottiePlayer src="/animations/Load%20HIVE.lottie" size={60} ariaLabel="MiroShark run in progress" />
                <div>
                  <strong>{mirosharkProgressLabel}</strong>
                  <span>
                    {mirosharkTotalRounds > 0
                      ? `Round ${Math.min(mirosharkCurrentRound, mirosharkTotalRounds)} of ${mirosharkTotalRounds} · ${mirosharkProgressPercent}%`
                      : (mirosharkRun?.message ?? "MiroShark is preparing the swarm")}
                  </span>
                </div>
                <div className={mirosharkClass("mirosharkLoadingRail", mirosharkTotalRounds > 0 && "isDeterminate")} aria-hidden="true">
                  <span style={mirosharkTotalRounds > 0 ? { width: `${mirosharkProgressPercent}%` } : undefined} />
                </div>
              </section>
            ) : null}

            {mirosharkWorkspaceMode === "run" && mirosharkRun ? (
          <section className={mirosharkClass("mirosharkRunResult", mirosharkRun.ok ? "ready" : "failed")}>
            <header>
              <div>
                <p>{mirosharkRun.ok ? (mirosharkRunIsArchived ? "Saved run" : mirosharkRun.status === "started" ? "Run started" : "Run progress") : "Run failed"}</p>
                <h3>{mirosharkRun.simulationId ?? mirosharkRun.message ?? mirosharkRun.error}</h3>
                {mirosharkRunIsArchived && mirosharkRun.archivedAt ? (
                  <span className={mirosharkClass("mirosharkArchiveLoaded")}>Loaded from Obsidian · {mirosharkRun.archivedAt}</span>
                ) : null}
              </div>
              {(mirosharkRun.jobId || mirosharkRun.simulationId) && !mirosharkRunIsArchived ? (
                <Button type="button" size="sm" variant="ghost" onClick={refreshMirosharkRun}>
                  <RefreshCcw aria-hidden="true" />
                  Refresh run
                </Button>
              ) : null}
            </header>
            {mirosharkRun.ok ? (
              <>
                <div className={mirosharkClass("mirosharkRunGrid")}>
                  <span><strong>Step</strong>{mirosharkDisplayStep}</span>
                  <span><strong>Status</strong>{mirosharkDisplayStatus}</span>
                  <span><strong>Progress</strong>{mirosharkTotalRounds > 0 ? `${Math.min(mirosharkCurrentRound, mirosharkTotalRounds)} / ${mirosharkTotalRounds} rounds` : "pending"}</span>
                  <span><strong>Posts</strong>{mirosharkPosts.count}</span>
                  <span><strong>Project</strong>{mirosharkRun.projectId ?? mirosharkRun.archivedSummary?.projectId ?? "saved"}</span>
                  <span><strong>Graph</strong>{mirosharkRun.graphId ?? mirosharkRun.archivedSummary?.graphId ?? "saved"}</span>
                  <span><strong>Surface</strong>{mirosharkRun.platform ?? mirosharkRun.archivedSummary?.platform}</span>
                  <span><strong>Rounds</strong>{mirosharkRun.rounds ?? mirosharkRun.archivedSummary?.rounds ?? (mirosharkTotalRounds || "saved")}</span>
                </div>
                {mirosharkTotalRounds > 0 ? (
                  <div className={mirosharkClass("mirosharkRoundProgress")} aria-label={`MiroShark round progress ${mirosharkProgressPercent}%`}>
                    <div>
                      <span>Round progress</span>
                      <strong>{mirosharkProgressPercent}%</strong>
                    </div>
                    <div>
                      <span style={{ width: `${mirosharkProgressPercent}%` }} />
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}
            {mirosharkRun.error ? <p className={mirosharkClass("mirosharkRunError")}>{mirosharkRun.error}</p> : null}
            {mirosharkRun.links ? (
              <div className={mirosharkClass("mirosharkRunLinks")}>
                {Object.entries(mirosharkRun.links).map(([label, href]) => (
                  <a href={href} target="_blank" rel="noreferrer" key={label}>{label}</a>
                ))}
              </div>
            ) : null}
            <div className={mirosharkClass("mirosharkWorkbenchTabs")} role="tablist" aria-label="MiroShark workbench views">
              {MIROSHARK_WORKBENCH_TABS.map((tab) => (
                <button
                  type="button"
                  key={tab.id}
                  role="tab"
                  aria-selected={mirosharkWorkbenchTab === tab.id}
                  className={mirosharkClass(mirosharkWorkbenchTab === tab.id && "active")}
                  onClick={() => setMirosharkWorkbenchTab(tab.id)}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
            {mirosharkWorkbenchTab === "surface" && (mirosharkPosts.posts.length || mirosharkFeedIsWaiting || mirosharkTimelineItems.length || mirosharkMarketItems.length) ? (
              <div className={mirosharkClass("mirosharkRunFeed", mirosharkFeedIsLive && "isLive")}>
                <div className={mirosharkClass("mirosharkRunFeedHeader")}>
                  <strong>{mirosharkRunIsArchived ? "Saved surfaces" : "Live surfaces"}</strong>
                  <span>
                    {mirosharkFeedIsWaiting
                      ? "listening..."
                      : `timeline order · showing ${mirosharkPosts.count}${mirosharkPosts.sourceCount > mirosharkPosts.count ? ` · ${mirosharkPosts.sourceCount - mirosharkPosts.count} blank hidden` : ""}`}
                  </span>
                </div>
                <div className={mirosharkClass("mirosharkSurfaceSwitch")} role="tablist" aria-label="Simulation surfaces">
                  {[
                    ["x", "X thread", mirosharkPosts.count],
                    ["reddit", "Reddit", mirosharkActionCount],
                    ["polymarket", "Markets", mirosharkMarketCount],
                    ["timeline", "Timeline", mirosharkTimelineItems.length],
                  ].map(([id, label, count]) => (
                    <button
                      type="button"
                      key={String(id)}
                      className={mirosharkClass(mirosharkSurfaceView === id && "active")}
                      onClick={() => setMirosharkSurfaceView(id as MiroSharkSurfaceView)}
                    >
                      {label}
                      <span>{count}</span>
                    </button>
                  ))}
                </div>
                {mirosharkFeedIsWaiting ? (
                  <div className={mirosharkClass("mirosharkFeedLoading")} aria-live="polite">
                    <LottiePlayer src="/animations/Load%20HIVE.lottie" size={56} ariaLabel="Waiting for hive" />
                    <p>Waiting for MiroShark to publish the first posts</p>
                  </div>
                ) : mirosharkSurfaceView === "x" ? (
                  <div className={`${xThreadStyles.surface} ${mirosharkClass("mirosharkXSurfaceMount")}`}>
                    {(() => {
                      const [mainPost, ...comments] = mirosharkPosts.posts;
                      if (!mainPost) return null;
                      const mainReplyCount = comments.length;
                      const mainRepostCount = mainPost.num_shares ?? mirosharkStat(mainPost.post_id, 4, 36);
                      const mainLikeCount = mainPost.num_likes ?? mirosharkStat(mainPost.post_id, 18, 180);
                      const mainViewCount = mirosharkStat(mainPost.post_id, 900, 4200);
                      return (
                        <>
                          <article className={xThreadStyles.mainPost}>
                            <div className={xThreadStyles.postHeader}>
                              <div className={xThreadStyles.avatar} aria-hidden="true">
                                {mirosharkAvatar(mainPost.user_id)}
                              </div>
                              <div>
                                <strong>{mirosharkUserName(mainPost.user_id)}</strong>
                                <span>{mirosharkHandle(mainPost.user_id)}</span>
                              </div>
                              <MoreHorizontal className={xThreadStyles.more} aria-hidden="true" />
                            </div>
                            <p className={xThreadStyles.mainText}>{mainPost.displayText}</p>
                            <div className={xThreadStyles.timestamp}>
                              Round {mainPost.created_at ?? "?"}
                              {typeof mainPost.post_id === "number" ? ` · Post #${mainPost.post_id}` : ""}
                              {" · "}
                              Simulated on X
                            </div>
                            <footer className={xThreadStyles.actions} aria-label="Simulated X engagement">
                              <span><MessageSquare aria-hidden="true" /> {mainReplyCount}</span>
                              <span><Repeat2 aria-hidden="true" /> {mainRepostCount}</span>
                              <span><Heart aria-hidden="true" /> {mainLikeCount}</span>
                              <span><BarChart3 aria-hidden="true" /> {mainViewCount}</span>
                            </footer>
                          </article>

                          <ol className={xThreadStyles.comments} aria-label="Simulated X comments">
                            {comments.map((post, index) => {
                              const replyCount = mirosharkStat(post.post_id, 0, 9);
                              const repostCount = post.num_shares ?? mirosharkStat(post.post_id, 0, 13);
                              const likeCount = post.num_likes ?? mirosharkStat(post.post_id, 1, 42);
                              const viewCount = mirosharkStat(post.post_id, 90, 540);
                              return (
                                <li key={`${post.post_id ?? index}-${post.created_at ?? "tick"}`} className={xThreadStyles.comment}>
                                  <div className={xThreadStyles.avatar} aria-hidden="true">
                                    {mirosharkAvatar(post.user_id)}
                                  </div>
                                  <article>
                                    <header>
                                      <strong>{mirosharkUserName(post.user_id)}</strong>
                                      <span>{mirosharkHandle(post.user_id)}</span>
                                      <span>round {post.created_at ?? "?"}</span>
                                      {typeof post.post_id === "number" ? <span>#{post.post_id}</span> : null}
                                    </header>
                                    <p className={xThreadStyles.replying}>Replying to {mirosharkHandle(mainPost.user_id)}</p>
                                    <p className={xThreadStyles.commentText}>{post.displayText}</p>
                                    <footer className={xThreadStyles.actions} aria-label="Simulated X engagement">
                                      <span><MessageSquare aria-hidden="true" /> {replyCount}</span>
                                      <span><Repeat2 aria-hidden="true" /> {repostCount}</span>
                                      <span><Heart aria-hidden="true" /> {likeCount}</span>
                                      <span><BarChart3 aria-hidden="true" /> {viewCount}</span>
                                    </footer>
                                  </article>
                                </li>
                              );
                            })}
                          </ol>
                        </>
                      );
                    })()}
                  </div>
                ) : mirosharkSurfaceView === "reddit" ? (
                  <div className={mirosharkClass("mirosharkRedditSurface")}>
                    {(mirosharkActionItems.length ? mirosharkActionItems : mirosharkTimelineItems).slice(0, 12).map((item, index) => (
                      <article key={`${compactValue(item)}-${index}`}>
                        <header>
                          <span>r/swarmrehearsal</span>
                          <strong>{String(item.action_type ?? item.type ?? item.event_type ?? `thread ${index + 1}`)}</strong>
                        </header>
                        <p>{String(item.content ?? item.text ?? item.message ?? item.description ?? compactValue(item))}</p>
                        <footer>{String(item.agent_name ?? item.user_name ?? item.platform ?? "MiroShark")} · {String(item.round ?? item.created_at ?? item.timestamp ?? "live")}</footer>
                      </article>
                    ))}
                  </div>
                ) : mirosharkSurfaceView === "polymarket" ? (
                  <div className={mirosharkClass("mirosharkMarketSurface")}>
                    {mirosharkMarketItems.length ? mirosharkMarketItems.map((market, index) => (
                      <article key={`${compactValue(market)}-${index}`}>
                        <div>
                          <span>Market</span>
                          <strong>{String(market.question ?? market.title ?? market.name ?? `Prediction market ${index + 1}`)}</strong>
                        </div>
                        <p>{String(market.description ?? market.resolution_criteria ?? market.status ?? "No market description returned yet.")}</p>
                        <div className={mirosharkClass("mirosharkMarketOdds")}>
                          {payloadPreview(market, 4).map(([key, value]) => <span key={key}>{key}: {value}</span>)}
                        </div>
                      </article>
                    )) : <p className={mirosharkClass("mirosharkEmptyState")}>This run did not return Polymarket markets yet. Use a market-enabled template or the Polymarket surface for the next run.</p>}
                  </div>
                ) : (
                  <div className={mirosharkClass("mirosharkTimelineSurface")}>
                    {mirosharkTimelineItems.map((item, index) => (
                      <article key={`${compactValue(item)}-${index}`}>
                        <span>{String(item.round ?? item.time ?? item.created_at ?? index + 1)}</span>
                        <strong>{String(item.type ?? item.event_type ?? item.platform ?? "event")}</strong>
                        <p>{String(item.content ?? item.text ?? item.message ?? item.description ?? compactValue(item))}</p>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
            {mirosharkWorkbenchTab === "analysis" ? (
              <div className={mirosharkClass("mirosharkAnalysisGrid")}>
                {([
                  ["Belief drift", mirosharkRun.beliefDrift, <LineChart aria-hidden="true" key="belief" />],
                  ["Influence", mirosharkRun.influence, <BarChart3 aria-hidden="true" key="influence" />],
                  ["Network", mirosharkRun.interactionNetwork, <Network aria-hidden="true" key="network" />],
                  ["Demographics", mirosharkRun.demographics, <Users aria-hidden="true" key="demo" />],
                  ["Quality", mirosharkRun.quality, <ShieldCheck aria-hidden="true" key="quality" />],
                  ["Surface stats", mirosharkRun.surfaceStats, <Layers3 aria-hidden="true" key="surface" />],
                ] satisfies Array<[string, unknown, ReactNode]>).map(([title, payload, icon]) => (
                  <article key={String(title)} className={mirosharkClass("mirosharkDataCard")}>
                    <header>{icon}<strong>{String(title)}</strong><span>{payloadCount(payload)} fields</span></header>
                    <div>
                      {payloadPreview(payload).map(([key, value]) => <p key={key}><span>{key}</span>{value}</p>)}
                      {!payloadPreview(payload).length ? <p><span>Status</span>No data returned yet</p> : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
            {mirosharkWorkbenchTab === "agents" ? (
              <div className={mirosharkClass("mirosharkAgentGrid")}>
                {mirosharkProfileItems.length ? mirosharkProfileItems.map((profile, index) => (
                  <article key={`${compactValue(profile)}-${index}`}>
                    <div className={mirosharkClass("mirosharkMiniAvatar")}>{mirosharkAvatar(Number(profile.user_id ?? index))}</div>
                    <div>
                      <strong>{String(profile.name ?? profile.agent_name ?? profile.username ?? `Agent ${index + 1}`)}</strong>
                      <span>{String(profile.role ?? profile.entity_type ?? profile.platform ?? "simulation participant")}</span>
                      <p>{String(profile.bio ?? profile.description ?? profile.personality ?? compactValue(profile))}</p>
                    </div>
                  </article>
                )) : <p className={mirosharkClass("mirosharkEmptyState")}>Profiles will appear here after MiroShark prepares or loads the simulation agents.</p>}
              </div>
            ) : null}
            {mirosharkWorkbenchTab === "experiments" ? (
              <div className={mirosharkClass("mirosharkExperimentPanel")}>
                <article className={mirosharkClass("mirosharkExperimentComposer")}>
                  <FlaskConical aria-hidden="true" />
                  <div>
                    <strong>Director event</strong>
                    <p>Inject a shock into a live run, or use it as the trigger for a fork/counterfactual branch.</p>
                    {!mirosharkStatus?.adminAuth?.configured ? (
                      <div className={mirosharkClass("mirosharkAuthNotice")}>
                        <strong>Publish auth is not set up</strong>
                        <span>{mirosharkStatus?.adminAuth?.hint ?? "MiroShark requires MIROSHARK_ADMIN_TOKEN for publish/export mutation endpoints."}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => runMirosharkAction("configure-admin")}
                          disabled={mirosharkActionPending === "configure-admin" || Boolean(mirosharkStatus?.install.running)}
                        >
                          <PlugZap aria-hidden="true" />
                          {mirosharkActionPending === "configure-admin" ? "Configuring..." : "Configure publish auth"}
                        </Button>
                      </div>
                    ) : null}
                    <textarea
                      value={mirosharkExperimentEvent}
                      onChange={(event) => setMirosharkExperimentEvent(event.target.value)}
                      placeholder="Describe the intervention, shock, rumor, policy change, price move, or public statement."
                    />
                    <div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => runMirosharkExperiment("inject")}
                        disabled={mirosharkRunIsArchived || !mirosharkRun.simulationId || !mirosharkExperimentEvent.trim() || Boolean(mirosharkExperimentPending)}
                        isLoading={mirosharkExperimentPending === "inject"}
                      >
                        Inject event
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => runMirosharkExperiment("fork")}
                        disabled={!mirosharkRun.simulationId || !mirosharkExperimentEvent.trim() || Boolean(mirosharkExperimentPending)}
                        isLoading={mirosharkExperimentPending === "fork"}
                      >
                        Fork run
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => runMirosharkExperiment("branch")}
                        disabled={!mirosharkRun.simulationId || !mirosharkExperimentEvent.trim() || Boolean(mirosharkExperimentPending)}
                        isLoading={mirosharkExperimentPending === "branch"}
                      >
                        Branch counterfactual
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => runMirosharkExperiment("publish")}
                        disabled={!mirosharkRun.simulationId || !mirosharkStatus?.adminAuth?.configured || Boolean(mirosharkExperimentPending)}
                        isLoading={mirosharkExperimentPending === "publish"}
                      >
                        Publish exports
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => runMirosharkExperiment("stop")}
                        disabled={mirosharkRunIsArchived || !mirosharkRun.simulationId || Boolean(mirosharkExperimentPending)}
                        isLoading={mirosharkExperimentPending === "stop"}
                      >
                        Stop live run
                      </Button>
                    </div>
                    {mirosharkExperimentStatus ? <span>{mirosharkExperimentStatus}</span> : null}
                  </div>
                </article>
                <article>
                  <GitBranch aria-hidden="true" />
                  <div>
                    <strong>Branch records</strong>
                    <p>{payloadCount(mirosharkRun.counterfactual)} counterfactual records returned for this run.</p>
                  </div>
                </article>
                <article>
                  <LineChart aria-hidden="true" />
                  <div>
                    <strong>Compare outcomes</strong>
                    <p>Use saved runs to compare posts, influence, belief drift, markets, and lineage after variants are generated.</p>
                  </div>
                </article>
              </div>
            ) : null}
            {mirosharkWorkbenchTab === "observability" ? (
              <div className={mirosharkClass("mirosharkTelemetryPanel")}>
                <div className={mirosharkClass("mirosharkTelemetryStats")}>
                  <span><strong>{mirosharkTelemetryCount}</strong>events</span>
                  <span><strong>{mirosharkLlmCallItems.length}</strong>LLM calls</span>
                  <span><strong>{payloadCount(mirosharkRun?.observabilityStats ?? mirosharkMetadata?.observabilityStats)}</strong>stats</span>
                </div>
                <ol>
                  {mirosharkObservabilityItems.map((event, index) => (
                    <li key={`${compactValue(event)}-${index}`}>
                      <strong>{String(event.event_type ?? event.type ?? event.name ?? `event ${index + 1}`)}</strong>
                      <span>{String(event.message ?? event.status ?? event.phase ?? event.timestamp ?? compactValue(event))}</span>
                    </li>
                  ))}
                  {!mirosharkObservabilityItems.length ? <li><strong>No events yet</strong><span>MiroShark telemetry will appear here when the companion emits observability records.</span></li> : null}
                </ol>
              </div>
            ) : null}
            {mirosharkWorkbenchTab === "exports" ? (
              <div className={mirosharkClass("mirosharkExportPanel")}>
                {!mirosharkStatus?.adminAuth?.configured ? (
                  <div className={mirosharkClass("mirosharkExportAuth")}>
                    <ShieldCheck aria-hidden="true" />
                    <div>
                      <strong>Exports are private until publish auth is configured</strong>
                      <p>{mirosharkStatus?.adminAuth?.hint ?? "MiroShark requires an admin token before a simulation can be published for share/export endpoints."}</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => runMirosharkAction("configure-admin")}
                      disabled={mirosharkActionPending === "configure-admin" || Boolean(mirosharkStatus?.install.running)}
                    >
                      <PlugZap aria-hidden="true" />
                      {mirosharkActionPending === "configure-admin" ? "Configuring..." : "Configure publish auth"}
                    </Button>
                  </div>
                ) : null}
                {[
                  ["Thread JSON", mirosharkRun.links?.thread ?? (mirosharkStatus?.baseUrl && mirosharkRun.simulationId ? `${mirosharkStatus.baseUrl}/api/simulation/${mirosharkRun.simulationId}/thread.json` : "")],
                  ["Thread text", mirosharkStatus?.baseUrl && mirosharkRun.simulationId ? `${mirosharkStatus.baseUrl}/api/simulation/${mirosharkRun.simulationId}/thread.txt` : ""],
                  ["Chart SVG", mirosharkStatus?.baseUrl && mirosharkRun.simulationId ? `${mirosharkStatus.baseUrl}/api/simulation/${mirosharkRun.simulationId}/chart.svg` : ""],
                  ["Reproduce JSON", mirosharkStatus?.baseUrl && mirosharkRun.simulationId ? `${mirosharkStatus.baseUrl}/api/simulation/${mirosharkRun.simulationId}/reproduce.json` : ""],
                  ["Lineage", mirosharkRun.links?.lineage ?? (mirosharkStatus?.baseUrl && mirosharkRun.simulationId ? `${mirosharkStatus.baseUrl}/api/simulation/${mirosharkRun.simulationId}/lineage` : "")],
                  ["Archive folder", mirosharkRun.archivedSummary?.folder ?? ""],
                ].map(([label, href]) => (
                  <a key={label} href={href || undefined} target="_blank" rel="noreferrer" aria-disabled={!href}>
                    <Download aria-hidden="true" />
                    <span>{label}</span>
                  </a>
                ))}
              </div>
            ) : null}
          </section>
            ) : null}
          </main>
        </div>
      </section>
      ) : null}

      {activeView === "wallet" ? (
      <section className={walletClass("walletPanel", "tabPanel")}>
        <div className={walletClass("walletHeader")}>
          <div>
            <p className="eyebrow">Spending safety</p>
            <h2>Wallets</h2>
            <p>
              Decide which agents can spend, how much they can spend, and when they must stop or ask you.
            </p>
          </div>
          <div className={walletClass("walletTotals")} aria-label="Wallet summary">
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

        <div className={walletClass("walletWorkspace")}>
          <aside className={walletClass("walletAgentList")} aria-label="Agent wallet list">
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
                  className={walletClass("walletAgentButton", agent.id === selectedAgent?.id && "active")}
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
            (() => {
              const walletAction = walletActionsByAgent[selectedAgent.id] ?? {};
              return (
            <div className={walletClass("walletDetail")}>
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
                    <div className="rounded-md border border-[rgba(94,234,212,0.2)] bg-[rgba(45,212,191,0.08)] p-3 text-xs text-[var(--foreground)]/85">
                      <strong className="block text-[#99f6e4]">Real wallet controls</strong>
                      <p className="mt-1">
                        Create a local throwaway wallet, fund it with a tiny USDC test amount, then refresh the on-chain balance.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={walletAction.busy}
                          onClick={() => createLocalWallet(selectedAgent.id, selectedWallet.network)}
                        >
                          <WalletCards aria-hidden="true" />
                          Create wallet
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={walletAction.busy}
                          onClick={() => refreshWalletBalance(selectedAgent.id)}
                        >
                          <RefreshCcw aria-hidden="true" />
                          Refresh balance
                        </Button>
                      </div>
                      {selectedWallet.walletAddress ? (
                        <p className="mt-2 break-all text-[0.72rem] text-[var(--muted)]">
                          Deposit address: {selectedWallet.walletAddress}
                        </p>
                      ) : null}
                      {selectedWallet.lastOnchainSyncAt ? (
                        <p className="mt-1 text-[0.72rem] text-[var(--muted)]">
                          Last on-chain check: {formatRelativeTime(selectedWallet.lastOnchainSyncAt)}
                          {selectedWallet.nativeBalance != null ? ` · gas balance ${selectedWallet.nativeBalance.toFixed(6)}` : ""}
                        </p>
                      ) : null}
                      {walletAction.message ? <p className="mt-2 text-[#99f6e4]">{walletAction.message}</p> : null}
                      {walletAction.error ? <p className="mt-2 text-[#fecdd3]">{walletAction.error}</p> : null}
                    </div>
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
                    <details className="w-full rounded-md border border-[rgba(251,113,133,0.28)] bg-[rgba(127,29,29,0.12)] p-3">
                      <summary className="cursor-pointer text-xs font-semibold text-[#fecdd3]">Send USDC</summary>
                      <div className="mt-3 grid gap-2">
                        <input
                          value={walletAction.sendTo ?? ""}
                          onChange={(event) => updateWalletAction(selectedAgent.id, { sendTo: event.target.value })}
                          placeholder="Recipient address"
                          className="rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(10,14,21,0.7)] px-2 py-1 text-xs text-[var(--foreground)]"
                        />
                        <input
                          value={walletAction.sendAmount ?? ""}
                          onChange={(event) => updateWalletAction(selectedAgent.id, { sendAmount: event.target.value })}
                          placeholder={`Amount, max $${selectedWallet.maxPaymentUsd.toFixed(2)}`}
                          className="rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(10,14,21,0.7)] px-2 py-1 text-xs text-[var(--foreground)]"
                        />
                        <input
                          value={walletAction.confirmation ?? ""}
                          onChange={(event) => updateWalletAction(selectedAgent.id, { confirmation: event.target.value })}
                          placeholder="Type SEND_USDC"
                          className="rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(10,14,21,0.7)] px-2 py-1 text-xs text-[var(--foreground)]"
                        />
                        <Button type="button" size="sm" variant="danger" disabled={walletAction.busy} onClick={() => sendWalletUsdc(selectedAgent.id)}>
                          <Send aria-hidden="true" />
                          Send USDC
                        </Button>
                      </div>
                    </details>
                    <details className="w-full rounded-md border border-[rgba(251,113,133,0.28)] bg-[rgba(127,29,29,0.12)] p-3">
                      <summary className="cursor-pointer text-xs font-semibold text-[#fecdd3]">Call x402 API</summary>
                      <div className="mt-3 grid gap-2">
                        <input
                          value={walletAction.x402Url ?? ""}
                          onChange={(event) => updateWalletAction(selectedAgent.id, { x402Url: event.target.value })}
                          placeholder="Paid endpoint URL"
                          className="rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(10,14,21,0.7)] px-2 py-1 text-xs text-[var(--foreground)]"
                        />
                        <select
                          value={walletAction.x402Method ?? "GET"}
                          onChange={(event) => updateWalletAction(selectedAgent.id, { x402Method: event.target.value })}
                          className="rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(10,14,21,0.7)] px-2 py-1 text-xs text-[var(--foreground)]"
                        >
                          <option value="GET">GET</option>
                          <option value="POST">POST</option>
                        </select>
                        <input
                          value={walletAction.x402Confirmation ?? ""}
                          onChange={(event) => updateWalletAction(selectedAgent.id, { x402Confirmation: event.target.value })}
                          placeholder="Type PAY_X402 when approval is needed"
                          className="rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(10,14,21,0.7)] px-2 py-1 text-xs text-[var(--foreground)]"
                        />
                        <Button type="button" size="sm" variant="danger" disabled={walletAction.busy} onClick={() => testX402Fetch(selectedAgent.id)}>
                          <CreditCard aria-hidden="true" />
                          Call x402
                        </Button>
                      </div>
                    </details>
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
              );
            })()
          ) : (
            <div className={walletClass("walletEmpty")}>
              <strong>No agent selected</strong>
              <p>Connect an agent first, then configure its spending limits and survival rails.</p>
            </div>
          )}
        </div>
      </section>
      ) : null}

      {activeView === "vault" ? (
      <section className={vaultClass("vaultPanel", "tabPanel")}>
        <div className={vaultClass("vaultHeader")}>
          <div>
            <p className="eyebrow">Shared brain</p>
            <h2>One memory, many agents</h2>
            <p>Connect an Obsidian vault to give your agents a common place for memory, handoffs, and shared project context.</p>
          </div>
          <Button type="button" size="sm" variant="secondary" onClick={refreshBrainGraph} disabled={brainGraphLoading}>
            <RefreshCcw aria-hidden="true" />
            {brainGraphLoading ? "Reading graph" : "Refresh graph"}
          </Button>
        </div>

        <div className={vaultClass("brainWorkspace")}>
          <section className={vaultClass("brainGraphPanel")} aria-label="Shared brain graph">
            <div className={vaultClass("brainGraphStats")}>
              {[
                ["Notes", brainGraphStats.notes, <FileText aria-hidden="true" key="notes" />],
                ["Links", brainGraphStats.links, <GitBranch aria-hidden="true" key="links" />],
                ["Accessed", brainGraphStats.accessed, <Eye aria-hidden="true" key="accessed" />],
                ["Recent", brainGraphStats.recent, <Clock3 aria-hidden="true" key="recent" />],
              ].map(([label, value, icon]) => (
                <span key={String(label)}>
                  {icon}
                  <strong>{value}</strong>
                  {label}
                </span>
              ))}
            </div>
            <div className={vaultClass("brainLegend")} aria-label="Brain graph legend">
              <span><i className={vaultClass("legendNote")} /> Note</span>
              <span><i className={vaultClass("legendUnresolved")} /> Unresolved link</span>
              <span><i className={vaultClass("legendSelected")} /> Selected</span>
              <span><i className={vaultClass("legendTarget")} /> Target</span>
            </div>

            <div className={vaultClass("brainGraphCanvas")}>
              {visibleBrainNodes.length ? (
                <svg
                  viewBox={`${brainPan.x} ${brainPan.y} ${brainLayout.width} ${brainLayout.height}`}
                  role="img"
                  aria-label="Hive shaped Obsidian graph"
                  onPointerDown={startBrainPan}
                  onPointerMove={moveBrainPan}
                  onPointerUp={endBrainPan}
                  onPointerCancel={endBrainPan}
                  className={vaultClass("draggable")}
                >
                  <defs>
                    <filter id="brainNodeGlow" x="-40%" y="-40%" width="180%" height="180%">
                      <feGaussianBlur stdDeviation="5" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  {visibleBrainNodes.map((node) => {
                    const position = brainLayout.positions.get(node.id);
                    if (!position) return null;
                    const selected = selectedBrainNode?.id === node.id;
                    const target = !selected && selectedBrainTargetIds.has(node.id);
                    const unresolved = node.id.startsWith("unresolved:");
                    const labelLines = splitBrainLabel(node.label);
                    return (
                      <g
                        key={node.id}
                        role="button"
                        tabIndex={0}
                        data-brain-node-id={node.id}
                        aria-label={selected ? `Open ${node.label} in Obsidian` : `Inspect ${node.label}`}
                        className={vaultClass("brainNode", selected && "selected", target && "target", unresolved && "unresolved")}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") void inspectBrainNode(node);
                        }}
                      >
                        <polygon
                          points={brainNodePoints(position.x, position.y, brainLayout.radius)}
                          filter={selected ? "url(#brainNodeGlow)" : undefined}
                        />
                        <text x={position.x} y={position.y - (labelLines.length > 1 ? 11 : 4)} textAnchor="middle">
                          {labelLines.map((line, index) => (
                            <tspan key={`${line}-${index}`} x={position.x} dy={index === 0 ? 0 : 15}>{line}</tspan>
                          ))}
                        </text>
                        <text x={position.x} y={position.y + 31} textAnchor="middle" className={vaultClass("brainNodeMeta")}>
                          {node.accessCount ? `${node.accessCount} reads` : `${node.incoming + node.outgoing} links`}
                        </text>
                      </g>
                    );
                  })}
                  {brainGraph?.links
                    .filter((link) => (
                      selectedBrainNode
                      && (link.source === selectedBrainNode.id || link.target === selectedBrainNode.id)
                      && brainLayout.positions.has(link.source)
                      && brainLayout.positions.has(link.target)
                    ))
                    .filter((link, index, links) => {
                      const selectedId = selectedBrainNode!.id;
                      const otherId = link.source === selectedId ? link.target : link.source;
                      return links.findIndex((candidate) => (
                        (candidate.source === selectedId ? candidate.target : candidate.source) === otherId
                      )) === index;
                    })
                    .slice(0, 24)
                    .map((link, index) => {
                      const selectedId = selectedBrainNode!.id;
                      const otherId = link.source === selectedId ? link.target : link.source;
                      const source = brainLayout.coordsByNode.get(selectedId)!;
                      const target = brainLayout.coordsByNode.get(otherId)!;
                      return (
                        <path
                          key={`${selectedId}-${otherId}-${index}`}
                          data-brain-route={`${selectedId}->${otherId}`}
                          d={brainGraphEdgePath(source, target, brainLayout.positionsByCoord, brainLayout.radius)}
                          className={vaultClass("brainEdgeActive")}
                        />
                      );
                    })}
                </svg>
              ) : (
                <div className={vaultClass("brainEmpty")}>
                  <Hexagon aria-hidden="true" />
                  <strong>No graph loaded</strong>
                  <span>{brainGraphStatus || "Refresh the graph after the vault path is reachable."}</span>
                </div>
              )}
            </div>
            <p className={vaultClass("brainStatus")}>{brainGraphStatus || "Graph waits for the shared vault."}</p>
          </section>

          <aside className={vaultClass("brainInspector")}>
            <div className={vaultClass("brainInspectorHeader")}>
              <span><BrainCircuit aria-hidden="true" /> Note inspector</span>
              <small>{selectedAgent?.name ?? "Dashboard"} is the active accessor</small>
            </div>
            {selectedBrainNode ? (
              <>
                <h3>{selectedBrainNode.label}</h3>
                <p>{selectedBrainNode.folder}</p>
                <dl>
                  <div><dt>Incoming</dt><dd>{selectedBrainNode.incoming}</dd></div>
                  <div><dt>Outgoing</dt><dd>{selectedBrainNode.outgoing}</dd></div>
                  <div><dt>Accesses</dt><dd>{selectedBrainNode.accessCount}</dd></div>
                  <div><dt>Last seen</dt><dd>{formatBrainDate(selectedBrainNode.lastAccessedAt)}</dd></div>
                </dl>
                {selectedBrainNode.tags.length ? (
                  <div className={vaultClass("brainTags")}>
                    {selectedBrainNode.tags.map((tag) => <span key={tag}>#{tag}</span>)}
                  </div>
                ) : null}
                <div className={vaultClass("brainAccessList")}>
                  <strong>Access history</strong>
                  {(selectedBrainNode.recentAccesses.length ? selectedBrainNode.recentAccesses : brainGraph?.recentAccesses.slice(0, 5) ?? []).map((event) => (
                    <article key={event.id}>
                      <Bot aria-hidden="true" />
                      <div>
                        <span>{event.agentName} on {event.machineName}</span>
                        <small>{formatBrainDate(event.accessedAt)} · {event.action} · {event.notePath}</small>
                      </div>
                    </article>
                  ))}
                  {!selectedBrainNode.recentAccesses.length && !brainGraph?.recentAccesses.length ? (
                    <p>No agent access history yet. Click a note to seed the audit trail.</p>
                  ) : null}
                </div>
              </>
            ) : (
              <div className={vaultClass("brainEmpty", "compact")}>
                <Hexagon aria-hidden="true" />
                <strong>Select a hive cell</strong>
                <span>Agent and machine access history will appear here.</span>
              </div>
            )}
          </aside>
        </div>

        <section className={vaultClass("brainSkillsPanel")} aria-label="Shared brain skills">
          <div className={vaultClass("brainSkillsHeader")}>
            <div>
              <p className="eyebrow">Shared skills</p>
              <h3>Operational recipes in the brain</h3>
              <p>The shared brain is the main skills shelf. Provider installs are scanned below and can be mirrored into Obsidian.</p>
            </div>
            <div className={vaultClass("brainSkillsActions")}>
              <Button type="button" size="sm" variant="secondary" onClick={refreshBrainSkills} disabled={brainSkillsLoading || Boolean(brainSkillImportProvider)}>
                {brainSkillsLoading ? <LoaderCircle aria-hidden="true" className={vaultClass("spinIcon")} /> : <RefreshCcw aria-hidden="true" />}
                {brainSkillsLoading ? "Scanning" : "Refresh skills"}
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={() => void importBrainSkills("all")} disabled={Boolean(brainSkillImportProvider)}>
                {brainSkillImportProvider === "all" ? <LoaderCircle aria-hidden="true" className={vaultClass("spinIcon")} /> : brainSkillImportSuccess === "all" ? <Check aria-hidden="true" /> : <Download aria-hidden="true" />}
                {brainSkillImportProvider === "all" ? "Importing" : "Import all"}
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={() => {
                setBrainSkillProviderModalOpen(true);
                if (!brainSkills && !brainSkillsLoading) void refreshBrainSkills();
              }} disabled={Boolean(brainSkillImportProvider)}>
                <Layers3 aria-hidden="true" />
                Import provider
              </Button>
            </div>
          </div>

          {brainSkills?.shared.length ? (
            <div className={vaultClass("sharedSkillGrid")}>
              {brainSkills.shared.slice(0, 12).map((skill) => (
                <article key={skill.id} className={vaultClass("sharedSkillCard")}>
                  <span>{skill.providerLabel}</span>
                  <strong>{skill.name}</strong>
                  <p>{skill.description || "No description in SKILL.md frontmatter yet."}</p>
                  <small>{skill.relativePath}</small>
                </article>
              ))}
            </div>
          ) : (
            <div className={vaultClass("brainSkillsEmpty")}>
              <Sparkles aria-hidden="true" />
              <div>
                <strong>No shared skills yet</strong>
                <p>The vault Skills folder is empty. Import every discovered provider skill, or choose one harness at a time.</p>
              </div>
              <div className={vaultClass("brainSkillsActions")}>
                <Button type="button" size="sm" onClick={() => void importBrainSkills("all")} disabled={Boolean(brainSkillImportProvider)}>
                  {brainSkillImportProvider === "all" ? <LoaderCircle aria-hidden="true" className={vaultClass("spinIcon")} /> : <Download aria-hidden="true" />}
                  Import all providers
                </Button>
                <Button type="button" size="sm" variant="secondary" onClick={() => {
                  setBrainSkillProviderModalOpen(true);
                  if (!brainSkills && !brainSkillsLoading) void refreshBrainSkills();
                }} disabled={Boolean(brainSkillImportProvider)}>
                  <Layers3 aria-hidden="true" />
                  Import specific provider
                </Button>
              </div>
            </div>
          )}

          <div className={vaultClass("providerSkillStrip")}>
            {(brainSkills?.providers ?? BRAIN_SKILL_PROVIDER_FALLBACK).map((provider) => {
              const importable = provider.skills.filter((skill) => !skill.imported).length;
              return (
                <article key={provider.id}>
                  <span>{provider.label}</span>
                  <strong>{provider.skills.length}</strong>
                  <small>{provider.installed ? `${importable} ready to import` : `No ${provider.home} install found`}</small>
                </article>
              );
            })}
          </div>
          <p className={vaultClass("brainStatus")}>{brainSkillsStatus || "Skills scan waits for the shared vault."}</p>
        </section>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
                <div className="rounded-lg border border-[rgba(148,163,184,0.14)] bg-[rgba(10,14,21,0.45)] p-3">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
	                    <div>
	                      <strong className="block text-xs text-[var(--foreground)]">Realtime Tailnet folder sync</strong>
	                      <small className="text-[var(--muted)]">No Obsidian Sync subscription required. Pair Syncthing over Tailscale for Obsidian vaults or any folder; rsync is only the fallback.</small>
	                    </div>
	                    <span className="rounded-full border border-[rgba(20,184,166,0.3)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#99f6e4]">Free over Tailscale</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
                      Tailscale machine
                      <input
                        value={sharedVault.tailnetSyncHost}
                        onChange={(event) => updateSharedVault({ tailnetSyncHost: event.target.value })}
                        placeholder="user@machine or magicdns-name"
                        className="rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(10,14,21,0.7)] px-2 py-1 text-[var(--foreground)]"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
                      Remote vault folder
                      <input
                        value={sharedVault.tailnetSyncPath}
                        onChange={(event) => updateSharedVault({ tailnetSyncPath: event.target.value })}
                        placeholder="~/Documents/Obsidian/Omni-Agent Hivemind Vault"
                        className="rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(10,14,21,0.7)] px-2 py-1 text-[var(--foreground)]"
                      />
                    </label>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-[var(--foreground)]">
                      <input
                        type="checkbox"
                        checked={sharedVault.tailnetSyncEnabled}
                        onChange={(event) => updateSharedVault({ tailnetSyncEnabled: event.target.checked })}
                      />
                      Live sync
                    </label>
                    <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
                      Direction
                      <select
                        value={sharedVault.tailnetSyncDirection}
                        onChange={(event) => updateSharedVault({ tailnetSyncDirection: event.target.value as "bidirectional" | "push" | "pull" })}
                        className="rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(10,14,21,0.7)] px-2 py-1 text-[var(--foreground)]"
                      >
                        <option value="bidirectional">Bidirectional with conflict copies</option>
                        <option value="push">This Mac to Tailnet machine</option>
                        <option value="pull">Tailnet machine to This Mac</option>
                      </select>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
                      Every
                      <input
                        type="number"
                        min={10}
                        max={300}
                        value={sharedVault.tailnetSyncIntervalSeconds}
                        onChange={(event) => updateSharedVault({ tailnetSyncIntervalSeconds: Number(event.target.value) || 20 })}
                        className="w-16 rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(10,14,21,0.7)] px-2 py-1 text-[var(--foreground)]"
                      />
                      sec
                    </label>
	                    <Button type="button" size="sm" variant="secondary" disabled={Boolean(vaultSyncPending)} onClick={pairSyncthingVaultSync}>
	                      {vaultSyncPending === "syncthing" ? "Pairing..." : "Pair realtime sync"}
	                    </Button>
	                    <Button type="button" size="sm" variant="secondary" disabled={Boolean(vaultSyncPending)} onClick={() => runVaultTailnetSync(true)}>
	                      {vaultSyncPending === "dry-run" ? "Checking..." : "Dry run"}
	                    </Button>
                    <Button type="button" size="sm" variant="secondary" disabled={Boolean(vaultSyncPending)} onClick={() => runVaultTailnetSync(false)}>
                      {vaultSyncPending === "sync" ? "Syncing..." : "Sync now"}
                    </Button>
                  </div>
                  {vaultSyncStatus ? (
	                    <p className={`mt-3 text-xs ${vaultSyncStatus.ok ? "text-[#86efac]" : "text-[#fecdd3]"}`}>
	                      {vaultSyncStatus.ok
	                        ? vaultSyncStatus.message ?? `${vaultSyncStatus.dryRun ? "Dry run" : "Sync"} finished. ${vaultSyncStatus.direction === "bidirectional" ? "Merged with" : vaultSyncStatus.direction === "pull" ? "Pulled from" : "Pushed to"} ${sharedVault.tailnetSyncHost || "Tailnet machine"}.${vaultSyncStatus.conflicts?.length ? ` Conflict copies: ${vaultSyncStatus.conflicts.length}.` : ""}`
	                        : vaultSyncStatus.error ?? vaultSyncStatus.stderr ?? "Tailnet sync failed."}
                    </p>
                  ) : null}
                </div>
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
                  Kanban folder
                  <input
                    value={sharedVault.kanbanFolder ?? DEFAULT_SHARED_VAULT.kanbanFolder}
                    onChange={(event) => updateSharedVault({ kanbanFolder: event.target.value })}
                    className="rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(10,14,21,0.7)] px-2 py-1 text-[var(--foreground)]"
                  />
                  <small>The Work board stores `kanban.json` files here so synced machines and agents see the same queue.</small>
                </label>
                <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
                  Notifications folder
                  <input
                    value={sharedVault.notificationsFolder ?? DEFAULT_SHARED_VAULT.notificationsFolder}
                    onChange={(event) => updateSharedVault({ notificationsFolder: event.target.value })}
                    className="rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(10,14,21,0.7)] px-2 py-1 text-[var(--foreground)]"
                  />
                  <small>Agents write markdown notifications here. The dashboard keeps read receipts and settings beside them.</small>
                </label>
                <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
                  <input
                    type="checkbox"
                    checked={sharedVault.noteTaskImportEnabled}
                    onChange={(event) => updateSharedVault({ noteTaskImportEnabled: event.target.checked })}
                  />
                  Auto-import markdown note tasks into Work Ideas
                </label>
                <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
                  Note task folders
                  <textarea
                    value={sharedVault.noteTaskImportFolders ?? DEFAULT_SHARED_VAULT.noteTaskImportFolders}
                    onChange={(event) => updateSharedVault({ noteTaskImportFolders: event.target.value })}
                    rows={3}
                    className="rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(10,14,21,0.7)] px-2 py-1 text-[var(--foreground)]"
                  />
                  <small>Folder-backed notes from Obsidian, Tailnet sync, or another markdown provider can feed unchecked tasks and Next action sections into Ideas.</small>
                </label>
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

      {activeView === "notifications" ? (
      <section className={notificationClass("notificationsPanel", "tabPanel")}>
        <div className={notificationClass("notificationsHeader")}>
          <div>
            <p className="eyebrow">Agent notifications</p>
            <h2>Inbox from the swarm</h2>
            <p>Agents can write markdown notes into the shared Obsidian notification folder when they need your attention.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={() => void refreshNotifications()} disabled={notificationsLoading}>
              <RefreshCcw aria-hidden="true" />
              {notificationsLoading ? "Refreshing" : "Refresh"}
            </Button>
            <Button type="button" size="sm" onClick={markAllNotificationsRead} disabled={!notificationSummary?.unread}>
              <CheckCheck aria-hidden="true" />
              Mark read
            </Button>
          </div>
        </div>

        <div className={notificationClass("notificationsControls")}>
          <div className={notificationClass("notificationStats")}>
            <span><strong>{notificationSummary?.total ?? 0}</strong> total</span>
            <span><strong>{notificationSummary?.unread ?? 0}</strong> unread</span>
            <span><strong>{(notificationSummary?.highUnread ?? 0) + (notificationSummary?.urgentUnread ?? 0)}</strong> high priority</span>
            <span title={notificationSummary?.folder}>/{notificationSummary?.folder ?? sharedVault.notificationsFolder}</span>
          </div>
          <label className={notificationClass("notificationSetting")}>
            <span>
              <strong>Escalate high priority</strong>
              <span>Off by default. If enabled, your agent will send you a message via your preferred messaging channel (e.g. telegram, discord, etc.)</span>
            </span>
            <input
              type="checkbox"
              checked={Boolean(notificationSummary?.settings.highPriorityMessagingEnabled)}
              onChange={(event) => updateNotificationSettings({ highPriorityMessagingEnabled: event.target.checked })}
            />
          </label>
        </div>

        {notifications.length ? (
          <div
            className={notificationClass("notificationList")}
            onScroll={(event) => {
              const target = event.currentTarget;
              if (notificationsLoading || notificationCursor === null) return;
              if (target.scrollHeight - target.scrollTop - target.clientHeight < 220) void refreshNotifications({ append: true });
            }}
          >
            {notificationGroups.map((group) => (
              <section key={group.label} className={notificationClass("notificationDayGroup")}>
                <h3>{group.label}</h3>
                {group.items.map((notification) => (
                  <article
                    key={notification.id}
                    className={notificationClass("notificationCard", notification.priority, !notification.read && "unread")}
                  >
                    <div className={notificationClass("notificationGlyph")}>
                      {notificationIcon(notification.kind, notification.priority)}
                    </div>
                    <div className={notificationClass("notificationBody")}>
                      <div className={notificationClass("notificationMetaRow")}>
                        <div>
                          <h3>{notification.title}</h3>
                          <p>{notification.agentName}{notification.source ? ` · ${notification.source}` : ""}</p>
                        </div>
                        <time>{formatBrainDate(notification.createdAt)}</time>
                      </div>
                      {notification.body ? <p>{notification.body}</p> : null}
                      <div className={notificationClass("notificationFooter")}>
                        <div className={notificationClass("notificationTags")}>
                          <span className={notificationClass("priorityPill", notification.priority)}>{notification.priority}</span>
                          <span className={notificationClass("kindPill")}>{notification.kind}</span>
                          {notification.read ? <span className={notificationClass("readPill")}>read</span> : null}
                          {notification.tags.slice(0, 4).map((tag) => <span className={notificationClass("kindPill")} key={`${notification.id}-${tag}`}>#{tag}</span>)}
                        </div>
                        {!notification.read ? (
                          <Button type="button" size="sm" variant="secondary" onClick={() => markNotificationRead(notification.id)}>
                            <Check aria-hidden="true" />
                            Read
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
              </section>
            ))}
            {notificationCursor !== null ? (
              <Button type="button" variant="secondary" onClick={() => void refreshNotifications({ append: true })} disabled={notificationsLoading}>
                {notificationsLoading ? "Loading..." : "Load more"}
              </Button>
            ) : null}
          </div>
        ) : (
          <div className={notificationClass("notificationsEmpty")}>
            <div>
              <Bell aria-hidden="true" />
              <strong>No notifications yet</strong>
              <p>When an agent writes to the vault folder, this tab will pick it up and the sidebar badge will light up.</p>
            </div>
          </div>
        )}
        <p className={notificationClass("notificationStatus")}>{notificationsStatus || "Notifications sync from Obsidian markdown."}</p>
      </section>
      ) : null}

      {activeView === "chat" ? (
        <section className={chatClass("workspace", "tabPanel")}>
          <aside className={chatClass("settings")}>
            <div className={chatClass("settingsHeader")}>
              <div>
                <p className="eyebrow">Chat</p>
                <h2>Machines</h2>
              </div>
              <span className={chatClass("runtimeBadge")}>{displayAgents.length} agents</span>
            </div>

            <TooltipProvider>
              <div className={chatClass("machineTree")}>
                {chatSidebarTree.length > 0 ? chatSidebarTree.map((machine) => (
                  <details className={chatClass("machineTreeNode")} key={machine.key} open>
                    <summary>
                      <span className={chatClass("treeDisclosure")} aria-hidden="true" />
                      <Monitor className={chatClass("treeIcon")} aria-hidden="true" />
                      <span className={chatClass("treeLabel")}>{machine.name}</span>
                      <span className={chatClass("treeMeta")}>{machine.detail}</span>
                      {machine.onStartChat ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className={chatClass("treeChatButton")}
                              aria-label={`Start chat on ${machine.name}`}
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                machine.onStartChat?.();
                              }}
                            >
                              <MessageSquare aria-hidden="true" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top">{`New chat in ${machine.name}`}</TooltipContent>
                        </Tooltip>
                      ) : null}
                    </summary>
                    <div className={chatClass("machineTreeChildren")}>
                      {machine.folders.length > 0 ? machine.folders.map((folder) => (
                        <details className={chatClass("machineFolderNode")} key={folder.key} open>
                          <summary>
                            <span className={chatClass("treeDisclosure")} aria-hidden="true" />
                            <Folder className={chatClass("treeIcon")} aria-hidden="true" />
                            <span className={chatClass("treeLabel")}>{folder.label}</span>
                            {folder.onStartChat ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    className={chatClass("treeChatButton")}
                                    aria-label={`Start chat in ${folder.label}`}
                                    onClick={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      folder.onStartChat?.();
                                    }}
                                  >
                                    <MessageSquare aria-hidden="true" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top">{`New chat in ${folder.label}`}</TooltipContent>
                              </Tooltip>
                            ) : null}
                          </summary>
                          <div className={chatClass("machineChatLeaves")}>
                            {(expandedChatFolders.has(folder.key) ? folder.chats : folder.chats.slice(0, 4)).map((chat) => (
                              <button
                                type="button"
                                key={chat.key}
                                className={chatClass(chat.active && "active")}
                                aria-current={chat.active ? "true" : undefined}
                                onClick={chat.onOpen}
                              >
                                <span>{chat.title}</span>
                                {chat.updatedAt ? <time>{formatRelativeTime(chat.updatedAt)}</time> : null}
                                <small>{chat.subtitle}</small>
                              </button>
                            ))}
                            {!expandedChatFolders.has(folder.key) && folder.chats.length > 4 ? (
                              <button
                                type="button"
                                className={chatClass("machineChatShowMore")}
                                onClick={() => setExpandedChatFolders((current) => new Set(current).add(folder.key))}
                              >
                                Show {folder.chats.length - 4} more
                              </button>
                            ) : null}
                            {folder.chats.length === 0 ? (
                              <span className={chatClass("machineTreeEmpty")}>No chats yet</span>
                            ) : null}
                          </div>
                        </details>
                      )) : (
                        <div className={chatClass("machineTreeEmpty")}>No chats yet</div>
                      )}
                    </div>
                  </details>
                )) : (
                  <div className={chatClass("emptyMachineChat")}>
                    <strong>No machines yet</strong>
                    <p>Connect a machine from Agents, then come back here to start chatting.</p>
                  </div>
                )}
              </div>
            </TooltipProvider>

            {selectedAgent ? (
            <>
            <details className={chatClass("advancedSettings")}>
              <summary>Manual setup</summary>
              <div className={chatClass("advancedFields")}>
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

                <label className={fleetClass("toggleRow")}>
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

            </>
            ) : null}
          </aside>

          {selectedAgent ? (
          <section className={chatClass("chat")}>
            <div className={chatClass("chatHeader")}>
              <div>
                <p className="eyebrow">Live conversation</p>
                <h2>{selectedAgent.name}</h2>
                <div className={chatClass("chatContextControls")} ref={chatContextMenuRef}>
                  <div className={chatClass("chatContextControl")}>
                    <button
                      type="button"
                      title="Choose the machine and agent for this chat"
                      onClick={() => setChatContextMenu((current) => current === "machine" ? "" : "machine")}
                    >
                      <Monitor aria-hidden="true" />
                      {selectedChatMachine?.name ?? selectedAgent.machineName ?? "Choose machine"}
                      <span>{selectedAgent.name}</span>
                    </button>
                    {chatContextMenu === "machine" ? (
                      <div className={chatClass("chatContextMenu")} role="menu">
                        {chatSidebarTree.flatMap((machine) => {
                          const group = machineGroups.find((item) => item.key === machine.key);
                          return (group?.agents ?? []).map((agent) => (
                            <button
                              type="button"
                              role="menuitem"
                              key={`${machine.key}-${agent.id}`}
                              onClick={() => {
                                startAgentChat(agent.id, { fresh: true, chatLeafKey: `machine-${machine.key}-${agent.id}` });
                                setChatContextMenu("");
                              }}
                            >
                              <Monitor aria-hidden="true" />
                              <span>{machine.name}</span>
                              <small>{agent.name}</small>
                            </button>
                          ));
                        })}
                      </div>
                    ) : null}
                  </div>
                  <div className={chatClass("chatContextControl")}>
                    <button
                      type="button"
                      title="Choose the working directory for this chat"
                      onClick={() => setChatContextMenu((current) => current === "directory" ? "" : "directory")}
                    >
                      <Folder aria-hidden="true" />
                      {selectedChatDirectory || "Choose directory"}
                    </button>
                    {chatContextMenu === "directory" ? (
                      <div className={chatClass("chatContextMenu")} role="menu">
                        {(selectedChatMachine?.folders.length ? selectedChatMachine.folders : chatSidebarTree.flatMap((machine) => machine.folders)).map((folder) => (
                          <button
                            type="button"
                            role="menuitem"
                            key={folder.key}
                            onClick={() => {
                              folder.onStartChat?.();
                              setChatContextMenu("");
                            }}
                          >
                            <Folder aria-hidden="true" />
                            <span>{folder.label}</span>
                            <small>{folder.chats.length ? `${folder.chats.length} chats` : "New chat"}</small>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
              <Button type="button" variant="secondary" onClick={() => checkStatus()}>
                <Activity aria-hidden="true" />
                Check status
              </Button>
            </div>
            {sessionNotice && visibleMessages.length > 0 ? (
              <div className={chatClass("chatSessionNote")}>
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
            <div className={chatClass("messages", visibleMessages.length === 0 && "empty")}>
              {visibleMessages.length === 0 ? (
                <div className={chatClass("chatEmptyPrompt")}>
                  <strong>No messages yet</strong>
                  <p>Messages with {selectedAgent.name} will appear here.</p>
                </div>
              ) : null}
              {visibleMessages.map((message, index) => (
                <div className={chatClass("message", message.role)} key={`${message.role}-${index}`}>
                  <span className={chatClass("messageRole")}>{message.role}</span>
                  <MessageAttachments attachments={message.attachments} />
                  {message.content ? (
                    <ChatMarkdown text={message.content} />
                  ) : (
                    <p>{message.role === "assistant" && busy ? "Waiting for response..." : ""}</p>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} aria-hidden="true" />
            </div>
            {visibleMessages.length === 0 ? (
              <div className={chatClass("chatSuggestions")} aria-label="Suggested prompts">
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
              <div className={chatClass("chatComposerField")}>
                <input
                  ref={chatFileInputRef}
                  type="file"
                  multiple
                  className={chatClass("chatFileInput")}
                  onChange={handleChatImageChange}
                  disabled={busy}
                />
                <input
                  ref={chatImageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className={chatClass("chatFileInput")}
                  onChange={handleChatFileChange}
                  disabled={busy}
                />
                {chatAttachments.length > 0 ? (
                  <div className={chatClass("attachmentTray")}>
                    {chatAttachments.map((attachment) => (
                      <div className={chatClass("attachmentPill")} key={attachment.id}>
                        <span>{attachment.kind === "image" ? "Image" : attachment.kind === "audio" ? "Audio" : "File"}</span>
                        <strong>{attachment.name}</strong>
                        <small>{attachmentSizeLabel(attachment.size)}</small>
                        <button type="button" aria-label={`Remove ${attachment.name}`} onClick={() => removeChatAttachment(attachment.id)} disabled={busy}>
                          <X aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
                <textarea
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder={`Ask ${selectedAgent.name} to do something...`}
                  disabled={busy}
                />
                {recording ? (
                  <div className={chatClass("voiceRecorder")} aria-live="polite">
                    <div className={chatClass("voiceWaveform")} aria-hidden="true">
                      {voiceBands.map((level, index) => (
                        <span key={index} style={{ transform: `scaleY(${0.18 + level * 1.8})` }} />
                      ))}
                    </div>
                    <span>{voiceTranscript || "Listening..."}</span>
                  </div>
                ) : null}
                <div className={chatClass("composerTools")}>
                  <div className={chatClass("attachmentMenuWrap")} ref={attachmentMenuRef}>
                    <button
                      type="button"
                      className={chatClass("composerIconButton")}
                      onClick={() => setAttachmentMenuOpen((open) => !open)}
                      disabled={busy}
                      aria-label="Add attachment"
                      aria-expanded={attachmentMenuOpen}
                    >
                      <Plus aria-hidden="true" />
                    </button>
                    {attachmentMenuOpen ? (
                      <div className={chatClass("attachmentMenu")} role="menu">
                        <button type="button" role="menuitem" onClick={() => chatImageInputRef.current?.click()}>
                          <Paperclip aria-hidden="true" />
                          Images
                        </button>
                        <button type="button" role="menuitem" onClick={() => chatFileInputRef.current?.click()}>
                          <FileUp aria-hidden="true" />
                          Files
                        </button>
                      </div>
                    ) : null}
                  </div>
                  {attachmentError ? <span role="status">{attachmentError}</span> : null}
                  <div className={chatClass("composerActions")}>
                  <button
                    type="button"
                    className={chatClass("composerIconButton", recording && "recording")}
                    onClick={recording ? stopAudioRecording : startAudioRecording}
                    disabled={busy}
                    aria-label={recording ? "Stop recording" : "Record audio"}
                  >
                    <Mic aria-hidden="true" />
                  </button>
                  <button
                    type="submit"
                    className={chatClass("composerIconButton", "sendButton")}
                    disabled={busy || (!text.trim() && chatAttachments.length === 0)}
                    aria-label={busy ? hasStreamingChunk ? "Streaming" : "Waiting" : "Send message"}
                  >
                    {busy ? hasStreamingChunk ? "…" : "·" : <ArrowUp aria-hidden="true" />}
                  </button>
                  </div>
                </div>
              </div>
            </form>
            <p className="hint">
              Last assistant response: {lastAssistant ? `${lastAssistant.slice(0, 120)}...` : "none yet"}
            </p>
          </section>
          ) : (
          <section className={chatClass("chat", "chatEmptyState")}>
            <strong>No machine selected</strong>
            <p>Choose a connected machine on the left to start a chat.</p>
          </section>
          )}
        </section>
      ) : null}
        </div>

      {brainSkillProviderModalOpen ? (
        <div
          className={vaultClass("skillsModalBackdrop")}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !brainSkillImportProvider) setBrainSkillProviderModalOpen(false);
          }}
        >
          <section className={vaultClass("skillsModal")} role="dialog" aria-modal="true" aria-labelledby="skills-modal-title">
            <div className={vaultClass("skillsModalHeader")}>
              <div>
                <h2 id="skills-modal-title">Import skills by provider</h2>
                <p>Each import mirrors discovered `SKILL.md` folders into the shared Obsidian brain and refreshes this view.</p>
              </div>
              <button type="button" onClick={() => setBrainSkillProviderModalOpen(false)} disabled={Boolean(brainSkillImportProvider)} aria-label="Close skills import modal">
                <X aria-hidden="true" />
              </button>
            </div>
            <div className={vaultClass("providerImportList")}>
              {(brainSkills?.providers ?? BRAIN_SKILL_PROVIDER_FALLBACK).map((provider) => {
                const importable = provider.skills.filter((skill) => !skill.imported).length;
                const pending = brainSkillImportProvider === provider.id;
                const success = brainSkillImportSuccess === provider.id;
                return (
                  <article key={provider.id} className={vaultClass("providerImportRow")}>
                    <div>
                      <strong>{provider.label}</strong>
                      <span>{provider.skills.length} found · {importable} importable · {provider.home}</span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={!importable || Boolean(brainSkillImportProvider)}
                      onClick={() => void importBrainSkills(provider.id)}
                    >
                      {pending ? <LoaderCircle aria-hidden="true" className={vaultClass("spinIcon")} /> : success ? <Check aria-hidden="true" /> : <Download aria-hidden="true" />}
                      {pending ? "Importing" : success ? "Synced" : importable ? "Import" : "Current"}
                    </Button>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      ) : null}

      {roleModalAgent || agentCreateMachine ? (
        <div
          className={fleetClass("setupModalBackdrop")}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeAgentSettingsModal();
          }}
        >
          <section className={fleetClass("setupModal", "agentSettingsModal")} role="dialog" aria-modal="true" aria-labelledby="agent-settings-title">
            <div className={fleetClass("setupModalHeader")}>
              <div>
                <p className="eyebrow">{agentSettingsTitle}</p>
                {agentCreateMachine ? (
                  <div className={fleetClass("agentNameEdit")}>
                    <input
                      id="agent-settings-title"
                      value={agentCreateDraft.name}
                      onChange={(event) => setAgentCreateDraft((current) => ({ ...current, name: event.target.value }))}
                      aria-label="Agent name"
                      placeholder={`${RUNTIME_LABELS[agentCreateDraft.runtime]} on ${agentCreateMachine.name}`}
                      autoFocus
                    />
                  </div>
                ) : agentRenameEditing && roleModalAgent ? (
                  <form
                    className={fleetClass("agentNameEdit")}
                    onSubmit={(event) => {
                      event.preventDefault();
                      const nextName = agentRenameDraft.trim();
                      if (!nextName) return;
                      updateAgentProfile(roleModalAgent.id, { name: nextName });
                      setAgentRenameEditing(false);
                    }}
                  >
                    <input
                      id="agent-settings-title"
                      value={agentRenameDraft}
                      onChange={(event) => setAgentRenameDraft(event.target.value)}
                      aria-label="Agent name"
                      autoFocus
                    />
                    <button type="submit" aria-label="Save agent name" disabled={!agentRenameDraft.trim()}>
                      <Check aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label="Cancel agent name edit"
                      onClick={() => {
                        setAgentRenameDraft(roleModalAgent.name);
                        setAgentRenameEditing(false);
                      }}
                    >
                      <X aria-hidden="true" />
                    </button>
                  </form>
                ) : roleModalAgent ? (
                  <div className={fleetClass("agentNameDisplay")}>
                    <h2 id="agent-settings-title">{roleModalAgent.name}</h2>
                    <button
                      type="button"
                      aria-label="Rename agent"
                      onClick={() => {
                        setAgentRenameDraft(roleModalAgent.name);
                        setAgentRenameEditing(true);
                      }}
                    >
                      <Pencil aria-hidden="true" />
                    </button>
                  </div>
                ) : null}
                <p>{agentSettingsDescription}</p>
              </div>
              <Button type="button" variant="ghost" aria-label="Close agent settings" onClick={closeAgentSettingsModal}>
                <X aria-hidden="true" />
                Close
              </Button>
            </div>

            <div className={fleetClass("agentSettingsGrid")}>
              {agentCreateMachine ? (
                <label className={fleetClass("agentSettingsField")}>
                  <span>Runtime</span>
                  <select
                    value={agentCreateDraft.runtime}
                    onChange={(event) => {
                      const runtime = event.target.value as AgentRuntime;
                      setAgentCreateDraft((current) => ({
                        ...current,
                        runtime,
                        beeRole: runtime === "openclaw" ? "queen" : current.beeRole === "queen" ? "worker" : current.beeRole,
                      }));
                    }}
                  >
                    {Object.entries(RUNTIME_LABELS).map(([runtime, label]) => (
                      <option value={runtime} key={runtime}>{label}</option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className={fleetClass("agentSettingsField")}>
                <span>Colony role</span>
                <select
                  value={agentSettingsRole}
                  onChange={(event) => {
                    const beeRole = event.target.value as BeeAgentRole;
                    if (agentCreateMachine) {
                      setAgentCreateDraft((current) => ({ ...current, beeRole }));
                    } else if (roleModalAgent) {
                      updateAgentProfile(roleModalAgent.id, { beeRole });
                    }
                  }}
                >
                  {BEE_AGENT_ROLES.map((role) => <option value={role.id} key={role.id}>{role.label}</option>)}
                </select>
              </label>
              <label className={fleetClass("agentSettingsField")}>
                <span>Worker class</span>
                <select
                  value={agentSettingsWorkerClass}
                  onChange={(event) => {
                    const workerClass = event.target.value as BeeWorkerClass;
                    if (agentCreateMachine) {
                      setAgentCreateDraft((current) => ({ ...current, workerClass }));
                    } else if (roleModalAgent) {
                      updateAgentProfile(roleModalAgent.id, { workerClass });
                    }
                  }}
                  disabled={agentSettingsRole === "observer" || agentSettingsRole === "human"}
                >
                  {BEE_WORKER_CLASSES.map((workerClass) => <option value={workerClass.id} key={workerClass.id}>{workerClass.label}</option>)}
                </select>
              </label>
            </div>

            <div className={fleetClass("setupModalActions")}>
              <Button type="button" onClick={agentCreateMachine ? createAgentFromModal : closeAgentSettingsModal}>
                <Check aria-hidden="true" />
                {agentCreateMachine ? "Add agent" : "Done"}
              </Button>
            </div>
          </section>
        </div>
      ) : null}

      {setupMachine ? (
        <div
          className={fleetClass("setupModalBackdrop")}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSetupMachineKey("");
          }}
        >
          <section className={fleetClass("setupModal")} role="dialog" aria-modal="true" aria-labelledby="setup-modal-title">
            <div className={fleetClass("setupModalHeader")}>
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

            <div className={fleetClass("setupGuide")}>
              {/* Progressive five-step setup, "activating cells in a hive" — rule from the
                  design philosophy's Setup Rules section. */}
              <SetupCell
                title="Add this machine"
                subtitle="Run setup, let the collector report in, then tune optional rails."
                steps={((): SetupStep[] => {
                  const steps: SetupStep[] = [
                    { label: "Connect", hint: "Open Terminal on the machine and run the setup command.", state: "current" },
                    {
                      label: "Verify",
                      hint: "We auto-detect the collector once it starts.",
                      state: "pending",
                      action: (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="h-7 px-2.5 text-[0.7rem]"
                          onClick={copySetupCommand}
                        >
                          {setupCommandCopied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                          {setupCommandCopied ? "Copied" : "Copy command"}
                        </Button>
                      ),
                    },
                    { label: "Configure features", hint: "Wallet caps, provider keys, x402, and debug only when you need them.", state: "pending" },
                  ];
                  if (setupMachine?.collector === "ready") {
                    steps[0].state = "done";
                    steps[1].state = "done";
                    steps[2].state = "current";
                  }
                  return steps;
                })()}
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

            <div className={fleetClass("setupModalActions")}>
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
