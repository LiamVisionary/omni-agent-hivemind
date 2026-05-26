import { NextRequest, NextResponse } from "next/server";
import { getGbrainStatus } from "@/lib/services/brain/gbrain";
import type { GBrainConfig } from "@/lib/types/agent-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const gbrain: Partial<GBrainConfig> = {};
    if (params.has("enabled")) gbrain.enabled = params.get("enabled") === "true";
    if (params.has("cliPath")) gbrain.cliPath = params.get("cliPath") ?? undefined;
    if (params.has("installPath")) gbrain.installPath = params.get("installPath") ?? undefined;
    if (params.has("brainPath")) gbrain.brainPath = params.get("brainPath") ?? undefined;
    if (params.has("dataDir")) gbrain.dataDir = params.get("dataDir") ?? undefined;
    if (params.has("mcpMode")) gbrain.mcpMode = params.get("mcpMode") as GBrainConfig["mcpMode"];
    if (params.has("httpUrl")) gbrain.httpUrl = params.get("httpUrl") ?? undefined;
    if (params.has("searchMode")) gbrain.searchMode = params.get("searchMode") as GBrainConfig["searchMode"];
    if (params.has("providerPolicy")) gbrain.providerPolicy = params.get("providerPolicy") as GBrainConfig["providerPolicy"];
    if (params.has("skillpackLocation")) gbrain.skillpackLocation = params.get("skillpackLocation") ?? undefined;
    const status = await getGbrainStatus({
      vaultPath: params.get("vaultPath") ?? undefined,
      brainServicesFolder: params.get("brainServicesFolder") ?? undefined,
      gbrain,
    });
    return NextResponse.json({ ok: true, status });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Could not read GBrain status.",
    }, { status: 500 });
  }
}
