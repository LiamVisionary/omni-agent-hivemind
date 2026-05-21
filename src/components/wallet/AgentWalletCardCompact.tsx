"use client";

import { ChevronRight, Power } from "lucide-react";

import type { AgentSurvivalSnapshot, AgentWalletConfig } from "@/lib/types/agent-wallet";

import styles from "./AgentWalletCardCompact.module.css";

type Props = {
  agentName: string;
  wallet: AgentWalletConfig;
  survival: AgentSurvivalSnapshot;
  onOpen: () => void;
};

type ChipTone = "ok" | "warn" | "danger" | "off" | "muted";

function statusFor(wallet: AgentWalletConfig, survival: AgentSurvivalSnapshot): {
  tone: ChipTone;
  text: string;
} {
  if (!wallet.enabled) return { tone: "off", text: "Wallet off" };
  if (survival.tier === "critical" || survival.tier === "dead") {
    return { tone: "danger", text: "Needs funding" };
  }
  if (survival.tier === "low_compute") return { tone: "warn", text: "Slowing down" };
  if (survival.daysRemaining != null) {
    return { tone: "ok", text: `${survival.daysRemaining.toFixed(1)} days runway` };
  }
  return { tone: "ok", text: "Can spend" };
}

function formatMoney(value: number): string {
  return `$${Math.max(0, value).toFixed(2)}`;
}

export function AgentWalletCardCompact({ agentName, wallet, survival, onOpen }: Props) {
  const tier = wallet.enabled ? survival.tier : "off";
  const safeBalance = Math.max(0, survival.effectiveBalanceUsd);
  const status = statusFor(wallet, survival);

  return (
    <button
      type="button"
      className={styles.card}
      data-tier={tier}
      onClick={onOpen}
      aria-label={`Open ${agentName} wallet`}
    >
      <div className={styles.head}>
        <span className={styles.dot} aria-hidden="true" />
        <strong className={styles.name}>{agentName}</strong>
      </div>

      <div className={styles.balance}>
        <span className={styles.amount}>{formatMoney(safeBalance)}</span>
        <span className={styles.unit}>{wallet.tokenSymbol || "USDC"}</span>
      </div>

      <div className={styles.statusRow}>
        <span className={styles.statusChip} data-tone={status.tone}>
          {status.tone === "off" ? <Power aria-hidden="true" /> : null}
          {status.text}
        </span>
        <span className={styles.openIcon} aria-hidden="true">
          <ChevronRight width={16} height={16} />
        </span>
      </div>
    </button>
  );
}
