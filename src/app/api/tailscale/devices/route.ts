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
  Relay?: string;
};

type TailscaleStatus = {
  BackendState?: string;
  MagicDNSSuffix?: string;
  Self?: TailscalePeer;
  Peer?: Record<string, TailscalePeer>;
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
  return isGenericHostname(peer.HostName)
    ? magicDnsName || ip || "Unknown device"
    : peer.HostName || magicDnsName || ip || "Unknown device";
}

function normalizeName(value?: string) {
  return value?.toLowerCase().replace(/[^a-z0-9]+/g, "") ?? "";
}

function isStaleSelfDuplicate(
  self: ReturnType<typeof simplifyDevice> | undefined,
  device: ReturnType<typeof simplifyDevice>,
) {
  if (!self || device.self || device.online) return false;
  return normalizeName(self.name) !== "" && normalizeName(self.name) === normalizeName(device.name);
}

function simplifyDevice(peer: TailscalePeer, self = false) {
  const ip = peer.TailscaleIPs?.find((value) => /^\d+\.\d+\.\d+\.\d+$/.test(value)) ?? peer.TailscaleIPs?.[0] ?? "";
  const dnsName = peer.DNSName?.replace(/\.$/, "") ?? "";
  return {
    self,
    name: displayNameForPeer(peer, dnsName, ip),
    dnsName,
    os: peer.OS ?? "unknown",
    online: Boolean(peer.Online),
    ip,
    collectorUrl: self ? "http://127.0.0.1:8787" : ip ? `http://${ip}:8787` : "",
    lastSeen: peer.LastSeen,
    relay: peer.Relay ?? "",
  };
}

export async function GET() {
  const { stdout } = await execFileAsync("tailscale", ["status", "--json"], {
    timeout: 5_000,
    maxBuffer: 1_500_000,
  }).catch((error) => ({ stdout: JSON.stringify({ error: error instanceof Error ? error.message : "tailscale unavailable" }) }));

  try {
    const status = JSON.parse(stdout) as TailscaleStatus & { error?: string };
    if (status.error) return Response.json({ ok: false, error: status.error, devices: [localDevice()] });
    const self = status.Self ? simplifyDevice(status.Self, true) : undefined;
    const peers = Object.values(status.Peer ?? {})
      .map((peer) => simplifyDevice(peer))
      .filter((device) => !isStaleSelfDuplicate(self, device));
    const devices = [...(self ? [self] : []), ...peers];
    return Response.json({
      ok: status.BackendState === "Running",
      backendState: status.BackendState,
      magicDnsSuffix: status.MagicDNSSuffix,
      devices,
    });
  } catch {
    return Response.json({ ok: false, error: "Could not parse tailscale status", devices: [localDevice()] });
  }
}
