import { NextRequest, NextResponse } from "next/server";
import type { AgentProfile } from "@/lib/types/agent-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { agent?: AgentProfile; sessionId?: string };
    const telemetryUrl = body.agent?.telemetryUrl?.trim().replace(/\/+$/, "");
    const sessionId = body.sessionId?.trim();
    if (!telemetryUrl || !sessionId) {
      return NextResponse.json({ ok: false, error: "Expected { agent.telemetryUrl, sessionId }." }, { status: 400 });
    }
    const url = `${telemetryUrl}/sessions?sessionId=${encodeURIComponent(sessionId)}`;
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8_000) });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.ok) {
      return NextResponse.json({ ok: false, error: data?.error || `Collector returned ${response.status}` }, { status: response.ok ? 502 : response.status });
    }
    return NextResponse.json({ ok: true, session: data.session });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Could not read agent session.",
    }, { status: 502 });
  }
}
