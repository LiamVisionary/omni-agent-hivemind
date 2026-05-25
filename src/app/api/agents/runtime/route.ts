import { NextRequest, NextResponse } from "next/server";
import type { AgentProfile } from "@/lib/types/agent-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLLECTOR_TIMEOUT_MS = 20_000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      collectorUrl?: string;
      agent?: Partial<AgentProfile>;
    } & Partial<AgentProfile>;
    const collectorUrl = body.collectorUrl?.trim().replace(/\/+$/, "");
    if (!collectorUrl) throw new Error("collectorUrl is required.");
    const agent = body.agent ?? body;
    const response = await fetch(`${collectorUrl}/agents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(agent),
      cache: "no-store",
      signal: AbortSignal.timeout(COLLECTOR_TIMEOUT_MS),
    });
    const data = await response.json().catch(async () => ({ error: await response.text().catch(() => "") })) as {
      ok?: boolean;
      agent?: AgentProfile;
      error?: string;
    };
    if (response.ok && data.ok !== false && !data.agent) {
      throw new Error("That collector does not support runtime agent creation yet. Update the machine, then try again.");
    }
    if (!response.ok || data.ok === false || !data.agent) {
      throw new Error(data.error || `Collector returned HTTP ${response.status}.`);
    }
    return NextResponse.json({ ok: true, agent: data.agent });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Could not create runtime agent.",
    }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json() as {
      collectorUrl?: string;
      id?: string;
      runtime?: string;
      profile?: string;
      agentId?: string;
      name?: string;
    };
    const collectorUrl = body.collectorUrl?.trim().replace(/\/+$/, "");
    if (!collectorUrl) throw new Error("collectorUrl is required.");
    const response = await fetch(`${collectorUrl}/agents`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: body.id,
        runtime: body.runtime,
        profile: body.profile,
        agentId: body.agentId,
        name: body.name,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(COLLECTOR_TIMEOUT_MS),
    });
    const data = await response.json().catch(async () => ({ error: await response.text().catch(() => "") })) as {
      ok?: boolean;
      deleted?: boolean;
      error?: string;
    };
    if (!response.ok || data.ok === false) {
      throw new Error(data.error || `Collector returned HTTP ${response.status}.`);
    }
    return NextResponse.json({ ok: true, deleted: Boolean(data.deleted) });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Could not delete runtime agent.",
    }, { status: 400 });
  }
}
