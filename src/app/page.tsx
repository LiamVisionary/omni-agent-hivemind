"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type PointerEvent, type ReactNode, type RefObject } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import {
  Activity,
  AlignLeft,
  ArrowUp,
  Bell,
  Bot,
  BrainCircuit,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CircleAlert,
  Copy,
  CopyPlus,
  Cpu,
  Download,
  Eye,
  FileText,
  FlaskConical,
  Folder,
  FolderOpen,
  FolderPlus,
  FileUp,
  GitBranch,
  HandCoins,
  Hexagon,
  KanbanSquare,
  Layers3,
  LineChart,
  List,
  LoaderCircle,
  Link,
  MessageSquare,
  Monitor,
  Network,
  Plus,
  PlugZap,
  RefreshCcw,
  Repeat2,
  Puzzle,
  RotateCcw,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Search,
  Paperclip,
  Pencil,
  Mic,
  Trash2,
  Upload,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import type { AgentProfile, AgentRuntime, BeeWorkerClass, CustomWorkerClassProfile, RuntimeCapabilities, SharedVaultConfig } from "@/lib/types/agent-runtime";
import type { AgentNotification, AgentNotificationSettings, AgentNotificationSummary } from "@/lib/types/agent-notifications";
import { createAgentProfile, DEFAULT_SHARED_VAULT, RUNTIME_CAPABILITIES, RUNTIME_DEFAULTS, RUNTIME_KINDS, RUNTIME_LABELS } from "@/lib/types/agent-runtime";
import type { AgentPaymentProvider, AgentWalletConfig, HoneyTreasuryConfig } from "@/lib/types/agent-wallet";
import type { KanbanBoard, KanbanLinkedDirectory, KanbanMachineTarget, KanbanStatus, KanbanTask, KanbanTaskAttachment } from "@/lib/types/kanban";
import { KANBAN_COLUMNS } from "@/lib/types/kanban";
import { AGENT_PAYMENT_PROVIDER_COPY } from "@/lib/config/agent-payments";
import { beeRoleIconPath } from "@/lib/config/bee-role-icons";
import { BEE_WORKER_PRESET_LIST, beeWorkerPreset } from "@/lib/config/bee-worker-presets";
import { logClientTelemetry } from "@/lib/utils/client-telemetry";
import {
  buildAgentPaymentPrompt,
  createDefaultAgentWallet,
  createDefaultHoneyTreasuryConfig,
  getHoneyAgentRewards,
  getSurvivalSnapshot,
  normalizeMoney,
} from "@/lib/utils/agent-wallet";
import { groupKanbanTasks } from "@/lib/utils/kanban-board";
import {
  beeRoleLabel,
  beeWorkerClassLabel,
  chooseBeeAssignment,
} from "@/lib/services/orchestration/bee-roles";
import chatStyles from "./chat.module.css";
import fleetStyles from "./fleet.module.css";
import kanbanStyles from "./kanban-board.module.css";
import notificationStyles from "./notifications.module.css";
import vaultStyles from "./vault.module.css";
import walletStyles from "./wallets.module.css";
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
  type AgentTaskRow,
  type CellMenuItem,
  type SetupStep,
} from "@/components/cells";
import { AgentWalletCard } from "@/components/wallet/AgentWalletCard";
import { AgentWalletCardCompact } from "@/components/wallet/AgentWalletCardCompact";
import { FleetView, type FleetAgent, type FleetAlert, type FleetMachine, type FleetTask } from "@/components/fleet";
import { SchedulerView, type SchedulerJob, type SchedulerRunPhase, type SchedulerRunState } from "@/components/scheduler";
import { TaskModal, type NewTaskPayload } from "@/components/task-modal";
import {
  SwarmView,
  type SwarmAgent,
  type SwarmDecision,
  type SwarmMarket,
  type SwarmRun,
  type SwarmSocialPost,
  type SwarmTemplate,
  type TemplateId,
} from "@/components/swarm";

type GatewayStatus = {
  ok?: boolean;
  runtime?: AgentRuntime;
  status?: number;
  payload?: unknown;
  error?: string;
};

type RuntimeIntegrationKey =
  | "sessionSearch"
  | "backgroundTasks"
  | "xSearch"
  | "socialPosting"
  | "videoGeneration"
  | "codexRuntime"
  | "kanbanDecompose";

type RuntimeIntegrationStatus = {
  runtime: AgentRuntime;
  capabilities: RuntimeCapabilities;
  integrations: Record<RuntimeIntegrationKey, {
    supported: boolean;
    enabled: boolean;
    detail: string;
  }>;
  diagnostics: string[];
};

type RuntimeSessionSearchResult = {
  id: string;
  runtime: AgentRuntime;
  title: string;
  source?: string;
  model?: string | null;
  startedAt?: string;
  updatedAt?: string;
  excerpt: string;
  path?: string;
};

type RuntimeSetupAction = {
  id: string;
  label: string;
  action: string;
  input?: Record<string, unknown>;
};

type RuntimeSetupDefinition = {
  title: string;
  description: string;
  steps: string[];
  actions: RuntimeSetupAction[];
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
  createdAt?: number;
  kanbanTaskId?: string;
  surface?: "chat" | "kanban" | "scheduler";
  sourceSessionId?: string;
  sourceIndex?: number;
  attachments?: ChatAttachment[];
};

type KanbanPickupPreview = {
  icon: string;
  label: string;
  assignee: string;
};

type WorkspaceGitSnapshot = {
  signature: string;
  head: string;
  dirty: boolean;
  statusLines: string[];
};

type KanbanTaskPatch = Omit<Partial<KanbanTask>, "reviewedAt" | "undoRequestedAt"> & {
  reviewedAt?: number | null;
  undoRequestedAt?: number | null;
};

type ChatAttachment = KanbanTaskAttachment;

type LinkedDirectory = KanbanLinkedDirectory;

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
  workingDirectory?: string;
};

type SchedulerStep = {
  id: string;
  text: string;
  skills: string[];
  paths: string[];
  model: string;
};

type AgentSchedule = {
  id: string;
  name: string;
  agentId: string;
  enabled: boolean;
  every: string;
  mode: "prompt" | "steps";
  prompt: string;
  model?: string;
  skills: string[];
  paths: string[];
  steps: SchedulerStep[];
  createdAt: number;
  updatedAt: number;
  lastRunAt?: number;
  externalSource?: AgentRuntime | "dashboard";
  externalJobId?: string;
  lastStatus?: string;
  lastSummary?: string;
  usePastRuns?: boolean;
  pastRunLimit?: number;
  sharedSchedulePath?: string;
  sharedRunFolder?: string;
};

type ScheduleDraft = {
  name: string;
  agentId: string;
  every: string;
  mode: "prompt" | "steps";
  prompt: string;
  model: string;
  skills: string[];
  paths: string[];
  steps: SchedulerStep[];
  usePastRuns: boolean;
  pastRunLimit: number;
};

const SCHEDULE_PRESETS = ["5m", "15m", "30m", "1h", "2h", "6h", "12h", "24h"] as const;

const SCHEDULER_DYNAMIC_SKILL_ACTIONS_ENABLED = false;
const SCHEDULER_HERMES_SKILL_CONTEXT_ENABLED = false;

const SCHEDULER_MODEL_OPTIONS = [
  { value: "", label: "Default" },
  { value: "xai/grok-4-1-fast-non-reasoning", label: "Grok Fast" },
  { value: "xai/grok-4-1", label: "Grok 4.1" },
  { value: "anthropic/claude-sonnet-4-6", label: "Sonnet 4.6" },
  { value: "anthropic/claude-haiku-4-5-20251001", label: "Haiku 4.5" },
  { value: "openai/gpt-5.2", label: "GPT-5.2" },
  { value: "google/gemini-3-flash", label: "Gemini Flash" },
] as const;

const HETZNER_SERVER_TYPE_OPTIONS = [
  { value: "cx23", label: "CX23", detail: "x86 shared CPU · small general node", monthlyEur: 3.99, cores: 2, memoryGb: 4, diskGb: 40, cpu: "Intel/AMD shared" },
  { value: "cx33", label: "CX33", detail: "x86 shared CPU · medium general node", monthlyEur: 6.99, cores: 4, memoryGb: 8, diskGb: 80, cpu: "Intel/AMD shared" },
  { value: "cx43", label: "CX43", detail: "x86 shared CPU · larger general node", monthlyEur: 13.99, cores: 8, memoryGb: 16, diskGb: 160, cpu: "Intel/AMD shared" },
  { value: "cx53", label: "CX53", detail: "x86 shared CPU · high-memory general node", monthlyEur: 27.99, cores: 16, memoryGb: 32, diskGb: 320, cpu: "Intel/AMD shared" },
  { value: "cax11", label: "CAX11", detail: "ARM shared CPU · low-cost node", monthlyEur: 4.49, cores: 2, memoryGb: 4, diskGb: 40, cpu: "Ampere ARM shared" },
  { value: "cax21", label: "CAX21", detail: "ARM shared CPU · medium node", monthlyEur: 8.99, cores: 4, memoryGb: 8, diskGb: 80, cpu: "Ampere ARM shared" },
  { value: "cax31", label: "CAX31", detail: "ARM shared CPU · larger node", monthlyEur: 16.99, cores: 8, memoryGb: 16, diskGb: 160, cpu: "Ampere ARM shared" },
  { value: "cax41", label: "CAX41", detail: "ARM shared CPU · high-memory node", monthlyEur: 31.49, cores: 16, memoryGb: 32, diskGb: 320, cpu: "Ampere ARM shared" },
  { value: "cpx11", label: "CPX11", detail: "AMD shared CPU · compact node", monthlyEur: 5.99, cores: 2, memoryGb: 2, diskGb: 40, cpu: "AMD shared" },
  { value: "cpx21", label: "CPX21", detail: "AMD shared CPU · small node", monthlyEur: 11.99, cores: 3, memoryGb: 4, diskGb: 80, cpu: "AMD shared" },
  { value: "cpx31", label: "CPX31", detail: "AMD shared CPU · medium node", monthlyEur: 20.99, cores: 4, memoryGb: 8, diskGb: 160, cpu: "AMD shared" },
  { value: "cpx41", label: "CPX41", detail: "AMD shared CPU · larger node", monthlyEur: 38.99, cores: 8, memoryGb: 16, diskGb: 240, cpu: "AMD shared" },
  { value: "cpx51", label: "CPX51", detail: "AMD shared CPU · high-memory node", monthlyEur: 77.99, cores: 16, memoryGb: 32, diskGb: 360, cpu: "AMD shared" },
  { value: "ccx13", label: "CCX13", detail: "AMD dedicated CPU · small worker", monthlyEur: 16.99, cores: 2, memoryGb: 8, diskGb: 80, cpu: "AMD dedicated" },
  { value: "ccx23", label: "CCX23", detail: "AMD dedicated CPU · medium worker", monthlyEur: 33.99, cores: 4, memoryGb: 16, diskGb: 160, cpu: "AMD dedicated" },
  { value: "ccx33", label: "CCX33", detail: "AMD dedicated CPU · large worker", monthlyEur: 64.99, cores: 8, memoryGb: 32, diskGb: 240, cpu: "AMD dedicated" },
  { value: "ccx43", label: "CCX43", detail: "AMD dedicated CPU · larger worker", monthlyEur: 129.99, cores: 16, memoryGb: 64, diskGb: 360, cpu: "AMD dedicated" },
  { value: "ccx53", label: "CCX53", detail: "AMD dedicated CPU · high-memory worker", monthlyEur: 259.99, cores: 32, memoryGb: 128, diskGb: 600, cpu: "AMD dedicated" },
  { value: "ccx63", label: "CCX63", detail: "AMD dedicated CPU · heavy worker", monthlyEur: 389.99, cores: 48, memoryGb: 192, diskGb: 960, cpu: "AMD dedicated" },
] as const;

const HETZNER_LOCATION_OPTIONS = [
  { value: "fsn1", label: "Falkenstein, Germany (fsn1)" },
  { value: "nbg1", label: "Nuremberg, Germany (nbg1)" },
  { value: "hel1", label: "Helsinki, Finland (hel1)" },
  { value: "ash", label: "Ashburn, Virginia, US (ash)" },
  { value: "hil", label: "Hillsboro, Oregon, US (hil)" },
  { value: "sin", label: "Singapore (sin)" },
] as const;

const HETZNER_IMAGE_OPTIONS = [
  { value: "ubuntu-24.04", label: "Ubuntu 24.04 LTS" },
  { value: "ubuntu-22.04", label: "Ubuntu 22.04 LTS" },
  { value: "debian-13", label: "Debian 13" },
  { value: "debian-12", label: "Debian 12" },
] as const;

type SkillBrowserSkill = {
  id: string;
  slug: string;
  name: string;
  description: string;
  source: string;
  category?: string;
  skillMdUrl?: string;
  githubUrl?: string;
  providerId?: BrainSkillProviderId | "shared";
  imported?: boolean;
  requiresHermesUpdate?: boolean;
};

type HermesUpdateSkillLike = {
  slug: string;
  name: string;
  description?: string;
  provider?: BrainSkillProviderId | "shared";
  providerId?: BrainSkillProviderId | "shared";
  providerLabel?: string;
  source?: string;
};

type WorkerClassDraft = {
  label: string;
  imageSrc: string;
  skillProfilePrompt: string;
  preferredSkillSlugs: string[];
};

type ImportedRuntimeSchedule = {
  id: string;
  runtime: AgentRuntime;
  name?: string;
  schedule?: string;
  every?: string;
  everyMs?: number;
  message?: string;
  enabled?: boolean;
  agentId?: string;
  lastRunMs?: number;
  lastStatus?: string;
  lastSummary?: string;
};

type ChatCustomFolder = {
  id: string;
  machineKey: string;
  label: string;
  path: string;
  agentId?: string;
  createdAt: number;
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
  relay?: string;
};

type MachineGroup = {
  key: string;
  name: string;
  address: string;
  collectorUrl: string;
  dnsName?: string;
  ip?: string;
  relay?: string;
  online: boolean;
  self: boolean;
  collector: "ready" | "not-installed" | "offline" | "missing" | "unknown";
  agents: AgentProfile[];
  version?: AppVersion;
  capabilities?: AgentProfile["collectorCapabilities"];
  envSync?: {
    ready?: boolean;
    user?: string;
    command?: string;
    error?: string;
  };
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
  path?: string;
  active?: boolean;
  chats: ChatTreeItem[];
  onStartChat?: () => void;
};

type ChatTreeMachine = {
  key: string;
  name: string;
  detail: string;
  folders: ChatTreeFolder[];
  onStartChat?: () => void;
  onCreateFolder?: () => void;
};

type DiscoveredMachine = {
  device: TailscaleDevice;
  collector: MachineGroup["collector"];
  agents: AgentProfile[];
  snapshots: AgentSnapshot[];
  version?: AppVersion;
  capabilities?: AgentProfile["collectorCapabilities"];
  envSync?: MachineGroup["envSync"];
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

type MachineInitResult = {
  projectName: string;
  projectDir: string;
  envPath: string;
  sshAlias: string;
  serverName: string;
  commands: {
    editEnv: string;
    listServerTypes: string;
    listLocations: string;
    provision: string;
    verify: string;
    bootstrap?: string;
    destroy: string;
  };
};

type MachineInitStatus = {
  busy?: boolean;
  error?: string;
  result?: MachineInitResult;
};

type MachineInitTokenStatus = {
  busyAction?: "save" | "open";
  ok?: boolean;
  message?: string;
  error?: string;
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

type AgentSessionResponse = {
  ok: boolean;
  error?: string;
  session?: {
    sessionId: string;
    updatedAt?: number;
    messageCount?: number;
    messages?: Array<{
      index: number;
      role: "user" | "assistant" | "tool";
      content: string;
      createdAt?: number;
    }>;
  };
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

const MIROSHARK_TEMPLATE_INPUTS: Record<string, MiroSharkTemplateInputField[]> = {
  "x-thread": [
    { key: "topic", label: "Thread topic", placeholder: "e.g. HivemindOS ships a new Swarm Theater", required: true },
    { key: "audience", label: "Audience", placeholder: "Builders, operators, customers, investors" },
    { key: "angle", label: "Narrative angle", placeholder: "What should the thread convince readers to notice?" },
  ],
  "market-maker": [
    { key: "instrument", label: "Instrument", placeholder: "e.g. Fed July rate-cut odds, BTC ETF flow, AI chip demand", required: true },
    { key: "shock", label: "Market shock", placeholder: "e.g. hot CPI, dovish Fed, whale unwind, liquidity drain", required: true },
    { key: "agents", label: "Market participants", placeholder: "Market makers, takers, whales, hedgers, news traders" },
    { key: "question", label: "Prediction question", placeholder: "What binary market or price belief should move?" },
  ],
  "reddit-narrative": [
    { key: "community", label: "Community", placeholder: "e.g. r/wallstreetbets, r/singularity, r/apple", required: true },
    { key: "seed", label: "Seed post", placeholder: "What initial post should trigger the comment cascade?", required: true, kind: "textarea" },
    { key: "conflict", label: "Debate fault line", placeholder: "What factions form in replies?" },
  ],
  polymarket: [
    { key: "question", label: "Binary question", placeholder: "e.g. Will the Fed cut rates by 25bp at the July meeting?", required: true },
    { key: "initialOdds", label: "Initial odds", placeholder: "e.g. YES 62c / NO 38c" },
    { key: "news", label: "News shocks", placeholder: "What headlines should agents react to?", kind: "textarea" },
  ],
  "research-swarm": [
    { key: "question", label: "Research question", placeholder: "e.g. What evidence supports launching this product?", required: true },
    { key: "sources", label: "Sources", placeholder: "URLs, files, authors, datasets, or search targets", kind: "textarea" },
    { key: "deliverable", label: "Deliverable", placeholder: "Consensus brief, risk memo, launch recommendation, source map" },
  ],
  ops: [
    { key: "system", label: "System", placeholder: "e.g. Obsidian sync, agent queue, wallet ledger, scheduler", required: true },
    { key: "failure", label: "Failure profile", placeholder: "e.g. vault conflict storm, tailnet partition, stale env keys", required: true },
    { key: "intensity", label: "Intensity", placeholder: "e.g. 2 sigma, 5 rounds, high concurrency" },
    { key: "success", label: "Success criteria", placeholder: "What should survive or recover?" },
  ],
  custom: [
    { key: "scenario", label: "Scenario", placeholder: "Describe the world and participants to simulate.", required: true, kind: "textarea" },
  ],
  campus_controversy: [
    { key: "institution", label: "Institution", placeholder: "e.g. UC Berkeley", required: true },
    { key: "policy", label: "Policy change", placeholder: "e.g. mandatory AI disclosure for coursework", required: true },
    { key: "flashpoint", label: "Flashpoint", placeholder: "What event makes the controversy break open?" },
    { key: "stakeholders", label: "Key groups", placeholder: "Students, faculty senate, alumni donors, local journalists, activist orgs" },
    { key: "decision", label: "Decision to rehearse", placeholder: "What leadership decision or announcement should the swarm pressure-test?" },
  ],
  corporate_crisis: [
    { key: "company", label: "Company / brand", placeholder: "e.g. Acme Foods", required: true },
    { key: "trigger", label: "Crisis trigger", placeholder: "e.g. viral safety complaint, leaked memo, outage, lawsuit", required: true },
    { key: "product", label: "Product or business line", placeholder: "What exactly is under scrutiny?" },
    { key: "response", label: "Response options", placeholder: "Apology, recall, refund, executive statement, policy change" },
    { key: "market", label: "Market question", placeholder: "What would traders or predictors bet on?" },
  ],
  crypto_launch: [
    { key: "tokenName", label: "Token name", placeholder: "e.g. NomCoin" },
    { key: "tokenSymbol", label: "Symbol", placeholder: "e.g. NOM" },
    { key: "tokenAddress", label: "Coin / contract address", placeholder: "0x... or chain-native mint address", required: true },
    { key: "chain", label: "Chain / network", placeholder: "Base, Ethereum, Solana, BSC, Polygon...", required: true, help: "Needed because EVM-style addresses can exist on multiple chains." },
    { key: "launchStage", label: "Launch stage", placeholder: "Pre-launch, fair launch, stealth launch, CEX listing, post-launch dip" },
    { key: "liquidity", label: "Liquidity / market context", placeholder: "Pool size, FDV, holders, volume, lock status, vesting concerns" },
    { key: "catalyst", label: "Catalyst to rehearse", placeholder: "Influencer push, exploit rumor, liquidity pull fear, exchange listing, whale buy" },
  ],
  historical_whatif: [
    { key: "event", label: "Historical event", placeholder: "e.g. Apollo 11 landing, 2008 bailout vote, Brexit referendum", required: true },
    { key: "divergence", label: "Point of divergence", placeholder: "What changes compared with the real timeline?", required: true },
    { key: "setting", label: "Time and place", placeholder: "When and where does public discourse happen?" },
    { key: "actors", label: "Key actors", placeholder: "Scholars, officials, journalists, affected communities, enthusiasts" },
    { key: "stakes", label: "Outcome to test", placeholder: "Trust, policy, markets, alliances, cultural reaction" },
  ],
  political_debate: [
    { key: "jurisdiction", label: "Jurisdiction", placeholder: "e.g. New York City, California, UK Parliament", required: true },
    { key: "issue", label: "Issue / proposal", placeholder: "e.g. congestion pricing expansion, housing zoning reform", required: true },
    { key: "sides", label: "Coalitions", placeholder: "Who supports it, who opposes it, and why?" },
    { key: "voters", label: "Audience segments", placeholder: "Young renters, commuters, small business owners, unions, parents" },
    { key: "trigger", label: "Debate trigger", placeholder: "Poll, debate clip, scandal, court ruling, endorsement, budget vote" },
  ],
  product_announcement: [
    { key: "company", label: "Company", placeholder: "e.g. Cursor, Apple, OpenAI", required: true },
    { key: "product", label: "Product", placeholder: "e.g. Composer 2.5, headset, agent platform", required: true },
    { key: "claim", label: "Launch claim", placeholder: "What headline promise should users react to?" },
    { key: "price", label: "Pricing / availability", placeholder: "Price, rollout timing, region, usage limits" },
    { key: "audience", label: "Audience and competitors", placeholder: "Developers, creators, enterprises, power users; key alternatives" },
  ],
};

const SWARM_LAUNCH_PRESETS: MiroSharkTemplate[] = [
  {
    id: "x-thread",
    name: "X thread",
    category: "Autoposter",
    description: "Simulate how an X thread travels through agents, quote-posts, replies, and narrative drift.",
    estimated_agents: 12,
    estimated_rounds: 12,
    platforms: ["twitter"],
    tags: ["x", "autoposter", "thread"],
  },
  {
    id: "market-maker",
    name: "Market maker",
    category: "Market",
    description: "Simulate market makers, takers, liquidity shocks, and prediction-market price discovery.",
    estimated_agents: 24,
    estimated_rounds: 24,
    platforms: ["polymarket"],
    tags: ["market-maker", "liquidity", "shock"],
  },
  {
    id: "reddit-narrative",
    name: "Reddit narrative",
    category: "Social",
    description: "Simulate a seeded Reddit post and the factional comment cascade that follows it.",
    estimated_agents: 16,
    estimated_rounds: 16,
    platforms: ["reddit"],
    tags: ["reddit", "cascade", "narrative"],
  },
  {
    id: "polymarket",
    name: "Polymarket binary",
    category: "Market",
    description: "Simulate binary prediction-market odds as agents react to new evidence and headlines.",
    estimated_agents: 48,
    estimated_rounds: 32,
    platforms: ["polymarket"],
    tags: ["polymarket", "prediction-market", "odds"],
  },
  {
    id: "research-swarm",
    name: "Research swarm",
    category: "Research",
    description: "Simulate research agents reading sources, disagreeing, and converging on a consensus brief.",
    estimated_agents: 8,
    estimated_rounds: 8,
    platforms: ["twitter"],
    tags: ["research", "sources", "brief"],
  },
  {
    id: "ops",
    name: "Ops stress test",
    category: "Ops",
    description: "Simulate an operational failure storm and how agents detect, triage, and recover.",
    estimated_agents: 6,
    estimated_rounds: 5,
    platforms: ["twitter"],
    tags: ["ops", "failure", "recovery"],
  },
  {
    id: "custom",
    name: "Blank canvas",
    category: "Custom",
    description: "Launch a custom MiroShark simulation from a hand-written scenario.",
    estimated_agents: 1,
    estimated_rounds: 5,
    platforms: ["twitter"],
    tags: ["custom"],
  },
];

function defaultMirosharkTemplateInputs(templateId?: string): MiroSharkTemplateInputState {
  return Object.fromEntries((MIROSHARK_TEMPLATE_INPUTS[templateId ?? ""] ?? []).map((field) => [field.key, ""]));
}

function composeMirosharkTemplateScenario(template: MiroSharkTemplate, inputs: MiroSharkTemplateInputState) {
  const fields = MIROSHARK_TEMPLATE_INPUTS[template.id ?? ""] ?? [];
  const filledInputs = fields
    .map((field) => ({ field, value: inputs[field.key]?.trim() ?? "" }))
    .filter((item) => item.value);
  const facts = filledInputs.map(({ field, value }) => `${field.label}: ${value}.`);
  const requiredMissing = fields.filter((field) => field.required && !inputs[field.key]?.trim());
  const templateName = template.name ?? template.id ?? "MiroShark rehearsal";
  const templateId = template.id ?? "";
  const presetInstruction = templateId === "market-maker"
    ? "Model market makers and takers as distinct agents. Include order-book pressure, liquidity gaps, spread changes, and a prediction-market style belief update."
    : templateId === "polymarket"
      ? "Model a binary prediction market. Agents should update YES/NO odds as news arrives and explain what moves the price."
      : templateId === "reddit-narrative"
        ? "Model a Reddit comment cascade. Include nested replies, faction formation, moderation pressure, memes, skepticism, and consensus drift."
        : templateId === "research-swarm"
          ? "Model research agents reviewing sources, challenging each other, identifying uncertainty, and converging on a concise consensus brief."
          : templateId === "ops"
            ? "Model an operational incident drill. Include detection, triage, escalation, recovery attempts, residual risk, and clear pass/fail signals."
            : templateId === "x-thread"
              ? "Model X/Twitter post dynamics. Include quote-posts, replies, influencer amplification, backlash, and shareable thread takeaways."
              : "";
  const baseScenario = templateId === "custom" && inputs.scenario?.trim()
    ? inputs.scenario.trim()
    : `${templateName}: ${template.description ?? "Run this MiroShark template."}`;
  const baseLines = [
    baseScenario,
    presetInstruction,
    facts.length ? `Concrete rehearsal inputs:\n${facts.join("\n")}` : "",
    requiredMissing.length ? `Missing required inputs before this becomes a strong rehearsal: ${requiredMissing.map((field) => field.label).join(", ")}.` : "",
    template.tags?.length ? `Focus tags: ${template.tags.join(", ")}.` : "",
    template.has_counterfactuals ? "Include counterfactual branch opportunities and decision points." : "",
  ];
  return baseLines.filter(Boolean).join("\n\n");
}

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

type BrainSkillProviderId = "claude" | "codex" | "hermes" | "gemini" | "openclaw" | "aeon";

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

type BrainSkillAeonSyncResponse = {
  ok?: boolean;
  result?: {
    synced?: BrainSkillSummary[];
    skipped?: Array<BrainSkillSummary & { reason?: string }>;
    aeonRoot?: string;
    manifestPath?: string;
  };
  error?: string;
};

type RuntimeEnvSyncResponse = {
  ok?: boolean;
  result?: {
    repo?: string;
    synced?: Array<{ key: string }>;
    skipped?: Array<{ key: string; reason: string }>;
    sources?: string[];
  };
  error?: string;
};

const BRAIN_SKILL_PROVIDER_FALLBACK: BrainSkillProviderInventory[] = [
  { id: "claude", label: "Claude", home: "~/.claude", skills: [], installed: false },
  { id: "codex", label: "Codex", home: "~/.codex", skills: [], installed: false },
  { id: "hermes", label: "Hermes", home: "~/.hermes", skills: [], installed: false },
  { id: "gemini", label: "Gemini", home: "~/.gemini", skills: [], installed: false },
  { id: "openclaw", label: "OpenClaw", home: "~/.openclaw", skills: [], installed: false },
  { id: "aeon", label: "Aeon", home: "~/.aeon", skills: [], installed: false },
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
  templateId?: string;
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
  marketPrices?: unknown;
  surfaceStats?: unknown;
  lineage?: unknown;
  threadJson?: unknown;
  transcriptJson?: unknown;
  embedSummary?: unknown;
  webhookLog?: unknown;
  report?: unknown;
  interviewHistory?: unknown;
  graphData?: unknown;
  entities?: unknown;
  project?: unknown;
  runStatusDetail?: unknown;
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

type MiroSharkTemplateInputKind = "text" | "textarea";

type MiroSharkTemplateInputField = {
  key: string;
  label: string;
  placeholder: string;
  kind?: MiroSharkTemplateInputKind;
  required?: boolean;
  help?: string;
};

type MiroSharkTemplateInputState = Record<string, string>;

type MiroSharkMetadata = {
  ok?: boolean;
  baseUrl?: string;
  templates?: unknown;
  templateCapabilities?: unknown;
  templateDetails?: unknown;
  history?: unknown;
  publicRuns?: unknown;
  simulationList?: unknown;
  trending?: unknown;
  observabilityStats?: unknown;
  observabilityEvents?: unknown;
  llmCalls?: unknown;
  settings?: unknown;
  mcpStatus?: unknown;
  pushVapidKey?: unknown;
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

function swarmTemplateIdFromSurface(platform?: string): TemplateId {
  if (platform === "reddit") return "reddit-narrative";
  if (platform === "polymarket") return "polymarket";
  if (platform === "twitter" || platform === "x") return "x-thread";
  if (platform === "parallel") return "custom";
  return "custom";
}

function swarmTemplateIdFromMirosharkTemplate(template: MiroSharkTemplate): TemplateId {
  if (template.id?.trim()) return template.id.trim();

  const text = `${template.id ?? ""} ${template.name ?? ""} ${template.category ?? ""} ${(template.platforms ?? []).join(" ")}`.toLowerCase();
  if (text.includes("polymarket")) return "polymarket";
  if (text.includes("reddit")) return "reddit-narrative";
  if (text.includes("research") || text.includes("tavily")) return "research-swarm";
  if (text.includes("ops") || text.includes("stress")) return "ops";
  if (text.includes("market")) return "market-maker";
  if (text.includes("twitter") || text.includes(" x ") || text.includes("thread")) return "x-thread";
  return "custom";
}

function swarmRunState(run: MiroSharkRunResult | null, runnerStatus?: string): SwarmRun["state"] {
  if (run?.error || run?.status === "failed" || runnerStatus === "failed") return "failed";
  if (run?.status === "started" && !isMiroSharkRunTerminal(runnerStatus)) return "live";
  if (run?.status === "queued" || run?.status === "running") return "ready";
  return "done";
}

function numericRecordValue(record: Record<string, unknown>, keys: string[], fallback = 0) {
  for (const key of keys) {
    const value = record[key];
    const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function swarmEventItem(value: unknown, index: number): { id: string; title: string; body: string; meta?: string; tone?: "bear" | "bull" | "neutral"; level?: "info" | "warn" | "error" | "fatal"; raw?: unknown } {
  const record = asRecord(value);
  const title = String(record.event_type ?? record.type ?? record.action_type ?? record.name ?? record.status ?? `record ${index + 1}`);
  const body = String(record.content ?? record.text ?? record.message ?? record.description ?? record.summary ?? compactValue(value));
  const metaValue = record.round ?? record.created_at ?? record.timestamp ?? record.time ?? record.platform;
  const rawLevel = String(record.level ?? record.severity ?? "").toLowerCase();
  const level = rawLevel === "fatal" || rawLevel === "error" || rawLevel === "warn" || rawLevel === "info" ? rawLevel : undefined;
  return {
    id: String(record.id ?? record.post_id ?? record.event_id ?? `${title}-${index}`),
    title,
    body,
    meta: metaValue == null ? undefined : String(metaValue),
    tone: level === "error" || level === "fatal" ? "bear" : level === "warn" ? "neutral" : "bull",
    level,
    raw: value,
  };
}

function swarmMarketEventItem(value: unknown, index: number): ReturnType<typeof swarmEventItem> {
  const record = asRecord(value);
  const question = String(record.question ?? record.title ?? record.name ?? `market ${index + 1}`);
  const price = numericRecordValue(record, ["price_yes", "yes_price", "price", "probability", "odds"], Number.NaN);
  const outcomes = [record.outcome_a, record.outcome_b].filter((item) => item !== undefined && item !== null).join(" / ");
  return {
    id: String(record.market_id ?? record.id ?? `market-${index}`),
    title: question,
    body: [
      Number.isFinite(price) ? `YES ${Math.round(price * 100)}%` : "",
      outcomes ? `Outcomes ${outcomes}` : "",
    ].filter(Boolean).join(" · ") || compactValue(value),
    meta: record.created_at == null ? undefined : String(record.created_at),
    tone: Number.isFinite(price) ? price >= 0.5 ? "bull" : "bear" : "neutral",
    raw: value,
  };
}

function swarmMarketPriceEventItem(value: unknown, index: number): ReturnType<typeof swarmEventItem> {
  const record = asRecord(value);
  const data = asRecord(record.data ?? value);
  const market = asRecord(data.market);
  const prices = Array.isArray(data.prices) ? data.prices : [];
  const question = String(market.question ?? record.question ?? `Market price history ${index + 1}`);
  const price = numericRecordValue(market, ["price_yes", "yes_price", "price", "probability", "odds"], Number.NaN);
  return {
    id: `market-prices-${index}`,
    title: question,
    body: [
      prices.length ? `${prices.length} price points` : "",
      Number.isFinite(price) ? `latest snapshot YES ${Math.round(price * 100)}%` : "",
    ].filter(Boolean).join(" · ") || compactValue(value),
    meta: `${payloadCount(value)} price points`,
    tone: "bull",
    raw: value,
  };
}

function swarmMarketFromItems(items: Record<string, unknown>[], timelineItems: ReturnType<typeof swarmEventItem>[]): SwarmMarket {
  const ticks = items
    .map((item) => numericRecordValue(item, ["price", "odds", "probability", "yes_price", "value"], Number.NaN))
    .filter(Number.isFinite);
  return {
    symbol: String(items[0]?.question ?? items[0]?.title ?? items[0]?.name ?? "MiroShark markets"),
    ticks,
    ladder: items.slice(0, 9).map((item, index) => {
      const px = numericRecordValue(item, ["price", "odds", "probability", "yes_price", "value"], index + 1);
      return {
        px,
        bid: numericRecordValue(item, ["bid", "yes", "volume", "liquidity"], 0) || null,
        ask: numericRecordValue(item, ["ask", "no"], 0) || null,
      };
    }),
    headlines: timelineItems.slice(0, 6).map((item) => ({
      t: item.meta ?? "",
      body: `${item.title}: ${item.body}`,
      tone: item.tone ?? "neutral",
    })),
  };
}

type DashboardView = "agents" | "kanban" | "scheduler" | "swarm" | "wallet" | "vault" | "notifications" | "chat";
type DashboardTheme = "dark" | "hive-light";

const STORAGE_KEY = "hivemindos.agentProfiles.v1";
const VAULT_STORAGE_KEY = "hivemindos.sharedVault.v1";
const TASK_STORAGE_KEY = "hivemindos.agentTasks.v1";
const SCHEDULE_STORAGE_KEY = "hivemindos.agentSchedules.v1";
const WALLET_STORAGE_KEY = "hivemindos.agentWallets.v1";
const HONEY_LEDGER_ENABLED_STORAGE_KEY = "hivemindos.honeyLedger.enabled.v1";
const THEME_STORAGE_KEY = "hivemindos.theme.v1";
const CHAT_MESSAGES_STORAGE_KEY = "hivemindos.chatMessages.v1";
const CHAT_FOLDER_STORAGE_KEY = "hivemindos.chatFolders.v1";
const DISCOVERED_MACHINES_STORAGE_KEY = "hivemindos.discoveredMachines.v1";
const KANBAN_STALE_WORK_MS = 30 * 60 * 1000;
const KANBAN_TOOL_OUTPUT_STALL_MS = 5 * 60 * 1000;
const KANBAN_NO_ASSISTANT_STALL_MS = 2 * 60 * 1000;
const KANBAN_NO_ASSISTANT_QUIET_MS = 90 * 1000;
const KANBAN_DISPATCH_NO_PROGRESS_MS = 75 * 1000;
const KANBAN_SESSION_POLL_FAILURE_LIMIT = 3;
const KANBAN_STALE_AGENT_COOLDOWN_MS = 20 * 60 * 1000;
const KANBAN_PICKUP_PREVIEW_MS = 1_000;
const SCHEDULER_RUN_STALE_MS = 30_000;
const BRAIN_GRAPH_CLIENT_CACHE_MS = 30_000;
const REPO_CLONE_URL = "https://github.com/LiamVisionary/hivemindos.git";
const QUIET_SNAPSHOT_HOLD_MS = 15 * 60 * 1000;
const STORAGE_SUFFIXES = {
  agents: ".agentProfiles.v1",
  vault: ".sharedVault.v1",
  tasks: ".agentTasks.v1",
  schedules: ".agentSchedules.v1",
  wallets: ".agentWallets.v1",
  honeyLedgerEnabled: ".honeyLedger.enabled.v1",
  theme: ".theme.v1",
  chatMessages: ".chatMessages.v1",
  chatFolders: ".chatFolders.v1",
};
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

function workerCapabilityBadges(summary: string) {
  return summary
    .replace(/\.$/, "")
    .split(/,\s+|\s+and\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function customWorkerProfileFromDraft(draft: WorkerClassDraft): CustomWorkerClassProfile {
  return {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label: draft.label.trim() || "Custom worker",
    imageSrc: draft.imageSrc,
    skillProfilePrompt: draft.skillProfilePrompt.trim(),
    preferredSkillSlugs: draft.preferredSkillSlugs,
  };
}

function defaultWorkerClassDraft(): WorkerClassDraft {
  return {
    label: "",
    imageSrc: beeRoleIconPath("worker", "general"),
    skillProfilePrompt: "",
    preferredSkillSlugs: [],
  };
}

type RemotionShowcaseFixtures = {
  agents?: AgentProfile[];
  sharedVault?: SharedVaultConfig;
  tasks?: AgentTask[];
  schedules?: AgentSchedule[];
  wallets?: Record<string, AgentWalletConfig>;
  honeyTreasury?: HoneyTreasuryConfig;
};

function remotionShowcaseFixtures(): RemotionShowcaseFixtures | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { __HIVEMINDOS_REMOTION_FIXTURES?: RemotionShowcaseFixtures }).__HIVEMINDOS_REMOTION_FIXTURES ?? null;
}

function seedAgents(): AgentProfile[] {
  return [];
}

function normalizeAgentProfile(agent: AgentProfile): AgentProfile {
  const inferredQueen = agent.beeRole === "queen" || /queen|orchestrat|lead|main/i.test(agent.name) || agent.runtime === "openclaw";
  const customWorkerClasses = agent.customWorkerClasses?.length
    ? agent.customWorkerClasses
    : agent.customWorkerClass
      ? [agent.customWorkerClass]
      : undefined;
  const selectedCustomWorkerClassId = agent.selectedCustomWorkerClassId ?? agent.customWorkerClass?.id;
  return {
    ...agent,
    localDataDir: agent.runtime === "hermes" && agent.id === "hermes-orchestrator" && !agent.localDataDir
      ? "~/.hermes"
      : agent.localDataDir,
    runtimeKind: agent.runtimeKind ?? RUNTIME_KINDS[agent.runtime],
    runtimeCapabilities: { ...RUNTIME_CAPABILITIES[agent.runtime], ...(agent.runtimeCapabilities ?? {}) },
    a2aUrl: agent.runtime === "aeon" ? agent.a2aUrl ?? agent.gatewayUrl : agent.a2aUrl,
    aeonBranch: agent.runtime === "aeon" ? agent.aeonBranch ?? "main" : agent.aeonBranch,
    aeonMode: agent.runtime === "aeon" ? agent.aeonMode ?? "github" : agent.aeonMode,
    beeRole: agent.beeRole ?? (inferredQueen ? "queen" : "worker"),
    workerClass: agent.workerClass ?? "general",
    customWorkerClasses,
    selectedCustomWorkerClassId,
    customWorkerClass: customWorkerClasses?.find((workerClass) => workerClass.id === selectedCustomWorkerClassId) ?? agent.customWorkerClass,
    skillProfilePrompt: agent.skillProfilePrompt ?? beeWorkerPreset(agent.workerClass ?? "general").taskProfile,
    preferredSkillSlugs: agent.preferredSkillSlugs ?? beeWorkerPreset(agent.workerClass ?? "general").skillSlugs,
  };
}

function runtimeCapabilities(agent?: AgentProfile | null): RuntimeCapabilities {
  if (!agent) return {};
  return { ...RUNTIME_CAPABILITIES[agent.runtime], ...(agent.runtimeCapabilities ?? {}) };
}

function runtimeCan(agent: AgentProfile | null | undefined, capability: keyof RuntimeCapabilities) {
  return Boolean(runtimeCapabilities(agent)[capability]);
}

const HERMES_UPDATE_SKILL_PATTERN = /\b(background|codex|grok|kanban|session search|xai|x search|x-search|twitter|video|imagine|decompose)\b/i;
const HERMES_UPDATE_INTEGRATION_KEYS = new Set<RuntimeIntegrationKey>([
  "sessionSearch",
  "backgroundTasks",
  "xSearch",
  "videoGeneration",
  "codexRuntime",
  "kanbanDecompose",
]);

function skillRequiresHermesUpdate(skill: HermesUpdateSkillLike, hermesUpdateRequired: boolean) {
  if (!hermesUpdateRequired) return false;
  const providerHints = [
    skill.provider,
    skill.providerId,
    skill.providerLabel,
    skill.source,
  ].filter(Boolean).join(" ").toLowerCase();
  const featureText = `${skill.slug} ${skill.name} ${skill.description ?? ""} ${providerHints}`.replace(/[_-]+/g, " ");
  return HERMES_UPDATE_SKILL_PATTERN.test(featureText);
}

function hermesUpdateDetail(status: RuntimeIntegrationStatus | null | undefined) {
  if (status?.runtime !== "hermes") return "";
  const details = [
    ...Object.values(status.integrations).map((integration) => integration.detail),
    ...status.diagnostics,
  ].join("\n");
  const match = details.match(/Update available[^\n]*/i);
  return match?.[0] ?? "";
}

function runtimeSetupDefinition(runtime: AgentRuntime, key: RuntimeIntegrationKey): RuntimeSetupDefinition {
  if (runtime === "hermes") {
    if (key === "xSearch") {
      return {
        title: "Set up X search",
        description: "Connect xAI/Grok credentials, then enable the Hermes X search tool for this runtime.",
        steps: ["Start xAI login or make sure XAI_API_KEY is configured.", "Enable the Hermes x_search tool.", "Refresh runtime integrations."],
        actions: [
          { id: "xai-login", label: "Start xAI login", action: "xai-login" },
          { id: "enable-x-search", label: "Enable X search", action: "enable-tool", input: { tool: "x_search" } },
        ],
      };
    }
    if (key === "videoGeneration") {
      return {
        title: "Set up AI video",
        description: "Enable the Hermes video tool after Grok/xAI credentials are available.",
        steps: ["Start xAI login or configure the provider credentials.", "Enable the Hermes video_gen tool.", "Refresh runtime integrations."],
        actions: [
          { id: "xai-login", label: "Start xAI login", action: "xai-login" },
          { id: "enable-video", label: "Enable video", action: "enable-tool", input: { tool: "video_gen" } },
        ],
      };
    }
    if (key === "codexRuntime") {
      return {
        title: "Set up Codex runtime",
        description: "Point Hermes at a Codex/OpenAI runtime path before routing coding work through it.",
        steps: ["Open Hermes configuration.", "Add the Codex/OpenAI runtime provider path.", "Refresh runtime integrations."],
        actions: [],
      };
    }
  }
  return {
    title: "Set up runtime capability",
    description: "This runtime reports the capability, but it needs provider credentials, a local tool toggle, or a readable data path before it can be used.",
    steps: ["Complete the runtime-specific setup outside this panel.", "Return here and refresh runtime integrations."],
    actions: [],
  };
}

function readStoredValue(key: string, suffix: string): string | null {
  if (typeof window === "undefined") return null;
  const current = window.localStorage.getItem(key);
  if (current !== null) return current;
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const candidateKey = window.localStorage.key(index);
    if (!candidateKey || candidateKey === key || !candidateKey.endsWith(suffix)) continue;
    const candidate = window.localStorage.getItem(candidateKey);
    if (candidate === null) continue;
    window.localStorage.setItem(key, candidate);
    return candidate;
  }
  return null;
}

function parseStoredAgents(): AgentProfile[] {
  if (typeof window === "undefined") return seedAgents();
  const fixtureAgents = remotionShowcaseFixtures()?.agents;
  if (fixtureAgents?.length) return fixtureAgents.map(normalizeAgentProfile);
  const raw = readStoredValue(STORAGE_KEY, STORAGE_SUFFIXES.agents);
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
  const fixtureVault = remotionShowcaseFixtures()?.sharedVault;
  if (fixtureVault) return { ...DEFAULT_SHARED_VAULT, ...fixtureVault };
  const raw = readStoredValue(VAULT_STORAGE_KEY, STORAGE_SUFFIXES.vault);
  if (!raw) return DEFAULT_SHARED_VAULT;
  try {
    const parsed = JSON.parse(raw) as Partial<SharedVaultConfig>;
    const storedVaultPath = parsed.vaultPath?.trim();
    const migratedVaultPath = storedVaultPath
      && /\/[^/]*(hivemind|vault)[^/]*$/i.test(storedVaultPath)
      && !storedVaultPath.endsWith("/hivemindos-vault")
      ? DEFAULT_SHARED_VAULT.vaultPath
      : storedVaultPath;
    const storedKanbanFolder = parsed.kanbanFolder?.trim();
    const migratedKanbanFolder = storedKanbanFolder && /^kanban$/i.test(storedKanbanFolder)
      ? DEFAULT_SHARED_VAULT.kanbanFolder
      : storedKanbanFolder;
    return {
      ...DEFAULT_SHARED_VAULT,
      ...parsed,
      vaultPath: migratedVaultPath || DEFAULT_SHARED_VAULT.vaultPath,
      kanbanFolder: migratedKanbanFolder || DEFAULT_SHARED_VAULT.kanbanFolder,
      scheduledFolder: parsed.scheduledFolder?.trim() || DEFAULT_SHARED_VAULT.scheduledFolder,
    };
  } catch {
    return DEFAULT_SHARED_VAULT;
  }
}

function parseStoredTasks(): AgentTask[] {
  if (typeof window === "undefined") return [];
  const fixtureTasks = remotionShowcaseFixtures()?.tasks;
  if (fixtureTasks) return fixtureTasks;
  const raw = readStoredValue(TASK_STORAGE_KEY, STORAGE_SUFFIXES.tasks);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as AgentTask[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseStoredSchedules(): AgentSchedule[] {
  if (typeof window === "undefined") return [];
  const fixtureSchedules = remotionShowcaseFixtures()?.schedules;
  if (fixtureSchedules) return fixtureSchedules;
  const raw = readStoredValue(SCHEDULE_STORAGE_KEY, STORAGE_SUFFIXES.schedules);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as AgentSchedule[];
    return Array.isArray(parsed) ? parsed.filter((schedule) => (
      typeof schedule?.id === "string"
      && typeof schedule?.agentId === "string"
      && typeof schedule?.name === "string"
    )).map((schedule) => ({
      ...schedule,
      skills: Array.isArray(schedule.skills) ? schedule.skills : [],
      paths: Array.isArray(schedule.paths) ? schedule.paths : [],
      steps: Array.isArray(schedule.steps)
        ? schedule.steps.map((step, index) => ({
          ...step,
          id: typeof step.id === "string" ? step.id : `step-${schedule.id}-${index}`,
          text: typeof step.text === "string" ? step.text : "",
          skills: Array.isArray(step.skills) ? step.skills : [],
          paths: Array.isArray(step.paths) ? step.paths : [],
          model: typeof step.model === "string" ? step.model : "",
        }))
        : [],
      usePastRuns: schedule.usePastRuns === true,
      pastRunLimit: Math.max(1, Math.min(12, Number(schedule.pastRunLimit) || 3)),
    })) : [];
  } catch {
    return [];
  }
}

function parseStoredChatFolders(): ChatCustomFolder[] {
  if (typeof window === "undefined") return [];
  const raw = readStoredValue(CHAT_FOLDER_STORAGE_KEY, STORAGE_SUFFIXES.chatFolders);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ChatCustomFolder[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((folder) => (
      typeof folder?.machineKey === "string"
      && typeof folder?.path === "string"
      && typeof folder?.label === "string"
    ));
  } catch {
    return [];
  }
}

function parseStoredChatMessages(): Record<string, ChatMessage[]> {
  if (typeof window === "undefined") return {};
  const raw = readStoredValue(CHAT_MESSAGES_STORAGE_KEY, STORAGE_SUFFIXES.chatMessages);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, ChatMessage[]>;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed)
      .filter(([agentId, messages]) => typeof agentId === "string" && Array.isArray(messages))
      .map(([agentId, messages]) => [
        agentId,
        messages.filter((message) => (
          (message?.role === "user" || message?.role === "assistant" || message?.role === "system")
          && typeof message.content === "string"
        )).map((message) => ({
          role: message.role,
          content: message.content,
          createdAt: typeof message.createdAt === "number" ? message.createdAt : undefined,
          kanbanTaskId: typeof message.kanbanTaskId === "string" ? message.kanbanTaskId : undefined,
          surface: message.surface === "chat" || message.surface === "kanban" || message.surface === "scheduler" ? message.surface : undefined,
          sourceSessionId: typeof message.sourceSessionId === "string" ? message.sourceSessionId : undefined,
          sourceIndex: typeof message.sourceIndex === "number" ? message.sourceIndex : undefined,
          attachments: Array.isArray(message.attachments) ? message.attachments : undefined,
        })).slice(-120),
      ]));
  } catch {
    return {};
  }
}

function parseStoredWallets(): Record<string, AgentWalletConfig> {
  if (typeof window === "undefined") return {};
  const fixtureWallets = remotionShowcaseFixtures()?.wallets;
  if (fixtureWallets) return fixtureWallets;
  const raw = readStoredValue(WALLET_STORAGE_KEY, STORAGE_SUFFIXES.wallets);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, AgentWalletConfig>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function parseStoredHoneyTreasury(): HoneyTreasuryConfig {
  const fallback = createDefaultHoneyTreasuryConfig();
  if (typeof window === "undefined") return fallback;
  const fixtureTreasury = remotionShowcaseFixtures()?.honeyTreasury;
  return fixtureTreasury
    ? {
      ...fallback,
      ...fixtureTreasury,
      agentTokenUsage: fixtureTreasury.agentTokenUsage ?? {},
      agentHoneyExchanged: fixtureTreasury.agentHoneyExchanged ?? {},
      agentHiveBalances: fixtureTreasury.agentHiveBalances ?? {},
    }
    : fallback;
}

function parseStoredHoneyLedgerEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const raw = readStoredValue(HONEY_LEDGER_ENABLED_STORAGE_KEY, STORAGE_SUFFIXES.honeyLedgerEnabled);
  return raw === "true";
}

function formatHiveAmount(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0";
  if (value < 0.000001) return "<0.000001";
  return value.toLocaleString(undefined, { maximumFractionDigits: value < 1 ? 6 : 2 });
}

function parseStoredDiscoveredMachines(): DiscoveredMachine[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(DISCOVERED_MACHINES_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as DiscoveredMachine[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((machine) => (
      machine?.device
      && typeof machine.device.name === "string"
      && typeof machine.collector === "string"
    ));
  } catch {
    return [];
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

function kanbanAgentSessionTimestamp(task: KanbanTask) {
  return task.agentSession?.updatedAt ?? task.updatedAt;
}

function kanbanStaleAge(task: KanbanTask, now = Date.now()) {
  return Math.max(0, now - kanbanAgentSessionTimestamp(task));
}

function isKanbanStaleWorkingTask(task: KanbanTask, now = Date.now()) {
  return task.status === "working"
    && Boolean(task.agentSession?.sessionId)
    && kanbanStaleAge(task, now) >= KANBAN_STALE_WORK_MS;
}

function kanbanToolOutputStalledMessage(agentName: string) {
  return `${agentName} produced terminal/tool output but has not sent a final agent response. The dashboard stopped treating tool output as completion; steer the agent or move the card back to Ready for Queen to retry.`;
}

function kanbanNoAssistantStalledMessage(agentName: string, latestCount: number, latestRole: string | null) {
  const roleLabel = latestRole ? ` Latest observed session message role: ${latestRole}.` : "";
  return `${agentName} accepted the task and the session is updating, but no assistant response has appeared after ${latestCount} messages.${roleLabel} Check the agent runtime session or move the card back to Ready for Queen to retry.`;
}

function kanbanNoAssistantStalledDetail(agentName: string, latestCount: number, latestRole: string | null, latestContent: string) {
  const summary = latestRole === "tool" ? summarizeKanbanToolOutput(latestContent) : "";
  return [
    kanbanNoAssistantStalledMessage(agentName, latestCount, latestRole),
    summary,
  ].filter(Boolean).join("\n\n");
}

function isDashboardWorkChatMessage(message: ChatMessage) {
  if (message.kanbanTaskId) return true;
  if (message.surface === "kanban" || message.surface === "scheduler") return true;
  const content = message.content.trim();
  return content.startsWith("This is a scheduled dashboard run.")
    || content.startsWith("You are receiving an automated Kanban assignment")
    || content.startsWith("Needs human: ");
}

function isManualAgentChatMessage(message: ChatMessage) {
  return !isDashboardWorkChatMessage(message);
}

function compactDiagnosticPreview(value: string, maxLength = 180) {
  const compact = value.trim().replace(/\s+/g, " ");
  return compact.length > maxLength ? `${compact.slice(0, maxLength).trimEnd()} [truncated]` : compact;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function summarizeKanbanToolOutput(toolOutput: string) {
  const trimmed = toolOutput.trim();
  if (!trimmed) return "";
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (isRecord(parsed) && Array.isArray(parsed.matches)) {
      const matches = parsed.matches.filter(isRecord);
      const totalCount = typeof parsed.total_count === "number" ? parsed.total_count : matches.length;
      const files = new Set(matches.map((match) => typeof match.path === "string" ? match.path : "").filter(Boolean));
      const preview = matches.slice(0, 3).map((match) => {
        const path = typeof match.path === "string" ? match.path.split("/").slice(-3).join("/") : "unknown file";
        const line = typeof match.line === "number" ? `:${match.line}` : "";
        const content = typeof match.content === "string" ? ` — ${compactDiagnosticPreview(match.content, 120)}` : "";
        return `- ${path}${line}${content}`;
      });
      return [
        `Last tool output before blocking: search results with ${totalCount} match${totalCount === 1 ? "" : "es"} across ${files.size || "unknown"} file${files.size === 1 ? "" : "s"}.`,
        preview.length ? ["Preview:", ...preview].join("\n") : "",
        matches.length > preview.length ? `${matches.length - preview.length} additional match${matches.length - preview.length === 1 ? "" : "es"} were omitted from this dashboard summary.` : "",
      ].filter(Boolean).join("\n");
    }
    if (isRecord(parsed)) {
      const keys = Object.keys(parsed).slice(0, 8);
      return `Last tool output before blocking: structured JSON with keys ${keys.join(", ")}.`;
    }
  } catch {
    // Fall through to plain-text preview.
  }
  const lines = trimmed.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const preview = lines.slice(0, 4).map((line) => `- ${compactDiagnosticPreview(line, 160)}`);
  return [
    `Last tool output before blocking: ${lines.length} line${lines.length === 1 ? "" : "s"} of terminal/tool output.`,
    preview.length ? ["Preview:", ...preview].join("\n") : compactDiagnosticPreview(trimmed, 360),
    lines.length > preview.length ? `${lines.length - preview.length} additional line${lines.length - preview.length === 1 ? "" : "s"} were omitted from this dashboard summary.` : "",
  ].filter(Boolean).join("\n");
}

function kanbanToolOutputStalledDetail(agentName: string, toolOutput: string) {
  const summary = summarizeKanbanToolOutput(toolOutput);
  return [
    kanbanToolOutputStalledMessage(agentName),
    summary,
  ].filter(Boolean).join("\n\n");
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function formatDurationShort(ms: number) {
  const minutes = Math.max(1, Math.floor(ms / 60_000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder > 0 ? `${hours}h ${remainder}m` : `${hours}h`;
}

function formatMessageTimestamp(timestamp?: number) {
  if (!timestamp) return "time unknown";
  return new Date(timestamp).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

function humanizeNotificationActor(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "Agent";
  if (/^queen[-_\s]*bee$/i.test(trimmed)) return "Queen Bee";
  if (/^worker[-_\s]*bee$/i.test(trimmed)) return "Worker Bee";
  if (/[-_]/.test(trimmed) && trimmed === trimmed.toLowerCase()) {
    return trimmed
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }
  return trimmed;
}

function isHermesAuthNotification(notification: AgentNotification) {
  const title = notification.title.toLowerCase();
  const body = notification.body.toLowerCase();
  return notification.tags.includes("auth")
    && notification.tags.includes("hermes")
    || title.includes("hermes auth")
    || body.includes("hermes/codex re-authentication");
}

function notificationTaskTitle(notification: AgentNotification) {
  return /^Task "([^"]+)"/.exec(notification.body)?.[1]?.trim() ?? "";
}

function notificationMachineName(notification: AgentNotification) {
  return /(?:failed|sign-in) on (.+)$/i.exec(notification.title)?.[1]?.trim()
    || / on ([^.\n]+?) needs Hermes\/Codex re-authentication/i.exec(notification.body)?.[1]?.trim()
    || "";
}

function notificationFailedWorkerName(notification: AgentNotification) {
  return /could not run because (.+?) on .+? needs Hermes\/Codex re-authentication/i.exec(notification.body)?.[1]?.trim()
    || /blocked because (.+?) needs Hermes\/Codex sign-in/i.exec(notification.body)?.[1]?.trim()
    || "";
}

function summarizeHermesAuthError(message: string) {
  const reason = /Reason:\s*([^\n]+)/i.exec(message)?.[1]?.trim();
  if (reason) return reason;
  if (/refresh token was already consumed/i.test(message)) {
    return "The Codex refresh token was already used by another client, so Hermes needs a fresh sign-in.";
  }
  return message.trim().split("\n").find(Boolean)?.replace(/\s+/g, " ").slice(0, 220)
    || "Hermes asked for re-authentication before it could continue.";
}

function notificationActorMeta(notification: AgentNotification) {
  const failedHermesWorker = notificationFailedWorkerName(notification);
  const rawActor = failedHermesWorker || notification.agentName || notification.agentId || "Agent";
  const normalized = rawActor.toLowerCase().replace(/[_\s]+/g, "-");
  const queen = normalized === "queen-bee" || normalized.includes("queen-bee");
  const worker = Boolean(failedHermesWorker) || normalized.includes("worker") || normalized.includes("hermes") || normalized.includes("agent");
  return {
    icon: queen ? beeRoleIconPath("queen") : worker ? beeRoleIconPath("worker") : "",
    label: humanizeNotificationActor(rawActor),
    role: queen ? "Orchestrator" : worker ? "Worker bee" : "Agent",
  };
}

function notificationSourceLabel(notificationOrSource: AgentNotification | string | undefined) {
  const source = typeof notificationOrSource === "string" ? notificationOrSource : notificationOrSource?.source;
  const notification = typeof notificationOrSource === "string" ? undefined : notificationOrSource;
  const trimmed = source?.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("kanban:")) {
    const taskTitle = notification ? notificationTaskTitle(notification) : "";
    return taskTitle ? `Task: ${taskTitle}` : "Work board";
  }
  return trimmed;
}

function notificationDisplayTitle(notification: AgentNotification) {
  if (!isHermesAuthNotification(notification)) return notification.title;
  const actor = notificationActorMeta(notification).label;
  return `${actor} is signed out`;
}

function notificationDisplayBody(notification: AgentNotification) {
  if (!isHermesAuthNotification(notification)) return notification.body;
  const actor = notificationActorMeta(notification).label;
  const machine = notificationMachineName(notification);
  const where = machine || "that machine";
  const task = notificationTaskTitle(notification);
  return [
    `${actor} couldn’t start${task ? ` “${task}”` : " this task"} because Codex is signed out on ${where}.`,
    `Run this on ${where}:`,
    "```bash",
    "codex",
    "hermes auth",
    "```",
    `Reason: ${summarizeHermesAuthError(notification.body)}`,
    "If Hermes asks for model access afterward, run `hermes model` too.",
  ].join("\n\n");
}

function notificationPriorityLabel(priority: AgentNotification["priority"]) {
  if (priority === "urgent") return "Urgent";
  if (priority === "high") return "Needs attention";
  if (priority === "low") return "FYI";
  return "Notice";
}

function notificationKindLabel(kind: AgentNotification["kind"]) {
  if (kind === "alert") return "Alert";
  if (kind === "task") return "Task";
  if (kind === "decision") return "Decision";
  if (kind === "system") return "System";
  return "Message";
}

function notificationTagLabel(tag: string) {
  const labels: Record<string, string> = {
    auth: "Sign-in",
    hermes: "Hermes",
    kanban: "Work board",
    runtime: "Runtime",
  };
  return labels[tag] ?? humanizeNotificationActor(tag);
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

function isLoopbackCollector(url?: string) {
  if (!url?.trim()) return false;
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]";
  } catch {
    return false;
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
  const roleScope = agent.beeRole === "queen" || /^queen-bee-/i.test(agent.id) ? ":queen" : "";
  const dataDir = normalizeAgentPath(agent.localDataDir);
  if (dataDir) {
    const collector = collectorKey(agent.telemetryUrl) || "unattached";
    const canonicalHermesHome = dataDir === "$home/.hermes" || dataDir.endsWith("/.hermes");
    return `${agent.runtime}:data:${collector}:${canonicalHermesHome ? "$home/.hermes" : dataDir}${roleScope}`;
  }
  const telemetry = collectorKey(agent.telemetryUrl);
  if (telemetry) return `${agent.runtime}:telemetry:${telemetry}:${agent.agentId || agent.name}${roleScope}`;
  return `${agent.runtime}:id:${agent.id}${roleScope}`;
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
  const entries: Array<readonly [string, string]> = [];
  configuredAgents.forEach((agent) => {
    const target = agentAliasTarget(agent, autoDiscoveredAgents);
    if (target && !entries.some(([aliasId]) => aliasId === target.id)) {
      entries.push([target.id, agent.id] as const);
    }
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

function parentPathFromPath(path?: string) {
  const trimmed = path?.trim().replace(/\/+$/, "");
  if (!trimmed || trimmed === "~" || trimmed === "$home") return "~";
  const pieces = trimmed.split("/").filter(Boolean);
  if (trimmed.startsWith("~/")) return pieces.length > 1 ? `~/${pieces.slice(0, -1).join("/")}` : "~";
  if (!trimmed.startsWith("/")) return pieces.length > 1 ? pieces.slice(0, -1).join("/") : ".";
  return pieces.length > 1 ? `/${pieces.slice(0, -1).join("/")}` : "/";
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
  if (!runtimeCan(agent, "chat")) {
    return `${RUNTIME_LABELS[agent.runtime]} is a background/runtime adapter here. Use Scheduler, runs, or skills instead of Chat.`;
  }
  if (STARTER_AGENT_IDS.has(agent.id) && agent.runtime !== "openclaw" && !agent.telemetryUrl?.trim()) {
    return "This starter shortcut is not connected to a running chat runtime. Pick a discovered machine agent or connect a real chat URL.";
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
      ? "This agent was found through the read-only collector. Add its runtime chat URL in setup before sending messages."
      : "Add the runtime chat URL before sending messages.";
  }
  return "";
}

function kanbanCardMessage(task: KanbanTask) {
  const body = task.body?.trim();
  if (body) return body;

  const result = task.result?.trim();
  if (!result) return "No task body yet.";

  const compact = result.replace(/\s+/g, " ");
  if (/produced terminal\/tool output but has not sent a final agent response/i.test(result)) {
    return result.split(/\n\n+/)[0] ?? compact;
  }
  const looksLikeToolDump = /^{["{[]|^\[Subdirectory context discovered:|#\s+Project Rules|AGENTS\.md|total_count/i.test(result);
  if (looksLikeToolDump || result.length > 280) {
    return compact.startsWith("Dispatch reached")
      ? result
      : "Agent produced a long diagnostic output. Open the task for the full notes.";
  }

  return result;
}

function isKanbanTerminalMessage(text: string) {
  const trimmed = text.trim();
  return /^[$>]\s+\S/.test(trimmed)
    || /\n[$>]\s+\S/.test(trimmed)
    || /^>\s*[\w@.-]+/.test(trimmed)
    || /\s>\s+(?:tsc|pnpm|npm|yarn|node|git|curl|bash)\b/i.test(trimmed)
    || /^(?:pnpm|npm|yarn|node|git|curl|bash|tsc)\b/i.test(trimmed);
}

const KANBAN_STEER_TARGETS = KANBAN_COLUMNS.filter((column) => (
  column.id !== "needs-human" && column.id !== "archived"
));

function kanbanTaskBee(task: KanbanTask, agents: AgentProfile[]) {
  if (task.status === "ready") {
    return {
      icon: beeRoleIconPath("queen"),
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
      icon: agent ? beeRoleIconPath(completedByQueen ? "queen" : "worker", agent.workerClass ?? "general") : "",
      roleLabel: "Completed by:",
      assignee: completedBy,
    };
  }
  const queen = task.tenant === "queen-bee" || agent?.beeRole === "queen";
  const workerClass = agent?.workerClass
    ?? (task.tenant?.endsWith("-worker") ? task.tenant.replace(/-worker$/, "") as BeeWorkerClass : undefined);
  const roleLabel = queen ? "Queen bee" : `${beeWorkerClassLabel(workerClass)} worker bee`;
  return {
    icon: beeRoleIconPath(queen ? "queen" : "worker", workerClass ?? "general"),
    roleLabel,
    assignee: assignee || "Unassigned",
  };
}

function kanbanEventLabel(kind: string) {
  const labels: Record<string, string> = {
    "board.migrated": "Board migrated",
    "comment.created": "Comment added",
    "task.created": "Task created",
    "task.moved": "Moved",
    "task.updated": "Updated",
  };
  return labels[kind] ?? kind
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function kanbanTaskDispatchPrompt(task: KanbanTask, assignment: ReturnType<typeof chooseBeeAssignment>) {
  const attachmentDetails = [
    task.linkedDirectories?.length ? ["Linked directories:", ...task.linkedDirectories.map((directory) => `- ${directory.name}`)].join("\n") : "",
    task.attachments?.length ? [
      "Attached files/images:",
      ...task.attachments.map((attachment) => `- ${attachment.kind}: ${attachment.name} (${attachment.mimeType || "unknown"}, ${attachmentSizeLabel(attachment.size)})`),
    ].join("\n") : "",
  ].filter(Boolean).join("\n\n");
  const undoDetails = task.undoRequestedAt
    ? [
      "Undo request:",
      "Reverse only the work performed for this Kanban task. Do not roll back unrelated user or agent changes.",
      "Inspect the current workspace and the task notes, then make the smallest targeted reversal you can.",
      "If you cannot identify the task-specific changes safely, stop and explain exactly what human input is needed.",
    ].join("\n")
    : "";
  return [
    "You are receiving an automated Kanban assignment from the Queen Bee orchestrator.",
    `Task: ${task.title}`,
    undoDetails,
    task.body ? `Task details:\n${task.body}` : "Task details: none provided.",
    task.targetMachine?.name ? `Target machine: ${task.targetMachine.name}` : "Target machine: Any machine.",
    attachmentDetails,
    task.result ? `Existing notes:\n${task.result}` : "",
    `Suggested worker class: ${beeWorkerClassLabel(assignment.workerClass)}.`,
    task.undoRequestedAt
      ? "This is an explicit undo request. Treat the previous completed change for this task as the target and reverse it narrowly, even if existing notes say the original task was verified or completed."
      : "Treat existing notes as authoritative retry context when they say an old expectation was superseded, removed, or already verified. Do not undo a verified dashboard change just to satisfy a stale task title.",
    "Complete the task as far as your runtime/tools allow. If you are blocked, say exactly what human input, access, or setup is needed. End with a concise result summary and any evidence.",
  ].filter(Boolean).join("\n\n");
}

function kanbanTaskInterruptPrompt(task: KanbanTask, previousTitle: string, previousBody: string) {
  return [
    "Interrupt your current work on this Kanban task and switch to the revised task below.",
    "Treat this as replacing the prior assignment. Do not spawn or wait for another agent.",
    previousTitle !== task.title || previousBody !== task.body
      ? [
        "Previous task:",
        `Title: ${previousTitle}`,
        previousBody ? `Details:\n${previousBody}` : "Details: none provided.",
      ].join("\n")
      : "",
    "Revised task:",
    `Title: ${task.title}`,
    task.body ? `Details:\n${task.body}` : "Details: none provided.",
    task.result ? `Existing notes:\n${task.result}` : "",
    "Continue immediately with the revised work. If you were already working on the old version, abandon that path unless it still applies to this revised version.",
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
  const normalizedAssignee = assignee.toLowerCase();
  return agents.find((agent) => {
    const thisMachineAliases = agent.machineName && /mac|local|this/i.test(agent.machineName)
      ? [
        `${agent.name} on This Mac`,
        agent.agentId ? `${agent.agentId} on This Mac` : "",
        `${agent.runtime} on This Mac`,
      ]
      : [];
    const candidates = [
      agent.id,
      agent.agentId,
      agent.name,
      agent.machineName ? `${agent.name} on ${agent.machineName}` : "",
      agent.machineName && agent.agentId ? `${agent.agentId} on ${agent.machineName}` : "",
      agent.machineName ? `${agent.runtime} on ${agent.machineName}` : "",
      ...thisMachineAliases,
    ].filter((value): value is string => Boolean(value)).map((value) => value.toLowerCase());
    return candidates.includes(normalizedAssignee);
  });
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
  if (view === "scheduler") return <Repeat2 aria-hidden="true" />;
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

function isSlowDelegationMessage(text: string) {
  return /did not produce a response before the dashboard timeout|operation was aborted due to timeout|timeout/i.test(text)
    && !/Chat URL needed|runtime chat URL|fetch failed|ECONNREFUSED|ENOTFOUND/i.test(text);
}

function isTransientDelegationMessage(text: string) {
  return isSlowDelegationMessage(text) || /^Failed to fetch$/i.test(text.trim());
}

function isHermesAuthFailure(text: string) {
  return /Codex refresh token was already consumed|Run `?codex`?.*Run `?hermes auth`?|hermes auth|Run `?hermes model`?/is.test(text);
}

function isInternalHermesSessionPrelude(text: string) {
  return /^---\s*name:\s*kanban-worker\b/i.test(text.trim());
}

function isKanbanAwaitingAgentUpdate(task: KanbanTask) {
  return task.status === "working"
    && Boolean(task.agentSession?.sessionId);
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

function ChatMarkdown({ text, className, headingClassName }: { text: string; className?: string; headingClassName?: string }) {
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
      blocks.push(<strong className={headingClassName ?? chatClass("markdownHeading")} key={`heading-${index}`}>{renderInlineMarkdown(heading[2])}</strong>);
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

  return <div className={className ?? chatClass("messageMarkdown")}>{blocks}</div>;
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

async function readComposerFiles(files: FileList | File[], kind: "image" | "file") {
  const incoming = Array.from(files);
  if (incoming.length === 0) throw new Error("Choose at least one file.");
  const maxAttachmentBytes = 8_000_000;
  const oversized = incoming.find((file) => file.size > maxAttachmentBytes);
  if (oversized) throw new Error(`${oversized.name} is too large. Keep attachments under 8 MB.`);
  return Promise.all(incoming.map((file) => readAttachmentFile(file, kind)));
}

async function pickLinkedDirectory(): Promise<LinkedDirectory | null> {
  type DirectoryPickerWindow = Window & typeof globalThis & {
    showDirectoryPicker?: () => Promise<{ name?: string }>;
  };
  const picker = (window as DirectoryPickerWindow).showDirectoryPicker;
  if (!picker) throw new Error("Directory picker is not available in this browser.");
  try {
    const handle = await picker();
    const name = handle.name?.trim();
    return name ? { id: `${name}-${crypto.randomUUID()}`, name } : null;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return null;
    throw error;
  }
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

function ComposerField({
  value,
  onChange,
  placeholder,
  disabled,
  busy,
  compact = false,
  attachments,
  directories = [],
  attachmentError,
  attachmentMenuOpen,
  setAttachmentMenuOpen,
  attachmentMenuRef,
  fileInputRef,
  imageInputRef,
  onFileChange,
  onImageChange,
  onRemoveAttachment,
  onAttachDirectory,
  onRemoveDirectory,
  recording,
  voiceBands,
  voiceTranscript,
  onToggleRecording,
  canRecord = true,
  canSend,
  onCancel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  busy?: boolean;
  compact?: boolean;
  attachments: ChatAttachment[];
  directories?: LinkedDirectory[];
  attachmentError?: string;
  attachmentMenuOpen: boolean;
  setAttachmentMenuOpen: (open: boolean | ((current: boolean) => boolean)) => void;
  attachmentMenuRef: RefObject<HTMLDivElement | null>;
  fileInputRef: RefObject<HTMLInputElement | null>;
  imageInputRef: RefObject<HTMLInputElement | null>;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onImageChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveAttachment: (id: string) => void;
  onAttachDirectory?: () => void;
  onRemoveDirectory?: (id: string) => void;
  recording?: boolean;
  voiceBands: number[];
  voiceTranscript?: string;
  onToggleRecording?: () => void;
  canRecord?: boolean;
  canSend: boolean;
  onCancel?: () => void;
}) {
  return (
    <div className={chatClass("chatComposerField", compact && "compactComposer")}>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className={chatClass("chatFileInput")}
        onChange={onFileChange}
        disabled={disabled}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        className={chatClass("chatFileInput")}
        onChange={onImageChange}
        disabled={disabled}
      />
      {attachments.length > 0 || directories.length > 0 ? (
        <div className={chatClass("attachmentTray")}>
          {directories.map((directory) => (
            <div className={chatClass("attachmentPill")} key={directory.id}>
              <span>Folder</span>
              <strong>{directory.name}</strong>
              <small>linked</small>
              {onRemoveDirectory ? (
                <button type="button" aria-label={`Remove ${directory.name}`} onClick={() => onRemoveDirectory(directory.id)} disabled={disabled}>
                  <X aria-hidden="true" />
                </button>
              ) : null}
            </div>
          ))}
          {attachments.map((attachment) => (
            <div className={chatClass("attachmentPill")} key={attachment.id}>
              <span>{attachment.kind === "image" ? "Image" : attachment.kind === "audio" ? "Audio" : "File"}</span>
              <strong>{attachment.name}</strong>
              <small>{attachmentSizeLabel(attachment.size)}</small>
              <button type="button" aria-label={`Remove ${attachment.name}`} onClick={() => onRemoveAttachment(attachment.id)} disabled={disabled}>
                <X aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
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
            disabled={disabled}
            aria-label="Add attachment"
            aria-expanded={attachmentMenuOpen}
          >
            <Plus aria-hidden="true" />
          </button>
          {attachmentMenuOpen ? (
            <div className={chatClass("attachmentMenu")} role="menu">
              <button type="button" role="menuitem" onClick={() => imageInputRef.current?.click()}>
                <Paperclip aria-hidden="true" />
                Images
              </button>
              <button type="button" role="menuitem" onClick={() => fileInputRef.current?.click()}>
                <FileUp aria-hidden="true" />
                Files
              </button>
              {onAttachDirectory ? (
                <button type="button" role="menuitem" onClick={onAttachDirectory}>
                  <FolderOpen aria-hidden="true" />
                  Directory
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
        {attachmentError ? <span role="status">{attachmentError}</span> : null}
        <div className={chatClass("composerActions")}>
          {onCancel ? (
            <button type="button" className={chatClass("composerIconButton")} onClick={onCancel} disabled={disabled} aria-label="Cancel">
              <X aria-hidden="true" />
            </button>
          ) : null}
          {canRecord ? (
            <button
              type="button"
              className={chatClass("composerIconButton", recording && "recording")}
              onClick={onToggleRecording}
              disabled={disabled}
              aria-label={recording ? "Stop recording" : "Record audio"}
            >
              <Mic aria-hidden="true" />
            </button>
          ) : null}
          <button
            type="submit"
            className={chatClass("composerIconButton", "sendButton")}
            disabled={disabled || !canSend}
            aria-label={busy ? "Waiting" : "Send"}
          >
            {busy ? "·" : compact ? <Check aria-hidden="true" /> : <ArrowUp aria-hidden="true" />}
          </button>
        </div>
      </div>
    </div>
  );
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

function machineNetworkIssue(machine: MachineGroup, tailscaleStatus: string): FleetMachine["networkIssue"] {
  if (machine.key === "unassigned") return undefined;
  if (machine.self && (machine.ip === "127.0.0.1" || tailscaleStatus.startsWith("Tailscale not configured"))) {
    return {
      label: "Tailscale not configured. Fix?",
      title: "Tailscale is not configured",
      detail: "This dashboard is running locally. That is fine for single-machine use, but Fleet discovery, env sync, remote updates, and shared-brain pairing need this machine signed in to Tailscale.",
      commands: [
        "# macOS GUI/VPN only",
        "brew install --cask tailscale",
        "open -a Tailscale",
        "",
        "# macOS Tailscale SSH host",
        "brew install --formula tailscale",
        "sudo brew services start tailscale",
        "sudo /opt/homebrew/opt/tailscale/bin/tailscale up",
        "sudo /opt/homebrew/opt/tailscale/bin/tailscale set --ssh",
        "",
        "# Linux",
        "curl -fsSL https://tailscale.com/install.sh | sh",
        "sudo tailscale up",
        "sudo tailscale set --ssh",
      ],
    };
  }
  if (!machine.online) {
    return {
      label: "Tailscale disconnected. Fix?",
      title: "Machine is offline in Tailscale",
      detail: "This machine is known to the Tailnet but is not online, so HivemindOS cannot reach its collector or update it remotely.",
      commands: [
        "tailscale status",
        "sudo tailscale up",
        "cd ~/hivemindos",
        "./scripts/install-telemetry-collector.sh",
      ],
    };
  }
  if (machine.collector !== "ready") {
    if (machine.self) {
      return {
        label: "Collector not reachable. Fix?",
        title: "Local HivemindOS collector is not reachable",
        detail: "This dashboard cannot reach the collector on this Mac at localhost:8787. Start or reinstall the local collector, then refresh Fleet.",
        commands: [
          "# On this Mac",
          "cd ~/hivemindos",
          "git pull --ff-only",
          "./scripts/install-telemetry-collector.sh",
          "curl http://127.0.0.1:8787/health",
        ],
      };
    }
    const tailnetTarget = machine.dnsName || machine.ip || "<tailnet-ip>";
    return {
      label: "Collector not reachable. Fix?",
      title: "HivemindOS collector is not reachable",
      detail: "Tailscale lists this machine, but this dashboard cannot reach its collector on port 8787. First confirm the peer is reachable over Tailnet, then verify the collector locally on that machine and from this dashboard.",
      commands: [
        "# From this dashboard machine",
        `tailscale ping ${tailnetTarget}`,
        `curl --max-time 5 http://${machine.ip || tailnetTarget}:8787/health`,
        "",
        "# On the other machine",
        "tailscale status",
        "sudo tailscale up",
        "cd ~/hivemindos",
        "git pull --ff-only",
        "./scripts/install-telemetry-collector.sh",
        "curl http://127.0.0.1:8787/health",
        "",
        "# If local health works but remote curl times out on macOS",
        "sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add \"$(command -v node)\"",
        "sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp \"$(command -v node)\"",
      ],
    };
  }
  if (machine.envSync && machine.envSync.ready === false) {
    return {
      label: "Env sync not ready. Fix?",
      title: "Tailscale SSH / env sync is not ready",
      detail: machine.envSync.error || "The collector is online, but it does not report a working hive-env-add command for env reconciliation.",
      commands: [
        "cd ~/hivemindos",
        "./setup.sh",
        "sudo tailscale set --ssh",
        "hive-env-add --reconcile",
      ],
    };
  }
  return undefined;
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
  const incomingKeys = new Set(incoming.map((machine) => collectorKey(machine.device.collectorUrl) || machine.device.name));
  const incomingHasTailnetSelf = incoming.some((machine) => machine.device.self && !isLoopbackCollector(machine.device.collectorUrl));
  const now = Date.now();

  const merged = incoming.map((machine) => {
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

  const preserved = current
    .filter((machine) => !incomingKeys.has(collectorKey(machine.device.collectorUrl) || machine.device.name))
    .filter((machine) => !(incomingHasTailnetSelf && machine.device.self && isLoopbackCollector(machine.device.collectorUrl)))
    .map((machine) => ({
      ...machine,
      device: machine.device.self ? machine.device : { ...machine.device, online: false },
      collector: machine.device.self ? machine.collector : "offline" as MachineGroup["collector"],
    }));

  return [...merged, ...preserved];
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
    `git clone ${REPO_CLONE_URL} hivemindos 2>/dev/null || true`,
    "cd hivemindos",
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

const BRAIN_LOADER_RADIUS = 20;
const BRAIN_LOADER_CENTER = { x: 64, y: 64 };
const BRAIN_LOADER_COORDS: BrainHexCoord[] = [
  { q: 0, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
];

function brainLoaderCenter(coord: BrainHexCoord): BrainPoint {
  return {
    x: BRAIN_LOADER_CENTER.x + Math.sqrt(3) * BRAIN_LOADER_RADIUS * (coord.q + coord.r / 2),
    y: BRAIN_LOADER_CENTER.y + 1.5 * BRAIN_LOADER_RADIUS * coord.r,
  };
}

function brainLoaderEdgeLines() {
  const points = new Map<string, BrainPoint>();
  const edgeKeys = new Set<string>();

  for (const coord of BRAIN_LOADER_COORDS) {
    const center = brainLoaderCenter(coord);
    const vertices = Array.from({ length: 6 }, (_, index) => brainHexVertex(center, BRAIN_LOADER_RADIUS, index));
    vertices.forEach((vertex, index) => {
      const next = vertices[(index + 1) % vertices.length];
      const aKey = brainPointKey(vertex);
      const bKey = brainPointKey(next);
      points.set(aKey, vertex);
      points.set(bKey, next);
      edgeKeys.add([aKey, bKey].sort().join("|"));
    });
  }

  return Array.from(edgeKeys).map((key) => {
    const [aKey, bKey] = key.split("|");
    return { key, a: points.get(aKey)!, b: points.get(bKey)! };
  });
}

const BRAIN_LOADER_EDGES = brainLoaderEdgeLines();

function BrainGraphLoader({ compact = false }: { compact?: boolean }) {
  return (
    <div className={vaultClass("brainLoader", compact && "compact")} role="status" aria-live="polite">
      <svg className={vaultClass("brainLoaderComb")} viewBox="8 10 112 108" aria-hidden="true">
        <g className={vaultClass("brainLoaderCells")}>
          {BRAIN_LOADER_COORDS.map((coord, index) => {
            const center = brainLoaderCenter(coord);
            return (
              <polygon
                key={`${coord.q},${coord.r}`}
                points={brainNodePoints(center.x, center.y, BRAIN_LOADER_RADIUS)}
                style={{ animationDelay: `${index * 90}ms` }}
              />
            );
          })}
        </g>
        <g className={vaultClass("brainLoaderEdges")}>
          {BRAIN_LOADER_EDGES.map((edge) => (
            <line key={edge.key} x1={edge.a.x} y1={edge.a.y} x2={edge.b.x} y2={edge.b.y} />
          ))}
        </g>
      </svg>
      <div>
        <strong>Mapping shared brain</strong>
        <span>Reading vault notes and link edges</span>
      </div>
      <div className={vaultClass("brainLoadingRail")} aria-hidden="true">
        <span />
      </div>
    </div>
  );
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

function fleetHash(value: string) {
  let hash = 0;
  for (const char of value) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash;
}

function fleetMetric(seed: string, min: number, max: number) {
  return min + (fleetHash(seed) % (max - min + 1));
}

type FleetLocation = {
  location: string;
  city: string;
  lat: number;
  lon: number;
};

const TIMEZONE_LOCATIONS: Record<string, FleetLocation> = {
  "Asia/Makassar": { location: "Local timezone", city: "Makassar", lat: -5.1477, lon: 119.4327 },
  "Asia/Singapore": { location: "Local timezone", city: "Singapore", lat: 1.3521, lon: 103.8198 },
  "Asia/Jakarta": { location: "Local timezone", city: "Jakarta", lat: -6.2088, lon: 106.8456 },
  "America/New_York": { location: "Local timezone", city: "New York", lat: 40.7128, lon: -74.0060 },
  "Europe/Helsinki": { location: "Local timezone", city: "Helsinki", lat: 60.1699, lon: 24.9384 },
};

const REGION_LOCATIONS: Record<string, FleetLocation> = {
  ash: { location: "Hetzner ash", city: "Ashburn", lat: 39.0438, lon: -77.4874 },
  ashburn: { location: "Hetzner ash", city: "Ashburn", lat: 39.0438, lon: -77.4874 },
  hel: { location: "Hetzner hel", city: "Helsinki", lat: 60.1699, lon: 24.9384 },
  hel1: { location: "Hetzner hel1", city: "Helsinki", lat: 60.1699, lon: 24.9384 },
  nbg: { location: "Hetzner nbg", city: "Nuremberg", lat: 49.4521, lon: 11.0767 },
  nbg1: { location: "Hetzner nbg1", city: "Nuremberg", lat: 49.4521, lon: 11.0767 },
  fsn: { location: "Hetzner fsn", city: "Falkenstein", lat: 50.4779, lon: 12.3713 },
  fsn1: { location: "Hetzner fsn1", city: "Falkenstein", lat: 50.4779, lon: 12.3713 },
  hil: { location: "Hetzner hil", city: "Hillsboro", lat: 45.5229, lon: -122.9898 },
  hil1: { location: "Hetzner hil1", city: "Hillsboro", lat: 45.5229, lon: -122.9898 },
};

const TAILSCALE_RELAY_LOCATIONS: Record<string, FleetLocation> = {
  ams: { location: "Tailscale relay", city: "Amsterdam relay", lat: 52.3676, lon: 4.9041 },
  blr: { location: "Tailscale relay", city: "Bengaluru relay", lat: 12.9716, lon: 77.5946 },
  bom: { location: "Tailscale relay", city: "Mumbai relay", lat: 19.0760, lon: 72.8777 },
  den: { location: "Tailscale relay", city: "Denver relay", lat: 39.7392, lon: -104.9903 },
  dfw: { location: "Tailscale relay", city: "Dallas relay", lat: 32.7767, lon: -96.7970 },
  fra: { location: "Tailscale relay", city: "Frankfurt relay", lat: 50.1109, lon: 8.6821 },
  gru: { location: "Tailscale relay", city: "Sao Paulo relay", lat: -23.5558, lon: -46.6396 },
  hel: { location: "Tailscale relay", city: "Helsinki relay", lat: 60.1699, lon: 24.9384 },
  hkg: { location: "Tailscale relay", city: "Hong Kong relay", lat: 22.3193, lon: 114.1694 },
  jnb: { location: "Tailscale relay", city: "Johannesburg relay", lat: -26.2041, lon: 28.0473 },
  lax: { location: "Tailscale relay", city: "Los Angeles relay", lat: 34.0522, lon: -118.2437 },
  lhr: { location: "Tailscale relay", city: "London relay", lat: 51.5072, lon: -0.1276 },
  lon: { location: "Tailscale relay", city: "London relay", lat: 51.5072, lon: -0.1276 },
  mad: { location: "Tailscale relay", city: "Madrid relay", lat: 40.4168, lon: -3.7038 },
  mia: { location: "Tailscale relay", city: "Miami relay", lat: 25.7617, lon: -80.1918 },
  nrt: { location: "Tailscale relay", city: "Tokyo relay", lat: 35.6762, lon: 139.6503 },
  nyc: { location: "Tailscale relay", city: "New York relay", lat: 40.7128, lon: -74.0060 },
  par: { location: "Tailscale relay", city: "Paris relay", lat: 48.8566, lon: 2.3522 },
  prg: { location: "Tailscale relay", city: "Prague relay", lat: 50.0755, lon: 14.4378 },
  sea: { location: "Tailscale relay", city: "Seattle relay", lat: 47.6062, lon: -122.3321 },
  sfo: { location: "Tailscale relay", city: "San Francisco relay", lat: 37.7749, lon: -122.4194 },
  sin: { location: "Tailscale relay", city: "Singapore relay", lat: 1.3521, lon: 103.8198 },
  sto: { location: "Tailscale relay", city: "Stockholm relay", lat: 59.3293, lon: 18.0686 },
  syd: { location: "Tailscale relay", city: "Sydney relay", lat: -33.8688, lon: 151.2093 },
  tok: { location: "Tailscale relay", city: "Tokyo relay", lat: 35.6762, lon: 139.6503 },
  tor: { location: "Tailscale relay", city: "Toronto relay", lat: 43.6532, lon: -79.3832 },
  vie: { location: "Tailscale relay", city: "Vienna relay", lat: 48.2082, lon: 16.3738 },
  waw: { location: "Tailscale relay", city: "Warsaw relay", lat: 52.2297, lon: 21.0122 },
  yyz: { location: "Tailscale relay", city: "Toronto relay", lat: 43.6532, lon: -79.3832 },
};

const UNKNOWN_FLEET_LOCATION: FleetLocation = {
  location: "Location unknown",
  city: "Unknown",
  lat: 0,
  lon: 0,
};

function localTimezoneLocation() {
  if (typeof Intl === "undefined") return undefined;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return timeZone ? TIMEZONE_LOCATIONS[timeZone] : undefined;
}

function machineRegionLocation(machine: MachineGroup) {
  const haystack = [machine.name, machine.dnsName, machine.collectorUrl, machine.ip]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  for (const [code, location] of Object.entries(REGION_LOCATIONS)) {
    if (new RegExp(`(^|[^a-z0-9])${code}(?:\\d+)?($|[^a-z0-9])`).test(haystack)) return location;
  }
  return undefined;
}

function machineRelayLocation(machine: MachineGroup) {
  const relay = machine.relay?.trim().toLowerCase();
  return relay ? TAILSCALE_RELAY_LOCATIONS[relay] : undefined;
}

function fleetMachineLocation(machine: MachineGroup, index: number) {
  void index;
  if (machine.self) {
    const local = localTimezoneLocation();
    if (local) return { ...local, location: "This Mac" };
  }
  return machineRegionLocation(machine) ?? machineRelayLocation(machine) ?? UNKNOWN_FLEET_LOCATION;
}

function fleetVersionState(machine: MachineGroup): FleetMachine["versionState"] {
  if (machine.collector !== "ready") return "needs-setup";
  const version = machine.version;
  if (version?.latestCommit && version.commit && version.latestCommit !== version.commit) return "stale";
  return "current";
}

function fleetAgentState(agent: AgentProfile, snapshot: AgentSnapshot | undefined, activeCount: number, hasMachineWiring: boolean): FleetAgent["state"] {
  if (snapshot?.error) return "failed";
  if (!hasMachineWiring) return "setup";
  if (activeCount > 0 || snapshot?.processRunning) return "working";
  return "ready";
}

export default function Home() {
  // Initialize all persisted state with deterministic seed values so SSR and
  // first client render match. localStorage is read inside a useEffect below.
  const [hydrated, setHydrated] = useState(false);
  const [agents, setAgents] = useState<AgentProfile[]>(seedAgents);
  const [selectedAgentId, setSelectedAgentId] = useState(() => seedAgents()[0]?.id ?? "");
  const [walletExpanded, setWalletExpanded] = useState(false);
  const [text, setText] = useState("");
  const [chatAttachments, setChatAttachments] = useState<ChatAttachment[]>([]);
  const [attachmentError, setAttachmentError] = useState("");
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceTarget, setVoiceTarget] = useState<"chat" | "kanban-steer" | KanbanStatus>("chat");
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
  const brainGraphLoadedAtRef = useRef(0);
  const brainGraphVaultPathRef = useRef("");
  const [selectedBrainNodeId, setSelectedBrainNodeId] = useState("");
  const [brainPan, setBrainPan] = useState({ x: 0, y: 0 });
  const [brainSkills, setBrainSkills] = useState<BrainSkillInventory | null>(null);
  const [brainSkillsStatus, setBrainSkillsStatus] = useState("");
  const [brainSkillsLoading, setBrainSkillsLoading] = useState(false);
  const [hermesUpdateRequiredDetail, setHermesUpdateRequiredDetail] = useState("");
  const [brainSkillImportProvider, setBrainSkillImportProvider] = useState<BrainSkillProviderId | "all" | "">("");
  const [brainSkillImportSuccess, setBrainSkillImportSuccess] = useState<BrainSkillProviderId | "all" | "">("");
  const [brainSkillAeonSyncing, setBrainSkillAeonSyncing] = useState(false);
  const [skillBrowserOpen, setSkillBrowserOpen] = useState(false);
  const [skillBrowserSkills, setSkillBrowserSkills] = useState<SkillBrowserSkill[]>([]);
  const [skillBrowserSearch, setSkillBrowserSearch] = useState("");
  const [skillBrowserStatus, setSkillBrowserStatus] = useState("");
  const [skillBrowserLoading, setSkillBrowserLoading] = useState(false);
  const [skillBrowserImporting, setSkillBrowserImporting] = useState("");
  const [skillBrowserGithubOpen, setSkillBrowserGithubOpen] = useState(false);
  const [skillBrowserGithubUrl, setSkillBrowserGithubUrl] = useState("");
  const [skillBrowserGithubInstalling, setSkillBrowserGithubInstalling] = useState(false);
  const [messagesByAgent, setMessagesByAgent] = useState<Record<string, ChatMessage[]>>({});
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [schedules, setSchedules] = useState<AgentSchedule[]>([]);
  const [scheduleDraft, setScheduleDraft] = useState<ScheduleDraft>({
    name: "",
    agentId: "",
    every: "360m",
    mode: "prompt",
    prompt: "",
    model: "",
    skills: [],
    paths: [],
    steps: [{ id: "draft-step-0", text: "", skills: [], paths: [], model: "" }],
    usePastRuns: false,
    pastRunLimit: 3,
  });
  const [schedulerAttachMenu, setSchedulerAttachMenu] = useState<"menu" | "skill" | "model" | "path" | null>(null);
  const [schedulerSkillSearch, setSchedulerSkillSearch] = useState("");
  const [schedulerPathDraft, setSchedulerPathDraft] = useState("");
  const [schedulerPathKind, setSchedulerPathKind] = useState<"folder" | "file" | "path">("path");
  const [schedulerSelectedStep, setSchedulerSelectedStep] = useState(0);
  const [editingScheduleId, setEditingScheduleId] = useState("");
  const [scheduleImportStatus, setScheduleImportStatus] = useState("");
  const [scheduleImporting, setScheduleImporting] = useState(false);
  const [schedulerDraftOpen, setSchedulerDraftOpen] = useState(false);
  const [schedulerRunStates, setSchedulerRunStates] = useState<Record<string, SchedulerRunState>>({});
  const [walletsByAgent, setWalletsByAgent] = useState<Record<string, AgentWalletConfig>>({});
  const [honeyTreasury, setHoneyTreasury] = useState<HoneyTreasuryConfig>(createDefaultHoneyTreasuryConfig);
  const [honeyLedgerEnabled, setHoneyLedgerEnabled] = useState(false);
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
  const [machineInitOpen, setMachineInitOpen] = useState(false);
  const [machineInitDraft, setMachineInitDraft] = useState({
    projectName: "",
    serverType: "cx23",
    serverLocation: "hel1",
    serverImage: "ubuntu-24.04",
    runtimeAgent: "hermes" as AgentRuntime,
  });
  const [machineInitStatus, setMachineInitStatus] = useState<MachineInitStatus>({});
  const [machineInitCopiedKey, setMachineInitCopiedKey] = useState("");
  const [machineInitToken, setMachineInitToken] = useState("");
  const [machineInitTokenStatus, setMachineInitTokenStatus] = useState<MachineInitTokenStatus>({});
  const [agentRoleModalId, setAgentRoleModalId] = useState("");
  const [agentCreateMachineKey, setAgentCreateMachineKey] = useState("");
  const [agentSettingsPanel, setAgentSettingsPanel] = useState<"role" | "memory" | "tools" | "security">("role");
  const [aeonEnvKeys, setAeonEnvKeys] = useState("ANTHROPIC_API_KEY\nCLAUDE_CODE_OAUTH_TOKEN\nBANKR_LLM_KEY\nGH_GLOBAL");
  const [aeonEnvSyncStatus, setAeonEnvSyncStatus] = useState("");
  const [aeonEnvSyncing, setAeonEnvSyncing] = useState(false);
  const [agentCreateDraft, setAgentCreateDraft] = useState<{
    name: string;
    runtime: AgentRuntime;
    workerClass: BeeWorkerClass;
    customWorkerClass?: CustomWorkerClassProfile;
    customWorkerClasses: CustomWorkerClassProfile[];
    selectedCustomWorkerClassId?: string;
    skillProfilePrompt: string;
    preferredSkillSlugs: string[];
    useSharedVault: boolean;
  }>({
    name: "",
    runtime: "hermes",
    workerClass: "general",
    customWorkerClass: undefined,
    customWorkerClasses: [],
    selectedCustomWorkerClassId: undefined,
    skillProfilePrompt: beeWorkerPreset("general").taskProfile,
    preferredSkillSlugs: beeWorkerPreset("general").skillSlugs,
    useSharedVault: true,
  });
  const [agentRenameDraft, setAgentRenameDraft] = useState("");
  const [agentRenameEditing, setAgentRenameEditing] = useState(false);
  const [agentRuntimeFolderEditing, setAgentRuntimeFolderEditing] = useState(false);
  const [agentRuntimeFolderBrowsing, setAgentRuntimeFolderBrowsing] = useState(false);
  const [agentRuntimeFolderStatus, setAgentRuntimeFolderStatus] = useState("");
  const [agentRuntimeAdvancedOpen, setAgentRuntimeAdvancedOpen] = useState(false);
  const [runtimeIntegrationStatus, setRuntimeIntegrationStatus] = useState<RuntimeIntegrationStatus | null>(null);
  const [runtimeIntegrationBusy, setRuntimeIntegrationBusy] = useState("");
  const [runtimeIntegrationMessage, setRuntimeIntegrationMessage] = useState("");
  const [runtimeUpdateConfirmKey, setRuntimeUpdateConfirmKey] = useState<RuntimeIntegrationKey | "">("");
  const [runtimeSetupKey, setRuntimeSetupKey] = useState<RuntimeIntegrationKey | "">("");
  const [runtimeSessionQuery, setRuntimeSessionQuery] = useState("");
  const [runtimeSessionResults, setRuntimeSessionResults] = useState<RuntimeSessionSearchResult[]>([]);
  const [runtimeBackgroundPrompt, setRuntimeBackgroundPrompt] = useState("");
  const [agentWorkerClassView, setAgentWorkerClassView] = useState<"presets" | "create">("presets");
  const [customWorkerDraft, setCustomWorkerDraft] = useState<WorkerClassDraft>(() => defaultWorkerClassDraft());
  const [customWorkerSkillSearch, setCustomWorkerSkillSearch] = useState("");
  const [customWorkerImageError, setCustomWorkerImageError] = useState("");
  const [setupCommandCopied, setSetupCommandCopied] = useState(false);
  const [kanbanBoard, setKanbanBoard] = useState<KanbanBoard | null>(null);
  const [kanbanLoading, setKanbanLoading] = useState(false);
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
  const [kanbanTaskModal, setKanbanTaskModal] = useState<"assign" | "chat" | "edit" | "events" | "notes" | "">("");
  const [kanbanEditDraft, setKanbanEditDraft] = useState({ title: "", body: "" });
  const [kanbanEditPendingTaskId, setKanbanEditPendingTaskId] = useState("");
  const [kanbanSteerDraft, setKanbanSteerDraft] = useState("");
  const [kanbanSteerAttachments, setKanbanSteerAttachments] = useState<ChatAttachment[]>([]);
  const [kanbanSteerDirectories, setKanbanSteerDirectories] = useState<LinkedDirectory[]>([]);
  const [kanbanSteerAttachmentError, setKanbanSteerAttachmentError] = useState("");
  const [kanbanSteerAttachmentMenuOpen, setKanbanSteerAttachmentMenuOpen] = useState(false);
  const [kanbanSteerTargetStatus, setKanbanSteerTargetStatus] = useState<KanbanStatus>("working");
  const [kanbanSteerTargetMenuOpen, setKanbanSteerTargetMenuOpen] = useState(false);
  const [kanbanSteeringTaskId, setKanbanSteeringTaskId] = useState("");
  const [expandedKanbanCards, setExpandedKanbanCards] = useState<Record<string, boolean>>({});
  const [kanbanPickupPreviewByTask, setKanbanPickupPreviewByTask] = useState<Record<string, KanbanPickupPreview>>({});
  const [quickAddStatus, setQuickAddStatus] = useState<KanbanStatus | "">("");
  const [quickAddDrafts, setQuickAddDrafts] = useState<Record<string, string>>({});
  const [quickAddAttachments, setQuickAddAttachments] = useState<Record<string, ChatAttachment[]>>({});
  const [quickAddDirectories, setQuickAddDirectories] = useState<Record<string, LinkedDirectory[]>>({});
  const [quickAddMachineTargets, setQuickAddMachineTargets] = useState<Record<string, KanbanMachineTarget | null>>({});
  const [quickAddMachineMenuOpen, setQuickAddMachineMenuOpen] = useState<Record<string, boolean>>({});
  const [kanbanCardMachineMenuOpen, setKanbanCardMachineMenuOpen] = useState<Record<string, boolean>>({});
  const [kanbanCardAttachmentMenuOpen, setKanbanCardAttachmentMenuOpen] = useState<Record<string, boolean>>({});
  const [kanbanCardAttachmentTargetId, setKanbanCardAttachmentTargetId] = useState("");
  const [quickAddAttachmentError, setQuickAddAttachmentError] = useState("");
  const [quickAddAttachmentMenuOpen, setQuickAddAttachmentMenuOpen] = useState(false);
  const [kanbanBoardScrollState, setKanbanBoardScrollState] = useState({ canScrollLeft: false, canScrollRight: false });
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
  const [mirosharkArchiveLoading, setMirosharkArchiveLoading] = useState(false);
  const [selectedMirosharkRunId, setSelectedMirosharkRunId] = useState("");
  const [mirosharkMetadata, setMirosharkMetadata] = useState<MiroSharkMetadata | null>(null);
  const [mirosharkWorkspaceMode, setMirosharkWorkspaceMode] = useState<MiroSharkWorkspaceMode>("new");
  const [mirosharkWorkbenchTab, setMirosharkWorkbenchTab] = useState<MiroSharkWorkbenchTab>("surface");
  const [mirosharkSurfaceView, setMirosharkSurfaceView] = useState<MiroSharkSurfaceView>("x");
  const [mirosharkSelectedTemplateId, setMirosharkSelectedTemplateId] = useState("");
  const [mirosharkTemplateInputs, setMirosharkTemplateInputs] = useState<MiroSharkTemplateInputState>({});
  const [mirosharkExperimentEvent, setMirosharkExperimentEvent] = useState("A city health official issues a public warning and demands proof of food handling compliance.");
  const [mirosharkExperimentStatus, setMirosharkExperimentStatus] = useState("");
  const [mirosharkExperimentPending, setMirosharkExperimentPending] = useState("");
  const [mirosharkHelperPending, setMirosharkHelperPending] = useState<"ask" | "suggest" | "">("");
  const [mirosharkHelperStatus, setMirosharkHelperStatus] = useState("");
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
  const [chatCustomFolders, setChatCustomFolders] = useState<ChatCustomFolder[]>([]);
  const [selectedChatDirectoryPath, setSelectedChatDirectoryPath] = useState("");
  const [chatFolderDraft, setChatFolderDraft] = useState({
    machineKey: "",
    parentPath: "",
    name: "",
    busy: false,
    error: "",
  });
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const chatFileInputRef = useRef<HTMLInputElement | null>(null);
  const chatImageInputRef = useRef<HTMLInputElement | null>(null);
  const quickAddFileInputRef = useRef<HTMLInputElement | null>(null);
  const quickAddImageInputRef = useRef<HTMLInputElement | null>(null);
  const kanbanCardFileInputRef = useRef<HTMLInputElement | null>(null);
  const kanbanCardImageInputRef = useRef<HTMLInputElement | null>(null);
  const kanbanSteerFileInputRef = useRef<HTMLInputElement | null>(null);
  const kanbanSteerImageInputRef = useRef<HTMLInputElement | null>(null);
  const customWorkerImageInputRef = useRef<HTMLInputElement | null>(null);
  const kanbanBoardScrollRef = useRef<HTMLDivElement | null>(null);
  const quickAddAttachmentMenuRef = useRef<HTMLDivElement | null>(null);
  const quickAddMachineMenuRef = useRef<HTMLDivElement | null>(null);
  const kanbanSteerAttachmentMenuRef = useRef<HTMLDivElement | null>(null);
  const kanbanSteerTargetMenuRef = useRef<HTMLDivElement | null>(null);
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
  const kanbanDispatchCooldownRef = useRef<Map<string, number>>(new Map());
  const kanbanStaleRequeueAttemptRef = useRef<Set<string>>(new Set());
  const kanbanSessionPollRef = useRef<Map<string, number>>(new Map());
  const kanbanSessionPollFailureRef = useRef<Map<string, number>>(new Map());
  const kanbanRuntimeAbortRef = useRef<Map<string, AbortController>>(new Map());
  const syncthingAutoPairRef = useRef<Set<string>>(new Set());
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
    setSchedules(parseStoredSchedules());
    setWalletsByAgent(parseStoredWallets());
    const storedChatMessages = parseStoredChatMessages();
    setMessagesByAgent(storedChatMessages);
    logClientTelemetry("chat.messages.hydrated", {
      agentCount: Object.keys(storedChatMessages).length,
      messageCount: Object.values(storedChatMessages).reduce((count, messages) => count + messages.length, 0),
    });
    setHoneyLedgerEnabled(parseStoredHoneyLedgerEnabled());
    setHoneyTreasury(parseStoredHoneyTreasury());
    setChatCustomFolders(parseStoredChatFolders());
    setDiscoveredMachines(parseStoredDiscoveredMachines());
    const storedTheme = readStoredValue(THEME_STORAGE_KEY, STORAGE_SUFFIXES.theme);
    setDashboardTheme(storedTheme === "hive-light" ? "hive-light" : "dark");
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!hydrated || !honeyLedgerEnabled) return;
    void observeHoneyUsage();
    const timer = window.setInterval(() => {
      void observeHoneyUsage();
    }, 30_000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [honeyLedgerEnabled, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(HONEY_LEDGER_ENABLED_STORAGE_KEY, honeyLedgerEnabled ? "true" : "false");
  }, [honeyLedgerEnabled, hydrated]);

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
    window.localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(schedules.slice(0, 120)));
  }, [hydrated, schedules]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(walletsByAgent));
  }, [hydrated, walletsByAgent]);

  // Hydrate wallets from the shared vault ledger when sharedVault is enabled.
  // Vault wins where it has a newer `updatedAt` than the locally-stored copy.
  useEffect(() => {
    if (!hydrated || !sharedVault.enabled) return;
    const vaultPath = sharedVault.vaultPath.trim();
    let cancelled = false;
    void (async () => {
      try {
        const params = vaultPath ? `?vaultPath=${encodeURIComponent(vaultPath)}` : "";
        const response = await fetch(`/api/obsidian/wallets${params}`);
        if (!response.ok) return;
        const data = (await response.json()) as {
          ok?: boolean;
          records?: Array<{ agentId: string; wallet: AgentWalletConfig; updatedAt?: string }>;
        };
        if (cancelled || !data?.ok || !Array.isArray(data.records) || data.records.length === 0) return;
        setWalletsByAgent((current) => {
          let mutated = false;
          const next = { ...current };
          for (const record of data.records!) {
            const existing = next[record.agentId];
            const remoteMs = record.wallet.updatedAt ?? 0;
            const localMs = existing?.updatedAt ?? 0;
            if (!existing || remoteMs > localMs) {
              next[record.agentId] = record.wallet;
              mutated = true;
            }
          }
          return mutated ? next : current;
        });
      } catch {
        /* vault unreachable — local cache still works */
      }
    })();
    return () => { cancelled = true; };
  }, [hydrated, sharedVault.enabled, sharedVault.vaultPath]);

  // Write-through: when wallets change locally, mirror the changed records to
  // the shared vault. Debounced to coalesce rapid edits (slider drags etc).
  const walletVaultSyncedRef = useRef<Record<string, number>>({});
  useEffect(() => {
    if (!hydrated || !sharedVault.enabled) return;
    const vaultPath = sharedVault.vaultPath.trim();
    const timer = window.setTimeout(() => {
      for (const [agentId, wallet] of Object.entries(walletsByAgent)) {
        const lastSynced = walletVaultSyncedRef.current[agentId] ?? 0;
        if ((wallet.updatedAt ?? 0) <= lastSynced) continue;
        const agent = agents.find((candidate) => candidate.id === agentId);
        walletVaultSyncedRef.current[agentId] = wallet.updatedAt ?? Date.now();
        void fetch("/api/obsidian/wallets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vaultPath: vaultPath || undefined,
            agentId,
            agentName: agent?.name ?? agentId,
            runtime: agent?.runtime,
            machineName: agent?.machineName,
            wallet,
          }),
        }).catch(() => { /* ignore vault write errors */ });
      }
    }, 800);
    return () => window.clearTimeout(timer);
  }, [hydrated, sharedVault.enabled, sharedVault.vaultPath, walletsByAgent, agents]);

  useEffect(() => {
    if (!hydrated) return;
    const compactMessages: Record<string, ChatMessage[]> = Object.fromEntries(Object.entries(messagesByAgent)
      .map(([agentId, messages]) => [
        agentId,
        messages
          .filter((message) => message.role !== "system" && (message.content.trim() || message.attachments?.length))
          .slice(-120),
      ])
      .filter(([, messages]) => Array.isArray(messages) && messages.length > 0));
    window.localStorage.setItem(CHAT_MESSAGES_STORAGE_KEY, JSON.stringify(compactMessages));
    logClientTelemetry("chat.messages.persisted", {
      agentCount: Object.keys(compactMessages).length,
      messageCount: Object.values(compactMessages).reduce((count, messages) => count + messages.length, 0),
    });
  }, [hydrated, messagesByAgent]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(CHAT_FOLDER_STORAGE_KEY, JSON.stringify(chatCustomFolders));
  }, [chatCustomFolders, hydrated]);

  useEffect(() => {
    if (!hydrated || discoveredMachines.length === 0) return;
    window.localStorage.setItem(DISCOVERED_MACHINES_STORAGE_KEY, JSON.stringify(discoveredMachines.slice(0, 32)));
  }, [discoveredMachines, hydrated]);

  useEffect(() => {
    notificationCursorRef.current = notificationCursor;
    notificationCountRef.current = notifications.length;
  }, [notificationCursor, notifications.length]);

  useEffect(() => {
    if (
      !attachmentMenuOpen
      && !quickAddAttachmentMenuOpen
      && !kanbanSteerAttachmentMenuOpen
      && !Object.values(quickAddMachineMenuOpen).some(Boolean)
      && !Object.values(kanbanCardMachineMenuOpen).some(Boolean)
      && !Object.values(kanbanCardAttachmentMenuOpen).some(Boolean)
    ) return;
    function closeAttachmentMenu(event: MouseEvent | TouchEvent) {
      const target = event.target;
      if (target instanceof Node && attachmentMenuRef.current?.contains(target)) return;
      if (target instanceof Node && quickAddAttachmentMenuRef.current?.contains(target)) return;
      if (target instanceof Node && quickAddMachineMenuRef.current?.contains(target)) return;
      if (target instanceof Node && kanbanSteerAttachmentMenuRef.current?.contains(target)) return;
      if (target instanceof Element && target.closest("[data-kanban-machine-menu='true']")) return;
      if (target instanceof Element && target.closest("[data-kanban-card-attachment-menu='true']")) return;
      setAttachmentMenuOpen(false);
      setQuickAddAttachmentMenuOpen(false);
      setQuickAddMachineMenuOpen({});
      setKanbanCardMachineMenuOpen({});
      setKanbanCardAttachmentMenuOpen({});
      setKanbanSteerAttachmentMenuOpen(false);
    }
    function closeAttachmentMenuOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setAttachmentMenuOpen(false);
        setQuickAddAttachmentMenuOpen(false);
        setQuickAddMachineMenuOpen({});
        setKanbanCardMachineMenuOpen({});
        setKanbanCardAttachmentMenuOpen({});
        setKanbanSteerAttachmentMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", closeAttachmentMenu);
    document.addEventListener("touchstart", closeAttachmentMenu);
    document.addEventListener("keydown", closeAttachmentMenuOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeAttachmentMenu);
      document.removeEventListener("touchstart", closeAttachmentMenu);
      document.removeEventListener("keydown", closeAttachmentMenuOnEscape);
    };
  }, [attachmentMenuOpen, kanbanCardAttachmentMenuOpen, kanbanCardMachineMenuOpen, quickAddAttachmentMenuOpen, quickAddMachineMenuOpen, kanbanSteerAttachmentMenuOpen]);

  useEffect(() => {
    if (!kanbanSteerTargetMenuOpen) return;
    function closeKanbanSteerTargetMenu(event: MouseEvent | TouchEvent) {
      const target = event.target;
      if (target instanceof Node && kanbanSteerTargetMenuRef.current?.contains(target)) return;
      setKanbanSteerTargetMenuOpen(false);
    }
    function closeKanbanSteerTargetMenuOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setKanbanSteerTargetMenuOpen(false);
    }
    document.addEventListener("mousedown", closeKanbanSteerTargetMenu);
    document.addEventListener("touchstart", closeKanbanSteerTargetMenu);
    document.addEventListener("keydown", closeKanbanSteerTargetMenuOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeKanbanSteerTargetMenu);
      document.removeEventListener("touchstart", closeKanbanSteerTargetMenu);
      document.removeEventListener("keydown", closeKanbanSteerTargetMenuOnEscape);
    };
  }, [kanbanSteerTargetMenuOpen]);

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
    if (!hydrated || activeView !== "agents") return;
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
  }, [activeView, agents, hydrated, sharedVault]);

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
      setTailscaleStatus(data?.ok ? `Tailscale ${data.backendState}` : "Tailscale not configured. Running locally.");
    }
    refreshTailscaleDevices();
  }, []);

  useEffect(() => {
    if (!hydrated || activeView !== "agents") return;
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
  }, [activeView, hydrated]);

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

  function startNewMirosharkSimulation(templateId?: TemplateId) {
    setMirosharkWorkspaceMode("new");
    setMirosharkRun(null);
    setMirosharkRunPending(false);
    setSelectedMirosharkRunId("");
    setMirosharkArchiveStatus("");
    setMirosharkWorkbenchTab("surface");
    const template = allMirosharkTemplates.find((item) => item.id === templateId) ?? allMirosharkTemplates[0];
    if (template) applyMirosharkTemplate(template);
  }

  function applyMirosharkTemplate(template: MiroSharkTemplate) {
    if (!template.id) return;
    setMirosharkWorkspaceMode("new");
    setMirosharkRun(null);
    setMirosharkRunPending(false);
    setSelectedMirosharkRunId("");
    setMirosharkSelectedTemplateId(template.id);
    const nextInputs = defaultMirosharkTemplateInputs(template.id);
    setMirosharkTemplateInputs(nextInputs);
    const platform = template.platforms && template.platforms.length > 1
      ? "parallel"
      : template.platforms?.includes("polymarket")
        ? "polymarket"
        : template.platforms?.includes("reddit")
          ? "reddit"
          : "twitter";
    setMirosharkPlatform(platform);
    if (template.estimated_rounds) setMirosharkRounds(Math.min(24, Math.max(1, template.estimated_rounds)));
    setMirosharkScenario(composeMirosharkTemplateScenario(template, nextInputs));
  }

  function updateMirosharkTemplateInput(template: MiroSharkTemplate, key: string, value: string) {
    setMirosharkTemplateInputs((current) => {
      const nextInputs = { ...current, [key]: value };
      setMirosharkScenario(composeMirosharkTemplateScenario(template, nextInputs));
      return nextInputs;
    });
  }

  function extractMirosharkHelperText(payload: unknown) {
    const data = payloadData((payload as { payload?: unknown } | null)?.payload ?? payload);
    if (typeof data === "string") return data;
    const record = asRecord(data);
    const direct = record.briefing ?? record.scenario ?? record.text ?? record.answer ?? record.content ?? record.summary;
    if (typeof direct === "string") return direct;
    const suggestions = payloadArray(data);
    const first = suggestions[0];
    if (typeof first === "string") return first;
    const firstRecord = asRecord(first);
    const suggestion = firstRecord.scenario ?? firstRecord.text ?? firstRecord.title ?? firstRecord.summary;
    return typeof suggestion === "string" ? suggestion : "";
  }

  async function runMirosharkScenarioHelper(action: "ask" | "suggest") {
    const draft = mirosharkScenario.trim();
    if (!draft) return;
    setMirosharkHelperPending(action);
    setMirosharkHelperStatus("");
    const response = await fetch("/api/miroshark/swarm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(action === "ask"
        ? { action, question: draft }
        : { action, textPreview: draft, question: mirosharkSelectedTemplate?.name }),
    }).catch(() => null);
    const data = await response?.json().catch(() => null) as { ok?: boolean; error?: string; payload?: unknown } | null;
    setMirosharkHelperPending("");
    if (!data?.ok) {
      setMirosharkHelperStatus(data?.error ?? "MiroShark helper failed.");
      return;
    }
    const helperText = extractMirosharkHelperText(data);
    if (helperText) {
      setMirosharkScenario(helperText);
      setMirosharkHelperStatus(action === "ask" ? "Seed brief loaded from MiroShark." : "Suggested scenario loaded from MiroShark.");
    } else {
      setMirosharkHelperStatus("MiroShark returned no helper text.");
    }
  }

  async function launchMirosharkSwarm() {
    setMirosharkRunPending(true);
    setMirosharkWorkspaceMode("run");
    setMirosharkRun(null);
    setSelectedMirosharkRunId("");
    setMirosharkArchiveStatus("");
    const response = await fetch("/api/miroshark/swarm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scenario: mirosharkScenario,
        rounds: mirosharkRounds,
        platform: mirosharkPlatform,
        templateId: mirosharkSelectedTemplate?.id,
        projectName: mirosharkSelectedTemplate?.name ? `${mirosharkSelectedTemplate.name} · HivemindOS` : undefined,
      }),
    }).catch(() => null);
    const data = await response?.json().catch(() => null) as MiroSharkRunResult | null;
    setMirosharkRun(data ?? { ok: false, error: "MiroShark run request failed" });
    if (!data?.jobId) setMirosharkRunPending(false);
  }

  async function runMirosharkSwarm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await launchMirosharkSwarm();
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
      setMirosharkArchiveLoading(false);
      return;
    }
    setMirosharkArchiveLoading(true);
    const params = new URLSearchParams();
    if (sharedVault.vaultPath.trim()) params.set("vaultPath", sharedVault.vaultPath.trim());
    const response = await fetch(`/api/miroshark/runs?${params.toString()}`, { cache: "no-store" }).catch(() => null);
    const data = await response?.json().catch(() => null) as { ok?: boolean; runs?: MiroSharkArchivedRun[]; error?: string } | null;
    setMirosharkArchiveLoading(false);
    if (data?.ok && Array.isArray(data.runs)) {
      setMirosharkArchiveRuns(data.runs);
      setMirosharkArchiveStatus(data.runs.length ? `Loaded ${data.runs.length} saved run${data.runs.length === 1 ? "" : "s"}` : "No saved MiroShark runs yet");
    } else {
      setMirosharkArchiveStatus(data?.error ?? "Could not load saved MiroShark runs");
    }
  }, [sharedVault.enabled, sharedVault.vaultPath]);

  const refreshBrainGraph = useCallback(async (force = false) => {
    if (!sharedVault.enabled) {
      setBrainGraph(null);
      setBrainGraphStatus("Shared brain is off.");
      brainGraphLoadedAtRef.current = 0;
      brainGraphVaultPathRef.current = "";
      return;
    }
    const requestedVaultPath = sharedVault.vaultPath.trim();
    if (
      !force
      && brainGraph
      && brainGraphVaultPathRef.current === requestedVaultPath
      && Date.now() - brainGraphLoadedAtRef.current < BRAIN_GRAPH_CLIENT_CACHE_MS
    ) return;
    setBrainGraphLoading(true);
    const response = await fetch("/api/obsidian/graph", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vaultPath: requestedVaultPath || undefined, force }),
    }).catch(() => null);
    const data = await response?.json().catch(() => null) as BrainGraphResponse | null;
    setBrainGraphLoading(false);
    if (!response?.ok || !data?.ok || !data.graph) {
      setBrainGraphStatus(data?.error ?? "Could not build brain graph.");
      return;
    }
    setBrainGraph(data.graph);
    brainGraphLoadedAtRef.current = Date.now();
    brainGraphVaultPathRef.current = requestedVaultPath;
    setSelectedBrainNodeId((current) => current || data.graph?.nodes[0]?.id || "");
    const noteCount = data.graph.nodes.filter((node) => !node.id.startsWith("unresolved:")).length;
    setBrainGraphStatus(data.graph.truncated
      ? `Loaded first ${noteCount} notes, ${data.graph.nodes.length} cells, and ${data.graph.links.length} links.`
      : `Loaded ${noteCount} notes, ${data.graph.nodes.length} cells, and ${data.graph.links.length} links.`);
  }, [brainGraph, sharedVault.enabled, sharedVault.vaultPath]);

  const refreshHermesUpdateRequirement = useCallback(async () => {
    const hermesAgent = agents.find((agent) => agent.runtime === "hermes");
    const response = await fetch("/api/runtimes/hermes/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(hermesAgent ? { agent: hermesAgent } : {}),
    }).catch(() => null);
    const data = await response?.json().catch(() => null) as { ok?: boolean; status?: RuntimeIntegrationStatus; error?: string } | null;
    if (!response?.ok || !data?.ok || !data.status) {
      setHermesUpdateRequiredDetail("");
      return "";
    }
    const detail = hermesUpdateDetail(data.status);
    setHermesUpdateRequiredDetail(detail);
    return detail;
  }, [agents]);

  const refreshBrainSkills = useCallback(async () => {
    if (!sharedVault.enabled) {
      setBrainSkills(null);
      setBrainSkillsStatus("Shared brain is off.");
      return;
    }
    void refreshHermesUpdateRequirement();
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
    const providerTotal = data.providers.reduce((sum, provider) => sum + provider.skills.length, 0);
    setBrainSkillsStatus(data.totals.shared || providerTotal
      ? `Loaded ${data.totals.shared} shared and ${providerTotal} installed skill${providerTotal === 1 ? "" : "s"}.`
      : "No shared or installed skills found yet.");
  }, [refreshHermesUpdateRequirement, sharedVault.enabled, sharedVault.vaultPath]);

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

	  const syncBrainSkillsToAeon = useCallback(async () => {
	    if (!sharedVault.enabled) {
	      setBrainSkillsStatus("Turn on the shared brain before syncing skills to Aeon.");
	      return;
	    }
	    const aeonAgent = agents.find((agent) => agent.id === selectedAgentId && agent.runtime === "aeon")
	      ?? agents.find((agent) => agent.runtime === "aeon");
    if (!aeonAgent) {
      setBrainSkillsStatus("Add an Aeon agent before syncing shared skills to Aeon.");
      return;
    }

    setBrainSkillAeonSyncing(true);
    const response = await fetch("/api/runtimes/aeon/skills/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agent: aeonAgent,
        vaultPath: sharedVault.vaultPath.trim() || undefined,
      }),
    }).catch(() => null);
    const data = await response?.json().catch(() => null) as BrainSkillAeonSyncResponse | null;
    setBrainSkillAeonSyncing(false);
    if (!response?.ok || !data?.ok) {
      setBrainSkillsStatus(data?.error ?? "Could not sync shared skills to Aeon.");
      return;
    }
	    const synced = data.result?.synced?.length ?? 0;
	    const skipped = data.result?.skipped?.length ?? 0;
	    setBrainSkillsStatus(`Synced ${synced} shared skill${synced === 1 ? "" : "s"} to Aeon${skipped ? `, skipped ${skipped} conflict${skipped === 1 ? "" : "s"}` : ""}.`);
	    void refreshBrainSkills();
	  }, [agents, refreshBrainSkills, selectedAgentId, sharedVault.enabled, sharedVault.vaultPath]);

  const openSkillBrowser = useCallback(async () => {
    setSkillBrowserOpen(true);
    setSkillBrowserStatus("");
    setSkillBrowserLoading(true);
    const hermesDetailPromise = refreshHermesUpdateRequirement();
    const [featuredResponse, communityResponse] = await Promise.all([
      fetch("/api/openclaw/amiclaw-skills", { cache: "no-store" }).catch(() => null),
      fetch("/api/openclaw/skills?limit=24", { cache: "no-store" }).catch(() => null),
    ]);
    const hermesDetail = await hermesDetailPromise;
    const hermesUpdateRequired = Boolean(hermesDetail || hermesUpdateRequiredDetail);
    const featured = await featuredResponse?.json().catch(() => null) as { skills?: Array<Record<string, unknown>> } | null;
    const community = await communityResponse?.json().catch(() => null) as { skills?: Array<Record<string, unknown>> } | null;
    const featuredSkills = (featured?.skills ?? []).map((skill) => ({
      id: String(skill.slug ?? skill.id ?? skill.name ?? Math.random()),
      slug: String(skill.slug ?? skill.id ?? skill.name ?? "skill"),
      name: String(skill.name ?? skill.slug ?? "Skill"),
      description: String(skill.description ?? ""),
      source: "Featured",
      category: typeof skill.category === "string" ? skill.category : undefined,
      skillMdUrl: typeof skill.skillMdUrl === "string" ? skill.skillMdUrl : undefined,
      githubUrl: typeof skill.githubUrl === "string" ? skill.githubUrl : typeof skill.githubRepoUrl === "string" ? skill.githubRepoUrl : undefined,
      requiresHermesUpdate: skillRequiresHermesUpdate({
        slug: String(skill.slug ?? skill.id ?? skill.name ?? "skill"),
        name: String(skill.name ?? skill.slug ?? "Skill"),
        description: String(skill.description ?? ""),
        source: "Featured",
      }, hermesUpdateRequired),
    }));
    const communitySkills = (community?.skills ?? []).map((skill) => ({
      id: String(skill.slug ?? skill.id ?? skill.name ?? Math.random()),
      slug: String(skill.slug ?? skill.id ?? skill.name ?? "skill"),
      name: String(skill.name ?? skill.slug ?? "Skill"),
      description: String(skill.description ?? ""),
      source: "Community",
      category: typeof skill.category === "string" ? skill.category : undefined,
      skillMdUrl: typeof skill.skillMdUrl === "string" ? skill.skillMdUrl : undefined,
      githubUrl: typeof skill.githubUrl === "string" ? skill.githubUrl : typeof skill.githubRepoUrl === "string" ? skill.githubRepoUrl : undefined,
      requiresHermesUpdate: skillRequiresHermesUpdate({
        slug: String(skill.slug ?? skill.id ?? skill.name ?? "skill"),
        name: String(skill.name ?? skill.slug ?? "Skill"),
        description: String(skill.description ?? ""),
        source: "Community",
      }, hermesUpdateRequired),
    }));
    const installedSkills: SkillBrowserSkill[] = (brainSkills?.providers ?? []).flatMap((provider) => provider.skills.map((skill) => ({
      id: `${provider.id}-${skill.slug}`,
      slug: skill.slug,
      name: skill.name,
      description: skill.description,
      source: provider.label,
      category: "Installed",
      providerId: provider.id,
      imported: skill.imported,
      requiresHermesUpdate: skillRequiresHermesUpdate({ ...skill, providerId: provider.id, source: provider.label }, hermesUpdateRequired),
    })));
    const sharedSkills: SkillBrowserSkill[] = (brainSkills?.shared ?? []).map((skill) => ({
      id: `shared-${skill.slug}`,
      slug: skill.slug,
      name: skill.name,
      description: skill.description,
      source: "Shared brain",
      category: "Ready",
      providerId: "shared" as const,
      imported: true,
      requiresHermesUpdate: skillRequiresHermesUpdate({ ...skill, providerId: "shared" as const, source: "Shared brain" }, hermesUpdateRequired),
    }));
    const deduped = new Map<string, SkillBrowserSkill>();
    for (const skill of [...sharedSkills, ...installedSkills, ...featuredSkills, ...communitySkills]) {
      const key = skill.skillMdUrl || skill.githubUrl || skill.slug;
      if (!deduped.has(key)) deduped.set(key, skill);
    }
    setSkillBrowserSkills([...deduped.values()]);
    setSkillBrowserLoading(false);
    if (!featuredResponse?.ok && !communityResponse?.ok) {
      setSkillBrowserStatus("Could not reach the skill catalogs. Provider-installed skills can still be imported below.");
    } else if (!communityResponse?.ok) {
      setSkillBrowserStatus("Featured skills loaded. Community catalog is unavailable on this machine.");
    }
  }, [brainSkills, hermesUpdateRequiredDetail, refreshHermesUpdateRequirement]);

  const importRemoteSkillToBrain = useCallback(async (skill: SkillBrowserSkill) => {
    if (skill.providerId === "shared") {
      setSkillBrowserStatus(`${skill.name} is already in the shared brain.`);
      return;
    }
    if (skill.providerId) {
      await importBrainSkills(skill.providerId);
      setSkillBrowserStatus(`Synced ${skill.name} from ${skill.source} into the shared brain.`);
      return;
    }
    if (!sharedVault.enabled) {
      setSkillBrowserStatus("Turn on the shared brain before adding skills.");
      return;
    }
    setSkillBrowserImporting(skill.id);
    setSkillBrowserStatus("");
    const response = await fetch("/api/obsidian/skills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "import-remote",
        vaultPath: sharedVault.vaultPath.trim() || undefined,
        skill,
      }),
    }).catch(() => null);
    const data = await response?.json().catch(() => null) as BrainSkillInventory | { ok?: boolean; error?: string } | null;
    setSkillBrowserImporting("");
    if (!response?.ok || !data?.ok) {
      setSkillBrowserStatus(data?.error ?? "Could not add that skill to the shared brain.");
      return;
    }
    setBrainSkills(data as BrainSkillInventory);
    setSkillBrowserStatus(`Added ${skill.name} to the shared brain.`);
    void refreshBrainGraph();
    void refreshBrainSkills();
  }, [importBrainSkills, refreshBrainGraph, refreshBrainSkills, sharedVault.enabled, sharedVault.vaultPath]);

  const installGithubSkillToBrain = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const githubUrl = skillBrowserGithubUrl.trim();
    if (!githubUrl) {
      setSkillBrowserStatus("Enter a GitHub skill URL first.");
      return;
    }
    if (!sharedVault.enabled) {
      setSkillBrowserStatus("Turn on the shared brain before installing from GitHub.");
      return;
    }

    setSkillBrowserGithubInstalling(true);
    setSkillBrowserStatus("");
    const response = await fetch("/api/obsidian/skills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "import-github",
        vaultPath: sharedVault.vaultPath.trim() || undefined,
        githubUrl,
      }),
    }).catch(() => null);
    const data = await response?.json().catch(() => null) as BrainSkillInventory | { ok?: boolean; error?: string } | null;
    setSkillBrowserGithubInstalling(false);
    if (!response?.ok || !data?.ok) {
      setSkillBrowserStatus(data?.error ?? "Could not install that GitHub skill.");
      return;
    }

    setBrainSkills(data as BrainSkillInventory);
    setSkillBrowserGithubUrl("");
    setSkillBrowserGithubOpen(false);
    setSkillBrowserStatus("Installed GitHub skill into the shared brain.");
    void refreshBrainGraph();
    void refreshBrainSkills();
  }, [refreshBrainGraph, refreshBrainSkills, sharedVault.enabled, sharedVault.vaultPath, skillBrowserGithubUrl]);

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
        messagingHandledBy: "Configured messaging agent",
        updatedAt: new Date().toISOString(),
      },
    });
    setNotificationCursor(data.nextCursor ?? null);
    setNotificationsStatus(data.total ? `Loaded ${Math.min((options.append ? notificationCountRef.current : 0) + (data.notifications?.length ?? 0), data.total)} of ${data.total}` : "No notifications yet.");
  }, [sharedVault.enabled, sharedVault.notificationsFolder, sharedVault.vaultPath]);

  async function loadMirosharkArchivedRun(simulationId: string) {
    setSelectedMirosharkRunId(simulationId);
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
    if (mirosharkRun?.archived) return;
    const runParams = new URLSearchParams();
    if (mirosharkRun?.simulationId) {
      runParams.set("simulation_id", mirosharkRun.simulationId);
      runParams.set("platform", mirosharkRun.platform ?? mirosharkPlatform);
      if (mirosharkRun.graphId) runParams.set("graph_id", mirosharkRun.graphId);
      if (mirosharkRun.projectId) runParams.set("project_id", mirosharkRun.projectId);
    }
    const shouldFetchRun = mirosharkRun?.simulationId && mirosharkRun.status === "started";
    const query = shouldFetchRun
      ? runParams.toString()
      : mirosharkRun?.jobId
        ? `job_id=${encodeURIComponent(mirosharkRun.jobId)}`
        : mirosharkRun?.simulationId
          ? runParams.toString()
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
  const allMirosharkTemplates = useMemo(() => {
    const seen = new Set<string>();
    return [...SWARM_LAUNCH_PRESETS, ...mirosharkTemplates].filter((template) => {
      const id = template.id;
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [mirosharkTemplates]);
  const mirosharkSelectedTemplate = allMirosharkTemplates.find((template) => template.id === mirosharkSelectedTemplateId);
  const mirosharkSelectedTemplateFields = MIROSHARK_TEMPLATE_INPUTS[mirosharkSelectedTemplate?.id ?? ""] ?? [];
  const mirosharkMissingTemplateFields = mirosharkSelectedTemplateFields.filter((field) => (
    field.required && !mirosharkTemplateInputs[field.key]?.trim()
  ));
  const mirosharkTelemetryCount = payloadCount(mirosharkRun?.observabilityEvents ?? mirosharkMetadata?.observabilityEvents);
  const mirosharkActionCount = payloadCount(mirosharkRun?.actions);
  const mirosharkMarketCount = payloadCount(mirosharkRun?.markets);
  const mirosharkTimelineItems = payloadArray<Record<string, unknown>>(mirosharkRun?.timeline).slice(0, 24);
  const mirosharkActionItems = payloadArray<Record<string, unknown>>(mirosharkRun?.actions).slice(0, 24);
  const mirosharkProfileItems = payloadArray<Record<string, unknown>>(mirosharkRun?.profiles ?? mirosharkRun?.realtimeProfiles).slice(0, 12);
  const mirosharkMarketItems = payloadArray<Record<string, unknown>>(mirosharkRun?.markets).slice(0, 8);
  const mirosharkObservabilityItems = payloadArray<Record<string, unknown>>(mirosharkRun?.observabilityEvents ?? mirosharkMetadata?.observabilityEvents).slice(0, 18);
  const mirosharkLlmCallItems = payloadArray<Record<string, unknown>>(mirosharkRun?.llmCalls ?? mirosharkMetadata?.llmCalls).slice(0, 10);
  const swarmTemplates = useMemo<SwarmTemplate[]>(() => (
    allMirosharkTemplates.map((template) => ({
      id: swarmTemplateIdFromMirosharkTemplate(template),
      label: template.name ?? template.id ?? "MiroShark template",
      kind: template.category ?? template.platforms?.join(" + ") ?? "simulation",
      agents: template.estimated_agents ?? 0,
      desc: template.description ?? "MiroShark template returned by the companion.",
      platforms: template.platforms,
    }))
  ), [allMirosharkTemplates]);
  const swarmTimelineItems = useMemo(() => (
    [...mirosharkTimelineItems, ...mirosharkActionItems].slice(0, 24).map(swarmEventItem)
  ), [mirosharkActionItems, mirosharkTimelineItems]);
  const swarmObservabilityItems = useMemo(() => (
    mirosharkObservabilityItems.map(swarmEventItem)
  ), [mirosharkObservabilityItems]);
  const swarmAgents = useMemo<SwarmAgent[]>(() => (
    mirosharkProfileItems.map((profile, index) => {
      const roleText = String(profile.role ?? profile.entity_type ?? profile.platform ?? "simulation participant");
      const faction: SwarmAgent["faction"] = /risk|ops|monitor|admin|safety/i.test(roleText)
        ? "OPS"
        : /market|maker|liquidity|trade|polymarket/i.test(roleText)
          ? "MM"
          : /take|buyer|seller|whale/i.test(roleText)
            ? "TKR"
            : "INFO";
      return {
        id: String(profile.user_id ?? profile.id ?? `profile-${index}`),
        name: String(profile.name ?? profile.agent_name ?? profile.username ?? `Agent ${index + 1}`),
        role: roleText,
        faction,
        ledger: String(profile.pnl ?? profile.score ?? profile.status ?? "live"),
        trades: numericRecordValue(profile, ["trades", "actions", "posts"], 0),
        status: "live",
      };
    })
  ), [mirosharkProfileItems]);
  const swarmDecisions = useMemo<SwarmDecision[]>(() => (
    swarmTimelineItems.slice(0, 10).map((item, index) => {
      const agent = swarmAgents[index % Math.max(1, swarmAgents.length)];
      return {
        who: agent?.name ?? "MiroShark",
        role: agent?.faction ?? "INFO",
        action: item.title,
        detail: item.body,
      };
    })
  ), [swarmAgents, swarmTimelineItems]);
  const swarmThreadPosts = useMemo(() => (
    mirosharkPosts.posts.map((post, index) => ({
      id: String(post.post_id ?? index),
      author: mirosharkUserName(post.user_id),
      handle: mirosharkHandle(post.user_id),
      text: post.displayText,
      time: typeof post.created_at === "number" ? `round ${post.created_at}` : "saved",
      replies: index === 0 ? Math.max(0, mirosharkPosts.posts.length - 1) : mirosharkStat(post.post_id, 0, 9),
      reposts: post.num_shares ?? mirosharkStat(post.post_id, 0, 13),
      likes: post.num_likes ?? mirosharkStat(post.post_id, 1, 42),
      views: mirosharkStat(post.post_id, 90, 540),
    }))
  ), [mirosharkPosts.posts]);
  const swarmSocialPosts = useMemo<SwarmSocialPost[]>(() => (
    swarmThreadPosts.slice(0, 8).map((post, index) => {
      const agent = swarmAgents[index % Math.max(1, swarmAgents.length)];
      return {
        id: post.id,
        who: post.author,
        faction: agent?.faction ?? "INFO",
        t: post.time,
        text: post.text,
        reacts: { up: post.likes, down: 0 },
      };
    })
  ), [swarmAgents, swarmThreadPosts]);
  const swarmMarket = useMemo<SwarmMarket>(() => (
    swarmMarketFromItems(mirosharkMarketItems, swarmTimelineItems)
  ), [mirosharkMarketItems, swarmTimelineItems]);
  const swarmIntegrationItems = useMemo(() => {
    const sections: Array<[string, unknown]> = [
      ["Run detail", mirosharkRun?.runStatusDetail],
      ["Template capabilities", mirosharkMetadata?.templateCapabilities],
      ["Enriched templates", mirosharkMetadata?.templateDetails],
      ["Graph data", mirosharkRun?.graphData],
      ["Entities", mirosharkRun?.entities],
      ["Project", mirosharkRun?.project],
      ["Report", mirosharkRun?.report],
      ["Interviews", mirosharkRun?.interviewHistory],
      ["Embed summary", mirosharkRun?.embedSummary],
      ["Transcript", mirosharkRun?.transcriptJson],
      ["Webhook log", mirosharkRun?.webhookLog],
      ["Surface stats", mirosharkRun?.surfaceStats],
      ["Public gallery", mirosharkMetadata?.publicRuns],
      ["Run list", mirosharkMetadata?.simulationList],
      ["Settings", mirosharkMetadata?.settings],
      ["MCP", mirosharkMetadata?.mcpStatus],
      ["Push", mirosharkMetadata?.pushVapidKey],
    ];
    return sections.map(([title, payload], index) => ({
      id: `miroshark-integration-${index}`,
      title,
      body: payloadPreview(payload, 3).map(([key, value]) => `${key}: ${value}`).join(" · ") || compactValue(payload),
      meta: `${payloadCount(payload)} records`,
      level: asRecord(payload).success === false ? "warn" as const : "info" as const,
      raw: payload,
    }));
  }, [
    mirosharkMetadata?.mcpStatus,
    mirosharkMetadata?.publicRuns,
    mirosharkMetadata?.pushVapidKey,
    mirosharkMetadata?.settings,
    mirosharkMetadata?.simulationList,
    mirosharkMetadata?.templateCapabilities,
    mirosharkMetadata?.templateDetails,
    mirosharkRun?.embedSummary,
    mirosharkRun?.entities,
    mirosharkRun?.graphData,
    mirosharkRun?.interviewHistory,
    mirosharkRun?.project,
    mirosharkRun?.report,
    mirosharkRun?.runStatusDetail,
    mirosharkRun?.surfaceStats,
    mirosharkRun?.transcriptJson,
    mirosharkRun?.webhookLog,
  ]);
  const swarmMarketPriceItems = useMemo(() => (
    (Array.isArray(mirosharkRun?.marketPrices) ? mirosharkRun.marketPrices : []).map(swarmMarketPriceEventItem)
  ), [mirosharkRun?.marketPrices]);
  const swarmExportLinks = useMemo(() => (
    Object.entries(mirosharkRun?.links ?? {})
      .filter(([key]) => /shareCard|replayGif|transcript|trajectory|chartSvg|threadTxt|threadJson|reproduceJson|notebook|embedSummary|webhookLog|dkgCitation|report|export/.test(key))
      .map(([key, href]) => ({
        key,
        label: key.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase()),
        href,
      }))
  ), [mirosharkRun?.links]);
  const currentSwarmRun = useMemo<SwarmRun | null>(() => {
    if (!mirosharkRun) return null;
    const archivedSummary = mirosharkRun.archivedSummary
      ?? mirosharkArchiveRuns.find((run) => run.simulationId === mirosharkRun.simulationId);
    const runScenario = (archivedSummary?.scenario ?? mirosharkScenario).trim();
    const totalRounds = mirosharkTotalRounds || mirosharkRun.rounds || mirosharkRounds;
    const title = runScenario.slice(0, 90)
      || mirosharkRun.message
      || (mirosharkRun.simulationId ? `Simulation ${mirosharkRun.simulationId}` : "MiroShark run");
    return {
      id: mirosharkRun.simulationId ?? mirosharkRun.jobId ?? "active-miroshark-run",
      title,
      template: mirosharkRun.templateId ?? swarmTemplateIdFromSurface(mirosharkRun.platform ?? mirosharkPlatform),
      state: swarmRunState(mirosharkRun, mirosharkRunnerStatus),
      rounds: totalRounds,
      currentRound: Math.min(mirosharkCurrentRound || totalRounds, totalRounds || mirosharkCurrentRound),
      sharpe: null,
      pnl: null,
      started: archivedSummary?.savedAt || mirosharkRun.archivedAt
        ? formatRelativeTime(Date.parse(archivedSummary?.savedAt ?? mirosharkRun.archivedAt ?? ""))
        : "active",
      agents: swarmAgents.length || payloadCount(mirosharkRun.profiles ?? mirosharkRun.realtimeProfiles),
      news: swarmTimelineItems.length + swarmObservabilityItems.length,
      posts: Math.max(mirosharkPosts.count, archivedSummary?.postCount ?? 0),
      trades: mirosharkActionCount + mirosharkMarketCount + swarmTimelineItems.length,
      tags: [mirosharkRun.platform ?? mirosharkPlatform, mirosharkDisplayStatus].filter(Boolean),
      summary: mirosharkRun.message ?? mirosharkRun.error ?? runScenario,
      platform: mirosharkRun.platform ?? mirosharkPlatform,
      scenario: runScenario,
      threadPosts: swarmThreadPosts,
      timelineItems: swarmTimelineItems,
      marketItems: mirosharkMarketItems.map(swarmMarketEventItem),
      profileItems: mirosharkProfileItems.map(swarmEventItem),
      observabilityItems: swarmObservabilityItems,
      integrationItems: swarmIntegrationItems,
      exportLinks: swarmExportLinks,
      marketPriceItems: swarmMarketPriceItems,
    };
  }, [
    mirosharkActionCount,
    mirosharkArchiveRuns,
    mirosharkCurrentRound,
    mirosharkDisplayStatus,
    mirosharkMarketCount,
    mirosharkMarketItems,
    mirosharkPlatform,
    mirosharkPosts.count,
    mirosharkProfileItems,
    mirosharkRounds,
    mirosharkRun,
    mirosharkRunnerStatus,
    mirosharkScenario,
    mirosharkTotalRounds,
    swarmAgents.length,
    swarmExportLinks,
    swarmIntegrationItems,
    swarmMarketPriceItems,
    swarmObservabilityItems,
    swarmThreadPosts,
    swarmTimelineItems,
  ]);
  const swarmRuns = useMemo<SwarmRun[]>(() => {
    const archived = mirosharkArchiveRuns.map((run) => ({
      id: run.simulationId,
      title: run.scenario?.trim().slice(0, 90) || `Simulation ${run.simulationId}`,
      template: swarmTemplateIdFromSurface(run.platform),
      state: run.status === "failed" ? "failed" as const : "done" as const,
      rounds: run.rounds ?? 0,
      currentRound: run.rounds ?? 0,
      sharpe: null,
      pnl: null,
      started: formatRelativeTime(Date.parse(run.savedAt)),
      agents: 0,
      news: 0,
      posts: run.postCount,
      trades: 0,
      tags: [run.platform ?? "surface", run.status ?? "saved"],
      summary: run.scenario ?? `Saved MiroShark simulation ${run.simulationId}`,
      platform: run.platform,
      scenario: run.scenario,
    }));

    if (!currentSwarmRun) return archived;

    const selectedArchivedIndex = archived.findIndex((run) => run.id === currentSwarmRun.id);
    if (selectedArchivedIndex === -1) return [currentSwarmRun, ...archived];

    return archived.map((run, index) => (
      index === selectedArchivedIndex
        ? { ...run, ...currentSwarmRun, started: run.started, state: run.state }
        : run
    ));
  }, [currentSwarmRun, mirosharkArchiveRuns]);
  const swarmStatusLabel = mirosharkStatus?.ok ? "connected" : mirosharkStatus?.install.running ? "starting" : "offline";
  const selectedSwarmRunId = selectedMirosharkRunId || currentSwarmRun?.id || (mirosharkWorkspaceMode === "new" ? "" : undefined);

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
    }, 0);
    const skillsTimer = window.setTimeout(() => {
      void refreshBrainSkills();
    }, 350);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(skillsTimer);
    };
  }, [activeView, hydrated, refreshBrainGraph, refreshBrainSkills]);

  useEffect(() => {
    if (!hydrated || activeView !== "scheduler" || brainSkills || brainSkillsLoading) return;
    const timer = window.setTimeout(() => {
      void refreshBrainSkills();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activeView, brainSkills, brainSkillsLoading, hydrated, refreshBrainSkills]);

  useEffect(() => {
    if (!hydrated || agentWorkerClassView !== "create" || brainSkills || brainSkillsLoading) return;
    const timer = window.setTimeout(() => {
      void refreshBrainSkills();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [agentWorkerClassView, brainSkills, brainSkillsLoading, hydrated, refreshBrainSkills]);

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
    if (!hydrated || !sharedVault.enabled || !mirosharkRun?.simulationId || mirosharkRun.archived) return;
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
    if (mirosharkRun?.archived || !mirosharkRun?.jobId || mirosharkRun.status === "started" || mirosharkRun.status === "failed") return;
    const timer = window.setInterval(refreshMirosharkRun, 3_000);
    return () => window.clearInterval(timer);
  }, [mirosharkRun?.archived, mirosharkRun?.jobId, mirosharkRun?.status, refreshMirosharkRun]);

  useEffect(() => {
    if (mirosharkRun?.archived || mirosharkRun?.status !== "started" || !mirosharkRun.simulationId || mirosharkRun.posts) return;
    const timer = window.setTimeout(() => {
      void refreshMirosharkRun();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [mirosharkRun?.archived, mirosharkRun?.posts, mirosharkRun?.simulationId, mirosharkRun?.status, refreshMirosharkRun]);

  useEffect(() => {
    if (mirosharkRun?.archived || mirosharkRun?.status !== "started" || !mirosharkRun.simulationId) return;
    if (isMiroSharkRunTerminal(mirosharkRunnerStatus)) return;

    const simulationId = mirosharkRun.simulationId;
    const platform = mirosharkRun.platform ?? mirosharkPlatform;
    const graphId = mirosharkRun.graphId;
    const projectId = mirosharkRun.projectId;
    const pollRun = async () => {
      const params = new URLSearchParams({ simulation_id: simulationId, platform });
      if (graphId) params.set("graph_id", graphId);
      if (projectId) params.set("project_id", projectId);
      const response = await fetch(`/api/miroshark/swarm?${params.toString()}`, {
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
    mirosharkRun?.archived,
    mirosharkRun?.platform,
    mirosharkRun?.graphId,
    mirosharkRun?.projectId,
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
    if (!hydrated || activeView !== "kanban") return;
    let cancelled = false;
    async function refreshKanban() {
      setKanbanLoading(true);
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
        setKanbanLoading(false);
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
      setKanbanLoading(false);
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
    activeView,
    hydrated,
    sharedVault.enabled,
    sharedVault.kanbanFolder,
    sharedVault.vaultPath,
  ]);

  const discoveredAgents = useMemo(
    () => discoveredMachines.flatMap((machine) => machine.agents ?? []).map(normalizeAgentProfile),
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
    const discoveredIds = new Set(discoveredAgents.map((agent) => agent.id));
    const snapshotOwnerByCollector = new Map<string, string>();
    candidateAgents.forEach((agent) => {
      const key = collectorRuntimeKey(agent);
      if (key && discoveredIds.has(agent.id) && !snapshotOwnerByCollector.has(key)) {
        snapshotOwnerByCollector.set(key, agent.id);
      }
    });
    candidateAgents.forEach((agent) => {
      const key = collectorRuntimeKey(agent);
      if (key && !snapshotOwnerByCollector.has(key)) {
        snapshotOwnerByCollector.set(key, agent.id);
      }
    });
    const idsForAgent = (agentId: string) => [agentId, ...[...agentAliases.entries()]
      .filter(([, canonicalId]) => canonicalId === agentId)
      .map(([aliasId]) => aliasId)];
    return Object.fromEntries(candidateAgents.map((agent) => {
      const relatedIds = idsForAgent(agent.id);
      const ownsCollectorSnapshot = snapshotOwnerByCollector.get(collectorRuntimeKey(agent)) === agent.id;
      const agentTasks = tasks
        .filter((task) => relatedIds.includes(task.agentId))
        .map((task) => ({ ...task, agentId: agent.id }))
        .sort((a, b) => b.updatedAt - a.updatedAt);
      const observedTasks = ownsCollectorSnapshot
        ? relatedIds.flatMap((agentId) => fleetSnapshots[agentId]?.tasks ?? [])
        : [];
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
  }, [agentAliases, candidateAgents, discoveredAgents, fleetSnapshots, messagesByAgent, tasks]);

  const displayAgents = useMemo(
    () => candidateAgents.filter((agent) => !isStarterPlaceholder(agent, candidateWorkById, messagesByAgent)),
    [candidateAgents, candidateWorkById, messagesByAgent],
  );

  useEffect(() => {
    if (!hydrated || !sharedVault.enabled) return;
    void refreshSharedSchedulesFromVault();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, sharedVault.enabled, sharedVault.vaultPath, sharedVault.scheduledFolder, displayAgents.length]);

  const agentWorkById = useMemo(() => {
    return Object.fromEntries(displayAgents.map((agent) => [agent.id, candidateWorkById[agent.id] ?? []]));
  }, [candidateWorkById, displayAgents]);

  const effectiveSelectedAgentId = agentAliases.get(selectedAgentId) ?? selectedAgentId;

  const selectedAgent = useMemo(
    () => displayAgents.find((agent) => agent.id === effectiveSelectedAgentId) ?? displayAgents[0],
    [displayAgents, effectiveSelectedAgentId],
  );

  const sharedSkillOptions = useMemo(() => {
    const deduped = new Map<string, { slug: string; name: string; description: string }>();
    for (const skill of brainSkills?.shared ?? []) {
      deduped.set(skill.slug, { slug: skill.slug, name: skill.name, description: skill.description });
    }
    for (const provider of brainSkills?.providers ?? []) {
      for (const skill of provider.skills) {
        if (!deduped.has(skill.slug)) deduped.set(skill.slug, { slug: skill.slug, name: skill.name, description: skill.description });
      }
    }
    return [...deduped.values()];
  }, [brainSkills]);

  const filteredSkillBrowserSkills = useMemo(() => {
    const query = skillBrowserSearch.trim().toLowerCase();
    if (!query) return skillBrowserSkills;
    return skillBrowserSkills.filter((skill) => (
      skill.name.toLowerCase().includes(query)
      || skill.slug.toLowerCase().includes(query)
      || skill.description.toLowerCase().includes(query)
      || skill.source.toLowerCase().includes(query)
    ));
  }, [skillBrowserSearch, skillBrowserSkills]);

  const hermesUpdateRequired = Boolean(hermesUpdateRequiredDetail);

  const filteredSchedulerSkills = useMemo(() => {
    const query = schedulerSkillSearch.trim().toLowerCase();
    if (!query) return sharedSkillOptions;
    return sharedSkillOptions.filter((skill) => (
      skill.name.toLowerCase().includes(query)
      || skill.slug.toLowerCase().includes(query)
    ));
  }, [schedulerSkillSearch, sharedSkillOptions]);

  useEffect(() => {
    if (!displayAgents.length) return;
    const nextAgentId = selectedAgent?.id ?? displayAgents[0]?.id ?? "";
    const handle = window.setTimeout(() => {
      setScheduleDraft((current) => current.agentId ? current : { ...current, agentId: nextAgentId });
    }, 0);
    return () => window.clearTimeout(handle);
  }, [displayAgents, selectedAgent?.id]);

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
      const mergedMessages = relatedIds
        .flatMap((agentId) => messagesByAgent[agentId] ?? [])
        .filter(isManualAgentChatMessage);
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
      relay: device.relay,
      online: device.online,
      self: device.self,
      collector: (discovered?.collector ?? "unknown") as MachineGroup["collector"],
      agents: [] as AgentProfile[],
      version: discovered?.version,
      capabilities: discovered?.capabilities,
      envSync: discovered?.envSync,
      };
    });
    discoveredMachines.forEach((machine) => {
      const key = collectorKey(machine.device.collectorUrl);
      if (!key || groups.some((group) => group.key === key)) return;
      if (
        machine.device.self
        && isLoopbackCollector(machine.device.collectorUrl)
        && groups.some((group) => group.self && !isLoopbackCollector(group.collectorUrl))
      ) {
        return;
      }
      groups.push({
        key,
        name: machine.device.self ? "This machine" : machine.device.name,
        address: machine.device.ip || machine.device.dnsName || "Local collector",
        collectorUrl: machine.device.collectorUrl,
        dnsName: machine.device.dnsName,
        ip: machine.device.ip,
        relay: machine.device.relay,
        online: machine.device.online,
        self: machine.device.self,
        collector: machine.collector,
        agents: [],
        version: machine.version,
        capabilities: machine.capabilities,
        envSync: machine.envSync,
      });
    });
    const unassigned: MachineGroup = {
      key: "unassigned",
      name: "Not connected yet",
      address: "These saved agents are waiting for a machine collector",
      collectorUrl: "",
      dnsName: "",
      ip: "",
      relay: "",
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

  const kanbanMachineTargets = useMemo<KanbanMachineTarget[]>(() => machineGroups
    .filter((machine) => machine.key !== "unassigned" && machine.collector === "ready" && machine.agents.length > 0)
    .map((machine) => ({
      key: machine.key,
      name: machine.self ? "This Mac" : machine.name,
      collectorUrl: machine.collectorUrl,
    })), [machineGroups]);

  const agentsForKanbanTask = useCallback((task: KanbanTask) => {
    const target = task.targetMachine;
    if (!target?.key) return displayAgents;
    const targetKey = collectorKey(target.collectorUrl) || target.key;
    return displayAgents.filter((agent) => {
      const agentKey = collectorKey(agent.telemetryUrl);
      if (agentKey && agentKey === targetKey) return true;
      return Boolean(agent.machineName && agent.machineName === target.name);
    });
  }, [displayAgents]);

  const visibleAgentCount = useMemo(
    () => machineGroups.reduce((total, machine) => total + machine.agents.length, 0),
    [machineGroups],
  );

  const fleetViewData = useMemo(() => {
    const machines: FleetMachine[] = machineGroups.map((machine, index) => {
      const location = fleetMachineLocation(machine, index);
      return {
        id: machine.key,
        name: machine.self ? "This Mac" : machine.name,
        kind: machine.self ? "Desktop" : machine.collector === "ready" ? "Tailnet Node" : "Setup Target",
        role: machine.self ? "Primary" : machine.collector === "ready" ? "Workhorse" : "Pending",
        os: machine.version?.branch ? `${machine.version.branch} · ${machine.version.shortCommit ?? "local"}` : machine.collector === "ready" ? "Collector online" : "Collector pending",
        tailnet: machine.dnsName || machine.collectorUrl || machine.address || "not connected",
        ip: machine.ip || machine.address || "—",
        ping: machine.online ? fleetMetric(machine.key, 4, 68) : 0,
        cpu: fleetMetric(`${machine.key}:cpu`, machine.collector === "ready" ? 12 : 2, machine.collector === "ready" ? 82 : 18),
        ram: fleetMetric(`${machine.key}:ram`, 18, 86),
        disk: fleetMetric(`${machine.key}:disk`, 12, 88),
        version: machine.version?.shortCommit ? `build ${machine.version.shortCommit}` : machine.collector === "ready" ? "current" : "—",
        versionState: fleetVersionState(machine),
        location: location.location,
        city: location.city,
        lat: location.lat,
        lon: location.lon,
        uptime: machine.online ? "online" : "offline",
        networkIssue: machineNetworkIssue(machine, tailscaleStatus),
        agents: machine.agents.map((agent) => {
          const agentWork = agentWorkById[agent.id] ?? [];
          const activeCount = agentWork.filter(isMeaningfulActive).length;
          const snapshot = fleetSnapshots[agent.id];
          const primaryWork = agentWork[0];
          const hasMachineWiring = Boolean(agent.telemetryUrl || machine.self);
          const wallet = walletsByAgent[agent.id] ?? createDefaultAgentWallet(agent.id);
          const survival = getSurvivalSnapshot(wallet);
          return {
            id: agent.id,
            name: agent.name,
            runtime: RUNTIME_LABELS[agent.runtime],
            canChat: runtimeCan(agent, "chat"),
            state: fleetAgentState(agent, snapshot, activeCount, hasMachineWiring),
            role: beeRoleLabel(agent.beeRole),
            beeRole: agent.beeRole,
            workerClass: agent.workerClass ?? "general",
            wallet: wallet.enabled ? `$${survival.effectiveBalanceUsd.toFixed(2)}` : "off",
            balance: wallet.enabled
              ? survival.tier === "dead" || survival.tier === "critical"
                ? "dead"
                : survival.tier === "low_compute"
                  ? "low_compute"
                  : "healthy"
              : "off",
            task: primaryWork
              ? cleanActivityTitle(primaryWork.title)
              : snapshot?.summary || "Idle · waiting for the next handoff",
            since: primaryWork?.updatedAt ? formatRelativeTime(primaryWork.updatedAt) : snapshot?.checkedAt ? formatRelativeTime(snapshot.checkedAt) : "—",
          };
        }),
      };
    });

    const edges: Array<[string, string]> = machines.slice(1).map((machine) => [machines[0]?.id ?? machine.id, machine.id]);
    const tasks: FleetTask[] = Object.entries(agentWorkById).flatMap(([agentId, work]) => {
      const agent = displayAgents.find((item) => item.id === agentId);
      const machine = machineGroups.find((group) => group.agents.some((item) => item.id === agentId));
      return work.slice(0, 3).map((task): FleetTask => ({
        id: task.id,
        title: cleanActivityTitle(task.title),
        agent: agent?.name ?? agentId,
        machine: machine?.name ?? "unassigned",
        state: task.status === "active" ? "in_progress" : task.status === "failed" ? "blocked" : task.status === "completed" ? "done" : "queue",
        priority: task.status === "failed" ? "high" : "med",
        eta: task.updatedAt ? formatRelativeTime(task.updatedAt) : "—",
        lane: task.status === "active" ? "doing" : task.status === "failed" ? "blocked" : task.status === "completed" ? "done" : "queue",
      }));
    });
    const alerts: FleetAlert[] = [
      ...notifications
        .filter((notification) => !notification.read && (notification.priority === "urgent" || notification.priority === "high"))
        .slice(0, 12)
        .map((notification): FleetAlert => ({
          id: `notification-${notification.id}`,
          tone: "danger",
          priority: notification.priority === "urgent" ? "urgent" : "high",
          title: notificationDisplayTitle(notification),
          agent: notificationActorMeta(notification).label,
          machine: notificationSourceLabel(notification) || "Alerts",
          text: notificationDisplayBody(notification).split("\n").find((line) => line.trim()) ?? notification.body,
          since: formatRelativeTime(new Date(notification.createdAt).getTime()),
        })),
      ...machineGroups
        .filter((machine) => machine.collector !== "ready")
        .map((machine): FleetAlert => ({
          id: `machine-${machine.key}`,
          tone: machine.online ? "warn" : "danger",
          priority: machine.online ? "normal" : "high",
          title: machine.online ? `${machine.name} collector setup pending` : `${machine.name} is offline`,
          agent: "collector",
          machine: machine.name,
          text: machine.online ? "Collector setup pending" : "Machine offline",
          since: "now",
        })),
      ...displayAgents.flatMap((agent) => {
        const snapshot = fleetSnapshots[agent.id];
        const machine = machineGroups.find((group) => group.agents.some((item) => item.id === agent.id));
        return snapshot?.error ? [{
          id: `agent-${agent.id}`,
          tone: "danger" as const,
          priority: "high" as const,
          title: `${agent.name} reported an error`,
          agent: agent.name,
          machine: machine?.name ?? "unassigned",
          text: snapshot.error,
          since: formatRelativeTime(snapshot.checkedAt),
        }] : [];
      }),
    ];
    const ticker = tasks.filter((task) => task.lane === "doing").slice(0, 8).map((task) => (
      `${task.agent} :: ${task.title}`
    ));
    return {
      machines,
      tasks,
      alerts,
      edges,
      ticker: ticker.length ? ticker : ["Fleet telemetry is connected · waiting for agent activity"],
    };
  }, [agentWorkById, displayAgents, fleetSnapshots, machineGroups, notifications, tailscaleStatus, walletsByAgent]);

  const kanbanColumns = useMemo(
    () => groupKanbanTasks(kanbanBoard?.tasks ?? [], kanbanIncludeArchived),
    [kanbanBoard, kanbanIncludeArchived],
  );
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

  const selectedKanbanAgent = useMemo(
    () => selectedKanbanTask ? kanbanTaskAssigneeAgent(selectedKanbanTask, displayAgents) ?? null : null,
    [displayAgents, selectedKanbanTask],
  );

  const selectedKanbanAgentMessages = useMemo(() => {
    if (!selectedKanbanTask || !selectedKanbanAgent) return [];
    const relatedIds = [
      selectedKanbanAgent.id,
      ...[...agentAliases.entries()]
        .filter(([, canonicalId]) => canonicalId === selectedKanbanAgent.id)
        .map(([aliasId]) => aliasId),
    ];
    return relatedIds
      .flatMap((agentId) => messagesByAgent[agentId] ?? [])
      .filter((message) => !message.kanbanTaskId || message.kanbanTaskId === selectedKanbanTask.id)
      .filter((message) => message.role !== "system" && message.content.trim())
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  }, [agentAliases, messagesByAgent, selectedKanbanAgent, selectedKanbanTask]);

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

  const honeyAgentRewards = useMemo(
    () => getHoneyAgentRewards(displayAgents.map((agent) => agent.id), honeyTreasury),
    [displayAgents, honeyTreasury],
  );

  const selectedHoneyReward = useMemo(
    () => selectedAgent ? honeyAgentRewards.find((reward) => reward.agentId === selectedAgent.id) ?? null : null,
    [honeyAgentRewards, selectedAgent],
  );

  const honeyStats = useMemo(() => {
    const totalHoney = honeyAgentRewards.reduce((total, reward) => total + reward.honeyEarned, 0);
    const availableHoney = honeyAgentRewards.reduce((total, reward) => total + reward.honeyAvailable, 0);
    const hiveBalance = honeyAgentRewards.reduce((total, reward) => total + reward.hiveBalance, 0);
    const hiveQuote = Math.round(availableHoney * honeyTreasury.tokenPerHoney * 1_000_000) / 1_000_000;
    return {
      totalHoney,
      availableHoney,
      hiveBalance,
      hiveQuote,
      rewardPoolHive: honeyTreasury.rewardPoolHive,
      rewardPoolRemainingHive: honeyTreasury.rewardPoolRemainingHive,
      rewardPoolEmittedHive: honeyTreasury.rewardPoolEmittedHive,
      rewardPoolUsd: honeyTreasury.rewardPoolUsd,
      rewardPoolVolumeUsd: honeyTreasury.rewardPoolVolumeUsd,
      hivePerMillionTokens: honeyTreasury.hivePerMillionTokens,
      rewardPoolSharePercent: honeyTreasury.rewardPoolShareOfVolume * 100,
    };
  }, [honeyAgentRewards, honeyTreasury]);

  const kanbanAssigneeOptions = useMemo(() => {
    const local = displayAgents.map((agent) => agent.agentId || agent.id);
    return [...new Set([...local, ...kanbanAssignees].filter(Boolean))].sort();
  }, [displayAgents, kanbanAssignees]);

  const workBoardStats = useMemo(() => {
    const tasks = kanbanBoard?.tasks ?? [];
    const activeTasks = tasks.filter((task) => task.status !== "archived");
    return {
      working: tasks.filter((task) => task.status === "working").length,
      needsHuman: tasks.filter((task) => task.status === "needs-human").length,
      done: tasks.filter((task) => task.status === "done").length,
      total: activeTasks.length,
    };
  }, [kanbanBoard?.tasks]);

  const kanbanViewColumns = useMemo(() => {
    const displayCopy: Record<KanbanStatus, { title: string; description: string }> = {
      ideas: { title: "Ideas", description: "Captured but not picked up yet." },
      ready: { title: "Ready", description: "Scoped & ready for any free bee." },
      working: { title: "Working", description: "A bee is on it right now." },
      "needs-human": { title: "Needs human", description: "Blocked — needs your call." },
      done: { title: "Done", description: "Shipped today." },
      archived: { title: "Archived", description: "Out of the active board." },
    };
    return visibleKanbanColumns.map((column) => ({ ...column, ...displayCopy[column.id] }));
  }, [visibleKanbanColumns]);
  const kanbanInitialLoading = activeView === "kanban" && kanbanLoading && !kanbanBoard && !kanbanError;

  const updateKanbanBoardScrollState = useCallback(() => {
    const element = kanbanBoardScrollRef.current;
    if (!element) {
      setKanbanBoardScrollState({ canScrollLeft: false, canScrollRight: false });
      return;
    }
    const maxScrollLeft = Math.max(0, element.scrollWidth - element.clientWidth);
    const nextState = {
      canScrollLeft: element.scrollLeft > 4,
      canScrollRight: element.scrollLeft < maxScrollLeft - 4,
    };
    setKanbanBoardScrollState((current) => (
      current.canScrollLeft === nextState.canScrollLeft && current.canScrollRight === nextState.canScrollRight
        ? current
        : nextState
    ));
  }, []);

  useEffect(() => {
    if (activeView !== "kanban") return undefined;
    const element = kanbanBoardScrollRef.current;
    const frame = window.requestAnimationFrame(updateKanbanBoardScrollState);
    element?.addEventListener("scroll", updateKanbanBoardScrollState, { passive: true });
    window.addEventListener("resize", updateKanbanBoardScrollState);
    return () => {
      window.cancelAnimationFrame(frame);
      element?.removeEventListener("scroll", updateKanbanBoardScrollState);
      window.removeEventListener("resize", updateKanbanBoardScrollState);
    };
  }, [activeView, kanbanIncludeArchived, kanbanViewColumns.length, selectedKanbanTaskId, updateKanbanBoardScrollState]);

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
      id: "scheduler" as const,
      label: "Scheduler",
      detail: `${schedules.filter((schedule) => schedule.enabled).length} active`,
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
      detail: notificationSummary?.unread
        ? `${(notificationSummary.highUnread ?? 0) + (notificationSummary.urgentUnread ?? 0)} high priority`
        : `${notificationSummary?.total ?? 0} total`,
    },
    {
      id: "chat" as const,
      label: "Chat",
      detail: selectedAgent?.name ?? "none",
    },
  ], [kanbanBoard?.tasks.length, mirosharkStatus?.ok, notificationSummary, schedules, selectedAgent?.name, sharedVault.enabled, visibleAgentCount, walletStats.critical, walletStats.enabled]);

  const activeNavItem = navItems.find((item) => item.id === activeView);
  const activeHeader = useMemo(() => {
    const detail = activeNavItem?.detail ?? "";
    const headers: Record<DashboardView, { label: string; title: string }> = {
      agents: { label: "Fleet", title: "Where the hive is deployed" },
      kanban: { label: "Work Board", title: "What the hive is up to" },
      scheduler: { label: "Scheduler", title: "What the hive will do next" },
      swarm: { label: "Swarm Theater", title: "What the hive is simulating" },
      wallet: { label: "Wallets", title: "What keeps agents funded" },
      vault: { label: "Brain Graph", title: "What the hive remembers" },
      notifications: { label: "Alerts", title: "What needs attention" },
      chat: { label: "Agent Chat", title: selectedAgent?.name ? `Talking with ${selectedAgent.name}` : "Choose an agent to chat with" },
    };
    const header = headers[activeView];
    return {
      eyebrow: detail ? `Hivemind Dispatch · ${header.label} · ${detail}` : `Hivemind Dispatch · ${header.label}`,
      title: header.title,
    };
  }, [activeNavItem?.detail, activeView, selectedAgent?.name]);

  const setupMachine = useMemo(
    () => machineGroups.find((machine) => machine.key === setupMachineKey) ?? null,
    [machineGroups, setupMachineKey],
  );
  const roleModalAgent = useMemo(
    () => displayAgents.find((agent) => agent.id === agentRoleModalId) ?? null,
    [agentRoleModalId, displayAgents],
  );
  useEffect(() => {
    if (!roleModalAgent || agentSettingsPanel !== "tools") return;
    void refreshRuntimeIntegrations(roleModalAgent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentSettingsPanel, roleModalAgent?.id, roleModalAgent?.runtime]);
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

  async function syncAeonEnvToGitHub() {
    if (!selectedAgent || selectedAgent.runtime !== "aeon") return;
    const keys = aeonEnvKeys
      .split(/[\n,]/)
      .map((key) => key.trim())
      .filter(Boolean);
    if (!keys.length) {
      setAeonEnvSyncStatus("Add at least one env key to sync.");
      return;
    }
    if (!selectedAgent.aeonRepo?.trim()) {
      setAeonEnvSyncStatus("Set Aeon Repo before syncing env to GitHub secrets.");
      return;
    }
    setAeonEnvSyncing(true);
    setAeonEnvSyncStatus("");
    const response = await fetch("/api/runtimes/aeon/env/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agent: selectedAgent, keys }),
    }).catch(() => null);
    const data = await response?.json().catch(() => null) as RuntimeEnvSyncResponse | null;
    setAeonEnvSyncing(false);
    if (!response?.ok || !data?.ok) {
      setAeonEnvSyncStatus(data?.error ?? "Could not sync Aeon env to GitHub secrets.");
      return;
    }
    const synced = data.result?.synced?.length ?? 0;
    const skipped = data.result?.skipped?.length ?? 0;
    setAeonEnvSyncStatus(`Synced ${synced} secret${synced === 1 ? "" : "s"} to ${data.result?.repo ?? selectedAgent.aeonRepo}${skipped ? `, skipped ${skipped}` : ""}.`);
  }

  function openAgentCreationModal(machine: MachineGroup, runtime: AgentRuntime = "hermes", name = "") {
    if (machine.collector !== "ready" || !machine.collectorUrl) {
      openSetupModal(machine);
      return;
    }
    setAgentRoleModalId("");
    setAgentRenameEditing(false);
    setAgentRuntimeFolderEditing(false);
    setAgentRuntimeFolderStatus("");
    setAgentRuntimeAdvancedOpen(false);
    setRuntimeIntegrationStatus(null);
    setRuntimeIntegrationBusy("");
    setRuntimeIntegrationMessage("");
    setRuntimeSessionQuery("");
    setRuntimeSessionResults([]);
    setRuntimeBackgroundPrompt("");
    setAgentWorkerClassView("presets");
    setCustomWorkerDraft(defaultWorkerClassDraft());
    setCustomWorkerSkillSearch("");
    setCustomWorkerImageError("");
    setAgentSettingsPanel("role");
    setAgentCreateMachineKey(machine.key);
    setAgentCreateDraft({
      name,
      runtime,
      workerClass: "general",
      customWorkerClass: undefined,
      customWorkerClasses: [],
      selectedCustomWorkerClassId: undefined,
      skillProfilePrompt: beeWorkerPreset("general").taskProfile,
      preferredSkillSlugs: beeWorkerPreset("general").skillSlugs,
      useSharedVault: true,
    });
  }

  function closeAgentSettingsModal() {
    setAgentRoleModalId("");
    setAgentCreateMachineKey("");
    setAgentSettingsPanel("role");
    setAgentRenameDraft("");
    setAgentRenameEditing(false);
    setAgentRuntimeFolderEditing(false);
    setAgentRuntimeFolderBrowsing(false);
    setAgentRuntimeFolderStatus("");
    setAgentRuntimeAdvancedOpen(false);
    setAgentWorkerClassView("presets");
    setCustomWorkerDraft(defaultWorkerClassDraft());
    setCustomWorkerSkillSearch("");
    setCustomWorkerImageError("");
  }

  async function browseAgentRuntimeFolder() {
    if (!roleModalAgent) return;
    setAgentRuntimeFolderBrowsing(true);
    setAgentRuntimeFolderStatus("");
    try {
      const response = await fetch("/api/agents/browse-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPath: roleModalAgent.localDataDir }),
      });
      const data = await response.json().catch(() => null) as { path?: string; cancelled?: boolean; error?: string } | null;
      if (data?.path) {
        updateAgentProfile(roleModalAgent.id, { localDataDir: data.path });
        setAgentRuntimeFolderEditing(false);
      } else if (!data?.cancelled) {
        setAgentRuntimeFolderEditing(true);
        setAgentRuntimeFolderStatus(data?.error ?? "Choose a folder manually.");
      }
    } catch {
      setAgentRuntimeFolderEditing(true);
      setAgentRuntimeFolderStatus("Choose a folder manually.");
    } finally {
      setAgentRuntimeFolderBrowsing(false);
    }
  }

  async function refreshRuntimeIntegrations(agent = roleModalAgent) {
    if (!agent) return;
    setRuntimeIntegrationBusy("status");
    setRuntimeIntegrationMessage("");
    const response = await fetch(`/api/runtimes/${agent.runtime}/integrations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agent }),
    }).catch(() => null);
    const data = await response?.json().catch(() => null) as { ok?: boolean; status?: RuntimeIntegrationStatus; error?: string } | null;
    setRuntimeIntegrationBusy("");
    if (!response?.ok || !data?.ok || !data.status) {
      setRuntimeIntegrationMessage(data?.error ?? "Could not read runtime integrations.");
      return;
    }
    setRuntimeIntegrationStatus(data.status);
    if (data.status.runtime === "hermes") {
      setHermesUpdateRequiredDetail(hermesUpdateDetail(data.status));
    }
  }

  async function runRuntimeIntegrationAction(action: string, input: Record<string, unknown> = {}) {
    if (!roleModalAgent) return;
    setRuntimeIntegrationBusy(action);
    setRuntimeIntegrationMessage("");
    const response = await fetch(`/api/runtimes/${roleModalAgent.runtime}/integrations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agent: roleModalAgent, action, input }),
    }).catch(() => null);
    const data = await response?.json().catch(() => null) as { ok?: boolean; message?: string; error?: string; logPath?: string; output?: string } | null;
    setRuntimeIntegrationBusy("");
    if (!response?.ok || !data?.ok) {
      setRuntimeIntegrationMessage(data?.error ?? "Runtime action failed.");
      return;
    }
    setRuntimeIntegrationMessage(data.message ?? data.output ?? "Runtime action completed.");
    await refreshRuntimeIntegrations(roleModalAgent);
  }

  async function searchRuntimeSessionsForAgent() {
    if (!roleModalAgent) return;
    setRuntimeIntegrationBusy("session-search");
    setRuntimeIntegrationMessage("");
    const params = new URLSearchParams({ q: runtimeSessionQuery, limit: "12" });
    const response = await fetch(`/api/runtimes/${roleModalAgent.runtime}/sessions/search?${params.toString()}`, { cache: "no-store" }).catch(() => null);
    const data = await response?.json().catch(() => null) as { ok?: boolean; sessions?: RuntimeSessionSearchResult[]; error?: string } | null;
    setRuntimeIntegrationBusy("");
    if (!response?.ok || !data?.ok) {
      setRuntimeIntegrationMessage(data?.error ?? "Session search failed.");
      return;
    }
    setRuntimeSessionResults(data.sessions ?? []);
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
      beeRole: "worker",
      workerClass: agentCreateDraft.workerClass,
      customWorkerClass: agentCreateDraft.customWorkerClass,
      customWorkerClasses: agentCreateDraft.customWorkerClasses,
      selectedCustomWorkerClassId: agentCreateDraft.selectedCustomWorkerClassId,
      skillProfilePrompt: agentCreateDraft.skillProfilePrompt,
      preferredSkillSlugs: agentCreateDraft.preferredSkillSlugs,
      useSharedVault: agentCreateDraft.useSharedVault,
    };
    setAgents((current) => [...current, next]);
    setSelectedAgentId(next.id);
    closeAgentSettingsModal();
  }

  function toggleScheduleSkill(slug: string) {
    setScheduleDraft((current) => ({
      ...current,
      skills: current.skills.includes(slug)
        ? current.skills.filter((item) => item !== slug)
        : [...current.skills, slug],
    }));
  }

  function toggleSchedulerStepMode(mode: "prompt" | "steps") {
    setSchedulerAttachMenu(null);
    setScheduleDraft((current) => {
      if (current.mode === mode) return current;
      if (mode === "steps") {
        const stepLines = current.prompt.split("\n").map((line) => line.replace(/^\d+\.\s*/, "").trim()).filter(Boolean);
        return {
          ...current,
          mode,
          steps: stepLines.length
            ? stepLines.map((text, index) => ({
              id: `draft-step-${Date.now()}-${index}`,
              text,
              skills: [],
              paths: [],
              model: "",
            }))
            : current.steps.length ? current.steps : [{ id: `draft-step-${Date.now()}-0`, text: "", skills: [], paths: [], model: "" }],
        };
      }
      const prompt = current.steps
        .filter((step) => step.text.trim())
        .map((step, index) => `${index + 1}. ${step.text.trim()}`)
        .join("\n");
      return { ...current, mode, prompt: prompt || current.prompt };
    });
    setSchedulerSelectedStep(0);
  }

  function updateSchedulerStep(index: number, patch: Partial<SchedulerStep>) {
    setScheduleDraft((current) => ({
      ...current,
      steps: current.steps.map((step, stepIndex) => stepIndex === index ? { ...step, ...patch } : step),
    }));
  }

  function addSchedulerStep() {
    setScheduleDraft((current) => {
      const nextIndex = current.steps.length;
      setSchedulerSelectedStep(nextIndex);
      setSchedulerAttachMenu(null);
      return {
        ...current,
        steps: [...current.steps, { id: `draft-step-${Date.now()}-${nextIndex}`, text: "", skills: [], paths: [], model: "" }],
      };
    });
  }

  function removeSchedulerStep(index: number) {
    setScheduleDraft((current) => {
      const steps = current.steps.length <= 1
        ? [{ id: `draft-step-${Date.now()}-0`, text: "", skills: [], paths: [], model: "" }]
        : current.steps.filter((_, stepIndex) => stepIndex !== index);
      setSchedulerSelectedStep((selected) => Math.max(0, Math.min(steps.length - 1, selected > index ? selected - 1 : selected)));
      setSchedulerAttachMenu(null);
      return { ...current, steps };
    });
  }

  function addSchedulerStepPath(index: number, path: string) {
    const cleaned = path.trim().replace(/\/+$/, "");
    if (!cleaned) return;
    setScheduleDraft((current) => ({
      ...current,
      steps: current.steps.map((step, stepIndex) => (
        stepIndex === index && !step.paths.includes(cleaned)
          ? { ...step, paths: [...step.paths, cleaned] }
          : step
      )),
    }));
  }

  function removeSchedulerStepPath(index: number, path: string) {
    setScheduleDraft((current) => ({
      ...current,
      steps: current.steps.map((step, stepIndex) => (
        stepIndex === index ? { ...step, paths: step.paths.filter((item) => item !== path) } : step
      )),
    }));
  }

  function toggleSchedulerStepSkill(index: number, slug: string) {
    setScheduleDraft((current) => ({
      ...current,
      steps: current.steps.map((step, stepIndex) => (
        stepIndex === index
          ? {
            ...step,
            skills: step.skills.includes(slug)
              ? step.skills.filter((item) => item !== slug)
              : [...step.skills, slug],
          }
          : step
      )),
    }));
  }

  function updateSchedulerStepModel(index: number, model: string) {
    updateSchedulerStep(index, { model });
  }

  function isSchedulerFilePath(path: string) {
    return /\.[a-zA-Z0-9]+$/.test(path.split("/").pop() ?? "");
  }

  async function pickSchedulerFolder(stepIndex?: number) {
    type PickerWindow = Window & typeof globalThis & {
      showDirectoryPicker?: () => Promise<{ name?: string }>;
    };
    const picker = (window as PickerWindow).showDirectoryPicker;
    if (!picker) {
      setSchedulerPathKind("folder");
      setSchedulerPathDraft("");
      setSchedulerAttachMenu("path");
      return;
    }
    try {
      const handle = await picker();
      const name = handle.name?.trim();
      if (!name) return;
      if (typeof stepIndex === "number") addSchedulerStepPath(stepIndex, name);
      else addSchedulePath(name);
      setSchedulerAttachMenu(null);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setSchedulerPathKind("folder");
      setSchedulerPathDraft("");
      setSchedulerAttachMenu("path");
    }
  }

  async function pickSchedulerFiles(stepIndex?: number) {
    type FileHandle = { name?: string; getFile?: () => Promise<File> };
    type PickerWindow = Window & typeof globalThis & {
      showOpenFilePicker?: (options?: { multiple?: boolean }) => Promise<FileHandle[]>;
    };
    const picker = (window as PickerWindow).showOpenFilePicker;
    if (!picker) {
      setSchedulerPathKind("file");
      setSchedulerPathDraft("");
      setSchedulerAttachMenu("path");
      return;
    }
    try {
      const handles = await picker({ multiple: true });
      const names = await Promise.all(handles.map(async (handle) => {
        if (handle.name?.trim()) return handle.name.trim();
        const file = await handle.getFile?.();
        return file?.name?.trim() ?? "";
      }));
      for (const name of names.filter(Boolean)) {
        if (typeof stepIndex === "number") addSchedulerStepPath(stepIndex, name);
        else addSchedulePath(name);
      }
      setSchedulerAttachMenu(null);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setSchedulerPathKind("file");
      setSchedulerPathDraft("");
      setSchedulerAttachMenu("path");
    }
  }

  function addSchedulePath(path: string) {
    const cleaned = path.trim();
    if (!cleaned) return;
    setScheduleDraft((current) => ({
      ...current,
      paths: current.paths.includes(cleaned) ? current.paths : [...current.paths, cleaned],
    }));
  }

  function removeSchedulePath(path: string) {
    setScheduleDraft((current) => ({
      ...current,
      paths: current.paths.filter((item) => item !== path),
    }));
  }

  function removeScheduleSkill(slug: string) {
    setScheduleDraft((current) => ({
      ...current,
      skills: current.skills.filter((item) => item !== slug),
    }));
  }

  function resetScheduleDraft(agentId = scheduleDraft.agentId) {
    setScheduleDraft({
      name: "",
      agentId,
      every: "360m",
      mode: "prompt",
      prompt: "",
      model: "",
      skills: [],
      paths: [],
      steps: [{ id: `draft-step-${Date.now()}-0`, text: "", skills: [], paths: [], model: "" }],
      usePastRuns: false,
      pastRunLimit: 3,
    });
    setSchedulerSelectedStep(0);
    setSchedulerAttachMenu(null);
    setSchedulerPathDraft("");
    setSchedulerSkillSearch("");
    setEditingScheduleId("");
  }

  function editSchedule(schedule: AgentSchedule) {
    const steps = schedule.steps.length
      ? schedule.steps.map((step, index) => ({
        ...step,
        id: `draft-${schedule.id}-${index}`,
        skills: Array.isArray(step.skills) ? step.skills : [],
        paths: Array.isArray(step.paths) ? step.paths : [],
        model: step.model ?? "",
      }))
      : [{ id: `draft-${schedule.id}-0`, text: "", skills: [], paths: [], model: "" }];
    setScheduleDraft({
      name: schedule.name,
      agentId: schedule.agentId,
      every: schedule.every,
      mode: schedule.mode,
      prompt: schedule.prompt,
      model: schedule.model ?? "",
      skills: schedule.skills,
      paths: schedule.paths,
      steps,
      usePastRuns: schedule.usePastRuns === true,
      pastRunLimit: Math.max(1, Math.min(12, Number(schedule.pastRunLimit) || 3)),
    });
    setSchedulerSelectedStep(0);
    setSchedulerAttachMenu(null);
    setSchedulerPathDraft("");
    setSchedulerSkillSearch("");
    setEditingScheduleId(schedule.id);
    setSchedulerDraftOpen(true);
  }

  function createSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const agent = displayAgents.find((item) => item.id === scheduleDraft.agentId) ?? selectedAgent;
    if (!agent) return;
    const now = Date.now();
    const steps = scheduleDraft.mode === "steps"
      ? scheduleDraft.steps.filter((step) => step.text.trim())
      : [];
    const prompt = scheduleDraft.mode === "steps"
      ? steps.map((step, index) => `${index + 1}. ${step.text.trim()}`).join("\n")
      : scheduleDraft.prompt.trim();
    const editedSchedule = editingScheduleId ? schedules.find((schedule) => schedule.id === editingScheduleId) : null;
    const next: AgentSchedule = {
      id: editedSchedule?.id ?? `schedule-${now}-${Math.random().toString(36).slice(2, 7)}`,
      name: scheduleDraft.name.trim() || `Run ${agent.name}`,
      agentId: agent.id,
      enabled: editedSchedule?.enabled ?? true,
      every: scheduleDraft.every.trim() || "360m",
      mode: scheduleDraft.mode,
      prompt,
      model: scheduleDraft.model,
      skills: scheduleDraft.skills,
      paths: scheduleDraft.paths,
      steps: steps.map((step, index) => ({
        ...step,
        id: `step-${now}-${index}`,
        text: step.text.trim(),
      })),
      createdAt: editedSchedule?.createdAt ?? now,
      updatedAt: now,
      lastRunAt: editedSchedule?.lastRunAt,
      externalSource: editedSchedule?.externalSource,
      externalJobId: editedSchedule?.externalJobId,
      lastStatus: editedSchedule?.lastStatus,
      lastSummary: editedSchedule?.lastSummary,
      usePastRuns: scheduleDraft.usePastRuns,
      pastRunLimit: Math.max(1, Math.min(12, Number(scheduleDraft.pastRunLimit) || 3)),
      sharedSchedulePath: editedSchedule?.sharedSchedulePath,
      sharedRunFolder: editedSchedule?.sharedRunFolder,
    };
    setSchedules((current) => editedSchedule
      ? current.map((schedule) => schedule.id === editedSchedule.id ? next : schedule)
      : [next, ...current]);
    void upsertSharedSchedule(next);
    resetScheduleDraft(agent.id);
    setSchedulerDraftOpen(false);
  }

  function removeSchedule(id: string) {
    setSchedules((current) => current.filter((schedule) => schedule.id !== id));
  }

  async function importExistingSchedules() {
    setScheduleImporting(true);
    setScheduleImportStatus("");
    const response = await fetch("/api/scheduler/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agents: displayAgents }),
    }).catch(() => null);
    const data = await response?.json().catch(() => null) as { ok?: boolean; schedules?: ImportedRuntimeSchedule[]; errors?: string[] } | null;
    setScheduleImporting(false);
    if (!response?.ok || !data?.ok) {
      setScheduleImportStatus("No runtime schedules could be imported yet.");
      return;
    }
    const jobs = data.schedules ?? [];
    if (!jobs.length) {
      setScheduleImportStatus(data.errors?.[0] ?? "No existing runtime schedules found across connected agents.");
      return;
    }
    const now = Number(new Date());
    setSchedules((current) => {
      const byExternalId = new Map(current.map((schedule) => [schedule.externalJobId ? `${schedule.externalSource}:${schedule.externalJobId}` : schedule.id, schedule]));
      for (const job of jobs) {
        const key = `${job.runtime}:${job.id}`;
        const existing = byExternalId.get(key);
        const runtimeAgent = displayAgents.find((agent) => (
          agent.runtime === job.runtime && (agent.id === job.agentId || agent.agentId === job.agentId)
        )) ?? displayAgents.find((agent) => agent.runtime === job.runtime) ?? agents.find((agent) => agent.runtime === job.runtime);
        const imported: AgentSchedule = {
          id: existing?.id ?? key,
          name: job.name || "Runtime automation",
          agentId: runtimeAgent?.id ?? existing?.agentId ?? "",
          enabled: job.enabled !== false,
          every: normalizeImportedScheduleEvery(job),
          mode: "prompt",
          prompt: job.message || job.lastSummary || "Imported runtime schedule.",
          model: existing?.model ?? "",
          skills: existing?.skills ?? [],
          paths: existing?.paths ?? [],
          steps: existing?.steps ?? [],
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
          lastRunAt: job.lastRunMs ?? existing?.lastRunAt,
          externalSource: job.runtime,
          externalJobId: job.id,
          lastStatus: job.lastStatus,
          lastSummary: job.lastSummary,
          usePastRuns: existing?.usePastRuns ?? false,
          pastRunLimit: existing?.pastRunLimit ?? 3,
          sharedSchedulePath: existing?.sharedSchedulePath,
          sharedRunFolder: existing?.sharedRunFolder,
        };
        byExternalId.set(key, imported);
      }
      const importedSchedules = [...byExternalId.values()].sort((a, b) => b.updatedAt - a.updatedAt);
      void upsertSharedSchedules(importedSchedules);
      return importedSchedules;
    });
    setScheduleImportStatus(`Imported ${jobs.length} runtime schedule${jobs.length === 1 ? "" : "s"}.`);
  }

  function normalizeImportedScheduleEvery(job: ImportedRuntimeSchedule) {
    if (job.every) return job.every;
    if (job.everyMs) {
      if (job.everyMs % 3_600_000 === 0) return `${job.everyMs / 3_600_000}h`;
      if (job.everyMs % 60_000 === 0) return `${job.everyMs / 60_000}m`;
      return `${Math.max(1, Math.round(job.everyMs / 1000))}s`;
    }
    return job.schedule?.replace(/^every\s+/i, "") || "custom";
  }

  async function toggleSchedule(id: string) {
    const schedule = schedules.find((item) => item.id === id);
    if (!schedule) return;
    const nextEnabled = !schedule.enabled;
    if (schedule.externalSource && schedule.externalJobId) {
      const response = await fetch("/api/scheduler/runtime-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runtime: schedule.externalSource,
          action: nextEnabled ? "enable" : "disable",
          jobId: schedule.externalJobId,
          agent: displayAgents.find((item) => item.id === schedule.agentId),
        }),
      }).catch(() => null);
      const data = await response?.json().catch(() => null) as { ok?: boolean; error?: string } | null;
      if (!response?.ok || !data?.ok) {
        setScheduleImportStatus(data?.error ?? "Could not update that runtime schedule.");
        return;
      }
    }
    setSchedules((current) => current.map((item) => (
      item.id === id ? { ...item, enabled: nextEnabled, updatedAt: Number(new Date()) } : item
    )));
    void upsertSharedSchedule({ ...schedule, enabled: nextEnabled, updatedAt: Number(new Date()) });
  }

  function schedulerPlainPrompt(schedule: AgentSchedule) {
    if (schedule.mode !== "steps") return schedule.prompt || schedule.name;
    return [
      schedule.prompt,
      ...schedule.steps.map((step, index) => `${index + 1}. ${step.text}`),
    ].filter(Boolean).join("\n");
  }

  function schedulerSharedSnapshot(schedule: AgentSchedule) {
    const agent = displayAgents.find((item) => item.id === schedule.agentId);
    return {
      id: schedule.id,
      name: schedule.name,
      agentId: schedule.agentId,
      agentName: agent?.name ?? "",
      machineName: agent?.machineName ?? "dashboard",
      runtime: schedule.externalSource ?? agent?.runtime ?? "dashboard",
      enabled: schedule.enabled,
      every: schedule.every,
      mode: schedule.mode,
      prompt: schedulerPlainPrompt(schedule),
      model: schedule.model ?? "",
      skills: schedule.skills,
      paths: schedule.paths,
      steps: schedule.steps,
      externalSource: schedule.externalSource ?? null,
      externalJobId: schedule.externalJobId ?? null,
      updatedAt: schedule.updatedAt,
      usePastRuns: schedule.usePastRuns === true,
      pastRunLimit: Math.max(1, Math.min(12, Number(schedule.pastRunLimit) || 3)),
    };
  }

  async function upsertSharedSchedule(schedule: AgentSchedule) {
    const response = await fetch("/api/scheduler/shared", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "upsert-schedule",
        vaultPath: sharedVault.vaultPath,
        scheduledFolder: sharedVault.scheduledFolder,
        schedule: schedulerSharedSnapshot(schedule),
      }),
    }).catch(() => null);
    const data = await response?.json().catch(() => null) as { ok?: boolean; result?: { path?: string; folder?: string }; error?: string } | null;
    if (response?.ok && data?.ok && data.result) {
      setSchedules((current) => current.map((item) => (
        item.id === schedule.id
          ? { ...item, sharedSchedulePath: data.result?.path, sharedRunFolder: data.result?.folder }
          : item
      )));
    } else if (data?.error) {
      setScheduleImportStatus(data.error);
    }
  }

  async function upsertSharedSchedules(nextSchedules: AgentSchedule[]) {
    const response = await fetch("/api/scheduler/shared", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "upsert-schedules",
        vaultPath: sharedVault.vaultPath,
        scheduledFolder: sharedVault.scheduledFolder,
        schedules: nextSchedules.map(schedulerSharedSnapshot),
      }),
    }).catch(() => null);
    const data = await response?.json().catch(() => null) as { ok?: boolean; results?: Array<{ path?: string; folder?: string }>; error?: string } | null;
    if (response?.ok && data?.ok && data.results) {
      setSchedules((current) => current.map((item) => {
        const index = nextSchedules.findIndex((schedule) => schedule.id === item.id);
        const result = index >= 0 ? data.results?.[index] : null;
        return result ? { ...item, sharedSchedulePath: result.path, sharedRunFolder: result.folder } : item;
      }));
    } else if (data?.error) {
      setScheduleImportStatus(data.error);
    }
  }

  async function fetchPastRunContext(schedule: AgentSchedule) {
    if (!schedule.usePastRuns) return "";
    const response = await fetch("/api/scheduler/shared", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "past-runs",
        vaultPath: sharedVault.vaultPath,
        scheduledFolder: sharedVault.scheduledFolder,
        schedule: schedulerSharedSnapshot(schedule),
        limit: Math.max(1, Math.min(12, Number(schedule.pastRunLimit) || 3)),
      }),
    }).catch(() => null);
    const data = await response?.json().catch(() => null) as { ok?: boolean; runs?: Array<{ path: string; name: string; content: string }> } | null;
    const runs = data?.runs ?? [];
    if (!response?.ok || !data?.ok || !runs.length) return "";
    return [
      "Past scheduled runs context:",
      "Use these previous run notes to preserve continuity, avoid repetition, and make useful comparisons.",
      ...runs.map((run, index) => [
        `Previous run ${index + 1}: ${run.path}`,
        run.content.slice(0, 6000),
      ].join("\n")),
    ].join("\n\n");
  }

  function scheduleFromSharedSnapshot(snapshot: Record<string, unknown>): AgentSchedule | null {
    const id = typeof snapshot.id === "string" ? snapshot.id : "";
    const name = typeof snapshot.name === "string" ? snapshot.name : "";
    if (!id || !name) return null;
    const runtime = typeof snapshot.runtime === "string" && snapshot.runtime in RUNTIME_LABELS
      ? snapshot.runtime as AgentRuntime
      : undefined;
    const agentName = typeof snapshot.agentName === "string" ? snapshot.agentName : "";
    const sourceAgentId = typeof snapshot.agentId === "string" ? snapshot.agentId : "";
    const agent = displayAgents.find((item) => item.id === sourceAgentId)
      ?? displayAgents.find((item) => agentName && item.name === agentName)
      ?? displayAgents.find((item) => runtime && item.runtime === runtime);
    const rawSteps = Array.isArray(snapshot.steps) ? snapshot.steps : [];
    const steps = rawSteps.map((step, index) => {
      const value = typeof step === "object" && step ? step as Record<string, unknown> : {};
      return {
        id: typeof value.id === "string" ? value.id : `step-${id}-${index}`,
        text: typeof value.text === "string" ? value.text : "",
        skills: Array.isArray(value.skills) ? value.skills.filter((item): item is string => typeof item === "string") : [],
        paths: Array.isArray(value.paths) ? value.paths.filter((item): item is string => typeof item === "string") : [],
        model: typeof value.model === "string" ? value.model : "",
      };
    }).filter((step) => step.text.trim());
    const externalSource = typeof snapshot.externalSource === "string" && snapshot.externalSource in RUNTIME_LABELS
      ? snapshot.externalSource as AgentRuntime
      : undefined;
    return {
      id,
      name,
      agentId: agent?.id ?? sourceAgentId,
      enabled: snapshot.enabled !== false,
      every: typeof snapshot.every === "string" ? snapshot.every : "custom",
      mode: snapshot.mode === "steps" ? "steps" : "prompt",
      prompt: typeof snapshot.prompt === "string" ? snapshot.prompt : "",
      model: typeof snapshot.model === "string" ? snapshot.model : "",
      skills: Array.isArray(snapshot.skills) ? snapshot.skills.filter((item): item is string => typeof item === "string") : [],
      paths: Array.isArray(snapshot.paths) ? snapshot.paths.filter((item): item is string => typeof item === "string") : [],
      steps,
      createdAt: typeof snapshot.updatedAt === "number" ? snapshot.updatedAt : Date.now(),
      updatedAt: typeof snapshot.updatedAt === "number" ? snapshot.updatedAt : Date.now(),
      externalSource,
      externalJobId: typeof snapshot.externalJobId === "string" ? snapshot.externalJobId : undefined,
      usePastRuns: snapshot.usePastRuns === true,
      pastRunLimit: Math.max(1, Math.min(12, Number(snapshot.pastRunLimit) || 3)),
      sharedSchedulePath: typeof snapshot.sharedSchedulePath === "string" ? snapshot.sharedSchedulePath : undefined,
      sharedRunFolder: typeof snapshot.sharedRunFolder === "string" ? snapshot.sharedRunFolder : undefined,
    };
  }

  function mergeSharedSchedules(current: AgentSchedule[], sharedSchedules: AgentSchedule[]) {
    const byId = new Map(current.map((schedule) => [schedule.id, schedule]));
    for (const sharedSchedule of sharedSchedules) {
      const existing = byId.get(sharedSchedule.id);
      if (!existing || (sharedSchedule.updatedAt ?? 0) >= (existing.updatedAt ?? 0)) {
        byId.set(sharedSchedule.id, {
          ...existing,
          ...sharedSchedule,
          lastRunAt: existing?.lastRunAt,
          lastStatus: existing?.lastStatus,
          lastSummary: existing?.lastSummary,
        });
      } else if (sharedSchedule.sharedRunFolder || sharedSchedule.sharedSchedulePath) {
        byId.set(existing.id, {
          ...existing,
          sharedRunFolder: existing.sharedRunFolder ?? sharedSchedule.sharedRunFolder,
          sharedSchedulePath: existing.sharedSchedulePath ?? sharedSchedule.sharedSchedulePath,
        });
      }
    }
    return [...byId.values()].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async function refreshSharedSchedulesFromVault() {
    if (!sharedVault.enabled) return;
    const response = await fetch("/api/scheduler/shared", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "list-schedules",
        vaultPath: sharedVault.vaultPath,
        scheduledFolder: sharedVault.scheduledFolder,
      }),
    }).catch(() => null);
    const data = await response?.json().catch(() => null) as { ok?: boolean; schedules?: Array<Record<string, unknown>>; error?: string } | null;
    if (!response?.ok || !data?.ok) {
      if (data?.error) setScheduleImportStatus(data.error);
      return;
    }
    const sharedSchedules = (data.schedules ?? [])
      .map((snapshot) => scheduleFromSharedSnapshot(snapshot))
      .filter((schedule): schedule is AgentSchedule => Boolean(schedule));
    if (!sharedSchedules.length) return;
    setSchedules((current) => mergeSharedSchedules(current, sharedSchedules));
  }

  async function recordSharedScheduledRun(schedule: AgentSchedule, record: {
    runId: string;
    status: "running" | "ok" | "failed";
    startedAt: number;
    completedAt?: number;
    prompt?: string;
    output?: string;
    summary?: string;
    telemetry?: Record<string, unknown>;
  }) {
    const agent = displayAgents.find((item) => item.id === schedule.agentId);
    const response = await fetch("/api/scheduler/shared", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "record-run",
        vaultPath: sharedVault.vaultPath,
        scheduledFolder: sharedVault.scheduledFolder,
        record: {
          schedule: schedulerSharedSnapshot(schedule),
          runId: record.runId,
          agentName: agent?.name ?? "",
          machineName: agent?.machineName ?? "dashboard",
          status: record.status,
          startedAt: record.startedAt,
          completedAt: record.completedAt,
          prompt: record.prompt,
          output: record.output,
          summary: record.summary,
          telemetry: record.telemetry,
        },
      }),
    }).catch(() => null);
    const data = await response?.json().catch(() => null) as { ok?: boolean; result?: { path?: string; folder?: string }; error?: string } | null;
    if (response?.ok && data?.ok && data.result) {
      setSchedules((current) => current.map((item) => (
        item.id === schedule.id
          ? {
            ...item,
            sharedRunFolder: data.result?.folder,
            sharedSchedulePath: item.sharedSchedulePath ?? (data.result?.folder ? `${data.result.folder}/schedule.md` : item.sharedSchedulePath),
          }
          : item
      )));
      return data.result;
    }
    return null;
  }

  async function runScheduleNow(schedule: AgentSchedule) {
    const now = Number(new Date());
    const runStartedAt = Date.now();
    const runId = `scheduler:${schedule.id}:${now}`;
    const logSchedulerRun = (type: string, payload: Record<string, unknown> = {}) => {
      logClientTelemetry(type, {
        scheduleId: schedule.id,
        scheduleName: schedule.name,
        externalSource: schedule.externalSource ?? null,
        externalJobId: schedule.externalJobId ?? null,
        elapsedMs: Date.now() - runStartedAt,
        ...payload,
      }, { runId });
    };
    logSchedulerRun("scheduler.run.requested", {
      mode: schedule.mode,
      enabled: schedule.enabled,
      every: schedule.every,
      promptLength: schedule.prompt.length,
      stepCount: schedule.steps.length,
      skillCount: schedule.skills.length,
      pathCount: schedule.paths.length,
      assignedAgentId: schedule.agentId,
    });
    const setRunPhase = (phase: SchedulerRunPhase, label?: string) => {
      setSchedulerRunStates((current) => ({ ...current, [schedule.id]: label ? { phase, label } : { phase } }));
      logSchedulerRun("scheduler.run.phase", { phase, label: label ?? null });
    };
    setRunPhase("running", "running");
    const finishRunState = (state: "done" | "idle") => {
      logSchedulerRun("scheduler.run.button_state", { state });
      if (state === "idle") {
        setSchedulerRunStates((current) => {
          const next = { ...current };
          delete next[schedule.id];
          return next;
        });
        return;
      }
      setRunPhase("done", "done");
      window.setTimeout(() => {
        setSchedulerRunStates((current) => {
          const next = { ...current };
          delete next[schedule.id];
          return next;
        });
      }, 3000);
    };
    if (schedule.externalSource && schedule.externalJobId) {
      logSchedulerRun("scheduler.run.external_request.start", { runtime: schedule.externalSource });
      const response = await fetch("/api/scheduler/runtime-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runtime: schedule.externalSource,
          action: "run-now",
          jobId: schedule.externalJobId,
          agent: displayAgents.find((item) => item.id === schedule.agentId),
        }),
      }).catch(() => null);
      const data = await response?.json().catch(() => null) as { ok?: boolean; error?: string } | null;
      logSchedulerRun("scheduler.run.external_request.end", {
        ok: Boolean(response?.ok && data?.ok),
        httpStatus: response?.status ?? null,
        error: data?.error ?? null,
      });
      if (!response?.ok || !data?.ok) {
        setScheduleImportStatus(data?.error ?? "Could not run that runtime schedule.");
        finishRunState("idle");
        return;
      }
      setSchedules((current) => current.map((item) => (
        item.id === schedule.id ? { ...item, lastRunAt: now, updatedAt: now, lastStatus: "ok", lastSummary: `Started ${schedule.name}.` } : item
      )));
      setScheduleImportStatus(`Started ${schedule.name}.`);
      void recordSharedScheduledRun(schedule, {
        runId,
        status: "ok",
        startedAt: now,
        completedAt: Date.now(),
        prompt: schedulerPlainPrompt(schedule),
        summary: `Started external runtime schedule ${schedule.name}.`,
        telemetry: { externalSource: schedule.externalSource, externalJobId: schedule.externalJobId },
      });
      finishRunState("done");
      return;
    }

    const attachedSkillSlugs = [...new Set([
      ...schedule.skills,
      ...schedule.steps.flatMap((step) => step.skills),
    ].map((skill) => skill.trim()).filter(Boolean))];
    if (attachedSkillSlugs.length && !SCHEDULER_DYNAMIC_SKILL_ACTIONS_ENABLED) {
      logSchedulerRun("scheduler.run.skill_action.disabled", {
        reason: "hermes-latency-test",
        skillCount: attachedSkillSlugs.length,
        skills: attachedSkillSlugs,
      });
    }
    if (attachedSkillSlugs.length && SCHEDULER_DYNAMIC_SKILL_ACTIONS_ENABLED) {
      setRunPhase("assigned", "checking attached skills");
      logSchedulerRun("scheduler.run.skill_action.start", {
        skillCount: attachedSkillSlugs.length,
        skills: attachedSkillSlugs,
      });
      const response = await fetch("/api/scheduler/skill-action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Hivemind-Run-Id": runId,
          "X-Hivemind-Run-Type": "scheduler",
        },
        body: JSON.stringify({
          skillSlugs: attachedSkillSlugs,
          scheduleName: schedule.name,
          prompt: schedulerPlainPrompt(schedule),
          vaultPath: sharedVault.enabled ? sharedVault.vaultPath : undefined,
        }),
      }).catch(() => null);
      const data = await response?.json().catch(() => ({})) as {
        ok?: boolean;
        skipped?: boolean;
        skill?: string;
        actionId?: string;
        title?: string;
        output?: string;
        elapsedMs?: number;
        error?: string;
      };
      logSchedulerRun("scheduler.run.skill_action.end", {
        ok: Boolean(response?.ok && data.ok),
        skipped: Boolean(data.skipped),
        httpStatus: response?.status ?? null,
        skill: data.skill ?? null,
        actionId: data.actionId ?? null,
        routeElapsedMs: data.elapsedMs ?? null,
        title: data.title ?? null,
        error: data.error ?? null,
      });
      if (response?.ok && data.ok) {
        const result = data.output?.trim() || `Completed ${data.skill ?? "attached skill"} action.`;
        setRunPhase("wrapping", "wrapping up");
        setSchedules((current) => current.map((item) => (
          item.id === schedule.id
            ? { ...item, lastRunAt: Date.now(), updatedAt: Date.now(), lastStatus: "ok", lastSummary: result.slice(0, 500) }
            : item
        )));
        setScheduleImportStatus(`Completed ${schedule.name}${data.title ? `: ${data.title}` : ""}.`);
        logSchedulerRun("scheduler.run.completed", {
          dynamicSkillAction: true,
          skill: data.skill ?? null,
          actionId: data.actionId ?? null,
          outputLength: result.length,
          routeElapsedMs: data.elapsedMs ?? null,
        });
        void recordSharedScheduledRun(schedule, {
          runId,
          status: "ok",
          startedAt: now,
          completedAt: Date.now(),
          prompt: schedulerPlainPrompt(schedule),
          output: result,
          summary: data.title ? `Completed ${data.skill ?? "skill"}: ${data.title}` : result,
          telemetry: { dynamicSkillAction: true, skill: data.skill ?? null, actionId: data.actionId ?? null, routeElapsedMs: data.elapsedMs ?? null },
        });
        finishRunState("done");
        return;
      }
      if (response && !data.skipped) {
        const message = data.error || `Skill action failed with ${response.status}.`;
        logSchedulerRun("scheduler.run.failed", {
          dynamicSkillAction: true,
          message,
        });
        setSchedules((current) => current.map((item) => (
          item.id === schedule.id ? { ...item, updatedAt: Date.now(), lastStatus: "failed", lastSummary: message } : item
        )));
        setScheduleImportStatus(`Could not run ${schedule.name}: ${message}`);
        void recordSharedScheduledRun(schedule, {
          runId,
          status: "failed",
          startedAt: now,
          completedAt: Date.now(),
          prompt: schedulerPlainPrompt(schedule),
          summary: message,
          telemetry: { dynamicSkillAction: true },
        });
        finishRunState("idle");
        return;
      }
    }

    const agent = displayAgents.find((item) => item.id === schedule.agentId);
    if (!agent) {
      logSchedulerRun("scheduler.run.validation_failed", { reason: "missing-agent" });
      setScheduleImportStatus("Could not run that schedule because its assigned agent is missing.");
      finishRunState("idle");
      return;
    }
    const setupIssue = chatSetupIssue(agent);
    if (setupIssue) {
      logSchedulerRun("scheduler.run.validation_failed", {
        reason: "setup-issue",
        agentId: agent.id,
        agentRuntime: agent.runtime,
        hasGatewayUrl: Boolean(agent.gatewayUrl?.trim()),
        hasTelemetryUrl: Boolean(agent.telemetryUrl?.trim()),
        message: setupIssue,
      });
      setScheduleImportStatus(`Could not run ${schedule.name}: ${setupIssue}`);
      setSchedules((current) => current.map((item) => (
        item.id === schedule.id ? { ...item, updatedAt: Date.now(), lastStatus: "failed", lastSummary: setupIssue } : item
      )));
      finishRunState("idle");
      return;
    }
    const attachments = [
      schedule.model ? `Model: ${SCHEDULER_MODEL_OPTIONS.find((option) => option.value === schedule.model)?.label ?? schedule.model}` : "",
      schedule.skills.length ? `Attached skills: ${schedule.skills.join(", ")}` : "",
      schedule.paths.length ? `Linked paths: ${schedule.paths.join(", ")}` : "",
    ].filter(Boolean).join("\n");
    const prompt = schedule.mode === "steps" && schedule.steps.length
      ? [
        attachments,
        schedule.prompt,
        "",
        "Run this step by step:",
        ...schedule.steps.map((step, index) => {
          const stepContext = [
            step.model ? `model: ${SCHEDULER_MODEL_OPTIONS.find((option) => option.value === step.model)?.label ?? step.model}` : "",
            step.skills.length ? `skills: ${step.skills.join(", ")}` : "",
            step.paths.length ? `paths: ${step.paths.join(", ")}` : "",
          ].filter(Boolean).join("; ");
          return `${index + 1}. ${step.text}${stepContext ? ` [${stepContext}]` : ""}`;
        }),
      ].filter(Boolean).join("\n")
      : [attachments, schedule.prompt].filter(Boolean).join("\n\n");
    const scheduledPrompt = [
      "This is a scheduled dashboard run. Execute the task now; do not only acknowledge it.",
      "If the task asks you to create or update Apple Notes, use the available Apple Notes skill/tool and report the concrete note title when finished.",
      await fetchPastRunContext(schedule),
      prompt || schedule.name,
    ].filter(Boolean).join("\n\n");
    const linkedWorkingDirectory = schedule.paths.find((path) => path.trim());
    const minimizeHermesSkillContext = agent.runtime === "hermes"
      && attachedSkillSlugs.length > 0
      && !SCHEDULER_HERMES_SKILL_CONTEXT_ENABLED;
    const workingDirectory = minimizeHermesSkillContext && !linkedWorkingDirectory
      ? ""
      : linkedWorkingDirectory ?? appVersion?.appDir ?? agent.localDataDir ?? "";
    const runtimeSharedVault = minimizeHermesSkillContext
      ? { ...sharedVault, enabled: false }
      : sharedVault;
    if (minimizeHermesSkillContext) {
      logSchedulerRun("scheduler.run.hermes_skill_context.minimized", {
        skillCount: attachedSkillSlugs.length,
        skills: attachedSkillSlugs,
        preservedLinkedPath: Boolean(linkedWorkingDirectory),
        sharedVaultEnabled: runtimeSharedVault.enabled,
        workingDirectorySet: Boolean(workingDirectory),
      });
    }
    logSchedulerRun("scheduler.run.dispatch_prepared", {
      agentId: agent.id,
      agentName: agent.name,
      agentRuntime: agent.runtime,
      agentRuntimeKind: agent.runtimeKind ?? null,
      hasGatewayUrl: Boolean(agent.gatewayUrl?.trim()),
      hasTelemetryUrl: Boolean(agent.telemetryUrl?.trim()),
      hasToken: Boolean(agent.token?.trim()),
      promptLength: scheduledPrompt.length,
      workingDirectorySet: Boolean(workingDirectory),
      sharedVaultEnabled: runtimeSharedVault.enabled,
      hermesSkillContextMinimized: minimizeHermesSkillContext,
      honeyLedgerEnabled,
      staleMs: SCHEDULER_RUN_STALE_MS,
    });
    const task: AgentTask = {
      id: `schedule-task-${now}`,
      agentId: agent.id,
      title: schedule.name,
      lastMessage: "Starting scheduled run...",
      status: "active",
      startedAt: now,
      updatedAt: now,
      source: "scheduler",
      workingDirectory,
    };
    upsertTask(task);
    appendMessage(agent.id, { role: "user", content: scheduledPrompt, surface: "scheduler" });
    appendMessage(agent.id, { role: "assistant", content: "", surface: "scheduler" });
    setRunPhase("assigned", `assigned to ${agent.name}`);
    setScheduleImportStatus(`Running ${schedule.name} on ${agent.name}...`);

    let waitingTicks = 0;
    let staleLogged = false;
    const waitingInterval = window.setInterval(() => {
      waitingTicks += 1;
      const waitMs = waitingTicks * 10_000;
      logSchedulerRun("scheduler.run.waiting", {
        tick: waitingTicks,
        waitMs,
      });
      if (!staleLogged && waitMs >= SCHEDULER_RUN_STALE_MS) {
        staleLogged = true;
        logSchedulerRun("scheduler.run.slow", { waitMs });
        setRunPhase("executing", "still executing");
      }
    }, 10_000);

    try {
      logSchedulerRun("scheduler.run.runtime_request.start", {
        endpoint: "/api/chat/agent-runtime",
        agentId: agent.id,
        agentRuntime: agent.runtime,
      });
      setRunPhase("thinking", "thinking");
      const response = await fetch("/api/chat/agent-runtime", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Hivemind-Run-Id": runId,
          "X-Hivemind-Run-Type": "scheduler",
        },
        body: JSON.stringify({
          agent,
          sharedVault: runtimeSharedVault,
          workingDirectory,
          wallet: walletsByAgent[agent.id] ?? createDefaultAgentWallet(agent.id),
          honeyLedgerEnabled,
          messages: [{ role: "user", content: scheduledPrompt }],
        }),
      });
      logSchedulerRun("scheduler.run.runtime_request.response", {
        httpStatus: response.status,
        ok: response.ok,
        hasBody: Boolean(response.body),
        contentType: response.headers.get("content-type"),
      });
      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({}));
        throw new Error(typeof data.error === "string" ? data.error : `Request failed with ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";
      let sawTerminalEvent = false;
      let sawFirstByte = false;
      let contentChunkCount = 0;
      let statusEventCount = 0;
      let toolEventCount = 0;
      let honeyEventCount = 0;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!sawFirstByte) {
          sawFirstByte = true;
          logSchedulerRun("scheduler.run.stream.first_byte", { byteLength: value.byteLength });
          setRunPhase("thinking", "thinking");
        }
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const eventText of events) {
          const line = eventText.split("\n").find((entry) => entry.startsWith("data: "));
          if (!line) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") {
            sawTerminalEvent = true;
            continue;
          }
          const parsed = JSON.parse(payload) as {
            choices?: Array<{ delta?: { content?: string; tool_results?: unknown } }>;
            error?: string;
            honey?: unknown;
            status?: { type?: string };
            tool_call?: unknown;
          };
          if (parsed.error) throw new Error(parsed.error);
          if (parsed.honey) {
            honeyEventCount += 1;
            logSchedulerRun("scheduler.run.stream.honey", { honeyEventCount });
            await refreshHoneyLedger();
            continue;
          }
          if (parsed.status) {
            statusEventCount += 1;
            const statusType = parsed.status.type ?? "unknown";
            logSchedulerRun("scheduler.run.stream.status", {
              statusType,
              statusEventCount,
            });
            if (/tool|execut|run|action/i.test(statusType)) {
              setRunPhase("executing", "executing");
            } else if (/wrap|final|summar/i.test(statusType)) {
              setRunPhase("wrapping", "wrapping up");
            } else {
              setRunPhase("thinking", "thinking");
            }
          }
          if (parsed.tool_call) {
            toolEventCount += 1;
            logSchedulerRun("scheduler.run.stream.tool_call", { toolEventCount });
            setRunPhase("executing", "executing");
          }
          const chunk = parsed.choices?.[0]?.delta?.content;
          if (!chunk) continue;
          contentChunkCount += 1;
          fullText += chunk;
          if (contentChunkCount === 1 || contentChunkCount % 5 === 0) {
            logSchedulerRun("scheduler.run.stream.content", {
              contentChunkCount,
              outputLength: fullText.length,
            });
          }
          setRunPhase("wrapping", "wrapping up");
          setMessagesByAgent((current) => {
            const existing = current[agent.id] ?? [];
            const next = [...existing];
            const last = next[next.length - 1] ?? { role: "assistant" as const, content: "" };
            if (next.length === 0) next.push(last);
            next[next.length - 1] = { ...last, content: fullText, createdAt: last.createdAt ?? Date.now() };
            return { ...current, [agent.id]: next };
          });
          updateTask(task.id, { lastMessage: fullText });
        }
      }

      const result = fullText.trim() || `${agent.name} completed the scheduled run.`;
      logSchedulerRun("scheduler.run.completed", {
        sawTerminalEvent,
        sawFirstByte,
        outputLength: fullText.length,
        contentChunkCount,
        statusEventCount,
        toolEventCount,
        honeyEventCount,
      });
      updateTask(task.id, { status: "completed", lastMessage: result, completedAt: Date.now() });
      setSchedules((current) => current.map((item) => (
        item.id === schedule.id
          ? { ...item, lastRunAt: Date.now(), updatedAt: Date.now(), lastStatus: "ok", lastSummary: result.slice(0, 500) }
          : item
      )));
      setScheduleImportStatus(sawTerminalEvent
        ? `Completed ${schedule.name}.`
        : `Completed ${schedule.name}; runtime stream closed without an explicit done event.`);
      void recordSharedScheduledRun(schedule, {
        runId,
        status: "ok",
        startedAt: now,
        completedAt: Date.now(),
        prompt: scheduledPrompt,
        output: result,
        summary: result.slice(0, 500),
        telemetry: {
          sawTerminalEvent,
          sawFirstByte,
          contentChunkCount,
          statusEventCount,
          toolEventCount,
          honeyEventCount,
        },
      });
      finishRunState("done");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown runtime error";
      logSchedulerRun("scheduler.run.failed", {
        errorName: error instanceof Error ? error.name : "unknown",
        message,
      });
      setMessagesByAgent((current) => {
        const existing = current[agent.id] ?? [];
        const next = [...existing];
        const last = next[next.length - 1] ?? { role: "assistant" as const, content: "" };
        if (next.length === 0) next.push(last);
        next[next.length - 1] = { ...last, content: `Error: ${message}`, createdAt: last.createdAt ?? Date.now() };
        return { ...current, [agent.id]: next };
      });
      updateTask(task.id, { status: "failed", lastMessage: message, completedAt: Date.now() });
      setSchedules((current) => current.map((item) => (
        item.id === schedule.id ? { ...item, updatedAt: Date.now(), lastStatus: "failed", lastSummary: message } : item
      )));
      setScheduleImportStatus(`Could not run ${schedule.name}: ${message}`);
      void recordSharedScheduledRun(schedule, {
        runId,
        status: "failed",
        startedAt: now,
        completedAt: Date.now(),
        prompt: scheduledPrompt,
        summary: message,
        telemetry: {
          errorName: error instanceof Error ? error.name : "unknown",
        },
      });
      finishRunState("idle");
    } finally {
      window.clearInterval(waitingInterval);
    }
  }

  const schedulerStatusFromSchedule = useCallback((schedule: AgentSchedule): SchedulerJob["lastRun"]["status"] => {
    const raw = schedule.lastStatus?.toLowerCase() ?? "";
    if (raw.includes("fail") || raw.includes("error")) return "failed";
    if (raw.includes("warn") || raw.includes("stale")) return "warn";
    return schedule.lastRunAt ? "ok" : "idle";
  }, []);

  const scheduleIntervalMs = useCallback((every: string) => {
    const match = every.trim().match(/^(\d+(?:\.\d+)?)(ms|s|m|h|d)$/i);
    if (!match) return null;
    const value = Number(match[1]);
    const unit = match[2].toLowerCase();
    if (!Number.isFinite(value)) return null;
    if (unit === "ms") return value;
    if (unit === "s") return value * 1000;
    if (unit === "m") return value * 60_000;
    if (unit === "h") return value * 3_600_000;
    return value * 86_400_000;
  }, []);

  function formatSchedulerDuration(ms: number) {
    const minutes = Math.max(1, Math.round(ms / 60_000));
    if (minutes < 60) return `in ${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `in ${hours}h ${rest}m` : `in ${hours}h`;
  }

  const schedulerCadenceLabel = useCallback((every: string) => {
    const ms = scheduleIntervalMs(every);
    if (!ms) return every || "custom";
    const minutes = Math.round(ms / 60_000);
    if (minutes < 60) return `Every ${minutes}m`;
    if (minutes % 1440 === 0) return `Every ${minutes / 1440}d`;
    if (minutes % 60 === 0) return `Every ${minutes / 60}h`;
    return `Every ${minutes}m`;
  }, [scheduleIntervalMs]);

  const schedulerJobs = useMemo<SchedulerJob[]>(() => schedules.map((schedule) => {
    const agent = displayAgents.find((item) => item.id === schedule.agentId);
    const runtime = schedule.externalSource ?? agent?.runtime ?? "openclaw";
    const intervalMs = scheduleIntervalMs(schedule.every);
    const anchor = schedule.lastRunAt ?? schedule.updatedAt ?? schedule.createdAt;
    const remaining = intervalMs ? intervalMs - ((Date.now() - anchor) % intervalMs) : null;
    const lastStatus = schedulerStatusFromSchedule(schedule);
    const lastRunAt = schedule.lastRunAt ? formatRelativeTime(schedule.lastRunAt) : "not run yet";
    const description = schedule.lastSummary || (schedule.mode === "steps"
      ? `${schedule.steps.length || 1} step runbook`
      : schedule.prompt || "Dashboard-managed schedule.");
    return {
      id: schedule.id,
      name: schedule.name,
      description,
      cron: schedule.every,
      cronLabel: schedulerCadenceLabel(schedule.every),
      runtime: RUNTIME_LABELS[runtime as AgentRuntime] ?? runtime,
      machine: agent?.machineName ?? schedule.externalSource ?? "dashboard",
      bee: agent?.name ?? "Unassigned",
      enabled: schedule.enabled,
      nextRun: schedule.enabled && remaining ? formatSchedulerDuration(remaining) : schedule.enabled ? "scheduled" : "paused",
      nextRunISO: intervalMs ? new Date(Date.now() + (remaining ?? intervalMs)).toISOString() : new Date(schedule.updatedAt).toISOString(),
      lastRun: { status: lastStatus, at: lastRunAt, dur: schedule.lastRunAt ? "recorded" : "-" },
      history: [
        { status: lastStatus, at: lastRunAt, dur: schedule.lastRunAt ? "recorded" : "-" },
      ],
      tags: [
        schedule.mode,
        ...(schedule.skills.slice(0, 2)),
        ...(schedule.paths.length ? ["paths"] : []),
      ],
    };
  }), [displayAgents, scheduleIntervalMs, schedules, schedulerCadenceLabel, schedulerStatusFromSchedule]);

  function findScheduleForJob(job: SchedulerJob) {
    return schedules.find((schedule) => schedule.id === job.id);
  }

  function modalCadenceFromEvery(every: string): NewTaskPayload["cadence"] {
    if (every === "15m") return { kind: "every15" };
    if (every === "1h" || every === "60m") return { kind: "hourly" };
    if (every === "24h" || every === "1440m") return { kind: "daily" };
    if (every === "manual") return { kind: "manual" };
    if (/^[\d*/,-]+\s+[\d*/,-]+\s+[\d*/,-]+\s+[\d*/,-]+\s+[\d*/,-]+$/.test(every.trim())) return { kind: "cron", expr: every.trim() };
    return { kind: "cron", expr: every.trim() || "0 2 * * *" };
  }

  function everyFromModalCadence(cadence: NewTaskPayload["cadence"]) {
    if (cadence.kind === "every15") return "15m";
    if (cadence.kind === "hourly") return "1h";
    if (cadence.kind === "daily") return "24h";
    if (cadence.kind === "weekday") return "30 13 * * 1-5";
    if (cadence.kind === "session") return "30 13 * * 1-5";
    if (cadence.kind === "manual") return "manual";
    return cadence.kind === "cron" ? cadence.expr || "0 2 * * *" : "0 2 * * *";
  }

  const schedulerModalInitial = useMemo<Partial<NewTaskPayload>>(() => {
    const selectedAgentForDraft = displayAgents.find((agent) => agent.id === scheduleDraft.agentId) ?? selectedAgent ?? displayAgents[0];
    return {
      title: scheduleDraft.name || (editingScheduleId ? "Edit scheduled task" : "New scheduled task"),
      mode: scheduleDraft.mode,
      steps: scheduleDraft.steps.map((step) => step.text).filter(Boolean),
      prompt: scheduleDraft.prompt,
      attachments: [
        ...scheduleDraft.skills.map((skill) => ({ kind: "skill" as const, label: skill })),
        ...scheduleDraft.paths.map((path) => ({ kind: "path" as const, label: path })),
      ],
      cadence: modalCadenceFromEvery(scheduleDraft.every),
      target: {
        machine: selectedAgentForDraft?.machineName ?? "dashboard",
        bee: selectedAgentForDraft?.name ?? "",
      },
      templateId: null,
      usePastRuns: scheduleDraft.usePastRuns,
      pastRunLimit: scheduleDraft.pastRunLimit,
    };
  }, [displayAgents, editingScheduleId, scheduleDraft, selectedAgent]);

  function saveScheduleFromModal(task: NewTaskPayload) {
    const agent = displayAgents.find((item) => item.name === task.target.bee)
      ?? displayAgents.find((item) => item.machineName === task.target.machine)
      ?? selectedAgent
      ?? displayAgents[0];
    if (!agent) return;
    const now = Date.now();
    const skills = task.attachments.filter((item) => item.kind === "skill").map((item) => item.label);
    const paths = task.attachments.filter((item) => item.kind === "path").map((item) => item.label);
    const steps = task.mode === "steps"
      ? task.steps.filter((step) => step.trim()).map((step, index) => ({
        id: `step-${now}-${index}`,
        text: step.trim(),
        skills: [],
        paths: [],
        model: "",
      }))
      : [];
    const prompt = task.mode === "steps"
      ? steps.map((step, index) => `${index + 1}. ${step.text}`).join("\n")
      : task.prompt.trim();
    const editedSchedule = editingScheduleId ? schedules.find((schedule) => schedule.id === editingScheduleId) : null;
    const next: AgentSchedule = {
      id: editedSchedule?.id ?? `schedule-${now}-${Math.random().toString(36).slice(2, 7)}`,
      name: task.title.trim() || `Run ${agent.name}`,
      agentId: agent.id,
      enabled: editedSchedule?.enabled ?? true,
      every: everyFromModalCadence(task.cadence),
      mode: task.mode,
      prompt,
      model: editedSchedule?.model ?? "",
      skills,
      paths,
      steps,
      createdAt: editedSchedule?.createdAt ?? now,
      updatedAt: now,
      lastRunAt: editedSchedule?.lastRunAt,
      externalSource: editedSchedule?.externalSource,
      externalJobId: editedSchedule?.externalJobId,
      lastStatus: editedSchedule?.lastStatus,
      lastSummary: editedSchedule?.lastSummary,
      usePastRuns: task.usePastRuns,
      pastRunLimit: Math.max(1, Math.min(12, Number(task.pastRunLimit) || 3)),
      sharedSchedulePath: editedSchedule?.sharedSchedulePath,
      sharedRunFolder: editedSchedule?.sharedRunFolder,
    };
    setSchedules((current) => editedSchedule
      ? current.map((schedule) => schedule.id === editedSchedule.id ? next : schedule)
      : [next, ...current]);
    void upsertSharedSchedule(next);
    resetScheduleDraft(agent.id);
    setSchedulerDraftOpen(false);
  }

  const browseSchedulerFolder = useCallback(async () => {
    const currentPath = scheduleDraft.paths.find((path) => path.trim()) ?? sharedVault.vaultPath ?? "";
    const response = await fetch("/api/scheduler/browse-folder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPath }),
    }).catch(() => null);
    const data = await response?.json().catch(() => null) as { path?: string; cancelled?: boolean } | null;
    return response?.ok && data?.path ? data.path : null;
  }, [scheduleDraft.paths, sharedVault.vaultPath]);

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

  async function refreshHoneyLedger() {
    if (!honeyLedgerEnabled) return;
    const response = await fetch("/api/honey-ledger", { cache: "no-store" }).catch(() => null);
    const data = await response?.json().catch(() => null) as { ok?: boolean; ledger?: HoneyTreasuryConfig } | null;
    if (data?.ok && data.ledger) {
      setHoneyTreasury({
        ...createDefaultHoneyTreasuryConfig(),
        ...data.ledger,
        agentTokenUsage: data.ledger.agentTokenUsage ?? {},
        agentHoneyExchanged: data.ledger.agentHoneyExchanged ?? {},
        agentHiveBalances: data.ledger.agentHiveBalances ?? {},
      });
    }
  }

  async function observeHoneyUsage(force = false) {
    if (!force && !honeyLedgerEnabled) return;
    const response = await fetch("/api/honey-ledger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "observe" }),
    }).catch(() => null);
    const data = await response?.json().catch(() => null) as { ok?: boolean; ledger?: HoneyTreasuryConfig } | null;
    if (data?.ledger) {
      setHoneyTreasury({
        ...createDefaultHoneyTreasuryConfig(),
        ...data.ledger,
        agentTokenUsage: data.ledger.agentTokenUsage ?? {},
        agentHoneyExchanged: data.ledger.agentHoneyExchanged ?? {},
        agentHiveBalances: data.ledger.agentHiveBalances ?? {},
      });
      return;
    }
    await refreshHoneyLedger();
  }

  async function exchangeHoneyForHive(agentId: string) {
    if (!honeyLedgerEnabled) return;
    await fetch("/api/honey-ledger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "exchange", agentId }),
    }).catch(() => null);
    await refreshHoneyLedger();
  }

  async function exchangeAllHoneyForHive() {
    if (!honeyLedgerEnabled) return;
    await fetch("/api/honey-ledger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "exchange" }),
    }).catch(() => null);
    await refreshHoneyLedger();
  }

  async function enableHoneyLedger() {
    setHoneyLedgerEnabled(true);
    await observeHoneyUsage(true);
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
      runtimeKind: RUNTIME_KINDS[runtime],
      runtimeCapabilities: RUNTIME_CAPABILITIES[runtime],
      a2aUrl: runtime === "aeon" ? defaults.gatewayUrl : undefined,
      aeonBranch: runtime === "aeon" ? "main" : undefined,
      aeonMode: runtime === "aeon" ? "github" : undefined,
    });
  }

  function appendMessage(agentId: string, message: ChatMessage) {
    logClientTelemetry("chat.message.appended", {
      agentId,
      role: message.role,
      kanbanTaskId: message.kanbanTaskId ?? null,
      surface: message.surface ?? null,
      contentLength: message.content.length,
      attachmentCount: message.attachments?.length ?? 0,
    });
    setMessagesByAgent((current) => ({
      ...current,
      [agentId]: [...(current[agentId] ?? []), { ...message, createdAt: message.createdAt ?? Date.now() }],
    }));
  }

  const hasConversation = useCallback((agentId: string) => {
    return (messagesByAgent[agentId] ?? []).some((message) => (
      message.role !== "system"
      && isManualAgentChatMessage(message)
      && message.content.trim()
    ));
  }, [messagesByAgent]);

  const conversationTitle = useCallback((agentId: string) => {
    const firstUserMessage = (messagesByAgent[agentId] ?? [])
      .find((message) => message.role === "user" && isManualAgentChatMessage(message))
      ?.content.trim();
    return firstUserMessage ? firstUserMessage.slice(0, 56) : "Previous chat";
  }, [messagesByAgent]);

  const startAgentChat = useCallback((agentId: string, options: { fresh?: boolean; messageLimit?: number; seedMessages?: ChatMessage[]; chatLeafKey?: string; workingDirectoryPath?: string } = {}) => {
    const leafKey = options.chatLeafKey ?? `agent-${agentId}`;
    const agent = displayAgents.find((item) => item.id === agentId);
    if (!runtimeCan(agent, "chat")) return;
    const machine = machineGroups.find((group) => group.agents.some((item) => item.id === agentId));
    setSelectedAgentId(agentId);
    setSelectedChatLeafKey(leafKey);
    setSelectedChatDirectoryPath(options.workingDirectoryPath ?? machine?.version?.appDir ?? agent?.localDataDir ?? "");
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
  }, [displayAgents, machineGroups]);

  function openChatFolderCreator(machine: MachineGroup) {
    const chatAgents = machine.agents.filter((agent) => runtimeCan(agent, "chat"));
    const defaultPath = machine.version?.appDir
      || chatAgents.find((agent) => agent.localDataDir?.trim())?.localDataDir
      || "~";
    setChatFolderDraft({
      machineKey: machine.key,
      parentPath: defaultPath,
      name: "",
      busy: false,
      error: "",
    });
  }

  function closeChatFolderCreator() {
    setChatFolderDraft({ machineKey: "", parentPath: "", name: "", busy: false, error: "" });
  }

  async function createChatFolder() {
    const machine = machineGroups.find((item) => item.key === chatFolderDraft.machineKey);
    const agent = machine?.agents.find((item) => runtimeCan(item, "chat"));
    const parentPath = chatFolderDraft.parentPath.trim();
    const name = chatFolderDraft.name.trim();
    if (!machine || !agent) {
      setChatFolderDraft((current) => ({ ...current, error: "Pick a machine with an available agent first." }));
      return;
    }
    if (!parentPath || !name) {
      setChatFolderDraft((current) => ({ ...current, error: "Choose a parent directory and name the folder." }));
      return;
    }
    setChatFolderDraft((current) => ({ ...current, busy: true, error: "" }));
    const response = await fetch("/api/chat/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentPath, name }),
    }).catch(() => null);
    const data = await response?.json().catch(() => null) as { ok?: boolean; path?: string; label?: string; error?: string } | null;
    if (!response?.ok || !data?.ok || !data.path) {
      setChatFolderDraft((current) => ({ ...current, busy: false, error: data?.error ?? "Could not create that folder." }));
      return;
    }
    const label = data.label || workspaceLabelFromPath(data.path);
    const nextFolder: ChatCustomFolder = {
      id: `${machine.key}-${Date.now()}`,
      machineKey: machine.key,
      label,
      path: data.path,
      agentId: agent.id,
      createdAt: Date.now(),
    };
    setChatCustomFolders((current) => [
      nextFolder,
      ...current.filter((folder) => !(folder.machineKey === nextFolder.machineKey && folder.path === nextFolder.path)),
    ]);
    closeChatFolderCreator();
    startAgentChat(agent.id, {
      fresh: true,
      workingDirectoryPath: data.path,
      chatLeafKey: `folder-${machine.key}-${chatDedupeKey(data.path)}-${agent.id}`,
    });
  }

  const chatSidebarTree = useMemo<ChatTreeMachine[]>(() => (
    machineGroups.map((machine) => {
      const folderMap = new Map<string, ChatTreeFolder>();
      const ensureFolder = (label: string, onStartChat?: () => void, path?: string, active?: boolean) => {
        const key = chatDedupeKey(path || label);
        const existing = folderMap.get(key);
        if (existing) {
          if (!existing.onStartChat && onStartChat) existing.onStartChat = onStartChat;
          if (!existing.path && path) existing.path = path;
          if (active) existing.active = true;
          return existing;
        }
        const next: ChatTreeFolder = { key: `${machine.key}-${key}`, label, path, active, chats: [], onStartChat };
        folderMap.set(key, next);
        return next;
      };

      for (const agent of machine.agents.filter((item) => runtimeCan(item, "chat"))) {
        const folderPath = machine.version?.appDir || agent.localDataDir || "";
        const folderLabel = chatFolderLabel(agent, machine);
        const folder = ensureFolder(folderLabel, () => startAgentChat(agent.id, {
          fresh: true,
          workingDirectoryPath: folderPath,
          chatLeafKey: `folder-${machine.key}-${chatDedupeKey(folderPath || folderLabel)}-${agent.id}`,
        }), folderPath, Boolean(selectedChatDirectoryPath && folderPath && selectedChatDirectoryPath === folderPath));
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
          const taskWorkingDirectory = task.workingDirectory;
          const taskFolder = taskWorkingDirectory
            ? ensureFolder(workspaceLabelFromPath(taskWorkingDirectory), () => startAgentChat(agent.id, {
              fresh: true,
              workingDirectoryPath: taskWorkingDirectory,
              chatLeafKey: `folder-${machine.key}-${chatDedupeKey(taskWorkingDirectory)}-${agent.id}`,
            }), taskWorkingDirectory, selectedChatDirectoryPath === taskWorkingDirectory)
            : folder;
          taskFolder.chats.push({
            key: taskChatKey,
            title: task.title || "Previous chat",
            subtitle: task.lastMessage || agent.name,
            updatedAt: task.updatedAt > 0 ? task.updatedAt : task.startedAt > 0 ? task.startedAt : undefined,
            rank: workPriority(task) + (task.messages?.length ? 3 : 0),
            active: selectedChatLeafKey === taskChatKey,
            onOpen: () => startAgentChat(agent.id, { messageLimit: 5, seedMessages, chatLeafKey: taskChatKey, workingDirectoryPath: task.workingDirectory }),
          });
        }
      }

      for (const customFolder of chatCustomFolders.filter((folder) => folder.machineKey === machine.key)) {
        const chatAgents = machine.agents.filter((item) => runtimeCan(item, "chat"));
        const agent = chatAgents.find((item) => item.id === customFolder.agentId) ?? chatAgents[0];
        ensureFolder(customFolder.label, agent ? () => startAgentChat(agent.id, {
          fresh: true,
          workingDirectoryPath: customFolder.path,
          chatLeafKey: `folder-${machine.key}-${chatDedupeKey(customFolder.path)}-${agent.id}`,
        }) : undefined, customFolder.path, Boolean(selectedChatDirectoryPath && selectedChatDirectoryPath === customFolder.path));
      }

      const chatAgents = machine.agents.filter((item) => runtimeCan(item, "chat"));
      return {
        key: machine.key,
        name: machine.name,
        detail: machine.collector === "ready" ? `${machine.agents.length} available` : "Collector not ready",
        onStartChat: chatAgents.length > 0
          ? () => startAgentChat(chatAgents[0].id, {
            fresh: true,
            workingDirectoryPath: machine.version?.appDir || chatAgents[0].localDataDir,
            chatLeafKey: `machine-${machine.key}-${chatAgents[0].id}`,
          })
          : undefined,
        onCreateFolder: chatAgents.length > 0 ? () => openChatFolderCreator(machine) : undefined,
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
  ), [agentWorkById, chatCustomFolders, chatMessageWindow, conversationTitle, hasConversation, machineGroups, selectedAgent?.id, selectedChatDirectoryPath, selectedChatLeafKey, startAgentChat]);

  const selectedChatMachine = useMemo(() => (
    selectedAgent
      ? chatSidebarTree.find((machine) => machine.folders.some((folder) => (
        folder.chats.some((chat) => chat.active) || machineGroups.find((group) => group.key === machine.key)?.agents.some((agent) => agent.id === selectedAgent.id)
      ))) ?? null
      : null
  ), [chatSidebarTree, machineGroups, selectedAgent]);

  const selectedChatDirectory = useMemo(() => {
    if (!selectedAgent) return "";
    const activeFolder = selectedChatMachine?.folders.find((folder) => folder.active || folder.chats.some((chat) => chat.active));
    if (activeFolder) return activeFolder.label;
    if (selectedChatDirectoryPath) return workspaceLabelFromPath(selectedChatDirectoryPath);
    const machine = machineGroups.find((group) => group.agents.some((agent) => agent.id === selectedAgent.id));
    return machine ? chatFolderLabel(selectedAgent, machine) : workspaceLabelFromPath(selectedAgent.localDataDir);
  }, [machineGroups, selectedAgent, selectedChatDirectoryPath, selectedChatMachine]);

  const chatFolderCreatorMachine = useMemo(
    () => machineGroups.find((machine) => machine.key === chatFolderDraft.machineKey) ?? null,
    [chatFolderDraft.machineKey, machineGroups],
  );

  const chatFolderCreatorParentOptions = useMemo(
    () => {
      if (!chatFolderCreatorMachine) return [];
      return [...new Set([
        chatFolderCreatorMachine.version?.appDir,
        ...chatFolderCreatorMachine.agents.map((agent) => agent.localDataDir),
        ...chatCustomFolders
          .filter((folder) => folder.machineKey === chatFolderCreatorMachine.key)
          .map((folder) => parentPathFromPath(folder.path)),
        "~",
      ].map((path) => path?.trim()).filter(Boolean) as string[])];
    },
    [chatCustomFolders, chatFolderCreatorMachine],
  );

  function openSetupModal(machine: MachineGroup) {
    setSetupMachineKey(machine.key);
    setSetupCommandCopied(false);
  }

  async function copySetupCommand() {
    await navigator.clipboard?.writeText(setupCollectorCommand()).catch(() => undefined);
    setSetupCommandCopied(true);
    window.setTimeout(() => setSetupCommandCopied(false), 2500);
  }

  function openMachineInitModal() {
    setMachineInitOpen(true);
    setMachineInitStatus({});
    setMachineInitCopiedKey("");
    setMachineInitTokenStatus({});
  }

  async function saveHetznerToken() {
    const token = machineInitToken.trim();
    if (!token) {
      setMachineInitTokenStatus({ error: "Paste a Hetzner Cloud API token first." });
      return;
    }
    setMachineInitTokenStatus({ busyAction: "save" });
    const response = await fetch("/api/fleet/hetzner/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    }).catch(() => null);
    const data = await response?.json().catch(() => null) as { ok?: boolean; error?: string; message?: string } | null;
    if (!response?.ok || !data?.ok) {
      setMachineInitTokenStatus({ error: data?.error ?? "Could not save the Hetzner token." });
      return;
    }
    setMachineInitToken("");
    setMachineInitTokenStatus({ ok: true, message: data.message ?? "Saved HCLOUD_TOKEN locally with hive-env-add." });
  }

  async function openHetznerEnvFile() {
    setMachineInitTokenStatus({ busyAction: "open" });
    const response = await fetch("/api/fleet/hetzner/env/open", { method: "POST" }).catch(() => null);
    const data = await response?.json().catch(() => null) as { ok?: boolean; error?: string; message?: string } | null;
    if (!response?.ok || !data?.ok) {
      setMachineInitTokenStatus({ error: data?.error ?? "Could not open the local env file." });
      return;
    }
    setMachineInitTokenStatus({ ok: true, message: data.message ?? "Opened the local HivemindOS env file." });
  }

  async function initializeMachineProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMachineInitStatus({ busy: true });
    const response = await fetch("/api/fleet/machines/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(machineInitDraft),
    }).catch(() => null);
    const data = await response?.json().catch(() => null) as {
      ok?: boolean;
      machine?: MachineInitResult;
      error?: string;
    } | null;
    if (!response?.ok || !data?.ok || !data.machine) {
      setMachineInitStatus({ error: data?.error ?? "Could not initialize the machine project." });
      return;
    }
    setMachineInitStatus({ result: data.machine });
  }

  async function copyMachineInitCommand(key: string, command: string) {
    await navigator.clipboard?.writeText(command).catch(() => undefined);
    setMachineInitCopiedKey(key);
    window.setTimeout(() => setMachineInitCopiedKey((current) => current === key ? "" : current), 2500);
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

  async function raiseHermesAuthAlert(agent: AgentProfile, task: KanbanTask, message: string) {
    const machine = agent.machineName || "Unknown machine";
    const idSource = `${agent.id || agent.agentId || agent.name}-${machine}-hermes-auth`;
    const response = await fetch("/api/openclaw/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...notificationStorageBody(),
        notification: {
          id: `hermes-auth-${idSource}`,
          title: `${agent.name} needs sign-in on ${machine}`,
          priority: "high",
          kind: "alert",
          agentName: agent.name,
          agentId: agent.id || agent.agentId,
          source: `kanban:${task.id}`,
          tags: ["kanban", "hermes", "auth", "runtime"],
          body: [
            `${agent.name} couldn’t start "${task.title}" because Codex is signed out on ${machine}.`,
            "",
            `Run this on ${machine}:`,
            "",
            "```bash",
            "codex",
            "hermes auth",
            "```",
            "",
            `Reason: ${summarizeHermesAuthError(message)}`,
            "",
            "If Hermes asks for model access afterward, run `hermes model` too.",
          ].join("\n"),
        },
      }),
    });
    const data = await response.json().catch(() => null) as NotificationsResponse | null;
    if (response.ok && data?.ok) {
      setNotifications(data.notifications ?? []);
      setNotificationCursor(data.nextCursor ?? null);
      setNotificationSummary({
        total: data.total ?? 0,
        unread: data.unread ?? 0,
        highUnread: data.highUnread ?? 0,
        urgentUnread: data.urgentUnread ?? 0,
        folder: data.folder ?? sharedVault.notificationsFolder ?? "agent-notifications",
        settings: data.settings!,
      });
    }
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
    const attachments = quickAddAttachments[status] ?? [];
    const directories = quickAddDirectories[status] ?? [];
    const targetMachine = quickAddMachineTargets[status] ?? null;
    if (!title && attachments.length === 0 && directories.length === 0) return;
    const body = [
      directories.length ? ["Linked directories:", ...directories.map((directory) => `- ${directory.name}`)].join("\n") : "",
      attachments.length ? [
        "Attached context:",
        ...attachments.map((attachment) => `- ${attachment.kind}: ${attachment.name} (${attachment.mimeType || "unknown"}, ${attachmentSizeLabel(attachment.size)})`),
      ].join("\n") : "",
    ].filter(Boolean).join("\n\n");
    const response = await fetch(`/api/kanban?board=${encodeURIComponent(kanbanBoardSlug)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...kanbanStorageBody(),
        title: title || "Untitled task",
        body,
        assignee: "",
        tenant: "",
        priority: "normal",
        status,
        attachments,
        linkedDirectories: directories,
        targetMachine,
      }),
    });
    const data = await response.json().catch(() => null) as KanbanResponse | null;
    if (!response.ok || !data?.ok) {
      setKanbanError(data?.error ?? "Could not create task.");
      return;
    }
    setQuickAddDrafts((current) => ({ ...current, [status]: "" }));
    setQuickAddAttachments((current) => ({ ...current, [status]: [] }));
    setQuickAddDirectories((current) => ({ ...current, [status]: [] }));
    setQuickAddMachineTargets((current) => ({ ...current, [status]: null }));
    setQuickAddMachineMenuOpen((current) => ({ ...current, [status]: false }));
    setQuickAddAttachmentError("");
    setQuickAddStatus("");
    if (data.board) {
      setKanbanBoard(data.board);
      setKanbanStorage(data.storage ?? null);
    }
    if (status === "ready" && data.task) {
      const readyTask = data.task;
      kanbanReadyPickupInFlightRef.current.add(readyTask.id);
      await orchestrateReadyKanbanTask(readyTask).finally(() => {
        kanbanReadyPickupInFlightRef.current.delete(readyTask.id);
      });
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

  async function patchKanbanTask(taskId: string, patch: KanbanTaskPatch) {
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

  async function updateKanbanTaskMachine(task: KanbanTask, targetMachine: KanbanMachineTarget | null) {
    await patchKanbanTask(task.id, {
      targetMachine,
      ...(task.status === "ready" ? { assignee: "", tenant: "", agentSession: null } : {}),
    });
  }

  async function markKanbanTaskReviewed(task: KanbanTask) {
    await patchKanbanTask(task.id, {
      reviewedAt: Date.now(),
      reviewedBy: "dashboard",
    });
  }

  async function requestKanbanTaskUndo(task: KanbanTask) {
    const now = Date.now();
    const priorResult = task.result?.trim();
    await patchKanbanTask(task.id, {
      status: "ready",
      assignee: "",
      tenant: "",
      agentSession: null,
      reviewedAt: null,
      reviewedBy: "",
      undoRequestedAt: now,
      undoRequestedBy: "dashboard",
      result: [
        `Undo requested ${new Date(now).toLocaleString()}.`,
        "Only reverse work performed for this task; preserve unrelated changes.",
        priorResult ? `Previous task result:\n${priorResult}` : "",
      ].filter(Boolean).join("\n\n"),
    });
    await addKanbanSystemComment(task.id, "Undo requested from the task menu; Queen Bee will assign a targeted reversal.");
  }

  async function readWorkspaceGitSnapshot(): Promise<WorkspaceGitSnapshot | null> {
    if (!appVersion?.appDir) return null;
    const response = await fetch("/api/workspace/git-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cwd: appVersion.appDir }),
    }).catch(() => null);
    const data = await response?.json().catch(() => null) as { ok?: boolean; snapshot?: WorkspaceGitSnapshot } | null;
    return response?.ok && data?.ok && data.snapshot ? data.snapshot : null;
  }

  function kanbanWorkspaceChangeSummary(before: WorkspaceGitSnapshot | null, after: WorkspaceGitSnapshot | null) {
    if (!after || before?.signature === after.signature) return "";
    const changedFiles = after.statusLines.map((line) => line.slice(3).trim()).filter(Boolean);
    const headChanged = before?.head && before.head !== after.head;
    return [
      "Runtime completed with observable workspace changes.",
      headChanged ? `HEAD changed from ${before.head.slice(0, 7)} to ${after.head.slice(0, 7)}.` : "",
      changedFiles.length ? `Changed files: ${changedFiles.slice(0, 8).join(", ")}${changedFiles.length > 8 ? ", ..." : ""}.` : "",
    ].filter(Boolean).join(" ");
  }

  async function addKanbanCardFiles(taskId: string, files: FileList | File[], kind: "image" | "file") {
    const task = kanbanBoard?.tasks.find((item) => item.id === taskId);
    if (!task) return;
    try {
      const next = await readComposerFiles(files, kind);
      setKanbanCardAttachmentMenuOpen((current) => ({ ...current, [taskId]: false }));
      await patchKanbanTask(taskId, {
        attachments: [...(task.attachments ?? []), ...next],
      });
    } catch (error) {
      setKanbanError(error instanceof Error ? error.message : "Could not attach that file.");
    }
  }

  function openKanbanCardFilePicker(taskId: string, kind: "image" | "file") {
    setKanbanCardAttachmentTargetId(taskId);
    if (kind === "image") kanbanCardImageInputRef.current?.click();
    else kanbanCardFileInputRef.current?.click();
  }

  function handleKanbanCardFileChange(event: ChangeEvent<HTMLInputElement>) {
    if (kanbanCardAttachmentTargetId && event.target.files?.length) {
      void addKanbanCardFiles(kanbanCardAttachmentTargetId, event.target.files, "file");
    }
    event.target.value = "";
  }

  function handleKanbanCardImageChange(event: ChangeEvent<HTMLInputElement>) {
    if (kanbanCardAttachmentTargetId && event.target.files?.length) {
      void addKanbanCardFiles(kanbanCardAttachmentTargetId, event.target.files, "image");
    }
    event.target.value = "";
  }

  async function attachKanbanCardDirectory(task: KanbanTask) {
    try {
      const directory = await pickLinkedDirectory();
      if (!directory) return;
      setKanbanCardAttachmentMenuOpen((current) => ({ ...current, [task.id]: false }));
      await patchKanbanTask(task.id, {
        linkedDirectories: [...(task.linkedDirectories ?? []), directory],
      });
    } catch (error) {
      setKanbanError(error instanceof Error ? error.message : "Could not link that directory.");
    }
  }

  async function moveKanbanTask(taskId: string, status: KanbanStatus) {
    const currentTask = kanbanBoard?.tasks.find((task) => task.id === taskId);
    const targetStatus = status === "working" && !currentTask?.assignee?.trim()
      ? "ready"
      : status;
    logClientTelemetry("kanban.task.move.requested", {
      taskId,
      fromStatus: currentTask?.status ?? null,
      requestedStatus: status,
      targetStatus,
      assignee: currentTask?.assignee ?? null,
    });
    const response = await fetch(`/api/kanban?board=${encodeURIComponent(kanbanBoardSlug)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...kanbanStorageBody(), taskId, status: targetStatus }),
    });
    const data = await response.json().catch(() => null) as KanbanResponse | null;
    if (!response.ok || !data?.ok) {
      logClientTelemetry("kanban.task.move.failed", {
        taskId,
        targetStatus,
        error: data?.error ?? `HTTP ${response.status}`,
      });
      setKanbanError(data?.error ?? "Could not move task.");
      return;
    }
    logClientTelemetry("kanban.task.move.saved", {
      taskId,
      targetStatus,
      returnedStatus: data.task?.status ?? null,
      assignee: data.task?.assignee ?? null,
    });
    if (data.board) {
      setKanbanBoard(data.board);
      setKanbanStorage(data.storage ?? null);
    }
    if (targetStatus === "ready" && data.task) {
      const readyTask = data.task;
      kanbanReadyPickupInFlightRef.current.add(readyTask.id);
      await orchestrateReadyKanbanTask(readyTask).finally(() => {
        kanbanReadyPickupInFlightRef.current.delete(readyTask.id);
      });
      return;
    }
    await refreshKanbanOnce().catch((error) => setKanbanError(error instanceof Error ? error.message : "Kanban refresh failed."));
  }

  async function deleteKanbanTask(task: KanbanTask) {
    const confirmed = window.confirm(`Delete "${task.title}" from the Work board? This also removes its notes and task links.`);
    if (!confirmed) return;
    const response = await fetch(`/api/kanban?board=${encodeURIComponent(kanbanBoardSlug)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...kanbanStorageBody(), taskId: task.id }),
    });
    const data = await response.json().catch(() => null) as KanbanResponse | null;
    if (!response.ok || !data?.ok) {
      setKanbanError(data?.error ?? "Could not delete task.");
      return;
    }
    if (selectedKanbanTaskId === task.id) {
      setSelectedKanbanTaskId("");
      setKanbanTaskModal("");
    }
    kanbanRuntimeAbortRef.current.get(task.id)?.abort();
    kanbanRuntimeAbortRef.current.delete(task.id);
    if (data.board) {
      setKanbanBoard(data.board);
      setKanbanStorage(data.storage ?? null);
    }
    await refreshKanbanOnce().catch((error) => setKanbanError(error instanceof Error ? error.message : "Kanban refresh failed."));
  }

  /* eslint-disable react-hooks/immutability, react-hooks/purity */
  async function editAndInterruptKanbanTask(event: FormEvent) {
    event.preventDefault();
    if (!selectedKanbanTask || kanbanEditPendingTaskId) return;
    const agent = selectedKanbanAgent;
    if (!agent) {
      setKanbanError("Assign this task to an available agent before using Edit & interrupt.");
      return;
    }
    const setupIssue = chatSetupIssue(agent);
    if (setupIssue) {
      setKanbanError(`Could not resend to ${agent.name}: ${setupIssue}`);
      return;
    }
    const title = kanbanEditDraft.title.trim();
    if (!title) {
      setKanbanError("Task title is required.");
      return;
    }

    const previousTitle = selectedKanbanTask.title;
    const previousBody = selectedKanbanTask.body;
    const revisedTask: KanbanTask = {
      ...selectedKanbanTask,
      title,
      body: kanbanEditDraft.body.trim(),
      status: "working",
      assignee: selectedKanbanTask.assignee || agent.name,
    };
    const prompt = kanbanTaskInterruptPrompt(revisedTask, previousTitle, previousBody);
    const localTaskId = `kanban-edit-${selectedKanbanTask.id}-${Date.now()}`;
    let fullText = "";
    let sawAgentSession = false;

    kanbanRuntimeAbortRef.current.get(selectedKanbanTask.id)?.abort();
    const controller = new AbortController();
    kanbanRuntimeAbortRef.current.set(selectedKanbanTask.id, controller);
    kanbanReadyPickupInFlightRef.current.add(selectedKanbanTask.id);
    kanbanReadyPickupAttemptRef.current.delete(selectedKanbanTask.id);
    kanbanReadyPickupAttemptRef.current.delete(`working:${kanbanReadyPickupSignature(selectedKanbanTask, displayAgents)}`);
    setKanbanEditPendingTaskId(selectedKanbanTask.id);
    setKanbanError("");
    upsertTask({
      id: localTaskId,
      agentId: agent.id,
      title: revisedTask.title,
      lastMessage: "Interrupting with edited task...",
      status: "active",
      startedAt: Date.now(),
      updatedAt: Date.now(),
      source: "kanban",
    });
    appendMessage(agent.id, { role: "user", content: prompt, kanbanTaskId: selectedKanbanTask.id, surface: "kanban" });
    appendMessage(agent.id, { role: "assistant", content: "", kanbanTaskId: selectedKanbanTask.id, surface: "kanban" });

    try {
      const patchResponse = await fetch(`/api/kanban?board=${encodeURIComponent(kanbanBoardSlug)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...kanbanStorageBody(),
          taskId: selectedKanbanTask.id,
          patch: {
            title: revisedTask.title,
            body: revisedTask.body,
            status: "working",
            assignee: selectedKanbanTask.assignee || agent.name,
            agentSession: null,
            result: `Edited and resent to ${agent.name}; previous work was interrupted from the dashboard.`,
          },
        }),
      });
      const patchData = await patchResponse.json().catch(() => null) as KanbanResponse | null;
      if (!patchResponse.ok || !patchData?.ok) {
        throw new Error(patchData?.error ?? "Could not update task before resending.");
      }
      if (patchData.board) {
        setKanbanBoard(patchData.board);
        setKanbanStorage(patchData.storage ?? null);
      }

      const response = await fetch("/api/chat/agent-runtime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent,
          sharedVault,
          workingDirectory: appVersion?.appDir,
          wallet: walletsByAgent[agent.id] ?? createDefaultAgentWallet(agent.id),
          honeyLedgerEnabled,
          messages: [{ role: "user", content: prompt }],
        }),
        signal: controller.signal,
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
            honey?: unknown;
            session?: { id?: string; startedAt?: number; updatedAt?: number; messageCount?: number };
          };
          if (parsed.error) throw new Error(parsed.error);
          if (parsed.honey) {
            await refreshHoneyLedger();
            continue;
          }
          if (parsed.session?.id) {
            sawAgentSession = true;
            await patchKanbanTask(selectedKanbanTask.id, {
              agentSession: {
                agentId: agent.id,
                agentName: agent.name,
                telemetryUrl: agent.telemetryUrl,
                sessionId: parsed.session.id,
                startedAt: parsed.session.startedAt ?? Date.now(),
                updatedAt: parsed.session.updatedAt ?? Date.now(),
                lastMessageCount: parsed.session.messageCount ?? 0,
              },
              result: `${agent.name} accepted the edited task. Waiting for agent update.`,
            });
            continue;
          }
          const chunk = parsed.choices?.[0]?.delta?.content;
          if (!chunk) continue;
          fullText += chunk;
          setMessagesByAgent((current) => {
            const existing = current[agent.id] ?? [];
            const next = [...existing];
            const last = next[next.length - 1] ?? { role: "assistant" as const, content: "", kanbanTaskId: selectedKanbanTask.id };
            if (next.length === 0) next.push(last);
            next[next.length - 1] = { ...last, content: fullText, kanbanTaskId: selectedKanbanTask.id };
            return { ...current, [agent.id]: next };
          });
          updateTask(localTaskId, { lastMessage: fullText });
        }
      }

      if (fullText.trim()) {
        updateTask(localTaskId, { status: "completed", lastMessage: fullText.trim(), completedAt: Date.now() });
        await patchKanbanTask(selectedKanbanTask.id, { status: "done", result: fullText.trim() });
        await addKanbanSystemComment(selectedKanbanTask.id, `Edited task and interrupted ${agent.name}; the agent completed the revised work.`);
      } else if (sawAgentSession) {
        updateTask(localTaskId, { status: "active", lastMessage: `${agent.name} accepted the edited task. Waiting for agent update.` });
        await patchKanbanTask(selectedKanbanTask.id, {
          status: "working",
          result: `${agent.name} accepted the edited task. Waiting for agent update.`,
        });
        await addKanbanSystemComment(selectedKanbanTask.id, `Edited task and interrupted ${agent.name}; waiting for the revised run to report back.`);
      } else {
        throw new Error(`${agent.name} returned no task output and no pollable session after the edit.`);
      }
      setKanbanTaskModal("");
    } catch (error) {
      if (controller.signal.aborted) {
        updateTask(localTaskId, { status: "completed", lastMessage: "Interrupted by a newer task instruction.", completedAt: Date.now() });
        return;
      }
      const message = error instanceof Error ? error.message : "Unknown runtime error";
      setKanbanError(message);
      updateTask(localTaskId, { status: "failed", lastMessage: message, completedAt: Date.now() });
      await addKanbanSystemComment(selectedKanbanTask.id, `Edit resend failed for ${agent.name}: ${message}`);
    } finally {
      setKanbanEditPendingTaskId("");
      kanbanReadyPickupInFlightRef.current.delete(selectedKanbanTask.id);
      if (kanbanRuntimeAbortRef.current.get(selectedKanbanTask.id) === controller) {
        kanbanRuntimeAbortRef.current.delete(selectedKanbanTask.id);
      }
      await refreshKanbanOnce().catch((error) => setKanbanError(error instanceof Error ? error.message : "Kanban refresh failed."));
    }
  }
  /* eslint-enable react-hooks/immutability, react-hooks/purity */

  function openKanbanTaskModal(task: KanbanTask, modal: "assign" | "chat" | "edit" | "events" | "notes") {
    setSelectedKanbanTaskId(task.id);
    if (modal === "edit") {
      setKanbanEditDraft({ title: task.title, body: task.body });
    }
    setKanbanTaskModal(modal);
  }

  /* eslint-disable react-hooks/refs */
  function kanbanTaskMenuItems(task: KanbanTask): CellMenuItem[] {
    const taskEvents = kanbanBoard?.events.filter((event) => !event.taskId || event.taskId === task.id).length ?? 0;
    const taskComments = kanbanBoard?.comments.filter((comment) => comment.taskId === task.id).length ?? 0;
    const moveTargets = KANBAN_COLUMNS
      .filter((column) => column.id !== "archived" || task.status === "archived")
      .map((column): CellMenuItem => ({
        key: `move-${column.id}`,
        label: column.title,
        onClick: () => void moveKanbanTask(task.id, column.id),
        disabled: task.status === column.id,
      }));
    return [
      {
        key: "move",
        label: "Move to",
        icon: <GitBranch aria-hidden="true" />,
        onClick: () => undefined,
        children: moveTargets,
      },
      ...(task.status === "done" || task.status === "needs-human" ? [{
        key: "undo",
        label: "Undo work",
        icon: <RotateCcw aria-hidden="true" />,
        onClick: () => void requestKanbanTaskUndo(task),
      } satisfies CellMenuItem] : []),
      {
        key: "assign",
        label: "Assign",
        icon: <Users aria-hidden="true" />,
        onClick: () => openKanbanTaskModal(task, "assign"),
      },
      {
        key: "chat",
        label: "Agent chat",
        icon: <MessageSquare aria-hidden="true" />,
        onClick: () => openKanbanTaskModal(task, "chat"),
      },
      {
        key: "edit",
        label: "Edit & interrupt",
        icon: <Pencil aria-hidden="true" />,
        onClick: () => openKanbanTaskModal(task, "edit"),
        disabled: !kanbanTaskAssigneeAgent(task, displayAgents),
      },
      {
        key: "notes",
        label: taskComments ? `Notes (${taskComments})` : "Add note",
        icon: <Pencil aria-hidden="true" />,
        onClick: () => openKanbanTaskModal(task, "notes"),
      },
      {
        key: "events",
        label: taskEvents ? `Events (${taskEvents})` : "Events",
        icon: <Eye aria-hidden="true" />,
        onClick: () => openKanbanTaskModal(task, "events"),
      },
      {
        key: "delete",
        label: "Delete task",
        icon: <Trash2 aria-hidden="true" />,
        onClick: () => void deleteKanbanTask(task),
        destructive: true,
      },
    ];
  }
  /* eslint-enable react-hooks/refs */

  async function orchestrateReadyKanbanTask(task: KanbanTask) {
    const undoRequested = Boolean(task.undoRequestedAt);
    const targetAgents = agentsForKanbanTask(task);
    const dispatchAgents = undoRequested
      ? [
        ...targetAgents.filter((agent) => agent.beeRole !== "queen"),
        ...targetAgents.filter((agent) => agent.beeRole === "queen"),
      ]
      : targetAgents;
    logClientTelemetry("kanban.ready.orchestrate.start", {
      taskId: task.id,
      status: task.status,
      displayAgentCount: displayAgents.length,
      eligibleAgentCount: dispatchAgents.length,
      targetMachine: task.targetMachine?.name ?? "Any machine",
      undoRequested,
    });
    if (dispatchAgents.length === 0) {
      logClientTelemetry("kanban.ready.orchestrate.no_agents", { taskId: task.id });
      if (task.targetMachine?.name) {
        await patchKanbanTask(task.id, {
          status: "needs-human",
          agentSession: null,
          result: `No reachable agent is available on ${task.targetMachine.name}. Choose another machine or set the task back to Any machine, then retry.`,
        });
      }
      await refreshKanbanOnce().catch((error) => setKanbanError(error instanceof Error ? error.message : "Kanban refresh failed."));
      return;
    }

    const excludedAgentIds = new Set<string>();

    while (excludedAgentIds.size < dispatchAgents.length) {
      // eslint-disable-next-line react-hooks/purity
      const now = Date.now();
      const eligibleAgents = dispatchAgents.filter((agent) => {
        const cooldownUntil = kanbanDispatchCooldownRef.current.get(agent.id) ?? 0;
        return !excludedAgentIds.has(agent.id)
          && cooldownUntil <= now;
      });
      const assignment = chooseBeeAssignment(task, eligibleAgents, { preferQueen: !undoRequested });
      if (assignment.mode === "pending") {
        logClientTelemetry("kanban.ready.orchestrate.pending", {
          taskId: task.id,
          excludedAgentCount: excludedAgentIds.size,
          eligibleAgentCount: eligibleAgents.length,
          undoRequested,
        });
        await refreshKanbanOnce().catch((error) => setKanbanError(error instanceof Error ? error.message : "Kanban refresh failed."));
        return;
      }

      const owner = assignment.worker ?? assignment.queen;
      if (!owner) return;
      const setupIssue = chatSetupIssue(owner);
      if (setupIssue) {
        logClientTelemetry("kanban.ready.owner.setup_blocked", {
          taskId: task.id,
          agentId: owner.id,
          agentName: owner.name,
          setupIssue,
        });
        excludedAgentIds.add(owner.id);
        await addKanbanSystemComment(task.id, `Ready for Queen, but ${owner.name} cannot receive delegated work yet: ${setupIssue}`);
        continue;
      }
      logClientTelemetry("kanban.ready.pickup_preview", {
        taskId: task.id,
        agentId: owner.id,
        agentName: owner.name,
        assignmentMode: assignment.mode,
        workerClass: assignment.workerClass,
      });
      setKanbanPickupPreviewByTask((current) => ({
        ...current,
        [task.id]: {
          icon: beeRoleIconPath(
            owner.beeRole === "queen" ? "queen" : "worker",
            owner.workerClass ?? assignment.workerClass ?? "general",
          ),
          label: assignment.mode === "queen" ? "Queen Bee picked this up" : `${beeWorkerClassLabel(assignment.workerClass)} bee picked this up`,
          assignee: owner.name,
        },
      }));
      await wait(KANBAN_PICKUP_PREVIEW_MS);
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
            agentSession: null,
            result: "",
          },
        }),
      });
      const data = await response.json().catch(() => null) as KanbanResponse | null;
      if (!response.ok || !data?.ok) {
        logClientTelemetry("kanban.ready.claim.failed", {
          taskId: task.id,
          agentId: owner.id,
          error: data?.error ?? `HTTP ${response.status}`,
        });
        setKanbanPickupPreviewByTask((current) => {
          const next = { ...current };
          delete next[task.id];
          return next;
        });
        setKanbanError(data?.error ?? "Queen Bee could not claim the task.");
        return;
      }
      logClientTelemetry("kanban.ready.claim.saved", {
        taskId: task.id,
        agentId: owner.id,
        returnedStatus: data.task?.status ?? null,
      });
      if (data.task?.status !== "working") {
        const returnedStatus = data.task?.status ?? "unknown";
        logClientTelemetry("kanban.ready.claim.rejected_status", {
          taskId: task.id,
          agentId: owner.id,
          returnedStatus,
          result: data.task?.result ?? null,
        });
        setKanbanPickupPreviewByTask((current) => {
          const next = { ...current };
          delete next[task.id];
          return next;
        });
        await refreshKanbanOnce().catch((error) => setKanbanError(error instanceof Error ? error.message : "Kanban refresh failed."));
        return;
      }
      setKanbanPickupPreviewByTask((current) => {
        const next = { ...current };
        delete next[task.id];
        return next;
      });
      await addKanbanSystemComment(
        task.id,
        [
          assignment.mode === "queen" && assignment.queen
            ? `Assigned to Queen Bee ${assignment.queen.name} for review and delegation.`
            : `Assigned to ${owner.name}.`,
          `Suggested work class: ${beeWorkerClassLabel(assignment.workerClass)}.`,
          assignment.reason,
        ].join(" "),
      );
      await refreshKanbanOnce().catch((error) => setKanbanError(error instanceof Error ? error.message : "Kanban refresh failed."));
      const dispatchResult = await dispatchKanbanTaskToAgent(task, owner, assignment, { leaveKanbanOpen: true });
      logClientTelemetry("kanban.ready.dispatch.result", {
        taskId: task.id,
        agentId: owner.id,
        ok: dispatchResult.ok,
        messageLength: dispatchResult.message?.length ?? 0,
      });
      if (dispatchResult.ok) return;
      excludedAgentIds.add(owner.id);
      await addKanbanSystemComment(task.id, `Queen Bee is retrying with another eligible agent because ${owner.name} failed: ${dispatchResult.message}`);
    }

    await patchKanbanTask(task.id, {
      status: "needs-human",
      agentSession: null,
      result: task.targetMachine?.name
        ? `Queen Bee could not find a reachable eligible agent on ${task.targetMachine.name} for this task.`
        : "Queen Bee could not find a reachable eligible agent for this task.",
    });
    logClientTelemetry("kanban.ready.orchestrate.exhausted", {
      taskId: task.id,
      excludedAgentCount: excludedAgentIds.size,
    });
    setKanbanPickupPreviewByTask((current) => {
      const next = { ...current };
      delete next[task.id];
      return next;
    });
    await addKanbanSystemComment(
      task.id,
      task.targetMachine?.name
        ? `Queen Bee could not find a reachable eligible agent on ${task.targetMachine.name} for this task.`
        : "Queen Bee could not find a reachable eligible agent for this task.",
    );
    await refreshKanbanOnce().catch((error) => setKanbanError(error instanceof Error ? error.message : "Kanban refresh failed."));
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

  async function requeueStaleKanbanTask(task: KanbanTask, mode: "auto" | "manual" = "manual") {
    const staleAgent = kanbanTaskAssigneeAgent(task, displayAgents)
      ?? displayAgents.find((agent) => agent.id === task.agentSession?.agentId || agent.name === task.agentSession?.agentName);
    if (staleAgent) {
      // eslint-disable-next-line react-hooks/purity
      kanbanDispatchCooldownRef.current.set(staleAgent.id, Date.now() + KANBAN_STALE_AGENT_COOLDOWN_MS);
    }
    kanbanReadyPickupAttemptRef.current.delete(task.id);
    kanbanReadyPickupAttemptRef.current.delete(`working:${kanbanReadyPickupSignature(task, displayAgents)}`);
    kanbanSessionPollRef.current.delete(task.id);
    const staleFor = formatDurationShort(kanbanStaleAge(task));
    await patchKanbanTask(task.id, {
      status: "ready",
      assignee: "",
      tenant: "",
      agentSession: null,
      result: `${mode === "auto" ? "Auto-requeued" : "Requeued"} after ${staleFor} without a worker update. Previous worker: ${task.assignee || task.agentSession?.agentName || "unknown"}.`,
    });
    await addKanbanSystemComment(
      task.id,
      `${mode === "auto" ? "Auto-requeued" : "Requeued"} stale Working task after ${staleFor} without a dashboard-visible worker update.`,
    );
  }

  /* eslint-disable react-hooks/immutability, react-hooks/purity */
  async function dispatchKanbanTaskToAgent(
    task: KanbanTask,
    agent: AgentProfile,
    assignment: ReturnType<typeof chooseBeeAssignment>,
    options: { leaveKanbanOpen?: boolean } = {},
  ): Promise<{ ok: true; message?: string } | { ok: false; message: string }> {
    const prompt = kanbanTaskDispatchPrompt(task, assignment);
    const localTaskId = `kanban-${task.id}-${Date.now()}`;
    let fullText = "";
    let sawAgentSession = false;
    const workspaceBefore = await readWorkspaceGitSnapshot();
    let lastAgentSession: NonNullable<KanbanTask["agentSession"]> | null = null;
    logClientTelemetry("kanban.dispatch.start", {
      taskId: task.id,
      agentId: agent.id,
      agentName: agent.name,
      assignmentMode: assignment.mode,
      workerClass: assignment.workerClass,
      promptLength: prompt.length,
    });
    kanbanRuntimeAbortRef.current.get(task.id)?.abort();
    const controller = new AbortController();
    let noProgressTimedOut = false;
    const noProgressTimer = window.setTimeout(() => {
      if (fullText.trim() || sawAgentSession) return;
      noProgressTimedOut = true;
      controller.abort();
    }, KANBAN_DISPATCH_NO_PROGRESS_MS);
    kanbanRuntimeAbortRef.current.set(task.id, controller);

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
    appendMessage(agent.id, { role: "user", content: prompt, kanbanTaskId: task.id, surface: "kanban" });
    appendMessage(agent.id, { role: "assistant", content: "", kanbanTaskId: task.id, surface: "kanban" });

    try {
      const response = await fetch("/api/chat/agent-runtime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent,
          sharedVault,
          workingDirectory: appVersion?.appDir,
          wallet: walletsByAgent[agent.id] ?? createDefaultAgentWallet(agent.id),
          honeyLedgerEnabled,
          messages: [{ role: "user", content: prompt }],
        }),
        signal: controller.signal,
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
            honey?: unknown;
            session?: { id?: string; startedAt?: number; updatedAt?: number; messageCount?: number };
          };
          if (parsed.error) throw new Error(parsed.error);
          if (parsed.honey) {
            await refreshHoneyLedger();
            continue;
          }
          if (parsed.session?.id) {
            sawAgentSession = true;
            window.clearTimeout(noProgressTimer);
            lastAgentSession = {
              agentId: agent.id,
              agentName: agent.name,
              telemetryUrl: agent.telemetryUrl,
              sessionId: parsed.session.id,
              startedAt: parsed.session.startedAt ?? Date.now(),
              updatedAt: parsed.session.updatedAt ?? Date.now(),
              lastMessageCount: parsed.session.messageCount ?? 0,
            };
            logClientTelemetry("kanban.dispatch.session", {
              taskId: task.id,
              agentId: agent.id,
              sessionId: parsed.session.id,
              messageCount: parsed.session.messageCount ?? 0,
            });
            await patchKanbanTask(task.id, {
              agentSession: lastAgentSession,
              result: `${agent.name} accepted the task. Waiting for agent update.`,
            });
            continue;
          }
          const chunk = parsed.choices?.[0]?.delta?.content;
          if (!chunk) continue;
          fullText += chunk;
          window.clearTimeout(noProgressTimer);
          setMessagesByAgent((current) => {
            const existing = current[agent.id] ?? [];
            const next = [...existing];
            const last = next[next.length - 1] ?? { role: "assistant" as const, content: "", kanbanTaskId: task.id };
            if (next.length === 0) next.push(last);
            next[next.length - 1] = { ...last, content: fullText, kanbanTaskId: task.id };
            return { ...current, [agent.id]: next };
          });
          updateTask(localTaskId, { lastMessage: fullText });
        }
      }

      if (!fullText.trim() && sawAgentSession) {
        if (lastAgentSession) {
          const finalSessionResponse = await fetch("/api/chat/agent-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ agent, sessionId: lastAgentSession.sessionId }),
          }).catch(() => null);
          const finalSessionData = await finalSessionResponse?.json().catch(() => null) as AgentSessionResponse | null;
          const finalMessages = finalSessionData?.session?.messages?.filter((message) => (
            message.content.trim()
            && !isInternalHermesSessionPrelude(message.content)
          )) ?? [];
          const finalAssistant = [...finalMessages].reverse().find((message) => (
            message.role === "assistant"
            && message.content.trim()
          ));
          const finalRaw = [...finalMessages].reverse().find((message) => message.content.trim());
          if (finalAssistant) {
            const result = finalAssistant.content.trim();
            logClientTelemetry("kanban.dispatch.completed_from_session", {
              taskId: task.id,
              agentId: agent.id,
              sessionId: lastAgentSession.sessionId,
              resultLength: result.length,
            });
            updateTask(localTaskId, { status: "completed", lastMessage: result, completedAt: Date.now() });
            await patchKanbanTask(task.id, { status: "done", agentSession: null, result });
            await addKanbanSystemComment(task.id, `${agent.name} completed the delegated work from the Work board.`);
            return { ok: true, message: result };
          }
          if (finalRaw) {
            const message = kanbanNoAssistantStalledDetail(agent.name, finalMessages.length, finalRaw.role, finalRaw.content);
            logClientTelemetry("kanban.dispatch.no_final_assistant", {
              taskId: task.id,
              agentId: agent.id,
              sessionId: lastAgentSession.sessionId,
              latestCount: finalMessages.length,
              latestRole: finalRaw.role,
              latestContentLength: finalRaw.content.length,
              latestToolSummary: finalRaw.role === "tool" ? summarizeKanbanToolOutput(finalRaw.content) : "",
            });
            updateTask(localTaskId, { status: "failed", lastMessage: message, completedAt: Date.now() });
            await patchKanbanTask(task.id, {
              status: "needs-human",
              agentSession: null,
              result: message,
            });
            await addKanbanSystemComment(task.id, message);
            return { ok: true, message };
          }
        }
        const message = `${agent.name} accepted the delegated work. Waiting for agent update.`;
        logClientTelemetry("kanban.dispatch.awaiting_agent_update", {
          taskId: task.id,
          agentId: agent.id,
          sawAgentSession,
        });
        updateTask(localTaskId, { status: "active", lastMessage: message });
        await patchKanbanTask(task.id, {
          status: "working",
          assignee: agent.name,
          tenant: assignment.mode === "queen" ? "queen-bee" : `${assignment.workerClass}-worker`,
          result: message,
        });
        return { ok: true, message };
      }

      if (!fullText.trim()) {
        const workspaceAfter = await readWorkspaceGitSnapshot();
        const workspaceSummary = kanbanWorkspaceChangeSummary(workspaceBefore, workspaceAfter);
        if (workspaceSummary) {
          logClientTelemetry("kanban.dispatch.completed_from_workspace", {
            taskId: task.id,
            agentId: agent.id,
            changedFiles: workspaceAfter?.statusLines.length ?? 0,
          });
          updateTask(localTaskId, { status: "completed", lastMessage: workspaceSummary, completedAt: Date.now() });
          await patchKanbanTask(task.id, { status: "done", agentSession: null, result: workspaceSummary });
          await addKanbanSystemComment(task.id, `${agent.name} completed delegated work with workspace changes.`);
          return { ok: true, message: workspaceSummary };
        }
        logClientTelemetry("kanban.dispatch.empty_without_session", {
          taskId: task.id,
          agentId: agent.id,
          sawAgentSession,
        });
        throw new Error(`${agent.name} returned no task output and no pollable session. Check the agent runtime/auth before retrying.`);
      }

      const result = fullText.trim() || `${agent.name} accepted the delegated work.`;
      logClientTelemetry("kanban.dispatch.completed", {
        taskId: task.id,
        agentId: agent.id,
        resultLength: result.length,
      });
      updateTask(localTaskId, { status: "completed", lastMessage: result, completedAt: Date.now() });
      await patchKanbanTask(task.id, { status: "done", result });
      await addKanbanSystemComment(task.id, `${agent.name} completed the delegated work from the Work board.`);
      return { ok: true, message: result };
    } catch (error) {
      if (controller.signal.aborted) {
        if (noProgressTimedOut) {
          const workspaceAfter = await readWorkspaceGitSnapshot();
          const workspaceSummary = kanbanWorkspaceChangeSummary(workspaceBefore, workspaceAfter);
          if (workspaceSummary) {
            logClientTelemetry("kanban.dispatch.no_progress_workspace_completed", {
              taskId: task.id,
              agentId: agent.id,
              timeoutMs: KANBAN_DISPATCH_NO_PROGRESS_MS,
              changedFiles: workspaceAfter?.statusLines.length ?? 0,
            });
            updateTask(localTaskId, { status: "completed", lastMessage: workspaceSummary, completedAt: Date.now() });
            await patchKanbanTask(task.id, { status: "done", agentSession: null, result: workspaceSummary });
            await addKanbanSystemComment(task.id, `${agent.name} completed delegated work with workspace changes.`);
            return { ok: true, message: workspaceSummary };
          }
          const message = `${agent.name} accepted the runtime connection, but did not produce output or attach a fresh pollable session within ${Math.round(KANBAN_DISPATCH_NO_PROGRESS_MS / 1000)}s. Check the agent runtime session, then move this card back to Ready for Queen.`;
          logClientTelemetry("kanban.dispatch.no_progress_timeout", {
            taskId: task.id,
            agentId: agent.id,
            timeoutMs: KANBAN_DISPATCH_NO_PROGRESS_MS,
          });
          updateTask(localTaskId, { status: "failed", lastMessage: message, completedAt: Date.now() });
          await patchKanbanTask(task.id, {
            status: "needs-human",
            agentSession: null,
            result: message,
          });
          await addKanbanSystemComment(task.id, message);
          return { ok: true, message };
        }
        updateTask(localTaskId, { status: "completed", lastMessage: "Interrupted by a newer task instruction.", completedAt: Date.now() });
        return { ok: true, message: "Interrupted by a newer task instruction." };
      }
      const message = error instanceof Error ? error.message : "Unknown runtime error";
      kanbanDispatchCooldownRef.current.set(agent.id, Date.now() + 10 * 60 * 1000);
      const transientDelegation = isTransientDelegationMessage(message);
      logClientTelemetry("kanban.dispatch.error", {
        taskId: task.id,
        agentId: agent.id,
        transientDelegation,
        message,
      });
      if (isHermesAuthFailure(message)) {
        await raiseHermesAuthAlert(agent, task, message).catch(() => undefined);
      }
      setMessagesByAgent((current) => {
        const existing = current[agent.id] ?? [];
        const next = [...existing];
        const last = next[next.length - 1] ?? { role: "assistant" as const, content: "", kanbanTaskId: task.id };
        if (next.length === 0) next.push(last);
        next[next.length - 1] = { ...last, content: transientDelegation ? `Waiting for update: ${message}` : `Error: ${message}`, kanbanTaskId: task.id };
        return { ...current, [agent.id]: next };
      });
      updateTask(localTaskId, {
        status: transientDelegation ? "active" : "failed",
        lastMessage: message,
        ...(transientDelegation ? {} : { completedAt: Date.now() }),
      });
      if (transientDelegation) {
        if (!isKanbanAwaitingAgentUpdate(task)) {
          const waitingMessage = `${agent.name} accepted the runtime connection and may still be working. Waiting for telemetry or agent output after the dashboard timeout.`;
          await patchKanbanTask(task.id, {
            status: "working",
            assignee: agent.name,
            tenant: assignment.mode === "queen" ? "queen-bee" : `${assignment.workerClass}-worker`,
            result: waitingMessage,
          });
        }
        return { ok: true, message };
      }
      if (!options.leaveKanbanOpen) {
        await patchKanbanTask(task.id, { status: "needs-human", agentSession: null, result: `Delegation failed for ${agent.name}: ${message}` });
      }
      await addKanbanSystemComment(task.id, `Delegation failed for ${agent.name}: ${message}`);
      if (task.targetMachine?.key) {
        await patchKanbanTask(task.id, {
          status: "needs-human",
          agentSession: null,
          result: `Delegation failed for ${agent.name} on ${task.targetMachine.name}: ${message}`,
        });
        return { ok: true, message };
      }
      return { ok: false, message };
    } finally {
      window.clearTimeout(noProgressTimer);
      if (kanbanRuntimeAbortRef.current.get(task.id) === controller) {
        kanbanRuntimeAbortRef.current.delete(task.id);
      }
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

    const retryableWorkingTasks = kanbanBoard.tasks.filter((task) => (
      task.status === "working"
      && task.assignee?.trim()
      && !isKanbanAwaitingAgentUpdate(task)
    ));
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

  async function refreshKanbanAgentSession(task: KanbanTask) {
    const session = task.agentSession;
    if (!session?.sessionId) return;
    const agent = displayAgents.find((item) => item.id === session.agentId || item.name === session.agentName || item.telemetryUrl === session.telemetryUrl);
    if (!agent?.telemetryUrl) {
      logClientTelemetry("kanban.session.poll.skipped", {
        taskId: task.id,
        sessionId: session.sessionId,
        reason: "missing agent telemetry URL",
      });
      return;
    }
    logClientTelemetry("kanban.session.poll.start", {
      taskId: task.id,
      agentId: agent.id,
      sessionId: session.sessionId,
      lastMessageCount: session.lastMessageCount ?? 0,
    });
    const response = await fetch("/api/chat/agent-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agent, sessionId: session.sessionId }),
    }).catch(() => null);
    const data = await response?.json().catch(() => null) as AgentSessionResponse | null;
    if (!response?.ok || !data?.ok || !data.session?.messages) {
      const failureKey = `${task.id}:${session.sessionId}`;
      const failureCount = (kanbanSessionPollFailureRef.current.get(failureKey) ?? 0) + 1;
      kanbanSessionPollFailureRef.current.set(failureKey, failureCount);
      const errorMessage = data?.error ?? (response ? `HTTP ${response.status}` : "request failed");
      logClientTelemetry("kanban.session.poll.failed", {
        taskId: task.id,
        agentId: agent.id,
        sessionId: session.sessionId,
        failureCount,
        error: errorMessage,
      });
      if (task.status === "working" && failureCount >= KANBAN_SESSION_POLL_FAILURE_LIMIT) {
        const message = `${agent.name} accepted the task, but the dashboard could not refresh the agent session after ${failureCount} attempts. Last poll error: ${errorMessage}. Check the agent runtime session or move the card back to Ready for Queen to retry.`;
        logClientTelemetry("kanban.session.poll_failure_stalled", {
          taskId: task.id,
          agentId: agent.id,
          sessionId: session.sessionId,
          failureCount,
          error: errorMessage,
        });
        await patchKanbanTask(task.id, {
          status: "needs-human",
          agentSession: null,
          result: message,
        });
        await addKanbanSystemComment(task.id, message);
      }
      return;
    }
    kanbanSessionPollFailureRef.current.delete(`${task.id}:${session.sessionId}`);

    const rawMessages = data.session.messages.filter((message) => (
      message.content.trim()
      && !isInternalHermesSessionPrelude(message.content)
    ));
    const messages = rawMessages
      .filter((message) => message.role === "user" || message.role === "assistant" || message.role === "tool")
      .map((message): ChatMessage => ({
        role: message.role === "user" ? "user" : "assistant",
        content: message.role === "tool"
          ? [
            "Tool output:",
            summarizeKanbanToolOutput(message.content) || compactDiagnosticPreview(message.content, 800),
          ].filter(Boolean).join("\n")
          : message.content,
        createdAt: message.createdAt ?? data.session?.updatedAt ?? Date.now(),
        kanbanTaskId: task.id,
        sourceSessionId: session.sessionId,
        sourceIndex: message.index,
      }));

    if (messages.length > 0) {
      setMessagesByAgent((current) => {
        const existing = current[agent.id] ?? [];
        const seen = new Set(existing.map((message) => (
          message.sourceSessionId && message.sourceIndex !== undefined
            ? `${message.sourceSessionId}:${message.sourceIndex}`
            : ""
        )).filter(Boolean));
        const additions = messages.filter((message) => !seen.has(`${message.sourceSessionId}:${message.sourceIndex}`));
        if (additions.length === 0) return current;
        return { ...current, [agent.id]: [...existing, ...additions] };
      });
    }

    const latestAssistant = [...rawMessages].reverse().find((message) => (
      message.role === "assistant"
      && message.content.trim()
      && !isInternalHermesSessionPrelude(message.content)
    ));
    const latestRaw = [...rawMessages].reverse().find((message) => message.content.trim());
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    const sessionUpdatedAt = data.session.updatedAt ?? latestRaw?.createdAt ?? now;
    const latestCount = data.session.messageCount ?? rawMessages.length;
    const sessionAgeMs = now - (session.startedAt ?? task.updatedAt);
    const sessionQuietMs = now - sessionUpdatedAt;
    const toolOutputStalled = task.status === "working"
      && latestRaw?.role === "tool"
      && sessionQuietMs >= KANBAN_TOOL_OUTPUT_STALL_MS;
    const noAssistantStalled = task.status === "working"
      && latestCount > 1
      && !latestAssistant
      && latestRaw?.role !== "tool"
      && sessionAgeMs >= KANBAN_NO_ASSISTANT_STALL_MS
      && sessionQuietMs >= KANBAN_NO_ASSISTANT_QUIET_MS;
    if (toolOutputStalled) {
      const message = kanbanToolOutputStalledDetail(agent.name, latestRaw?.content ?? "");
      logClientTelemetry("kanban.session.tool_output_stalled", {
        taskId: task.id,
        agentId: agent.id,
        sessionId: session.sessionId,
        latestCount,
        latestRole: latestRaw?.role ?? null,
        toolOutputLength: latestRaw?.content.length ?? 0,
      });
      setMessagesByAgent((current) => ({
        ...current,
        [agent.id]: [
          ...(current[agent.id] ?? []),
          {
            role: "assistant",
            content: `Needs human: ${message}`,
            createdAt: now,
            kanbanTaskId: task.id,
            sourceSessionId: session.sessionId,
            sourceIndex: latestRaw?.index,
          },
        ],
      }));
      await patchKanbanTask(task.id, {
        status: "needs-human",
        agentSession: null,
        result: message,
      });
      await addKanbanSystemComment(task.id, message);
      return;
    }
    if (noAssistantStalled) {
      const message = kanbanNoAssistantStalledDetail(agent.name, latestCount, latestRaw?.role ?? null, latestRaw?.content ?? "");
      const latestToolSummary = latestRaw?.role === "tool" ? summarizeKanbanToolOutput(latestRaw.content) : "";
      logClientTelemetry("kanban.session.no_assistant_stalled", {
        taskId: task.id,
        agentId: agent.id,
        sessionId: session.sessionId,
        latestCount,
        latestRole: latestRaw?.role ?? null,
        latestContentLength: latestRaw?.content.length ?? 0,
        latestToolSummary,
        startedAt: session.startedAt ?? null,
        sessionUpdatedAt,
        sessionAgeMs,
        sessionQuietMs,
      });
      setMessagesByAgent((current) => ({
        ...current,
        [agent.id]: [
          ...(current[agent.id] ?? []),
          {
            role: "assistant",
            content: `Needs human: ${message}`,
            createdAt: now,
            kanbanTaskId: task.id,
            sourceSessionId: session.sessionId,
            sourceIndex: latestRaw?.index,
          },
        ],
      }));
      await patchKanbanTask(task.id, {
        status: "needs-human",
        agentSession: null,
        result: message,
      });
      await addKanbanSystemComment(task.id, message);
      return;
    }
    if (latestCount !== task.agentSession?.lastMessageCount) {
      logClientTelemetry("kanban.session.poll.updated", {
        taskId: task.id,
        agentId: agent.id,
        sessionId: session.sessionId,
        previousCount: task.agentSession?.lastMessageCount ?? 0,
        latestCount,
        latestAssistantLength: latestAssistant?.content.length ?? 0,
      });
      await patchKanbanTask(task.id, {
        agentSession: {
          ...session,
          updatedAt: sessionUpdatedAt,
          lastMessageCount: latestCount,
        },
        ...(latestAssistant
          ? { result: latestAssistant.content.slice(0, 4000) }
          : latestRaw?.role === "tool"
            ? { result: `${agent.name} is still working.\n\n${summarizeKanbanToolOutput(latestRaw.content)}`.slice(0, 4000) }
            : {}),
      });
    }
  }

  useEffect(() => {
    if (!hydrated || selectedKanbanTask?.status !== "working" || !selectedKanbanTask.agentSession?.sessionId) return;
    const lastPoll = kanbanSessionPollRef.current.get(selectedKanbanTask.id) ?? 0;
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    if (now - lastPoll < 4_000) return;
    kanbanSessionPollRef.current.set(selectedKanbanTask.id, now);
    void refreshKanbanAgentSession(selectedKanbanTask);
    // `refreshKanbanAgentSession` intentionally stays out of this dependency list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayAgents, hydrated, selectedKanbanTask]);

  useEffect(() => {
    if (!hydrated || !kanbanBoard) return;
    const pollable = kanbanBoard.tasks.filter((task) => (
      task.status === "working"
      && task.agentSession?.sessionId
    ));
    if (pollable.length === 0) return;
    const poll = () => {
      pollable.forEach((task) => {
        const lastPoll = kanbanSessionPollRef.current.get(task.id) ?? 0;
        if (Date.now() - lastPoll < 4_000) return;
        kanbanSessionPollRef.current.set(task.id, Date.now());
        void refreshKanbanAgentSession(task);
      });
    };
    poll();
    const timer = window.setInterval(poll, 6_000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayAgents, hydrated, kanbanBoard]);

  useEffect(() => {
    if (!hydrated || !kanbanBoard) return;
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    const staleTasks = kanbanBoard.tasks.filter((task) => isKanbanStaleWorkingTask(task, now));
    for (const task of staleTasks) {
      const signature = `${task.id}:${task.agentSession?.sessionId ?? ""}:${task.agentSession?.lastMessageCount ?? ""}:${task.updatedAt}`;
      if (kanbanStaleRequeueAttemptRef.current.has(signature)) continue;
      kanbanStaleRequeueAttemptRef.current.add(signature);
      void requeueStaleKanbanTask(task, "auto");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayAgents, hydrated, kanbanBoard]);

  async function steerSelectedKanbanTask(event: FormEvent) {
    event.preventDefault();
    const prompt = kanbanSteerDraft.trim();
    const outgoingAttachments = kanbanSteerAttachments;
    const outgoingDirectories = kanbanSteerDirectories;
    const outgoingLabel = prompt
      || attachmentSummary(outgoingAttachments)
      || (outgoingDirectories.length ? `Linked ${outgoingDirectories.length} director${outgoingDirectories.length === 1 ? "y" : "ies"}` : "");
    if (!selectedKanbanTask || !selectedKanbanAgent || !outgoingLabel || kanbanSteeringTaskId) return;
    const setupIssue = chatSetupIssue(selectedKanbanAgent);
    if (setupIssue) {
      await addKanbanSystemComment(selectedKanbanTask.id, `Could not steer ${selectedKanbanAgent.name}: ${setupIssue}`);
      return;
    }

    const localTaskId = `kanban-steer-${selectedKanbanTask.id}-${Date.now()}`;
    const targetColumn = KANBAN_COLUMNS.find((column) => column.id === kanbanSteerTargetStatus);
    const directorySummary = outgoingDirectories.length
      ? `Linked directories:\n${outgoingDirectories.map((directory) => `- ${directory.name}`).join("\n")}`
      : "";
    const attachmentTextSummary = outgoingAttachments.length
      ? `Attachments:\n${outgoingAttachments.map((attachment) => `- ${attachment.kind}: ${attachment.name} (${attachment.mimeType || "unknown"}, ${attachmentSizeLabel(attachment.size)})`).join("\n")}`
      : "";
    const steerPrompt = [
      `Steering note for Kanban task "${selectedKanbanTask.title}":`,
      prompt || outgoingLabel,
      attachmentTextSummary,
      directorySummary,
      targetColumn ? `After considering this message, keep or move the card to: ${targetColumn.title}.` : "",
      selectedKanbanTask.result ? `Current task notes:\n${selectedKanbanTask.result}` : "",
      kanbanSteerTargetStatus === "ideas"
        ? "Planning mode: reply with guidance or a concise response, but do not continue execution unless asked later."
        : "Use this guidance for the active work. Reply with a concise update, blocker, or result.",
    ].filter(Boolean).join("\n\n");

    setKanbanSteerDraft("");
    setKanbanSteerAttachments([]);
    setKanbanSteerDirectories([]);
    setKanbanSteerAttachmentError("");
    setKanbanSteerAttachmentMenuOpen(false);
    setKanbanSteeringTaskId(selectedKanbanTask.id);
    upsertTask({
      id: localTaskId,
      agentId: selectedKanbanAgent.id,
      title: `Steer: ${selectedKanbanTask.title}`,
      lastMessage: outgoingLabel,
      status: "active",
      startedAt: Date.now(),
      updatedAt: Date.now(),
      source: "kanban",
    });
    appendMessage(selectedKanbanAgent.id, { role: "user", content: outgoingLabel, attachments: outgoingAttachments, kanbanTaskId: selectedKanbanTask.id, surface: "kanban" });
    appendMessage(selectedKanbanAgent.id, { role: "assistant", content: "", kanbanTaskId: selectedKanbanTask.id, surface: "kanban" });

    try {
      if (selectedKanbanTask.status !== kanbanSteerTargetStatus) {
        await patchKanbanTask(selectedKanbanTask.id, { status: kanbanSteerTargetStatus });
      }
      const contextMessages = (messagesByAgent[selectedKanbanAgent.id] ?? [])
        .filter((message) => message.role !== "system" && (message.content.trim() || message.attachments?.length))
        .slice(-6)
        .map((message) => ({ role: message.role, content: messageContentParts(message.content, message.attachments ?? []) }));
      const response = await fetch("/api/chat/agent-runtime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent: selectedKanbanAgent,
          sharedVault,
          workingDirectory: appVersion?.appDir,
          wallet: walletsByAgent[selectedKanbanAgent.id] ?? createDefaultAgentWallet(selectedKanbanAgent.id),
          honeyLedgerEnabled,
          messages: [...contextMessages, { role: "user", content: messageContentParts(steerPrompt, outgoingAttachments) }],
        }),
      });
      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({}));
        throw new Error(typeof data.error === "string" ? data.error : `Request failed with ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";
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
            honey?: unknown;
            session?: { id?: string; startedAt?: number; updatedAt?: number; messageCount?: number };
          };
          if (parsed.error) throw new Error(parsed.error);
          if (parsed.honey) {
            await refreshHoneyLedger();
            continue;
          }
          if (parsed.session?.id) {
            await patchKanbanTask(selectedKanbanTask.id, {
              agentSession: {
                agentId: selectedKanbanAgent.id,
                agentName: selectedKanbanAgent.name,
                telemetryUrl: selectedKanbanAgent.telemetryUrl,
                sessionId: parsed.session.id,
                startedAt: parsed.session.startedAt ?? Date.now(),
                updatedAt: parsed.session.updatedAt ?? Date.now(),
                lastMessageCount: parsed.session.messageCount ?? 0,
              },
            });
            continue;
          }
          const chunk = parsed.choices?.[0]?.delta?.content;
          if (!chunk) continue;
          fullText += chunk;
          setMessagesByAgent((current) => {
            const existing = current[selectedKanbanAgent.id] ?? [];
            const next = [...existing];
            const last = next[next.length - 1] ?? { role: "assistant" as const, content: "", createdAt: Date.now(), kanbanTaskId: selectedKanbanTask.id };
            if (next.length === 0) next.push(last);
            next[next.length - 1] = { ...last, content: fullText, createdAt: last.createdAt ?? Date.now(), kanbanTaskId: selectedKanbanTask.id };
            return { ...current, [selectedKanbanAgent.id]: next };
          });
          updateTask(localTaskId, { lastMessage: fullText });
        }
      }
      const result = fullText.trim() || `${selectedKanbanAgent.name} received the steering note.`;
      updateTask(localTaskId, { status: "completed", lastMessage: result, completedAt: Date.now() });
      await addKanbanSystemComment(selectedKanbanTask.id, `Steered ${selectedKanbanAgent.name}: ${outgoingLabel}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown runtime error";
      setMessagesByAgent((current) => {
        const existing = current[selectedKanbanAgent.id] ?? [];
        const next = [...existing];
        const last = next[next.length - 1] ?? { role: "assistant" as const, content: "", createdAt: Date.now(), kanbanTaskId: selectedKanbanTask.id };
        if (next.length === 0) next.push(last);
        next[next.length - 1] = { ...last, content: `Error: ${message}`, createdAt: last.createdAt ?? Date.now(), kanbanTaskId: selectedKanbanTask.id };
        return { ...current, [selectedKanbanAgent.id]: next };
      });
      updateTask(localTaskId, { status: "failed", lastMessage: message, completedAt: Date.now() });
      await addKanbanSystemComment(selectedKanbanTask.id, `Steer failed for ${selectedKanbanAgent.name}: ${message}`);
    } finally {
      setKanbanSteeringTaskId("");
    }
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

  const pairSyncthingCollector = useCallback(async (target: {
    remoteCollectorUrl: string;
    remoteName?: string;
    remotePath?: string;
    remoteTailscaleIp?: string;
    remoteAddressHost?: string;
  }) => {
    const localTailscaleIp = tailscaleDevices.find((device) => device.self)?.ip;
    const response = await fetch("/api/syncthing/pair", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        localPath: sharedVault.vaultPath.trim() || undefined,
        remotePath: target.remotePath?.trim() || undefined,
        remoteCollectorUrl: target.remoteCollectorUrl,
        remoteName: target.remoteName,
        localTailscaleIp,
        remoteTailscaleIp: target.remoteTailscaleIp,
        remoteAddressHost: target.remoteAddressHost,
        folderId: "hivemindos-vault",
        label: "hivemindos-vault",
      }),
    }).catch(() => null);
    return response?.json().catch(() => null) as Promise<VaultSyncStatus | null>;
  }, [sharedVault.vaultPath, tailscaleDevices]);

  const pairSyncthingVaultSync = useCallback(async () => {
    const remoteHost = sharedVault.tailnetSyncHost.trim();
    const remotePath = sharedVault.tailnetSyncPath.trim();
    if (!remoteHost) {
      setVaultSyncStatus({ ok: false, method: "syncthing", error: "Choose a Tailnet machine first. The remote folder can be left blank for the collector default." });
      return;
    }
    setVaultSyncPending("syncthing");
    setVaultSyncStatus(null);
    const cleanHost = remoteHost.replace(/^.+@/, "").replace(/\.$/, "");
    const hostKey = cleanHost.toLowerCase();
    const remoteDevice = tailscaleDevices.find((device) => (
      device.ip === cleanHost
      || device.name.toLowerCase() === hostKey
      || device.dnsName.toLowerCase().replace(/\.$/, "") === hostKey
      || device.collectorUrl.toLowerCase().includes(hostKey)
    ));
    const data = await pairSyncthingCollector({
      remoteCollectorUrl: /^https?:\/\//.test(cleanHost) ? cleanHost : `http://${cleanHost}:8787`,
      remoteName: cleanHost,
      remotePath,
      remoteTailscaleIp: remoteDevice?.ip || (cleanHost.startsWith("100.") ? cleanHost : undefined),
      remoteAddressHost: /^https?:\/\//.test(cleanHost) ? undefined : cleanHost,
    }).catch(() => null);
    setVaultSyncPending("");
    setVaultSyncStatus(data?.ok
      ? { ...data, method: "syncthing", message: `Syncthing paired ${data.folderId ?? "vault"} for realtime sync.` }
      : { ok: false, method: "syncthing", error: data?.error ?? "Syncthing pairing failed." });
  }, [
    pairSyncthingCollector,
    sharedVault.tailnetSyncHost,
    sharedVault.tailnetSyncPath,
    tailscaleDevices,
  ]);

  useEffect(() => {
    if (!hydrated || !sharedVault.enabled || !sharedVault.tailnetSyncEnabled || !sharedVault.vaultPath.trim()) return;
    const candidates = discoveredMachines.filter((machine) => (
      machine.collector === "ready"
      && machine.device.online
      && !machine.device.self
      && Boolean(machine.device.collectorUrl)
      && machine.capabilities?.syncthing === true
    ));
    candidates.forEach((machine) => {
      const key = collectorKey(machine.device.collectorUrl);
      if (!key || syncthingAutoPairRef.current.has(key)) return;
      syncthingAutoPairRef.current.add(key);
      void pairSyncthingCollector({
        remoteCollectorUrl: machine.device.collectorUrl,
        remoteName: machine.device.name,
        remoteTailscaleIp: machine.device.ip,
        remoteAddressHost: machine.device.ip || machine.device.dnsName,
        remotePath: sharedVault.tailnetSyncPath,
      }).then((data) => {
        if (!data?.ok) {
          syncthingAutoPairRef.current.delete(key);
          setVaultSyncStatus({ ok: false, method: "syncthing", error: data?.error ?? `Auto-pair failed for ${machine.device.name}.` });
          return;
        }
        setVaultSyncStatus({
          ...data,
          method: "syncthing",
          message: `Realtime sync auto-paired with ${machine.device.name}.`,
        });
      }).catch((error) => {
        syncthingAutoPairRef.current.delete(key);
        setVaultSyncStatus({
          ok: false,
          method: "syncthing",
          error: error instanceof Error ? error.message : `Auto-pair failed for ${machine.device.name}.`,
        });
      });
    });
  }, [
    discoveredMachines,
    hydrated,
    pairSyncthingCollector,
    sharedVault.enabled,
    sharedVault.tailnetSyncEnabled,
    sharedVault.tailnetSyncPath,
    sharedVault.vaultPath,
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
    try {
      const next = await readComposerFiles(files, kind);
      setChatAttachments((current) => [...current, ...next]);
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

  async function addQuickAddFiles(status: KanbanStatus, files: FileList | File[], kind: "image" | "file") {
    try {
      const next = await readComposerFiles(files, kind);
      setQuickAddAttachments((current) => ({
        ...current,
        [status]: [...(current[status] ?? []), ...next],
      }));
      setQuickAddAttachmentError("");
      setQuickAddAttachmentMenuOpen(false);
    } catch (error) {
      setQuickAddAttachmentError(error instanceof Error ? error.message : "Could not attach that file.");
    }
  }

  function handleQuickAddFileChange(status: KanbanStatus, event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files?.length) void addQuickAddFiles(status, event.target.files, "file");
    event.target.value = "";
  }

  function handleQuickAddImageChange(status: KanbanStatus, event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files?.length) void addQuickAddFiles(status, event.target.files, "image");
    event.target.value = "";
  }

  function removeQuickAddAttachment(status: KanbanStatus, id: string) {
    setQuickAddAttachments((current) => ({ ...current, [status]: (current[status] ?? []).filter((attachment) => attachment.id !== id) }));
  }

  async function attachQuickAddDirectory(status: KanbanStatus) {
    try {
      const directory = await pickLinkedDirectory();
      if (!directory) return;
      setQuickAddDirectories((current) => ({
        ...current,
        [status]: [...(current[status] ?? []), directory],
      }));
      setQuickAddAttachmentError("");
      setQuickAddAttachmentMenuOpen(false);
    } catch (error) {
      setQuickAddAttachmentError(error instanceof Error ? error.message : "Could not link that directory.");
    }
  }

  function removeQuickAddDirectory(status: KanbanStatus, id: string) {
    setQuickAddDirectories((current) => ({ ...current, [status]: (current[status] ?? []).filter((directory) => directory.id !== id) }));
  }

  async function addKanbanSteerFiles(files: FileList | File[], kind: "image" | "file") {
    try {
      const next = await readComposerFiles(files, kind);
      setKanbanSteerAttachments((current) => [...current, ...next]);
      setKanbanSteerAttachmentError("");
      setKanbanSteerAttachmentMenuOpen(false);
    } catch (error) {
      setKanbanSteerAttachmentError(error instanceof Error ? error.message : "Could not attach that file.");
    }
  }

  function handleKanbanSteerFileChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files?.length) void addKanbanSteerFiles(event.target.files, "file");
    event.target.value = "";
  }

  function handleKanbanSteerImageChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files?.length) void addKanbanSteerFiles(event.target.files, "image");
    event.target.value = "";
  }

  function removeKanbanSteerAttachment(id: string) {
    setKanbanSteerAttachments((current) => current.filter((attachment) => attachment.id !== id));
  }

  async function attachKanbanSteerDirectory() {
    try {
      const directory = await pickLinkedDirectory();
      if (!directory) return;
      setKanbanSteerDirectories((current) => [...current, directory]);
      setKanbanSteerAttachmentError("");
      setKanbanSteerAttachmentMenuOpen(false);
    } catch (error) {
      setKanbanSteerAttachmentError(error instanceof Error ? error.message : "Could not link that directory.");
    }
  }

  function removeKanbanSteerDirectory(id: string) {
    setKanbanSteerDirectories((current) => current.filter((directory) => directory.id !== id));
  }

  function updateVoiceTranscript(value: string) {
    voiceTranscriptRef.current = value;
    setVoiceTranscript(value);
  }

  function appendVoiceTranscriptToInput() {
    const transcript = voiceTranscriptRef.current.trim();
    if (!transcript) return;
    if (voiceTarget === "chat") {
      setText((current) => [current.trim(), transcript].filter(Boolean).join(current.trim() ? " " : ""));
    } else if (voiceTarget === "kanban-steer") {
      setKanbanSteerDraft((current) => [current.trim(), transcript].filter(Boolean).join(current.trim() ? " " : ""));
    } else {
      setQuickAddDrafts((current) => {
        const existing = current[voiceTarget]?.trim() ?? "";
        return { ...current, [voiceTarget]: [existing, transcript].filter(Boolean).join(existing ? " " : "") };
      });
    }
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

  async function startAudioRecording(target: "chat" | "kanban-steer" | KanbanStatus = "chat") {
    if (recording || busy) return;
    const setTargetAttachmentError = (message: string) => {
      if (target === "chat") setAttachmentError(message);
      else if (target === "kanban-steer") setKanbanSteerAttachmentError(message);
      else setQuickAddAttachmentError(message);
    };
    const Recognition = speechRecognitionConstructor();
    if (!Recognition) {
      setTargetAttachmentError("Speech transcription is not available in this browser.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setTargetAttachmentError("Microphone access is not available in this browser.");
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
        setTargetAttachmentError(event.error ? `Speech transcription failed: ${event.error}` : "Speech transcription failed.");
      };
      recognition.onend = () => cleanupVoiceCapture(true);
      voiceStreamRef.current = stream;
      voiceRecognitionRef.current = recognition;
      setVoiceTarget(target);
      updateVoiceTranscript("");
      startVoiceWaveform(stream);
      recognition.start();
      setRecording(true);
      setTargetAttachmentError("");
    } catch (error) {
      cleanupVoiceCapture(false);
      setTargetAttachmentError(error instanceof Error ? error.message : "Could not start audio recording.");
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

  /* eslint-disable react-hooks/purity */
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
      appendMessage(selectedAgent.id, { role: "user", content: outgoingLabel, attachments: outgoingAttachments, surface: "chat" });
      appendMessage(selectedAgent.id, { role: "assistant", content: `Error: ${setupIssue}`, surface: "chat" });
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
    const workingDirectory = selectedChatDirectoryPath || selectedAgent.localDataDir || "";
    const contextMessages = (messagesByAgent[selectedAgent.id] ?? [])
      .filter((message) => (
        message.role !== "system"
        && isManualAgentChatMessage(message)
        && (message.content.trim() || message.attachments?.length)
      ))
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
      workingDirectory,
    });
    appendMessage(selectedAgent.id, { role: "user", content: outgoingLabel, attachments: outgoingAttachments, surface: "chat" });
    appendMessage(selectedAgent.id, { role: "assistant", content: "", surface: "chat" });

    try {
      const response = await fetch("/api/chat/agent-runtime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent: selectedAgent,
          sharedVault,
          workingDirectory,
          wallet: walletsByAgent[selectedAgent.id] ?? createDefaultAgentWallet(selectedAgent.id),
          honeyLedgerEnabled,
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
            honey?: unknown;
          };
          if (parsed.error) throw new Error(parsed.error);
          if (parsed.honey) {
            await refreshHoneyLedger();
            continue;
          }
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
        next[next.length - 1] = { role: "assistant", content: `Error: ${message}`, surface: "chat" };
        return { ...current, [selectedAgent.id]: next };
      });
      updateTask(taskId, { status: "failed", lastMessage: message, completedAt: Date.now() });
    } finally {
      setBusy(false);
      setBusyAgentId("");
      setHasStreamingChunk(false);
    }
  }
  /* eslint-enable react-hooks/purity */

  const agentSettingsMachineName = agentCreateMachine?.name ?? roleModalAgent?.machineName ?? "this machine";
  const agentSettingsTitle = agentCreateMachine ? "Add agent" : "Agent settings";
  const agentSettingsDescription = agentCreateMachine
    ? `Create a runtime profile attached to ${agentSettingsMachineName}.`
    : "Manage role, memory, workspace, runtime access, and security for this agent.";
  const agentSettingsWorkerClass = agentCreateMachine ? agentCreateDraft.workerClass : roleModalAgent?.workerClass ?? "general";
  const agentSettingsWorkerPreset = beeWorkerPreset(agentSettingsWorkerClass);
  const agentSettingsCustomWorkers = agentCreateMachine
    ? agentCreateDraft.customWorkerClasses
    : roleModalAgent?.customWorkerClasses ?? (roleModalAgent?.customWorkerClass ? [roleModalAgent.customWorkerClass] : []);
  const agentSettingsSelectedCustomWorkerId = agentCreateMachine ? agentCreateDraft.selectedCustomWorkerClassId : roleModalAgent?.selectedCustomWorkerClassId;
  const agentSettingsCustomWorker = agentSettingsCustomWorkers.find((workerClass) => workerClass.id === agentSettingsSelectedCustomWorkerId);
  const agentSettingsWorkerLabel = agentSettingsCustomWorker?.label || `${agentSettingsWorkerPreset.label} bee`;
  const agentSettingsWorkerImage = agentSettingsCustomWorker?.imageSrc || beeRoleIconPath("worker", agentSettingsWorkerClass);
  const agentSettingsSkillProfile = agentCreateMachine
    ? agentCreateDraft.skillProfilePrompt
    : roleModalAgent?.skillProfilePrompt ?? agentSettingsWorkerPreset.taskProfile;
  const agentSettingsPreferredSkills = agentCreateMachine
    ? agentCreateDraft.preferredSkillSlugs
    : roleModalAgent?.preferredSkillSlugs ?? agentSettingsWorkerPreset.skillSlugs;
  const selectAgentWorkerClass = (workerClass: BeeWorkerClass) => {
    const preset = beeWorkerPreset(workerClass);
    const patch = {
      workerClass,
      customWorkerClass: undefined,
      selectedCustomWorkerClassId: undefined,
      skillProfilePrompt: preset.taskProfile,
      preferredSkillSlugs: preset.skillSlugs,
    };
    if (agentCreateMachine) setAgentCreateDraft((current) => ({ ...current, ...patch }));
    else if (roleModalAgent) updateAgentProfile(roleModalAgent.id, patch);
  };
  const selectCustomWorkerClass = (customWorkerClass: CustomWorkerClassProfile) => {
    const patch = {
      workerClass: "general" as BeeWorkerClass,
      customWorkerClass,
      selectedCustomWorkerClassId: customWorkerClass.id,
      skillProfilePrompt: customWorkerClass.skillProfilePrompt,
      preferredSkillSlugs: customWorkerClass.preferredSkillSlugs,
    };
    if (agentCreateMachine) setAgentCreateDraft((current) => ({ ...current, ...patch }));
    else if (roleModalAgent) updateAgentProfile(roleModalAgent.id, patch);
  };
  const updateAgentSkillProfile = (skillProfilePrompt: string) => {
    if (agentCreateMachine) setAgentCreateDraft((current) => ({ ...current, skillProfilePrompt }));
    else if (roleModalAgent) updateAgentProfile(roleModalAgent.id, { skillProfilePrompt });
  };
  const openCustomWorkerClassCreator = () => {
    setCustomWorkerDraft({
      label: "",
      imageSrc: beeRoleIconPath("worker", agentSettingsWorkerClass),
      skillProfilePrompt: "",
      preferredSkillSlugs: agentSettingsPreferredSkills,
    });
    setCustomWorkerSkillSearch("");
    setCustomWorkerImageError("");
    setAgentWorkerClassView("create");
  };
  const applyCustomWorkerClass = () => {
    const customWorkerClass = customWorkerProfileFromDraft(customWorkerDraft);
    const nextCustomWorkerClasses = [
      ...agentSettingsCustomWorkers.filter((workerClass) => workerClass.id !== customWorkerClass.id),
      customWorkerClass,
    ];
    const patch = {
      workerClass: "general" as BeeWorkerClass,
      customWorkerClass,
      customWorkerClasses: nextCustomWorkerClasses,
      selectedCustomWorkerClassId: customWorkerClass.id,
      skillProfilePrompt: customWorkerClass.skillProfilePrompt,
      preferredSkillSlugs: customWorkerClass.preferredSkillSlugs,
    };
    if (agentCreateMachine) setAgentCreateDraft((current) => ({ ...current, ...patch }));
    else if (roleModalAgent) updateAgentProfile(roleModalAgent.id, patch);
    setAgentWorkerClassView("presets");
  };
  const toggleCustomWorkerSkill = (slug: string) => {
    setCustomWorkerDraft((current) => ({
      ...current,
      preferredSkillSlugs: current.preferredSkillSlugs.includes(slug)
        ? current.preferredSkillSlugs.filter((item) => item !== slug)
        : [...current.preferredSkillSlugs, slug],
    }));
  };
  const uploadCustomWorkerImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setCustomWorkerImageError("Choose an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      setCustomWorkerDraft((current) => ({ ...current, imageSrc: reader.result as string }));
      setCustomWorkerImageError("");
    };
    reader.onerror = () => setCustomWorkerImageError("Could not read that image.");
    reader.readAsDataURL(file);
  };
  const filteredCustomWorkerSkills = useMemo(() => {
    const query = customWorkerSkillSearch.trim().toLowerCase();
    const options = sharedSkillOptions.map((skill) => ({
      ...skill,
      selected: customWorkerDraft.preferredSkillSlugs.includes(skill.slug),
    }));
    if (!query) return options.sort((a, b) => Number(b.selected) - Number(a.selected) || a.name.localeCompare(b.name));
    return options
      .map((skill) => {
        const nameMatch = skill.name.toLowerCase().includes(query) || skill.slug.toLowerCase().includes(query);
        const keywordMatch = skill.description.toLowerCase().includes(query);
        return { ...skill, rank: nameMatch ? 0 : keywordMatch ? 1 : 2 };
      })
      .filter((skill) => skill.rank < 2)
      .sort((a, b) => a.rank - b.rank || Number(b.selected) - Number(a.selected) || a.name.localeCompare(b.name));
  }, [customWorkerDraft.preferredSkillSlugs, customWorkerSkillSearch, sharedSkillOptions]);
  const selectedHetznerServerType = useMemo(
    () => HETZNER_SERVER_TYPE_OPTIONS.find((option) => option.value === machineInitDraft.serverType) ?? HETZNER_SERVER_TYPE_OPTIONS[0],
    [machineInitDraft.serverType],
  );

  return (
    <motion.main
        className="shell commandShell"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
      >
        <TooltipProvider delayDuration={120}>
          <header className="commandTopbar" aria-label="Control room navigation">
            <div className="topbarMasthead">
              <div className="brandIntro">
                <button
                  type="button"
                  className="brandHex"
                  aria-label="Return to Fleet"
                  title="Return to Fleet"
                  onClick={() => setActiveView("agents")}
                >
                  <Image
                    className="brandLogo"
                    src="/hivemindos-logo.png"
                    alt=""
                    width={190}
                    height={194}
                    priority
                  />
                </button>
                <div className="brandCopy">
                  <p className="eyebrow">{activeHeader.eyebrow}</p>
                  <strong>{activeHeader.title}</strong>
                </div>
              </div>

              <div className="topbarSignal" aria-label="Brain sync status">
                {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                <span>· brain ·</span>
                <span>synced {fleetCheckedAt ? formatRelativeTime(fleetCheckedAt) : "38s ago"}</span>
              </div>

              <nav className="viewTabs" aria-label="Dashboard views">
                {(["agents", "kanban", "vault", "scheduler", "swarm", "wallet"] as DashboardView[])
                  .map((id) => navItems.find((item) => item.id === id))
                  .filter((item): item is (typeof navItems)[number] => Boolean(item))
                  .map((item) => (
                  <Tooltip key={item.id}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className={`viewTab ${activeView === item.id ? "active" : ""}`}
                        aria-pressed={activeView === item.id}
                        title={`${item.label}: ${item.detail}`}
                        onClick={() => {
                          if (item.id === "kanban" && !kanbanBoard) setKanbanLoading(true);
                          setActiveView(item.id);
                        }}
                      >
                        {viewIcon(item.id)}
                        <span>
                          {item.label}
                          {item.id === "notifications" && notificationSummary?.unread ? (
                            <i className={notificationClass("navBadge")} aria-label={`${notificationSummary.unread} unread notifications`}>
                              {notificationSummary.unread > 99 ? "99+" : notificationSummary.unread}
                            </i>
                          ) : null}
                        </span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <strong className="block">{item.label}</strong>
                      <span className="block text-[var(--muted)]">{item.detail}</span>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </nav>

            </div>
          </header>
        </TooltipProvider>

        <div className="commandMain">
      {activeView === "agents" ? (
      <section className={fleetClass("fleetConstellationPanel", "tabPanel")}>
        <FleetView
          machines={fleetViewData.machines}
          tasks={fleetViewData.tasks}
          alerts={fleetViewData.alerts}
          ticker={fleetViewData.ticker}
          edges={fleetViewData.edges}
          checkedLabel={fleetCheckedAt ? `Scanned ${formatRelativeTime(fleetCheckedAt)}` : tailscaleStatus}
          tailnetLabel={tailscaleStatus}
          onAddAgent={(machine) => {
            const group = machineGroups.find((item) => item.key === machine.id);
            if (group) addAgentToMachine(group);
          }}
          onAddMachine={openMachineInitModal}
          onOpenChat={(_, agent) => startAgentChat(agent.id)}
          onOpenWallet={(_, agent) => {
            setSelectedAgentId(agent.id);
            setActiveView("wallet");
          }}
          onEditSettings={(_, agent) => {
            setSelectedAgentId(agent.id);
            setAgentRenameDraft(agent.name);
            setAgentRenameEditing(false);
            setAgentRuntimeFolderEditing(false);
            setAgentRuntimeFolderStatus("");
            setAgentRuntimeAdvancedOpen(false);
            setAgentSettingsPanel("role");
            setAgentRoleModalId(agent.id);
          }}
          onDuplicate={(_, agent) => duplicateAgent(agent.id)}
          onRemove={(_, agent) => deleteAgent(agent.id)}
        />
      </section>
      ) : null}

      {false && activeView === "agents" ? (
      <section className={fleetClass("agentRail", "tabPanel")}>
        <div className={fleetClass("agentRailHeader")}>
          <div>
            <h2>Fleet</h2>
            <p className="text-xs text-[var(--muted)]">
              {fleetCheckedAt ? `Scanned ${formatRelativeTime(fleetCheckedAt ?? Date.now())} · ` : ""}{tailscaleStatus}
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
                            setAgentSettingsPanel("role");
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
                          roleLabel={beeRoleLabel(agent.beeRole)}
                          runtime={agent.runtime}
                          workerClass={agent.workerClass}
                          hasTelemetryUrl={hasMachineWiring}
                          activeCount={activeCount}
                          snapshotOk={snapshot?.ok}
                          processRunning={snapshot?.processRunning}
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
      <section className={kanbanClass("workBoardPanel", "tabPanel")}>
        <input
          ref={kanbanCardFileInputRef}
          type="file"
          multiple
          className={chatClass("chatFileInput")}
          onChange={handleKanbanCardFileChange}
        />
        <input
          ref={kanbanCardImageInputRef}
          type="file"
          accept="image/*"
          multiple
          className={chatClass("chatFileInput")}
          onChange={handleKanbanCardImageChange}
        />
        <div className={kanbanClass("workBoardShell")}>
          <section className={kanbanClass("workBoardHero")} aria-label="Work board summary">
            <div className={kanbanClass("workBoardHeroCopy")}>
              <strong>Workboard</strong>
              <span>Tasks by lane</span>
            </div>
            <div className={kanbanClass("workBoardStats")}>
              <span className={kanbanClass("working")}><strong>{workBoardStats.working}</strong>working</span>
              <span className={kanbanClass("needs-human")}><strong>{workBoardStats.needsHuman}</strong>needs you</span>
              <span className={kanbanClass("done")}><strong>{workBoardStats.done}</strong>done</span>
              <span className={kanbanClass("total")}><strong>{workBoardStats.total}</strong>total</span>
            </div>
          </section>

          <section className={kanbanClass("workBoardControls")} aria-label="Work board controls">
            <label>
              <span>tenant</span>
              <select value={kanbanTenantFilter} onChange={(event) => setKanbanTenantFilter(event.target.value)}>
                <option value="">all</option>
                {kanbanTenants.map((tenant) => <option value={tenant} key={tenant}>{tenant}</option>)}
              </select>
            </label>
            <label>
              <span>assignee</span>
              <select value={kanbanAssigneeFilter} onChange={(event) => setKanbanAssigneeFilter(event.target.value)}>
                <option value="">all</option>
                {kanbanAssigneeOptions.map((assignee) => <option value={assignee} key={assignee}>{assignee}</option>)}
              </select>
            </label>
            <label className={kanbanClass("workBoardSearch")}>
              <span>search</span>
              <div>
                <Search aria-hidden="true" />
                <input value={kanbanSearch} onChange={(event) => setKanbanSearch(event.target.value)} placeholder="title, note, result..." />
              </div>
            </label>
            <label className={kanbanClass("workBoardToggle")}>
              <input
                type="checkbox"
                checked={kanbanIncludeArchived}
                onChange={(event) => setKanbanIncludeArchived(event.target.checked)}
              />
              <span>archived</span>
            </label>
            <details className={kanbanClass("kanbanAdvanced", "workBoardOptions")}>
              <summary><Settings2 aria-hidden="true" /> board</summary>
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
                  <button type="submit">Create</button>
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
                  <div className={kanbanClass("kanbanNoteActions")}>
                    <button type="button" disabled={Boolean(noteIntakePending)} onClick={() => scanNoteIntake()}>
                      {noteIntakePending === "scan" ? "Scanning..." : "Scan notes"}
                    </button>
                    <button type="button" disabled={Boolean(noteIntakePending)} onClick={() => importNoteIntake()}>
                      {noteIntakePending === "import" ? "Importing..." : "Import to Ideas"}
                    </button>
                  </div>
                  <small>
                    {noteIntakeStatus || "Reads markdown project notes for unchecked tasks and Next action sections."}
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
            <span
              className={kanbanClass("kanbanSyncPill", kanbanStorage?.source === "obsidian" ? "synced" : "local")}
              title={kanbanStorage?.file}
            >
              <span className={kanbanClass("liveDot")} aria-hidden="true" />
              {kanbanStorage?.source === "obsidian" ? "obsidian · synced" : "local fallback"}
            </span>
          </section>

          {kanbanError ? <p className={kanbanClass("kanbanError")}>{kanbanError}</p> : null}

            <div className={kanbanClass("kanbanWorkspace", "noDrawer")}>
              <div className={kanbanClass("kanbanBoardStage")}>
              {kanbanBoardScrollState.canScrollLeft ? (
              <button
                type="button"
                className={kanbanClass("kanbanBoardScrollFab", "left")}
                onClick={() => kanbanBoardScrollRef.current?.scrollBy({ left: -360, behavior: "smooth" })}
                aria-label="Scroll left"
                title="Scroll left"
              >
                <ChevronRight aria-hidden="true" />
              </button>
              ) : null}
              <div ref={kanbanBoardScrollRef} className={kanbanClass("kanbanBoard")} aria-label="Multi-agent Kanban board" aria-busy={kanbanLoading || undefined}>
              {kanbanViewColumns.map((column) => (
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
                    <span className={kanbanClass("kanbanColumnDot", column.id)} aria-hidden="true" />
                    <div>
                      <h3>{column.title}</h3>
                      <p>{column.description}</p>
                    </div>
                    <span className={kanbanClass("kanbanColumnCount")}>{column.tasks.length}</span>
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
                  <div className={kanbanClass("kanbanCards", "scrollbar-thin")}>
                    {kanbanInitialLoading ? (
                      Array.from({ length: column.id === "done" ? 1 : 2 }).map((_, index) => (
                        <article className={kanbanClass("kanbanCardShell", "kanbanSkeletonShell")} key={`${column.id}-skeleton-${index}`} aria-hidden="true">
                          <div className={kanbanClass("kanbanCard", "kanbanSkeletonCard")}>
                            <span className={kanbanClass("kanbanSkeletonPill")} />
                            <strong />
                            <span className={kanbanClass("kanbanSkeletonLine", "wide")} />
                            <span className={kanbanClass("kanbanSkeletonLine")} />
                            <span className={kanbanClass("kanbanSkeletonFooter")} />
                          </div>
                        </article>
                      ))
                    ) : quickAddStatus === column.id ? (
                      <form className={kanbanClass("kanbanInlineAdd")} onSubmit={(event) => createKanbanTask(event, column.id)}>
                        <div className={kanbanClass("kanbanInlineAddMeta")} ref={quickAddMachineMenuRef}>
                          <div className={kanbanClass("kanbanMachinePicker")}>
                            <button
                              type="button"
                              aria-expanded={Boolean(quickAddMachineMenuOpen[column.id])}
                              onClick={() => setQuickAddMachineMenuOpen((current) => ({ ...current, [column.id]: !current[column.id] }))}
                            >
                              {quickAddMachineTargets[column.id]?.name ?? "Any machine"}
                              <ChevronDown aria-hidden="true" />
                            </button>
                            {quickAddMachineMenuOpen[column.id] ? (
                              <div className={kanbanClass("kanbanMachineMenu")} role="menu">
                                <button
                                  type="button"
                                  role="menuitemradio"
                                  aria-checked={!quickAddMachineTargets[column.id]}
                                  onClick={() => {
                                    setQuickAddMachineTargets((current) => ({ ...current, [column.id]: null }));
                                    setQuickAddMachineMenuOpen((current) => ({ ...current, [column.id]: false }));
                                  }}
                                >
                                  Any machine
                                </button>
                                {kanbanMachineTargets.map((machine) => (
                                  <button
                                    type="button"
                                    role="menuitemradio"
                                    aria-checked={quickAddMachineTargets[column.id]?.key === machine.key}
                                    key={machine.key}
                                    onClick={() => {
                                      setQuickAddMachineTargets((current) => ({ ...current, [column.id]: machine }));
                                      setQuickAddMachineMenuOpen((current) => ({ ...current, [column.id]: false }));
                                    }}
                                  >
                                    {machine.name}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </div>
                        <ComposerField
                          compact
                          value={quickAddDrafts[column.id] ?? ""}
                          onChange={(value) => setQuickAddDrafts((current) => ({ ...current, [column.id]: value }))}
                          placeholder={`Add to ${column.title}`}
                          attachments={quickAddAttachments[column.id] ?? []}
                          directories={quickAddDirectories[column.id] ?? []}
                          attachmentError={quickAddAttachmentError}
                          attachmentMenuOpen={quickAddAttachmentMenuOpen}
                          setAttachmentMenuOpen={setQuickAddAttachmentMenuOpen}
                          attachmentMenuRef={quickAddAttachmentMenuRef}
                          fileInputRef={quickAddFileInputRef}
                          imageInputRef={quickAddImageInputRef}
                          onFileChange={(event) => handleQuickAddFileChange(column.id, event)}
                          onImageChange={(event) => handleQuickAddImageChange(column.id, event)}
                          onRemoveAttachment={(id) => removeQuickAddAttachment(column.id, id)}
                          onAttachDirectory={() => void attachQuickAddDirectory(column.id)}
                          onRemoveDirectory={(id) => removeQuickAddDirectory(column.id, id)}
                          recording={recording && voiceTarget === column.id}
                          voiceBands={voiceBands}
                          voiceTranscript={voiceTranscript}
                          onToggleRecording={recording ? stopAudioRecording : () => void startAudioRecording(column.id)}
                          canSend={Boolean((quickAddDrafts[column.id] ?? "").trim() || (quickAddAttachments[column.id] ?? []).length || (quickAddDirectories[column.id] ?? []).length)}
                          onCancel={() => {
                            setQuickAddStatus("");
                            setQuickAddAttachmentError("");
                            setQuickAddAttachmentMenuOpen(false);
                            setQuickAddMachineMenuOpen((current) => ({ ...current, [column.id]: false }));
                          }}
                        />
                      </form>
                    ) : null}
                    {!kanbanInitialLoading && column.tasks.map((task) => {
                      const columnIndex = kanbanViewColumns.findIndex((item) => item.id === task.status);
                      const previousColumn = columnIndex > 0 ? kanbanViewColumns[columnIndex - 1] : null;
                      const nextColumn = columnIndex >= 0 && columnIndex < kanbanViewColumns.length - 1 ? kanbanViewColumns[columnIndex + 1] : null;
                      const bee = kanbanTaskBee(task, displayAgents);
                      const workingWithAgent = task.status === "working" && Boolean(task.assignee?.trim());
                      const staleWorking = isKanbanStaleWorkingTask(task);
                      const message = kanbanCardMessage(task);
                      const canExpandMessage = message.length > 120;
                      const messageExpanded = Boolean(expandedKanbanCards[task.id]);
                      const terminalMessage = isKanbanTerminalMessage(message);
                      const pickupPreview = kanbanPickupPreviewByTask[task.id];
                      const taskAttachmentCount = (task.attachments?.length ?? 0) + (task.linkedDirectories?.length ?? 0);
                      const undoInProgress = Boolean(task.undoRequestedAt && (task.status === "ready" || task.status === "working"));
                      return (
                        <article className={kanbanClass("kanbanCardShell")} key={task.id}>
                          <div
                            draggable
                            role="button"
                            tabIndex={0}
                            className={kanbanClass("kanbanCard", task.id === selectedKanbanTaskId && "active", workingWithAgent && "working", staleWorking && "stale", messageExpanded && "expanded")}
                            onClick={() => setSelectedKanbanTaskId(task.id)}
                            onKeyDown={(event) => {
                              if (event.target !== event.currentTarget) return;
                              if (event.key !== "Enter" && event.key !== " ") return;
                              event.preventDefault();
                              setSelectedKanbanTaskId(task.id);
                            }}
                            onDragStart={(event) => event.dataTransfer.setData("text/plain", task.id)}
                          >
                            <div className={kanbanClass("kanbanCardHeader")}>
                              <span className={kanbanClass("priorityPill", task.priority)}>{task.priority}</span>
                              {undoInProgress ? (
                                <span className={kanbanClass("kanbanUndoBadge")} title="Undo is underway">
                                  <RotateCcw aria-hidden="true" />
                                  Undo
                                </span>
                              ) : null}
                              {pickupPreview ? (
                                <motion.span
                                  className={kanbanClass("kanbanPickupPreview")}
                                  title={`${pickupPreview.assignee} is claiming this task`}
                                  initial={{ opacity: 0, scale: 0.55, y: 12, rotate: -9 }}
                                  animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
                                  transition={{ type: "spring", stiffness: 520, damping: 18, mass: 0.7 }}
                                >
                                  <Image src={pickupPreview.icon || "/icons/worker-bee-general-v2.png"} alt="" width={26} height={26} aria-hidden="true" unoptimized />
                                  <small>{pickupPreview.label}</small>
                                </motion.span>
                              ) : null}
                            </div>
                            <strong className={kanbanClass("kanbanCardTitle")}>{task.title}</strong>
                            <div className={kanbanClass("kanbanCardMeta")}>
                              <div className={kanbanClass("kanbanMachinePicker")} data-kanban-machine-menu="true">
                                <button
                                  type="button"
                                  className={kanbanClass("kanbanMachineLabel")}
                                  aria-expanded={Boolean(kanbanCardMachineMenuOpen[task.id])}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setKanbanCardMachineMenuOpen((current) => ({ ...current, [task.id]: !current[task.id] }));
                                  }}
                                >
                                  {task.targetMachine?.name ?? "Any machine"}
                                  <ChevronDown aria-hidden="true" />
                                </button>
                                {kanbanCardMachineMenuOpen[task.id] ? (
                                <div className={kanbanClass("kanbanMachineMenu")} role="menu">
                                  <button
                                    type="button"
                                    role="menuitemradio"
                                    aria-checked={!task.targetMachine?.key}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setKanbanCardMachineMenuOpen((current) => ({ ...current, [task.id]: false }));
                                      void updateKanbanTaskMachine(task, null);
                                    }}
                                  >
                                    Any machine
                                  </button>
                                  {kanbanMachineTargets.map((machine) => (
                                    <button
                                      type="button"
                                      role="menuitemradio"
                                      aria-checked={task.targetMachine?.key === machine.key}
                                      key={machine.key}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setKanbanCardMachineMenuOpen((current) => ({ ...current, [task.id]: false }));
                                        void updateKanbanTaskMachine(task, machine);
                                      }}
                                    >
                                      {machine.name}
                                    </button>
                                  ))}
                                </div>
                                ) : null}
                              </div>
                              <div className={kanbanClass("kanbanCardAttachmentPicker")} data-kanban-card-attachment-menu="true">
                                <button
                                  type="button"
                                  className={kanbanClass("kanbanCardAttachmentButton")}
                                  aria-label={`Add attachments to ${task.title}`}
                                  title="Add attachments"
                                  aria-expanded={Boolean(kanbanCardAttachmentMenuOpen[task.id])}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setKanbanCardAttachmentMenuOpen((current) => ({ ...current, [task.id]: !current[task.id] }));
                                  }}
                                >
                                  <Plus aria-hidden="true" />
                                </button>
                                {kanbanCardAttachmentMenuOpen[task.id] ? (
                                  <div className={kanbanClass("kanbanAttachmentMenu")} role="menu">
                                    <button
                                      type="button"
                                      role="menuitem"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        openKanbanCardFilePicker(task.id, "image");
                                      }}
                                    >
                                      <Paperclip aria-hidden="true" />
                                      Images
                                    </button>
                                    <button
                                      type="button"
                                      role="menuitem"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        openKanbanCardFilePicker(task.id, "file");
                                      }}
                                    >
                                      <FileUp aria-hidden="true" />
                                      Files
                                    </button>
                                    <button
                                      type="button"
                                      role="menuitem"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        void attachKanbanCardDirectory(task);
                                      }}
                                    >
                                      <FolderOpen aria-hidden="true" />
                                      Directory
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                              {taskAttachmentCount > 0 ? (
                                <span className={kanbanClass("kanbanAttachmentCount")}>
                                  <Paperclip aria-hidden="true" />
                                  {taskAttachmentCount}
                                </span>
                              ) : null}
                            </div>
                            <div className={kanbanClass("kanbanMessageRow")}>
                              {terminalMessage ? (
                                <pre className={kanbanClass("kanbanCardTerminal")}><code>{message}</code></pre>
                              ) : (
                                <ChatMarkdown
                                  text={message}
                                  className={kanbanClass("kanbanCardMarkdown")}
                                  headingClassName={kanbanClass("kanbanCardMarkdownHeading")}
                                />
                              )}
                              {canExpandMessage ? (
                                <button
                                  type="button"
                                  className={kanbanClass("kanbanExpandMessage", messageExpanded && "expanded")}
                                  title={messageExpanded ? "Collapse message" : "Expand message"}
                                  aria-expanded={messageExpanded}
                                  aria-label={messageExpanded ? "Collapse full message" : "Expand full message"}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setExpandedKanbanCards((current) => ({ ...current, [task.id]: !current[task.id] }));
                                  }}
                                >
                                  <ChevronRight aria-hidden="true" />
                                </button>
                              ) : null}
                            </div>
                            <div className={kanbanClass("kanbanCardFooter")}>
                              <span>{task.assignee || "unassigned"}</span>
                              <time dateTime={new Date(task.updatedAt).toISOString()}>{formatRelativeTime(task.updatedAt)}</time>
                              {workingWithAgent ? (
                                <span className={kanbanClass("kanbanWorkingBee", "compact")} title={`${task.assignee} is working`}>
                                  <Image src={bee.icon || "/icons/worker-bee-general-v2.png"} alt="" width={18} height={18} aria-hidden="true" unoptimized />
                                </span>
                              ) : null}
                              {staleWorking ? <span className={kanbanClass("priorityPill", "stale")}>quiet {formatDurationShort(kanbanStaleAge(task))}</span> : null}
                              <span className={kanbanClass("kanbanCardActions")}>
                                {task.status === "done" ? (
                                  task.reviewedAt ? (
                                    <span className={kanbanClass("kanbanReviewBadge", "reviewed")} title={`Reviewed ${formatRelativeTime(task.reviewedAt)}`}>
                                      <Check aria-hidden="true" />
                                      Reviewed
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      className={kanbanClass("kanbanReviewBadge")}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        void markKanbanTaskReviewed(task);
                                      }}
                                      aria-label={`Review ${task.title}`}
                                      title="Mark reviewed"
                                    >
                                      Review
                                    </button>
                                  )
                                ) : null}
                                <span className={kanbanClass("kanbanCardMoveFabs")}>
                                  <button
                                    type="button"
                                    disabled={!previousColumn}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      if (previousColumn) void moveKanbanTask(task.id, previousColumn.id);
                                    }}
                                    aria-label="Move left"
                                    title={previousColumn ? `Move to ${previousColumn.title}` : "Already in first lane"}
                                  >
                                    ‹
                                  </button>
                                  <button
                                    type="button"
                                    disabled={!nextColumn}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      if (nextColumn) void moveKanbanTask(task.id, nextColumn.id);
                                    }}
                                    aria-label="Move right"
                                    title={nextColumn ? `Move to ${nextColumn.title}` : "Already in last lane"}
                                  >
                                    ›
                                  </button>
                                </span>
                                <button
                                  type="button"
                                  className={kanbanClass("kanbanIconAction")}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openKanbanTaskModal(task, "chat");
                                  }}
                                  aria-label={`Open agent chat for ${task.title}`}
                                  title="Agent chat"
                                >
                                  <MessageSquare aria-hidden="true" />
                                </button>
                                <CellMenu items={kanbanTaskMenuItems(task)} ariaLabel={`Actions for ${task.title}`} />
                              </span>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                    {!kanbanInitialLoading && column.tasks.length === 0 && quickAddStatus !== column.id ? (
                      <button
                        type="button"
                        className={kanbanClass("kanbanEmpty", "kanbanEmptyAction")}
                        onClick={() => setQuickAddStatus(column.id)}
                      >
                        <Plus aria-hidden="true" />
                        Add Task
                      </button>
                    ) : null}
                  </div>
                </section>
              ))}
              </div>
              {kanbanBoardScrollState.canScrollRight ? (
              <button
                type="button"
                className={kanbanClass("kanbanBoardScrollFab", "right")}
                onClick={() => kanbanBoardScrollRef.current?.scrollBy({ left: 360, behavior: "smooth" })}
                aria-label="Scroll right"
                title="Scroll right"
              >
                <ChevronRight aria-hidden="true" />
              </button>
              ) : null}
            </div>
          </div>
        </div>
      </section>
      ) : null}

      {selectedKanbanTask && kanbanTaskModal ? (
        <div
          className={kanbanClass("kanbanModalBackdrop")}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setKanbanTaskModal("");
          }}
        >
          <section className={kanbanClass("kanbanTaskModal", kanbanTaskModal === "chat" && "chatModal")} role="dialog" aria-modal="true" aria-labelledby="kanban-task-modal-title">
            <div className={kanbanClass("kanbanModalHeader")}>
              <div>
                <p className="eyebrow">{selectedKanbanTask.title}</p>
                <h3 id="kanban-task-modal-title">
                  {kanbanTaskModal === "assign" ? "Assign task" : kanbanTaskModal === "chat" ? "Agent chat" : kanbanTaskModal === "edit" ? "Edit & interrupt" : kanbanTaskModal === "events" ? "Task events" : "Task notes"}
                </h3>
              </div>
              <button type="button" onClick={() => setKanbanTaskModal("")} aria-label="Close task modal">
                <X aria-hidden="true" />
              </button>
            </div>

            {kanbanTaskModal === "assign" ? (
              <div className={kanbanClass("kanbanModalBody")}>
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
                  Move to
                  <select
                    value={selectedKanbanTask.status}
                    onChange={(event) => moveKanbanTask(selectedKanbanTask.id, event.target.value as KanbanStatus)}
                  >
                    {KANBAN_COLUMNS.map((column) => <option value={column.id} key={column.id}>{column.title}</option>)}
                  </select>
                </label>
              </div>
            ) : null}

            {kanbanTaskModal === "edit" ? (
              <form className={kanbanClass("kanbanModalBody", "kanbanEditForm")} onSubmit={editAndInterruptKanbanTask}>
                <label>
                  Title
                  <input
                    value={kanbanEditDraft.title}
                    onChange={(event) => setKanbanEditDraft((current) => ({ ...current, title: event.target.value }))}
                    disabled={kanbanEditPendingTaskId === selectedKanbanTask.id}
                  />
                </label>
                <label>
                  Task details
                  <textarea
                    value={kanbanEditDraft.body}
                    onChange={(event) => setKanbanEditDraft((current) => ({ ...current, body: event.target.value }))}
                    disabled={kanbanEditPendingTaskId === selectedKanbanTask.id}
                    placeholder="Add context, constraints, or the revised instruction."
                  />
                </label>
                <p className={kanbanClass("kanbanEditHint")}>
                  This resends the revised task to {selectedKanbanAgent?.name ?? "the assigned agent"} and interrupts the current run instead of assigning a new worker.
                </p>
                <div className={kanbanClass("kanbanEditActions")}>
                  <button type="button" onClick={() => setKanbanTaskModal("")} disabled={kanbanEditPendingTaskId === selectedKanbanTask.id}>Cancel</button>
                  <button type="submit" disabled={!selectedKanbanAgent || !kanbanEditDraft.title.trim() || kanbanEditPendingTaskId === selectedKanbanTask.id}>
                    {kanbanEditPendingTaskId === selectedKanbanTask.id ? "Sending..." : "Save & interrupt"}
                  </button>
                </div>
              </form>
            ) : null}

            {kanbanTaskModal === "chat" ? (
              <div className={kanbanClass("kanbanModalBody", "kanbanChatBody")}>
                <form className={kanbanClass("kanbanSteerComposer")} onSubmit={steerSelectedKanbanTask}>
                  <div className={kanbanClass("kanbanSteerComposerTop")}>
                    <div className={kanbanClass("kanbanSteerTargetWrap")} ref={kanbanSteerTargetMenuRef}>
                      <button
                        type="button"
                        className={kanbanClass("kanbanSteerTargetButton")}
                        onClick={() => setKanbanSteerTargetMenuOpen((current) => !current)}
                        aria-label="Choose where to send this task after the message"
                        aria-expanded={kanbanSteerTargetMenuOpen}
                      >
                        Send to {KANBAN_COLUMNS.find((column) => column.id === kanbanSteerTargetStatus)?.title ?? "Working"}
                        <ChevronDown aria-hidden="true" />
                      </button>
                      {kanbanSteerTargetMenuOpen ? (
                        <div className={kanbanClass("kanbanSteerTargetTooltip")} role="tooltip">
                          <div className={kanbanClass("kanbanSteerTargetMenu")} role="menu" aria-label="Send task to">
                            {KANBAN_STEER_TARGETS.map((column) => (
                              <button
                                type="button"
                                role="menuitemradio"
                                aria-checked={kanbanSteerTargetStatus === column.id}
                                key={column.id}
                                onClick={() => {
                                  setKanbanSteerTargetStatus(column.id);
                                  setKanbanSteerTargetMenuOpen(false);
                                }}
                              >
                                <span>{column.title}</span>
                                {kanbanSteerTargetStatus === column.id ? <Check aria-hidden="true" /> : null}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <ComposerField
                    value={kanbanSteerDraft}
                    onChange={setKanbanSteerDraft}
                    placeholder={selectedKanbanAgent ? "Message the assigned agent..." : "Assign an agent before chatting"}
                    disabled={!selectedKanbanAgent || kanbanSteeringTaskId === selectedKanbanTask.id}
                    busy={kanbanSteeringTaskId === selectedKanbanTask.id}
                    compact
                    attachments={kanbanSteerAttachments}
                    directories={kanbanSteerDirectories}
                    attachmentError={kanbanSteerAttachmentError}
                    attachmentMenuOpen={kanbanSteerAttachmentMenuOpen}
                    setAttachmentMenuOpen={setKanbanSteerAttachmentMenuOpen}
                    attachmentMenuRef={kanbanSteerAttachmentMenuRef}
                    fileInputRef={kanbanSteerFileInputRef}
                    imageInputRef={kanbanSteerImageInputRef}
                    onFileChange={handleKanbanSteerFileChange}
                    onImageChange={handleKanbanSteerImageChange}
                    onRemoveAttachment={removeKanbanSteerAttachment}
                    onAttachDirectory={() => void attachKanbanSteerDirectory()}
                    onRemoveDirectory={removeKanbanSteerDirectory}
                    recording={recording && voiceTarget === "kanban-steer"}
                    voiceBands={voiceBands}
                    voiceTranscript={voiceTranscript}
                    onToggleRecording={recording ? stopAudioRecording : () => void startAudioRecording("kanban-steer")}
                    canSend={Boolean(kanbanSteerDraft.trim() || kanbanSteerAttachments.length || kanbanSteerDirectories.length)}
                  />
                </form>
                <div className={kanbanClass("kanbanAgentMessages", "modalMessages")}>
                  {selectedKanbanAgentMessages.map((message, index) => (
                    <article className={kanbanClass("kanbanAgentMessage", message.role)} key={`${message.createdAt ?? index}-${index}`}>
                      <div>
                        <strong>{message.role === "user" ? "You" : selectedKanbanAgent?.name ?? "Agent"}</strong>
                        <time>{formatMessageTimestamp(message.createdAt)}</time>
                      </div>
                      <ChatMarkdown text={message.content} className={kanbanClass("kanbanAgentMessageMarkdown")} />
                      <MessageAttachments attachments={message.attachments} />
                    </article>
                  ))}
                  {selectedKanbanAgentMessages.length === 0 ? <p className={kanbanClass("kanbanEmpty")}>No agent messages for this task yet.</p> : null}
                </div>
              </div>
            ) : null}

            {kanbanTaskModal === "notes" ? (
              <div className={kanbanClass("kanbanModalBody")}>
                <form className={kanbanClass("kanbanCommentForm", "compact")} onSubmit={addKanbanComment}>
                  <input
                    value={commentDraft}
                    onChange={(event) => setCommentDraft(event.target.value)}
                    placeholder="Add a task note"
                  />
                  <button type="submit">Add</button>
                </form>
                <div className={kanbanClass("kanbanThread", "modalThread")}>
                  {selectedKanbanComments.map((comment) => (
                    <article key={comment.id}>
                      <strong>{comment.author}</strong>
                      <p>{comment.body}</p>
                      <small>{formatRelativeTime(comment.createdAt)}</small>
                    </article>
                  ))}
                  {selectedKanbanComments.length === 0 ? <p className={kanbanClass("kanbanEmpty")}>No notes yet.</p> : null}
                </div>
              </div>
            ) : null}

            {kanbanTaskModal === "events" ? (
              <div className={kanbanClass("kanbanModalBody")}>
                <div className={kanbanClass("kanbanEvents", "modalEvents")}>
                  {selectedKanbanEvents.map((event) => (
                    <article key={event.id}>
                      <div>
                        <span>{kanbanEventLabel(event.kind)}</span>
                        <time>{formatRelativeTime(event.createdAt)}</time>
                      </div>
                      <p>{event.message}</p>
                    </article>
                  ))}
                  {selectedKanbanEvents.length === 0 ? <p className={kanbanClass("kanbanEmpty")}>No events yet.</p> : null}
                </div>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {activeView === "scheduler" ? (
      <section className="min-h-[760px] overflow-hidden rounded-[18px] border border-[rgba(148,163,184,0.16)] bg-[rgba(5,8,13,0.72)]">
        <SchedulerView
          jobs={schedulerJobs}
          runStates={schedulerRunStates}
          toolbar={
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={() => void refreshSharedSchedulesFromVault()}>
                <Repeat2 aria-hidden="true" />
                Sync vault
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={() => void importExistingSchedules()} disabled={scheduleImporting}>
                {scheduleImporting ? <LoaderCircle aria-hidden="true" className={vaultClass("spinIcon")} /> : <FileUp aria-hidden="true" />}
                Import existing
              </Button>
            </div>
          }
          status={scheduleImportStatus ? <p className={fleetClass("schedulerImportStatus")}>{scheduleImportStatus}</p> : null}
          onToggleJob={(job) => void toggleSchedule(job.id)}
          onRunNow={(job) => {
            const schedule = findScheduleForJob(job);
            if (schedule) void runScheduleNow(schedule);
          }}
          onEditJob={(job) => {
            const schedule = findScheduleForJob(job);
            if (!schedule) return;
            editSchedule(schedule);
            setScheduleImportStatus(`Loaded ${schedule.name} into the scheduler draft.`);
          }}
          onNewJob={() => {
            resetScheduleDraft(selectedAgent?.id ?? displayAgents[0]?.id ?? "");
            setSchedulerDraftOpen(true);
            setScheduleImportStatus("");
          }}
        />
      </section>
      ) : null}

      {activeView === "scheduler" && schedulerDraftOpen ? (
        <TaskModal
          key={editingScheduleId || "new-scheduler-task"}
          open
          initial={schedulerModalInitial}
          skillOptions={sharedSkillOptions.map((skill) => ({
            slug: skill.slug,
            name: skill.name,
            description: skill.description,
          }))}
          machineOptions={Array.from(new Set([
            ...machineGroups.map((machine) => machine.name),
            "dashboard",
          ]))}
          beeOptions={displayAgents.map((agent) => agent.name)}
          onBrowseFolder={browseSchedulerFolder}
          onClose={() => {
            setSchedulerDraftOpen(false);
            if (editingScheduleId) resetScheduleDraft(selectedAgent?.id ?? displayAgents[0]?.id ?? "");
          }}
          onSave={saveScheduleFromModal}
        />
      ) : null}

      {activeView === "scheduler" && false ? (
      <section className={fleetClass("schedulerPanel", "tabPanel")}>
        <div className={fleetClass("schedulerStudioHeader")}>
          <div>
            <p className="eyebrow">Automation studio</p>
            <h2>Scheduler</h2>
            <p>Build small repeatable loops for any agent. Pick the agent, cadence, skills, and whether the run is freeform or step-by-step.</p>
          </div>
          <div className={fleetClass("schedulerMiniStats")}>
            <span><Repeat2 aria-hidden="true" /> {schedules.filter((schedule) => schedule.enabled).length} active</span>
            <span><Puzzle aria-hidden="true" /> {sharedSkillOptions.length} skills</span>
            <Button type="button" size="sm" variant="secondary" onClick={() => void importExistingSchedules()} disabled={scheduleImporting}>
              {scheduleImporting ? <LoaderCircle aria-hidden="true" className={vaultClass("spinIcon")} /> : <FileUp aria-hidden="true" />}
              Import existing
            </Button>
          </div>
        </div>
        {scheduleImportStatus ? <p className={fleetClass("schedulerImportStatus")}>{scheduleImportStatus}</p> : null}

        <div className={fleetClass("schedulerLayout")}>
          <form className={fleetClass("schedulerComposer")} onSubmit={createSchedule}>
            <div className={fleetClass("schedulerComposerTop")}>
              <div>
                <strong>{editingScheduleId ? "Edit automation" : "New automation"}</strong>
                <span>{scheduleDraft.mode === "steps" ? "Step-by-step runbook" : "Freeform prompt"}</span>
              </div>
              <div className={fleetClass("schedulerSegment")}>
                <button type="button" className={scheduleDraft.mode === "prompt" ? fleetClass("activeSegment") : ""} onClick={() => toggleSchedulerStepMode("prompt")}>
                  <AlignLeft aria-hidden="true" />
                  Prompt
                </button>
                <button type="button" className={scheduleDraft.mode === "steps" ? fleetClass("activeSegment") : ""} onClick={() => toggleSchedulerStepMode("steps")}>
                  <List aria-hidden="true" />
                  Steps
                </button>
              </div>
            </div>

            <div className={fleetClass("schedulerSection")}>
              <label className={fleetClass("schedulerField")}>
                <span>Name</span>
                <input value={scheduleDraft.name} onChange={(event) => setScheduleDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Weekly SEO report" />
              </label>
              <label className={fleetClass("schedulerField")}>
                <span>Agent</span>
                <select value={scheduleDraft.agentId} onChange={(event) => setScheduleDraft((current) => ({ ...current, agentId: event.target.value }))}>
                  {displayAgents.map((agent) => <option value={agent.id} key={agent.id}>{agent.name} · {RUNTIME_LABELS[agent.runtime]}</option>)}
                </select>
              </label>
            </div>

            <div className={fleetClass("schedulerSection")}>
              <span className={fleetClass("schedulerTinyLabel")}>Cadence</span>
              <div className={fleetClass("schedulerPresetRow")}>
                {SCHEDULE_PRESETS.map((value) => (
                  <button
                    type="button"
                    key={value}
                    className={scheduleDraft.every === value ? fleetClass("selectedSkillChip") : ""}
                    onClick={() => setScheduleDraft((current) => ({ ...current, every: value }))}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            <div className={fleetClass("schedulerSection")}>
              <div className={fleetClass("schedulerInstructionHeader")}>
                <span className={fleetClass("schedulerTinyLabel")}>{scheduleDraft.mode === "steps" ? "Runbook" : "Instructions"}</span>
                <small>{scheduleDraft.mode === "steps" ? "each step can carry its own context" : "single recurring prompt"}</small>
              </div>
              {scheduleDraft.mode === "steps" ? (
                <div className={fleetClass("schedulerStepEditor")}>
                  {scheduleDraft.steps.map((step, index) => (
                    <div
                      className={fleetClass("schedulerStepItem", schedulerSelectedStep === index && "selected")}
                      key={step.id}
                      onClick={() => {
                        setSchedulerSelectedStep(index);
                        setSchedulerAttachMenu(null);
                      }}
                    >
                      <div className={fleetClass("schedulerStepInputRow")}>
                        <span>{index + 1}</span>
                        <input
                          value={step.text}
                          onChange={(event) => updateSchedulerStep(index, { text: event.target.value })}
                          onClick={(event) => {
                            event.stopPropagation();
                            setSchedulerSelectedStep(index);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              addSchedulerStep();
                            }
                            if (event.key === "Backspace" && !step.text && scheduleDraft.steps.length > 1) {
                              event.preventDefault();
                              removeSchedulerStep(index);
                            }
                          }}
                          placeholder={index === 0 ? "First step" : "Next step"}
                        />
                        <button type="button" onClick={(event) => { event.stopPropagation(); removeSchedulerStep(index); }} aria-label={`Remove step ${index + 1}`}>
                          <X aria-hidden="true" />
                        </button>
                      </div>
                      {step.paths.length || step.skills.length ? (
                        <div className={fleetClass("schedulerStepBadges")}>
                          {step.paths.map((path) => (
                            <span className={fleetClass("schedulerAttachmentBadge", isSchedulerFilePath(path) ? "file" : "path")} key={path} title={path}>
                              {isSchedulerFilePath(path) ? <FileText aria-hidden="true" /> : <FolderOpen aria-hidden="true" />}
                              {path.split("/").filter(Boolean).pop() || path}
                              {schedulerSelectedStep === index ? (
                                <button type="button" onClick={(event) => { event.stopPropagation(); removeSchedulerStepPath(index, path); }} aria-label={`Remove ${path}`}>
                                  <X aria-hidden="true" />
                                </button>
                              ) : null}
                            </span>
                          ))}
                          {step.skills.map((slug) => {
                            const skill = sharedSkillOptions.find((item) => item.slug === slug);
                            return (
                              <span className={fleetClass("schedulerAttachmentBadge", "skill")} key={slug}>
                                <Puzzle aria-hidden="true" />
                                {skill?.name ?? slug}
                                {schedulerSelectedStep === index ? (
                                  <button type="button" onClick={(event) => { event.stopPropagation(); toggleSchedulerStepSkill(index, slug); }} aria-label={`Remove ${skill?.name ?? slug}`}>
                                    <X aria-hidden="true" />
                                  </button>
                                ) : null}
                              </span>
                            );
                          })}
                        </div>
                      ) : null}
                      {schedulerSelectedStep === index ? (
                        <div className={fleetClass("schedulerStepActionBar")}>
                          <div className={fleetClass("schedulerAttachCluster")}>
                            <button
                              type="button"
                              className={fleetClass("schedulerAttachButton", schedulerAttachMenu && "active")}
                              onClick={(event) => {
                                event.stopPropagation();
                                setSchedulerAttachMenu((current) => current === "menu" ? null : "menu");
                              }}
                              aria-label="Attach to selected step"
                              title="Attach"
                            >
                              <Plus aria-hidden="true" />
                            </button>
                            {schedulerAttachMenu === "menu" ? (
                              <div className={fleetClass("schedulerAttachPopover")} role="menu" onClick={(event) => event.stopPropagation()}>
                                <button type="button" onClick={() => { setSchedulerAttachMenu("skill"); setSchedulerSkillSearch(""); }}>
                                  <Puzzle aria-hidden="true" />
                                  Attach skill
                                </button>
                                <button type="button" onClick={() => void pickSchedulerFolder(index)}>
                                  <FolderOpen aria-hidden="true" />
                                  Link folder
                                </button>
                                <button type="button" onClick={() => void pickSchedulerFiles(index)}>
                                  <FileText aria-hidden="true" />
                                  Link file
                                </button>
                                <button type="button" onClick={() => { setSchedulerPathKind("path"); setSchedulerPathDraft(""); setSchedulerAttachMenu("path"); }}>
                                  <Link aria-hidden="true" />
                                  Link path
                                </button>
                              </div>
                            ) : null}
                            {schedulerAttachMenu === "skill" ? (
                              <div className={fleetClass("schedulerAttachPopover", "wide")} role="dialog" aria-label="Attach skill" onClick={(event) => event.stopPropagation()}>
                                <div className={fleetClass("schedulerAttachSearch")}>
                                  <Search aria-hidden="true" />
                                  <input value={schedulerSkillSearch} onChange={(event) => setSchedulerSkillSearch(event.target.value)} placeholder="Search skills" autoFocus />
                                  <button type="button" onClick={() => setSchedulerAttachMenu(null)} aria-label="Close skill picker"><X aria-hidden="true" /></button>
                                </div>
                                <div className={fleetClass("schedulerAttachChoices")}>
                                  {filteredSchedulerSkills.length ? filteredSchedulerSkills.map((skill) => {
                                    const selected = step.skills.includes(skill.slug);
                                    return (
                                      <button
                                        type="button"
                                        key={skill.slug}
                                        className={selected ? fleetClass("selectedSkillChip") : ""}
                                        onClick={() => {
                                          toggleSchedulerStepSkill(index, skill.slug);
                                          if (!selected) setSchedulerAttachMenu(null);
                                        }}
                                      >
                                        <Puzzle aria-hidden="true" />
                                        {skill.name}
                                      </button>
                                    );
                                  }) : (
                                    <button type="button" onClick={() => { setSchedulerAttachMenu(null); void openSkillBrowser(); }}>
                                      <Sparkles aria-hidden="true" />
                                      Open skill browser
                                    </button>
                                  )}
                                </div>
                              </div>
                            ) : null}
                            {schedulerAttachMenu === "path" ? (
                              <div className={fleetClass("schedulerAttachPopover", "wide")} role="dialog" aria-label={`Link ${schedulerPathKind}`} onClick={(event) => event.stopPropagation()}>
                                <div className={fleetClass("schedulerAttachSearch")}>
                                  <Link aria-hidden="true" />
                                  <input
                                    value={schedulerPathDraft}
                                    onChange={(event) => setSchedulerPathDraft(event.target.value)}
                                    onKeyDown={(event) => {
                                      if (event.key === "Enter") {
                                        event.preventDefault();
                                        addSchedulerStepPath(index, schedulerPathDraft);
                                        setSchedulerPathDraft("");
                                        setSchedulerAttachMenu(null);
                                      }
                                      if (event.key === "Escape") setSchedulerAttachMenu(null);
                                    }}
                                    placeholder={schedulerPathKind === "folder" ? "/path/to/folder" : schedulerPathKind === "file" ? "/path/to/file.md" : "/path/to/file-or-folder"}
                                    autoFocus
                                  />
                                  <button type="button" onClick={() => setSchedulerAttachMenu(null)} aria-label="Close path linker"><X aria-hidden="true" /></button>
                                </div>
                                <div className={fleetClass("schedulerAttachFooter")}>
                                  <span>{schedulerPathKind === "path" ? "File or folder" : schedulerPathKind}</span>
                                  <button
                                    type="button"
                                    disabled={!schedulerPathDraft.trim()}
                                    onClick={() => {
                                      addSchedulerStepPath(index, schedulerPathDraft);
                                      setSchedulerPathDraft("");
                                      setSchedulerAttachMenu(null);
                                    }}
                                  >
                                    Add
                                  </button>
                                </div>
                              </div>
                            ) : null}
                          </div>
                          <div className={fleetClass("schedulerModelCluster")}>
                            <button type="button" onClick={(event) => { event.stopPropagation(); setSchedulerAttachMenu((current) => current === "model" ? null : "model"); }}>
                              <Cpu aria-hidden="true" />
                              <span>{SCHEDULER_MODEL_OPTIONS.find((option) => option.value === step.model)?.label ?? "Default"}</span>
                              <ChevronDown aria-hidden="true" />
                            </button>
                            {schedulerAttachMenu === "model" ? (
                              <div className={fleetClass("schedulerAttachPopover", "modelMenu")} role="menu" onClick={(event) => event.stopPropagation()}>
                                {SCHEDULER_MODEL_OPTIONS.map((option) => (
                                  <button
                                    type="button"
                                    key={option.value}
                                    className={step.model === option.value ? fleetClass("selectedSkillChip") : ""}
                                    onClick={() => {
                                      updateSchedulerStepModel(index, option.value);
                                      setSchedulerAttachMenu(null);
                                    }}
                                  >
                                    {step.model === option.value ? <Check aria-hidden="true" /> : <span aria-hidden="true" />}
                                    {option.label}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>
                          {step.paths.length || step.skills.length ? (
                            <div className={fleetClass("schedulerStepCounts")}>
                              {step.paths.length ? <span><FolderOpen aria-hidden="true" />{step.paths.length}</span> : null}
                              {step.skills.length ? <span><Puzzle aria-hidden="true" />{step.skills.length}</span> : null}
                            </div>
                          ) : null}
                        </div>
                      ) : step.paths.length || step.skills.length || step.model ? (
                        <div className={fleetClass("schedulerStepSummary")}>
                          {step.model ? <span><Cpu aria-hidden="true" />{SCHEDULER_MODEL_OPTIONS.find((option) => option.value === step.model)?.label ?? "Default"}</span> : null}
                          {step.paths.length ? <span><FolderOpen aria-hidden="true" />{step.paths.length}</span> : null}
                          {step.skills.length ? <span><Puzzle aria-hidden="true" />{step.skills.length}</span> : null}
                        </div>
                      ) : null}
                    </div>
                  ))}
                  <button type="button" className={fleetClass("schedulerAddStepButton")} onClick={addSchedulerStep}>
                    <Plus aria-hidden="true" />
                    Add step
                  </button>
                </div>
              ) : (
                <textarea
                  value={scheduleDraft.prompt}
                  onChange={(event) => setScheduleDraft((current) => ({ ...current, prompt: event.target.value }))}
                  placeholder="Tell the agent exactly what to do when this schedule fires."
                  required
                />
              )}
              {scheduleDraft.mode === "prompt" && (scheduleDraft.skills.length || scheduleDraft.paths.length) ? (
                <div className={fleetClass("schedulerAttachmentBadges")} aria-label="Scheduler attachments">
                  {scheduleDraft.skills.map((slug) => {
                    const skill = sharedSkillOptions.find((item) => item.slug === slug);
                    return (
                      <span className={fleetClass("schedulerAttachmentBadge", "skill")} key={slug}>
                        <Puzzle aria-hidden="true" />
                        {skill?.name ?? slug}
                        <button type="button" onClick={() => removeScheduleSkill(slug)} aria-label={`Remove ${skill?.name ?? slug}`}>
                          <X aria-hidden="true" />
                        </button>
                      </span>
                    );
                  })}
                  {scheduleDraft.paths.map((path) => (
                    <span className={fleetClass("schedulerAttachmentBadge", "path")} key={path}>
                      {path.includes(".") ? <FileText aria-hidden="true" /> : <FolderOpen aria-hidden="true" />}
                      {path.split("/").filter(Boolean).pop() || path}
                      <button type="button" onClick={() => removeSchedulePath(path)} aria-label={`Remove ${path}`}>
                        <X aria-hidden="true" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
              <div className={fleetClass("schedulerActionBar")}>
                {scheduleDraft.mode === "prompt" ? (
                <>
                <div className={fleetClass("schedulerAttachCluster")}>
                  <button
                    type="button"
                    className={fleetClass("schedulerAttachButton", schedulerAttachMenu && "active")}
                    onClick={() => setSchedulerAttachMenu((current) => current === "menu" ? null : "menu")}
                    aria-label="Attach skill, file, folder, or path"
                    title="Attach"
                  >
                    <Plus aria-hidden="true" />
                  </button>
                  {schedulerAttachMenu === "menu" ? (
                    <div className={fleetClass("schedulerAttachPopover")} role="menu">
                      <button type="button" onClick={() => { setSchedulerAttachMenu("skill"); setSchedulerSkillSearch(""); }}>
                        <Puzzle aria-hidden="true" />
                        Attach skill
                      </button>
                      <button type="button" onClick={() => void pickSchedulerFolder()}>
                        <FolderOpen aria-hidden="true" />
                        Link folder
                      </button>
                      <button type="button" onClick={() => void pickSchedulerFiles()}>
                        <FileText aria-hidden="true" />
                        Link file
                      </button>
                      <button type="button" onClick={() => { setSchedulerPathKind("path"); setSchedulerAttachMenu("path"); setSchedulerPathDraft(""); }}>
                        <Link aria-hidden="true" />
                        Link path
                      </button>
                      <button type="button" onClick={() => { setSchedulerAttachMenu(null); void openSkillBrowser(); }}>
                        <Sparkles aria-hidden="true" />
                        Browse library
                      </button>
                    </div>
                  ) : null}
                  {schedulerAttachMenu === "skill" ? (
                    <div className={fleetClass("schedulerAttachPopover", "wide")} role="dialog" aria-label="Attach skill">
                      <div className={fleetClass("schedulerAttachSearch")}>
                        <Search aria-hidden="true" />
                        <input
                          value={schedulerSkillSearch}
                          onChange={(event) => setSchedulerSkillSearch(event.target.value)}
                          placeholder="Search skills"
                          autoFocus
                        />
                        <button type="button" onClick={() => setSchedulerAttachMenu(null)} aria-label="Close skill picker">
                          <X aria-hidden="true" />
                        </button>
                      </div>
                      <div className={fleetClass("schedulerAttachChoices")}>
                        {filteredSchedulerSkills.length ? filteredSchedulerSkills.map((skill) => {
                          const selected = scheduleDraft.skills.includes(skill.slug);
                          return (
                            <button
                              type="button"
                              key={skill.slug}
                              className={selected ? fleetClass("selectedSkillChip") : ""}
                              onClick={() => {
                                toggleScheduleSkill(skill.slug);
                                if (!selected) setSchedulerAttachMenu(null);
                              }}
                            >
                              <Puzzle aria-hidden="true" />
                              {skill.name}
                            </button>
                          );
                        }) : (
                          <button type="button" onClick={() => { setSchedulerAttachMenu(null); void openSkillBrowser(); }}>
                            <Sparkles aria-hidden="true" />
                            Open skill browser
                          </button>
                        )}
                      </div>
                    </div>
                  ) : null}
                  {schedulerAttachMenu === "path" ? (
                    <div className={fleetClass("schedulerAttachPopover", "wide")} role="dialog" aria-label={`Link ${schedulerPathKind}`}>
                      <div className={fleetClass("schedulerAttachSearch")}>
                        <Link aria-hidden="true" />
                        <input
                          value={schedulerPathDraft}
                          onChange={(event) => setSchedulerPathDraft(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              addSchedulePath(schedulerPathDraft);
                              setSchedulerPathDraft("");
                              setSchedulerAttachMenu(null);
                            }
                            if (event.key === "Escape") setSchedulerAttachMenu(null);
                          }}
                          placeholder={schedulerPathKind === "folder" ? "/path/to/folder" : schedulerPathKind === "file" ? "/path/to/file.md" : "/path/to/file-or-folder"}
                          autoFocus
                        />
                        <button type="button" onClick={() => setSchedulerAttachMenu(null)} aria-label="Close path linker">
                          <X aria-hidden="true" />
                        </button>
                      </div>
                      <div className={fleetClass("schedulerAttachFooter")}>
                        <span>{schedulerPathKind === "path" ? "File or folder" : schedulerPathKind}</span>
                        <button
                          type="button"
                          disabled={!schedulerPathDraft.trim()}
                          onClick={() => {
                            addSchedulePath(schedulerPathDraft);
                            setSchedulerPathDraft("");
                            setSchedulerAttachMenu(null);
                          }}
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className={fleetClass("schedulerModelCluster")}>
                  <button type="button" onClick={() => setSchedulerAttachMenu((current) => current === "model" ? null : "model")}>
                    <Cpu aria-hidden="true" />
                    <span>{SCHEDULER_MODEL_OPTIONS.find((option) => option.value === scheduleDraft.model)?.label ?? "Default"}</span>
                    <ChevronDown aria-hidden="true" />
                  </button>
                  {schedulerAttachMenu === "model" ? (
                    <div className={fleetClass("schedulerAttachPopover", "modelMenu")} role="menu">
                      {SCHEDULER_MODEL_OPTIONS.map((option) => (
                        <button
                          type="button"
                          key={option.value}
                          className={scheduleDraft.model === option.value ? fleetClass("selectedSkillChip") : ""}
                          onClick={() => {
                            setScheduleDraft((current) => ({ ...current, model: option.value }));
                            setSchedulerAttachMenu(null);
                          }}
                        >
                          {scheduleDraft.model === option.value ? <Check aria-hidden="true" /> : <span aria-hidden="true" />}
                          {option.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                </>
                ) : <span />}
                <Button
                  type="submit"
                  size="sm"
                  disabled={!scheduleDraft.agentId || (scheduleDraft.mode === "steps" ? !scheduleDraft.steps.some((step) => step.text.trim()) : !scheduleDraft.prompt.trim())}
                >
                <Repeat2 aria-hidden="true" />
                  {editingScheduleId ? "Save" : "Create"}
                </Button>
                {editingScheduleId ? (
                  <Button type="button" size="sm" variant="ghost" onClick={() => { resetScheduleDraft(selectedAgent?.id ?? displayAgents[0]?.id ?? ""); setSchedulerDraftOpen(false); }}>
                    <X aria-hidden="true" />
                    Cancel
                  </Button>
                ) : null}
              </div>
            </div>
          </form>

          <div className={fleetClass("scheduleList")}>
            {schedules.length ? schedules.map((schedule) => {
              const agent = displayAgents.find((item) => item.id === schedule.agentId);
              const agentLabel = agent
                ? `${agent.name} · ${RUNTIME_LABELS[agent.runtime]}`
                : schedule.externalSource
                  ? `${RUNTIME_LABELS[schedule.externalSource as AgentRuntime] ?? schedule.externalSource} runtime`
                  : "Missing agent";
              return (
                <article key={schedule.id} className={fleetClass("scheduleCard", schedule.enabled ? "enabled" : "paused")}>
                  <div className={fleetClass("scheduleCardTop")}>
                    <span>{schedule.enabled ? "Active" : "Paused"}{schedule.externalSource ? ` · ${RUNTIME_LABELS[schedule.externalSource as AgentRuntime] ?? schedule.externalSource}` : ""}</span>
                    <small><Clock3 aria-hidden="true" /> {schedule.every}</small>
                  </div>
                  <div>
                    <h3>{schedule.name}</h3>
                    <p>{agentLabel}</p>
                  </div>
                  <p>{schedule.lastSummary || (schedule.mode === "steps" ? `${schedule.steps.length} step runbook` : schedule.prompt)}</p>
                  {schedule.skills.length || schedule.paths.length ? (
                    <div className={fleetClass("scheduleSkillRow")}>
                      {schedule.skills.slice(0, 4).map((skill) => <span key={skill}><Puzzle aria-hidden="true" /> {skill}</span>)}
                      {schedule.paths.slice(0, 3).map((path) => <span key={path}><Paperclip aria-hidden="true" /> {path.split("/").filter(Boolean).pop() || path}</span>)}
                    </div>
                  ) : null}
                  {schedule.usePastRuns || schedule.sharedRunFolder ? (
                    <div className={fleetClass("scheduleSkillRow")}>
                      {schedule.usePastRuns ? <span><Clock3 aria-hidden="true" /> past {schedule.pastRunLimit ?? 3} runs injected</span> : null}
                      {schedule.sharedRunFolder ? <span><Paperclip aria-hidden="true" /> {schedule.sharedRunFolder}</span> : null}
                    </div>
                  ) : null}
                  <div className={fleetClass("scheduleActions")}>
                    <Button type="button" size="sm" variant="secondary" onClick={() => runScheduleNow(schedule)}><Send aria-hidden="true" /> Run now</Button>
                    <Button type="button" size="sm" variant="secondary" onClick={() => editSchedule(schedule)}><Pencil aria-hidden="true" /> Edit</Button>
                    <Button type="button" size="sm" variant="secondary" onClick={() => toggleSchedule(schedule.id)}>{schedule.enabled ? "Pause" : "Resume"}</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => removeSchedule(schedule.id)}><Trash2 aria-hidden="true" /> Remove</Button>
                  </div>
                </article>
              );
            }) : (
              <div className={fleetClass("scheduleEmpty")}>
                <Clock3 aria-hidden="true" />
                <strong>No schedules yet</strong>
                <p>Create one reusable workflow and it will appear here with its agent, skills, and run mode.</p>
              </div>
            )}
          </div>
        </div>
      </section>
      ) : null}

      {activeView === "swarm" ? (
      <section className="min-h-[760px] overflow-hidden rounded-[18px] border border-[rgba(148,163,184,0.16)] bg-[rgba(5,8,13,0.72)]">
        <SwarmView
          runs={swarmRuns}
          agents={swarmAgents}
          decisions={swarmDecisions}
          market={swarmMarket}
          socialPosts={swarmSocialPosts}
          templates={swarmTemplates}
          statusLabel={swarmStatusLabel}
          selectedRunId={selectedSwarmRunId}
          archiveLoading={mirosharkArchiveLoading}
          onSelectRun={(run) => {
            if (run.id !== currentSwarmRun?.id) void loadMirosharkArchivedRun(run.id);
          }}
          onLaunch={(templateId) => startNewMirosharkSimulation(templateId)}
          onPickTemplate={(templateId) => {
            const template = allMirosharkTemplates.find((item) => item.id === templateId);
            if (template) applyMirosharkTemplate(template);
          }}
          draftScenario={mirosharkScenario}
          draftRounds={mirosharkRounds}
          draftPlatform={mirosharkPlatform}
          templateFields={mirosharkSelectedTemplateFields}
          templateInputs={mirosharkTemplateInputs}
          missingTemplateFields={mirosharkMissingTemplateFields.length}
          runPending={mirosharkRunPending}
          onDraftScenarioChange={setMirosharkScenario}
          onDraftRoundsChange={setMirosharkRounds}
          onDraftPlatformChange={(platform) => {
            if (platform === "twitter" || platform === "reddit" || platform === "parallel" || platform === "polymarket") {
              setMirosharkPlatform(platform);
            }
          }}
          onTemplateInputChange={(key, value) => {
            if (mirosharkSelectedTemplate) updateMirosharkTemplateInput(mirosharkSelectedTemplate, key, value);
          }}
          onStartRun={() => void launchMirosharkSwarm()}
          onAskScenario={() => void runMirosharkScenarioHelper("ask")}
          onSuggestScenarios={() => void runMirosharkScenarioHelper("suggest")}
          helperPending={mirosharkHelperPending}
          helperStatus={mirosharkHelperStatus}
          loading={mirosharkRunPending || mirosharkArchiveStatus === "Loading saved run..."}
          loadingLabel={mirosharkArchiveStatus === "Loading saved run..." ? "Loading saved run" : mirosharkProgressLabel}
        />
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
          {walletExpanded && selectedAgent && selectedWallet && selectedWalletSnapshot ? (
            (() => {
              const walletAction = walletActionsByAgent[selectedAgent.id] ?? {};
              return (
            <div className={walletClass("walletDetail")}>
              <button
                type="button"
                className={walletClass("walletBackBtn")}
                onClick={() => setWalletExpanded(false)}
              >
                <ChevronLeft aria-hidden="true" width={16} height={16} />
                All wallets
              </button>
              <AgentWalletCard
                agentName={selectedAgent.name}
                machineName={selectedAgent.machineName}
                wallet={selectedWallet}
                survival={selectedWalletSnapshot}
                honeyReward={selectedHoneyReward}
                honeyLedgerEnabled={honeyLedgerEnabled}
                providerCopy={AGENT_PAYMENT_PROVIDER_COPY[selectedWallet.provider]}
                providerOptions={Object.entries(AGENT_PAYMENT_PROVIDER_COPY) as Array<[AgentPaymentProvider, typeof AGENT_PAYMENT_PROVIDER_COPY[AgentPaymentProvider]]>}
                walletAction={walletAction}
                onUpdateWallet={(patch) => updateWallet(selectedAgent.id, patch)}
                onUpdateAction={(patch) => updateWalletAction(selectedAgent.id, patch)}
                onResetRunway={() => resetWalletBurnClock(selectedAgent.id)}
                onCopyPaymentPrompt={() => copyPaymentPrompt(selectedWallet)}
                onCreateLocalWallet={() => createLocalWallet(selectedAgent.id, selectedWallet.network)}
                onRefreshBalance={() => refreshWalletBalance(selectedAgent.id)}
                onSendUsdc={() => sendWalletUsdc(selectedAgent.id)}
                onCallX402={() => testX402Fetch(selectedAgent.id)}
                onExchangeHoney={() => exchangeHoneyForHive(selectedAgent.id)}
              />
            </div>
              );
            })()
          ) : displayAgents.length > 0 ? (
            <div className={walletClass("walletGridList")} role="list" aria-label="Agent wallets">
              {displayAgents.map((agent) => {
                const wallet = walletsByAgent[agent.id] ?? createDefaultAgentWallet(agent.id);
                const snapshot = getSurvivalSnapshot(wallet);
                return (
                  <div role="listitem" key={agent.id}>
                    <AgentWalletCardCompact
                      agentName={agent.name}
                      wallet={wallet}
                      survival={snapshot}
                      onOpen={() => {
                        setSelectedAgentId(agent.id);
                        setWalletExpanded(true);
                      }}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={walletClass("walletEmpty")}>
              <strong>No agents yet</strong>
              <p>Connect an agent first, then configure its spending limits and survival rails.</p>
            </div>
          )}

          <aside className={walletClass("hiveRail", !honeyLedgerEnabled && "hiveRailDormant")} aria-label="Hive ledger">
            <header className={walletClass("hiveRailHeader")}>
              <p className="eyebrow">Hive ledger</p>
              <h3>{honeyLedgerEnabled ? "Honey rewards" : "Honey rewards off"}</h3>
            </header>

            {honeyLedgerEnabled ? (
              <>
                <dl className={walletClass("hiveRailStats")}>
                  <div>
                    <dt>Total Honey</dt>
                    <dd>{formatHiveAmount(honeyStats.totalHoney)}</dd>
                  </div>
                  <div>
                    <dt>Available</dt>
                    <dd>{formatHiveAmount(honeyStats.availableHoney)}</dd>
                  </div>
                  <div>
                    <dt>HIVE held</dt>
                    <dd>{formatHiveAmount(honeyStats.hiveBalance)}</dd>
                  </div>
                </dl>

                <Button
                  type="button"
                  size="sm"
                  className={walletClass("hiveRailConvert")}
                  disabled={honeyStats.availableHoney <= 0}
                  onClick={exchangeAllHoneyForHive}
                >
                  <HandCoins aria-hidden="true" />
                  Convert {formatHiveAmount(honeyStats.availableHoney)} Honey
                  → {formatHiveAmount(honeyStats.hiveQuote)} HIVE
                </Button>

                <details className={walletClass("hiveRailDetails")}>
                  <summary>Reward pool</summary>
                  <dl>
                    <div>
                      <dt>Pool size</dt>
                      <dd>
                        {formatHiveAmount(honeyStats.rewardPoolHive)} HIVE
                        <small>{formatHiveAmount(honeyStats.rewardPoolRemainingHive)} unissued</small>
                      </dd>
                    </div>
                    <div>
                      <dt>Pool source</dt>
                      <dd>
                        {honeyStats.rewardPoolSharePercent.toFixed(4)}%
                        <small>of HIVE volume</small>
                      </dd>
                    </div>
                    <div>
                      <dt>Rate</dt>
                      <dd>
                        {formatHiveAmount(honeyStats.hivePerMillionTokens)}
                        <small>HIVE per 1M tokens</small>
                      </dd>
                    </div>
                  </dl>
                </details>
              </>
            ) : (
              <>
                <p className={walletClass("hiveRailBlurb")}>
                  Watch supported local runtimes for real token usage, earn Honey, then convert to HIVE.
                </p>
                <Button type="button" size="sm" onClick={enableHoneyLedger}>
                  <HandCoins aria-hidden="true" />
                  Enable Honey ledger
                </Button>
                <details className={walletClass("hiveRailDetails")}>
                  <summary>What gets sent?</summary>
                  <p>
                    Agent id, workspace id, token count, model label, source, event id, and timestamp.
                    Prompts, responses, files, wallet keys, and machine details are not sent.
                    Hermes CLI usage is read from Hermes' own token counters while the dashboard is running.
                  </p>
                </details>
              </>
            )}

          </aside>
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
          <Button type="button" size="sm" variant="secondary" onClick={() => refreshBrainGraph(true)} disabled={brainGraphLoading}>
            {brainGraphLoading ? <LoaderCircle aria-hidden="true" className={vaultClass("spinIcon")} /> : <RefreshCcw aria-hidden="true" />}
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
                <>
                  <svg
                    viewBox={`${brainPan.x} ${brainPan.y} ${brainLayout.width} ${brainLayout.height}`}
                    role="img"
                    aria-label="Hive shaped Obsidian graph"
                    onPointerDown={startBrainPan}
                    onPointerMove={moveBrainPan}
                    onPointerUp={endBrainPan}
                    onPointerCancel={endBrainPan}
                    className={vaultClass("draggable", brainGraphLoading && "dimmed")}
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
                  {brainGraphLoading ? <BrainGraphLoader compact /> : null}
                </>
              ) : brainGraphLoading ? (
                <BrainGraphLoader />
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
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => void syncBrainSkillsToAeon()}
                disabled={brainSkillAeonSyncing || !sharedVault.enabled || !(brainSkills?.shared.length ?? 0)}
              >
                {brainSkillAeonSyncing ? <LoaderCircle aria-hidden="true" className={vaultClass("spinIcon")} /> : <Repeat2 aria-hidden="true" />}
                {brainSkillAeonSyncing ? "Syncing Aeon" : "Sync to Aeon"}
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={refreshBrainSkills} disabled={brainSkillsLoading || Boolean(brainSkillImportProvider)}>
                {brainSkillsLoading ? <LoaderCircle aria-hidden="true" className={vaultClass("spinIcon")} /> : <RefreshCcw aria-hidden="true" />}
                {brainSkillsLoading ? "Scanning" : "Refresh skills"}
              </Button>
            </div>
          </div>

          {hermesUpdateRequired ? (
            <p className={vaultClass("hermesUpdateNotice")}>Hermes update available: {hermesUpdateRequiredDetail}. Skills using the newest Hermes features are marked below.</p>
          ) : null}

          {brainSkills?.shared.length ? (
            <div className={vaultClass("sharedSkillGrid")}>
              <button type="button" className={vaultClass("sharedSkillAddCard")} onClick={openSkillBrowser}>
                <Image src="/icons/worker-bee-general-v2.png" alt="" width={34} height={34} unoptimized />
                <strong>Add skill</strong>
                <p>Browse featured and community skills, then mirror the ones you trust into the shared brain.</p>
              </button>
              {brainSkills.shared.map((skill) => {
                const needsHermesUpdate = skillRequiresHermesUpdate(skill, hermesUpdateRequired);
                return (
                  <article key={skill.id} className={vaultClass("sharedSkillCard")}>
                    <div className={vaultClass("sharedSkillSourceLine")}>
                      <span>Shared brain</span>
                      <div className={vaultClass("sharedSkillBadges")}>
                        {skill.providerLabel !== "Shared brain" ? <small>from {skill.providerLabel}</small> : null}
                        {needsHermesUpdate ? <small className={vaultClass("skillUpdateBadge")}>Needs Hermes update</small> : null}
                      </div>
                    </div>
                    <strong>{skill.name}</strong>
                    <p>{skill.description || "No description in SKILL.md frontmatter yet."}</p>
                    <small className={vaultClass("sharedSkillPath")}>{skill.relativePath}</small>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className={vaultClass("brainSkillsEmpty")}>
              <button type="button" className={vaultClass("sharedSkillAddCard", "emptyAddCard")} onClick={openSkillBrowser}>
                <Image src="/icons/queen-bee-v2.png" alt="" width={36} height={36} unoptimized />
                <strong>Browse skills</strong>
                <p>Add the first shared skill to the brain.</p>
              </button>
              <div>
                <strong>No shared skills yet</strong>
                <p>The vault Skills folder is empty. Import every discovered provider skill, or choose one harness at a time.</p>
              </div>
            </div>
          )}

          <div className={vaultClass("providerSkillsToolbar")}>
            <div>
              <strong>Provider installs</strong>
              <span>{brainSkills?.totals.importable ?? 0} skill{(brainSkills?.totals.importable ?? 0) === 1 ? "" : "s"} ready to mirror into Obsidian</span>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className={vaultClass("providerImportAllButton")}
              onClick={() => void importBrainSkills("all")}
              disabled={Boolean(brainSkillImportProvider) || !(brainSkills?.totals.importable ?? 0)}
            >
              {brainSkillImportProvider === "all" ? <LoaderCircle aria-hidden="true" className={vaultClass("spinIcon")} /> : brainSkillImportSuccess === "all" ? <Check aria-hidden="true" /> : <Download aria-hidden="true" />}
              {brainSkillImportProvider === "all" ? "Importing all" : brainSkillImportSuccess === "all" ? "All synced" : "Import all providers"}
            </Button>
          </div>

          <div className={vaultClass("providerSkillStrip")}>
            {(brainSkills?.providers ?? BRAIN_SKILL_PROVIDER_FALLBACK).map((provider) => {
              const importable = provider.skills.filter((skill) => !skill.imported).length;
              const imported = provider.skills.length - importable;
              const updateRequiredCount = provider.skills.filter((skill) => skillRequiresHermesUpdate({ ...skill, providerId: provider.id, source: provider.label }, hermesUpdateRequired)).length;
              const providerStatus = !provider.installed
                ? `No ${provider.home} install found`
                : importable > 0 && imported > 0
                  ? `${importable} ready · ${imported} shared`
                  : importable > 0
                    ? `${importable} ready to import`
                    : imported > 0
                      ? `${imported} in shared brain`
                      : "No skills found";
              const pending = brainSkillImportProvider === provider.id;
              const success = brainSkillImportSuccess === provider.id;
              return (
                <article key={provider.id}>
                  <div>
                    <span>{provider.label}</span>
                    <strong>{provider.skills.length}</strong>
                    <small>{providerStatus}</small>
                    {updateRequiredCount ? <small className={vaultClass("providerUpdateBadge")}>{updateRequiredCount} need Hermes update</small> : null}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className={vaultClass("providerSkillButton")}
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
	                      <small className="text-[var(--muted)]">No Obsidian Sync subscription required. Setup starts Syncthing and this dashboard auto-pairs reachable Tailnet collectors; rsync is only the fallback.</small>
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
                      Remote vault folder override
                      <input
                        value={sharedVault.tailnetSyncPath}
                        onChange={(event) => updateSharedVault({ tailnetSyncPath: event.target.value })}
                        placeholder="Leave blank for collector default"
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
                      Auto-pair realtime sync
                    </label>
                    <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
                      Repair direction
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
                  HivemindOS folder
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
                    Check HivemindOS
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
                <strong className="block text-[var(--foreground)]">HivemindOS</strong>
                <span className="text-[var(--muted)]">
                  {controlRoomStatus
                    ? (controlRoomStatus as { ok?: boolean; reason?: string }).ok
                      ? "Connected. Agents see the operating manual and registry."
                      : `Not connected — ${(controlRoomStatus as { reason?: string }).reason ?? "verify the folder path."}`
                    : "Press Check HivemindOS to verify."}
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
                {group.items.map((notification) => {
                  const actor = notificationActorMeta(notification);
                  const sourceLabel = notificationSourceLabel(notification);
                  return (
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
                            <h3>{notificationDisplayTitle(notification)}</h3>
                            <div className={notificationClass("notificationActorRow")}>
                              <span className={notificationClass("notificationActorBadge", actor.icon && "withIcon")}>
                                {actor.icon ? <Image src={actor.icon} alt="" width={20} height={20} aria-hidden="true" /> : null}
                                <span>
                                  <b>{actor.label}</b>
                                  <small>{actor.role}</small>
                                </span>
                              </span>
                              {sourceLabel ? (
                                <span className={notificationClass("notificationSourcePill")}>
                                  {sourceLabel.startsWith("Task: ") ? (
                                    <>
                                      <small>Task</small>
                                      <b>{sourceLabel.slice("Task: ".length)}</b>
                                    </>
                                  ) : sourceLabel}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <time>{formatBrainDate(notification.createdAt)}</time>
                        </div>
                        {notification.body ? (
                          <ChatMarkdown
                            text={notificationDisplayBody(notification)}
                            className={notificationClass("notificationMarkdown")}
                            headingClassName={notificationClass("notificationMarkdownHeading")}
                          />
                        ) : null}
                        <div className={notificationClass("notificationFooter")}>
                          <div className={notificationClass("notificationTags")}>
                            <span className={notificationClass("priorityPill", notification.priority)}>{notificationPriorityLabel(notification.priority)}</span>
                            <span className={notificationClass("kindPill")}>{notificationKindLabel(notification.kind)}</span>
                            {notification.read ? <span className={notificationClass("readPill")}>read</span> : null}
                            {notification.tags.slice(0, 4).map((tag) => <span className={notificationClass("kindPill")} key={`${notification.id}-${tag}`}>{notificationTagLabel(tag)}</span>)}
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
                  );
                })}
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
            <p>When an agent writes to the vault folder, this tab will pick it up and the nav badge will light up.</p>
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
                      {machine.onCreateFolder ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className={chatClass("treeChatButton")}
                              aria-label={`Create folder on ${machine.name}`}
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                machine.onCreateFolder?.();
                              }}
                            >
                              <FolderPlus aria-hidden="true" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top">{`New folder in ${machine.name}`}</TooltipContent>
                        </Tooltip>
                      ) : null}
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
                  {selectedAgent.runtime === "aeon" ? "A2A Gateway URL" : selectedAgent.runtime === "openclaw" ? "Gateway URL" : "Runtime URL"}
                  <input
                    value={selectedAgent.runtime === "aeon" ? selectedAgent.a2aUrl ?? selectedAgent.gatewayUrl : selectedAgent.gatewayUrl}
                    onChange={(event) => updateAgent(selectedAgent.runtime === "aeon"
                      ? { gatewayUrl: event.target.value, a2aUrl: event.target.value }
                      : { gatewayUrl: event.target.value })}
                  />
                </label>

                <label>
                  Agent ID
                  <input value={selectedAgent.agentId ?? ""} onChange={(event) => updateAgent({ agentId: event.target.value })} placeholder="main, researcher, writer..." />
                </label>

                <label>
                  Token
                  <input value={selectedAgent.token ?? ""} onChange={(event) => updateAgent({ token: event.target.value })} placeholder="Optional if runtime config has one" />
                </label>

                {selectedAgent.runtime === "aeon" ? (
                  <>
                    <label>
                      Aeon Repo
                      <input value={selectedAgent.aeonRepo ?? ""} onChange={(event) => updateAgent({ aeonRepo: event.target.value })} placeholder="owner/repo" />
                    </label>
                    <label>
                      Aeon Local Path
                      <input value={selectedAgent.aeonLocalPath ?? selectedAgent.localDataDir ?? ""} onChange={(event) => updateAgent({ aeonLocalPath: event.target.value, localDataDir: event.target.value })} placeholder="~/aeon" />
                    </label>
	                    <label>
	                      Aeon Branch
	                      <input value={selectedAgent.aeonBranch ?? "main"} onChange={(event) => updateAgent({ aeonBranch: event.target.value })} />
	                    </label>
	                    <label>
	                      GitHub secret keys
	                      <textarea
	                        value={aeonEnvKeys}
	                        onChange={(event) => setAeonEnvKeys(event.target.value)}
	                        rows={4}
	                        placeholder="ANTHROPIC_API_KEY&#10;BANKR_LLM_KEY&#10;GH_GLOBAL"
	                      />
	                    </label>
	                    <div className={fleetClass("setupActions")}>
	                      <Button type="button" size="sm" variant="secondary" onClick={() => void syncAeonEnvToGitHub()} disabled={aeonEnvSyncing || !selectedAgent.aeonRepo?.trim()}>
	                        {aeonEnvSyncing ? <LoaderCircle aria-hidden="true" className={vaultClass("spinIcon")} /> : <Upload aria-hidden="true" />}
	                        {aeonEnvSyncing ? "Syncing secrets" : "Sync env to GitHub"}
	                      </Button>
	                      {aeonEnvSyncStatus ? <small>{aeonEnvSyncStatus}</small> : <small>Push selected local HivemindOS/Aeon env keys to this Aeon repo as GitHub Actions secrets.</small>}
	                    </div>
	                  </>
                ) : selectedAgent.runtime !== "openclaw" ? (
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
              <ComposerField
                value={text}
                onChange={setText}
                placeholder={`Ask ${selectedAgent.name} to do something...`}
                disabled={busy}
                busy={busy && !hasStreamingChunk}
                attachments={chatAttachments}
                attachmentError={attachmentError}
                attachmentMenuOpen={attachmentMenuOpen}
                setAttachmentMenuOpen={setAttachmentMenuOpen}
                attachmentMenuRef={attachmentMenuRef}
                fileInputRef={chatFileInputRef}
                imageInputRef={chatImageInputRef}
                onFileChange={handleChatFileChange}
                onImageChange={handleChatImageChange}
                onRemoveAttachment={removeChatAttachment}
                recording={recording && voiceTarget === "chat"}
                voiceBands={voiceBands}
                voiceTranscript={voiceTranscript}
                onToggleRecording={recording ? stopAudioRecording : () => void startAudioRecording("chat")}
                canSend={Boolean(text.trim() || chatAttachments.length)}
              />
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

      {chatFolderCreatorMachine ? (
        <div
          className={fleetClass("setupModalBackdrop")}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeChatFolderCreator();
          }}
        >
          <section className={fleetClass("setupModal", "agentSettingsModal")} role="dialog" aria-modal="true" aria-labelledby="chat-folder-title">
            <div className={fleetClass("setupModalHeader")}>
              <div>
                <p className="eyebrow">New folder</p>
                <h2 id="chat-folder-title">{chatFolderCreatorMachine.name}</h2>
                <p>Create a workspace folder, select it, and start a fresh chat there.</p>
              </div>
              <button type="button" aria-label="Close" onClick={closeChatFolderCreator}>
                <X aria-hidden="true" />
              </button>
            </div>
            <form
              className={chatClass("folderCreatorForm")}
              onSubmit={(event) => {
                event.preventDefault();
                void createChatFolder();
              }}
            >
              <label>
                <span>Location</span>
                <input
                  list="chat-folder-parent-options"
                  value={chatFolderDraft.parentPath}
                  onChange={(event) => setChatFolderDraft((current) => ({ ...current, parentPath: event.target.value, error: "" }))}
                  placeholder="~/Projects"
                />
                <datalist id="chat-folder-parent-options">
                  {chatFolderCreatorParentOptions.map((path) => (
                    <option value={path} key={path} />
                  ))}
                </datalist>
              </label>
              <label>
                <span>Folder name</span>
                <input
                  value={chatFolderDraft.name}
                  onChange={(event) => setChatFolderDraft((current) => ({ ...current, name: event.target.value, error: "" }))}
                  placeholder="new-workspace"
                  autoFocus
                />
              </label>
              {chatFolderDraft.error ? <p className={chatClass("folderCreatorError")}>{chatFolderDraft.error}</p> : null}
              <div className={fleetClass("setupModalActions")}>
                <Button type="button" variant="secondary" onClick={closeChatFolderCreator}>
                  Cancel
                </Button>
                <Button type="submit" disabled={chatFolderDraft.busy}>
                  {chatFolderDraft.busy ? "Creating..." : "Create and open chat"}
                </Button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {skillBrowserOpen ? (
        <div
          className={fleetClass("setupModalBackdrop")}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSkillBrowserOpen(false);
          }}
        >
          <section className={fleetClass("setupModal", "skillBrowserModal")} role="dialog" aria-modal="true" aria-labelledby="skill-browser-title">
            <div className={fleetClass("setupModalHeader")}>
              <div className={fleetClass("skillBrowserTitle")}>
                <Image src="/icons/queen-bee-v2.png" alt="" width={46} height={46} unoptimized />
                <div>
                  <p className="eyebrow">Shared brain</p>
                  <h2 id="skill-browser-title">Skill Browser</h2>
                  <p>Add reusable operational skills to the shared Obsidian brain.</p>
                </div>
              </div>
              <Button type="button" variant="ghost" onClick={() => setSkillBrowserOpen(false)}>
                <X aria-hidden="true" />
                Close
              </Button>
            </div>
            <div className={fleetClass("skillBrowserSearch")}>
              <input
                value={skillBrowserSearch}
                onChange={(event) => setSkillBrowserSearch(event.target.value)}
                placeholder="Search skills, tools, runtimes, workflows..."
                autoFocus
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => setSkillBrowserGithubOpen((open) => !open)}
                disabled={skillBrowserGithubInstalling}
              >
                <GitBranch aria-hidden="true" />
                Install From Github
              </Button>
              <Button type="button" variant="secondary" onClick={openSkillBrowser} disabled={skillBrowserLoading}>
                {skillBrowserLoading ? <LoaderCircle aria-hidden="true" className={vaultClass("spinIcon")} /> : <RefreshCcw aria-hidden="true" />}
                Refresh
              </Button>
            </div>
            {skillBrowserGithubOpen ? (
              <form className={fleetClass("skillBrowserGithubForm")} onSubmit={(event) => void installGithubSkillToBrain(event)}>
                <input
                  value={skillBrowserGithubUrl}
                  onChange={(event) => setSkillBrowserGithubUrl(event.target.value)}
                  placeholder="https://github.com/owner/repo/tree/main/skills/example"
                  aria-label="GitHub skill URL"
                />
                <Button type="submit" disabled={skillBrowserGithubInstalling || !skillBrowserGithubUrl.trim()}>
                  {skillBrowserGithubInstalling ? <LoaderCircle aria-hidden="true" className={vaultClass("spinIcon")} /> : <Download aria-hidden="true" />}
                  {skillBrowserGithubInstalling ? "Installing" : "Install"}
                </Button>
              </form>
            ) : null}
            {skillBrowserStatus ? <p className={fleetClass("skillBrowserStatus")}>{skillBrowserStatus}</p> : null}
            {hermesUpdateRequired ? (
              <p className={fleetClass("skillBrowserStatus", "skillBrowserWarning")}>Hermes update available: {hermesUpdateRequiredDetail}. Update-gated skills are marked before you add them to the brain.</p>
            ) : null}
            <div className={fleetClass("skillBrowserGrid")}>
              {skillBrowserLoading ? (
                <div className={fleetClass("scheduleEmpty")}><LoaderCircle aria-hidden="true" className={vaultClass("spinIcon")} /><strong>Loading skills</strong><p>Checking installed skills and community catalogs.</p></div>
              ) : filteredSkillBrowserSkills.length ? filteredSkillBrowserSkills.map((skill) => {
                const needsHermesUpdate = skill.requiresHermesUpdate || skillRequiresHermesUpdate(skill, hermesUpdateRequired);
                return (
                  <article key={`${skill.source}-${skill.id}`} className={fleetClass("skillBrowserCard")}>
                    <div className={fleetClass("skillBrowserMetaRow")}>
                      <Image src="/icons/worker-bee-general-v2.png" alt="" width={24} height={24} unoptimized />
                      <span>{skill.source}{skill.category ? ` · ${skill.category}` : ""}</span>
                      {needsHermesUpdate ? <small className={fleetClass("skillUpdateBadge")}>Needs Hermes update</small> : null}
                    </div>
                    <strong>{skill.name}</strong>
                    <p>{skill.description || "No description provided yet."}</p>
                    <div className={fleetClass("scheduleActions")}>
                      <Button type="button" size="sm" onClick={() => void importRemoteSkillToBrain(skill)} disabled={skill.imported || skillBrowserImporting === skill.id}>
                        {skillBrowserImporting === skill.id ? <LoaderCircle aria-hidden="true" className={vaultClass("spinIcon")} /> : <Download aria-hidden="true" />}
                        {skill.imported ? "In brain" : "Add to brain"}
                      </Button>
                      {skill.githubUrl || skill.skillMdUrl ? (
                        <Button type="button" size="sm" variant="secondary" onClick={() => navigator.clipboard?.writeText(skill.githubUrl || skill.skillMdUrl || "")}>
                          <Copy aria-hidden="true" />
                          Copy source
                        </Button>
                      ) : null}
                    </div>
                  </article>
                );
              }) : (
                <div className={fleetClass("scheduleEmpty")}><Sparkles aria-hidden="true" /><strong>No skills found</strong><p>Try a different search, or import from provider installs below the shared skills shelf.</p></div>
              )}
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
                    <span className={fleetClass("agentRoleBadge")}>{beeRoleLabel(roleModalAgent.beeRole)}</span>
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

            <div className={fleetClass("agentSettingsTabs")} role="tablist" aria-label="Agent settings sections">
              {(agentCreateMachine ? (["role", "memory", "security"] as const) : (["role", "memory", "tools", "security"] as const)).map((panel) => (
                <button
                  type="button"
                  key={panel}
                  className={agentSettingsPanel === panel ? fleetClass("activeSegment") : ""}
                  onClick={() => setAgentSettingsPanel(panel)}
                >
                  {panel === "role" ? "Role" : panel === "memory" ? "Memory" : panel === "tools" ? "Tools" : "Security"}
                </button>
              ))}
            </div>

            {agentSettingsPanel === "role" ? (
              <div className={fleetClass("agentSettingsGrid")}>
                <label className={fleetClass("agentSettingsField")}>
                  <span>Runtime</span>
                  <select
                    value={agentCreateMachine ? agentCreateDraft.runtime : roleModalAgent?.runtime ?? "hermes"}
                    onChange={(event) => {
                      const runtime = event.target.value as AgentRuntime;
                      if (agentCreateMachine) {
                        setAgentCreateDraft((current) => ({
                          ...current,
                          runtime,
                        }));
                      } else if (roleModalAgent) {
                        updateAgentProfile(roleModalAgent.id, { runtime });
                      }
                    }}
                  >
                    {Object.entries(RUNTIME_LABELS).map(([runtime, label]) => (
                      <option value={runtime} key={runtime}>{label}</option>
                    ))}
                  </select>
                </label>
                {!agentCreateMachine && roleModalAgent ? (
                  <div className={fleetClass("agentRuntimeSummary")}>
                    <PlugZap aria-hidden="true" />
                    <div>
                      <strong>{RUNTIME_LABELS[roleModalAgent.runtime]} is connected</strong>
                      <p>Connection details are managed automatically. Open Advanced only for custom bridges or repairs.</p>
                    </div>
                    <button type="button" onClick={() => setAgentRuntimeAdvancedOpen((current) => !current)}>
                      {agentRuntimeAdvancedOpen ? "Hide advanced" : "Advanced"}
                    </button>
                  </div>
                ) : null}
                {agentRuntimeAdvancedOpen && !agentCreateMachine && roleModalAgent ? (
                  <div className={fleetClass("agentRuntimeAdvanced")}>
                    <label className={fleetClass("agentSettingsField")}>
                      <span>Chat URL / gateway</span>
                      <input
                        value={roleModalAgent.gatewayUrl ?? ""}
                        onChange={(event) => updateAgentProfile(roleModalAgent.id, { gatewayUrl: event.target.value })}
                        placeholder="http://machine:8787/chat or ws://127.0.0.1:18789"
                      />
                    </label>
                    <label className={fleetClass("agentSettingsField")}>
                      <span>Agent ID / session</span>
                      <input
                        value={roleModalAgent.agentId ?? ""}
                        onChange={(event) => updateAgentProfile(roleModalAgent.id, { agentId: event.target.value })}
                        placeholder="local-hermes, main, seo-agent"
                      />
                    </label>
                    <label className={fleetClass("agentSettingsField")}>
                      <span>Collector</span>
                      <input
                        value={roleModalAgent.telemetryUrl ?? ""}
                        onChange={(event) => updateAgentProfile(roleModalAgent.id, { telemetryUrl: event.target.value })}
                      />
                    </label>
                  </div>
                ) : null}
                <div className={fleetClass("agentSettingsField", "agentWorkerClassPicker")}>
                  <span>Worker class</span>
                  {agentWorkerClassView === "presets" ? (
                    <>
                      <div className={fleetClass("agentWorkerClassGrid")}>
                        {BEE_WORKER_PRESET_LIST.map((preset) => {
                          const selectedClass = preset.id === agentSettingsWorkerClass && !agentSettingsCustomWorker;
                          return (
                            <button
                              type="button"
                              key={preset.id}
                              className={selectedClass ? fleetClass("selectedWorkerClass") : ""}
                              onClick={() => selectAgentWorkerClass(preset.id)}
                              aria-pressed={selectedClass}
                            >
                              <Image src={beeRoleIconPath("worker", preset.id)} alt="" width={54} height={54} unoptimized />
                              <strong>{preset.label}</strong>
                            </button>
                          );
                        })}
                        {agentSettingsCustomWorkers.map((customWorkerClass) => (
                          <button
                            type="button"
                            key={customWorkerClass.id}
                            className={agentSettingsSelectedCustomWorkerId === customWorkerClass.id ? fleetClass("selectedWorkerClass", "customWorkerClassCard") : fleetClass("customWorkerClassCard")}
                            onClick={() => selectCustomWorkerClass(customWorkerClass)}
                            aria-pressed={agentSettingsSelectedCustomWorkerId === customWorkerClass.id}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={customWorkerClass.imageSrc || beeRoleIconPath("worker", "general")} alt="" />
                            <strong>{customWorkerClass.label}</strong>
                          </button>
                        ))}
                        <button type="button" className={fleetClass("agentWorkerClassCreate")} onClick={openCustomWorkerClassCreator}>
                          <Plus aria-hidden="true" />
                          <strong>Custom</strong>
                        </button>
                      </div>
                      <div className={fleetClass("agentWorkerClassDetail")}>
                        <div>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={agentSettingsWorkerImage} alt="" />
                          <div>
                            <strong>{agentSettingsWorkerLabel}</strong>
                            <div className={fleetClass("agentWorkerCapabilityBadges")}>
                              {(agentSettingsCustomWorker ? workerCapabilityBadges(agentSettingsSkillProfile) : workerCapabilityBadges(agentSettingsWorkerPreset.summary)).map((capability) => (
                                <span key={capability}>{capability}</span>
                              ))}
                            </div>
                            <small>{agentSettingsCustomWorker ? "Custom worker class" : agentSettingsWorkerPreset.modelHint}</small>
                          </div>
                        </div>
                        <label>
                          <span>Suited-for prompt</span>
                          <textarea
                            value={agentSettingsSkillProfile}
                            onChange={(event) => updateAgentSkillProfile(event.target.value)}
                          />
                        </label>
                        <div className={fleetClass("agentWorkerSkillSet")}>
                          <span>Seeded shared-brain skills</span>
                          <div>
                            {agentSettingsPreferredSkills.map((slug) => <code key={slug}>{slug}</code>)}
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className={fleetClass("agentWorkerClassCreator")}>
                      <div className={fleetClass("agentWorkerCreatorHeader")}>
                        <button type="button" onClick={() => setAgentWorkerClassView("presets")}>
                          <ChevronRight aria-hidden="true" />
                          Back
                        </button>
                        <strong>Custom worker class</strong>
                      </div>
                      <label className={fleetClass("agentSettingsField")}>
                        <span>Role name</span>
                        <input
                          value={customWorkerDraft.label}
                          onChange={(event) => setCustomWorkerDraft((current) => ({ ...current, label: event.target.value }))}
                          placeholder="Data scout, Social analyst, Build fixer"
                        />
                      </label>
                      <div className={fleetClass("agentWorkerImagePicker")}>
                        <span>Bee image</span>
                        <div>
                          {BEE_WORKER_PRESET_LIST.map((preset) => {
                            const imageSrc = beeRoleIconPath("worker", preset.id);
                            return (
                              <button
                                type="button"
                                key={preset.id}
                                className={customWorkerDraft.imageSrc === imageSrc ? fleetClass("selectedWorkerClass") : ""}
                                onClick={() => setCustomWorkerDraft((current) => ({ ...current, imageSrc }))}
                                aria-label={`Use ${preset.label} bee image`}
                              >
                                <Image src={imageSrc} alt="" width={42} height={42} unoptimized />
                              </button>
                            );
                          })}
                          <button type="button" onClick={() => customWorkerImageInputRef.current?.click()}>
                            <Upload aria-hidden="true" />
                          </button>
                        </div>
                        <input ref={customWorkerImageInputRef} type="file" accept="image/*" onChange={uploadCustomWorkerImage} hidden />
                        {customWorkerImageError ? <small>{customWorkerImageError}</small> : null}
                      </div>
                      <label className={fleetClass("agentSettingsField")}>
                        <span>Suited-for prompt</span>
                        <textarea
                          value={customWorkerDraft.skillProfilePrompt}
                          onChange={(event) => setCustomWorkerDraft((current) => ({ ...current, skillProfilePrompt: event.target.value }))}
                          placeholder="Describe when this worker should be used and what it should be good at."
                        />
                      </label>
                      <div className={fleetClass("agentWorkerSkillChooser")}>
                        <label>
                          <span>Shared brain skills</span>
                          <input
                            value={customWorkerSkillSearch}
                            onChange={(event) => setCustomWorkerSkillSearch(event.target.value)}
                            placeholder="Search by skill name or keyword"
                          />
                        </label>
                        <div>
                          {filteredCustomWorkerSkills.length ? filteredCustomWorkerSkills.map((skill) => (
                            <button
                              type="button"
                              key={skill.slug}
                              className={skill.selected ? fleetClass("selectedSkillBadge") : ""}
                              onClick={() => toggleCustomWorkerSkill(skill.slug)}
                            >
                              {skill.name}
                            </button>
                          )) : <p>No matching shared-brain skills.</p>}
                        </div>
                      </div>
                      <div className={fleetClass("agentWorkerCreatorActions")}>
                        <button type="button" onClick={() => setAgentWorkerClassView("presets")}>Cancel</button>
                        <button type="button" onClick={applyCustomWorkerClass} disabled={!customWorkerDraft.label.trim() || !customWorkerDraft.skillProfilePrompt.trim()}>
                          <Check aria-hidden="true" />
                          Use class
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {agentSettingsPanel === "memory" ? (
              <div className={fleetClass("agentSettingsGrid", "agentMemoryPanel")}>
                <label className={fleetClass("agentSettingsField", "toggleRow")}>
                  <input
                    type="checkbox"
                    checked={agentCreateMachine ? agentCreateDraft.useSharedVault : roleModalAgent?.useSharedVault !== false}
                    onChange={(event) => {
                      if (agentCreateMachine) {
                        setAgentCreateDraft((current) => ({ ...current, useSharedVault: event.target.checked }));
                      } else if (roleModalAgent) {
                        updateAgentProfile(roleModalAgent.id, { useSharedVault: event.target.checked });
                      }
                    }}
                  />
                  <span>Use shared Obsidian brain</span>
                </label>
                {(agentCreateMachine ? agentCreateDraft.useSharedVault : roleModalAgent?.useSharedVault !== false) ? (
                  <div className={fleetClass("agentSettingsInfo")}>
                    <BrainCircuit aria-hidden="true" />
                    <p>{sharedVault.enabled ? `Shared brain: ${sharedVault.vaultPath || "auto-detected vault"}. Memory, Kanban, notifications, and HivemindOS context are shared from there.` : "Shared brain is off. Turn it on from the Vault view to give agents one common memory space."}</p>
                  </div>
                ) : null}
                {!agentCreateMachine && roleModalAgent ? (
                  <div className={fleetClass("agentMemoryFolderRow")}>
                    <div>
                      <span>Runtime folder</span>
                      <strong>{roleModalAgent.localDataDir?.trim() || "Managed by runtime"}</strong>
                      <p>{roleModalAgent.useSharedVault !== false ? "Only change this if this agent needs a custom local workspace." : "Used as this agent's local memory and workspace folder."}</p>
                    </div>
                    <div className={fleetClass("agentMemoryFolderActions")}>
                      <button type="button" aria-label="Browse for runtime folder" onClick={() => void browseAgentRuntimeFolder()} disabled={agentRuntimeFolderBrowsing}>
                        <FolderOpen aria-hidden="true" />
                      </button>
                      <button type="button" aria-label="Edit runtime folder path" onClick={() => setAgentRuntimeFolderEditing((current) => !current)}>
                        <Pencil aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ) : null}
                {agentRuntimeFolderEditing && roleModalAgent ? (
                  <label className={fleetClass("agentSettingsField", "agentMemoryPathEditor")}>
                    <span>Runtime folder path</span>
                    <div>
                      <input
                        value={roleModalAgent.localDataDir ?? ""}
                        onChange={(event) => {
                          updateAgentProfile(roleModalAgent.id, { localDataDir: event.target.value });
                          setAgentRuntimeFolderStatus("");
                        }}
                        placeholder="Leave blank to use the runtime default"
                      />
                      <button type="button" aria-label="Done editing runtime folder path" onClick={() => setAgentRuntimeFolderEditing(false)}>
                        <Check aria-hidden="true" />
                      </button>
                    </div>
                  </label>
                ) : null}
                {agentRuntimeFolderStatus ? <p className={fleetClass("agentMemoryStatus")}>{agentRuntimeFolderStatus}</p> : null}
              </div>
            ) : null}

            {agentSettingsPanel === "tools" && roleModalAgent ? (
              <div className={fleetClass("agentRuntimeToolsPanel")}>
                <div className={fleetClass("agentRuntimeToolsHeader")}>
                  <div>
                    <strong>Runtime integrations</strong>
                    <p>These controls stay adapter-neutral. Hermes-only actions appear only when this agent actually runs Hermes.</p>
                  </div>
                  <Button type="button" variant="secondary" onClick={() => void refreshRuntimeIntegrations(roleModalAgent)} disabled={runtimeIntegrationBusy === "status"}>
                    {runtimeIntegrationBusy === "status" ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <RefreshCcw aria-hidden="true" />}
                    Refresh
                  </Button>
                </div>

                <div className={fleetClass("agentRuntimeCapabilityGrid")}>
                  {([
                    ["sessionSearch", "Session search", "Search prior work across this runtime.", Search],
                    ["backgroundTasks", "Background tasks", "Run work without blocking chat.", Repeat2],
                    ["xSearch", "X search", "Fetch X posts through runtime auth.", MessageSquare],
                    ["socialPosting", "X posting", "Publish through installed social skills.", Send],
                    ["videoGeneration", "AI video", "Generate videos through runtime tools.", Sparkles],
                    ["codexRuntime", "Codex runtime", "Delegate coding to Codex paths.", Cpu],
                    ["kanbanDecompose", "Kanban decomposition", "Break triage goals into child work.", KanbanSquare],
                  ] as const).map(([key, label, detail, Icon]) => {
                    const item = runtimeIntegrationStatus?.integrations[key];
                    const supported = item?.supported ?? Boolean(runtimeCapabilities(roleModalAgent)[key]);
                    const enabled = item?.enabled ?? supported;
                    const needsHermesUpdate = roleModalAgent.runtime === "hermes" && supported && hermesUpdateRequired && HERMES_UPDATE_INTEGRATION_KEYS.has(key);
                    const needsSetup = supported && !enabled && !needsHermesUpdate;
                    const statusLabel = needsHermesUpdate
                      ? "Needs Hermes update"
                      : supported
                        ? enabled ? "Ready" : "Needs setup"
                        : "Not exposed";
                    const updateConfirmOpen = runtimeUpdateConfirmKey === key;
                    return (
                      <article key={key} className={fleetClass("agentRuntimeCapabilityCard", supported ? "supported" : "unsupported")}>
                        <Icon aria-hidden="true" />
                        <div>
                          <strong>{label}</strong>
                          <div className={fleetClass("agentRuntimeCapabilityBadges")}>
                            {needsHermesUpdate ? (
                              <span className={fleetClass("needsHermesUpdate", updateConfirmOpen ? "confirming" : "")}>
                                {updateConfirmOpen ? (
                                  <>
                                    <span>Update now?</span>
                                    <button
                                      type="button"
                                      aria-label="Update Hermes now"
                                      disabled={Boolean(runtimeIntegrationBusy)}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        void (async () => {
                                          await runRuntimeIntegrationAction("hermes-update");
                                          setRuntimeUpdateConfirmKey("");
                                        })();
                                      }}
                                    >
                                      {runtimeIntegrationBusy === "hermes-update" ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Check aria-hidden="true" />}
                                    </button>
                                    <button
                                      type="button"
                                      aria-label="Cancel Hermes update"
                                      disabled={runtimeIntegrationBusy === "hermes-update"}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setRuntimeUpdateConfirmKey("");
                                      }}
                                    >
                                      <X aria-hidden="true" />
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={Boolean(runtimeIntegrationBusy)}
                                    onClick={() => setRuntimeUpdateConfirmKey(key)}
                                  >
                                    {statusLabel}
                                  </button>
                                )}
                              </span>
                            ) : needsSetup ? (
                              <button
                                type="button"
                                className={fleetClass("runtimeSetupBadge")}
                                aria-pressed={runtimeSetupKey === key}
                                onClick={() => setRuntimeSetupKey((current) => current === key ? "" : key)}
                              >
                                {statusLabel}
                              </button>
                            ) : (
                              <span>{statusLabel}</span>
                            )}
                          </div>
                          <p>{detail}</p>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {runtimeSetupKey ? (() => {
                  const setup = runtimeSetupDefinition(roleModalAgent.runtime, runtimeSetupKey);
                  return (
                    <section className={fleetClass("agentRuntimeSetupPanel")}>
                      <div>
                        <strong>{setup.title}</strong>
                        <p>{setup.description}</p>
                      </div>
                      <ol>
                        {setup.steps.map((step) => <li key={step}>{step}</li>)}
                      </ol>
                      <div className={fleetClass("agentRuntimeSetupActions")}>
                        {setup.actions.map((action) => (
                          <Button
                            key={action.id}
                            type="button"
                            variant={action.id === setup.actions[0]?.id ? "default" : "secondary"}
                            disabled={Boolean(runtimeIntegrationBusy)}
                            onClick={() => void runRuntimeIntegrationAction(action.action, action.input ?? {})}
                          >
                            {runtimeIntegrationBusy === action.action ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <PlugZap aria-hidden="true" />}
                            {action.label}
                          </Button>
                        ))}
                        <Button type="button" variant="secondary" onClick={() => void refreshRuntimeIntegrations(roleModalAgent)} disabled={runtimeIntegrationBusy === "status"}>
                          {runtimeIntegrationBusy === "status" ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <RefreshCcw aria-hidden="true" />}
                          Refresh
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => setRuntimeSetupKey("")}>
                          <X aria-hidden="true" />
                          Close
                        </Button>
                      </div>
                    </section>
                  );
                })() : null}

                <div className={fleetClass("agentRuntimeToolWorkbench")}>
                  <section>
                    <div>
                      <strong>Search sessions</strong>
                      <p>Works for runtimes with readable local session history. Hermes uses its SQLite session store; OpenClaw scans local session transcripts when present.</p>
                    </div>
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        void searchRuntimeSessionsForAgent();
                      }}
                    >
                      <input
                        value={runtimeSessionQuery}
                        onChange={(event) => setRuntimeSessionQuery(event.target.value)}
                        placeholder="April 15, Codex, Kanban, auth..."
                      />
                      <Button type="submit" disabled={runtimeIntegrationBusy === "session-search"}>
                        {runtimeIntegrationBusy === "session-search" ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Search aria-hidden="true" />}
                        Search
                      </Button>
                    </form>
                    {runtimeSessionResults.length ? (
                      <div className={fleetClass("agentRuntimeSessionResults")}>
                        {runtimeSessionResults.map((session) => (
                          <article key={session.id}>
                            <strong>{session.title}</strong>
                            <span>{[session.source, session.model, session.startedAt ? new Date(session.startedAt).toLocaleString() : ""].filter(Boolean).join(" · ")}</span>
                            <p>{session.excerpt || session.path || "No preview available."}</p>
                          </article>
                        ))}
                      </div>
                    ) : null}
                  </section>

                  {roleModalAgent.runtime === "hermes" ? (
                    <section>
                      <div>
                        <strong>Hermes extras</strong>
                        <p>These call the local Hermes CLI and leave other runtimes untouched.</p>
                      </div>
                      <div className={fleetClass("agentRuntimeActionGrid")}>
                        <Button type="button" variant="secondary" disabled={Boolean(runtimeIntegrationBusy)} onClick={() => void runRuntimeIntegrationAction("xai-login")}>
                          <PlugZap aria-hidden="true" />
                          xAI login
                        </Button>
                        <Button type="button" variant="secondary" disabled={Boolean(runtimeIntegrationBusy)} onClick={() => void runRuntimeIntegrationAction("enable-tool", { tool: "x_search" })}>
                          <MessageSquare aria-hidden="true" />
                          Enable X search
                        </Button>
                        <Button type="button" variant="secondary" disabled={Boolean(runtimeIntegrationBusy)} onClick={() => void runRuntimeIntegrationAction("enable-tool", { tool: "video_gen" })}>
                          <Sparkles aria-hidden="true" />
                          Enable video
                        </Button>
                        <Button type="button" variant="secondary" disabled={Boolean(runtimeIntegrationBusy)} onClick={() => void runRuntimeIntegrationAction("kanban-decompose")}>
                          <KanbanSquare aria-hidden="true" />
                          Decompose triage
                        </Button>
                      </div>
                      <label className={fleetClass("agentSettingsField")}>
                        <span>Background prompt</span>
                        <textarea
                          value={runtimeBackgroundPrompt}
                          onChange={(event) => setRuntimeBackgroundPrompt(event.target.value)}
                          placeholder="Ask Hermes to handle a background task while chat stays free."
                        />
                      </label>
                      <Button
                        type="button"
                        disabled={runtimeIntegrationBusy === "background" || !runtimeBackgroundPrompt.trim()}
                        onClick={() => void runRuntimeIntegrationAction("background", { prompt: runtimeBackgroundPrompt })}
                      >
                        {runtimeIntegrationBusy === "background" ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Repeat2 aria-hidden="true" />}
                        Start background task
                      </Button>
                    </section>
                  ) : null}
                </div>

                {runtimeIntegrationMessage ? <p className={fleetClass("agentRuntimeToolStatus")}>{runtimeIntegrationMessage}</p> : null}
              </div>
            ) : null}

            {agentSettingsPanel === "security" ? (
              <div className={fleetClass("agentSecurityGrid")}>
                <article><ShieldCheck aria-hidden="true" /><div><strong>Prompt guard</strong><p>Blocks obvious prompt-injection and dangerous local-action requests before they reach connected runtimes. Checks run locally in the dashboard.</p></div></article>
                <article><Eye aria-hidden="true" /><div><strong>Output redaction</strong><p>Secrets and obvious credential leaks are redacted from streamed responses before the dashboard renders them.</p></div></article>
                <article><Settings2 aria-hidden="true" /><div><strong>Skill action guard</strong><p>Local skill actions use allowlisted skill folders and safe argument checks where the runtime exposes dashboard actions.</p></div></article>
              </div>
            ) : null}

            <div className={fleetClass("setupModalActions")}>
              <Button type="button" onClick={agentCreateMachine ? createAgentFromModal : closeAgentSettingsModal}>
                <Check aria-hidden="true" />
                {agentCreateMachine ? "Add agent" : "Done"}
              </Button>
            </div>
          </section>
        </div>
      ) : null}

      {machineInitOpen ? (
        <div
          className={fleetClass("setupModalBackdrop")}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setMachineInitOpen(false);
          }}
        >
          <section className={fleetClass("setupModal")} role="dialog" aria-modal="true" aria-labelledby="machine-init-title">
            <div className={fleetClass("setupModalHeader")}>
              <div>
                <p className="eyebrow">Initialize machine</p>
                <h2 id="machine-init-title">New Hetzner agent box</h2>
                <p>Initializes a Hetzner VPS with the runtime agent of your choice and HivemindOS, then prepares it to join your fleet.</p>
              </div>
              <Button type="button" variant="ghost" aria-label="Close machine initializer" onClick={() => setMachineInitOpen(false)}>
                <X aria-hidden="true" />
                Close
              </Button>
            </div>

            {!machineInitStatus.result ? (
              <section className={fleetClass("machineInitEmpty")}>
                <div>
                  <strong>Connect Hetzner Cloud</strong>
                  <p>This app generates a local machine project. When you run its provision command, the script uses HCLOUD_TOKEN with Hetzner Cloud to create the VPS, then SSHes in to run the mandatory HivemindOS bootstrap.</p>
                </div>
                <label className={fleetClass("agentSettingsField")}>
                  <span>HCLOUD_TOKEN</span>
                  <input
                    type="password"
                    value={machineInitToken}
                    onChange={(event) => {
                      setMachineInitToken(event.target.value);
                      setMachineInitTokenStatus({});
                    }}
                    placeholder="Paste token"
                    autoComplete="off"
                  />
                </label>
                <div className={fleetClass("machineInitTokenActions")}>
                  <Button type="button" variant="secondary" onClick={saveHetznerToken} disabled={Boolean(machineInitTokenStatus.busyAction) || !machineInitToken.trim()}>
                    {machineInitTokenStatus.busyAction === "save" ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Check aria-hidden="true" />}
                    Save key locally
                  </Button>
                  <Button type="button" variant="ghost" onClick={openHetznerEnvFile} disabled={Boolean(machineInitTokenStatus.busyAction)}>
                    {machineInitTokenStatus.busyAction === "open" ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <FileText aria-hidden="true" />}
                    Open env file
                  </Button>
                </div>
                {machineInitTokenStatus.error || machineInitTokenStatus.message ? (
                  <p className={machineInitTokenStatus.error ? fleetClass("machineInitTokenError") : fleetClass("machineInitTokenOk")}>
                    {machineInitTokenStatus.error ?? machineInitTokenStatus.message}
                  </p>
                ) : null}
              </section>
            ) : null}

            <form className={fleetClass("machineInitForm")} onSubmit={initializeMachineProject}>
              <label className={fleetClass("agentSettingsField")}>
                <span>Machine name</span>
                <input
                  value={machineInitDraft.projectName}
                  onChange={(event) => setMachineInitDraft((current) => ({ ...current, projectName: event.target.value }))}
                  placeholder="seo-worker-1"
                  required
                />
              </label>
              <label className={fleetClass("agentSettingsField")}>
                <span>Server type</span>
                <select
                  value={machineInitDraft.serverType}
                  onChange={(event) => setMachineInitDraft((current) => ({ ...current, serverType: event.target.value }))}
                >
                  {HETZNER_SERVER_TYPE_OPTIONS.map((option) => (
                    <option value={option.value} key={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className={fleetClass("agentSettingsField")}>
                <span>Location</span>
                <select
                  value={machineInitDraft.serverLocation}
                  onChange={(event) => setMachineInitDraft((current) => ({ ...current, serverLocation: event.target.value }))}
                >
                  {HETZNER_LOCATION_OPTIONS.map((option) => (
                    <option value={option.value} key={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className={fleetClass("agentSettingsField")}>
                <span>Image</span>
                <select
                  value={machineInitDraft.serverImage}
                  onChange={(event) => setMachineInitDraft((current) => ({ ...current, serverImage: event.target.value }))}
                >
                  {HETZNER_IMAGE_OPTIONS.map((option) => (
                    <option value={option.value} key={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className={fleetClass("agentSettingsField")}>
                <span>Runtime agent</span>
                <select
                  value={machineInitDraft.runtimeAgent}
                  onChange={(event) => setMachineInitDraft((current) => ({ ...current, runtimeAgent: event.target.value as AgentRuntime }))}
                >
                  <option value="hermes">Hermes</option>
                  <option value="openclaw">OpenClaw</option>
                  <option value="aeon">Aeon</option>
                </select>
              </label>
              <div className={fleetClass("machineInitCost")}>
                <span>Estimated compute</span>
                <strong>from €{selectedHetznerServerType.monthlyEur.toFixed(2)}/mo</strong>
                <dl className={fleetClass("machineInitSpecs")} aria-label={`${selectedHetznerServerType.label} compute specs`}>
                  <div>
                    <dt>vCPU</dt>
                    <dd>{selectedHetznerServerType.cores}</dd>
                  </div>
                  <div>
                    <dt>RAM</dt>
                    <dd>{selectedHetznerServerType.memoryGb} GB</dd>
                  </div>
                  <div>
                    <dt>SSD</dt>
                    <dd>{selectedHetznerServerType.diskGb} GB</dd>
                  </div>
                  <div>
                    <dt>CPU</dt>
                    <dd>{selectedHetznerServerType.cpu}</dd>
                  </div>
                </dl>
                <p>{selectedHetznerServerType.detail}. Public IPv4, VAT, location premiums, and current availability can change; verify with the generated live Hetzner commands before provisioning.</p>
              </div>
              <div className={fleetClass("setupModalActions")}>
                <Button type="submit" disabled={machineInitStatus.busy}>
                  {machineInitStatus.busy ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Plus aria-hidden="true" />}
                  {machineInitStatus.busy ? "Initializing" : "Initialize"}
                </Button>
              </div>
            </form>

            {machineInitStatus.error ? (
              <div className={fleetClass("machineInitError")}>{machineInitStatus.error}</div>
            ) : null}

            {machineInitStatus.result ? (
              <div className={fleetClass("machineInitResult")}>
                <div>
                  <strong>{machineInitStatus.result.serverName}</strong>
                  <span>{machineInitStatus.result.projectDir}</span>
                </div>
                {[
                  ["editEnv", "Add token", machineInitStatus.result.commands.editEnv],
                  ["listServerTypes", "Server types", machineInitStatus.result.commands.listServerTypes],
                  ["listLocations", "Locations", machineInitStatus.result.commands.listLocations],
                  ["provision", "Provision", machineInitStatus.result.commands.provision],
                  ["verify", "Verify SSH", machineInitStatus.result.commands.verify],
                  ["bootstrap", "Bootstrap HivemindOS", machineInitStatus.result.commands.bootstrap],
                  ["destroy", "Destroy", machineInitStatus.result.commands.destroy],
                ].filter((item): item is [string, string, string] => Boolean(item)).map(([key, label, command]) => (
                  <div key={key} className={fleetClass("machineInitCommand")}>
                    <span>{label}</span>
                    <pre>{command}</pre>
                    <Button type="button" size="sm" variant="secondary" onClick={() => copyMachineInitCommand(key, command)}>
                      {machineInitCopiedKey === key ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                      {machineInitCopiedKey === key ? "Copied" : "Copy"}
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}
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
              {/* Progressive setup, "activating cells in a hive" — rule from the
                  design philosophy's Setup Rules section. */}
              <SetupCell
                title="Add this machine"
                subtitle="Run setup locally; add Tailscale only for multi-machine sync."
                steps={((): SetupStep[] => {
                  const tailscaleReady = Boolean((setupMachine?.ip && setupMachine.ip !== "127.0.0.1") || setupMachine?.dnsName);
                  const steps: SetupStep[] = [
                    {
                      label: "Optional: Install Tailscale",
                      hint: "Install Tailscale if you want multi-machine collaboration and shared memory; it creates a private network for your machines.",
                      state: tailscaleReady ? "done" : "pending",
                    },
                    {
                      label: "Connect",
                      hint: "Open Terminal on the machine and run the setup command.",
                      state: "current",
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
                    {
                      label: "Verify machine",
                      hint: "We auto-detect the collector once it starts.",
                      state: "pending",
                    },
                    { label: "Configure features", hint: "Wallet caps, provider keys, x402, and debug only when you need them.", state: "pending" },
                  ];
                  if (setupMachine?.collector === "ready") {
                    steps[0].state = tailscaleReady ? "done" : "pending";
                    steps[1].state = "done";
                    steps[2].state = "done";
                    steps[3].state = "current";
                  }
                  return steps;
                })()}
                details={(
                  <div className="flex flex-col gap-2 text-xs">
                    <p className="text-[var(--muted)]">
                      Tailscale is optional. Install and sign in only if you want multi-machine collaboration and shared memory; without it, setup continues in local-only mode.
                    </p>
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
