import type { ReactNode } from "react";

import { Cell } from "./Cell";

/**
 * SetupCell renders the five-step "activating cells in a hive" flow
 * described in the design philosophy. Each step is one short phrase
 * and a state — pending / current / done — never a configuration form.
 *
 *   1. Connect          — Tailscale detected
 *   2. Verify           — Collector verified
 *   3. Configure limits — Wallet caps and approval thresholds
 *   4. Enable           — First agent detected / brain attached
 *   5. Advanced         — Raw provider rails (kept behind disclosure)
 */
export type SetupStepState = "pending" | "current" | "done";

export type SetupStep = {
  label: string;
  hint?: string;
  state: SetupStepState;
};

type SetupCellProps = {
  title: string;
  subtitle?: string;
  steps: SetupStep[];
  primaryAction?: ReactNode;
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

export function SetupCell({ title, subtitle, steps, primaryAction, details }: SetupCellProps) {
  const allDone = steps.every((step) => step.state === "done");
  const currentStep = steps.find((step) => step.state === "current");

  return (
    <Cell
      glyph="SET"
      eyebrow="Setup"
      title={title}
      subtitle={subtitle ?? (allDone ? "All steps are done." : currentStep?.hint ?? "Activate one cell at a time.")}
      status={allDone ? "healthy" : "needs-setup"}
      tone={allDone ? "success" : "warning"}
      primaryAction={primaryAction}
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
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="font-semibold text-[var(--foreground)]">
                {index + 1}. {step.label}
              </span>
              {step.hint ? (
                <span className="text-[var(--muted)]">{step.hint}</span>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </Cell>
  );
}
