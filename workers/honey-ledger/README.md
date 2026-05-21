# HivemindOS Honey Ledger Worker

Cloudflare Worker + D1 ledger for official signed Honey usage receipts.

The Worker stores only privacy-safe metadata:

- anonymous workspace id
- agent id
- token count
- runtime/model label
- event id
- timestamp
- HMAC signature from a trusted HivemindOS runtime

It never receives prompts, responses, vault paths, local file paths, machine names, Tailnet IPs, or wallet secrets.

## Free-tier setup

```bash
cd workers/honey-ledger
pnpm install
pnpm d1:create
```

Copy the returned `database_id` into `wrangler.toml`, then run:

```bash
pnpm d1:migrate:remote
pnpm wrangler secret put HONEY_LEDGER_SECRET
pnpm deploy
```

For local testing:

```bash
pnpm d1:migrate:local
pnpm dev
```

## App environment

The official ledger URL is safe for open-source clones to read:

```bash
HONEY_LEDGER_REMOTE_URL="https://hivemindos-honey-ledger.hivemindos.workers.dev"
HONEY_LEDGER_ISSUER_ID="hivemindos"
```

Normal open-source clones do not receive these secrets. They can opt in to the official ledger UI, but official Honey requires usage receipts signed by a trusted HivemindOS runtime/server.

Trusted official HivemindOS servers/runtimes may set a signer secret:

```bash
HONEY_LEDGER_SIGNING_SECRET="<same value as HONEY_LEDGER_SECRET>"
```

Never commit private values. Editing frontend Honey values does not affect conversion, because `/exchange` converts only the Honey balance stored in the official Cloudflare D1 ledger.

Forks that point `HONEY_LEDGER_REMOTE_URL` at a different backend are using a different economy. Their Honey is not official HivemindOS Honey unless it is stored in the official ledger.
