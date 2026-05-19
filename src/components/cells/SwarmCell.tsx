import type { ReactNode } from "react";

import { Cell } from "./Cell";
import type { StatusKind } from "./StatusPill";

/**
 * SwarmCell shows the multi-agent rehearsal companion (MiroShark) state.
 *
 * Default view answers the Swarm screen philosophy questions:
 *   - What is the objective?
 *   - Who is assigned?
 *   - What phase are we in?
 *   - What is the next action?
 *
 * Raw service URLs, REST endpoints, and protocol details live behind the
 * details slot (philosophy rule 6).
 */
type SwarmCellProps = {
  /** Is the rehearsal backend reachable? */
  connected: boolean;
  /** Is the companion installed locally but not reachable yet? */
  installed?: boolean;
  /** Optional short description of what the companion is set up to do. */
  role?: string;
  /** Latency or backend status hint — kept short. */
  hint?: string;
  /** Single primary action — Open rehearsal / Connect companion. */
  primaryAction?: ReactNode;
  /** Endpoint paths, base URLs, protocol notes. */
  details?: ReactNode;
};

export function SwarmCell({ connected, installed, role, hint, primaryAction, details }: SwarmCellProps) {
  const status: StatusKind = connected ? "running" : installed ? "needs-setup" : "offline";
  const showDetails = !connected && details;
  const showBody = !connected && hint;

  return (
    <Cell
      title={connected ? "MiroShark" : installed ? "MiroShark detected" : "MiroShark not installed"}
      subtitle={connected ? "Connected" : role ?? "OpenClaw can install and start it from here."}
      status={status}
      statusLabel={connected ? undefined : installed ? "Start" : "Install"}
      tone={connected ? "success" : installed ? "warning" : "danger"}
      primaryAction={primaryAction}
      details={showDetails ? details : undefined}
      detailsLabel="Setup details"
      className={connected ? "mirosharkConnectedCell" : undefined}
    >
      {showBody ? <p className="text-xs text-[var(--muted)]">{hint}</p> : null}
    </Cell>
  );
}
