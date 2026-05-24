import { NextResponse } from "next/server";
import { readRuntimeUsageAnalytics } from "@/lib/services/runtime-usage-analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await readRuntimeUsageAnalytics());
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Could not read runtime usage.",
    }, { status: 502 });
  }
}
