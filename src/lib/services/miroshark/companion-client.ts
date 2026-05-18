import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import path from "path";
import { execFile, spawn } from "child_process";
import { promisify } from "util";

export type MiroSharkCompanionPhase =
  | "connected"
  | "starting"
  | "installing"
  | "installed-stopped"
  | "not-installed"
  | "needs-config"
  | "unreachable";

export type MiroSharkRequirement = {
  name: string;
  ok: boolean;
  detail: string;
};

export type MiroSharkAction = {
  id: "install" | "start" | "open";
  label: string;
  disabled?: boolean;
};

export type MiroSharkInstallState = {
  running: boolean;
  phase?: string;
  startedAt?: number;
  finishedAt?: number;
  exitCode?: number | null;
  logPath: string;
  message?: string;
};

export type MiroSharkCompanionStatus = {
  configured: boolean;
  ok: boolean;
  phase: MiroSharkCompanionPhase;
  baseUrl: string;
  service?: string;
  status?: string;
  installPath?: string;
  installSource?: "env" | "openclaw" | "codex-cache" | "workspace" | "home";
  apiDocsUrl?: string;
  templatesUrl?: string;
  simulationsUrl?: string;
  checkedAt: number;
  latencyMs?: number;
  error?: string;
  requirements: MiroSharkRequirement[];
  install: MiroSharkInstallState;
  actions: MiroSharkAction[];
  startCommand?: string;
  installCommand?: string;
  configHint?: string;
  endpoints: {
    health: string;
    openapi: string;
    templates: string;
    simulations: string;
    createSimulation: string;
  };
};

const DEFAULT_MIROSHARK_BASE_URL = "http://127.0.0.1:5001";
const OPENCLAW_MIROSHARK_DIR = path.join(homedir(), ".openclaw", "companions", "MiroShark");
const CODEX_CACHED_MIROSHARK_DIR = path.join(homedir(), ".codex", "github-assimilator", "candidates", "aaronjmars-MiroShark");
const SETUP_STATE_PATH = "/tmp/openclaw-miroshark-setup.json";
const SETUP_LOG_PATH = "/tmp/openclaw-miroshark-setup.log";
const BOOTSTRAP_ENV_PATH = "/tmp/openclaw-miroshark.env";
const SCREEN_SESSION_NAME = "miroshark-5101";
const DEFAULT_MANAGED_PORT = "5101";
const execFileAsync = promisify(execFile);

// Adapted from MiroShark's documented Flask defaults and HTTP API paths.
const MIROSHARK_ENDPOINTS = {
  health: "/health",
  openapi: "/api/openapi.yaml",
  templates: "/api/templates/list",
  simulations: "/api/simulation/list",
  createSimulation: "/api/simulation/create",
} as const;

function normalizeBaseUrl(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return DEFAULT_MIROSHARK_BASE_URL;
  return trimmed.replace(/\/+$/, "");
}

function buildUrl(baseUrl: string, path: string) {
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

function expandHome(value: string) {
  return value.startsWith("~/") ? path.join(homedir(), value.slice(2)) : value;
}

function uniquePaths(paths: string[]) {
  return [...new Set(paths.filter(Boolean).map(expandHome))];
}

function backendDir(installPath: string) {
  return path.join(installPath, "backend");
}

function isMiroSharkInstall(installPath: string) {
  return existsSync(path.join(backendDir(installPath), "run.py"))
    && existsSync(path.join(backendDir(installPath), "pyproject.toml"));
}

function discoverInstall() {
  const candidates = uniquePaths([
    process.env.MIROSHARK_HOME ?? "",
    OPENCLAW_MIROSHARK_DIR,
    CODEX_CACHED_MIROSHARK_DIR,
    path.join(process.cwd(), "MiroShark"),
    path.join(homedir(), "MiroShark"),
  ]);
  const found = candidates.find(isMiroSharkInstall);
  if (!found) return {};
  const source = found === process.env.MIROSHARK_HOME
    ? "env"
    : found === OPENCLAW_MIROSHARK_DIR
      ? "openclaw"
      : found === CODEX_CACHED_MIROSHARK_DIR
        ? "codex-cache"
        : found.startsWith(process.cwd())
          ? "workspace"
          : "home";
  return { installPath: found, installSource: source as MiroSharkCompanionStatus["installSource"] };
}

async function commandExists(command: string) {
  const { stdout } = await execFileAsync("zsh", ["-lc", `command -v ${command}`], {
    timeout: 2_000,
    maxBuffer: 20_000,
  }).catch(() => ({ stdout: "" }));
  return stdout.trim();
}

async function getRequirements(installPath?: string): Promise<MiroSharkRequirement[]> {
  const [git, uv, docker, screen, python311] = await Promise.all([
    commandExists("git"),
    commandExists("uv"),
    commandExists("docker"),
    commandExists("screen"),
    commandExists("python3.11"),
  ]);
  return [
    { name: "git", ok: Boolean(git), detail: git || "Required to clone MiroShark" },
    { name: "uv", ok: Boolean(uv), detail: uv || "Required to install the Python backend" },
    { name: "docker", ok: Boolean(docker), detail: docker || "Required for the managed Neo4j container" },
    { name: "screen", ok: Boolean(screen), detail: screen || "Required to keep MiroShark running after start" },
    { name: "python3.11", ok: Boolean(python311), detail: python311 || "Required by the tested MiroShark backend setup" },
    {
      name: "MiroShark .env",
      ok: Boolean(installPath && existsSync(path.join(installPath, ".env"))),
      detail: installPath ? path.join(installPath, ".env") : "Created automatically when an API key is available",
    },
  ];
}

function getInstallState(): MiroSharkInstallState {
  const fallback = { running: false, logPath: SETUP_LOG_PATH };
  if (!existsSync(SETUP_STATE_PATH)) return fallback;
  try {
    return { ...fallback, ...JSON.parse(readFileSync(SETUP_STATE_PATH, "utf8")) };
  } catch {
    return fallback;
  }
}

function writeInstallState(state: Partial<MiroSharkInstallState>) {
  writeFileSync(SETUP_STATE_PATH, JSON.stringify({
    ...getInstallState(),
    ...state,
    logPath: SETUP_LOG_PATH,
  }, null, 2));
}

function preferredApiKey() {
  return process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || process.env.LLM_API_KEY || "";
}

function writeManagedEnv(installPath: string) {
  const envPath = path.join(installPath, ".env");
  if (existsSync(envPath)) return;
  const apiKey = preferredApiKey();
  if (!apiKey) return;
  const baseUrl = process.env.OPENROUTER_API_KEY ? "https://openrouter.ai/api/v1" : "https://api.openai.com/v1";
  const model = process.env.OPENROUTER_API_KEY ? "openai/gpt-4o-mini" : (process.env.OPENAI_MODEL || "gpt-4o-mini");
  writeFileSync(envPath, [
    "FLASK_HOST=127.0.0.1",
    `FLASK_PORT=${DEFAULT_MANAGED_PORT}`,
    `LLM_API_KEY=${apiKey}`,
    `LLM_BASE_URL=${baseUrl}`,
    `LLM_MODEL_NAME=${model}`,
    `WONDERWALL_API_KEY=${apiKey}`,
    `WONDERWALL_BASE_URL=${baseUrl}`,
    `WONDERWALL_MODEL_NAME=${model}`,
    "EMBEDDING_PROVIDER=openai",
    "EMBEDDING_MODEL=openai/text-embedding-3-small",
    "NEO4J_URI=bolt://localhost:7687",
    "NEO4J_USER=neo4j",
    "NEO4J_PASSWORD=miroshark",
    "ENABLE_WEB_ENRICHMENT=false",
    "ENABLE_RERANKER=false",
    "ENABLE_GRAPH_SEARCH=false",
    "",
  ].join("\n"), { mode: 0o600 });
}

function writeBootstrapEnv() {
  const apiKey = preferredApiKey();
  if (!apiKey) return;
  const baseUrl = process.env.OPENROUTER_API_KEY ? "https://openrouter.ai/api/v1" : "https://api.openai.com/v1";
  const model = process.env.OPENROUTER_API_KEY ? "openai/gpt-4o-mini" : (process.env.OPENAI_MODEL || "gpt-4o-mini");
  writeFileSync(BOOTSTRAP_ENV_PATH, [
    "FLASK_HOST=127.0.0.1",
    `FLASK_PORT=${DEFAULT_MANAGED_PORT}`,
    `LLM_API_KEY=${apiKey}`,
    `LLM_BASE_URL=${baseUrl}`,
    `LLM_MODEL_NAME=${model}`,
    `WONDERWALL_API_KEY=${apiKey}`,
    `WONDERWALL_BASE_URL=${baseUrl}`,
    `WONDERWALL_MODEL_NAME=${model}`,
    "EMBEDDING_PROVIDER=openai",
    "EMBEDDING_MODEL=openai/text-embedding-3-small",
    "NEO4J_URI=bolt://localhost:7687",
    "NEO4J_USER=neo4j",
    "NEO4J_PASSWORD=miroshark",
    "ENABLE_WEB_ENRICHMENT=false",
    "ENABLE_RERANKER=false",
    "ENABLE_GRAPH_SEARCH=false",
    "",
  ].join("\n"), { mode: 0o600 });
}

function managedStartCommand(installPath: string) {
  return `screen -dmS ${SCREEN_SESSION_NAME} bash -lc 'cd ${backendDir(installPath)} && .venv/bin/python run.py'`;
}

export function startMiroSharkSetup(action: "install" | "start") {
  const current = getInstallState();
  if (current.running) return current;

  const discovered = discoverInstall();
  const installPath = discovered.installPath ?? OPENCLAW_MIROSHARK_DIR;
  mkdirSync(path.dirname(installPath), { recursive: true });
  if (discovered.installPath) writeManagedEnv(discovered.installPath);
  else writeBootstrapEnv();

  const script = `
set -euo pipefail
echo "[$(date)] ${action} requested"
if [ ! -d "${installPath}/.git" ] && [ ! -f "${installPath}/backend/run.py" ]; then
  echo "Cloning MiroShark into ${installPath}"
  git clone https://github.com/aaronjmars/MiroShark "${installPath}"
fi
cd "${installPath}"
if [ ! -f .env ] && [ -f "${BOOTSTRAP_ENV_PATH}" ]; then
  cp "${BOOTSTRAP_ENV_PATH}" .env
  chmod 600 .env
fi
if [ ! -f .env ]; then
  echo "No .env found. OpenClaw will create it if an API key is available in its environment."
fi
cd backend
if command -v docker >/dev/null 2>&1; then
  if docker ps -a --format '{{.Names}}' | grep -qx miroshark-neo4j-e2e; then
    docker start miroshark-neo4j-e2e >/dev/null || true
  else
    docker run -d --name miroshark-neo4j-e2e -p 7474:7474 -p 7687:7687 -e NEO4J_AUTH=neo4j/miroshark neo4j:5.26-community >/dev/null
  fi
fi
UV_PYTHON=python3.11 uv sync
screen -S ${SCREEN_SESSION_NAME} -X quit >/dev/null 2>&1 || true
screen -dmS ${SCREEN_SESSION_NAME} bash -lc 'cd "${backendDir(installPath)}" && .venv/bin/python run.py'
echo "[$(date)] MiroShark started at http://127.0.0.1:${DEFAULT_MANAGED_PORT}"
`;

  writeInstallState({ running: true, phase: action, startedAt: Date.now(), finishedAt: undefined, exitCode: undefined, message: "Working..." });
  const child = spawn("zsh", ["-lc", script], {
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const append = (chunk: Buffer) => writeFileSync(SETUP_LOG_PATH, chunk.toString("utf8"), { flag: "a" });
  child.stdout.on("data", append);
  child.stderr.on("data", append);
  child.on("exit", (code) => {
    writeInstallState({
      running: false,
      phase: action,
      finishedAt: Date.now(),
      exitCode: code,
      message: code === 0 ? "MiroShark is installed and starting." : `Setup exited with code ${code}`,
    });
  });
  child.unref();
  return getInstallState();
}

async function fetchJsonWithTimeout(url: string, timeoutMs = 3_500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const startedAt = Date.now();
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
    });
    const latencyMs = Date.now() - startedAt;
    const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
    return { response, payload, latencyMs };
  } finally {
    clearTimeout(timer);
  }
}

export async function getMiroSharkCompanionStatus(): Promise<MiroSharkCompanionStatus> {
  const rawBaseUrl = process.env.MIROSHARK_BASE_URL || process.env.NEXT_PUBLIC_MIROSHARK_BASE_URL;
  const discovered = discoverInstall();
  const setup = getInstallState();
  const baseUrl = normalizeBaseUrl(rawBaseUrl || (discovered.installPath ? `http://127.0.0.1:${DEFAULT_MANAGED_PORT}` : undefined));
  const configured = Boolean(rawBaseUrl?.trim());
  const requirements = await getRequirements(discovered.installPath);
  const hasKey = Boolean(preferredApiKey() || (discovered.installPath && existsSync(path.join(discovered.installPath, ".env"))));
  const endpoints = {
    health: buildUrl(baseUrl, MIROSHARK_ENDPOINTS.health),
    openapi: buildUrl(baseUrl, MIROSHARK_ENDPOINTS.openapi),
    templates: buildUrl(baseUrl, MIROSHARK_ENDPOINTS.templates),
    simulations: buildUrl(baseUrl, MIROSHARK_ENDPOINTS.simulations),
    createSimulation: buildUrl(baseUrl, MIROSHARK_ENDPOINTS.createSimulation),
  };

  try {
    const { response, payload, latencyMs } = await fetchJsonWithTimeout(endpoints.health);
    const service = typeof payload?.service === "string" ? payload.service : undefined;
    const status = typeof payload?.status === "string" ? payload.status : undefined;
    const serviceLooksRight = /miroshark/i.test(service ?? "");
    const ok = response.ok && status === "ok" && serviceLooksRight;

    return {
      configured,
      ok,
      phase: ok ? "connected" : setup.running ? "starting" : discovered.installPath ? "installed-stopped" : "not-installed",
      baseUrl,
      service,
      status,
      installPath: discovered.installPath,
      installSource: discovered.installSource,
      apiDocsUrl: buildUrl(baseUrl, "/api/docs"),
      templatesUrl: endpoints.templates,
      simulationsUrl: endpoints.simulations,
      checkedAt: Date.now(),
      latencyMs,
      requirements,
      install: setup,
      actions: ok
        ? [{ id: "open", label: "API Docs" }]
        : discovered.installPath
          ? [{ id: "start", label: setup.running ? "Starting..." : "Start MiroShark", disabled: setup.running || !hasKey }]
          : [{ id: "install", label: setup.running ? "Installing..." : "Install & start", disabled: setup.running || !requirements.every((item) => item.name === "MiroShark .env" || item.ok) || !hasKey }],
      startCommand: discovered.installPath ? managedStartCommand(discovered.installPath) : undefined,
      installCommand: `git clone https://github.com/aaronjmars/MiroShark ${OPENCLAW_MIROSHARK_DIR}`,
      configHint: hasKey ? undefined : "Add OPENROUTER_API_KEY or OPENAI_API_KEY to OpenClaw's environment so setup can write MiroShark's .env automatically.",
      endpoints,
      error: ok
        ? undefined
        : service && !serviceLooksRight
          ? `Port responded as ${service}, not MiroShark`
          : `Unexpected health response: HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      configured,
      ok: false,
      phase: setup.running ? "starting" : discovered.installPath ? "installed-stopped" : "not-installed",
      baseUrl,
      installPath: discovered.installPath,
      installSource: discovered.installSource,
      checkedAt: Date.now(),
      requirements,
      install: setup,
      actions: discovered.installPath
        ? [{ id: "start", label: setup.running ? "Starting..." : "Start MiroShark", disabled: setup.running || !hasKey }]
        : [{ id: "install", label: setup.running ? "Installing..." : "Install & start", disabled: setup.running || !requirements.every((item) => item.name === "MiroShark .env" || item.ok) || !hasKey }],
      startCommand: discovered.installPath ? managedStartCommand(discovered.installPath) : undefined,
      installCommand: `git clone https://github.com/aaronjmars/MiroShark ${OPENCLAW_MIROSHARK_DIR}`,
      configHint: hasKey ? undefined : "Add OPENROUTER_API_KEY or OPENAI_API_KEY to OpenClaw's environment so setup can write MiroShark's .env automatically.",
      endpoints,
      error: error instanceof Error ? error.message : "MiroShark companion is unreachable",
    };
  }
}
