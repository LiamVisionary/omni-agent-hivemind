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
  if (!adapter?.getStatus) {
    return NextResponse.json({ ok: false, error: `${adapter?.label ?? runtimeId} does not expose adapter status.` }, { status: 501 });
  }
  try {
    const status = await adapter.getStatus(body.agent ?? ({ runtime: runtimeId } as AgentProfile), {
      requestUrl: request.url,
      agents: body.agent ? [body.agent] : [],
    });
    return NextResponse.json({ ok: true, runtime: runtimeId, status });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Runtime status failed." }, { status: 502 });
  }
}
