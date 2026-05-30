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
  if (!adapter) {
    return NextResponse.json({ ok: false, error: `Unknown runtime: ${runtime}` }, { status: 404 });
  }

  const body = await request.json().catch(() => ({})) as { agent?: AgentProfile; keys?: string[]; all?: boolean };
  if (!adapter?.syncEnv) {
    return NextResponse.json({ ok: false, error: `${adapter?.label ?? runtimeId} does not expose env sync.` }, { status: 501 });
  }
  if (!body.agent) {
    return NextResponse.json({ ok: false, error: "agent is required" }, { status: 400 });
  }

  try {
    const result = await adapter.syncEnv(body.agent, {
      requestUrl: request.url,
      agents: [body.agent],
      keys: Array.isArray(body.keys) ? body.keys : undefined,
      allSharedEnv: body.all === true,
    });
    return NextResponse.json({ ok: true, runtime: runtimeId, result });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Runtime env sync failed." }, { status: 502 });
  }
}
