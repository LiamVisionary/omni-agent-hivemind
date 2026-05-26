import type { ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  CircleAlert,
  CircleCheck,
  CircleSlash,
  Coins,
  Lock,
  Moon,
  PauseCircle,
  PlugZap,
  RefreshCcw,
  ShieldCheck,
  ShieldQuestion,
  Sparkle,
} from "lucide-react";

import { cn } from "@/lib/utils/cn";

/**
 * Canonical status vocabulary for honeycomb cells. The design philosophy
 * standardises primary-surface copy to a small, plain-English set so users
 * can scan the page without reading technical labels.
 *
 *  - healthy             — node is reachable and well
 *  - running             — agent is actively doing work
 *  - idle                — connected but not doing anything right now
 *  - blocked             — something needs attention to continue
 *  - collector-offline   — local agent bridge can't be reached
 *  - needs-setup         — first-run / configuration step required
 *  - needs-funding       — wallet is low or empty
 *  - requires-approval   — money-moving action is waiting on the user
 *  - risk                — something exposed or dangerous was detected
 *  - memory-synced       — shared brain is up to date
 *  - unknown             — we don't know what state this is in yet
 *  - private             — local-first / Tailnet-only / read-only label
 *  - offline             — node is offline (machine, not collector)
 *  - updating            — running an update right now
 *  - off                 — feature is intentionally off
 */
export type StatusKind =
  | "healthy"
  | "running"
  | "idle"
  | "blocked"
  | "collector-offline"
  | "needs-setup"
  | "needs-funding"
  | "requires-approval"
  | "risk"
  | "memory-synced"
  | "unknown"
  | "private"
  | "offline"
  | "updating"
  | "off";

type StatusVisual = {
  label: string;
  icon: ReactNode;
  tone: "success" | "neutral" | "warning" | "danger" | "muted" | "info";
};

const STATUS_VISUALS: Record<StatusKind, StatusVisual> = {
  healthy: { label: "Healthy", icon: <CircleCheck aria-hidden="true" />, tone: "success" },
  running: { label: "Running", icon: <Activity aria-hidden="true" />, tone: "success" },
  idle: { label: "Idle", icon: <Moon aria-hidden="true" />, tone: "neutral" },
  blocked: { label: "Blocked", icon: <PauseCircle aria-hidden="true" />, tone: "warning" },
  "collector-offline": {
    label: "Agent bridge offline",
    icon: <CircleSlash aria-hidden="true" />,
    tone: "warning",
  },
  "needs-setup": { label: "Needs setup", icon: <PlugZap aria-hidden="true" />, tone: "warning" },
  "needs-funding": { label: "Needs funding", icon: <Coins aria-hidden="true" />, tone: "warning" },
  "requires-approval": {
    label: "Requires approval",
    icon: <CircleAlert aria-hidden="true" />,
    tone: "danger",
  },
  risk: { label: "Risk detected", icon: <AlertTriangle aria-hidden="true" />, tone: "danger" },
  "memory-synced": {
    label: "Memory synced",
    icon: <Sparkle aria-hidden="true" />,
    tone: "info",
  },
  unknown: { label: "Unknown", icon: <ShieldQuestion aria-hidden="true" />, tone: "muted" },
  private: { label: "Private", icon: <Lock aria-hidden="true" />, tone: "info" },
  offline: { label: "Offline", icon: <CircleSlash aria-hidden="true" />, tone: "muted" },
  updating: { label: "Updating", icon: <RefreshCcw aria-hidden="true" />, tone: "info" },
  off: { label: "Off", icon: <ShieldCheck aria-hidden="true" />, tone: "muted" },
};

const TONE_CLASS: Record<StatusVisual["tone"], string> = {
  success:
    "border-[rgba(74,222,128,0.32)] bg-[rgba(22,163,74,0.16)] text-[#bbf7d0]",
  neutral:
    "border-[rgba(148,163,184,0.28)] bg-[rgba(30,41,59,0.65)] text-[#cbd5f5]",
  warning:
    "border-[rgba(250,204,21,0.32)] bg-[rgba(202,138,4,0.16)] text-[#fde68a]",
  danger:
    "border-[rgba(251,113,133,0.36)] bg-[rgba(225,29,72,0.16)] text-[#fecdd3]",
  muted:
    "border-[rgba(148,163,184,0.2)] bg-[rgba(15,23,42,0.65)] text-[var(--muted)]",
  info: "border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#99f6e4]",
};

type StatusPillProps = {
  kind: StatusKind;
  /** Override the default label without changing the icon/tone. */
  label?: string;
  className?: string;
  /**
   * Hide the icon — useful when the pill is placed inline with a glyph
   * that already conveys the kind.
   */
  hideIcon?: boolean;
};

/**
 * Compact status pill used as the single "what is happening" signal on
 * every honeycomb cell. There is exactly one status per cell, and it
 * always answers the first of the three philosophy questions.
 */
export function StatusPill({ kind, label, className, hideIcon }: StatusPillProps) {
  const visual = STATUS_VISUALS[kind];
  return (
    <span
      data-slot="status-pill"
      data-tone={visual.tone}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold leading-none tracking-tight [&_svg]:size-3",
        TONE_CLASS[visual.tone],
        className,
      )}
    >
      {hideIcon ? null : visual.icon}
      <span>{label ?? visual.label}</span>
    </span>
  );
}

export function statusLabel(kind: StatusKind) {
  return STATUS_VISUALS[kind].label;
}
