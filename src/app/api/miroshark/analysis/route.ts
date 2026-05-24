import { constants } from "fs";
import { access, mkdir, readFile, stat, writeFile } from "fs/promises";
import { join, resolve } from "path";
import { configuredObsidianVaultPath, expandHomePath, resolveObsidianVaultPath } from "@/lib/services/obsidian/vault-path";
import {
  buildMiroSharkAnalysisMarkdown,
  buildMiroSharkIntelligence,
  safeMiroSharkSlug,
  type MiroSharkAnalysisAgent,
  type MiroSharkAnalysisMarket,
  type MiroSharkAnalysisMode,
  type MiroSharkAnalysisRun,
} from "@/lib/services/miroshark/run-intelligence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ARCHIVE_RELATIVE_DIR = ["Projects", "HivemindOS", "MiroShark Simulations"];

type AnalysisBody = {
  vaultPath?: string;
  mode?: MiroSharkAnalysisMode;
  run?: MiroSharkAnalysisRun;
  rawRun?: unknown;
  market?: MiroSharkAnalysisMarket;
  agent?: MiroSharkAnalysisAgent;
  agentVerdict?: string;
};

function archiveRoot(vaultPath: string) {
  const root = resolve(expandHomePath(vaultPath));
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
  const candidate = resolveObsidianVaultPath(trimmed, { requireWritable: true });
  const paths = archiveRoot(candidate);
  assertInside(paths.vault, paths.archive);
  const vaultStats = await stat(paths.vault);
  if (!vaultStats.isDirectory()) throw new Error("Vault path is not a directory");
  await access(paths.vault, constants.R_OK | constants.W_OK);
  await access(join(paths.vault, "AGENTS.md"), constants.R_OK);
  return paths;
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

async function findRunFolder(archive: string, simulationId: string) {
  const indexPath = join(archive, "_index.json");
  const raw = await readFile(indexPath, "utf8").catch(() => "[]");
  const summaries = JSON.parse(raw) as Array<{ simulationId?: string; folder?: string }>;
  const summary = Array.isArray(summaries) ? summaries.find((item) => item.simulationId === simulationId) : null;
  if (summary?.folder) {
    const folder = resolve(archive, summary.folder);
    assertInside(archive, folder);
    return folder;
  }

  const day = new Date().toISOString().slice(0, 10);
  const folder = resolve(archive, "runs", day.slice(0, 4), day, safeMiroSharkSlug(simulationId));
  assertInside(archive, folder);
  return folder;
}

function modeLabel(mode: MiroSharkAnalysisMode) {
  return mode.replace(/-/g, "-");
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as AnalysisBody;
    if (!body.run?.id) throw new Error("run.id is required");
    const mode = body.mode ?? "verdict";
    const { archive } = await validateVault(body.vaultPath);
    await mkdir(archive, { recursive: true });
    const runDir = await findRunFolder(archive, body.run.id);
    const analysesDir = join(runDir, "analyses");
    await mkdir(analysesDir, { recursive: true });

    const intelligence = buildMiroSharkIntelligence(body.run, body.market);
    const savedAt = localIsoTimestamp();
    const agentSlug = safeMiroSharkSlug(body.agent?.name ?? "agent");
    const filename = `${savedAt.replace(/[:.]/g, "-")}-${agentSlug}-${modeLabel(mode)}.md`;
    const notePath = join(analysesDir, filename);
    assertInside(archive, notePath);

    const note = buildMiroSharkAnalysisMarkdown({
      mode,
      run: body.run,
      market: body.market,
      agent: body.agent,
      agentVerdict: body.agentVerdict,
      intelligence,
    });
    await writeFile(notePath, note, "utf8");

    if (body.rawRun !== undefined) {
      await writeFile(join(runDir, "latest-analysis-input.json"), `${JSON.stringify({
        savedAt,
        mode,
        agent: body.agent,
        run: body.run,
        market: body.market,
        rawRun: body.rawRun,
      }, null, 2)}\n`, "utf8");
    }

    const relativeNotePath = notePath.slice(resolve(archive, "..", "..", "..").length + 1);
    return Response.json({
      ok: true,
      savedAt,
      notePath,
      relativeNotePath,
      intelligence,
      message: `Saved ${mode.replace(/-/g, " ")} analysis to Obsidian.`,
    });
  } catch (error) {
    return Response.json({
      ok: false,
      error: error instanceof Error ? error.message : "Could not analyze MiroShark run",
    }, { status: 400 });
  }
}
