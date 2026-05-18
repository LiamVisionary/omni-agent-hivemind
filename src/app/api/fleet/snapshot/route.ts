import { NextRequest } from "next/server";
import { access, readdir, readFile, stat } from "fs/promises";
import { constants } from "fs";
import { homedir } from "os";
import { join, resolve } from "path";
import net from "net";
import { execFile } from "child_process";
import { promisify } from "util";
import type { AgentProfile, SharedVaultConfig } from "@/lib/types/agent-runtime";
import { getRuntimeUrl } from "@/lib/types/agent-runtime";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);
const MAX_FILES_PER_DIR = 20;
const MAX_FILE_CHARS = 4_000;

type FleetTaskStatus = "active" | "completed" | "failed" | "unknown";

type FleetTask = {
  id: string;
  agentId: string;
  title: string;
  lastMessage: string;
  status: FleetTaskStatus;
  source: string;
  updatedAt: number;
  startedAt?: number;
  messages?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
};

type AgentWithLocal = AgentProfile & {
  localDataDir?: string;
  telemetryUrl?: string;
};

type AgentSnapshot = {
  agentId: string;
  ok: boolean;
  runtimeReachable: boolean;
  processRunning: boolean;
  summary: string;
  sources: string[];
  tasks: FleetTask[];
  checkedAt: number;
  error?: string;
};

async function pathReadable(path?: string) {
  if (!path) return false;
  return access(path, constants.R_OK).then(() => true).catch(() => false);
}

function normalizeCollectorUrl(url: string) {
  return url.replace(/\/+$/, "");
}

async function readRemoteSnapshot(agent: AgentWithLocal): Promise<AgentSnapshot | null> {
  const baseUrl = agent.telemetryUrl?.trim();
  if (!baseUrl) return null;
  try {
    const response = await fetch(`${normalizeCollectorUrl(baseUrl)}/snapshot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agent }),
      signal: AbortSignal.timeout(4_000),
      cache: "no-store",
    });
    const data = await response.json().catch(() => null) as {
      snapshots?: AgentSnapshot[];
      snapshot?: AgentSnapshot;
    } | null;
    const snapshot = data?.snapshot ?? data?.snapshots?.find((item) => item.agentId === agent.id) ?? data?.snapshots?.[0];
    if (!snapshot) {
      return {
        agentId: agent.id,
        ok: false,
        runtimeReachable: false,
        processRunning: false,
        summary: `Collector responded without a snapshot: ${baseUrl}`,
        sources: ["remote collector"],
        tasks: [],
        checkedAt: Date.now(),
        error: "No snapshot in collector response",
      };
    }
    return {
      ...snapshot,
      agentId: agent.id,
      sources: [...new Set(["remote collector", ...snapshot.sources])],
    };
  } catch (error) {
    return {
      agentId: agent.id,
      ok: false,
      runtimeReachable: false,
      processRunning: false,
      summary: `Remote collector unavailable: ${baseUrl}`,
      sources: ["remote collector"],
      tasks: [],
      checkedAt: Date.now(),
      error: error instanceof Error ? error.message : "Could not reach remote collector",
    };
  }
}

function expandHome(path: string) {
  return path.replace(/^~(?=$|\/)/, homedir());
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function compact(value: unknown, fallback = "No details reported.", maxLength = 900) {
  if (typeof value === "string") return value.trim().slice(0, maxLength) || fallback;
  if (value && typeof value === "object") return JSON.stringify(value).slice(0, maxLength);
  return fallback;
}

function titleFromText(text: string) {
  const first = text.split(/\r?\n/).find((line) => line.trim().length > 0)?.trim() ?? "Observed activity";
  return first.replace(/^#+\s*/, "").slice(0, 140);
}

function statusFromPath(path: string): FleetTaskStatus {
  if (path.includes("/working/")) return "active";
  if (path.includes("/outbox/") || path.includes("/archive/")) return "completed";
  if (/\b(error|failed|failure)\b/i.test(path)) return "failed";
  return "unknown";
}

function statusFromSession(endedAt: number | null | undefined, endReason: string | null | undefined): FleetTaskStatus {
  if (!endedAt) return "active";
  if (endReason && /error|fail/i.test(endReason)) return "failed";
  return "completed";
}

function taskFromContent(agentId: string, source: string, filePath: string, content: string, updatedAt: number): FleetTask {
  const status = statusFromPath(filePath);
  const titleMatch = content.match(/(?:^|\n)\s*(?:title|task|current task|summary)\s*:\s*(.+)/i);
  const messageMatch = content.match(/(?:^|\n)\s*(?:message|latest|status|result|body|notes?)\s*:\s*([\s\S]{1,900})/i);
  return {
    id: `${source}:${filePath}`,
    agentId,
    title: (titleMatch?.[1] ?? titleFromText(content)).trim().slice(0, 160),
    lastMessage: compact(messageMatch?.[1] ?? content, "Activity found, but no readable message was reported."),
    status,
    source,
    updatedAt,
  };
}

function tasksFromPayload(agent: AgentProfile, payload: unknown, source: string): FleetTask[] {
  if (!payload || typeof payload !== "object") return [];
  const record = payload as Record<string, unknown>;
  const candidates = [
    record.currentTask,
    record.current_task,
    record.task,
    record.activeTask,
    record.active_task,
    record.latestTask,
    record.latest_task,
    record.status,
  ].filter(Boolean);
  const arrays = [record.tasks, record.activeTasks, record.recentTasks, record.history]
    .filter(Array.isArray)
    .flat() as unknown[];

  return [...candidates, ...arrays].map((candidate, index) => {
    if (typeof candidate === "string") {
      return {
        id: `${source}:${agent.id}:${index}`,
        agentId: agent.id,
        title: titleFromText(candidate),
        lastMessage: candidate,
        status: /done|complete|idle/i.test(candidate) ? "completed" : "active",
        source,
        updatedAt: Date.now(),
      };
    }
    const item = candidate as Record<string, unknown>;
    const rawStatus = compact(item.status ?? item.state ?? "unknown");
    const status: FleetTaskStatus = /work|run|active|progress|started/i.test(rawStatus)
      ? "active"
      : /fail|error/i.test(rawStatus)
        ? "failed"
        : /done|complete|idle|success/i.test(rawStatus)
          ? "completed"
          : "unknown";
    return {
      id: `${source}:${compact(item.id ?? item.runId ?? index)}`,
      agentId: agent.id,
      title: compact(item.title ?? item.task ?? item.name ?? item.summary ?? rawStatus, "Observed activity").slice(0, 160),
      lastMessage: compact(item.lastMessage ?? item.message ?? item.result ?? item.output ?? item.detail ?? item),
      status,
      source,
      updatedAt: Date.now(),
    };
  });
}

async function execJson<T>(cmd: string, args: string[], fallback: T): Promise<T> {
  const { stdout } = await execFileAsync(cmd, args, { timeout: 5_000, maxBuffer: 1_200_000 }).catch(() => ({ stdout: "" }));
  if (!stdout.trim()) return fallback;
  try {
    return JSON.parse(stdout) as T;
  } catch {
    return fallback;
  }
}

async function scanHermesStateDb(agent: AgentProfile, hermesDir: string): Promise<FleetTask[]> {
  const dbPath = join(hermesDir, "state.db");
  try {
    await access(dbPath, constants.R_OK);
  } catch {
    return [];
  }

  const sessions = await execJson<Array<{
    id: string;
    source: string;
    started_at: number;
    ended_at: number | null;
    end_reason: string | null;
    title: string | null;
    message_count: number;
    tool_call_count: number;
  }>>("sqlite3", ["-json", dbPath, `
    select id, source, started_at, ended_at, end_reason, title, message_count, tool_call_count
    from sessions
    order by started_at desc
    limit 10;
  `], []);

  const tasks = await Promise.all(sessions.map(async (session) => {
    const messages = await execJson<Array<{
      role: string;
      content: string | null;
      tool_name: string | null;
      timestamp: number;
    }>>("sqlite3", ["-json", dbPath, `
      select role, substr(content,1,8000) as content, tool_name, timestamp
      from messages
      where session_id = '${session.id.replaceAll("'", "''")}'
      order by timestamp desc
      limit 30;
    `], []);
    const latestAssistant = messages.find((message) => message.role === "assistant" && message.content?.trim());
    const latestUser = messages.find((message) => message.role === "user" && message.content?.trim());
    const latestTool = messages.find((message) => message.role === "tool" && message.content?.trim());
    const latest = latestAssistant ?? latestTool ?? messages.find((message) => message.content?.trim());
    const chatMessages = messages
      .filter((message) => (
        (message.role === "user" || message.role === "assistant")
        && message.content?.trim()
      ))
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((message) => ({
        role: message.role as "user" | "assistant",
        content: compact(message.content, "", 8_000),
      }));
    return {
      id: `hermes-state:${session.id}`,
      agentId: agent.id,
      title: (session.title || latestUser?.content || `Hermes ${session.source} session`).slice(0, 160),
      lastMessage: compact(latest?.content, "Hermes session exists, but no readable message was stored."),
      status: statusFromSession(session.ended_at, session.end_reason),
      source: "hermes-state",
      startedAt: session.started_at * 1000,
      updatedAt: (latest?.timestamp ?? session.started_at) * 1000,
      messages: chatMessages,
    };
  }));

  return tasks;
}

async function readIfExists(path: string) {
  try {
    await access(path, constants.R_OK);
    return await readFile(path, "utf-8");
  } catch {
    return "";
  }
}

async function listFilesRecursive(dir: string, depth = 2): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const directFiles = entries
    .filter((entry) => entry.isFile())
    .map((entry) => join(dir, entry.name));
  if (depth <= 0) return directFiles;
  const nested = await Promise.all(entries
    .filter((entry) => entry.isDirectory())
    .slice(0, MAX_FILES_PER_DIR)
    .map((entry) => listFilesRecursive(join(dir, entry.name), depth - 1)));
  return [...directFiles, ...nested.flat()].slice(0, MAX_FILES_PER_DIR * 4);
}

async function parseControlRoomDataDirs(controlRoomPath: string) {
  const yaml = await readIfExists(join(controlRoomPath, "task-bus/agents.yaml"));
  const dataDirs: Record<string, string> = {};
  let current = "";
  for (const line of yaml.split(/\r?\n/)) {
    const agentMatch = line.match(/^\s{2}([a-zA-Z0-9_-]+):\s*$/);
    if (agentMatch) current = agentMatch[1];
    const dataMatch = line.match(/^\s+data_dir:\s*(.+)\s*$/);
    if (current && dataMatch) dataDirs[current] = expandHome(dataMatch[1].trim());
  }
  return dataDirs;
}

async function scanTaskBus(agent: AgentProfile, controlRoomPath: string): Promise<FleetTask[]> {
  const taskBusPath = join(controlRoomPath, "task-bus");
  const dirs = ["working", "inbox", "outbox", "archive"];
  const needles = [agent.id, agent.agentId, agent.name].filter(Boolean).map((value) => normalize(value as string));
  const tasks: FleetTask[] = [];

  await Promise.all(dirs.map(async (dir) => {
    const fullDir = join(taskBusPath, dir);
    const filePaths = await listFilesRecursive(fullDir, 2);
    await Promise.all(filePaths.map(async (filePath) => {
      const content = await readFile(filePath, "utf-8").catch(() => "");
      const haystack = normalize(`${filePath}\n${content}`);
      if (!needles.some((needle) => needle && haystack.includes(needle))) return;
      const stats = await stat(filePath).catch(() => null);
      tasks.push(taskFromContent(agent.id, `task-bus/${dir}`, filePath, content.slice(-MAX_FILE_CHARS), stats?.mtimeMs ?? Date.now()));
    }));
  }));

  return tasks;
}

async function scanAgentDataDir(agent: AgentProfile, dataDir?: string): Promise<FleetTask[]> {
  if (!dataDir) return [];
  const safeDir = resolve(expandHome(dataDir));
  const hasHermesDb = agent.runtime === "hermes"
    ? await access(join(safeDir, "state.db"), constants.R_OK).then(() => true).catch(() => false)
    : false;
  const dirs = hasHermesDb ? ["cron", "tasks", "inbox", "outbox"] : ["logs", "sessions", "cron", "tasks", "inbox", "outbox"];
  const tasks: FleetTask[] = [];
  await Promise.all(dirs.map(async (dir) => {
    const fullDir = join(safeDir, dir);
    const entries = await readdir(fullDir, { withFileTypes: true }).catch(() => []);
    const files = entries
      .filter((entry) => entry.isFile() && /\.(log|md|json|jsonl|txt)$/i.test(entry.name))
      .slice(0, MAX_FILES_PER_DIR);
    await Promise.all(files.map(async (entry) => {
      const filePath = join(fullDir, entry.name);
      const stats = await stat(filePath).catch(() => null);
      const content = await readFile(filePath, "utf-8").catch(() => "");
      if (!content.trim()) return;
      tasks.push(taskFromContent(agent.id, `data/${dir}`, filePath, content.slice(-MAX_FILE_CHARS), stats?.mtimeMs ?? Date.now()));
    }));
  }));
  return tasks;
}

async function checkTcpUrl(url: string) {
  return new Promise<boolean>((resolveResult) => {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      resolveResult(false);
      return;
    }
    const port = Number(parsed.port || (parsed.protocol === "wss:" || parsed.protocol === "https:" ? 443 : 80));
    const socket = net.createConnection({ host: parsed.hostname, port, timeout: 1_500 });
    socket.once("connect", () => {
      socket.destroy();
      resolveResult(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolveResult(false);
    });
    socket.once("error", () => resolveResult(false));
  });
}

async function checkRuntime(agent: AgentProfile) {
  if (agent.runtime === "openclaw") {
    const reachable = await checkTcpUrl(agent.gatewayUrl);
    return {
      reachable,
      payload: reachable ? { status: "OpenClaw gateway port is reachable" } : null as unknown,
      error: reachable ? "" : "OpenClaw gateway port is not reachable",
    };
  }
  const statusUrl = getRuntimeUrl(agent, agent.statusPath || "/health");
  try {
    const response = await fetch(statusUrl, {
      method: "GET",
      headers: agent.token ? { Authorization: `Bearer ${agent.token}` } : undefined,
      signal: AbortSignal.timeout(3_000),
      cache: "no-store",
    });
    const contentType = response.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? await response.json().catch(() => null)
      : await response.text().catch(() => "");
    return { reachable: response.ok, payload, error: response.ok ? "" : `${response.status} ${response.statusText}` };
  } catch (error) {
    const reason = error instanceof Error && error.message !== "fetch failed"
      ? error.message
      : "endpoint is not listening";
    return { reachable: false, payload: null, error: `Runtime status unavailable at ${statusUrl}: ${reason}` };
  }
}

async function processMatches(agent: AgentProfile, includeGenericHermes = false) {
  const { stdout } = await execFileAsync("ps", ["-axo", "pid=,command="], { timeout: 4_000, maxBuffer: 800_000 }).catch(() => ({ stdout: "" }));
  const needles = [agent.id, agent.agentId, agent.name]
    .filter(Boolean)
    .map((value) => normalize(value as string))
    .filter((value) => value.length >= 4 && !["main", "agent"].includes(value));
  return stdout
    .split(/\r?\n/)
    .filter((line) => {
      if (/api\/fleet\/snapshot|next start|codex app-server|rg -i|ps -axo/i.test(line)) return false;
      const text = normalize(line);
      return needles.some((needle) => needle && text.includes(needle))
        || (includeGenericHermes && /\/\.hermes\/|\/hermes-agent\/|\/bin\/hermes\b/i.test(line));
    })
    .slice(0, 5);
}

export async function POST(request: NextRequest) {
  let agents: AgentWithLocal[] = [];
  let sharedVault: SharedVaultConfig | undefined;
  try {
    const body = (await request.json()) as { agents?: AgentProfile[]; sharedVault?: SharedVaultConfig };
    agents = Array.isArray(body.agents) ? body.agents as AgentWithLocal[] : [];
    sharedVault = body.sharedVault;
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const controlRoomPath = resolve(expandHome(sharedVault?.controlRoomPath || ""));
  const dataDirs: Record<string, string> = controlRoomPath
    ? await parseControlRoomDataDirs(controlRoomPath).catch(() => ({} as Record<string, string>))
    : {};
  const firstHermesId = agents.find((agent) => agent.runtime === "hermes")?.id;

  const snapshots = await Promise.all(agents.map(async (agent): Promise<AgentSnapshot> => {
    const remoteSnapshot = await readRemoteSnapshot(agent);
    if (remoteSnapshot) return remoteSnapshot;

    const checkedAt = Date.now();
    const configuredDataDir = agent.localDataDir
      ?? dataDirs[agent.agentId || agent.id]
      ?? dataDirs[agent.id];
    const hermesHomeDir = agent.runtime === "hermes" && agent.id === firstHermesId ? join(homedir(), ".hermes") : undefined;
    const dataDirsToScan = [...new Set([configuredDataDir, hermesHomeDir].filter(Boolean) as string[])];
    const hasReadableDataDir = (await Promise.all(dataDirsToScan.map(pathReadable))).some(Boolean);
    const [runtimeResult, taskBusTasks, dataDirTaskGroups, hermesDbTaskGroups, processes] = await Promise.all([
      checkRuntime(agent),
      controlRoomPath ? scanTaskBus(agent, controlRoomPath) : Promise.resolve([]),
      Promise.all(dataDirsToScan.map((dir) => scanAgentDataDir(agent, dir))),
      Promise.all(dataDirsToScan.map((dir) => agent.runtime === "hermes" ? scanHermesStateDb(agent, dir) : Promise.resolve([]))),
      processMatches(agent, Boolean(hermesHomeDir)),
    ]);
    const dataDirTasks = dataDirTaskGroups.flat();
    const hermesDbTasks = hermesDbTaskGroups.flat();
    const runtimeTasks = tasksFromPayload(agent, runtimeResult.payload, "runtime-status");
    const priority = (task: FleetTask) => {
      if (task.status === "active") return 4;
      if (task.source === "hermes-state") return 3;
      if (task.source.startsWith("task-bus")) return 2;
      if (task.source === "runtime-status") return 1;
      return 0;
    };
    const tasks = [...runtimeTasks, ...hermesDbTasks, ...taskBusTasks, ...dataDirTasks]
      .sort((a, b) => priority(b) - priority(a) || b.updatedAt - a.updatedAt)
      .slice(0, 12);
    const sources = [
      runtimeResult.reachable ? "runtime reachable" : "",
      taskBusTasks.length ? "task bus" : "",
      hermesDbTasks.length ? "Hermes history" : "",
      dataDirTasks.length ? "runtime files" : "",
      processes.length ? "local process" : "",
    ].filter(Boolean);
    return {
      agentId: agent.id,
      ok: runtimeResult.reachable || processes.length > 0 || tasks.length > 0,
      runtimeReachable: runtimeResult.reachable,
      processRunning: processes.length > 0,
      summary: tasks[0]?.title
        ?? (processes.length
          ? "Process is running; no current task exposed yet."
          : configuredDataDir && !hasReadableDataDir
            ? `Configured data dir is not available here: ${configuredDataDir}`
            : "No external activity source exposed a task yet."),
      sources,
      tasks,
      checkedAt,
      error: runtimeResult.reachable || tasks.length > 0 || processes.length > 0
        ? undefined
        : configuredDataDir && !hasReadableDataDir
          ? `No local runtime files found at ${configuredDataDir}`
          : runtimeResult.error || undefined,
    };
  }));

  return Response.json({ ok: true, checkedAt: Date.now(), snapshots });
}
