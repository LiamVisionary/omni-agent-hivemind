import { getMiroSharkAdminToken, getMiroSharkCompanionStatus } from "@/lib/services/miroshark/companion-client";
import { readFile, writeFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MiroSharkResponse<T = Record<string, unknown>> = {
  success?: boolean;
  data?: T;
  error?: string;
};

type SwarmRunRequest = {
  action?: "run" | "stop" | "inject" | "fork" | "branch" | "publish";
  simulationId?: string;
  event?: string;
  scenario?: string;
  rounds?: number;
  platform?: "twitter" | "reddit" | "parallel" | "polymarket";
  projectName?: string;
};

type SwarmJob = {
  ok: boolean;
  jobId: string;
  status: "queued" | "running" | "started" | "failed";
  step: string;
  message?: string;
  startedAt: number;
  finishedAt?: number;
  error?: string;
  baseUrl?: string;
  projectId?: string;
  graphId?: string;
  simulationId?: string;
  rounds?: number;
  platform?: string;
  projectName?: string;
  links?: Record<string, string>;
};

type MiroSharkConfig = {
  time_config?: Record<string, unknown>;
  agent_configs?: Array<Record<string, unknown>>;
};

type MiroSharkPostsPayload = {
  success?: boolean;
  data?: {
    count?: number;
    posts?: Array<{
      content?: string;
      quote_content?: string | null;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

const globalJobs = globalThis as typeof globalThis & {
  __hivemindMirosharkJobs?: Map<string, SwarmJob>;
};
const jobs = globalJobs.__hivemindMirosharkJobs ?? new Map<string, SwarmJob>();
globalJobs.__hivemindMirosharkJobs = jobs;

function updateJob(jobId: string, patch: Partial<SwarmJob>) {
  const current = jobs.get(jobId);
  if (!current) return;
  jobs.set(jobId, { ...current, ...patch });
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<MiroSharkResponse<T>> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(240_000),
  });
  const payload = await response.json().catch(() => null) as MiroSharkResponse<T> | null;
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error ?? `MiroShark request failed: HTTP ${response.status}`);
  }
  return payload;
}

async function pollTask(baseUrl: string, taskId: string) {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    const payload = await requestJson<{
      status?: string;
      progress?: number;
      message?: string;
      result?: Record<string, unknown>;
      error?: string;
    }>(`${baseUrl}/api/graph/task/${taskId}`);
    const data = payload.data ?? {};
    if (data.status === "completed") return data;
    if (data.status === "failed") throw new Error(data.error || data.message || "Graph build failed");
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  throw new Error("Timed out waiting for graph build");
}

async function pollPrepare(baseUrl: string, simulationId: string, taskId?: string) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const payload = await requestJson<{
      status?: string;
      progress?: number;
      message?: string;
      prepare_info?: Record<string, unknown>;
      error?: string;
    }>(`${baseUrl}/api/simulation/prepare/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ simulation_id: simulationId, task_id: taskId }),
    });
    const data = payload.data ?? {};
    if (data.status === "failed") throw new Error(data.error || data.message || "Simulation preparation failed");
    if (data.status === "ready" || data.status === "completed") return data;
    await new Promise((resolve) => setTimeout(resolve, 2_500));
  }
  throw new Error("Timed out waiting for agent preparation");
}

function scenarioDoc(scenario: string) {
  const text = [
    "Hivemind swarm scenario",
    "",
    scenario,
    "",
    "Named seed participants for graph construction:",
    "- Maya Chen is the product lead proposing the plan and coordinating the launch.",
    "- Ravi Patel owns a local cafe and worries about pricing, staffing, and reputation.",
    "- Lena Brooks represents parents and residents who need trust, affordability, and clear safety rules.",
    "- Diego Morales coordinates deliveries and raises concerns about handoffs, timing, and worker incentives.",
    "- Dr. Nora Singh is the city health inspector focused on food safety, compliance, and public risk.",
    "",
    "Known relationships:",
    "- Maya Chen collaborates with Ravi Patel and Diego Morales to design the launch.",
    "- Lena Brooks pressures Maya Chen and Dr. Nora Singh for transparency before approval.",
    "- Dr. Nora Singh can delay or approve the launch based on safety evidence.",
    "- Ravi Patel and Diego Morales debate whether operational load makes the launch viable.",
  ].join("\n");

  return JSON.stringify([{
    title: "Hivemind swarm scenario",
    url: "hivemind://swarm-scenario",
    text,
  }]);
}

async function makeShortRunActive(installPath: string | undefined, simulationId: string) {
  if (!installPath) return;

  const configPath = path.join(installPath, "backend", "uploads", "simulations", simulationId, "simulation_config.json");
  const raw = await readFile(configPath, "utf8").catch(() => null);
  if (!raw) return;

  const config = JSON.parse(raw) as MiroSharkConfig;
  const agentCount = Math.max(1, config.agent_configs?.length ?? 1);
  const allHours = Array.from({ length: 24 }, (_, index) => index);
  const minAgents = Math.min(agentCount, Math.max(2, Math.ceil(agentCount / 2)));

  config.time_config = {
    ...(config.time_config ?? {}),
    agents_per_hour_min: minAgents,
    agents_per_hour_max: agentCount,
    peak_hours: allHours,
    peak_activity_multiplier: 1,
    off_peak_hours: [],
    off_peak_activity_multiplier: 1,
    morning_hours: allHours,
    morning_activity_multiplier: 1,
    work_hours: allHours,
    work_activity_multiplier: 1,
  };

  config.agent_configs = config.agent_configs?.map((agent) => ({
    ...agent,
    active_hours: allHours,
    activity_level: Math.max(0.95, Number(agent.activity_level ?? 0)),
  }));

  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

function cleanPostsPayload(payload: unknown) {
  const postsPayload = payload as MiroSharkPostsPayload;
  const posts = postsPayload.data?.posts;
  if (!Array.isArray(posts)) return payload;

  const visiblePosts = posts.filter((post) => (post.quote_content || post.content || "").trim().length > 0);
  return {
    ...postsPayload,
    data: {
      ...postsPayload.data,
      raw_count: postsPayload.data?.count ?? posts.length,
      count: visiblePosts.length,
      posts: visiblePosts,
    },
  };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as SwarmRunRequest | null;
  if (body?.action && body.action !== "run") {
    try {
      const simulationId = body.simulationId?.trim();
      if (!simulationId) return Response.json({ ok: false, error: "simulationId is required" }, { status: 400 });
      const status = await getMiroSharkCompanionStatus();
      if (!status.ok) return Response.json({ ok: false, error: status.error ?? "MiroShark is not connected" }, { status: 503 });
      const baseUrl = status.baseUrl;
      if (body.action === "stop") {
        const payload = await requestJson(`${baseUrl}/api/simulation/stop`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ simulation_id: simulationId }),
        });
        return Response.json({ ok: true, action: body.action, simulationId, payload });
      }
      if (body.action === "publish") {
        const adminToken = getMiroSharkAdminToken(status.installPath);
        if (!adminToken) {
          return Response.json({
            ok: false,
            action: body.action,
            simulationId,
            error: "MiroShark publish auth is not configured. Use Configure publish auth in the Swarm tab.",
          }, { status: 400 });
        }
        const payload = await requestJson(`${baseUrl}/api/simulation/${simulationId}/publish`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
          body: JSON.stringify({ simulation_id: simulationId }),
        });
        return Response.json({ ok: true, action: body.action, simulationId, payload });
      }
      if (body.action === "inject") {
        const event = body.event?.trim();
        if (!event) return Response.json({ ok: false, error: "event is required" }, { status: 400 });
        const payload = await requestJson(`${baseUrl}/api/simulation/${simulationId}/director/inject`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event_text: event }),
        });
        return Response.json({ ok: true, action: body.action, simulationId, payload });
      }
      if (body.action === "fork" || body.action === "branch") {
        const event = body.event?.trim() || "Hivemind counterfactual branch";
        const payload = await requestJson(`${baseUrl}/api/simulation/${body.action === "fork" ? "fork" : "branch-counterfactual"}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: body.action === "fork"
            ? JSON.stringify({ parent_simulation_id: simulationId, simulation_requirement: event })
            : JSON.stringify({
              parent_simulation_id: simulationId,
              injection_text: event,
              trigger_round: 1,
              label: event.slice(0, 64),
            }),
        });
        return Response.json({ ok: true, action: body.action, simulationId, payload });
      }
    } catch (error) {
      return Response.json({
        ok: false,
        action: body.action,
        simulationId: body.simulationId,
        error: error instanceof Error ? error.message : "MiroShark action failed",
      }, { status: 400 });
    }
  }

  const scenario = body?.scenario?.trim();
  if (!scenario) {
    return Response.json({ ok: false, error: "Scenario is required" }, { status: 400 });
  }

  const jobId = `swarm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const projectName = body?.projectName?.trim() || `Hivemind swarm ${new Date().toISOString().slice(0, 16)}`;
  const rounds = Math.max(1, Math.min(200, Number(body?.rounds ?? 5)));
  const platform = body?.platform ?? "twitter";
  jobs.set(jobId, {
    ok: true,
    jobId,
    status: "queued",
    step: "queued",
    message: "Queued",
    startedAt: Date.now(),
    rounds,
    platform,
    projectName,
  });

  void (async () => {
    try {
      updateJob(jobId, { status: "running", step: "connect", message: "Checking MiroShark" });
      const status = await getMiroSharkCompanionStatus();
      if (!status.ok) throw new Error(status.error ?? "MiroShark is not connected");
      const baseUrl = status.baseUrl;
      updateJob(jobId, { baseUrl, step: "ontology", message: "Generating ontology" });

      const form = new FormData();
      form.set("simulation_requirement", scenario);
      form.set("project_name", projectName);
      form.set("additional_context", "Created and launched from Omni-Agent Hivemind Swarm controls.");
      form.set("url_docs", scenarioDoc(scenario));

      const ontology = await requestJson<{ project_id?: string; ontology?: unknown }>(`${baseUrl}/api/graph/ontology/generate`, {
        method: "POST",
        body: form,
      });
      const projectId = ontology.data?.project_id;
      if (!projectId) throw new Error("MiroShark did not return a project_id");
      updateJob(jobId, { projectId, step: "graph", message: "Building graph" });

      const build = await requestJson<{ task_id?: string }>(`${baseUrl}/api/graph/build`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId, graph_name: projectName, chunk_size: 700, chunk_overlap: 80 }),
      });
      const buildTaskId = build.data?.task_id;
      if (!buildTaskId) throw new Error("MiroShark did not return a graph build task_id");
      const graphTask = await pollTask(baseUrl, buildTaskId);
      const graphId = typeof graphTask.result?.graph_id === "string" ? graphTask.result.graph_id : undefined;
      if (!graphId) throw new Error("MiroShark graph build completed without graph_id");
      const nodeCount = Number(graphTask.result?.node_count ?? 0);
      if (nodeCount < 1) {
        throw new Error("MiroShark built an empty graph. Add concrete actors, organizations, and relationships to the scenario.");
      }
      updateJob(jobId, { graphId, step: "simulation", message: "Creating simulation" });

      const simulation = await requestJson<{ simulation_id?: string }>(`${baseUrl}/api/simulation/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          graph_id: graphId,
          enable_twitter: platform === "twitter" || platform === "parallel",
          enable_reddit: platform === "reddit" || platform === "parallel",
          enable_polymarket: platform === "polymarket" || platform === "parallel",
        }),
      });
      const simulationId = simulation.data?.simulation_id;
      if (!simulationId) throw new Error("MiroShark did not return a simulation_id");
      const resultPlatform = platform === "reddit" ? "reddit" : "twitter";
      updateJob(jobId, { simulationId, step: "prepare", message: "Preparing agents" });

      const prepare = await requestJson<{ task_id?: string; status?: string }>(`${baseUrl}/api/simulation/prepare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ simulation_id: simulationId, use_llm_for_profiles: true, parallel_profile_count: 5 }),
      });
      if (prepare.data?.status !== "ready") {
        await pollPrepare(baseUrl, simulationId, prepare.data?.task_id);
      }
      await makeShortRunActive(status.installPath, simulationId);
      updateJob(jobId, { step: "start", message: "Starting simulation" });

      await requestJson(`${baseUrl}/api/simulation/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ simulation_id: simulationId, platform, max_rounds: rounds, force: true }),
      });
      updateJob(jobId, {
        status: "started",
        step: "started",
        message: "Simulation started",
        finishedAt: Date.now(),
        links: {
          runStatus: `${baseUrl}/api/simulation/${simulationId}/run-status`,
          actions: `${baseUrl}/api/simulation/${simulationId}/actions?platform=${resultPlatform}`,
          posts: `${baseUrl}/api/simulation/${simulationId}/posts?platform=${resultPlatform}`,
          timeline: `${baseUrl}/api/simulation/${simulationId}/timeline`,
          profiles: `${baseUrl}/api/simulation/${simulationId}/profiles?platform=${resultPlatform}`,
          beliefDrift: `${baseUrl}/api/simulation/${simulationId}/belief-drift`,
          influence: `${baseUrl}/api/simulation/${simulationId}/influence`,
          interactionNetwork: `${baseUrl}/api/simulation/${simulationId}/interaction-network`,
          demographics: `${baseUrl}/api/simulation/${simulationId}/demographics`,
          quality: `${baseUrl}/api/simulation/${simulationId}/quality`,
          markets: `${baseUrl}/api/simulation/${simulationId}/polymarket/markets`,
          lineage: `${baseUrl}/api/simulation/${simulationId}/lineage`,
          thread: `${baseUrl}/api/simulation/${simulationId}/thread.json`,
          export: `${baseUrl}/api/simulation/${simulationId}/export`,
        },
      });
    } catch (error) {
      updateJob(jobId, {
        ok: false,
        status: "failed",
        step: "failed",
        message: "Run failed",
        error: error instanceof Error ? error.message : "Unknown MiroShark run error",
        finishedAt: Date.now(),
      });
    }
  })();

  return Response.json(jobs.get(jobId));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const metadata = searchParams.get("metadata");
  if (metadata === "1") {
    const status = await getMiroSharkCompanionStatus();
    if (!status.ok) {
      return Response.json({ ok: false, error: status.error ?? "MiroShark is not connected" }, { status: 503 });
    }
    const [templates, history, trending, observabilityStats, observabilityEvents, llmCalls] = await Promise.all([
      fetch(`${status.baseUrl}/api/templates/list`, { cache: "no-store" }).then((r) => r.json()).catch((error) => ({ success: false, error: String(error) })),
      fetch(`${status.baseUrl}/api/simulation/history`, { cache: "no-store" }).then((r) => r.json()).catch((error) => ({ success: false, error: String(error) })),
      fetch(`${status.baseUrl}/api/simulation/trending`, { cache: "no-store" }).then((r) => r.json()).catch((error) => ({ success: false, error: String(error) })),
      fetch(`${status.baseUrl}/api/observability/stats`, { cache: "no-store" }).then((r) => r.json()).catch((error) => ({ success: false, error: String(error) })),
      fetch(`${status.baseUrl}/api/observability/events?limit=30`, { cache: "no-store" }).then((r) => r.json()).catch((error) => ({ success: false, error: String(error) })),
      fetch(`${status.baseUrl}/api/observability/llm-calls?limit=20`, { cache: "no-store" }).then((r) => r.json()).catch((error) => ({ success: false, error: String(error) })),
    ]);
    return Response.json({ ok: true, baseUrl: status.baseUrl, templates, history, trending, observabilityStats, observabilityEvents, llmCalls });
  }

  const jobId = searchParams.get("job_id");
  if (jobId) {
    const job = jobs.get(jobId);
    if (!job) return Response.json({ ok: false, error: "Job not found" }, { status: 404 });
    return Response.json(job);
  }
  const simulationId = searchParams.get("simulation_id");
  const requestedPlatform = searchParams.get("platform") || "twitter";
  const platform = requestedPlatform === "reddit" ? "reddit" : "twitter";
  const limit = Math.max(1, Math.min(2_000, Number(searchParams.get("limit") ?? 500) || 500));
  if (!simulationId) {
    return Response.json({ ok: false, error: "simulation_id is required" }, { status: 400 });
  }
  const status = await getMiroSharkCompanionStatus();
  if (!status.ok) {
    return Response.json({ ok: false, error: status.error ?? "MiroShark is not connected" }, { status: 503 });
  }
  const [runStatus, actions, posts, timeline, profiles, realtimeProfiles, beliefDrift, counterfactual, agentStats, influence, interactionNetwork, demographics, quality, markets, surfaceStats, lineage, threadJson, observabilityStats, observabilityEvents, llmCalls] = await Promise.all([
    fetch(`${status.baseUrl}/api/simulation/${simulationId}/run-status`, { cache: "no-store" }).then((r) => r.json()).catch((error) => ({ success: false, error: String(error) })),
    fetch(`${status.baseUrl}/api/simulation/${simulationId}/actions?platform=${platform}`, { cache: "no-store" }).then((r) => r.json()).catch((error) => ({ success: false, error: String(error) })),
    fetch(`${status.baseUrl}/api/simulation/${simulationId}/posts?platform=${platform}&limit=${limit}`, { cache: "no-store" }).then((r) => r.json()).catch((error) => ({ success: false, error: String(error) })),
    fetch(`${status.baseUrl}/api/simulation/${simulationId}/timeline`, { cache: "no-store" }).then((r) => r.json()).catch((error) => ({ success: false, error: String(error) })),
    fetch(`${status.baseUrl}/api/simulation/${simulationId}/profiles?platform=${platform}`, { cache: "no-store" }).then((r) => r.json()).catch((error) => ({ success: false, error: String(error) })),
    fetch(`${status.baseUrl}/api/simulation/${simulationId}/profiles/realtime`, { cache: "no-store" }).then((r) => r.json()).catch((error) => ({ success: false, error: String(error) })),
    fetch(`${status.baseUrl}/api/simulation/${simulationId}/belief-drift`, { cache: "no-store" }).then((r) => r.json()).catch((error) => ({ success: false, error: String(error) })),
    fetch(`${status.baseUrl}/api/simulation/${simulationId}/counterfactual`, { cache: "no-store" }).then((r) => r.json()).catch((error) => ({ success: false, error: String(error) })),
    fetch(`${status.baseUrl}/api/simulation/${simulationId}/agent-stats`, { cache: "no-store" }).then((r) => r.json()).catch((error) => ({ success: false, error: String(error) })),
    fetch(`${status.baseUrl}/api/simulation/${simulationId}/influence`, { cache: "no-store" }).then((r) => r.json()).catch((error) => ({ success: false, error: String(error) })),
    fetch(`${status.baseUrl}/api/simulation/${simulationId}/interaction-network`, { cache: "no-store" }).then((r) => r.json()).catch((error) => ({ success: false, error: String(error) })),
    fetch(`${status.baseUrl}/api/simulation/${simulationId}/demographics`, { cache: "no-store" }).then((r) => r.json()).catch((error) => ({ success: false, error: String(error) })),
    fetch(`${status.baseUrl}/api/simulation/${simulationId}/quality`, { cache: "no-store" }).then((r) => r.json()).catch((error) => ({ success: false, error: String(error) })),
    fetch(`${status.baseUrl}/api/simulation/${simulationId}/polymarket/markets`, { cache: "no-store" }).then((r) => r.json()).catch((error) => ({ success: false, error: String(error) })),
    fetch(`${status.baseUrl}/api/simulation/${simulationId}/surface-stats`, { cache: "no-store" }).then((r) => r.json()).catch((error) => ({ success: false, error: String(error) })),
    fetch(`${status.baseUrl}/api/simulation/${simulationId}/lineage`, { cache: "no-store" }).then((r) => r.json()).catch((error) => ({ success: false, error: String(error) })),
    fetch(`${status.baseUrl}/api/simulation/${simulationId}/thread.json`, { cache: "no-store" }).then((r) => r.json()).catch((error) => ({ success: false, error: String(error) })),
    fetch(`${status.baseUrl}/api/observability/stats`, { cache: "no-store" }).then((r) => r.json()).catch((error) => ({ success: false, error: String(error) })),
    fetch(`${status.baseUrl}/api/observability/events?limit=30`, { cache: "no-store" }).then((r) => r.json()).catch((error) => ({ success: false, error: String(error) })),
    fetch(`${status.baseUrl}/api/observability/llm-calls?limit=20`, { cache: "no-store" }).then((r) => r.json()).catch((error) => ({ success: false, error: String(error) })),
  ]);
  return Response.json({
    ok: true,
    simulationId,
    platform,
    runStatus,
    actions,
    posts: cleanPostsPayload(posts),
    timeline,
    profiles,
    realtimeProfiles,
    beliefDrift,
    counterfactual,
    agentStats,
    influence,
    interactionNetwork,
    demographics,
    quality,
    markets,
    surfaceStats,
    lineage,
    threadJson,
    observabilityStats,
    observabilityEvents,
    llmCalls,
  });
}
