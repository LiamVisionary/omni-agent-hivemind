import { execFile } from "child_process";
import { promisify } from "util";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

type TailscalePeer = {
  HostName?: string;
  DNSName?: string;
  OS?: string;
  Online?: boolean;
  TailscaleIPs?: string[];
  LastSeen?: string;
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
  };
}

function simplifyDevice(peer: TailscalePeer, self = false) {
  const ip = peer.TailscaleIPs?.find((value) => /^\d+\.\d+\.\d+\.\d+$/.test(value)) ?? peer.TailscaleIPs?.[0] ?? "";
  const dnsName = peer.DNSName?.replace(/\.$/, "") ?? "";
  return {
    self,
    name: peer.HostName || dnsName || ip || "Unknown device",
    dnsName,
    os: peer.OS ?? "unknown",
    online: Boolean(peer.Online),
    ip,
    collectorUrl: ip ? `http://${ip}:8787` : "",
    lastSeen: peer.LastSeen,
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
    const devices = [
      ...(status.Self ? [simplifyDevice(status.Self, true)] : []),
      ...Object.values(status.Peer ?? {}).map((peer) => simplifyDevice(peer)),
    ];
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
