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
  if (!["openclaw", "hermes", "aeon"].includes(runtime)) {
    return NextResponse.json({ ok: false, error: `Unknown runtime: ${runtime}` }, { status: 404 });
  }
  const runtimeId = runtime as AgentRuntime;
  const body = await request.json().catch(() => ({})) as { agent?: AgentProfile };
  const adapter = getRuntimeAdapter(runtimeId);
  if (!adapter?.listSchedules) {
    return NextResponse.json({ ok: false, error: `${adapter?.label ?? runtimeId} does not expose schedules.` }, { status: 501 });
  }
  try {
    const schedules = await adapter.listSchedules(body.agent ?? ({ runtime: runtimeId } as AgentProfile), {
      requestUrl: request.url,
      agents: body.agent ? [body.agent] : [],
    });
    return NextResponse.json({ ok: true, runtime: runtimeId, schedules });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Runtime schedules failed." }, { status: 502 });
  }
}
