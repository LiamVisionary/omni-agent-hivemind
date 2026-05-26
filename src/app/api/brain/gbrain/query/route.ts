import { NextRequest, NextResponse } from "next/server";
import { queryGbrain } from "@/lib/services/brain/gbrain";
import type { GBrainConfig } from "@/lib/types/agent-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({})) as {
      vaultPath?: string;
      brainServicesFolder?: string;
      gbrain?: Partial<GBrainConfig>;
      query?: string;
      mode?: "search" | "query" | "think";
    };
    const result = await queryGbrain(body);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Could not query GBrain.",
    }, { status: 500 });
  }
}
