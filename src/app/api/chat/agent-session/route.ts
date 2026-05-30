import { NextRequest, NextResponse } from "next/server";
import type { AgentProfile } from "@/lib/types/agent-runtime";
import { readRuntimeChatSession } from "@/lib/services/chat/runtime-session-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { agent?: AgentProfile; sessionId?: string; sinceMs?: number; chatStorageKey?: string };
    const telemetryUrl = body.agent?.telemetryUrl?.trim().replace(/\/+$/, "");
    const sessionId = body.sessionId?.trim();
    const sinceMs = Number(body.sinceMs || 0);
    const chatStorageKey = body.chatStorageKey?.trim();
    if (!body.agent || (!sessionId && !sinceMs && !chatStorageKey)) {
      return NextResponse.json({ ok: false, error: "Expected { agent, sessionId }, { agent, sinceMs }, or { agent, chatStorageKey }." }, { status: 400 });
    }
    const fallbackSession = () => readRuntimeChatSession({
      sessionId,
      sinceMs,
      chatStorageKey,
      runtime: body.agent?.runtime?.trim(),
      agentId: body.agent?.id?.trim() || body.agent?.agentId?.trim(),
    });
    if (!telemetryUrl) {
      const session = await fallbackSession();
      if (session) return NextResponse.json({ ok: true, session });
      return NextResponse.json({ ok: false, error: "No runtime session found." }, { status: 404 });
    }
    const buildUrl = (pathname: string) => {
      const url = new URL(`${telemetryUrl}${pathname}`);
      if (sessionId) url.searchParams.set("sessionId", sessionId);
      if (sinceMs) url.searchParams.set("sinceMs", String(sinceMs));
      if (chatStorageKey) url.searchParams.set("chatStorageKey", chatStorageKey);
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
      const session = await fallbackSession();
      if (session) return NextResponse.json({ ok: true, session });
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
