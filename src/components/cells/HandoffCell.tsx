import type { ReactNode } from "react";

import { Cell } from "./Cell";

/**
 * HandoffCell shows multi-agent coordination with attribution
 * (philosophy rule 6: collective intelligence with attribution).
 *
 * Instead of "the swarm completed this", a handoff cell makes it clear:
 *   "Planner created the task. Researcher gathered context. Reviewer
 *    flagged risks."
 */
type Step = {
  /** Plain agent name — "Planner", "Researcher", "Reviewer". */
  agent: string;
  /** What the agent did, in plain English. */
  action: string;
  /** Relative timestamp, e.g. "3 min ago". */
  when?: string;
};

type HandoffCellProps = {
  /** What the handoff is about — task title or objective. */
  title: string;
  /** Current phase: "Planning", "Working", "Review", etc. */
  phase: string;
  /** Steps so far, in order of attribution. */
  steps: Step[];
  /** Optional "What is the next action?" hint. */
  nextAction?: string;
  /** Single primary safe action — usually "Approve handoff" or "Open task". */
  primaryAction?: ReactNode;
};

export function HandoffCell({ title, phase, steps, nextAction, primaryAction }: HandoffCellProps) {
  return (
    <Cell
      glyph="HND"
      eyebrow={`Handoff · ${phase}`}
      title={title}
      subtitle={nextAction ? `Next: ${nextAction}` : "All agents accounted for."}
      status={nextAction ? "requires-approval" : "memory-synced"}
      tone={nextAction ? "warning" : "info"}
      primaryAction={primaryAction}
    >
      <ul className="m-0 flex flex-col gap-1.5 p-0 [list-style:none] text-xs">
        {steps.slice(0, 3).map((step, index) => (
          <li
            key={`${step.agent}-${index}`}
            className="flex items-center gap-2 rounded-md border border-[rgba(148,163,184,0.12)] bg-[rgba(10,14,21,0.55)] px-2.5 py-1.5"
          >
            <span
              aria-hidden="true"
              className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[rgba(45,212,191,0.15)] text-[0.65rem] font-semibold text-[#99f6e4]"
            >
              {index + 1}
            </span>
            <strong className="shrink-0 text-xs font-semibold text-[var(--foreground)]">
              {step.agent}
            </strong>
            <span className="min-w-0 flex-1 truncate text-[var(--muted)]">
              {step.action}
            </span>
            {step.when ? (
              <small className="whitespace-nowrap text-[0.6rem] uppercase tracking-[0.1em] text-[var(--muted)]">
                {step.when}
              </small>
            ) : null}
          </li>
        ))}
      </ul>
    </Cell>
  );
}
