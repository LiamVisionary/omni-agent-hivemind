export type AgentRuntime = "openclaw" | "hermes" | "aeon";

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
  };
}

export interface SharedVaultConfig {
  enabled: boolean;
  vaultPath: string;
  inboxFolder: string;
  sharedNotePath: string;
  kanbanFolder: string;
  controlRoomPath: string;
  instructions: string;
}

export const DEFAULT_SHARED_VAULT: SharedVaultConfig = {
  enabled: true,
  vaultPath: process.env.NEXT_PUBLIC_OBSIDIAN_VAULT_PATH ?? "~/Documents/Obsidian/OpenClaw Vault",
  inboxFolder: "Agent Inbox",
  sharedNotePath: "Agent Team/Shared Context.md",
  kanbanFolder: process.env.NEXT_PUBLIC_OBSIDIAN_KANBAN_FOLDER ?? "Projects/OpenClaw/Kanban",
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
    gatewayUrl: process.env.NEXT_PUBLIC_AEON_BASE_URL ?? "http://127.0.0.1:8799",
    chatPath: "/chat",
    statusPath: "/health",
  },
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
  };
}

export function getRuntimeUrl(profile: AgentProfile, path?: string): string {
  if (profile.runtime === "openclaw") return profile.gatewayUrl;
  const base = profile.gatewayUrl.replace(/\/+$/, "");
  const suffix = path || profile.chatPath || "/chat";
  return `${base}${suffix.startsWith("/") ? suffix : `/${suffix}`}`;
}
