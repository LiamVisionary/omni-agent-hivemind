import { NextRequest, NextResponse } from "next/server";
import type { AgentProfile, AgentRuntime } from "@/lib/types/agent-runtime";
import { getRuntimeAdapter, type RuntimeScheduleAction } from "@/lib/services/runtime-adapters/registry";

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
  const body = await request.json().catch(() => ({})) as {
    action?: RuntimeScheduleAction;
    jobId?: string;
    agent?: AgentProfile;
  };
  if (!body.action || !body.jobId) {
    return NextResponse.json({ ok: false, error: "action and jobId are required" }, { status: 400 });
  }
  if (!adapter?.runScheduleAction) {
    return NextResponse.json({ ok: false, error: `${adapter?.label ?? runtimeId} does not expose schedule actions.` }, { status: 501 });
  }
  const result = await adapter.runScheduleAction(body.agent, body.action, body.jobId, {
    requestUrl: request.url,
    agents: body.agent ? [body.agent] : [],
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
