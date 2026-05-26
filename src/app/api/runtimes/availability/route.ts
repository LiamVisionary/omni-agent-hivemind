import { NextResponse } from "next/server";
import { readRuntimeAvailability } from "@/lib/services/runtime-availability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ ok: true, runtimes: await readRuntimeAvailability() });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Runtime availability check failed.",
    }, { status: 502 });
  }
}
