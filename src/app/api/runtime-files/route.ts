import { NextRequest, NextResponse } from "next/server";
import type { AgentProfile, SharedVaultConfig } from "@/lib/types/agent-runtime";
import { listRuntimeFiles, readRuntimeFile, runtimeFileRoots, writeRuntimeFile } from "@/lib/services/runtime-file-explorer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as {
    action?: "roots" | "list" | "read" | "write";
    agents?: AgentProfile[];
    sharedVault?: SharedVaultConfig;
    rootKey?: string;
    path?: string;
    content?: string;
  };
  const roots = runtimeFileRoots({
    agents: Array.isArray(body.agents) ? body.agents : [],
    sharedVault: body.sharedVault,
    cwd: process.cwd(),
  });
  try {
    if (!body.action || body.action === "roots") return NextResponse.json({ ok: true, roots });
    if (body.action === "list") {
      return NextResponse.json({ ok: true, roots, files: await listRuntimeFiles(roots, body.rootKey || roots[0]?.key || "", body.path || "") });
    }
    if (body.action === "read") {
      return NextResponse.json({ ok: true, roots, file: await readRuntimeFile(roots, body.rootKey || "", body.path || "") });
    }
    if (body.action === "write") {
      return NextResponse.json({ ok: true, roots, file: await writeRuntimeFile(roots, body.rootKey || "", body.path || "", String(body.content ?? "")) });
    }
    return NextResponse.json({ ok: false, error: "Unknown file action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      roots,
      error: error instanceof Error ? error.message : "Runtime file action failed.",
    }, { status: 400 });
  }
}
