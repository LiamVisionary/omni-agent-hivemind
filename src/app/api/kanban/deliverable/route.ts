import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, isAbsolute } from "node:path";
import { platform } from "node:os";
import { promisify } from "node:util";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const execFileAsync = promisify(execFile);

type DeliverableAction = "open" | "reveal";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { action?: DeliverableAction; path?: string; url?: string };
    const action = body.action === "reveal" ? "reveal" : "open";
    const target = cleanTarget(body.path || body.url || "");
    if (!target) throw new Error("Deliverable path or URL is required.");
    if (/^https?:\/\//i.test(target)) {
      if (action === "reveal") throw new Error("Web URLs can be opened, but not revealed in the file manager.");
      await openTarget(target);
      return NextResponse.json({ ok: true });
    }
    const path = target.startsWith("file://") ? decodeURIComponent(new URL(target).pathname) : target;
    if (!isAbsolute(path)) throw new Error("Deliverable file paths must be absolute.");
    if (!existsSync(path)) throw new Error("Deliverable does not exist on this machine.");
    if (action === "reveal") await revealPath(path);
    else await openTarget(path);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Could not open deliverable.",
    }, { status: 400 });
  }
}

function cleanTarget(value: string) {
  return String(value || "").trim().replace(/[\0\r\n]/g, "");
}

async function openTarget(target: string) {
  const os = platform();
  if (os === "darwin") return execFileAsync("open", [target], { timeout: 10_000 });
  if (os === "win32") return execFileAsync("cmd", ["/c", "start", "", target], { timeout: 10_000 });
  return execFileAsync("xdg-open", [target], { timeout: 10_000 });
}

async function revealPath(path: string) {
  const os = platform();
  if (os === "darwin") return execFileAsync("open", ["-R", path], { timeout: 10_000 });
  if (os === "win32") return execFileAsync("explorer.exe", ["/select,", path], { timeout: 10_000 });
  return execFileAsync("xdg-open", [dirname(path)], { timeout: 10_000 });
}
