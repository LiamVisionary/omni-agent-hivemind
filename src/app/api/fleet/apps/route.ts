import { NextRequest } from "next/server";

export const runtime = "nodejs";

const APPS_CACHE_MS = 10_000;
const COLLECTOR_TIMEOUT_MS = 4_500;

type FleetMachine = {
  collector?: string;
  collectorHost?: string;
  device?: {
    self?: boolean;
    name?: string;
    dnsName?: string;
    ip?: string;
    online?: boolean;
    collectorUrl?: string;
  };
};

type CollectorApp = {
  id?: string;
  name?: string;
  description?: string;
  scheme?: string;
  host?: string;
  port?: number;
  path?: string;
  localUrl?: string;
  process?: string;
  pid?: string;
  server?: string;
};

type HostedApp = {
  id: string;
  name: string;
  description: string;
  machineName: string;
  machineHost: string;
  local: boolean;
  online: boolean;
  scheme: string;
  port: number;
  path: string;
  process?: string;
  server?: string;
  openUrl: string;
};

type AppsPayload = {
  ok: true;
  checkedAt: string;
  source: string;
  apps: HostedApp[];
  machines: Array<{
    name: string;
    collector: string;
    appCount: number;
    error?: string;
  }>;
};

let appsCache: { checkedAt: number; payload: AppsPayload } | null = null;
let appsInFlight: Promise<AppsPayload> | null = null;

function normalizeBaseUrl(value?: string) {
  return value?.trim().replace(/\/+$/, "") || "";
}

function normalizePath(value?: string) {
  const path = value?.trim() || "/";
  return path.startsWith("/") ? path : `/${path}`;
}

function dnsHost(value?: string) {
  return value?.trim().replace(/\.$/, "") || "";
}

function machineOpenHost(machine: FleetMachine) {
  if (machine.device?.self) return "localhost";
  return dnsHost(machine.device?.dnsName) || machine.collectorHost || machine.device?.ip || "";
}

function serviceUrl(app: CollectorApp, machine: FleetMachine) {
  const scheme = app.scheme === "https" ? "https" : "http";
  const port = Number(app.port);
  const host = machineOpenHost(machine);
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535) return "";
  return `${scheme}://${host}:${port}${normalizePath(app.path)}`;
}

function appName(app: CollectorApp, port: number) {
  return app.name?.trim() || app.process?.trim() || `App on ${port}`;
}

function toHostedApp(app: CollectorApp, machine: FleetMachine): HostedApp | null {
  const port = Number(app.port);
  const openUrl = serviceUrl(app, machine);
  if (!openUrl || !Number.isInteger(port)) return null;
  const machineName = machine.device?.name || machine.collectorHost || machine.device?.ip || "Unknown machine";
  const name = appName(app, port);
  return {
    id: `${machine.device?.self ? "local" : machineOpenHost(machine)}:${port}:${app.id || name}`,
    name,
    description: app.description?.trim() || "HTTP service",
    machineName,
    machineHost: machineOpenHost(machine),
    local: Boolean(machine.device?.self),
    online: machine.device?.online !== false,
    scheme: app.scheme === "https" ? "https" : "http",
    port,
    path: normalizePath(app.path),
    process: app.process,
    server: app.server,
    openUrl,
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(COLLECTOR_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json() as Promise<T>;
}

async function readApps(request: NextRequest): Promise<AppsPayload> {
  const fleetUrl = new URL("/api/fleet/discover", request.url);
  const fleet = await fetchJson<{ source?: string; machines?: FleetMachine[] }>(fleetUrl.toString());
  const machines = fleet.machines ?? [];
  const results = await Promise.all(machines.map(async (machine) => {
    const collectorUrl = normalizeBaseUrl(machine.device?.collectorUrl);
    const name = machine.device?.name || machine.collectorHost || machine.device?.ip || "Unknown machine";
    if (machine.collector !== "ready" || !collectorUrl) {
      return { name, collector: machine.collector || "missing", apps: [] as HostedApp[] };
    }
    try {
      const payload = await fetchJson<{ apps?: CollectorApp[] }>(`${collectorUrl}/apps`);
      return {
        name,
        collector: machine.collector,
        apps: (payload.apps ?? [])
          .map((app) => toHostedApp(app, machine))
          .filter((app): app is HostedApp => Boolean(app)),
      };
    } catch (error) {
      return {
        name,
        collector: machine.collector,
        apps: [] as HostedApp[],
        error: error instanceof Error ? error.message : "Agent bridge did not return apps.",
      };
    }
  }));

  const apps = results.flatMap((result) => result.apps)
    .sort((left, right) => Number(right.local) - Number(left.local) || left.machineName.localeCompare(right.machineName) || left.port - right.port);

  return {
    ok: true,
    checkedAt: new Date().toISOString(),
    source: fleet.source || "fleet-discover",
    apps,
    machines: results.map((result) => ({
      name: result.name,
      collector: result.collector,
      appCount: result.apps.length,
      error: result.error,
    })),
  };
}

export async function GET(request: NextRequest) {
  const now = Date.now();
  if (appsCache && now - appsCache.checkedAt < APPS_CACHE_MS) {
    return Response.json(appsCache.payload);
  }
  if (!appsInFlight) {
    appsInFlight = readApps(request)
      .then((payload) => {
        appsCache = { checkedAt: Date.now(), payload };
        return payload;
      })
      .finally(() => {
        appsInFlight = null;
      });
  }
  return Response.json(await appsInFlight);
}
