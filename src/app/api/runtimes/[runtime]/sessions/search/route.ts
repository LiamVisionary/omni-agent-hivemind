import { NextRequest, NextResponse } from "next/server";
import type { AgentRuntime } from "@/lib/types/agent-runtime";
import { searchRuntimeSessions } from "@/lib/services/runtime-integrations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validRuntime(value: string): value is AgentRuntime {
  return value === "openclaw" || value === "hermes" || value === "aeon";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runtime: string }> },
) {
  const { runtime } = await params;
  if (!validRuntime(runtime)) {
    return NextResponse.json({ ok: false, error: `Unknown runtime: ${runtime}` }, { status: 404 });
  }
  const query = request.nextUrl.searchParams.get("q") ?? "";
  const limit = Math.max(1, Math.min(100, Number(request.nextUrl.searchParams.get("limit")) || 20));
  try {
    const sessions = await searchRuntimeSessions(runtime, query, limit);
    return NextResponse.json({ ok: true, runtime, sessions });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Runtime session search failed." }, { status: 502 });
  }
}
