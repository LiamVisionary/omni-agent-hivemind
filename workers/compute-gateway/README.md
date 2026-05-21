# HivemindOS Compute Gateway

Trusted compute path for official Honey rewards.

The cloned app can observe local runtime usage for capped lower-trust Honey. Spoof-proof Honey comes from reward compute mode: point Hermes, OpenClaw, or any OpenAI-compatible client at this Worker instead of the model provider. The runtime still receives normal OpenAI-compatible responses, while this Worker:

- calls the configured LLM provider server-side through Bankr/OpenRouter-compatible routing
- uses the caller's Bankr LLM key when provided, so their HIVE-funded Bankr credits pay for compute
- observes provider-returned token usage
- enforces a per-workspace daily token cap
- signs the Honey receipt with `HONEY_LEDGER_SECRET`
- submits it to the official Honey ledger

By default the public Worker does not use an operator Bankr key. Set `ALLOW_SHARED_BANKR_KEY=true` only for private/internal deployments.

## Reward compute setup

Use this worker as an OpenAI-compatible base URL:

```txt
OPENAI_BASE_URL=https://hivemindos-compute-gateway.hivemindos.workers.dev/v1
OPENAI_API_KEY=hive-v1.<workspace-id>.<bankr-llm-key>
```

The simple reward key format is:

```txt
hive-v1.<workspace-id>.<bankr-llm-key>
```

For per-agent accounting, use:

```txt
hive-v1.<workspace-id>.<agent-id>.<bankr-llm-key>
```

If a runtime supports custom headers, it may also send:

- `Authorization: Bearer <bankr-llm-key>`
- `X-Hivemind-Workspace-Id: <workspace-id>`
- `X-Hivemind-Agent-Id: <agent-id>`

The worker also supports:

- `POST /v1/chat/completions`
- `GET /v1/models`

Requests are forwarded to Bankr with `stream: false` so usage can be verified before the response is returned. If the client asks for streaming, the worker returns OpenAI-style SSE chunks after the verified upstream response is complete.

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
