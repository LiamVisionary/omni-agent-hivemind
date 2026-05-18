export const AGENT_PAYMENT_PROVIDER_COPY = {
  clawcard: {
    label: "ClawCard",
    summary: "Agent identity, inbox, phone number, virtual cards, Base wallet, and budgets.",
    setup: "Store CLAWCARD_API_KEY in the agent environment, allocate a small budget, then let the agent use CLI/API commands through its skill.",
  },
  moneyclaw: {
    label: "MoneyClaw",
    summary: "Prepaid buyer-side payment tasks with explicit approval and account inbox context.",
    setup: "Store MONEYCLAW_API_KEY, inspect account readiness, create bounded payment intents, and only continue approved payment steps.",
  },
  x402: {
    label: "x402",
    summary: "HTTP-native pay-per-call API/resource payments with wallet-selected requirements.",
    setup: "Configure a Base/Solana wallet and enforce network, scheme, and max-amount payment policies.",
  },
  manual: {
    label: "Manual ledger",
    summary: "Local survival accounting without an external payment rail connected yet.",
    setup: "Track seed balance, burn rate, and caps before connecting real credentials.",
  },
} as const;

// Adapted from elvismusli/moneyclaw: moneyclaw-skill/SKILL.md and docs/security-model.md.
export const PAYMENT_SAFETY_RULES = [
  "Use prepaid balances and bounded payment tasks by default.",
  "Confirm merchant domain, amount, and currency before any spending step.",
  "Require dashboard or human approval unless autopay is explicitly enabled within scope.",
  "Treat the payment task, not the card, as the auditable source of truth.",
  "Never fabricate billing identity, verification data, card details, or wallet balances.",
  "Inspect transaction state before retrying failed or ambiguous payment attempts.",
] as const;

export const SOVEREIGN_AGENT_LAUNCH_STEPS = [
  "Create or connect the agent profile.",
  "Choose a payment provider and store credentials outside shared notes.",
  "Seed a small USDC balance and keep ETH gas separate when using Base.",
  "Set max payment, approval threshold, and daily compute burn.",
  "Generate the agent payment prompt and add it to the runtime/system context.",
  "Run the agent in survival mode: earn, conserve, or stop when the ledger reaches zero.",
] as const;
