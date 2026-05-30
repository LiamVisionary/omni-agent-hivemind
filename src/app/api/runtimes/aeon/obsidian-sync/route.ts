import { NextRequest, NextResponse } from "next/server";
import type { AgentProfile } from "@/lib/types/agent-runtime";
import { runAeonObsidianSyncAction, type AeonObsidianSyncAction } from "@/lib/services/runtime-adapters/aeon-obsidian-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as {
    agent?: AgentProfile;
    action?: AeonObsidianSyncAction;
    vaultPath?: string;
  };
  const agent = body.agent;
  if (!agent) return NextResponse.json({ ok: false, error: "AEON agent profile is required." }, { status: 400 });
  try {
    const action = body.action ?? "status";
    const status = await runAeonObsidianSyncAction(agent, action, body.vaultPath);
    return NextResponse.json(status, { status: status.ok || action === "status" ? 200 : 409 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "AEON Obsidian sync failed." }, { status: 502 });
  }
}
