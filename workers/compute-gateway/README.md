# HivemindOS Compute Gateway

Trusted compute path for official Honey rewards.

The cloned app never reports token usage directly to the Honey ledger. When a user opts into Honey rewards, reward-eligible agent calls route through this Worker. The Worker:

- calls the configured LLM provider server-side
- uses the caller's Bankr LLM key when provided, so their HIVE-funded Bankr credits pay for compute
- observes or estimates token usage
- enforces a per-workspace daily token cap
- signs the Honey receipt with `HONEY_LEDGER_SECRET`
- submits it to the official Honey ledger

By default the public Worker does not use an operator Bankr key. Set `ALLOW_SHARED_BANKR_KEY=true` only for private/internal deployments.

## Deploy

```bash
cd workers/compute-gateway
pnpm install
pnpm d1:create
```

Copy the returned `database_id` into `wrangler.toml`, then:

```bash
pnpm d1:migrate:remote
pnpm wrangler secret put BANKR_LLM_KEY
pnpm wrangler secret put HONEY_LEDGER_SECRET
pnpm deploy
```

`BANKR_MANAGEMENT_KEY` can be used instead of `BANKR_LLM_KEY` if that key has Bankr LLM Gateway access.
