import { NextRequest, NextResponse } from "next/server";
import {
  getBrainSkillInventory,
  importGitHubBrainSkill,
  importBrainSkills,
  importRemoteBrainSkill,
  writeBrainSkill,
  type BrainSkillProviderId,
} from "@/lib/services/obsidian/brain-skills";
import { remoteSkillProviders } from "@/lib/services/fleet/remote-skill-providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const remoteProviders = await remoteSkillProviders(request);
    const inventory = await getBrainSkillInventory(request.nextUrl.searchParams.get("vaultPath") ?? undefined, remoteProviders);
    return NextResponse.json({ ok: true, ...inventory });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({})) as {
      action?: "import-github" | "import-remote" | "write-skill";
      vaultPath?: string;
      provider?: BrainSkillProviderId | "all";
      githubUrl?: string;
      markdown?: string;
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
    if (body.action === "import-github") {
      if (!body.githubUrl?.trim()) throw new Error("Missing GitHub URL.");
      const result = await importGitHubBrainSkill({
        vaultPath: body.vaultPath,
        githubUrl: body.githubUrl,
      });
      return NextResponse.json({ ok: true, ...result, imported: [], skipped: [] });
    }
    if (body.action === "import-remote") {
      if (!body.skill) throw new Error("Missing skill to import.");
      const result = await importRemoteBrainSkill({
        vaultPath: body.vaultPath,
        skill: body.skill,
      });
      return NextResponse.json({ ok: true, ...result, imported: [body.skill], skipped: [] });
    }
    if (body.action === "write-skill") {
      const result = await writeBrainSkill({
        vaultPath: body.vaultPath,
        markdown: body.markdown ?? "",
      });
      return NextResponse.json({ ok: true, ...result, imported: [], skipped: [] });
    }
    const result = await importBrainSkills({
      vaultPath: body.vaultPath,
      provider: body.provider ?? "all",
      remoteProviders: await remoteSkillProviders(request, { includeSourceFiles: true }),
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
