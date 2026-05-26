import { NextRequest, NextResponse } from "next/server";
import { getTradingBrainStatus } from "@/lib/services/brain/trading-brain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const status = await getTradingBrainStatus({
      vaultPath: params.get("vaultPath") ?? undefined,
      brainServicesFolder: params.get("brainServicesFolder") ?? undefined,
    });
    return NextResponse.json({ ok: true, status });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Could not read Trading Brain status.",
    }, { status: 500 });
  }
}
