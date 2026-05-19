import type { ReactNode } from "react";

import { Cell } from "./Cell";

/**
 * SecurityCell makes the trust model visible (philosophy rule 5).
 *
 * Default view answers:
 *   - Is this private?
 *   - What is read-only?
 *   - Are secrets protected?
 *   - Which actions are risky?
 *
 * Each trust label is a short, plain-English statement — no protocol
 * names. The cell is intentionally calm: a green pill when nothing is
 * exposed, a danger pill the moment a risky path opens up.
 */
type TrustLabel = {
  text: string;
  /** Is this trust label currently true? */
  ok: boolean;
};

type SecurityCellProps = {
  labels: TrustLabel[];
  /** Optional primary action — usually "Review risk" if any label is failing. */
  primaryAction?: ReactNode;
};

export function SecurityCell({ labels, primaryAction }: SecurityCellProps) {
  const failing = labels.filter((label) => !label.ok);
  const anyRisk = failing.length > 0;

  return (
    <Cell
      glyph="SEC"
      eyebrow="Trust state"
      title={anyRisk ? "Review your trust state" : "Private by default"}
      subtitle={anyRisk
        ? `${failing.length} risk${failing.length === 1 ? "" : "s"} need a look.`
        : "Local-first. Tailnet-only. Collectors are read-only until you change it."}
      status={anyRisk ? "risk" : "private"}
      tone={anyRisk ? "danger" : "info"}
      primaryAction={primaryAction}
    >
      <ul className="m-0 flex flex-col gap-1 p-0 [list-style:none]">
        {labels.map((label) => (
          <li
            key={label.text}
            className="flex items-center gap-2 text-xs text-[var(--foreground)]/90"
          >
            <span
              aria-hidden="true"
              className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[0.6rem] font-bold ${
                label.ok
                  ? "bg-[rgba(74,222,128,0.18)] text-[#bbf7d0]"
                  : "bg-[rgba(251,113,133,0.2)] text-[#fecdd3]"
              }`}
            >
              {label.ok ? "✓" : "!"}
            </span>
            <span className="truncate">{label.text}</span>
          </li>
        ))}
      </ul>
    </Cell>
  );
}
