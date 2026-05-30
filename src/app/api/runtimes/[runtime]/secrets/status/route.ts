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
  if (!adapter?.getSecretStatus) {
    return NextResponse.json({ ok: false, error: `${adapter?.label ?? runtimeId} does not expose secret status.` }, { status: 501 });
  }
  const body = await request.json().catch(() => ({})) as { agent?: AgentProfile; vaultPath?: string };
  try {
    const secrets = await adapter.getSecretStatus(body.agent ?? ({ runtime: runtimeId } as AgentProfile), {
      requestUrl: request.url,
      agents: body.agent ? [body.agent] : [],
      vaultPath: body.vaultPath,
    });
    return NextResponse.json({ ok: true, runtime: runtimeId, secrets });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Runtime secret status failed." }, { status: 502 });
  }
}
