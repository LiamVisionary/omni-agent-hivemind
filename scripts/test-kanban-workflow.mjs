#!/usr/bin/env node
import { mkdir, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const baseUrl = process.env.KANBAN_TEST_BASE_URL || "http://127.0.0.1:5020";
const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const vaultPath = join(tmpdir(), `hivemindos-kanban-workflow-${runId}`);
const kanbanFolder = "Projects/Test/Kanban";
const board = `workflow-${runId}`.replace(/[^a-z0-9_-]/g, "-").slice(0, 63);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(method, body = {}, params = {}) {
  const url = new URL(`/api/kanban`, baseUrl);
  url.searchParams.set("board", board);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: method === "GET" ? undefined : JSON.stringify({ vaultPath, kanbanFolder, ...body }),
  });
  const data = await response.json().catch(() => null);
  assert(response.ok && data?.ok, `${method} ${url.pathname} failed: ${data?.error ?? response.status}`);
  return data;
}

async function createTask(title, status, extra = {}) {
  const data = await request("POST", {
    title,
    body: "",
    status,
    priority: "normal",
    ...extra,
  });
  assert(data.task?.title === title, `Expected task ${title} to be created.`);
  return data.task;
}

async function moveTask(task, status) {
  const data = await request("PATCH", { taskId: task.id, status });
  assert(data.task?.status === status, `Expected ${task.title} to move to ${status}, got ${data.task?.status}.`);
  return data.task;
}

async function patchTask(task, patch) {
  const data = await request("PATCH", { taskId: task.id, patch });
  return data.task;
}

async function main() {
  await mkdir(vaultPath, { recursive: true });
  try {
    let lifecycle = await createTask("workflow lifecycle", "ideas");
    assert(lifecycle.status === "ideas", "New idea should stay in Ideas.");
    lifecycle = await moveTask(lifecycle, "ready");
    assert(!lifecycle.assignee, "Moving an idea to Ready should not invent an assignee.");
    lifecycle = await patchTask(lifecycle, {
      status: "working",
      assignee: "Hermes on Test Machine",
      tenant: "code-worker",
      agentSession: {
        agentId: "hermes-test",
        agentName: "Hermes on Test Machine",
        telemetryUrl: "http://127.0.0.1:8787",
        sessionId: "api-test-session",
        startedAt: Date.now(),
        updatedAt: Date.now(),
        lastMessageCount: 1,
      },
      result: "Accepted and streaming.",
    });
    assert(lifecycle.status === "working" && lifecycle.agentSession?.sessionId, "Assigned work should keep its pollable session.");
    lifecycle = await patchTask(lifecycle, {
      status: "done",
      result: "Finished with evidence.",
      agentSession: null,
    });
    assert(lifecycle.status === "done" && lifecycle.completedAt, "Working task should finish with completedAt.");

    let needsHumanAssigned = await createTask("needs human assigned resume", "needs-human", {
      assignee: "Hermes on Test Machine",
      tenant: "code-worker",
      result: "Need a decision.",
    });
    needsHumanAssigned = await moveTask(needsHumanAssigned, "working");
    assert(needsHumanAssigned.assignee === "Hermes on Test Machine", "Assigned Needs Human task should keep its assignee when resumed to Working.");

    let needsHumanUnassigned = await createTask("needs human unassigned resume", "needs-human", {
      result: "No agent was assigned.",
    });
    needsHumanUnassigned = await moveTask(needsHumanUnassigned, "ready");
    assert(!needsHumanUnassigned.assignee, "Unassigned Needs Human task should go back to Ready for assignment.");

    let needsHumanReadyRetry = await createTask("needs human assigned ready retry", "needs-human");
    needsHumanReadyRetry = await patchTask(needsHumanReadyRetry, {
      assignee: "Hermes on Test Machine",
      tenant: "code-worker",
      agentSession: {
        agentId: "hermes-test",
        agentName: "Hermes on Test Machine",
        telemetryUrl: "http://127.0.0.1:8787",
        sessionId: "api-stale-session",
        startedAt: Date.now(),
        updatedAt: Date.now(),
        lastMessageCount: 12,
      },
      result: "Retry with a clean claim.",
    });
    needsHumanReadyRetry = await moveTask(needsHumanReadyRetry, "ready");
    assert(!needsHumanReadyRetry.assignee && !needsHumanReadyRetry.tenant && !needsHumanReadyRetry.agentSession, "Moving Needs Human back to Ready should clear stale ownership/session state.");
    assert(needsHumanReadyRetry.result === "Retry with a clean claim.", "Moving back to Ready should preserve retry notes.");

    let stale = await createTask("hard unpollable accepted work should not wait forever", "working", {
      assignee: "Hermes on Test Machine",
      tenant: "general-worker",
      result: "Hermes on Test Machine returned no task output and no pollable session.",
    });
    assert(stale.status === "working" && !stale.agentSession, "Fixture should start as unpollable Working.");
    stale = await patchTask(stale, {
      status: "working",
      result: "Hermes on Test Machine returned no task output and no pollable session.",
      agentSession: null,
    });
    assert(stale.status === "needs-human", "Unpollable accepted work must fail closed to Needs Human.");
    assert(!stale.completedAt, "Moving out of Done/Working recovery must not retain completedAt.");

    let timeoutAccepted = await createTask("timeout accepted runtime can keep working", "needs-human", {
      assignee: "Hermes on Test Machine",
      tenant: "code-worker",
      result: "Previous dashboard timeout.",
    });
    timeoutAccepted = await patchTask(timeoutAccepted, {
      status: "working",
      assignee: "Hermes on Test Machine",
      tenant: "code-worker",
      agentSession: null,
      result: "Hermes on Test Machine accepted the runtime connection and may still be working. Waiting for telemetry or agent output after the dashboard timeout.",
    });
    assert(timeoutAccepted.status === "working", "Timeout-accepted runtime work should stay Working while telemetry catches up.");

    const source = await readFile(new URL("../src/app/page.tsx", import.meta.url), "utf8");
    assert(
      /function isKanbanAwaitingAgentUpdate\(task: KanbanTask\) \{\s*return task\.status === "working"\s*&& Boolean\(task\.agentSession\?\.sessionId\);\s*\}/m.test(source),
      "Regression guard failed: unpollable accepted text must not count as an awaiting agent update.",
    );

    const final = await request("GET", {}, { vaultPath, kanbanFolder, include_archived: "true" });
    const statuses = Object.fromEntries(final.board.tasks.map((task) => [task.title, task.status]));
    console.log(JSON.stringify({ ok: true, board, statuses }, null, 2));
  } finally {
    await rm(vaultPath, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
