import { spawn } from "node:child_process";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import type { AgentProfile } from "@/lib/types/agent-runtime";
import type { RuntimeAdapter, RuntimeSchedule, RuntimeScheduleAction } from "./types";

function expandHome(path: string) {
  return path.replace(/^~(?=$|\/)/, homedir());
}

async function listHermesSchedules(profile: AgentProfile): Promise<RuntimeSchedule[]> {
  const home = resolve(expandHome(profile.localDataDir?.trim() || "~/.hermes"));
  const cronDir = join(home, "cron");
  const entries = await readdir(cronDir, { withFileTypes: true }).catch(() => []);
  const schedules: RuntimeSchedule[] = [];
  for (const entry of entries.filter((item) => item.isFile()).slice(0, 60)) {
    if (!/\.(md|txt|json|jsonl|yaml|yml)$/i.test(entry.name)) continue;
    const path = join(cronDir, entry.name);
    const raw = await readFile(path, "utf8").catch(() => "");
    if (!raw.trim()) continue;
    const fileStat = await stat(path).catch(() => null);
    const parsed = parseScheduleContent(raw, entry.name);
    schedules.push({
      id: `hermes:${profile.id}:${entry.name}`,
      runtime: "hermes",
      agentId: profile.id,
      name: parsed.name,
      every: parsed.every,
      schedule: parsed.every || "runtime file",
      message: parsed.message,
      enabled: parsed.enabled,
      source: `~/.hermes/cron/${entry.name}`,
      lastRunMs: fileStat?.mtimeMs,
      metadata: { path },
    });
  }
  return schedules;
}

function parseScheduleContent(raw: string, filename: string) {
  let parsed: Record<string, unknown> = {};
  if (/\.json$/i.test(filename)) {
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      parsed = {};
    }
  }
  const firstLine = raw.split(/\r?\n/).find((line) => line.trim())?.replace(/^#+\s*/, "").trim();
  const enabled = parsed.enabled !== false && !/^paused:/im.test(raw);
  return {
    name: String(parsed.name || parsed.title || firstLine || filename.replace(/\.[^.]+$/, "")),
    every: String(parsed.every || parsed.interval || parsed.schedule || ""),
    message: String(parsed.message || parsed.prompt || parsed.task || raw.slice(0, 1200)),
    enabled,
  };
}

async function runHermesScheduleAction(_profile: AgentProfile | undefined, action: RuntimeScheduleAction, jobId: string) {
  if (action === "run-now") {
    const fileName = jobId.split(":").pop() || "";
    const home = resolve(expandHome(_profile?.localDataDir?.trim() || "~/.hermes"));
    const raw = fileName ? await readFile(join(home, "cron", fileName), "utf8").catch(() => "") : "";
    const prompt = parseScheduleContent(raw || fileName, fileName || "schedule.txt").message.trim();
    if (!prompt) return { ok: false, error: "Hermes schedule prompt is empty." };
    const id = `hermes-schedule-${Date.now().toString(36)}`;
    const logPath = join(homedir(), ".hivemindos", "runtime-runs", `${id}.log`);
    await mkdir(dirname(logPath), { recursive: true });
    const child = spawn("hermes", ["-z", prompt], { detached: true, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env } });
    const append = (chunk: Buffer) => void writeFile(logPath, chunk.toString(), { flag: "a" }).catch(() => undefined);
    child.stdout.on("data", append);
    child.stderr.on("data", append);
    child.unref();
    return { ok: true, result: { id, logPath }, error: undefined };
  }
  if (action === "enable" || action === "disable") {
    return { ok: false, error: "Hermes file-backed schedule enable/disable is not safely editable yet. Import it, then pause the HivemindOS copy." };
  }
  return { ok: false, error: `Unsupported Hermes schedule action: ${action}` };
}

export const hermesAdapter: RuntimeAdapter = {
  runtime: "hermes",
  label: "Hermes",
  kind: "interactive",
  capabilities: {
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
  },
  defaultProfile: {
    gatewayUrl: process.env.NEXT_PUBLIC_HERMES_BASE_URL ?? "http://127.0.0.1:8642",
    chatPath: "/chat",
    statusPath: "/health",
    localDataDir: "~/.hermes",
  },
  listSchedules: listHermesSchedules,
  runScheduleAction: runHermesScheduleAction,
};
