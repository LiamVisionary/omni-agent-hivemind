import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

import type { StatusKind } from "./StatusPill";
import { StatusPill } from "./StatusPill";

/**
 * Honeycomb cell — compact by default, deep when inspected.
 *
 * Default rendering is intentionally calm:
 *   - one subtle neutral border (never colored on healthy state)
 *   - one identity line
 *   - one optional data line
 *   - one optional action
 *
 * The cell border tints ONLY when state is warning/danger — a green
 * border on a healthy card just adds noise. Status pills are reserved
 * for states the user must act on; healthy/idle/running render no pill
 * at all in the cell header (the calling site uses a dot if needed).
 */
type CellTone = "default" | "warning" | "danger" | "muted" | "info" | "success";

/** Status kinds that warrant a visible pill in the cell header. */
const PILL_WORTHY: ReadonlySet<StatusKind> = new Set([
  "needs-setup",
  "needs-funding",
  "collector-offline",
  "blocked",
  "requires-approval",
  "risk",
  "offline",
  "updating",
]);

type CellProps = {
  glyph?: ReactNode;
  title: ReactNode;
  eyebrow?: string;
  subtitle?: ReactNode;
  /** Status kind. The pill renders only for action-worthy states. */
  status?: StatusKind;
  statusLabel?: string;
  /** Cell tone — affects the outline only. Default "default" stays neutral. */
  tone?: CellTone;
  children?: ReactNode;
  primaryAction?: ReactNode;
  /**
   * Slot that occupies the top-right header position INSTEAD of the
   * standard status pill. Use this when a cell wants to merge the
   * status indicator with an action (e.g. "Connect" replacing "Needs
   * setup"), or to drop a small icon-only button (e.g. refresh).
   */
  headerSlot?: ReactNode;
  details?: ReactNode;
  detailsLabel?: string;
  onSelect?: () => void;
  selected?: boolean;
  className?: string;
  ariaLabel?: string;
};

// Cells stay neutral on healthy state. `success` and `info` are accepted
// for backward compat but render the same subtle gray border as `default`
// — colored borders are reserved for situations the user must act on.
const TONE_OUTLINE: Record<CellTone, string> = {
  default: "border-[rgba(148,163,184,0.16)]",
  success: "border-[rgba(148,163,184,0.16)]",
  info: "border-[rgba(148,163,184,0.16)]",
  muted: "border-[rgba(148,163,184,0.1)]",
  warning: "border-[rgba(250,204,21,0.36)]",
  danger: "border-[rgba(251,113,133,0.4)]",
};

export function Cell({
  glyph,
  eyebrow,
  title,
  subtitle,
  status,
  statusLabel: statusLabelOverride,
  tone = "default",
  children,
  primaryAction,
  headerSlot,
  details,
  detailsLabel = "Details",
  onSelect,
  selected,
  className,
  ariaLabel,
}: CellProps) {
  // headerSlot wins if provided; otherwise fall back to a status pill,
  // but only for action-worthy states.
  const showPill = !headerSlot && (status ? PILL_WORTHY.has(status) : false);

  return (
    <article
      data-slot="cell"
      data-selected={selected ? "true" : undefined}
      aria-label={ariaLabel}
      className={cn(
        "relative flex flex-col gap-2.5 rounded-lg border bg-[rgba(16,20,29,0.7)] px-3 py-3 transition-colors",
        TONE_OUTLINE[tone],
        selected ? "ring-1 ring-[rgba(45,212,191,0.32)]" : "",
        onSelect ? "cursor-pointer hover:border-[rgba(94,234,212,0.28)]" : "",
        className,
      )}
      onClick={onSelect}
      onKeyDown={onSelect ? (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      } : undefined}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
    >
      <header className="flex items-center gap-2">
        {glyph ? (
          <span
            aria-hidden="true"
            className="inline-flex shrink-0 text-[0.55rem] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]"
          >
            {glyph}
          </span>
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col">
          {eyebrow ? (
            <span className="truncate text-[0.55rem] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
              {eyebrow}
            </span>
          ) : null}
          <h3 className="truncate text-sm font-semibold leading-tight text-[var(--foreground)]">
            {title}
          </h3>
          {subtitle ? (
            <p className="truncate text-[0.7rem] leading-snug text-[var(--muted)]">{subtitle}</p>
          ) : null}
        </div>
        {headerSlot ? headerSlot : (showPill && status ? <StatusPill kind={status} label={statusLabelOverride} /> : null)}
      </header>

      {children ? (
        <div className="text-xs text-[var(--foreground)]/90 [&_p]:m-0">{children}</div>
      ) : null}

      {primaryAction ? (
        <div className="flex flex-wrap items-center gap-1.5">{primaryAction}</div>
      ) : null}

      {details ? (
        <details
          className="group rounded border border-[rgba(148,163,184,0.08)] bg-[rgba(10,14,21,0.4)] px-2 py-1 text-xs text-[var(--muted)] open:bg-[rgba(10,14,21,0.7)]"
          onClick={(event) => event.stopPropagation()}
        >
          <summary className="flex cursor-pointer items-center gap-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-[var(--muted)] marker:hidden">
            <span aria-hidden="true" className="inline-block transition-transform group-open:rotate-90">›</span>
            {detailsLabel}
          </summary>
          <div className="mt-2 flex flex-col gap-2 text-[0.72rem] text-[var(--foreground)]/85">
            {details}
          </div>
        </details>
      ) : null}
    </article>
  );
}

/**
 * Money-moving partition — used inside wallet detail disclosures.
 */
export function CellDangerZone({
  title,
  body,
  children,
}: {
  title: string;
  body?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      data-slot="cell-danger-zone"
      className="flex flex-col gap-1.5 rounded border border-[rgba(251,113,133,0.32)] bg-[rgba(225,29,72,0.06)] p-2"
    >
      <header className="flex items-center justify-between gap-2">
        <strong className="text-[0.66rem] font-semibold uppercase tracking-[0.1em] text-[#fecdd3]">
          {title}
        </strong>
        <span className="text-[0.55rem] uppercase tracking-[0.14em] text-[#fecdd3]/80">
          Money-moving
        </span>
      </header>
      {body ? <p className="text-[0.7rem] text-[var(--muted)]">{body}</p> : null}
      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
    </section>
  );
}
