#!/usr/bin/env node
import { mkdir, rm, writeFile } from "node:fs/promises";
import { randomBytes, createHash } from "node:crypto";
import { join } from "node:path";

const dashboardUrl = (process.env.DASHBOARD_URL || "http://127.0.0.1:5020").replace(/\/+$/, "");
const runId = process.env.HIVE_E2E_RUN_ID || `hive-e2e-${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}-${randomBytes(3).toString("hex")}`;
const artifactDir = join(process.cwd(), "artifacts", "e2e-real-fleet", runId);
const suiteArg = process.argv.find((arg) => arg.startsWith("--suite="))?.split("=", 2)[1] || "all";
const suites = suiteArg === "all" ? ["agents", "env", "skills", "kanban", "smoke"] : suiteArg.split(",").map((item) => item.trim()).filter(Boolean);
const pollMs = Number(process.env.HIVE_E2E_POLL_MS || 2_000);
const timeoutMs = Number(process.env.HIVE_E2E_TIMEOUT_MS || 180_000);
const vaultPath = process.env.HIVE_E2E_VAULT_PATH || "";
const kanbanFolder = process.env.HIVE_E2E_KANBAN_FOLDER || "";
const kanbanBoard = process.env.HIVE_E2E_KANBAN_BOARD || "hivemindos-e2e";

const summary = {
  ok: false,
  runId,
  dashboardUrl,
  startedAt: new Date().toISOString(),
  suites,
  machines: [],
  results: [],
  cleanup: [],
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function slug(value) {
  return String(value || "machine").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "machine";
}

function envKeyFor(machine, runtime = "GENERIC") {
  return `HIVE_E2E_${runId}_${slug(machine.device?.name || machine.key)}_${runtime}`
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "_")
    .slice(0, 120);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function skillMarkdown(name, text) {
  return [
    "---",
    `name: ${name}`,
    "description: Real fleet E2E propagation test skill.",
    "---",
    "",
    `# ${name}`,
    "",
    text,
    "",
  ].join("\n");
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(options.timeoutMs || 60_000),
  });
  const data = await response.json().catch(async () => ({ error: await response.text().catch(() => "") }));
  if (!response.ok || data?.ok === false || data?.success === false) {
    throw new Error(`${options.method || "GET"} ${url} failed: ${data?.error || response.status}`);
  }
  return data;
}

async function poll(label, fn, timeout = timeoutMs) {
  const deadline = Date.now() + timeout;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const result = await fn();
      if (result) return result;
    } catch (error) {
      lastError = error;
    }
    await sleep(pollMs);
  }
  throw new Error(`${label} timed out${lastError ? `: ${lastError.message}` : ""}`);
}

async function collector(machine, path, options = {}) {
  const base = machine.device.collectorUrl.replace(/\/+$/, "");
  return requestJson(`${base}${path}`, options);
}

async function dashboard(path, options = {}) {
  return requestJson(`${dashboardUrl}${path}`, options);
}

async function discoverFleet() {
  const fleet = await dashboard("/api/fleet/discover", { timeoutMs: 20_000 });
  const machines = (fleet.machines || []).filter((machine) => machine.collector === "ready" && machine.device?.collectorUrl);
  summary.machines = machines.map((machine) => ({
    name: machine.device?.name,
    collectorUrl: machine.device?.collectorUrl,
    capabilities: machine.capabilities || {},
    runtimes: machine.capabilities?.runtimes || [],
    agents: (machine.agents || []).map((agent) => ({ name: agent.name, runtime: agent.runtime, workerClass: agent.workerClass, beeRole: agent.beeRole })),
  }));
  assert(machines.length > 0, "No ready collector-backed machines found in /api/fleet/discover.");
  return machines;
}

async function withResult(name, fn) {
  const startedAt = Date.now();
  const result = { name, ok: false, startedAt: new Date(startedAt).toISOString() };
  summary.results.push(result);
  try {
    result.detail = await fn();
    result.ok = true;
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    result.durationMs = Date.now() - startedAt;
  }
}

async function testAgents(machines) {
  const targets = machines.filter((machine) => machine.capabilities?.runtimeAgentCreation && (machine.capabilities?.runtimes || []).includes("hermes"));
  assert(targets.length > 0, "No Hermes-capable machines support runtime agent creation.");
  const created = [];
  try {
    for (const machine of targets) {
      const profile = `${runId}-${slug(machine.device?.name)}`;
      const name = `${runId} ${machine.device?.name} Hermes worker`;
      const data = await dashboard("/api/agents/runtime", {
        method: "POST",
        body: JSON.stringify({
          collectorUrl: machine.device.collectorUrl,
          agent: {
            name,
            profile,
            runtime: "hermes",
            workerClass: "qa",
            beeRole: "worker",
            useSharedVault: true,
          },
        }),
        timeoutMs: 45_000,
      });
      created.push({ machine, agent: data.agent, profile });
      const listed = await collector(machine, "/agents");
      assert((listed.agents || []).some((agent) => agent.id === data.agent.id && agent.workerClass === "qa"), `Created agent did not appear on ${machine.device?.name}.`);
      await poll(`fleet discovery includes ${name}`, async () => {
        const refreshed = await discoverFleet();
        return refreshed.some((item) => (item.agents || []).some((agent) => agent.id === data.agent.id));
      });
    }
  } finally {
    for (const item of created.reverse()) {
      try {
        await dashboard("/api/agents/runtime", {
          method: "DELETE",
          body: JSON.stringify({
            collectorUrl: item.machine.device.collectorUrl,
            id: item.agent.id,
            runtime: "hermes",
            profile: item.profile,
          }),
          timeoutMs: 45_000,
        });
        await poll(`agent deletion on ${item.machine.device?.name}`, async () => {
          const listed = await collector(item.machine, "/agents");
          return !(listed.agents || []).some((agent) => agent.id === item.agent.id);
        }, 60_000);
        summary.cleanup.push({ type: "agent", ok: true, machine: item.machine.device?.name, id: item.agent.id });
      } catch (error) {
        summary.cleanup.push({ type: "agent", ok: false, machine: item.machine.device?.name, id: item.agent.id, error: error.message });
      }
    }
  }
  return { machinesTested: targets.length };
}

async function testEnvSync(machines) {
  const targets = machines.filter((machine) => machine.capabilities?.envHttpSync);
  assert(targets.length >= 2, "Env propagation tests require at least two env-sync-ready machines.");
  const runtimeScopes = ["generic", "hermes", "openclaw", "aeon"];
  const completed = [];
  for (const runtime of runtimeScopes) {
    const scoped = runtime === "generic"
      ? targets
      : targets.filter((machine) => (machine.capabilities?.runtimes || []).includes(runtime));
    if (scoped.length < 2) continue;
    for (const source of scoped) {
      const key = envKeyFor(source, runtime);
      const value = `${runId}:${slug(source.device?.name)}:${runtime}`;
      await collector(source, "/e2e/env-sync", {
        method: "POST",
        body: JSON.stringify({ key, value, scope: runtime === "generic" ? "all" : "agent", runtime }),
        timeoutMs: 120_000,
      });
      await poll(`${key} propagated`, async () => {
        const states = await Promise.all(scoped.map((machine) => collector(machine, `/env?scope=${runtime === "generic" ? "all" : "agent"}&runtime=${runtime}`)));
        return states.every((state) => state.values?.[key] === value);
      });
      await collector(source, "/e2e/env-sync", {
        method: "POST",
        body: JSON.stringify({ key, value: "", scope: runtime === "generic" ? "all" : "agent", runtime }),
        timeoutMs: 120_000,
      });
      await poll(`${key} removed`, async () => {
        const states = await Promise.all(scoped.map((machine) => collector(machine, `/env?scope=${runtime === "generic" ? "all" : "agent"}&runtime=${runtime}`)));
        return states.every((state) => !Object.prototype.hasOwnProperty.call(state.values || {}, key));
      });
      completed.push({ runtime, source: source.device?.name, checkedMachines: scoped.length });
    }
  }
  assert(completed.length > 0, "No env runtime scope had at least two eligible machines.");
  return { completed };
}

async function testSkillSync(machines) {
  const targets = machines.filter((machine) => machine.capabilities?.skillInventory && machine.capabilities?.skillAutoSync);
  assert(targets.length > 0, "No skill auto-sync capable machines found.");
  const policies = {
    hermes: { autoImport: true, autoUpdate: true, trackRemovals: true, allowDelete: true },
    openclaw: { autoImport: true, autoUpdate: true, trackRemovals: true, allowDelete: true },
    aeon: { autoImport: true, autoUpdate: true, trackRemovals: true, allowDelete: true },
  };
  await dashboard("/api/obsidian/skills/auto-sync", {
    method: "POST",
    body: JSON.stringify({ vaultPath: vaultPath || undefined, policies }),
    timeoutMs: 30_000,
  });
  const completed = [];
  for (const machine of targets) {
    const inventory = await collector(machine, "/skills");
    const providers = (inventory.providers || []).filter((provider) => ["hermes", "openclaw", "aeon"].includes(provider.id) && provider.installed);
    for (const provider of providers) {
      const skillSlug = `${runId}-${slug(machine.device?.name)}-${provider.id}`;
      const body1 = skillMarkdown(skillSlug, `Real fleet E2E skill created on ${machine.device?.name} for ${provider.id}.`);
      const body2 = skillMarkdown(skillSlug, `Real fleet E2E skill updated on ${machine.device?.name} for ${provider.id}.`);
      await collector(machine, "/e2e/skills", {
        method: "POST",
        body: JSON.stringify({ provider: provider.id, slug: skillSlug, name: skillSlug, body: body1 }),
      });
      await poll(`shared skill import ${skillSlug}`, async () => {
        const reconciled = await dashboard("/api/obsidian/skills/reconcile", {
          method: "POST",
          body: JSON.stringify({ vaultPath: vaultPath || undefined, policies }),
          timeoutMs: 45_000,
        });
        return (reconciled.shared || []).find((skill) => skill.slug === skillSlug && skill.checksum === sha256(body1));
      }, 120_000);
      await collector(machine, "/e2e/skills", {
        method: "POST",
        body: JSON.stringify({ provider: provider.id, slug: skillSlug, name: skillSlug, body: body2 }),
      });
      await poll(`shared skill update ${skillSlug}`, async () => {
        const reconciled = await dashboard("/api/obsidian/skills/reconcile", {
          method: "POST",
          body: JSON.stringify({ vaultPath: vaultPath || undefined, policies }),
          timeoutMs: 45_000,
        });
        return (reconciled.shared || []).find((skill) => skill.slug === skillSlug && skill.checksum === sha256(body2));
      }, 120_000);
      await collector(machine, "/e2e/skills", {
        method: "POST",
        body: JSON.stringify({ action: "remove", provider: provider.id, slug: skillSlug }),
      });
      await poll(`shared skill removal tracked ${skillSlug}`, async () => {
        const reconciled = await dashboard("/api/obsidian/skills/reconcile", {
          method: "POST",
          body: JSON.stringify({ vaultPath: vaultPath || undefined, policies }),
          timeoutMs: 45_000,
        });
        return (reconciled.markedMissing || []).some((skill) => skill.slug === skillSlug)
          || !(reconciled.shared || []).some((skill) => skill.slug === skillSlug);
      }, 120_000);
      summary.cleanup.push({ type: "skill", ok: true, machine: machine.device?.name, provider: provider.id, slug: skillSlug });
      completed.push({ machine: machine.device?.name, provider: provider.id, slug: skillSlug });
    }
  }
  assert(completed.length > 0, "No Hermes/OpenClaw/Aeon provider roots were installed on skill-capable machines.");
  return { completed };
}

async function kanbanRequest(method, body = {}, query = {}) {
  const url = new URL("/api/kanban", dashboardUrl);
  url.searchParams.set("board", kanbanBoard);
  for (const [key, value] of Object.entries(query)) {
    if (value) url.searchParams.set(key, value);
  }
  return dashboard(`${url.pathname}${url.search}`, {
    method,
    body: method === "GET" ? undefined : JSON.stringify({ vaultPath: vaultPath || undefined, kanbanFolder: kanbanFolder || undefined, ...body }),
    timeoutMs: 60_000,
  });
}

async function testKanbanHandoff(machines) {
  const agents = machines.flatMap((machine) => (machine.agents || []).map((agent) => ({ ...agent, machineName: machine.device?.name })));
  assert(agents.some((agent) => agent.beeRole === "queen" || /queen bee/i.test(agent.name)), "Kanban handoff requires a discoverable Queen Bee.");
  assert(agents.some((agent) => /emerson/i.test(agent.name) && agent.workerClass === "writer"), "Kanban handoff requires Emerson as a writer.");
  assert(agents.some((agent) => /henry matisse/i.test(agent.name) && agent.workerClass === "artist"), "Kanban handoff requires Henry Matisse as an artist.");

  const title = `${runId} LinkedIn post plus image`;
  const created = await kanbanRequest("POST", {
    title,
    body: "Create a LinkedIn post about HivemindOS fleet handoffs and include a structured VISUAL_BRIEF for a matching image.",
    status: "ready",
    priority: "high",
  });
  const taskId = created.task.id;
  summary.cleanup.push({ type: "kanban-task", ok: false, board: kanbanBoard, taskId, title });
  const finalBoard = await poll("Kanban parent/child handoff completion", async () => {
    const data = await kanbanRequest("GET", {}, { include_archived: "true" });
    const parent = (data.board.tasks || []).find((task) => task.id === taskId);
    const children = (data.board.tasks || []).filter((task) => (task.parents || []).includes(taskId));
    const artistChild = children.find((task) => /image|visual|generate/i.test(`${task.title} ${task.body}`));
    const parentOk = parent?.assignee && /emerson/i.test(parent.assignee) && /VISUAL_BRIEF:/i.test(parent.result || "");
    const childOk = artistChild?.assignee && /henry matisse/i.test(artistChild.assignee);
    const imageOk = artistChild && /(\.png|\.jpg|\.jpeg|\.webp|\.svg|image artifact|generated image)/i.test(`${artistChild.result || ""} ${artistChild.body || ""}`);
    if (parent?.status === "needs-human" || artistChild?.status === "needs-human") {
      throw new Error(`Kanban handoff landed in needs-human: parent=${parent?.result || ""} child=${artistChild?.result || ""}`);
    }
    return parentOk && childOk && imageOk ? { parent, artistChild } : null;
  }, Number(process.env.HIVE_E2E_KANBAN_TIMEOUT_MS || 30 * 60_000));
  summary.cleanup = summary.cleanup.map((item) => item.taskId === taskId ? { ...item, ok: true } : item);
  return { taskId, parentStatus: finalBoard.parent.status, childStatus: finalBoard.artistChild.status };
}

async function testSmoke() {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(dashboardUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.getByText(/Fleet|Agents|Work|Kanban/i).first().waitFor({ timeout: 30_000 });
    return { title: await page.title() };
  } finally {
    await browser.close();
  }
}

async function main() {
  await mkdir(artifactDir, { recursive: true });
  if (process.env.HIVE_E2E_REAL_FLEET !== "1") {
    throw new Error("Refusing to run real fleet E2E tests without HIVE_E2E_REAL_FLEET=1.");
  }
  const machines = await discoverFleet();
  if (suites.includes("agents")) await withResult("agents", () => testAgents(machines));
  if (suites.includes("env")) await withResult("env", () => testEnvSync(machines));
  if (suites.includes("skills")) await withResult("skills", () => testSkillSync(machines));
  if (suites.includes("kanban")) await withResult("kanban", () => testKanbanHandoff(machines));
  if (suites.includes("smoke")) await withResult("smoke", () => testSmoke());
  summary.ok = summary.results.every((result) => result.ok);
}

main().catch((error) => {
  summary.error = error instanceof Error ? error.stack || error.message : String(error);
  process.exitCode = 1;
}).finally(async () => {
  summary.finishedAt = new Date().toISOString();
  await mkdir(artifactDir, { recursive: true });
  await writeFile(join(artifactDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  if (process.env.HIVE_E2E_KEEP_EMPTY_ARTIFACTS !== "1" && summary.ok && summary.results.length === 0) {
    await rm(artifactDir, { recursive: true, force: true });
  }
  console.log(JSON.stringify({ ok: summary.ok, runId, artifactDir, results: summary.results }, null, 2));
});
