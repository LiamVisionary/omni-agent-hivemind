#!/usr/bin/env node
import { createServer } from "node:http";
import { execFile, spawn } from "node:child_process";
import { access, readdir, readFile, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { homedir, hostname } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const port = Number(process.env.AGENT_TELEMETRY_PORT || 8787);
const appDir = resolve(join(fileURLToPath(import.meta.url), "..", ".."));
const defaultHermesDir = process.env.HERMES_HOME || join(homedir(), ".hermes");
const maxChars = 1000;
const maxChatChars = 12_000;
const chatTimeoutMs = Number(process.env.AGENT_TELEMETRY_CHAT_TIMEOUT_MS || 180_000);

function expandHome(path) {
  return path?.replace(/^~(?=$|\/)/, homedir());
}

function jsonResponse(response, status, payload) {
  response.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(payload));
}

function ssePayload(payload) {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

function compact(value, fallback = "No readable details.") {
  if (typeof value === "string") return value.trim().slice(0, maxChars) || fallback;
  if (value && typeof value === "object") return JSON.stringify(value).slice(0, maxChars);
  return fallback;
}

function readableChatContent(value) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (/^[\[{]/.test(trimmed)) {
      try {
        return readableChatContent(JSON.parse(trimmed));
      } catch {
        return trimmed;
      }
    }
    return trimmed;
  }
  if (!value || typeof value !== "object") return "";
  const choices = Array.isArray(value.choices) ? value.choices : [];
  for (const choice of choices) {
    const content = readableChatContent(choice?.message)
      || readableChatContent(choice?.delta)
      || readableChatContent(choice?.text);
    if (content) return content;
  }
  for (const key of ["response", "answer", "content", "text", "message", "output", "result", "summary"]) {
    const content = readableChatContent(value[key]);
    if (content) return content;
  }
  return "";
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

async function execText(cmd, args, fallback = "") {
  const { stdout } = await execFileAsync(cmd, args, {
    cwd: appDir,
    timeout: 5000,
    maxBuffer: 300_000,
  }).catch(() => ({ stdout: fallback }));
  return stdout.trim();
}

async function appVersion() {
  const [commit, branch, dirty, remoteCommit] = await Promise.all([
    execText("git", ["rev-parse", "HEAD"]),
    execText("git", ["rev-parse", "--abbrev-ref", "HEAD"]),
    execText("git", ["status", "--porcelain"]),
    execText("git", ["ls-remote", "origin", "main"]),
  ]);
  const latestCommit = remoteCommit.split(/\s+/)[0] || commit;
  return {
    appDir,
    commit,
    shortCommit: commit.slice(0, 7),
    branch,
    dirty: dirty.length > 0,
    latestCommit,
    latestShortCommit: latestCommit.slice(0, 7),
    updateCommand: `cd ${JSON.stringify(appDir)} && git pull --ff-only && pnpm install --frozen-lockfile && ./scripts/install-telemetry-collector.sh`,
  };
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

async function resolveHermesBin() {
  if (process.env.HERMES_BIN) return process.env.HERMES_BIN;
  const candidates = [
    join(homedir(), ".local", "bin", "hermes"),
    "/usr/local/bin/hermes",
    "/opt/homebrew/bin/hermes",
    "/usr/bin/hermes",
  ];
  for (const path of candidates) {
    try {
      await access(path, constants.X_OK);
      return path;
    } catch {
      // try next
    }
  }
  return "hermes";
}

function startUpdate() {
  const command = `cd ${shellQuote(appDir)} && mkdir -p .next && { echo "--- update $(date -u +%Y-%m-%dT%H:%M:%SZ) ---"; git pull --ff-only; pnpm install --frozen-lockfile; pnpm build; ./setup.sh; } >> .next/agent-update.log 2>&1`;
  const child = spawn("sh", ["-lc", command], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
  return command;
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
    const readableMessages = messages.map((message) => ({
      ...message,
      content: readableChatContent(message.content),
    })).filter((message) => message.content.trim());
    const latestAssistant = readableMessages.find((message) => message.role === "assistant");
    const latestUser = readableMessages.find((message) => message.role === "user");
    const latestTool = readableMessages.find((message) => message.role === "tool");
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

async function sendHermesChat(body) {
  if (process.env.AGENT_TELEMETRY_CHAT_DISABLED === "1") {
    return { ok: false, status: 403, error: "Collector chat bridge is disabled on this machine." };
  }

  const message = typeof body.message === "string"
    ? body.message
    : Array.isArray(body.messages)
      ? [...body.messages].reverse().find((item) => item?.role === "user")?.content
      : "";
  const text = typeof message === "string" ? message.trim() : "";
  if (!text) return { ok: false, status: 400, error: "Message is required." };
  if (text.length > maxChatChars) return { ok: false, status: 413, error: `Message is too long. Limit: ${maxChatChars} characters.` };

  const agent = body.agent && typeof body.agent === "object" ? body.agent : {};
  const hermesHome = expandHome(agent.localDataDir || body.localDataDir || defaultHermesDir);
  const { stdout, stderr } = await execFileAsync(await resolveHermesBin(), ["-z", text], {
    timeout: chatTimeoutMs,
    maxBuffer: 3_000_000,
    env: {
      ...process.env,
      HERMES_HOME: hermesHome,
      PAGER: "cat",
    },
  });
  const content = stdout.trim() || stderr.trim();
  return {
    ok: true,
    text: content,
    choices: [{ message: { role: "assistant", content } }],
    host: hostname(),
  };
}

async function streamHermesChat(body, response) {
  if (process.env.AGENT_TELEMETRY_CHAT_DISABLED === "1") {
    response.writeHead(403, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
    response.end(ssePayload({ error: "Collector chat bridge is disabled on this machine." }) + "data: [DONE]\n\n");
    return;
  }

  const message = typeof body.message === "string"
    ? body.message
    : Array.isArray(body.messages)
      ? [...body.messages].reverse().find((item) => item?.role === "user")?.content
      : "";
  const text = typeof message === "string" ? message.trim() : "";
  if (!text) {
    response.writeHead(400, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
    response.end(ssePayload({ error: "Message is required." }) + "data: [DONE]\n\n");
    return;
  }
  if (text.length > maxChatChars) {
    response.writeHead(413, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
    response.end(ssePayload({ error: `Message is too long. Limit: ${maxChatChars} characters.` }) + "data: [DONE]\n\n");
    return;
  }

  const agent = body.agent && typeof body.agent === "object" ? body.agent : {};
  const hermesHome = expandHome(agent.localDataDir || body.localDataDir || defaultHermesDir);
  const child = spawn(await resolveHermesBin(), ["-z", text], {
    env: {
      ...process.env,
      HERMES_HOME: hermesHome,
      PAGER: "cat",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";
  let settled = false;
  response.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-cache",
    connection: "keep-alive",
  });

  const finish = (payload = null) => {
    if (settled) return;
    settled = true;
    clearTimeout(timeout);
    if (payload) response.write(ssePayload(payload));
    response.end("data: [DONE]\n\n");
  };

  const timeout = setTimeout(() => {
    child.kill("SIGTERM");
    finish({ error: `Hermes chat timed out after ${chatTimeoutMs}ms.` });
  }, chatTimeoutMs);

  response.on("close", () => {
    if (!settled) child.kill("SIGTERM");
  });

  child.stdout.on("data", (chunk) => {
    const textChunk = chunk.toString("utf8");
    stdout += textChunk;
    response.write(ssePayload({ choices: [{ delta: { content: textChunk } }] }));
  });

  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString("utf8");
  });

  child.on("error", (error) => {
    finish({ error: error instanceof Error ? error.message : "Hermes chat failed" });
  });

  child.on("close", (code) => {
    if (settled) return;
    const content = stdout.trim();
    const errorText = stderr.trim();
    if (code === 0) {
      if (!content && errorText) {
        response.write(ssePayload({ choices: [{ delta: { content: errorText } }] }));
      }
      finish();
      return;
    }
    finish({ error: errorText || `Hermes exited with code ${code ?? "unknown"}.` });
  });
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
    jsonResponse(response, 200, {
      ok: true,
      host: hostname(),
      version: await appVersion(),
      capabilities: { chat: true, runtimes: ["hermes"] },
    });
    return;
  }
  if (request.url === "/update" && request.method === "POST") {
    const version = await appVersion();
    const command = startUpdate();
    jsonResponse(response, 202, {
      ok: true,
      accepted: true,
      host: hostname(),
      version,
      message: "Update started. The collector and dashboard may briefly restart.",
      command,
    });
    return;
  }
  if (request.url === "/agents") {
    const agents = await localAgents();
    jsonResponse(response, 200, { ok: true, host: hostname(), agents });
    return;
  }
  if (request.url === "/chat" && request.method === "POST") {
    try {
      const rawBody = await readBody(request);
      const body = rawBody ? JSON.parse(rawBody) : {};
      if (body.stream === true) {
        await streamHermesChat(body, response);
        return;
      }
      const result = await sendHermesChat(body);
      jsonResponse(response, result.ok ? 200 : result.status || 500, result);
    } catch (error) {
      jsonResponse(response, 500, {
        ok: false,
        error: error instanceof Error ? error.message : "Hermes chat failed",
      });
    }
    return;
  }
  if (request.url !== "/snapshot") {
    jsonResponse(response, 404, { ok: false, error: "not found" });
    return;
  }
  const rawBody = request.method === "POST" ? await readBody(request) : "{}";
  const body = rawBody ? JSON.parse(rawBody) : {};
  const agents = body.agent ? [body.agent] : body.agents || await localAgents();
  const snapshots = await Promise.all(agents.map((agent) => snapshotFor(agent)));
  jsonResponse(response, 200, { ok: true, snapshot: snapshots[0], snapshots });
}).listen(port, "0.0.0.0", () => {
  console.log(`agent telemetry collector listening on 0.0.0.0:${port}`);
});
