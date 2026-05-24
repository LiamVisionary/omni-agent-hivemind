import { execFile } from "child_process";
import { promisify } from "util";

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
  MagicDNSSuffix?: string;
  Self?: TailscalePeer;
  Peer?: Record<string, TailscalePeer>;
};

type HivemindLinkStatus = {
  ok?: boolean;
  backendState?: string;
  magicDnsSuffix?: string;
  self?: TailscalePeer;
  peer?: Record<string, TailscalePeer>;
  authUrl?: string;
  error?: string;
};

function localDevice() {
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

function deviceIdentityKey(device: ReturnType<typeof simplifyDevice>) {
  const dnsName = normalizeName(dnsLabel(device.dnsName));
  const name = normalizeName(device.name) || dnsName;
  if (name.startsWith("hivemindos")) return dnsName || name;
  if (device.self) return "self";
  return name || device.ip || device.collectorUrl;
}

function isHivemindLinkDevice(device: ReturnType<typeof simplifyDevice>) {
  return normalizeName(device.name).startsWith("hivemindos")
    || normalizeName(dnsLabel(device.dnsName)).startsWith("hivemindos");
}

function isMobileDevice(device: ReturnType<typeof simplifyDevice>) {
  return /^(ios|android)$/i.test(device.os);
}

function hivemindMachineBase(device: ReturnType<typeof simplifyDevice>) {
  const normalizedName = normalizeName(device.name);
  const normalizedDnsName = normalizeName(dnsLabel(device.dnsName));
  const value = normalizedName.startsWith("hivemindos") ? normalizedName : normalizedDnsName;
  if (!value.startsWith("hivemindos")) return "";
  return value.replace(/^hivemindos/, "").replace(/local\d*$/, "");
}

function isStaleSelfDuplicate(
  self: ReturnType<typeof simplifyDevice> | undefined,
  device: ReturnType<typeof simplifyDevice>,
) {
  if (!self || device.self || device.online) return false;
  const selfBase = hivemindMachineBase(self);
  const deviceBase = hivemindMachineBase(device);
  if (selfBase && deviceBase && selfBase === deviceBase) return true;
  return normalizeName(self.name) !== "" && normalizeName(self.name) === normalizeName(device.name);
}

function deviceFreshnessScore(device: ReturnType<typeof simplifyDevice>) {
  return (device.self ? 10_000 : 0)
    + (device.online ? 1_000 : 0)
    + (device.active ? 100 : 0)
    + (device.lastHandshake && !device.lastHandshake.startsWith("0001-01-01") ? 10 : 0)
    + ((device.rxBytes ?? 0) > 0 || (device.txBytes ?? 0) > 0 ? 1 : 0);
}

function dedupeDevices(devices: ReturnType<typeof simplifyDevice>[]) {
  const byIdentity = new Map<string, ReturnType<typeof simplifyDevice>>();
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

function simplifyDevice(peer: TailscalePeer, self = false, viaLink = false) {
  const ip = peer.TailscaleIPs?.find((value) => /^\d+\.\d+\.\d+\.\d+$/.test(value)) ?? peer.TailscaleIPs?.[0] ?? "";
  const dnsName = peer.DNSName?.replace(/\.$/, "") ?? "";
  return {
    self,
    name: self ? "This Mac" : displayNameForPeer(peer, dnsName, ip),
    dnsName,
    os: peer.OS ?? "unknown",
    online: Boolean(peer.Online),
    ip,
    collectorUrl: self ? "http://127.0.0.1:8787" : ip ? (viaLink ? linkCollectorUrl(ip) : `http://${ip}:8787`) : "",
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
  return dedupeDevices([...(self ? [self] : []), ...peers]);
}

export async function GET() {
  const link = await hivemindLinkStatus();
  if (link) {
    const localSystemSelf = await systemTailscaleSelf();
    return Response.json({
      ok: link.ok === true,
      backendState: link.backendState,
      authUrl: link.authUrl,
      magicDnsSuffix: link.magicDnsSuffix,
      source: "hivemind-link",
      devices: devicesFromStatus(link, true, localSystemSelf),
    });
  }

  const { stdout } = await execFileAsync("tailscale", ["status", "--json"], {
    timeout: 5_000,
    maxBuffer: 1_500_000,
  }).catch((error) => ({ stdout: JSON.stringify({ error: error instanceof Error ? error.message : "tailscale unavailable" }) }));

  try {
    const status = JSON.parse(stdout) as TailscaleStatus & { error?: string };
    if (status.error) {
      return Response.json({ ok: false, error: status.error, devices: [localDevice()] });
    }
    return Response.json({
      ok: status.BackendState === "Running",
      backendState: status.BackendState,
      magicDnsSuffix: status.MagicDNSSuffix,
      source: "tailscale-cli",
      devices: devicesFromStatus(status),
    });
  } catch {
    return Response.json({ ok: false, error: "Could not parse tailscale status", devices: [localDevice()] });
  }
}
