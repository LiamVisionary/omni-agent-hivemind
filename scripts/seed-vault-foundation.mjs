import { constants } from "node:fs";
import { access, mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, sep } from "node:path";

const DEFAULTS = {
  vaultPath: "~/Documents/Obsidian/hivemindos-vault",
  scheduledFolder: "Operations/Automations",
  synthesisFolder: "Synthesis",
  brainServicesFolder: "Operations/Brain Services",
  kanbanFolder: "Operations/Work Board",
  notificationsFolder: "Operations/Agent Notifications",
};

const WORKFLOW_ROOT = "Foundation Workflows";

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    args[key] = argv[index + 1] && !argv[index + 1].startsWith("--") ? argv[index + 1] : "true";
    if (args[key] !== "true") index += 1;
  }
  return args;
}

function expandHome(path) {
  return path === "~" || path.startsWith("~/") ? join(homedir(), path.slice(2)) : path;
}

function safeVaultFolder(value, fallback) {
  const folder = String(value || fallback).trim();
  if (!folder) return fallback;
  if (isAbsolute(folder) || folder.split(/[\\/]+/).includes("..")) {
    throw new Error(`Vault folder must be relative: ${folder}`);
  }
  return folder.split(/[\\/]+/).filter(Boolean).join(sep);
}

async function exists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function writeIfMissing(path, content) {
  if (await exists(path)) return false;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${content.trim()}\n`, "utf8");
  return true;
}

function workflowPrompt(workflow, folders) {
  const operationLogPath = `${folders.scheduledFolder}/${WORKFLOW_ROOT}/OPERATIONS-LOG.md`;
  const rules = [
    "Read AGENTS.md and Shared Context.md before writing.",
    "Never delete files. Move or archive only when the task explicitly says to do so.",
    `Treat ${folders.kanbanFolder} and ${folders.scheduledFolder} as operational state, not permanent knowledge.`,
    `Treat ${folders.synthesisFolder} as generated or reviewed synthesis, not raw intake.`,
    "Do not store provider secrets in the vault.",
    `Summarize every write in ${operationLogPath} or in the scheduled run note.`,
  ].join("\n- ");
  return `${workflow.intent}

HivemindOS mapping:
- Intake: raw captures, imports, clips, and unsorted request notes.
- Memory: durable notes, daily briefings, weekly reviews, imported sources, and distilled knowledge.
- Projects: project dossiers, decisions, overview notes, and status material.
- Operations: automations, work-board state, agent notifications, wallet notes, and brain-service status.
- Synthesis: Synto/GBrain-assisted drafts, connection reports, reviewed wiki notes, and agent packs.
- Archive: inactive or superseded material.

Hard rules:
- ${rules}

Read:
${workflow.read.map((item) => `- ${item}`).join("\n")}

Write:
${workflow.write.map((item) => `- ${item}`).join("\n")}

Output standard:
${workflow.outputStandard}`;
}

function scheduleMarkdown(workflow, folders) {
  const config = {
    id: `foundation:${workflow.slug}`,
    name: workflow.name,
    agentName: "Queen Bee",
    machineName: "Foundation Workflows",
    runtime: "openai-compatible",
    enabled: false,
    every: workflow.every,
    mode: "prompt",
    prompt: workflowPrompt(workflow, folders),
    model: "",
    skills: workflow.skills,
    paths: workflow.paths,
    steps: [],
    externalSource: "hivemindos-foundation",
    externalJobId: `foundation:${workflow.slug}`,
    updatedAt: Date.now(),
    usePastRuns: true,
    pastRunLimit: 4,
  };
  return `---
type: hivemindos-schedule
template: foundation-workflow
scheduleId: ${JSON.stringify(config.id)}
scheduleName: ${JSON.stringify(workflow.name)}
device: Foundation Workflows
agentName: Queen Bee
runtime: openai-compatible
enabled: false
every: ${JSON.stringify(workflow.every)}
externalSource: hivemindos-foundation
externalJobId: ${JSON.stringify(config.externalJobId)}
usePastRuns: true
pastRunLimit: 4
---

# ${workflow.name}

Disabled Foundation workflow template. Enable it from the HivemindOS Automations surface after choosing the agent, cadence, model, and approval posture.

## Canonical Outputs

${workflow.write.map((item) => `- ${item}`).join("\n")}

## Prompt

\`\`\`text
${config.prompt}
\`\`\`

## Config JSON

\`\`\`text
${JSON.stringify(config, null, 2)}
\`\`\``;
}

function workflowReadme(folders) {
  const operationLogPath = `${folders.scheduledFolder}/${WORKFLOW_ROOT}/OPERATIONS-LOG.md`;
  return `# Foundation Workflows

Self-writing vault workflows adapted into HivemindOS Foundation.

These templates intentionally keep the article-style capabilities while avoiding the numbered PARA folder scheme. They are disabled by default. Enable one at a time from the dashboard after choosing an agent and reviewing the write policy.

| Article concept | HivemindOS home |
| --- | --- |
| Inbox | Intake |
| Generated | Synthesis and Memory |
| Queue | Operations/Work Board and Intake/Requests |
| Daily Notes | Memory/Daily Briefings |
| System | AGENTS.md, Shared Context.md, Operations |
| Autonomous write logs | ${operationLogPath} and scheduled run notes |

Recommended rollout:

1. Daily Context Generator
2. Queue Processor
3. Connection Finder
4. Weekly Synthesis
5. Project Auto-Updater
6. Knowledge Distillation Engine`;
}

function operationLog() {
  return `# Foundation Workflow Operations Log

Append write summaries here when an automation writes outside its scheduled run note.

Format:

- YYYY-MM-DD HH:mm agent/workflow -> path changed -> short reason`;
}

const args = parseArgs(process.argv.slice(2));
const folders = {
  scheduledFolder: safeVaultFolder(args.scheduledFolder ?? process.env.NEXT_PUBLIC_OBSIDIAN_SCHEDULED_FOLDER, DEFAULTS.scheduledFolder),
  synthesisFolder: safeVaultFolder(args.synthesisFolder ?? process.env.NEXT_PUBLIC_OBSIDIAN_SYNTHESIS_FOLDER, DEFAULTS.synthesisFolder),
  brainServicesFolder: safeVaultFolder(args.brainServicesFolder ?? process.env.NEXT_PUBLIC_OBSIDIAN_BRAIN_SERVICES_FOLDER, DEFAULTS.brainServicesFolder),
  kanbanFolder: safeVaultFolder(args.kanbanFolder ?? process.env.NEXT_PUBLIC_OBSIDIAN_KANBAN_FOLDER, DEFAULTS.kanbanFolder),
  notificationsFolder: safeVaultFolder(args.notificationsFolder ?? process.env.NEXT_PUBLIC_OBSIDIAN_NOTIFICATIONS_FOLDER, DEFAULTS.notificationsFolder),
};
const vaultPath = expandHome(args.vault ?? process.env.NEXT_PUBLIC_OBSIDIAN_VAULT_PATH ?? DEFAULTS.vaultPath);

const workflows = [
  {
    slug: "daily-context-generator",
    name: "Daily Context Generator",
    every: "daily 06:00",
    skills: ["gbrain/think", "vault-synthesis"],
    paths: ["Shared Context.md", "Intake", "Memory/Daily Briefings", "Projects", folders.kanbanFolder],
    intent: "Generate a concise morning context note from recent captures, active projects, open loops, and operational state.",
    read: [
      "`Shared Context.md` and `AGENTS.md`",
      "`Memory/Daily Briefings/` most recent notes",
      "`Projects/` active project overview/status notes",
      "`Intake/` captures from the last 48 hours",
      `ready and blocked work in \`${folders.kanbanFolder}\` when readable`,
    ],
    write: [
      "`Memory/Daily Briefings/YYYY-MM-DD.md`",
      `run note under \`${folders.scheduledFolder}/Foundation Workflows/daily-context-generator/\``,
    ],
    outputStandard: "Under 350 words. Sections: Focus, Before Noon, Risks, Open Loops, Suggested First Move. Cite source notes by wikilink or path.",
  },
  {
    slug: "connection-finder",
    name: "Connection Finder",
    every: "weekly Monday 09:00",
    skills: ["gbrain/query", "vault-linker"],
    paths: ["Intake", "Memory", "Projects", folders.synthesisFolder, "Skills"],
    intent: "Find non-obvious links between recent notes and older vault knowledge without auto-editing source notes.",
    read: [
      `notes modified in the last 7 days under \`Intake/\`, \`Memory/\`, \`Projects/\`, \`${folders.synthesisFolder}/\`, and \`Skills/\``,
      "older related notes discovered by search, wikilinks, GBrain, or graph inspection",
    ],
    write: [
      `\`${folders.synthesisFolder}/wiki/synthesis/Connections-YYYY-MM-DD.md\``,
      "`Intake/Requests/` only for suggested follow-up tasks that need human review",
    ],
    outputStandard: "Connection report with source, connected note, connection type, why it matters, and suggested wikilinks. No source-note mutation.",
  },
  {
    slug: "queue-processor",
    name: "Queue Processor",
    every: "every 2 hours",
    skills: ["kanban-orchestrator", "vault-synthesis"],
    paths: ["Intake/Requests", folders.kanbanFolder, folders.synthesisFolder, "Archive/Processed Requests"],
    intent: "Process request notes and work-board queue items asynchronously, then file outputs into the correct HivemindOS layer.",
    read: [
      "`Intake/Requests/` request notes whose filenames start with `RESEARCH-`, `SYNTHESIZE-`, `DRAFT-`, or `ANALYZE-`",
      `ready queue state in \`${folders.kanbanFolder}\``,
      "relevant project, memory, and synthesis source notes",
    ],
    write: [
      `drafts and reports in \`${folders.synthesisFolder}/wiki/.drafts/\` or \`${folders.synthesisFolder}/wiki/synthesis/\``,
      "`Projects/<project>/` only when the request names a project explicitly",
      "`Archive/Processed Requests/` after preserving the original request content",
    ],
    outputStandard: "Produce the requested artifact, then append a short processing report with source paths, destination, and unresolved questions.",
  },
  {
    slug: "weekly-synthesis",
    name: "Weekly Synthesis",
    every: "weekly Sunday 20:00",
    skills: ["vault-synthesis", "journal-synthesis"],
    paths: ["Memory/Daily Briefings", "Projects", folders.synthesisFolder, folders.kanbanFolder],
    intent: "Summarize the week across work, memory, generated outputs, and completed operational tasks.",
    read: [
      "`Memory/Daily Briefings/` notes from the past 7 days",
      "`Projects/` files modified this week",
      `\`${folders.synthesisFolder}/\` outputs modified this week`,
      `done/completed work in \`${folders.kanbanFolder}\` when readable`,
    ],
    write: [
      "`Memory/Weekly Reviews/YYYY-MM-DD.md`",
    ],
    outputStandard: "Sections: Moved Forward, Stalled, Patterns, Top 3 Next Week, Decisions to Make. Be direct and evidence-backed.",
  },
  {
    slug: "project-auto-updater",
    name: "Project Auto-Updater",
    every: "daily 18:00",
    skills: ["kanban-orchestrator", "vault-synthesis"],
    paths: ["Projects", folders.kanbanFolder, "Memory/Daily Briefings"],
    intent: "Keep project overview notes fresh by appending status deltas rather than rewriting project history.",
    read: [
      "`Projects/` files modified in the last 24 hours",
      "matching work-board cards and recent daily briefings",
      "the project overview file when one exists",
    ],
    write: [
      "`Projects/<project>/overview.md` or the existing top-level project note",
      "`Memory/Daily Briefings/YYYY-MM-DD.md` only when a project delta affects tomorrow's context",
    ],
    outputStandard: "Append a dated status delta with Changed, Meaning, Next Action, Risk. Do not replace existing overview prose.",
  },
  {
    slug: "knowledge-distillation-engine",
    name: "Knowledge Distillation Engine",
    every: "monthly first Sunday 19:00",
    skills: ["vault-synthesis", "gbrain/query"],
    paths: ["Memory", "Projects", folders.synthesisFolder, "Skills"],
    intent: "Compress related recent notes into durable reference documents while preserving source trails.",
    read: [
      "`Memory/Imported Sources/` and other durable notes modified in the last 30 days",
      "`Projects/` decisions and retrospectives",
      `reviewed material in \`${folders.synthesisFolder}/wiki/synthesis/\``,
      "`Skills/` only for reusable agent capability knowledge",
    ],
    write: [
      "`Memory/Distillations/YYYY-MM-DD-<topic>.md`",
      `source trails in \`${folders.synthesisFolder}/wiki/sources/\` when useful`,
    ],
    outputStandard: "One distilled insight per note. Include source links, claims, open questions, and when to reuse the distillation.",
  },
];

await mkdir(vaultPath, { recursive: true });
await Promise.all([
  "Intake",
  "Intake/Requests",
  "Memory",
  "Memory/Daily Briefings",
  "Memory/Weekly Reviews",
  "Memory/Imported Sources",
  "Memory/Distillations",
  "Projects",
  "Operations",
  folders.scheduledFolder,
  join(folders.scheduledFolder, WORKFLOW_ROOT),
  folders.kanbanFolder,
  folders.notificationsFolder,
  folders.brainServicesFolder,
  folders.synthesisFolder,
  `${folders.synthesisFolder}/raw`,
  `${folders.synthesisFolder}/wiki/.drafts`,
  `${folders.synthesisFolder}/wiki/sources`,
  `${folders.synthesisFolder}/wiki/queries`,
  `${folders.synthesisFolder}/wiki/synthesis`,
  `${folders.synthesisFolder}/pack`,
  "Archive",
  "Archive/Processed Requests",
].map((folder) => mkdir(join(vaultPath, folder), { recursive: true })));

await writeIfMissing(join(vaultPath, folders.scheduledFolder, WORKFLOW_ROOT, "README.md"), workflowReadme(folders));
await writeIfMissing(join(vaultPath, folders.scheduledFolder, WORKFLOW_ROOT, "OPERATIONS-LOG.md"), operationLog());

let created = 0;
for (const workflow of workflows) {
  const path = join(vaultPath, folders.scheduledFolder, WORKFLOW_ROOT, workflow.slug, "schedule.md");
  if (await writeIfMissing(path, scheduleMarkdown(workflow, folders))) created += 1;
}

console.log(`Seeded HivemindOS Foundation workflows: ${created} created, ${workflows.length - created} already present.`);
