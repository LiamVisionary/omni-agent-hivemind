import type { ReactNode } from "react";

import { Cell } from "./Cell";

/**
 * MemoryCell renders the "shared brain" state — typically the Obsidian
 * vault and the Hermes Control Room paths.
 *
 * Default view answers: "Is the shared brain connected? Where is it?
 * Who is opted in?" — the three things from the Shared Brain screen
 * philosophy. Raw JSON status output and path validation results live
 * inside the details disclosure rendered as labelled sentences, not as
 * `JSON.stringify` dumps (philosophy rule 6).
 */
type MemoryCellProps = {
  enabled: boolean;
  /** Plain-English vault location, e.g. "~/Documents/Obsidian/HivemindOS Vault". */
  vaultPath?: string;
  /** Number of agents currently opted in to the shared brain. */
  optedInAgentCount: number;
  /** Total number of agents in the fleet. */
  totalAgentCount: number;
  /** Single primary action — Connect or Manage. */
  primaryAction: ReactNode;
  /** Path inputs + path validation messages. Goes behind details. */
  details?: ReactNode;
};

export function MemoryCell({
  enabled,
  vaultPath,
  optedInAgentCount,
  totalAgentCount,
  primaryAction,
  details,
}: MemoryCellProps) {
  const status = !enabled
    ? "off"
    : vaultPath
      ? "memory-synced"
      : "needs-setup";

  const headline = !enabled
    ? "Shared brain is off"
    : vaultPath
      ? "Connected to your vault"
      : "Vault location needed";

  const subtitle = !enabled
    ? "Turn it on when you want agents to share context."
    : vaultPath
      ? vaultPath
      : "Point this at your Obsidian vault folder.";

  return (
    <Cell
      glyph="BRN"
      eyebrow="Shared brain"
      title={headline}
      subtitle={subtitle}
      status={status}
      tone={enabled ? "info" : "muted"}
      primaryAction={primaryAction}
      details={details}
      detailsLabel="Vault details"
    >
      <p>
        {enabled ? (
          <>
            <strong className="font-semibold text-[var(--foreground)]">
              {optedInAgentCount}
            </strong>
            <span className="text-[var(--muted)]"> of {totalAgentCount} agents</span>
            <span className="text-[var(--muted)]"> use this brain for context and handoffs.</span>
          </>
        ) : (
          <span className="text-[var(--muted)]">
            No agent will read or write to the shared brain until you turn it on.
          </span>
        )}
      </p>
    </Cell>
  );
}
