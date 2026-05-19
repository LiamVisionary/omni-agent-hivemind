import { NextRequest } from "next/server";
import { buildBrainGraph } from "@/lib/services/obsidian/brain-graph";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { vaultPath?: string };
    const graph = await buildBrainGraph(body.vaultPath);
    return Response.json({ ok: true, graph });
  } catch (error) {
    return Response.json({
      ok: false,
      error: error instanceof Error ? error.message : "Could not build Obsidian graph.",
    }, { status: 400 });
  }
}
