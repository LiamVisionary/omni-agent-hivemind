import { execFile } from "child_process";
import { promisify } from "util";
import type { AgentProfile } from "@/lib/types/agent-runtime";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

type TailscalePeer = {
  HostName?: string;
  DNSName?: string;
  OS?: string;
  Online?: boolean;
  TailscaleIPs?: string[];
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
};

function simplifyDevice(peer: TailscalePeer, self = false): Device {
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
  };
}

async function tailscaleDevices() {
  const { stdout } = await execFileAsync("tailscale", ["status", "--json"], {
    timeout: 5_000,
    maxBuffer: 1_500_000,
  }).catch(() => ({ stdout: "" }));
  if (!stdout) return [];
  const status = JSON.parse(stdout) as TailscaleStatus;
  return [
    ...(status.Self ? [simplifyDevice(status.Self, true)] : []),
    ...Object.values(status.Peer ?? {}).map((peer) => simplifyDevice(peer)),
  ];
}

async function fetchJson(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(2_500),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json() as Promise<Record<string, unknown>>;
}

export async function GET() {
  const devices = await tailscaleDevices().catch(() => []);
  const machines = await Promise.all(devices.map(async (device) => {
    if (!device.collectorUrl) {
      return { device, collector: "missing", agents: [], snapshots: [] };
    }

    try {
      const agentData = await fetchJson(`${device.collectorUrl}/agents`) as { agents?: AgentProfile[] };
      const agents = (agentData.agents ?? []).map((agent) => ({
        ...agent,
        telemetryUrl: device.collectorUrl,
        machineName: device.name,
      }));
      const snapshotData = await fetchJson(`${device.collectorUrl}/snapshot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agents }),
      }) as { snapshots?: unknown[] };
      return {
        device,
        collector: "ready",
        agents,
        snapshots: snapshotData.snapshots ?? [],
      };
    } catch {
      return {
        device,
        collector: device.online ? "not-installed" : "offline",
        agents: [],
        snapshots: [],
      };
    }
  }));

  return Response.json({ ok: true, machines });
}
