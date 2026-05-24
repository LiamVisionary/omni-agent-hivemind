#!/usr/bin/env node
import { copyFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const ROOT = resolve(import.meta.dirname, "..");
const BASE_URL = process.env.REMOTION_APP_URL || "http://127.0.0.1:5020";
const USING_EXTERNAL_SERVER = Boolean(process.env.REMOTION_APP_URL);
const OUTPUT = resolve(ROOT, "public/remotion/hivemind-showcase-capture.webm");
const VIEWPORT = { width: 1920, height: 1080 };
const now = Date.now();

const agents = [
  agent("hermes-dev", "Hermes Dev", "hermes", "This Mac", "dev", "worker", "code"),
  agent("queen", "Queen Bee", "openclaw", "This Mac", "main", "queen", "planner"),
  agent("aeon-scheduler", "Aeon Scheduler", "aeon", "lab-linux-1", "aeon", "worker", "ops"),
  agent("hermes-research", "Hermes Research", "hermes", "lab-mac-1", "research", "worker", "research"),
];

const board = {
  meta: {
    slug: "default",
    name: "HivemindOS",
    description: "Video capture demo board",
    createdAt: now - 7_200_000,
    updatedAt: now,
  },
  tasks: [
    task("idea-1", "Turn vault notes into an onboarding brief", "Extract the Brain's hive structure and produce a concise operator brief.", "ideas", "normal", "Queen Bee"),
    task("ready-1", "Plan collector rollout across Tailnet", "Use Fleet status, setup cells, and machine health before touching remote machines.", "ready", "high", "Queen Bee"),
    task("working-1", "Ship Scheduler regression smoke", "Run the scheduler import path with shared skill attachments and capture the result.", "working", "normal", "Aeon Scheduler", "Scheduler smoke passed through test fixtures; next run is queued."),
    task("blocked-1", "Review x402 wallet policy", "Needs a human decision before an agent can spend above the daily cap.", "needs-human", "urgent", "Hermes Research"),
    task("done-1", "Polish alert metadata", "Replace raw runtime identifiers with readable actor metadata.", "done", "normal", "Hermes Dev", "Alert actor metadata now renders with task context and calmer copy."),
  ],
  comments: [
    {
      id: "comment-1",
      taskId: "working-1",
      author: "Queen Bee",
      body: "Simulated run accepted. Keep the Scheduler loop read-only for the video pass.",
      createdAt: now - 420_000,
    },
    {
      id: "comment-2",
      taskId: "done-1",
      author: "Hermes Dev",
      body: "Verification: UI smoke, typecheck, and focused eslint.",
      createdAt: now - 1_200_000,
    },
  ],
  links: [{ parentId: "ready-1", childId: "working-1", createdAt: now - 600_000 }],
  events: [
    event("evt-1", "ready-1", "move", "Queen Bee moved collector rollout into Waiting for Queen."),
    event("evt-2", "working-1", "assign", "Aeon Scheduler claimed Scheduler regression smoke."),
    event("evt-3", "done-1", "done", "Hermes Dev completed alert metadata polish."),
  ],
};

const schedules = [
  {
    id: "schedule-demo-1",
    name: "Morning fleet brief",
    agentId: "aeon-scheduler",
    enabled: true,
    every: "360m",
    mode: "steps",
    prompt: "Scan Fleet health\nSummarize stuck Work cards\nPost a Brain handoff note",
    skills: ["karpathy-guidelines"],
    paths: ["Projects/HivemindOS"],
    steps: [],
    createdAt: now - 4_800_000,
    updatedAt: now - 600_000,
    lastRunAt: now - 900_000,
    externalSource: "aeon",
    externalJobId: "aeon-morning-brief",
    lastStatus: "complete",
    lastSummary: "Fleet clear, one approval needed, brain graph refreshed.",
  },
  {
    id: "schedule-demo-2",
    name: "Hourly agent inbox sweep",
    agentId: "queen",
    enabled: true,
    every: "60m",
    mode: "prompt",
    prompt: "Review Agent Inbox and route actionable notes to the Work board.",
    skills: ["skill-creator"],
    paths: ["Agent Inbox"],
    steps: [],
    createdAt: now - 2_800_000,
    updatedAt: now - 300_000,
    lastRunAt: now - 300_000,
    externalSource: "dashboard",
    lastStatus: "running",
    lastSummary: "Scanning unchecked project notes.",
  },
];

const chatMessages = {
  "hermes-dev": [
    { role: "user", content: "Hermes, run the morning coordination loop against the simulated fleet.", createdAt: now - 360_000 },
    {
      role: "assistant",
      content: "Hermes Dev is online. Fleet is green enough to proceed, the Scheduler smoke is queued, wallet spending is locked, and one Work card needs human approval.",
      createdAt: now - 330_000,
    },
    { role: "user", content: "Show the Brain state in the video pass too.", createdAt: now - 300_000 },
    {
      role: "assistant",
      content: "Using the live Obsidian graph view. The capture will only inspect the UI and avoid opening notes.",
      createdAt: now - 270_000,
    },
  ],
};

function agent(id, name, runtime, machineName, agentId, beeRole, workerClass) {
  const isHermes = runtime === "hermes";
  const isAeon = runtime === "aeon";
  return {
    id,
    name,
    runtime,
    gatewayUrl: isAeon ? "http://127.0.0.1:41241" : isHermes ? "http://127.0.0.1:8642" : "ws://127.0.0.1:18789",
    chatPath: isHermes ? "/chat" : "",
    statusPath: isHermes || isAeon ? "/health" : "",
    agentId,
    machineName,
    telemetryUrl: machineName === "This Mac" ? "http://127.0.0.1:8787" : `http://${machineName}.tailnet:8787`,
    localDataDir: isHermes ? "~/.hermes" : isAeon ? "~/aeon" : "",
    useSharedVault: true,
    runtimeKind: isAeon ? "background" : isHermes ? "interactive" : "gateway",
    runtimeCapabilities: {
      status: true,
      chat: !isAeon,
      skills: true,
      schedules: isAeon || runtime === "openclaw",
      runs: isAeon || isHermes,
      memory: true,
      notifications: true,
      setup: true,
      walletTools: true,
    },
    collectorCapabilities: { chat: !isAeon, runtimes: [runtime], syncthing: true, defaultSyncPath: "~/hivemindos-vault" },
    beeRole,
    workerClass,
  };
}

function task(id, title, body, status, priority, assignee, result = "") {
  return {
    id,
    title,
    body,
    result,
    assignee,
    tenant: "hivemindos",
    status,
    priority,
    workspace: status === "working" ? "worktree" : "scratch",
    skills: status === "working" ? ["karpathy-guidelines"] : [],
    agentSession: status === "working" ? {
      agentId: "aeon-scheduler",
      agentName: "Aeon Scheduler",
      telemetryUrl: "http://lab-linux-1.tailnet:8787",
      sessionId: "demo-session-scheduler",
      startedAt: now - 540_000,
      updatedAt: now - 90_000,
      lastMessageCount: 6,
    } : null,
    createdAt: now - 3_600_000,
    updatedAt: now - (status === "working" ? 90_000 : 600_000),
    completedAt: status === "done" ? now - 1_200_000 : undefined,
  };
}

function event(id, taskId, kind, message) {
  return { id, taskId, kind, message, createdAt: now - 300_000 };
}

function swarmRun() {
  return {
    ok: true,
    status: "started",
    simulationId: "sim_hivemind_video",
    platform: "twitter",
    scenario: "A simulated product launch stress-tests the HivemindOS control room.",
    rounds: 5,
    step: "simulation",
    runStatus: { data: { runner_status: "running", current_round: 4, twitter_current_round: 4, total_rounds: 5, progress_percent: 80 } },
    posts: {
      data: {
        count: 4,
        raw_count: 4,
        posts: [
          { post_id: 1, user_id: 101, created_at: 1, content: "Fleet status says the local collector is healthy. Ship the scheduler smoke first.", num_likes: 41, num_shares: 8 },
          { post_id: 2, user_id: 202, created_at: 2, content: "Brain graph is dense enough to guide routing. Pull the hive context into the handoff.", reply_to_post_id: 1, num_likes: 28, num_shares: 5 },
          { post_id: 3, user_id: 303, created_at: 3, content: "Wallet policy remains locked until approval. Good boundary for autonomous work.", reply_to_post_id: 1, num_likes: 19, num_shares: 2 },
          { post_id: 4, user_id: 404, created_at: 4, content: "Scheduler runbook is clean: scan, route, report, then stop.", reply_to_post_id: 2, num_likes: 33, num_shares: 7 },
        ],
      },
    },
    timeline: [
      { round: 1, type: "fleet", content: "Collectors reported healthy snapshots." },
      { round: 2, type: "scheduler", content: "Automation run queued with Brain and Work attachments." },
      { round: 3, type: "wallet", content: "Payment action paused for human approval." },
    ],
    observabilityEvents: [
      { event_type: "collector.snapshot", message: "4 agents discovered" },
      { event_type: "scheduler.dispatch", message: "Morning fleet brief accepted" },
      { event_type: "brain.graph", message: "Vault graph rendered for inspection" },
    ],
    profiles: [
      { user_id: 101, name: "Ops Lead", role: "operator", bio: "Checks machine health before approving work." },
      { user_id: 202, name: "Memory Keeper", role: "brain", bio: "Turns vault structure into routing hints." },
      { user_id: 303, name: "Policy Guard", role: "wallet", bio: "Keeps spending inside explicit caps." },
    ],
    markets: [
      { question: "Will the scheduler smoke pass without manual runtime access?", yes: "82%", no: "18%" },
    ],
  };
}

async function main() {
  await mkdir(dirname(OUTPUT), { recursive: true });
  const devServer = await ensureServer();
  const actualBrainGraph = await fetchActualBrainGraph();
  const browser = await chromium.launch({ headless: true });
  let context;
  let page;

  try {
    context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: 1,
      serviceWorkers: "block",
      recordVideo: { dir: resolve(ROOT, ".remotion-capture"), size: VIEWPORT },
    });

    await context.addInitScript(({ agents, schedules, chatMessages }) => {
    const sharedVault = {
      enabled: true,
      vaultPath: "~/Documents/Obsidian/hivemindos-vault",
      tailnetSyncHost: "lab-linux-1",
      tailnetSyncPath: "~/Documents/Obsidian/hivemindos-vault",
      tailnetSyncDirection: "bidirectional",
      tailnetSyncEnabled: true,
      tailnetSyncIntervalSeconds: 20,
      inboxFolder: "Agent Inbox",
      sharedNotePath: "HivemindOS/Shared Context.md",
      kanbanFolder: "Projects/HivemindOS/Kanban",
      notificationsFolder: "agent-notifications",
      noteTaskImportFolders: "Projects\nInbox",
      noteTaskImportEnabled: false,
      controlRoomPath: "~/agent-control-room",
      instructions: "Use this vault as the shared memory and handoff space for all local agents.",
    };
    const wallets = {
      queen: { agentId: "queen", enabled: true, provider: "local", network: "eip155:84532", tokenSymbol: "USDC", currentBalanceUsd: 42, seedBalanceUsd: 50, approvalRequiredOverUsd: 3, maxPaymentUsd: 8, dailyComputeBurnUsd: 4, autoPayEnabled: false, clawCardEnvName: "QUEEN_BEE_USDC", x402BaseUrl: "http://localhost:5020/api/wallet/x402/mock-paid", walletAddress: "0xDemoHiveWallet", notes: "" },
    };
    const tasks = [
      { id: "task-demo-1", agentId: "hermes-dev", title: "Morning coordination loop", lastMessage: "Fleet green, scheduler smoke queued, wallet approval held.", status: "completed", startedAt: Date.now() - 380000, updatedAt: Date.now() - 260000, completedAt: Date.now() - 250000, source: "dashboard-chat", messages: chatMessages["hermes-dev"] },
      { id: "task-demo-2", agentId: "aeon-scheduler", title: "Scheduler smoke", lastMessage: "Runbook accepted. Next heartbeat in 6h.", status: "active", startedAt: Date.now() - 180000, updatedAt: Date.now() - 90000, source: "aeon" },
    ];
    window.__HIVEMINDOS_REMOTION_FIXTURES = { agents, schedules, sharedVault, tasks, wallets };
    window.localStorage.setItem("hivemindos.agentProfiles.v1", JSON.stringify(agents));
    window.localStorage.setItem("hivemindos.agentSchedules.v1", JSON.stringify(schedules));
    window.localStorage.setItem("hivemindos.theme.v1", "dark");
    window.localStorage.setItem("hivemindos.sharedVault.v1", JSON.stringify(sharedVault));
    window.localStorage.setItem("hivemindos.agentWallets.v1", JSON.stringify(wallets));
    window.localStorage.setItem("hivemindos.agentTasks.v1", JSON.stringify(tasks));
  }, { agents, schedules, chatMessages });

    await context.route("**/api/fleet/discover", (route) => route.fulfill({
    json: {
      ok: true,
      machines: [
        machine("This Mac", "127.0.0.1", true, agents.slice(0, 2)),
        machine("lab-linux-1", "192.0.2.18", false, [agents[2]]),
        machine("lab-mac-1", "192.0.2.24", false, [agents[3]]),
      ],
    },
  }));
  await context.route("**/api/fleet/snapshot", (route) => route.fulfill({
    json: {
      ok: true,
      snapshots: agents.map((item, index) => ({
        agentId: item.id,
        ok: true,
        runtimeReachable: true,
        processRunning: true,
        summary: index === 2 ? "Running scheduled smoke and writing status." : "Runtime healthy with recent activity.",
        sources: ["simulated collector", "dashboard fixture"],
        tasks: [
          { id: `snap-${item.id}`, agentId: item.id, title: index === 0 ? "Coordinate scheduler smoke" : "Report latest heartbeat", lastMessage: "Simulated collector task is visible in Fleet.", status: index === 2 ? "active" : "completed", startedAt: now - 420_000, updatedAt: now - 90_000, source: "simulated collector" },
        ],
        checkedAt: now,
      })),
    },
  }));
  await context.route("**/api/tailscale/devices", (route) => route.fulfill({
    json: {
      ok: true,
      backendState: "Running",
      devices: [
        { self: true, name: "This Mac", dnsName: "", os: "darwin", online: true, ip: "127.0.0.1", collectorUrl: "http://127.0.0.1:8787" },
        { self: false, name: "lab-linux-1", dnsName: "lab-linux-1.tailnet", os: "linux", online: true, ip: "192.0.2.18", collectorUrl: "http://192.0.2.18:8787" },
        { self: false, name: "lab-mac-1", dnsName: "lab-mac-1.tailnet", os: "darwin", online: true, ip: "192.0.2.24", collectorUrl: "http://192.0.2.24:8787" },
      ],
    },
  }));
  await context.route("**/api/kanban**", (route) => route.fulfill({ json: { ok: true, board, boards: [{ slug: "default", name: "HivemindOS" }], storage: { source: "obsidian", file: "~/Documents/Obsidian/hivemindos-vault/Projects/HivemindOS/Kanban/kanban.json" } } }));
  await context.route("**/api/scheduler/import", (route) => route.fulfill({ json: { ok: true, imported: schedules, message: "Imported 2 simulated runtime schedules." } }));
  await context.route("**/api/miroshark/status", (route) => route.fulfill({ json: { ok: true, baseUrl: "http://127.0.0.1:5101", apiDocsUrl: "http://127.0.0.1:5101/api/docs", install: { running: false }, adminAuth: { configured: true }, endpoints: { templates: "GET /api/templates/list", createSimulation: "POST /api/simulation/create" } } }));
  await context.route("**/api/miroshark/swarm**", (route) => route.fulfill({ json: swarmRun() }));
    await context.route("**/api/miroshark/runs**", (route) => route.fulfill({ json: { ok: true, runs: [swarmRun()] } }));
    await context.route("**/api/obsidian/graph", (route) => {
      if (!actualBrainGraph) return route.continue();
      return route.fulfill({ json: actualBrainGraph });
    });
    await context.route("**/api/openclaw/notifications**", (route) => route.fulfill({
    json: {
      ok: true,
      notifications: [
        { id: "alert-1", title: "Scheduler smoke finished", body: "Aeon Scheduler completed the runbook and left evidence on the Work card.", kind: "task", priority: "normal", read: false, source: "scheduler", author: "Aeon Scheduler", createdAt: new Date(now - 180_000).toISOString(), tags: ["scheduler", "demo"] },
        { id: "alert-2", title: "Wallet approval needed", body: "A simulated x402 call is above the approval threshold. Human confirmation is required.", kind: "decision", priority: "high", read: false, source: "wallet", author: "Policy Guard", createdAt: new Date(now - 90_000).toISOString(), tags: ["wallet", "approval"] },
      ],
      summary: { total: 2, unread: 2, highUnread: 1, urgentUnread: 0 },
      nextCursor: null,
    },
  }));
  await context.route("**/api/openclaw/hivemindos-openclaw-skills", (route) => route.fulfill({ json: { ok: true, skills: [] } }));
  await context.route("**/api/openclaw/skills**", (route) => route.fulfill({ json: { ok: true, skills: [] } }));
  await context.route("**/api/chat/folders", (route) => route.fulfill({ json: { ok: true, folders: [{ path: ROOT, label: "openclaw-next", chats: [] }] } }));
    await context.route("**/api/chat/agent-runtime", fulfillHermesChat);
    await context.route("**/api/app/version", (route) => route.fulfill({ json: { ok: true, branch: "codex/remotion-showcase", shortCommit: "video", dirty: true } }));

    page = await context.newPage();
    await setupPageRoutes(page);
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await seedVideoStorage(page);
    await page.close();

    page = await context.newPage();
    await setupPageRoutes(page);
    page.setDefaultTimeout(6_000);
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await revealDashboardShell(page);
    await page.getByRole("button", { name: /^Fleet\b/i }).waitFor({ timeout: 12_000 });
    await settle(page, 1800);

    console.log("Showcase capture: Work");
    await clickTab(page, "Work");
    await settle(page, 2200);
    await clickOptional(page.getByRole("button", { name: /Ship Scheduler regression smoke/i }), 900);
    await settle(page, 2200);

    console.log("Showcase capture: Scheduler");
    await clickTab(page, "Scheduler");
    await settle(page, 1200);
    await clickOptional(page.getByRole("button", { name: /Steps/i }), 900);
    await fillOptional(page.getByPlaceholder(/Weekly SEO report/i), "Video demo heartbeat", 900);
    await fillOptional(page.getByPlaceholder(/Collect inputs/i), "Read Fleet health\nInspect Brain graph\nSummarize Work board", 900);
    await settle(page, 2600);

    console.log("Showcase capture: Swarm X thread");
    await clickTab(page, "Swarm");
    await settle(page, 1200);
    await fillOptional(page.getByPlaceholder(/Describe the market/i), "Simulate the launch conversation for the HivemindOS control room. Agents should discuss Fleet health, the scheduler smoke, Brain routing, wallet policy, and the chat handoff.", 900);
    await settle(page, 900);
    await clickOptional(page.getByRole("button", { name: /Run swarm/i }), 900);
    await page.getByText(/Simulated on X/i).waitFor({ timeout: 4_000 }).catch(() => undefined);
    await settle(page, 4600);

    console.log("Showcase capture: Brain path tracing");
    await clickTab(page, "Brain");
    await page.getByText(/Loaded first .* notes and links/i).waitFor({ timeout: 6_000 }).catch(() => undefined);
    await settle(page, 1600);
    await clickBrainNode(page, 8);
    await settle(page, 2000);
    await clickBrainNode(page, 16);
    await settle(page, 2000);
    await clickBrainNode(page, 24);
    await settle(page, 2000);

    console.log("Showcase capture: Hermes chat");
    await clickTab(page, "Chat");
    await settle(page, 1600);
    await fillOptional(page.getByPlaceholder(/Ask .* to do something/i), "Run a simulated handoff: fleet, scheduler, swarm, brain, chat.", 1200);
    await clickOptional(page.getByRole("button", { name: /^Send$/i }), 1200);
    await page.getByText(/Run a simulated handoff: fleet, scheduler, swarm, brain, chat\./i).waitFor({ timeout: 2_000 }).catch(() => undefined);
    await settle(page, 700);
    await page.getByText(/Hermes Dev accepted the simulated handoff/i).waitFor({ timeout: 4_000 }).catch(() => undefined);
    await settle(page, 2500);

    console.log("Showcase capture: Fleet close");
    await clickTab(page, "Fleet");
    await settle(page, 2200);

    console.log("Showcase capture: closing browser video");
    const video = page.video();
    await page.close();
    await context.close();
    const sourceVideo = await video?.path();
    if (!sourceVideo || !existsSync(sourceVideo)) {
      throw new Error("Playwright did not produce a showcase recording.");
    }
    await copyFile(sourceVideo, OUTPUT);
    console.log(`Captured showcase source video: ${OUTPUT}`);
  } finally {
    await page?.close().catch(() => undefined);
    await context?.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
    devServer?.kill("SIGTERM");
  }
}

function machine(name, ip, self, machineAgents) {
  return {
    device: { self, name, dnsName: self ? "" : `${name}.tailnet`, os: self ? "darwin" : "linux", online: true, ip, collectorUrl: `http://${ip}:8787` },
    collector: "ready",
    version: { branch: "main", shortCommit: "video", dirty: true },
    capabilities: { chat: true, runtimes: [...new Set(machineAgents.map((item) => item.runtime))], syncthing: true, defaultSyncPath: "~/hivemindos-vault" },
    agents: machineAgents,
    snapshots: [],
  };
}

async function clickTab(page, label) {
  await page.getByRole("button", { name: new RegExp(`^${label}\\b`, "i") }).click({ noWaitAfter: true });
}

async function setupPageRoutes(page) {
  await page.route("**/api/miroshark/swarm**", (route) => route.fulfill({ json: swarmRun() }));
  await page.route("**/api/chat/agent-runtime", fulfillHermesChat);
}

async function seedVideoStorage(page) {
  await page.evaluate(({ agents, schedules, chatMessages }) => {
    const sharedVault = {
      enabled: true,
      vaultPath: "~/Documents/Obsidian/hivemindos-vault",
      tailnetSyncHost: "lab-linux-1",
      tailnetSyncPath: "~/Documents/Obsidian/hivemindos-vault",
      tailnetSyncDirection: "bidirectional",
      tailnetSyncEnabled: true,
      tailnetSyncIntervalSeconds: 20,
      inboxFolder: "Agent Inbox",
      sharedNotePath: "HivemindOS/Shared Context.md",
      kanbanFolder: "Projects/HivemindOS/Kanban",
      notificationsFolder: "agent-notifications",
      noteTaskImportFolders: "Projects\nInbox",
      noteTaskImportEnabled: false,
      controlRoomPath: "~/agent-control-room",
      instructions: "Use this vault as the shared memory and handoff space for all local agents.",
    };
    const wallets = {
      queen: { agentId: "queen", enabled: true, provider: "local", network: "eip155:84532", tokenSymbol: "USDC", currentBalanceUsd: 42, seedBalanceUsd: 50, approvalRequiredOverUsd: 3, maxPaymentUsd: 8, dailyComputeBurnUsd: 4, autoPayEnabled: false, clawCardEnvName: "QUEEN_BEE_USDC", x402BaseUrl: "http://localhost:5020/api/wallet/x402/mock-paid", walletAddress: "0xDemoHiveWallet", notes: "" },
    };
    const tasks = [
      { id: "task-demo-1", agentId: "hermes-dev", title: "Morning coordination loop", lastMessage: "Fleet green, scheduler smoke queued, wallet approval held.", status: "completed", startedAt: Date.now() - 380000, updatedAt: Date.now() - 260000, completedAt: Date.now() - 250000, source: "dashboard-chat", messages: chatMessages["hermes-dev"] },
      { id: "task-demo-2", agentId: "aeon-scheduler", title: "Scheduler smoke", lastMessage: "Runbook accepted. Next heartbeat in 6h.", status: "active", startedAt: Date.now() - 180000, updatedAt: Date.now() - 90000, source: "aeon" },
    ];
    window.__HIVEMINDOS_REMOTION_FIXTURES = { agents, schedules, sharedVault, tasks, wallets };
    window.localStorage.setItem("hivemindos.agentProfiles.v1", JSON.stringify(agents));
    window.localStorage.setItem("hivemindos.agentSchedules.v1", JSON.stringify(schedules));
    window.localStorage.setItem("hivemindos.theme.v1", "dark");
    window.localStorage.setItem("hivemindos.sharedVault.v1", JSON.stringify(sharedVault));
    window.localStorage.setItem("hivemindos.agentWallets.v1", JSON.stringify(wallets));
    window.localStorage.setItem("hivemindos.agentTasks.v1", JSON.stringify(tasks));
  }, { agents, schedules, chatMessages });
}

async function clickBrainNode(page, index) {
  const nodes = page.locator("[data-brain-node-id]");
  const count = await nodes.count().catch(() => 0);
  if (!count) return;
  await nodes.nth(index % count).click({ noWaitAfter: true, force: true }).catch(() => undefined);
}

async function clickOptional(locator, timeout) {
  await locator.click({ noWaitAfter: true, timeout }).catch(() => undefined);
}

async function fillOptional(locator, value, timeout) {
  await locator.fill(value, { timeout }).catch(() => undefined);
}

async function fulfillHermesChat(route) {
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 1500));
  return route.fulfill({
    status: 200,
    headers: { "Content-Type": "text/event-stream; charset=utf-8" },
    body: [
      `data: ${JSON.stringify({ session: { id: "hermes-video-demo", startedAt: now - 30_000, updatedAt: now, messageCount: 2 } })}`,
      "",
      `data: ${JSON.stringify({ choices: [{ delta: { content: "Hermes Dev accepted the simulated handoff. Fleet, Scheduler, Swarm, Brain, and Chat are all visible in the video pass." } }] })}`,
      "",
      "data: [DONE]",
      "",
    ].join("\n"),
  });
}

async function revealDashboardShell(page) {
  await page.addStyleTag({
    content: `
      .commandShell {
        opacity: 1 !important;
        transform: none !important;
      }
    `,
  });
  await page.waitForFunction(() => {
    const shell = document.querySelector(".commandShell");
    if (!shell) return false;
    const style = window.getComputedStyle(shell);
    const rect = shell.getBoundingClientRect();
    return Number(style.opacity) > 0.95 && rect.width > 1000 && rect.height > 600;
  });
}

async function settle(page, ms) {
  await page.waitForTimeout(ms);
}

async function ensureServer() {
  if (await isReachable()) return null;
  if (USING_EXTERNAL_SERVER) {
    throw new Error(`REMOTION_APP_URL is not reachable: ${BASE_URL}`);
  }
  const child = spawn("pnpm", ["dev"], {
    cwd: ROOT,
    stdio: "inherit",
    env: { ...process.env, NEXT_PUBLIC_OBSIDIAN_VAULT_PATH: "~/Documents/Obsidian/hivemindos-vault" },
  });
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (await isReachable()) return child;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 1000));
  }
  child.kill("SIGTERM");
  throw new Error(`Timed out waiting for ${BASE_URL}`);
}

async function fetchActualBrainGraph() {
  try {
    const response = await fetch(`${BASE_URL}/api/obsidian/graph`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vaultPath: "~/Documents/Obsidian/hivemindos-vault" }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function isReachable() {
  try {
    const response = await fetch(BASE_URL, { signal: AbortSignal.timeout(1000) });
    return response.ok;
  } catch {
    return false;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
