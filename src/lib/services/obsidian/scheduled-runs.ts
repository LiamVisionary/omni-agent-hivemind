import { access, mkdir, readFile, readdir, stat, writeFile } from "fs/promises";
import { constants } from "fs";
import { basename, dirname, join, relative } from "path";
import { DEFAULT_SHARED_VAULT } from "@/lib/types/agent-runtime";
import { resolveObsidianVaultPath } from "@/lib/services/obsidian/vault-path";

export type ScheduleSnapshot = {
  id: string;
  name: string;
  agentId?: string;
  agentName?: string;
  machineName?: string;
  runtime?: string;
  enabled?: boolean;
  every?: string;
  mode?: string;
  prompt?: string;
  model?: string;
  skills?: string[];
  paths?: string[];
  steps?: Array<{ id?: string; text?: string; skills?: string[]; paths?: string[]; model?: string }>;
  externalSource?: string | null;
  externalJobId?: string | null;
  updatedAt?: number;
  nextRunAt?: number;
  usePastRuns?: boolean;
  pastRunLimit?: number;
  sharedSchedulePath?: string;
  sharedRunFolder?: string;
};

export type ScheduledRunRecord = {
  schedule: ScheduleSnapshot;
  runId: string;
  agentName?: string;
  machineName?: string;
  status: "running" | "ok" | "failed";
  startedAt: number;
  completedAt?: number;
  prompt?: string;
  output?: string;
  summary?: string;
  telemetry?: Record<string, unknown>;
};

export type PastScheduledRun = {
  path: string;
  name: string;
  mtimeMs: number;
  content: string;
};

function scheduledFolderName(value?: string) {
  return sanitizeSegment(value || DEFAULT_SHARED_VAULT.scheduledFolder || "Scheduled", "Scheduled");
}

function sanitizeSegment(value: string | undefined, fallback: string) {
  const slug = (value || fallback)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
  return slug || fallback;
}

function frontmatterValue(value: unknown): string {
  if (value === null || typeof value === "undefined") return "null";
  if (Array.isArray(value)) return `[${value.map((item) => JSON.stringify(String(item))).join(", ")}]`;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(String(value));
}

function yamlFrontmatter(values: Record<string, unknown>) {
  return [
    "---",
    ...Object.entries(values).map(([key, value]) => `${key}: ${frontmatterValue(value)}`),
    "---",
    "",
  ].join("\n");
}

function fenced(label: string, value: unknown) {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? {}, null, 2);
  return [`## ${label}`, "", "```text", text.trim() || "(empty)", "```", ""].join("\n");
}

function extractFencedSection(content: string, label: string) {
  const match = content.match(new RegExp(`## ${label}\\s+\\\`\\\`\\\`text\\n([\\s\\S]*?)\\n\\\`\\\`\\\``));
  return match?.[1]?.trim() ?? "";
}

function extractFrontmatterString(content: string, key: string) {
  const match = content.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
  const value = match?.[1]?.trim();
  if (!value || value === "null") return "";
  if (value.startsWith('"') && value.endsWith('"')) {
    try {
      return JSON.parse(value) as string;
    } catch {
      return value.slice(1, -1);
    }
  }
  return value;
}

function decodeJsonStringFragment(value: string) {
  const trimmed = value.trim();
  try {
    return JSON.parse(`"${trimmed.replace(/"$/, "")}"`) as string;
  } catch {
    return trimmed
      .replace(/\\"/g, '"')
      .replace(/\\n/g, "\n")
      .replace(/\\u2014/g, "-");
  }
}

function repairHermesJobsSchedule(content: string, file: string, vault: string): ScheduleSnapshot | null {
  const config = extractFencedSection(content, "Config JSON");
  const promptBlock = extractFencedSection(content, "Prompt");
  const source = config || promptBlock || content;
  if (!/"jobs"\s*:/.test(source)) return null;
  const name = source.match(/"name"\s*:\s*"([^"]+)"/)?.[1];
  const every = source.match(/"schedule_display"\s*:\s*"([^"]+)"/)?.[1]
    || source.match(/"display"\s*:\s*"([^"]+)"/)?.[1]
    || source.match(/"expr"\s*:\s*"([^"]+)"/)?.[1]
    || extractFrontmatterString(content, "every");
  const nextRunAt = Date.parse(source.match(/"next_run_at"\s*:\s*"([^"]+)"/)?.[1] || "");
  const promptMatch = source.match(/"prompt"\s*:\s*"([\s\S]*?)(?:",\s*\n\s*"model"|",\s*\n\s*"schedule"|",\s*\n\s*"enabled"|"\s*\n\s*}|\n```|$)/);
  const prompt = promptMatch ? decodeJsonStringFragment(promptMatch[1]) : promptBlock;
  const scheduleId = extractFrontmatterString(content, "scheduleId") || `shared:${basename(dirname(file))}`;
  const externalJobId = extractFrontmatterString(content, "externalJobId") || scheduleId;
  return {
    id: scheduleId,
    name: name || extractFrontmatterString(content, "scheduleName") || basename(dirname(file)),
    agentId: extractFrontmatterString(content, "agentId"),
    agentName: extractFrontmatterString(content, "agentName"),
    machineName: extractFrontmatterString(content, "device"),
    runtime: extractFrontmatterString(content, "runtime") || "hermes",
    enabled: extractFrontmatterString(content, "enabled") !== "false",
    every: every || "custom",
    mode: "prompt",
    prompt: prompt || "Imported runtime schedule.",
    model: "",
    skills: [],
    paths: [],
    steps: [],
    externalSource: extractFrontmatterString(content, "externalSource") || "hermes",
    externalJobId,
    updatedAt: Date.parse(extractFrontmatterString(content, "updatedAt")) || undefined,
    nextRunAt: Number.isFinite(nextRunAt) ? nextRunAt : undefined,
    usePastRuns: extractFrontmatterString(content, "usePastRuns") === "true",
    pastRunLimit: Number(extractFrontmatterString(content, "pastRunLimit")) || 3,
    sharedSchedulePath: relative(vault, file),
    sharedRunFolder: relative(vault, dirname(file)),
  };
}

function normalizeScheduleSnapshot(schedule: ScheduleSnapshot, content: string, file: string, vault: string): ScheduleSnapshot {
  if (schedule.name !== "{" && !/^\s*\{\s*"jobs"\s*:/.test(schedule.prompt || "")) {
    return schedule;
  }
  const repaired = repairHermesJobsSchedule(content, file, vault);
  if (!repaired) return schedule;
  return {
    ...schedule,
    ...repaired,
    id: schedule.id,
    externalJobId: schedule.externalJobId,
    sharedSchedulePath: relative(vault, file),
    sharedRunFolder: relative(vault, dirname(file)),
  };
}

async function exists(path: string) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function scheduleSegments(schedule: ScheduleSnapshot) {
  const device = sanitizeSegment(schedule.machineName || "local", "local");
  const slug = sanitizeSegment(schedule.name || schedule.id, "schedule");
  return { device, slug };
}

async function scheduleDirectory(vaultPath: string | undefined, scheduledFolder: string | undefined, schedule: ScheduleSnapshot) {
  const vault = resolveObsidianVaultPath(vaultPath, { requireWritable: true });
  const { device, slug } = scheduleSegments(schedule);
  const root = join(vault, scheduledFolderName(scheduledFolder));
  const dir = join(root, device, slug);
  await mkdir(dir, { recursive: true });
  await ensureScheduledIndex(root);
  return { vault, root, dir, device, slug };
}

async function ensureScheduledIndex(root: string) {
  await mkdir(root, { recursive: true });
  const path = join(root, "README.md");
  if (await exists(path)) return;
  await writeFile(path, [
    "# Scheduled",
    "",
    "Shared schedule definitions and run history for HivemindOS agents.",
    "",
    "- `Scheduled/<device>/<schedule>/schedule.md` stores the schedule snapshot.",
    "- `run0001-<agent>-<timestamp>.md` files store execution history.",
    "- Use `usePastRuns` on a schedule to inject recent run notes back into future runs.",
    "",
  ].join("\n"));
}

export async function upsertScheduledSchedule(input: {
  vaultPath?: string;
  scheduledFolder?: string;
  schedule: ScheduleSnapshot;
}) {
  const location = await scheduleDirectory(input.vaultPath, input.scheduledFolder, input.schedule);
  const schedulePath = join(location.dir, "schedule.md");
  const body = [
    yamlFrontmatter({
      type: "hivemindos-schedule",
      scheduleId: input.schedule.id,
      scheduleName: input.schedule.name,
      device: location.device,
      agentId: input.schedule.agentId,
      agentName: input.schedule.agentName,
      runtime: input.schedule.runtime,
      enabled: input.schedule.enabled !== false,
      every: input.schedule.every,
      externalSource: input.schedule.externalSource ?? null,
      externalJobId: input.schedule.externalJobId ?? null,
      usePastRuns: input.schedule.usePastRuns === true,
      pastRunLimit: input.schedule.pastRunLimit ?? 3,
      updatedAt: input.schedule.updatedAt ? new Date(input.schedule.updatedAt).toISOString() : new Date().toISOString(),
    }),
    `# ${input.schedule.name || input.schedule.id}`,
    "",
    `- Schedule ID: \`${input.schedule.id}\``,
    `- Agent: ${input.schedule.agentName || input.schedule.agentId || "(unassigned)"}`,
    `- Device: ${location.device}`,
    `- Cadence: ${input.schedule.every || "(custom)"}`,
    `- Shared run folder: \`${relative(location.vault, location.dir)}\``,
    "",
    fenced("Prompt", input.schedule.prompt || ""),
    fenced("Config JSON", input.schedule),
  ].join("\n");
  await writeFile(schedulePath, body);
  return { path: relative(location.vault, schedulePath), folder: relative(location.vault, location.dir) };
}

async function nextRunNumber(dir: string) {
  const entries = await readdir(dir).catch(() => []);
  const current = entries.reduce((max, name) => {
    const match = name.match(/^run(\d+)-/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return current + 1;
}

export async function recordScheduledRun(input: {
  vaultPath?: string;
  scheduledFolder?: string;
  record: ScheduledRunRecord;
}) {
  const location = await scheduleDirectory(input.vaultPath, input.scheduledFolder, input.record.schedule);
  await upsertScheduledSchedule({
    vaultPath: input.vaultPath,
    scheduledFolder: input.scheduledFolder,
    schedule: input.record.schedule,
  });
  const runNumber = await nextRunNumber(location.dir);
  const runLabel = `run${String(runNumber).padStart(4, "0")}`;
  const agent = sanitizeSegment(input.record.agentName || input.record.schedule.agentName || "agent", "agent");
  const timestamp = new Date(input.record.completedAt ?? input.record.startedAt).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const path = join(location.dir, `${runLabel}-${agent}-${timestamp}.md`);
  const content = [
    yamlFrontmatter({
      type: "hivemindos-scheduled-run",
      scheduleId: input.record.schedule.id,
      scheduleName: input.record.schedule.name,
      runId: input.record.runId,
      runNumber,
      status: input.record.status,
      device: location.device,
      agentName: input.record.agentName || input.record.schedule.agentName,
      startedAt: new Date(input.record.startedAt).toISOString(),
      completedAt: input.record.completedAt ? new Date(input.record.completedAt).toISOString() : null,
      skills: input.record.schedule.skills ?? [],
      externalSource: input.record.schedule.externalSource ?? null,
      externalJobId: input.record.schedule.externalJobId ?? null,
    }),
    `# ${runLabel} - ${input.record.schedule.name || input.record.schedule.id}`,
    "",
    `- Status: ${input.record.status}`,
    `- Agent: ${input.record.agentName || input.record.schedule.agentName || "(unknown)"}`,
    `- Schedule: [[schedule]]`,
    "",
    fenced("Prompt", input.record.prompt || input.record.schedule.prompt || ""),
    fenced("Output", input.record.output || input.record.summary || ""),
    fenced("Telemetry JSON", input.record.telemetry ?? {}),
  ].join("\n");
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
  return { path: relative(location.vault, path), folder: relative(location.vault, location.dir), runNumber };
}

export async function readPastScheduledRuns(input: {
  vaultPath?: string;
  scheduledFolder?: string;
  schedule: ScheduleSnapshot;
  limit?: number;
}): Promise<PastScheduledRun[]> {
  const location = await scheduleDirectory(input.vaultPath, input.scheduledFolder, input.schedule);
  const limit = Math.max(1, Math.min(12, input.limit ?? input.schedule.pastRunLimit ?? 3));
  const entries = await readdir(location.dir, { withFileTypes: true }).catch(() => []);
  const runs = await Promise.all(entries
    .filter((entry) => entry.isFile() && /^run\d+-.*\.md$/.test(entry.name))
    .map(async (entry) => {
      const path = join(location.dir, entry.name);
      const fileStat = await stat(path);
      const content = await readFile(path, "utf8");
      return { path: relative(location.vault, path), name: basename(path), mtimeMs: fileStat.mtimeMs, content };
    }));
  return runs.sort((a, b) => b.mtimeMs - a.mtimeMs).slice(0, limit);
}

async function collectScheduleFiles(dir: string, files: string[] = []) {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectScheduleFiles(path, files);
    } else if (entry.isFile() && entry.name === "schedule.md") {
      files.push(path);
    }
  }
  return files;
}

export async function listScheduledSchedules(input: {
  vaultPath?: string;
  scheduledFolder?: string;
}): Promise<ScheduleSnapshot[]> {
  const vault = resolveObsidianVaultPath(input.vaultPath, { requireWritable: true });
  const root = join(vault, scheduledFolderName(input.scheduledFolder));
  await ensureScheduledIndex(root);
  const files = await collectScheduleFiles(root);
  const schedules: Array<ScheduleSnapshot | null> = await Promise.all(files.map(async (file) => {
    const content = await readFile(file, "utf8");
    const rawJson = extractFencedSection(content, "Config JSON");
    if (!rawJson) return repairHermesJobsSchedule(content, file, vault);
    try {
      const parsed = JSON.parse(rawJson) as ScheduleSnapshot;
      return normalizeScheduleSnapshot({
        ...parsed,
        sharedSchedulePath: relative(vault, file),
        sharedRunFolder: relative(vault, dirname(file)),
      }, content, file, vault);
    } catch {
      return repairHermesJobsSchedule(content, file, vault);
    }
  }));
  return schedules
    .filter((schedule): schedule is ScheduleSnapshot => Boolean(schedule?.id && schedule?.name))
    .sort((a, b) => Number(b.updatedAt ?? 0) - Number(a.updatedAt ?? 0));
}
