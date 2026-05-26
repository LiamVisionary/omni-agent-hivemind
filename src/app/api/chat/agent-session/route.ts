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
    const buildUrl = (pathname: string) => {
      const url = new URL(`${telemetryUrl}${pathname}`);
      url.searchParams.set("sessionId", sessionId);
      if (body.agent?.runtime?.trim()) url.searchParams.set("runtime", body.agent.runtime.trim());
      if (body.agent?.localDataDir?.trim()) url.searchParams.set("localDataDir", body.agent.localDataDir.trim());
      return url;
    };
    let response = await fetch(buildUrl("/runtime-sessions"), { cache: "no-store", signal: AbortSignal.timeout(8_000) });
    let data = await response.json().catch(() => null);
    if (response.status === 404 && !data?.ok) {
      response = await fetch(buildUrl("/sessions"), { cache: "no-store", signal: AbortSignal.timeout(8_000) });
      data = await response.json().catch(() => null);
    }
    if (!response.ok || !data?.ok) {
      return NextResponse.json({ ok: false, error: data?.error || `Agent bridge returned ${response.status}` }, { status: response.ok ? 502 : response.status });
    }
    return NextResponse.json({ ok: true, session: data.session });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Could not read agent session.",
    }, { status: 502 });
  }
}
