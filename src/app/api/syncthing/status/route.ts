import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function collectorBase(url?: string | null) {
  return (url?.trim() || "http://127.0.0.1:8787").replace(/\/+$/, "");
}

export async function GET(request: NextRequest) {
  const collectorUrl = collectorBase(request.nextUrl.searchParams.get("collectorUrl"));
  try {
    const response = await fetch(`${collectorUrl}/syncthing/status`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const payload = await response.json().catch(() => null);
    return Response.json(payload ?? { ok: response.ok }, { status: response.ok ? 200 : response.status });
  } catch (error) {
    return Response.json({
      ok: false,
      error: error instanceof Error ? error.message : "Could not reach collector Syncthing status.",
    }, { status: 502 });
  }
}
