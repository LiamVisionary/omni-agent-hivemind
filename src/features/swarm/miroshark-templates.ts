export type MiroSharkTemplate = {
  id?: string;
  name?: string;
  category?: string;
  description?: string;
  difficulty?: string;
  estimated_agents?: number;
  estimated_rounds?: number;
  platforms?: string[];
  tags?: string[];
  has_counterfactuals?: boolean;
  counterfactual_count?: number;
};

export type MiroSharkTemplateInputKind = "text" | "textarea";

export type MiroSharkTemplateInputField = {
  key: string;
  label: string;
  placeholder: string;
  kind?: MiroSharkTemplateInputKind;
  required?: boolean;
  help?: string;
};

export type MiroSharkTemplateInputState = Record<string, string>;

export const MIROSHARK_TEMPLATE_INPUTS: Record<string, MiroSharkTemplateInputField[]> = {
  "x-thread": [
    { key: "topic", label: "Thread topic", placeholder: "e.g. HivemindOS ships a new Swarm Theater", required: true },
    { key: "audience", label: "Audience", placeholder: "Builders, operators, customers, investors" },
    { key: "angle", label: "Narrative angle", placeholder: "What should the thread convince readers to notice?" },
  ],
  "market-maker": [
    { key: "instrument", label: "Instrument", placeholder: "e.g. Fed July rate-cut odds, BTC ETF flow, AI chip demand", required: true },
    { key: "shock", label: "Market shock", placeholder: "e.g. hot CPI, dovish Fed, whale unwind, liquidity drain", required: true },
    { key: "agents", label: "Market participants", placeholder: "Market makers, takers, whales, hedgers, news traders" },
    { key: "question", label: "Prediction question", placeholder: "What binary market or price belief should move?" },
  ],
  "reddit-narrative": [
    { key: "community", label: "Community", placeholder: "e.g. r/wallstreetbets, r/singularity, r/apple", required: true },
    { key: "seed", label: "Seed post", placeholder: "What initial post should trigger the comment cascade?", required: true, kind: "textarea" },
    { key: "conflict", label: "Debate fault line", placeholder: "What factions form in replies?" },
  ],
  polymarket: [
    { key: "question", label: "Binary question", placeholder: "e.g. Will the Fed cut rates by 25bp at the July meeting?", required: true },
    { key: "initialOdds", label: "Initial odds", placeholder: "e.g. YES 62c / NO 38c" },
    { key: "news", label: "News shocks", placeholder: "What headlines should agents react to?", kind: "textarea" },
  ],
  "research-swarm": [
    { key: "question", label: "Research question", placeholder: "e.g. What evidence supports launching this product?", required: true },
    { key: "sources", label: "Sources", placeholder: "URLs, files, authors, datasets, or search targets", kind: "textarea" },
    { key: "deliverable", label: "Deliverable", placeholder: "Consensus brief, risk memo, launch recommendation, source map" },
  ],
  ops: [
    { key: "system", label: "System", placeholder: "e.g. Obsidian sync, agent queue, wallet ledger, scheduler", required: true },
    { key: "failure", label: "Failure profile", placeholder: "e.g. vault conflict storm, tailnet partition, stale env keys", required: true },
    { key: "intensity", label: "Intensity", placeholder: "e.g. 2 sigma, 5 rounds, high concurrency" },
    { key: "success", label: "Success criteria", placeholder: "What should survive or recover?" },
  ],
  custom: [
    { key: "scenario", label: "Scenario", placeholder: "Describe the world and participants to simulate.", required: true, kind: "textarea" },
  ],
  campus_controversy: [
    { key: "institution", label: "Institution", placeholder: "e.g. UC Berkeley", required: true },
    { key: "policy", label: "Policy change", placeholder: "e.g. mandatory AI disclosure for coursework", required: true },
    { key: "flashpoint", label: "Flashpoint", placeholder: "What event makes the controversy break open?" },
    { key: "stakeholders", label: "Key groups", placeholder: "Students, faculty senate, alumni donors, local journalists, activist orgs" },
    { key: "decision", label: "Decision to rehearse", placeholder: "What leadership decision or announcement should the swarm pressure-test?" },
  ],
  corporate_crisis: [
    { key: "company", label: "Company / brand", placeholder: "e.g. Acme Foods", required: true },
    { key: "trigger", label: "Crisis trigger", placeholder: "e.g. viral safety complaint, leaked memo, outage, lawsuit", required: true },
    { key: "product", label: "Product or business line", placeholder: "What exactly is under scrutiny?" },
    { key: "response", label: "Response options", placeholder: "Apology, recall, refund, executive statement, policy change" },
    { key: "market", label: "Market question", placeholder: "What would traders or predictors bet on?" },
  ],
  crypto_launch: [
    { key: "tokenName", label: "Token name", placeholder: "e.g. NomCoin" },
    { key: "tokenSymbol", label: "Symbol", placeholder: "e.g. NOM" },
    { key: "tokenAddress", label: "Coin / contract address", placeholder: "0x... or chain-native mint address", required: true },
    { key: "chain", label: "Chain / network", placeholder: "Base, Ethereum, Solana, BSC, Polygon...", required: true, help: "Needed because EVM-style addresses can exist on multiple chains." },
    { key: "launchStage", label: "Launch stage", placeholder: "Pre-launch, fair launch, stealth launch, CEX listing, post-launch dip" },
    { key: "liquidity", label: "Liquidity / market context", placeholder: "Pool size, FDV, holders, volume, lock status, vesting concerns" },
    { key: "catalyst", label: "Catalyst to rehearse", placeholder: "Influencer push, exploit rumor, liquidity pull fear, exchange listing, whale buy" },
  ],
  historical_whatif: [
    { key: "event", label: "Historical event", placeholder: "e.g. Apollo 11 landing, 2008 bailout vote, Brexit referendum", required: true },
    { key: "divergence", label: "Point of divergence", placeholder: "What changes compared with the real timeline?", required: true },
    { key: "setting", label: "Time and place", placeholder: "When and where does public discourse happen?" },
    { key: "actors", label: "Key actors", placeholder: "Scholars, officials, journalists, affected communities, enthusiasts" },
    { key: "stakes", label: "Outcome to test", placeholder: "Trust, policy, markets, alliances, cultural reaction" },
  ],
  political_debate: [
    { key: "jurisdiction", label: "Jurisdiction", placeholder: "e.g. New York City, California, UK Parliament", required: true },
    { key: "issue", label: "Issue / proposal", placeholder: "e.g. congestion pricing expansion, housing zoning reform", required: true },
    { key: "sides", label: "Coalitions", placeholder: "Who supports it, who opposes it, and why?" },
    { key: "voters", label: "Audience segments", placeholder: "Young renters, commuters, small business owners, unions, parents" },
    { key: "trigger", label: "Debate trigger", placeholder: "Poll, debate clip, scandal, court ruling, endorsement, budget vote" },
  ],
  product_announcement: [
    { key: "company", label: "Company", placeholder: "e.g. Cursor, Apple, OpenAI", required: true },
    { key: "product", label: "Product", placeholder: "e.g. Composer 2.5, headset, agent platform", required: true },
    { key: "claim", label: "Launch claim", placeholder: "What headline promise should users react to?" },
    { key: "price", label: "Pricing / availability", placeholder: "Price, rollout timing, region, usage limits" },
    { key: "audience", label: "Audience and competitors", placeholder: "Developers, creators, enterprises, power users; key alternatives" },
  ],
};

export const SWARM_LAUNCH_PRESETS: MiroSharkTemplate[] = [
  {
    id: "x-thread",
    name: "X thread",
    category: "Autoposter",
    description: "Simulate how an X thread travels through agents, quote-posts, replies, and narrative drift.",
    estimated_agents: 12,
    estimated_rounds: 12,
    platforms: ["twitter"],
    tags: ["x", "publisher", "thread"],
  },
  {
    id: "market-maker",
    name: "Market maker",
    category: "Market",
    description: "Simulate market makers, takers, liquidity shocks, and prediction-market price discovery.",
    estimated_agents: 24,
    estimated_rounds: 24,
    platforms: ["polymarket"],
    tags: ["market-maker", "liquidity", "shock"],
  },
  {
    id: "reddit-narrative",
    name: "Reddit narrative",
    category: "Social",
    description: "Simulate a seeded Reddit post and the factional comment cascade that follows it.",
    estimated_agents: 16,
    estimated_rounds: 16,
    platforms: ["reddit"],
    tags: ["reddit", "cascade", "narrative"],
  },
  {
    id: "polymarket",
    name: "Polymarket binary",
    category: "Market",
    description: "Simulate binary prediction-market odds as agents react to new evidence and headlines.",
    estimated_agents: 48,
    estimated_rounds: 32,
    platforms: ["polymarket"],
    tags: ["polymarket", "prediction-market", "odds"],
  },
  {
    id: "research-swarm",
    name: "Research swarm",
    category: "Research",
    description: "Simulate research agents reading sources, disagreeing, and converging on a consensus brief.",
    estimated_agents: 8,
    estimated_rounds: 8,
    platforms: ["twitter"],
    tags: ["research", "sources", "brief"],
  },
  {
    id: "ops",
    name: "Ops stress test",
    category: "Ops",
    description: "Simulate an operational failure storm and how agents detect, triage, and recover.",
    estimated_agents: 6,
    estimated_rounds: 5,
    platforms: ["twitter"],
    tags: ["ops", "failure", "recovery"],
  },
  {
    id: "custom",
    name: "Blank canvas",
    category: "Custom",
    description: "Launch a custom MiroShark simulation from a hand-written scenario.",
    estimated_agents: 1,
    estimated_rounds: 5,
    platforms: ["twitter"],
    tags: ["custom"],
  },
];

export function defaultMirosharkTemplateInputs(templateId?: string): MiroSharkTemplateInputState {
  return Object.fromEntries((MIROSHARK_TEMPLATE_INPUTS[templateId ?? ""] ?? []).map((field) => [field.key, ""]));
}

export function composeMirosharkTemplateScenario(template: MiroSharkTemplate, inputs: MiroSharkTemplateInputState) {
  const fields = MIROSHARK_TEMPLATE_INPUTS[template.id ?? ""] ?? [];
  const filledInputs = fields
    .map((field) => ({ field, value: inputs[field.key]?.trim() ?? "" }))
    .filter((item) => item.value);
  const facts = filledInputs.map(({ field, value }) => `${field.label}: ${value}.`);
  const requiredMissing = fields.filter((field) => field.required && !inputs[field.key]?.trim());
  const templateName = template.name ?? template.id ?? "MiroShark rehearsal";
  const templateId = template.id ?? "";
  const presetInstruction = templateId === "market-maker"
    ? "Model market makers and takers as distinct agents. Include order-book pressure, liquidity gaps, spread changes, and a prediction-market style belief update."
    : templateId === "polymarket"
      ? "Model a binary prediction market. Agents should update YES/NO odds as news arrives and explain what moves the price."
      : templateId === "reddit-narrative"
        ? "Model a Reddit comment cascade. Include nested replies, faction formation, moderation pressure, memes, skepticism, and consensus drift."
        : templateId === "research-swarm"
          ? "Model research agents reviewing sources, challenging each other, identifying uncertainty, and converging on a concise consensus brief."
          : templateId === "ops"
            ? "Model an operational incident drill. Include detection, triage, escalation, recovery attempts, residual risk, and clear pass/fail signals."
            : templateId === "x-thread"
              ? "Model X/Twitter post dynamics. Include quote-posts, replies, influencer amplification, backlash, and shareable thread takeaways."
              : "";
  const baseScenario = templateId === "custom" && inputs.scenario?.trim()
    ? inputs.scenario.trim()
    : `${templateName}: ${template.description ?? "Run this MiroShark template."}`;
  const baseLines = [
    baseScenario,
    presetInstruction,
    facts.length ? `Concrete rehearsal inputs:\n${facts.join("\n")}` : "",
    requiredMissing.length ? `Missing required inputs before this becomes a strong rehearsal: ${requiredMissing.map((field) => field.label).join(", ")}.` : "",
    template.tags?.length ? `Focus tags: ${template.tags.join(", ")}.` : "",
    template.has_counterfactuals ? "Include counterfactual branch opportunities and decision points." : "",
  ];
  return baseLines.filter(Boolean).join("\n\n");
}
