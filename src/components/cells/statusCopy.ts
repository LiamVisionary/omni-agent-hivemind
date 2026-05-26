import type { AgentSurvivalSnapshot, AgentWalletConfig } from "@/lib/types/agent-wallet";

import type { StatusKind } from "./StatusPill";

/**
 * Helpers that translate raw runtime data into the plain-English status
 * vocabulary used by every honeycomb cell. Keeping this in one place
 * makes it easy to enforce philosophy rules 4 (plain language) and 7
 * (default views show summaries, not raw fields).
 */

export type MachineLike = {
  collector: "ready" | "not-installed" | "offline" | "missing" | "unknown";
  online: boolean;
  /** True when this is the user's own computer. */
  self?: boolean;
};

export type AgentLike = {
  hasTelemetryUrl: boolean;
  activeCount: number;
  snapshotOk?: boolean;
  processRunning?: boolean;
  snapshotError?: string;
};

/**
 * Map a Tailnet machine + local bridge pair to the canonical status set.
 *
 *  bridge: ready                        -> healthy
 *  online but bridge not installed      -> needs-setup
 *  online but bridge offline/missing    -> collector-offline
 *  not online at all                    -> offline
 *  unknown                              -> unknown
 */
export function machineStatus(machine: MachineLike): {
  kind: StatusKind;
  body: string;
  nextAction: "manage" | "connect" | "wait";
} {
  if (machine.collector === "ready") {
    return {
      kind: "healthy",
      body: "Reachable on your private Tailnet.",
      nextAction: "manage",
    };
  }
  if (!machine.online) {
    return {
      kind: "offline",
      body: "This machine is offline. Bring it online to reconnect.",
      nextAction: "wait",
    };
  }
  if (machine.collector === "not-installed") {
    return {
      kind: "needs-setup",
      body: "Install the local agent bridge once to put this machine on the fleet.",
      nextAction: "connect",
    };
  }
  if (machine.collector === "offline" || machine.collector === "missing") {
    return {
      kind: "collector-offline",
      body: "The local agent bridge isn't responding. Reconnect it from the machine itself.",
      nextAction: "connect",
    };
  }
  return {
    kind: "unknown",
    body: "Status pending — checking the local agent bridge.",
    nextAction: "wait",
  };
}

/**
 * Plain-English status for an agent cell. Honours rule 8 (machine
 * context before agent details): if there is no machine wiring yet,
 * the agent is "Needs setup", not "Working".
 */
export function agentStatus(agent: AgentLike): {
  kind: StatusKind;
  body: string;
} {
  if (!agent.hasTelemetryUrl) {
    return {
      kind: "needs-setup",
      body: "Connect a machine for this agent first.",
    };
  }
  if (agent.activeCount > 0) {
    return {
      kind: "running",
      body:
        agent.activeCount === 1
          ? "Working on one task right now."
          : `Working on ${agent.activeCount} tasks right now.`,
    };
  }
  if (agent.snapshotOk && agent.processRunning) {
    return {
      kind: "running",
      body: "Agent is running.",
    };
  }
  if (agent.snapshotOk) {
    return {
      kind: "idle",
      body: "Connected and waiting for new work.",
    };
  }
  if (agent.snapshotError) {
    return {
      kind: "blocked",
      body: "The local agent bridge saw an error — open details to inspect.",
    };
  }
  return {
    kind: "idle",
    body: "Connected. No activity recorded yet.",
  };
}

/**
 * Plain-English status for a wallet cell. Money-moving language is
 * intentionally restrained — no jargon, no protocol names. The rule
 * "the user should know if the agent can spend, how much, and when it
 * will stop" comes straight from the design philosophy.
 */
export function walletStatus(
  wallet: AgentWalletConfig,
  survival: AgentSurvivalSnapshot,
): {
  kind: StatusKind;
  headline: string;
  body: string;
} {
  if (!wallet.enabled) {
    return {
      kind: "off",
      headline: "Wallet is off",
      body: "This agent cannot spend yet. Turn the wallet on only when you are ready.",
    };
  }
  if (survival.tier === "dead" || survival.tier === "critical") {
    return {
      kind: "needs-funding",
      headline: "Needs funding",
      body: "Fund this wallet before assigning paid work.",
    };
  }
  if (survival.tier === "low_compute") {
    return {
      kind: "blocked",
      headline: "Slowing down",
      body: "Running on cheap inference until you top it up.",
    };
  }
  if (wallet.approvalRequiredOverUsd > 0 && wallet.maxPaymentUsd > wallet.approvalRequiredOverUsd) {
    return {
      kind: "requires-approval",
      headline: "Will ask before big spend",
      body: `Asks you to approve anything over $${wallet.approvalRequiredOverUsd.toFixed(2)}.`,
    };
  }
  return {
    kind: "healthy",
    headline: "Can spend safely",
    body:
      survival.daysRemaining != null
        ? `About ${survival.daysRemaining.toFixed(1)} days of runway at the current burn.`
        : "No burn estimate yet — set a daily running cost in details.",
  };
}

/**
 * One-line "what is the safest next action" hint per machine state.
 * Returned separately so cells can render it as a button label instead
 * of inventing copy locally.
 */
export function machineActionLabel(state: ReturnType<typeof machineStatus>) {
  if (state.nextAction === "connect") return "Connect";
  if (state.nextAction === "manage") return "Manage";
  return "Refresh";
}
