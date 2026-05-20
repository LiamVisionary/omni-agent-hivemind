import type { ReactNode } from "react";

import { Cell } from "./Cell";

/**
 * SetupCell renders the progressive "activating cells in a hive" flow
 * described in the design philosophy. Each step is one short phrase
 * and a state — pending / current / done — never a configuration form.
 *
 *   1. Optional: Install Tailscale — Private Tailnet ready
 *   2. Connect           — Setup command run
 *   3. Verify machine    — Collector verified
 *   4. Configure         — Optional feature rails kept behind disclosure
 */
export type SetupStepState = "pending" | "current" | "done";

export type SetupStep = {
  label: string;
  hint?: string;
  state: SetupStepState;
  action?: ReactNode;
};

type SetupCellProps = {
  title: string;
  subtitle?: string;
  steps: SetupStep[];
  /** Slot for the actual setup command, copy button, etc. */
  details?: ReactNode;
};

const STATE_GLYPH: Record<SetupStepState, string> = {
  pending: "○",
  current: "●",
  done: "✓",
};

const STATE_CLASS: Record<SetupStepState, string> = {
  pending: "text-[var(--muted)]",
  current: "text-[#fde68a]",
  done: "text-[#bbf7d0]",
};

export function SetupCell({ title, subtitle, steps, details }: SetupCellProps) {
  const allDone = steps.every((step) => step.state === "done");
  const currentStep = steps.find((step) => step.state === "current");

  return (
    <Cell
      title={title}
      subtitle={subtitle ?? (allDone ? "All steps are done." : currentStep?.hint ?? "Activate one cell at a time.")}
      tone={allDone ? "success" : "warning"}
      details={details}
      detailsLabel="Setup command"
    >
      <ol className="m-0 flex flex-col gap-2 p-0 [list-style:none]">
        {steps.map((step, index) => (
          <li
            key={step.label}
            className="flex items-start gap-3 text-xs text-[var(--foreground)]/90"
          >
            <span
              aria-hidden="true"
              className={`mt-[2px] inline-block w-4 text-center text-[0.85rem] font-bold ${STATE_CLASS[step.state]}`}
            >
              {STATE_GLYPH[step.state]}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="font-semibold text-[var(--foreground)]">
                  {index + 1}. {step.label}
                </span>
                {step.hint ? (
                  <span className="text-[var(--muted)]">{step.hint}</span>
                ) : null}
              </div>
              {step.action ? (
                <div className="shrink-0 sm:pt-0.5" onClick={(event) => event.stopPropagation()}>
                  {step.action}
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </Cell>
  );
}
