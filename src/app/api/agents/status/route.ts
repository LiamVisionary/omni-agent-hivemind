import { NextRequest } from "next/server";
import type { AgentProfile } from "@/lib/types/agent-runtime";
import { getRuntimeUrl } from "@/lib/types/agent-runtime";
import { testGatewayConnection } from "@/lib/services/openclaw/gateway-client";
import { getGatewayAuthToken } from "@/lib/services/openclaw/gateway-health";
import { getRuntimeAdapter } from "@/lib/services/runtime-adapters/registry";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let profile: AgentProfile;
  try {
    const body = (await request.json()) as { agent?: AgentProfile };
    if (!body.agent) throw new Error("Missing agent profile");
    profile = body.agent;
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (profile.runtime === "openclaw") {
    const token = await getGatewayAuthToken(profile.token);
    if (!profile.gatewayUrl || !token) {
      return Response.json({ ok: false, runtime: profile.runtime, error: "Missing OpenClaw URL or token" });
    }
    const result = await testGatewayConnection({ gatewayUrl: profile.gatewayUrl, token });
    return Response.json({
      ok: result.success,
      runtime: profile.runtime,
      agentId: profile.agentId,
      error: result.error,
    });
  }

  const adapter = getRuntimeAdapter(profile.runtime);
  if (adapter.getStatus) {
    const status = await adapter.getStatus(profile, { requestUrl: request.url, agents: [profile] });
    return Response.json({ ok: true, runtime: profile.runtime, status });
  }

  const statusUrl = getRuntimeUrl(profile, profile.statusPath || "/health");
  try {
    const response = await fetch(statusUrl, {
      method: "GET",
      headers: profile.token ? { Authorization: `Bearer ${profile.token}` } : undefined,
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    const contentType = response.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? await response.json().catch(() => null)
      : await response.text().catch(() => "");
    return Response.json({
      ok: response.ok,
      runtime: profile.runtime,
      status: response.status,
      url: statusUrl,
      payload,
    });
  } catch (error) {
    return Response.json({
      ok: false,
      runtime: profile.runtime,
      url: statusUrl,
      error: error instanceof Error ? error.message : "Status check failed",
    });
  }
}
