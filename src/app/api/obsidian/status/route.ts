import { NextRequest } from "next/server";
import { access, stat } from "fs/promises";
import { constants } from "fs";
import { resolve } from "path";
import {
  configuredObsidianVaultPath,
  expandHomePath,
  LEGACY_OBSIDIAN_VAULT_PATH,
  resolveObsidianVaultPath,
} from "@/lib/services/obsidian/vault-path";

export const runtime = "nodejs";

function expandHome(path: string): string {
  return expandHomePath(path);
}

async function checkVaultPath(vaultPath: string) {
  const resolvedVaultPath = resolve(expandHome(vaultPath));
  const agentsPath = resolve(resolvedVaultPath, "AGENTS.md");
  const vaultStats = await stat(resolvedVaultPath);
  if (!vaultStats.isDirectory()) {
    return { ok: false as const, vaultPath: resolvedVaultPath, error: "Vault path is not a directory" };
  }

  await access(resolvedVaultPath, constants.R_OK);
  let hasAgentsFile = false;
  try {
    await access(agentsPath, constants.R_OK);
    hasAgentsFile = true;
  } catch {
    hasAgentsFile = false;
  }

  return {
    ok: true as const,
    vaultPath: resolvedVaultPath,
    agentsPath,
    hasAgentsFile,
    readable: true,
  };
}

export async function POST(request: NextRequest) {
  let vaultPath = "";
  try {
    const body = (await request.json()) as { vaultPath?: string };
    vaultPath = body.vaultPath?.trim() ?? "";
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const requestedVaultPath = vaultPath || configuredObsidianVaultPath();
  const resolvedVaultPath = resolveObsidianVaultPath(vaultPath);
  const fallbackVaultPath = requestedVaultPath === LEGACY_OBSIDIAN_VAULT_PATH || requestedVaultPath.endsWith("/Omni Agent Vault")
    ? configuredObsidianVaultPath()
    : "";

  try {
    const result = await checkVaultPath(resolvedVaultPath);
    return Response.json({
      ...result,
      detected: resolve(expandHome(requestedVaultPath)) !== result.vaultPath,
    });
  } catch (error) {
    if (fallbackVaultPath) {
      try {
        const fallback = await checkVaultPath(resolveObsidianVaultPath(fallbackVaultPath));
        return Response.json({
          ...fallback,
          migratedFrom: resolve(expandHome(requestedVaultPath)),
        });
      } catch {
        // Fall through to the original error so the user sees what failed.
      }
    }
    return Response.json({
      ok: false,
      vaultPath: resolve(expandHome(requestedVaultPath)),
      error: error instanceof Error ? error.message : "Could not read vault path",
    });
  }
}
