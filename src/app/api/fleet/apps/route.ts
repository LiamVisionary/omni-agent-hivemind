import { NextRequest } from "next/server";

export const runtime = "nodejs";

const APPS_CACHE_MS = 10_000;
const COLLECTOR_TIMEOUT_MS = 4_500;
const ICON_PROBE_TIMEOUT_MS = 900;

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
  statusCode?: number;
  contentType?: string;
  iconUrl?: string;
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
  kind: AppKind;
  theme: string;
  initials: string;
  iconUrl?: string;
  machineName: string;
  machineHost: string;
  local: boolean;
  online: boolean;
  interactive: boolean;
  scheme: string;
  port: number;
  path: string;
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

type AppKind = "ai" | "creative" | "code" | "dashboard" | "media" | "app";

const PLUMBING_PROCESSES = [
  "syncthing",
  "cloudflar",
  "cloudflare",
  "nginx",
  "tailscale",
  "container",
  "lmlink",
  "rapportd",
  "sharingd",
];

const PLUMBING_TITLES = [
  "welcome to nginx",
  "error",
  "404",
  "not found",
  "unauthorized",
  "syncthing",
  "gateway",
];

const KNOWN_APP_TITLES = [
  "comfyui",
  "z-image",
  "openclaw",
  "claw code",
  "hivemindos",
  "moneyprinter",
  "ai girlfriend",
  "ami",
];

const BRAND_ICON_SLUGS: Array<[RegExp, string]> = [
  [/github/i, "github"],
  [/discord/i, "discord"],
  [/openai|llm|ai/i, "openai"],
];

const LOCAL_APP_ICONS: Array<[RegExp, string]> = [
  [/hivemindos/i, "/hivemindos-logo.png"],
  [/openclaw/i, "/icons/runtimes/openclaw.svg"],
];

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
  if (isLocalMachine(machine)) return "localhost";
  return dnsHost(machine.device?.dnsName) || machine.collectorHost || machine.device?.ip || "";
}

function isLocalMachine(machine: FleetMachine) {
  const name = machine.device?.name || machine.device?.dnsName || "";
  return Boolean(machine.device?.self || /(^|-)local-\d*(\.|$)/i.test(name) || /(^|-)local(\.|$)/i.test(name));
}

function serviceUrl(app: CollectorApp, machine: FleetMachine) {
  const scheme = app.scheme === "https" ? "https" : "http";
  const port = Number(app.port);
  const host = machineOpenHost(machine);
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535) return "";
  return `${scheme}://${host}:${port}${normalizePath(app.path)}`;
}

function rewriteServiceAssetUrl(rawUrl: string | undefined, machine: FleetMachine) {
  if (!rawUrl) return "";
  try {
    const url = new URL(rawUrl);
    url.hostname = machineOpenHost(machine);
    return url.toString();
  } catch {
    return "";
  }
}

function appOriginUrl(openUrl: string) {
  try {
    const url = new URL(openUrl);
    return `${url.protocol}//${url.host}`;
  } catch {
    return "";
  }
}

async function isImageUrl(url: string) {
  if (!url) return false;
  try {
    let response = await fetch(url, {
      method: "HEAD",
      cache: "no-store",
      signal: AbortSignal.timeout(ICON_PROBE_TIMEOUT_MS),
    });
    if (response.status === 405 || response.status === 501) {
      response = await fetch(url, {
        headers: { range: "bytes=0-512" },
        cache: "no-store",
        signal: AbortSignal.timeout(ICON_PROBE_TIMEOUT_MS),
      });
    }
    const contentType = response.headers.get("content-type") || "";
    return response.ok && (
      contentType.startsWith("image/")
      || ((contentType === "" || contentType === "application/octet-stream") && /\.(?:ico|png|svg|webp|jpg|jpeg)(?:\?|$)/i.test(url))
    );
  } catch {
    return false;
  }
}

async function discoverDirectAppIcon(openUrl: string) {
  const origin = appOriginUrl(openUrl);
  if (!origin) return "";
  const candidates = [
    "/apple-touch-icon.png",
    "/favicon.png",
    "/favicon.ico",
    "/icon.png",
    "/assets/images/favicon.png",
    "/assets/images/icon.png",
    "/assets/icons/claude-sprite-icon.png",
  ].map((path) => `${origin}${path}`);
  for (const candidate of candidates) {
    if (await isImageUrl(candidate)) return candidate;
  }
  return "";
}

function appName(app: CollectorApp, port: number) {
  return cleanAppName(app.name?.trim() || app.process?.trim() || `App ${port}`);
}

function cleanAppName(value: string) {
  return value
    .replace(/\s+on\s+\d+$/i, "")
    .replace(/\s+[–-]\s+gateway$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeMachineName(value: string) {
  return value
    .replace(/^hivemindos-/i, "")
    .replace(/-local-\d+$/i, "")
    .replace(/-local$/i, "")
    .replace(/-\d+$/i, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim() || value;
}

function appKind(name: string): AppKind {
  const value = name.toLowerCase();
  if (/comfy|z-image|image|studio|canvas|design/.test(value)) return "creative";
  if (/claw|openclaw|code|hivemind/.test(value)) return "code";
  if (/llm|ai|ami|chat|girlfriend/.test(value)) return "ai";
  if (/money|video|printer|media/.test(value)) return "media";
  if (/dashboard|control|admin/.test(value)) return "dashboard";
  return "app";
}

function appTheme(kind: AppKind) {
  if (kind === "creative") return "from-[#ff8a3d] via-[#ff4d6d] to-[#7c3aed]";
  if (kind === "code") return "from-[#22c55e] via-[#14b8a6] to-[#2563eb]";
  if (kind === "ai") return "from-[#38bdf8] via-[#6366f1] to-[#a855f7]";
  if (kind === "media") return "from-[#facc15] via-[#fb7185] to-[#f97316]";
  if (kind === "dashboard") return "from-[#2dd4bf] via-[#0ea5e9] to-[#334155]";
  return "from-[#94a3b8] via-[#64748b] to-[#334155]";
}

function appInitials(name: string) {
  const words = name.replace(/[^a-z0-9 ]/gi, " ").split(/\s+/).filter(Boolean);
  return (words.length > 1 ? `${words[0][0]}${words[1][0]}` : (words[0] || "A").slice(0, 2)).toUpperCase();
}

function brandFallbackIconUrl(name: string) {
  const localMatch = LOCAL_APP_ICONS.find(([pattern]) => pattern.test(name));
  if (localMatch) return localMatch[1];
  const value = name;
  const match = BRAND_ICON_SLUGS.find(([pattern]) => pattern.test(value));
  return match ? `https://cdn.simpleicons.org/${match[1]}/ffffff` : "";
}

function hasKnownAppSignal(name: string, app: CollectorApp) {
  const value = `${name} ${app.process || ""} ${app.server || ""}`.toLowerCase();
  return KNOWN_APP_TITLES.some((token) => value.includes(token));
}

function isPlumbingApp(name: string, app: CollectorApp) {
  const value = `${name} ${app.process || ""} ${app.server || ""}`.toLowerCase();
  if (hasKnownAppSignal(name, app)) return false;
  if (PLUMBING_PROCESSES.some((token) => value.includes(token))) return true;
  return PLUMBING_TITLES.some((token) => name.toLowerCase().includes(token));
}

function isInteractiveApp(name: string, app: CollectorApp) {
  const statusCode = Number(app.statusCode ?? app.description?.match(/^(\d+)/)?.[1] ?? 0);
  const contentType = (app.contentType || app.description || "").toLowerCase();
  if (statusCode >= 400) return false;
  if (hasKnownAppSignal(name, app) && contentType.includes("text/html")) return true;
  return contentType.includes("text/html") && !isPlumbingApp(name, app);
}

function appDescription(kind: AppKind, machineName: string) {
  if (kind === "creative") return `Creative workspace on ${machineName}`;
  if (kind === "code") return `Development workspace on ${machineName}`;
  if (kind === "ai") return `AI workspace on ${machineName}`;
  if (kind === "media") return `Media workspace on ${machineName}`;
  if (kind === "dashboard") return `Control surface on ${machineName}`;
  return `App on ${machineName}`;
}

async function toHostedApp(app: CollectorApp, machine: FleetMachine): Promise<HostedApp | null> {
  const port = Number(app.port);
  const openUrl = serviceUrl(app, machine);
  if (!openUrl || !Number.isInteger(port)) return null;
  const machineName = normalizeMachineName(machine.device?.name || machine.collectorHost || machine.device?.ip || "Unknown machine");
  const name = appName(app, port);
  if (!isInteractiveApp(name, app)) return null;
  const kind = appKind(name);
  const local = isLocalMachine(machine);
  const iconUrl = rewriteServiceAssetUrl(app.iconUrl, machine) || await discoverDirectAppIcon(openUrl) || brandFallbackIconUrl(name) || undefined;
  return {
    id: `${local ? "local" : machineOpenHost(machine)}:${port}:${app.id || name}`,
    name,
    description: appDescription(kind, machineName),
    kind,
    theme: appTheme(kind),
    initials: appInitials(name),
    iconUrl,
    machineName,
    machineHost: machineOpenHost(machine),
    local,
    online: machine.device?.online !== false,
    interactive: true,
    scheme: app.scheme === "https" ? "https" : "http",
    port,
    path: normalizePath(app.path),
    openUrl,
  };
}

function dedupeVisibleApps(apps: HostedApp[]) {
  const byNameAndMachine = new Map<string, HostedApp>();
  for (const app of apps) {
    const key = `${app.machineName.toLowerCase()}:${app.name.toLowerCase()}`;
    const previous = byNameAndMachine.get(key);
    if (!previous || (app.local && !previous.local) || app.openUrl.length < previous.openUrl.length) {
      byNameAndMachine.set(key, app);
    }
  }
  return [...byNameAndMachine.values()];
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
      const apps = await Promise.all((payload.apps ?? []).map((app) => toHostedApp(app, machine)));
      return {
        name,
        collector: machine.collector,
        apps: apps.filter((app): app is HostedApp => Boolean(app)),
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

  const apps = dedupeVisibleApps(results.flatMap((result) => result.apps))
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
