export type MiroSharkAnalysisMode = "verdict" | "risks" | "public-reaction" | "market" | "follow-up";

export type MiroSharkAnalysisAgent = {
  id?: string;
  name?: string;
  runtime?: string;
};

export type MiroSharkAnalysisPost = {
  author?: string;
  handle?: string;
  text?: string;
  time?: string;
};

export type MiroSharkAnalysisMarket = {
  symbol?: string;
  ticks?: number[];
};

export type MiroSharkAnalysisRun = {
  id: string;
  title?: string;
  summary?: string;
  scenario?: string;
  state?: string;
  platform?: string;
  started?: string;
  posts?: number;
  agents?: number;
  threadPosts?: MiroSharkAnalysisPost[];
  timelineItems?: Array<{ title?: string; body?: string; level?: string; tone?: string }>;
  integrationItems?: Array<{ id?: string; title?: string; body?: string; level?: string }>;
  marketPriceItems?: Array<{ title?: string; body?: string; tone?: string }>;
};

export type MiroSharkIntelligence = {
  title: string;
  body: string;
  verdict: string;
  qualityLabel: "low" | "medium" | "high";
  qualityScore: number;
  action: string;
  socialRead: string;
  marketRead: string;
  riskRead: string;
  proClaims: string[];
  conClaims: string[];
  coverage: Array<{ label: string; ok: boolean; detail: string }>;
};

const SUPPORT_WORDS = ["excited", "hope", "support", "benefit", "game changer", "sustainable", "trust", "potential"];
const CONCERN_WORDS = ["worried", "concern", "safety", "smell", "risk", "bad", "rush", "regulation", "reputation"];
const RISK_WORDS = ["safety", "smell", "subsid", "regulation", "trust", "reputation", "inspect", "adoption"];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function countMatches(text: string, words: string[]) {
  const lower = text.toLowerCase();
  return words.reduce((count, word) => count + (lower.includes(word) ? 1 : 0), 0);
}

// Adapted from VaultForge's first-sentence note-title funnel: keep the first sentence
// as the durable note/display title, then preserve the remaining prompt as body context.
export function splitSimulationText(text?: string) {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return { title: "Simulation overview", body: "" };
  const sentenceMatch = trimmed.match(/^(.+?[.!?])\s+(.+)$/s);
  if (sentenceMatch) return { title: sentenceMatch[1].trim(), body: sentenceMatch[2].trim() };
  if (trimmed.length <= 96) return { title: trimmed, body: "" };
  const splitAt = trimmed.lastIndexOf(" ", 96);
  const index = splitAt > 40 ? splitAt : 96;
  return { title: `${trimmed.slice(0, index).trim()}...`, body: trimmed.slice(index).trim() };
}

export function safeMiroSharkSlug(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 96) || "run";
}

function topClaims(posts: MiroSharkAnalysisPost[], words: string[], fallback: string) {
  const ranked = posts
    .map((post) => ({ text: (post.text ?? "").trim(), score: countMatches(post.text ?? "", words) }))
    .filter((item) => item.text && item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)
    .map((item) => item.text.length > 150 ? `${item.text.slice(0, 150).trim()}...` : item.text);
  return ranked.length ? ranked : [fallback];
}

export function buildMiroSharkIntelligence(run: MiroSharkAnalysisRun, market: MiroSharkAnalysisMarket = {}): MiroSharkIntelligence {
  const overview = splitSimulationText(run.scenario || run.title || run.summary);
  const posts = run.threadPosts ?? [];
  const postText = posts.map((post) => post.text ?? "").join("\n");
  const support = countMatches(postText, SUPPORT_WORDS);
  const concern = countMatches(postText, CONCERN_WORDS);
  const risk = countMatches(`${overview.body}\n${postText}`, RISK_WORDS);
  const priceTicks = market.ticks ?? [];
  const latestPrice = priceTicks.at(-1);
  const outputs = run.integrationItems?.length ?? 0;
  const hasDraft = run.integrationItems?.some((item) => item.id === "miroshark-integration-draft") ?? false;
  const timelineCount = run.timelineItems?.length ?? 0;
  const qualityScore = clamp(
    (posts.length >= 8 ? 30 : posts.length >= 4 ? 18 : posts.length * 4)
    + (priceTicks.length ? 22 : 0)
    + (timelineCount ? 18 : 0)
    + (outputs > 1 ? 16 : outputs ? 8 : 0)
    + (run.agents && run.agents >= 3 ? 14 : 0),
    0,
    100,
  );
  const qualityLabel = qualityScore >= 70 ? "high" : qualityScore >= 42 ? "medium" : "low";
  const socialRead = posts.length
    ? concern > support
      ? "Concern-led reaction: objections and caution cues outweigh support."
      : support > concern
        ? "Support-led reaction: positive and adoption cues outweigh objections."
        : "Mixed reaction: support and concern cues are balanced."
    : "No social posts were available to analyze.";
  const marketRead = typeof latestPrice === "number"
    ? `${market.symbol ?? "Market"} latest YES ${(latestPrice * 100).toFixed(0)}% across ${priceTicks.length} point${priceTicks.length === 1 ? "" : "s"}.`
    : "No market price data was available.";
  const riskRead = risk >= 4
    ? "High review need: safety, trust, regulation, or adoption risks appear repeatedly."
    : risk >= 2
      ? "Moderate review need: some risk themes appeared."
      : "Low explicit risk signal in the returned text.";
  const verdict = qualityLabel === "low"
    ? "Treat this as an early directional read, not a decision-quality result."
    : concern > support
      ? "The run points to cautious or negative adoption pressure."
      : support > concern
        ? "The run points to cautiously positive adoption pressure."
        : "The run is mixed and needs deeper comparison before action.";

  return {
    title: overview.title,
    body: overview.body || run.summary || "",
    verdict,
    qualityLabel,
    qualityScore,
    action: hasDraft
      ? "Analyze first, then publish only if this is the result you want downstream tools to use."
      : qualityLabel === "low"
        ? "Run a deeper simulation or generate an agent verdict before relying on this output."
        : "Use the agent verdict and saved notes as the next decision checkpoint.",
    socialRead,
    marketRead,
    riskRead,
    proClaims: topClaims(posts, SUPPORT_WORDS, "No clear pro claim was returned."),
    conClaims: topClaims(posts, CONCERN_WORDS, "No clear con claim was returned."),
    coverage: [
      { label: "Posts", ok: posts.length > 0, detail: `${posts.length} visible` },
      { label: "Market", ok: priceTicks.length > 0, detail: `${priceTicks.length} price point${priceTicks.length === 1 ? "" : "s"}` },
      { label: "Timeline", ok: timelineCount > 0, detail: `${timelineCount} event${timelineCount === 1 ? "" : "s"}` },
      { label: "Outputs", ok: outputs > 0, detail: `${outputs} card${outputs === 1 ? "" : "s"}` },
    ],
  };
}

export function buildMiroSharkAnalysisMarkdown(input: {
  mode: MiroSharkAnalysisMode;
  run: MiroSharkAnalysisRun;
  market?: MiroSharkAnalysisMarket;
  agent?: MiroSharkAnalysisAgent;
  agentVerdict?: string;
  intelligence?: MiroSharkIntelligence;
}) {
  const intelligence = input.intelligence ?? buildMiroSharkIntelligence(input.run, input.market);
  const agentName = input.agent?.name?.trim() || "Unassigned agent";
  const modeLabel = input.mode.replace(/-/g, " ");
  const lines = [
    "---",
    "type: miroshark-analysis",
    `simulation_id: ${input.run.id}`,
    `analysis_mode: ${input.mode}`,
    `agent: ${JSON.stringify(agentName)}`,
    `quality_score: ${intelligence.qualityScore}`,
    `quality_label: ${intelligence.qualityLabel}`,
    "---",
    "",
    `# ${agentName} - ${modeLabel} - ${intelligence.title}`,
    "",
    ...(input.agentVerdict?.trim() ? [
      "## Agent Verdict",
      "",
      input.agentVerdict.trim(),
      "",
    ] : []),
    "## Verdict",
    "",
    intelligence.verdict,
    "",
    "## Signal Quality",
    "",
    `- Score: ${intelligence.qualityScore}/100 (${intelligence.qualityLabel})`,
    `- Recommended action: ${intelligence.action}`,
    "",
    "## At-a-glance Reads",
    "",
    `- Social: ${intelligence.socialRead}`,
    `- Market: ${intelligence.marketRead}`,
    `- Risk: ${intelligence.riskRead}`,
    "",
    "## Strongest Support Signals",
    "",
    ...intelligence.proClaims.map((claim) => `- ${claim}`),
    "",
    "## Strongest Objections",
    "",
    ...intelligence.conClaims.map((claim) => `- ${claim}`),
    "",
    "## Coverage",
    "",
    "| Surface | Status | Detail |",
    "| --- | --- | --- |",
    ...intelligence.coverage.map((item) => `| ${item.label} | ${item.ok ? "present" : "missing"} | ${item.detail} |`),
    "",
    "## Agent Follow-up Prompt",
    "",
    "Use the archived run JSON, posts, market prices, and output payloads in this folder to produce a deeper critique. Prioritize decision usefulness over summarizing raw data.",
  ];
  return `${lines.join("\n").trimEnd()}\n`;
}
