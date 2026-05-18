import { NextRequest, NextResponse } from "next/server";
import type { KanbanStatus } from "@/lib/types/kanban";
import {
  addComment,
  addLink,
  archiveBoard,
  createBoard,
  createTask,
  listBoards,
  moveTask,
  patchTask,
  readBoard,
} from "@/lib/services/kanban/local-kanban-store";
import { filterKanbanTasks, groupKanbanTasks } from "@/lib/utils/kanban-board";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const boardSlug = request.nextUrl.searchParams.get("board");
    const includeArchived = request.nextUrl.searchParams.get("include_archived") === "true";
    const tenant = request.nextUrl.searchParams.get("tenant") || undefined;
    const assignee = request.nextUrl.searchParams.get("assignee") || undefined;
    const query = request.nextUrl.searchParams.get("q") || undefined;
    const boards = await listBoards();
    const board = await readBoard(boardSlug);
    const tasks = filterKanbanTasks(board, { tenant, assignee, query, includeArchived });
    const tenants = [...new Set(board.tasks.map((task) => task.tenant).filter(Boolean))].sort();
    const assignees = [...new Set(board.tasks.map((task) => task.assignee).filter(Boolean))].sort();

    return NextResponse.json({
      ok: true,
      boards,
      board: { ...board, tasks },
      columns: groupKanbanTasks(tasks, includeArchived),
      tenants,
      assignees,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const boardSlug = request.nextUrl.searchParams.get("board") || body.board;
    if (body.action === "create-board") {
      const board = await createBoard(body);
      return NextResponse.json({ ok: true, board });
    }
    if (body.action === "archive-board") {
      await archiveBoard(body.slug);
      return NextResponse.json({ ok: true });
    }
    if (body.action === "comment") {
      const result = await addComment(boardSlug, body.taskId, body.body, body.author);
      return NextResponse.json({ ok: true, ...result });
    }
    if (body.action === "link") {
      const result = await addLink(boardSlug, body.parentId, body.childId);
      return NextResponse.json({ ok: true, ...result });
    }
    const result = await createTask(boardSlug, body);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const boardSlug = request.nextUrl.searchParams.get("board") || body.board;
    if (!body.taskId) throw new Error("taskId is required.");
    const result = body.status
      ? await moveTask(boardSlug, body.taskId, body.status as KanbanStatus)
      : await patchTask(boardSlug, body.taskId, body.patch ?? body);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return errorResponse(error);
  }
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Kanban request failed.";
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}
