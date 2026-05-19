import type { ReactNode } from "react";

import type { AgentSurvivalSnapshot, AgentWalletConfig } from "@/lib/types/agent-wallet";

import { Cell, CellDangerZone } from "./Cell";
import { walletStatus } from "./statusCopy";

/**
 * WalletCell follows the philosophy's strict wallet rules:
 *
 *  - The default view answers four questions only:
 *      1. Can this agent spend?
 *      2. How much can it safely spend?
 *      3. Will it stop soon?
 *      4. Does it need funding?
 *  - Money-moving actions (toggle wallet, autopay, reset burn clock,
 *    copy payment prompt) are partitioned into `CellDangerZone` so they
 *    never sit beside passive read-only status.
 *  - Provider keys, x402 base URL, network selectors, ClawCard env, and
 *    burn-rate math live behind the `Advanced setup` disclosure.
 */
type WalletCellProps = {
  /** Plain-English agent name. */
  agentName: string;
  wallet: AgentWalletConfig;
  survival: AgentSurvivalSnapshot;
  /** Optional click handler when the cell is in list-summary mode. */
  onSelect?: () => void;
  selected?: boolean;
  /**
   * Money-moving controls — pass `<Button>`s like "Turn wallet on",
   * "Autopay within caps", "Reset runway", "Copy agent prompt".
   */
  moneyMovingControls?: ReactNode;
  /** Read-only "Simple limits" fields rendered in default view. */
  simpleLimits?: ReactNode;
  /** Advanced provider / network / API fields. Goes behind disclosure. */
  advancedSetup?: ReactNode;
};

function survivalTone(snapshot: AgentSurvivalSnapshot, enabled: boolean) {
  if (!enabled) return "muted" as const;
  if (snapshot.tier === "dead" || snapshot.tier === "critical") return "danger" as const;
  if (snapshot.tier === "low_compute") return "warning" as const;
  return "success" as const;
}

export function WalletCell({
  agentName,
  wallet,
  survival,
  onSelect,
  selected,
  moneyMovingControls,
  simpleLimits,
  advancedSetup,
}: WalletCellProps) {
  const status = walletStatus(wallet, survival);

  // Build a compact read-only "can it spend / how long / safe balance" line
  // — the three answers a user actually needs in the default view.
  const safeBalance = Math.max(0, survival.effectiveBalanceUsd);

  return (
    <Cell
      glyph="WAL"
      eyebrow={`Wallet · ${agentName}`}
      title={status.headline}
      subtitle={status.body}
      status={status.kind}
      tone={survivalTone(survival, wallet.enabled)}
      selected={selected}
      onSelect={onSelect}
      details={
        <div className="flex flex-col gap-3">
          {simpleLimits ? (
            <section className="flex flex-col gap-2">
              <strong className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                Simple limits
              </strong>
              <p className="text-xs text-[var(--muted)]">
                These are the only numbers most users need to set.
              </p>
              {simpleLimits}
            </section>
          ) : null}

          {advancedSetup ? (
            <details
              className="rounded-md border border-[rgba(148,163,184,0.16)] bg-[rgba(15,23,42,0.55)] px-3 py-2"
              onClick={(event) => event.stopPropagation()}
            >
              <summary className="cursor-pointer text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                Advanced setup
              </summary>
              <div className="mt-2 flex flex-col gap-2">{advancedSetup}</div>
            </details>
          ) : null}

          {moneyMovingControls ? (
            <CellDangerZone
              title="Money-moving controls"
              body="These controls change spending behaviour. Use them one at a time and confirm before assigning paid work."
            >
              {moneyMovingControls}
            </CellDangerZone>
          ) : null}
        </div>
      }
      detailsLabel="Manage wallet"
    >
      {/* Default view: three plain-English answers. */}
      <dl className="grid grid-cols-3 gap-3 rounded-md border border-[rgba(148,163,184,0.14)] bg-[rgba(10,14,21,0.55)] p-3 text-xs">
        <div>
          <dt className="uppercase tracking-[0.14em] text-[var(--muted)]">Can spend</dt>
          <dd className="mt-1 text-sm font-semibold text-[var(--foreground)]">
            {wallet.enabled ? "Yes" : "No"}
          </dd>
        </div>
        <div>
          <dt className="uppercase tracking-[0.14em] text-[var(--muted)]">Runway</dt>
          <dd className="mt-1 text-sm font-semibold text-[var(--foreground)]">
            {survival.daysRemaining == null
              ? "—"
              : `${survival.daysRemaining.toFixed(1)} days`}
          </dd>
        </div>
        <div>
          <dt className="uppercase tracking-[0.14em] text-[var(--muted)]">Safe balance</dt>
          <dd className="mt-1 text-sm font-semibold text-[var(--foreground)]">
            ${safeBalance.toFixed(2)}
          </dd>
        </div>
      </dl>
    </Cell>
  );
}
