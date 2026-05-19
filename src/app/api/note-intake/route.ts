import { NextRequest, NextResponse } from "next/server";
import {
  importNoteTasksToIdeas,
  scanNoteTasks,
  type NoteTaskIntakeOptions,
} from "@/lib/services/notes/note-task-intake";
import { resolveKanbanStorage } from "@/lib/services/kanban/local-kanban-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const options = optionsFromRequest(request);
    const scan = await scanNoteTasks(options);
    return NextResponse.json({
      ok: true,
      ...scan,
      storage: resolveKanbanStorage(options.board, options),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const options = optionsFromRequest(request, body);
    const result = await importNoteTasksToIdeas(options);
    return NextResponse.json({
      ok: true,
      ...result,
      storage: resolveKanbanStorage(options.board, options),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

function optionsFromRequest(request: NextRequest, body?: Partial<NoteTaskIntakeOptions>): NoteTaskIntakeOptions {
  return {
    board: request.nextUrl.searchParams.get("board") ?? body?.board,
    vaultPath: request.nextUrl.searchParams.get("vaultPath") ?? body?.vaultPath,
    kanbanFolder: request.nextUrl.searchParams.get("kanbanFolder") ?? body?.kanbanFolder,
    folders: request.nextUrl.searchParams.get("folders") ?? body?.folders,
  };
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Note task intake failed.";
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}
