import { NextRequest } from "next/server";
import { openBrainNoteInObsidian } from "@/lib/services/obsidian/brain-graph";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { vaultPath?: string; notePath?: string; newtab?: boolean };
    if (!body.notePath?.trim()) {
      return Response.json({ ok: false, error: "Missing note path." }, { status: 400 });
    }
    const opened = await openBrainNoteInObsidian({
      vaultPath: body.vaultPath,
      notePath: body.notePath,
      newtab: body.newtab,
    });
    return Response.json({ ok: true, opened });
  } catch (error) {
    return Response.json({
      ok: false,
      error: error instanceof Error ? error.message : "Could not open note in Obsidian.",
    }, { status: 400 });
  }
}
