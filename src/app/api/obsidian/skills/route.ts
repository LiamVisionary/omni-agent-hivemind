import { NextRequest, NextResponse } from "next/server";
import {
  getBrainSkillInventory,
  importBrainSkills,
  importRemoteBrainSkill,
  type BrainSkillProviderId,
} from "@/lib/services/obsidian/brain-skills";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const inventory = await getBrainSkillInventory(request.nextUrl.searchParams.get("vaultPath") ?? undefined);
    return NextResponse.json({ ok: true, ...inventory });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({})) as {
      action?: "import-remote";
      vaultPath?: string;
      provider?: BrainSkillProviderId | "all";
      skill?: {
        slug?: string;
        name?: string;
        description?: string;
        source?: string;
        category?: string;
        skillMdUrl?: string;
        githubUrl?: string;
      };
    };
    if (body.action === "import-remote") {
      if (!body.skill) throw new Error("Missing skill to import.");
      const result = await importRemoteBrainSkill({
        vaultPath: body.vaultPath,
        skill: body.skill,
      });
      return NextResponse.json({ ok: true, ...result, imported: [body.skill], skipped: [] });
    }
    const result = await importBrainSkills({
      vaultPath: body.vaultPath,
      provider: body.provider ?? "all",
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return errorResponse(error);
  }
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Brain skill sync failed.";
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}
