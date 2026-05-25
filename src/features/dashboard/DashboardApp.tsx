// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type PointerEvent } from "react";
import Image from "next/image";
import {
  Activity,
  AlignLeft,
  Bell,
  Bot,
  BrainCircuit,
  Check,
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
  ExternalLink,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  FileUp,
  GitBranch,
  HandCoins,
  Hexagon,
  KanbanSquare,
  KeyRound,
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
import type { RecentDirectory } from "@/lib/types/recent-directories";
import type { MiroSharkAnalysisMode, MiroSharkIntelligence } from "@/lib/services/miroshark/run-intelligence";
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
  stripUnfundedWalletBalance,
} from "@/lib/utils/agent-wallet";
import { groupKanbanTasks } from "@/lib/utils/kanban-board";
import {
  beeRoleLabel,
  beeWorkerClassLabel,
  chooseBeeAssignment,
} from "@/lib/services/orchestration/bee-roles";
import chatStyles from "@/app/chat.module.css";
import fleetStyles from "@/app/fleet.module.css";
import kanbanStyles from "@/app/kanban-board.module.css";
import notificationStyles from "@/app/notifications.module.css";
import vaultStyles from "@/app/vault.module.css";
import walletStyles from "@/app/wallets.module.css";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AttachmentListMenuContent,
  AttachmentMenuContent,
  AgentResponseLoader,
  attachmentSizeLabel,
  attachmentSummary,
  chatDisplayContent,
  cleanActivityTitle,
  ComposerField,
  linkedDirectoryLabel,
  MessageAttachments,
  messageContentParts,
  pickLinkedDirectory,
  readComposerFiles,
  speechRecognitionConstructor,
  type SpeechRecognitionLike,
} from "@/features/chat/chat-composer";
import { Cell } from "@/components/cells/Cell";
import { CellMenu } from "@/components/cells/CellMenu";
import type { CellMenuItem } from "@/components/cells/CellMenu";
import type { AgentTaskRow } from "@/components/cells/AgentTaskList";
import type { SetupStep } from "@/components/cells/SetupCell";
import type { FleetAgentChat, FleetAlert, FleetMachine, FleetTask } from "@/components/fleet";
import type { SchedulerJob, SchedulerRunPhase, SchedulerRunState } from "@/components/scheduler";
import type { NewTaskPayload } from "@/components/task-modal";
import type { SwarmAgent, SwarmDecision, SwarmMarket, SwarmRun, SwarmSocialPost, SwarmTemplate, TemplateId } from "@/components/swarm";
import {
  AgentCell,
  AgentTaskList,
  AgentWalletCard,
  AgentWalletCardCompact,
  FleetView,
  MachineCell,
  MemoryCell,
  SchedulerView,
  SetupCell,
  SwarmView,
  TaskModal,
} from "@/features/dashboard/lazy-components";
import { ChatMarkdown } from "@/features/dashboard/ChatMarkdown";
import { MorePanel } from "@/features/dashboard/MorePanel";
import {
  chatDedupeKey,
  chatFolderLabel,
  chatPreviewDedupeKey,
  chatSetupIssue,
  dedupeAgents,
  extractKanbanVisualBrief,
  formatDurationShort,
  formatMessageTimestamp,
  inferCurrentTask,
  inferLatestAgentMessage,
  isHermesAuthFailure,
  isInternalHermesSessionPrelude,
  isKanbanAwaitingAgentUpdate,
  isKanbanTerminalMessage,
  isStarterPlaceholder,
  isTransientDelegationMessage,
  kanbanCardMessage,
  kanbanEventLabel,
  KANBAN_STEER_TARGETS,
  kanbanReadyPickupSignature,
  kanbanTaskAssigneeAgent,
  kanbanTaskAssignmentForAgent,
  kanbanTaskBee,
  kanbanTaskDispatchPrompt,
  kanbanTaskInterruptPrompt,
  parentPathFromPath,
  preferChatTreeItem,
  simpleStableHash,
  viewIcon,
  wait,
  workspaceLabelFromPath,
} from "@/features/dashboard/dashboard-light-helpers";
import {
  BrainGraphLoader,
  brainGraphEdgePath,
  brainGraphLayout,
  brainNodePoints,
  fleetAgentState,
  fleetMachineLocation,
  fleetMetric,
  fleetVersionState,
  formatBrainDate,
  friendlyEmptyTitle,
  isCollectorAutoUpdateable,
  localDashboardHasUnpublishedChanges,
  machineNeedsChatBridgeRepair,
  machineNeedsEnvHttpSyncRepair,
  machineNeedsSkillSyncRepair,
  machineNetworkIssue,
  machineVersionCopy,
  mergeDiscoveredMachines,
  mergeSnapshotRecord,
  setupCollectorCommand,
  splitBrainLabel,
} from "@/features/dashboard/dashboard-display-helpers";
import { createStyleClass } from "@/features/dashboard/style-classes";
import type { DashboardGBrainStatus } from "@/features/dashboard/dashboard-types";
import type { WorkHistoryPayload } from "@/lib/types/work-history";
import {
  compactDiagnosticPreview,
  isKanbanStaleWorkingTask,
  isManualAgentChatMessage,
  kanbanNoAssistantStalledDetail,
  kanbanStaleAge,
  kanbanToolOutputStalledDetail,
  summarizeKanbanToolOutput,
} from "@/features/kanban/kanban-diagnostics";
import {
  groupNotifications,
  notificationActorMeta,
  notificationDisplayBody,
  notificationDisplayTitle,
  notificationSourceLabel,
  summarizeHermesAuthError,
} from "@/features/notifications/notification-display";
import { NotificationsPanel } from "@/features/notifications/NotificationsPanel";
import {
  agentAliasMap,
  agentWorkspaceKey,
  collectorKey,
  displayMachineName,
  isLoopbackCollector,
  isMobileMachineOs,
  isVisibleFleetMachine,
  machineIdentityFromParts,
  renderAgentKey,
} from "@/features/fleet/fleet-identity";
import {
  AgentEnvCard,
  chatLeafFromStorageKey,
  chatMessageStorageKey,
  chatSeedMessagesForTask,
  chatTaskMatchKey,
  createChatLeafKey,
  EnvValueRow,
  findRosterChatTask,
  formatAgentEnvText,
  hermesRuntimeSessionIdFromTask,
  isChatSidebarTask,
  isMeaningfulActive,
  parseAgentEnvText,
  parseEnvImportText,
  randomEnvSecret,
  runtimeSessionForChat,
  taskChatLeafKey,
  workPriority,
} from "@/features/env/env-components";
import {
  customWorkerProfileFromDraft,
  defaultWorkerClassDraft,
  formatHiveAmount,
  formatRelativeTime,
  HERMES_UPDATE_INTEGRATION_KEYS,
  hermesUpdateDetail,
  mergeMachineNameAliases,
  normalizeAgentProfile,
  parseStoredAgents,
  parseStoredChatFolders,
  parseStoredChatMessages,
  parseStoredDiscoveredMachines,
  parseStoredHoneyLedgerEnabled,
  parseStoredHoneyTreasury,
  parseStoredMachineNameAliases,
  parseStoredSchedules,
  parseStoredTasks,
  parseStoredVault,
  parseStoredWallets,
  readStoredValue,
  runtimeCan,
  runtimeCapabilities,
  runtimeCount,
  runtimeSetupDefinition,
  seedAgents,
  skillRequiresHermesUpdate,
  workerCapabilityBadges,
} from "@/features/dashboard/dashboard-storage";
import {
  HETZNER_IMAGE_OPTIONS,
  HETZNER_LOCATION_OPTIONS,
  HETZNER_SERVER_TYPE_OPTIONS,
} from "@/features/fleet/machine-init-options";
import {
  SCHEDULE_PRESETS,
  SCHEDULER_DYNAMIC_SKILL_ACTIONS_ENABLED,
  SCHEDULER_HERMES_SKILL_CONTEXT_ENABLED,
  SCHEDULER_MODEL_OPTIONS,
} from "@/features/scheduler/scheduler-options";
import {
  composeMirosharkTemplateScenario,
  defaultMirosharkTemplateInputs,
  MIROSHARK_TEMPLATE_INPUTS,
  SWARM_LAUNCH_PRESETS,
  type MiroSharkTemplate,
  type MiroSharkTemplateInputState,
} from "@/features/swarm/miroshark-templates";
import {
  asRecord,
  compactValue,
  getMiroSharkPosts,
  getMiroSharkRunStatus,
  getMiroSharkTemplates,
  isEmptyIntegrationPayload,
  isMiroSharkRunTerminal,
  isUnpublishedSimulationPayload,
  payloadArray,
  payloadCount,
  payloadData,
  payloadPreview,
} from "@/features/swarm/miroshark-payload";
import {
  mirosharkHandle,
  mirosharkStat,
  mirosharkUserName,
  numericRecordValue,
  swarmEventItem,
  swarmMarketEventItem,
  swarmMarketFromItems,
  swarmMarketPriceEventItem,
  swarmRunState,
  swarmTemplateIdFromMirosharkTemplate,
  swarmTemplateIdFromSurface,
} from "@/features/swarm/swarm-transformers";

import { useMirosharkBrainController } from "@/features/dashboard/hooks/use-miroshark-brain-controller";
import { useDashboardPollingEffects } from "@/features/dashboard/hooks/use-dashboard-polling-effects";
import { useDashboardDerivedState } from "@/features/dashboard/hooks/use-dashboard-derived-state";
import { useAgentController } from "@/features/dashboard/hooks/use-agent-controller";
import { useSchedulerController } from "@/features/dashboard/hooks/use-scheduler-controller";
import { useWalletFilesController } from "@/features/dashboard/hooks/use-wallet-files-controller";
import { useChatTreeController } from "@/features/dashboard/hooks/use-chat-tree-controller";
import { useFleetNotificationsController } from "@/features/dashboard/hooks/use-fleet-notifications-controller";
import { useKanbanTaskController } from "@/features/dashboard/hooks/use-kanban-task-controller";
import { useKanbanDispatchController } from "@/features/dashboard/hooks/use-kanban-dispatch-controller";
import { useStatusChatInputController } from "@/features/dashboard/hooks/use-status-chat-input-controller";
import { useAgentSettingsController } from "@/features/dashboard/hooks/use-agent-settings-controller";
import { DashboardHeader } from "@/features/dashboard/views/DashboardHeader";
import { AgentsPanel } from "@/features/dashboard/views/AgentsPanel";
import { KanbanPanel } from "@/features/dashboard/views/KanbanPanel";
import { SchedulerPanel } from "@/features/dashboard/views/SchedulerPanel";
import { SwarmPanel } from "@/features/dashboard/views/SwarmPanel";
import { WalletPanel } from "@/features/dashboard/views/WalletPanel";
import { VaultPanel } from "@/features/dashboard/views/VaultPanel";
import { UtilityPanels } from "@/features/dashboard/views/UtilityPanels";
import { ChatPanel } from "@/features/dashboard/views/ChatPanel";
import { DashboardModals } from "@/features/dashboard/views/DashboardModals";
import NangoIntegrationsView from "@/features/integrations/NangoIntegrationsView";
const kanbanClass = createStyleClass(kanbanStyles);
const fleetClass = createStyleClass(fleetStyles);
const chatClass = createStyleClass(chatStyles);
const notificationClass = createStyleClass(notificationStyles);
const vaultClass = createStyleClass(vaultStyles);
const walletClass = createStyleClass(walletStyles);
const BRAIN_SKILL_PROVIDER_FALLBACK: BrainSkillProviderInventory[] = [
  { id: "claude", label: "Claude", home: "~/.claude", skills: [], installed: false },
  { id: "codex", label: "Codex", home: "~/.codex", skills: [], installed: false },
  { id: "hermes", label: "Hermes", home: "~/.hermes", skills: [], installed: false },
  { id: "gemini", label: "Gemini", home: "~/.gemini", skills: [], installed: false },
  { id: "openclaw", label: "OpenClaw", home: "~/.openclaw", skills: [], installed: false },
  { id: "aeon", label: "Aeon", home: "~/.aeon", skills: [], installed: false },
];
function isWorkView(view: DashboardView): view is WorkView {
  return view === "kanban" || view === "scheduler" || view === "swarm" || view === "history";
}

const DASHBOARD_VIEWS = new Set<DashboardView>([
  "agents",
  "kanban",
  "scheduler",
  "swarm",
  "history",
  "wallet",
  "vault",
  "integrations",
  "maintenance",
  "files",
  "notifications",
  "chat",
  "more",
  "env",
]);

function dashboardViewFromLocation(): DashboardView | null {
  if (typeof window === "undefined") return null;
  const view = new URLSearchParams(window.location.search).get("view");
  return view && DASHBOARD_VIEWS.has(view as DashboardView) ? view as DashboardView : null;
}

function initialDashboardView(): DashboardView {
  return dashboardViewFromLocation() ?? "agents";
}

const STORAGE_KEY = "hivemindos.agentProfiles.v1";
const VAULT_STORAGE_KEY = "hivemindos.sharedVault.v1";
const TASK_STORAGE_KEY = "hivemindos.agentTasks.v1";
const SCHEDULE_STORAGE_KEY = "hivemindos.agentSchedules.v1";
const WALLET_STORAGE_KEY = "hivemindos.agentWallets.v1";
const HONEY_LEDGER_ENABLED_STORAGE_KEY = "hivemindos.honeyLedger.enabled.v1";
const THEME_STORAGE_KEY = "hivemindos.theme.v1";
const CHAT_MESSAGES_STORAGE_KEY = "hivemindos.chatMessages.v1";
const CHAT_FOLDER_STORAGE_KEY = "hivemindos.chatFolders.v1";
const MACHINE_NAME_ALIAS_STORAGE_KEY = "hivemindos.machineNameAliases.v1";
const CHAT_RESPONSE_STALL_TIMEOUT_MS = 130 * 1000;
const DISCOVERED_MACHINES_STORAGE_KEY = "hivemindos.discoveredMachines.v1";
const KANBAN_TOOL_OUTPUT_STALL_MS = 5 * 60 * 1000;
const KANBAN_NO_ASSISTANT_STALL_MS = 2 * 60 * 1000;
const KANBAN_NO_ASSISTANT_QUIET_MS = 90 * 1000;
const KANBAN_DISPATCH_NO_PROGRESS_MS = 75 * 1000;
const KANBAN_SESSION_POLL_FAILURE_LIMIT = 3;
const KANBAN_STALE_AGENT_COOLDOWN_MS = 20 * 60 * 1000;
const KANBAN_PICKUP_PREVIEW_MS = 1_000;
const SCHEDULER_RUN_STALE_MS = 30_000;
const BRAIN_GRAPH_CLIENT_CACHE_MS = 30_000;
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
  machineNameAliases: ".machineNameAliases.v1",
};
type DashboardAppProps = {
  initialView?: DashboardView;
  initialVaultPanelMode?: DashboardVaultPanelMode;
  initialWorkHistory?: WorkHistoryPayload;
};

export type DashboardVaultPanelMode = "hive-vault" | "shared-skills" | "brain-services" | "config";

export default function DashboardApp({ initialView, initialVaultPanelMode, initialWorkHistory }: DashboardAppProps = {}) {
  // Initialize all persisted state with deterministic seed values so SSR and
  // first client render match. localStorage is read inside a useEffect below.
  const [hydrated, setHydrated] = useState(false);
  const [agents, setAgents] = useState<AgentProfile[]>(seedAgents);
  const [selectedAgentId, setSelectedAgentId] = useState(() => seedAgents()[0]?.id ?? "");
  const [walletExpanded, setWalletExpanded] = useState(false);
  const [text, setText] = useState("");
  const [chatAttachments, setChatAttachments] = useState<ChatAttachment[]>([]);
  const [chatDirectories, setChatDirectories] = useState<LinkedDirectory[]>([]);
  const [attachmentError, setAttachmentError] = useState("");
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [recentDirectories, setRecentDirectories] = useState<RecentDirectory[]>([]);
  const [recentDirectoriesExpanded, setRecentDirectoriesExpanded] = useState(false);
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
  const [gbrainStatus, setGbrainStatus] = useState<DashboardGBrainStatus | null>(null);
  const [gbrainActionStatus, setGbrainActionStatus] = useState("");
  const [gbrainBusy, setGbrainBusy] = useState("");
  const [gbrainQuery, setGbrainQuery] = useState("");
  const [gbrainQueryResult, setGbrainQueryResult] = useState("");
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
  const [walletPanelMode, setWalletPanelMode] = useState<"wallets" | "usage">("wallets");
  const [vaultPanelMode, setVaultPanelMode] = useState<DashboardVaultPanelMode>(initialVaultPanelMode ?? "hive-vault");
  const [moneyClawStatusByEnvName, setMoneyClawStatusByEnvName] = useState<Record<string, WalletMoneyClawStatus>>({});
  const [moneyClawLoadingEnvName, setMoneyClawLoadingEnvName] = useState("");
  const [walletVaultBackupStatus, setWalletVaultBackupStatus] = useState<WalletVaultBackupStatus | null>(null);
  const [walletVaultBackupBusy, setWalletVaultBackupBusy] = useState("");
  const [walletVaultBackupMessage, setWalletVaultBackupMessage] = useState("");
  const [runtimeUsage, setRuntimeUsage] = useState<RuntimeUsageAnalytics | null>(null);
  const [runtimeUsageLoading, setRuntimeUsageLoading] = useState(false);
  const [maintenanceReport, setMaintenanceReport] = useState<MaintenanceReport | null>(null);
  const [maintenanceBusy, setMaintenanceBusy] = useState("");
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [runtimeFileRoots, setRuntimeFileRoots] = useState<RuntimeFileRoot[]>([]);
  const [runtimeFileRootKey, setRuntimeFileRootKey] = useState("");
  const [runtimeFilePath, setRuntimeFilePath] = useState("");
  const [runtimeFiles, setRuntimeFiles] = useState<RuntimeFileEntry[]>([]);
  const [runtimeFileOpen, setRuntimeFileOpen] = useState<RuntimeFilePayload["file"] | null>(null);
  const [runtimeFileDraft, setRuntimeFileDraft] = useState("");
  const [runtimeFileStatus, setRuntimeFileStatus] = useState("");
  const [hiveEnv, setHiveEnv] = useState<HiveEnvPayload | null>(null);
  const [hiveEnvLoading, setHiveEnvLoading] = useState(false);
  const [hiveEnvRestoring, setHiveEnvRestoring] = useState(false);
  const [hiveEnvSyncing, setHiveEnvSyncing] = useState(false);
  const [hiveEnvStatus, setHiveEnvStatus] = useState("");
  const [hiveEnvSavingKey, setHiveEnvSavingKey] = useState("");
  const [hiveEnvRuntimeSourceId, setHiveEnvRuntimeSourceId] = useState("runtime-hermes");
  const [sharedEnvDraft, setSharedEnvDraft] = useState({ key: "", value: "" });
  const [sharedEnvEditable, setSharedEnvEditable] = useState(false);
  const [sharedEnvAddMenuOpen, setSharedEnvAddMenuOpen] = useState(false);
  const [sharedEnvImportOpen, setSharedEnvImportOpen] = useState(false);
  const [sharedEnvImportText, setSharedEnvImportText] = useState("");
  const [sharedEnvImporting, setSharedEnvImporting] = useState(false);
  const [agentEnvDrafts, setAgentEnvDrafts] = useState<Record<string, { key: string; value: string }>>({});
  const [revealedEnvValues, setRevealedEnvValues] = useState<Record<string, boolean>>({});
  const [fleetSnapshots, setFleetSnapshots] = useState<Record<string, AgentSnapshot>>({});
  const [fleetCheckedAt, setFleetCheckedAt] = useState<number | null>(null);
  const [tailscaleDevices, setTailscaleDevices] = useState<TailscaleDevice[]>([]);
  const [tailscaleStatus, setTailscaleStatus] = useState("Checking Tailnet...");
  const [hivemindLinkStatus, setHivemindLinkStatus] = useState<HivemindLinkClientStatus | null>(null);
  const [hivemindLinkBannerDismissed, setHivemindLinkBannerDismissed] = useState(false);
  const [hivemindLinkConnectedUntil, setHivemindLinkConnectedUntil] = useState(0);
  const [hivemindLinkSignInPolling, setHivemindLinkSignInPolling] = useState(false);
  const [discoveredMachines, setDiscoveredMachines] = useState<DiscoveredMachine[]>([]);
  const [machineNameAliases, setMachineNameAliases] = useState<Record<string, string>>({});
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
    provider?: string;
    model?: string;
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
    provider: "openai-codex",
    model: "",
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
  const [duplicateAgentDraft, setDuplicateAgentDraft] = useState<DuplicateAgentDraft | null>(null);
  const [runtimeIntegrationStatus, setRuntimeIntegrationStatus] = useState<RuntimeIntegrationStatus | null>(null);
  const [runtimeModelSelectionsByRuntime, setRuntimeModelSelectionsByRuntime] = useState<Partial<Record<AgentRuntime, NonNullable<RuntimeIntegrationStatus["modelSelection"]>>>>({});
  const [runtimeIntegrationBusy, setRuntimeIntegrationBusy] = useState("");
  const [runtimeIntegrationMessage, setRuntimeIntegrationMessage] = useState("");
  const [runtimeUpdateConfirmKey, setRuntimeUpdateConfirmKey] = useState<RuntimeIntegrationKey | "">("");
  const [runtimeSetupKey, setRuntimeSetupKey] = useState<RuntimeIntegrationKey | "">("");
  const [runtimeSessionQuery, setRuntimeSessionQuery] = useState("");
  const [runtimeSessionResults, setRuntimeSessionResults] = useState<RuntimeSessionSearchResult[]>([]);
  const [runtimeBackgroundPrompt, setRuntimeBackgroundPrompt] = useState("");
  const [runtimeModelSetupMode, setRuntimeModelSetupMode] = useState<"provider" | "model" | null>(null);
  const [runtimeModelDraft, setRuntimeModelDraft] = useState({ provider: "", model: "", contextLength: "" });
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
  const [kanbanCardAttachmentListOpen, setKanbanCardAttachmentListOpen] = useState<Record<string, boolean>>({});
  const [kanbanCardAttachmentTargetId, setKanbanCardAttachmentTargetId] = useState("");
  const [quickAddAttachmentError, setQuickAddAttachmentError] = useState("");
  const [quickAddAttachmentMenuOpen, setQuickAddAttachmentMenuOpen] = useState(false);
  const [kanbanCardRecentsExpanded, setKanbanCardRecentsExpanded] = useState<Record<string, boolean>>({});
  const [selectedKanbanTaskIds, setSelectedKanbanTaskIds] = useState<Record<string, boolean>>({});
  const [kanbanBulkAssignee, setKanbanBulkAssignee] = useState("");
  const [kanbanBulkPending, setKanbanBulkPending] = useState(false);
  const [machineDirectoryBrowser, setMachineDirectoryBrowser] = useState<MachineDirectoryBrowser | null>(null);
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
  const [mirosharkAnalysisAgentId, setMirosharkAnalysisAgentId] = useState("");
  const [mirosharkAnalysisPending, setMirosharkAnalysisPending] = useState<MiroSharkAnalysisMode | "">("");
  const [mirosharkAnalysisStatus, setMirosharkAnalysisStatus] = useState("");
  const [mirosharkAnalysisResult, setMirosharkAnalysisResult] = useState<{
    message?: string;
    notePath?: string;
    intelligence?: MiroSharkIntelligence;
  } | null>(null);
  const [mirosharkHelperPending, setMirosharkHelperPending] = useState<"ask" | "suggest" | "">("");
  const [mirosharkHelperStatus, setMirosharkHelperStatus] = useState("");
  const [activeView, setActiveView] = useState<DashboardView>(initialView ?? initialDashboardView);
  const [dashboardTheme, setDashboardTheme] = useState<DashboardTheme>("dark");
  const [busy, setBusy] = useState(false);
  const [busyAgentId, setBusyAgentId] = useState("");

  const [hasStreamingChunk, setHasStreamingChunk] = useState(false);
  const [chatMessageWindow, setChatMessageWindow] = useState<{ agentId: string; limit: number } | null>(null);
  const [selectedChatLeafKey, setSelectedChatLeafKey] = useState("");
  const [selectedChatRuntimeSessionId, setSelectedChatRuntimeSessionId] = useState("");
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
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const chatAutoScrollRef = useRef(true);
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
  const hivemindLinkStatusRef = useRef<HivemindLinkClientStatus | null>(null);
  const hivemindLinkConnectedTimeoutRef = useRef<number | null>(null);
  const hivemindLinkSignInPollingRef = useRef(false);
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
  const applyHivemindLinkStatus = useCallback((status: HivemindLinkClientStatus | null) => {
    const previous = hivemindLinkStatusRef.current;
    const reachedRunning = status?.ok === true && previous?.ok !== true;
    const wasWaitingForSignIn = Boolean(previous?.authUrl) || hivemindLinkSignInPollingRef.current;
    hivemindLinkStatusRef.current = status;
    setHivemindLinkStatus(status);
    if (status) {
      setTailscaleStatus(status.ok
        ? "Hivemind Link connected"
        : `Hivemind Link ${status.backendState ?? "not connected"}`);
    }
    if (status?.ok === true) {
      hivemindLinkSignInPollingRef.current = false;
      setHivemindLinkSignInPolling(false);
    }
    if (reachedRunning && wasWaitingForSignIn) {
      setHivemindLinkBannerDismissed(false);
      setHivemindLinkConnectedUntil(Date.now() + 10_000);
      if (hivemindLinkConnectedTimeoutRef.current) {
        window.clearTimeout(hivemindLinkConnectedTimeoutRef.current);
      }
      hivemindLinkConnectedTimeoutRef.current = window.setTimeout(() => {
        setHivemindLinkConnectedUntil(0);
      }, 10_000);
    }
  }, []);
  const refreshTailscaleDevices = useCallback(async () => {
    const response = await fetch("/api/tailscale/devices", { cache: "no-store" }).catch(() => null);
    const data = await response?.json().catch(() => null) as {
      ok?: boolean;
      backendState?: string;
      authUrl?: string;
      source?: string;
      devices?: TailscaleDevice[];
      error?: string;
    } | null;
    setTailscaleDevices(data?.devices ?? []);
    if (data?.source === "hivemind-link") {
      applyHivemindLinkStatus({
        ok: data.ok,
        backendState: data.backendState,
        authUrl: data.authUrl,
        source: data.source,
      });
      return;
    }
    applyHivemindLinkStatus(null);
    setTailscaleStatus(data?.ok ? `Tailscale ${data.backendState}` : "Tailscale not configured. Running locally.");
  }, [applyHivemindLinkStatus]);
  const refreshHoneyLedgerRef = useRef(null);
  const refreshMoneyClawStatusRef = useRef(null);
  const observeHoneyUsageRef = useRef(null);
  const refreshRuntimeIntegrationsRef = useRef(null);
  const refreshSharedSchedulesFromVaultRef = useRef(null);
  const schedulerVaultAutoSyncKeyRef = useRef("");
  const updateAgentProfileRef = useRef(null);
  const dispatchKanbanTaskToAgentRef = useRef(null);
  const refreshHoneyLedger = useCallback((...args: any[]) => refreshHoneyLedgerRef.current?.(...args) ?? Promise.resolve(undefined), []);
  const refreshMoneyClawStatus = useCallback((...args: any[]) => refreshMoneyClawStatusRef.current?.(...args) ?? Promise.resolve(undefined), []);
  const observeHoneyUsage = useCallback((...args: any[]) => observeHoneyUsageRef.current?.(...args) ?? Promise.resolve(undefined), []);
  const refreshRuntimeIntegrations = useCallback((...args: any[]) => refreshRuntimeIntegrationsRef.current?.(...args) ?? Promise.resolve(undefined), []);
  const refreshSharedSchedulesFromVault = useCallback((...args: any[]) => refreshSharedSchedulesFromVaultRef.current?.(...args) ?? Promise.resolve(undefined), []);
  const updateAgentProfile = useCallback((...args: any[]) => updateAgentProfileRef.current?.(...args), []);
  const refreshHiveEnv = useCallback(async () => {
    setHiveEnvLoading(true);
    setHiveEnvStatus("");
    try {
      const response = await fetch("/api/env", { cache: "no-store" }).catch(() => null);
      const data = await response?.json().catch(() => null) as HiveEnvPayload | null;
      if (!response?.ok || !data?.ok) {
        setHiveEnvStatus(data?.error ?? "Could not read hive-env-add variables.");
        return;
      }
	      setHiveEnv(data);
	      const sharedCount = Object.keys(data.sharedSource?.values ?? {}).length;
	      const backupCopy = data.backupStatus?.backupExists ? " Encrypted backup is available." : " No encrypted backup found yet.";
	      setHiveEnvStatus(`Loaded ${sharedCount} shared env variable${sharedCount === 1 ? "" : "s"}.${backupCopy}`);
	    } finally {
	      setHiveEnvLoading(false);
	    }
	  }, []);
  const toggleEnvValue = useCallback((key: string) => {
    setRevealedEnvValues((current) => ({ ...current, [key]: !current[key] }));
  }, []);
  const saveSharedEnvValue = useCallback(async (source: HiveEnvSource, key: string, value: string, previousValue: string) => {
    if (value === previousValue) return;
    const savingKey = `shared:${source.id}:${key}`;
    setHiveEnvSavingKey(savingKey);
    setHiveEnvStatus(`Saving ${key}...`);
    try {
      const response = await fetch("/api/env", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: source.id, key, value }),
      }).catch(() => null);
      const data = await response?.json().catch(() => null) as HiveEnvPayload | null;
      if (!response?.ok || !data?.ok || !data.sharedSource) {
        setHiveEnvStatus(data?.error ?? `Could not save ${key}.`);
        return;
      }
	      setHiveEnv(data);
	      setHiveEnvStatus(value === "" ? `Removed ${key} with hive-env-add.` : `Saved ${key} with hive-env-add.`);
	    } finally {
	      setHiveEnvSavingKey("");
	    }
	  }, []);
  const saveAgentEnvValue = useCallback((agent: AgentProfile, key: string, value: string, previousValue: string) => {
    if (value === previousValue) return;
    const nextEnv = { ...(agent.agentEnv ?? {}) };
    if (value === "") delete nextEnv[key];
    else nextEnv[key] = value;
    updateAgentProfile(agent.id, {
      agentEnv: nextEnv,
    });
    setHiveEnvStatus(value === "" ? `Removed ${key} for ${agent.name}.` : `Saved ${key} for ${agent.name}.`);
  }, []);
	  const addSharedEnvValue = useCallback(async () => {
	    const key = sharedEnvDraft.key.trim();
	    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      setHiveEnvStatus("Use a valid env name like ANTHROPIC_API_KEY.");
      return;
    }
    await saveSharedEnvValue(hiveEnv?.sharedSource ?? {
      id: "shared",
      label: "Shared sync store",
      scope: "agent",
      runtime: "generic",
      values: {},
    }, key, sharedEnvDraft.value, "");
	    setSharedEnvDraft({ key: "", value: "" });
	  }, [hiveEnv?.sharedSource, saveSharedEnvValue, sharedEnvDraft.key, sharedEnvDraft.value]);
	  const generateSharedEnvSecret = useCallback(() => {
	    setSharedEnvDraft((current) => ({ ...current, value: randomEnvSecret() }));
	    setSharedEnvEditable(true);
	    setSharedEnvAddMenuOpen(false);
	    setHiveEnvStatus("Generated a secret value. Add a key name, then set it.");
	  }, []);
	  const importSharedEnvEntries = useCallback(async () => {
	    const entries = parseEnvImportText(sharedEnvImportText, hiveEnv?.sharedSource?.values ?? {}).entries.filter((entry) => entry.status !== "same");
	    if (!entries.length) {
	      setHiveEnvStatus("No new or changed env variables found.");
	      return;
	    }
	    setSharedEnvImporting(true);
	    setHiveEnvStatus(`Importing ${entries.length} env variable${entries.length === 1 ? "" : "s"}...`);
	    try {
	      const response = await fetch("/api/env", {
	        method: "POST",
	        headers: { "Content-Type": "application/json" },
	        body: JSON.stringify({
	          sourceId: hiveEnv?.sharedSource?.id ?? "shared",
	          entries: Object.fromEntries(entries.map((entry) => [entry.key, entry.value])),
	        }),
	      }).catch(() => null);
	      const data = await response?.json().catch(() => null) as HiveEnvPayload | null;
	      if (!response?.ok || !data?.ok || !data.sharedSource) {
	        setHiveEnvStatus(data?.error ?? "Could not import env variables.");
	        return;
	      }
	      setHiveEnv(data);
	      setSharedEnvImportText("");
	      setSharedEnvImportOpen(false);
	      setSharedEnvEditable(false);
	      setHiveEnvStatus(`Imported ${entries.length} env variable${entries.length === 1 ? "" : "s"} with hive-env-add.`);
	    } finally {
	      setSharedEnvImporting(false);
	    }
	  }, [hiveEnv?.sharedSource?.id, hiveEnv?.sharedSource?.values, sharedEnvImportText]);
  const promoteRuntimeEnvValue = useCallback(async (source: HiveEnvSource, key: string, value: string) => {
    const savingKey = `promote:${source.id}:${key}`;
    setHiveEnvSavingKey(savingKey);
    setHiveEnvStatus(`Adding ${key} to shared env...`);
    try {
      const response = await fetch("/api/env", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: source.id, key, value, promoteToShared: true }),
      }).catch(() => null);
      const data = await response?.json().catch(() => null) as HiveEnvPayload | null;
      if (!response?.ok || !data?.ok || !data.sharedSource) {
        setHiveEnvStatus(data?.error ?? `Could not add ${key} to shared env.`);
        return;
      }
	      setHiveEnv(data);
	      setHiveEnvStatus(`Added ${key} to shared env with hive-env-add.`);
	    } finally {
	      setHiveEnvSavingKey("");
	    }
	  }, []);
	  const restoreSharedEnvBackup = useCallback(async () => {
	    setHiveEnvRestoring(true);
	    setHiveEnvStatus("Restoring encrypted shared env backup...");
	    try {
	      const response = await fetch("/api/env", {
	        method: "POST",
	        headers: { "Content-Type": "application/json" },
	        body: JSON.stringify({ action: "restoreBackup" }),
	      }).catch(() => null);
	      const data = await response?.json().catch(() => null) as HiveEnvPayload | null;
	      if (!response?.ok || !data?.ok || !data.sharedSource) {
	        setHiveEnvStatus(data?.error ?? "Could not restore encrypted shared env backup.");
	        return;
	      }
	      setHiveEnv(data);
	      const sharedCount = Object.keys(data.sharedSource.values ?? {}).length;
	      setHiveEnvStatus(`Restored ${sharedCount} shared env variable${sharedCount === 1 ? "" : "s"} from encrypted backup with hive-env-add.`);
	    } finally {
	      setHiveEnvRestoring(false);
	    }
	  }, []);
	  const syncSharedEnvMachines = useCallback(async () => {
	    setHiveEnvSyncing(true);
	    setHiveEnvStatus("Syncing shared env with machines...");
	    try {
	      const response = await fetch("/api/env", {
	        method: "POST",
	        headers: { "Content-Type": "application/json" },
	        body: JSON.stringify({ action: "syncMachines" }),
	      }).catch(() => null);
	      const data = await response?.json().catch(() => null) as HiveEnvPayload | null;
	      if (!response?.ok || !data?.ok || !data.sharedSource) {
	        setHiveEnvStatus(data?.error ?? "Could not sync shared env with machines.");
	        return;
	      }
	      setHiveEnv(data);
	      const sharedCount = Object.keys(data.sharedSource.values ?? {}).length;
	      setHiveEnvStatus(`Synced ${sharedCount} shared env variable${sharedCount === 1 ? "" : "s"} with machines.`);
	    } finally {
	      setHiveEnvSyncing(false);
	    }
	  }, []);
  const addAgentEnvValue = useCallback((agent: AgentProfile) => {
    const draft = agentEnvDrafts[agent.id] ?? { key: "", value: "" };
    const key = draft.key.trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      setHiveEnvStatus("Use a valid agent env name like WRITER_STYLE.");
      return;
    }
    updateAgentProfile(agent.id, {
      agentEnv: {
        ...(agent.agentEnv ?? {}),
        [key]: draft.value,
      },
    });
    setAgentEnvDrafts((current) => ({ ...current, [agent.id]: { key: "", value: "" } }));
    setHiveEnvStatus(`Added ${key} for ${agent.name}.`);
  }, [agentEnvDrafts]);
  // Hydrate persisted state on the client after the first render. Reading
  // localStorage inside useState init would diverge from SSR and trigger
  // a hydration mismatch — this is the canonical pattern to avoid it,
  // even though the lint rule flags setState-in-effect in general.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const storedAgents = parseStoredAgents();
    setAgents(storedAgents);
    setSelectedAgentId((current: string) => (
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
    setMachineNameAliases(parseStoredMachineNameAliases());
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
            const wallet = stripUnfundedWalletBalance(record.wallet);
            const remoteMs = wallet.updatedAt ?? 0;
            const localMs = existing?.updatedAt ?? 0;
            if (!existing || remoteMs > localMs) {
              next[record.agentId] = wallet;
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
    if (!hydrated) return;
    window.localStorage.setItem(MACHINE_NAME_ALIAS_STORAGE_KEY, JSON.stringify(machineNameAliases));
  }, [hydrated, machineNameAliases]);
  useEffect(() => {
    if (!hydrated || !sharedVault.enabled) return;
    const vaultPath = sharedVault.vaultPath.trim();
    let cancelled = false;
    const params = vaultPath ? `?vaultPath=${encodeURIComponent(vaultPath)}` : "";
    void fetch(`/api/obsidian/machine-aliases${params}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data: { aliases?: Record<string, string> } | null) => {
        if (cancelled || !data?.aliases) return;
        setMachineNameAliases((current) => mergeMachineNameAliases(current, data.aliases ?? {}));
      })
      .catch(() => { /* shared vault aliases are optional */ });
    return () => { cancelled = true; };
  }, [hydrated, sharedVault.enabled, sharedVault.vaultPath]);
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
      && !Object.values(kanbanCardAttachmentListOpen).some(Boolean)
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
      setKanbanCardAttachmentListOpen({});
      setKanbanSteerAttachmentMenuOpen(false);
    }
    function closeAttachmentMenuOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setAttachmentMenuOpen(false);
        setQuickAddAttachmentMenuOpen(false);
        setQuickAddMachineMenuOpen({});
        setKanbanCardMachineMenuOpen({});
        setKanbanCardAttachmentMenuOpen({});
        setKanbanCardAttachmentListOpen({});
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
  }, [attachmentMenuOpen, kanbanCardAttachmentListOpen, kanbanCardAttachmentMenuOpen, kanbanCardMachineMenuOpen, quickAddAttachmentMenuOpen, quickAddMachineMenuOpen, kanbanSteerAttachmentMenuOpen]);
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
    if (!hydrated || (activeView !== "agents" && activeView !== "chat")) return;
    let cancelled = false;
    let inFlight = false;
    const controllers = new Set<AbortController>();
    async function refreshFleetSnapshot() {
      if (inFlight) return;
      inFlight = true;
      const controller = new AbortController();
      controllers.add(controller);
      const snapshotAgents = agents.map((agent) => ({
        id: agent.id,
        name: agent.name,
        runtime: agent.runtime,
        gatewayUrl: agent.gatewayUrl,
        token: agent.token,
        agentId: agent.agentId,
        sessionKey: agent.sessionKey,
        chatPath: agent.chatPath,
        statusPath: agent.statusPath,
        localDataDir: agent.localDataDir,
        machineName: agent.machineName,
        telemetryUrl: agent.telemetryUrl,
      }));
      const response = await fetch("/api/fleet/snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          agents: snapshotAgents,
          sharedVault: { controlRoomPath: sharedVault.controlRoomPath },
        }),
      }).catch(() => null);
      try {
        if (!response?.ok) return;
        const data = (await response.json().catch(() => null)) as {
          checkedAt?: number;
          snapshots?: AgentSnapshot[];
        } | null;
        if (cancelled || !data?.snapshots) return;
        setFleetSnapshots((current) => mergeSnapshotRecord(current, data.snapshots ?? []));
        setFleetCheckedAt(data.checkedAt ?? Date.now());
      } finally {
        controllers.delete(controller);
        inFlight = false;
      }
    }
    refreshFleetSnapshot();
    const timer = window.setInterval(refreshFleetSnapshot, 10_000);
    return () => {
      cancelled = true;
      controllers.forEach((controller) => controller.abort());
      window.clearInterval(timer);
    };
  }, [activeView, agents, hydrated, sharedVault.controlRoomPath]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshTailscaleDevices();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshTailscaleDevices]);
  useEffect(() => () => {
    if (hivemindLinkConnectedTimeoutRef.current) {
      window.clearTimeout(hivemindLinkConnectedTimeoutRef.current);
    }
  }, []);
  useEffect(() => {
    if (!hivemindLinkSignInPolling) return undefined;
    let cancelled = false;
    const startedAt = Date.now();
    const firstRefresh = window.setTimeout(() => {
      if (!cancelled) void refreshTailscaleDevices();
    }, 0);
    const timer = window.setInterval(() => {
      if (cancelled) return;
      if (Date.now() - startedAt > 120_000) {
        hivemindLinkSignInPollingRef.current = false;
        setHivemindLinkSignInPolling(false);
        window.clearInterval(timer);
        return;
      }
      void refreshTailscaleDevices();
    }, 2_000);
    return () => {
      cancelled = true;
      window.clearTimeout(firstRefresh);
      window.clearInterval(timer);
    };
  }, [hivemindLinkSignInPolling, refreshTailscaleDevices]);
  useEffect(() => {
    if (!hydrated || (activeView !== "agents" && activeView !== "chat")) return;
    let cancelled = false;
    let inFlight = false;
    const controllers = new Set<AbortController>();
    async function refreshDiscovery() {
      if (inFlight) return;
      inFlight = true;
      const controller = new AbortController();
      controllers.add(controller);
      const response = await fetch("/api/fleet/discover?includeSnapshots=0", {
        cache: "no-store",
        signal: controller.signal,
      }).catch(() => null);
      try {
        const data = await response?.json().catch(() => null) as {
          machines?: DiscoveredMachine[];
          hivemindLink?: HivemindLinkClientStatus;
        } | null;
        if (cancelled || !data?.machines) return;
        if (data.hivemindLink) {
          applyHivemindLinkStatus(data.hivemindLink);
        }
        const machines = data.machines;
        setDiscoveredMachines((current) => mergeDiscoveredMachines(current, machines));
        const discoveredSnapshots = data.machines.flatMap((machine) => machine.snapshots ?? []);
        if (discoveredSnapshots.length > 0) {
          setFleetSnapshots((current) => mergeSnapshotRecord(current, discoveredSnapshots));
        }
      } finally {
        controllers.delete(controller);
        inFlight = false;
      }
    }
    refreshDiscovery();
    const timer = window.setInterval(refreshDiscovery, 15_000);
    return () => {
      cancelled = true;
      controllers.forEach((controller) => controller.abort());
      window.clearInterval(timer);
    };
  }, [activeView, applyHivemindLinkStatus, hydrated]);
  useEffect(() => {
    let cancelled = false;
    let inFlight = false;
    const controllers = new Set<AbortController>();
    async function refreshVersion() {
      if (inFlight) return;
      inFlight = true;
      const controller = new AbortController();
      controllers.add(controller);
      const response = await fetch("/api/app/version", {
        cache: "no-store",
        signal: controller.signal,
      }).catch(() => null);
      try {
        const data = await response?.json().catch(() => null) as AppVersion | null;
        if (!cancelled && data?.commit) setAppVersion(data);
      } finally {
        controllers.delete(controller);
        inFlight = false;
      }
    }
    refreshVersion();
    const timer = window.setInterval(refreshVersion, 60_000);
    return () => {
      cancelled = true;
      controllers.forEach((controller) => controller.abort());
      window.clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    let cancelled = false;
    let inFlight = false;
    const controllers = new Set<AbortController>();
    async function refreshMirosharkStatus() {
      if (inFlight) return;
      inFlight = true;
      const controller = new AbortController();
      controllers.add(controller);
      const response = await fetch("/api/miroshark/status", {
        cache: "no-store",
        signal: controller.signal,
      }).catch(() => null);
      try {
        const data = await response?.json().catch(() => null) as MiroSharkStatus | null;
        if (!cancelled && data?.baseUrl) setMirosharkStatus(data);
      } finally {
        controllers.delete(controller);
        inFlight = false;
      }
    }
    refreshMirosharkStatus();
    const timer = window.setInterval(refreshMirosharkStatus, mirosharkStatus?.install.running ? 5_000 : 30_000);
    return () => {
      cancelled = true;
      controllers.forEach((controller) => controller.abort());
      window.clearInterval(timer);
    };
  }, [mirosharkStatus?.install.running]);
  const { refreshMirosharkMetadata, runMirosharkAction, startNewMirosharkSimulation, applyMirosharkTemplate, updateMirosharkTemplateInput, extractMirosharkHelperText, runMirosharkScenarioHelper, launchMirosharkSwarm, runMirosharkSwarm, runMirosharkExperiment, analyzeMirosharkRun, refreshMirosharkArchive, refreshBrainGraph, refreshRecentDirectories, recordRecentDirectory, loadMachineDirectories, chooseDirectoryForMachine, refreshHermesUpdateRequirement, refreshBrainSkills, importBrainSkills, syncBrainSkillsToAeon, openSkillBrowser, importRemoteSkillToBrain, installGithubSkillToBrain, refreshNotifications, loadMirosharkArchivedRun, refreshMirosharkRun, mirosharkRunStatus, mirosharkRunIsArchived, mirosharkRunnerStatus, mirosharkPosts, mirosharkFeedIsWaiting, mirosharkFeedIsLive, mirosharkObservedRound, mirosharkTotalRounds, mirosharkCurrentRound, mirosharkProgressPercent, mirosharkRunIsWorking, mirosharkDisplayStep, mirosharkDisplayStatus, mirosharkProgressLabel, mirosharkTemplates, allMirosharkTemplates, mirosharkSelectedTemplate, mirosharkSelectedTemplateFields, mirosharkMissingTemplateFields, mirosharkTelemetryCount, mirosharkActionCount, mirosharkMarketCount, mirosharkTimelineItems, mirosharkActionItems, mirosharkProfileItems, mirosharkMarketItems, mirosharkObservabilityItems, mirosharkLlmCallItems, swarmTemplates, swarmTimelineItems, swarmObservabilityItems, swarmAgents, swarmDecisions, swarmThreadPosts, swarmSocialPosts, mirosharkMarketPricePayloads, swarmMarket, swarmIntegrationItems, swarmMarketPriceItems, swarmExportLinks, currentSwarmRun, swarmRuns, swarmStatusLabel, selectedSwarmRunId } = useMirosharkBrainController({ BRAIN_GRAPH_CLIENT_CACHE_MS, MIROSHARK_TEMPLATE_INPUTS, SWARM_LAUNCH_PRESETS, activeView, agents, appVersion, asRecord, brainGraph, brainGraphLoadedAtRef, brainGraphVaultPathRef, brainSkills, compactValue, composeMirosharkTemplateScenario, createDefaultAgentWallet, defaultMirosharkTemplateInputs, formatRelativeTime, getMiroSharkPosts, getMiroSharkRunStatus, getMiroSharkTemplates, hermesUpdateDetail, hermesUpdateRequiredDetail, honeyLedgerEnabled, isEmptyIntegrationPayload, isLoopbackCollector, isMiroSharkRunTerminal, isUnpublishedSimulationPayload, mirosharkAnalysisAgentId, mirosharkArchiveRuns, mirosharkExperimentEvent, mirosharkHandle, mirosharkMetadata, mirosharkPlatform, mirosharkRounds, mirosharkRun, mirosharkRunPending, mirosharkScenario, mirosharkSelectedTemplateId, mirosharkStat, mirosharkStatus, mirosharkTemplateInputs, mirosharkUserName, mirosharkWorkspaceMode, notificationCountRef, notificationCursorRef, numericRecordValue, payloadArray, payloadCount, payloadData, payloadPreview, pickLinkedDirectory, selectedAgentId, selectedMirosharkRunId, setBrainGraph, setBrainGraphLoading, setBrainGraphStatus, setBrainSkillAeonSyncing, setBrainSkillImportProvider, setBrainSkillImportSuccess, setBrainSkills, setBrainSkillsLoading, setBrainSkillsStatus, setHermesUpdateRequiredDetail, setMachineDirectoryBrowser, setMirosharkActionPending, setMirosharkAnalysisPending, setMirosharkAnalysisResult, setMirosharkAnalysisStatus, setMirosharkArchiveLoading, setMirosharkArchiveRuns, setMirosharkArchiveStatus, setMirosharkExperimentPending, setMirosharkExperimentStatus, setMirosharkHelperPending, setMirosharkHelperStatus, setMirosharkMetadata, setMirosharkPlatform, setMirosharkRounds, setMirosharkRun, setMirosharkRunPending, setMirosharkScenario, setMirosharkSelectedTemplateId, setMirosharkStatus, setMirosharkTemplateInputs, setMirosharkWorkbenchTab, setMirosharkWorkspaceMode, setNotificationCursor, setNotificationSummary, setNotifications, setNotificationsLoading, setNotificationsStatus, setRecentDirectories, setSelectedBrainNodeId, setSelectedMirosharkRunId, setSkillBrowserGithubInstalling, setSkillBrowserGithubOpen, setSkillBrowserGithubUrl, setSkillBrowserImporting, setSkillBrowserLoading, setSkillBrowserOpen, setSkillBrowserSkills, setSkillBrowserStatus, sharedVault, skillBrowserGithubUrl, skillRequiresHermesUpdate, swarmEventItem, swarmMarketEventItem, swarmMarketFromItems, swarmMarketPriceEventItem, swarmRunState, swarmTemplateIdFromMirosharkTemplate, swarmTemplateIdFromSurface, walletsByAgent });
  const appendMessage = useCallback((agentId: string, message: ChatMessage, storageKey = agentId) => {
    logClientTelemetry("chat.message.appended", { agentId, storageKey, role: message.role, kanbanTaskId: message.kanbanTaskId ?? null, surface: message.surface ?? null, contentLength: message.content.length, attachmentCount: message.attachments?.length ?? 0 });
    setMessagesByAgent((current) => ({
      ...current,
      [storageKey]: [...(current[storageKey] ?? []), { ...message, createdAt: message.createdAt ?? Date.now() }],
    }));
  }, []);
  const upsertTask = useCallback((task: AgentTask) => {
    setTasks((current) => [task, ...current.filter((item) => item.id !== task.id)].slice(0, 80));
  }, []);
  const updateTask = useCallback((taskId: string, patch: Partial<AgentTask>) => {
    setTasks((current) => current.map((task) => task.id === taskId ? { ...task, ...patch, updatedAt: Date.now() } : task));
  }, []);
  const openSetupModal = useCallback((machine: MachineGroup) => {
    setSetupMachineKey(machine.key); setSetupCommandCopied(false);
  }, []);
  const addKanbanStorageParams = useCallback((params: URLSearchParams) => {
    if (!sharedVault.enabled) return;
    if (sharedVault.vaultPath.trim()) params.set("vaultPath", sharedVault.vaultPath.trim());
    if (sharedVault.kanbanFolder?.trim()) params.set("kanbanFolder", sharedVault.kanbanFolder.trim());
  }, [sharedVault.enabled, sharedVault.kanbanFolder, sharedVault.vaultPath]);
  const { discoveredAgents, agentAliases, candidateAgents, candidateWorkById, displayAgents, agentWorkById, effectiveSelectedAgentId, selectedAgent, sharedSkillOptions, filteredSkillBrowserSkills, hermesUpdateRequired, filteredSchedulerSkills, selectedBrainNode, visibleBrainNodes, brainLayout, brainGraphStats, selectedBrainTargetIds, messages, lastAssistant, visibleMessages, sessionNotice, updateChatAutoScroll, machineGroups, renameMachine, kanbanMachineTargets, localKanbanMachineTarget, quickAddMachineTarget, agentsForKanbanTask, visibleAgentCount, fleetViewData, fleetUpdateStatusByMachine, fleetUpdateDetailByMachine, kanbanColumns, visibleKanbanColumns, selectedKanbanTask, selectedKanbanComments, selectedKanbanAgent, selectedKanbanAgentMessages, notificationGroups, selectedKanbanEvents, selectedKanbanBulkIds, selectedWallet, selectedWalletSnapshot, walletStats, honeyAgentRewards, selectedHoneyReward, honeyStats, kanbanAssigneeOptions, workBoardStats, kanbanViewColumns, kanbanInitialLoading, updateKanbanBoardScrollState, agentSpecificEnvCount, sharedEnvSource, runtimeEnvSources, selectedRuntimeEnvSource, sharedEnvCount, unsharedRuntimeEnvCount, sharedBackupStatus, sharedEnvImport, sharedEnvImportDiff, sharedEnvImportNewCount, sharedEnvImportChangedCount, sharedEnvImportSameCount, brainSkillImportableCount, brainSkillImportableLabel, brainSkillImportAllLabel, brainSkillImportAllDescription, navItems, activeNavItem, activeHeader, setupMachine, roleModalAgent, agentCreateMachine } = useDashboardDerivedState({ RUNTIME_LABELS, activeView, agentAliasMap, agentCreateDraft, agentCreateMachineKey, agentRoleModalId, agentSettingsPanel, agents, beeRoleLabel, brainGraph, brainGraphLayout, brainSkills, busy, chatAutoScrollRef, chatDisplayContent, chatMessageStorageKey, chatMessageWindow, cleanActivityTitle, collectorKey, createAgentProfile, createDefaultAgentWallet, dedupeAgents, discoveredMachines, displayMachineName, fleetAgentState, fleetMachineLocation, fleetMetric, fleetSnapshots, fleetVersionState, formatRelativeTime, getHoneyAgentRewards, getSurvivalSnapshot, groupKanbanTasks, groupNotifications, hermesUpdateRequiredDetail, hiveEnv, hiveEnvRuntimeSourceId, honeyTreasury, hydrated, inferCurrentTask, inferLatestAgentMessage, isChatSidebarTask, isLoopbackCollector, isManualAgentChatMessage, isMeaningfulActive, isMobileMachineOs, isStarterPlaceholder, isVisibleFleetMachine, isWorkView, kanbanAssignees, kanbanBoard, kanbanBoardScrollRef, kanbanError, kanbanIncludeArchived, kanbanLoading, kanbanTaskAssigneeAgent, machineIdentityFromParts, machineNameAliases, machineNeedsChatBridgeRepair, machineNeedsEnvHttpSyncRepair, machineNeedsSkillSyncRepair, machineNetworkIssue, maintenanceReport, messagesByAgent, messagesScrollRef, mirosharkAnalysisAgentId, mirosharkStatus, moneyClawLoadingEnvName, moneyClawStatusByEnvName, normalizeAgentProfile, notificationActorMeta, notificationDisplayBody, notificationDisplayTitle, notificationSourceLabel, notificationSummary, notifications, parseEnvImportText, quickAddMachineTargets, refreshMoneyClawStatus, refreshRuntimeIntegrations, refreshSharedSchedulesFromVault, runtimeCan, runtimeCount, runtimeFileRoots, runtimeModelSelectionsByRuntime, runtimeUsage, schedulerSkillSearch, schedules, selectedAgentId, selectedBrainNodeId, selectedChatLeafKey, selectedChatPreview, selectedKanbanTaskId, selectedKanbanTaskIds, setKanbanBoardScrollState, setMachineNameAliases, setScheduleDraft, setupMachineKey, sharedEnvImportText, sharedVault, skillBrowserSearch, skillBrowserSkills, tailscaleDevices, tailscaleStatus, tasks, updateStatusByMachine, walletExpanded, walletsByAgent, workPriority });
  const { updateAgent, updateAgentProfile: agentUpdateAgentProfile, syncAeonEnvToGitHub, openAgentCreationModal, closeAgentSettingsModal, browseAgentRuntimeFolder, refreshRuntimeIntegrations: agentRefreshRuntimeIntegrations, runRuntimeIntegrationAction, searchRuntimeSessionsForAgent, createAgentFromModal } = useAgentController({ RUNTIME_LABELS, aeonEnvKeys, agentCreateDraft, agentCreateMachine, agents, beeWorkerPreset, collectorKey, createAgentProfile, defaultWorkerClassDraft, displayAgents, hermesUpdateDetail, normalizeAgentProfile, openSetupModal, roleModalAgent, runtimeCount, runtimeSessionQuery, selectedAgent, setAeonEnvSyncStatus, setAeonEnvSyncing, setAgentCreateDraft, setAgentCreateMachineKey, setAgentRenameDraft, setAgentRenameEditing, setAgentRoleModalId, setAgentRuntimeAdvancedOpen, setAgentRuntimeFolderBrowsing, setAgentRuntimeFolderEditing, setAgentRuntimeFolderStatus, setAgentSettingsPanel, setAgentWorkerClassView, setAgents, setCustomWorkerDraft, setCustomWorkerImageError, setCustomWorkerSkillSearch, setDiscoveredMachines, setHermesUpdateRequiredDetail, setRuntimeBackgroundPrompt, setRuntimeIntegrationBusy, setRuntimeIntegrationMessage, setRuntimeIntegrationStatus, setRuntimeModelDraft, setRuntimeModelSelectionsByRuntime, setRuntimeModelSetupMode, setRuntimeSessionQuery, setRuntimeSessionResults, setSelectedAgentId });
  const { toggleScheduleSkill, toggleSchedulerStepMode, updateSchedulerStep, addSchedulerStep, removeSchedulerStep, addSchedulerStepPath, removeSchedulerStepPath, toggleSchedulerStepSkill, updateSchedulerStepModel, isSchedulerFilePath, pickSchedulerFolder, pickSchedulerFiles, addSchedulePath, removeSchedulePath, removeScheduleSkill, resetScheduleDraft, editSchedule, createSchedule, removeSchedule, importExistingSchedules, normalizeImportedScheduleEvery, toggleSchedule, schedulerPlainPrompt, schedulerSharedSnapshot, upsertSharedSchedule, upsertSharedSchedules, fetchPastRunContext, scheduleFromSharedSnapshot, mergeSharedSchedules, refreshSharedSchedulesFromVault: schedulerRefreshSharedSchedulesFromVault, recordSharedScheduledRun, runScheduleNow, schedulerStatusFromSchedule, scheduleIntervalMs, formatSchedulerDuration, schedulerCadenceLabel, schedulerJobs, findScheduleForJob, modalCadenceFromEvery, everyFromModalCadence, schedulerModalInitial, saveScheduleFromModal, browseSchedulerFolder } = useSchedulerController({ RUNTIME_LABELS, SCHEDULER_DYNAMIC_SKILL_ACTIONS_ENABLED, SCHEDULER_HERMES_SKILL_CONTEXT_ENABLED, SCHEDULER_MODEL_OPTIONS, SCHEDULER_RUN_STALE_MS, agents, appVersion, appendMessage, chatSetupIssue, createDefaultAgentWallet, displayAgents, displayMachineName, editingScheduleId, formatRelativeTime, honeyLedgerEnabled, logClientTelemetry, refreshHoneyLedger, scheduleDraft, schedules, selectedAgent, setEditingScheduleId, setMessagesByAgent, setScheduleDraft, setScheduleImportStatus, setScheduleImporting, setSchedulerAttachMenu, setSchedulerDraftOpen, setSchedulerPathDraft, setSchedulerPathKind, setSchedulerRunStates, setSchedulerSelectedStep, setSchedulerSkillSearch, setSchedules, sharedVault, updateTask, upsertTask, walletsByAgent });
  const { updateSharedVault, updateWallet, resetWalletBurnClock, copyPaymentPrompt, refreshMoneyClawStatus: walletRefreshMoneyClawStatus, saveMoneyClawKey, initializeCoreWalletRails, refreshHoneyLedger: walletRefreshHoneyLedger, observeHoneyUsage: walletObserveHoneyUsage, refreshRuntimeUsage, refreshWalletVaultBackupStatus, runWalletVaultBackupAction, refreshMaintenanceReport, runMaintenanceAction, runtimeFileRequest, refreshRuntimeFileRoots, listRuntimeFiles, openRuntimeFile, saveRuntimeFile, exchangeHoneyForHive, exchangeAllHoneyForHive, enableHoneyLedger, updateWalletAction, createLocalWallet, refreshWalletBalance, sendWalletUsdc, testX402Fetch, addAgentToMachine, requestDuplicateAgent, duplicateAgent, deleteAgent } = useWalletFilesController({ buildAgentPaymentPrompt, createDefaultAgentWallet, createDefaultHoneyTreasuryConfig, displayAgents, duplicateAgentDraft, agents, honeyLedgerEnabled, normalizeMoney, openAgentCreationModal, runtimeFileDraft, runtimeFileOpen, runtimeFilePath, runtimeFileRootKey, runtimeFileRoots, selectedAgent, selectedAgentId, setAgents, setDuplicateAgentDraft, setHoneyLedgerEnabled, setHoneyTreasury, setMaintenanceBusy, setMaintenanceMessage, setMaintenanceReport, setMessagesByAgent, setMoneyClawLoadingEnvName, setMoneyClawStatusByEnvName, setRuntimeFileDraft, setRuntimeFileOpen, setRuntimeFilePath, setRuntimeFileRootKey, setRuntimeFileRoots, setRuntimeFileStatus, setRuntimeFiles, setRuntimeUsage, setRuntimeUsageLoading, setSelectedAgentId, setSharedVault, setWalletActionsByAgent, setWalletVaultBackupBusy, setWalletVaultBackupMessage, setWalletVaultBackupStatus, setWalletsByAgent, sharedVault, updateAgentProfile, walletActionsByAgent, walletsByAgent });
  const { switchRuntime, hasConversation, conversationTitle, hydrateHermesSessionChat, startAgentChat, startAgentWorkChat, closeChatFolderCreator, createChatFolder, chatSidebarTree, selectedChatMachine, selectedChatDirectory, chatFolderCreatorMachine, chatFolderCreatorParentOptions, copySetupCommand } = useChatTreeController({ RUNTIME_CAPABILITIES, RUNTIME_DEFAULTS, RUNTIME_KINDS, RUNTIME_LABELS, agentWorkById, chatCustomFolders, chatDedupeKey, chatFolderDraft, chatFolderLabel, chatLeafFromStorageKey, chatMessageStorageKey, chatMessageWindow, chatPreviewDedupeKey, chatSeedMessagesForTask, chooseDirectoryForMachine, createChatLeafKey, displayAgents, findRosterChatTask, hermesRuntimeSessionIdFromTask, isChatSidebarTask, isManualAgentChatMessage, logClientTelemetry, machineGroups, messagesByAgent, parentPathFromPath, preferChatTreeItem, recordRecentDirectory, runtimeCan, runtimeSessionForChat, selectedAgent, selectedChatDirectoryPath, selectedChatLeafKey, setActiveView, setChatCustomFolders, setChatFolderDraft, setChatMessageWindow, setMessagesByAgent, setSelectedAgentId, setSelectedChatDirectoryPath, setSelectedChatLeafKey, setSelectedChatPreview, setSelectedChatRuntimeSessionId, setSetupCommandCopied, setSetupMachineKey, setupCollectorCommand, setStatus, setStatusAgentId, taskChatLeafKey, updateAgent, workPriority, workspaceLabelFromPath });
  const { openMachineInitModal, saveHetznerToken, openHetznerEnvFile, initializeMachineProject, copyMachineInitCommand, refreshAppVersionNow, refreshDiscoveryNow, runMachineUpdate, copyUpdateDetail, refreshKanbanOnce, kanbanStorageBody, notificationStorageBody, raiseHermesAuthAlert, noteIntakeBody, scanNoteIntake, importNoteIntake, markNotificationRead, markAllNotificationsRead, updateNotificationSettings, trackAgentTaskOnKanban } = useFleetNotificationsController({ DEFAULT_SHARED_VAULT, addKanbanStorageParams, appVersion, hydrated, isCollectorAutoUpdateable, kanbanAssigneeFilter, kanbanBoardSlug, kanbanIncludeArchived, kanbanSearch, kanbanTenantFilter, cleanActivityTitle, localDashboardHasUnpublishedChanges, machineInitDraft, machineInitToken, machineNeedsChatBridgeRepair, machineNeedsEnvHttpSyncRepair, machineNeedsSkillSyncRepair, machineVersionCopy, mergeDiscoveredMachines, mergeSnapshotRecord, noteIntakeAutoInFlightRef, notifications, setAppVersion, setCopiedUpdateDetailKey, setDiscoveredMachines, setFleetSnapshots, setKanbanAssignees, setKanbanBoard, setKanbanBoards, setKanbanError, setKanbanStorage, setKanbanTenants, setActiveView, setSelectedKanbanTaskId, setMachineInitCopiedKey, setMachineInitOpen, setMachineInitStatus, setMachineInitToken, setMachineInitTokenStatus, setNoteIntakePending, setNoteIntakePreview, setNoteIntakeStatus, setNotificationCursor, setNotificationSummary, setNotifications, setNotificationsStatus, setTasks, setUpdateStatusByMachine, sharedVault, summarizeHermesAuthError, updateStatusByMachine });
  const { createKanbanTask, createKanbanBoard, patchKanbanTask, bulkPatchKanbanTasks, promoteKanbanIdea, updateKanbanTaskMachine, markKanbanTaskReviewed, requestKanbanTaskUndo, readWorkspaceGitSnapshot, kanbanWorkspaceChangeSummary, addKanbanCardFiles, openKanbanCardFilePicker, handleKanbanCardFileChange, handleKanbanCardImageChange, attachKanbanCardDirectory, attachKanbanCardRecentDirectory, removeKanbanCardAttachment, removeKanbanCardDirectory, moveKanbanTask, deleteKanbanTask, editAndInterruptKanbanTask, openKanbanTaskModal, kanbanTaskMenuItems, orchestrateReadyKanbanTask, addKanbanSystemComment } = useKanbanTaskController({ AbortController, Eye, GitBranch, KANBAN_COLUMNS, KANBAN_PICKUP_PREVIEW_MS, MessageSquare, Pencil, RotateCcw, Trash2, Users, agentsForKanbanTask, appVersion, appendMessage, attachmentSizeLabel, beeRoleIconPath, beeWorkerClassLabel, chatSetupIssue, chooseBeeAssignment, chooseDirectoryForMachine, createDefaultAgentWallet, dispatchKanbanTaskToAgentRef, displayAgents, honeyLedgerEnabled, kanbanBoard, kanbanBoardSlug, kanbanCardAttachmentTargetId, kanbanCardFileInputRef, kanbanCardImageInputRef, kanbanDispatchCooldownRef, kanbanEditDraft, kanbanEditPendingTaskId, kanbanReadyPickupAttemptRef, kanbanReadyPickupInFlightRef, kanbanReadyPickupSignature, kanbanRuntimeAbortRef, kanbanStorageBody, kanbanTaskAssigneeAgent, kanbanTaskInterruptPrompt, linkedDirectoryLabel, logClientTelemetry, newBoardDraft, quickAddAttachments, quickAddDirectories, quickAddDrafts, quickAddMachineTarget, readComposerFiles, recordRecentDirectory, refreshHoneyLedger, refreshKanbanOnce, selectedKanbanAgent, selectedKanbanBulkIds, selectedKanbanTask, selectedKanbanTaskId, setKanbanBoard, setKanbanBoardSlug, setKanbanBulkPending, setKanbanCardAttachmentMenuOpen, setKanbanCardAttachmentTargetId, setKanbanCardRecentsExpanded, setKanbanEditDraft, setKanbanEditPendingTaskId, setKanbanError, setKanbanPickupPreviewByTask, setKanbanStorage, setKanbanTaskModal, setMessagesByAgent, setNewBoardDraft, setQuickAddAttachmentError, setQuickAddAttachments, setQuickAddDirectories, setQuickAddDrafts, setQuickAddMachineMenuOpen, setQuickAddMachineTargets, setQuickAddStatus, setSelectedKanbanTaskId, setSelectedKanbanTaskIds, sharedVault, updateTask, upsertTask, wait, walletsByAgent });
  const { createKanbanArtistHandoffTask, requeueStaleKanbanTask, dispatchKanbanTaskToAgent, addKanbanComment, refreshKanbanAgentSession, steerSelectedKanbanTask } = useKanbanDispatchController({ AbortController, KANBAN_COLUMNS, KANBAN_DISPATCH_NO_PROGRESS_MS, KANBAN_NO_ASSISTANT_QUIET_MS, KANBAN_NO_ASSISTANT_STALL_MS, KANBAN_SESSION_POLL_FAILURE_LIMIT, KANBAN_STALE_AGENT_COOLDOWN_MS, KANBAN_TOOL_OUTPUT_STALL_MS, addKanbanSystemComment, appVersion, appendMessage, attachmentSizeLabel, attachmentSummary, chatSetupIssue, commentDraft, compactDiagnosticPreview, createDefaultAgentWallet, displayAgents, extractKanbanVisualBrief, formatDurationShort, honeyLedgerEnabled, hydrated, isHermesAuthFailure, isInternalHermesSessionPrelude, isKanbanAwaitingAgentUpdate, isKanbanStaleWorkingTask, isTransientDelegationMessage, kanbanBoard, kanbanBoardSlug, kanbanDispatchCooldownRef, kanbanNoAssistantStalledDetail, kanbanReadyPickupAttemptRef, kanbanReadyPickupInFlightRef, kanbanReadyPickupSignature, kanbanRuntimeAbortRef, kanbanSessionPollFailureRef, kanbanSessionPollRef, kanbanStaleAge, kanbanStaleRequeueAttemptRef, kanbanSteerAttachments, kanbanSteerDirectories, kanbanSteerDraft, kanbanSteerTargetStatus, kanbanSteeringTaskId, kanbanStorageBody, kanbanTaskAssigneeAgent, kanbanTaskAssignmentForAgent, kanbanTaskDispatchPrompt, kanbanToolOutputStalledDetail, kanbanWorkspaceChangeSummary, logClientTelemetry, messageContentParts, messagesByAgent, orchestrateReadyKanbanTask, patchKanbanTask, raiseHermesAuthAlert, readWorkspaceGitSnapshot, refreshHoneyLedger, refreshKanbanOnce, selectedKanbanAgent, selectedKanbanTask, setCommentDraft, setKanbanError, setKanbanSteerAttachmentError, setKanbanSteerAttachmentMenuOpen, setKanbanSteerAttachments, setKanbanSteerDirectories, setKanbanSteerDraft, setKanbanSteeringTaskId, setMessagesByAgent, sharedVault, simpleStableHash, summarizeKanbanToolOutput, updateTask, upsertTask, walletsByAgent });
  // eslint-disable-next-line react-hooks/refs
  updateAgentProfileRef.current = agentUpdateAgentProfile;
  // eslint-disable-next-line react-hooks/refs
  refreshRuntimeIntegrationsRef.current = agentRefreshRuntimeIntegrations;
  // eslint-disable-next-line react-hooks/refs
  refreshSharedSchedulesFromVaultRef.current = schedulerRefreshSharedSchedulesFromVault;
  // eslint-disable-next-line react-hooks/refs
  refreshMoneyClawStatusRef.current = walletRefreshMoneyClawStatus;
  // eslint-disable-next-line react-hooks/refs
  refreshHoneyLedgerRef.current = walletRefreshHoneyLedger;
  // eslint-disable-next-line react-hooks/refs
  observeHoneyUsageRef.current = walletObserveHoneyUsage;

  useEffect(() => {
    if (!hydrated || activeView !== "scheduler" || !sharedVault.enabled) return;
    const syncKey = [
      sharedVault.vaultPath.trim(),
      sharedVault.scheduledFolder?.trim() || "",
      String(displayAgents.length),
    ].join("::");
    if (schedulerVaultAutoSyncKeyRef.current === syncKey) return;
    schedulerVaultAutoSyncKeyRef.current = syncKey;
    setScheduleImportStatus("Syncing shared vault automations...");
    void refreshSharedSchedulesFromVault().then(() => {
      setScheduleImportStatus((current) => (
        current === "Syncing shared vault automations..." ? "" : current
      ));
    });
  }, [activeView, displayAgents.length, hydrated, refreshSharedSchedulesFromVault, sharedVault.enabled, sharedVault.scheduledFolder, sharedVault.vaultPath]);
  // eslint-disable-next-line react-hooks/refs
  dispatchKanbanTaskToAgentRef.current = dispatchKanbanTaskToAgent;
  const { checkStatus, checkVaultStatus, checkControlRoomStatus, runVaultTailnetSync, pairSyncthingCollector, pairSyncthingVaultSync, inspectBrainNode, startBrainPan, moveBrainPan, endBrainPan, addChatFiles, handleChatFileChange, handleChatImageChange, removeChatAttachment, attachChatDirectory, attachChatRecentDirectory, removeChatDirectory, addQuickAddFiles, handleQuickAddFileChange, handleQuickAddImageChange, removeQuickAddAttachment, attachQuickAddDirectory, attachQuickAddRecentDirectory, removeQuickAddDirectory, addKanbanSteerFiles, handleKanbanSteerFileChange, handleKanbanSteerImageChange, removeKanbanSteerAttachment, attachKanbanSteerDirectory, attachKanbanSteerRecentDirectory, removeKanbanSteerDirectory, updateVoiceTranscript, appendVoiceTranscriptToInput, cleanupVoiceCapture, startVoiceWaveform, startAudioRecording, stopAudioRecording, sendMessage, generateKanbanTaskFromChat, chatKanbanGeneration } = useStatusChatInputController({ AbortController, CHAT_RESPONSE_STALL_TIMEOUT_MS, Uint8Array, appendMessage, attachmentSummary, brainDragMovedRef, brainDragRef, brainGraph, brainPan, busy, chatAttachments, chatAutoScrollRef, chatDirectories, chatMessageStorageKey, chatSetupIssue, chooseDirectoryForMachine, collectorKey, createDefaultAgentWallet, discoveredMachines, honeyLedgerEnabled, hydrated, isManualAgentChatMessage, kanbanBoardSlug, kanbanReadyPickupInFlightRef, kanbanStorageBody, linkedDirectoryLabel, localKanbanMachineTarget, machineGroups, messageContentParts, messages, orchestrateReadyKanbanTask, quickAddMachineTarget, quickAddMachineTargets, readComposerFiles, recordRecentDirectory, recording, refreshHoneyLedger, refreshKanbanOnce, selectedAgent, selectedBrainNodeId, selectedChatDirectoryPath, selectedChatLeafKey, selectedChatRuntimeSessionId, selectedKanbanAgent, selectedKanbanTask, setAttachmentError, setAttachmentMenuOpen, setBrainGraph, setBrainGraphStatus, setBrainPan, setBusy, setBusyAgentId, setChatAttachments, setChatDirectories, setControlRoomStatus, setHasStreamingChunk, setKanbanBoard, setKanbanError, setKanbanSteerAttachmentError, setKanbanSteerAttachmentMenuOpen, setKanbanSteerAttachments, setKanbanSteerDirectories, setKanbanSteerDraft, setKanbanStorage, setMessagesByAgent, setQuickAddAttachmentError, setQuickAddAttachmentMenuOpen, setQuickAddAttachments, setQuickAddDirectories, setQuickAddDrafts, setRecentDirectoriesExpanded, setRecording, setSelectedBrainNodeId, setSelectedChatPreview, setSelectedChatRuntimeSessionId, setStatus, setStatusAgentId, setText, setVaultStatus, setVaultSyncPending, setVaultSyncStatus, setVoiceBands, setVoiceTarget, setVoiceTranscript, sharedVault, speechRecognitionConstructor, syncthingAutoPairRef, tailscaleDevices, text, updateSharedVault, updateTask, upsertTask, voiceAnimationRef, voiceAudioContextRef, voiceRecognitionRef, voiceStreamRef, voiceTarget, voiceTranscriptRef, walletsByAgent });
  useDashboardPollingEffects({
    activeView, hydrated, refreshMirosharkArchive, refreshBrainGraph, refreshBrainSkills, refreshRecentDirectories, refreshMirosharkRun,
    sharedVault, brainSkills, brainSkillsLoading, walletPanelMode, refreshRuntimeUsage, refreshWalletVaultBackupStatus,
    refreshMaintenanceReport, refreshRuntimeFileRoots, hiveEnv, hiveEnvLoading, refreshHiveEnv, agentWorkerClassView,
    refreshNotifications, mirosharkRun, mirosharkPosts, mirosharkRunnerStatus, mirosharkArchiveSaveKeyRef, mirosharkScenario,
    setMirosharkArchiveStatus, isMiroSharkRunTerminal, mirosharkPlatform, setMirosharkRun, kanbanBoardSlug,
    kanbanIncludeArchived, kanbanTenantFilter, kanbanAssigneeFilter, kanbanSearch, setKanbanLoading, setKanbanError,
    setKanbanBoard, setKanbanBoards, setKanbanTenants, setKanbanAssignees, setKanbanStorage, setSelectedKanbanTaskId,
  });
  const updateSkillAutoSync = useCallback(async (
    providerId: BrainSkillProviderId,
    patch: Partial<{ autoImport: boolean; autoUpdate: boolean; trackRemovals: boolean; allowDelete: boolean }>,
  ) => {
    if (sharedVault.skillAutoSyncAll) return;
    const currentPolicy = sharedVault.skillAutoSync?.[providerId] ?? {
      autoImport: false,
      autoUpdate: false,
      trackRemovals: false,
      allowDelete: false,
    };
    const nextPolicy = { ...currentPolicy, ...patch };
    const nextSkillAutoSync = {
      ...(sharedVault.skillAutoSync ?? {}),
      [providerId]: nextPolicy,
    };
    updateSharedVault({ skillAutoSync: nextSkillAutoSync });
    setBrainSkillsStatus(`Configuring ${providerId} skill auto-sync...`);
    const response = await fetch("/api/obsidian/skills/auto-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vaultPath: sharedVault.vaultPath.trim() || undefined,
        policies: nextSkillAutoSync,
      }),
    }).catch(() => null);
    const data = await response?.json().catch(() => null) as { ok?: boolean; collectors?: Array<{ ok?: boolean }>; error?: string } | null;
    if (!response?.ok || !data?.ok) {
      setBrainSkillsStatus(data?.error ?? "Could not configure skill auto-sync.");
      return;
    }
    const configured = data.collectors?.filter((collector) => collector.ok).length ?? 0;
    setBrainSkillsStatus(`Skill auto-sync updated on ${configured} collector${configured === 1 ? "" : "s"}.`);
  }, [setBrainSkillsStatus, sharedVault.skillAutoSync, sharedVault.skillAutoSyncAll, sharedVault.vaultPath, updateSharedVault]);
  const updateAllSkillAutoSync = useCallback(async (enabled: boolean) => {
    const providerIds = (brainSkills?.providers ?? BRAIN_SKILL_PROVIDER_FALLBACK).map((provider) => provider.id);
    const nextSkillAutoSync = enabled
      ? Object.fromEntries(providerIds.map((providerId) => [providerId, {
        autoImport: true,
        autoUpdate: true,
        trackRemovals: true,
        allowDelete: false,
      }]))
      : Object.fromEntries(providerIds.map((providerId) => [providerId, {
        autoImport: false,
        autoUpdate: false,
        trackRemovals: false,
        allowDelete: false,
      }]));
    updateSharedVault({ skillAutoSyncAll: enabled, skillAutoSync: nextSkillAutoSync });
    setBrainSkillsStatus(enabled ? "Configuring auto-sync for all skill providers..." : "Turning off provider skill auto-sync...");
    const response = await fetch("/api/obsidian/skills/auto-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vaultPath: sharedVault.vaultPath.trim() || undefined,
        policies: nextSkillAutoSync,
      }),
    }).catch(() => null);
    const data = await response?.json().catch(() => null) as { ok?: boolean; collectors?: Array<{ ok?: boolean }>; error?: string } | null;
    if (!response?.ok || !data?.ok) {
      setBrainSkillsStatus(data?.error ?? "Could not configure provider skill auto-sync.");
      return;
    }
    const configured = data.collectors?.filter((collector) => collector.ok).length ?? 0;
    setBrainSkillsStatus(`${enabled ? "Enabled" : "Disabled"} all-provider skill auto-sync on ${configured} collector${configured === 1 ? "" : "s"}.`);
  }, [brainSkills?.providers, setBrainSkillsStatus, sharedVault.vaultPath, updateSharedVault]);

  const refreshGbrainStatus = useCallback(async () => {
    if (!sharedVault.enabled) {
      setGbrainActionStatus("Turn on the shared vault before checking GBrain.");
      return;
    }
    setGbrainBusy("status");
    const params = new URLSearchParams();
    if (sharedVault.vaultPath?.trim()) params.set("vaultPath", sharedVault.vaultPath.trim());
    if (sharedVault.brainServicesFolder?.trim()) params.set("brainServicesFolder", sharedVault.brainServicesFolder.trim());
    Object.entries(sharedVault.gbrain ?? {}).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      params.set(key, String(value));
    });
    const response = await fetch(`/api/brain/gbrain/status?${params.toString()}`, { cache: "no-store" }).catch(() => null);
    const data = await response?.json().catch(() => null) as { ok?: boolean; status?: DashboardGBrainStatus; error?: string } | null;
    if (data?.status) {
      setGbrainStatus(data.status);
      setGbrainActionStatus(data.status.installed ? "GBrain status refreshed." : data.status.error ?? "GBrain is ready to install or connect.");
    } else {
      setGbrainActionStatus(data?.error ?? "Could not check GBrain status.");
    }
    setGbrainBusy("");
  }, [sharedVault.brainServicesFolder, sharedVault.enabled, sharedVault.gbrain, sharedVault.vaultPath]);

  async function runGbrainAction(action: "install" | "connect" | "import" | "embed" | "dream") {
    if (!sharedVault.enabled) {
      setGbrainActionStatus("Turn on the shared vault before changing GBrain.");
      return;
    }
    setGbrainBusy(action);
    setGbrainActionStatus(`${action === "embed" ? "Refreshing embeddings" : action === "dream" ? "Running dream cycle" : `${action[0].toUpperCase()}${action.slice(1)}ing GBrain`}...`);
    const response = await fetch(`/api/brain/gbrain/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vaultPath: sharedVault.vaultPath.trim() || undefined,
        brainServicesFolder: sharedVault.brainServicesFolder.trim() || undefined,
        gbrain: {
          ...sharedVault.gbrain,
          enabled: action === "connect" || action === "install" ? true : sharedVault.gbrain.enabled,
        },
      }),
    }).catch(() => null);
    const data = await response?.json().catch(() => null) as { ok?: boolean; status?: DashboardGBrainStatus; error?: string } | null;
    if (!response?.ok || !data?.ok) {
      setGbrainActionStatus(data?.error ?? `GBrain ${action} failed.`);
      setGbrainBusy("");
      return;
    }
    if (data.status) setGbrainStatus(data.status);
    if ((action === "connect" || action === "install") && !sharedVault.gbrain.enabled) {
      updateSharedVault({ gbrain: { ...sharedVault.gbrain, enabled: true, installMode: action === "install" ? "local" : sharedVault.gbrain.installMode } });
    }
    setGbrainActionStatus(`GBrain ${action === "embed" ? "embedding refresh" : action} complete.`);
    setGbrainBusy("");
    if (action === "connect" || action === "install") void refreshBrainSkills();
  }

  async function queryGbrainFromDashboard() {
    const query = gbrainQuery.trim();
    if (!query) {
      setGbrainActionStatus("Enter a GBrain query first.");
      return;
    }
    setGbrainBusy("query");
    setGbrainActionStatus("Asking GBrain...");
    setGbrainQueryResult("");
    const response = await fetch("/api/brain/gbrain/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vaultPath: sharedVault.vaultPath.trim() || undefined,
        brainServicesFolder: sharedVault.brainServicesFolder.trim() || undefined,
        gbrain: sharedVault.gbrain,
        query,
        mode: "think",
      }),
    }).catch(() => null);
    const data = await response?.json().catch(() => null) as { ok?: boolean; output?: string; status?: DashboardGBrainStatus; error?: string } | null;
    if (!response?.ok || !data?.ok) {
      setGbrainActionStatus(data?.error ?? "GBrain query failed.");
      setGbrainBusy("");
      return;
    }
    if (data.status) setGbrainStatus(data.status);
    setGbrainQueryResult(data.output || "(GBrain returned no text.)");
    setGbrainActionStatus("GBrain answer ready.");
    setGbrainBusy("");
  }

  useEffect(() => {
    if (!hydrated || activeView !== "vault" || vaultPanelMode !== "brain-services") return;
    const refreshTimer = window.setTimeout(() => {
      void refreshGbrainStatus();
    }, 0);
    return () => window.clearTimeout(refreshTimer);
  }, [activeView, hydrated, refreshGbrainStatus, vaultPanelMode]);

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
  const { agentSettingsSelectedCustomWorkerId, agentSettingsCustomWorker, agentSettingsWorkerLabel, agentSettingsWorkerImage, agentSettingsSkillProfile, agentSettingsPreferredSkills, agentSettingsRuntime, agentSettingsProvider, agentSettingsModel, runtimeModelSelection, runtimeModelProviders, selectedRuntimeProvider, selectedRuntimeModels, selectedRuntimeModelId, selectedRuntimeModel, updateAgentRuntimeModel, agentSettingsIntegrationTarget, addHermesModelFromDraft, selectAgentWorkerClass, selectCustomWorkerClass, updateAgentSkillProfile, openCustomWorkerClassCreator, applyCustomWorkerClass, toggleCustomWorkerSkill, uploadCustomWorkerImage, filteredCustomWorkerSkills, selectedHetznerServerType, showHivemindLinkConnectedBanner } = useAgentSettingsController({ HETZNER_SERVER_TYPE_OPTIONS, agentCreateDraft, agentCreateMachine, agentSettingsCustomWorkers, agentSettingsWorkerClass, agentSettingsWorkerPreset, agents, beeRoleIconPath, beeWorkerPreset, createAgentProfile, customWorkerDraft, customWorkerProfileFromDraft, customWorkerSkillSearch, hivemindLinkBannerDismissed, hivemindLinkConnectedUntil, hivemindLinkStatus, machineInitDraft, roleModalAgent, runRuntimeIntegrationAction, runtimeCount, runtimeIntegrationStatus, runtimeModelDraft, setAgentCreateDraft, setAgentWorkerClassView, setCustomWorkerDraft, setCustomWorkerImageError, setCustomWorkerSkillSearch, setRuntimeModelDraft, sharedSkillOptions, updateAgentProfile });
  const showHivemindLinkSignInBanner = !hivemindLinkBannerDismissed
    && !showHivemindLinkConnectedBanner
    && Boolean(hivemindLinkStatus?.authUrl)
    && hivemindLinkStatus?.ok !== true;

  return (
    <main className="shell commandShell">
      <DashboardHeader {...{ Image, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, activeHeader, activeView, fleetCheckedAt, formatRelativeTime, isWorkView, kanbanBoard, navItems, notificationClass, notificationSummary, setActiveView, setKanbanLoading, viewIcon }} />

      <div className="commandMain">
      <AgentsPanel {...{ AgentCell, AgentTaskList, Bot, Button, CellMenu, Check, CircleAlert, Copy, CopyPlus, ExternalLink, FleetView, MachineCell, MessageSquare, PlugZap, Plus, QUIET_SNAPSHOT_HOLD_MS, RefreshCcw, Settings2, Trash2, WalletCards, X, activeView, addAgentToMachine, agentWorkById, agents, appVersion, beeRoleLabel, busyAgentId, cleanActivityTitle, copiedUpdateDetailKey, copyUpdateDetail, deleteAgent, fleetCheckedAt, fleetClass, fleetSnapshots, fleetUpdateDetailByMachine, fleetUpdateStatusByMachine, fleetViewData, formatRelativeTime, friendlyEmptyTitle, hermesRuntimeSessionIdFromTask, hivemindLinkSignInPolling, hivemindLinkSignInPollingRef, hivemindLinkStatus, hydrateHermesSessionChat, isCollectorAutoUpdateable, isMeaningfulActive, localDashboardHasUnpublishedChanges, machineGroups, machineNeedsChatBridgeRepair, machineNeedsEnvHttpSyncRepair, machineVersionCopy, markNotificationRead, openMachineInitModal, openSetupModal, renameMachine, renderAgentKey, requestDuplicateAgent, runMachineUpdate, selectedAgent, setActiveView, setAgentRenameDraft, setAgentRenameEditing, setAgentRoleModalId, setAgentRuntimeAdvancedOpen, setAgentRuntimeFolderEditing, setAgentRuntimeFolderStatus, setAgentSettingsPanel, setHivemindLinkBannerDismissed, setHivemindLinkConnectedUntil, setHivemindLinkSignInPolling, setSelectedAgentId, showHivemindLinkConnectedBanner, showHivemindLinkSignInBanner, startAgentChat, startAgentWorkChat, tailscaleStatus, taskChatLeafKey, trackAgentTaskOnKanban, updateStatusByMachine }} />
      <KanbanPanel {...{ AttachmentListMenuContent, AttachmentMenuContent, CellMenu, ChatMarkdown, Check, ChevronDown, ChevronRight, ComposerField, DEFAULT_SHARED_VAULT, Image, KANBAN_COLUMNS, KANBAN_STEER_TARGETS, MessageAttachments, MessageSquare, Paperclip, Plus, RotateCcw, Search, Settings2, X, activeView, addKanbanComment, attachKanbanCardDirectory, attachKanbanCardRecentDirectory, attachKanbanSteerDirectory, attachKanbanSteerRecentDirectory, attachQuickAddDirectory, attachQuickAddRecentDirectory, bulkPatchKanbanTasks, chatClass, commentDraft, createKanbanBoard, createKanbanTask, displayAgents, editAndInterruptKanbanTask, expandedKanbanCards, formatDurationShort, formatMessageTimestamp, formatRelativeTime, handleKanbanCardFileChange, handleKanbanCardImageChange, handleKanbanSteerFileChange, handleKanbanSteerImageChange, handleQuickAddFileChange, handleQuickAddImageChange, importNoteIntake, initialWorkHistory, isKanbanStaleWorkingTask, isKanbanTerminalMessage, isWorkView, kanbanAssigneeFilter, kanbanAssigneeOptions, kanbanBoard, kanbanBoardScrollRef, kanbanBoardScrollState, kanbanBoardSlug, kanbanBoards, kanbanBulkAssignee, kanbanBulkPending, kanbanCardAttachmentListOpen, kanbanCardAttachmentMenuOpen, kanbanCardFileInputRef, kanbanCardImageInputRef, kanbanCardMachineMenuOpen, kanbanCardMessage, kanbanCardRecentsExpanded, kanbanClass, kanbanEditDraft, kanbanEditPendingTaskId, kanbanError, kanbanEventLabel, kanbanIncludeArchived, kanbanInitialLoading, kanbanLoading, kanbanMachineTargets, kanbanPickupPreviewByTask, kanbanSearch, kanbanStaleAge, kanbanSteerAttachmentError, kanbanSteerAttachmentMenuOpen, kanbanSteerAttachmentMenuRef, kanbanSteerAttachments, kanbanSteerDirectories, kanbanSteerDraft, kanbanSteerFileInputRef, kanbanSteerImageInputRef, kanbanSteerTargetMenuOpen, kanbanSteerTargetMenuRef, kanbanSteerTargetStatus, kanbanSteeringTaskId, kanbanStorage, kanbanTaskBee, kanbanTaskMenuItems, kanbanTaskModal, kanbanTenantFilter, kanbanTenants, kanbanViewColumns, markKanbanTaskReviewed, moveKanbanTask, newBoardDraft, noteIntakePending, noteIntakePreview, noteIntakeStatus, openKanbanCardFilePicker, openKanbanTaskModal, patchKanbanTask, quickAddAttachmentError, quickAddAttachmentMenuOpen, quickAddAttachmentMenuRef, quickAddAttachments, quickAddDirectories, quickAddDrafts, quickAddFileInputRef, quickAddImageInputRef, quickAddMachineMenuOpen, quickAddMachineMenuRef, quickAddMachineTarget, quickAddMachineTargets, quickAddStatus, recentDirectories, recentDirectoriesExpanded, recording, removeKanbanCardAttachment, removeKanbanCardDirectory, removeKanbanSteerAttachment, removeKanbanSteerDirectory, removeQuickAddAttachment, removeQuickAddDirectory, scanNoteIntake, selectedKanbanAgent, selectedKanbanAgentMessages, selectedKanbanBulkIds, selectedKanbanComments, selectedKanbanEvents, selectedKanbanTask, selectedKanbanTaskId, selectedKanbanTaskIds, setActiveView, setCommentDraft, setExpandedKanbanCards, setKanbanAssigneeFilter, setKanbanBoardSlug, setKanbanBulkAssignee, setKanbanCardAttachmentListOpen, setKanbanCardAttachmentMenuOpen, setKanbanCardMachineMenuOpen, setKanbanCardRecentsExpanded, setKanbanEditDraft, setKanbanIncludeArchived, setKanbanLoading, setKanbanSearch, setKanbanSteerAttachmentMenuOpen, setKanbanSteerDraft, setKanbanSteerTargetMenuOpen, setKanbanSteerTargetStatus, setKanbanTaskModal, setKanbanTenantFilter, setNewBoardDraft, setQuickAddAttachmentError, setQuickAddAttachmentMenuOpen, setQuickAddDrafts, setQuickAddMachineMenuOpen, setQuickAddMachineTargets, setQuickAddStatus, setRecentDirectoriesExpanded, setSelectedKanbanTaskId, setSelectedKanbanTaskIds, sharedVault, startAudioRecording, steerSelectedKanbanTask, stopAudioRecording, updateKanbanTaskMachine, updateSharedVault, voiceBands, voiceTarget, voiceTranscript, walletClass, workBoardStats }} />
      <SchedulerPanel {...{ AlignLeft, Button, Check, ChevronDown, Clock3, Cpu, FileText, FileUp, FolderOpen, Link, List, LoaderCircle, Paperclip, Pencil, Plus, Puzzle, RUNTIME_LABELS, Repeat2, SCHEDULER_MODEL_OPTIONS, SCHEDULE_PRESETS, SchedulerView, Search, Send, Sparkles, TaskModal, Trash2, X, activeView, addSchedulePath, addSchedulerStep, addSchedulerStepPath, browseSchedulerFolder, createSchedule, displayAgents, editSchedule, editingScheduleId, filteredSchedulerSkills, findScheduleForJob, fleetClass, importExistingSchedules, isSchedulerFilePath, machineGroups, openSkillBrowser, pickSchedulerFiles, pickSchedulerFolder, refreshSharedSchedulesFromVault, removeSchedule, removeSchedulePath, removeScheduleSkill, removeSchedulerStep, removeSchedulerStepPath, renderAgentKey, resetScheduleDraft, runScheduleNow, saveScheduleFromModal, scheduleDraft, scheduleImportStatus, scheduleImporting, schedulerAttachMenu, schedulerDraftOpen, schedulerJobs, schedulerModalInitial, schedulerPathDraft, schedulerPathKind, schedulerRunStates, schedulerSelectedStep, schedulerSkillSearch, schedules, selectedAgent, setScheduleDraft, setScheduleImportStatus, setSchedulerAttachMenu, setSchedulerDraftOpen, setSchedulerPathDraft, setSchedulerPathKind, setSchedulerSelectedStep, setSchedulerSkillSearch, sharedSkillOptions, toggleSchedule, toggleScheduleSkill, toggleSchedulerStepMode, toggleSchedulerStepSkill, updateSchedulerStep, updateSchedulerStepModel, vaultClass }} />
      <SwarmPanel {...{ SwarmView, activeView, allMirosharkTemplates, analyzeMirosharkRun, applyMirosharkTemplate, currentSwarmRun, displayAgents, launchMirosharkSwarm, loadMirosharkArchivedRun, mirosharkAnalysisAgentId, mirosharkAnalysisPending, mirosharkAnalysisResult, mirosharkAnalysisStatus, mirosharkArchiveLoading, mirosharkArchiveStatus, mirosharkExperimentPending, mirosharkExperimentStatus, mirosharkHelperPending, mirosharkHelperStatus, mirosharkMissingTemplateFields, mirosharkPlatform, mirosharkProgressLabel, mirosharkRounds, mirosharkRunPending, mirosharkScenario, mirosharkSelectedTemplate, mirosharkSelectedTemplateFields, mirosharkTemplateInputs, runMirosharkExperiment, runMirosharkScenarioHelper, runtimeModelSelectionsByRuntime, selectedAgent, selectedSwarmRunId, setMirosharkAnalysisAgentId, setMirosharkPlatform, setMirosharkRounds, setMirosharkScenario, startNewMirosharkSimulation, swarmAgents, swarmDecisions, swarmMarket, swarmRuns, swarmSocialPosts, swarmStatusLabel, swarmTemplates, updateMirosharkTemplateInput }} />
      <WalletPanel {...{ AGENT_PAYMENT_PROVIDER_COPY, AgentWalletCard, AgentWalletCardCompact, Button, ChevronLeft, Download, HandCoins, LoaderCircle, RUNTIME_LABELS, RefreshCcw, activeView, copyPaymentPrompt, createDefaultAgentWallet, createLocalWallet, displayAgents, enableHoneyLedger, exchangeAllHoneyForHive, exchangeHoneyForHive, formatHiveAmount, formatRelativeTime, getSurvivalSnapshot, honeyLedgerEnabled, honeyStats, initializeCoreWalletRails, moneyClawStatusByEnvName, refreshRuntimeUsage, refreshWalletBalance, renderAgentKey, resetWalletBurnClock, runWalletVaultBackupAction, runtimeUsage, runtimeUsageLoading, saveMoneyClawKey, selectedAgent, selectedHoneyReward, selectedWallet, selectedWalletSnapshot, sendWalletUsdc, setSelectedAgentId, setWalletExpanded, setWalletPanelMode, testX402Fetch, updateWallet, updateWalletAction, vaultClass, walletActionsByAgent, walletClass, walletExpanded, walletPanelMode, walletStats, walletVaultBackupBusy, walletVaultBackupMessage, walletVaultBackupStatus, walletsByAgent }} />
      <VaultPanel {...{ Activity, BRAIN_SKILL_PROVIDER_FALLBACK, Bot, BrainCircuit, BrainGraphLoader, Button, Cell, Check, CircleAlert, Clock3, DEFAULT_SHARED_VAULT, Download, Eye, FileText, FolderOpen, GitBranch, Hexagon, Image, KeyRound, LoaderCircle, MemoryCell, Network, PlugZap, RefreshCcw, Repeat2, Sparkles, activeView, brainGraph, brainGraphEdgePath, brainGraphLoading, brainGraphStats, brainGraphStatus, brainLayout, brainNodePoints, brainPan, brainSkillAeonSyncing, brainSkillImportAllDescription, brainSkillImportAllLabel, brainSkillImportProvider, brainSkillImportSuccess, brainSkillImportableCount, brainSkills, brainSkillsLoading, brainSkillsStatus, checkControlRoomStatus, checkVaultStatus, controlRoomStatus, displayAgents, endBrainPan, formatBrainDate, gbrainActionStatus, gbrainBusy, gbrainQuery, gbrainQueryResult, gbrainStatus, hermesUpdateRequired, hermesUpdateRequiredDetail, importBrainSkills, inspectBrainNode, moveBrainPan, openSkillBrowser, pairSyncthingVaultSync, queryGbrainFromDashboard, refreshBrainGraph, refreshBrainSkills, refreshGbrainStatus, refreshRuntimeFileRoots, runGbrainAction, runVaultTailnetSync, selectedAgent, selectedBrainNode, selectedBrainTargetIds, setActiveView, setGbrainQuery, setVaultPanelMode, sharedVault, skillRequiresHermesUpdate, splitBrainLabel, startBrainPan, syncBrainSkillsToAeon, updateAllSkillAutoSync, updateSharedVault, updateSkillAutoSync, vaultClass, vaultPanelMode, vaultStatus, vaultSyncPending, vaultSyncStatus, visibleBrainNodes, walletClass }} />
      {activeView === "integrations" ? <NangoIntegrationsView embedded /> : null}
      <UtilityPanels {...{ AgentEnvCard, Button, Check, ChevronDown, ChevronLeft, Download, EnvValueRow, FileText, FileUp, FolderOpen, LoaderCircle, MorePanel, NotificationsPanel, Pencil, Plus, RefreshCcw, RotateCcw, ShieldCheck, Sparkles, URL, Upload, X, activeView, addAgentEnvValue, addSharedEnvValue, agentEnvDrafts, agentSpecificEnvCount, displayAgents, fleetClass, generateSharedEnvSecret, hiveEnvLoading, hiveEnvRestoring, hiveEnvSavingKey, hiveEnvStatus, hiveEnvSyncing, importSharedEnvEntries, listRuntimeFiles, maintenanceBusy, maintenanceMessage, maintenanceReport, markAllNotificationsRead, markNotificationRead, notificationCursor, notificationGroups, notificationSummary, notifications, notificationsLoading, notificationsStatus, openRuntimeFile, promoteRuntimeEnvValue, refreshHiveEnv, refreshMaintenanceReport, refreshNotifications, refreshRuntimeFileRoots, renderAgentKey, restoreSharedEnvBackup, revealedEnvValues, runMaintenanceAction, runtimeEnvSources, runtimeFileDraft, runtimeFileOpen, runtimeFilePath, runtimeFileRootKey, runtimeFileRoots, runtimeFileStatus, runtimeFiles, runtimeModelSelectionsByRuntime, saveAgentEnvValue, saveRuntimeFile, saveSharedEnvValue, selectedRuntimeEnvSource, setActiveView, setAgentEnvDrafts, setHiveEnvRuntimeSourceId, setRuntimeFileDraft, setRuntimeFileOpen, setRuntimeFilePath, setRuntimeFileRootKey, setSharedEnvAddMenuOpen, setSharedEnvDraft, setSharedEnvEditable, setSharedEnvImportOpen, setSharedEnvImportText, sharedBackupStatus, sharedEnvAddMenuOpen, sharedEnvCount, sharedEnvDraft, sharedEnvEditable, sharedEnvImport, sharedEnvImportChangedCount, sharedEnvImportDiff, sharedEnvImportNewCount, sharedEnvImportOpen, sharedEnvImportSameCount, sharedEnvImportText, sharedEnvImporting, sharedEnvSource, sharedVault, syncSharedEnvMachines, toggleEnvValue, updateNotificationSettings, vaultClass, walletClass }} />
      <ChatPanel {...{ Activity, AgentResponseLoader, BEE_WORKER_PRESET_LIST, BrainCircuit, Button, ChatMarkdown, Check, ChevronRight, ComposerField, Copy, Cpu, Download, Eye, Folder, FolderOpen, FolderPlus, GitBranch, HERMES_UPDATE_INTEGRATION_KEYS, Image, KanbanSquare, LoaderCircle, MessageAttachments, MessageSquare, Monitor, Pencil, PlugZap, Plus, RUNTIME_LABELS, RefreshCcw, Repeat2, Search, Send, Settings2, ShieldCheck, Sparkles, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, Upload, X, activeView, addHermesModelFromDraft, aeonEnvKeys, aeonEnvSyncStatus, aeonEnvSyncing, agentCreateDraft, agentCreateMachine, agentRenameDraft, agentRenameEditing, agentRuntimeAdvancedOpen, agentRuntimeFolderBrowsing, agentRuntimeFolderEditing, agentRuntimeFolderStatus, agentSettingsCustomWorker, agentSettingsCustomWorkers, agentSettingsDescription, agentSettingsIntegrationTarget, agentSettingsPanel, agentSettingsPreferredSkills, agentSettingsProvider, agentSettingsRuntime, agentSettingsSelectedCustomWorkerId, agentSettingsSkillProfile, agentSettingsTitle, agentSettingsWorkerClass, agentSettingsWorkerImage, agentSettingsWorkerLabel, agentSettingsWorkerPreset, agentWorkerClassView, applyCustomWorkerClass, attachChatDirectory, attachChatRecentDirectory, attachmentError, attachmentMenuOpen, attachmentMenuRef, beeRoleIconPath, beeRoleLabel, browseAgentRuntimeFolder, busy, chatAttachments, chatClass, chatContextMenu, chatContextMenuRef, chatDirectories, chatDisplayContent, chatFileInputRef, chatFolderCreatorMachine, chatFolderCreatorParentOptions, chatFolderDraft, chatImageInputRef, chatKanbanGeneration, chatSidebarTree, checkStatus, closeAgentSettingsModal, closeChatFolderCreator, createAgentFromModal, createChatFolder, customWorkerDraft, customWorkerImageError, customWorkerImageInputRef, customWorkerSkillSearch, displayAgents, expandedChatFolders, filteredCustomWorkerSkills, filteredSkillBrowserSkills, fleetClass, formatAgentEnvText, formatRelativeTime, generateKanbanTaskFromChat, handleChatFileChange, handleChatImageChange, hasStreamingChunk, hermesUpdateRequired, hermesUpdateRequiredDetail, importRemoteSkillToBrain, installGithubSkillToBrain, lastAssistant, machineGroups, messagesEndRef, messagesScrollRef, openCustomWorkerClassCreator, openSkillBrowser, parseAgentEnvText, recentDirectories, recentDirectoriesExpanded, recording, refreshRuntimeIntegrations, removeChatAttachment, removeChatDirectory, roleModalAgent, runRuntimeIntegrationAction, runtimeBackgroundPrompt, runtimeCapabilities, runtimeIntegrationBusy, runtimeIntegrationMessage, runtimeIntegrationStatus, runtimeModelDraft, runtimeModelProviders, runtimeModelSetupMode, runtimeSessionQuery, runtimeSessionResults, runtimeSetupDefinition, runtimeSetupKey, runtimeUpdateConfirmKey, searchRuntimeSessionsForAgent, selectAgentWorkerClass, selectCustomWorkerClass, selectedAgent, selectedChatDirectory, selectedChatMachine, selectedRuntimeModel, selectedRuntimeModelId, selectedRuntimeModels, selectedRuntimeProvider, sendMessage, sessionNotice, setAeonEnvKeys, setAgentCreateDraft, setAgentRenameDraft, setAgentRenameEditing, setAgentRuntimeAdvancedOpen, setAgentRuntimeFolderEditing, setAgentRuntimeFolderStatus, setAgentSettingsPanel, setAgentWorkerClassView, setAttachmentMenuOpen, setChatContextMenu, setChatFolderDraft, setCustomWorkerDraft, setCustomWorkerSkillSearch, setExpandedChatFolders, setRecentDirectoriesExpanded, setRuntimeBackgroundPrompt, setRuntimeModelDraft, setRuntimeModelSetupMode, setRuntimeSessionQuery, setRuntimeSetupKey, setRuntimeUpdateConfirmKey, setSkillBrowserGithubOpen, setSkillBrowserGithubUrl, setSkillBrowserOpen, setSkillBrowserSearch, setText, sharedVault, skillBrowserGithubInstalling, skillBrowserGithubOpen, skillBrowserGithubUrl, skillBrowserImporting, skillBrowserLoading, skillBrowserOpen, skillBrowserSearch, skillBrowserStatus, skillRequiresHermesUpdate, startAgentChat, startAudioRecording, status, statusAgentId, stopAudioRecording, switchRuntime, syncAeonEnvToGitHub, text, toggleCustomWorkerSkill, updateAgent, updateAgentProfile, updateAgentRuntimeModel, updateAgentSkillProfile, updateChatAutoScroll, uploadCustomWorkerImage, vaultClass, visibleMessages, voiceBands, voiceTarget, voiceTranscript, workerCapabilityBadges }} />

      <DashboardModals {...{ Button, Check, ChevronLeft, Copy, CopyPlus, FileText, FolderOpen, HETZNER_IMAGE_OPTIONS, HETZNER_LOCATION_OPTIONS, HETZNER_SERVER_TYPE_OPTIONS, LoaderCircle, Plus, SetupCell, X, copyMachineInitCommand, copySetupCommand, displayAgents, duplicateAgent, duplicateAgentDraft, fleetClass, initializeMachineProject, kanbanClass, loadMachineDirectories, machineDirectoryBrowser, machineInitCopiedKey, machineInitDraft, machineInitOpen, machineInitStatus, machineInitToken, machineInitTokenStatus, openHetznerEnvFile, saveHetznerToken, selectedHetznerServerType, setDuplicateAgentDraft, setMachineDirectoryBrowser, setMachineInitDraft, setMachineInitOpen, setMachineInitToken, setMachineInitTokenStatus, setSetupMachineKey, setupCollectorCommand, setupCommandCopied, setupMachine }} />
      </div>
    </main>
  );
}
