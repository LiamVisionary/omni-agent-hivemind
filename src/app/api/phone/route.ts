import { NextRequest, NextResponse } from "next/server";
import { mkdir, readdir, readFile, unlink, writeFile } from "fs/promises";
import { join, resolve, sep } from "path";
import { resolveObsidianVaultPath } from "@/lib/services/obsidian/vault-path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// SHARED CONTRACT — the mobile app + gateway scheduler parse exactly this.
// Call prompts live as one markdown file per prompt with frontmatter:
//   ---
//   title: "Morning briefing"
//   time: "08:30"
//   enabled: true
//   ---
//   <spoken instructions / prompt body>
const PRIMARY_FOLDER = "Operations/Automations/Calls";
const LEGACY_FOLDER = "Claw/Calls";
const GATEWAY_PORTS = [5000, 5001, 5002];

type CallPrompt = {
  id: string;
  title: string;
  time: string;
  enabled: boolean;
  instructions: string;
  path: string;
};

// title.toLowerCase(), strip quotes, non-alnum -> "-", trim leading/trailing "-".
function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/["']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "call";
}

function serializePrompt(prompt: { title: string; time: string; enabled: boolean; instructions: string }): string {
  const title = JSON.stringify(String(prompt.title ?? ""));
  const time = JSON.stringify(String(prompt.time ?? ""));
  const enabled = prompt.enabled ? "true" : "false";
  const body = String(prompt.instructions ?? "").replace(/\r\n/g, "\n").replace(/\s+$/, "");
  return `---\ntitle: ${title}\ntime: ${time}\nenabled: ${enabled}\n---\n\n${body}\n`;
}

function parseQuotedString(raw: string): string {
  const value = raw.trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    try {
      return JSON.parse(value.startsWith("'") ? `"${value.slice(1, -1).replace(/"/g, '\\"')}"` : value);
    } catch {
      return value.slice(1, -1);
    }
  }
  return value;
}

function parsePrompt(content: string): { title: string; time: string; enabled: boolean; instructions: string } {
  const normalized = content.replace(/\r\n/g, "\n");
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(normalized);
  let title = "";
  let time = "";
  let enabled = true;
  let instructions = normalized;
  if (match) {
    instructions = normalized.slice(match[0].length);
    for (const line of match[1].split("\n")) {
      const sep = line.indexOf(":");
      if (sep < 0) continue;
      const key = line.slice(0, sep).trim().toLowerCase();
      const value = line.slice(sep + 1).trim();
      if (key === "title") title = parseQuotedString(value);
      else if (key === "time") time = parseQuotedString(value);
      else if (key === "enabled") enabled = !/^(false|no|0)$/i.test(value.trim());
    }
  }
  return { title, time, enabled, instructions: instructions.replace(/^\n+/, "").replace(/\s+$/, "") };
}

// Keep file operations inside the resolved vault. Never escape it.
function safeJoin(vaultPath: string, ...segments: string[]): string {
  const target = resolve(vaultPath, ...segments);
  const root = resolve(vaultPath);
  if (target !== root && !target.startsWith(root + sep)) {
    throw new Error("Refusing to access a path outside the vault.");
  }
  return target;
}

async function readFolderPrompts(vaultPath: string, folder: string): Promise<CallPrompt[]> {
  const dir = safeJoin(vaultPath, folder);
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return [];
  }
  const prompts: CallPrompt[] = [];
  for (const entry of entries) {
    if (!entry.toLowerCase().endsWith(".md")) continue;
    const filePath = join(dir, entry);
    let content: string;
    try {
      content = await readFile(filePath, "utf8");
    } catch {
      continue;
    }
    const parsed = parsePrompt(content);
    const baseName = entry.replace(/\.md$/i, "");
    const id = parsed.title ? slugifyTitle(parsed.title) : slugifyTitle(baseName);
    prompts.push({
      id,
      title: parsed.title || baseName,
      time: parsed.time,
      enabled: parsed.enabled,
      instructions: parsed.instructions,
      path: filePath,
    });
  }
  return prompts;
}

async function listPrompts(vaultPath: string): Promise<CallPrompt[]> {
  const [primary, legacy] = await Promise.all([
    readFolderPrompts(vaultPath, PRIMARY_FOLDER),
    readFolderPrompts(vaultPath, LEGACY_FOLDER),
  ]);
  // Prefer the primary folder when the same prompt id exists in both.
  const byId = new Map<string, CallPrompt>();
  for (const prompt of [...legacy, ...primary]) byId.set(prompt.id, prompt);
  return [...byId.values()].sort((a, b) => (a.time || "").localeCompare(b.time || "") || a.title.localeCompare(b.title));
}

async function findPromptFile(vaultPath: string, id: string): Promise<string | null> {
  const slug = slugifyTitle(id);
  for (const folder of [PRIMARY_FOLDER, LEGACY_FOLDER]) {
    const candidate = safeJoin(vaultPath, folder, `${slug}.md`);
    try {
      await readFile(candidate, "utf8");
      return candidate;
    } catch {
      // try next folder
    }
  }
  // Fall back to matching by parsed/derived id across both folders.
  const prompts = await listPrompts(vaultPath);
  return prompts.find((prompt) => prompt.id === slug)?.path ?? null;
}

async function probeGateway(): Promise<string | null> {
  for (const gatewayPort of GATEWAY_PORTS) {
    const base = `http://127.0.0.1:${gatewayPort}`;
    try {
      const response = await fetch(`${base}/voice/calls/ring-now`, {
        method: "OPTIONS",
        signal: AbortSignal.timeout(1_200),
      });
      // Any HTTP response means the port is owned by a live server.
      if (response) return base;
    } catch {
      // Try the next port.
    }
  }
  return null;
}

async function ringNow(id: string): Promise<{ ok: boolean; gateway?: string; result?: unknown; error?: string }> {
  const base = await probeGateway();
  if (!base) {
    return { ok: false, error: "Gateway not reachable on 127.0.0.1:5000-5002. Start the claw gateway to ring the phone." };
  }
  try {
    const response = await fetch(`${base}/voice/calls/ring-now`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scriptId: id }),
      signal: AbortSignal.timeout(15_000),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      const message = (result && typeof result === "object" && "error" in result && typeof result.error === "string")
        ? result.error
        : `Gateway returned HTTP ${response.status}.`;
      return { ok: false, gateway: base, result, error: message };
    }
    return { ok: true, gateway: base, result };
  } catch (error) {
    return { ok: false, gateway: base, error: error instanceof Error ? error.message : "Gateway request failed." };
  }
}

async function fetchCollectorJson(collectorBase: string, path: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(`${collectorBase}${path}`, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
    headers: { ...(init?.body ? { "content-type": "application/json" } : {}), ...(init?.headers ?? {}) },
  });
  return response.json().catch(() => null);
}

function collectorBaseFromRequest(request: NextRequest): string {
  return (request.nextUrl.searchParams.get("collectorUrl")?.trim() || "http://127.0.0.1:8787").replace(/\/+$/, "");
}

// Never throws: degrades to a neutral "unavailable" payload.
async function syncStatus(request: NextRequest, vaultPath: string) {
  const collectorBase = collectorBaseFromRequest(request);
  try {
    const payload = await fetchCollectorJson(
      collectorBase,
      `/syncthing/folder-status?path=${encodeURIComponent(vaultPath)}`,
    ) as { ok?: boolean; folders?: unknown[]; error?: string } | null;
    if (!payload || payload.ok === false || !Array.isArray(payload.folders)) {
      return { ok: false, available: false, error: payload?.error };
    }
    return { ok: true, available: true, folders: payload.folders };
  } catch {
    return { ok: false, available: false };
  }
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Phone request failed.";
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}

export async function GET(request: NextRequest) {
  try {
    const action = request.nextUrl.searchParams.get("action");
    const vaultPath = resolveObsidianVaultPath(request.nextUrl.searchParams.get("vaultPath") ?? undefined);

    if (action === "sync-status") {
      const status = await syncStatus(request, vaultPath);
      return NextResponse.json({ ...status, vaultPath });
    }

    const prompts = await listPrompts(vaultPath);
    return NextResponse.json({ ok: true, prompts, vaultPath });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const vaultPath = resolveObsidianVaultPath(body.vaultPath ?? request.nextUrl.searchParams.get("vaultPath") ?? undefined, { requireWritable: true });

    if (body.action === "save") {
      const title = String(body.title ?? "").trim();
      if (!title) throw new Error("A title is required.");
      const time = String(body.time ?? "").trim();
      const enabled = Boolean(body.enabled);
      const instructions = String(body.instructions ?? "");
      const slug = slugifyTitle(title);

      // If the prompt is being renamed, drop the old slug file so we never duplicate.
      if (body.id) {
        const previous = await findPromptFile(vaultPath, String(body.id));
        const nextPath = safeJoin(vaultPath, PRIMARY_FOLDER, `${slug}.md`);
        if (previous && resolve(previous) !== resolve(nextPath)) {
          await unlink(previous).catch(() => undefined);
        }
      }

      const dir = safeJoin(vaultPath, PRIMARY_FOLDER);
      await mkdir(dir, { recursive: true });
      const filePath = join(dir, `${slug}.md`);
      await writeFile(filePath, serializePrompt({ title, time, enabled, instructions }), "utf8");
      return NextResponse.json({ ok: true, prompt: { id: slug, title, time, enabled, instructions, path: filePath } });
    }

    if (body.action === "delete") {
      const id = String(body.id ?? "").trim();
      if (!id) throw new Error("An id is required.");
      const filePath = await findPromptFile(vaultPath, id);
      if (filePath) await unlink(filePath).catch(() => undefined);
      return NextResponse.json({ ok: true, id });
    }

    if (body.action === "toggle") {
      const id = String(body.id ?? "").trim();
      if (!id) throw new Error("An id is required.");
      const filePath = await findPromptFile(vaultPath, id);
      if (!filePath) throw new Error("Call prompt not found.");
      const parsed = parsePrompt(await readFile(filePath, "utf8"));
      const enabled = body.enabled === undefined ? !parsed.enabled : Boolean(body.enabled);
      await writeFile(filePath, serializePrompt({ ...parsed, enabled }), "utf8");
      return NextResponse.json({ ok: true, id: slugifyTitle(id), enabled });
    }

    if (body.action === "ring") {
      const id = String(body.id ?? "").trim();
      if (!id) throw new Error("An id is required.");
      const result = await ringNow(id);
      return NextResponse.json(result, { status: result.ok ? 200 : 502 });
    }

    if (body.action === "rescan") {
      const collectorBase = collectorBaseFromRequest(request);
      try {
        const payload = await fetchCollectorJson(collectorBase, "/syncthing/rescan", {
          method: "POST",
          body: JSON.stringify({ path: vaultPath }),
        }) as { ok?: boolean; error?: string } | null;
        if (!payload || payload.ok === false) {
          return NextResponse.json({ ok: false, available: Boolean(payload), error: payload?.error ?? "Syncthing rescan unavailable." });
        }
        return NextResponse.json({ ok: true, available: true });
      } catch {
        return NextResponse.json({ ok: false, available: false, error: "Syncthing rescan unavailable." });
      }
    }

    throw new Error(`Unknown action: ${String(body.action ?? "")}`);
  } catch (error) {
    return errorResponse(error);
  }
}
