import { NextResponse } from "next/server";

import { collectMemoryTelemetry } from "@/lib/services/runtime-memory-telemetry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let inFlightTelemetry: Promise<Awaited<ReturnType<typeof collectMemoryTelemetry>>> | null = null;

export async function GET() {
  try {
    inFlightTelemetry ??= collectMemoryTelemetry().finally(() => {
      inFlightTelemetry = null;
    });
    return NextResponse.json(await inFlightTelemetry);
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Could not read memory telemetry.",
    }, { status: 502 });
  }
}
