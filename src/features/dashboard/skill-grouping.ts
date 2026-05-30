import type { BrainSkillProviderInventory, BrainSkillSummary, SkillBrowserSkill } from "@/features/dashboard/dashboard-types";
import type { RuntimeSkill } from "@/lib/services/runtime-adapters/types";

export type GroupableSkill = {
  slug: string;
  name: string;
  description?: string;
  category?: string;
  source?: string;
  providerLabel?: string;
  enabled?: boolean;
  imported?: boolean;
};

export const SKILL_DEPARTMENTS: Record<string, { label: string; color: string; aliases: string[] }> = {
  operations: { label: "Operations", color: "#94a3b8", aliases: ["ops", "meta", "automation", "scheduler", "runtime"] },
  engineering: { label: "Engineering", color: "#60a5fa", aliases: ["dev", "code", "coding", "software", "mcp"] },
  intelligence: { label: "Intelligence", color: "#22d3ee", aliases: ["news", "research", "analysis", "search"] },
  treasury: { label: "Treasury", color: "#f59e0b", aliases: ["crypto", "wallet", "money", "bankr", "finance"] },
  communications: { label: "Communications", color: "#f472b6", aliases: ["social", "notify", "email", "discord", "slack", "telegram"] },
  publishing: { label: "Publishing", color: "#34d399", aliases: ["content", "write", "article", "blog", "docs"] },
  creative: { label: "Creative", color: "#c084fc", aliases: ["image", "design", "video", "audio", "art"] },
  knowledge: { label: "Knowledge", color: "#a78bfa", aliases: ["memory", "obsidian", "vault", "brain", "note"] },
};

export function normalizeSkillQuery(value: string) {
  return value.trim().toLowerCase();
}

export function skillDepartment(skill: GroupableSkill) {
  const haystack = [
    skill.category,
    skill.source,
    skill.providerLabel,
    skill.slug,
    skill.name,
    skill.description,
  ].filter(Boolean).join(" ").toLowerCase();
  for (const [id, department] of Object.entries(SKILL_DEPARTMENTS)) {
    if (haystack.includes(id) || department.aliases.some((alias) => haystack.includes(alias))) return { id, ...department };
  }
  return { id: "operations", ...SKILL_DEPARTMENTS.operations };
}

export function skillMatchesQuery(skill: GroupableSkill, query: string) {
  const normalized = normalizeSkillQuery(query);
  if (!normalized) return true;
  return [skill.slug, skill.name, skill.description, skill.category, skill.source, skill.providerLabel]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(normalized);
}

export function groupSkills<T extends GroupableSkill>(skills: T[], query = "") {
  const groups = new Map<string, { id: string; label: string; color: string; skills: T[] }>();
  for (const skill of skills.filter((item) => skillMatchesQuery(item, query))) {
    const department = skillDepartment(skill);
    const group = groups.get(department.id) ?? { id: department.id, label: department.label, color: department.color, skills: [] };
    group.skills.push(skill);
    groups.set(group.id, group);
  }
  return [...groups.values()]
    .map((group) => ({
      ...group,
      skills: group.skills.sort((left, right) => Number(right.enabled) - Number(left.enabled) || left.name.localeCompare(right.name)),
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

export function runtimeSkillToGroupable(skill: RuntimeSkill): GroupableSkill & RuntimeSkill {
  return {
    ...skill,
    category: skill.category,
    source: skill.source,
    providerLabel: skill.providerLabel,
  };
}

export function brainSkillToBrowserSkill(skill: BrainSkillSummary): SkillBrowserSkill {
  return {
    id: skill.id,
    slug: skill.slug,
    name: skill.name,
    description: skill.description,
    source: skill.providerLabel,
    category: skill.provider,
    providerId: skill.provider,
    imported: skill.imported,
  };
}

export function providerInventoryToSkills(providers: BrainSkillProviderInventory[] = []) {
  return providers.flatMap((provider) => provider.skills.map((skill) => ({
    ...brainSkillToBrowserSkill(skill),
    source: provider.label,
    providerLabel: provider.label,
    imported: skill.imported,
  })));
}
