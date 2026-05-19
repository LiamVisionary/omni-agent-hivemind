export type AgentPaymentProvider = "manual" | "clawcard" | "moneyclaw" | "x402";

export type AgentSurvivalTier = "dead" | "critical" | "low_compute" | "normal" | "high";

export interface AgentWalletConfig {
  agentId: string;
  enabled: boolean;
  provider: AgentPaymentProvider;
  walletAddress: string;
  network: string;
  tokenSymbol: string;
  seedBalanceUsd: number;
  currentBalanceUsd: number;
  dailyComputeBurnUsd: number;
  maxPaymentUsd: number;
  approvalRequiredOverUsd: number;
  autoPayEnabled: boolean;
  clawCardEnvName: string;
  moneyClawEnvName: string;
  x402BaseUrl: string;
  survivalStartedAt: number;
  updatedAt: number;
  notes: string;
}

export interface AgentSurvivalSnapshot {
  tier: AgentSurvivalTier;
  effectiveBalanceUsd: number;
  daysRemaining: number | null;
  hoursRemaining: number | null;
  canRunInference: boolean;
  modelHint: "frontier" | "cheap" | "minimal" | "stopped";
  heartbeatHint: "fast" | "normal" | "slow" | "emergency" | "stopped";
  statusCopy: string;
}

export interface X402PaymentRequirement {
  network: string;
  scheme: string;
  amount?: string | number | bigint;
  maxAmountRequired?: string | number | bigint;
  asset?: string;
  description?: string;
}
