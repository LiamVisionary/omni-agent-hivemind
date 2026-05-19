import { constants } from "fs";
import { access, cp, mkdir, readdir, readFile, stat, writeFile } from "fs/promises";
import { createHash } from "crypto";
import { homedir } from "os";
import { basename, dirname, join, relative, resolve } from "path";
import { resolveObsidianVaultPath } from "@/lib/services/obsidian/vault-path";

export type BrainSkillProviderId = "claude" | "codex" | "hermes" | "gemini" | "openclaw";

export type BrainSkillSummary = {
  id: string;
  slug: string;
  name: string;
  description: string;
  provider: BrainSkillProviderId | "shared";
  providerLabel: string;
  path: string;
  relativePath: string;
  checksum: string;
  imported: boolean;
  importedAs?: string;
};

export type BrainSkillProviderInventory = {
  id: BrainSkillProviderId;
  label: string;
  home: string;
  skills: BrainSkillSummary[];
  installed: boolean;
};

export type BrainSkillInventory = {
  vaultPath: string;
  skillsFolder: string;
  readmePath: string;
  shared: BrainSkillSummary[];
  providers: BrainSkillProviderInventory[];
  totals: {
    shared: number;
    providerSkills: number;
    importable: number;
  };
};

export type BrainSkillImportResult = BrainSkillInventory & {
  imported: BrainSkillSummary[];
  skipped: BrainSkillSummary[];
  provider: BrainSkillProviderId | "all";
};

const PROVIDERS: Array<{
  id: BrainSkillProviderId;
  label: string;
  home: string;
  roots: Array<{ path: string; maxDepth: number }>;
}> = [
  {
    id: "claude",
    label: "Claude",
    home: "~/.claude",
    roots: [
      { path: "~/.claude/skills", maxDepth: 3 },
      { path: "~/.claude/plugins", maxDepth: 8 },
    ],
  },
  {
    id: "codex",
    label: "Codex",
    home: "~/.codex",
    roots: [
      { path: "~/.codex/skills", maxDepth: 4 },
      { path: "~/.codex/plugins/cache", maxDepth: 8 },
    ],
  },
  {
    id: "hermes",
    label: "Hermes",
    home: "~/.hermes",
    roots: [
      { path: "~/.hermes/skills", maxDepth: 4 },
      { path: "~/.hermes/plugins", maxDepth: 8 },
      { path: "~/.hermes/agents", maxDepth: 6 },
    ],
  },
  {
    id: "gemini",
    label: "Gemini",
    home: "~/.gemini",
    roots: [
      { path: "~/.gemini/skills", maxDepth: 4 },
      { path: "~/.gemini/extensions", maxDepth: 8 },
    ],
  },
  {
    id: "openclaw",
    label: "OpenClaw",
    home: "~/.openclaw",
    roots: [
      { path: "~/.openclaw/skills", maxDepth: 4 },
      { path: "~/Documents/code/projects/my-anime-waifu-web/openclaw-next/skills", maxDepth: 4 },
    ],
  },
];

const SKIPPED_DIRS = new Set([".git", "node_modules", ".next", "dist", "build", ".cache"]);
const SOURCE_METADATA_FILE = ".openclaw-skill-source.json";

function expandHome(path: string) {
  return path === "~" || path.startsWith("~/") ? join(homedir(), path.slice(2)) : path;
}

async function canRead(path: string) {
  try {
    await access(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

async function readText(path: string) {
  return readFile(path, "utf8").catch(() => "");
}

function checksum(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function slugToName(slug: string) {
  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word.slice(0, 1).toUpperCase() + word.slice(1))
    .join(" ");
}

function parseFrontmatter(markdown: string) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---/);
  const fields = new Map<string, string>();
  if (!match) return fields;
  for (const line of match[1].split("\n")) {
    const field = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!field) continue;
    fields.set(field[1].toLowerCase(), field[2].replace(/^["']|["']$/g, "").trim());
  }
  return fields;
}

function sanitizeSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "skill";
}

async function findSkillFiles(root: string, maxDepth: number) {
  const resolvedRoot = resolve(expandHome(root));
  if (!(await canRead(resolvedRoot))) return [];
  const found: string[] = [];

  async function walk(current: string, depth: number): Promise<void> {
    if (depth > maxDepth) return;
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name === "SKILL.md") {
        found.push(join(current, entry.name));
        continue;
      }
      if (!entry.isDirectory() || SKIPPED_DIRS.has(entry.name)) continue;
      await walk(join(current, entry.name), depth + 1);
    }
  }

  await walk(resolvedRoot, 0);
  return found;
}

async function skillSummary(input: {
  skillPath: string;
  provider: BrainSkillProviderId | "shared";
  providerLabel: string;
  basePath: string;
  sharedByChecksum: Map<string, BrainSkillSummary>;
  sharedBySlug: Map<string, BrainSkillSummary>;
}): Promise<BrainSkillSummary> {
  const markdown = await readText(input.skillPath);
  const frontmatter = parseFrontmatter(markdown);
  const slug = sanitizeSlug(basename(dirname(input.skillPath)));
  const sourceMetadata = input.provider === "shared" ? await readSourceMetadata(dirname(input.skillPath)) : null;
  const existing = input.sharedByChecksum.get(checksum(markdown)) ?? input.sharedBySlug.get(slug);
  return {
    id: `${input.provider}:${input.skillPath}`,
    slug,
    name: frontmatter.get("name") || slugToName(slug),
    description: frontmatter.get("description") || firstParagraph(markdown),
    provider: input.provider,
    providerLabel: sourceMetadata?.providerLabel ?? input.providerLabel,
    path: input.skillPath,
    relativePath: relative(input.basePath, input.skillPath),
    checksum: checksum(markdown),
    imported: input.provider === "shared" || Boolean(existing),
    importedAs: existing?.slug,
  };
}

async function readSourceMetadata(skillDir: string): Promise<{ providerLabel?: string } | null> {
  const metadata = await readText(join(skillDir, SOURCE_METADATA_FILE));
  if (!metadata) return null;
  try {
    const parsed = JSON.parse(metadata) as { providerLabel?: unknown };
    return typeof parsed.providerLabel === "string" ? { providerLabel: parsed.providerLabel } : null;
  } catch {
    return null;
  }
}

function firstParagraph(markdown: string) {
  return markdown
    .replace(/^---\n[\s\S]*?\n---/, "")
    .split(/\n\s*\n/)
    .map((part) => part.replace(/^#+\s*/, "").trim())
    .find(Boolean) ?? "";
}

async function readSharedSkills(vaultPath: string) {
  const skillsFolder = join(vaultPath, "Skills");
  const files = await findSkillFiles(skillsFolder, 3);
  const blank = new Map<string, BrainSkillSummary>();
  const shared = await Promise.all(files.map((skillPath) => skillSummary({
    skillPath,
    provider: "shared",
    providerLabel: "Shared brain",
    basePath: skillsFolder,
    sharedByChecksum: blank,
    sharedBySlug: blank,
  })));
  return shared.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getBrainSkillInventory(vaultPath?: string): Promise<BrainSkillInventory> {
  const resolvedVault = resolveObsidianVaultPath(vaultPath);
  const skillsFolder = join(resolvedVault, "Skills");
  const readmePath = join(skillsFolder, "README.md");
  const shared = await readSharedSkills(resolvedVault);
  const sharedByChecksum = new Map(shared.map((skill) => [skill.checksum, skill]));
  const sharedBySlug = new Map(shared.map((skill) => [skill.slug, skill]));

  const providers = await Promise.all(PROVIDERS.map(async (provider) => {
    const skillFiles = [...new Set((await Promise.all(
      provider.roots.map((root) => findSkillFiles(root.path, root.maxDepth)),
    )).flat())];
    const summaries = await Promise.all(skillFiles.map((skillPath) => skillSummary({
      skillPath,
      provider: provider.id,
      providerLabel: provider.label,
      basePath: resolve(expandHome(provider.home)),
      sharedByChecksum,
      sharedBySlug,
    })));
    const skills = summaries
      .filter((skill) => !skill.path.startsWith(skillsFolder))
      .sort((a, b) => a.name.localeCompare(b.name));
    return {
      id: provider.id,
      label: provider.label,
      home: provider.home,
      skills,
      installed: await canRead(resolve(expandHome(provider.home))),
    };
  }));

  const providerSkills = providers.reduce((sum, provider) => sum + provider.skills.length, 0);
  const importable = providers.reduce((sum, provider) => sum + provider.skills.filter((skill) => !skill.imported).length, 0);

  return {
    vaultPath: resolvedVault,
    skillsFolder,
    readmePath,
    shared,
    providers,
    totals: {
      shared: shared.length,
      providerSkills,
      importable,
    },
  };
}

export async function importBrainSkills(input: {
  vaultPath?: string;
  provider?: BrainSkillProviderId | "all";
}): Promise<BrainSkillImportResult> {
  const provider = input.provider ?? "all";
  const before = await getBrainSkillInventory(input.vaultPath);
  await mkdir(before.skillsFolder, { recursive: true });

  const selectedProviders = before.providers.filter((item) => provider === "all" || item.id === provider);
  const sharedBySlug = new Map(before.shared.map((skill) => [skill.slug, skill]));
  const imported: BrainSkillSummary[] = [];
  const skipped: BrainSkillSummary[] = [];

  for (const source of selectedProviders.flatMap((item) => item.skills)) {
    if (source.imported) {
      skipped.push(source);
      continue;
    }

    const sourceDir = dirname(source.path);
    const destinationSlug = await nextDestinationSlug(before.skillsFolder, source.slug, source.provider, sharedBySlug);
    const destinationDir = join(before.skillsFolder, destinationSlug);
    await cp(sourceDir, destinationDir, {
      recursive: true,
      errorOnExist: false,
      force: false,
      filter: (path) => !path.split("/").some((part) => SKIPPED_DIRS.has(part)),
    });
    await writeFile(join(destinationDir, SOURCE_METADATA_FILE), JSON.stringify({
      provider: source.provider,
      providerLabel: source.providerLabel,
      sourcePath: source.path,
      importedAt: new Date().toISOString(),
    }, null, 2), "utf8");
    const copied = { ...source, imported: true, importedAs: destinationSlug };
    imported.push(copied);
    sharedBySlug.set(destinationSlug, copied);
  }

  const after = await getBrainSkillInventory(input.vaultPath);
  if (imported.length) await writeSkillsReadme(after);
  return {
    ...after,
    imported,
    skipped,
    provider,
  };
}

async function nextDestinationSlug(
  skillsFolder: string,
  slug: string,
  provider: BrainSkillProviderId | "shared",
  sharedBySlug: Map<string, BrainSkillSummary>,
) {
  const candidates = [slug, `${provider}-${slug}`].map(sanitizeSlug);
  for (const candidate of candidates) {
    if (!sharedBySlug.has(candidate) && !(await exists(join(skillsFolder, candidate)))) return candidate;
  }
  let index = 2;
  while (true) {
    const candidate = sanitizeSlug(`${provider}-${slug}-${index}`);
    if (!sharedBySlug.has(candidate) && !(await exists(join(skillsFolder, candidate)))) return candidate;
    index += 1;
  }
}

async function exists(path: string) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function writeSkillsReadme(inventory: BrainSkillInventory) {
  const grouped = new Map<string, BrainSkillSummary[]>();
  for (const skill of inventory.shared) {
    const key = skill.providerLabel || "Shared brain";
    grouped.set(key, [...(grouped.get(key) ?? []), skill]);
  }

  const lines = [
    "# Skills",
    "",
    "Operational know-how distilled into self-contained recipes. Each subfolder is a single skill: a `SKILL.md` with frontmatter plus optional helper files.",
    "",
    "This index is maintained by OpenClaw Brain skill import. Edit individual `SKILL.md` files at the source when a provider owns them, then import again to mirror them here.",
    "",
    "## Index",
    "",
  ];

  for (const [label, skills] of [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(`### ${label}`, "");
    for (const skill of skills.sort((a, b) => a.name.localeCompare(b.name))) {
      lines.push(`- [[${skill.importedAs ?? skill.slug}/SKILL]] - ${skill.description || skill.name}`);
    }
    lines.push("");
  }

  await writeFile(inventory.readmePath, `${lines.join("\n").trim()}\n`, "utf8");
}
