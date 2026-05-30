import { NextRequest, NextResponse } from "next/server";
import type { AgentProfile, AgentRuntime } from "@/lib/types/agent-runtime";
import { getRuntimeAdapter, type RuntimeSkillConfigAction } from "@/lib/services/runtime-adapters/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ runtime: string }> },
) {
  const { runtime } = await params;
  const runtimeId = runtime as AgentRuntime;
  const adapter = getRuntimeAdapter(runtimeId);
  if (!adapter?.updateSkillConfig) {
    return NextResponse.json({ ok: false, error: `${adapter?.label ?? runtimeId} does not expose skill config edits.` }, { status: 501 });
  }
  const body = await request.json().catch(() => ({})) as {
    agent?: AgentProfile;
    skill?: string;
    action?: RuntimeSkillConfigAction;
    value?: string | boolean;
  };
  if (!body.skill || !body.action) return NextResponse.json({ ok: false, error: "skill and action are required" }, { status: 400 });
  const result = await adapter.updateSkillConfig(body.agent ?? ({ runtime: runtimeId } as AgentProfile), body.skill, body.action, body.value ?? "", {
    requestUrl: request.url,
    agents: body.agent ? [body.agent] : [],
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
