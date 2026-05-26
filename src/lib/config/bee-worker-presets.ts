import type { BeeWorkerClass } from "@/lib/types/agent-runtime";

export type BeeWorkerPreset = {
  id: BeeWorkerClass;
  label: string;
  summary: string;
  modelHint: string;
  taskProfile: string;
  skillSlugs: string[];
};

export const BEE_WORKER_PRESETS: Record<BeeWorkerClass, BeeWorkerPreset> = {
  general: {
    id: "general",
    label: "General",
    summary: "Broad execution, handoffs, and everyday coordination.",
    modelHint: "Balanced model is fine; escalate when the task crosses domains.",
    taskProfile: "General worker bee: handle broad tasks, coordinate handoffs, summarize current state, and route specialized work to the right worker class when the job becomes clearly coding, research, design, writing, ops, or QA.",
    skillSlugs: ["karpathy-guidelines", "kanban-worker", "obsidian", "browser"],
  },
  planner: {
    id: "planner",
    label: "Planner",
    summary: "Breaks ambiguous goals into sequenced plans and delegation routes.",
    modelHint: "Use a strong reasoning model for multi-step or cross-agent planning.",
    taskProfile: "Planner bee: decompose vague goals into ordered steps, identify dependencies and risks, choose which worker class should handle each piece, and produce a compact execution plan with verification checkpoints.",
    skillSlugs: ["writing-plans", "kanban-orchestrator", "creative-ideation", "architecture-diagram"],
  },
  code: {
    id: "code",
    label: "Engineer",
    summary: "Programming, debugging, tests, APIs, automation, and repo work.",
    modelHint: "Use a strong coding model for multi-file changes or architecture work.",
    taskProfile: "Engineer bee: implement code changes, debug failures, inspect repositories, write focused tests, run type/lint/build checks, and keep changes scoped to the existing project patterns.",
    skillSlugs: ["karpathy-guidelines", "test-driven-development", "systematic-debugging", "codebase-inspection", "github-code-review", "browser"],
  },
  vision: {
    id: "vision",
    label: "Vision",
    summary: "Screenshots, UI inspection, visual QA, OCR, and image understanding.",
    modelHint: "Use a vision-capable strong model when screenshots or visual details matter.",
    taskProfile: "Vision bee: inspect screenshots and browser states, compare UI against references, identify layout/overlap/contrast issues, extract visible text when useful, and report visual QA findings with concrete coordinates or selectors.",
    skillSlugs: ["browser", "chrome", "computer-use", "qwen-annotate", "ocr-and-documents"],
  },
  writer: {
    id: "writer",
    label: "Writer",
    summary: "Docs, copy, summaries, long-form writing, and humanized language.",
    modelHint: "Use a strong language model for voice, structure, and polish-sensitive work.",
    taskProfile: "Writer bee: draft, revise, summarize, and polish writing. Use the humanizer skill when the output should sound more natural and less synthetic, and preserve the user's voice instead of flattening it.",
    skillSlugs: ["humanizer", "youtube-content", "x-post-optimizer", "research-paper-writing", "obsidian"],
  },
  research: {
    id: "research",
    label: "Research",
    summary: "Web browsing, source gathering, synthesis, and evidence-backed analysis.",
    modelHint: "Recommended: strong model with browsing/source handling for accuracy.",
    taskProfile: "Research bee: browse for current information, collect high-quality sources, compare claims, extract evidence, synthesize findings, and clearly separate sourced facts from assumptions.",
    skillSlugs: ["browser", "chrome", "arxiv", "youtube-content", "obsidian", "polymarket"],
  },
  artist: {
    id: "artist",
    label: "Artist",
    summary: "Image generation, image edits, assets, art direction, and visual systems.",
    modelHint: "Use image-capable models/tools for asset creation and visual iteration.",
    taskProfile: "Artist bee: create and refine visual assets, generate or edit images, produce style directions, keep assets readable at target sizes, and validate generated artwork before wiring it into the app.",
    skillSlugs: ["imagegen", "pixel-art", "baoyu-comic", "baoyu-infographic", "frontend-design", "popular-web-designs"],
  },
  ops: {
    id: "ops",
    label: "Ops",
    summary: "Deployments, environments, fleet, MCP, webhooks, and runtime health.",
    modelHint: "Use a careful model for commands that can affect infrastructure or secrets.",
    taskProfile: "Ops bee: manage runtime setup, environment sync, deployment checks, fleet/agent bridge issues, MCP integration, webhooks, logs, and operational runbooks with conservative safety around secrets and remote mutation.",
    skillSlugs: ["systematic-debugging", "github-auth", "github-pr-workflow", "webhook-subscriptions", "mcp-integration", "native-mcp"],
  },
  qa: {
    id: "qa",
    label: "QA",
    summary: "Testing, verification, review passes, and bug reproduction.",
    modelHint: "Use a detail-oriented model; escalate for broad product review.",
    taskProfile: "QA bee: reproduce issues, run verification, perform code-review style risk checks, use browser smoke tests when UI changed, and report findings by severity with file/line or screenshot evidence.",
    skillSlugs: ["dogfood", "requesting-code-review", "systematic-debugging", "test-driven-development", "browser", "chrome"],
  },
};

export const BEE_WORKER_PRESET_LIST = Object.values(BEE_WORKER_PRESETS);

export function beeWorkerPreset(workerClass: BeeWorkerClass) {
  return BEE_WORKER_PRESETS[workerClass] ?? BEE_WORKER_PRESETS.general;
}
