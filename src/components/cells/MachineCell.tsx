"use client";

import type { ReactNode } from "react";
import { Check, PlugZap, RefreshCcw } from "lucide-react";

import { cn } from "@/lib/utils/cn";

import { Cell } from "./Cell";
import { machineStatus, machineActionLabel, type MachineLike } from "./statusCopy";

/**
 * MachineCell — calm machine summary card.
 *
 * The cell's top-right slot adapts to state:
 *  - Needs setup / collector offline → a single chip-button labelled
 *    "Connect" (which IS the affordance — there's no separate primary
 *    action button below, since the chip already covers both signal
 *    and action).
 *  - Healthy + update available     → a small refresh icon-button.
 *  - Healthy + nothing to do        → an empty slot (subtle dot in the
 *    glyph already conveys "all good").
 *  - Offline / unknown              → standard status pill.
 */
type MachineCellProps = {
  name: string;
  address?: string;
  agentCount: number;
  versionState?: {
    label: string;
    detail?: string;
    state: string;
  } | null;
  updateBanner?: ReactNode;
  /** Called when the user clicks the "Connect" chip. */
  onConnect?: () => void;
  /** Called when the user clicks the refresh icon. */
  onSyncUpdate?: () => void;
  /** True while the update request is in flight. */
  isSyncing?: boolean;
  /** True after the update was reported successful (renders a brief check). */
  syncSucceeded?: boolean;
  /** Show the update affordance even when version copy is not stale, e.g. missing required capabilities. */
  forceUpdateAvailable?: boolean;
  /** Optional machine-level menu, usually a compact + action trigger. */
  actionMenu?: ReactNode;
  children?: ReactNode;
  details?: ReactNode;
} & MachineLike;

const DOT_TONE: Record<string, string> = {
  healthy: "bg-[#4ade80]",
  "needs-setup": "bg-[#fbbf24]",
  "collector-offline": "bg-[#fbbf24]",
  offline: "bg-[#475569]",
  unknown: "bg-[#64748b]",
};

function machineGlyph(machine: MachineLike) {
  if (!machine.online) return "OFF";
  if (machine.self) return "MAC";
  return "VPS";
}

export function MachineCell({
  name,
  address,
  agentCount,
  collector,
  online,
  self,
  versionState,
  updateBanner,
  onConnect,
  onSyncUpdate,
  isSyncing,
  syncSucceeded,
  forceUpdateAvailable,
  actionMenu,
  children,
  details,
}: MachineCellProps) {
  const state = machineStatus({ collector, online, self });
  const tone: "default" | "warning" =
    state.kind === "needs-setup" || state.kind === "collector-offline"
      ? "warning"
      : "default";

  const updateNeeded = forceUpdateAvailable || (versionState && versionState.state !== "current");
  const dotClass = DOT_TONE[state.kind] ?? "bg-[#64748b]";

  // Decide what occupies the top-right header slot.
  let statusAction: ReactNode = null;

  if ((state.kind === "needs-setup" || state.kind === "collector-offline") && onConnect) {
    // The Connect chip IS the "Needs setup" status — no separate pill.
    statusAction = (
      <button
        type="button"
        data-slot="machine-connect-chip"
        onClick={(event) => {
          event.stopPropagation();
          onConnect();
        }}
        className="inline-flex h-6 items-center gap-1 rounded-full border border-[rgba(250,204,21,0.26)] bg-[rgba(202,138,4,0.1)] px-2 text-[0.62rem] font-semibold leading-none text-[#fde68a]/90 transition-colors hover:border-[rgba(250,204,21,0.38)] hover:bg-[rgba(250,204,21,0.16)] focus-visible:ring-2 focus-visible:ring-[rgba(250,204,21,0.38)] focus-visible:outline-none [&_svg]:size-2.5"
        aria-label={`Connect ${name}`}
      >
        <PlugZap aria-hidden="true" />
        Connect
      </button>
    );
  } else if (state.kind === "healthy" && updateNeeded && onSyncUpdate) {
    statusAction = (
      <button
        type="button"
        data-slot={syncSucceeded ? "machine-update-chip-success" : "machine-update-chip"}
        onClick={(event) => {
          event.stopPropagation();
          onSyncUpdate();
        }}
        className={cn(
          "inline-flex h-7 items-center justify-center gap-1.5 rounded-full border px-2.5 text-[0.68rem] font-semibold text-[var(--muted)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(45,212,191,0.45)] [&_svg]:size-3.5",
          syncSucceeded
            ? "border-[rgba(74,222,128,0.32)] bg-[rgba(22,163,74,0.16)] text-[#bbf7d0]"
            : "border-[rgba(148,163,184,0.24)] bg-[rgba(15,23,42,0.7)] hover:border-[rgba(94,234,212,0.42)] hover:text-[var(--accent-strong)]",
          isSyncing ? "pointer-events-none" : "",
        )}
        aria-label={syncSucceeded ? "Update applied" : isSyncing ? "Syncing update" : `Sync update on ${name}`}
        title={versionState?.label ?? "Sync update"}
        aria-busy={isSyncing || undefined}
      >
        {syncSucceeded ? (
          <><Check aria-hidden="true" /> Updated</>
        ) : isSyncing ? (
          <><RefreshCcw aria-hidden="true" className="animate-spin" /> Updating</>
        ) : (
          <><RefreshCcw aria-hidden="true" /> Update</>
        )}
      </button>
    );
  }

  const headerSlot = statusAction || actionMenu ? (
    <span className="inline-flex items-center gap-1.5">
      {statusAction}
      {actionMenu}
    </span>
  ) : null;

  return (
    <Cell
      glyph={(
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className={cn("inline-block size-1.5 rounded-full", dotClass)} />
          {machineGlyph({ collector, online, self })}
        </span>
      )}
      title={name}
      subtitle={[
        agentCount > 0 ? `${agentCount} agent${agentCount === 1 ? "" : "s"}` : null,
        address || null,
      ].filter(Boolean).join(" · ")}
      status={state.kind}
      tone={tone}
      headerSlot={headerSlot}
      details={details}
      detailsLabel="Machine details"
    >
      {updateBanner}
      {children}
    </Cell>
  );
}

export { machineActionLabel };
