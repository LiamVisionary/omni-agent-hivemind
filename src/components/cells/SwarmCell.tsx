import Image from "next/image";
import type { ReactNode } from "react";

import { LottiePlayer } from "@/components/ui/lottie-player";

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
  /** Is the companion mid-install/start (animate the loader). */
  starting?: boolean;
  /** Optional short description of what the companion is set up to do. */
  role?: string;
  /** Latency or backend status hint — kept short. */
  hint?: string;
  /** Single primary action — Open rehearsal / Connect companion. */
  primaryAction?: ReactNode;
  /** Endpoint paths, base URLs, protocol notes. */
  details?: ReactNode;
};

export function SwarmCell({ connected, installed, starting, role, hint, primaryAction, details }: SwarmCellProps) {
  const status: StatusKind = connected ? "running" : installed ? "needs-setup" : "offline";
  const showDetails = !connected && details;
  const showBody = !connected && hint;

  const icon = starting ? (
    <LottiePlayer src="/animations/Load%20HIVE.lottie" size={28} ariaLabel="MiroShark starting" />
  ) : (
    <Image
      src="/icons/miroshark.png"
      alt=""
      width={28}
      height={28}
      className="size-7 shrink-0 rounded-md object-contain"
      aria-hidden="true"
    />
  );

  return (
    <Cell
      title={
        <span className="flex items-center gap-2">
          {icon}
          <span>{connected ? "MiroShark" : installed ? "MiroShark detected" : "MiroShark not installed"}</span>
        </span>
      }
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
