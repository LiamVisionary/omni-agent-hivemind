#!/usr/bin/env node
import { createServer } from "node:http";
import { execFile, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { access, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { homedir, hostname, userInfo } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const port = Number(process.env.AGENT_TELEMETRY_PORT || 8787);
const appDir = resolve(join(fileURLToPath(import.meta.url), "..", ".."));
const defaultHermesDir = process.env.HERMES_HOME || join(homedir(), ".hermes");
const defaultAeonDir = process.env.AEON_LOCAL_PATH || process.env.AEON_HOME || join(homedir(), ".aeon");
const maxChars = 1000;
const maxChatChars = 12_000;
const chatTimeoutMs = Number(process.env.AGENT_TELEMETRY_CHAT_TIMEOUT_MS || 10 * 60_000);
const sessionDiscoveryTimeoutMs = Number(process.env.AGENT_TELEMETRY_SESSION_DISCOVERY_TIMEOUT_MS || 15_000);
const hermesApiHost = process.env.AGENT_TELEMETRY_HERMES_API_HOST || "127.0.0.1";
const hermesApiPort = Number(process.env.AGENT_TELEMETRY_HERMES_API_PORT || process.env.API_SERVER_PORT || 8642);
const hermesApiBaseUrl = `http://${hermesApiHost}:${hermesApiPort}`;
const hermesApiKey = process.env.AGENT_TELEMETRY_HERMES_API_KEY || process.env.API_SERVER_KEY || "";
const hermesApiStartTimeoutMs = Number(process.env.AGENT_TELEMETRY_HERMES_API_START_TIMEOUT_MS || 15_000);
const syncthingApiBaseUrl = process.env.SYNCTHING_API_URL || "http://127.0.0.1:8384";
const defaultSyncPath = expandHome(
  process.env.HIVEMINDOS_SYNC_PATH
    || process.env.NEXT_PUBLIC_OBSIDIAN_VAULT_PATH
    || "~/Documents/Obsidian/hivemindos-vault",
);
let hermesApiProcess = null;
let hermesApiStartPromise = null;

function expandHome(path) {
  return path?.replace(/^~(?=$|\/)/, homedir());
}

function jsonResponse(response, status, payload) {
  response.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(payload));
}

function currentUsername() {
  try {
    return userInfo().username;
  } catch {
    return process.env.USER || process.env.LOGNAME || "";
  }
}

function ssePayload(payload) {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

function hermesApiHeaders(extra = {}) {
  return {
    ...extra,
    ...(hermesApiKey ? { Authorization: `Bearer ${hermesApiKey}` } : {}),
  };
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function normalizeContentPart(part) {
  if (!part || typeof part !== "object") return null;
  if (part.type === "text") {
    const text = typeof part.text === "string" ? part.text.trim() : "";
    return text ? { type: "text", text } : null;
  }
  if (part.type === "image_url" && part.image_url?.url) {
    return { type: "image_url", image_url: { url: String(part.image_url.url) } };
  }
  if (part.type === "file" && part.file?.file_data) {
    return {
      type: "file",
      file: {
        filename: String(part.file.filename || "attachment"),
        file_data: String(part.file.file_data),
      },
    };
  }
  return null;
}

function normalizeMessageContent(content) {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";
  return content.map(normalizeContentPart).filter(Boolean);
}

function messageHasContent(message) {
  const content = normalizeMessageContent(message?.content);
  return Array.isArray(content) ? content.length > 0 : Boolean(content);
}

function extractUserTextFromMessages(messages) {
  const lastUserMessage = [...messages].reverse().find((message) => message?.role === "user" && messageHasContent(message));
  if (!lastUserMessage) return "";
  if (typeof lastUserMessage.content === "string") return lastUserMessage.content.trim();
  return lastUserMessage.content
    .filter((part) => part?.type === "text" && typeof part.text === "string")
    .map((part) => part.text.trim())
    .filter(Boolean)
    .join(" ");
}

function attachmentPromptFromMessages(messages) {
  const lastUserMessage = [...messages].reverse().find((message) => message?.role === "user" && messageHasContent(message));
  if (!lastUserMessage || !Array.isArray(lastUserMessage.content)) return "";
  const images = lastUserMessage.content.filter((part) => part?.type === "image_url" && part.image_url?.url).length;
  const files = lastUserMessage.content.filter((part) => part?.type === "file" && part.file?.file_data).length;
  const pieces = [
    images ? `${images} image${images === 1 ? "" : "s"}` : "",
    files ? `${files} file${files === 1 ? "" : "s"}` : "",
  ].filter(Boolean);
  return pieces.length ? `Please respond to the attached ${pieces.join(" and ")}.` : "";
}

function messagesHaveMultimodalContent(messages) {
  return Array.isArray(messages) && messages.some((message) => (
    Array.isArray(message?.content)
    && message.content.some((part) => part?.type === "image_url" || part?.type === "file")
  ));
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

function safeFolderId(value) {
  return String(value || "hivemindos-sync")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "hivemindos-sync";
}

function syncthingConfigCandidates() {
  return [
    process.env.SYNCTHING_CONFIG_PATH,
    join(homedir(), "Library", "Application Support", "Syncthing", "config.xml"),
    join(homedir(), ".local", "state", "syncthing", "config.xml"),
    join(homedir(), ".config", "syncthing", "config.xml"),
  ].filter(Boolean);
}

async function readSyncthingApiKey() {
  if (process.env.SYNCTHING_API_KEY) return process.env.SYNCTHING_API_KEY;
  for (const path of syncthingConfigCandidates()) {
    const raw = await readFile(path, "utf8").catch(() => "");
    const match = raw.match(/<apikey>([^<]+)<\/apikey>/i);
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

async function resolveSyncthingBin() {
  if (process.env.SYNCTHING_BIN) return process.env.SYNCTHING_BIN;
  const candidates = [
    join(homedir(), ".local", "bin", "syncthing"),
    "/opt/homebrew/bin/syncthing",
    "/usr/local/bin/syncthing",
    "/usr/bin/syncthing",
  ];
  for (const path of candidates) {
    try {
      await access(path, constants.X_OK);
      return path;
    } catch {
      // try next
    }
  }
  return "syncthing";
}

async function syncthingInstalled() {
  const bin = await resolveSyncthingBin();
  return access(bin, constants.X_OK).then(() => ({ installed: true, bin })).catch(() => ({ installed: false, bin }));
}

function startSyncthingDetached() {
  const runner = join(appDir, "scripts", "run-syncthing.sh");
  const child = spawn(runner, [], {
    detached: true,
    stdio: "ignore",
    env: {
      ...process.env,
      SYNCTHING_GUI_ADDRESS: "127.0.0.1:8384",
    },
  });
  child.unref();
}

async function syncthingFetch(path, options = {}) {
  const apiKey = await readSyncthingApiKey();
  const headers = {
    ...(options.body ? { "content-type": "application/json" } : {}),
    ...(apiKey ? { "X-API-Key": apiKey } : {}),
    ...(options.headers || {}),
  };
  const response = await fetch(`${syncthingApiBaseUrl}${path}`, {
    ...options,
    headers,
    signal: AbortSignal.timeout(options.timeoutMs || 8_000),
  });
  const text = await response.text();
  let data = null;
  if (text.trim()) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }
  if (!response.ok) {
    throw new Error(data?.error || data?.raw || `Syncthing API ${path} returned HTTP ${response.status}`);
  }
  return data;
}

async function waitForSyncthing() {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    try {
      const ping = await syncthingFetch("/rest/system/ping", { timeoutMs: 2_000 });
      if (ping?.ping === "pong") return true;
    } catch {
      if (attempt === 0) {
        try {
          startSyncthingDetached();
        } catch {
          // setup normally owns service startup; keep polling.
        }
      }
      await sleep(1_000);
    }
  }
  return false;
}

async function syncthingStatus() {
  const install = await syncthingInstalled();
  if (!install.installed) {
    return {
      ok: false,
      installed: false,
      running: false,
      error: "Syncthing is not installed. Run setup on this machine.",
    };
  }
  const running = await waitForSyncthing();
  if (!running) {
    return {
      ok: false,
      installed: true,
      running: false,
      error: "Syncthing is installed but its local API is not reachable.",
    };
  }
  const [system, version, connections] = await Promise.all([
    syncthingFetch("/rest/system/status"),
    syncthingFetch("/rest/system/version").catch(() => null),
    syncthingFetch("/rest/system/connections").catch(() => null),
  ]);
  return {
    ok: true,
    installed: true,
    running: true,
    host: hostname(),
    deviceID: system.myID,
    guiAddress: syncthingApiBaseUrl,
    defaultSyncPath,
    version: version?.version,
    connections,
  };
}

function mergeDevice(existing, defaults, peer) {
  const device = {
    ...defaults,
    ...existing,
    deviceID: peer.deviceID,
    name: peer.name || existing?.name || defaults?.name || peer.deviceID.slice(0, 7),
    addresses: Array.isArray(peer.addresses) && peer.addresses.length ? peer.addresses : existing?.addresses || ["dynamic"],
    paused: false,
    introducer: false,
    autoAcceptFolders: false,
  };
  delete device._editing;
  return device;
}

function folderDevices(config, peerDeviceID) {
  const ids = [config.myID, peerDeviceID].filter(Boolean);
  return ids.map((deviceID) => ({ deviceID }));
}

function mergeFolder(existing, defaults, input, config) {
  const folder = {
    ...defaults,
    ...existing,
    id: safeFolderId(input.folderId || defaults?.id),
    label: input.label || existing?.label || defaults?.label || "HivemindOS Sync",
    path: expandHome(input.path),
    type: "sendreceive",
    paused: false,
    fsWatcherEnabled: true,
    fsWatcherDelayS: existing?.fsWatcherDelayS ?? defaults?.fsWatcherDelayS ?? 10,
    rescanIntervalS: existing?.rescanIntervalS ?? defaults?.rescanIntervalS ?? 30,
    ignorePerms: true,
    devices: folderDevices(config, input.peerDeviceID),
  };
  delete folder._editing;
  return folder;
}

async function configureSyncthingFolder(input) {
  const peerDeviceID = String(input.peerDeviceID || "").trim();
  const path = expandHome(String(input.path || "").trim());
  if (!peerDeviceID) throw new Error("peerDeviceID is required.");
  if (!path) throw new Error("path is required.");
  await mkdir(path, { recursive: true, mode: 0o700 });
  await mkdir(join(path, ".stfolder"), { recursive: true, mode: 0o700 });
  const running = await waitForSyncthing();
  if (!running) throw new Error("Syncthing local API is not reachable.");

  const [config, deviceDefaults, folderDefaults, status] = await Promise.all([
    syncthingFetch("/rest/config"),
    syncthingFetch("/rest/config/defaults/device"),
    syncthingFetch("/rest/config/defaults/folder"),
    syncthingFetch("/rest/system/status"),
  ]);
  config.myID = status.myID;

  const folderId = safeFolderId(input.folderId || `hivemindos-${randomBytes(4).toString("hex")}`);
  const devices = Array.isArray(config.devices) ? config.devices : [];
  const folders = Array.isArray(config.folders) ? config.folders : [];
  const existingDeviceIndex = devices.findIndex((device) => device.deviceID === peerDeviceID);
  const peerDevice = mergeDevice(existingDeviceIndex >= 0 ? devices[existingDeviceIndex] : null, deviceDefaults, {
    deviceID: peerDeviceID,
    name: input.peerName,
    addresses: input.peerAddresses,
  });
  if (existingDeviceIndex >= 0) {
    devices[existingDeviceIndex] = peerDevice;
  } else {
    devices.push(peerDevice);
  }

  const existingFolderIndex = folders.findIndex((folder) => folder.id === folderId);
  const folder = mergeFolder(existingFolderIndex >= 0 ? folders[existingFolderIndex] : null, folderDefaults, {
    folderId,
    label: input.label,
    path,
    peerDeviceID,
  }, config);
  if (existingFolderIndex >= 0) {
    folders[existingFolderIndex] = folder;
  } else {
    folders.push(folder);
  }

  config.devices = devices;
  config.folders = folders;
  await syncthingFetch("/rest/config", { method: "PUT", body: JSON.stringify(config), timeoutMs: 15_000 });
  await syncthingFetch("/rest/db/scan", {
    method: "POST",
    body: JSON.stringify({ folder: folderId }),
    timeoutMs: 8_000,
  }).catch(() => null);

  return {
    ok: true,
    host: hostname(),
    deviceID: status.myID,
    folderId,
    label: folder.label,
    path: folder.path,
    peerDeviceID,
  };
}

function safeSyncTestId(value) {
  const id = String(value || "").trim();
  if (!/^[A-Za-z0-9._-]{1,80}$/.test(id)) {
    throw new Error("id must be 1-80 characters using letters, numbers, dot, underscore, or dash.");
  }
  return id;
}

function syncTestNotePath(root, id) {
  const base = resolve(expandHome(String(root || "").trim()));
  if (!base || base === resolve("/")) throw new Error("root is required.");
  const testDir = resolve(base, ".hivemindos-sync-test");
  const notePath = resolve(testDir, `${safeSyncTestId(id)}.md`);
  if (!notePath.startsWith(`${testDir}/`)) throw new Error("Invalid test note path.");
  return { base, testDir, notePath };
}

async function syncthingTestNote(input) {
  const action = String(input.action || "read").trim();
  const { base, testDir, notePath } = syncTestNotePath(input.root, input.id);
  if (action === "write") {
    await mkdir(testDir, { recursive: true, mode: 0o700 });
    const content = String(input.content ?? "");
    await writeFile(notePath, content, "utf8");
    return { ok: true, host: hostname(), action, root: base, path: notePath, bytes: Buffer.byteLength(content) };
  }
  if (action === "read") {
    const content = await readFile(notePath, "utf8");
    return { ok: true, host: hostname(), action, root: base, path: notePath, content };
  }
  if (action === "exists") {
    const exists = await access(notePath, constants.F_OK).then(() => true).catch(() => false);
    return { ok: true, host: hostname(), action, root: base, path: notePath, exists };
  }
  if (action === "delete") {
    await rm(notePath, { force: true });
    return { ok: true, host: hostname(), action, root: base, path: notePath, deleted: true };
  }
  throw new Error("action must be write, read, exists, or delete.");
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
  const command = `cd ${shellQuote(appDir)} && mkdir -p .next && { echo "--- update $(date -u +%Y-%m-%dT%H:%M:%SZ) ---"; git pull --ff-only; if command -v corepack >/dev/null 2>&1; then corepack prepare pnpm@8.6.12 --activate; hash -r 2>/dev/null || true; fi; CI=true NODE_OPTIONS="\${NODE_OPTIONS:+\$NODE_OPTIONS }--no-deprecation" pnpm install --frozen-lockfile; pnpm build; ./setup.sh; } >> .next/agent-update.log 2>&1`;
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

async function scanRuntimeSchedules(agent, dataDir) {
  const safeDir = resolve(expandHome(dataDir || ""));
  if (agent.runtime === "aeon") {
    const configPath = join(safeDir, "aeon.yml");
    const content = await readFile(configPath, "utf-8").catch(() => "");
    if (!content.trim()) return [];
    const schedules = [];
    for (const line of content.split(/\r?\n/)) {
      const inline = line.match(/^  ([a-zA-Z0-9_-]+):\s*\{(.+)\}/);
      if (!inline) continue;
      const slug = inline[1];
      const fields = inline[2];
      const enabled = /enabled:\s*true/.test(fields);
      const schedule = fields.match(/schedule:\s*"([^"]+)"/)?.[1] ?? fields.match(/schedule:\s*([^,}]+)/)?.[1]?.trim() ?? "workflow_dispatch";
      const skillVar = fields.match(/var:\s*"([^"]+)"/)?.[1] ?? "";
      schedules.push({
        id: slug,
        runtime: "aeon",
        agentId: agent.id,
        name: slug.split(/[-_]/).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" "),
        every: schedule,
        schedule,
        message: skillVar || `Run Aeon skill ${slug}`,
        enabled,
        source: "collector/aeon.yml",
      });
    }
    return schedules;
  }
  const cronDir = join(safeDir, "cron");
  const entries = await readdir(cronDir, { withFileTypes: true }).catch(() => []);
  const schedules = [];
  for (const entry of entries.filter((item) => item.isFile()).slice(0, 40)) {
    if (!/\.(md|txt|json|jsonl|yaml|yml)$/i.test(entry.name)) continue;
    const filePath = join(cronDir, entry.name);
    const content = await readFile(filePath, "utf-8").catch(() => "");
    if (!content.trim()) continue;
    const stats = await stat(filePath).catch(() => null);
    let parsed = {};
    if (/\.json$/i.test(entry.name)) {
      try { parsed = JSON.parse(content); } catch { parsed = {}; }
    }
    const firstLine = content.split(/\r?\n/).find((line) => line.trim())?.replace(/^#+\s*/, "").trim();
    const name = parsed.name || parsed.title || firstLine || entry.name.replace(/\.[^.]+$/, "");
    const every = parsed.every || parsed.interval || parsed.schedule || "";
    const message = parsed.message || parsed.prompt || parsed.task || content.slice(0, 1200);
    schedules.push({
      id: `${agent.runtime}:${agent.id}:${entry.name}`,
      runtime: agent.runtime,
      agentId: agent.id,
      name,
      every,
      schedule: every || "runtime file",
      message,
      enabled: parsed.enabled !== false,
      updatedAt: stats?.mtimeMs ?? Date.now(),
      source: `collector/${entry.name}`,
    });
  }
  return schedules;
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
  const aeonConfig = join(defaultAeonDir, "aeon.yml");
  const aeonAvailable = await access(aeonConfig, constants.R_OK).then(() => true).catch(() => false);
  if (aeonAvailable) {
    agents.push({
      id: `aeon-${hostname().toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      name: "Aeon",
      runtime: "aeon",
      runtimeKind: "background",
      runtimeCapabilities: {
        status: true,
        skills: true,
        schedules: true,
        runs: true,
        outputs: true,
        memory: true,
        notifications: true,
        setup: true,
      },
      gatewayUrl: process.env.AEON_A2A_URL || "http://127.0.0.1:41241",
      a2aUrl: process.env.AEON_A2A_URL || "http://127.0.0.1:41241",
      aeonLocalPath: defaultAeonDir,
      aeonRepo: process.env.AEON_REPO || "",
      aeonBranch: process.env.AEON_BRANCH || "main",
      aeonMode: process.env.AEON_A2A_URL ? "a2a" : "github",
      agentId: "local-aeon",
      localDataDir: defaultAeonDir,
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
      ? extractUserTextFromMessages(body.messages)
      : "";
  const text = (typeof message === "string" ? message.trim() : "") || (Array.isArray(body.messages) ? attachmentPromptFromMessages(body.messages) : "");
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

async function hermesApiHealthy() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 800);
  try {
    const response = await fetch(`${hermesApiBaseUrl}/health`, {
      headers: hermesApiHeaders(),
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function ensureHermesApiServer(hermesHome) {
  if (await hermesApiHealthy()) return true;
  if (process.env.AGENT_TELEMETRY_START_HERMES_API_SERVER === "0") return false;
  if (hermesApiStartPromise) return hermesApiStartPromise;

  hermesApiStartPromise = (async () => {
    const bin = await resolveHermesBin();
    hermesApiProcess = spawn(bin, ["gateway", "run", "--accept-hooks"], {
      env: {
        ...process.env,
        HERMES_HOME: hermesHome,
        API_SERVER_ENABLED: "true",
        API_SERVER_HOST: hermesApiHost,
        API_SERVER_PORT: String(hermesApiPort),
        ...(hermesApiKey ? { API_SERVER_KEY: hermesApiKey } : {}),
        PAGER: "cat",
      },
      stdio: ["ignore", "inherit", "inherit"],
    });
    hermesApiProcess.on("exit", () => {
      hermesApiProcess = null;
      hermesApiStartPromise = null;
    });
    hermesApiProcess.on("error", () => {
      hermesApiProcess = null;
      hermesApiStartPromise = null;
    });

    const deadline = Date.now() + hermesApiStartTimeoutMs;
    while (Date.now() < deadline) {
      if (await hermesApiHealthy()) return true;
      await sleep(300);
    }
    return false;
  })();

  return hermesApiStartPromise;
}

function apiServerMessages(body, text) {
  if (Array.isArray(body.messages) && body.messages.length > 0) {
    return body.messages
      .filter((message) => message && typeof message === "object")
      .map((message) => {
        const content = normalizeMessageContent(message.content);
        return {
          role: message.role === "assistant" || message.role === "system" ? message.role : "user",
          content,
        };
      })
      .filter((message) => Array.isArray(message.content) ? message.content.length > 0 : message.content.trim());
  }
  return [{ role: "user", content: text }];
}

function normalizeHermesSessionId(input) {
  const value = String(input || "").trim();
  if (!value) return "";
  return value.replace(/^session_/, "").replace(/\.json$/, "");
}

function hermesSessionIdFromFile(name) {
  return normalizeHermesSessionId(name);
}

function readableSessionMessageContent(message) {
  const content = readableChatContent(message?.content ?? message?.text ?? message?.message ?? "");
  if (/^---\s*name:\s*kanban-worker\b/i.test(content.trim())) return "";
  return content;
}

async function readHermesApiSession(hermesHome, sessionId) {
  const normalized = normalizeHermesSessionId(sessionId);
  if (!normalized) return null;
  const filePath = join(hermesHome, "sessions", `session_${normalized}.json`);
  try {
    const [raw, fileStats] = await Promise.all([readFile(filePath, "utf-8"), stat(filePath)]);
    const parsed = JSON.parse(raw);
    const messages = Array.isArray(parsed.messages)
      ? parsed.messages.map((message, index) => ({
        index,
        role: message?.role === "user" || message?.role === "assistant" || message?.role === "tool" ? message.role : "assistant",
        content: readableSessionMessageContent(message),
        createdAt: Number(message?.created_at || message?.timestamp || 0) > 1_000_000_000_000
          ? Number(message?.created_at || message?.timestamp)
          : fileStats.mtimeMs,
      })).filter((message) => message.content.trim())
      : [];
    return {
      sessionId: normalizeHermesSessionId(parsed.session_id || normalized),
      file: filePath,
      startedAt: parsed.session_start ? Date.parse(parsed.session_start) || fileStats.birthtimeMs : fileStats.birthtimeMs,
      updatedAt: parsed.last_updated ? Date.parse(parsed.last_updated) || fileStats.mtimeMs : fileStats.mtimeMs,
      messageCount: parsed.message_count ?? messages.length,
      messages,
    };
  } catch {
    return null;
  }
}

async function listRecentHermesApiSessions(hermesHome, sinceMs = 0) {
  const dir = join(hermesHome, "sessions");
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const files = [];
  for (const entry of entries) {
    if (!entry.isFile() || !/^session_api-.*\.json$/.test(entry.name)) continue;
    const filePath = join(dir, entry.name);
    const fileStats = await stat(filePath).catch(() => null);
    if (!fileStats || fileStats.mtimeMs < sinceMs) continue;
    files.push({ name: entry.name, mtimeMs: fileStats.mtimeMs });
  }
  files.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return (await Promise.all(files.slice(0, 20).map((file) => (
    readHermesApiSession(hermesHome, hermesSessionIdFromFile(file.name))
  )))).filter(Boolean);
}

async function waitForHermesApiSession(hermesHome, sinceMs, text) {
  const needle = text.trim().slice(0, 80);
  const deadline = Date.now() + sessionDiscoveryTimeoutMs;
  while (Date.now() < deadline) {
    const sessions = await listRecentHermesApiSessions(hermesHome, sinceMs);
    const matched = sessions.find((session) => (
      !needle || session.messages.some((message) => message.role === "user" && message.content.includes(needle))
    ));
    if (matched) return matched;
    if (sessions[0]) return sessions[0];
    await sleep(250);
  }
  return null;
}

async function proxyHermesApiChat(body, response, text, hermesHome) {
  const requestStartedAt = Date.now();
  if (!(await ensureHermesApiServer(hermesHome))) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), chatTimeoutMs);
  let sessionTimer = null;
  let emittedSession = false;

  const ensureHeaders = () => {
    if (response.headersSent || response.writableEnded) return;
    response.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
      "x-hermes-stream-source": "api-server",
    });
  };

  async function emitSession() {
    if (emittedSession || response.writableEnded) return;
    const session = await waitForHermesApiSession(hermesHome, requestStartedAt - 2_000, text);
    if (!session) return;
    ensureHeaders();
    response.write(ssePayload({
      session: {
        id: session.sessionId,
        startedAt: session.startedAt,
        updatedAt: session.updatedAt,
        messageCount: session.messages.length,
      },
    }));
    emittedSession = true;
  }

  try {
    response.on("close", () => controller.abort());
    ensureHeaders();
    response.write(": waiting for Hermes API stream\n\n");
    sessionTimer = setInterval(() => {
      void emitSession().catch(() => undefined);
    }, 1_000);

    const upstream = await fetch(`${hermesApiBaseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: hermesApiHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        model: "hermes-agent",
        stream: true,
        messages: apiServerMessages(body, text),
      }),
      signal: controller.signal,
    });
    if (!upstream.ok || !upstream.body) {
      const errorText = await upstream.text().catch(() => "");
      const fallbackMessage = messagesHaveMultimodalContent(body.messages)
        ? "Hermes rejected the attached media."
        : `Hermes API returned ${upstream.status || 502}.`;
      response.end(ssePayload({ error: errorText || fallbackMessage }) + "data: [DONE]\n\n");
      return true;
    }

    await emitSession();

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let wroteContent = false;
    let wroteDone = false;
    const hasMultimodal = messagesHaveMultimodalContent(body.messages);
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";
      for (const eventText of events) {
        const dataLine = eventText.split("\n").find((line) => line.startsWith("data:"));
        if (!dataLine) continue;
        const raw = dataLine.replace(/^data:\s*/, "");
        if (raw === "[DONE]") {
          if (hasMultimodal && !wroteContent) {
            ensureHeaders();
            response.write(ssePayload({ error: "Hermes accepted the attached media but returned no text. Check that the active Hermes model supports the attached image/audio type." }));
          }
          wroteDone = true;
          continue;
        }
        try {
          const parsed = JSON.parse(raw);
          const content = parsed?.choices?.[0]?.delta?.content;
          if (typeof content === "string" && content.length > 0) {
            wroteContent = true;
            ensureHeaders();
            response.write(ssePayload({ choices: [{ delta: { content } }] }));
          }
        } catch {
          // Ignore non-JSON SSE comments or custom tool events for the dashboard chat surface.
        }
      }
    }
    if (hasMultimodal && !wroteContent && !wroteDone) {
      ensureHeaders();
      response.write(ssePayload({ error: "Hermes accepted the attached media but returned no text. Check that the active Hermes model supports the attached image/audio type." }));
      wroteDone = true;
    }
    await emitSession();
    if (!wroteContent && !emittedSession && !response.headersSent) return false;
    ensureHeaders();
    response.write("data: [DONE]\n\n");
    if (!response.writableEnded) response.end();
    return true;
  } catch {
    if (!response.writableEnded) {
      response.write(ssePayload({ error: "Hermes API streaming interrupted." }));
      response.end("data: [DONE]\n\n");
    }
    return true;
  } finally {
    clearTimeout(timer);
    if (sessionTimer) clearInterval(sessionTimer);
  }
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
      ? extractUserTextFromMessages(body.messages)
      : "";
  const text = (typeof message === "string" ? message.trim() : "") || (Array.isArray(body.messages) ? attachmentPromptFromMessages(body.messages) : "");
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
  if (await proxyHermesApiChat(body, response, text, hermesHome)) return;

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
    "x-hermes-stream-source": "oneshot-fallback",
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
  const requestUrl = new URL(request.url || "/", "http://127.0.0.1");
  const pathname = requestUrl.pathname;
  response.setHeader("access-control-allow-origin", "*");
  response.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
  response.setHeader("access-control-allow-headers", "content-type");
  if (request.method === "OPTIONS") {
    response.writeHead(204).end();
    return;
  }
  if (pathname === "/health") {
    const syncthing = await syncthingInstalled();
    const agents = await localAgents();
    const runtimes = [...new Set(agents.map((agent) => agent.runtime))];
    jsonResponse(response, 200, {
      ok: true,
      host: hostname(),
      version: await appVersion(),
      envSync: {
        ready: true,
        user: currentUsername(),
        command: "hive-env-add",
      },
      capabilities: {
        chat: runtimes.includes("hermes"),
        runtimes,
        syncthing: syncthing.installed,
        defaultSyncPath,
      },
    });
    return;
  }
  if (pathname === "/update" && request.method === "POST") {
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
  if (pathname === "/agents") {
    const agents = await localAgents();
    jsonResponse(response, 200, { ok: true, host: hostname(), agents });
    return;
  }
  if (pathname === "/schedules") {
    const agents = await localAgents();
    const schedules = (await Promise.all(agents.map((agent) => scanRuntimeSchedules(agent, agent.localDataDir)))).flat();
    jsonResponse(response, 200, { ok: true, host: hostname(), schedules });
    return;
  }
  if (pathname === "/syncthing/status") {
    const status = await syncthingStatus();
    jsonResponse(response, status.ok ? 200 : 503, status);
    return;
  }
  if (pathname === "/syncthing/configure" && request.method === "POST") {
    try {
      const rawBody = await readBody(request);
      const body = rawBody ? JSON.parse(rawBody) : {};
      const result = await configureSyncthingFolder(body);
      jsonResponse(response, 200, result);
    } catch (error) {
      jsonResponse(response, 400, {
        ok: false,
        error: error instanceof Error ? error.message : "Could not configure Syncthing.",
      });
    }
    return;
  }
  if (pathname === "/syncthing/test-note" && request.method === "POST") {
    try {
      const rawBody = await readBody(request);
      const body = rawBody ? JSON.parse(rawBody) : {};
      const result = await syncthingTestNote(body);
      jsonResponse(response, 200, result);
    } catch (error) {
      jsonResponse(response, 400, {
        ok: false,
        error: error instanceof Error ? error.message : "Could not access Syncthing test note.",
      });
    }
    return;
  }
  if (pathname === "/sessions" && request.method === "GET") {
    const sessionId = requestUrl.searchParams.get("sessionId") || requestUrl.searchParams.get("id") || "";
    const sinceMs = Number(requestUrl.searchParams.get("sinceMs") || 0);
    const session = sessionId
      ? await readHermesApiSession(defaultHermesDir, sessionId)
      : (await listRecentHermesApiSessions(defaultHermesDir, sinceMs))[0] ?? null;
    jsonResponse(response, session ? 200 : 404, session ? { ok: true, session } : { ok: false, error: "session not found" });
    return;
  }
  if (pathname === "/chat" && request.method === "POST") {
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
  if (pathname !== "/snapshot") {
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
