# HivemindOS Compute Gateway

Trusted compute path for official Honey rewards.

The cloned app never reports token usage directly to the Honey ledger. When a user opts into Honey rewards, reward-eligible agent calls route through this Worker. The Worker:

- calls the configured LLM provider server-side
- observes or estimates token usage
- enforces a per-workspace daily token cap
- signs the Honey receipt with `HONEY_LEDGER_SECRET`
- submits it to the official Honey ledger

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
