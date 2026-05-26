import { NextRequest, NextResponse } from "next/server";
import { installTradingBrain } from "@/lib/services/brain/trading-brain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({})) as { vaultPath?: string; brainServicesFolder?: string };
    const result = await installTradingBrain(body);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Could not install Trading Brain.",
    }, { status: 500 });
  }
}
