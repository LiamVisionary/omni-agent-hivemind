import { access, mkdir, readFile, readdir, stat, writeFile } from "fs/promises";
import { constants } from "fs";
import { join, resolve } from "path";
import {
  configuredObsidianVaultPath,
  expandHomePath,
  resolveObsidianVaultPath,
} from "@/lib/services/obsidian/vault-path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ArchivedRunBody = {
  vaultPath?: string;
  scenario?: string;
  run?: {
    simulationId?: string;
    projectId?: string;
    graphId?: string;
    platform?: string;
    rounds?: number;
    status?: string;
    step?: string;
    runStatus?: unknown;
    actions?: unknown;
    posts?: unknown;
    timeline?: unknown;
    links?: Record<string, string>;
    [key: string]: unknown;
  };
};

type RunSummary = {
  simulationId: string;
  projectId?: string;
  graphId?: string;
  platform?: string;
  status?: string;
  scenario?: string;
  rounds?: number;
  postCount: number;
  savedAt: string;
  folder: string;
};

const ARCHIVE_RELATIVE_DIR = ["Projects", "Omni-Agent Hivemind", "MiroShark Simulations"];
const INDEX_JSON = "_index.json";
const INDEX_MD = "index.md";
function expandHome(value: string) {
  return expandHomePath(value);
}

function slug(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 96) || "run";
}

function localIsoTimestamp() {
  const now = new Date();
  const offsetMinutes = -now.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absolute = Math.abs(offsetMinutes);
  const hours = String(Math.floor(absolute / 60)).padStart(2, "0");
  const minutes = String(absolute % 60).padStart(2, "0");
  const local = new Date(now.getTime() + offsetMinutes * 60_000).toISOString().replace("Z", "");
  return `${local}${sign}${hours}:${minutes}`;
}

function archiveRoot(vaultPath: string) {
  const root = resolve(expandHome(vaultPath));
  return {
    vault: root,
    archive: resolve(root, ...ARCHIVE_RELATIVE_DIR),
  };
}

function assertInside(parent: string, child: string) {
  const normalizedParent = parent.endsWith("/") ? parent : `${parent}/`;
  if (child !== parent && !child.startsWith(normalizedParent)) {
    throw new Error("Archive path escaped the selected vault");
  }
}

async function validateVault(vaultPath?: string) {
  const trimmed = vaultPath?.trim() || configuredObsidianVaultPath();
  const candidatePaths = [
    resolveObsidianVaultPath(trimmed, { requireWritable: true }),
  ];
  let lastError: unknown;
  for (const candidate of candidatePaths) {
    try {
      const paths = archiveRoot(candidate);
      assertInside(paths.vault, paths.archive);
      const vaultStats = await stat(paths.vault);
      if (!vaultStats.isDirectory()) throw new Error("Vault path is not a directory");
      await access(paths.vault, constants.R_OK | constants.W_OK);
      await access(join(paths.vault, "AGENTS.md"), constants.R_OK);
      return paths;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError instanceof Error) throw lastError;
  throw new Error("Could not read vault path");
}

function postsFromRun(run: ArchivedRunBody["run"]) {
  const data = (run?.posts as { data?: { posts?: Array<Record<string, unknown>>; count?: number } } | undefined)?.data;
  return Array.isArray(data?.posts) ? data.posts : [];
}

function visibleText(post: Record<string, unknown>) {
  return String(post.quote_content || post.content || "").trim();
}

function runStatus(run: ArchivedRunBody["run"]) {
  return postsFromRun(run).some((post) => visibleText(post))
    ? "complete"
    : "saved";
}

function normalizeSummary(summary: RunSummary): RunSummary {
  return {
    ...summary,
    status: summary.postCount > 0 ? "complete" : summary.status ?? "saved",
  };
}

function mdEscape(value: unknown) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\n+/g, " ").trim();
}

function buildRunMarkdown(summary: RunSummary, body: ArchivedRunBody) {
  const posts = postsFromRun(body.run);
  const links = body.run?.links ?? {};
  const lines = [
    "---",
    "type: miroshark-simulation",
    `simulation_id: ${summary.simulationId}`,
    `saved_at: ${summary.savedAt}`,
    `platform: ${summary.platform ?? "unknown"}`,
    `status: ${summary.status ?? "unknown"}`,
    "---",
    "",
    `# MiroShark Simulation ${summary.simulationId}`,
    "",
    "## Summary",
    "",
    `- Scenario: ${body.scenario?.trim() || "Not recorded"}`,
    `- Platform: ${summary.platform ?? "unknown"}`,
    `- Status: ${summary.status ?? "unknown"}`,
    `- Rounds: ${summary.rounds ?? "unknown"}`,
    `- Visible posts: ${summary.postCount}`,
    `- Project: ${summary.projectId ?? "unknown"}`,
    `- Graph: ${summary.graphId ?? "unknown"}`,
    "",
  ];

  if (Object.keys(links).length) {
    lines.push("## MiroShark Links", "");
    for (const [label, href] of Object.entries(links)) lines.push(`- [${label}](${href})`);
    lines.push("");
  }

  lines.push("## Posts", "");
  if (!posts.length) {
    lines.push("No posts captured yet.", "");
  } else {
    posts.forEach((post, index) => {
      const text = visibleText(post);
      if (!text) return;
      const user = post.user_id ?? "?";
      const postId = post.post_id ?? index + 1;
      const tick = post.created_at ?? "?";
      lines.push(`### User ${user} · post #${postId}`);
      lines.push("");
      lines.push(`- Tick: ${tick}`);
      lines.push("");
      lines.push(text);
      lines.push("");
    });
  }

  lines.push("## Exact Data", "", "See `run.json`, `posts.json`, and `timeline.json` in this folder.");
  return `${lines.join("\n").trimEnd()}\n`;
}

function buildPostsMarkdown(summary: RunSummary, body: ArchivedRunBody) {
  const posts = postsFromRun(body.run);
  const lines = [
    `# Posts - ${summary.simulationId}`,
    "",
    "| Post | User | Tick | Text |",
    "| --- | --- | --- | --- |",
  ];
  posts.forEach((post, index) => {
    const text = visibleText(post);
    if (!text) return;
    lines.push(`| ${mdEscape(post.post_id ?? index + 1)} | ${mdEscape(post.user_id ?? "?")} | ${mdEscape(post.created_at ?? "?")} | ${mdEscape(text)} |`);
  });
  return `${lines.join("\n").trimEnd()}\n`;
}

async function readIndex(archiveDir: string): Promise<RunSummary[]> {
  const raw = await readFile(join(archiveDir, INDEX_JSON), "utf8").catch(() => "[]");
  try {
    const parsed = JSON.parse(raw) as RunSummary[];
    return Array.isArray(parsed) ? parsed.map(normalizeSummary) : [];
  } catch {
    return [];
  }
}

async function writeIndex(archiveDir: string, summaries: RunSummary[]) {
  const ordered = summaries
    .filter((summary) => summary.simulationId)
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  await writeFile(join(archiveDir, INDEX_JSON), `${JSON.stringify(ordered, null, 2)}\n`, "utf8");
  const md = [
    "# MiroShark Simulations",
    "",
    "Durable archive of Hivemind-launched MiroShark swarm runs.",
    "",
    "| Saved | Simulation | Platform | Status | Posts | Scenario |",
    "| --- | --- | --- | --- | ---: | --- |",
    ...ordered.map((summary) => (
      `| ${mdEscape(summary.savedAt)} | [[${summary.folder}/run|${mdEscape(summary.simulationId)}]] | ${mdEscape(summary.platform ?? "")} | ${mdEscape(summary.status ?? "")} | ${summary.postCount} | ${mdEscape(summary.scenario ?? "")} |`
    )),
  ].join("\n");
  await writeFile(join(archiveDir, INDEX_MD), `${md.trimEnd()}\n`, "utf8");
}

async function fallbackSummaries(archiveDir: string): Promise<RunSummary[]> {
  const summaries: RunSummary[] = [];
  const years = await readdir(join(archiveDir, "runs"), { withFileTypes: true }).catch(() => []);
  for (const year of years) {
    if (!year.isDirectory()) continue;
    const days = await readdir(join(archiveDir, "runs", year.name), { withFileTypes: true }).catch(() => []);
    for (const day of days) {
      if (!day.isDirectory()) continue;
      const runs = await readdir(join(archiveDir, "runs", year.name, day.name), { withFileTypes: true }).catch(() => []);
      for (const runDir of runs) {
        if (!runDir.isDirectory()) continue;
        const raw = await readFile(join(archiveDir, "runs", year.name, day.name, runDir.name, "summary.json"), "utf8").catch(() => "");
        if (!raw) continue;
        try {
          summaries.push(normalizeSummary(JSON.parse(raw) as RunSummary));
        } catch {
          // Ignore malformed archive entries; exact run JSON remains untouched.
        }
      }
    }
  }
  return summaries.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { archive } = await validateVault(searchParams.get("vaultPath") ?? undefined);
    await mkdir(archive, { recursive: true });
    const simulationId = searchParams.get("simulation_id");
    if (simulationId) {
      const indexed = await readIndex(archive);
      const summaries = indexed.length ? indexed : await fallbackSummaries(archive);
      const summary = summaries.find((item) => item.simulationId === simulationId);
      if (!summary) return Response.json({ ok: false, error: "Simulation archive not found" }, { status: 404 });
      const folder = resolve(archive, summary.folder);
      assertInside(archive, folder);
      const run = JSON.parse(await readFile(join(folder, "run.json"), "utf8")) as unknown;
      return Response.json({ ok: true, summary, run });
    }

    const indexed = await readIndex(archive);
    const runs = indexed.length ? indexed : await fallbackSummaries(archive);
    if (!indexed.length && runs.length) await writeIndex(archive, runs);
    return Response.json({ ok: true, archivePath: archive, runs });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Could not read MiroShark archive" }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as ArchivedRunBody;
    const simulationId = body.run?.simulationId?.trim();
    if (!simulationId) throw new Error("simulationId is required");
    const { archive } = await validateVault(body.vaultPath);
    await mkdir(archive, { recursive: true });

    const savedAt = localIsoTimestamp();
    const day = savedAt.slice(0, 10);
    const folder = join("runs", day.slice(0, 4), day, slug(simulationId));
    const runDir = resolve(archive, folder);
    assertInside(archive, runDir);
    await mkdir(runDir, { recursive: true });

    const posts = postsFromRun(body.run).filter((post) => visibleText(post));
    const summary: RunSummary = {
      simulationId,
      projectId: body.run?.projectId,
      graphId: body.run?.graphId,
      platform: body.run?.platform,
      status: runStatus(body.run),
      scenario: body.scenario?.trim(),
      rounds: body.run?.rounds,
      postCount: posts.length,
      savedAt,
      folder,
    };

    const exactRun = {
      savedAt,
      scenario: body.scenario?.trim() ?? "",
      run: body.run,
    };
    await writeFile(join(runDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
    await writeFile(join(runDir, "run.json"), `${JSON.stringify(exactRun, null, 2)}\n`, "utf8");
    await writeFile(join(runDir, "posts.json"), `${JSON.stringify(posts, null, 2)}\n`, "utf8");
    await writeFile(join(runDir, "timeline.json"), `${JSON.stringify(body.run?.timeline ?? null, null, 2)}\n`, "utf8");
    await writeFile(join(runDir, "run.md"), buildRunMarkdown(summary, body), "utf8");
    await writeFile(join(runDir, "posts.md"), buildPostsMarkdown(summary, body), "utf8");

    const current = await readIndex(archive);
    const next = [summary, ...current.filter((item) => item.simulationId !== simulationId)];
    await writeIndex(archive, next);
    return Response.json({ ok: true, archivePath: archive, summary });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Could not save MiroShark archive" }, { status: 400 });
  }
}
