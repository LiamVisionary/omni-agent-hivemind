import { NextRequest, NextResponse } from "next/server";
import { connectGbrain, scaffoldGbrainSkillpack } from "@/lib/services/brain/gbrain";
import type { GBrainConfig } from "@/lib/types/agent-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({})) as { vaultPath?: string; brainServicesFolder?: string; gbrain?: Partial<GBrainConfig>; scaffoldSkillpack?: boolean };
    const connected = await connectGbrain(body);
    const skillpack = body.scaffoldSkillpack === false ? null : await scaffoldGbrainSkillpack(body).catch((error) => ({
      error: error instanceof Error ? error.message : "Could not scaffold GBrain skillpack.",
    }));
    return NextResponse.json({ ok: true, ...connected, skillpack });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Could not connect GBrain.",
    }, { status: 500 });
  }
}
