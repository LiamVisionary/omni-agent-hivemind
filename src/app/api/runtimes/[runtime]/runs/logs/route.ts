import { NextRequest, NextResponse } from "next/server";
import type { AgentProfile, AgentRuntime } from "@/lib/types/agent-runtime";
import { getRuntimeAdapter } from "@/lib/services/runtime-adapters/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ runtime: string }> },
) {
  const { runtime } = await params;
  const runtimeId = runtime as AgentRuntime;
  const adapter = getRuntimeAdapter(runtimeId);
  if (!adapter?.getRunLog) {
    return NextResponse.json({ ok: false, error: `${adapter?.label ?? runtimeId} does not expose run logs.` }, { status: 501 });
  }
  const body = await request.json().catch(() => ({})) as { agent?: AgentProfile; runId?: string };
  if (!body.runId) return NextResponse.json({ ok: false, error: "runId is required" }, { status: 400 });
  try {
    const log = await adapter.getRunLog(body.agent ?? ({ runtime: runtimeId } as AgentProfile), body.runId, {
      requestUrl: request.url,
      agents: body.agent ? [body.agent] : [],
    });
    return NextResponse.json({ ok: true, runtime: runtimeId, log });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Runtime run log failed." }, { status: 502 });
  }
}
