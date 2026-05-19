import { NextRequest, NextResponse } from "next/server";
import type { AgentProfile } from "@/lib/types/agent-runtime";
import { readBoard, resolveKanbanStorage, type KanbanStorageOptions } from "@/lib/services/kanban/local-kanban-store";
import { chooseBeeAssignment } from "@/lib/services/orchestration/bee-roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOOL_NAMES = [
  "list_board_tasks",
  "get_task",
  "update_task",
  "move_task",
  "comment_on_task",
  "list_agents",
  "get_agent_status",
  "assign_task",
  "spawn_worker",
  "list_worker_roles",
  "x402_fetch",
];

export async function GET(request: NextRequest) {
  try {
    const boardSlug = request.nextUrl.searchParams.get("board");
    const storageOptions = storageOptionsFromRequest(request);
    const board = await readBoard(boardSlug, storageOptions);
    const readyTasks = board.tasks.filter((task) => task.status === "ready");
    return NextResponse.json({
      ok: true,
      protocol: "hivemind-orchestrator-mcp-surface",
      tools: TOOL_NAMES,
      lanes: {
        ideas: "inert human scratchpad",
        ready: "Queen Bee pickup queue",
        working: "claimed by Queen Bee or worker",
        "needs-human": "waiting for human decision, access, or approval",
        done: "completed work",
      },
      readyTasks,
      storage: resolveKanbanStorage(board.meta.slug, storageOptions),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      board?: string;
      taskId?: string;
      agents?: AgentProfile[];
      vaultPath?: string;
      kanbanFolder?: string;
    };
    const storageOptions = storageOptionsFromRequest(request, body);
    const board = await readBoard(request.nextUrl.searchParams.get("board") || body.board, storageOptions);
    const agents = Array.isArray(body.agents) ? body.agents : [];
    const tasks = body.taskId
      ? board.tasks.filter((task) => task.id === body.taskId)
      : board.tasks.filter((task) => task.status === "ready");
    const assignments = tasks.map((task) => ({
      taskId: task.id,
      title: task.title,
      status: task.status,
      assignment: chooseBeeAssignment(task, agents),
    }));

    return NextResponse.json({
      ok: true,
      protocol: "hivemind-orchestrator-mcp-surface",
      tools: TOOL_NAMES,
      agents: agents.map((agent) => ({
        id: agent.id,
        name: agent.name,
        runtime: agent.runtime,
        machineName: agent.machineName,
        beeRole: agent.beeRole ?? "worker",
        workerClass: agent.workerClass ?? "general",
        online: Boolean(agent.telemetryUrl || agent.gatewayUrl),
      })),
      assignments,
      storage: resolveKanbanStorage(board.meta.slug, storageOptions),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

function storageOptionsFromRequest(request: NextRequest, body?: { vaultPath?: string; kanbanFolder?: string }): KanbanStorageOptions {
  return {
    vaultPath: request.nextUrl.searchParams.get("vaultPath") ?? body?.vaultPath,
    kanbanFolder: request.nextUrl.searchParams.get("kanbanFolder") ?? body?.kanbanFolder,
  };
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Orchestrator request failed.";
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}
