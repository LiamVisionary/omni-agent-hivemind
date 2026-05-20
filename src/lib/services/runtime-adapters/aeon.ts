import { constants } from "fs";
import { access, readdir, readFile, stat } from "fs/promises";
import { execFile, spawn } from "child_process";
import { promisify } from "util";
import { homedir } from "os";
import { basename, dirname, join, resolve } from "path";
import type { AgentProfile } from "@/lib/types/agent-runtime";
import { getSharedBrainSkills, syncSharedBrainSkillsToAeon } from "@/lib/services/obsidian/brain-skills";
import type { RuntimeAdapter, RuntimeRun, RuntimeSchedule, RuntimeScheduleAction, RuntimeSkill } from "./types";

const execFileAsync = promisify(execFile);
const DEFAULT_BRANCH = "main";
const DEFAULT_A2A_URL = process.env.NEXT_PUBLIC_AEON_A2A_URL ?? process.env.NEXT_PUBLIC_AEON_BASE_URL ?? "http://127.0.0.1:41241";
const ENV_KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const DEFAULT_AEON_SECRET_KEYS = [
  "ANTHROPIC_API_KEY",
  "CLAUDE_CODE_OAUTH_TOKEN",
  "BANKR_LLM_KEY",
  "GH_GLOBAL",
];

type AeonSkillConfig = {
  enabled: boolean;
  schedule: string;
  var: string;
  model: string;
};

type AeonConfig = {
  skills: Record<string, AeonSkillConfig>;
  model: string;
};

function expandHome(path: string) {
  return path === "~" || path.startsWith("~/") ? join(homedir(), path.slice(2)) : path;
}

function clean(value?: string) {
  return value?.trim() || "";
}

function aeonRoot(profile?: AgentProfile) {
  const configured = clean(profile?.aeonLocalPath)
    || clean(profile?.localDataDir)
    || clean(process.env.AEON_LOCAL_PATH)
    || clean(process.env.AEON_HOME);
  return configured ? resolve(expandHome(configured)) : "";
}

function aeonRepo(profile?: AgentProfile) {
  return clean(profile?.aeonRepo) || clean(process.env.AEON_REPO) || clean(process.env.GITHUB_REPO);
}

function aeonBranch(profile?: AgentProfile) {
  return clean(profile?.aeonBranch) || clean(process.env.AEON_BRANCH) || DEFAULT_BRANCH;
}

async function canRead(path: string) {
  return access(path, constants.R_OK).then(() => true).catch(() => false);
}

async function readLocalFile(root: string, path: string) {
  if (!root) return "";
  return readFile(join(root, path), "utf8").catch(() => "");
}

function parseInlineFields(raw: string) {
  const fields: Record<string, string | boolean> = {};
  const parts: string[] = [];
  let current = "";
  let quote = "";
  for (const char of raw) {
    if ((char === "\"" || char === "'") && !quote) {
      quote = char;
      current += char;
      continue;
    }
    if (char === quote) {
      quote = "";
      current += char;
      continue;
    }
    if (char === "," && !quote) {
      parts.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  if (current.trim()) parts.push(current);

  for (const part of parts) {
    const match = part.match(/^\s*([a-zA-Z0-9_-]+):\s*(.*?)\s*$/);
    if (!match) continue;
    const value = match[2].replace(/^["']|["']$/g, "");
    fields[match[1]] = value === "true" ? true : value === "false" ? false : value;
  }
  return fields;
}

// Adapted from aaronjmars/aeon dashboard/lib/config.ts and messages.yml:
// preserve Aeon's simple skill config shape while avoiding a dashboard-wide YAML dependency.
export function parseAeonConfig(raw: string): AeonConfig {
  const skills: Record<string, AeonSkillConfig> = {};
  const model = raw.match(/^model:\s*["']?([^"'\n#]+)["']?/m)?.[1]?.trim() || "claude-sonnet-4-6";
  let inSkills = false;
  let current = "";
  for (const line of raw.split(/\r?\n/)) {
    if (/^skills:\s*$/.test(line)) {
      inSkills = true;
      continue;
    }
    if (inSkills && /^[A-Za-z0-9_-]+:\s*/.test(line)) {
      inSkills = false;
      current = "";
    }
    if (!inSkills) continue;

    const inline = line.match(/^  ([A-Za-z0-9_-]+):\s*\{(.+?)\}\s*(?:#.*)?$/);
    if (inline) {
      const fields = parseInlineFields(inline[2]);
      skills[inline[1]] = {
        enabled: fields.enabled === true,
        schedule: typeof fields.schedule === "string" ? fields.schedule : "",
        var: typeof fields.var === "string" ? fields.var : "",
        model: typeof fields.model === "string" ? fields.model : "",
      };
      current = "";
      continue;
    }

    const section = line.match(/^  ([A-Za-z0-9_-]+):\s*$/);
    if (section) {
      current = section[1];
      skills[current] = { enabled: true, schedule: "", var: "", model: "" };
      continue;
    }
    if (!current) continue;
    const field = line.match(/^    ([A-Za-z0-9_-]+):\s*["']?([^"'\n#]*)["']?/);
    if (!field) continue;
    if (field[1] === "enabled") skills[current].enabled = field[2].trim() !== "false";
    if (field[1] === "schedule") skills[current].schedule = field[2].trim();
    if (field[1] === "var") skills[current].var = field[2].trim();
    if (field[1] === "model") skills[current].model = field[2].trim();
  }
  return { skills, model };
}

function updateAeonSkillEnabled(raw: string, skill: string, enabled: boolean) {
  const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const inlineRe = new RegExp(`^(\\s{2}${escaped}:\\s*\\{[^\\n]*enabled:\\s*)(true|false)([^\\n]*\\})`, "m");
  if (inlineRe.test(raw)) return raw.replace(inlineRe, `$1${enabled ? "true" : "false"}$3`);
  const blockRe = new RegExp(`^(\\s{2}${escaped}:\\s*\\n(?:(?:\\s{4}[^\\n]*\\n)*?)\\s{4}enabled:\\s*)(true|false)`, "m");
  if (blockRe.test(raw)) return raw.replace(blockRe, `$1${enabled ? "true" : "false"}`);
  return raw;
}

async function skillDescription(root: string, slug: string) {
  const content = await readLocalFile(root, join("skills", slug, "SKILL.md"));
  const frontmatter = content.match(/^---\s*\n([\s\S]*?)\n---/);
  const desc = frontmatter?.[1]?.match(/^description:\s*["']?(.+?)["']?\s*$/m)?.[1]?.trim();
  if (desc) return desc;
  return content
    .replace(/^---\n[\s\S]*?\n---/, "")
    .split(/\n\s*\n/)
    .map((part) => part.replace(/^#+\s*/, "").trim())
    .find(Boolean) ?? "";
}

async function localSkills(root: string, config: AeonConfig): Promise<RuntimeSkill[]> {
  const skills: RuntimeSkill[] = [];
  const manifest = await readLocalFile(root, "skills.json");
  if (manifest.trim()) {
    try {
      const parsed = JSON.parse(manifest) as { skills?: Array<{ slug?: string; name?: string; description?: string; category?: string; schedule?: string; var?: string; source?: string; skillMdPath?: string; checksum?: string }> };
      if (Array.isArray(parsed.skills)) {
        skills.push(...parsed.skills.filter((skill) => skill.slug).map((skill) => {
          const slug = String(skill.slug);
          const cfg = config.skills[slug];
          return {
            slug,
            name: skill.name || titleFromSlug(slug),
            description: skill.description || "",
            category: skill.category,
            enabled: cfg?.enabled ?? false,
            schedule: cfg?.schedule || skill.schedule,
            var: cfg?.var || skill.var,
            model: cfg?.model,
            source: skill.source || "aeon-skills-json",
            path: skill.skillMdPath,
            checksum: skill.checksum,
          };
        }));
      }
    } catch {
      // Fall through to directory scan.
    }
  }

  const skillRoot = join(root, "skills");
  const entries = await readdir(skillRoot, { withFileTypes: true }).catch(() => []);
  const folderSkills = await Promise.all(entries.filter((entry) => entry.isDirectory()).map(async (entry) => {
    const cfg = config.skills[entry.name];
    return {
      slug: entry.name,
      name: titleFromSlug(entry.name),
      description: await skillDescription(root, entry.name),
      enabled: cfg?.enabled ?? false,
      schedule: cfg?.schedule,
      var: cfg?.var,
      model: cfg?.model,
      source: "aeon-skill-folder",
    };
  }));
  return mergeSkills(skills, folderSkills);
}

async function sharedBrainSkills(profile: AgentProfile, config: AeonConfig, vaultPath?: string): Promise<RuntimeSkill[]> {
  if (profile.useSharedVault === false) return [];
  const inventory = await getSharedBrainSkills(vaultPath).catch(() => null);
  return (inventory?.shared ?? []).map((skill) => {
    const cfg = config.skills[skill.slug];
    return {
      slug: skill.slug,
      name: skill.name,
      description: skill.description,
      enabled: cfg?.enabled ?? false,
      schedule: cfg?.schedule,
      var: cfg?.var,
      model: cfg?.model || config.model,
      source: "shared-brain",
      path: skill.path,
      checksum: skill.checksum,
      providerLabel: skill.providerLabel,
    };
  });
}

function mergeSkills(...groups: RuntimeSkill[][]) {
  const merged = new Map<string, RuntimeSkill>();
  for (const skill of groups.flat()) {
    if (!skill.slug) continue;
    const existing = merged.get(skill.slug);
    if (!existing) {
      merged.set(skill.slug, skill);
      continue;
    }
    merged.set(skill.slug, {
      ...skill,
      ...existing,
      description: existing.description || skill.description,
      enabled: existing.enabled || skill.enabled,
      schedule: existing.schedule || skill.schedule,
      var: existing.var || skill.var,
      model: existing.model || skill.model,
      source: existing.source || skill.source,
    });
  }
  return [...merged.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function titleFromSlug(slug: string) {
  return slug.split(/[-_]/).filter(Boolean).map((part) => part.slice(0, 1).toUpperCase() + part.slice(1)).join(" ");
}

async function fetchA2aSkills(profile: AgentProfile): Promise<RuntimeSkill[]> {
  const base = clean(profile.a2aUrl) || clean(profile.gatewayUrl) || DEFAULT_A2A_URL;
  const response = await fetch(`${base.replace(/\/+$/, "")}/.well-known/agent.json`, {
    cache: "no-store",
    signal: AbortSignal.timeout(4_000),
  });
  if (!response.ok) return [];
  const card = await response.json().catch(() => null) as { skills?: Array<{ id?: string; name?: string; description?: string; tags?: unknown[] }> } | null;
  return (card?.skills ?? []).map((skill) => ({
    slug: (skill.id || skill.name || "skill").replace(/^aeon-/, ""),
    name: skill.name || titleFromSlug((skill.id || "skill").replace(/^aeon-/, "")),
    description: skill.description || "",
    category: skill.tags?.find((tag) => typeof tag === "string" && tag !== "aeon" && tag !== "background-agent") as string | undefined,
    source: "aeon-a2a",
  }));
}

async function readConfig(profile?: AgentProfile) {
  const root = aeonRoot(profile);
  const raw = await readLocalFile(root, "aeon.yml");
  return { root, raw, config: parseAeonConfig(raw) };
}

function schedulesFromConfig(profile: AgentProfile | undefined, config: AeonConfig): RuntimeSchedule[] {
  return Object.entries(config.skills).map(([slug, skill]) => ({
    id: slug,
    runtime: "aeon",
    agentId: profile?.id,
    name: titleFromSlug(slug),
    schedule: skill.schedule || "workflow_dispatch",
    every: skill.schedule || "manual",
    message: skill.var || `Run Aeon skill ${slug}`,
    enabled: skill.enabled,
    lastStatus: undefined,
    source: "aeon.yml",
    metadata: {
      skill: slug,
      model: skill.model || config.model,
      var: skill.var,
    },
  }));
}

async function gh(args: string[], cwd?: string) {
  const { stdout } = await execFileAsync("gh", args, {
    cwd: cwd || process.cwd(),
    timeout: 20_000,
    maxBuffer: 2_000_000,
  });
  return stdout.trim();
}

async function ghWithInput(args: string[], input: string, cwd?: string) {
  return new Promise<string>((resolvePromise, reject) => {
    const child = spawn("gh", args, {
      cwd: cwd || process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`gh ${args.slice(0, 2).join(" ")} timed out`));
    }, 20_000);
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolvePromise(stdout.trim());
        return;
      }
      reject(new Error(stderr.trim() || stdout.trim() || `gh exited with ${code}`));
    });
    child.stdin.end(input);
  });
}

function parseEnv(raw: string) {
  const values: Record<string, string> = {};
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const [rawKey, ...rest] = line.split("=");
    const key = rawKey.replace(/^export\s+/, "").trim();
    if (!ENV_KEY_RE.test(key)) continue;
    let value = rest.join("=").trim();
    if (value.length >= 2 && value[0] === value[value.length - 1] && ["\"", "'"].includes(value[0])) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

async function readEnvSource(path: string) {
  const expanded = resolve(expandHome(path));
  const raw = await readFile(expanded, "utf8").catch(() => "");
  return { path: expanded, values: parseEnv(raw) };
}

async function aeonEnvValues(profile: AgentProfile | undefined) {
  const root = aeonRoot(profile);
  const sources = [
    join(process.cwd(), ".env.local"),
    join(process.cwd(), ".env"),
    join(homedir(), ".omni-agent-hivemind", ".env"),
    join(homedir(), ".aeon", ".env"),
    root ? join(root, ".env") : "",
  ].filter(Boolean);
  const loaded = await Promise.all([...new Set(sources)].map(readEnvSource));
  const values: Record<string, string> = {};
  for (const source of loaded) Object.assign(values, source.values);
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === "string" && ENV_KEY_RE.test(key)) values[key] = value;
  }
  return {
    values,
    sources: loaded.filter((source) => Object.keys(source.values).length > 0).map((source) => source.path),
  };
}

async function syncEnvToGitHubSecrets(profile: AgentProfile, keys: string[] | undefined) {
  const repo = aeonRepo(profile);
  if (!repo) throw new Error("Configure Aeon Repo before syncing env to GitHub secrets.");
  const selectedKeys = [...new Set((keys?.length ? keys : DEFAULT_AEON_SECRET_KEYS)
    .map((key) => key.trim())
    .filter(Boolean))];
  const { values, sources } = await aeonEnvValues(profile);
  const synced: Array<{ key: string }> = [];
  const skipped: Array<{ key: string; reason: string }> = [];

  for (const key of selectedKeys) {
    if (!ENV_KEY_RE.test(key)) {
      skipped.push({ key, reason: "Invalid env key." });
      continue;
    }
    const value = values[key];
    if (!value) {
      skipped.push({ key, reason: "No value found in Hivemind, generic agent, Aeon, repo, or process env stores." });
      continue;
    }
    try {
      await ghWithInput(["secret", "set", key, "-R", repo], value, aeonRoot(profile) || undefined);
      synced.push({ key });
    } catch (error) {
      skipped.push({ key, reason: error instanceof Error ? error.message : "GitHub secret sync failed." });
    }
  }

  return { repo, synced, skipped, sources };
}

function repoArgs(profile?: AgentProfile) {
  const repo = aeonRepo(profile);
  return repo ? ["-R", repo] : [];
}

async function dispatchSkill(profile: AgentProfile | undefined, skill: string) {
  const { config } = await readConfig(profile);
  const skillConfig = config.skills[skill];
  const args = ["workflow", "run", "aeon.yml", ...repoArgs(profile), "--ref", aeonBranch(profile), "-f", `skill=${skill}`];
  if (skillConfig?.var) args.push("-f", `var=${skillConfig.var}`);
  if (skillConfig?.model) args.push("-f", `model=${skillConfig.model}`);
  await gh(args, aeonRoot(profile) || undefined);
  return { dispatched: true, skill };
}

async function setSkillEnabled(profile: AgentProfile | undefined, skill: string, enabled: boolean) {
  const root = aeonRoot(profile);
  if (!root) return { ok: false, error: "Configure an Aeon local path before editing aeon.yml." };
  const path = join(root, "aeon.yml");
  const raw = await readFile(path, "utf8");
  const updated = updateAeonSkillEnabled(raw, skill, enabled);
  if (updated === raw) return { ok: false, error: `Could not find Aeon skill ${skill} in aeon.yml.` };
  const { writeFile } = await import("fs/promises");
  await writeFile(path, updated, "utf8");
  return { ok: true, result: { skill, enabled } };
}

function runStatus(status?: string, conclusion?: string | null): RuntimeRun["status"] {
  if (status === "queued" || status === "requested" || status === "waiting") return "queued";
  if (status === "in_progress") return "active";
  if (status === "completed") return conclusion === "success" ? "completed" : "failed";
  return "unknown";
}

export const aeonAdapter: RuntimeAdapter = {
  runtime: "aeon",
  label: "Aeon",
  kind: "background",
  capabilities: {
    status: true,
    skills: true,
    schedules: true,
    runs: true,
    outputs: true,
    memory: true,
    notifications: true,
    setup: true,
  },
  defaultProfile: {
    gatewayUrl: DEFAULT_A2A_URL,
    a2aUrl: DEFAULT_A2A_URL,
    aeonBranch: DEFAULT_BRANCH,
    aeonMode: "github",
  },
  async getStatus(profile) {
    const root = aeonRoot(profile);
    const repo = aeonRepo(profile);
    const [hasConfig, hasA2a] = await Promise.all([
      root ? canRead(join(root, "aeon.yml")) : Promise.resolve(false),
      fetch(`${(clean(profile.a2aUrl) || clean(profile.gatewayUrl) || DEFAULT_A2A_URL).replace(/\/+$/, "")}/.well-known/agent.json`, {
        cache: "no-store",
        signal: AbortSignal.timeout(1_500),
      }).then((response) => response.ok).catch(() => false),
    ]);
    return {
      ok: Boolean(hasConfig || repo || hasA2a),
      runtime: "aeon",
      kind: "background",
      root,
      repo,
      hasConfig,
      a2aReachable: hasA2a,
    };
  },
  async listSkills(profile, context) {
    const { root, config } = await readConfig(profile);
    const [shared, local, a2a] = await Promise.all([
      sharedBrainSkills(profile, config, context.vaultPath),
      root ? localSkills(root, config) : Promise.resolve([]),
      fetchA2aSkills(profile).catch(() => []),
    ]);
    return mergeSkills(shared, local, a2a);
  },
  async syncSkills(profile, context) {
    return syncSharedBrainSkillsToAeon({
      vaultPath: context.vaultPath,
      aeonLocalPath: aeonRoot(profile),
    });
  },
  async syncEnv(profile, context) {
    return syncEnvToGitHubSecrets(profile, context.keys);
  },
  async listSchedules(profile) {
    const { raw, config } = await readConfig(profile);
    if (!raw.trim()) return [];
    return schedulesFromConfig(profile, config);
  },
  async runScheduleAction(profile, action: RuntimeScheduleAction, jobId) {
    try {
      if (action === "run-now") return { ok: true, result: await dispatchSkill(profile, jobId) };
      if (action === "enable") return setSkillEnabled(profile, jobId, true);
      if (action === "disable") return setSkillEnabled(profile, jobId, false);
      return { ok: false, error: `Unsupported Aeon schedule action: ${action}` };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Aeon schedule action failed." };
    }
  },
  async listRuns(profile) {
    const output = await gh([
      "run",
      "list",
      ...repoArgs(profile),
      "--workflow",
      "aeon.yml",
      "--json",
      "databaseId,displayTitle,status,conclusion,createdAt,updatedAt,url",
      "--limit",
      "30",
    ], aeonRoot(profile) || undefined).catch(() => "[]");
    const parsed = JSON.parse(output || "[]") as Array<Record<string, unknown>>;
    return parsed.map((run): RuntimeRun => ({
      id: String(run.databaseId),
      runtime: "aeon",
      name: String(run.displayTitle || "Aeon run"),
      status: runStatus(String(run.status || ""), typeof run.conclusion === "string" ? run.conclusion : null),
      conclusion: typeof run.conclusion === "string" ? run.conclusion : null,
      createdAt: typeof run.createdAt === "string" ? run.createdAt : undefined,
      updatedAt: typeof run.updatedAt === "string" ? run.updatedAt : undefined,
      url: typeof run.url === "string" ? run.url : undefined,
    }));
  },
  async listOutputs(profile) {
    const root = aeonRoot(profile);
    if (!root) return [];
    const dirs = [join(root, ".outputs"), join(root, "dashboard", "outputs")];
    const groups = await Promise.all(dirs.map(async (dir) => {
      const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
      return Promise.all(entries.filter((entry) => entry.isFile() && /\.(md|json|txt)$/i.test(entry.name)).slice(0, 50).map(async (entry) => {
        const file = join(dir, entry.name);
        const stats = await stat(file).catch(() => null);
        return {
          filename: entry.name,
          skill: basename(entry.name).replace(/\.(md|json|txt)$/i, "").replace(/-\d{4}-\d{2}-\d{2}T.*$/, ""),
          source: dir.endsWith("outputs") ? dirname(file).replace(root, "").replace(/^\//, "") : ".outputs",
          updatedAt: stats?.mtime.toISOString(),
          excerpt: (await readFile(file, "utf8").catch(() => "")).slice(0, 1200),
        };
      }));
    }));
    return groups.flat().sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  },
};
