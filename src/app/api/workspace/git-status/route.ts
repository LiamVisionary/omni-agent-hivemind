import { execFile } from "child_process";
import { stat } from "fs/promises";
import { resolve } from "path";
import { promisify } from "util";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

async function gitSnapshot(cwd: string) {
  const dir = resolve(cwd);
  const pathStats = await stat(dir);
  if (!pathStats.isDirectory()) throw new Error("Workspace path is not a directory.");
  const [head, status] = await Promise.all([
    execFileAsync("git", ["-C", dir, "rev-parse", "HEAD"], { timeout: 5_000 }).then(({ stdout }) => stdout.trim()),
    execFileAsync("git", ["-C", dir, "status", "--porcelain"], { timeout: 5_000, maxBuffer: 500_000 }).then(({ stdout }) => stdout.trim()),
  ]);
  return {
    cwd: dir,
    head,
    dirty: status.length > 0,
    statusLines: status ? status.split("\n").slice(0, 50) : [],
    signature: `${head}:${status}`,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({})) as { cwd?: string };
    if (!body.cwd?.trim()) return Response.json({ ok: false, error: "cwd is required." }, { status: 400 });
    return Response.json({ ok: true, snapshot: await gitSnapshot(body.cwd) });
  } catch (error) {
    return Response.json({
      ok: false,
      error: error instanceof Error ? error.message : "Could not inspect workspace git status.",
    }, { status: 400 });
  }
}
