import { NextRequest, NextResponse } from "next/server";
import { fleetSkillCollectors } from "@/lib/services/fleet/remote-skill-providers";
import type { BrainSkillProviderAutoSyncPolicy, BrainSkillProviderId } from "@/lib/services/obsidian/brain-skills";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({})) as {
      vaultPath?: string;
      policies?: Partial<Record<BrainSkillProviderId, BrainSkillProviderAutoSyncPolicy>>;
    };
    const collectors = await fleetSkillCollectors(request);
    const dashboardUrl = new URL("/", request.url).origin;
    const results = await Promise.all(collectors.map(async (collector) => {
      const response = await fetch(`${collector.url}/skills/auto-sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vaultPath: body.vaultPath,
          dashboardUrl,
          policies: body.policies ?? {},
        }),
        signal: AbortSignal.timeout(12_000),
      }).catch((error) => ({ ok: false, error } as const));
      if ("error" in response) {
        return { machineName: collector.machineName, ok: false, error: response.error instanceof Error ? response.error.message : "Agent bridge unavailable." };
      }
      const payload = await response.json().catch(() => null) as { ok?: boolean; error?: string } | null;
      return {
        machineName: collector.machineName,
        ok: response.ok && payload?.ok !== false,
        error: response.ok ? payload?.error : `HTTP ${response.status}`,
      };
    }));
    return NextResponse.json({ ok: true, collectors: results });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Could not configure skill auto-sync.",
    }, { status: 400 });
  }
}
