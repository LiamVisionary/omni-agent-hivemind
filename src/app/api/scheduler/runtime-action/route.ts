import { NextRequest, NextResponse } from "next/server";
import type { AgentProfile, AgentRuntime } from "@/lib/types/agent-runtime";
import { getRuntimeAdapter, type RuntimeScheduleAction } from "@/lib/services/runtime-adapters/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as {
    runtime?: AgentRuntime;
    action?: RuntimeScheduleAction;
    jobId?: string;
    agent?: AgentProfile;
  };
  if (!body.runtime || !body.action || !body.jobId) {
    return NextResponse.json({ ok: false, error: "runtime, action, and jobId are required" }, { status: 400 });
  }

  const adapter = getRuntimeAdapter(body.runtime);
  if (adapter.runScheduleAction) {
    const result = await adapter.runScheduleAction(body.agent, body.action, body.jobId, {
      requestUrl: request.url,
      agents: body.agent ? [body.agent] : [],
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  }

  return NextResponse.json({
    ok: false,
    error: `${adapter.label} schedule actions are not exposed by that runtime adapter yet.`,
  }, { status: 501 });
}
