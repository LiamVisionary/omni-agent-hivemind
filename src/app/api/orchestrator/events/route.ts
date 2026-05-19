import { NextRequest } from "next/server";
import { readBoard, type KanbanStorageOptions } from "@/lib/services/kanban/local-kanban-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  const boardSlug = request.nextUrl.searchParams.get("board");
  const storageOptions: KanbanStorageOptions = {
    vaultPath: request.nextUrl.searchParams.get("vaultPath"),
    kanbanFolder: request.nextUrl.searchParams.get("kanbanFolder"),
  };

  let lastEventId = "";
  const stream = new ReadableStream({
    async start(controller) {
      async function emit() {
        try {
          const board = await readBoard(boardSlug, storageOptions);
          const latestEventId = board.events[0]?.id ?? "";
          const readyTasks = board.tasks.filter((task) => task.status === "ready");
          if (latestEventId !== lastEventId) {
            lastEventId = latestEventId;
            controller.enqueue(encoder.encode(`event: board\n`));
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              board: board.meta.slug,
              updatedAt: board.meta.updatedAt,
              latestEvent: board.events[0] ?? null,
              readyTasks,
            })}\n\n`));
          } else {
            controller.enqueue(encoder.encode(`event: heartbeat\n`));
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ board: board.meta.slug, readyCount: readyTasks.length })}\n\n`));
          }
        } catch (error) {
          controller.enqueue(encoder.encode(`event: error\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: error instanceof Error ? error.message : "Event stream failed." })}\n\n`));
        }
      }

      await emit();
      const interval = setInterval(() => void emit(), 2_500);
      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
    },
  });
}
