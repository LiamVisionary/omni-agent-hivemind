import type {
  AgentSurvivalSnapshot,
  AgentSurvivalTier,
  AgentWalletConfig,
  X402PaymentRequirement,
} from "@/lib/types/agent-wallet";

export const DEFAULT_AGENT_WALLET: Omit<AgentWalletConfig, "agentId"> = {
  enabled: false,
  provider: "clawcard",
  walletAddress: "",
  network: "eip155:8453",
  tokenSymbol: "USDC",
  seedBalanceUsd: 10,
  currentBalanceUsd: 10,
  dailyComputeBurnUsd: 1,
  maxPaymentUsd: 0.5,
  approvalRequiredOverUsd: 2,
  autoPayEnabled: false,
  clawCardEnvName: "CLAWCARD_API_KEY",
  moneyClawEnvName: "MONEYCLAW_API_KEY",
  x402BaseUrl: "",
  survivalStartedAt: 0,
  updatedAt: 0,
  notes: "",
};

// Adapted from Conway-Research/automaton: src/types.ts and src/conway/credits.ts.
// Their runtime thresholds are credit-cents based; this app uses dollars for the local setup ledger.
export const SURVIVAL_THRESHOLDS_USD = {
  high: 5,
  normal: 0.5,
  low_compute: 0.1,
  critical: 0,
  dead: -0.01,
} as const;

export function createDefaultAgentWallet(agentId: string): AgentWalletConfig {
  const now = Date.now();
  return {
    ...DEFAULT_AGENT_WALLET,
    agentId,
    survivalStartedAt: now,
    updatedAt: now,
  };
}

export function normalizeMoney(value: unknown, fallback = 0): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.round(numeric * 100) / 100);
}

export function getEffectiveBalanceUsd(config: AgentWalletConfig, now = Date.now()): number {
  if (!config.enabled || config.dailyComputeBurnUsd <= 0 || !config.survivalStartedAt) {
    return normalizeMoney(config.currentBalanceUsd);
  }
  const elapsedDays = Math.max(0, now - config.survivalStartedAt) / 86_400_000;
  return Math.round((config.currentBalanceUsd - elapsedDays * config.dailyComputeBurnUsd) * 100) / 100;
}

export function getSurvivalTierFromUsd(balanceUsd: number): AgentSurvivalTier {
  if (balanceUsd > SURVIVAL_THRESHOLDS_USD.high) return "high";
  if (balanceUsd > SURVIVAL_THRESHOLDS_USD.normal) return "normal";
  if (balanceUsd > SURVIVAL_THRESHOLDS_USD.low_compute) return "low_compute";
  if (balanceUsd >= SURVIVAL_THRESHOLDS_USD.critical) return "critical";
  return "dead";
}

export function getSurvivalSnapshot(config: AgentWalletConfig, now = Date.now()): AgentSurvivalSnapshot {
  const effectiveBalanceUsd = getEffectiveBalanceUsd(config, now);
  const tier = getSurvivalTierFromUsd(effectiveBalanceUsd);
  const daysRemaining = config.dailyComputeBurnUsd > 0
    ? Math.max(0, effectiveBalanceUsd / config.dailyComputeBurnUsd)
    : null;
  const hoursRemaining = daysRemaining == null ? null : daysRemaining * 24;

  const tierHints: Record<AgentSurvivalTier, Pick<AgentSurvivalSnapshot, "canRunInference" | "modelHint" | "heartbeatHint" | "statusCopy">> = {
    high: {
      canRunInference: true,
      modelHint: "frontier",
      heartbeatHint: "fast",
      statusCopy: "Funded and clear for normal paid work.",
    },
    normal: {
      canRunInference: true,
      modelHint: "frontier",
      heartbeatHint: "normal",
      statusCopy: "Alive, but should seek revenue before spending freely.",
    },
    low_compute: {
      canRunInference: true,
      modelHint: "cheap",
      heartbeatHint: "slow",
      statusCopy: "Low compute mode: cheap model, fewer paid calls.",
    },
    critical: {
      canRunInference: true,
      modelHint: "minimal",
      heartbeatHint: "emergency",
      statusCopy: "Critical: only survival, earning, and funding tasks should run.",
    },
    dead: {
      canRunInference: false,
      modelHint: "stopped",
      heartbeatHint: "stopped",
      statusCopy: "Stopped locally until the wallet is funded again.",
    },
  };

  return {
    tier,
    effectiveBalanceUsd,
    daysRemaining,
    hoursRemaining,
    ...tierHints[tier],
  };
}

// Adapted from qntx/x402-openai-typescript: src/policies.ts.
// The original policies operate on @x402/fetch PaymentRequirements; these local versions keep
// the same filter semantics without importing wallet/payment packages into the dashboard.
export type X402Policy = (requirements: X402PaymentRequirement[]) => X402PaymentRequirement[];

export function preferNetwork(network: string): X402Policy {
  const isWildcard = network.endsWith(":*");
  const prefix = isWildcard ? network.slice(0, -1) : null;
  return (requirements) => {
    const matched = requirements.filter((requirement) => (
      prefix ? requirement.network.startsWith(prefix) : requirement.network === network
    ));
    return matched.length > 0 ? matched : requirements;
  };
}

export function preferScheme(scheme: string): X402Policy {
  return (requirements) => {
    const matched = requirements.filter((requirement) => requirement.scheme === scheme);
    return matched.length > 0 ? matched : requirements;
  };
}

export function maxAmount(maxBaseUnits: bigint | number): X402Policy {
  const limit = BigInt(maxBaseUnits);
  return (requirements) => {
    const matched = requirements.filter((requirement) => {
      const raw = requirement.amount ?? requirement.maxAmountRequired ?? 0;
      return BigInt(raw) <= limit;
    });
    return matched.length > 0 ? matched : requirements;
  };
}

export function buildAgentPaymentPrompt(config: AgentWalletConfig, snapshot = getSurvivalSnapshot(config)): string {
  const provider = config.provider === "clawcard"
    ? `ClawCard via ${config.clawCardEnvName}`
    : config.provider === "moneyclaw"
      ? `MoneyClaw via ${config.moneyClawEnvName}`
      : config.provider === "x402"
        ? "x402 wallet payments"
        : "manual wallet accounting";
  return [
    `Payment mode: ${provider}.`,
    `Network: ${config.network}; token: ${config.tokenSymbol}; wallet: ${config.walletAddress || "not yet connected"}.`,
    `Spend cap: $${config.maxPaymentUsd.toFixed(2)} per payment; require approval over $${config.approvalRequiredOverUsd.toFixed(2)}.`,
    `Autopay is ${config.autoPayEnabled ? "enabled within caps" : "disabled; ask before spending"}.`,
    `Survival tier: ${snapshot.tier}; effective balance $${snapshot.effectiveBalanceUsd.toFixed(2)}; compute burn $${config.dailyComputeBurnUsd.toFixed(2)}/day.`,
    `Use ${snapshot.modelHint} model behavior and ${snapshot.heartbeatHint} heartbeat behavior.`,
    "Never expose private keys, card PAN/CVV, or billing identity in chat or durable shared notes.",
  ].join("\n");
}
