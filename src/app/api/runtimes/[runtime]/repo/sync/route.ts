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
  const body = await request.json().catch(() => ({})) as { agent?: AgentProfile; action?: "status" | "pull" | "push" };
  const agent = body.agent ?? ({ runtime: runtimeId } as AgentProfile);
  try {
    if (body.action === "pull" || body.action === "push") {
      if (!adapter?.runRepoSyncAction) return NextResponse.json({ ok: false, error: `${adapter?.label ?? runtimeId} does not expose repo sync actions.` }, { status: 501 });
      const result = await adapter.runRepoSyncAction(agent, body.action, { requestUrl: request.url, agents: body.agent ? [body.agent] : [] });
      return NextResponse.json({ runtime: runtimeId, ...result }, { status: result.ok ? 200 : 502 });
    }
    if (!adapter?.getRepoSyncStatus) return NextResponse.json({ ok: false, error: `${adapter?.label ?? runtimeId} does not expose repo sync status.` }, { status: 501 });
    const status = await adapter.getRepoSyncStatus(agent, { requestUrl: request.url, agents: body.agent ? [body.agent] : [] });
    return NextResponse.json({ ok: true, runtime: runtimeId, status });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Runtime repo sync failed." }, { status: 502 });
  }
}
