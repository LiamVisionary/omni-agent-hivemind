"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { AgentProfile, AgentRuntime, SharedVaultConfig } from "@/lib/types/agent-runtime";
import { createAgentProfile, DEFAULT_SHARED_VAULT, RUNTIME_DEFAULTS, RUNTIME_LABELS } from "@/lib/types/agent-runtime";

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
  online: boolean;
  self: boolean;
  collector: "ready" | "not-installed" | "offline" | "missing" | "unknown";
  agents: AgentProfile[];
};

type DiscoveredMachine = {
  device: TailscaleDevice;
  collector: MachineGroup["collector"];
  agents: AgentProfile[];
  snapshots: AgentSnapshot[];
  lastSeenAt?: number;
};

const STORAGE_KEY = "openclaw-next.agentProfiles.v1";
const VAULT_STORAGE_KEY = "openclaw-next.sharedVault.v1";
const TASK_STORAGE_KEY = "openclaw-next.agentTasks.v1";

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

function friendlySource(source?: string) {
  if (!source) return "Activity";
  if (source === "hermes-state") return "Hermes history";
  if (source.startsWith("task-bus")) return "Task handoff";
  if (source.startsWith("file/") || source.startsWith("data/")) return "Runtime files";
  if (source === "runtime-status") return "Agent status";
  if (source === "dashboard-chat") return "Dashboard chat";
  return source;
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

function mergeDiscoveredMachines(current: DiscoveredMachine[], incoming: DiscoveredMachine[]) {
  const currentByKey = new Map(current.map((machine) => [collectorKey(machine.device.collectorUrl) || machine.device.name, machine]));
  const now = Date.now();

  return incoming.map((machine) => {
    const key = collectorKey(machine.device.collectorUrl) || machine.device.name;
    const previous = currentByKey.get(key);
    const hasFreshAgentData = machine.collector === "ready" && machine.agents.length > 0;
    const hasFreshSnapshots = machine.snapshots.length > 0;

    if (!previous || hasFreshAgentData || hasFreshSnapshots) {
      return { ...machine, lastSeenAt: hasFreshAgentData || hasFreshSnapshots ? now : previous?.lastSeenAt };
    }

    if (previous.agents.length === 0 && previous.snapshots.length === 0) {
      return { ...machine, lastSeenAt: previous.lastSeenAt };
    }

    return {
      ...machine,
      collector: previous.collector === "ready" ? "ready" : machine.collector,
      agents: previous.agents,
      snapshots: previous.snapshots,
      lastSeenAt: previous.lastSeenAt,
    };
  });
}

export default function Home() {
  const [agents, setAgents] = useState<AgentProfile[]>(() => parseStoredAgents());
  const [selectedAgentId, setSelectedAgentId] = useState(() => parseStoredAgents()[0]?.id ?? "openclaw-main");
  const [draftRuntime, setDraftRuntime] = useState<AgentRuntime>("hermes");
  const [text, setText] = useState("");
  const [status, setStatus] = useState<GatewayStatus | null>(null);
  const [vaultStatus, setVaultStatus] = useState<Record<string, unknown> | null>(null);
  const [controlRoomStatus, setControlRoomStatus] = useState<Record<string, unknown> | null>(null);
  const [sharedVault, setSharedVault] = useState<SharedVaultConfig>(() => parseStoredVault());
  const [messagesByAgent, setMessagesByAgent] = useState<Record<string, ChatMessage[]>>({});
  const [tasks, setTasks] = useState<AgentTask[]>(() => parseStoredTasks());
  const [expandedAgentId, setExpandedAgentId] = useState<string | null>(null);
  const [fleetSnapshots, setFleetSnapshots] = useState<Record<string, AgentSnapshot>>({});
  const [fleetCheckedAt, setFleetCheckedAt] = useState<number | null>(null);
  const [tailscaleDevices, setTailscaleDevices] = useState<TailscaleDevice[]>([]);
  const [tailscaleStatus, setTailscaleStatus] = useState("Checking Tailnet...");
  const [discoveredMachines, setDiscoveredMachines] = useState<DiscoveredMachine[]>([]);
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
      setFleetSnapshots(Object.fromEntries(data.snapshots.map((snapshot) => [snapshot.agentId, snapshot])));
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
        setFleetSnapshots((current) => ({
          ...current,
          ...Object.fromEntries(discoveredSnapshots.map((snapshot) => [snapshot.agentId, snapshot])),
        }));
      }
    }
    refreshDiscovery();
    const timer = window.setInterval(refreshDiscovery, 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const discoveredAgents = useMemo(
    () => discoveredMachines.flatMap((machine) => machine.agents ?? []),
    [discoveredMachines],
  );

  const displayAgents = useMemo(
    () => [
      ...agents,
      ...discoveredAgents.filter((agent) => !agents.some((configured) => configured.id === agent.id)),
    ],
    [agents, discoveredAgents],
  );

  const selectedAgent = useMemo(
    () => displayAgents.find((agent) => agent.id === selectedAgentId) ?? displayAgents[0],
    [displayAgents, selectedAgentId],
  );

  const messages = useMemo(
    () => selectedAgent
      ? messagesByAgent[selectedAgent.id] ?? [{
        role: "system" as const,
        content: `Chatting with ${selectedAgent.name}. Configure its runtime settings on the left, then send a message.`,
      }]
      : [],
    [messagesByAgent, selectedAgent],
  );

  const lastAssistant = useMemo(
    () => [...messages].reverse().find((message) => message.role === "assistant")?.content ?? "",
    [messages],
  );

  const agentWorkById = useMemo(() => {
    return Object.fromEntries(displayAgents.map((agent) => {
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
        .sort((a, b) => b.updatedAt - a.updatedAt);
      return [agent.id, work];
    }));
  }, [displayAgents, fleetSnapshots, messagesByAgent, tasks]);

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
      online: device.online,
      self: device.self,
      collector: (discovered?.collector ?? "unknown") as MachineGroup["collector"],
      agents: [] as AgentProfile[],
      };
    });
    const unassigned: MachineGroup = {
      key: "unassigned",
      name: "Not connected yet",
      address: "These saved agents are waiting for a machine collector",
      collectorUrl: "",
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

    return [...groups, ...(unassigned.agents.length > 0 ? [unassigned] : [])];
  }, [displayAgents, discoveredMachines, tailscaleDevices]);

  function updateAgent(patch: Partial<AgentProfile>) {
    if (!selectedAgent) return;
    setAgents((current) => current.map((agent) => (
      agent.id === selectedAgent.id ? { ...agent, ...patch } : agent
    )));
  }

  function updateSharedVault(patch: Partial<SharedVaultConfig>) {
    setSharedVault((current) => ({ ...current, ...patch }));
  }

  function addAgent(runtime: AgentRuntime = draftRuntime) {
    const next = createAgentProfile(runtime, runtimeCount(agents, runtime) + 1);
    setAgents((current) => [...current, next]);
    setSelectedAgentId(next.id);
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

  function upsertTask(task: AgentTask) {
    setTasks((current) => [task, ...current.filter((item) => item.id !== task.id)].slice(0, 80));
  }

  function updateTask(taskId: string, patch: Partial<AgentTask>) {
    setTasks((current) => current.map((task) => (
      task.id === taskId ? { ...task, ...patch, updatedAt: Date.now() } : task
    )));
  }

  async function checkStatus() {
    if (!selectedAgent) return;
    setStatus(null);
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
        <div>
          <p className="eyebrow">Multi-runtime local agents</p>
          <h1>OpenClaw Next</h1>
          <p className="lede">
            Run OpenClaw, Hermes, and Aeon agents from one dashboard. Create as
            many profiles as you need and choose the runtime per agent.
          </p>
        </div>
        <div className="statusPanel">
          <button type="button" onClick={checkStatus} disabled={!selectedAgent}>
            Check {selectedAgent ? RUNTIME_LABELS[selectedAgent.runtime] : "runtime"}
          </button>
          <div className="statusText">
            {status ? JSON.stringify(status, null, 2) : "Runtime status will appear here."}
          </div>
        </div>
      </section>

      <section className="agentRail">
        <div className="agentRailHeader">
          <div>
            <h2>Agent Control Room</h2>
            <p>
              Machines come from Tailscale. Agents appear inside the machine that owns their collector.
              {fleetCheckedAt ? ` Last scan ${formatRelativeTime(fleetCheckedAt)}.` : ""}
              {` ${tailscaleStatus}.`}
            </p>
          </div>
          <div className="addAgent">
            <select value={draftRuntime} onChange={(event) => setDraftRuntime(event.target.value as AgentRuntime)}>
              {Object.entries(RUNTIME_LABELS).map(([runtime, label]) => (
                <option value={runtime} key={runtime}>{label}</option>
              ))}
            </select>
            <button type="button" onClick={() => addAgent()}>Add Agent</button>
          </div>
        </div>

        <div className="machineBoard">
          {machineGroups.map((machine) => (
            <section className={`machineGroup ${machine.key === "unassigned" ? "needsSetup" : ""}`} key={machine.key}>
              <div className="machineHeader">
                <div>
                  <span>{machine.self ? "Local machine" : machine.online ? "Tailnet machine" : "Offline machine"}</span>
                  <h3>{machine.name}</h3>
                  <p>{machine.address}</p>
                  {machine.collectorUrl ? <small>{machine.collectorUrl}</small> : null}
                </div>
                <strong>{machine.agents.length} agent{machine.agents.length === 1 ? "" : "s"}</strong>
              </div>

              <div className="agentList">
                {machine.agents.length > 0 ? machine.agents.map((agent) => {
                  const agentWork = agentWorkById[agent.id] ?? [];
                  const visibleWork = expandedAgentId === agent.id ? agentWork : agentWork.slice(0, 3);
                  const activeCount = agentWork.filter((task) => task.status === "active").length;
                  const snapshot = fleetSnapshots[agent.id];
                  const state = friendlyAgentState(snapshot, Boolean(agent.telemetryUrl || machine.self), activeCount);
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
                          <span>{RUNTIME_LABELS[agent.runtime]}</span>
                          <strong>{agent.name}</strong>
                          <small>{agent.agentId || "default agent"}</small>
                        </button>
                        <span className={`agentState ${state.tone}`}>{state.label}</span>
                      </div>

                      <div className="agentBubbleStack" aria-label={`${agent.name} work bubbles`}>
                        {visibleWork.length > 0 ? visibleWork.map((task) => (
                          <button
                            type="button"
                            className={`agentBubble ${task.status}`}
                            key={`${agent.id}-${task.id}`}
                            onClick={() => setSelectedAgentId(agent.id)}
                          >
                            <span>{task.status === "active" ? "Working now" : task.status === "failed" ? "Needs attention" : "Recent activity"}</span>
                            <strong>{task.title}</strong>
                            <p>{task.lastMessage}</p>
                            <small>{friendlySource(task.source)} · {task.updatedAt > 0 ? formatRelativeTime(task.updatedAt) : "This session"}</small>
                          </button>
                        )) : (
                          <button
                            type="button"
                            className="agentBubble idle"
                            onClick={() => setSelectedAgentId(agent.id)}
                          >
                            <span>{state.tone === "setup" ? "Needs attention" : "Quiet"}</span>
                            <strong>{friendlyEmptyTitle(snapshot, Boolean(agent.telemetryUrl || machine.self))}</strong>
                            <p>{friendlyEmptyBody(snapshot, Boolean(agent.telemetryUrl || machine.self))}</p>
                            <small>{machine.name}</small>
                          </button>
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
                        <span className="agentEndpoint">{agent.telemetryUrl || agent.gatewayUrl || machine.collectorUrl}</span>
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

      <section className="vaultPanel">
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

      {selectedAgent ? (
        <section className="workspace">
          <aside className="settings">
            <div className="settingsHeader">
              <h2>{selectedAgent.name}</h2>
              <div className="settingsActions">
                <button type="button" onClick={duplicateAgent}>Duplicate</button>
                <button type="button" onClick={() => deleteAgent()} disabled={agents.length <= 1}>Delete</button>
              </div>
            </div>

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

            <label className="toggleRow">
              <input
                type="checkbox"
                checked={selectedAgent.useSharedVault !== false}
                onChange={(event) => updateAgent({ useSharedVault: event.target.checked })}
              />
              Use shared Obsidian vault
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

            <p>
              Add any mix of runtime profiles. OpenClaw uses the native gateway
              protocol; Hermes and Aeon use HTTP endpoints that can stream SSE
              or return JSON.
            </p>
          </aside>

          <section className="chat">
            <div className="chatHeader">
              <div>
                <h2>{selectedAgent.name}</h2>
                <p>{RUNTIME_LABELS[selectedAgent.runtime]} · {selectedAgent.gatewayUrl}</p>
              </div>
            </div>
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
        </section>
      ) : null}
    </main>
  );
}
