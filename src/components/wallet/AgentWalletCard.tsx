"use client";

import { useState } from "react";
import {
  ArrowUpRight,
  Copy,
  HandCoins,
  Power,
  QrCode,
  RefreshCcw,
  Send,
  SlidersHorizontal,
  WalletCards,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type {
  AgentPaymentProvider,
  AgentSurvivalSnapshot,
  AgentWalletConfig,
  HoneyAgentReward,
} from "@/lib/types/agent-wallet";
import { cn } from "@/lib/utils/cn";

import styles from "./AgentWalletCard.module.css";

type WalletActionState = {
  busy?: boolean;
  sendTo?: string;
  sendAmount?: string;
  confirmation?: string;
  x402Url?: string;
  x402Method?: string;
  x402Confirmation?: string;
  message?: string;
  error?: string;
};

type ProviderCopy = { label: string; summary: string; setup: string };

type Props = {
  agentName: string;
  machineName?: string;
  wallet: AgentWalletConfig;
  survival: AgentSurvivalSnapshot;
  honeyReward: HoneyAgentReward | null;
  honeyLedgerEnabled: boolean;
  providerCopy: ProviderCopy;
  providerOptions: Array<[AgentPaymentProvider, ProviderCopy]>;
  walletAction: WalletActionState;
  onUpdateWallet: (patch: Partial<AgentWalletConfig>) => void;
  onUpdateAction: (patch: WalletActionState) => void;
  onResetRunway: () => void;
  onCopyPaymentPrompt: () => void;
  onCreateLocalWallet: () => void;
  onRefreshBalance: () => void;
  onSendUsdc: () => void;
  onCallX402: () => void;
  onExchangeHoney: () => void;
};

type Sheet = "send" | "receive" | "limits" | null;

function networkLabel(network: string) {
  switch (network) {
    case "eip155:8453":
      return "Base mainnet";
    case "eip155:84532":
      return "Base Sepolia";
    case "solana:mainnet":
      return "Solana mainnet";
    case "solana:devnet":
      return "Solana devnet";
    default:
      return network;
  }
}

function formatMoney(value: number): string {
  return `$${Math.max(0, value).toFixed(2)}`;
}

function formatNumber(value: number, fractionDigits = 2): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  });
}

function shortenAddress(address: string): string {
  if (address.length <= 14) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function AgentWalletCard({
  agentName,
  machineName,
  wallet,
  survival,
  honeyReward,
  honeyLedgerEnabled,
  providerCopy,
  providerOptions,
  walletAction,
  onUpdateWallet,
  onUpdateAction,
  onResetRunway,
  onCopyPaymentPrompt,
  onCreateLocalWallet,
  onRefreshBalance,
  onSendUsdc,
  onCallX402,
  onExchangeHoney,
}: Props) {
  const [sheet, setSheet] = useState<Sheet>(null);

  const tier = wallet.enabled ? survival.tier : "off";
  const safeBalance = Math.max(0, survival.effectiveBalanceUsd);
  const isOff = !wallet.enabled;
  const isCritical = wallet.enabled && (survival.tier === "critical" || survival.tier === "dead");
  const isLow = wallet.enabled && survival.tier === "low_compute";

  const runwayChip: { tone: "ok" | "warn" | "danger" | "muted"; text: string } = isOff
    ? { tone: "muted", text: "Wallet off" }
    : survival.daysRemaining == null
      ? { tone: "muted", text: "No runway estimate" }
      : isCritical
        ? { tone: "danger", text: `${survival.daysRemaining.toFixed(1)} days left` }
        : isLow
          ? { tone: "warn", text: `${survival.daysRemaining.toFixed(1)} days left` }
          : { tone: "ok", text: `${survival.daysRemaining.toFixed(1)} days runway` };

  const toggleSheet = (next: Sheet) => setSheet((current) => (current === next ? null : next));

  const handleCopyAddress = async () => {
    if (!wallet.walletAddress) return;
    try {
      await navigator.clipboard.writeText(wallet.walletAddress);
    } catch {
      /* ignore — clipboard may be unavailable */
    }
  };

  return (
    <article className={styles.card} data-tier={tier} aria-label={`${agentName} wallet`}>
      <div className={styles.topbar}>
        <div className={styles.identity}>
          <div className={styles.agentLine}>
            <span className={styles.agentDot} aria-hidden="true" />
            <strong className={styles.agentName}>{agentName}</strong>
          </div>
          <span className={styles.network}>
            {networkLabel(wallet.network)} · {wallet.tokenSymbol || "USDC"}
            {machineName ? ` · ${machineName}` : ""}
          </span>
        </div>
        <button
          type="button"
          className={styles.powerToggle}
          data-on={wallet.enabled}
          onClick={() => onUpdateWallet({ enabled: !wallet.enabled })}
          aria-label={wallet.enabled ? "Turn wallet off" : "Turn wallet on"}
        >
          <Power aria-hidden="true" />
          {wallet.enabled ? "On" : "Off"}
        </button>
      </div>

      <div className={styles.hero}>
        <div className={styles.heroBalance}>{formatMoney(safeBalance)}</div>
        <div className={styles.heroMeta}>
          <span className={styles.heroChip} data-tone={runwayChip.tone}>
            {runwayChip.text}
          </span>
        </div>
      </div>

      <div className={styles.actionRow}>
        <button
          type="button"
          className={styles.actionBtn}
          data-active={sheet === "send"}
          disabled={isOff}
          onClick={() => toggleSheet("send")}
        >
          <ArrowUpRight aria-hidden="true" />
          <span>Send</span>
        </button>
        <button
          type="button"
          className={styles.actionBtn}
          data-active={sheet === "receive"}
          onClick={() => toggleSheet("receive")}
        >
          <QrCode aria-hidden="true" />
          <span>Receive</span>
        </button>
        <button
          type="button"
          className={styles.actionBtn}
          data-active={sheet === "limits"}
          onClick={() => toggleSheet("limits")}
        >
          <SlidersHorizontal aria-hidden="true" />
          <span>Limits</span>
        </button>
        <button
          type="button"
          className={styles.actionBtn}
          data-tone={wallet.autoPayEnabled ? "danger" : undefined}
          onClick={() => onUpdateWallet({ autoPayEnabled: !wallet.autoPayEnabled })}
        >
          <HandCoins aria-hidden="true" />
          <span>{wallet.autoPayEnabled ? "Auto on" : "Autopay"}</span>
        </button>
      </div>

      {sheet === "send" ? (
        <div className={styles.sheet}>
          <div className={styles.sheetTitle}>
            Send {wallet.tokenSymbol || "USDC"}
            <button type="button" onClick={() => setSheet(null)}>Close</button>
          </div>
          <p className={styles.sheetHelp}>
            Hard cap per payment: {formatMoney(wallet.maxPaymentUsd)}. Type SEND_USDC to confirm if asked.
          </p>
          <div className={styles.sheetField}>
            <label htmlFor="wallet-send-to">Recipient address</label>
            <input
              id="wallet-send-to"
              value={walletAction.sendTo ?? ""}
              onChange={(event) => onUpdateAction({ sendTo: event.target.value })}
              placeholder="0x… or Solana address"
            />
          </div>
          <div className={styles.sheetGrid}>
            <div className={styles.sheetField}>
              <label htmlFor="wallet-send-amount">Amount</label>
              <input
                id="wallet-send-amount"
                value={walletAction.sendAmount ?? ""}
                onChange={(event) => onUpdateAction({ sendAmount: event.target.value })}
                placeholder={`Max ${formatMoney(wallet.maxPaymentUsd)}`}
              />
            </div>
            <div className={styles.sheetField}>
              <label htmlFor="wallet-send-confirm">Confirm</label>
              <input
                id="wallet-send-confirm"
                value={walletAction.confirmation ?? ""}
                onChange={(event) => onUpdateAction({ confirmation: event.target.value })}
                placeholder="SEND_USDC"
              />
            </div>
          </div>
          <div className={styles.sheetButtons}>
            <Button type="button" size="sm" variant="danger" disabled={walletAction.busy} onClick={onSendUsdc}>
              <Send aria-hidden="true" />
              Send
            </Button>
          </div>
          {walletAction.message ? <p className={styles.sheetStatus} data-tone="ok">{walletAction.message}</p> : null}
          {walletAction.error ? <p className={styles.sheetStatus} data-tone="error">{walletAction.error}</p> : null}
        </div>
      ) : null}

      {sheet === "receive" ? (
        <div className={styles.sheet}>
          <div className={styles.sheetTitle}>
            Receive {wallet.tokenSymbol || "USDC"}
            <button type="button" onClick={() => setSheet(null)}>Close</button>
          </div>
          {wallet.walletAddress ? (
            <>
              <p className={styles.sheetHelp}>
                Send {wallet.tokenSymbol || "USDC"} on {networkLabel(wallet.network)} to this address.
              </p>
              <div className={styles.sheetAddress}>
                <strong>Deposit address</strong>
                {wallet.walletAddress}
              </div>
              <button type="button" className={styles.sheetCopy} onClick={handleCopyAddress}>
                <Copy aria-hidden="true" width={14} height={14} />
                Copy address
              </button>
              <div className={styles.sheetButtons}>
                <Button type="button" size="sm" variant="secondary" disabled={walletAction.busy} onClick={onRefreshBalance}>
                  <RefreshCcw aria-hidden="true" />
                  Refresh balance
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className={styles.sheetHelp}>
                No deposit address yet. Create a local throwaway wallet, then top it up with a small test amount.
              </p>
              <div className={styles.sheetButtons}>
                <Button type="button" size="sm" variant="secondary" disabled={walletAction.busy} onClick={onCreateLocalWallet}>
                  <WalletCards aria-hidden="true" />
                  Create wallet
                </Button>
              </div>
            </>
          )}
          {walletAction.message ? <p className={styles.sheetStatus} data-tone="ok">{walletAction.message}</p> : null}
          {walletAction.error ? <p className={styles.sheetStatus} data-tone="error">{walletAction.error}</p> : null}
        </div>
      ) : null}

      {sheet === "limits" ? (
        <div className={styles.sheet}>
          <div className={styles.sheetTitle}>
            Spending limits
            <button type="button" onClick={() => setSheet(null)}>Close</button>
          </div>
          <p className={styles.sheetHelp}>The only numbers most users need to set.</p>
          <div className={styles.sheetGrid}>
            <div className={styles.sheetField}>
              <label htmlFor="wallet-limit-balance">Current balance</label>
              <input
                id="wallet-limit-balance"
                type="number"
                min="0"
                step="0.01"
                value={wallet.currentBalanceUsd}
                onChange={(event) => onUpdateWallet({ currentBalanceUsd: Number(event.target.value) || 0 })}
              />
            </div>
            <div className={styles.sheetField}>
              <label htmlFor="wallet-limit-approve">Ask me over</label>
              <input
                id="wallet-limit-approve"
                type="number"
                min="0"
                step="0.01"
                value={wallet.approvalRequiredOverUsd}
                onChange={(event) => onUpdateWallet({ approvalRequiredOverUsd: Number(event.target.value) || 0 })}
              />
            </div>
            <div className={styles.sheetField}>
              <label htmlFor="wallet-limit-max">Max per payment</label>
              <input
                id="wallet-limit-max"
                type="number"
                min="0"
                step="0.01"
                value={wallet.maxPaymentUsd}
                onChange={(event) => onUpdateWallet({ maxPaymentUsd: Number(event.target.value) || 0 })}
              />
            </div>
            <div className={styles.sheetField}>
              <label htmlFor="wallet-limit-burn">Daily running cost</label>
              <input
                id="wallet-limit-burn"
                type="number"
                min="0"
                step="0.01"
                value={wallet.dailyComputeBurnUsd}
                onChange={(event) => onUpdateWallet({ dailyComputeBurnUsd: Number(event.target.value) || 0 })}
              />
            </div>
          </div>
          <div className={styles.sheetButtons}>
            <Button type="button" size="sm" variant="secondary" onClick={onResetRunway}>
              <RefreshCcw aria-hidden="true" />
              Reset runway clock
            </Button>
          </div>
        </div>
      ) : null}

      {isOff ? (
        <div className={styles.banner} data-tone="off">
          <Power aria-hidden="true" />
          <div>
            <strong>Wallet is off</strong>
            This agent cannot spend yet. Use the Power button when you&apos;re ready.
          </div>
        </div>
      ) : isCritical ? (
        <div className={styles.banner} data-tone="danger">
          <ArrowUpRight aria-hidden="true" />
          <div>
            <strong>Needs funding</strong>
            Top up the wallet before this agent runs out of runway.
          </div>
        </div>
      ) : null}

      <div className={styles.holdings}>
        <div className={styles.holdingsHeader}>
          <strong>Holdings</strong>
          <small>{providerCopy.label}</small>
        </div>

        <div className={styles.token}>
          <span className={styles.tokenIcon} data-token="usdc">{(wallet.tokenSymbol || "USDC").slice(0, 1)}</span>
          <div className={styles.tokenBody}>
            <span className={styles.tokenName}>{wallet.tokenSymbol || "USDC"}</span>
            <span className={styles.tokenSub}>{networkLabel(wallet.network)}</span>
          </div>
          <div className={styles.tokenAmount}>
            <strong>{formatMoney(safeBalance)}</strong>
            <small>safe to spend</small>
          </div>
        </div>

        {wallet.nativeBalance != null ? (
          <div className={styles.token}>
            <span className={styles.tokenIcon} data-token="gas">⛽</span>
            <div className={styles.tokenBody}>
              <span className={styles.tokenName}>Gas</span>
              <span className={styles.tokenSub}>Native balance</span>
            </div>
            <div className={styles.tokenAmount}>
              <strong>{formatNumber(wallet.nativeBalance, 6)}</strong>
            </div>
          </div>
        ) : null}

        <div className={styles.token}>
          <span className={styles.tokenIcon} data-token="honey">🐝</span>
          <div className={styles.tokenBody}>
            <span className={styles.tokenName}>Honey</span>
            <span className={styles.tokenSub}>
              {honeyLedgerEnabled
                ? `${formatNumber(honeyReward?.honeyAvailable ?? 0, 1)} available · ${(honeyReward?.tokensUsed ?? 0).toLocaleString()} tokens used`
                : "Hive ledger off"}
            </span>
          </div>
          <button
            type="button"
            className={cn(styles.tokenAction)}
            disabled={!honeyLedgerEnabled || !honeyReward || honeyReward.honeyAvailable <= 0}
            onClick={onExchangeHoney}
          >
            Exchange
          </button>
        </div>

        <div className={styles.token}>
          <span className={styles.tokenIcon} data-token="hive">◆</span>
          <div className={styles.tokenBody}>
            <span className={styles.tokenName}>HIVE</span>
            <span className={styles.tokenSub}>Reward token</span>
          </div>
          <div className={styles.tokenAmount}>
            <strong>{formatNumber(honeyReward?.hiveBalance ?? 0, 2)}</strong>
          </div>
        </div>
      </div>

      <details className={styles.advanced}>
        <summary>Advanced setup</summary>
        <div className={styles.advancedBody}>
          <div className={styles.sheetField}>
            <label htmlFor="wallet-provider">Payment method</label>
            <select
              id="wallet-provider"
              value={wallet.provider}
              onChange={(event) => onUpdateWallet({ provider: event.target.value as AgentPaymentProvider })}
            >
              {providerOptions.map(([provider, copy]) => (
                <option key={provider} value={provider}>{copy.label}</option>
              ))}
            </select>
            <p className={styles.sheetHelp}>{providerCopy.summary}</p>
          </div>

          <div className={styles.sheetField}>
            <label htmlFor="wallet-address">Wallet address</label>
            <input
              id="wallet-address"
              value={wallet.walletAddress}
              onChange={(event) => onUpdateWallet({ walletAddress: event.target.value })}
              placeholder="0x… or Solana address"
            />
            {wallet.walletAddress ? (
              <p className={styles.sheetHelp}>Deposit: {shortenAddress(wallet.walletAddress)}</p>
            ) : null}
          </div>

          <div className={styles.sheetGrid}>
            <div className={styles.sheetField}>
              <label htmlFor="wallet-network">Network</label>
              <select
                id="wallet-network"
                value={wallet.network}
                onChange={(event) => onUpdateWallet({ network: event.target.value })}
              >
                <option value="eip155:8453">Base mainnet</option>
                <option value="eip155:84532">Base Sepolia</option>
                <option value="solana:mainnet">Solana mainnet</option>
                <option value="solana:devnet">Solana devnet</option>
              </select>
            </div>
            <div className={styles.sheetField}>
              <label htmlFor="wallet-token">Token</label>
              <input
                id="wallet-token"
                value={wallet.tokenSymbol}
                onChange={(event) => onUpdateWallet({ tokenSymbol: event.target.value.toUpperCase() })}
              />
            </div>
          </div>

          <div className={styles.sheetField}>
            <label htmlFor="wallet-x402">x402 base URL</label>
            <input
              id="wallet-x402"
              value={wallet.x402BaseUrl}
              onChange={(event) => onUpdateWallet({ x402BaseUrl: event.target.value })}
              placeholder="https://paid-api.example.com"
            />
          </div>

          <div className={styles.sheetField}>
            <label htmlFor="wallet-clawcard">ClawCard env name</label>
            <input
              id="wallet-clawcard"
              value={wallet.clawCardEnvName}
              onChange={(event) => onUpdateWallet({ clawCardEnvName: event.target.value })}
            />
          </div>

          <div className={styles.sheetField}>
            <label htmlFor="wallet-notes">Private setup notes</label>
            <textarea
              id="wallet-notes"
              value={wallet.notes}
              onChange={(event) => onUpdateWallet({ notes: event.target.value })}
              placeholder="Provider dashboard URL, deposit memo, funding policy…"
              rows={3}
            />
          </div>

          <div className={styles.sheetButtons}>
            <Button type="button" size="sm" variant="secondary" onClick={onCopyPaymentPrompt}>
              <Copy aria-hidden="true" />
              Copy agent prompt
            </Button>
            <Button type="button" size="sm" variant="secondary" disabled={walletAction.busy} onClick={onCallX402}>
              <Send aria-hidden="true" />
              Test x402
            </Button>
          </div>
          <p className={styles.sheetStatus} data-tone="muted">{providerCopy.setup}</p>
        </div>
      </details>
    </article>
  );
}
