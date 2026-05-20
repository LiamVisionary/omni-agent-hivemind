#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

ok() { printf "\033[1;32m✓\033[0m %s\n" "$*"; }
warn() { printf "\033[1;33m!\033[0m %s\n" "$*"; }

normalize_list() {
  printf "%s" "$1" | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]'
}

import_sources="none"
share_targets="all"

while (( $# > 0 )); do
  case "$1" in
    --import-sources)
      import_sources="$(normalize_list "${2:-}")"
      shift 2
      ;;
    --share-targets)
      share_targets="$(normalize_list "${2:-}")"
      shift 2
      ;;
    --help)
      cat <<'EOF'
Usage: seed-shared-skills.sh [--import-sources all|none|codex,claude,hermes,gemini,openclaw,aeon] [--share-targets all|none|codex,claude,hermes,gemini,openclaw,aeon]

Seeds bundled shared skills into the shared notes Skills shelf, optionally imports
existing runtime skills into that shelf, then mirrors the shared baseline skill
and managed skill-shelf instructions into selected runtime homes.
EOF
      exit 0
      ;;
    *)
      warn "Ignoring unknown option: $1"
      shift
      ;;
  esac
done

vault_path="${NEXT_PUBLIC_OBSIDIAN_VAULT_PATH:-$HOME/Documents/Obsidian/omni-agent-hivemind-vault}"
if [[ "$vault_path" == "~/"* ]]; then
  vault_path="$HOME/${vault_path#~/}"
fi

skills_folder="$vault_path/Skills"
mkdir -p "$skills_folder"

source_dir="$ROOT/skills/karpathy-guidelines"
target_dir="$skills_folder/karpathy-guidelines"

agent_ids=(codex claude hermes gemini openclaw aeon)

agent_label() {
  case "$1" in
    codex) printf "Codex" ;;
    claude) printf "Claude" ;;
    hermes) printf "Hermes" ;;
    gemini) printf "Gemini" ;;
    openclaw) printf "OpenClaw" ;;
    aeon) printf "Aeon" ;;
    *) printf "%s" "$1" ;;
  esac
}

agent_skill_roots() {
  case "$1" in
    codex)
      printf "%s\n" "$HOME/.codex/skills" "$HOME/.codex/plugins/cache"
      ;;
    claude)
      printf "%s\n" "$HOME/.claude/skills" "$HOME/.claude/plugins"
      ;;
    hermes)
      printf "%s\n" "$HOME/.hermes/skills" "$HOME/.hermes/plugins" "$HOME/.hermes/agents"
      ;;
    gemini)
      printf "%s\n" "$HOME/.gemini/skills" "$HOME/.gemini/extensions"
      ;;
    openclaw)
      printf "%s\n" "$HOME/.openclaw/skills"
      for workspace in "$HOME"/.openclaw/workspace-*; do
        [[ -d "$workspace/skills" ]] && printf "%s\n" "$workspace/skills"
      done
      ;;
    aeon)
      printf "%s\n" "$HOME/.aeon/skills" "$HOME/.aeon/plugins" "$HOME/.aeon/agents"
      [[ -n "${AEON_LOCAL_PATH:-}" && -d "$AEON_LOCAL_PATH/skills" ]] && printf "%s\n" "$AEON_LOCAL_PATH/skills"
      ;;
  esac
}

agent_instruction_files() {
  case "$1" in
    codex)
      printf "%s\n" "$HOME/.codex/AGENTS.md"
      ;;
    claude)
      printf "%s\n" "$HOME/.claude/CLAUDE.md"
      ;;
    hermes)
      printf "%s\n" "$HOME/.hermes/AGENTS.md"
      ;;
    gemini)
      printf "%s\n" "$HOME/.gemini/GEMINI.md"
      ;;
    openclaw)
      printf "%s\n" "$HOME/.openclaw/AGENTS.md"
      for workspace in "$HOME"/.openclaw/workspace-*; do
        [[ -d "$workspace" ]] && printf "%s\n" "$workspace/AGENTS.md"
      done
      ;;
    aeon)
      printf "%s\n" "$HOME/.aeon/AGENTS.md"
      ;;
  esac
}

list_includes_agent() {
  local list="$1"
  local agent="$2"
  [[ "$list" == "all" ]] && return 0
  [[ "$list" == "none" || -z "$list" ]] && return 1
  case ",$list," in
    *",$agent,"*) return 0 ;;
    *) return 1 ;;
  esac
}

copy_skill_dir() {
  local from_dir="$1"
  local to_dir="$2"
  if [[ ! -f "$from_dir/SKILL.md" ]]; then
    warn "Bundled skill source missing: $from_dir/SKILL.md"
    return
  fi
  if [[ -f "$to_dir/SKILL.md" ]]; then
    return
  fi
  mkdir -p "$to_dir"
  cp -R "$from_dir/." "$to_dir/"
}

copy_provider_skill() {
  local from_dir="$1"
  local provider="$2"
  local slug
  slug="$(basename "$from_dir" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9._-]+/-/g; s/^-+|-+$//g')"
  [[ -n "$slug" ]] || slug="skill"
  local destination="$skills_folder/$slug"
  if [[ -f "$destination/SKILL.md" ]]; then
    return 1
  fi
  copy_skill_dir "$from_dir" "$destination"
  cat > "$destination/.hivemind-skill-source.json" <<JSON
{
  "provider": "$provider",
  "providerLabel": "$(agent_label "$provider")",
  "sourcePath": "$from_dir",
  "importedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
JSON
  return 0
}

import_agent_skills() {
  local agent="$1"
  local imported=0
  while IFS= read -r root_dir; do
    [[ -d "$root_dir" ]] || continue
    while IFS= read -r skill_md; do
      skill_dir="$(dirname "$skill_md")"
      if [[ "$skill_dir" == "$skills_folder"* ]]; then
        continue
      fi
      if copy_provider_skill "$skill_dir" "$agent"; then
        imported=$((imported + 1))
      fi
    done < <(find "$root_dir" -maxdepth 5 -name SKILL.md -type f 2>/dev/null)
  done < <(agent_skill_roots "$agent")

  if (( imported > 0 )); then
    ok "Imported $imported $(agent_label "$agent") skill(s) into the shared hive"
  fi
}

write_source_metadata() {
  local dir="$1"
  cat > "$dir/.hivemind-skill-source.json" <<JSON
{
  "provider": "bundled",
  "providerLabel": "Bundled skills",
  "sourceUrl": "https://github.com/multica-ai/andrej-karpathy-skills/tree/main/skills/karpathy-guidelines",
  "importedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
JSON
}

write_managed_block() {
  local file="$1"
  local start="<!-- BEGIN OMNI_AGENT_HIVEMIND_SHARED_SKILLS -->"
  local end="<!-- END OMNI_AGENT_HIVEMIND_SHARED_SKILLS -->"
  local tmp_file
  tmp_file="$(mktemp)"
  mkdir -p "$(dirname "$file")"

  if [[ -f "$file" ]]; then
    awk -v start="$start" -v end="$end" '
      $0 == start { skip=1; next }
      $0 == end { skip=0; next }
      skip != 1 { print }
    ' "$file" > "$tmp_file"
  else
    : > "$tmp_file"
  fi

  {
    sed -e '${/^$/d;}' "$tmp_file"
    printf "\n%s\n" "$start"
    printf "## Omni-Agent Hivemind Shared Skills\n\n"
    printf "A shared notes skill shelf is available at:\n\n"
    printf "%s\n" "- Vault: \`$vault_path\`"
    printf "%s\n" "- Skills index: \`$skills_folder/README.md\`"
    printf "%s\n\n" "- Skill files: \`$skills_folder/<slug>/SKILL.md\`"
    printf "Before using a shared skill, read \`%s/README.md\` for the index, then read the relevant \`SKILL.md\`. The bundled baseline skill is \`karpathy-guidelines\`.\n" "$skills_folder"
    printf "%s\n" "$end"
  } > "$file"

  rm -f "$tmp_file"
}

write_skills_readme() {
  local tmp_file
  tmp_file="$(mktemp)"
  cat > "$tmp_file" <<EOF
# Skills

Operational know-how distilled into self-contained recipes. Each subfolder is a single skill: a \`SKILL.md\` with frontmatter plus optional helper files.

Agents should read this index before using shared skills, then read the relevant \`<slug>/SKILL.md\` file.

## Index

EOF
  while IFS= read -r skill_md; do
    local slug description
    slug="$(basename "$(dirname "$skill_md")")"
    description="$(awk '
      BEGIN { in_fm=0 }
      NR == 1 && $0 == "---" { in_fm=1; next }
      in_fm && $0 == "---" { exit }
      in_fm && /^description:/ {
        sub(/^description:[[:space:]]*/, "")
        gsub(/^["'\'']|["'\'']$/, "")
        print
        exit
      }
    ' "$skill_md")"
    [[ -n "$description" ]] || description="Shared agent skill."
    printf -- "- [[%s/SKILL]] - %s\n" "$slug" "$description" >> "$tmp_file"
  done < <(find "$skills_folder" -mindepth 2 -maxdepth 2 -name SKILL.md -type f 2>/dev/null | sort)
  mv "$tmp_file" "$skills_folder/README.md"
}

sync_shared_skills_to_aeon() {
  local aeon_root="${AEON_LOCAL_PATH:-${AEON_HOME:-$HOME/.aeon}}"
  local aeon_skills="$aeon_root/skills"
  local manifest="$aeon_root/skills.json"
  mkdir -p "$aeon_skills"

  while IFS= read -r skill_md; do
    local skill_dir slug destination metadata
    skill_dir="$(dirname "$skill_md")"
    slug="$(basename "$skill_dir")"
    destination="$aeon_skills/$slug"
    metadata="$destination/.hivemind-skill-source.json"
    if [[ -f "$destination/SKILL.md" && ! -f "$metadata" ]]; then
      warn "Skipping Aeon skill sync for $slug; unmanaged Aeon skill already exists"
      continue
    fi
    rm -rf "$destination"
    mkdir -p "$destination"
    cp -R "$skill_dir/." "$destination/"
    cat > "$metadata" <<JSON
{
  "managedBy": "omni-agent-hivemind",
  "provider": "shared-brain",
  "providerLabel": "Shared brain",
  "sourcePath": "$skill_md",
  "syncedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
JSON
  done < <(find "$skills_folder" -mindepth 2 -maxdepth 2 -name SKILL.md -type f 2>/dev/null | sort)

  node - "$skills_folder" "$manifest" <<'NODE'
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const [skillsFolder, manifestPath] = process.argv.slice(2);
let retained = [];
try {
  const parsed = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  retained = Array.isArray(parsed.skills) ? parsed.skills.filter((skill) => skill?.source !== "shared-brain") : [];
} catch {}
const shared = fs.readdirSync(skillsFolder, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => {
    const skillPath = path.join(skillsFolder, entry.name, "SKILL.md");
    if (!fs.existsSync(skillPath)) return null;
    const markdown = fs.readFileSync(skillPath, "utf8");
    const frontmatter = markdown.match(/^---\n([\s\S]*?)\n---/)?.[1] || "";
    const field = (name) => frontmatter.match(new RegExp(`^${name}:\\\\s*['\\\"]?(.+?)['\\\"]?\\\\s*$`, "m"))?.[1]?.trim() || "";
    return {
      slug: entry.name,
      name: field("name") || entry.name.split(/[-_]/).filter(Boolean).map((part) => part.slice(0, 1).toUpperCase() + part.slice(1)).join(" "),
      description: field("description"),
      source: "shared-brain",
      skillMdPath: skillPath,
      checksum: crypto.createHash("sha256").update(markdown).digest("hex"),
    };
  })
  .filter(Boolean);
const manifest = {
  managedBy: "omni-agent-hivemind",
  updatedAt: new Date().toISOString(),
  skills: [...retained, ...shared].sort((a, b) => String(a.slug).localeCompare(String(b.slug))),
};
fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
NODE
  ok "Synced shared skill shelf to Aeon"
}

if [[ -f "$source_dir/SKILL.md" && ! -f "$target_dir/SKILL.md" ]]; then
  mkdir -p "$target_dir"
  copy_skill_dir "$source_dir" "$target_dir"
  write_source_metadata "$target_dir"
  ok "Seeded shared skill: karpathy-guidelines"
else
  ok "Shared skill folder ready: $skills_folder"
fi

for agent in "${agent_ids[@]}"; do
  if list_includes_agent "$import_sources" "$agent"; then
    import_agent_skills "$agent"
  fi
done

write_skills_readme

write_managed_block "$vault_path/AGENTS.md"

for agent in "${agent_ids[@]}"; do
  if ! list_includes_agent "$share_targets" "$agent"; then
    continue
  fi
  copy_skill_dir "$target_dir" "$HOME/.$agent/skills/karpathy-guidelines"
  if [[ "$agent" == "aeon" ]]; then
    sync_shared_skills_to_aeon
  fi
  while IFS= read -r instruction_file; do
    write_managed_block "$instruction_file"
  done < <(agent_instruction_files "$agent")
done

ok "Runtime skill hints installed for selected agents"
