import { constants } from "fs";
import { access, cp, mkdir, readdir, readFile, rm, stat, writeFile } from "fs/promises";
import { createHash } from "crypto";
import { homedir } from "os";
import { basename, dirname, join, relative, resolve } from "path";
import { resolveObsidianVaultPath } from "@/lib/services/obsidian/vault-path";

export type BrainSkillProviderId = "claude" | "codex" | "hermes" | "gemini" | "openclaw" | "aeon";

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

export type BrainSkillAeonSyncResult = {
  vaultPath: string;
  aeonRoot: string;
  skillsFolder: string;
  manifestPath: string;
  synced: BrainSkillSummary[];
  skipped: Array<BrainSkillSummary & { reason: string }>;
  totalShared: number;
};

export type RemoteBrainSkillInput = {
  slug?: string;
  name?: string;
  description?: string;
  source?: string;
  category?: string;
  skillMdUrl?: string;
  githubUrl?: string;
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
  {
    id: "aeon",
    label: "Aeon",
    home: "~/.aeon",
    roots: [
      { path: "~/.aeon/skills", maxDepth: 4 },
      { path: "~/.aeon/plugins", maxDepth: 8 },
      { path: "~/.aeon/agents", maxDepth: 6 },
      { path: process.env.AEON_LOCAL_PATH ? `${process.env.AEON_LOCAL_PATH}/skills` : "~/.aeon/repo/skills", maxDepth: 3 },
    ],
  },
];

const SKIPPED_DIRS = new Set([".git", "node_modules", ".next", "dist", "build", ".cache"]);
const SOURCE_METADATA_FILE = ".hivemind-skill-source.json";
const BUNDLED_SHARED_SKILLS = [
  {
    slug: "karpathy-guidelines",
    providerLabel: "Bundled skills",
    sourceUrl: "https://github.com/multica-ai/andrej-karpathy-skills/tree/main/skills/karpathy-guidelines",
  },
];

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

async function readManagedMetadata(skillDir: string): Promise<Record<string, unknown> | null> {
  const metadata = await readText(join(skillDir, SOURCE_METADATA_FILE));
  if (!metadata) return null;
  try {
    return JSON.parse(metadata) as Record<string, unknown>;
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
  const summaries = await Promise.all(files.map((skillPath) => skillSummary({
    skillPath,
    provider: "shared",
    providerLabel: "Shared brain",
    basePath: skillsFolder,
    sharedByChecksum: blank,
    sharedBySlug: blank,
  })));
  const unique = new Map<string, BrainSkillSummary>();
  for (const skill of summaries.sort((a, b) => (
    sourcePriority(a) - sourcePriority(b)
    || a.slug.length - b.slug.length
    || a.relativePath.localeCompare(b.relativePath)
  ))) {
    const key = sanitizeSlug(skill.name || skill.slug);
    if (!unique.has(key)) unique.set(key, skill);
  }
  return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name));
}

async function ensureSharedSkillsFolder(vaultPath: string) {
  const skillsFolder = join(vaultPath, "Skills");
  await mkdir(skillsFolder, { recursive: true });

  let seeded = false;
  for (const skill of BUNDLED_SHARED_SKILLS) {
    const sourceDir = join(process.cwd(), "skills", skill.slug);
    const sourceSkillPath = join(sourceDir, "SKILL.md");
    if (!(await exists(sourceSkillPath))) continue;

    const destinationDir = join(skillsFolder, skill.slug);
    const destinationSkillPath = join(destinationDir, "SKILL.md");
    if (await exists(destinationSkillPath)) continue;

    await cp(sourceDir, destinationDir, {
      recursive: true,
      errorOnExist: false,
      force: false,
      filter: (path) => !path.split("/").some((part) => SKIPPED_DIRS.has(part)),
    });
    await writeFile(join(destinationDir, SOURCE_METADATA_FILE), JSON.stringify({
      provider: "bundled",
      providerLabel: skill.providerLabel,
      sourceUrl: skill.sourceUrl,
      importedAt: new Date().toISOString(),
    }, null, 2), "utf8");
    seeded = true;
  }

  return seeded;
}

function sourcePriority(skill: BrainSkillSummary) {
  if (skill.providerLabel === "Shared brain") return 0;
  return 1;
}

export async function getBrainSkillInventory(vaultPath?: string): Promise<BrainSkillInventory> {
  const resolvedVault = resolveObsidianVaultPath(vaultPath);
  const skillsFolder = join(resolvedVault, "Skills");
  const readmePath = join(skillsFolder, "README.md");
  const seeded = await ensureSharedSkillsFolder(resolvedVault);
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

  const inventory = {
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
  if (seeded) await writeSkillsReadme(inventory);
  return inventory;
}

export async function getSharedBrainSkills(vaultPath?: string): Promise<{
  vaultPath: string;
  skillsFolder: string;
  readmePath: string;
  shared: BrainSkillSummary[];
}> {
  const resolvedVault = resolveObsidianVaultPath(vaultPath);
  const skillsFolder = join(resolvedVault, "Skills");
  const readmePath = join(skillsFolder, "README.md");
  const seeded = await ensureSharedSkillsFolder(resolvedVault);
  const shared = await readSharedSkills(resolvedVault);
  if (seeded) {
    await writeSkillsReadme({
      vaultPath: resolvedVault,
      skillsFolder,
      readmePath,
      shared,
      providers: [],
      totals: { shared: shared.length, providerSkills: 0, importable: 0 },
    });
  }
  return { vaultPath: resolvedVault, skillsFolder, readmePath, shared };
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
    const existingSharedSkill = sharedBySlug.get(source.slug);
    if (source.imported || existingSharedSkill) {
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
    sharedBySlug.set(source.slug, copied);
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

export async function importRemoteBrainSkill(input: {
  vaultPath?: string;
  skill: RemoteBrainSkillInput;
}): Promise<BrainSkillInventory> {
  const before = await getBrainSkillInventory(input.vaultPath);
  await mkdir(before.skillsFolder, { recursive: true });
  const skill = input.skill;
  const slug = sanitizeSlug(skill.slug || skill.name || "skill");
  const sharedBySlug = new Map(before.shared.map((item) => [item.slug, item]));
  const destinationSlug = await nextDestinationSlug(before.skillsFolder, slug, "shared", sharedBySlug);
  const destinationDir = join(before.skillsFolder, destinationSlug);
  await mkdir(destinationDir, { recursive: true });

  let markdown = "";
  if (skill.skillMdUrl) {
    const response = await fetch(skill.skillMdUrl, { signal: AbortSignal.timeout(12_000) });
    if (response.ok) markdown = await response.text();
  }

  if (!markdown.trim()) {
    markdown = [
      "---",
      `name: "${(skill.name || slugToName(destinationSlug)).replace(/"/g, "'")}"`,
      `description: "${(skill.description || "Shared agent skill.").replace(/"/g, "'")}"`,
      "---",
      "",
      `# ${skill.name || slugToName(destinationSlug)}`,
      "",
      skill.description || "Use this skill when its title matches the task.",
      "",
      "## Source",
      "",
      skill.githubUrl ? `- Repository: ${skill.githubUrl}` : "",
      skill.skillMdUrl ? `- SKILL.md: ${skill.skillMdUrl}` : "",
    ].filter(Boolean).join("\n");
  }

  await writeFile(join(destinationDir, "SKILL.md"), markdown.endsWith("\n") ? markdown : `${markdown}\n`, "utf8");
  await writeFile(join(destinationDir, SOURCE_METADATA_FILE), JSON.stringify({
    provider: "remote",
    providerLabel: skill.source || "Skill browser",
    sourceUrl: skill.skillMdUrl || skill.githubUrl || "",
    importedAt: new Date().toISOString(),
  }, null, 2), "utf8");

  const after = await getBrainSkillInventory(input.vaultPath);
  await writeSkillsReadme(after);
  return after;
}

function resolveAeonRoot(aeonLocalPath?: string) {
  const configured = aeonLocalPath?.trim()
    || process.env.AEON_LOCAL_PATH?.trim()
    || process.env.AEON_HOME?.trim()
    || "~/.aeon";
  return resolve(expandHome(configured));
}

export async function syncSharedBrainSkillsToAeon(input: {
  vaultPath?: string;
  aeonLocalPath?: string;
}): Promise<BrainSkillAeonSyncResult> {
  const inventory = await getBrainSkillInventory(input.vaultPath);
  const aeonRoot = resolveAeonRoot(input.aeonLocalPath);
  const skillsFolder = join(aeonRoot, "skills");
  const manifestPath = join(aeonRoot, "skills.json");
  await mkdir(skillsFolder, { recursive: true });

  const synced: BrainSkillSummary[] = [];
  const skipped: Array<BrainSkillSummary & { reason: string }> = [];

  for (const skill of inventory.shared) {
    const sourceDir = dirname(skill.path);
    const destinationDir = join(skillsFolder, skill.slug);
    const destinationSkill = join(destinationDir, "SKILL.md");
    const destinationExists = await exists(destinationSkill);
    const destinationMetadata = destinationExists ? await readManagedMetadata(destinationDir) : null;
    const destinationText = destinationExists ? await readText(destinationSkill) : "";
    const destinationChecksum = destinationText ? checksum(destinationText) : "";
    const managedByHivemind = destinationMetadata?.managedBy === "hivemindos" || destinationMetadata?.provider === "shared-brain";

    if (destinationExists && destinationChecksum !== skill.checksum && !managedByHivemind) {
      skipped.push({ ...skill, reason: `Aeon already has an unmanaged skill at ${destinationDir}` });
      continue;
    }

    if (managedByHivemind) await rm(destinationDir, { recursive: true, force: true });
    await cp(sourceDir, destinationDir, {
      recursive: true,
      errorOnExist: false,
      force: true,
      filter: (path) => !path.split("/").some((part) => SKIPPED_DIRS.has(part)),
    });
    await writeFile(join(destinationDir, SOURCE_METADATA_FILE), JSON.stringify({
      managedBy: "hivemindos",
      provider: "shared-brain",
      providerLabel: "Shared brain",
      sourcePath: skill.path,
      sourceChecksum: skill.checksum,
      syncedAt: new Date().toISOString(),
    }, null, 2), "utf8");
    synced.push(skill);
  }

  await writeAeonSkillsManifest(manifestPath, inventory.shared, skipped);
  return {
    vaultPath: inventory.vaultPath,
    aeonRoot,
    skillsFolder,
    manifestPath,
    synced,
    skipped,
    totalShared: inventory.shared.length,
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

async function writeAeonSkillsManifest(
  manifestPath: string,
  shared: BrainSkillSummary[],
  skipped: Array<BrainSkillSummary & { reason: string }>,
) {
  let existingSkills: Array<Record<string, unknown>> = [];
  const existing = await readText(manifestPath);
  if (existing.trim()) {
    try {
      const parsed = JSON.parse(existing) as { skills?: Array<Record<string, unknown>> };
      existingSkills = Array.isArray(parsed.skills) ? parsed.skills : [];
    } catch {
      existingSkills = [];
    }
  }

  const skippedSlugs = new Set(skipped.map((skill) => skill.slug));
  const retained = existingSkills.filter((skill) => {
    const slug = typeof skill.slug === "string" ? skill.slug : "";
    if (!slug) return false;
    if (skill.source === "shared-brain") return false;
    return true;
  });
  const sharedEntries = shared
    .filter((skill) => !skippedSlugs.has(skill.slug))
    .map((skill) => ({
      slug: skill.slug,
      name: skill.name,
      description: skill.description,
      source: "shared-brain",
      skillMdPath: skill.path,
      checksum: skill.checksum,
    }));

  const manifest = {
    managedBy: "hivemindos",
    updatedAt: new Date().toISOString(),
    skills: [...retained, ...sharedEntries].sort((a, b) => String(a.slug).localeCompare(String(b.slug))),
  };
  await mkdir(dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
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
    "This index is maintained by HivemindOS skill import. Edit individual `SKILL.md` files at the source when a provider owns them, then import again to mirror them here.",
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
