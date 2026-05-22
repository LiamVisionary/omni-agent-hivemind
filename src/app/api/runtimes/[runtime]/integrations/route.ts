import { NextRequest, NextResponse } from "next/server";
import type { AgentProfile, AgentRuntime } from "@/lib/types/agent-runtime";
import { getRuntimeIntegrationStatus, runRuntimeIntegrationAction } from "@/lib/services/runtime-integrations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validRuntime(value: string): value is AgentRuntime {
  return value === "openclaw" || value === "hermes" || value === "aeon";
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ runtime: string }> },
) {
  const { runtime } = await params;
  if (!validRuntime(runtime)) {
    return NextResponse.json({ ok: false, error: `Unknown runtime: ${runtime}` }, { status: 404 });
  }
  const body = await request.json().catch(() => ({})) as { agent?: AgentProfile; action?: string; input?: Record<string, unknown> };
  if (body.action) {
    try {
      const result = await runRuntimeIntegrationAction(runtime, body.action, body.input ?? {});
      return NextResponse.json(result);
    } catch (error) {
      return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Runtime action failed." }, { status: 502 });
    }
  }
  try {
    return NextResponse.json({ ok: true, status: await getRuntimeIntegrationStatus(runtime, body.agent) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Runtime integrations failed." }, { status: 502 });
  }
}
