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
  const body = await request.json().catch(() => ({})) as { agent?: AgentProfile };
  if (!adapter?.listOutputs) {
    return NextResponse.json({ ok: false, error: `${adapter?.label ?? runtimeId} does not expose outputs.` }, { status: 501 });
  }
  try {
    const outputs = await adapter.listOutputs(body.agent ?? ({ runtime: runtimeId } as AgentProfile), {
      requestUrl: request.url,
      agents: body.agent ? [body.agent] : [],
    });
    return NextResponse.json({ ok: true, runtime: runtimeId, outputs });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Runtime outputs failed." }, { status: 502 });
  }
}
