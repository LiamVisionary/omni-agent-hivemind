import { execFile } from "child_process";
import { promisify } from "util";
import type { AgentProfile, AgentRuntime } from "@/lib/types/agent-runtime";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

type TailscalePeer = {
  ID?: string;
  HostName?: string;
  DNSName?: string;
  OS?: string;
  Online?: boolean;
  TailscaleIPs?: string[];
  LastSeen?: string;
  Relay?: string;
};

type TailscaleStatus = {
  BackendState?: string;
  Self?: TailscalePeer;
  Peer?: Record<string, TailscalePeer>;
};

type Device = {
  self: boolean;
  name: string;
  dnsName: string;
  os: string;
  online: boolean;
  ip: string;
  collectorUrl: string;
  lastSeen?: string;
  relay?: string;
};

type CollectorVersion = {
  appDir?: string;
  commit?: string;
  shortCommit?: string;
  branch?: string;
  dirty?: boolean;
  latestCommit?: string;
  latestShortCommit?: string;
  updateCommand?: string;
};

type CollectorCapabilities = {
  chat?: boolean;
  runtimes?: string[];
  syncthing?: boolean;
  defaultSyncPath?: string;
};

type CollectorEnvSync = {
  ready?: boolean;
  user?: string;
  command?: string;
  error?: string;
};

const QUEEN_RUNTIME_PRIORITY: AgentRuntime[] = ["hermes", "openclaw", "aeon"];

function localDevice(): Device {
  return {
    self: true,
    name: "This machine",
    dnsName: "",
    os: process.platform,
    online: true,
    ip: "127.0.0.1",
    collectorUrl: "http://127.0.0.1:8787",
    relay: "",
  };
}

function dnsLabel(dnsName: string) {
  return dnsName.replace(/\.$/, "").split(".")[0] ?? "";
}

function isGenericHostname(name?: string) {
  const normalized = name?.trim().toLowerCase();
  return !normalized || normalized === "localhost" || normalized === "localhost.localdomain";
}

function displayNameForPeer(peer: TailscalePeer, dnsName: string, ip: string) {
  const magicDnsName = dnsLabel(dnsName);
  return isGenericHostname(peer.HostName)
    ? magicDnsName || ip || "Unknown device"
    : peer.HostName || magicDnsName || ip || "Unknown device";
}

function normalizeName(value?: string) {
  return value?.toLowerCase().replace(/[^a-z0-9]+/g, "") ?? "";
}

function isStaleSelfDuplicate(self: Device | undefined, device: Device) {
  if (!self || device.self || device.online) return false;
  return normalizeName(self.name) !== "" && normalizeName(self.name) === normalizeName(device.name);
}

function simplifyDevice(peer: TailscalePeer, self = false): Device {
  const ip = peer.TailscaleIPs?.find((value) => /^\d+\.\d+\.\d+\.\d+$/.test(value)) ?? peer.TailscaleIPs?.[0] ?? "";
  const dnsName = peer.DNSName?.replace(/\.$/, "") ?? "";
  return {
    self,
    name: displayNameForPeer(peer, dnsName, ip),
    dnsName,
    os: peer.OS ?? "unknown",
    online: Boolean(peer.Online),
    ip,
    collectorUrl: ip ? `http://${ip}:8787` : "",
    lastSeen: peer.LastSeen,
    relay: peer.Relay ?? "",
  };
}

async function tailscaleDevices() {
  const { stdout } = await execFileAsync("tailscale", ["status", "--json"], {
    timeout: 5_000,
    maxBuffer: 1_500_000,
  }).catch(() => ({ stdout: "" }));
  if (!stdout) return [localDevice()];
  const status = JSON.parse(stdout) as TailscaleStatus;
  const self = status.Self ? simplifyDevice(status.Self, true) : undefined;
  const peers = Object.values(status.Peer ?? {})
    .map((peer) => simplifyDevice(peer))
    .filter((device) => !isStaleSelfDuplicate(self, device));
  const devices = [...(self ? [self] : []), ...peers];
  return devices.length ? devices : [localDevice()];
}

async function fetchJson(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(6_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json() as Promise<Record<string, unknown>>;
}

function hasQueenAgent(agents: AgentProfile[]) {
  return agents.some((agent) => (
    agent.beeRole === "queen"
    || /queen|orchestrat|lead/i.test(agent.name)
  ));
}

function queenRuntimeRank(runtime: AgentRuntime) {
  const index = QUEEN_RUNTIME_PRIORITY.indexOf(runtime);
  return index === -1 ? QUEEN_RUNTIME_PRIORITY.length : index;
}

function defaultQueenAgent(device: Device, agents: AgentProfile[], capabilities?: CollectorCapabilities): AgentProfile | null {
  if (hasQueenAgent(agents)) return null;
  const configuredRuntimes = new Set((capabilities?.runtimes ?? [])
    .filter((runtime): runtime is AgentRuntime => ["hermes", "openclaw", "aeon"].includes(runtime)));
  const candidates = agents
    .filter((agent) => configuredRuntimes.size === 0 || configuredRuntimes.has(agent.runtime))
    .sort((left, right) => queenRuntimeRank(left.runtime) - queenRuntimeRank(right.runtime));
  const base = candidates[0];
  if (!base) return null;
  const machineSlug = (device.name || device.ip || "machine").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "machine";
  return {
    ...base,
    id: `queen-bee-${machineSlug}-${base.runtime}`,
    name: "Queen Bee",
    agentId: base.agentId || base.id,
    beeRole: "queen",
    workerClass: "planner",
    runtimeKind: base.runtimeKind,
    runtimeCapabilities: base.runtimeCapabilities,
    telemetryUrl: device.collectorUrl,
    machineName: device.name,
    collectorCapabilities: capabilities,
  };
}

export async function GET() {
  const devices = await tailscaleDevices().catch(() => [localDevice()]);
  const machines = await Promise.all(devices.map(async (device) => {
    if (!device.collectorUrl) {
      return { device, collector: "missing", agents: [], snapshots: [] };
    }

    let agents: AgentProfile[] = [];
    let version: CollectorVersion | undefined;
    let capabilities: CollectorCapabilities | undefined;
    let envSync: CollectorEnvSync | undefined;
    try {
      const healthData = await fetchJson(`${device.collectorUrl}/health`).catch(() => null) as {
        version?: CollectorVersion;
        capabilities?: CollectorCapabilities;
        envSync?: CollectorEnvSync;
      } | null;
      version = healthData?.version;
      capabilities = healthData?.capabilities ?? { chat: false, runtimes: [] };
      envSync = healthData?.envSync;
      const agentData = await fetchJson(`${device.collectorUrl}/agents`) as { agents?: AgentProfile[] };
      agents = (agentData.agents ?? []).map((agent) => ({
        ...agent,
        telemetryUrl: device.collectorUrl,
        machineName: device.name,
        collectorCapabilities: capabilities,
      }));
    } catch {
      return {
        device,
        collector: device.online ? "not-installed" : "offline",
        agents: [],
        snapshots: [],
      };
    }

    try {
      const snapshotData = await fetchJson(`${device.collectorUrl}/snapshot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agents }),
      }) as { snapshots?: unknown[] };
      const visibleAgents = [
        ...agents,
        ...[defaultQueenAgent(device, agents, capabilities)].filter((agent): agent is AgentProfile => Boolean(agent)),
      ];
      return {
        device,
        collector: "ready",
        version,
        capabilities,
        envSync,
        agents: visibleAgents,
        snapshots: snapshotData.snapshots ?? [],
      };
    } catch {
      const visibleAgents = [
        ...agents,
        ...[defaultQueenAgent(device, agents, capabilities)].filter((agent): agent is AgentProfile => Boolean(agent)),
      ];
      return {
        device,
        collector: "ready",
        version,
        capabilities,
        envSync,
        agents: visibleAgents,
        snapshots: [],
      };
    }
  }));

  return Response.json({ ok: true, machines });
}
