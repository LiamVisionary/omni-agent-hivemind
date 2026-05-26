import { NextRequest } from "next/server";
import { listDynamicWorkHistory } from "@/lib/services/work-history/dynamic-changelog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const result = await listDynamicWorkHistory({
      vaultPath: params.get("vaultPath") ?? undefined,
      project: params.get("project") ?? undefined,
      query: params.get("q") ?? undefined,
      limit: Number(params.get("limit") || 10),
      offset: Number(params.get("offset") || 0),
    });
    return Response.json(result);
  } catch (error) {
    return Response.json({
      ok: false,
      projects: [],
      entries: [],
      error: error instanceof Error ? error.message : "Could not load work history.",
    }, { status: 400 });
  }
}
