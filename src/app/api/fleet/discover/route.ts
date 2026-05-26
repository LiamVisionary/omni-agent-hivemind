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
  LastHandshake?: string;
  CurAddr?: string;
  RxBytes?: number;
  TxBytes?: number;
  Active?: boolean;
  Relay?: string;
};

type TailscaleStatus = {
  BackendState?: string;
  Self?: TailscalePeer;
  Peer?: Record<string, TailscalePeer>;
};

type HivemindLinkStatus = {
  ok?: boolean;
  backendState?: string;
  authUrl?: string;
  magicDnsSuffix?: string;
  self?: TailscalePeer;
  peer?: Record<string, TailscalePeer>;
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
  lastHandshake?: string;
  curAddr?: string;
  rxBytes?: number;
  txBytes?: number;
  active?: boolean;
  relay?: string;
};

type FleetDeviceStatus = {
  devices: Device[];
  source: string;
  link?: HivemindLinkStatus;
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
const COLLECTOR_FETCH_TIMEOUT_MS = 2_500;

function localCollectorUrl() {
  return `http://127.0.0.1:${process.env.AGENT_TELEMETRY_PORT || "8787"}`;
}

function localDevice(): Device {
  return {
    self: true,
    name: "This machine",
    dnsName: "",
    os: process.platform,
    online: true,
    ip: "127.0.0.1",
    collectorUrl: localCollectorUrl(),
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
  if (normalizeName(peer.HostName).startsWith("hivemindos") && magicDnsName) return magicDnsName;
  return isGenericHostname(peer.HostName)
    ? magicDnsName || ip || "Unknown device"
    : peer.HostName || magicDnsName || ip || "Unknown device";
}

function normalizeName(value?: string) {
  return value?.toLowerCase().replace(/[^a-z0-9]+/g, "") ?? "";
}

function normalizeDnsName(value?: string) {
  return value?.replace(/\.$/, "").toLowerCase() ?? "";
}

function isSameTailscalePeer(left?: TailscalePeer, right?: TailscalePeer) {
  if (!left || !right) return false;
  const leftIps = new Set(left.TailscaleIPs ?? []);
  if ((right.TailscaleIPs ?? []).some((ip) => leftIps.has(ip))) return true;
  const leftDns = normalizeDnsName(left.DNSName);
  const rightDns = normalizeDnsName(right.DNSName);
  return Boolean(leftDns && rightDns && leftDns === rightDns);
}

function deviceIdentityKey(device: Device) {
  const dnsName = normalizeName(dnsLabel(device.dnsName));
  const name = normalizeName(device.name) || dnsName;
  if (name.startsWith("hivemindos")) return dnsName || name;
  if (device.self) return "self";
  return name || device.ip || device.collectorUrl;
}

function isHivemindLinkDevice(device: Device) {
  return normalizeName(device.name).startsWith("hivemindos")
    || normalizeName(dnsLabel(device.dnsName)).startsWith("hivemindos");
}

function isMobileDevice(device: Device) {
  return /^(ios|android)$/i.test(device.os);
}

function hivemindMachineBase(device: Device) {
  const normalizedName = normalizeName(device.name);
  const normalizedDnsName = normalizeName(dnsLabel(device.dnsName));
  const value = normalizedName.startsWith("hivemindos") ? normalizedName : normalizedDnsName;
  if (!value.startsWith("hivemindos")) return "";
  return value.replace(/^hivemindos/, "").replace(/local\d*$/, "");
}

function isStaleSelfDuplicate(self: Device | undefined, device: Device) {
  if (!self || device.self || device.online) return false;
  const selfBase = hivemindMachineBase(self);
  const deviceBase = hivemindMachineBase(device);
  if (selfBase && deviceBase && selfBase === deviceBase) return true;
  return normalizeName(self.name) !== "" && normalizeName(self.name) === normalizeName(device.name);
}

function deviceFreshnessScore(device: Device) {
  return (device.self ? 10_000 : 0)
    + (device.online ? 1_000 : 0)
    + (device.active ? 100 : 0)
    + (device.lastHandshake && !device.lastHandshake.startsWith("0001-01-01") ? 10 : 0)
    + ((device.rxBytes ?? 0) > 0 || (device.txBytes ?? 0) > 0 ? 1 : 0);
}

function dedupeDevices(devices: Device[]) {
  const byIdentity = new Map<string, Device>();
  for (const device of devices) {
    const key = deviceIdentityKey(device);
    const previous = byIdentity.get(key);
    if (!previous || deviceFreshnessScore(device) > deviceFreshnessScore(previous)) {
      byIdentity.set(key, device);
    }
  }
  return [...byIdentity.values()].filter((device) => isHivemindLinkDevice(device) || isMobileDevice(device));
}

function linkCollectorUrl(ip: string) {
  const controlUrl = (process.env.HIVE_LINK_CONTROL_URL || "http://127.0.0.1:8788").replace(/\/+$/, "");
  return `${controlUrl}/peer/${encodeURIComponent(`${ip}:8787`)}`;
}

function simplifyDevice(peer: TailscalePeer, self = false, viaLink = false): Device {
  const ip = peer.TailscaleIPs?.find((value) => /^\d+\.\d+\.\d+\.\d+$/.test(value)) ?? peer.TailscaleIPs?.[0] ?? "";
  const dnsName = peer.DNSName?.replace(/\.$/, "") ?? "";
  return {
    self,
    name: self ? "This Mac" : displayNameForPeer(peer, dnsName, ip),
    dnsName,
    os: peer.OS ?? "unknown",
    online: Boolean(peer.Online),
    ip,
    collectorUrl: self ? localCollectorUrl() : ip ? (viaLink ? linkCollectorUrl(ip) : `http://${ip}:8787`) : "",
    lastSeen: peer.LastSeen,
    lastHandshake: peer.LastHandshake,
    curAddr: peer.CurAddr ?? "",
    rxBytes: peer.RxBytes ?? 0,
    txBytes: peer.TxBytes ?? 0,
    active: Boolean(peer.Active),
    relay: peer.Relay ?? "",
  };
}

async function hivemindLinkStatus(): Promise<HivemindLinkStatus | null> {
  const controlUrl = process.env.HIVE_LINK_CONTROL_URL || "http://127.0.0.1:8788";
  try {
    const response = await fetch(`${controlUrl.replace(/\/+$/, "")}/status`, {
      cache: "no-store",
      signal: AbortSignal.timeout(2_000),
    });
    if (!response.ok) return null;
    return await response.json() as HivemindLinkStatus;
  } catch {
    return null;
  }
}

async function systemTailscaleSelf(): Promise<TailscalePeer | undefined> {
  const { stdout } = await execFileAsync("tailscale", ["status", "--json"], {
    timeout: 5_000,
    maxBuffer: 1_500_000,
  }).catch(() => ({ stdout: "" }));
  if (!stdout) return undefined;
  try {
    return (JSON.parse(stdout) as TailscaleStatus).Self;
  } catch {
    return undefined;
  }
}

function devicesFromStatus(status: TailscaleStatus | HivemindLinkStatus, viaLink = false, ignoredPeer?: TailscalePeer) {
  const isCliStatus = Object.prototype.hasOwnProperty.call(status, "Self") || Object.prototype.hasOwnProperty.call(status, "Peer");
  const selfPeer = isCliStatus ? (status as TailscaleStatus).Self : (status as HivemindLinkStatus).self;
  const peerMap = isCliStatus ? (status as TailscaleStatus).Peer : (status as HivemindLinkStatus).peer;
  const self = selfPeer ? simplifyDevice(selfPeer, true, viaLink) : undefined;
  const peers = Object.values(peerMap ?? {})
    .filter((peer) => !isSameTailscalePeer(peer, ignoredPeer))
    .map((peer) => simplifyDevice(peer, false, viaLink))
    .filter((device) => !isStaleSelfDuplicate(self, device));
  const devices = dedupeDevices([...(self ? [self] : []), ...peers]);
  return devices.length ? devices : [localDevice()];
}

async function tailscaleDevices(): Promise<FleetDeviceStatus> {
  const link = await hivemindLinkStatus();
  if (link) {
    const localSystemSelf = await systemTailscaleSelf();
    return {
      devices: devicesFromStatus(link, true, localSystemSelf),
      link,
      source: "hivemind-link",
    };
  }

  const { stdout } = await execFileAsync("tailscale", ["status", "--json"], {
    timeout: 5_000,
    maxBuffer: 1_500_000,
  }).catch(() => ({ stdout: "" }));
  if (!stdout) return { devices: [localDevice()], source: "local" };
  try {
    return {
      devices: devicesFromStatus(JSON.parse(stdout) as TailscaleStatus),
      source: "tailscale-cli",
    };
  } catch {
    return { devices: [localDevice()], source: "local" };
  }
}

async function fetchJson(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(COLLECTOR_FETCH_TIMEOUT_MS),
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
  const fleetStatus = await tailscaleDevices().catch((): FleetDeviceStatus => ({ devices: [localDevice()], source: "local" }));
  const devices = fleetStatus.devices;
  const discovered = await Promise.all(devices.map(async (device) => {
    if (!device.collectorUrl) {
      return { device, collector: "missing", agents: [], snapshots: [] };
    }

    let agents: AgentProfile[] = [];
    let version: CollectorVersion | undefined;
    let capabilities: CollectorCapabilities | undefined;
    let envSync: CollectorEnvSync | undefined;
    try {
      const healthData = await fetchJson(`${device.collectorUrl}/health`) as {
        version?: CollectorVersion;
        capabilities?: CollectorCapabilities;
        envSync?: CollectorEnvSync;
      };
      version = healthData.version;
      capabilities = healthData.capabilities ?? { chat: false, runtimes: [] };
      envSync = healthData.envSync;
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
  const machines = dedupeMachines(discovered);

  return Response.json({
    ok: true,
    source: fleetStatus.source,
    hivemindLink: fleetStatus.link ? {
      ok: fleetStatus.link.ok === true,
      backendState: fleetStatus.link.backendState,
      authUrl: fleetStatus.link.authUrl,
      magicDnsSuffix: fleetStatus.link.magicDnsSuffix,
    } : undefined,
    machines,
  });
}

function machineScore(machine: {
  device: Device;
  collector: string;
  agents: AgentProfile[];
}) {
  return (machine.device.self ? 10_000 : 0)
    + (machine.collector === "ready" ? 1_000 : 0)
    + (machine.agents.length * 10)
    + deviceFreshnessScore(machine.device);
}

function dedupeMachines<T extends { device: Device; collector: string; agents: AgentProfile[] }>(machines: T[]) {
  const byIdentity = new Map<string, T>();
  for (const machine of machines) {
    const key = deviceIdentityKey(machine.device);
    const previous = byIdentity.get(key);
    if (!previous) {
      byIdentity.set(key, machine);
      continue;
    }
    const preferred = machineScore(machine) > machineScore(previous) ? machine : previous;
    const agents = [...previous.agents, ...machine.agents]
      .filter((agent, index, all) => all.findIndex((item) => item.id === agent.id) === index);
    byIdentity.set(key, { ...preferred, agents });
  }
  return [...byIdentity.values()];
}
