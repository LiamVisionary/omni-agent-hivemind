"use client";

import type { ReactNode } from "react";
import { LoaderCircle, MessageSquare } from "lucide-react";

import { cn } from "@/lib/utils/cn";

/**
 * AgentTaskList — compact list of recent tasks for one agent.
 *
 * Used as the inline expanded content beneath a selected AgentCell so
 * the user can see "what is this agent doing" without navigating away.
 *
 * Each row is a single line: status dot, title, relative time. No
 * boxed-in styling, no loud activity icons — just calm rows that align
 * with the agent row above.
 */
export type AgentTaskRow = {
  id: string;
  title: string;
  status: "active" | "completed" | "failed" | "unknown";
  isBusy?: boolean;
  messageCount?: number;
  /** Pre-formatted relative time string, e.g. "3m ago". */
  when?: string;
  source?: string;
};

type AgentTaskListProps = {
  tasks: AgentTaskRow[];
  onResumeTask?: (task: AgentTaskRow) => void;
  /** Optional footer node for compact list actions. */
  footer?: ReactNode;
  /** Empty-state copy when no tasks are present. */
  emptyTitle?: string;
  emptyBody?: string;
};

const STATUS_DOT: Record<AgentTaskRow["status"], string> = {
  active: "bg-[#5eead4]",
  completed: "bg-[#4ade80]",
  failed: "bg-[#fb7185]",
  unknown: "bg-[#475569]",
};

export function AgentTaskList({
  tasks,
  onResumeTask,
  footer,
  emptyTitle = "No recent tasks",
  emptyBody = "Activity will appear here as this agent runs.",
}: AgentTaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="py-1 text-[0.72rem]">
        <span className="text-[var(--foreground)]/85">{emptyTitle}</span>
        <span className="text-[var(--muted)]"> — {emptyBody}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      <ul className="m-0 flex flex-col p-0 [list-style:none]">
        {tasks.map((task) => (
          <li
            key={task.id}
            className="group/task flex min-h-6 items-center gap-2 py-0.5 text-[0.72rem]"
            title={task.title}
          >
            <span
              aria-hidden="true"
              className={cn("inline-block size-1 shrink-0 rounded-full", STATUS_DOT[task.status])}
            />
            <span className="min-w-0 flex-1 truncate text-[var(--foreground)]/85">
              {task.title}
            </span>
            {task.when ? (
              <span className="shrink-0 text-[0.65rem] tabular-nums text-[var(--muted)]">
                {task.when}
              </span>
            ) : null}
            {onResumeTask ? (
              task.isBusy ? (
                <span
                  className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md px-2 text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-[#99f6e4] opacity-0 transition-opacity group-hover/task:opacity-100 group-focus-within/task:opacity-100"
                  aria-live="polite"
                >
                  <LoaderCircle aria-hidden="true" className="size-3 animate-spin" />
                  Working...
                </span>
              ) : (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onResumeTask(task);
                  }}
                  className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md border border-[rgba(94,234,212,0.28)] bg-[rgba(13,20,31,0.92)] px-2 text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-[#ccfbf1] opacity-0 shadow-sm transition hover:border-[rgba(94,234,212,0.58)] hover:bg-[rgba(20,184,166,0.14)] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(45,212,191,0.45)] group-hover/task:opacity-100 group-focus-within/task:opacity-100"
                  aria-label={`Resume chat for ${task.title}`}
                >
                  <MessageSquare aria-hidden="true" className="size-3" />
                  Resume
                </button>
              )
            ) : null}
          </li>
        ))}
      </ul>
      {footer ? <div className="flex justify-end pt-1">{footer}</div> : null}
    </div>
  );
}
