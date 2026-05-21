export type AgentRuntime = "openclaw" | "hermes" | "aeon";
export type AgentRuntimeKind = "interactive" | "background" | "gateway" | "collector";

export interface RuntimeCapabilities {
  status?: boolean;
  chat?: boolean;
  skills?: boolean;
  schedules?: boolean;
  runs?: boolean;
  outputs?: boolean;
  memory?: boolean;
  notifications?: boolean;
  setup?: boolean;
  walletTools?: boolean;
}

export type BeeAgentRole = "queen" | "worker" | "observer" | "human";
export type BeeWorkerClass = "general" | "planner" | "code" | "vision" | "writer" | "research" | "artist" | "ops" | "qa";

export interface CustomWorkerClassProfile {
  id: string;
  label: string;
  imageSrc?: string;
  skillProfilePrompt: string;
  preferredSkillSlugs: string[];
}

export interface AgentProfile {
  id: string;
  name: string;
  runtime: AgentRuntime;
  gatewayUrl: string;
  token?: string;
  agentId?: string;
  sessionKey?: string;
  chatPath?: string;
  statusPath?: string;
  useSharedVault?: boolean;
  localDataDir?: string;
  machineName?: string;
  telemetryUrl?: string;
  collectorCapabilities?: {
    chat?: boolean;
    runtimes?: string[];
    syncthing?: boolean;
    defaultSyncPath?: string;
  };
  runtimeKind?: AgentRuntimeKind;
  runtimeCapabilities?: RuntimeCapabilities;
  aeonRepo?: string;
  aeonBranch?: string;
  aeonLocalPath?: string;
  a2aUrl?: string;
  aeonMode?: "github" | "a2a" | "local";
  beeRole?: BeeAgentRole;
  workerClass?: BeeWorkerClass;
  customWorkerClass?: CustomWorkerClassProfile;
  customWorkerClasses?: CustomWorkerClassProfile[];
  selectedCustomWorkerClassId?: string;
  skillProfilePrompt?: string;
  preferredSkillSlugs?: string[];
}

export interface SharedVaultConfig {
  enabled: boolean;
  vaultPath: string;
  tailnetSyncHost: string;
  tailnetSyncPath: string;
  tailnetSyncDirection: "bidirectional" | "push" | "pull";
  tailnetSyncEnabled: boolean;
  tailnetSyncIntervalSeconds: number;
  inboxFolder: string;
  sharedNotePath: string;
  kanbanFolder: string;
  notificationsFolder: string;
  noteTaskImportFolders: string;
  noteTaskImportEnabled: boolean;
  controlRoomPath: string;
  instructions: string;
}

const DEFAULT_TAILNET_SYNC_ENABLED = process.env.NEXT_PUBLIC_TAILNET_SYNC_ENABLED === "true";

export const DEFAULT_SHARED_VAULT: SharedVaultConfig = {
  enabled: true,
  vaultPath: process.env.NEXT_PUBLIC_OBSIDIAN_VAULT_PATH ?? "~/Documents/Obsidian/hivemindos-vault",
  tailnetSyncHost: "",
  tailnetSyncPath: "",
  tailnetSyncDirection: "bidirectional",
  tailnetSyncEnabled: DEFAULT_TAILNET_SYNC_ENABLED,
  tailnetSyncIntervalSeconds: 20,
  inboxFolder: "Agent Inbox",
  sharedNotePath: "HivemindOS/Shared Context.md",
  kanbanFolder: process.env.NEXT_PUBLIC_OBSIDIAN_KANBAN_FOLDER ?? "Projects/HivemindOS/Kanban",
  notificationsFolder: process.env.NEXT_PUBLIC_OBSIDIAN_NOTIFICATIONS_FOLDER ?? "agent-notifications",
  noteTaskImportFolders: "Projects\nInbox",
  noteTaskImportEnabled: false,
  controlRoomPath: process.env.NEXT_PUBLIC_HERMES_CONTROL_ROOM_PATH ?? "~/agent-control-room",
  instructions: "Use this vault as the shared memory and handoff space for all local agents. Read AGENTS.md before durable edits. Use the Hermes Agent Control Room as the operating manual, registry, runbook library, and task-bus template.",
};

export const RUNTIME_LABELS: Record<AgentRuntime, string> = {
  openclaw: "OpenClaw",
  hermes: "Hermes",
  aeon: "Aeon",
};

export const RUNTIME_DEFAULTS: Record<
  AgentRuntime,
  Pick<AgentProfile, "gatewayUrl" | "chatPath" | "statusPath">
> = {
  openclaw: {
    gatewayUrl: "ws://127.0.0.1:18789",
    chatPath: "",
    statusPath: "",
  },
  hermes: {
    gatewayUrl: process.env.NEXT_PUBLIC_HERMES_BASE_URL ?? "http://127.0.0.1:8642",
    chatPath: "/chat",
    statusPath: "/health",
  },
  aeon: {
    gatewayUrl: process.env.NEXT_PUBLIC_AEON_A2A_URL ?? process.env.NEXT_PUBLIC_AEON_BASE_URL ?? "http://127.0.0.1:41241",
    chatPath: "",
    statusPath: "/health",
  },
};

export const RUNTIME_CAPABILITIES: Record<AgentRuntime, RuntimeCapabilities> = {
  openclaw: {
    status: true,
    chat: true,
    skills: true,
    schedules: true,
    memory: true,
    notifications: true,
    setup: true,
    walletTools: true,
  },
  hermes: {
    status: true,
    chat: true,
    runs: true,
    memory: true,
    setup: true,
    walletTools: true,
  },
  aeon: {
    status: true,
    skills: true,
    schedules: true,
    runs: true,
    outputs: true,
    memory: true,
    notifications: true,
    setup: true,
  },
};

export const RUNTIME_KINDS: Record<AgentRuntime, AgentRuntimeKind> = {
  openclaw: "gateway",
  hermes: "interactive",
  aeon: "background",
};

export function createAgentProfile(runtime: AgentRuntime, index = 1): AgentProfile {
  const defaults = RUNTIME_DEFAULTS[runtime];
  return {
    id: `${runtime}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: `${RUNTIME_LABELS[runtime]} Agent ${index}`,
    runtime,
    gatewayUrl: defaults.gatewayUrl,
    chatPath: defaults.chatPath,
    statusPath: defaults.statusPath,
    agentId: runtime === "openclaw" ? "main" : "",
    localDataDir: runtime === "hermes" && index === 1 ? "~/.hermes" : "",
    machineName: "local",
    telemetryUrl: "",
    useSharedVault: true,
    runtimeKind: RUNTIME_KINDS[runtime],
    runtimeCapabilities: RUNTIME_CAPABILITIES[runtime],
    aeonRepo: runtime === "aeon" ? process.env.NEXT_PUBLIC_AEON_REPO ?? "" : undefined,
    aeonBranch: runtime === "aeon" ? "main" : undefined,
    aeonLocalPath: runtime === "aeon" ? process.env.NEXT_PUBLIC_AEON_LOCAL_PATH ?? "" : undefined,
    a2aUrl: runtime === "aeon" ? defaults.gatewayUrl : undefined,
    aeonMode: runtime === "aeon" ? "github" : undefined,
    beeRole: runtime === "openclaw" && index === 1 ? "queen" : "worker",
    workerClass: runtime === "openclaw" && index === 1 ? "general" : "general",
  };
}

export function getRuntimeUrl(profile: AgentProfile, path?: string): string {
  if (profile.runtime === "openclaw") return profile.gatewayUrl;
  const base = profile.gatewayUrl.replace(/\/+$/, "");
  const suffix = path || profile.chatPath || "/chat";
  return `${base}${suffix.startsWith("/") ? suffix : `/${suffix}`}`;
}
