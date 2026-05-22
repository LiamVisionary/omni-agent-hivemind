import { NextRequest, NextResponse } from "next/server";
import type { AgentProfile, AgentRuntime } from "@/lib/types/agent-runtime";
import { getRuntimeIntegrationStatus, runRuntimeIntegrationAction } from "@/lib/services/runtime-integrations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validRuntime(value: string): value is AgentRuntime {
  return value === "openclaw" || value === "hermes" || value === "aeon";
}

function normalizeCollectorUrl(url?: string) {
  return url?.trim().replace(/\/+$/, "") ?? "";
}

function isLocalCollectorUrl(url?: string) {
  const normalized = normalizeCollectorUrl(url);
  if (!normalized) return false;
  try {
    const hostname = new URL(normalized).hostname.toLowerCase();
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]";
  } catch {
    return false;
  }
}

async function proxyCollectorIntegration(runtime: AgentRuntime, collectorUrl: string, body: { agent?: AgentProfile; action?: string; input?: Record<string, unknown> }) {
  const base = normalizeCollectorUrl(collectorUrl);
  const response = await fetch(`${base}/runtimes/${runtime}/integrations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(body.action === "hermes-update" ? 330_000 : 30_000),
    cache: "no-store",
  });
  const data = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok || data?.ok === false) {
    throw new Error(typeof data?.error === "string" ? data.error : `Remote collector returned HTTP ${response.status}.`);
  }
  return data;
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
  const collectorUrl = normalizeCollectorUrl(body.agent?.telemetryUrl);
  if (collectorUrl && !isLocalCollectorUrl(collectorUrl)) {
    try {
      return NextResponse.json(await proxyCollectorIntegration(runtime, collectorUrl, body));
    } catch (error) {
      return NextResponse.json({
        ok: false,
        error: error instanceof Error ? error.message : "Remote runtime integration failed.",
        target: collectorUrl,
      }, { status: 502 });
    }
  }
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
