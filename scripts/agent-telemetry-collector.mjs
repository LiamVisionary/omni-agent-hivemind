#!/usr/bin/env node
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { access, readdir, readFile, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { homedir, hostname } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const port = Number(process.env.AGENT_TELEMETRY_PORT || 8787);
const defaultHermesDir = process.env.HERMES_HOME || join(homedir(), ".hermes");
const maxChars = 1000;

function expandHome(path) {
  return path?.replace(/^~(?=$|\/)/, homedir());
}

function compact(value, fallback = "No readable details.") {
  if (typeof value === "string") return value.trim().slice(0, maxChars) || fallback;
  if (value && typeof value === "object") return JSON.stringify(value).slice(0, maxChars);
  return fallback;
}

async function execJson(cmd, args, fallback) {
  const { stdout } = await execFileAsync(cmd, args, { timeout: 5000, maxBuffer: 1_200_000 }).catch(() => ({ stdout: "" }));
  if (!stdout.trim()) return fallback;
  try {
    return JSON.parse(stdout);
  } catch {
    return fallback;
  }
}

async function scanHermesState(agent, hermesDir) {
  const dbPath = join(hermesDir, "state.db");
  try {
    await access(dbPath, constants.R_OK);
  } catch {
    return [];
  }
  const sessions = await execJson("sqlite3", ["-json", dbPath, `
    select id, source, started_at, ended_at, end_reason, title, message_count, tool_call_count
    from sessions order by started_at desc limit 12;
  `], []);

  return Promise.all(sessions.map(async (session) => {
    const messages = await execJson("sqlite3", ["-json", dbPath, `
      select role, substr(content,1,900) as content, tool_name, timestamp
      from messages
      where session_id = '${String(session.id).replaceAll("'", "''")}'
      order by timestamp desc limit 8;
    `], []);
    const latestAssistant = messages.find((message) => message.role === "assistant" && message.content?.trim());
    const latestUser = messages.find((message) => message.role === "user" && message.content?.trim());
    const latestTool = messages.find((message) => message.role === "tool" && message.content?.trim());
    const latest = latestAssistant ?? latestTool ?? messages.find((message) => message.content?.trim());
    return {
      id: `hermes-state:${session.id}`,
      agentId: agent.id,
      title: compact(session.title || latestUser?.content || `Hermes ${session.source} session`).slice(0, 160),
      lastMessage: compact(latest?.content, "Hermes session exists, but no readable message was stored."),
      status: session.ended_at ? (/error|fail/i.test(session.end_reason || "") ? "failed" : "completed") : "active",
      source: "hermes-state",
      startedAt: session.started_at * 1000,
      updatedAt: (latest?.timestamp ?? session.started_at) * 1000,
    };
  }));
}

async function scanFiles(agent, dataDir) {
  const safeDir = resolve(expandHome(dataDir || ""));
  const dirs = ["tasks", "inbox", "outbox", "cron", "logs", "sessions"];
  const tasks = [];
  for (const dir of dirs) {
    const fullDir = join(safeDir, dir);
    const entries = await readdir(fullDir, { withFileTypes: true }).catch(() => []);
    for (const entry of entries.filter((item) => item.isFile()).slice(0, 20)) {
      if (!/\.(md|txt|json|jsonl|log)$/i.test(entry.name)) continue;
      const filePath = join(fullDir, entry.name);
      const content = await readFile(filePath, "utf-8").catch(() => "");
      if (!content.trim()) continue;
      const stats = await stat(filePath).catch(() => null);
      tasks.push({
        id: `file:${filePath}`,
        agentId: agent.id,
        title: content.split(/\r?\n/).find((line) => line.trim())?.replace(/^#+\s*/, "").slice(0, 160) || entry.name,
        lastMessage: compact(content.slice(-4000)),
        status: filePath.includes("/outbox/") ? "completed" : filePath.includes("/tasks/") || filePath.includes("/inbox/") ? "active" : "unknown",
        source: `file/${dir}`,
        startedAt: stats?.birthtimeMs ?? stats?.mtimeMs ?? Date.now(),
        updatedAt: stats?.mtimeMs ?? Date.now(),
      });
    }
  }
  return tasks;
}

async function processSeen(agent) {
  const { stdout } = await execFileAsync("ps", ["-axo", "command="], { timeout: 4000, maxBuffer: 800_000 }).catch(() => ({ stdout: "" }));
  const needles = [agent.id, agent.agentId, agent.name]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase())
    .filter((value) => value.length >= 4 && !["main", "agent"].includes(value));
  return stdout.split(/\r?\n/).some((line) => (
    needles.some((needle) => line.toLowerCase().includes(needle))
    || (agent.runtime === "hermes" && line.includes("/.hermes/"))
  ));
}

async function localAgents() {
  const agents = [];
  const hermesDb = join(defaultHermesDir, "state.db");
  const hermesAvailable = await access(hermesDb, constants.R_OK).then(() => true).catch(() => false);
  if (hermesAvailable) {
    agents.push({
      id: `hermes-${hostname().toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      name: "Hermes",
      runtime: "hermes",
      gatewayUrl: "",
      agentId: "local-hermes",
      localDataDir: defaultHermesDir,
      machineName: hostname(),
    });
  }
  return agents;
}

async function snapshotFor(agent) {
  const dataDir = expandHome(agent.localDataDir || (agent.runtime === "hermes" ? defaultHermesDir : ""));
  const [hermesTasks, fileTasks, running] = await Promise.all([
    agent.runtime === "hermes" && dataDir ? scanHermesState(agent, dataDir) : Promise.resolve([]),
    dataDir ? scanFiles(agent, dataDir) : Promise.resolve([]),
    processSeen(agent),
  ]);
  const tasks = [...hermesTasks, ...fileTasks]
    .sort((a, b) => (b.status === "active" ? 1 : 0) - (a.status === "active" ? 1 : 0) || b.updatedAt - a.updatedAt)
    .slice(0, 12);
  return {
    agentId: agent.id,
    ok: running || tasks.length > 0,
    runtimeReachable: true,
    processRunning: running,
    summary: tasks[0]?.title || (running ? "Process is running; no task title exposed yet." : "No local activity found."),
    sources: [
      tasks.some((task) => task.source === "hermes-state") ? "Hermes history" : "",
      tasks.some((task) => task.source?.startsWith("file/")) ? "runtime files" : "",
      running ? "local process" : "",
      hostname(),
    ].filter(Boolean),
    tasks,
    checkedAt: Date.now(),
  };
}

function readBody(request) {
  return new Promise((resolveBody) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) request.destroy();
    });
    request.on("end", () => resolveBody(body));
  });
}

createServer(async (request, response) => {
  response.setHeader("access-control-allow-origin", "*");
  response.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
  response.setHeader("access-control-allow-headers", "content-type");
  if (request.method === "OPTIONS") {
    response.writeHead(204).end();
    return;
  }
  if (request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ ok: true, host: hostname() }));
    return;
  }
  if (request.url === "/agents") {
    const agents = await localAgents();
    response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ ok: true, host: hostname(), agents }));
    return;
  }
  if (request.url !== "/snapshot") {
    response.writeHead(404, { "content-type": "application/json" }).end(JSON.stringify({ ok: false, error: "not found" }));
    return;
  }
  const rawBody = request.method === "POST" ? await readBody(request) : "{}";
  const body = rawBody ? JSON.parse(rawBody) : {};
  const agents = body.agent ? [body.agent] : body.agents || await localAgents();
  const snapshots = await Promise.all(agents.map((agent) => snapshotFor(agent)));
  response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ ok: true, snapshot: snapshots[0], snapshots }));
}).listen(port, "0.0.0.0", () => {
  console.log(`agent telemetry collector listening on 0.0.0.0:${port}`);
});
