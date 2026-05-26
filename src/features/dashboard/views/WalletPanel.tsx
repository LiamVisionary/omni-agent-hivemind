"use client";

/* eslint-disable react-hooks/immutability, react-hooks/purity */

import type { ComponentType, Dispatch, ElementType, SetStateAction } from "react";
import Image from "next/image";
import type { AgentWalletCardProps } from "@/components/wallet/AgentWalletCard";
import type { AgentWalletCardCompactProps } from "@/components/wallet/AgentWalletCardCompact";
import type { AgentProfile } from "@/lib/types/agent-runtime";
import type { AgentPaymentProvider, AgentSurvivalSnapshot, AgentWalletConfig, HoneyAgentReward } from "@/lib/types/agent-wallet";
import type { DashboardView, RuntimeUsageAnalytics, WalletActionState, WalletMoneyClawStatus, WalletVaultBackupStatus } from "@/features/dashboard/dashboard-types";

type ClassNameBuilder = (...names: Array<string | false | null | undefined>) => string;

type WalletStats = {
  enabled: number;
  balance: number;
  critical: number;
};

type HoneyStats = {
  totalHoney: number;
  availableHoney: number;
  hiveBalance: number;
  hiveQuote: number;
  rewardPoolHive: number;
  rewardPoolRemainingHive: number;
  rewardPoolSharePercent: number;
  hivePerMillionTokens: number;
};

type PaymentProviderCopy = Record<AgentPaymentProvider, {
  label: string;
  summary: string;
  setup: string;
}>;

type IconComponent = ElementType<{
  "aria-hidden"?: boolean | "true" | "false";
  className?: string;
  height?: number;
  width?: number;
}>;

type WalletPanelProps = {
  AGENT_PAYMENT_PROVIDER_COPY: PaymentProviderCopy;
  AgentWalletCard: ComponentType<AgentWalletCardProps>;
  AgentWalletCardCompact: ComponentType<AgentWalletCardCompactProps>;
  Button: ElementType;
  ChevronLeft: IconComponent;
  Download: IconComponent;
  HandCoins: IconComponent;
  LoaderCircle: IconComponent;
  RUNTIME_LABELS: Record<string, string>;
  RefreshCcw: IconComponent;
  activeView: DashboardView;
  copyPaymentPrompt: (wallet: AgentWalletConfig) => void | Promise<void>;
  createDefaultAgentWallet: (agentId: string) => AgentWalletConfig;
  createLocalWallet: (agentId: string, network: string) => void | Promise<void>;
  displayAgents: AgentProfile[];
  enableHoneyLedger: () => void;
  exchangeAllHoneyForHive: () => void;
  exchangeHoneyForHive: (agentId: string) => void;
  formatHiveAmount: (amount: number) => string;
  formatRelativeTime: (timestamp: number) => string;
  getSurvivalSnapshot: (wallet: AgentWalletConfig) => AgentSurvivalSnapshot;
  honeyLedgerEnabled: boolean;
  honeyStats: HoneyStats;
  initializeCoreWalletRails: (agentId: string) => Promise<void>;
  moneyClawStatusByEnvName: Record<string, WalletMoneyClawStatus | null | undefined>;
  refreshRuntimeUsage: () => void | Promise<void>;
  refreshWalletBalance: (agentId: string) => void | Promise<void>;
  renderAgentKey: (agent: AgentProfile, index: number) => string;
  resetWalletBurnClock: (agentId: string) => void;
  runWalletVaultBackupAction: (action: "refresh" | "restore") => void | Promise<void>;
  runtimeUsage: RuntimeUsageAnalytics | null | undefined;
  runtimeUsageLoading: boolean;
  saveMoneyClawKey: (agentId: string, apiKey: string, options: { shareWithAllAgents: boolean }) => Promise<{ ok: boolean; error?: string }>;
  selectedAgent: AgentProfile | null;
  selectedHoneyReward: HoneyAgentReward | null;
  selectedWallet: AgentWalletConfig | null;
  selectedWalletSnapshot: AgentSurvivalSnapshot | null;
  sendWalletUsdc: (agentId: string) => void | Promise<void>;
  setSelectedAgentId: Dispatch<SetStateAction<string>>;
  setWalletExpanded: Dispatch<SetStateAction<boolean>>;
  setWalletPanelMode: Dispatch<SetStateAction<"wallets" | "usage">>;
  testX402Fetch: (agentId: string) => void | Promise<void>;
  updateWallet: (agentId: string, patch: Partial<AgentWalletConfig>) => void;
  updateWalletAction: (agentId: string, patch: WalletActionState) => void;
  vaultClass: ClassNameBuilder;
  walletActionsByAgent: Record<string, WalletActionState | undefined>;
  walletClass: ClassNameBuilder;
  walletExpanded: boolean;
  walletPanelMode: "wallets" | "usage";
  walletStats: WalletStats;
  walletVaultBackupBusy: boolean;
  walletVaultBackupMessage: string;
  walletVaultBackupStatus: WalletVaultBackupStatus | null | undefined;
  walletsByAgent: Record<string, AgentWalletConfig | undefined>;
};

export function WalletPanel(props: WalletPanelProps) {
  const { AGENT_PAYMENT_PROVIDER_COPY, AgentWalletCard, AgentWalletCardCompact, Button, ChevronLeft, Download, HandCoins, LoaderCircle, RUNTIME_LABELS, RefreshCcw, activeView, copyPaymentPrompt, createDefaultAgentWallet, createLocalWallet, displayAgents, enableHoneyLedger, exchangeAllHoneyForHive, exchangeHoneyForHive, formatHiveAmount, formatRelativeTime, getSurvivalSnapshot, honeyLedgerEnabled, honeyStats, initializeCoreWalletRails, moneyClawStatusByEnvName, refreshRuntimeUsage, refreshWalletBalance, renderAgentKey, resetWalletBurnClock, runWalletVaultBackupAction, runtimeUsage, runtimeUsageLoading, saveMoneyClawKey, selectedAgent, selectedHoneyReward, selectedWallet, selectedWalletSnapshot, sendWalletUsdc, setSelectedAgentId, setWalletExpanded, setWalletPanelMode, testX402Fetch, updateWallet, updateWalletAction, vaultClass, walletActionsByAgent, walletClass, walletExpanded, walletPanelMode, walletStats, walletVaultBackupBusy, walletVaultBackupMessage, walletVaultBackupStatus, walletsByAgent } = props;
  return (<>
      {activeView === "wallet" ? (
      <section className={walletClass("walletPanel", "tabPanel")}>
        <div className={walletClass("walletHeader")}>
          <div>
            <p className="eyebrow">Spending safety</p>
            <h2>Wallets</h2>
            <p>
              Manage payment rails by default, with runtime usage one click away when you need the bill of materials.
            </p>
          </div>
          <div className={walletClass("walletTotals")} aria-label="Wallet summary">
            <span>
              Can spend
              <strong>{walletStats.enabled}</strong>
            </span>
            <span>
              Available
              <strong>${walletStats.balance.toFixed(2)}</strong>
            </span>
            <span>
              Need funding
              <strong>{walletStats.critical}</strong>
            </span>
          </div>
        </div>

        <div className={walletClass("walletSegmented")} role="tablist" aria-label="Wallet panel mode">
          {[
            ["wallets", "Wallets"],
            ["usage", "Usage"],
          ].map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              role="tab"
              aria-selected={walletPanelMode === mode}
              className={walletClass("walletSegment", walletPanelMode === mode && "walletSegmentActive")}
              onClick={() => setWalletPanelMode(mode as "wallets" | "usage")}
            >
              {label}
            </button>
          ))}
        </div>

        {walletPanelMode === "usage" ? (
        <section className={walletClass("usagePanel")}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Runtime analytics</p>
              <h3 className="m-0 text-base font-bold">Token usage</h3>
            </div>
            <Button type="button" size="sm" variant="secondary" onClick={() => void refreshRuntimeUsage()} disabled={runtimeUsageLoading}>
              {runtimeUsageLoading ? <LoaderCircle aria-hidden="true" className={vaultClass("spinIcon")} /> : <RefreshCcw aria-hidden="true" />}
              Refresh
            </Button>
          </div>
          {runtimeUsage?.error ? <p className="m-0 text-xs text-[#fecdd3]">{runtimeUsage.error}</p> : null}
          <div className="grid gap-3 md:grid-cols-4">
            {[
              ["Sessions", runtimeUsage?.totals?.sessions?.toLocaleString() ?? "0"],
              ["Tokens", runtimeUsage?.totals?.tokens?.toLocaleString() ?? "0"],
              ["Output", runtimeUsage?.totals?.outputTokens?.toLocaleString() ?? "0"],
              ["Est. cost", `$${(runtimeUsage?.totals?.estimatedCostUsd ?? 0).toFixed(4)}`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border border-[rgba(148,163,184,0.12)] bg-[rgba(15,23,42,0.55)] p-3">
                <span className="block font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">{label}</span>
                <strong className="mt-1 block text-xl">{value}</strong>
              </div>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <strong className="text-sm">Models</strong>
              <div className="mt-2 grid gap-2">
                {(runtimeUsage?.models ?? []).slice(0, 6).map((model) => (
                  <div key={model.model} className="flex items-center justify-between gap-3 rounded-md border border-[rgba(148,163,184,0.10)] px-3 py-2 text-xs">
                    <span className="min-w-0 break-words">{model.model}</span>
                    <b>{model.tokens.toLocaleString()}</b>
                  </div>
                ))}
                {runtimeUsage?.models?.length ? null : <p className="m-0 text-xs text-[var(--muted)]">No token rows found yet.</p>}
              </div>
            </div>
            <div>
              <strong className="text-sm">Recent sessions</strong>
              <div className="mt-2 grid gap-2">
                {(runtimeUsage?.rows ?? []).slice(0, 6).map((row) => (
                  <div key={`${row.runtime}-${row.sessionId}`} className="grid gap-1 rounded-md border border-[rgba(148,163,184,0.10)] px-3 py-2 text-xs">
                    <span className="font-semibold">{RUNTIME_LABELS[row.runtime]} · {row.model}</span>
                    <span className="text-[var(--muted)]">{row.totalTokens.toLocaleString()} tokens · {formatRelativeTime(Date.parse(row.updatedAt))}</span>
                  </div>
                ))}
                {runtimeUsage?.rows?.length ? null : <p className="m-0 text-xs text-[var(--muted)]">Hermes/OpenClaw usage appears here when local counters are readable.</p>}
              </div>
            </div>
          </div>
        </section>
        ) : null}

        {walletPanelMode === "wallets" ? (
        <div className={walletClass("walletWorkspace")}>
          {walletExpanded && selectedAgent && selectedWallet && selectedWalletSnapshot ? (
            (() => {
              const walletAction = walletActionsByAgent[selectedAgent.id] ?? {};
              const moneyClawEnvName = selectedWallet.moneyClawEnvName?.trim() || "MONEYCLAW_API_KEY";
              return (
            <div className={walletClass("walletDetail")}>
              <button
                type="button"
                className={walletClass("walletBackBtn")}
                onClick={() => setWalletExpanded(false)}
              >
                <ChevronLeft aria-hidden="true" width={16} height={16} />
                All wallets
              </button>
              <AgentWalletCard
                agentName={selectedAgent.name}
                machineName={selectedAgent.machineName}
                wallet={selectedWallet}
                survival={selectedWalletSnapshot}
                honeyReward={selectedHoneyReward}
                honeyLedgerEnabled={honeyLedgerEnabled}
                providerCopy={AGENT_PAYMENT_PROVIDER_COPY[selectedWallet.provider]}
                providerOptions={Object.entries(AGENT_PAYMENT_PROVIDER_COPY) as Array<[AgentPaymentProvider, typeof AGENT_PAYMENT_PROVIDER_COPY[AgentPaymentProvider]]>}
                moneyClawStatus={moneyClawStatusByEnvName[moneyClawEnvName] ?? null}
                walletAction={walletAction}
                onUpdateWallet={(patch) => updateWallet(selectedAgent.id, patch)}
                onUpdateAction={(patch) => updateWalletAction(selectedAgent.id, patch)}
                onSaveMoneyClawKey={(apiKey, options) => saveMoneyClawKey(selectedAgent.id, apiKey, options)}
                onResetRunway={() => resetWalletBurnClock(selectedAgent.id)}
                onCopyPaymentPrompt={() => copyPaymentPrompt(selectedWallet)}
                onCreateLocalWallet={() => createLocalWallet(selectedAgent.id, selectedWallet.network)}
                onRefreshBalance={() => refreshWalletBalance(selectedAgent.id)}
                onSendUsdc={() => sendWalletUsdc(selectedAgent.id)}
                onCallX402={() => testX402Fetch(selectedAgent.id)}
                onExchangeHoney={() => exchangeHoneyForHive(selectedAgent.id)}
              />
            </div>
              );
            })()
          ) : displayAgents.length > 0 ? (
            <div className={walletClass("walletGridList")} role="list" aria-label="Agent wallets">
              {displayAgents.map((agent, agentIndex) => {
                const wallet = walletsByAgent[agent.id] ?? createDefaultAgentWallet(agent.id);
                const snapshot = getSurvivalSnapshot(wallet);
                return (
                  <div role="listitem" key={renderAgentKey(agent, agentIndex)}>
                    <AgentWalletCardCompact
                      agentName={agent.name}
                      wallet={wallet}
                      survival={snapshot}
                      onOpen={() => {
                        setSelectedAgentId(agent.id);
                        setWalletExpanded(true);
                      }}
                      onInitialize={async () => {
                        setSelectedAgentId(agent.id);
                        await initializeCoreWalletRails(agent.id);
                      }}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={walletClass("walletEmpty")}>
              <strong>No agents yet</strong>
              <p>Connect an agent first, then configure its spending limits and survival rails.</p>
            </div>
          )}

          <aside className={walletClass("hiveRail", !honeyLedgerEnabled && "hiveRailDormant")} aria-label="Hive ledger">
            <header className={walletClass("hiveRailHeader")}>
              <div>
                <p className="eyebrow">Hive ledger</p>
                <h3>{honeyLedgerEnabled ? "Honey rewards" : "Honey rewards off"}</h3>
              </div>
              <Image
                className={walletClass("hiveRailPot")}
                src="/icons/generated/honey-pot.png"
                alt=""
                width={96}
                height={96}
                aria-hidden="true"
                priority
                unoptimized
              />
            </header>

            {honeyLedgerEnabled ? (
              <>
                <dl className={walletClass("hiveRailStats")}>
                  <div>
                    <dt>Total Honey</dt>
                    <dd>{formatHiveAmount(honeyStats.totalHoney)}</dd>
                  </div>
                  <div>
                    <dt>Available</dt>
                    <dd>{formatHiveAmount(honeyStats.availableHoney)}</dd>
                  </div>
                  <div>
                    <dt>HIVE held</dt>
                    <dd>{formatHiveAmount(honeyStats.hiveBalance)}</dd>
                  </div>
                </dl>

                <Button
                  type="button"
                  size="sm"
                  className={walletClass("hiveRailConvert")}
                  disabled={honeyStats.availableHoney <= 0}
                  onClick={exchangeAllHoneyForHive}
                  aria-label={`Convert ${formatHiveAmount(honeyStats.availableHoney)} Honey to ${formatHiveAmount(honeyStats.hiveQuote)} HIVE`}
                >
                  <Image
                    className={walletClass("hiveRailConvertIcon")}
                    src="/icons/generated/honey-hive-icon.png"
                    alt=""
                    width={30}
                    height={30}
                    aria-hidden="true"
                    priority
                    unoptimized
                  />
                  <span>
                    <span>Convert {formatHiveAmount(honeyStats.availableHoney)} Honey</span>
                    <span>→ {formatHiveAmount(honeyStats.hiveQuote)} HIVE</span>
                  </span>
                </Button>

                <details className={walletClass("hiveRailDetails")}>
                  <summary>Reward pool</summary>
                  <dl>
                    <div>
                      <dt>Pool size</dt>
                      <dd>
                        {formatHiveAmount(honeyStats.rewardPoolHive)} HIVE
                        <small>{formatHiveAmount(honeyStats.rewardPoolRemainingHive)} unissued</small>
                      </dd>
                    </div>
                    <div>
                      <dt>Pool source</dt>
                      <dd>
                        {honeyStats.rewardPoolSharePercent.toFixed(4)}%
                        <small>of HIVE volume</small>
                      </dd>
                    </div>
                    <div>
                      <dt>Rate</dt>
                      <dd>
                        {formatHiveAmount(honeyStats.hivePerMillionTokens)}
                        <small>HIVE per 1M tokens</small>
                      </dd>
                    </div>
                  </dl>
                </details>
              </>
            ) : (
              <>
                <p className={walletClass("hiveRailBlurb")}>
                  Watch supported local runtimes for real token usage, earn Honey, then convert to HIVE.
                </p>
                <Button type="button" size="sm" onClick={enableHoneyLedger}>
                  <HandCoins aria-hidden="true" />
                  Enable Honey ledger
                </Button>
                <details className={walletClass("hiveRailDetails")}>
                  <summary>What gets sent?</summary>
                  <p>
                    Agent id, workspace id, token count, model label, source, event id, and timestamp.
                    Prompts, responses, files, wallet keys, and machine details are not sent.
                    Hermes CLI usage is read from Hermes' own token counters while the dashboard is running.
                  </p>
                </details>
              </>
            )}

            <details className={walletClass("hiveRailDetails")}>
              <summary>Encrypted wallet vault</summary>
              <dl>
                <div>
                  <dt>Local vault</dt>
                  <dd>
                    {walletVaultBackupStatus?.vaultExists ? `${walletVaultBackupStatus.recordCount} record${walletVaultBackupStatus.recordCount === 1 ? "" : "s"}` : "Not created"}
                    <small>{walletVaultBackupStatus?.envKeyConfigured ? "env key" : walletVaultBackupStatus?.keyExists ? "file key" : "no key"}</small>
                  </dd>
                </div>
                <div>
                  <dt>Shared vault</dt>
                  <dd>
                    {walletVaultBackupStatus?.backupExists ? "Ready" : "Missing"}
                    <small>{walletVaultBackupStatus?.updatedAt ? formatRelativeTime(Date.parse(walletVaultBackupStatus.updatedAt)) : "not refreshed"}</small>
                  </dd>
                </div>
                <div>
                  <dt>GPG</dt>
                  <dd>
                    {walletVaultBackupStatus?.gpgAvailable ? "Available" : "Missing"}
                    <small>{walletVaultBackupStatus?.recipientConfigured ? "recipient ready" : "recipient missing"}</small>
                  </dd>
                </div>
              </dl>
              <div className={walletClass("walletVaultActions")}>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={Boolean(walletVaultBackupBusy) || !walletVaultBackupStatus?.vaultExists || !walletVaultBackupStatus?.gpgAvailable || !walletVaultBackupStatus?.recipientConfigured}
                  onClick={() => runWalletVaultBackupAction("refresh")}
                >
                  <RefreshCcw aria-hidden="true" />
                  Sync
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={Boolean(walletVaultBackupBusy) || !walletVaultBackupStatus?.backupExists || !walletVaultBackupStatus?.gpgAvailable}
                  onClick={() => runWalletVaultBackupAction("restore")}
                >
                  <Download aria-hidden="true" />
                  Restore
                </Button>
              </div>
              {walletVaultBackupMessage ? <p>{walletVaultBackupMessage}</p> : null}
            </details>

          </aside>
        </div>
        ) : null}
      </section>
      ) : null}

  </>);
}
