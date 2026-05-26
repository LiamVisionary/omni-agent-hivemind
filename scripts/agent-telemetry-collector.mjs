#!/usr/bin/env node
import { createServer } from "node:http";
import { execFile, spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { access, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { constants, watch } from "node:fs";
import { homedir, hostname, userInfo } from "node:os";
import { basename, delimiter, dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { acknowledgeTransfer, createTransfer, listTransfers } from "./hive-transfer.mjs";

const execFileAsync = promisify(execFile);
const port = Number(process.env.AGENT_TELEMETRY_PORT || 8787);
const host = process.env.AGENT_TELEMETRY_HOST || "0.0.0.0";
const appDir = resolve(join(fileURLToPath(import.meta.url), "..", ".."));
const defaultHermesDir = process.env.HERMES_HOME || join(homedir(), ".hermes");
const defaultAeonDir = process.env.AEON_LOCAL_PATH || process.env.AEON_HOME || join(homedir(), ".aeon");
const maxChars = 1000;
const HERMES_EMPTY_TRANSCRIPT_MESSAGE = "Hermes session found. Send a message to resume it.";
const maxChatChars = 12_000;
const chatTimeoutMs = Number(process.env.AGENT_TELEMETRY_CHAT_TIMEOUT_MS || 20 * 60_000);
const sessionDiscoveryTimeoutMs = Number(process.env.AGENT_TELEMETRY_SESSION_DISCOVERY_TIMEOUT_MS || 15_000);
const hermesApiHost = process.env.AGENT_TELEMETRY_HERMES_API_HOST || "127.0.0.1";
const hermesApiPort = Number(process.env.AGENT_TELEMETRY_HERMES_API_PORT || process.env.API_SERVER_PORT || 8642);
const hermesApiBaseUrl = `http://${hermesApiHost}:${hermesApiPort}`;
const hermesApiKey = process.env.AGENT_TELEMETRY_HERMES_API_KEY || process.env.API_SERVER_KEY || "";
const hermesApiStartTimeoutMs = Number(process.env.AGENT_TELEMETRY_HERMES_API_START_TIMEOUT_MS || 15_000);
const hermesChatMode = (process.env.AGENT_TELEMETRY_HERMES_CHAT_MODE || "cli").toLowerCase();
const syncthingApiBaseUrl = process.env.SYNCTHING_API_URL || "http://127.0.0.1:8384";
const defaultSyncPath = expandHome(
  process.env.HIVEMINDOS_SYNC_PATH
    || process.env.NEXT_PUBLIC_OBSIDIAN_VAULT_PATH
    || "~/Documents/Obsidian/hivemindos-vault",
);
const runLogRoot = join(homedir(), ".hivemindos", "runtime-runs");
const machineIdPath = join(homedir(), ".hivemindos", "machine-id");
const runtimeAgentRegistryPath = join(homedir(), ".hivemindos", "runtime-agents.json");
const skillAutoSyncConfigPath = join(homedir(), ".hivemindos", "skill-auto-sync.json");
const hermesProfilesDir = join(defaultHermesDir, "profiles");
const skillProviderRoots = [
  { id: "claude", label: "Claude", home: "~/.claude", roots: [{ path: "~/.claude/skills", maxDepth: 3 }, { path: "~/.claude/plugins", maxDepth: 8 }] },
  { id: "codex", label: "Codex", home: "~/.codex", roots: [{ path: "~/.codex/skills", maxDepth: 4 }, { path: "~/.codex/plugins/cache", maxDepth: 8 }] },
  { id: "hermes", label: "Hermes", home: "~/.hermes", roots: [{ path: "~/.hermes/skills", maxDepth: 4 }, { path: "~/.hermes/plugins", maxDepth: 8 }, { path: "~/.hermes/agents", maxDepth: 6 }] },
  { id: "gemini", label: "Gemini", home: "~/.gemini", roots: [{ path: "~/.gemini/skills", maxDepth: 4 }, { path: "~/.gemini/extensions", maxDepth: 8 }] },
  { id: "openclaw", label: "OpenClaw", home: "~/.openclaw", roots: [{ path: "~/.openclaw/skills", maxDepth: 4 }, { path: "~/Documents/code/projects/hivemind-os/openclaw-next/skills", maxDepth: 4 }] },
  { id: "aeon", label: "Aeon", home: "~/.aeon", roots: [{ path: "~/.aeon/skills", maxDepth: 4 }, { path: "~/.aeon/plugins", maxDepth: 8 }, { path: "~/.aeon/agents", maxDepth: 6 }, { path: process.env.AEON_LOCAL_PATH ? `${process.env.AEON_LOCAL_PATH}/skills` : "~/.aeon/repo/skills", maxDepth: 3 }] },
];
const skippedSkillDirs = new Set([".git", "node_modules", ".next", "dist", "build", ".cache", ".archive"]);
const maxSkillFiles = Number(process.env.AGENT_TELEMETRY_MAX_SKILL_FILES || 160);
const maxSkillFileBytes = Number(process.env.AGENT_TELEMETRY_MAX_SKILL_FILE_BYTES || 5 * 1024 * 1024);
const skillAutoSyncPollMs = Number(process.env.AGENT_TELEMETRY_SKILL_AUTO_SYNC_POLL_MS || 10_000);
const skillAutoSyncDebounceMs = Number(process.env.AGENT_TELEMETRY_SKILL_AUTO_SYNC_DEBOUNCE_MS || 2_500);
let hermesApiProcess = null;
let hermesApiStartPromise = null;
let skillAutoSyncConfig = null;
let skillAutoSyncPoll = null;
let skillAutoSyncDebounce = null;
let skillAutoSyncInFlight = false;
const skillAutoSyncWatchers = new Map();
const skillAutoSyncSignatures = new Map();
let machineIdPromise = null;

function expandHome(path) {
  return path?.replace(/^~(?=$|\/)/, homedir());
}

async function stableMachineId() {
  if (machineIdPromise) return machineIdPromise;
  machineIdPromise = (async () => {
    const existing = (await readFile(machineIdPath, "utf8").catch(() => "")).trim();
    if (/^hivemind-machine-[a-f0-9]{32}$/.test(existing)) return existing;
    const generated = `hivemind-machine-${randomBytes(16).toString("hex")}`;
    await mkdir(dirname(machineIdPath), { recursive: true, mode: 0o700 });
    await writeFile(machineIdPath, `${generated}\n`, { mode: 0o600 });
    return generated;
  })();
  return machineIdPromise;
}

function safeAgentEnv(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value)
    .filter(([key, entry]) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(key) && typeof entry === "string"));
}

function runtimeProcessEnv(extra = {}) {
  const pathParts = [dirname(process.execPath), process.env.PATH].filter(Boolean);
  return {
    ...process.env,
    PATH: pathParts.join(delimiter),
    ...extra,
  };
}

function hermesContextEnv(agentEnv, context) {
  const dashboardContext = typeof context === "string" ? context.trim() : "";
  if (!dashboardContext) return agentEnv;
  const existingPrompt = typeof agentEnv.HERMES_EPHEMERAL_SYSTEM_PROMPT === "string"
    ? agentEnv.HERMES_EPHEMERAL_SYSTEM_PROMPT.trim()
    : "";
  return {
    ...agentEnv,
    HERMES_EPHEMERAL_SYSTEM_PROMPT: [existingPrompt, dashboardContext].filter(Boolean).join("\n\n"),
  };
}

function stripHermesCliMetadata(value) {
  return String(value || "")
    .split(/\r?\n/)
    .filter((line) => !/^\s*session_id:\s*\S+\s*$/.test(line))
    .join("\n")
    .trim();
}

function slugify(value) {
  return String(value || "agent").trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "agent";
}

function skillSlug(value) {
  return String(value || "skill").trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "skill";
}

function titleFromSlug(slug) {
  return String(slug || "skill").split(/[-_]/).filter(Boolean).map((word) => word.slice(0, 1).toUpperCase() + word.slice(1)).join(" ");
}

function parseSkillFrontmatter(markdown) {
  const match = String(markdown || "").match(/^---\n([\s\S]*?)\n---/);
  const fields = new Map();
  if (!match) return fields;
  for (const line of match[1].split("\n")) {
    const field = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (field) fields.set(field[1].toLowerCase(), field[2].replace(/^["']|["']$/g, "").trim());
  }
  return fields;
}

function firstSkillParagraph(markdown) {
  return String(markdown || "").replace(/^---\n[\s\S]*?\n---/, "").split(/\n{2,}/).map((part) => part.trim()).find((part) => part && !part.startsWith("#")) || "";
}

function skillChecksum(value) {
  return createHash("sha256").update(value).digest("hex");
}

function yamlScalar(value) {
  return JSON.stringify(String(value || ""));
}

function uniqueAgentId(runtime, name) {
  return `${runtime}-${slugify(name)}-${randomBytes(3).toString("hex")}`;
}

const knownRuntimeIds = ["hermes", "openclaw", "aeon", "openai-compatible"];

function normalizeRuntimeId(runtime, fallback = "hermes") {
  const value = String(runtime || "").trim();
  return knownRuntimeIds.includes(value) ? value : fallback;
}

function runtimeAgentKey(agent) {
  const runtime = normalizeRuntimeId(agent?.runtime);
  return `${runtime}:${slugify(agent?.agentId || agent?.profile || agent?.name)}`;
}

async function readRuntimeAgentRegistry() {
  const raw = await readFile(runtimeAgentRegistryPath, "utf8").catch(() => "");
  if (!raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.agents) ? parsed.agents : [];
  } catch {
    return [];
  }
}

async function writeRuntimeAgentRegistry(agents) {
  await mkdir(join(homedir(), ".hivemindos"), { recursive: true, mode: 0o700 });
  await writeFile(runtimeAgentRegistryPath, `${JSON.stringify({ agents }, null, 2)}\n`, { mode: 0o600 });
}

function runtimeCapabilitiesFor(runtime) {
  if (runtime === "hermes") {
    return {
      status: true,
      chat: true,
      runs: true,
      memory: true,
      sessionSearch: true,
      backgroundTasks: true,
      xSearch: true,
      videoGeneration: true,
      codexRuntime: true,
      kanbanDecompose: true,
      setup: true,
      walletTools: true,
      modelSelection: true,
    };
  }
  if (runtime === "openclaw") {
    return {
      status: true,
      chat: true,
      skills: true,
      schedules: true,
      memory: true,
      sessionSearch: true,
      socialPosting: true,
      videoGeneration: true,
      notifications: true,
      setup: true,
      walletTools: true,
    };
  }
  if (runtime === "aeon") {
    return {
      status: true,
      skills: true,
      schedules: true,
      runs: true,
      outputs: true,
      memory: true,
      backgroundTasks: true,
      notifications: true,
      setup: true,
    };
  }
  if (runtime === "openai-compatible") {
    return {
      status: true,
      chat: true,
      modelSelection: true,
    };
  }
  return {};
}

function normalizeRuntimeAgent(entry) {
  const runtime = normalizeRuntimeId(entry?.runtime, "openai-compatible");
  return {
    ...entry,
    id: String(entry?.id || uniqueAgentId(runtime, entry?.name)),
    name: String(entry?.name || "Agent"),
    runtime,
    gatewayUrl: String(entry?.gatewayUrl || ""),
    agentId: String(entry?.agentId || entry?.profile || entry?.id || ""),
    localDataDir: typeof entry?.localDataDir === "string" ? entry.localDataDir : "",
    machineName: hostname(),
    runtimeKind: runtime === "openclaw" ? "gateway" : runtime === "aeon" ? "background" : "interactive",
    runtimeCapabilities: runtimeCapabilitiesFor(runtime),
    beeRole: ["queen", "worker", "observer", "human"].includes(entry?.beeRole) ? entry.beeRole : "worker",
    workerClass: ["general", "planner", "code", "vision", "writer", "research", "artist", "ops", "qa"].includes(entry?.workerClass) ? entry.workerClass : "general",
    useSharedVault: entry?.useSharedVault !== false,
  };
}

async function configuredRuntimeAgents() {
  const agents = await readRuntimeAgentRegistry();
  return agents.map(normalizeRuntimeAgent);
}

async function createHermesProfileAgent(input) {
  const profile = slugify(input.profile || input.name);
  if (profile === "default" || profile === "hermes") throw new Error("Choose a non-reserved Hermes profile name.");
  const profileDir = join(hermesProfilesDir, profile);
  const dirs = ["memories", "sessions", "skills", "skins", "logs", "plans", "workspace", "cron", "home"];
  await Promise.all(dirs.map((dir) => mkdir(join(profileDir, dir), { recursive: true, mode: 0o700 })));
  const provider = String(input.provider || "openai-codex").trim();
  const model = String(input.model || "gpt-5.5").trim();
  const profilePrompt = String(input.skillProfilePrompt || "").trim();
  await writeFile(join(profileDir, "config.yaml"), [
    "model:",
    `  default: ${yamlScalar(model)}`,
    `  provider: ${yamlScalar(provider)}`,
    provider === "openai-codex" ? "  base_url: https://chatgpt.com/backend-api/codex" : "",
    "image_gen:",
    "  provider: openai-codex",
    "  model: gpt-image-2-medium",
    "  openai-codex:",
    "    model: gpt-image-2-medium",
    "agent:",
    "  auto_approve: true",
    "",
  ].filter(Boolean).join("\n"), { mode: 0o600 });
  await writeFile(join(profileDir, "SOUL.md"), [
    `# ${input.name}`,
    "",
    profilePrompt || `You are ${input.name}, a ${input.workerClass || "general"} worker in HivemindOS.`,
    "",
  ].join("\n"), { mode: 0o600 });
  await writeFile(join(profileDir, "profile.json"), `${JSON.stringify({
    name: profile,
    display_name: input.name,
    description: profilePrompt,
    description_auto: false,
  }, null, 2)}\n`, { mode: 0o600 });
  return { profile, profileDir, provider, model };
}

async function createRuntimeAgent(input) {
  const runtime = normalizeRuntimeId(input.runtime);
  const name = String(input.name || "").trim();
  if (!name) throw new Error("Agent name is required.");
  let runtimeResult = {};
  if (runtime === "hermes") {
    runtimeResult = await createHermesProfileAgent(input);
  }
  const profile = runtimeResult.profile || slugify(name);
  const agents = await readRuntimeAgentRegistry();
  const incomingKey = `${runtime}:${profile}`;
  const existing = agents.find((item) => runtimeAgentKey(item) === incomingKey);
  const agent = normalizeRuntimeAgent({
    ...existing,
    id: existing?.id || uniqueAgentId(runtime, name),
    name,
    runtime,
    gatewayUrl: runtime === "openclaw"
      ? String(input.gatewayUrl || "ws://127.0.0.1:18789")
      : runtime === "openai-compatible"
        ? String(input.gatewayUrl || process.env.LOCAL_OPENAI_BASE_URL || "http://127.0.0.1:1234")
        : "",
    agentId: profile,
    chatPath: runtime === "hermes" ? "/chat" : runtime === "openai-compatible" ? "/v1/chat/completions" : "",
    statusPath: runtime === "hermes" ? "/health" : runtime === "openai-compatible" ? "/v1/models" : "",
    provider: input.provider || (runtime === "openai-compatible" ? "lm-studio" : undefined),
    model: input.model || (runtime === "openai-compatible" ? process.env.LOCAL_OPENAI_MODEL : undefined),
    localDataDir: runtimeResult.profileDir || (runtime === "hermes" ? join(hermesProfilesDir, profile) : ""),
    beeRole: input.beeRole,
    workerClass: input.workerClass,
    customWorkerClass: input.customWorkerClass,
    customWorkerClasses: input.customWorkerClasses,
    selectedCustomWorkerClassId: input.selectedCustomWorkerClassId,
    skillProfilePrompt: input.skillProfilePrompt,
    preferredSkillSlugs: input.preferredSkillSlugs,
    useSharedVault: input.useSharedVault,
  });
  await writeRuntimeAgentRegistry([
    ...agents.filter((item) => item.id !== agent.id && runtimeAgentKey(item) !== incomingKey),
    agent,
  ]);
  return agent;
}

async function deleteRuntimeAgent(input) {
  const id = String(input.id || "").trim();
  const runtime = input.runtime ? normalizeRuntimeId(input.runtime) : "";
  const profile = slugify(input.profile || input.agentId || input.name || "");
  if (!id && !profile) throw new Error("Agent id or profile is required.");

  const agents = await readRuntimeAgentRegistry();
  const target = agents.find((agent) => (
    (id && agent.id === id)
    || (runtime && profile && runtimeAgentKey(agent) === `${runtime}:${profile}`)
    || (!runtime && profile && slugify(agent.agentId || agent.profile || agent.name) === profile)
  ));
  if (!target) return { deleted: false };

  const normalized = normalizeRuntimeAgent(target);
  const managedProfile = slugify(normalized.agentId || normalized.name);
  const canRemoveHermesProfile = normalized.runtime === "hermes"
    && managedProfile
    && managedProfile !== "default"
    && managedProfile !== "hermes"
    && (managedProfile.startsWith("hive-e2e-") || input.allowProfileRemoval === true);

  await writeRuntimeAgentRegistry(agents.filter((agent) => agent.id !== target.id));

  let removedProfileDir = false;
  if (canRemoveHermesProfile) {
    const profileDir = resolve(join(hermesProfilesDir, managedProfile));
    const safeRoot = resolve(hermesProfilesDir);
    if (profileDir.startsWith(`${safeRoot}${sep}`)) {
      await rm(profileDir, { recursive: true, force: true });
      removedProfileDir = true;
    }
  }

  return {
    deleted: true,
    agent: normalized,
    removedProfileDir,
  };
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
  if (Array.isArray(value)) {
    return value.map((item) => readableChatContent(item)).filter(Boolean).join("\n").trim();
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

async function resolveHiveEnvAdd() {
  const candidates = [
    process.env.HIVE_ENV_ADD_BIN,
    join(homedir(), ".local", "bin", "hive-env-add"),
    join(appDir, "scripts", "hive-env-add"),
  ].filter(Boolean);
  for (const path of candidates) {
    try {
      await access(path, constants.X_OK);
      return { ready: true, command: path };
    } catch {
      // try next
    }
  }
  return {
    ready: false,
    command: "hive-env-add",
    error: "hive-env-add is not installed or executable. Run setup on this machine.",
  };
}

function encodeEnvEntries(entries) {
  return Object.entries(entries)
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join("\n") + "\n";
}

function runHiveEnvImport({ entries, scope = "agent", runtime = "generic" }) {
  return new Promise(async (resolveImport, rejectImport) => {
    const envSync = await resolveHiveEnvAdd();
    if (!envSync.ready) {
      rejectImport(new Error(envSync.error || "hive-env-add is not installed or executable."));
      return;
    }
    const child = spawn(envSync.command, [
      "--import-stdin",
      "--scope",
      scope,
      "--runtime",
      runtime,
      "--no-backup",
      "--no-tailnet-sync",
    ], {
      stdio: ["pipe", "ignore", "pipe"],
    });
    let errorText = "";
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      rejectImport(new Error("Timed out while importing env variables."));
    }, 60_000);
    child.stderr.on("data", (chunk) => {
      errorText += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      rejectImport(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolveImport();
        return;
      }
      rejectImport(new Error(errorText.trim() || "hive-env-add could not import env variables."));
    });
    child.stdin.end(encodeEnvEntries(entries));
  });
}

function runHiveEnvE2eSync({ key, value, scope = "all", runtime = "generic" }) {
  return new Promise(async (resolveSync, rejectSync) => {
    if (!/^HIVE_E2E_[A-Z0-9_]+$/.test(key)) {
      rejectSync(new Error("E2E env sync only accepts HIVE_E2E_* keys."));
      return;
    }
    const envSync = await resolveHiveEnvAdd();
    if (!envSync.ready) {
      rejectSync(new Error(envSync.error || "hive-env-add is not installed or executable."));
      return;
    }
    const child = spawn(envSync.command, [
      `${key}=${value}`,
      "--scope",
      scope,
      "--runtime",
      runtime,
      "--no-backup",
    ], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      rejectSync(new Error("Timed out while running hive-env-add."));
    }, 90_000);
    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      rejectSync(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolveSync(output.trim());
        return;
      }
      rejectSync(new Error(output.trim() || "hive-env-add failed."));
    });
  });
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
  const restartRequested = await syncthingFetch("/rest/system/restart", {
    method: "POST",
    timeoutMs: 5_000,
  }).then(() => true).catch(() => false);

  return {
    ok: true,
    host: hostname(),
    deviceID: status.myID,
    folderId,
    label: folder.label,
    path: folder.path,
    peerDeviceID,
    restartRequested,
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

async function resolveChatWorkingDirectory(input) {
  const candidate = typeof input === "string" ? expandHome(input.trim()) : "";
  if (!candidate) return appDir;
  try {
    const entry = await stat(candidate);
    return entry.isDirectory() ? candidate : appDir;
  } catch {
    return appDir;
  }
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function runHermes(args, timeout = 10_000) {
  const { stdout, stderr } = await execFileAsync(await resolveHermesBin(), args, {
    timeout,
    maxBuffer: 2_000_000,
    env: { ...process.env },
  });
  return `${stdout}${stderr ? `\n${stderr}` : ""}`.trim();
}

async function hermesIntegrationStatus(agent = {}) {
  const hermesHome = expandHome(agent.localDataDir || defaultHermesDir);
  const diagnostics = [];
  const [version, tools, config] = await Promise.all([
    runHermes(["--version"]).catch((error) => {
      diagnostics.push(error instanceof Error ? error.message : "Hermes version check failed.");
      return "";
    }),
    runHermes(["tools", "list"]).catch(() => ""),
    readFile(join(hermesHome, "config.yaml"), "utf8").catch(() => ""),
  ]);
  const toolEnabled = (name) => new RegExp(`✓\\s+enabled\\s+${escapeRegExp(name)}\\b`).test(tools);
  const codexConfigured = /provider:\s*openai-codex\b|codex_app_server|codex-runtime/i.test(config);
  const kanbanAuto = /auto_decompose:\s*true/i.test(config);
  const hermesDb = join(hermesHome, "state.db");
  const sessionStoreReadable = await access(hermesDb, constants.R_OK).then(() => true).catch(() => false);
  if (version.trim()) diagnostics.push(version.trim());
  return {
    runtime: "hermes",
    machine: { host: hostname(), collectorUrl: `http://${hostname()}:${port}` },
    capabilities: {
      status: true,
      chat: true,
      runs: true,
      memory: true,
      sessionSearch: true,
      backgroundTasks: true,
      xSearch: true,
      socialPosting: false,
      videoGeneration: true,
      codexRuntime: true,
      kanbanDecompose: true,
      setup: true,
    },
    integrations: {
      sessionSearch: {
        supported: true,
        enabled: sessionStoreReadable,
        detail: sessionStoreReadable ? "Hermes session store is readable." : "Hermes session store was not found.",
      },
      backgroundTasks: {
        supported: true,
        enabled: Boolean(version.trim()),
        detail: version.trim() ? "Run Hermes tasks in the background while chat stays available." : "Hermes CLI was not found.",
      },
      xSearch: {
        supported: true,
        enabled: toolEnabled("x_search"),
        detail: toolEnabled("x_search") ? "x_search is enabled for CLI." : "Enable x_search after xAI OAuth or XAI_API_KEY is configured.",
      },
      socialPosting: {
        supported: false,
        enabled: false,
        detail: "Hermes exposes X search natively here; posting should remain a skill/plugin action.",
      },
      videoGeneration: {
        supported: true,
        enabled: toolEnabled("video_gen"),
        detail: toolEnabled("video_gen") ? "video_generate is enabled for CLI." : "Enable video_gen before asking Hermes to create videos.",
      },
      codexRuntime: {
        supported: true,
        enabled: codexConfigured,
        detail: codexConfigured ? "Codex/OpenAI path is present in Hermes config." : "Use Hermes Codex auth/runtime setup before routing coding work through Codex.",
      },
      kanbanDecompose: {
        supported: true,
        enabled: kanbanAuto,
        detail: kanbanAuto ? "Hermes auto_decompose is on." : "Hermes can decompose Kanban triage tasks manually.",
      },
    },
    diagnostics,
  };
}

async function runHermesIntegrationAction(action, input = {}) {
  if (action === "enable-tool") {
    const tool = String(input.tool || "");
    if (!["x_search", "video_gen"].includes(tool)) return { ok: false, error: "Unsupported Hermes tool." };
    await runHermes(["tools", "enable", tool], 20_000);
    return { ok: true, message: `Enabled Hermes ${tool}.` };
  }
  if (action === "disable-tool") {
    const tool = String(input.tool || "");
    if (!["x_search", "video_gen"].includes(tool)) return { ok: false, error: "Unsupported Hermes tool." };
    await runHermes(["tools", "disable", tool], 20_000);
    return { ok: true, message: `Disabled Hermes ${tool}.` };
  }
  if (action === "xai-login") {
    const child = spawn(await resolveHermesBin(), ["login", "--provider", "xai-oauth"], {
      detached: true,
      stdio: "ignore",
      env: runtimeProcessEnv(),
    });
    child.unref();
    return { ok: true, message: "Started Hermes xAI OAuth login on this machine." };
  }
  if (action === "hermes-update") {
    const output = await runHermes(["update"], 300_000);
    return { ok: true, message: "Hermes update completed on this machine.", output };
  }
  if (action === "background") {
    const prompt = String(input.prompt || "").trim();
    if (!prompt) return { ok: false, error: "Background prompt is required." };
    const id = `hermes-${Date.now().toString(36)}`;
    const logPath = join(runLogRoot, `${id}.log`);
    await mkdir(runLogRoot, { recursive: true });
    const child = spawn(await resolveHermesBin(), ["-z", prompt], {
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: runtimeProcessEnv(),
    });
    const write = (chunk) => void writeFile(logPath, chunk.toString(), { flag: "a" }).catch(() => undefined);
    child.stdout.on("data", write);
    child.stderr.on("data", write);
    child.unref();
    return { ok: true, id, logPath, message: "Started Hermes background task on this machine." };
  }
  if (action === "kanban-decompose") {
    const taskId = String(input.taskId || "").trim();
    const args = ["kanban", "decompose", "--json"];
    if (taskId) args.push(taskId);
    else args.push("--all");
    const output = await runHermes(args, 120_000);
    return { ok: true, output };
  }
  return { ok: false, error: `Unsupported Hermes action: ${action}` };
}

function normalizeNangoBaseUrl(input) {
  const value = String(input || "http://localhost:3003").trim() || "http://localhost:3003";
  const parsed = new URL(value);
  parsed.pathname = "";
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString().replace(/\/+$/, "");
}

function collectorRunProcess(command, args, stdin, timeoutMs) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timeout = setTimeout(() => {
      settled = true;
      child.kill("SIGTERM");
      rejectRun(new Error(`${command} timed out`));
    }, timeoutMs);
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      rejectRun(error);
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (code === 0) {
        resolveRun({ stdout, stderr });
        return;
      }
      const detail = [stderr.trim(), stdout.trim()].filter(Boolean).join("\n\n");
      rejectRun(new Error(`${command} exited with code ${code}${detail ? `:\n${detail}` : ""}`));
    });
    child.stdin.end(stdin || "");
  });
}

function nangoSetupScript(baseUrl) {
  const normalized = normalizeNangoBaseUrl(baseUrl);
  const portValue = new URL(normalized).port || "3003";
  return [
    "set -euo pipefail",
    "log() { printf '\\n[%s] %s\\n' \"$(date -u +%H:%M:%S)\" \"$*\"; }",
    "run_as_root() { if [ \"$(id -u)\" = \"0\" ]; then \"$@\"; elif command -v sudo >/dev/null 2>&1; then sudo \"$@\"; else echo 'This setup needs root or passwordless sudo to install packages.' >&2; exit 10; fi; }",
    "log 'Checking system packages'",
    "if ! command -v git >/dev/null 2>&1; then",
    "  command -v apt-get >/dev/null 2>&1 || { echo 'git is missing and apt-get is unavailable.' >&2; exit 11; }",
    "  run_as_root apt-get update",
    "  run_as_root apt-get install -y git",
    "fi",
    "if ! command -v docker >/dev/null 2>&1; then",
    "  command -v apt-get >/dev/null 2>&1 || { echo 'docker is missing and apt-get is unavailable.' >&2; exit 12; }",
    "  run_as_root apt-get update",
    "  run_as_root apt-get install -y docker.io docker-compose-plugin",
    "  run_as_root systemctl enable --now docker >/dev/null 2>&1 || true",
    "fi",
    "DOCKER='docker'",
    "if ! docker ps >/dev/null 2>&1; then",
    "  if command -v sudo >/dev/null 2>&1 && sudo docker ps >/dev/null 2>&1; then DOCKER='sudo docker'; else echo 'Docker is installed, but this user cannot run docker.' >&2; exit 13; fi",
    "fi",
    "NANGO_DIR=\"${NANGO_DIR:-$HOME/nango}\"",
    "log \"Preparing Nango checkout at $NANGO_DIR\"",
    "if [ ! -d \"$NANGO_DIR/.git\" ]; then",
    "  rm -rf \"$NANGO_DIR\"",
    "  git clone https://github.com/NangoHQ/nango.git \"$NANGO_DIR\"",
    "else",
    "  git -C \"$NANGO_DIR\" pull --ff-only",
    "fi",
    "cd \"$NANGO_DIR\"",
    "if [ ! -f .env ]; then cp .env.example .env; fi",
    "set_env() {",
    "  key=\"$1\"",
    "  value=\"$2\"",
    "  if grep -q \"^${key}=\" .env; then",
    "    tmp=\"$(mktemp)\"",
    "    awk -v key=\"$key\" -v value=\"$value\" 'BEGIN{line=key \"=\" value} $0 ~ \"^\" key \"=\" {print line; next} {print}' .env > \"$tmp\"",
    "    cat \"$tmp\" > .env",
    "    rm -f \"$tmp\"",
    "  else",
    "    printf '%s=%s\\n' \"$key\" \"$value\" >> .env",
    "  fi",
    "}",
    `set_env NANGO_SERVER_URL ${shellQuote(normalized)}`,
    `set_env SERVER_PORT ${shellQuote(portValue)}`,
    "log 'Starting Nango containers'",
    "$DOCKER compose up -d",
    "log 'Nango setup command finished'",
  ].join("\n");
}

async function checkNangoHealthFromCollector(baseUrl) {
  const url = `${normalizeNangoBaseUrl(baseUrl)}/health`;
  const started = Date.now();
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(3500) });
    const text = await response.text().catch(() => "");
    return {
      ok: response.ok,
      checkedAt: new Date().toISOString(),
      url,
      latencyMs: Date.now() - started,
      status: response.status,
      result: text.slice(0, 120),
    };
  } catch (error) {
    return {
      ok: false,
      checkedAt: new Date().toISOString(),
      url,
      latencyMs: Date.now() - started,
      error: error instanceof Error ? error.message : "Nango health check failed.",
    };
  }
}

async function waitForNangoHealthFromCollector(baseUrl) {
  let health = await checkNangoHealthFromCollector(baseUrl);
  if (health.ok) return health;
  for (const delay of [2000, 4000, 8000, 12000, 20000, 30000]) {
    await sleep(delay);
    health = await checkNangoHealthFromCollector(baseUrl);
    if (health.ok) return health;
  }
  return health;
}

async function setupNangoIntegrationHost(baseUrl) {
  const normalized = normalizeNangoBaseUrl(baseUrl);
  const script = nangoSetupScript(normalized);
  const result = await collectorRunProcess("bash", ["-s"], script, 360_000);
  const health = await waitForNangoHealthFromCollector(normalized);
  return {
    ok: health.ok,
    method: "collector-api",
    target: hostname(),
    baseUrl: normalized,
    stdout: result.stdout.slice(-20_000),
    stderr: result.stderr.slice(-20_000),
    health,
    command: script,
  };
}

function startUpdate() {
  const command = `cd ${shellQuote(appDir)} && mkdir -p .next && { echo "--- update $(date -u +%Y-%m-%dT%H:%M:%SZ) ---"; git pull --ff-only; if command -v corepack >/dev/null 2>&1; then corepack prepare pnpm@8.6.12 --activate; hash -r 2>/dev/null || true; fi; CI=true NODE_OPTIONS="\${NODE_OPTIONS:+\$NODE_OPTIONS }--no-deprecation" pnpm install --frozen-lockfile; pnpm build; ./setup.sh; AGENT_TELEMETRY_PORT="\${AGENT_TELEMETRY_PORT:-8787}" ./scripts/install-telemetry-collector.sh; } >> .next/agent-update.log 2>&1`;
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

  const tasks = await Promise.all(sessions.map(async (session) => {
    const messages = await execJson("sqlite3", ["-json", dbPath, `
      select role, substr(content,1,8000) as content, tool_name, timestamp
      from messages
      where session_id = '${String(session.id).replaceAll("'", "''")}'
      order by timestamp desc limit 30;
    `], []);
    const readableMessages = messages.map((message) => ({
      ...message,
      content: readableChatContent(message.content),
    })).filter((message) => message.content.trim());
    const latestAssistant = readableMessages.find((message) => message.role === "assistant");
    const latestUser = readableMessages.find((message) => message.role === "user");
    const latestTool = readableMessages.find((message) => message.role === "tool");
    const latest = latestAssistant ?? latestTool ?? readableMessages[0];
    const chatMessages = readableMessages
      .filter((message) => (
        (message.role === "user" || message.role === "assistant")
        && message.content.trim()
      ))
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((message) => ({
        role: message.role,
        content: compact(message.content, "", maxChatChars),
      }));
    if (!chatMessages.length) return null;
    return {
      id: `hermes-state:${session.id}`,
      agentId: agent.id,
      title: compact(session.title || latestUser?.content || `Hermes ${session.source} session`).slice(0, 160),
      lastMessage: compact(latest?.content, HERMES_EMPTY_TRANSCRIPT_MESSAGE),
      status: session.ended_at ? (/error|fail/i.test(session.end_reason || "") ? "failed" : "completed") : "active",
      source: "hermes-state",
      startedAt: session.started_at * 1000,
      updatedAt: (latest?.timestamp ?? session.started_at) * 1000,
      messages: chatMessages,
    };
  }));
  return tasks.filter(Boolean);
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

function displayPath(pathValue) {
  const home = homedir();
  if (pathValue === home) return "~";
  return pathValue.startsWith(`${home}${sep}`) ? `~/${pathValue.slice(home.length + 1)}` : pathValue;
}

async function listDirectories(pathValue = "~") {
  const expanded = resolve(expandHome(pathValue || "~"));
  await access(expanded, constants.R_OK);
  const stats = await stat(expanded);
  if (!stats.isDirectory()) throw new Error("Path is not a directory.");
  const entries = await readdir(expanded, { withFileTypes: true }).catch(() => []);
  const directories = entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => ({
      name: entry.name,
      path: displayPath(join(expanded, entry.name)),
      kind: "directory",
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
  return {
    ok: true,
    host: hostname(),
    path: displayPath(expanded),
    parentPath: expanded === homedir() || expanded === sep ? "" : displayPath(resolve(expanded, "..")),
    directories,
  };
}

async function findSkillFiles(rootPath, maxDepth) {
  const root = resolve(expandHome(rootPath));
  await access(root, constants.R_OK).catch(() => null);
  const found = [];

  async function walk(current, depth) {
    if (depth > maxDepth) return;
    const entries = await readdir(current, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (entry.name === "SKILL.md") {
        found.push(join(current, entry.name));
        continue;
      }
      if (!entry.isDirectory() || skippedSkillDirs.has(entry.name)) continue;
      await walk(join(current, entry.name), depth + 1);
    }
  }

  await walk(root, 0);
  return found;
}

async function collectSkillFiles(skillDir) {
  const root = resolve(skillDir);
  const files = [];

  async function walk(current) {
    if (files.length >= maxSkillFiles) return;
    const entries = await readdir(current, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (files.length >= maxSkillFiles) return;
      if (skippedSkillDirs.has(entry.name)) continue;
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      if (!entry.isFile()) continue;
      const stats = await stat(fullPath).catch(() => null);
      if (!stats || stats.size > maxSkillFileBytes) continue;
      const relativePath = relative(root, fullPath).split(sep).join("/");
      if (!relativePath || relativePath.startsWith("..")) continue;
      const content = await readFile(fullPath).catch(() => null);
      if (!content) continue;
      files.push({ path: relativePath, contentBase64: content.toString("base64") });
    }
  }

  await walk(root);
  return files;
}

async function skillSummaryForProvider(provider, skillPath, options = {}) {
  const markdown = await readFile(skillPath, "utf-8").catch(() => "");
  const stats = await stat(skillPath).catch(() => null);
  const slug = skillSlug(basename(dirname(skillPath)));
  const frontmatter = parseSkillFrontmatter(markdown);
  const summary = {
    id: `${provider.id}:${hostname()}:${skillPath}`,
    slug,
    name: frontmatter.get("name") || titleFromSlug(slug),
    description: frontmatter.get("description") || firstSkillParagraph(markdown),
    provider: provider.id,
    providerLabel: provider.label,
    path: skillPath,
    sourcePath: skillPath,
    sourceMachine: hostname(),
    relativePath: relative(resolve(expandHome(provider.home)), skillPath),
    checksum: skillChecksum(markdown),
    updatedAt: stats?.mtimeMs ?? 0,
    imported: false,
  };
  if (options.includeSourceFiles) {
    summary.sourceFiles = await collectSkillFiles(dirname(skillPath));
  }
  return summary;
}

async function listInstalledSkills(options = {}) {
  const providers = await Promise.all(skillProviderRoots.map(async (provider) => {
    const skillFiles = [...new Set((await Promise.all(provider.roots.map((root) => findSkillFiles(root.path, root.maxDepth)))).flat())];
    const skills = await Promise.all(skillFiles.map((skillPath) => skillSummaryForProvider(provider, skillPath, options)));
    return {
      id: provider.id,
      label: provider.label,
      home: provider.home,
      installed: await access(resolve(expandHome(provider.home)), constants.R_OK).then(() => true).catch(() => false),
      skills: skills.sort((left, right) => left.name.localeCompare(right.name)),
    };
  }));
  return { ok: true, host: hostname(), providers };
}

function e2eSkillProvider(providerId) {
  const provider = skillProviderRoots.find((item) => item.id === providerId);
  if (!provider) throw new Error(`Unsupported skill provider: ${providerId}`);
  return provider;
}

async function writeE2eProviderSkill(input) {
  const provider = e2eSkillProvider(String(input.provider || ""));
  const slug = skillSlug(input.slug);
  if (!slug.startsWith("hive-e2e-")) throw new Error("E2E skill slugs must start with hive-e2e-.");
  const root = resolve(expandHome(provider.roots[0]?.path || ""));
  const skillDir = resolve(join(root, slug));
  if (!skillDir.startsWith(`${root}${sep}`)) throw new Error("Unsafe skill path.");
  await mkdir(skillDir, { recursive: true, mode: 0o700 });
  const title = String(input.name || titleFromSlug(slug));
  const description = String(input.description || "Real fleet E2E propagation test skill.");
  const body = String(input.body || `# ${title}\n\n${description}\n`);
  const markdown = body.startsWith("---")
    ? body
    : [
      "---",
      `name: ${title}`,
      `description: ${description}`,
      "---",
      "",
      body,
    ].join("\n");
  await writeFile(join(skillDir, "SKILL.md"), markdown.endsWith("\n") ? markdown : `${markdown}\n`, { mode: 0o600 });
  return { ok: true, provider: provider.id, slug, path: join(skillDir, "SKILL.md") };
}

async function removeE2eProviderSkill(input) {
  const provider = e2eSkillProvider(String(input.provider || ""));
  const slug = skillSlug(input.slug);
  if (!slug.startsWith("hive-e2e-")) throw new Error("E2E skill slugs must start with hive-e2e-.");
  const root = resolve(expandHome(provider.roots[0]?.path || ""));
  const skillDir = resolve(join(root, slug));
  if (!skillDir.startsWith(`${root}${sep}`)) throw new Error("Unsafe skill path.");
  await rm(skillDir, { recursive: true, force: true });
  return { ok: true, provider: provider.id, slug, removed: true };
}

function providerSignature(provider) {
  return (provider?.skills ?? [])
    .map((skill) => `${skill.slug}:${skill.checksum}:${Math.trunc(skill.updatedAt || 0)}`)
    .sort()
    .join("|");
}

function enabledSkillAutoSyncProviders(config = skillAutoSyncConfig) {
  const policies = config?.policies && typeof config.policies === "object" ? config.policies : {};
  return skillProviderRoots.filter((provider) => {
    const policy = policies[provider.id];
    return policy?.autoImport || policy?.autoUpdate || policy?.trackRemovals;
  });
}

async function readSkillAutoSyncConfig() {
  const raw = await readFile(skillAutoSyncConfigPath, "utf-8").catch(() => "");
  if (!raw.trim()) return { enabled: false, policies: {}, dashboardUrl: process.env.HIVEMINDOS_DASHBOARD_URL || "http://127.0.0.1:5020", vaultPath: defaultSyncPath };
  try {
    const parsed = JSON.parse(raw);
    return {
      enabled: parsed.enabled === true,
      policies: parsed.policies && typeof parsed.policies === "object" ? parsed.policies : {},
      dashboardUrl: String(parsed.dashboardUrl || process.env.HIVEMINDOS_DASHBOARD_URL || "http://127.0.0.1:5020"),
      vaultPath: String(parsed.vaultPath || defaultSyncPath),
    };
  } catch {
    return { enabled: false, policies: {}, dashboardUrl: process.env.HIVEMINDOS_DASHBOARD_URL || "http://127.0.0.1:5020", vaultPath: defaultSyncPath };
  }
}

async function writeSkillAutoSyncConfig(config) {
  await mkdir(dirname(skillAutoSyncConfigPath), { recursive: true, mode: 0o700 });
  await writeFile(skillAutoSyncConfigPath, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
}

async function configuredProviderInventory(providerIds) {
  const inventory = await listInstalledSkills();
  const wanted = new Set(providerIds);
  return {
    ...inventory,
    providers: inventory.providers.filter((provider) => wanted.has(provider.id)),
  };
}

async function triggerSkillAutoSync(reason = "change") {
  if (skillAutoSyncDebounce) clearTimeout(skillAutoSyncDebounce);
  skillAutoSyncDebounce = setTimeout(() => {
    void runSkillAutoSync(reason);
  }, skillAutoSyncDebounceMs);
}

async function runSkillAutoSync(reason = "change") {
  if (skillAutoSyncInFlight) return;
  const config = skillAutoSyncConfig ?? await readSkillAutoSyncConfig();
  if (!config.enabled) return;
  const providers = enabledSkillAutoSyncProviders(config);
  if (!providers.length) return;
  skillAutoSyncInFlight = true;
  try {
    const inventory = await configuredProviderInventory(providers.map((provider) => provider.id));
    let changed = reason === "configure";
    for (const provider of inventory.providers) {
      const signature = providerSignature(provider);
      if (skillAutoSyncSignatures.get(provider.id) !== signature) changed = true;
      skillAutoSyncSignatures.set(provider.id, signature);
    }
    if (!changed) return;
    const dashboardUrl = String(config.dashboardUrl || "http://127.0.0.1:5020").replace(/\/+$/, "");
    await fetch(`${dashboardUrl}/api/obsidian/skills/reconcile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vaultPath: config.vaultPath || defaultSyncPath,
        providers: inventory.providers,
        policies: config.policies,
        source: { host: hostname(), reason },
      }),
      signal: AbortSignal.timeout(30_000),
    }).catch(() => null);
  } finally {
    skillAutoSyncInFlight = false;
  }
}

function stopSkillAutoSyncWatchers() {
  for (const watcher of skillAutoSyncWatchers.values()) {
    try { watcher.close(); } catch {}
  }
  skillAutoSyncWatchers.clear();
  if (skillAutoSyncPoll) clearInterval(skillAutoSyncPoll);
  skillAutoSyncPoll = null;
}

function startSkillAutoSyncWatchers() {
  stopSkillAutoSyncWatchers();
  const config = skillAutoSyncConfig;
  if (!config?.enabled) return;
  const providers = enabledSkillAutoSyncProviders(config);
  for (const provider of providers) {
    for (const root of provider.roots) {
      const rootPath = resolve(expandHome(root.path));
      try {
        const watcher = watch(rootPath, { persistent: false }, () => {
          void triggerSkillAutoSync(`watch:${provider.id}`);
        });
        skillAutoSyncWatchers.set(`${provider.id}:${rootPath}`, watcher);
      } catch {}
    }
  }
  skillAutoSyncPoll = setInterval(() => {
    void runSkillAutoSync("poll");
  }, skillAutoSyncPollMs);
  void runSkillAutoSync("configure");
}

async function configureSkillAutoSync(input) {
  const policies = input.policies && typeof input.policies === "object" ? input.policies : {};
  const enabled = Object.values(policies).some((policy) => policy?.autoImport || policy?.autoUpdate || policy?.trackRemovals);
  skillAutoSyncConfig = {
    enabled,
    policies,
    vaultPath: String(input.vaultPath || defaultSyncPath),
    dashboardUrl: String(input.dashboardUrl || process.env.HIVEMINDOS_DASHBOARD_URL || "http://127.0.0.1:5020"),
    updatedAt: new Date().toISOString(),
  };
  await writeSkillAutoSyncConfig(skillAutoSyncConfig);
  startSkillAutoSyncWatchers();
  return {
    ok: true,
    host: hostname(),
    enabled,
    watchedProviders: enabledSkillAutoSyncProviders(skillAutoSyncConfig).map((provider) => provider.id),
  };
}

async function initializeSkillAutoSync() {
  skillAutoSyncConfig = await readSkillAutoSyncConfig();
  startSkillAutoSyncWatchers();
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
    if (Array.isArray(parsed.jobs)) {
      for (const [index, job] of parsed.jobs.filter((item) => item && typeof item === "object").entries()) {
        const jobId = typeof job.id === "string" && job.id.trim() ? job.id : String(index);
        const every = scheduleTextFromJob(job);
        schedules.push({
          id: `${agent.runtime}:${agent.id}:${entry.name}:${jobId}`,
          runtime: agent.runtime,
          agentId: agent.id,
          name: stringFrom(job.name) || stringFrom(job.title) || entry.name.replace(/\.[^.]+$/, ""),
          every,
          schedule: every || undefined,
          message: stringFrom(job.message) || stringFrom(job.prompt) || stringFrom(job.task) || content.slice(0, 1200),
          enabled: job.enabled !== false,
          nextRunMs: dateMsFrom(job.next_run_at) ?? dateMsFrom(job.nextRunAt),
          updatedAt: stats?.mtimeMs ?? Date.now(),
          source: `collector/${entry.name}`,
        });
      }
      continue;
    }
    const firstLine = content.split(/\r?\n/).find((line) => line.trim())?.replace(/^#+\s*/, "").trim();
    const name = parsed.name || parsed.title || firstLine || entry.name.replace(/\.[^.]+$/, "");
    const every = parsed.every || parsed.interval || scheduleTextFromJob(parsed);
    const message = parsed.message || parsed.prompt || parsed.task || content.slice(0, 1200);
    schedules.push({
      id: `${agent.runtime}:${agent.id}:${entry.name}`,
      runtime: agent.runtime,
      agentId: agent.id,
      name,
      every,
      schedule: every || undefined,
      message,
      enabled: parsed.enabled !== false,
      nextRunMs: dateMsFrom(parsed.next_run_at) ?? dateMsFrom(parsed.nextRunAt),
      updatedAt: stats?.mtimeMs ?? Date.now(),
      source: `collector/${entry.name}`,
    });
  }
  return schedules;
}

function stringFrom(value) {
  return typeof value === "string" ? value : "";
}

function scheduleTextFromJob(job) {
  const direct = stringFrom(job.every) || stringFrom(job.interval) || stringFrom(job.schedule_display);
  if (direct) return direct;
  const schedule = job.schedule;
  if (typeof schedule === "string") return schedule;
  if (schedule && typeof schedule === "object") {
    return stringFrom(schedule.display)
      || stringFrom(schedule.value)
      || stringFrom(schedule.expr)
      || stringFrom(schedule.run_at);
  }
  return "";
}

function dateMsFrom(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || !value.trim()) return undefined;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
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
  agents.push(...await configuredRuntimeAgents());
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
  const agentEnv = hermesContextEnv(safeAgentEnv(body.agentEnv), body.context);
  const args = hermesCliArgs(agent, ["-z", text]);
  const { stdout, stderr } = await execFileAsync(await resolveHermesBin(), args, {
    timeout: chatTimeoutMs,
    maxBuffer: 3_000_000,
    env: runtimeProcessEnv({
      ...agentEnv,
      HERMES_HOME: hermesHome,
      PAGER: "cat",
    }),
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
      env: runtimeProcessEnv({
        HERMES_HOME: hermesHome,
        API_SERVER_ENABLED: "true",
        API_SERVER_HOST: hermesApiHost,
        API_SERVER_PORT: String(hermesApiPort),
        ...(hermesApiKey ? { API_SERVER_KEY: hermesApiKey } : {}),
        PAGER: "cat",
      }),
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

function apiServerMessages(body, text, requestMarker = "") {
  const markerMessage = requestMarker
    ? [{ role: "system", content: `HivemindOS request marker: ${requestMarker}` }]
    : [];
  if (Array.isArray(body.messages) && body.messages.length > 0) {
    return [
      ...markerMessage,
      ...body.messages
      .filter((message) => message && typeof message === "object")
      .map((message) => {
        const content = normalizeMessageContent(message.content);
        return {
          role: message.role === "assistant" || message.role === "system" ? message.role : "user",
          content,
        };
      })
      .filter((message) => Array.isArray(message.content) ? message.content.length > 0 : message.content.trim()),
    ];
  }
  return [...markerMessage, { role: "user", content: text }];
}

function hermesCliArgs(agent, tailArgs) {
  const args = [];
  const model = typeof agent.model === "string" ? agent.model.trim() : "";
  const provider = typeof agent.provider === "string" ? agent.provider.trim() : "";
  if (model) args.push("-m", model);
  if (provider) args.push("--provider", provider);
  return [...args, ...tailArgs];
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

async function readHermesDbSession(hermesHome, sessionId) {
  const normalized = normalizeHermesSessionId(sessionId);
  if (!normalized) return null;
  const dbPath = join(hermesHome, "state.db");
  try {
    await access(dbPath, constants.R_OK);
  } catch {
    return null;
  }
  const escaped = normalized.replaceAll("'", "''");
  const sessions = await execJson("sqlite3", ["-json", dbPath, `
    select id, source, started_at, ended_at, end_reason, title, message_count, tool_call_count
    from sessions
    where id = '${escaped}'
    limit 1;
  `], []);
  const session = sessions[0];
  if (!session) return null;
  const rows = await execJson("sqlite3", ["-json", dbPath, `
    select role, content, tool_name, timestamp
    from messages
    where session_id = '${escaped}'
    order by timestamp asc
    limit 200;
  `], []);
  const messages = rows.map((message, index) => ({
    index,
    role: message.role === "user" || message.role === "assistant" || message.role === "tool" ? message.role : "assistant",
    content: readableSessionMessageContent(message),
    createdAt: Number(message.timestamp || 0) > 0 ? Number(message.timestamp) * 1000 : 0,
  })).filter((message) => message.content.trim());
  return {
    sessionId: normalized,
    source: session.source || "state.db",
    endedAt: Number(session.ended_at || 0) > 0 ? Number(session.ended_at) * 1000 : 0,
    endReason: session.end_reason || "",
    title: session.title || "",
    startedAt: Number(session.started_at || 0) > 0 ? Number(session.started_at) * 1000 : 0,
    updatedAt: messages.at(-1)?.createdAt || (Number(session.started_at || 0) > 0 ? Number(session.started_at) * 1000 : 0),
    messageCount: session.message_count ?? messages.length,
    messages,
  };
}

async function listRecentHermesDbSessions(hermesHome, sinceMs = 0) {
  const dbPath = join(hermesHome, "state.db");
  try {
    await access(dbPath, constants.R_OK);
  } catch {
    return [];
  }
  const sinceSeconds = Math.max(0, Math.floor(Number(sinceMs || 0) / 1000));
  const rows = await execJson("sqlite3", ["-json", dbPath, `
    select id
    from sessions
    where started_at >= ${sinceSeconds}
    order by started_at desc
    limit 20;
  `], []);
  return (await Promise.all(rows.map((row) => readHermesDbSession(hermesHome, row.id)))).filter(Boolean);
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

async function waitForHermesCliSession(hermesHome, sinceMs, text) {
  const needle = text.trim().slice(0, 80);
  const deadline = Date.now() + sessionDiscoveryTimeoutMs;
  while (Date.now() < deadline) {
    const sessions = await listRecentHermesDbSessions(hermesHome, sinceMs);
    const matched = sessions.find((session) => (
      !needle || session.messages.some((message) => message.role === "user" && message.content.includes(needle))
    ));
    if (matched) return matched;
    const openSession = sessions.find((session) => !session.endedAt);
    if (openSession) return openSession;
    await sleep(250);
  }
  return null;
}

async function waitForHermesApiSession(hermesHome, sinceMs, text, requestMarker = "") {
  const needle = text.trim().slice(0, 80);
  const deadline = Date.now() + sessionDiscoveryTimeoutMs;
  while (Date.now() < deadline) {
    const sessions = await listRecentHermesApiSessions(hermesHome, sinceMs);
    if (requestMarker) {
      const markerMatched = sessions.find((session) => (
        session.messages.some((message) => message.content.includes(requestMarker))
      ));
      if (markerMatched) return markerMatched;
    }
    const matched = sessions.find((session) => (
      !needle || session.messages.some((message) => message.role === "user" && message.content.includes(needle))
    ));
    if (matched) return matched;
    await sleep(250);
  }
  return null;
}

async function proxyHermesApiChat(body, response, text, hermesHome) {
  const requestStartedAt = Date.now();
  const requestMarker = `hivemindos-${requestStartedAt.toString(36)}-${randomBytes(4).toString("hex")}`;
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
    const session = await waitForHermesApiSession(hermesHome, requestStartedAt - 2_000, text, requestMarker);
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
        model: body.agent?.model || "hermes-agent",
        stream: true,
        messages: apiServerMessages(body, text, requestMarker),
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
          const content = readableChatContent(parsed);
          if (content) {
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

  const rawMessage = typeof body.rawUserMessage === "string" ? body.rawUserMessage.trim() : "";
  const message = typeof body.message === "string"
    ? body.message
    : Array.isArray(body.messages)
      ? extractUserTextFromMessages(body.messages)
      : rawMessage;
  const text = (typeof message === "string" ? message.trim() : "") || (Array.isArray(body.messages) ? attachmentPromptFromMessages(body.messages) : "");
  const sessionMatchText = rawMessage || text;
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
  const agentEnv = hermesContextEnv(safeAgentEnv(body.agentEnv), body.context);
  if (hermesChatMode === "api" && await proxyHermesApiChat(body, response, text, hermesHome)) return;

  const runtimeSessionId = normalizeHermesSessionId(body.runtimeSessionId || body.hermesSessionId || "");
  const args = hermesCliArgs(agent, ["chat", "-Q", "-q", text, "--accept-hooks", "--source", "hivemindos"]);
  if (runtimeSessionId) args.push("--resume", runtimeSessionId);
  const cwd = await resolveChatWorkingDirectory(body.workingDirectory);
  const requestStartedAt = Date.now();

  const child = spawn(await resolveHermesBin(), args, {
    cwd,
    env: runtimeProcessEnv({
      ...agentEnv,
      HERMES_HOME: hermesHome,
      HERMES_ACCEPT_HOOKS: "1",
      PAGER: "cat",
    }),
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";
  let settled = false;
  let emittedSession = false;
  let sessionTimer = null;
  response.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-cache",
    connection: "keep-alive",
    "x-hermes-stream-source": "cli-chat",
  });

  const finish = (payload = null) => {
    if (settled) return;
    settled = true;
    clearTimeout(timeout);
    if (sessionTimer) clearInterval(sessionTimer);
    if (!response.writableEnded && !response.destroyed) {
      if (payload) response.write(ssePayload(payload));
      response.end("data: [DONE]\n\n");
    }
  };

  async function emitSession() {
    if (emittedSession || settled || response.writableEnded || response.destroyed) return;
    const session = await waitForHermesCliSession(hermesHome, requestStartedAt - 2_000, sessionMatchText);
    if (!session) return;
    emittedSession = true;
    response.write(ssePayload({
      session: {
        id: session.sessionId,
        startedAt: session.startedAt,
        updatedAt: session.updatedAt,
        messageCount: session.messages.length,
      },
    }));
  }

  sessionTimer = setInterval(() => {
    void emitSession().catch(() => undefined);
  }, 1_000);
  void emitSession().catch(() => undefined);

  const timeout = setTimeout(() => {
    if (emittedSession) {
      child.unref();
      finish();
      return;
    }
    child.kill("SIGTERM");
    finish({ error: `Hermes chat timed out after ${chatTimeoutMs}ms before a pollable session was created.` });
  }, chatTimeoutMs);

  response.on("close", () => {
    if (settled) return;
    if (emittedSession) {
      settled = true;
      clearTimeout(timeout);
      if (sessionTimer) clearInterval(sessionTimer);
      child.unref();
      return;
    }
    child.kill("SIGTERM");
  });

  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString("utf8");
  });

  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString("utf8");
  });

  child.on("error", (error) => {
    finish({ error: error instanceof Error ? error.message : "Hermes chat failed" });
  });

  child.on("close", (code) => {
    if (settled) return;
    const content = stripHermesCliMetadata(stdout);
    const errorText = stripHermesCliMetadata(stderr);
    if (code === 0) {
      if (content) {
        response.write(ssePayload({ choices: [{ delta: { content } }] }));
      } else if (errorText) {
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
    const envSync = await resolveHiveEnvAdd();
    const agents = await localAgents();
    const runtimes = [...new Set(agents.map((agent) => agent.runtime))];
    jsonResponse(response, 200, {
      ok: true,
      host: hostname(),
      machineId: await stableMachineId(),
      version: await appVersion(),
      envSync: {
        ready: envSync.ready,
        user: currentUsername(),
        command: envSync.command,
        error: envSync.error,
      },
      capabilities: {
        chat: runtimes.includes("hermes"),
        directoryBrowsing: true,
        envHttpSync: true,
        nangoSetup: true,
        runtimes,
        runtimeIntegrations: true,
        runtimeAgentCreation: true,
        skillInventory: true,
        skillAutoSync: true,
        fileTransfers: true,
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
	  if (pathname === "/env" && request.method === "POST") {
	    try {
	      const rawBody = await readBody(request);
	      const body = rawBody ? JSON.parse(rawBody) : {};
	      const entries = safeAgentEnv(body.entries || body.updates || {});
	      if (!Object.keys(entries).length) {
	        jsonResponse(response, 400, { ok: false, error: "No valid env variables were provided." });
	        return;
	      }
	      await runHiveEnvImport({
	        entries,
	        scope: body.scope === "all" || body.scope === "app" || body.scope === "agent" ? body.scope : "agent",
	        runtime: ["generic", "hermes", "aeon", "openclaw"].includes(body.runtime) ? body.runtime : "generic",
	      });
	      jsonResponse(response, 200, { ok: true, updated: Object.keys(entries).length });
	    } catch (error) {
	      jsonResponse(response, 500, {
	        ok: false,
	        error: error instanceof Error ? error.message : "Could not import env variables.",
	      });
	    }
	    return;
	  }
  if (pathname === "/integrations/nango/setup" && request.method === "POST") {
    try {
      const rawBody = await readBody(request);
      const body = rawBody ? JSON.parse(rawBody) : {};
      const result = await setupNangoIntegrationHost(String(body.baseUrl || "http://localhost:3003"));
      jsonResponse(response, result.ok ? 200 : 502, result);
    } catch (error) {
      jsonResponse(response, 500, {
        ok: false,
        error: error instanceof Error ? error.message : "Could not set up Nango on this collector.",
      });
    }
    return;
  }
  if (pathname === "/env" && request.method === "GET") {
	    try {
	      const envSync = await resolveHiveEnvAdd();
	      if (!envSync.ready) {
	        jsonResponse(response, 503, { ok: false, error: envSync.error || "hive-env-add is not installed or executable." });
	        return;
	      }
	      const scope = ["all", "app", "agent"].includes(requestUrl.searchParams.get("scope") || "")
	        ? requestUrl.searchParams.get("scope")
	        : "agent";
	      const runtime = ["generic", "hermes", "aeon", "openclaw"].includes(requestUrl.searchParams.get("runtime") || "")
	        ? requestUrl.searchParams.get("runtime")
	        : "generic";
	      const { stdout } = await execFileAsync(envSync.command, ["--export-json", "--scope", scope, "--runtime", runtime], {
	        timeout: 12_000,
	        maxBuffer: 1_000_000,
	      });
	      const payload = JSON.parse(stdout);
	      jsonResponse(response, 200, { ok: true, ...payload });
	    } catch (error) {
	      jsonResponse(response, 500, {
	        ok: false,
	        error: error instanceof Error ? error.message : "Could not read env variables.",
	      });
	    }
	    return;
	  }
  if (pathname === "/agents" && request.method === "GET") {
    const agents = await localAgents();
    jsonResponse(response, 200, { ok: true, host: hostname(), agents });
    return;
  }
  if (pathname === "/agents" && request.method === "POST") {
    try {
      const rawBody = await readBody(request);
      const body = rawBody ? JSON.parse(rawBody) : {};
      const agent = await createRuntimeAgent(body);
      jsonResponse(response, 200, { ok: true, host: hostname(), agent });
    } catch (error) {
      jsonResponse(response, 400, {
        ok: false,
        error: error instanceof Error ? error.message : "Could not create runtime agent.",
      });
    }
    return;
  }
  if (pathname === "/agents" && request.method === "DELETE") {
    try {
      const rawBody = await readBody(request);
      const body = rawBody ? JSON.parse(rawBody) : {};
      const result = await deleteRuntimeAgent(body);
      jsonResponse(response, 200, { ok: true, host: hostname(), ...result });
    } catch (error) {
      jsonResponse(response, 400, {
        ok: false,
        error: error instanceof Error ? error.message : "Could not delete runtime agent.",
      });
    }
    return;
  }
  if (pathname === "/e2e/env-sync" && request.method === "POST") {
    try {
      const rawBody = await readBody(request);
      const body = rawBody ? JSON.parse(rawBody) : {};
      const key = String(body.key || "");
      const value = String(body.value ?? "");
      const scope = ["all", "app", "agent"].includes(body.scope) ? body.scope : "all";
      const runtime = ["generic", "hermes", "aeon", "openclaw"].includes(body.runtime) ? body.runtime : "generic";
      const output = await runHiveEnvE2eSync({ key, value, scope, runtime });
      jsonResponse(response, 200, { ok: true, host: hostname(), key, scope, runtime, output });
    } catch (error) {
      jsonResponse(response, 400, {
        ok: false,
        error: error instanceof Error ? error.message : "Could not run E2E env sync.",
      });
    }
    return;
  }
  if (pathname === "/e2e/skills" && request.method === "POST") {
    try {
      const rawBody = await readBody(request);
      const body = rawBody ? JSON.parse(rawBody) : {};
      const result = body.action === "remove"
        ? await removeE2eProviderSkill(body)
        : await writeE2eProviderSkill(body);
      void triggerSkillAutoSync(`e2e:${body.action || "write"}`).catch(() => undefined);
      jsonResponse(response, 200, { host: hostname(), ...result });
    } catch (error) {
      jsonResponse(response, 400, {
        ok: false,
        error: error instanceof Error ? error.message : "Could not mutate E2E skill.",
      });
    }
    return;
  }
  if (pathname === "/directories" && request.method === "GET") {
    try {
      const result = await listDirectories(requestUrl.searchParams.get("path") || "~");
      jsonResponse(response, 200, result);
    } catch (error) {
      jsonResponse(response, 400, {
        ok: false,
        error: error instanceof Error ? error.message : "Could not list directories.",
      });
    }
    return;
  }
  if (pathname === "/skills" && request.method === "GET") {
    try {
      const includeSourceFiles = requestUrl.searchParams.get("includeSourceFiles") === "true";
      jsonResponse(response, 200, await listInstalledSkills({ includeSourceFiles }));
    } catch (error) {
      jsonResponse(response, 500, {
        ok: false,
        error: error instanceof Error ? error.message : "Could not list installed skills.",
      });
    }
    return;
  }
  if (pathname === "/skills/auto-sync" && request.method === "GET") {
    skillAutoSyncConfig = skillAutoSyncConfig ?? await readSkillAutoSyncConfig();
    jsonResponse(response, 200, {
      ok: true,
      host: hostname(),
      ...skillAutoSyncConfig,
      watchedProviders: enabledSkillAutoSyncProviders(skillAutoSyncConfig).map((provider) => provider.id),
    });
    return;
  }
  if (pathname === "/skills/auto-sync" && request.method === "POST") {
    try {
      const rawBody = await readBody(request);
      const body = rawBody ? JSON.parse(rawBody) : {};
      jsonResponse(response, 200, await configureSkillAutoSync(body));
    } catch (error) {
      jsonResponse(response, 400, {
        ok: false,
        error: error instanceof Error ? error.message : "Could not configure skill auto-sync.",
      });
    }
    return;
  }
  const runtimeIntegrationMatch = pathname.match(/^\/runtimes\/([^/]+)\/integrations$/);
  if (runtimeIntegrationMatch && request.method === "POST") {
    try {
      const rawBody = await readBody(request);
      const body = rawBody ? JSON.parse(rawBody) : {};
      const runtimeName = runtimeIntegrationMatch[1];
      if (runtimeName !== "hermes") {
        jsonResponse(response, 404, { ok: false, error: `${runtimeName} integrations are not exposed by this collector yet.` });
        return;
      }
      if (body.action) {
        jsonResponse(response, 200, await runHermesIntegrationAction(body.action, body.input || {}));
        return;
      }
      jsonResponse(response, 200, { ok: true, status: await hermesIntegrationStatus(body.agent || {}) });
    } catch (error) {
      jsonResponse(response, 500, {
        ok: false,
        error: error instanceof Error ? error.message : "Runtime integration check failed.",
      });
    }
    return;
  }
  if (pathname === "/schedules") {
    const agents = await localAgents();
    const schedules = (await Promise.all(agents.map((agent) => scanRuntimeSchedules(agent, agent.localDataDir)))).flat();
    jsonResponse(response, 200, { ok: true, host: hostname(), schedules });
    return;
  }
  if (pathname === "/transfers" && request.method === "GET") {
    try {
      const transfers = await listTransfers({
        syncPath: requestUrl.searchParams.get("syncPath") || defaultSyncPath,
        machineId: requestUrl.searchParams.get("machineId") || await stableMachineId(),
        host: requestUrl.searchParams.get("host") || hostname(),
        runtime: requestUrl.searchParams.get("runtime") || "",
        agentId: requestUrl.searchParams.get("agentId") || requestUrl.searchParams.get("agent") || "",
        includeAcknowledged: requestUrl.searchParams.get("includeAcknowledged") === "true" || requestUrl.searchParams.get("all") === "true",
      });
      jsonResponse(response, 200, { ok: true, host: hostname(), machineId: await stableMachineId(), transfers });
    } catch (error) {
      jsonResponse(response, 400, {
        ok: false,
        error: error instanceof Error ? error.message : "Could not list file transfers.",
      });
    }
    return;
  }
  if (pathname === "/transfers" && request.method === "POST") {
    try {
      const rawBody = await readBody(request);
      const body = rawBody ? JSON.parse(rawBody) : {};
      const transfer = await createTransfer({
        syncPath: body.syncPath || defaultSyncPath,
        file: body.file,
        files: body.files,
        note: body.note,
        from: {
          machineId: body.from?.machineId || await stableMachineId(),
          host: body.from?.host || hostname(),
          runtime: body.from?.runtime,
          agentId: body.from?.agentId || body.from?.agent,
        },
        to: {
          machineId: body.to?.machineId,
          host: body.to?.host,
          runtime: body.to?.runtime,
          agentId: body.to?.agentId || body.to?.agent,
        },
      });
      jsonResponse(response, 200, { ok: true, host: hostname(), machineId: await stableMachineId(), transfer });
    } catch (error) {
      jsonResponse(response, 400, {
        ok: false,
        error: error instanceof Error ? error.message : "Could not create file transfer.",
      });
    }
    return;
  }
  if (pathname === "/transfers/ack" && request.method === "POST") {
    try {
      const rawBody = await readBody(request);
      const body = rawBody ? JSON.parse(rawBody) : {};
      const result = await acknowledgeTransfer({
        syncPath: body.syncPath || defaultSyncPath,
        id: body.id,
        machineId: body.machineId || await stableMachineId(),
        runtime: body.runtime || "",
        agentId: body.agentId || body.agent || "",
      });
      jsonResponse(response, 200, { host: hostname(), machineId: await stableMachineId(), ...result });
    } catch (error) {
      jsonResponse(response, 400, {
        ok: false,
        error: error instanceof Error ? error.message : "Could not acknowledge file transfer.",
      });
    }
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
    const hermesHome = expandHome(requestUrl.searchParams.get("localDataDir") || defaultHermesDir);
    const sinceMs = Number(requestUrl.searchParams.get("sinceMs") || 0);
    let session = null;
    if (sessionId) {
      const apiSession = await readHermesApiSession(hermesHome, sessionId);
      const dbSession = apiSession?.messages?.length ? null : await readHermesDbSession(hermesHome, sessionId);
      session = dbSession ?? apiSession;
    } else {
      session = (await listRecentHermesApiSessions(hermesHome, sinceMs))[0] ?? null;
    }
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
}).listen(port, host, () => {
  console.log(`agent telemetry collector listening on ${host}:${port}`);
  void initializeSkillAutoSync();
});
