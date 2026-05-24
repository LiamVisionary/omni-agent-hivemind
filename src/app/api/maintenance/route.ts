import { NextRequest, NextResponse } from "next/server";
import type { AgentProfile, SharedVaultConfig } from "@/lib/types/agent-runtime";
import { readMaintenanceReport, runMaintenanceRepair } from "@/lib/services/runtime-maintenance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as {
    action?: string;
    agents?: AgentProfile[];
    sharedVault?: SharedVaultConfig;
  };
  try {
    if (body.action) {
      return NextResponse.json(await runMaintenanceRepair(body.action, { sharedVault: body.sharedVault }));
    }
    return NextResponse.json(await readMaintenanceReport({
      agents: Array.isArray(body.agents) ? body.agents : [],
      sharedVault: body.sharedVault,
    }));
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Maintenance action failed.",
    }, { status: 502 });
  }
}
