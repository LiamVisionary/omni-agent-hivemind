import { NextRequest } from "next/server";
import { access, stat } from "fs/promises";
import { constants } from "fs";
import { homedir } from "os";
import { resolve } from "path";

export const runtime = "nodejs";

function expandHome(path: string): string {
  return path.replace(/^~(?=$|\/)/, homedir());
}

export async function POST(request: NextRequest) {
  let vaultPath = "";
  try {
    const body = (await request.json()) as { vaultPath?: string };
    vaultPath = body.vaultPath?.trim() ?? "";
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (!vaultPath) {
    return Response.json({ ok: false, error: "vaultPath is required" }, { status: 400 });
  }

  const resolvedVaultPath = resolve(expandHome(vaultPath));
  const agentsPath = resolve(resolvedVaultPath, "AGENTS.md");

  try {
    const vaultStats = await stat(resolvedVaultPath);
    if (!vaultStats.isDirectory()) {
      return Response.json({ ok: false, vaultPath: resolvedVaultPath, error: "Vault path is not a directory" });
    }

    await access(resolvedVaultPath, constants.R_OK);
    let hasAgentsFile = false;
    try {
      await access(agentsPath, constants.R_OK);
      hasAgentsFile = true;
    } catch {
      hasAgentsFile = false;
    }

    return Response.json({
      ok: true,
      vaultPath: resolvedVaultPath,
      agentsPath,
      hasAgentsFile,
      readable: true,
    });
  } catch (error) {
    return Response.json({
      ok: false,
      vaultPath: resolvedVaultPath,
      error: error instanceof Error ? error.message : "Could not read vault path",
    });
  }
}
