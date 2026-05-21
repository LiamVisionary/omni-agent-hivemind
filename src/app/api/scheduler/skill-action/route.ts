import { execFile } from "child_process";
import { readFile } from "fs/promises";
import { join } from "path";
import { getSharedBrainSkills } from "@/lib/services/obsidian/brain-skills";
import { resolveObsidianVaultPath } from "@/lib/services/obsidian/vault-path";
import { recordTelemetryBatch } from "@/lib/services/telemetry/local-telemetry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SchedulerSkillAction = {
  id?: string;
  runtime?: string;
  timeoutMs?: number;
  script?: string;
};

type SkillActionResult = {
  ok: boolean;
  skipped?: boolean;
  skill?: string;
  actionId?: string;
  title?: string;
  output?: string;
  error?: string;
  elapsedMs: number;
};

function parseActionBlock(markdown: string): SchedulerSkillAction | null {
  const match = markdown.match(/```hivemindos-scheduler-action\s*([\s\S]*?)```/i);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1].trim()) as SchedulerSkillAction;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function safeTimeout(timeoutMs?: number) {
  if (!Number.isFinite(timeoutMs)) return 8_000;
  return Math.max(500, Math.min(30_000, Math.round(timeoutMs ?? 8_000)));
}

async function logRouteTelemetry(request: Request, type: string, payload: Record<string, unknown>) {
  await recordTelemetryBatch([{
    source: "route",
    type,
    runId: request.headers.get("x-hivemind-run-id"),
    payload,
  }]).catch(() => undefined);
}

function isSafeSkillSlug(slug: string) {
  return /^[a-z0-9][a-z0-9._-]*$/i.test(slug);
}

async function readSharedSkillMarkdown(slug: string, vaultPath?: string) {
  if (isSafeSkillSlug(slug)) {
    const directPath = join(resolveObsidianVaultPath(vaultPath), "Skills", slug, "SKILL.md");
    const directMarkdown = await readFile(directPath, "utf8").catch(() => "");
    if (directMarkdown) return { path: directPath, markdown: directMarkdown };
  }
  const inventory = await getSharedBrainSkills(vaultPath);
  const skill = inventory.shared.find((item) => item.slug === slug);
  if (!skill) return null;
  const markdown = await readFile(skill.path, "utf8").catch(() => "");
  return markdown ? { path: skill.path, markdown } : null;
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  let body: { skillSlugs?: string[]; prompt?: string; scheduleName?: string; vaultPath?: string };
  try {
    body = await request.json() as { skillSlugs?: string[]; prompt?: string; scheduleName?: string; vaultPath?: string };
  } catch {
    return Response.json({ ok: false, error: "Expected a JSON body.", elapsedMs: Date.now() - startedAt }, { status: 400 });
  }

  const skillSlugs = [...new Set((body.skillSlugs ?? []).map((slug) => slug.trim()).filter(Boolean))];
  if (!skillSlugs.length) {
    return Response.json({ ok: false, skipped: true, error: "No attached skills.", elapsedMs: Date.now() - startedAt });
  }

  for (const slug of skillSlugs) {
    const skill = await readSharedSkillMarkdown(slug, body.vaultPath);
    if (!skill) continue;
    const action = parseActionBlock(skill.markdown);
    if (!action) continue;
    if (action.runtime !== "osascript" || !action.script?.trim()) {
      const result: SkillActionResult = {
        ok: false,
        skill: slug,
        actionId: action.id,
        error: `Unsupported scheduler action runtime: ${action.runtime || "unknown"}`,
        elapsedMs: Date.now() - startedAt,
      };
      await logRouteTelemetry(request, "scheduler.skill_action.unsupported", result);
      return Response.json(result, { status: 400 });
    }

    await logRouteTelemetry(request, "scheduler.skill_action.start", {
      skill: slug,
      actionId: action.id ?? null,
      runtime: action.runtime,
      elapsedMs: Date.now() - startedAt,
    });

    return new Promise<Response>((resolve) => {
      execFile(
        "osascript",
        ["-e", action.script ?? "", body.scheduleName ?? "", body.prompt ?? ""],
        { timeout: safeTimeout(action.timeoutMs) },
        async (error, stdout, stderr) => {
          const elapsedMs = Date.now() - startedAt;
          const output = stdout.trim();
          const result: SkillActionResult = error
            ? {
              ok: false,
              skill: slug,
              actionId: action.id,
              error: stderr.trim() || error.message || "Skill action failed.",
              elapsedMs,
            }
            : {
              ok: true,
              skill: slug,
              actionId: action.id,
              title: output.split("\n").find(Boolean) || body.scheduleName || slug,
              output,
              elapsedMs,
            };
          await logRouteTelemetry(request, error ? "scheduler.skill_action.failed" : "scheduler.skill_action.completed", result);
          resolve(Response.json(result, { status: error ? 500 : 200 }));
        },
      );
    });
  }

  const result: SkillActionResult = {
    ok: false,
    skipped: true,
    error: "No attached skill declares a scheduler action.",
    elapsedMs: Date.now() - startedAt,
  };
  await logRouteTelemetry(request, "scheduler.skill_action.skipped", {
    skillCount: skillSlugs.length,
    elapsedMs: result.elapsedMs,
  });
  return Response.json(result);
}
