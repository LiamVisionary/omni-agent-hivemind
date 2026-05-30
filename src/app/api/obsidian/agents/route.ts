import { NextRequest, NextResponse } from "next/server";
import type { AgentProfile } from "@/lib/types/agent-runtime";
import { mirrorAgentProfilesToVault, readVaultAgentProfiles } from "@/lib/services/obsidian/agent-profiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const vaultPath = request.nextUrl.searchParams.get("vaultPath") || undefined;
    const agents = await readVaultAgentProfiles(vaultPath);
    return NextResponse.json({ ok: true, agents });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Could not read Obsidian agent profiles.",
    }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { vaultPath?: string; agents?: AgentProfile[] };
    const agents = Array.isArray(body.agents) ? body.agents : [];
    const result = await mirrorAgentProfilesToVault({ vaultPath: body.vaultPath, agents });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Could not mirror agent profiles to Obsidian.",
    }, { status: 400 });
  }
}
