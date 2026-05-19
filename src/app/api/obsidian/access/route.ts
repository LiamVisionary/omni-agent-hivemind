import { NextRequest } from "next/server";
import { recordBrainAccess } from "@/lib/services/obsidian/brain-graph";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      vaultPath?: string;
      notePath?: string;
      agentName?: string;
      agentId?: string;
      runtime?: string;
      machineName?: string;
      action?: "view" | "read" | "write" | "inspect";
    };
    if (!body.notePath?.trim()) {
      return Response.json({ ok: false, error: "Missing note path." }, { status: 400 });
    }
    const event = await recordBrainAccess({
      vaultPath: body.vaultPath,
      notePath: body.notePath,
      agentName: body.agentName,
      agentId: body.agentId,
      runtime: body.runtime,
      machineName: body.machineName,
      action: body.action,
    });
    return Response.json({ ok: true, event });
  } catch (error) {
    return Response.json({
      ok: false,
      error: error instanceof Error ? error.message : "Could not record brain access.",
    }, { status: 400 });
  }
}
