import type { AgentProfile } from "@/lib/types/agent-runtime";

type FleetMachineIdentity = {
  self?: boolean;
  name?: string;
  dnsName?: string;
  os?: string;
  collectorUrl?: string;
  ip?: string;
};

type DiscoveredMachineIdentity = {
  device: FleetMachineIdentity;
  agents: unknown[];
  snapshots: unknown[];
};

export function collectorKey(url?: string) {
  if (!url?.trim()) return "";
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/+$/, "");
    return `${parsed.hostname}:${parsed.port || "80"}${path && path !== "/" ? path : ""}`;
  } catch {
    return url.trim();
  }
}

export function isLoopbackCollector(url?: string) {
  if (!url?.trim()) return false;
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]";
  } catch {
    return false;
  }
}

export function normalizeMachineName(value?: string) {
  return value?.toLowerCase().replace(/[^a-z0-9]+/g, "") ?? "";
}

export function isHivemindMachineName(name?: string, dnsName?: string) {
  const dnsLabel = dnsName?.replace(/\.$/, "").split(".")[0] ?? "";
  return normalizeMachineName(name).startsWith("hivemindos")
    || normalizeMachineName(dnsLabel).startsWith("hivemindos");
}

export function isMobileMachineOs(os?: string) {
  return /^(ios|android)$/i.test(os ?? "");
}

export function isMacMachineOs(os?: string) {
  return /^macos$/i.test(os ?? "");
}

export function isVisibleFleetMachine(machine: Pick<FleetMachineIdentity, "name" | "dnsName" | "os">) {
  return isHivemindMachineName(machine.name, machine.dnsName) || isMacMachineOs(machine.os);
}

export function machineHivemindBase(name?: string, dnsName?: string) {
  const dnsLabel = dnsName?.replace(/\.$/, "").split(".")[0] ?? "";
  const normalizedName = normalizeMachineName(name);
  const normalizedDnsName = normalizeMachineName(dnsLabel);
  const value = normalizedName.startsWith("hivemindos") ? normalizedName : normalizedDnsName;
  if (!value.startsWith("hivemindos")) return "";
  return value.replace(/^hivemindos/, "").replace(/local\d*$/, "");
}

export function machinePhysicalBase(name?: string, dnsName?: string) {
  const dnsLabel = dnsName?.replace(/\.$/, "").split(".")[0] ?? "";
  const value = normalizeMachineName(dnsLabel) || normalizeMachineName(name);
  return value.replace(/^hivemindos/, "").replace(/local\d*$/, "").replace(/\d+$/, "");
}

export function isLocalLinkDuplicateOfSelf(self: FleetMachineIdentity | undefined, device: FleetMachineIdentity) {
  if (!self || device.self) return false;
  if (isHivemindMachineName(device.name, device.dnsName)) return false;
  const deviceBase = machineHivemindBase(device.name, device.dnsName);
  const selfBase = machineHivemindBase(self.name, self.dnsName);
  if (selfBase && deviceBase && selfBase === deviceBase) return true;
  const physicalSelfBase = machinePhysicalBase(self.name, self.dnsName);
  const physicalDeviceBase = machinePhysicalBase(device.name, device.dnsName);
  if (physicalSelfBase && physicalDeviceBase && physicalSelfBase === physicalDeviceBase) return true;
  if (physicalSelfBase && deviceBase && physicalSelfBase === deviceBase) return true;
  return Boolean(selfBase && physicalDeviceBase && selfBase === physicalDeviceBase);
}

export function displayMachineName(
  name: string,
  self?: boolean,
  options?: { os?: string; mobileViewer?: boolean },
) {
  if (self) {
    const os = options?.os?.toLowerCase() ?? "";
    const localLabel = os === "windows" || os === "win32"
      ? "This PC"
      : os === "linux"
        ? "This computer"
        : "This Mac";
    if (!options?.mobileViewer) return localLabel;
    if (localLabel === "This PC") return "Dashboard PC";
    if (localLabel === "This computer") return "Dashboard computer";
    return "Dashboard Mac";
  }
  return name.replace(/^hivemindos[-_]?/i, "") || name;
}

export function shouldPreserveMissingDiscoveredMachine(machine: DiscoveredMachineIdentity) {
  if (!isVisibleFleetMachine({
    name: machine.device.name,
    dnsName: machine.device.dnsName,
    os: machine.device.os,
  })) {
    return false;
  }
  if (isHivemindMachineName(machine.device.name, machine.device.dnsName)) {
    return machine.agents.length > 0 || machine.snapshots.length > 0;
  }
  return true;
}

export function machineIdentityFromParts({
  self,
  name,
  dnsName,
  collectorUrl,
  ip,
}: FleetMachineIdentity) {
  const dnsLabel = dnsName?.replace(/\.$/, "").split(".")[0] ?? "";
  const normalizedDnsName = normalizeMachineName(dnsLabel);
  const normalizedName = normalizeMachineName(name) || normalizedDnsName;
  if (normalizedName.startsWith("hivemindos")) return normalizedDnsName || normalizedName;
  if (self) return "self";
  return normalizedName || collectorKey(collectorUrl) || ip || "";
}

export function normalizeAgentPath(path?: string) {
  return path
    ?.trim()
    .replace(/^~(?=$|\/)/, "$home")
    .replace(/\/+$/, "")
    .toLowerCase() ?? "";
}

export function agentWorkspaceKey(agent: AgentProfile) {
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

export function collectorRuntimeKey(agent: AgentProfile) {
  const collector = collectorKey(agent.telemetryUrl);
  return collector ? `${agent.runtime}:collector:${collector}` : "";
}

export function renderAgentKey(agent: AgentProfile, index: number) {
  return [
    agent.id || "agent",
    agent.runtime,
    collectorKey(agent.telemetryUrl),
    agent.localDataDir?.trim() || agent.machineName || "",
    index,
  ].filter(Boolean).join(":");
}

export function agentAliasTarget(agent: AgentProfile, autoDiscoveredAgents: AgentProfile[]) {
  const exactKey = agentWorkspaceKey(agent);
  const exact = autoDiscoveredAgents.find((candidate) => candidate.id !== agent.id && agentWorkspaceKey(candidate) === exactKey);
  if (exact) return exact;
  return undefined;
}

export function agentAliasMap(configuredAgents: AgentProfile[], autoDiscoveredAgents: AgentProfile[]) {
  const entries: Array<readonly [string, string]> = [];
  configuredAgents.forEach((agent) => {
    const target = agentAliasTarget(agent, autoDiscoveredAgents);
    if (target && !entries.some(([aliasId]) => aliasId === target.id)) {
      entries.push([target.id, agent.id] as const);
    }
  });
  return new Map(entries);
}
