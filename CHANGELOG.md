# Changelog

This file records user-visible changes before they are committed. New work should
be added here first, then marked `Committed` or `Pushed` after the git action.

## 2026-05-27 15:38:13 WITA - Compact Button Styling

- Status: Pushed
- Areas changed: shared button component, fleet runtime setup styles, fleet roster add-agent affordance, changelog
- Summary: Make app buttons more compact and minimalist by reducing default button height/padding, replacing heavy filled primary styling with a subtler bordered accent treatment, and letting longer action labels wrap cleanly.
- Verification: `pnpm exec eslint src/features/dashboard/views/chat/AgentSettingsModal.tsx --max-warnings=999` passed with one existing unused-prop warning; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `git diff --check`.
- Intended commit message: `Compact shared button styling`

## 2026-05-27 15:39:05 WITA - Refine Runtime Setup Button Spacing

- Status: Pushed
- Areas changed: Agent settings runtime setup action styling, changelog
- Summary: Keep runtime setup action buttons compact while still allowing long labels to wrap inside the button instead of escaping or crowding adjacent copy.
- Verification: `pnpm exec eslint src/features/dashboard/views/chat/AgentSettingsModal.tsx --max-warnings=999` passed with one existing unused-prop warning; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `git diff --check`.
- Intended commit message: `Refine runtime setup button spacing`

## 2026-05-27 15:38:09 WITA - Stabilize Link Fleet Discovery

- Status: Pushed
- Areas changed: Fleet discovery API, dashboard network diagnostic copy, changelog
- Summary: Keep Link-reached collectors marked ready when `/health` succeeds but `/agents` is slow or transiently unavailable, and show the actual Link proxy health URL in dashboard fix commands instead of a misleading raw Tailnet collector URL.
- Verification: `pnpm exec eslint src/app/api/fleet/discover/route.ts src/features/dashboard/dashboard-display-helpers.tsx --max-warnings=999` passed with one existing unused helper warning; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `git diff --check -- src/app/api/fleet/discover/route.ts src/features/dashboard/dashboard-display-helpers.tsx CHANGELOG.md`; live `http://127.0.0.1:5020/api/fleet/discover` reported `source: hivemind-link` and Ubuntu `collector: ready` with 7 agents through `http://127.0.0.1:8788/peer/100.96.125.3%3A8787`.
- Intended commit message: `Stabilize Link fleet discovery`

## 2026-05-27 15:35:44 WITA - Fix Runtime Provider Setup Layout

- Status: Pushed
- Areas changed: Agent settings modal runtime provider setup layout, dashboard styling, changelog
- Summary: Separate the Add Provider setup panel layout from the Add Model form grid so the refresh action no longer collides with the explanatory copy, and allow the refresh button label to wrap instead of escaping its button.
- Verification: `pnpm exec eslint src/features/dashboard/views/chat/AgentSettingsModal.tsx --max-warnings=999` passed with one existing unused-prop warning; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `git diff --check`; local dashboard loaded on the managed `5020` dev server, but this browser session had zero agents available so the populated modal state could not be opened there.
- Intended commit message: `Fix runtime provider setup layout`

## 2026-05-27 16:02 WITA - Stabilize Runtime Model Picker

- Status: Pushed
- Areas changed: Agent settings runtime availability, runtime integration target keys, runtime switching defaults, changelog
- Summary: Stop generated add-agent draft IDs from invalidating Hermes model-selection responses, clear stale runtime availability while the modal refreshes, seed availability from the selected machine's configured agents so installed runtime buttons do not stay disabled, and avoid copying provider/model choices from one runtime into another when switching between Hermes and OpenClaw.
- Verification: `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; targeted eslint for `DashboardApp`, agent settings/controller files, and `AgentSettingsModal` passed with existing warnings only; `node --check scripts/agent-telemetry-collector.mjs`; live `/api/runtimes/availability` returned Hermes and OpenClaw installed; live Hermes integrations returned `openai-codex` with 9 models; live OpenClaw integrations returned its configured provider/model.
- Intended commit message: `Stabilize runtime model picker`

## 2026-05-27 15:34:00 WITA - Add Hive Update Command

- Status: Uncommitted
- Areas changed: Setup scripts, uninstall scripts, update command shim, changelog
- Summary: Add a `hive-update` command that runs the checkout update script from PATH, install it beside the existing hive env and transfer commands during setup, and mirror removal in uninstall.
- Verification: `bash -n setup.sh uninstall.sh scripts/update-hivemindos.sh`; `sh -n scripts/hive-update`; `./scripts/hive-update --help`; `git diff --check -- scripts/hive-update setup.sh uninstall.sh setup.ps1 uninstall.ps1 CHANGELOG.md`; PowerShell parser not run because `pwsh` is not installed on this Mac.
- Intended commit message: `Add hive update command`

## 2026-05-27 14:20:07 WITA - Add OpenRouter Adaptive Agent Model

- Status: Uncommitted
- Areas changed: Agent settings model selector, OpenRouter adaptive policy storage, OpenAI-compatible chat runtime routing, dashboard styling, assimilation manifest
- Summary: Add an Adaptive model option with a Free badge whenever OpenRouter is the selected agent provider, show adaptive filters for input modalities, minimum context, categories, benchmark score floors, and paid fallback behavior, and resolve direct OpenAI-compatible OpenRouter adaptive chats against live free OpenRouter models.
- Verification: `pnpm -s typecheck`; `pnpm -s exec eslint src/lib/types/agent-runtime.ts src/features/dashboard/agent-settings-types.ts src/features/dashboard/hooks/use-agent-controller.tsx src/features/dashboard/hooks/use-agent-settings-controller.tsx src/features/dashboard/views/chat/AgentSettingsModal.tsx src/app/api/chat/agent-runtime/route.ts src/app/fleet.module.css` passed with warnings only; temporary dev server on port 5022 returned `200 OK` for `/`; `python3 /Users/liam/.codex/skills/github-assimilator/scripts/verify_assimilation_manifest.py`; `git diff --check -- src/lib/types/agent-runtime.ts src/features/dashboard/agent-settings-types.ts src/features/dashboard/hooks/use-agent-controller.tsx src/features/dashboard/hooks/use-agent-settings-controller.tsx src/features/dashboard/views/chat/AgentSettingsModal.tsx src/app/api/chat/agent-runtime/route.ts src/app/fleet.module.css CHANGELOG.md ASSIMILATION.json`; full `pnpm -s lint` still fails on pre-existing `src/components/agents/AgentSelectionModal.tsx` react-hooks/set-state-in-effect errors.
- Intended commit message: `Add OpenRouter adaptive agent model`

## 2026-05-27 15:06:00 WITA - Preserve Changelog During Updates

- Status: Pushed
- Areas changed: Update scripts, fleet update API, telemetry collector update path, changelog
- Summary: Add an automatic fast-forward pull helper that preserves local-only `CHANGELOG.md` sections when it is the only dirty tracked file, use it from manual and dashboard-triggered HivemindOS updates, and prefer a detached SSH rescue update when an old remote collector reports a dirty behind checkout.
- Verification: `node --check scripts/pull-with-changelog-preserve.mjs`; `node --check scripts/agent-telemetry-collector.mjs`; `bash -n scripts/update-hivemindos.sh`; temp-repo smoke confirmed a local-only `CHANGELOG.md` section is restored after an upstream fast-forward pull and leaves only `CHANGELOG.md` dirty; temp-repo guard smoke confirmed non-section changelog edits are not auto-discarded; `pnpm exec eslint src/app/api/fleet/update/route.ts scripts/agent-telemetry-collector.mjs --max-warnings=999`; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `git diff --check -- scripts/pull-with-changelog-preserve.mjs scripts/update-hivemindos.sh scripts/agent-telemetry-collector.mjs src/app/api/fleet/update/route.ts CHANGELOG.md`.
- Intended commit message: `Preserve changelog entries during updates`

## 2026-05-27 05:45:28 WITA - Add Tailnet My Apps View

- Status: Uncommitted
- Areas changed: More navigation, My Apps dashboard panel, fleet apps API, telemetry collector app discovery, dashboard view routing, assimilation manifest
- Summary: Add a My Apps utility view that aggregates HTTP apps reported by ready Tailscale fleet collectors, opens local apps through localhost, and opens remote apps through each machine's Tailscale DNS name or IP.
- Verification: `node --check scripts/agent-telemetry-collector.mjs`; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `pnpm exec eslint src/app/api/fleet/apps/route.ts src/features/dashboard/MorePanel.tsx src/features/dashboard/views/MyAppsPanel.tsx src/features/dashboard/views/UtilityPanels.tsx src/features/dashboard/dashboard-types.ts src/features/dashboard/views/DashboardHeader.tsx src/features/dashboard/dashboard-light-helpers.tsx --max-warnings=999` passed with existing warnings; local listener parser smoke found 28 listening sockets and parsed sample ports including 5020 and 8787; temporary collector on `127.0.0.1:8789` returned `ok: true` with 15 discovered HTTP apps from `/apps`. A throwaway Next dev server on port 5024 was attempted, but Next refused because the managed 5020 dev server is already running, and it was not stopped.
- Intended commit message: `Add Tailnet My Apps view`

## 2026-05-27 04:30:51 WITA - Add Base Wallet Claim Address Connect

- Status: Uncommitted
- Areas changed: Bankr rewards UI, wallet styling, changelog
- Summary: Add a Connect Base wallet action to the Honey rewards claim rail that uses the browser wallet to fill the Bankr receiving address, attempts to switch the wallet to Base, and keeps the manual address field as the fallback path.
- Verification: `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `pnpm exec eslint src/features/dashboard/views/WalletPanel.tsx src/app/wallets.module.css --max-warnings=999` passed with existing warnings; `git diff --check`; local claim without a recipient still fails with `Enter a Bankr EVM receiving address before claiming HIVE.`; local claim with a syntactically valid recipient still reaches the official worker and is blocked only by Bankr treasury daily-limit pricing enforcement.
- Intended commit message: `Add Base wallet claim address connect`

## 2026-05-27 04:27:47 WITA - Remove Recipient Bankr Key Requirement

- Status: Uncommitted
- Areas changed: Honey ledger claim service, Honey ledger API, wallet controller, Bankr rewards UI, wallet styling, Honey ledger worker, changelog
- Summary: Stop using a recipient Bankr API key to discover the claiming wallet, accept a Bankr EVM receiving address instead, validate it before submitting the claim, save that address locally in the browser for repeat claims, and return the treasury Bankr transfer error from the official worker.
- Verification: `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `pnpm --dir workers/honey-ledger typecheck`; `pnpm exec eslint src/lib/services/wallet/honey-ledger.ts src/app/api/honey-ledger/route.ts src/features/dashboard/hooks/use-wallet-files-controller.tsx src/features/dashboard/views/WalletPanel.tsx src/app/wallets.module.css --max-warnings=999` passed with existing warnings; `pnpm --dir workers/honey-ledger run deploy`; local claim without a recipient and with an invalid recipient both fail with `Enter a Bankr EVM receiving address before claiming HIVE.`; local claim with a syntactically valid recipient reaches the official worker and is blocked by Bankr treasury security with `Could not determine the USD value of this transaction; the daily limit could not be enforced. Disable the daily limit in Security settings if you want to proceed.`; ledger readback still reports `availableHoney: 0.000411` and `hiveBalance: 0`.
- Intended commit message: `Remove recipient Bankr key requirement`

## 2026-05-27 04:22:03 WITA - Reuse Bankr CLI Key For Honey Claims

- Status: Uncommitted
- Areas changed: Honey ledger claim service, changelog
- Summary: Let the Honey-to-Bankr-HIVE claim path reuse the local Bankr CLI API key from `~/.bankr/config.json` when `BANKR_API_KEY` is not set in the app environment, so local users do not have to duplicate their recipient Bankr key. Superseded by the receiving-address claim flow above.
- Verification: `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `curl -sS --max-time 90 -X POST http://localhost:5021/api/honey-ledger -H 'Content-Type: application/json' -d '{"action":"claim-bankr-hive"}'` reached Bankr with the CLI key and was blocked by Bankr with `IP address not allowed for this API key`; direct worker no-Honey smoke returned `No Honey is ready to claim.`
- Intended commit message: `Reuse Bankr CLI key for Honey claims`

## 2026-05-27 04:17:49 WITA - Fix Nested CSS Import Parse Failure

- Status: Uncommitted
- Areas changed: Global CSS imports, root layout font links, changelog
- Summary: Remove duplicate Tailwind and animation imports from `nlux-base.css`, stop importing the starter base stylesheet into the app cascade, and move Google Fonts out of CSS `@import` into document `<link>` tags so Turbopack/PostCSS never sees late `@import` rules after generated CSS.
- Verification: `pnpm exec eslint src/app/layout.tsx src/features/dashboard/views/MemoryTelemetryPanel.tsx src/lib/services/runtime-memory-telemetry.ts --max-warnings=999`; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `git diff --check -- scripts/dev-server.mjs scripts/update-hivemindos.sh src/app/globals.css src/app/nlux-base.css src/app/layout.tsx src/features/dashboard/views/MemoryTelemetryPanel.tsx src/lib/services/runtime-memory-telemetry.ts CHANGELOG.md`; temporary webpack dev server on port 5023 returned `200 OK` for `/?view=memory` without the CSS import parse error.
- Intended commit message: `Fix nested CSS import parse failure`

## 2026-05-27 04:14:38 WITA - Lower Next Dev Memory Pressure

- Status: Uncommitted
- Areas changed: Dev server launcher, update restart path, changelog
- Summary: Keep dashboard dev startup on webpack because Turbopack spawned enough compiler workers to push total RSS toward the 5 GB guard at startup, but disable dev source maps unless `NEXT_DEV_SOURCE_MAPS=1` is set. `HIVEMINDOS_NEXT_DEV_BUNDLER=turbo` or `NEXT_DEV_BUNDLER=turbo` remains available for local debugging experiments, while the default avoids the immediate multi-process RSS spike.
- Verification: `node --check scripts/dev-server.mjs`; `bash -n scripts/update-hivemindos.sh`; `node scripts/dev-server.mjs --help`; temporary `next dev --webpack --disable-source-maps -p 5023` returned `200 OK` for `/?view=memory` and reported about 1.66 GB dashboard RSS after initial compile instead of the Turbopack worker tree's near-5 GB startup total.
- Intended commit message: `Lower Next dev memory pressure`

## 2026-05-27 04:04:03 WITA - Clarify Memory Telemetry Composition

- Status: Uncommitted
- Areas changed: Memory telemetry panel composition chart, metric labels, suspect detection, changelog
- Summary: Add a dashboard RSS donut chart that separates the Next.js server slice from other dashboard processes such as parents, wrappers, or compiler workers; make the Next RSS card show its percentage of the dashboard total, rename the timeline to Dashboard RSS samples, label heap/external memory as V8 logical heap and native buffers, keep ArrayBuffer memory from being double-counted, and surface a suspect when V8 logical heap greatly exceeds resident RSS.
- Verification: `pnpm exec eslint src/features/dashboard/views/MemoryTelemetryPanel.tsx src/lib/services/runtime-memory-telemetry.ts src/lib/types/memory-telemetry.ts --max-warnings=999`; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `git diff --check -- src/features/dashboard/views/MemoryTelemetryPanel.tsx src/lib/services/runtime-memory-telemetry.ts CHANGELOG.md`.
- Intended commit message: `Clarify memory telemetry composition`

## 2026-05-27 03:38:12 WITA - Move Bankr Claim Treasury To Official Worker

- Status: Uncommitted
- Areas changed: Honey ledger worker, Honey ledger client service, worker config, Honey ledger docs, architecture docs, changelog
- Summary: Move Honey-to-Bankr-HIVE settlement into the official Cloudflare Honey ledger worker so clones only submit a recipient Bankr EVM address, while the funded `HONEY_REWARD_BANKR_API_KEY` treasury secret stays in Worker secrets; the worker transfers HIVE, then spends Honey only after Bankr returns a transaction hash.
- Verification: `pnpm --dir workers/honey-ledger typecheck`; `pnpm exec eslint src/lib/services/wallet/honey-ledger.ts src/app/api/honey-ledger/route.ts src/features/dashboard/hooks/use-wallet-files-controller.tsx src/features/dashboard/views/WalletPanel.tsx src/components/wallet/AgentWalletCard.tsx src/features/dashboard/DashboardApp.tsx src/features/dashboard/hooks/use-dashboard-derived-state.tsx --max-warnings=999` passed with existing warnings; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `pnpm --dir workers/honey-ledger run deploy`; direct worker no-Honey smoke returned `No Honey is ready to claim.`, proving the deployed worker has the treasury secret configured and reaches balance validation; local dashboard claim was blocked by an unrelated dev CSS compile error in `src/app/globals.css`; local Bankr CLI key exists but Bankr rejected it with `IP address not allowed for this API key`.
- Intended commit message: `Move Bankr claim treasury to official worker`

## 2026-05-27 03:29:52 WITA - Configure HIVE Token Address

- Status: Uncommitted
- Areas changed: Local app environment, changelog
- Summary: Set the local HIVE ERC20 token address used by Honey-to-Bankr-HIVE claims.
- Verification: `./scripts/hive-env-add --scope app --no-backup --no-tailnet-sync HIVE_TOKEN_ADDRESS=0xA382c83e2a3B79368f372c2EB9b6925ffAf45bA3`; `curl -sS --max-time 20 -X POST http://127.0.0.1:5020/api/honey-ledger -H 'Content-Type: application/json' -d '{"action":"claim-bankr-hive"}'` now advances past token-address validation and fails on the missing `BANKR_API_KEY`, leaving Honey untouched.
- Intended commit message: `Configure HIVE token address`

## 2026-05-27 03:27:47 WITA - Wire Honey Claims To Bankr Transfers

- Status: Uncommitted
- Areas changed: Honey ledger service, Honey ledger API, wallet controller, wallet rewards panel, wallet styling, per-agent wallet card, changelog
- Summary: Add a real Honey-to-Bankr-HIVE claim path that resolves the user's Bankr EVM wallet, sends HIVE from the configured Bankr reward treasury through `/wallet/transfer`, and only spends Honey in the ledger after Bankr returns a transaction hash; missing Bankr keys or HIVE token address now fail the claim without touching Honey.
- Verification: `node -e 'for (const k of ["BANKR_API_KEY","HONEY_REWARD_BANKR_API_KEY","BANKR_REWARD_TREASURY_API_KEY","HIVE_TOKEN_ADDRESS"]) console.log(`${k}=${process.env[k]?"present":"missing"}`)'` confirmed the current shell is missing the required claim env; `curl -sS --max-time 20 -X POST http://127.0.0.1:5020/api/honey-ledger -H 'Content-Type: application/json' -d '{"action":"claim-bankr-hive"}'` failed with `Set HIVE_TOKEN_ADDRESS before claiming Bankr HIVE.`; `curl -fsS --max-time 20 http://127.0.0.1:5020/api/honey-ledger` still reports `availableHoney: 0.000411` and `hiveBalance: 0`; `pnpm exec eslint src/lib/services/wallet/honey-ledger.ts src/app/api/honey-ledger/route.ts src/features/dashboard/hooks/use-wallet-files-controller.tsx src/features/dashboard/views/WalletPanel.tsx src/components/wallet/AgentWalletCard.tsx src/features/dashboard/DashboardApp.tsx src/features/dashboard/hooks/use-dashboard-derived-state.tsx --max-warnings=999` passed with existing warnings; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`.
- Intended commit message: `Wire Honey claims to Bankr transfers`

## 2026-05-27 02:05:15 WITA - Stop Fake Bankr HIVE Awards

- Status: Uncommitted
- Areas changed: Wallet Honey rewards panel, per-agent wallet holdings, wallet controller wiring, Honey derived stats, wallet styling, changelog
- Summary: Remove the fake instant Bankr award action from Honey rewards, show the old HIVE bucket as legacy non-Bankr state only, disable claim controls until real Bankr settlement is wired, and neutralize the oversized teal payout button styling.
- Verification: `curl -fsS --max-time 20 -X POST http://127.0.0.1:5020/api/honey-ledger -H 'Content-Type: application/json' -d '{"action":"return-to-honey"}'`; `curl -fsS --max-time 20 http://127.0.0.1:5020/api/honey-ledger` reports `availableHoney: 0.000411` and `hiveBalance: 0`; `pnpm exec eslint src/app/wallets.module.css src/components/wallet/AgentWalletCard.tsx src/features/dashboard/DashboardApp.tsx src/features/dashboard/hooks/use-dashboard-derived-state.tsx src/features/dashboard/hooks/use-wallet-files-controller.tsx src/features/dashboard/views/WalletPanel.tsx src/lib/services/wallet/honey-ledger.ts --max-warnings=999` passed with existing warnings; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; Playwright wallet smoke confirmed the fake `Award Bankr HIVE` text is gone and only the expected dev HMR WebSocket warning appeared.
- Intended commit message: `Stop fake Bankr HIVE awards`

## 2026-05-27 01:56:43 WITA - Reconcile Returned Honey Balances

- Status: Uncommitted
- Areas changed: Honey ledger normalization, changelog
- Summary: Reconcile per-agent Honey balance rows from the authoritative exchange and HIVE balance maps so a return-to-Honey action immediately shows restored Honey even when the remote worker response includes stale legacy balance fields.
- Verification: `pnpm exec eslint src/lib/services/wallet/honey-ledger.ts src/app/api/honey-ledger/route.ts src/features/dashboard/views/WalletPanel.tsx src/features/dashboard/hooks/use-wallet-files-controller.tsx src/features/dashboard/hooks/use-dashboard-derived-state.tsx src/components/wallet/AgentWalletCard.tsx --max-warnings=999`; `pnpm --dir workers/honey-ledger typecheck`; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `pnpm --dir workers/honey-ledger run deploy`; `curl -fsS --max-time 20 -X POST http://127.0.0.1:5020/api/honey-ledger -H 'Content-Type: application/json' -d '{"action":"return-to-honey"}'`; `curl -fsS --max-time 20 http://127.0.0.1:5020/api/honey-ledger` now reports `availableHoney: 0.000411` and `hiveBalance: 0` for `hermes-1779349579715`.
- Intended commit message: `Reconcile returned Honey balances`

## 2026-05-27 01:58 WITA - Clarify Bankr Honey Rewards

- Status: Pushed
- Areas changed: Honey ledger API, Honey ledger service, wallet reward rail, dashboard wallet stats
- Summary: Rename the wallet rail copy from generic HIVE conversion to Bankr reward awarding, track Bankr HIVE awarded separately in dashboard stats, and add a return-to-Honey ledger action that can reverse awarded HIVE back into Honey locally or through the remote ledger endpoint.
- Verification: `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `git diff --check HEAD~1..HEAD`; syntax checks for collector and real-fleet E2E scripts.
- Intended commit message: `Clarify Bankr Honey rewards`

## 2026-05-26 18:08:49 UTC - Document Targeted Hive File Transfers

- Status: Pushed
- Areas changed: Targeted file transfer docs, README, sync architecture docs, changelog
- Summary: Add a dedicated operator guide for vault-backed `hive-transfer` usage, including storage layout, manifest schema, machine/runtime/agent targeting rules, CLI examples, collector HTTP API examples, receiver polling semantics, verification steps, troubleshooting, and safety boundaries. Link the new guide from the README and the sync/Tailscale architecture doc.
- Verification: `git diff --check -- README.md docs/architecture/syncing-and-tailscale.md docs/syncing-and-tailscale.md docs/targeted-file-transfers.md CHANGELOG.md`; manual readback of README feature table/link and new `docs/targeted-file-transfers.md` guide.
- Intended commit message: `Document targeted hive file transfers`

## 2026-05-27 01:40 WITA - Enable Dynamic OpenClaw Model Discovery

- Status: Pushed
- Areas changed: Telemetry collector runtime integrations, runtime adapters, agent settings modal, runtime capability metadata, changelog
- Summary: Make collectors detect OpenClaw when `~/.openclaw/openclaw.json` exists, advertise OpenClaw model selection, expose `/runtimes/openclaw/integrations`, and return providers/models from the machine's actual OpenClaw config instead of dashboard fallbacks. Keep Link proxy collector URLs proxied even when they use local `127.0.0.1/peer/...` paths, and render the model picker for all model-selectable runtimes.
- Verification: `node --check scripts/agent-telemetry-collector.mjs`; `pnpm exec eslint scripts/agent-telemetry-collector.mjs 'src/app/api/runtimes/[runtime]/integrations/route.ts' src/features/dashboard/views/chat/AgentSettingsModal.tsx src/lib/services/runtime-adapters/openclaw.ts src/lib/services/runtime-adapters/types.ts src/lib/services/runtime-integrations.ts src/lib/types/agent-runtime.ts --max-warnings=999`; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `git diff --check`; collector smoke with temporary `OPENCLAW_HOME` returned `runtimes:["hermes","openclaw"]`, an OpenClaw agent, and model selection for `custom-provider/not-hardcoded-model-123`.
- Intended commit message: `Enable dynamic OpenClaw model discovery`

## 2026-05-26 17:27:26 UTC - Add Targeted Hive File Transfers

- Status: Pushed
- Areas changed: Transfer helper scripts, telemetry collector transfer endpoints, Syncthing configure behavior, setup/uninstall scripts, docs, package scripts, changelog
- Summary: Add a vault-backed `hive-transfer` helper that creates targeted transfer envelopes under `.hivemindos-transfers`, copies payloads with media type/size/SHA-256 metadata, filters inboxes by machine/runtime/agent, and records receiver acknowledgements. Expose the same inbox/create/ack semantics through collector `/transfers` endpoints and advertise `fileTransfers` in `/health`. Install the helper beside the shared hive env commands, document receiver polling/ack flow, and request a Syncthing restart after folder configure so peer sharing changes take effect.
- Verification: `npm run test:hive-transfer`; `node --check scripts/hive-transfer.mjs`; `node --check scripts/agent-telemetry-collector.mjs`; `bash -n setup.sh uninstall.sh scripts/hive-transfer`; `git diff --check -- docs/syncing-and-tailscale.md package.json scripts/agent-telemetry-collector.mjs scripts/hive-transfer scripts/hive-transfer.mjs scripts/test-hive-transfer.mjs setup.ps1 setup.sh uninstall.ps1 uninstall.sh`; `npm run typecheck -- --pretty false --skipLibCheck`; local CLI+HTTP smoke created a transfer for `hivemind-machine-08bf834423b5883edc65c753262afae2`/`hermes`/`receiver-test`, confirmed wrong-agent filtering, confirmed `/transfers` visibility, acknowledged through `/transfers/ack`, and confirmed the inbox cleared. Mac collector is reachable but still running the old build until the Mac checkout's dirty working tree is reconciled; direct Mac-side Syncthing repair added the Ubuntu device to the Mac `hivemindos-vault` folder and restarted Syncthing, after which Mac→Ubuntu note sync succeeded and a real `hive-transfer` envelope/payload created on Ubuntu replicated to the Mac with target `host=Liams-MacBook-Pro.local`, `runtime=hermes`, `agentId=mac-receiver-test`.
- Intended commit message: `Add targeted hive file transfers`
## 2026-05-26 12:26:03 EDT - Bundle Tailnet Generation Skills

- Status: Pushed
- Areas changed: bundled shared skills, shared-skill seeding scripts, Tailnet generation docs, changelog
- Summary: Add bundled HivemindOS shared-skill templates for Tailnet/local generation authoring, ComfyUI image generation, and local/Tailnet TTS generation. Make setup seed every bundled app skill into the shared Skills shelf instead of only karpathy-guidelines, while keeping karpathy-guidelines as the runtime baseline skill copied into agent skill folders. Document the localtts endpoint contract, including voice discovery via `/v1/voices` and `/voices`, cloned voice profile registration via `POST /v1/voices`, model discovery, health, OpenAI-style speech generation, JSON compatibility endpoints, and optional API docs.
- Verification: `bash -n scripts/seed-shared-skills.sh setup.sh uninstall.sh`; PowerShell parser skipped because `pwsh` is not installed on this Mac; bundled skill frontmatter checked for the three new generation skills; temp-vault seed smoke test confirmed `karpathy-guidelines`, `tailscale-generation-skill-authoring`, `comfyui-image-generation`, and `localtts` are copied and indexed; `git diff --check -- CHANGELOG.md scripts/seed-shared-skills.sh setup.ps1 skills/tailscale-generation-skill-authoring/SKILL.md skills/comfyui-image-generation/SKILL.md skills/localtts/SKILL.md docs/tailnet-generation-skills.md`
- Intended commit message: `Bundle Tailnet generation skills`


## 2026-05-26 11:07:59 EDT - Add Stable Machine IDs For Fleet Discovery

- Status: Pushed
- Areas changed: Telemetry collector health metadata, Fleet discovery dedupe, dashboard machine merge/grouping, Hivemind Link installer port/mode detection, collector URL resolution, changelog
- Summary: Add a durable per-machine ID at `~/.hivemindos/machine-id` and expose it from collector `/health` so duplicate checkouts/Link nodes on the same physical machine can collapse safely without hiding another Mac with the same hostname. Make Fleet server/client dedupe use that machine ID when present. Harden installer reruns to preserve Link mode from `collector.env`, reject non-Hivemind services on `/health`, choose a real free collector port on macOS, and make dashboard collector URL resolution prefer the live collector registry over stale process env.
- Verification: `bash -n scripts/install-telemetry-collector.sh`; `node --check scripts/agent-telemetry-collector.mjs`; `npm exec --yes --package pnpm@8.6.12 -- pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `git diff --check -- CHANGELOG.md scripts/install-telemetry-collector.sh scripts/agent-telemetry-collector.mjs src/app/api/fleet/discover/route.ts src/features/dashboard/dashboard-display-helpers.tsx src/features/dashboard/dashboard-types.ts src/features/dashboard/hooks/use-dashboard-derived-state.tsx src/lib/services/hivemind-link-control.ts`; `./scripts/install-telemetry-collector.sh` preserved Link mode, rejected Z-Image on 8787, selected private collector port 8791, and Link stayed connected on control port 8793; live `/health` reports `machineId`; live `/api/fleet/discover` reports local `This Mac` ready at `http://127.0.0.1:8791` with machine ID.
- Intended commit message: `Add stable machine IDs for Fleet discovery`

## 2026-05-27 01:35:57 WITA - Correct Memory Telemetry Process Scope

- Status: Pushed
- Areas changed: Memory telemetry process classification, Memory panel labels, changelog
- Summary: Make the headline memory telemetry RSS track the dashboard dev-server process tree instead of counting unrelated Next.js apps, Terminal ancestors, git remotes, and helper runtimes as app memory; keep helper and system processes visible separately for diagnosis, reset stale in-memory telemetry after the classifier change, and stop double-counting ArrayBuffer memory in the External metric.
- Verification: `pnpm exec eslint src/lib/services/runtime-memory-telemetry.ts src/lib/types/memory-telemetry.ts src/features/dashboard/views/MemoryTelemetryPanel.tsx --max-warnings=999`; `git diff --check -- src/lib/services/runtime-memory-telemetry.ts src/features/dashboard/views/MemoryTelemetryPanel.tsx CHANGELOG.md`; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; live `/api/memory-telemetry` on port 5020 reported dashboard-only RSS settling to ~777 MB across 5 dashboard processes with no app growth signal after the telemetry history reset.
- Intended commit message: `Correct memory telemetry process scope`

## 2026-05-27 01:35:55 WITA - Remove Ami OpenClaw Surfaces

- Status: Pushed
- Areas changed: OpenClaw docs, OpenClaw standalone API routes, OpenClaw skill/memory/channel/autoposter helpers, runtime capabilities, notifications route, docs preview/navigation, README, changelog
- Summary: Remove the standalone OpenClaw user/setup guides and Ami-companion-derived OpenClaw product surfaces, keep only the generic Hivemind runtime bridge for OpenClaw chat/model selection, move shared notifications to `/api/notifications`, and update docs to describe the slimmer runtime-only OpenClaw support.
- Verification: Pending.
- Intended commit message: `Remove Ami OpenClaw surfaces`

## 2026-05-27 01:14:46 WITA - Throttle Dashboard Polling Memory Pressure

- Status: Pushed
- Areas changed: Dashboard polling hooks, fleet/app/MiroShark API cache windows, changelog
- Summary: Add a visibility-aware polling hook and move the noisy long-running dashboard pollers to one-at-a-time recursive polling that slows while the tab is hidden, reduces fleet snapshot/discovery, Honey ledger, memory telemetry, version, MiroShark status, notifications, and Kanban background request pressure, and keeps short server-side caches from rebuilding duplicate fleet/status payloads.
- Verification: `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `pnpm exec eslint src/features/dashboard/hooks/use-visibility-aware-polling.tsx src/features/dashboard/hooks/use-dashboard-polling-effects.tsx src/features/dashboard/DashboardApp.tsx src/app/api/fleet/discover/route.ts src/app/api/fleet/snapshot/route.ts src/app/api/miroshark/status/route.ts src/app/api/app/version/route.ts --max-warnings=999` passed with existing warnings; `git diff --check -- src/features/dashboard/hooks/use-visibility-aware-polling.tsx src/features/dashboard/DashboardApp.tsx src/features/dashboard/hooks/use-dashboard-polling-effects.tsx src/app/api/fleet/discover/route.ts src/app/api/fleet/snapshot/route.ts src/app/api/miroshark/status/route.ts src/app/api/app/version/route.ts CHANGELOG.md`; live `curl` smokes returned `ok: true` for `/api/fleet/discover?includeSnapshots=0` and `/api/fleet/snapshot`, and `/api/miroshark/status` returned the cached stopped companion status successfully.
- Intended commit message: `Throttle dashboard polling memory pressure`

## 2026-05-27 01:13:02 WITA - Stabilize Fleet Graph Layout

- Status: Pushed
- Areas changed: Fleet network graph, changelog
- Summary: Make fallback fleet graph cluster coordinates derive from a stable machine-id ordering instead of discovery response order, preventing the graph from appearing mirrored after live fleet refreshes.
- Verification: `pnpm exec eslint src/components/fleet/network-graph.tsx --max-warnings=999`; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `git diff --check -- src/components/fleet/network-graph.tsx CHANGELOG.md`.
- Intended commit message: `Stabilize fleet graph layout`

## 2026-05-27 01:03:17 WITA - Expand GitHub Pages Docs

- Status: Pushed
- Areas changed: docs index, docs preview page, GitHub Pages config, architecture docs, feature docs, integration docs, runtime docs, product docs, compatibility pages, changelog
- Summary: Add a GitHub Pages-ready documentation entry point and preview page plus audited architecture, organized feature pages, API, storage, collector, worker, runtime, integration, product, and verification references for the current HivemindOS codebase.
- Verification: Local docs link checker reported `docs links ok`; `git diff --check -- docs CHANGELOG.md`; `preview.html` parsed with Python's HTML parser; local static server on `127.0.0.1:5022` served `preview.html` and `features/index.md`.
- Intended commit message: `Expand GitHub Pages docs`

## 2026-05-27 00:45:09 WITA - Attach Kanban Deliverables

- Status: Pushed
- Areas changed: Kanban task model, local Kanban store, Kanban board cards, deliverable open/reveal API, Kanban board styling
- Summary: Add persisted deliverables to Kanban tasks, auto-extract local paths and URLs from completed task results, show a deliverable badge on Done cards, open a portaled compact actions menu with preview/open plus Show in Finder, Show in Explorer, or Show in folder for local deliverables, roll completed handoff-child outputs back onto the original parent task, and archive completed visual handoff children from the normal Done lane after their outputs converge upstream.
- Verification: `pnpm exec eslint src/lib/services/kanban/local-kanban-store.ts src/app/api/kanban/deliverable/route.ts src/features/dashboard/views/KanbanPanel.tsx src/features/dashboard/DashboardApp.tsx src/lib/types/kanban.ts --max-warnings=999` passed with existing DashboardApp warnings; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `git diff --check -- src/lib/services/kanban/local-kanban-store.ts src/app/api/kanban/deliverable/route.ts src/features/dashboard/views/KanbanPanel.tsx src/features/dashboard/DashboardApp.tsx src/lib/types/kanban.ts src/app/kanban-board.module.css CHANGELOG.md`; `/api/kanban` smoke confirmed the repaired Emoji parent Done card exposes the `Emoji Atlas site` and `Emoji Atlas desktop preview` deliverables while the visual handoff child is hidden from the normal Done column; `/api/kanban/deliverable` reject-path smoke returned the expected web-URL reveal error; Browser smoke loaded the Kanban route on Liam's existing dev server with no console errors.
- Intended commit message: `Attach Kanban deliverables`

## 2026-05-27 00:48 WITA - Enable OpenClaw Model Selection

- Status: Pushed
- Areas changed: OpenClaw runtime adapter, telemetry collector runtime integrations, runtime capabilities, agent settings model picker, runtime model persistence
- Summary: Mark OpenClaw as model-selectable, read provider/model options dynamically from the target machine's OpenClaw config and current agent refs instead of a hardcoded catalog, auto-detect OpenClaw as an installed runtime/agent when the collector can read `~/.openclaw/openclaw.json`, proxy OpenClaw model selection through the remote collector just like Hermes, treat local Hivemind Link `/peer/...` URLs as remote collectors instead of local runtime reads, keep the provider/model section visible with an explicit loading/error/empty state when a model-selectable runtime returns no inventory, preserve dynamic providers such as `openai-codex`, key modal integration results to the selected agent/collector so one machine's OpenClaw default cannot leak into another, prefer an explicit agent profile model such as `openai-codex/gpt-5.5` over a machine-wide OpenClaw default such as `openai/gpt-5.2`, and persist OpenClaw model changes back to its config.
- Verification: `pnpm exec eslint src/lib/services/runtime-adapters/openclaw.ts src/lib/types/agent-runtime.ts src/features/dashboard/hooks/use-agent-controller.tsx src/features/dashboard/hooks/use-agent-settings-controller.tsx src/features/dashboard/hooks/use-dashboard-derived-state.tsx src/features/dashboard/DashboardApp.tsx scripts/agent-telemetry-collector.mjs --max-warnings=999` passed with existing DashboardApp/hook warnings; `pnpm exec eslint scripts/agent-telemetry-collector.mjs 'src/app/api/runtimes/[runtime]/integrations/route.ts' src/features/dashboard/views/chat/AgentSettingsModal.tsx --max-warnings=999`; `node --check scripts/agent-telemetry-collector.mjs`; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; local proxy smoke with `telemetryUrl: http://127.0.0.1:9880/peer/fake` returned `proxy-provider/proxy-model` from the proxy server instead of this Mac's OpenClaw config; temporary collector smoke with arbitrary `custom-provider/not-hardcoded-model-123` proved OpenClaw model discovery is config-driven and made `/health` report `openclaw`, `/agents` include an auto-detected OpenClaw agent, and `/runtimes/openclaw/integrations` return that config model; temporary collector smoke with `OPENCLAW_HOME` containing both `openai/gpt-5.2` and `openai-codex/gpt-5.5` returned `openai-codex/gpt-5.5` for the selected agent; live Ubuntu collector currently reports only `hermes` and returns 404 for OpenClaw integrations until its running collector is updated/restarted with this script.
- Intended commit message: `Enable OpenClaw model selection`

## 2026-05-27 00:31 WITA - Disable Missing Runtime Choices

- Status: Pushed
- Areas changed: Agent settings runtime selector, runtime availability API, fleet modal styling
- Summary: Add a local runtime availability check for Hermes, OpenClaw, Aeon, and Local OpenAI-compatible endpoints, pass that status into the agent settings modal, and disable runtime picker options that are not installed with hover text saying the runtime is not installed.
- Verification: `pnpm exec eslint src/lib/services/runtime-availability.ts src/app/api/runtimes/availability/route.ts src/features/dashboard/views/chat/AgentSettingsModal.tsx src/features/dashboard/DashboardApp.tsx --max-warnings=999` passed with existing DashboardApp warnings; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `git diff --check -- src/lib/services/runtime-availability.ts src/app/api/runtimes/availability/route.ts src/features/dashboard/views/chat/AgentSettingsModal.tsx src/features/dashboard/DashboardApp.tsx src/app/fleet.module.css CHANGELOG.md`; `curl -fsS --max-time 20 http://127.0.0.1:5020/api/runtimes/availability` returned Hermes/OpenClaw installed and Aeon/Local OpenAI unavailable on this machine; Playwright smoke loaded `http://127.0.0.1:5020/?view=chat` without new console errors beyond the dev HMR WebSocket warning.
- Intended commit message: `Disable missing runtime choices`

## 2026-05-26 23:55 WITA - Add Encrypted File Share E2E

- Status: Pushed
- Areas changed: Real fleet E2E runner, telemetry collector E2E file-share hook, package scripts
- Summary: Add a `file-share` real fleet E2E suite that requires Hermes and OpenClaw on different ready machines, prepares a recipient keypair on the OpenClaw machine, has the Hermes machine create an RSA-OAEP encrypted file envelope over the discovered HivemindOS/Tailscale collector path, verifies the OpenClaw machine can decrypt the payload by hash without writing plaintext into the test summary, and cleans up `hive-e2e-*` share artifacts on both machines.
- Verification: `node --check scripts/agent-telemetry-collector.mjs && node --check scripts/e2e-real-fleet.mjs`; `pnpm exec eslint scripts/e2e-real-fleet.mjs scripts/agent-telemetry-collector.mjs --max-warnings=999`; `git diff --check -- scripts/e2e-real-fleet.mjs scripts/agent-telemetry-collector.mjs package.json CHANGELOG.md`.
- Intended commit message: `Add encrypted file share E2E`

## 2026-05-26 22:46:11 WITA - Keep Chat History Selection In Place

- Status: Pushed
- Areas changed: Dashboard chat sidebar history, dashboard app wiring, changelog
- Summary: Stop promoting the active chat history row above newer rows when it is selected, and automatically open the newest visible chat history item when the Chat view first loads without an explicit selected chat leaf.
- Verification: `pnpm exec eslint src/features/dashboard/hooks/use-chat-tree-controller.tsx src/features/dashboard/DashboardApp.tsx --max-warnings=999`; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `git diff --check -- src/features/dashboard/hooks/use-chat-tree-controller.tsx src/features/dashboard/DashboardApp.tsx CHANGELOG.md`; `curl --max-time 20 -I 'http://localhost:5020/?view=chat'` returned `200 OK` after the prop wiring fix; Browser smoke loaded `http://localhost:5020/?view=chat` with Chat selected, Machines and Live conversation visible, and no console errors.
- Intended commit message: `Keep chat history selection in place`

## 2026-05-26 18:58:33 WITA - Make Update Build Opt-In

- Status: Pushed
- Areas changed: HivemindOS update command, changelog
- Summary: Change `scripts/update-hivemindos.sh` so the default update path skips the production dashboard build and relies on the dev server compiling on demand; keep production builds available through `--build` or `--production-build`.
- Verification: `bash -n scripts/update-hivemindos.sh`; `./scripts/update-hivemindos.sh --help`; `./scripts/update-hivemindos.sh --skip-pull --skip-install --skip-collector --skip-dashboard`; `git diff --check -- scripts/update-hivemindos.sh CHANGELOG.md`
- Intended commit message: `Make update build opt-in`

## 2026-05-26 18:52:32 WITA - Remove Agent Input Length Block

- Status: Pushed
- Areas changed: Agent security proxy, local telemetry collector chat bridge, runtime-session bridge, chat runtime stream route, chat-to-Kanban task generation, Kanban dispatch fallback, chat Kanban menu styling, changelog
- Summary: Move the security proxy implementation from the OpenClaw service namespace into the runtime-agnostic agent security proxy module, remove hard agent input length blocks from the dashboard route and collector chat bridge, preserve streamed token whitespace so generated Kanban titles/bodies do not lose spaces, preserve the agent-shaped human-visible Kanban title while storing the complete selected chat message in the Kanban body for workers, normalize generated card titles that come back as slugs/camelCase/concatenated words, route dashboard session polling through a runtime-agnostic `/runtime-sessions` bridge with Hermes as the current adapter, discover Hermes API sessions from DB-backed default state as well as profile session JSON so Kanban can poll long-running workers, guard the dashboard runtime stream against late closed-controller writes, requeue no-progress worker dispatches to Ready with a worker cooldown instead of escalating them to Needs human, and make the chat Send to Kanban status popover open above the button, show a success check animation, auto-dismiss on success, and expose an explicit close button for done/error states.
- Verification: `pnpm exec eslint src/lib/services/agent-security-proxy.ts src/app/api/openclaw/skill-action/route.ts --max-warnings=999`; `pnpm exec eslint scripts/agent-telemetry-collector.mjs src/features/dashboard/hooks/use-status-chat-input-controller.tsx --max-warnings=999` passed with existing hook warnings; `pnpm exec eslint src/features/dashboard/views/ChatPanel.tsx src/features/dashboard/DashboardApp.tsx src/features/dashboard/hooks/use-status-chat-input-controller.tsx --max-warnings=999` passed with existing DashboardApp/hook warnings; `pnpm exec eslint scripts/agent-telemetry-collector.mjs src/app/api/chat/agent-runtime/route.ts src/features/dashboard/hooks/use-kanban-dispatch-controller.tsx --max-warnings=999` passed with existing hook warnings; `pnpm exec eslint scripts/agent-telemetry-collector.mjs src/app/api/chat/agent-session/route.ts src/features/dashboard/hooks/use-kanban-dispatch-controller.tsx src/features/dashboard/hooks/use-kanban-task-controller.tsx src/features/dashboard/hooks/use-status-chat-input-controller.tsx src/features/dashboard/hooks/use-chat-tree-controller.tsx src/features/dashboard/DashboardApp.tsx src/features/env/env-components.tsx --max-warnings=999` passed with existing warnings; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `git diff --check -- src/features/dashboard/views/ChatPanel.tsx src/features/dashboard/DashboardApp.tsx src/features/dashboard/hooks/use-status-chat-input-controller.tsx src/app/chat.module.css CHANGELOG.md`; `git diff --check -- scripts/agent-telemetry-collector.mjs src/features/dashboard/hooks/use-status-chat-input-controller.tsx src/app/chat.module.css src/lib/services/agent-security-proxy.ts src/app/api/openclaw/skill-action/route.ts CHANGELOG.md`; `git diff --check -- scripts/agent-telemetry-collector.mjs src/app/api/chat/agent-runtime/route.ts src/features/dashboard/hooks/use-kanban-dispatch-controller.tsx src/features/dashboard/views/ChatPanel.tsx src/features/dashboard/DashboardApp.tsx src/features/dashboard/hooks/use-status-chat-input-controller.tsx src/app/chat.module.css src/lib/services/agent-security-proxy.ts src/app/api/openclaw/skill-action/route.ts CHANGELOG.md`; title-normalizer smoke printed `Draft emoji website plan`, `draft emoji website plan`, and `Draft Emoji Website Plan` for concatenated/slug/camel title inputs; repaired existing `Draftemojiwebsiteplan` and `Generate image for: Draftemojiwebsiteplan` Kanban cards through `/api/kanban` using the original agent-shaped JSON and parent result; `rg -n "openclaw/security-proxy|MAX_INPUT_LENGTH|Input exceeds maximum length|8000 chars|length limits" src || true`; `rg -n "maxChatChars|Message is too long|Limit: 12000|12000 characters|body.length > 1_000_000|request.destroy\\(\\)|Input exceeds maximum length|MAX_INPUT_LENGTH" scripts/agent-telemetry-collector.mjs src || true`; `node --check scripts/agent-telemetry-collector.mjs`; restarted `com.agent-control-room.telemetry`; `curl -fsS --max-time 10 http://127.0.0.1:8787/health` returned `ok: true`; `curl -fsS --max-time 10 'http://127.0.0.1:8787/runtime-sessions?runtime=hermes&sessionId=api-c309e4da3489785a&localDataDir=/Users/liam/.hermes/profiles/henry-matisse'` returned the DB-backed session with runtime/source metadata and final assistant result; `curl -fsS --max-time 15 -X POST 'http://127.0.0.1:5020/api/chat/agent-session'` with the Henry session returned `ok: true`; Playwright smoke loaded `http://127.0.0.1:5020/?view=chat` and confirmed the updated `generateKanbanPopover` CSS is present, though the current dashboard state had no connected agent to click a live chat message action.
- Intended commit message: `Remove agent input length block`

## 2026-05-26 11:32:00 WITA - Stream Hermes CLI Chat Output

- Status: Pushed
- Areas changed: Agent telemetry collector Hermes chat bridge, changelog
- Summary: Default Hermes dashboard chat to the streaming API bridge with CLI fallback, stop buffering CLI stdout until process exit, stream sanitized stdout chunks to the dashboard as SSE while filtering `session_id:` metadata, and prevent duplicate session events during polling.
- Verification: `node --check scripts/agent-telemetry-collector.mjs`; `pnpm exec eslint scripts/agent-telemetry-collector.mjs --max-warnings=999`; `git diff --check -- scripts/agent-telemetry-collector.mjs CHANGELOG.md`; restarted `com.agent-control-room.telemetry`; local `/health` reports `ok: true`; direct `/chat` stream probe reported `x-hermes-stream-source: api-server`, an immediate SSE keepalive, token delta SSE events before `[DONE]`, and no visible `session_id:` text.
- Intended commit message: `Stream Hermes CLI chat output`

## 2026-05-26 07:35:51 EDT - Hide Physical Tailnet Duplicate Of Link Host

## 2026-05-26 08:01:41 EDT - Restore Cross-Mac Link Discovery

- Status: Pushed
- Areas changed: Fleet discovery duplicate detection, dashboard machine merge identity, changelog
- Summary: Revert unsafe host-only machine identity so two Macs that report the same macOS local hostname do not collapse into one Fleet card. Keep collector host metadata for display/debugging, but use Link/Tailscale device identity for discovery and client merge keys so a remote dashboard can still see this Mac.
- Verification: `npm exec --yes --package pnpm@8.6.12 -- pnpm exec tsc --noEmit --pretty false --skipLibCheck`; live `/api/fleet/discover` on port 5020 lists `This Mac` at `100.84.93.114`, the other reachable `hivemindos-liams-macbook-pro-local-1` Link node at `100.116.251.116`, and the Linux node, proving same-hostname Macs are not collapsed.
- Intended commit message: `Restore cross-Mac Link discovery`

## 2026-05-26 07:54:24 EDT - Collapse Duplicate Hivemind Machine Reports

- Status: Pushed
- Areas changed: Fleet discovery duplicate detection, dashboard machine merge identity, dashboard types, changelog
- Summary: Make each Hivemind dashboard report a physical machine once by carrying the collector-reported host through discovery, deduping ready collectors by that host after health probing, and using the same host identity when merging client-side Fleet state. This keeps stale sidecar/system Tailnet duplicates from hiding the real machine while still allowing the healthy collector to appear.
- Verification: `npm exec --yes --package pnpm@8.6.12 -- pnpm exec tsc --noEmit --pretty false --skipLibCheck`; live `/api/fleet/discover` on port 5020 reports `This Mac` once at `http://127.0.0.1:8792` with collector host `Liams-MacBook-Pro.local` and the Linux Hivemind node once, with no duplicate Mac/iPhone rows.
- Intended commit message: `Collapse duplicate Hivemind machine reports`

## 2026-05-26 07:08:53 EDT - Clarify Dashboard Host Labels On Mobile

- Status: Committed
- Areas changed: Fleet machine identity helpers, dashboard derived machine labels, setup modal and machine-target copy, changelog
- Summary: Keep `self` semantics as the dashboard host while making the visible local-machine label OS-aware for desktop (`This Mac`, `This PC`, or `This computer`) and mobile-aware for remote mobile viewing (`Dashboard Mac`, `Dashboard PC`, or `Dashboard computer`). Reuse the derived machine name in setup/directory target flows instead of hardcoded `This Mac` checks.
- Verification: `npm exec --yes --package pnpm@8.6.12 -- pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `git diff --check -- CHANGELOG.md src/features/fleet/fleet-identity.ts src/features/dashboard/hooks/use-dashboard-derived-state.tsx src/features/dashboard/views/DashboardModals.tsx src/features/dashboard/hooks/use-chat-tree-controller.tsx src/features/dashboard/hooks/use-miroshark-brain-controller.tsx src/features/dashboard/hooks/use-status-chat-input-controller.tsx`; temporary dashboard on port 5021 kept `/api/fleet/discover` self collector ready at `http://127.0.0.1:8792`; browser smoke loaded the Fleet route without console errors.
- Intended commit message: `Clarify dashboard host labels on mobile`

## 2026-05-26 07:01:36 EDT - Read Persisted Collector Port In Fleet APIs

- Status: Committed
- Areas changed: Hivemind Link control helpers, Fleet discovery APIs, changelog
- Summary: Make the dashboard's local Fleet discovery routes read `AGENT_TELEMETRY_PORT` from `~/.hivemindos/collector.env` when process env is missing, so `This Mac` checks the actual moved collector port instead of falling back to stale `127.0.0.1:8787` after Link setup chooses 8792/8793.
- Verification: `npm exec --yes --package pnpm@8.6.12 -- pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `git diff --check -- CHANGELOG.md src/lib/services/hivemind-link-control.ts src/app/api/fleet/discover/route.ts src/app/api/tailscale/devices/route.ts`; temporary dashboard on port 5021 returned `/api/fleet/discover` with `This Mac` collector `ready` at `http://127.0.0.1:8792`; `/api/tailscale/devices` also returned self collector URL `http://127.0.0.1:8792`.
- Intended commit message: `Read persisted collector port in Fleet APIs`

## 2026-05-26 06:50:12 EDT - Preserve Link Mode During Updates

- Status: Committed
- Areas changed: HivemindOS update command, changelog
- Summary: Make the update command detect the current `com.hivemindos.linkd.agent` LaunchAgent label, while retaining legacy-label compatibility, so collector restarts stay in Hivemind Link mode after the port-conflict setup migration.
- Verification: `bash -n scripts/install-telemetry-collector.sh setup.sh uninstall.sh scripts/update-hivemindos.sh`; `./scripts/update-hivemindos.sh --skip-pull --skip-install --skip-build --skip-collector --skip-dashboard`; `./scripts/update-hivemindos.sh --skip-pull --skip-install --skip-build --skip-dashboard`; live checks confirmed local collector health on `127.0.0.1:8792`, Hivemind Link `Running` on `127.0.0.1:8793/status`, and LaunchAgent `com.hivemindos.linkd.agent` registered.
- Intended commit message: `Preserve Link mode during updates`

## 2026-05-26 05:38 EDT - Avoid Link Control Port Conflicts

- Status: Committed
- Areas changed: Hivemind Link setup script, Link daemon control listener, Fleet discovery APIs, setup summary, uninstall mirror, changelog
- Summary: Detect when the default local Link control port is occupied, move the control API to the nearest available localhost port, persist the chosen URL and private collector port for dashboard discovery, use a fresh working LaunchAgent label after the legacy label became stuck in macOS background-task registration, make Fleet discovery honor fallback local collector ports, and make the Link daemon fail fast if its control listener cannot bind.
- Verification: `bash -n scripts/install-telemetry-collector.sh setup.sh uninstall.sh`; `go test ./cmd/hivemind-linkd`; `./scripts/build-hivemind-linkd.sh`; `pnpm exec tsc --noEmit --pretty false`; `git diff --check -- scripts/install-telemetry-collector.sh setup.sh uninstall.sh cmd/hivemind-linkd/main.go src/app/api/fleet/discover/route.ts src/app/api/tailscale/devices/route.ts CHANGELOG.md`; `./setup.sh --non-interactive --skip-deps --skip-dashboard`; live checks confirmed `com.hivemindos.linkd.agent` is registered/running under launchd, nearest-available scanning chose distinct collector/control ports, Link `/health` returns the service marker, `/status` reports `Running`, `.env.local` persists the chosen `HIVE_LINK_CONTROL_URL` and `AGENT_TELEMETRY_PORT`, and `/api/fleet/discover` reports `This Mac` ready at the chosen local collector port.
- Intended commit message: `Avoid Link control port conflicts`

## 2026-05-26 09:54 UTC - Harden Env Sync Peer Targeting

- Status: Pushed
- Areas changed: hive env helper script, local telemetry collector service, changelog
- Summary: Reinstalled the local telemetry collector from the active checkout so this machine advertises the current collector on the tailnet, and made `hive-env-add` skip collectors that do not advertise HTTP env sync support instead of attempting secret pushes to stale collectors.
- Verification: `python3 -m py_compile scripts/hive-env-add`; local `/health` reports appDir `/root/omni-agent-hivemind`, commit `4eb54f3`, `envHttpSync=true`, and listener `0.0.0.0:8787`; `hive-env-add --reconcile` updated 2 HTTP-env-sync peers without stale-peer errors; sanitized remote checks verified `PEXELS_API_KEY=present` on the two HTTP-env-sync peers.
- Intended commit message: `Skip stale env sync collectors`

## 2026-05-26 18:32:38 WITA - Add HivemindOS Update Command

- Status: Pushed
- Areas changed: Update script, package scripts, changelog
- Summary: Add a one-command HivemindOS updater that fast-forward pulls the checkout, refreshes pnpm dependencies, builds the dashboard, restarts the telemetry collector/Link sidecar, and restarts the dashboard dev server when the port listener belongs to this checkout; expose it as `pnpm hive:update`.
- Verification: `bash -n scripts/update-hivemindos.sh`; `./scripts/update-hivemindos.sh --help`; `pnpm run hive:update -- --help`; `pnpm hive:update -- --help`; `node -e 'JSON.parse(require("fs").readFileSync("package.json", "utf8")); console.log("package.json ok")'`; `./scripts/update-hivemindos.sh --skip-pull --skip-install --skip-build --skip-collector --skip-dashboard`; `pnpm run hive:update -- --skip-pull --skip-install --skip-build --skip-collector --skip-dashboard`
- Intended commit message: `Add HivemindOS update command`

## 2026-05-26 18:05:10 WITA - Refine Agent Settings Header

- Status: Pushed
- Areas changed: Agent settings modal header, Fleet dashboard styling, changelog
- Summary: Remove the broad Agent Settings modal-header button container rule, move the edit pencil into a container-less inline control beside the agent name, and tune the header text spacing so the eyebrow, name/subclass pair, and description read as distinct groups.
- Verification: `pnpm exec eslint src/features/dashboard/views/chat/AgentSettingsModal.tsx --max-warnings=999`; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `git diff --check -- src/features/dashboard/views/chat/AgentSettingsModal.tsx src/app/fleet.module.css CHANGELOG.md`; audited remaining button-container selectors with `rg -n "button:not\\(\\[data-slot=\\\"button\\\"\\]|button \\{" src/app src/components src/features --glob '*.css' --glob '*.module.css'` and confirmed the modal-header auto-container rule is gone while scoped action/tab/menu button styling remains.
- Intended commit message: `Refine agent settings header`

## 2026-05-26 17:59:47 WITA - Standardize Close Icon Buttons

- Status: Pushed
- Areas changed: Shared close icon component, dashboard/modal close controls, attachment/remove chips, scheduler/task modal close controls, close-button CSS safeguards, changelog
- Summary: Add a reusable subtle circular close icon button and replace app-local close/dismiss/remove X affordances so modal headers, sheets, banners, attachment chips, and picker popovers share the same close treatment.
- Verification: `rg -n "<X|>x<|×|Close\\s*</Button>|Close\\s*</button>|import .*\\bX\\b.*from \\\"lucide-react\\\"" src/components src/features src/app --glob '*.tsx'` found only the reusable close component and unrelated X/Twitter/map text; `pnpm exec eslint src/components/ui/close-icon-button.tsx src/features/chat/chat-composer.tsx src/features/dashboard/views/AgentsPanel.tsx src/features/dashboard/views/KanbanPanel.tsx src/features/dashboard/views/SchedulerPanel.tsx src/features/dashboard/views/UtilityPanels.tsx src/features/dashboard/views/DashboardModals.tsx src/features/dashboard/views/chat/AgentSettingsModal.tsx src/features/dashboard/views/chat/ChatFolderModal.tsx src/features/dashboard/views/chat/SkillBrowserModal.tsx src/components/wallet/AgentWalletCard.tsx src/components/wallet/AgentWalletCardCompact.tsx src/components/fleet/footers.tsx src/components/fleet/FleetView.tsx src/components/fleet/roster.tsx src/components/task-modal/TaskModal.tsx src/components/swarm/template-composers.tsx --max-warnings=999` passed with existing unused eslint-disable warnings in AgentsPanel and SchedulerPanel; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `git diff --check -- src/components/ui/close-icon-button.tsx src/features/chat/chat-composer.tsx src/features/dashboard/views/AgentsPanel.tsx src/features/dashboard/views/KanbanPanel.tsx src/features/dashboard/views/SchedulerPanel.tsx src/features/dashboard/views/UtilityPanels.tsx src/features/dashboard/views/DashboardModals.tsx src/features/dashboard/views/chat/AgentSettingsModal.tsx src/features/dashboard/views/chat/ChatFolderModal.tsx src/features/dashboard/views/chat/SkillBrowserModal.tsx src/components/agents/AgentSelectionModal.tsx src/components/wallet/AgentWalletCard.tsx src/components/wallet/AgentWalletCardCompact.tsx src/components/fleet/footers.tsx src/components/fleet/FleetView.tsx src/components/fleet/roster.tsx src/components/task-modal/TaskModal.tsx src/components/swarm/template-composers.tsx src/app/fleet.module.css src/app/kanban-board.module.css src/app/chat.module.css src/components/wallet/AgentWalletCard.module.css CHANGELOG.md`; Playwright smoke loaded `http://127.0.0.1:5020/?view=chat` without restarting the managed dev server and confirmed the page rendered body content.
- Intended commit message: `Standardize close icon buttons`

## 2026-05-26 17:25:59 WITA - Compact Agent Runtime Model Picker

- Status: Pushed
- Areas changed: Agent settings model/runtime selector styling, runtime icon assets/config, changelog
- Summary: Remove the redundant model summary header, flatten the Hermes picker panel, make Runtime a compact icon segment, tint monochrome Hermes/OpenAI icons for dark backgrounds, use real image rendering for AEON/OpenClaw, and clean noisy non-red paths from the OpenClaw SVG.
- Verification: `sips -Z 128 -s format png /Users/liam/Downloads/aeon.jpg --out public/icons/runtimes/aeon.png`; `oxipng -o max --strip safe public/icons/runtimes/aeon.png`; `pnpm exec eslint src/features/dashboard/views/chat/AgentSettingsModal.tsx src/features/dashboard/DashboardApp.tsx src/lib/config/runtime-icons.ts --max-warnings=999` completed with existing DashboardApp warnings and no errors; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `git diff --check -- src/features/dashboard/views/chat/AgentSettingsModal.tsx src/features/dashboard/DashboardApp.tsx src/lib/config/runtime-icons.ts src/app/fleet.module.css public/icons/runtimes/hermes.svg public/icons/runtimes/openai.svg public/icons/runtimes/openclaw.svg public/icons/runtimes/aeon.png CHANGELOG.md`.
- Intended commit message: `Compact agent runtime model picker`

## 2026-05-26 17:24:04 WITA - Portal Dashboard Modals To Viewport

- Status: Pushed
- Areas changed: Agent settings modal, chat folder modal, Kanban task modal, shared env import modal, MoneyClaw key modal, Fleet network issue modal, changelog
- Summary: Portal the remaining dashboard modal backdrops to `document.body`, matching the Skill Browser fix, so fixed overlays center against the visible viewport instead of the scrolled dashboard page flow.
- Verification: `pnpm exec eslint src/features/dashboard/views/chat/AgentSettingsModal.tsx src/features/dashboard/views/chat/ChatFolderModal.tsx src/features/dashboard/views/KanbanPanel.tsx src/features/dashboard/views/UtilityPanels.tsx src/components/wallet/AgentWalletCard.tsx src/components/fleet/roster.tsx --max-warnings=999`; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `git diff --check -- src/features/dashboard/views/chat/AgentSettingsModal.tsx src/features/dashboard/views/chat/ChatFolderModal.tsx src/features/dashboard/views/KanbanPanel.tsx src/features/dashboard/views/UtilityPanels.tsx src/components/wallet/AgentWalletCard.tsx src/components/fleet/roster.tsx CHANGELOG.md`.
- Intended commit message: `Portal dashboard modals to viewport`

## 2026-05-26 17:18 WITA - Auto-Recover Hivemind Link Setup

- Status: Pushed
- Areas changed: Hivemind Link setup and telemetry collector installer
- Summary: Simplify Hivemind Link setup by hiding raw launchctl load noise, detecting stale embedded Tailscale identity/auth failures such as `node ... already exists`, automatically rotating local Link state, and retrying the sidecar startup once before asking the user to rerun setup.
- Verification: `bash -n scripts/install-telemetry-collector.sh setup.sh uninstall.sh`
- Intended commit message: `Auto-recover Hivemind Link setup`


## 2026-05-26 08:49 UTC - Harden Shared Hive Env

- Status: Pushed
- Areas changed: hive env helper scripts, setup/uninstall scripts, shared skill instructions, README, changelog
- Summary: Make `~/.hivemindos/.env` the default `hive-env-add` target, add generic `hive-env-check` and `hive-env-run` helpers so agents can verify/use shared credentials without reading values, install/uninstall all hive env helpers, and inject always-on shared hive env safety guidance into agent instruction blocks.
- Verification: `python3 -m py_compile scripts/hive-env-add scripts/hive-env-run scripts/hive-env-check`; `bash -n setup.sh uninstall.sh scripts/seed-shared-skills.sh`; temp-home smoke verified `hive-env-add` writes only the canonical `~/.hivemindos/.env`, `hive-env-check` prints present/absent without values, and `hive-env-run` makes the key available to a child process; live smoke verified `PEXELS_API_KEY=present` and `hive-env-run` exposes it as a boolean-only child-process check; verified installed `~/.local/bin` commands point to the active checkout and shared hive env guidance is present in Hermes/Codex/Claude/Gemini/OpenClaw/Aeon instruction files.
- Intended commit message: `Harden shared hive env helpers`

## 2026-05-26 16:37:01 WITA - Add Memory Telemetry And Long-Run Leak Guards

- Status: Pushed
- Areas changed: Memory telemetry API, More/Memory dashboard panel, dashboard polling guards, Honey ledger and notification route coalescing, MiroShark status caching, hive-env-add no-op writes, setup env writes
- Summary: Added `/api/memory-telemetry` with bounded in-memory RSS history, current Next.js heap/external metrics, per-process growth tracking, and leak suspect detection; added a Memory diagnostics panel under More; kept a 30-second background sampler running while the dashboard is open; hardened long-running pollers and frequently-hit APIs against overlapping requests; stopped same-value env writes from touching `.env.local` and triggering Next dev env reloads.
- Verification: `bash -n setup.sh && python3 -m py_compile scripts/hive-env-add`; same-value `scripts/hive-env-add --scope app --no-backup --no-tailnet-sync NEXT_PUBLIC_OBSIDIAN_KANBAN_FOLDER='Operations/Work Board'` preserved `.env.local` mtime; `curl -fsS http://127.0.0.1:5020/api/memory-telemetry` returned `ok: true` with app RSS/process growth data; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; targeted `pnpm exec eslint ... --max-warnings=999` completed with existing warnings and no errors; `git diff --check` on changed tracked files.
- Intended commit message: `Add memory telemetry and leak guards`

## 2026-05-26 16:00 WITA - Merge Legacy HivemindOS Vault Into Canonical Vault

- Status: Pushed
- Areas changed: Local Obsidian vault contents, Obsidian vault registry, local app vault configuration, migration audit notes, legacy vault cleanup
- Summary: Merged the legacy `/Users/liam/Documents/HivemindOS Vault` into `/Users/liam/Documents/Obsidian/hivemindos-vault`, preserved conflict variants/backups, pointed local HivemindOS and Obsidian config at the canonical vault, and removed the legacy live vault after validating the pre-merge backup archive.
- Verification: Pre-merge backup zip validated with `unzip -t`; merge report exists at `Operations/Vault Migrations/Legacy HivemindOS Vault Merge - 20260526T075755Z.md`; post-merge source-only count was zero before deleting the legacy vault; canonical key files were present; Obsidian registry now points at `/Users/liam/Documents/Obsidian/hivemindos-vault`; `.env.local` uses the canonical vault path and managed folder names; `/Users/liam/Documents/HivemindOS Vault` no longer exists.
- Intended commit message: `Merge legacy HivemindOS vault`

## 2026-05-26 15:26:19 WITA - Show Written Skills Immediately

- Status: Pushed
- Areas changed: Skill Browser state refresh, changelog
- Summary: After adding a written skill, merge the returned shared skills into the open Skill Browser card list and clear the search so the newly saved skill appears immediately.
- Verification: `pnpm exec eslint src/features/dashboard/hooks/use-miroshark-brain-controller.tsx src/features/dashboard/DashboardApp.tsx --max-warnings=999` passed with existing warnings; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `git diff --check -- src/features/dashboard/hooks/use-miroshark-brain-controller.tsx src/features/dashboard/DashboardApp.tsx CHANGELOG.md`.
- Intended commit message: `Show written skills immediately`

## 2026-05-26 15:18:01 WITA - Refine Skill Browser Toolbar

- Status: Pushed
- Areas changed: Skill Browser toolbar styling, Skill Browser modal markup, changelog
- Summary: Clean up the Skill Browser search/action section with a compact command rail, smaller secondary actions, improved input focus treatment, and calmer stacked status notices.
- Verification: `pnpm exec eslint src/features/dashboard/views/chat/SkillBrowserModal.tsx --max-warnings=999`; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `git diff --check -- src/features/dashboard/views/chat/SkillBrowserModal.tsx src/app/fleet.module.css CHANGELOG.md`.
- Intended commit message: `Refine skill browser toolbar`

## 2026-05-26 15:11:15 WITA - Add Skill Browser Writer

- Status: Pushed
- Areas changed: Chat skill browser modal, Obsidian skill API, brain skill service, Skill Browser styling, dashboard wiring, changelog
- Summary: Add a Write Skill mode to the Skill Browser with a markdown editor, Add Skill and Cancel actions, narrower search field, and server-side saving into the shared Obsidian `Skills/<slug>/SKILL.md` folder with README regeneration.
- Verification: `pnpm exec eslint src/features/dashboard/views/chat/SkillBrowserModal.tsx src/features/dashboard/DashboardApp.tsx src/features/dashboard/hooks/use-miroshark-brain-controller.tsx src/app/api/obsidian/skills/route.ts src/lib/services/obsidian/brain-skills.ts --max-warnings=999` passed with existing warnings; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `git diff --check -- src/features/dashboard/views/chat/SkillBrowserModal.tsx src/features/dashboard/DashboardApp.tsx src/features/dashboard/hooks/use-miroshark-brain-controller.tsx src/app/api/obsidian/skills/route.ts src/lib/services/obsidian/brain-skills.ts src/app/fleet.module.css CHANGELOG.md`; temporary-vault POST to `http://127.0.0.1:5020/api/obsidian/skills` created `Skills/writer-smoke-skill/SKILL.md` and `Skills/README.md`; `python3 -m json.tool ASSIMILATION.json`; `python3 /Users/liam/.codex/skills/github-assimilator/scripts/verify_assimilation_manifest.py`; Browser smoke opened the Shared Skills surface, but the current dashboard state did not expose the modal after clicking Browse skills.
- Intended commit message: `Add skill browser writer`

## 2026-05-26 15:03:21 WITA - Center Skill Browser In Viewport

- Status: Pushed
- Areas changed: Chat skill browser modal, changelog
- Summary: Portal the Skill Browser modal to `document.body` so its fixed backdrop centers against the visible viewport instead of the full page scroll area.
- Verification: `pnpm exec eslint src/features/dashboard/views/chat/SkillBrowserModal.tsx --max-warnings=999`; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `git diff --check -- src/features/dashboard/views/chat/SkillBrowserModal.tsx CHANGELOG.md`; Browser smoke loaded `http://127.0.0.1:5020/?view=chat`, but the current browser session had no connected machine/agent state, so the Skill Browser trigger was not available to click there.
- Intended commit message: `Center skill browser in viewport`

## 2026-05-26 14:56:16 WITA - Show Brain Module Install Failures

- Status: Pushed
- Areas changed: Brain module UI class, Brain Services dashboard, Brain Services styling, changelog
- Summary: Add a failed install state for brain module cards so failed GBrain install/connect attempts show a friendly recovery message instead of silently returning to the install state.
- Verification: `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `pnpm exec eslint src/features/dashboard/brain-modules.tsx src/features/dashboard/views/VaultPanel.tsx src/features/dashboard/DashboardApp.tsx src/lib/services/brain/trading-brain.ts --max-warnings=999` passed with existing dashboard warnings; `git diff --check -- src/features/dashboard/brain-modules.tsx src/features/dashboard/views/VaultPanel.tsx src/features/dashboard/DashboardApp.tsx src/features/dashboard/dashboard-types.ts src/lib/services/brain/trading-brain.ts src/app/api/brain/trading-brain src/app/vault.module.css CHANGELOG.md ASSIMILATION.json`.
- Intended commit message: `Show brain module install failures`

## 2026-05-26 14:46:29 WITA - Align Brain Module Install Buttons

- Status: Pushed
- Areas changed: Brain Services styling, changelog
- Summary: Make secondary install-row actions such as "Connect existing" share the same height, typography, icon sizing, and border language as the main install CTA.
- Verification: `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `pnpm exec eslint src/features/dashboard/brain-modules.tsx src/features/dashboard/views/VaultPanel.tsx src/features/dashboard/DashboardApp.tsx src/lib/services/brain/trading-brain.ts --max-warnings=999` passed with existing dashboard warnings; `git diff --check -- src/features/dashboard/brain-modules.tsx src/features/dashboard/views/VaultPanel.tsx src/features/dashboard/DashboardApp.tsx src/features/dashboard/dashboard-types.ts src/lib/services/brain/trading-brain.ts src/app/api/brain/trading-brain src/app/vault.module.css CHANGELOG.md ASSIMILATION.json`; Browser DOM smoke on `http://127.0.0.1:5020/?view=vault&vaultPanel=brain-services` measured install-row buttons at matching 50px heights with 13px/900 typography and no horizontal overflow.
- Intended commit message: `Align brain module install buttons`

## 2026-05-26 14:45:07 WITA - Hide Raw GBrain CLI Error From Install Card

- Status: Pushed
- Areas changed: Brain Services dashboard, changelog
- Summary: Keep the GBrain install card description stable and replace raw `spawn gbrain ENOENT` copy with a friendly CLI availability note when needed.
- Verification: `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `pnpm exec eslint src/features/dashboard/brain-modules.tsx src/features/dashboard/views/VaultPanel.tsx src/features/dashboard/DashboardApp.tsx src/lib/services/brain/trading-brain.ts --max-warnings=999` passed with existing dashboard warnings; `git diff --check -- src/features/dashboard/brain-modules.tsx src/features/dashboard/views/VaultPanel.tsx src/features/dashboard/DashboardApp.tsx src/features/dashboard/dashboard-types.ts src/lib/services/brain/trading-brain.ts src/app/api/brain/trading-brain src/app/vault.module.css CHANGELOG.md ASSIMILATION.json`; Browser DOM smoke on `http://127.0.0.1:5020/?view=vault&vaultPanel=brain-services` confirmed raw `spawn gbrain ENOENT` text is absent from the page and there is no horizontal overflow.
- Intended commit message: `Hide raw GBrain CLI error from install card`

## 2026-05-26 14:41:04 WITA - Hide Redundant Brain Service Install Footer

- Status: Pushed
- Areas changed: Brain Services dashboard, changelog
- Summary: Stop showing optional module "not installed yet" status text at the bottom of Brain Services now that install-state cards carry that context directly.
- Verification: `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `pnpm exec eslint src/features/dashboard/brain-modules.tsx src/features/dashboard/views/VaultPanel.tsx src/features/dashboard/DashboardApp.tsx src/lib/services/brain/trading-brain.ts --max-warnings=999` passed with existing dashboard warnings; `git diff --check -- src/features/dashboard/brain-modules.tsx src/features/dashboard/views/VaultPanel.tsx src/features/dashboard/DashboardApp.tsx src/features/dashboard/dashboard-types.ts src/lib/services/brain/trading-brain.ts src/app/api/brain/trading-brain src/app/vault.module.css CHANGELOG.md ASSIMILATION.json`; Browser DOM smoke on `http://127.0.0.1:5020/?view=vault&vaultPanel=brain-services` confirmed the not-installed footer text is absent and there is no horizontal overflow.
- Intended commit message: `Hide redundant brain service install footer`

## 2026-05-26 14:33:01 WITA - Split Brain Module Install And Installed States

- Status: Pushed
- Areas changed: Brain Services dashboard, brain module UI class, Brain Services styling, changelog
- Summary: Split BrainModule cards into install, installing, success, and installed views with feature-focused install cards, animated install progress, a timed checkmark success state, and operational controls shown only after installation.
- Verification: `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `pnpm exec eslint src/features/dashboard/brain-modules.tsx src/features/dashboard/views/VaultPanel.tsx src/features/dashboard/DashboardApp.tsx src/lib/services/brain/trading-brain.ts --max-warnings=999` passed with existing dashboard warnings; `git diff --check -- src/features/dashboard/brain-modules.tsx src/features/dashboard/views/VaultPanel.tsx src/features/dashboard/DashboardApp.tsx src/features/dashboard/dashboard-types.ts src/lib/services/brain/trading-brain.ts src/app/api/brain/trading-brain src/app/vault.module.css CHANGELOG.md ASSIMILATION.json`; Browser DOM smoke on `http://127.0.0.1:5020/?view=vault&vaultPanel=brain-services` found three module cards, install-state cards with feature rows and install buttons for optional modules, the installed Synthesis card, and no horizontal overflow.
- Intended commit message: `Split brain module install and installed states`

## 2026-05-26 14:18:34 WITA - Abstract Brain Services Into Brain Modules

- Status: Pushed
- Areas changed: Brain Services dashboard, brain module UI class, changelog
- Summary: Add a reusable `BrainModule` class for compact brain service cards and render GBrain, Trading Brain, and Synthesis through shared module definitions.
- Verification: `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `pnpm exec eslint src/features/dashboard/brain-modules.tsx src/features/dashboard/views/VaultPanel.tsx src/features/dashboard/DashboardApp.tsx src/lib/services/brain/trading-brain.ts --max-warnings=999` passed with existing dashboard warnings; `git diff --check -- src/features/dashboard/brain-modules.tsx src/features/dashboard/views/VaultPanel.tsx src/features/dashboard/DashboardApp.tsx src/features/dashboard/dashboard-types.ts src/lib/services/brain/trading-brain.ts src/app/api/brain/trading-brain src/app/vault.module.css CHANGELOG.md ASSIMILATION.json`; Browser DOM smoke on `http://127.0.0.1:5020/?view=vault&vaultPanel=brain-services` found three BrainModule-rendered cards for GBrain, Trading Brain, and Synthesis, found the Trading Brain runtime control, and found no horizontal overflow.
- Intended commit message: `Abstract brain services into modules`

## 2026-05-26 13:55:11 WITA - Remove Remotion Showcase And Simple Website

- Status: Pushed
- Areas changed: Remotion showcase files, Remotion package scripts/dependencies, Remotion ignore rules, simple website starter, changelog
- Summary: Remove the tracked Remotion showcase/capture setup and the standalone `sites/simple-website` starter, and ignore local Remotion working/output directories.
- Verification: `pnpm install --lockfile-only`; `pnpm typecheck`; `git diff --check -- .gitignore package.json pnpm-lock.yaml remotion public/remotion scripts/capture-remotion-showcase.mjs sites/simple-website src/features/dashboard/dashboard-storage.ts ROADMAP.md ASSIMILATION.json CHANGELOG.md`; `rg -n "remotion|Remotion|@remotion|capture-remotion|__HIVEMINDOS_REMOTION" --glob '!node_modules/**' --glob '!CHANGELOG.md' --glob '!pnpm-lock.yaml'` returned no matches.
- Intended commit message: `Remove Remotion showcase and simple website`

## 2026-05-26 13:48:25 WITA - Add Trading Brain Service Module

- Status: Pushed
- Areas changed: Brain Services dashboard, Obsidian brain service APIs, trading brain vault scaffold, changelog, assimilation manifest
- Summary: Add an optional Obsidian Trading Brain module that installs a structured trading vault, templates, strategy/rules notes, analysis prompts, pre-trade intelligence prompts, market intelligence briefs, and emotional journal tracking into the shared vault.
- Verification: `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `pnpm exec eslint src/lib/services/brain/trading-brain.ts src/app/api/brain/trading-brain/status/route.ts src/app/api/brain/trading-brain/install/route.ts src/features/dashboard/DashboardApp.tsx src/features/dashboard/views/VaultPanel.tsx --max-warnings=999` passed with existing dashboard warnings; `git diff --check -- src/lib/services/brain/trading-brain.ts src/app/api/brain/trading-brain/status/route.ts src/app/api/brain/trading-brain/install/route.ts src/features/dashboard/DashboardApp.tsx src/features/dashboard/views/VaultPanel.tsx src/features/dashboard/dashboard-types.ts src/app/vault.module.css CHANGELOG.md ASSIMILATION.json`; `python3 -m json.tool ASSIMILATION.json >/dev/null && python3 /Users/liam/.codex/skills/github-assimilator/scripts/verify_assimilation_manifest.py`; route smoke against the existing managed dev server returned Trading Brain uninstalled status for a temporary vault, then POST install created all folders, 13 scaffold files including agent-agnostic `AGENTS.md` and `runtime-instructions.md`, and the service note in a temporary vault; Browser DOM smoke on `http://127.0.0.1:5020/?view=vault&vaultPanel=brain-services` found the Trading Brain runtime controls and no horizontal overflow at 1280px.
- Intended commit message: `Add trading brain brain service module`

## 2026-05-26 13:17 WITA - Trust Ledger Honey Balances In Wallet UI

- Status: Pushed
- Areas changed: Honey ledger balance types, dashboard reward derivation, ledger normalization
- Summary: Make Wallets use official ledger `availableHoney` and `lifetimeHoney` balance rows when present, so pool-clipped rewards are not recomputed upward from raw token totals.
- Verification: `pnpm test:honey-economics`; `pnpm exec eslint src/lib/types/agent-wallet.ts src/lib/utils/agent-wallet.ts src/lib/services/wallet/honey-ledger.ts`; `pnpm typecheck`.
- Intended commit message: `Trust Honey ledger balance rows in wallet rewards`

## 2026-05-26 12:24:15 WITA - Fix Honey Convert Button Formatting

- Status: Pushed
- Areas changed: Wallets panel Honey/HIVE conversion control, Hive ledger header art, generated Honey icon assets, changelog
- Summary: Split the Honey-to-HIVE conversion label into stacked lines, let the compact button grow vertically, replace the generic conversion glyph with a generated transparent all-amber Honey/HIVE honeycomb icon, and add a generated transparent honey pot illustration beside the Hive ledger/Honey rewards header.
- Verification: `pnpm exec eslint src/features/dashboard/views/WalletPanel.tsx --max-warnings=999` passed with the existing unused eslint-disable warning; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `git diff --check -- src/features/dashboard/views/WalletPanel.tsx src/app/wallets.module.css CHANGELOG.md`; `curl -I --max-time 15 'http://localhost:5020/?view=wallets'` returned HTTP 200; Python/Pillow inspection of `public/icons/generated/honey-hive-icon.png` found 0 cyan/teal opaque pixels by the teal threshold; Playwright loaded the existing managed dev server, enabled the Honey ledger in localStorage for the test, opened Wallets, confirmed the convert icon loads, the honey pot image loads inside the Hive ledger rail, and the convert button had no horizontal or vertical overflow.
- Intended commit message: `Fix Honey convert button formatting`

## 2026-05-26 11:21:17 WITA - Rename Collector Copy To Agent Bridge

- Status: Pushed
- Areas changed: Chat runtime API, dashboard/fleet copy, integration setup copy, fleet/syncthing/scheduler API errors, changelog
- Summary: Replace user-facing "collector" terminology with "local agent bridge" or "agent bridge", including the Hermes fetch-failed chat error: "Queen Bee is connected through This Mac, but the local agent bridge did not respond. Try again in a moment."
- Verification: `pnpm exec eslint src/app/api/chat/agent-runtime/route.ts src/features/dashboard/dashboard-light-helpers.tsx src/features/dashboard/dashboard-display-helpers.tsx src/components/cells/statusCopy.ts src/components/cells/StatusPill.tsx src/components/cells/SecurityCell.tsx src/features/dashboard/hooks/use-dashboard-derived-state.tsx src/features/dashboard/hooks/use-chat-tree-controller.tsx src/features/dashboard/hooks/use-status-chat-input-controller.tsx src/features/dashboard/hooks/use-fleet-notifications-controller.tsx src/features/dashboard/DashboardApp.tsx src/features/dashboard/views/chat/AgentSettingsModal.tsx src/features/dashboard/views/DashboardModals.tsx src/features/dashboard/views/VaultPanel.tsx src/features/env/env-components.tsx src/features/integrations/NangoIntegrationsView.tsx src/app/api/fleet/update/route.ts src/app/api/fleet/snapshot/route.ts src/app/api/agents/runtime/route.ts src/app/api/scheduler/import/route.ts src/app/api/syncthing/pair/route.ts src/app/api/syncthing/status/route.ts src/app/api/machines/directories/route.ts 'src/app/api/runtimes/[runtime]/integrations/route.ts' src/app/api/obsidian/skills/auto-sync/route.ts src/app/api/chat/agent-session/route.ts src/lib/services/integrations/nango-host.ts src/lib/config/bee-worker-presets.ts src/components/fleet/fleet-data.ts --max-warnings=999` passed with existing warnings and no errors; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `git diff --check -- src/app/api/chat/agent-runtime/route.ts src/features/dashboard/dashboard-light-helpers.tsx src/features/dashboard/dashboard-display-helpers.tsx src/components/cells/statusCopy.ts src/components/cells/StatusPill.tsx src/components/cells/SecurityCell.tsx src/features/dashboard/hooks/use-dashboard-derived-state.tsx src/features/dashboard/hooks/use-chat-tree-controller.tsx src/features/dashboard/hooks/use-status-chat-input-controller.tsx src/features/dashboard/hooks/use-fleet-notifications-controller.tsx src/features/dashboard/DashboardApp.tsx src/features/dashboard/views/chat/AgentSettingsModal.tsx src/features/dashboard/views/DashboardModals.tsx src/features/dashboard/views/VaultPanel.tsx src/features/env/env-components.tsx src/features/integrations/NangoIntegrationsView.tsx src/app/api/fleet/update/route.ts src/app/api/fleet/snapshot/route.ts src/app/api/agents/runtime/route.ts src/app/api/scheduler/import/route.ts src/app/api/syncthing/pair/route.ts src/app/api/syncthing/status/route.ts src/app/api/machines/directories/route.ts 'src/app/api/runtimes/[runtime]/integrations/route.ts' src/app/api/obsidian/skills/auto-sync/route.ts src/app/api/chat/agent-session/route.ts src/lib/services/integrations/nango-host.ts src/lib/config/bee-worker-presets.ts src/components/fleet/fleet-data.ts CHANGELOG.md`.
- Intended commit message: `Rename collector copy to agent bridge`

## 2026-05-26 02:10:41 WITA - Hide Dashboard Context From Hermes Chat

- Status: Pushed
- Areas changed: Chat runtime API, Agent telemetry collector, changelog
- Summary: Stop sending the full dashboard context wrapper as the visible Hermes chat prompt; send the user's text as the CLI query, inject dashboard/vault/agent context through `HERMES_EPHEMERAL_SYSTEM_PROMPT`, run Hermes chat in quiet mode, buffer final CLI output, strip `session_id:` metadata, and translate abrupt stream disconnects into a clear collector-interrupted message.
- Verification: `node --check scripts/agent-telemetry-collector.mjs`; `pnpm exec eslint scripts/agent-telemetry-collector.mjs src/app/api/chat/agent-runtime/route.ts --max-warnings=999`; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `git diff --check -- scripts/agent-telemetry-collector.mjs src/app/api/chat/agent-runtime/route.ts CHANGELOG.md`; restarted `com.agent-control-room.telemetry` and confirmed `http://127.0.0.1:8787/health` returns `ok: true`.
- Intended commit message: `Hide dashboard context from Hermes chat`

## 2026-05-26 02:03:18 WITA - Fix Hermes Browser Tool Environment

- Status: Pushed
- Areas changed: Agent telemetry collector, chat runtime streaming, chat stream controller, changelog
- Summary: Fix Hermes child-process PATH inheritance so browser tooling can find the active Node runtime, make browser chat stall detection activity-based on stream chunks, and remove the route-level 120-second assistant-text guard that could cut off still-running Hermes sessions.
- Verification: `node --check scripts/agent-telemetry-collector.mjs`; `pnpm exec eslint scripts/agent-telemetry-collector.mjs src/app/api/chat/agent-runtime/route.ts src/features/dashboard/hooks/use-status-chat-input-controller.tsx --max-warnings=999` passed with existing hook warnings and no errors; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `git diff --check -- scripts/agent-telemetry-collector.mjs src/app/api/chat/agent-runtime/route.ts src/features/dashboard/hooks/use-status-chat-input-controller.tsx CHANGELOG.md`; restarted `com.agent-control-room.telemetry` and confirmed `http://127.0.0.1:8787/health` returns `ok: true`.
- Intended commit message: `Fix Hermes browser tool environment`

## 2026-05-26 01:50:42 WITA - Show Live Chat Streaming State

- Status: Pushed
- Areas changed: Chat message rendering, chat streaming styling, changelog
- Summary: Hide completed-message actions while the latest assistant response is still streaming, add a blinking inline caret and live “Still writing” pulse, and only reveal copy/Kanban actions after the stream finishes.
- Verification: `pnpm exec eslint src/features/dashboard/views/ChatPanel.tsx --max-warnings=999` passed with the existing unused eslint-disable warning; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `git diff --check -- src/features/dashboard/views/ChatPanel.tsx src/app/chat.module.css CHANGELOG.md`.
- Intended commit message: `Show live chat streaming state`

## 2026-05-26 01:42:28 WITA - Add Agent Prompt Cards To Chat

- Status: Pushed
- Areas changed: Chat runtime API, telemetry collector Hermes bridge, chat stream controller, chat message types/storage, chat panel UI, chat styling, changelog
- Summary: Add generic runtime prompt cards for clarify/approval-style stream events, preserve prompt metadata in chat history, let prompt choices fill the composer, pass prompt events through the runtime SSE normalizer, and fix the Hermes collector bridge so raw user text is used for session matching instead of replacing the dashboard context sent to Hermes.
- Verification: `node --check scripts/agent-telemetry-collector.mjs`; `pnpm exec eslint src/app/api/chat/agent-runtime/route.ts src/features/dashboard/hooks/use-status-chat-input-controller.tsx src/features/dashboard/views/ChatPanel.tsx --max-warnings=999` passed with existing split-dashboard warnings and no errors; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `git diff --check -- scripts/agent-telemetry-collector.mjs src/app/api/chat/agent-runtime/route.ts src/features/dashboard/hooks/use-status-chat-input-controller.tsx src/features/dashboard/views/ChatPanel.tsx src/features/dashboard/dashboard-types.ts src/features/dashboard/dashboard-storage.ts src/features/dashboard/hooks/use-dashboard-derived-state.tsx src/app/chat.module.css CHANGELOG.md`.
- Intended commit message: `Add agent prompt cards to chat`

## 2026-05-26 01:34:34 WITA - Fix Narrow Dashboard Nav Overflow

- Status: Pushed
- Areas changed: Dashboard shell header styling, dashboard nav test, changelog
- Summary: Make the dashboard topbar grid more elastic and constrain the primary nav to a scrollable lane so the Wallets and More links stay reachable on narrower viewports.
- Verification: `pnpm test:dashboard-nav`; `node --check scripts/test-dashboard-nav.mjs`; `git diff --check -- src/app/globals.css scripts/test-dashboard-nav.mjs CHANGELOG.md`; Playwright probe against the existing managed `http://127.0.0.1:5020/?view=chat` confirmed Fleet, Work, Brain, Chat, Wallets, and More stay inside the header/nav lane at 1536, 1280, 1100, 1024, 920, and 820px with no page errors.
- Intended commit message: `Fix narrow dashboard nav overflow`

## 2026-05-26 01:34:36 WITA - Bound Hermes Chat Stream Stalls

- Status: Pushed
- Areas changed: Chat runtime API, changelog
- Summary: Add server-side first-text and inactivity timeouts for Hermes/runtime SSE streams so a stream that only emits session/status frames fails with a diagnostic event instead of leaving the browser to hit its 130-second stall timer.
- Verification: `pnpm exec eslint src/app/api/chat/agent-runtime/route.ts --max-warnings=999`; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `git diff --check -- src/app/api/chat/agent-runtime/route.ts CHANGELOG.md`.
- Intended commit message: `Bound Hermes chat stream stalls`

## 2026-05-26 01:26:08 WITA - Add Simple Website Starter

- Status: Pushed
- Areas changed: Simple static website starter, changelog
- Summary: Add a standalone responsive one-page website under `sites/simple-website` with a hero, service cards, proof section, contact call-to-action, and a small preview-toast interaction.
- Verification: Static HTML parser checks passed for doctype, title, viewport, responsive media query, required section IDs, anchor targets, and click-toast script; `git diff --check -- sites/simple-website/index.html sites/simple-website/README.md CHANGELOG.md`; attempted browser visual verification but the browser tool failed with `env: node: No such file or directory`.
- Intended commit message: `Add simple website starter`

## 2026-05-26 01:22:22 WITA - Animate Copied Chat Action

- Status: Pushed
- Areas changed: Chat assistant copy action, chat styling, changelog
- Summary: Swap the copy icon to a lightly animated checkmark after a successful copy and force the shared tooltip open with `Copied!` during the success state.
- Verification: `pnpm exec eslint src/features/dashboard/views/ChatPanel.tsx --max-warnings=999` passed with the existing unused eslint-disable warning; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `git diff --check -- src/features/dashboard/views/ChatPanel.tsx src/app/chat.module.css CHANGELOG.md`; Playwright smoke against `http://127.0.0.1:5020/?view=chat` loaded with no page errors or runtime error and confirmed the transparent override plus check animation CSS are present.
- Intended commit message: `Animate copied chat action`

## 2026-05-26 01:19:07 WITA - Add Chat Action Tooltips

- Status: Pushed
- Areas changed: Chat assistant message actions, chat styling, changelog
- Summary: Increase resting contrast for assistant copy/Kanban ghost icons and wrap both controls in the shared Tooltip component with concise hover labels.
- Verification: `pnpm exec eslint src/features/dashboard/views/ChatPanel.tsx --max-warnings=999` passed with the existing unused eslint-disable warning; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `git diff --check -- src/features/dashboard/views/ChatPanel.tsx src/app/chat.module.css CHANGELOG.md`; Playwright smoke against `http://127.0.0.1:5020/?view=chat` loaded with no page errors or runtime error and confirmed the transparent action override, higher contrast color, and thin icon stroke are present.
- Intended commit message: `Add chat action tooltips`

## 2026-05-26 01:17:11 WITA - Refine Chat Action Icons

- Status: Pushed
- Areas changed: Chat assistant message action styling, changelog
- Summary: Override the global chat button treatment for assistant message actions so copy and Kanban controls render as small transparent ghost icons with lighter strokes instead of teal filled buttons.
- Verification: `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `pnpm test:gbrain-foundation`; `pnpm test:dashboard-nav`; `node --check scripts/agent-telemetry-collector.mjs && node --check scripts/seed-vault-foundation.mjs && node --check scripts/test-gbrain-foundation.mjs && node --check scripts/test-dashboard-nav.mjs`; `git diff --check`.
- Intended commit message: `Refine chat action icons`

## 2026-05-26 01:14:52 WITA - Move Chat Message Actions Inline

- Status: Pushed
- Areas changed: Chat assistant message actions, chat styling, changelog
- Summary: Move assistant response actions below the message content, replace the floating boxed Kanban control with subtle inline icon buttons, and add a matching copy-response button.
- Verification: `pnpm exec eslint src/features/dashboard/views/ChatPanel.tsx --max-warnings=999` passed with the existing unused eslint-disable warning; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `git diff --check -- src/features/dashboard/views/ChatPanel.tsx src/app/chat.module.css CHANGELOG.md`; static CSS/code check confirmed `.messageActions` is no longer sticky, the old absolute `.generateKanbanButton` was replaced by `.messageActionButton`, and assistant responses now render copy plus Kanban actions below content; Playwright smoke against `http://127.0.0.1:5020/?view=chat` loaded with no page errors or runtime error, with only the existing HMR websocket warning.
- Intended commit message: `Move chat message actions inline`

## 2026-05-26 01:06:41 WITA - Animate Chat Response Loading

- Status: Pushed
- Areas changed: Chat response loading UI, chat composer utilities, dashboard chat wiring, chat styling, assimilation manifest, changelog
- Summary: Replace the static `Waiting for response...` assistant placeholder with a Honey bee Lottie loader and cycling animated status text adapted from the Claw Code mobile thinking indicator.
- Verification: `pnpm exec eslint src/features/chat/chat-composer.tsx src/features/dashboard/DashboardApp.tsx src/features/dashboard/views/ChatPanel.tsx --max-warnings=999` passed with existing DashboardApp/ChatPanel warnings; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `python3 -m json.tool ASSIMILATION.json >/dev/null && python3 /Users/liam/.codex/skills/github-assimilator/scripts/verify_assimilation_manifest.py`; `git diff --check -- src/features/chat/chat-composer.tsx src/features/dashboard/DashboardApp.tsx src/features/dashboard/views/ChatPanel.tsx src/app/chat.module.css CHANGELOG.md ASSIMILATION.json`; Playwright smoke against `http://127.0.0.1:5020/?view=chat` loaded title `HivemindOS` with no page errors or Next runtime error, with only the existing HMR websocket warning.
- Intended commit message: `Animate chat response loading`

## 2026-05-26 00:58:37 WITA - Fix Hermes Picker Tooltip Provider

- Status: Pushed
- Areas changed: Chat composer, changelog
- Summary: Wrap the Hermes slash-command picker tooltip in the shared TooltipProvider so the composer can render safely anywhere it is used.
- Verification: `pnpm exec eslint src/features/chat/chat-composer.tsx --max-warnings=0`; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `git diff --check -- src/features/chat/chat-composer.tsx CHANGELOG.md`; Playwright smoke against `http://127.0.0.1:5020/?view=chat` loaded title `HivemindOS` with no page errors and no TooltipProvider runtime error, with only the existing HMR websocket warning.
- Intended commit message: `Fix Hermes picker tooltip provider`

## 2026-05-26 00:48:02 WITA - Add Hermes Slash Command Picker

- Status: Pushed
- Areas changed: Chat composer, Hermes chat input runtime behavior, chat runtime API, chat styling, assimilation manifest, changelog
- Summary: Show a large scrollable Hermes slash-command tooltip over the chat composer when the selected chat agent uses the Hermes runtime and the message starts with `/`; filter commands as the user types, support mouse and keyboard selection, insert the selected command back into the composer, and pass Hermes slash commands through to the runtime without dashboard context wrapping.
- Verification: `pnpm exec eslint src/features/chat/chat-composer.tsx src/features/dashboard/views/ChatPanel.tsx src/app/api/chat/agent-runtime/route.ts --max-warnings=999` passed with the existing unused eslint-disable warning in `ChatPanel.tsx`; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `git diff --check -- src/features/chat/chat-composer.tsx src/features/dashboard/views/ChatPanel.tsx src/app/chat.module.css src/app/api/chat/agent-runtime/route.ts CHANGELOG.md ASSIMILATION.json`; `python3 -m json.tool ASSIMILATION.json >/dev/null && python3 /Users/liam/.codex/skills/github-assimilator/scripts/verify_assimilation_manifest.py`; Playwright smoke against `http://127.0.0.1:5020/?view=chat` loaded title `HivemindOS` with only the existing HMR websocket warning, though the current live state did not render a chat textarea to exercise the picker visually.
- Intended commit message: `Add Hermes slash command picker`

## 2026-05-26 00:44:20 WITA - Use Directory Picker For Chat Folders

- Status: Pushed
- Areas changed: Chat sidebar machine directory action, local folder picker API, machine directory chooser, chat tree controller, changelog
- Summary: Change the machine-level chat folder action from a manual create-folder form to the existing machine directory picker, using the native macOS folder picker for this Mac and the custom directory browser for remote machines; selecting a directory adds it to chat history and opens a fresh chat there. Guard against pathless picker results so chat creation does not crash before loading the selected directory.
- Verification: `pnpm exec eslint src/features/dashboard/hooks/use-chat-tree-controller.tsx src/features/dashboard/views/ChatPanel.tsx src/features/dashboard/DashboardApp.tsx --max-warnings=999` passed with existing warnings and no errors; `pnpm exec eslint src/features/dashboard/hooks/use-chat-tree-controller.tsx src/features/dashboard/hooks/use-miroshark-brain-controller.tsx src/app/api/agents/browse-folder/route.ts --max-warnings=999` passed with existing warnings and no errors; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `git diff --check -- src/features/dashboard/hooks/use-chat-tree-controller.tsx src/features/dashboard/hooks/use-miroshark-brain-controller.tsx src/app/api/agents/browse-folder/route.ts CHANGELOG.md`.
- Intended commit message: `Use directory picker for chat folders`

## 2026-05-26 00:44 WITA - Segment Nango Host Setup

- Status: Pushed
- Areas changed: Integrations dashboard setup UI, changelog
- Summary: Replace the stacked Automatic Setup and Manual Fallback blocks with a segmented Automatic Setup / Manual Setup control, and keep setup success or error messages inside the automatic setup panel below the Run setup action.
- Verification: `pnpm exec eslint src/features/integrations/NangoIntegrationsView.tsx --max-warnings=0`; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `git diff --check -- src/features/integrations/NangoIntegrationsView.tsx src/app/integrations/integrations.module.css CHANGELOG.md`; Playwright smoke against `http://localhost:5020/?view=integrations` confirmed the segmented Manual Setup tab switches on, manual commands render only there, and no relevant console errors were reported.
- Intended commit message: `Segment Nango host setup`

## 2026-05-26 00:23:01 WITA - Show Fresh Chat In History

- Status: Pushed
- Areas changed: Dashboard chat sidebar history, changelog
- Summary: Add the currently selected empty fresh chat leaf to the chat history as an active `New Chat` row, sort active chats above older history, and omit stale relative timestamps from the draft row.
- Verification: `pnpm exec eslint src/features/dashboard/hooks/use-chat-tree-controller.tsx --max-warnings=999` passed with existing hook warnings and no errors; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `git diff --check -- src/features/dashboard/hooks/use-chat-tree-controller.tsx CHANGELOG.md`.
- Intended commit message: `Show fresh chat in history`

## 2026-05-26 00:15:43 WITA - Keep Honey Rewards Off Bankr LLM

- Status: Pushed
- Areas changed: Chat runtime API, Honey ledger recording, changelog
- Summary: Stop the global Honey rewards toggle from routing chat through the Bankr-backed compute gateway. Hermes/OpenAI-Codex and other configured runtimes now stay on their selected runtime; Honey usage is recorded after direct runtime responses through the observed-usage reward path instead of replacing the model provider with Bankr LLM.
- Verification: `pnpm exec eslint src/app/api/chat/agent-runtime/route.ts src/lib/services/wallet/honey-ledger.ts --max-warnings=0`; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `git diff --check -- src/app/api/chat/agent-runtime/route.ts src/lib/services/wallet/honey-ledger.ts CHANGELOG.md`; route smoke with `honeyLedgerEnabled: true` and a Hermes/OpenAI-Codex profile no longer returned 402 from the Bankr gateway, instead following the normal Hermes runtime path and returning the expected dead-runtime 502 for an intentionally unreachable local URL.
- Intended commit message: `Keep Honey rewards off Bankr LLM`

## 2026-05-26 00:12:45 WITA - Submit Chat With Enter On Desktop

- Status: Pushed
- Areas changed: Chat composer keyboard handling, dashboard chat surfaces, changelog
- Summary: Let desktop users press Enter to submit the main chat and task-agent chat composers while preserving Shift+Enter for newlines and leaving coarse-pointer mobile devices on newline-by-default behavior.
- Verification: `pnpm exec eslint src/features/chat/chat-composer.tsx src/features/dashboard/views/ChatPanel.tsx src/features/dashboard/views/KanbanPanel.tsx --max-warnings=999` passed with one existing unused eslint-disable warning in `ChatPanel.tsx` and no errors; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `git diff --check -- src/features/chat/chat-composer.tsx src/features/dashboard/views/ChatPanel.tsx src/features/dashboard/views/KanbanPanel.tsx CHANGELOG.md`; Playwright loaded `http://127.0.0.1:5020/?view=chat` with title `HivemindOS` and only the existing dev HMR websocket warning, though the live state did not render a chat textarea for end-to-end keypress exercise.
- Intended commit message: `Submit chat with Enter on desktop`

## 2026-05-26 00:09 WITA - Deduplicate Fleet Polling Memory Work

- Status: Pushed
- Areas changed: Fleet discovery API, fleet snapshot API, dashboard polling, app version API, MiroShark status API, remote skill/Nango fleet consumers, changelog
- Summary: Make fleet discovery lightweight by default instead of embedding collector snapshots, keep full discovery snapshots available behind `includeSnapshots=1`, add short in-flight/cache deduplication for discovery/snapshot/version/MiroShark status calls, abort overlapping dashboard polls, and send only snapshot-relevant agent/vault fields in periodic snapshot requests.
- Verification: `pnpm exec eslint src/app/api/fleet/discover/route.ts src/app/api/fleet/snapshot/route.ts src/app/api/app/version/route.ts src/app/api/miroshark/status/route.ts src/lib/services/miroshark/companion-client.ts src/lib/services/fleet/remote-skill-providers.ts src/features/integrations/NangoIntegrationsView.tsx src/features/dashboard/hooks/use-fleet-notifications-controller.tsx src/features/dashboard/DashboardApp.tsx --max-warnings=999`; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `git diff --check -- src/app/api/fleet/discover/route.ts src/app/api/fleet/snapshot/route.ts src/app/api/app/version/route.ts src/app/api/miroshark/status/route.ts src/lib/services/miroshark/companion-client.ts src/lib/services/fleet/remote-skill-providers.ts src/features/integrations/NangoIntegrationsView.tsx src/features/dashboard/hooks/use-fleet-notifications-controller.tsx src/features/dashboard/DashboardApp.tsx`; live endpoint smoke confirmed default discovery returns 0 snapshots and 13.6KB, `includeSnapshots=1` still returns snapshots, repeat discovery/snapshot/version/MiroShark calls use cached paths in single-digit milliseconds, 24 concurrent mixed endpoint requests all returned 200, and Playwright dashboard smoke returned 200/title `HivemindOS` with only the existing dev HMR websocket warning.
- Intended commit message: `Deduplicate fleet polling memory work`

## 2026-05-26 00:07 WITA - Move Nango Setup Into Host Panel

- Status: Pushed
- Areas changed: Integrations dashboard UI, changelog
- Summary: Move the Nango automatic setup and manual fallback section from Provider Access into the bottom of the Host panel, and keep setup controls in that single host-focused location.
- Verification: `pnpm exec eslint src/features/integrations/NangoIntegrationsView.tsx --max-warnings=0`; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `git diff --check -- src/features/integrations/NangoIntegrationsView.tsx CHANGELOG.md`; Playwright smoke against `http://127.0.0.1:5020/?view=integrations` confirmed Host Setup Commands renders after Host and before Provider Access, the Run setup action remains visible, and no relevant console errors were reported.
- Intended commit message: `Move Nango setup into host panel`

## 2026-05-26 00:01:59 WITA - Fix Fresh Chat Leaf Display

- Status: Pushed
- Areas changed: Dashboard chat derived state, changelog
- Summary: Keep explicitly selected fresh chat leaves empty when they have no messages yet instead of falling back to the agent's default transcript, so New chat buttons visibly open a new conversation immediately.
- Verification: `pnpm exec eslint src/features/dashboard/hooks/use-dashboard-derived-state.tsx --max-warnings=999` passed with existing hook dependency warnings and no errors; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `git diff --check -- src/features/dashboard/hooks/use-dashboard-derived-state.tsx CHANGELOG.md`; static guard check confirmed the fresh-leaf empty return is present.
- Intended commit message: `Fix fresh chat leaf display`

## 2026-05-25 23:48 WITA - Auto-Sync Vault Automations On Open

- Status: Pushed
- Areas changed: Automations dashboard, shared schedule vault sync, changelog
- Summary: Automatically sync shared vault schedule templates when the Automations view opens, so seeded Foundation workflows appear without manually clicking Sync vault.
- Verification: `pnpm test:gbrain-foundation`; `pnpm exec eslint src/features/dashboard/DashboardApp.tsx --max-warnings=999` passed with existing dashboard warnings and no errors; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `git diff --check -- src/features/dashboard/DashboardApp.tsx scripts/test-gbrain-foundation.mjs CHANGELOG.md`.
- Intended commit message: `Auto-sync vault automations on open`

## 2026-05-25 23:44 WITA - Speed Up Kanban Board Loading

- Status: Pushed
- Areas changed: Kanban API response shaping, Kanban file-backed board metadata loading, dashboard Kanban polling, ready-task orchestration timing, changelog
- Summary: Make ordinary Kanban refreshes read the selected board without listing every board, add a lightweight boards-only refresh path, read board dropdown metadata from the beginning of board files instead of normalizing full task payloads, cap comments/events/runs returned by board reads, and defer automatic ready-task pickup until after the board has painted.
- Verification: `pnpm exec eslint src/app/api/kanban/route.ts src/lib/services/kanban/local-kanban-store.ts src/features/dashboard/hooks/use-dashboard-polling-effects.tsx src/features/dashboard/hooks/use-fleet-notifications-controller.tsx src/features/dashboard/hooks/use-kanban-dispatch-controller.tsx --max-warnings=999` passed with existing dashboard warnings and no errors; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; Kanban API smoke confirmed `include_boards=false` omits board summaries and caps events while `boards_only=true` returns 14 board summaries for the HivemindOS project board folder; Browser smoke against `http://127.0.0.1:5020/?view=kanban` rendered Workboard/storage status with no Kanban error; `git diff --check -- src/app/api/kanban/route.ts src/lib/services/kanban/local-kanban-store.ts src/features/dashboard/hooks/use-dashboard-polling-effects.tsx src/features/dashboard/hooks/use-fleet-notifications-controller.tsx src/features/dashboard/hooks/use-kanban-dispatch-controller.tsx CHANGELOG.md`; `pnpm test:kanban` remains blocked by an existing stale split-era regression guard that still scans `src/app/page.tsx` for Kanban helpers.
- Intended commit message: `Speed up Kanban board loading`

## 2026-05-25 23:42 WITA - Add One-Click Nango Host Setup

- Status: Pushed
- Areas changed: Nango integration setup API, telemetry collector Nango setup endpoint, shared Nango host service, integrations dashboard UI, integration styles, integration types, changelog
- Summary: Replace the manual-only Nango host setup instructions with an automatic setup action that saves the selected host, prefers the existing HivemindOS collector API over SSH, runs an idempotent Nango install/start script, installs git/Docker through apt on Ubuntu when needed, writes Nango host env values, starts Docker Compose, checks Nango health, and keeps SSH plus manual commands as fallbacks.
- Verification: `node --check scripts/agent-telemetry-collector.mjs`; `pnpm exec eslint src/app/api/integrations/nango/route.ts src/app/api/integrations/nango/setup/route.ts src/lib/services/integrations/nango-client.ts src/lib/services/integrations/nango-host.ts src/lib/types/integrations.ts src/features/integrations/NangoIntegrationsView.tsx --max-warnings=0`; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `curl --max-time 10 -sS http://127.0.0.1:5020/api/integrations/nango` returned the saved Ubuntu Nango base URL and setup commands; Playwright smoke against `http://127.0.0.1:5020/?view=integrations` confirmed the setup button and manual fallback render, Integrations is not in the primary nav, and there are no relevant console errors; `python3 -m json.tool ASSIMILATION.json >/dev/null && python3 /Users/liam/.codex/skills/github-assimilator/scripts/verify_assimilation_manifest.py`; `git diff --check -- ASSIMILATION.json scripts/agent-telemetry-collector.mjs src/app/api/integrations/nango/setup/route.ts src/lib/services/integrations/nango-host.ts src/lib/types/integrations.ts src/features/integrations/NangoIntegrationsView.tsx src/app/integrations/integrations.module.css CHANGELOG.md`
- Intended commit message: `Add one-click Nango host setup`

## 2026-05-25 23:37 WITA - Seed Self-Writing Vault Workflows

- Status: Pushed
- Areas changed: Foundation vault seeder, setup/uninstall mirrors, self-writing workflow templates, assimilation manifest, static foundation test, shared Obsidian vault
- Summary: Adapt the self-writing vault architecture into HivemindOS Foundation without adding numbered folder schemes, seeding six disabled automation templates under `Operations/Automations/Foundation Workflows`, routing generated context into `Memory/` and `Synthesis/`, routing requests through `Intake/Requests` and `Operations/Work Board`, and keeping every workflow auditable and opt-in.
- Verification: `pnpm test:gbrain-foundation`; `bash -n setup.sh && bash -n uninstall.sh`; `python3 -m json.tool ASSIMILATION.json >/dev/null && python3 /Users/liam/.codex/skills/github-assimilator/scripts/verify_assimilation_manifest.py`; `node scripts/seed-vault-foundation.mjs --vault /Users/liam/Documents/Obsidian/hivemindos-vault` created six disabled live vault workflow templates; temp-vault seeding was idempotent and honored a custom scheduled-folder path; `node --check scripts/seed-vault-foundation.mjs`; `git diff --check -- scripts/seed-vault-foundation.mjs scripts/test-gbrain-foundation.mjs setup.sh setup.ps1 uninstall.sh uninstall.ps1 ASSIMILATION.json CHANGELOG.md`; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; PowerShell parse skipped because `pwsh` is unavailable.
- Intended commit message: `Seed self-writing vault workflows`

## 2026-05-25 23:02 WITA - Add Work History Segment

- Status: Pushed
- Areas changed: Work view routing, dynamic work-history API, project changelog parser, History UI filters, pagination/loading, dashboard styling, changelog
- Summary: Add a fourth Work view segmented tab named History as a dynamic cross-project changelog feed, scanning known local project roots plus the shared brain vault Projects folder for `CHANGELOG.md`, parsing entries, caching the scan briefly, and serving a 10-record paginated feed with project/search filters instead of relying on Kanban completion state.
- Verification: `curl --max-time 20 'http://127.0.0.1:5020/api/work-history?limit=10'` returned 10 entries with `totalEntries`, `offset`, `limit`, and `hasMore`; `curl --max-time 20 'http://127.0.0.1:5020/api/work-history?limit=10&offset=10'` returned the second page; `curl --max-time 20 'http://127.0.0.1:5020/api/work-history?limit=10&q=GBrain'` returned a filtered result set; compact commit-message badges strip surrounding backticks; `pnpm exec eslint src/features/dashboard/views/KanbanPanel.tsx src/app/api/work-history/route.ts src/lib/services/work-history/dynamic-changelog.ts src/lib/types/work-history.ts src/app/page.tsx --max-warnings=999`; `git diff --check -- CHANGELOG.md src/app/page.tsx src/app/api/work-history/route.ts src/lib/services/work-history/dynamic-changelog.ts src/lib/types/work-history.ts src/features/dashboard/DashboardApp.tsx src/features/dashboard/views/KanbanPanel.tsx src/features/dashboard/hooks/use-dashboard-derived-state.tsx src/features/dashboard/dashboard-types.ts src/features/dashboard/dashboard-light-helpers.tsx src/app/kanban-board.module.css`; Browser/Playwright smoke against `http://127.0.0.1:5020/?view=history` confirmed 10 rendered rows, a `Load 10 more` control, and no literal backticked badge text, though the managed 5020 server did not dispatch client button clicks during automation and reported only the existing dev HMR websocket warning; `pnpm exec tsc --noEmit --pretty false --skipLibCheck` is blocked by an existing `src/lib/services/kanban/local-kanban-store.ts` Buffer type error outside this History change.
- Intended commit message: `Add work history segment`

## 2026-05-25 22:59 WITA - Add Default GBrain Vault Foundation

- Status: Pushed
- Areas changed: Shared vault architecture defaults, GBrain brain-service API, Vault dashboard Brain Services surface, shared skill discovery, scheduled/brain service vault paths, setup/uninstall mirror prompts, assimilation manifest, static foundation test
- Summary: Move HivemindOS-managed vault state into canonical Foundation folders, keep Synto under `Synthesis/`, always seed a disabled GBrain service note/config surface by default, add first-class GBrain status/install/connect/import/embed/dream/query flows, namespace GBrain skillpack imports under `Skills/GBrain`, and preserve legacy paths through non-destructive migration/read fallbacks.
- Verification: `pnpm test:gbrain-foundation`; `node scripts/test-gbrain-foundation.mjs`; `bash -n setup.sh && bash -n uninstall.sh`; `rg -n "Enable optional GBrain integration surface|gbrain_surface|gbrainSurface" setup.sh setup.ps1 scripts/test-gbrain-foundation.mjs CHANGELOG.md` confirmed only the static no-prompt assertion remains; `python3 -m json.tool ASSIMILATION.json >/dev/null && python3 /Users/liam/.codex/skills/github-assimilator/scripts/verify_assimilation_manifest.py`; `pnpm exec eslint src/app/page.tsx src/lib/types/agent-runtime.ts src/features/dashboard/dashboard-storage.ts src/lib/services/obsidian/brain-skills.ts src/lib/services/obsidian/scheduled-runs.ts src/lib/services/obsidian/brain-graph.ts src/lib/services/brain/gbrain.ts src/app/api/brain/gbrain/status/route.ts src/app/api/brain/gbrain/install/route.ts src/app/api/brain/gbrain/connect/route.ts src/app/api/brain/gbrain/import/route.ts src/app/api/brain/gbrain/embed/route.ts src/app/api/brain/gbrain/dream/route.ts src/app/api/brain/gbrain/query/route.ts src/features/dashboard/DashboardApp.tsx src/features/dashboard/views/VaultPanel.tsx --max-warnings=999` passed with existing dashboard warnings; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; Browser smoke on `http://127.0.0.1:5020/?view=vault&vaultPanel=brain-services` rendered the Brain Services tab, GBrain/Synthesis cards, Install/Connect actions, and no console errors; `git diff --check`; PowerShell parse skipped because `pwsh` is unavailable in this environment.
- Intended commit message: `Add default GBrain vault foundation`

## 2026-05-25 22:46 WITA - Fix Fleet List Table Hydration

- Status: Pushed
- Areas changed: Fleet list table rendering, changelog
- Summary: Replace nested machine-group `<tbody>` elements with keyed React fragments so the fleet list table renders valid direct row children and avoids the Next.js hydration warning.
- Verification: `pnpm exec eslint src/components/fleet/list-view.tsx --max-warnings=0`; `git diff --check -- src/components/fleet/list-view.tsx CHANGELOG.md`; `rg -n "<tbody|</tbody|React\\.Fragment" src/components/fleet/list-view.tsx`; Browser smoke against `http://127.0.0.1:5020/?view=fleet` loaded without hydration/tbody console errors, though the live fleet table had no rows on that server.
- Intended commit message: `Fix fleet list table hydration`

## 2026-05-25 21:43 WITA - Keep Remote Skill Inventory Lightweight

- Status: Pushed
- Areas changed: Telemetry collector skills endpoint, remote skill provider fetcher, Obsidian skills API
- Summary: Stop ordinary `/skills` inventory scans from embedding every skill source file, add an explicit `includeSourceFiles=true` mode for import operations, and give remote imports a longer timeout while keeping dashboard provider-card aggregation fast enough to include remote machines.
- Verification: `node --check scripts/agent-telemetry-collector.mjs`; `pnpm exec eslint src/lib/services/fleet/remote-skill-providers.ts src/app/api/obsidian/skills/route.ts scripts/agent-telemetry-collector.mjs --max-warnings=0`; `git diff --check`
- Intended commit message: `Keep remote skill inventory lightweight`

## 2026-05-25 21:47 WITA - Fix Collector Skill Query Parsing

- Status: Pushed
- Areas changed: Telemetry collector skills endpoint
- Summary: Fix the `/skills` endpoint to read `includeSourceFiles` from the live request URL object instead of an undefined parser variable so updated remote collectors can return lightweight inventories.
- Verification: `node --check scripts/agent-telemetry-collector.mjs`; `pnpm exec eslint scripts/agent-telemetry-collector.mjs --max-warnings=0`; `git diff --check -- scripts/agent-telemetry-collector.mjs CHANGELOG.md`
- Intended commit message: `Fix collector skill query parsing`

## 2026-05-25 21:41 WITA - Constrain Shared Skills Shelf Height

- Status: Pushed
- Areas changed: Shared skills vault styling, shared skills loading state, changelog
- Summary: Turn the shared brain skills grid into its own scrollview, cap desktop height to two card rows, let mobile use a viewport-based scroll height with a single-column layout, and replace the whole Shared Skills view below the segmented tabs with an animated scanning state while provider skills are loading.
- Verification: `git diff --check -- src/app/vault.module.css CHANGELOG.md`; Browser smoke against `http://127.0.0.1:5020/?view=vault` confirmed the compiled `.sharedSkillGrid` CSS includes vertical scrolling, stable scrollbar gutter, the mobile single-column rule, and the desktop two-row `600px` max-height rule.
- Intended commit message: `Constrain shared skills shelf height`

## 2026-05-25 21:08 WITA - Repair Collector Update Verification

- Status: Pushed
- Areas changed: Fleet update API, telemetry collector self-update command, dashboard machine update capability checks, changelog
- Summary: Make collector self-updates rerun the telemetry collector installer after setup so the systemd service restarts onto the newest route set, teach the dashboard update flow to detect missing shared-skill collector capabilities, and require `skillInventory`/`skillAutoSync` during update verification when a machine is missing those endpoints.
- Verification: `node --check scripts/agent-telemetry-collector.mjs`; `pnpm exec eslint src/app/api/fleet/update/route.ts src/features/dashboard/DashboardApp.tsx src/features/dashboard/dashboard-display-helpers.tsx src/features/dashboard/hooks/use-dashboard-derived-state.tsx src/features/dashboard/hooks/use-fleet-notifications-controller.tsx scripts/agent-telemetry-collector.mjs --max-warnings=999` passed with pre-existing dashboard split warnings and no errors; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `git diff --check`
- Intended commit message: `Repair collector update verification`

## 2026-05-25 20:51 WITA - Gate Hetzner Machine Creation

- Status: Pushed
- Areas changed: Hetzner token API, Hetzner machine initializer modal, fleet styling, dashboard controller types, changelog
- Summary: Split the New Hetzner agent box into an env setup step and a machine creation step, validate HCLOUD_TOKEN against Hetzner Cloud before saving it locally, and keep Next disabled until the token has passed the live validation call.
- Verification: `pnpm exec eslint src/app/api/fleet/hetzner/token/route.ts src/features/dashboard/hooks/use-fleet-notifications-controller.tsx src/features/dashboard/views/DashboardModals.tsx src/features/dashboard/dashboard-types.ts --max-warnings=0`; `pnpm exec tsc --noEmit --pretty false`; `git diff --check -- src/app/api/fleet/hetzner/token/route.ts src/features/dashboard/hooks/use-fleet-notifications-controller.tsx src/features/dashboard/views/DashboardModals.tsx src/features/dashboard/dashboard-types.ts src/app/fleet.module.css CHANGELOG.md`; fake-token POST to `http://localhost:5020/api/fleet/hetzner/token` returned Hetzner's invalid-token response; Playwright with the token route mocked successful confirmed Next starts disabled, enables after validation, opens the machine creation view, keeps the modal body-portaled and centered, and logs no console errors.
- Intended commit message: `Gate Hetzner machine creation on token validation`

## 2026-05-25 21:02 WITA - Embed Integrations In Dashboard

- Status: Pushed
- Areas changed: Shared button primitive, dashboard navigation/view routing, More utility panel, dashboard app page search params, Nango integrations client view, integrations redirect route, changelog
- Summary: Put Integrations under the More utilities view instead of the primary dashboard nav, keep More highlighted while viewing integrations, redirect `/integrations` into `/?view=integrations`, preserve direct-link support through a server-provided dashboard initial view, and fix the shared button primitive so `asChild` does not inject a loading sibling that trips Radix Slot's single-child requirement.
- Verification: `pnpm exec eslint src/components/ui/button.tsx src/app/page.tsx src/features/integrations/NangoIntegrationsView.tsx src/app/integrations/page.tsx src/features/dashboard/DashboardApp.tsx src/features/dashboard/MorePanel.tsx src/features/dashboard/views/UtilityPanels.tsx src/features/dashboard/views/DashboardHeader.tsx src/features/dashboard/hooks/use-dashboard-derived-state.tsx src/features/dashboard/dashboard-light-helpers.tsx src/features/dashboard/dashboard-types.ts --max-warnings=999`; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `git diff --check -- src/components/ui/button.tsx src/app/page.tsx src/features/integrations/NangoIntegrationsView.tsx src/app/integrations/page.tsx src/features/dashboard/DashboardApp.tsx src/features/dashboard/MorePanel.tsx src/features/dashboard/views/UtilityPanels.tsx src/features/dashboard/views/DashboardHeader.tsx src/features/dashboard/hooks/use-dashboard-derived-state.tsx src/features/dashboard/dashboard-light-helpers.tsx src/features/dashboard/dashboard-types.ts CHANGELOG.md`; Playwright smoke against `http://127.0.0.1:5020/?view=integrations` confirmed the React runtime crash no longer appears and the embedded Integrations panel renders.
- Intended commit message: `Embed integrations in dashboard`

## 2026-05-25 20:48 WITA - Add Nango Integration Host View

- Status: Pushed
- Areas changed: Integrations route/client view, Nango integration API, shared-vault host config service, Nango HTTP helper, integration types
- Summary: Add a dedicated `/integrations` view for choosing an always-on Nango host from fleet machines, checking Nango health, listing visible connected accounts when `NANGO_SECRET_KEY` is configured, toggling allowed providers, syncing non-secret host env through the existing `hive-env-add` API, and storing non-secret host metadata in the shared vault.
- Verification: `pnpm exec eslint src/app/integrations/page.tsx src/features/integrations/NangoIntegrationsView.tsx src/app/api/integrations/nango/route.ts src/lib/services/integrations/nango-client.ts src/lib/services/integrations/nango-host.ts src/lib/types/integrations.ts --max-warnings=0`; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `python3 -m json.tool ASSIMILATION.json >/dev/null && python3 /Users/liam/.codex/skills/github-assimilator/scripts/verify_assimilation_manifest.py`; `git diff --check -- ASSIMILATION.json CHANGELOG.md src/app/integrations/page.tsx src/app/integrations/integrations.module.css src/features/integrations/NangoIntegrationsView.tsx src/app/api/integrations/nango/route.ts src/lib/services/integrations/nango-client.ts src/lib/services/integrations/nango-host.ts src/lib/types/integrations.ts`
- Intended commit message: `Add Nango integration host view`

## 2026-05-25 20:44 WITA - Generate Kanban Tasks From Chat

- Status: Pushed
- Areas changed: Chat panel task actions, chat runtime controller, Kanban task creation flow, chat styling
- Summary: Replace the chat-to-Kanban form surface with a compact Generate Kanban Task action on assistant messages. The action opens a custom tooltip with Ideas and Ready targets, asks the current chat agent to generate a structured task from recent conversation context, sanitizes malformed or placeholder-y runtime output, creates the task through the existing board API, and immediately routes Ready tasks through the existing Kanban orchestration path.
- Verification: `pnpm run typecheck`; `pnpm exec eslint src/features/dashboard/views/ChatPanel.tsx src/features/dashboard/hooks/use-status-chat-input-controller.tsx src/features/dashboard/DashboardApp.tsx --max-warnings=999` passed with pre-existing warnings and no errors; `git diff --check -- CHANGELOG.md src/features/dashboard/views/ChatPanel.tsx src/features/dashboard/hooks/use-status-chat-input-controller.tsx src/features/dashboard/DashboardApp.tsx src/app/chat.module.css`; `curl -I --max-time 10 http://127.0.0.1:5020/` returned HTTP 200; Playwright loaded `http://127.0.0.1:5020/` with title `HivemindOS` and only the existing dev HMR websocket handshake warnings; real Emerson Hermes runtime smoke generated and created Ideas task `t_mpl7e39p_8m1cf` titled `Improve onboarding copy` on board `chat-generate-smoke-mpl7e38r`; `HIVE_E2E_REAL_FLEET=1 HIVE_E2E_KANBAN_BOARD=chat-generate-e2e-mpl7 pnpm test:e2e:kanban` passed with real Emerson writer parent `t_mpl7kt2n_uyrob` and real Henry Matisse artist child `t_mpl7n564_96qhp` done.
- Intended commit message: `Generate Kanban tasks from chat`

## 2026-05-25 20:39 WITA - Anchor Fleet Modals To Viewport

- Status: Pushed
- Areas changed: Dashboard modal layer, changelog
- Summary: Render the shared dashboard modal layer through a body portal so the new Hetzner agent initializer and related fleet dialogs center in the current viewport instead of being positioned relative to the scrolled page container.
- Verification: `pnpm exec eslint src/features/dashboard/views/DashboardModals.tsx --max-warnings=0`; `git diff --check -- src/features/dashboard/views/DashboardModals.tsx CHANGELOG.md`; Playwright against `http://localhost:5020/` opened the Fleet Hetzner modal at scrollY 0 and confirmed it is body-portaled with viewport center delta 0 and no console errors.
- Intended commit message: `Anchor fleet modals to viewport`

## 2026-05-25 20:35 WITA - Add Fleet Headline Dismiss

- Status: Pushed
- Areas changed: Fleet headline card, dashboard notification wiring, changelog
- Summary: Rename the stale "Today's headline" section to a neutral priority headline, add a dismiss control that hides the active headline, sort the headline stack by newest alert first, and mark notification-backed headlines read through the existing notifications flow.
- Verification: `pnpm eslint src/components/fleet/FleetView.tsx src/components/fleet/fleet-data.ts src/features/dashboard/hooks/use-dashboard-derived-state.tsx src/features/dashboard/dashboard-types.ts` passed with pre-existing warnings; `pnpm typecheck`; `git diff --check -- src/components/fleet/FleetView.tsx src/components/fleet/fleet-data.ts src/features/dashboard/hooks/use-dashboard-derived-state.tsx src/features/dashboard/dashboard-types.ts src/features/dashboard/views/AgentsPanel.tsx src/features/dashboard/DashboardApp.tsx CHANGELOG.md`; browser check on `http://localhost:5020` confirmed machine alerts without reliable age show "NO TIMESTAMP" instead of "NOW".
- Intended commit message: `Add fleet headline dismiss`

## 2026-05-25 20:29 WITA - Restore Per-Agent Fleet Chats

- Status: Pushed
- Areas changed: Dashboard chat sidebar discovery, fleet snapshot derived state
- Summary: Stop treating one collector/runtime pair as having a single snapshot owner so each discovered Ubuntu Hermes profile can surface its own session history, and refresh fleet discovery/snapshots while the Chat view is open instead of only while the Fleet view is active.
- Verification: `/api/fleet/discover` on port `5020` reports Ubuntu snapshots for main Hermes, Emerson, Octavia Butler, Grace Hopper, and Ida B. Wells with chat-backed tasks; `pnpm exec eslint src/features/dashboard/DashboardApp.tsx src/features/dashboard/hooks/use-dashboard-derived-state.tsx --max-warnings=999` passed with pre-existing warnings and no errors; `git diff --check -- CHANGELOG.md src/features/dashboard/DashboardApp.tsx src/features/dashboard/hooks/use-dashboard-derived-state.tsx`.
- Intended commit message: `Restore per-agent fleet chats`

## 2026-05-25 20:22 WITA - Type Dashboard Split Boundaries

- Status: Pushed
- Areas changed: Dashboard view boundaries, dashboard helper/storage modules, agent/polling controllers, shared chat/env/notification/wallet component prop types
- Summary: Remove broad `@ts-nocheck`/`props: any` coverage from lower-risk dashboard boundaries, replace migration-era `any` aliases in storage/display/env helpers with real runtime/dashboard types, export reusable component prop types for wallet/env/setup/fleet/notification surfaces, consolidate chat attachment/directory formatters into a tiny shared module, delete an unreachable legacy AgentsPanel branch that was kept behind `false && activeView === "agents"`, and fix custom chat folders so a folder path is not passed as an `onStartChat` callback when no chat-capable agent is available.
- Verification: `pnpm exec eslint src/features/dashboard src/features/chat src/features/env src/features/fleet src/features/notifications src/features/scheduler src/features/swarm src/app/api/agents/status/route.ts src/app/api/chat/agent-runtime/route.ts src/app/api/scheduler/import/route.ts --quiet`; `pnpm exec tsc --noEmit --pretty false` is blocked only by stale generated `.next/dev/types/app/fleet-graph-shot/page.ts` references; dashboard import graph script reported `files: 35` and `cycles: 0`; largest dashboard files are `DashboardApp.tsx` at 1,512 lines, `use-scheduler-controller.tsx` at 1,360, and `use-miroshark-brain-controller.tsx` at 1,118; Playwright loaded `http://localhost:5020/` with HTTP 200, title `HivemindOS`, and `errorCount: 0`; `git diff --check`.
- Intended commit message: `Type dashboard split boundaries`

## 2026-05-25 20:07 WITA - Robust-Test Fleet Agent Handoffs

- Status: Pushed
- Areas changed: Queen Bee worker assignment, Kanban visual handoff parsing, Kanban dispatch prompts, runtime-backed test agents
- Summary: Add runtime-backed Hermes test agents through the same collector-backed Fleet add endpoint used by the dashboard modal, fix no-Queen assignment so class-matched workers are not ignored in favor of the first reachable worker, accept `Visual brief:`/`VISUAL BRIEF:` as well as `VISUAL_BRIEF:` for automatic artist handoff creation, and prompt non-artist workers to leave a machine-readable visual brief when the original task requires a downstream image.
- Verification: Created Frida Kahlo and Ada Lovelace on This Mac plus Octavia Butler, Grace Hopper, and Ida B. Wells on the Ubuntu collector through `/api/agents/runtime`; assignment smoke routed research to Octavia, QA to Grace, code to Ada, and LinkedIn/image parent work to Ida; robust board `e2e-robust-robust2-mpl5n9ii` completed real runtime tasks for research, QA, code, writer, and automatically generated artist child work; Ada's long code run was completed via Hermes session polling after the initial test client detached; Henry generated `/Users/liam/.hermes/profiles/henry-matisse/cache/images/openai_codex_gpt-image-2-medium_20260525_200552_06fe8aa6.png`; `node --check scripts/agent-telemetry-collector.mjs`; `pnpm exec eslint src/lib/services/orchestration/bee-roles.ts src/lib/services/kanban/local-kanban-store.ts src/features/dashboard/dashboard-light-helpers.tsx --max-warnings=999` passed with pre-existing helper warnings; `git diff --check -- CHANGELOG.md scripts/agent-telemetry-collector.mjs src/lib/services/orchestration/bee-roles.ts src/lib/services/kanban/local-kanban-store.ts src/features/dashboard/dashboard-light-helpers.tsx src/features/dashboard/hooks/use-kanban-dispatch-controller.tsx`.
- Intended commit message: `Fix class-matched Kanban handoffs`

## 2026-05-25 20:00 WITA - Audit Dashboard Structure And Split Hygiene

- Status: Pushed
- Areas changed: Dashboard feature hooks, dashboard helper modules, runtime adapter status/chat/scheduler API strictness
- Summary: Verify the extracted dashboard has no internal feature import cycles, no runaway monolithic files, and no remaining injected React hook/browser frame constructors in hook prop bags. Move missing starter/runtime helper dependencies into the extracted helper module, keep voice waveform frame APIs local to the browser hook, simplify cheap derived-state memoization that blocked the React compiler, and make runtime adapter API routes tolerate custom/unknown runtimes without unsafe undefined adapter access.
- Verification: `pnpm exec eslint src/features/dashboard src/features/chat src/features/env src/features/fleet src/features/kanban src/features/notifications src/features/scheduler src/features/swarm src/app/api/agents/status/route.ts src/app/api/chat/agent-runtime/route.ts src/app/api/scheduler/import/route.ts --quiet`; dashboard internal import graph script reported `dashboard files 34` and `dashboard internal cycles 0`; `wc -l` scan shows no app source file above `src/features/dashboard/DashboardApp.tsx` at 1,511 lines; Playwright loaded `http://localhost:5020/` with HTTP 200 and `errorCount 0`; `pnpm exec tsc --noEmit --pretty false` is now blocked only by stale generated `.next/dev/types/app/fleet-graph-shot/page.ts` references; `git diff --check`.
- Intended commit message: `Audit dashboard split structure`

## 2026-05-25 19:48 WITA - Add Real Fleet E2E Harness

- Status: Pushed
- Areas changed: Real fleet E2E runner, telemetry collector test hooks, runtime agent API, package scripts
- Summary: Add an opt-in real fleet E2E runner gated by `HIVE_E2E_REAL_FLEET=1`, discover ready machines from `/api/fleet/discover`, exercise runtime-backed agent creation/removal, env propagation, shared skill auto-sync, Kanban handoff polling, and a Playwright dashboard smoke check, and emit sanitized JSON summaries under `artifacts/e2e-real-fleet/<run-id>/`. Add collector runtime-agent deletion plus tightly scoped E2E-only env/skill mutation hooks for `HIVE_E2E_*` and `hive-e2e-*` test artifacts.
- Verification: `node --check scripts/agent-telemetry-collector.mjs && node --check scripts/e2e-real-fleet.mjs`; `pnpm exec eslint scripts/e2e-real-fleet.mjs scripts/agent-telemetry-collector.mjs src/app/api/agents/runtime/route.ts --max-warnings=999`; `git diff --check -- scripts/e2e-real-fleet.mjs scripts/agent-telemetry-collector.mjs src/app/api/agents/runtime/route.ts package.json CHANGELOG.md`; `pnpm exec tsc --noEmit --pretty false` is blocked by pre-existing `.next/dev/types/app/fleet-graph-shot/page.ts` stale generated references plus unrelated adapter strictness errors in agent status/chat/scheduler routes.
- Intended commit message: `Add real fleet E2E harness`

## 2026-05-25 19:47 WITA - Keep Long Hermes Kanban Runs Pollable

- Status: Pushed
- Areas changed: Telemetry collector Hermes chat bridge, Kanban dispatch session handling
- Summary: Emit a pollable Hermes session ID early for collector-backed CLI chat runs, let a Hermes child continue when the dashboard stream closes after a session is known, and keep Kanban cards in Working when a session exists but no final assistant response has landed yet so slow real-agent calls can finish through session polling instead of being marked failed.
- Verification: `node --check scripts/agent-telemetry-collector.mjs`; `pnpm exec eslint scripts/agent-telemetry-collector.mjs src/features/dashboard/hooks/use-kanban-dispatch-controller.tsx --max-warnings=999` passed with pre-existing hook warnings; `git diff --check -- scripts/agent-telemetry-collector.mjs src/features/dashboard/hooks/use-kanban-dispatch-controller.tsx`; local collector restart via `launchctl kickstart -k gui/$(id -u)/com.agent-control-room.telemetry`; direct collector Hermes probe emitted session `20260525_194318_1d3ee2` in 3.6s and completed; dashboard runtime route emitted Henry session `20260525_194348_6eec9a` in 4.7s and generated `/Users/liam/.hermes/profiles/henry-matisse/cache/images/openai_codex_gpt-image-2-medium_20260525_194539_038c7f8e.png`; `/api/chat/agent-session` read the completed session with 6 messages and the generated image path.
- Intended commit message: `Keep Hermes Kanban runs pollable`

## 2026-05-25 19:22 WITA - Split Dashboard Shell Below Line Cap

- Status: Pushed
- Areas changed: Dashboard app shell, dashboard controller hooks, dashboard view panels, chat/env/dashboard helper modules, route wrapper
- Summary: Reduce `src/features/dashboard/DashboardApp.tsx` to a roughly 1,500-line orchestrator, split controller logic into feature hooks, split rendered surfaces into focused view components, replace nested `ctx` prop bags with direct props/params, split the chat workspace from chat-folder, skill-browser, and agent-settings modals, keep dashboard hook/view/helper files small instead of moving the monolith into another oversized file, and fix post-split hook initialization order so derived agents, polling refreshers, task/chat callbacks, setup modals, wallet refreshers, and Kanban dispatch do not reference later declarations during render.
- Verification: `wc -l src/features/dashboard/DashboardApp.tsx src/features/dashboard/views/*.tsx src/features/dashboard/views/chat/*.tsx src/features/dashboard/hooks/*.tsx`; `pnpm exec eslint src/features/dashboard/DashboardApp.tsx src/features/dashboard/hooks/use-kanban-task-controller.tsx src/features/dashboard/hooks/use-dashboard-polling-effects.tsx --quiet`; `pnpm exec tsc --noEmit --pretty false` now parses the split dashboard and is blocked only by unrelated runtime adapter strictness plus stale `.next/dev/types/app/fleet-graph-shot/page.ts`; `git diff --check`.
- Intended commit message: `Split dashboard shell below line cap`

## 2026-05-25 19:10 WITA - Add OpenAI-Compatible Local Runtimes

- Status: Pushed
- Areas changed: Agent runtime types/defaults, runtime adapter registry, OpenAI-compatible adapter, runtime routes, runtime chat bridge, runtime integration status, fallback chat provider selection, fleet discovery, collector runtime registry, dashboard agent creation defaults, machine provisioning runtime typing, README, env example, assimilation manifest
- Summary: Stop gating runtime APIs to only OpenClaw/Hermes/Aeon, add a first-class `openai-compatible` runtime for LM Studio and similar local `/v1/chat/completions` servers, discover models from `/v1/models`, stream direct OpenAI-compatible chat responses through the existing dashboard SSE surface, and let fleet/collector agent records preserve the local runtime instead of coercing unknown runtimes back to Hermes.
- Verification: `node --check scripts/agent-telemetry-collector.mjs`; `pnpm exec eslint src/lib/types/agent-runtime.ts src/lib/providers.ts src/lib/services/runtime-adapters/registry.ts src/lib/services/runtime-adapters/openai-compatible.ts src/lib/services/runtime-integrations.ts src/app/api/chat/agent-runtime/route.ts 'src/app/api/runtimes/[runtime]/status/route.ts' 'src/app/api/runtimes/[runtime]/integrations/route.ts' 'src/app/api/runtimes/[runtime]/sessions/search/route.ts' src/app/api/fleet/discover/route.ts --max-warnings=0`; `pnpm exec eslint src/lib/services/machine-provisioning/hetzner-control-room.ts --max-warnings=0`; `pnpm exec eslint src/features/dashboard/hooks/use-agent-controller.tsx --max-warnings=999` passed with three pre-existing unused React hook warnings; `python3 /Users/liam/.codex/skills/github-assimilator/scripts/verify_assimilation_manifest.py`; `git diff --check -- CHANGELOG.md README.md .env.example src/lib/types/agent-runtime.ts src/lib/providers.ts src/lib/services/runtime-adapters/registry.ts src/lib/services/runtime-adapters/openai-compatible.ts src/lib/services/runtime-integrations.ts src/app/api/chat/agent-runtime/route.ts 'src/app/api/runtimes/[runtime]/runs/route.ts' 'src/app/api/runtimes/[runtime]/status/route.ts' 'src/app/api/runtimes/[runtime]/outputs/route.ts' 'src/app/api/runtimes/[runtime]/skills/sync/route.ts' 'src/app/api/runtimes/[runtime]/skills/route.ts' 'src/app/api/runtimes/[runtime]/schedules/route.ts' 'src/app/api/runtimes/[runtime]/env/sync/route.ts' 'src/app/api/runtimes/[runtime]/schedules/action/route.ts' 'src/app/api/runtimes/[runtime]/integrations/route.ts' 'src/app/api/runtimes/[runtime]/sessions/search/route.ts' src/app/api/scheduler/runtime-action/route.ts src/app/api/fleet/discover/route.ts src/features/dashboard/hooks/use-agent-controller.tsx scripts/agent-telemetry-collector.mjs`; `pnpm exec tsc --noEmit --pretty false` is blocked by pre-existing malformed split dashboard view files (`DashboardApp.tsx`, `views/ChatPanel.tsx`, `views/DashboardHeader.tsx`, `views/DashboardModals.tsx`); narrow ad-hoc `tsc` over touched files was also blocked by command-line alias resolution rather than code diagnostics.
- Intended commit message: `Add OpenAI-compatible local runtimes`

## 2026-05-25 18:51 WITA - Aggregate Fleet Skill Imports

- Status: Pushed
- Areas changed: Shared brain provider import button copy, master/provider auto-sync controls, vault segmented subviews and header spacing, shared skill card layout, vault/wallet CSS modules, Obsidian skills API, provider skill inventory/reconcile service, fleet collector skill endpoint, collector skill auto-sync watcher, fleet collector capabilities, agent runtime capability/config types
- Summary: Replace the misleading "Import all providers" button label with an exact count of skills missing from the shared brain, expose provider skill inventories from fleet collectors, merge local and remote provider skills into one deduped inventory, keep the newest copy when the same skill slug is found on multiple machines, add a master all-provider auto-import switch plus per-provider auto-sync toggles, split the vault panel into Hive Vault, Shared Skills, and Config segmented views, tighten the vault header into a left content/tabs column with a grouped right action cluster, reshape shared skill tiles into taller 5:7 playing-card-style cards without hidden line clamps, and let collectors watch/poll provider roots to reconcile new, changed, and safely missing upstream skills into the shared vault. Changed shared skills are archived before replacement, upstream removals are marked missing rather than hard-deleted, and provider toggles are disabled while master auto-import is enabled.
- Verification: `node --check scripts/agent-telemetry-collector.mjs`; `pnpm exec eslint src/features/dashboard/DashboardApp.tsx src/features/dashboard/views/VaultPanel.tsx --max-warnings=999` passed with pre-existing dashboard warnings and one pre-existing unused eslint-disable warning in `VaultPanel.tsx`; `pnpm exec eslint src/features/dashboard/views/VaultPanel.tsx --max-warnings=999` passed with the same pre-existing unused eslint-disable warning; `pnpm exec eslint src/app/api/obsidian/skills/route.ts src/app/api/obsidian/skills/reconcile/route.ts src/app/api/obsidian/skills/auto-sync/route.ts src/app/api/fleet/discover/route.ts src/lib/services/obsidian/brain-skills.ts src/lib/services/fleet/remote-skill-providers.ts src/lib/types/agent-runtime.ts src/features/dashboard/views/VaultPanel.tsx --max-warnings=999` passed with one pre-existing unused eslint-disable warning in `VaultPanel.tsx`; `pnpm exec eslint src/lib/services/obsidian/brain-skills.ts --max-warnings=0`; `git diff --check -- CHANGELOG.md scripts/agent-telemetry-collector.mjs src/app/api/obsidian/skills/route.ts src/app/api/obsidian/skills/reconcile/route.ts src/app/api/obsidian/skills/auto-sync/route.ts src/app/api/fleet/discover/route.ts src/app/vault.module.css src/app/wallets.module.css src/lib/services/obsidian/brain-skills.ts src/lib/services/fleet/remote-skill-providers.ts src/lib/types/agent-runtime.ts src/features/dashboard/DashboardApp.tsx src/features/dashboard/views/VaultPanel.tsx`; Playwright smoke on the existing port 5020 server selected Hive Vault, Shared Skills, and Config tabs, confirmed their respective content panes, captured the tightened vault header spacing, and checked the shared skill card ratio at 0.71; temporary collector on port 8797 returned disabled auto-sync on GET and accepted Hermes auto-import/update/safe-removal policy on POST; live `/api/obsidian/skills` on port 5020 reports Codex 25, Hermes 90, Gemini 1, OpenClaw 1, Aeon 156, and 299 provider skills total after limiting newest-copy dedupe to each provider; `pnpm exec tsc --noEmit --pretty false` is blocked by pre-existing syntax errors in uncommitted split view files `src/features/dashboard/views/ChatPanel.tsx` and `src/features/dashboard/views/DashboardModals.tsx`.
- Intended commit message: `Aggregate fleet skill imports`

## 2026-05-25 18:36 WITA - Split Dashboard Feature Utilities

- Status: Pushed
- Areas changed: Dashboard route entry, Dashboard app shell module, Dashboard lazy component module, shared Markdown renderer, More panel component, Notifications panel component, shared CSS-module class helper, Swarm/MiroShark template/payload/transformer utilities, Fleet identity and machine initialization options, Kanban diagnostics, notification display helpers, Scheduler option constants
- Summary: Reduce the Next route entry `src/app/page.tsx` to a 5-line wrapper around a dashboard app component, move repeated dashboard class-name composition, heavy client component lazy imports, shared chat markdown rendering, the More utilities panel, the Notifications view, MiroShark template/payload shaping, Swarm event/market transformation logic, Fleet identity/dedupe helpers, Kanban stale-work diagnostics, notification display policy, scheduler option data, and Hetzner machine-init option data out of the route while preserving behavior and design.
- Verification: `pnpm exec eslint src/app/page.tsx src/features/dashboard/DashboardApp.tsx src/features/dashboard/ChatMarkdown.tsx src/features/dashboard/MorePanel.tsx src/features/notifications/NotificationsPanel.tsx src/features/notifications/notification-display.tsx --max-warnings=999` passed with 29 existing dashboard warnings now reported in `DashboardApp.tsx`; `git diff --check -- CHANGELOG.md src/app/page.tsx src/features/dashboard/DashboardApp.tsx src/features/dashboard/ChatMarkdown.tsx src/features/dashboard/MorePanel.tsx src/features/notifications/NotificationsPanel.tsx next.config.ts package.json pnpm-lock.yaml src/app/globals.css src/app/kanban-board.module.css`; `pnpm exec tsc --noEmit --pretty false` is blocked only by stale generated `.next/dev/types/app/fleet-graph-shot/page.ts` references.
- Intended commit message: `Split dashboard feature utilities`

## 2026-05-25 17:58 WITA - Fix Scheduler Automation Imports

- Status: Pushed
- Areas changed: Hermes schedule import, telemetry collector schedule import, shared schedule reader, shared vault schedule snapshot, shared schedule agent/machine matching, OpenClaw schedule import metadata, scheduler timeline display and machine labels, changelog
- Summary: Unpack Hermes JSON automation exports with `jobs` arrays so imported schedules use their real title, prompt, inner job cadence, and next-run timestamp; tolerate a simple stray leading brace in exported JSON; repair already-saved malformed shared schedule snapshots; carry runtime next-run timestamps into imported dashboard schedules; match shared schedules back to the owning runtime agent using embedded external job IDs and machine names; stop unknown/custom schedule labels from being plotted as happening now; show runtime-managed schedules in a separate timeline lane only when no exact next-run time is available; and strip the internal `hivemindos-` machine prefix from scheduler display labels while preserving raw IDs for sync/matching.
- Verification: `node --check scripts/agent-telemetry-collector.mjs`; `pnpm exec eslint src/lib/services/runtime-adapters/hermes.ts src/lib/services/obsidian/scheduled-runs.ts src/components/scheduler/timeline.tsx src/components/scheduler/scheduler-data.ts --max-warnings=0`; `pnpm exec eslint src/app/page.tsx --max-warnings=999` passed with pre-existing warnings; shared schedule API smoke against port `5020` returned `Obsidian Daily AI Briefing` with `machineName: "hivemindos-ubuntu-8gb-hel1-2"`, `agentId: "queen-bee-hivemindos-ubuntu-8gb-hel1-2-hermes"`, `every: "0 5 * * *"`, and `nextRunISO: "2026-05-26T05:00:00.000Z"`; `git diff --check -- scripts/agent-telemetry-collector.mjs src/lib/services/runtime-adapters/hermes.ts src/lib/services/obsidian/scheduled-runs.ts src/components/scheduler/timeline.tsx src/components/scheduler/scheduler-data.ts src/app/page.tsx CHANGELOG.md`; `pnpm exec tsc --noEmit --pretty false` is currently blocked by stale generated `.next/dev/types/app/fleet-graph-shot/page.ts` references and unrelated page import/local declaration conflicts outside this change.
- Intended commit message: `Fix scheduler automation imports`

## 2026-05-25 17:43 WITA - Fix Social Post Agent Routing

- Status: Pushed
- Areas changed: Queen Bee worker-class inference, Kanban completion handoff chaining, telemetry collector runtime agent registry, Hermes image generation profile defaults
- Summary: Score worker-class matches instead of taking the first keyword hit so LinkedIn/social-post tasks route to writer agents before image/vision agents, create dependency-linked artist handoff tasks automatically whenever a completed Kanban result contains `VISUAL_BRIEF:`, and route explicit generated-image child cards to artist agents even when their source result contains writing-heavy context. Make collector-backed runtime agent creation idempotent by runtime/profile key so repeated dashboard creates update an existing profile instead of duplicating agent cards. Configure generated Hermes profiles to use the OpenAI/Codex image-generation plugin instead of the legacy FAL default, and extend the collector chat timeout for slower artist/image runs.
- Verification: `node --check scripts/agent-telemetry-collector.mjs`; `pnpm exec eslint src/app/page.tsx src/lib/services/orchestration/bee-roles.ts --max-warnings=999` passed with pre-existing warnings; `pnpm exec eslint src/lib/services/kanban/local-kanban-store.ts src/lib/services/orchestration/bee-roles.ts --max-warnings=0`; `git diff --check -- src/app/page.tsx src/lib/services/kanban/local-kanban-store.ts src/lib/services/orchestration/bee-roles.ts scripts/agent-telemetry-collector.mjs CHANGELOG.md`; orchestrator assignment smoke for the LinkedIn post plus image handoff task now routes Queen Bee to Emerson as `writer`; Kanban API smoke completed a writer task with `VISUAL_BRIEF:` and automatically created a dependency-linked Ready child titled `Generate image for: ...`; orchestrator assignment smoke for that generated-image child routes to Henry Matisse as `artist`; actual Emerson runtime on Ubuntu produced a LinkedIn result with `VISUAL_BRIEF:`, completing the parent automatically created the artist child, and the child assignment selected Henry Matisse. `pnpm exec tsc --noEmit --pretty false` is still blocked by stale generated `.next/dev/types/app/fleet-graph-shot/page.ts` references outside this change set. A follow-up Henry runtime call for the generated child timed out before final output, while the earlier Henry handoff run produced and validated `/Users/liam/Documents/code/projects/hivemind-os/hivemindos-agent-relay.svg`.
- Intended commit message: `Fix social post routing and runtime agent idempotency`

## 2026-05-25 17:41 WITA - Reduce Dashboard Dev Memory

- Status: Pushed
- Areas changed: Dashboard client imports, dev webpack config, root shell animation CSS, Kanban pickup animation CSS, package dependencies, lockfile
- Summary: Lazy-load heavyweight Fleet, Scheduler, Swarm, Wallet, Task modal, and less common cell surfaces from the monolithic dashboard page, replace the remaining Motion-powered entrance animations with equivalent CSS, remove the now-unused Motion dependency, and disable dev source maps by default so Next dev does not retain multi-megabyte eval source maps for the 18k-line dashboard page. Developers can opt back into dev source maps with `NEXT_DEV_SOURCE_MAPS=1`.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/page.tsx --max-warnings=999` passed with 30 pre-existing warnings; `git diff --check -- next.config.ts package.json pnpm-lock.yaml src/app/page.tsx src/app/globals.css src/app/kanban-board.module.css`; live hot-reload chunk check on port 5020 showed `.next/dev/static/chunks/app/page.js` drop from 10.3 MB / 481 modules to 6.03 MB / 151 modules, `.next/dev/server/app/page.js` drop from 6.9 MB / 108 modules to 4.66 MB / 53 modules, and Motion/Lottie removed from the root page chunk.
- Intended commit message: `Reduce dashboard dev memory`

## 2026-05-25 16:15 WITA - Add Runtime-Agnostic Kanban Runs

- Status: Pushed
- Areas changed: Kanban task model, local Kanban store, Kanban API, Work board bulk controls, Kanban workflow smoke test, assimilation manifest
- Summary: Add Hermes-inspired but runtime-agnostic task runs, claim/heartbeat/complete/block/unblock/promote/reclaim verbs, dependency auto-promotion, per-task run history, bulk task updates, and dashboard multi-select actions while preserving HivemindOS Obsidian/local JSON storage and Hermes/OpenClaw-neutral dispatch semantics.
- Verification: `node --check scripts/test-kanban-workflow.mjs`; `pnpm exec tsc --noEmit --pretty false`; `KANBAN_TEST_BASE_URL=http://127.0.0.1:5020 node scripts/test-kanban-workflow.mjs`; `pnpm exec eslint src/app/page.tsx src/app/api/kanban/route.ts src/lib/services/kanban/local-kanban-store.ts src/lib/types/kanban.ts --max-warnings=999` passed with 30 pre-existing warnings in `src/app/page.tsx`.
- Intended commit message: `Add runtime-agnostic Kanban runs`

## 2026-05-25 16:55 WITA - Create Runtime-Backed Agents

- Status: Pushed
- Areas changed: Agent creation modal, agent runtime creation API, telemetry collector agent registry/profile creation, agent runtime chat context, fleet discovery capabilities, agent history aliasing
- Summary: Route dashboard "Add agent" through the machine collector instead of only saving a browser-local profile, create durable Hermes profile homes with provider/model/personality metadata, advertise runtime agent creation support, include agent role/model instructions in runtime chat context, and stop named agents from inheriting generic collector history unless their exact runtime profile/home matches.
- Verification: `node --check scripts/agent-telemetry-collector.mjs`; `git diff --check -- scripts/agent-telemetry-collector.mjs src/app/api/agents/runtime/route.ts src/app/api/chat/agent-runtime/route.ts src/app/api/fleet/discover/route.ts src/app/page.tsx src/lib/types/agent-runtime.ts CHANGELOG.md`; `pnpm exec eslint src/app/page.tsx src/app/api/agents/runtime/route.ts src/app/api/chat/agent-runtime/route.ts src/app/api/fleet/discover/route.ts src/lib/types/agent-runtime.ts --max-warnings=999` passed with 30 pre-existing warnings in `src/app/page.tsx`; temporary collector on port 8799 created and listed Hermes profile `Henry Matisse` with provider `openai-codex`, model `gpt-5.5`, and `~/.hermes/profiles/henry-matisse`. `pnpm exec tsc --noEmit --pretty false` is currently blocked by stale generated `.next/dev/types/app/fleet-graph-shot/page.ts` references to a missing generated route file outside this change set.
- Intended commit message: `Create runtime-backed agents`

## 2026-05-25 16:24 WITA - Collapse Local Link Mac Duplicates

- Status: Pushed
- Areas changed: Tailscale fleet device convergence, fleet discovery, roster cache merge, changelog
- Summary: Treat app-managed `hivemindos-<this-mac>-local*` Link nodes as duplicates of the physical `This Mac` device while still showing real macOS Tailscale peers as offline setup targets in the roster.
- Verification: `curl -sS --max-time 8 http://127.0.0.1:5020/api/tailscale/devices | jq '{source, devices: [.devices[] | {name,dnsName,os,online,self,relay}]}'`; `curl -sS --max-time 10 http://127.0.0.1:5020/api/fleet/discover | jq '{source, machines: [.machines[] | {name: .device.name, dnsName: .device.dnsName, os: .device.os, self: .device.self, online: .device.online, collector: .collector, agents: (.agents|length), relay: .device.relay}]}'`; `pnpm typecheck`.
- Intended commit message: `Collapse local Link Mac duplicates`

## 2026-05-25 15:10 WITA - Link README Bankr Badge To Token

- Status: Pushed
- Areas changed: README launch badge, changelog
- Summary: Point the README Bankr badge at the current HivemindOS token launch page for `0xa382c83e2a3b79368f372c2eb9b6925ffaf45ba3` instead of the generic Bankr homepage.
- Verification: `curl -I -L --max-time 15 https://bankr.bot/launches/0xa382c83e2a3b79368f372c2eb9b6925ffaf45ba3`; `git diff --check README.md CHANGELOG.md`.
- Intended commit message: `Link Bankr badge to token`

## 2026-05-25 15:05 WITA - Hide Empty Hermes Chat Rows

- Status: Pushed
- Areas changed: chat sidebar conversation filtering, telemetry collector Hermes session scanning, local fleet snapshot Hermes session scanning, changelog
- Summary: Stop advertising empty starter rows and Hermes sessions as chat rows when they have no readable user/assistant transcript, and make the collector fall back from an empty API session file to the Hermes DB session so resumable chats can hydrate their messages.
- Verification: `node --check scripts/agent-telemetry-collector.mjs`; `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/page.tsx --max-warnings=999` passed with 30 pre-existing warnings; `git diff --check -- src/app/page.tsx scripts/agent-telemetry-collector.mjs src/app/api/fleet/snapshot/route.ts CHANGELOG.md`; Playwright smoke against `http://localhost:5020` showed the Chat sidebar no longer renders `Hermes chat` placeholder rows; local Hermes DB inspection found 24 of 102 sessions had no readable user/assistant chat and should not render as chat rows.
- Intended commit message: `Hide empty Hermes chat rows`

## 2026-05-25 12:55 WITA - Add README Screenshots

- Status: Pushed
- Areas changed: README screenshots, README documentation, changelog
- Summary: Add four optimized product screenshots covering Fleet, Work automations, Brain graph, and Work simulation to a new README screenshots section.
- Verification: `oxipng -o 4 --strip safe public/readme/screenshots/*.png`; `du -h public/readme/screenshots/*.png`; `git diff --check README.md CHANGELOG.md`.
- Intended commit message: `Add README screenshots`

## 2026-05-25 03:27 WITA - Remove Fleet Diagnostics Button

- Status: Pushed
- Areas changed: Fleet view actions, changelog
- Summary: Remove the Diagnostics button from the Fleet view header area while keeping diagnostics available through the existing More/Diagnostics surfaces.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `git diff --check -- src/app/page.tsx CHANGELOG.md`; `rg -n "Diagnostics|diagnostics" src/app/page.tsx` confirmed the removed Fleet action is gone while the existing More and Diagnostics screens remain; `pnpm exec eslint src/app/page.tsx --max-warnings=0` reported 0 errors but failed on 30 pre-existing warnings in the large page file.
- Intended commit message: `Remove fleet diagnostics button`

## 2026-05-25 03:21 WITA - Simplify Fleet List Tailnet Column

- Status: Pushed
- Areas changed: fleet list view tailnet display, changelog
- Summary: Replace verbose Tailnet host/IP/latency text in machine rows with a compact Connected/Off pill, stop rendering agent wallet state in the Tailnet column, and set stable list table column widths so status/build content stays aligned.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/components/fleet/list-view.tsx --max-warnings=0`; `git diff --check -- src/components/fleet/list-view.tsx CHANGELOG.md`; attempted Browser smoke on the managed dev server, but the live fleet state reported 0 machines and the temporary 5021 server was blocked by the existing Next dev lock.
- Intended commit message: `Simplify fleet list tailnet column`

## 2026-05-25 03:04 WITA - Keep Env Sync Update Visible

- Status: Pushed
- Areas changed: fleet roster update visibility, env sync repair detection, changelog
- Summary: Treat any ready collector that does not advertise `envHttpSync` as updateable and keep the roster Update button visible for stale/update-needed machines even when cached `canUpdate` data is incomplete.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `git diff --check -- src/app/page.tsx src/components/fleet/roster.tsx CHANGELOG.md`; local fleet discovery shows Ubuntu ready at `f1c753b` with latest `3270a34` and no `capabilities.envHttpSync`.
- Intended commit message: `Keep env sync update visible`

## 2026-05-25 02:52 WITA - Verify Env Sync Collector Updates

- Status: Pushed
- Areas changed: fleet roster update verification, telemetry collector capabilities, changelog
- Summary: Make remote collectors advertise the shared-env HTTP sync endpoint and require that capability before the fleet Update button can claim success for env-sync repairs.
- Verification: `python3 -m py_compile scripts/hive-env-add`; `node --check scripts/agent-telemetry-collector.mjs`; `pnpm exec tsc --noEmit --pretty false`; `git diff --check -- scripts/agent-telemetry-collector.mjs src/app/api/fleet/discover/route.ts src/app/api/fleet/update/route.ts src/lib/types/agent-runtime.ts src/app/page.tsx src/components/fleet/roster.tsx CHANGELOG.md`; Ubuntu collector health check still lacks `capabilities.envHttpSync`, confirming the previous "Updated!" state was a false positive.
- Intended commit message: `Verify env sync collector updates`

## 2026-05-25 02:44 WITA - Sync Shared Env Through Collectors

- Status: Pushed
- Areas changed: `hive-env-add`, telemetry collector env endpoint, shared env API/UI, changelog
- Summary: Keep shared env saves/imports on the official `hive-env-add` path with automatic collector sync, add a Shared env "Sync machines" button that runs `hive-env-add --reconcile`, and make collectors accept bulk env imports over their Tailnet HTTP endpoint instead of requiring Tailscale SSH.
- Verification: `python3 -m py_compile scripts/hive-env-add`; `node --check scripts/agent-telemetry-collector.mjs`; `pnpm exec tsc --noEmit --pretty false`; `git diff --check -- scripts/hive-env-add scripts/agent-telemetry-collector.mjs src/app/api/env/route.ts src/app/page.tsx CHANGELOG.md`; temp `hive-env-add --import-stdin --no-tailnet-sync` smoke confirmed local bulk import writes metadata; `node scripts/test-dashboard-nav.mjs`.
- Intended commit message: `Sync shared env through collectors`

## 2026-05-25 02:40 WITA - Default MoneyClaw Keys Per Agent

- Status: Pushed
- Areas changed: MoneyClaw key modal, changelog
- Summary: Change MoneyClaw setup to default to a per-agent key so each agent can have its own MoneyClaw account, wallet, inbox, and balance. Keep the shared-key option available but clearly label it as sharing one MoneyClaw account across agents.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/components/wallet/AgentWalletCard.tsx --max-warnings=0`; `git diff --check -- src/components/wallet/AgentWalletCard.tsx CHANGELOG.md`.
- Intended commit message: `Default MoneyClaw keys per agent`

## 2026-05-25 02:01 WITA - Clarify Shared MoneyClaw Key Setup

- Status: Pushed
- Areas changed: MoneyClaw key modal, MoneyClaw key save behavior, changelog
- Summary: Make MoneyClaw key setup default to a clear "Use for all agents" toggle, simplify the shared terminal command to `scripts/hive-env-add MONEYCLAW_API_KEY`, and support the alternate local-only path by saving the key into the selected agent's env overlay when sharing is disabled.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/components/wallet/AgentWalletCard.tsx src/app/page.tsx --max-warnings=999` passed with existing page warnings only; `git diff --check -- src/components/wallet/AgentWalletCard.tsx src/components/wallet/AgentWalletCard.module.css src/app/page.tsx CHANGELOG.md`.
- Intended commit message: `Clarify shared MoneyClaw key setup`

## 2026-05-25 01:53 WITA - Replace Wallet Row Placeholder Icons

- Status: Pushed
- Areas changed: wallet holdings icons, changelog
- Summary: Replace the Gas row emoji with a proper icon and render HIVE with a hexagon outline mark instead of the placeholder diamond glyph.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/components/wallet/AgentWalletCard.tsx --max-warnings=0`; `git diff --check -- src/components/wallet/AgentWalletCard.tsx src/components/wallet/AgentWalletCard.module.css CHANGELOG.md`.
- Intended commit message: `Replace wallet row placeholder icons`

## 2026-05-25 01:50 WITA - Add Shared Env Bulk Import UI

- Status: Pushed
- Areas changed: `hive-env-add`, shared env API, More shared env UI, changelog
- Summary: Add `hive-env-add --import-stdin` for bulk `.env` ingestion, wire the env API to import multiple shared keys through that command, and restyle the Shared sync store with Render-like read/edit mode, export, generated secret, and `.env` paste/file import review before setting variables.
- Verification: `python3 -m py_compile scripts/hive-env-add`; disposable `hive-env-add --import-stdin --scope agent --runtime generic --no-backup --no-tailnet-sync` smoke imported two fake keys into a temp env file; `pnpm exec tsc --noEmit --pretty false`; `git diff --check -- scripts/hive-env-add src/app/api/env/route.ts src/app/page.tsx CHANGELOG.md`; `node scripts/test-dashboard-nav.mjs`; value-free `/api/env` smoke returned shared env metadata.
- Intended commit message: `Add shared env bulk import UI`

## 2026-05-25 01:37 WITA - Move MoneyClaw Setup Into Cards Badge

- Status: Pushed
- Areas changed: MoneyClaw validation API, wallet card Cards rail action, MoneyClaw key modal, shared env save flow, changelog
- Summary: Remove the ugly Core rails footer status/error section and make the Cards rail setup badge open a MoneyClaw API key modal. The modal validates the key, saves it through the shared hive-env-add env path, shows Check/Checking/Saved states, and includes a terminal command alternative for manual setup.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/components/wallet/AgentWalletCard.tsx src/app/page.tsx src/app/api/wallet/moneyclaw/route.ts src/lib/services/wallet/moneyclaw-client.ts --max-warnings=999` passed with existing page warnings only; `git diff --check -- src/components/wallet/AgentWalletCard.tsx src/components/wallet/AgentWalletCard.module.css src/app/page.tsx src/app/api/wallet/moneyclaw/route.ts src/lib/services/wallet/moneyclaw-client.ts CHANGELOG.md`.
- Intended commit message: `Move MoneyClaw setup into cards badge`

## 2026-05-25 01:27 WITA - Keep New Wallet Spending Off

- Status: Pushed
- Areas changed: wallet initialization behavior, expanded wallet toggle copy, changelog
- Summary: Stop turning agent spending on automatically after wallet creation, so newly initialized wallets do not immediately enter the red funding/runway state. Rename the wallet toggle to Spend on/off and clarify that it controls whether the agent may spend from the wallet.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/components/wallet/AgentWalletCard.tsx src/app/page.tsx --max-warnings=999` passed with existing page warnings only; `git diff --check -- src/components/wallet/AgentWalletCard.tsx src/app/page.tsx CHANGELOG.md`.
- Intended commit message: `Keep new wallet spending off`

## 2026-05-25 01:22 WITA - Remove Wallet Setup Header Icon

- Status: Pushed
- Areas changed: compact wallet card setup state, changelog
- Summary: Remove the top icon from compact wallet setup confirmation/loading states so the inline setup card keeps the same height and rhythm as the normal compact wallet card.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/components/wallet/AgentWalletCardCompact.tsx --max-warnings=0`; `git diff --check -- src/components/wallet/AgentWalletCardCompact.tsx src/components/wallet/AgentWalletCardCompact.module.css CHANGELOG.md`.
- Intended commit message: `Remove wallet setup header icon`

## 2026-05-25 01:19 WITA - Tighten Wallet Setup Confirmation Card

- Status: Pushed
- Areas changed: compact wallet card setup copy and sizing, changelog
- Summary: Remove the explanatory body text from the compact wallet creation confirmation and tune the setup, loading, and success states to stay close to the original compact wallet card height.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/components/wallet/AgentWalletCardCompact.tsx --max-warnings=0`; `git diff --check -- src/components/wallet/AgentWalletCardCompact.tsx src/components/wallet/AgentWalletCardCompact.module.css CHANGELOG.md`.
- Intended commit message: `Tighten wallet setup confirmation card`

## 2026-05-25 01:16 WITA - Improve Wallet Initialization UX

- Status: Pushed
- Areas changed: compact wallet card setup flow, expanded wallet rail copy, wallet card styling, changelog
- Summary: Move wallet initialization out of the expanded Core rails panel and into the compact agent wallet card. Uninitialized wallet cards now confirm wallet creation in-place with large cancel/confirm controls, show a loading state for at least two seconds while setup runs, show a completion checkmark before opening the full wallet, and remove the visible ClawCard demotion copy from the rail footer.
- Verification: Pending.
- Intended commit message: `Improve wallet initialization UX`

## 2026-05-25 01:03 WITA - Simplify Agent Payment Rails

- Status: Pushed
- Areas changed: agent wallet defaults, payment provider copy, Wallets agent cards, MoneyClaw status wiring, changelog
- Summary: Make MoneyClaw the default card rail, keep local USDC wallets and x402 as first-class rails, position Bankr as the trading rail, demote ClawCard to legacy advanced setup, and add a one-click Initialize action plus rail readiness checklist to each expanded agent wallet card.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/components/wallet/AgentWalletCard.tsx src/components/wallet/AgentWalletCardCompact.tsx src/app/page.tsx src/lib/config/agent-payments.ts src/lib/utils/agent-wallet.ts --max-warnings=999` passed with existing page warnings only; `git diff --check -- src/components/wallet/AgentWalletCard.tsx src/components/wallet/AgentWalletCard.module.css src/components/wallet/AgentWalletCardCompact.tsx src/app/page.tsx src/lib/config/agent-payments.ts src/lib/utils/agent-wallet.ts CHANGELOG.md`; temporary dev server on port 5021 rendered the expanded seeded wallet card with Core rails, Initialize, MoneyClaw, Bankr trading, and ClawCard demotion visible.
- Intended commit message: `Simplify agent payment rails`

## 2026-05-25 00:50 WITA - Add MoneyClaw Readiness API

- Status: Pushed
- Areas changed: MoneyClaw wallet service, MoneyClaw wallet API, changelog
- Summary: Add a server-side MoneyClaw status client backed by the documented MoneyClaw API, using `MONEYCLAW_API_KEY` or an agent's configured MoneyClaw env name to check `/me`, `/me/balance`, `/me/deposit-address`, and recent `/payment-intents` without exposing the key or performing spend actions.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/lib/services/wallet/moneyclaw-client.ts src/app/api/wallet/moneyclaw/route.ts --max-warnings=0`; `git diff --check -- src/lib/services/wallet/moneyclaw-client.ts src/app/api/wallet/moneyclaw/route.ts CHANGELOG.md`.
- Intended commit message: `Add MoneyClaw readiness API`

## 2026-05-25 00:37 WITA - Add Encrypted Wallet Vault Sync

- Status: Pushed
- Areas changed: wallet vault sync service, wallet sync API, wallet creation route, Wallets vault controls, changelog
- Summary: Add a GPG-encrypted shared-brain wallet vault path. Wallet creation now tries to sync the encrypted vault plus its vault key material into `hive.wallet-vault.gpg`, writes adjacent reference-only metadata to `hive.wallet-vault.md`, and exposes Sync/Restore controls in the Wallets rail without putting wallet secrets in plaintext Obsidian notes.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/lib/services/wallet/wallet-vault-backup.ts src/app/api/wallet/vault-backup/route.ts src/app/api/wallet/create/route.ts src/lib/services/wallet/local-wallet-vault.ts --max-warnings=0`; `git diff --check -- src/lib/services/wallet/local-wallet-vault.ts src/lib/services/wallet/wallet-vault-backup.ts src/app/api/wallet/vault-backup/route.ts src/app/api/wallet/create/route.ts src/app/page.tsx src/app/wallets.module.css CHANGELOG.md`; live `localhost:5020` route smoke timed out without response, so runtime UI verification is pending without restarting Liam's managed dev server.
- Intended commit message: `Add encrypted wallet vault sync`

## 2026-05-25 00:09 WITA - Wire Shared Env Backup And Sync

- Status: Pushed
- Areas changed: `hive-env-add`, shared env API, More shared env UI, changelog
- Summary: Make the generic shared agent env participate in encrypted `hive.env.gpg` backup/restore, have the app save shared env edits through the real hive-env-add sync path, and add a Restore backup action/status in the Shared env UI.
- Verification: `python3 -m py_compile scripts/hive-env-add`; `pnpm exec tsc --noEmit --pretty false`; `git diff --check -- scripts/hive-env-add src/app/api/env/route.ts src/app/page.tsx CHANGELOG.md`; `node scripts/test-dashboard-nav.mjs`; `scripts/hive-env-add --backup-status --scope agent --runtime generic`; disposable GPG home smoke created and restored a fake shared env key through encrypted `hive.env.gpg`; local `/api/env` smoke returned shared count, backup path, and GPG availability without printing values.
- Intended commit message: `Wire shared env backup and sync`

## 2026-05-24 23:12 WITA - Show Agent Env Card Model Names

- Status: Pushed
- Areas changed: env management agent cards, changelog
- Summary: Use runtime model selection metadata when rendering env agent cards so provider/model labels fall back to the actual configured runtime model instead of `default model`.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `git diff --check -- src/app/page.tsx CHANGELOG.md`; Playwright opened More > Shared env and confirmed the stale `default model` text is absent with no page/console errors.
- Intended commit message: `Show agent env card model names`

## 2026-05-24 22:33 WITA - Keep Shared Env Store Runtime-Only

- Status: Pushed
- Areas changed: shared env API, changelog
- Summary: Keep the Env view's shared sync store pointed at the actual generic hive agent env file instead of pulling dashboard `.env.local` keys into the shared list.
- Verification: `scripts/hive-env-add --export-json --scope agent --runtime generic` reported 0 shared keys; `~/.hivemindos/.env` exists and currently has 0 keys.
- Intended commit message: `Keep shared env store runtime-only`

## 2026-05-24 22:23 WITA - Simplify Env Management UX

- Status: Pushed
- Areas changed: env management UI, shared env API, hive-env-add removal behavior, reusable agent env card, changelog
- Summary: Collapse env management to one shared sync store, hide dashboard `.env.local`, show runtime-specific keys only when they are not shared, add promote/remove controls, and replace the agent env list with reusable agent cards that support add/edit/remove.
- Verification: `node scripts/test-dashboard-nav.mjs`; `python3 -m py_compile scripts/hive-env-add`; `pnpm exec tsc --noEmit --pretty false`; `git diff --check -- src/app/page.tsx src/app/api/env/route.ts scripts/hive-env-add CHANGELOG.md scripts/test-dashboard-nav.mjs`; temp-file `hive-env-add --stdin` smoke confirmed empty stdin removes an env-file key; Playwright verified `/api/env` returns one shared source plus runtime sources, shared same-value POST succeeds, More > Shared env shows Shared sync store, Runtime-specific env, Specific to each agent, hides Dashboard shared env, and has no page/console errors.
- Intended commit message: `Simplify env management UX`

## 2026-05-24 22:10 WITA - Clear Stale Wallet Placeholder Balances

- Status: Pushed
- Areas changed: Wallet balance helpers, wallet ledger hydration/rendering, wallet card display, Queen Bee shared wallet record
- Summary: Treat disabled wallets with no address and no on-chain sync as unfunded, so stale placeholder accounting cannot show as spendable USDC. Wallet ledger reads and writes now strip that unfunded placeholder shape, Syncthing conflict notes are ignored by the ledger reader, and the Queen Bee shared wallet record was cleared from the old `$10.00 USDC` placeholder to `$0.00`.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/lib/utils/agent-wallet.ts src/lib/services/obsidian/wallet-ledger.ts src/components/wallet/AgentWalletCard.tsx src/components/wallet/AgentWalletCardCompact.tsx src/app/page.tsx --max-warnings=999` passed with existing dashboard warnings only; `git diff --check -- src/lib/utils/agent-wallet.ts src/lib/services/obsidian/wallet-ledger.ts src/components/wallet/AgentWalletCard.tsx src/components/wallet/AgentWalletCardCompact.tsx src/app/page.tsx CHANGELOG.md`; `rg` confirmed no `$10.00 USDC`/`currentBalanceUsd: 10` remains in wallet ledger records; local API smoke returned Queen Bee with `currentBalanceUsd: 0`, `seedBalanceUsd: 0`, no wallet address, and `onchainBalanceUsd: 0`; Browser checked `http://localhost:5020` Wallets and confirmed Queen Bee tiles show `$0.00 USDC` with `Wallet off` and no `$10.00`.
- Intended commit message: `Clear stale wallet placeholder balances`

## 2026-05-24 22:01 WITA - Accordion Fleet Roster

- Status: Pushed
- Areas changed: fleet roster machine expansion, changelog
- Summary: Treat machine expansion like an accordion so selecting or expanding one machine collapses the others.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/components/fleet/FleetView.tsx --max-warnings=0`; `git diff --check -- src/components/fleet/FleetView.tsx CHANGELOG.md`.
- Intended commit message: `Accordion fleet roster`

## 2026-05-24 22:00 WITA - Auto Expand Selected Machine

- Status: Pushed
- Areas changed: fleet roster machine selection, changelog
- Summary: Expand a machine's roster row automatically when the machine is selected, while leaving the arrow control available for manual collapse or expand.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/components/fleet/FleetView.tsx --max-warnings=0`; `git diff --check -- src/components/fleet/FleetView.tsx CHANGELOG.md`.
- Intended commit message: `Auto expand selected machine`

## 2026-05-24 22:00 WITA - Filter Cron Chat Rows

- Status: Pushed
- Areas changed: chat task filtering, fleet recent chat rows, changelog
- Summary: Exclude Hermes cron sessions from the resumable chat predicate so cron placeholders do not appear in, or count toward, the fleet agent's latest three chat rows.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/page.tsx --max-warnings=999` passed with existing dashboard warnings; `git diff --check -- src/app/page.tsx CHANGELOG.md`.
- Intended commit message: `Filter cron chat rows`

## 2026-05-24 21:59 WITA - Make Env Viewer Editable

- Status: Pushed
- Areas changed: shared env API, More env view, agent env overlays, changelog
- Summary: Allow shared hive-env-add variables and per-agent env overlays to be edited inline, saving shared values through local-only `hive-env-add` on blur or Enter and saving agent overlays back to their agent profile.
- Verification: `node scripts/test-dashboard-nav.mjs`; `pnpm exec tsc --noEmit --pretty false`; `git diff --check -- src/app/page.tsx src/app/api/env/route.ts CHANGELOG.md scripts/test-dashboard-nav.mjs`; Playwright verified `/api/env` GET and POST of an existing same-value env key without printing secrets, opened More > Shared env, and confirmed editable password inputs render with the blur/Enter save copy.
- Intended commit message: `Make env viewer editable`

## 2026-05-24 21:36 WITA - Add Shared Env Viewer

- Status: Pushed
- Areas changed: More utilities, shared env API, agent env viewer, changelog
- Summary: Add a Shared env button to More, expose a read-only `/api/env` inventory backed by `hive-env-add --export-json`, and show masked shared/runtime env variables alongside each agent's dashboard-specific env overlay.
- Verification: `node scripts/test-dashboard-nav.mjs`; `scripts/hive-env-add --export-json --scope app --runtime generic`; `pnpm exec tsc --noEmit --pretty false`; `git diff --check -- src/app/page.tsx src/app/api/env/route.ts scripts/test-dashboard-nav.mjs CHANGELOG.md`; Playwright loaded `http://localhost:5020`, opened More, confirmed the Shared env card, Env headings, masked values, refresh button, and no page/console errors.
- Intended commit message: `Add shared env viewer`

## 2026-05-24 21:15 WITA - Show Recent Agent Chats

- Status: Pushed
- Areas changed: fleet agent data model, roster chat rows, list chat rows, dashboard fleet mapping, changelog
- Summary: Show up to three recent resumable chats for each selected fleet agent and simplify the resume tooltip to "Resume chat".
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/components/fleet/fleet-data.ts src/components/fleet/index.ts src/components/fleet/roster.tsx src/components/fleet/list-view.tsx src/components/fleet/FleetView.tsx --max-warnings=0`; `git diff --check -- src/components/fleet/fleet-data.ts src/components/fleet/index.ts src/components/fleet/roster.tsx src/components/fleet/list-view.tsx src/components/fleet/FleetView.tsx src/app/page.tsx CHANGELOG.md`; `curl -I --max-time 5 http://127.0.0.1:5020`; headless Playwright loaded `http://127.0.0.1:5020`, confirmed Fleet renders and the old `Resume latest task chat` text is absent. The current live fleet had `0 AGENTS`, so the smoke could not visually exercise populated chat rows.
- Intended commit message: `Show recent agent chats`

## 2026-05-24 21:11 WITA - Group Work Navigation

- Status: Pushed
- Areas changed: dashboard top navigation, Work view mode switcher, More utilities hub, dashboard nav smoke test, changelog
- Summary: Replace the top nav with Fleet, Work, Brain, Chat, Wallets, and More; move Workboard, Automations, and Simulation behind a segmented control in Work; and move Diagnostics, Files, and Alerts into More.
- Verification: `node scripts/test-dashboard-nav.mjs`; `pnpm exec tsc --noEmit --pretty false`; `git diff --check -- src/app/page.tsx scripts/test-dashboard-nav.mjs CHANGELOG.md`; Playwright loaded `http://localhost:5020`, confirmed the top nav labels, Work segmented tabs, Automations tab selection, More utilities, and no page/console errors.
- Intended commit message: `Group work navigation`

## 2026-05-24 21:00 WITA - Separate New Agent Chats

- Status: Pushed
- Areas changed: Fleet roster/list chat controls, dashboard chat session routing, OpenClaw gateway session keys, Hermes collector env overlay, agent duplicate flow, agent runtime profile model, OpenClaw docs/naming, changelog
- Summary: Reframe the selected-agent chat action as New Chat, add a task-row resume chat icon, generate reliable fresh OpenClaw session keys per chat leaf, preserve past dashboard chats as resumable leaves, add agent-specific env overlays, and replace leftover legacy companion naming with HivemindOS.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `node --check scripts/agent-telemetry-collector.mjs`; `node --check scripts/capture-remotion-showcase.mjs`; focused `pnpm exec eslint ...` passed with existing page warnings only; `rg -n "ami-companion|anime waifu|anime-waifu|my-anime-waifu|waifu|withami|workspace-ami|Ami: AI Companion|\bAmi\b|AmiClaw|amiclaw|AMICLAW|from-ami|ami-custom" . -S -g '!*node_modules*' -g '!tsconfig.tsbuildinfo'` returned no matches; `git diff --check`; `curl -I http://127.0.0.1:5020` returned 200; headless Playwright loaded `http://127.0.0.1:5020` with title `HivemindOS` and only the existing dev HMR websocket warning.
- Intended commit message: `Separate new agent chats`

## 2026-05-24 20:51 WITA - Stabilize Duplicate Agent Render Keys

- Status: Pushed
- Areas changed: Fleet agent cells, scheduler agent selector, wallet agent list, changelog
- Summary: Use composite render keys for agent lists so duplicated discovered Hermes ids do not trigger React duplicate-key warnings or unstable wallet rows.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `git diff --check -- src/app/page.tsx CHANGELOG.md`; Browser opened `http://localhost:5020`, switched to Wallets, and reported no duplicate-key console errors or page errors.
- Intended commit message: `Stabilize duplicate agent render keys`

## 2026-05-24 20:47 WITA - Suppress Hermes Inventory Noise

- Status: Pushed
- Areas changed: Chat assistant transcript normalization, chat message visibility, changelog
- Summary: Hide Hermes startup inventory/tool banners from web chat, promote more plain-text assistant section labels into headings, and convert colon-led plain text lists into bullets so streamed Hermes responses read as formatted chat instead of terminal output.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `git diff --check -- src/app/page.tsx CHANGELOG.md`; Browser loaded `http://localhost:5020` with no page errors and checked the formatter contract for hiding Hermes inventory text, promoting headings, and bulleting colon-led lists.
- Intended commit message: `Suppress Hermes inventory noise`

## 2026-05-24 20:38 WITA - Preserve Full Hermes Chat History

- Status: Pushed
- Areas changed: Fleet chat resume behavior, task resume chat routing, changelog
- Summary: Stop applying the compact five-message preview window when opening a real Hermes runtime session, so hydrated Hermes chats show the user's prior turns and full session history instead of only the latest assistant response.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `git diff --check -- src/app/page.tsx CHANGELOG.md`; Browser loaded `http://localhost:5020` with no page errors after the history-window change.
- Intended commit message: `Preserve full Hermes chat history`

## 2026-05-24 20:34 WITA - Restore Chat Top Nav

- Status: Pushed
- Areas changed: dashboard top navigation, changelog
- Summary: Re-add Chat as a top-level dashboard tab while keeping Diagnostics inside Fleet and Files inside Brain.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `git diff --check -- src/app/page.tsx CHANGELOG.md`; Browser checked `http://localhost:5020` and confirmed the top nav shows Fleet, Work, Brain, Automations, Swarm, Wallets, and Chat with no page errors.
- Intended commit message: `Restore chat top nav`

## 2026-05-24 20:23 WITA - Refine Chat Message Rendering

- Status: Pushed
- Areas changed: Chat transcript rendering, Hermes assistant transcript cleanup, chat scrolling behavior, chat CSS module, changelog
- Summary: Render assistant replies as unboxed prose, keep only user messages in bubbles, strip Hermes TUI banners/status/footer before markdown formatting, improve wrapping for long runtime output, and stop auto-scroll from jerking the transcript when the user scrolls away from the bottom.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `git diff --check -- src/app/page.tsx src/app/chat.module.css CHANGELOG.md`; Browser loaded `http://localhost:5020` with no page errors and confirmed chat CSS has unboxed assistant rules, gated auto-scroll styling, and long-output wrapping.
- Intended commit message: `Refine chat message rendering`

## 2026-05-24 20:08 WITA - Avoid Empty Hermes Resume Bubbles

- Status: Pushed
- Areas changed: Fleet Hermes session snapshots, telemetry collector Hermes session scan, targeted agent-session hydration, chat resume seed messages, changelog
- Summary: Stop metadata-only Hermes sessions from opening Chat with a fake assistant bubble, hydrate clicked Fleet chats from the collector's Hermes session endpoint, and make that endpoint read both Hermes JSON session files and `state.db` cron sessions.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `node --check scripts/agent-telemetry-collector.mjs`; `git diff --check -- src/app/page.tsx src/app/api/chat/agent-session/route.ts src/app/api/fleet/snapshot/route.ts scripts/agent-telemetry-collector.mjs CHANGELOG.md`; restarted `com.agent-control-room.telemetry`; local collector `/sessions?sessionId=20260524_154625_4295cb&localDataDir=$HOME/.hermes` returned 4 hydrated Hermes messages from `state.db`; dashboard `/api/chat/agent-session` proxy returned the same session messages; Browser loaded `http://localhost:5020` with no page errors.
- Intended commit message: `Avoid empty Hermes resume bubbles`

## 2026-05-24 19:45 WITA - Protect Managed Dev Server Port

- Status: Pushed
- Areas changed: project agent instructions, local dev server process
- Summary: Free port `5020` on request and document that port `5020` belongs to Liam's managed dev server, so agents must not kill or replace it and should use another port for their own testing.
- Verification: `lsof -nP -iTCP:5020 -sTCP:LISTEN` returned no listener after killing PID `24435`; `git diff --check -- AGENTS.md CHANGELOG.md`.
- Intended commit message: `Protect managed dev server port`

## 2026-05-24 19:41 WITA - Update Machines Through Collectors

- Status: Pushed
- Areas changed: Fleet update API, changelog
- Summary: Use a reachable machine collector directly for roster updates instead of trying SSH first, so machines that expose `/update` through Hivemind Link do not fail just because port 22 is closed.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `git diff --check -- src/app/api/fleet/update/route.ts CHANGELOG.md`; local POST reproduced the previous 502 as an SSH port-22 refusal before the fix.
- Intended commit message: `Update machines through collectors`

## 2026-05-24 19:36 WITA - Quiet Hivemind Link Setup

- Status: Pushed
- Areas changed: telemetry collector installer, changelog
- Summary: Replace verbose Hivemind Link setup internals with a short user-facing flow, remove repeated wait messages, and stop launching an extra direct sidecar fallback while setup waits for Link.
- Verification: `bash -n scripts/install-telemetry-collector.sh`; `pnpm exec tsc --noEmit --pretty false`; `git diff --check -- scripts/install-telemetry-collector.sh CHANGELOG.md`.
- Intended commit message: `Quiet Hivemind Link setup`

## 2026-05-24 19:28 WITA - Auto-Select Link Control Port

- Status: Pushed
- Areas changed: telemetry collector installer, setup summary, Link control discovery, uninstall prompts, changelog
- Summary: Detect when another local app owns the Hivemind Link control port, automatically choose a free fallback control port, persist it in `~/.hivemindos/collector.env`, and have dashboard discovery read that persisted control URL.
- Verification: `bash -n scripts/install-telemetry-collector.sh setup.sh uninstall.sh`; `pwsh -NoProfile -Command { $null = [System.Management.Automation.PSParser]::Tokenize((Get-Content -Raw uninstall.ps1), [ref]$null) }` if PowerShell is available; `pnpm exec tsc --noEmit --pretty false`; `git diff --check -- scripts/install-telemetry-collector.sh setup.sh uninstall.sh uninstall.ps1 src/app/api/fleet/discover/route.ts src/app/api/tailscale/devices/route.ts src/lib/services/hivemind-link-control.ts CHANGELOG.md`.
- Intended commit message: `Auto-select Link control port`

## 2026-05-24 19:07 WITA - Clarify Collector Reachability States

- Status: Pushed
- Areas changed: Fleet reachability badges, changelog
- Summary: Stop showing the collector fix badge while discovery is still checking a machine, and classify online peers with no Tailscale handshake as Tailnet unreachable instead of a generic collector failure.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `git diff --check -- src/app/page.tsx CHANGELOG.md`; live discovery confirmed Ubuntu is reachable through Hivemind Link while the MacBook Link peer times out and has no handshake from this dashboard node.
- Intended commit message: `Clarify collector reachability states`

## 2026-05-24 18:59 WITA - Mark Merged Changelog Entries Pushed

- Status: Pushed
- Areas changed: changelog
- Summary: Mark merged changelog entries as pushed after bringing the working branch into main.
- Verification: `git diff --check -- CHANGELOG.md`.
- Intended commit message: `Mark merged changelog entries pushed`

## 2026-05-24 18:55 WITA - Explain Blocked Local Updates

- Status: Pushed
- Areas changed: Fleet update API, roster update tooltip, Fleet update detail plumbing, changelog
- Summary: Preflight local `This Mac` updates for uncommitted changes before running `git pull`, return a clear blocked-checkout error, and surface update failure details from the roster button instead of requiring DevTools.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `git diff --check -- src/app/api/fleet/update/route.ts src/components/fleet/roster.tsx src/components/fleet/FleetView.tsx src/app/page.tsx CHANGELOG.md`; local `/api/fleet/update` smoke now returns a clear uncommitted-changes error before attempting `git pull`.
- Intended commit message: `Explain blocked local updates`

## 2026-05-24 18:49 WITA - Re-Enable Local Machine Updates

- Status: Pushed
- Areas changed: Fleet local update availability, machine version copy, update result messaging, changelog
- Summary: Make `This Mac` updateable again through the existing local-shell update path, keep mobile devices non-updateable, and distinguish local checkout update messaging from remote collector updates.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `git diff --check -- src/app/page.tsx CHANGELOG.md`; live Fleet discovery confirms `This Mac` is stale/dirty locally, so pressing Update will use the local update path and should fail visibly if the checkout cannot fast-forward.
- Intended commit message: `Re-enable local machine updates`

## 2026-05-24 18:42 WITA - Share Machine Aliases And Hide Self Update

- Status: Pushed
- Areas changed: shared-vault machine alias API, dashboard alias sync, Fleet update availability, changelog
- Summary: Sync machine display aliases through the shared Obsidian vault so dashboard renames follow the user across machines, keep aliases separate from stable Tailscale Link hostnames, and hide/guard misleading local `This Mac` collector update actions.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `git diff --check -- src/app/page.tsx src/components/fleet/fleet-data.ts src/components/fleet/roster.tsx src/components/fleet/FleetView.tsx src/app/api/obsidian/machine-aliases/route.ts src/lib/services/obsidian/machine-aliases.ts CHANGELOG.md`; local API smoke read the default shared-vault alias file and POST/GET round-tripped an alias in a temporary vault.
- Intended commit message: `Share machine aliases and hide self update`

## 2026-05-24 18:34 WITA - Add Editable Fleet Machine Names

- Status: Pushed
- Areas changed: Fleet roster rename control, dashboard machine aliases, local persistence, changelog
- Summary: Add an inline pencil rename action to roster machine names, save aliases keyed by stable machine identity, and apply persisted names across Fleet-derived machine views.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `git diff --check -- src/app/page.tsx src/components/fleet/FleetView.tsx src/components/fleet/roster.tsx CHANGELOG.md`.
- Intended commit message: `Add editable Fleet machine names`

## 2026-05-24 18:28 WITA - Compact Cluster Machine Labels

- Status: Pushed
- Areas changed: Fleet cluster machine glyph, changelog
- Summary: Replace full machine names inside tiny Fleet cluster computer/phone glyphs with compact stable call-signs like `THIS MAC`, `MBP 2`, and `iP 182`, leaving full names to the surrounding labels and tooltips.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `git diff --check -- src/components/fleet/machine-cluster.tsx CHANGELOG.md`.
- Intended commit message: `Compact cluster machine labels`

## 2026-05-24 18:24 WITA - Show Mobile Fleet Icons

- Status: Pushed
- Areas changed: Fleet machine data, roster/list/map/cluster/footer machine icons, changelog
- Summary: Mark iOS and Android Tailnet devices as mobile in Fleet data and render them with phone icons instead of desktop monitor icons across Fleet views.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `git diff --check -- src/app/page.tsx src/components/fleet/fleet-data.ts src/components/fleet/roster.tsx src/components/fleet/list-view.tsx src/components/fleet/map-view.tsx src/components/fleet/footers.tsx src/components/fleet/machine-cluster.tsx CHANGELOG.md`.
- Intended commit message: `Show mobile Fleet icons`

## 2026-05-24 18:20 WITA - Hide Link Namespace In Machine Labels

- Status: Pushed
- Areas changed: dashboard machine labels, changelog
- Summary: Keep `hivemindos-*` names for internal Link identity and DNS matching, but strip the namespace from user-facing dashboard machine names.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `git diff --check -- src/app/page.tsx CHANGELOG.md`.
- Intended commit message: `Hide Link namespace in machine labels`

## 2026-05-24 18:15 WITA - Drop Stale Empty Link Cards

- Status: Pushed
- Areas changed: dashboard machine merge, changelog
- Summary: Stop preserving missing `hivemindos-*` machines when they have no agents or snapshots, so stale unsuffixed Link history for this Mac collapses into the live `This Mac` card instead of rendering as a disconnected setup target.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `git diff --check -- src/app/page.tsx CHANGELOG.md`; live `/api/fleet/discover` returns `This Mac`, `iphone182`, and `hivemindos-liams-macbook-pro-local-2` with no unsuffixed stale Link machine.
- Intended commit message: `Drop stale empty Link cards`

## 2026-05-24 18:01 WITA - Avoid Collector Port Conflicts In Link Mode

- Status: Pushed
- Areas changed: telemetry collector installer, setup health check, changelog
- Summary: In Hivemind Link mode, detect when `127.0.0.1:8787` is already owned by another local service, move the private collector to a fallback localhost port, keep the Tailnet-facing Link port at `8787`, and make setup validate that `/health` is actually HivemindOS rather than any app returning `{ ok: true }`.
- Verification: `bash -n scripts/install-telemetry-collector.sh setup.sh`; `git diff --check -- scripts/install-telemetry-collector.sh setup.sh CHANGELOG.md`.
- Intended commit message: `Avoid collector port conflicts in Link mode`

## 2026-05-24 17:35 WITA - Dedupe Hivemind Link Roster Nodes

- Status: Pushed
- Areas changed: Fleet discovery, Tailscale device machine dedupe, dashboard machine merge, changelog
- Summary: Keep mobile Tailscale devices visible for future encrypted file-sharing, but show desktop/server Fleet devices only when they are namespaced `hivemindos-*` Link nodes. Distinct Link nodes are keyed by their Tailscale DNS labels, mobile devices no longer show collector-repair warnings, stale client-preserved desktop/server cards are dropped when they are no longer returned by discovery, and the current managed Link node is exposed as `This Mac` instead of its `hivemindos-*` DNS label.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `git diff --check -- src/app/api/fleet/discover/route.ts src/app/api/tailscale/devices/route.ts src/app/page.tsx CHANGELOG.md`; local `/api/tailscale/devices` exposes the current managed Link node as `This Mac`; local `/api/fleet/discover` returns `This Mac` with collector `ready` and 2 agents plus the iOS Tailnet device and remote `hivemindos-*` Mac node.
- Intended commit message: `Dedupe Hivemind Link roster nodes`

## 2026-05-24 17:11 WITA - Show Hivemind Link Wait Progress

- Status: Pushed
- Areas changed: telemetry collector installer, changelog
- Summary: Print progress while setup waits for Hivemind Link to produce a sign-in or connected state, announce the direct sidecar fallback, and show bounded verification status after the user presses Enter following Link sign-in.
- Verification: `bash -n scripts/install-telemetry-collector.sh`; `git diff --check -- scripts/install-telemetry-collector.sh CHANGELOG.md`.
- Intended commit message: `Show Hivemind Link wait progress`

## 2026-05-24 16:54 WITA - Normalize Next Dev Port Args

- Status: Pushed
- Areas changed: dev server script, package scripts, changelog
- Summary: Route `pnpm dev` through a small wrapper that chooses one Next.js port flag, so `pnpm dev`, `PORT=5021 pnpm dev`, and `pnpm dev -p 5021` no longer produce duplicate `-p` arguments.
- Verification: `node --check scripts/dev-server.mjs`; `git diff --check -- package.json scripts/dev-server.mjs CHANGELOG.md`; restarted the local dev server in detached `screen` session `hivemindos-dev` and confirmed the live command is `next dev --webpack -p 5020` with no duplicate port flag and a listener on `*:5020`.
- Intended commit message: `Normalize Next dev port args`

## 2026-05-24 16:40 WITA - Keep Proxied Fleet Machines Unique

- Status: Pushed
- Areas changed: Fleet machine identity keys, changelog
- Summary: Preserve meaningful collector URL paths when deriving fleet machine keys so Hivemind Link proxied peers no longer collapse into the same `127.0.0.1:8788` roster identity.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `git diff --check -- src/app/page.tsx CHANGELOG.md`; focused Node smoke confirmed two `http://127.0.0.1:8788/peer/...` collectors now derive distinct keys while a plain `http://100.64.0.1:8787` collector key stays unchanged.
- Intended commit message: `Keep proxied fleet machines unique`

## 2026-05-24 16:32 WITA - Split Wallets And Usage Modes

- Status: Pushed
- Areas changed: Wallets dashboard view, wallet CSS module, changelog
- Summary: Add a Wallets/Usage segmented control inside the Wallets view, default to Wallets, and move runtime token analytics behind the Usage segment.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `git diff --check -- src/app/page.tsx src/app/wallets.module.css CHANGELOG.md`; Browser checked `http://localhost:5020` and confirmed Wallets is the default selected segment, token usage is hidden by default, and the Usage segment reveals token analytics while hiding the wallet grid/empty state.
- Intended commit message: `Split wallets and usage modes`

## 2026-05-24 16:26 WITA - Restart Link LaunchAgent Reliably

- Status: Pushed
- Areas changed: telemetry collector installer, changelog
- Summary: Replace macOS LaunchAgent unload/load with bootout/bootstrap for collector and Hivemind Link jobs, kill stale sidecar processes across checkouts, wait up to 60 seconds for Link status, directly start the sidecar if launchd does not answer, scrape binary Link logs safely for the Tailscale auth URL, and in interactive setup wait for the user to confirm sign-in before verifying Link is connected.
- Verification: `bash -n scripts/install-telemetry-collector.sh`; `git diff --check -- scripts/install-telemetry-collector.sh CHANGELOG.md`; clean-reset smoke stopped `com.hivemindos.linkd`, removed `~/.hivemindos/link`, reinstalled the collector, and setup printed `Hivemind Link sign-in required` with a Tailscale auth URL.
- Intended commit message: `Restart Link LaunchAgent reliably`

## 2026-05-24 16:17 WITA - Simplify Control Room Navigation

- Status: Pushed
- Areas changed: dashboard top navigation, Fleet diagnostics entry point, Brain file explorer entry point, wallet tab label
- Summary: Keep Swarm top-level, rename Scheduler to Automations, restore the wallet tab to Wallets, and move Doctor and Files out of the primary nav into Fleet diagnostics and Brain files actions.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `git diff --check -- src/app/page.tsx CHANGELOG.md`; Browser checked `http://localhost:5020` and confirmed the top nav is Fleet, Work, Brain, Automations, Swarm, Wallets with no Doctor or Files tabs, plus Fleet Diagnostics, Brain Files, and the Wallets heading.
- Intended commit message: `Simplify control room navigation`

## 2026-05-24 16:14 WITA - Clarify Reused Hivemind Link Login

- Status: Pushed
- Areas changed: telemetry collector installer, changelog
- Summary: When the embedded Hivemind Link sidecar is already authenticated from preserved local state, setup now prints that Link is already connected and explains that a first-time sign-in test requires stopping the Link service before removing local Link state.
- Verification: `bash -n scripts/install-telemetry-collector.sh`; `git diff --check -- scripts/install-telemetry-collector.sh CHANGELOG.md`; local Link status reports `ok: true`, `backendState: "Running"`, and the HivemindOS Link MagicDNS name.
- Intended commit message: `Clarify reused Hivemind Link login`

## 2026-05-24 15:59 WITA - Make Aeon Skill Uninstall Conservative

- Status: Pushed
- Areas changed: macOS/Linux uninstall script, changelog
- Summary: Split Aeon shared-brain manifest cleanup from deleting mirrored Aeon skill folders, make both prompts conservative by default, and clarify that mirrored Aeon skill directories are only copies created from the shared Skills shelf.
- Verification: `bash -n uninstall.sh`; `git diff --check -- uninstall.sh CHANGELOG.md`; confirmed the local Aeon skill folder still contains mirrored skills after the prompt wording change.
- Intended commit message: `Make Aeon skill uninstall conservative`

## 2026-05-24 16:00 WITA - Add Runtime Control Room Surfaces

- Status: Pushed
- Areas changed: runtime usage analytics, runtime stream event normalization, runtime session utilities, Hermes schedule adapter, maintenance diagnostics and repairs, scoped runtime file explorer, Usage & Wallets UI, Doctor and Files tabs, assimilation manifest
- Summary: Generalize HCI-inspired profile/session/usage/maintenance/file-control patterns around HivemindOS agent runtime profiles and bee subclasses instead of adding a separate profile model.
- Verification: `pnpm exec tsc --noEmit --pretty false`; targeted `git diff --check`; `node --check scripts/agent-telemetry-collector.mjs`; assimilation manifest verification; local API smoke for `/api/runtime-usage`, `/api/maintenance`, and `/api/runtime-files`; Browser checked the `Usage & Wallets`, `Doctor`, and `Files` tabs on `http://localhost:5020`. Targeted ESLint has no errors, with existing MiroShark/unused-disable warnings still present in `src/app/page.tsx`.
- Intended commit message: `Add runtime control room surfaces`

## 2026-05-24 15:45 WITA - Match Hermes CLI Chat Parity

- Status: Pushed
- Areas changed: Hermes telemetry collector chat bridge, agent runtime route, Fleet dashboard task chat routing, assimilation manifest, changelog
- Summary: Route Hermes dashboard replies through `hermes chat -q` with the task's runtime session id and raw user prompt so Chat receives the same transcript, status, tool, and session output as the Hermes CLI.
- Verification: `node --check scripts/agent-telemetry-collector.mjs`; `pnpm exec tsc --noEmit --pretty false`; `git diff --check -- scripts/agent-telemetry-collector.mjs src/app/api/chat/agent-runtime/route.ts src/app/page.tsx ASSIMILATION.json CHANGELOG.md`; restarted `com.agent-control-room.telemetry`; direct collector smoke returned CLI transcript SSE chunks with `Query:`, `Initializing agent...`, the Hermes response box, and `hermes --resume`; resume smoke with `runtimeSessionId` returned `↻ Resumed session 20260524_154625_4295cb`.
- Intended commit message: `Match Hermes CLI chat parity`

## 2026-05-24 15:16 WITA - Fix Fleet Roster Badge Wrapping

- Status: Pushed
- Areas changed: Fleet roster machine row layout, fleet roster badge styling
- Summary: Recompose roster machine rows so update/count controls no longer squeeze the device name column, and let network status badges wrap instead of truncating labels.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/components/fleet/roster.tsx`; `git diff --check -- src/components/fleet/roster.tsx src/components/fleet/fleet-tokens.module.css CHANGELOG.md`; Playwright checked the 209px roster rail with update controls and a mocked `Tailscale not configured. Fix?` badge wrapping inside the card.
- Intended commit message: `Fix fleet roster badge wrapping`

## 2026-05-24 15:11 WITA - Confirm Hivemind Link Sign-In

- Status: Pushed
- Areas changed: Fleet dashboard Hivemind Link sign-in banner
- Summary: Start short polling after the Hivemind Link sign-in button is pressed, show a temporary connected confirmation when the embedded Link node reaches `Running`, auto-hide it after 10 seconds, and add an immediate dismiss button to both the sign-in and connected states.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `git diff --check -- src/app/page.tsx CHANGELOG.md`; Playwright mocked a `NeedsLogin` to `Running` transition and confirmed the sign-in banner, connected confirmation, and dismiss button all work; local Link status now returns `backendState: "Running"` through `/api/tailscale/devices`.
- Intended commit message: `Confirm Hivemind Link sign-in`

## 2026-05-24 15:01 WITA - Surface Hivemind Link Sign-In

- Status: Pushed
- Areas changed: Fleet discovery API, Tailscale device API, Fleet dashboard status UI
- Summary: Prefer the embedded Hivemind Link sidecar when it is running, preserve system Tailscale as a fallback, and show a visible Fleet sign-in banner when the app-managed Link node still needs Tailscale authorization.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `git diff --check -- src/app/api/fleet/discover/route.ts src/app/api/tailscale/devices/route.ts src/app/page.tsx CHANGELOG.md`; local `/api/tailscale/devices` and `/api/fleet/discover` return `source: "hivemind-link"` with `backendState: "NeedsLogin"`; Playwright confirmed the Fleet sign-in banner renders after restarting the dev server.
- Intended commit message: `Surface Hivemind Link sign-in`

## 2026-05-24 14:15 WITA - Quiet Default Link Setup

- Status: Pushed
- Areas changed: setup script, changelog
- Summary: Stop printing the Tailnet rsync/Syncthing skip warning during the default Hivemind Link setup path so Link reads as the normal mode, not a degraded fallback.
- Verification: `bash -n setup.sh`; `pnpm exec tsc --noEmit --pretty false`; `git diff --check -- setup.sh src/app/page.tsx CHANGELOG.md`.
- Intended commit message: `Quiet default Link setup`

## 2026-05-24 15:05 WITA - Keep Task Chat Replies In Selected Session

- Status: Pushed
- Areas changed: Chat session message storage, selected task chat streaming, changelog
- Summary: Store selected task chat messages under the active chat leaf instead of the agent-wide direct chat, and keep the selected task preview live while outbound replies stream so old dashboard chat history does not replace the visible conversation.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `git diff --check -- src/app/page.tsx CHANGELOG.md`.
- Intended commit message: `Keep task chat replies in selected session`

## 2026-05-24 15:30 WITA - Surface Stalled Chat Responses

- Status: Pushed
- Areas changed: Chat streaming request handling, task chat error display, changelog
- Summary: Add an interactive chat response watchdog, cancel completed SSE readers on `[DONE]`, and replace the pending assistant placeholder with a clear error when Hermes stalls or finishes without text.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `git diff --check -- src/app/page.tsx CHANGELOG.md`.
- Intended commit message: `Surface stalled chat responses`

## 2026-05-24 15:34 WITA - Forward Hermes API Stream Text

- Status: Pushed
- Areas changed: Hermes telemetry collector chat bridge, changelog
- Summary: Make the collector's Hermes API stream bridge extract assistant text from all supported response shapes instead of only forwarding `choices[0].delta.content`, so valid Hermes responses are not dropped before reaching Chat.
- Verification: `node --check scripts/agent-telemetry-collector.mjs`; `pnpm exec tsc --noEmit --pretty false`; `git diff --check -- scripts/agent-telemetry-collector.mjs src/app/page.tsx CHANGELOG.md`; restarted `com.agent-control-room.telemetry`; direct `curl --max-time 35 http://127.0.0.1:8787/chat` returned an SSE `OK` content chunk.
- Intended commit message: `Forward Hermes API stream text`

## 2026-05-24 14:00 WITA - Resume Fleet Roster Task Chats

- Status: Pushed
- Areas changed: Fleet roster chat handoff, chat session preview routing, changelog
- Summary: Make The Roster's Chat action resume the agent's latest Hermes/dashboard task chat, including cached task messages and working directory context, instead of opening the agent's blank direct chat.
- Verification: `pnpm exec tsc --noEmit --pretty false`; staged `git diff --check`.
- Intended commit message: `Resume fleet roster task chats`

## 2026-05-24 14:07 WITA - Match Roster Chat To Displayed Task

- Status: Pushed
- Areas changed: Fleet roster chat handoff, chat task selection, changelog
- Summary: Pass the roster's displayed task title into Chat, use it to select the matching Hermes session before falling back to dashboard-local chat history, and keep dashboard chat history from replacing real collector/Hermes work in the roster.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `git diff --check -- src/app/page.tsx CHANGELOG.md`.
- Intended commit message: `Match roster chat to displayed task`

## 2026-05-24 12:54 WITA - Add App-Managed Hivemind Link

- Status: Pushed
- Areas changed: embedded Tailscale Link sidecar, collector binding, Fleet/Tailscale discovery APIs, setup/uninstall scripts, docs, gitignore, assimilation manifest, changelog
- Summary: Add a `hivemind-linkd` tsnet sidecar that lets HivemindOS expose the localhost collector through an app-managed Tailscale node using the user's own Tailscale account, make Link the default setup network mode, keep the heavier system Tailscale/Syncthing/SSH path behind `--system-tailscale`, and skip production dashboard builds unless `--build` is requested.
- Verification: `bash -n setup.sh && bash -n scripts/install-telemetry-collector.sh`; `pnpm exec tsc --noEmit --pretty false`; targeted `git diff --check`.
- Intended commit message: `Add app-managed Hivemind Link`

## 2026-05-23 17:38 WITA - Add Machine Filters To Agent Picker

- Status: Pushed
- Areas changed: Agent picker modal, assimilation manifest, changelog
- Summary: Add machine filter badges to the reusable agent picker so users can scope visible agent cards to all machines or a specific configured machine, with per-machine agent counts.
- Verification: Pending.
- Intended commit message: `Add machine filters to agent picker`

## 2026-05-23 17:32 WITA - Dedupe Fleet Machines

- Status: Pushed
- Areas changed: Fleet discovery API, Tailscale devices API, Fleet machine grouping, changelog
- Summary: Collapse duplicate Tailnet records for the same physical machine by normalized machine identity, merge stale discovered machines by the same identity, and prefer self/ready/agent-bearing records so `This Mac` and renamed Mac peers do not appear twice in the roster or graph.
- Verification: Pending.
- Intended commit message: `Dedupe Fleet machines`

## 2026-05-23 17:18 WITA - Make Tailscale Auth User-Opened

- Status: Pushed
- Areas changed: setup script, telemetry collector installer, changelog
- Summary: Stop asking to open the Tailscale auth URL locally; setup now prints the URL, asks the user to press Enter after logging in wherever they choose, and then verifies Tailscale is running.
- Verification: `bash -n setup.sh && bash -n scripts/install-telemetry-collector.sh`; auth-open prompt removal search; `git diff --check -- setup.sh scripts/install-telemetry-collector.sh CHANGELOG.md`.
- Intended commit message: `Make Tailscale auth user-opened`

## 2026-05-23 17:07 WITA - Keep Tailscale Setup In One Phase

- Status: Pushed
- Areas changed: setup script, telemetry collector installer, changelog
- Summary: Make top-level setup own the visible Tailscale/Fleet network phase, pass the resolved Tailnet state into the collector installer, and suppress repeated late Tailscale/SSH/Shields Up status output during the collector service install.
- Verification: `bash -n setup.sh && bash -n scripts/install-telemetry-collector.sh`; static env handoff smoke; `git diff --check -- setup.sh scripts/install-telemetry-collector.sh CHANGELOG.md`. `pnpm run test:fleet-local` was not used because no dashboard was listening on `127.0.0.1:5020`.
- Intended commit message: `Keep Tailscale setup in one phase`

## 2026-05-23 17:05 WITA - Add Reusable Agent Picker Modal

- Status: Pushed
- Areas changed: Agent picker UI, Swarm simulation analysis selector, assimilation manifest, changelog
- Summary: Replace the MiroShark analysis agent dropdown with a reusable searchable agent picker modal that shows bee icons, worker class, runtime, provider, model, skill badges, expandable suited-for prompts, selected-agent confirmation, top-layer portal rendering, and a dedicated scrollable card grid.
- Verification: `pnpm tsc --noEmit --pretty false`; `verify_assimilation_manifest.py`; `git diff --check`.
- Intended commit message: `Add reusable agent picker modal`

## 2026-05-23 16:58 WITA - Pin Tailscale SSH To Managed Daemon

- Status: Pushed
- Areas changed: setup script, telemetry collector installer, changelog
- Summary: Route managed macOS Tailscale status, login, IP, prefs, Shields Up, and SSH commands through the Homebrew CLI with the tailscaled socket so setup does not reconnect successfully with Homebrew and then advertise SSH against the sandboxed GUI backend.
- Verification: `bash -n setup.sh && bash -n scripts/install-telemetry-collector.sh`; `pnpm run test:fleet-local`; `git diff --check -- setup.sh scripts/install-telemetry-collector.sh CHANGELOG.md`; stale sandboxed-GUI fallback copy search.
- Intended commit message: `Pin Tailscale SSH to managed daemon`

## 2026-05-23 16:45 WITA - Complete Tailscale During Setup

- Status: Pushed
- Areas changed: setup script, telemetry collector installer, changelog
- Summary: Make setup and the standalone collector installer run the guided Tailscale install/login flow instead of falling through to a passive install-later message, wait for auth completion, prefer the Homebrew/open-source macOS daemon, and only report local-only mode when Tailscale setup was not completed during the run.
- Verification: `bash -n setup.sh && bash -n scripts/install-telemetry-collector.sh`; `pnpm run test:fleet-local`; `git diff --check -- setup.sh scripts/install-telemetry-collector.sh CHANGELOG.md`; stale install-later wording search.
- Intended commit message: `Complete Tailscale during setup`

## 2026-05-23 15:37 WITA - Streamline Agent Model Settings

- Status: Pushed
- Areas changed: Agent settings modal, agent runtime chat payload, project UI rules, changelog
- Summary: Compact the Hermes model selector, replace the refresh text button with an icon action, remove the separate save-to-Hermes step from the primary flow, move custom model entry into Advanced model setup, and record the project rule that structured config should use pickers/dropdowns/buttons unless inside Advanced.
- Verification: `pnpm typecheck`.
- Intended commit message: `Streamline agent model settings`

## 2026-05-23 15:30 WITA - Hide Unconfigured Runtime Model Providers

- Status: Pushed
- Areas changed: Agent settings modal, runtime integration service, changelog
- Summary: Filter the Hermes model picker to providers with at least one configured model, so catalog-only providers and providers only detected from credentials do not appear as selectable agent model sources.
- Verification: Hermes config/auth inspection without printing secrets; Hermes inventory filter smoke showed only `openai-codex`; `pnpm typecheck`.
- Intended commit message: `Hide unconfigured runtime model providers`

## 2026-05-23 16:18 WITA - Make Tailscale Auth Headless Friendly

- Status: Pushed
- Areas changed: macOS setup, telemetry collector installer, changelog
- Summary: Print the managed Tailscale auth URL for use on any device, ask before opening it locally on interactive macOS runs, and keep waiting for auth completion so headless machines are not forced through a local browser.
- Verification: `bash -n setup.sh && bash -n scripts/install-telemetry-collector.sh`; `pnpm run test:fleet-local`; `git diff --check -- setup.sh scripts/install-telemetry-collector.sh CHANGELOG.md`; Tailscale login URL parser smoke.
- Intended commit message: `Make Tailscale auth headless friendly`

## 2026-05-23 16:20 WITA - Add MiroShark Run Intelligence

- Status: Pushed
- Areas changed: Swarm simulation UI, MiroShark analysis API, Obsidian simulation archive, assimilation manifest, changelog
- Summary: Add an at-a-glance run intelligence panel with verdict, signal quality, social/market/risk reads, support and objection summaries, selected-agent analysis actions that try the chosen agent runtime, and durable Obsidian markdown notes saved beside the existing MiroShark simulation archive.
- Verification: `pnpm tsc --noEmit`; `verify_assimilation_manifest.py`.
- Intended commit message: `Add MiroShark run intelligence`

## 2026-05-23 16:05 WITA - Await Managed Tailscale Login

- Status: Pushed
- Areas changed: macOS setup, telemetry collector installer, changelog
- Summary: Detect Tailscale auth URLs during managed Homebrew daemon connection, open the sign-in page automatically, and poll for the daemon to become usable instead of timing out immediately and asking the user to rerun setup.
- Verification: `bash -n setup.sh && bash -n scripts/install-telemetry-collector.sh`; auth URL parser smoke extracted `https://login.tailscale.com/a/9da20e501da0d`; `pnpm run test:fleet-local`; `git diff --check -- setup.sh scripts/install-telemetry-collector.sh CHANGELOG.md`.
- Intended commit message: `Await managed Tailscale login`

## 2026-05-23 15:48 WITA - Quiet Managed Tailscale Retries

- Status: Pushed
- Areas changed: macOS setup, telemetry collector installer, changelog
- Summary: Hide the internal `tailscale up` retry when preserving non-default flags, quit the macOS Tailscale GUI before restarting the Homebrew daemon so the CLI is less likely to keep talking to the stale GUI Network Extension, and simplify the final failure copy.
- Verification: `bash -n setup.sh && bash -n scripts/install-telemetry-collector.sh`; `pnpm run test:fleet-local`; `git diff --check -- setup.sh scripts/install-telemetry-collector.sh CHANGELOG.md`.
- Intended commit message: `Quiet managed Tailscale retries`

## 2026-05-23 15:20 WITA - Add Hermes Model Selection To Agent Settings

- Status: Pushed
- Areas changed: Agent settings modal, runtime integration service, Hermes model configuration, assimilation manifest, changelog
- Summary: Show Hermes' configured provider/model inventory in the agent settings modal, let each Hermes agent select a provider/model, save the selected default back to Hermes config, and add model IDs to a Hermes provider from the modal.
- Verification: `pnpm typecheck`; `pnpm lint` (0 errors, 33 existing warnings); Hermes inventory smoke via the installed Hermes runtime; `verify_assimilation_manifest.py`.
- Intended commit message: `Add Hermes model selection to agent settings`

## 2026-05-23 15:35 WITA - Retry Tailscale Up With Existing Flags

- Status: Pushed
- Areas changed: macOS setup, telemetry collector installer, changelog
- Summary: Capture `tailscale up` errors that require existing non-default flags, parse Tailscale's suggested retry command, and rerun the managed Homebrew daemon connection with those flags so settings like `--accept-routes` do not stall setup.
- Verification: `bash -n setup.sh && bash -n scripts/install-telemetry-collector.sh`; parser smoke extracted `--timeout=30s --accept-routes` from Tailscale's suggested command shape; `pnpm run test:fleet-local`; `git diff --check -- setup.sh scripts/install-telemetry-collector.sh CHANGELOG.md`.
- Intended commit message: `Retry tailscale up with existing flags`

## 2026-05-23 15:20 WITA - Bound Managed Tailscaled Connection

- Status: Pushed
- Areas changed: macOS setup, telemetry collector installer, changelog
- Summary: Restart the Homebrew Tailscale service after install/upgrade, skip Homebrew cleanup during setup installs, bound `tailscale up` and status checks with timeouts, and stop with clear auth/retry guidance instead of hanging after client/server version mismatch warnings.
- Verification: `bash -n setup.sh && bash -n scripts/install-telemetry-collector.sh`; `pnpm run test:fleet-local`; `git diff --check -- setup.sh scripts/install-telemetry-collector.sh CHANGELOG.md`.
- Intended commit message: `Bound managed tailscaled connection`

## 2026-05-23 15:08 WITA - Prefer Managed Tailscaled Before SSH

- Status: Pushed
- Areas changed: macOS setup, changelog
- Summary: Offer the Homebrew `tailscaled` managed Fleet backend before attempting to advertise Tailscale SSH on macOS, install the actual Homebrew formula before starting its service, prevent repeated daemon prompts in the same run, and make SSH enablement copy clear that Fleet HTTP and Syncthing can still work if optional SSH env sync is unavailable.
- Verification: `bash -n setup.sh && bash -n scripts/install-telemetry-collector.sh`; `pnpm run test:fleet-local`; `git diff --check -- setup.sh scripts/install-telemetry-collector.sh CHANGELOG.md`.
- Intended commit message: `Prefer managed tailscaled before SSH`

## 2026-05-23 14:55 WITA - Prefer Managed Mac Tailscaled Setup

- Status: Pushed
- Areas changed: macOS setup, telemetry collector installer, changelog
- Summary: Reframe the Homebrew `tailscaled` flow as the managed macOS Fleet backend, not just a Tailscale SSH fix, and offer to install/start/connect it from both setup and collector install when the sandboxed GUI backend blocks managed Tailscale features.
- Verification: `bash -n setup.sh && bash -n scripts/install-telemetry-collector.sh`; `pnpm run test:fleet-local`; `git diff --check -- setup.sh scripts/install-telemetry-collector.sh CHANGELOG.md`.
- Intended commit message: `Prefer managed Mac tailscaled setup`

## 2026-05-23 14:32 WITA - Classify Unreachable Tailnet Peers

- Status: Pushed
- Areas changed: Fleet Tailscale diagnostics, Fleet repair modal, collector installer output, changelog
- Summary: Carry Tailscale handshake/traffic metadata into Fleet, show `Tailnet unreachable` when a peer is listed online but has no handshake or received traffic, and keep setup/dashboard guidance focused on automatic classification plus direct Tailscale recovery steps instead of project-side doctor commands.
- Verification: `pnpm run test:fleet-local`; `bash -n setup.sh && bash -n scripts/install-telemetry-collector.sh`; `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/page.tsx src/app/api/tailscale/devices/route.ts src/app/api/fleet/discover/route.ts` (0 errors, existing page warnings only); `git diff --check -- src/app/api/tailscale/devices/route.ts src/app/api/fleet/discover/route.ts src/app/page.tsx scripts/install-telemetry-collector.sh package.json CHANGELOG.md`.
- Intended commit message: `Classify unreachable Tailnet peers`

## 2026-05-23 14:15 WITA - Diagnose Tailnet Collector Reachability

- Status: Pushed
- Areas changed: Collector installer, setup success wording, Fleet collector repair modal, changelog
- Summary: Prompt macOS users to allow the Node collector through Application Firewall, detect and offer to disable Tailscale Shields Up, clarify that Tailscale SSH is not required for Fleet collector discovery, print a dashboard-side Tailnet curl check after install, and make setup report local collector health separately from service installation.
- Verification: `bash -n setup.sh && bash -n scripts/install-telemetry-collector.sh`; `pnpm run test:fleet-local`; `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/page.tsx src/app/api/fleet/discover/route.ts` (0 errors, existing page warnings only); `git diff --check -- setup.sh scripts/install-telemetry-collector.sh src/app/page.tsx CHANGELOG.md`.
- Intended commit message: `Diagnose Tailnet collector reachability`

## 2026-05-23 13:45 WITA - Fix Local Fleet Collector Detection

- Status: Pushed
- Areas changed: Fleet discovery API, Fleet machine issue modal, Fleet local collector e2e test, changelog
- Summary: Make Fleet discovery use `127.0.0.1` for the current machine's collector, fail unreachable peer collectors after a bounded timeout, show local collector repair commands for `This Mac` instead of remote Tailnet/firewall instructions, and add a live HTTP e2e smoke test for the local collector path.
- Verification: `pnpm run test:fleet-local`; `pnpm exec tsc --noEmit --pretty false`; `node --check scripts/test-fleet-local-collector.mjs`; `pnpm exec eslint src/app/api/fleet/discover/route.ts src/app/page.tsx scripts/test-fleet-local-collector.mjs` (0 errors, existing page warnings only); `git diff --check -- src/app/api/fleet/discover/route.ts src/app/page.tsx package.json scripts/test-fleet-local-collector.mjs CHANGELOG.md`.
- Intended commit message: `Fix local Fleet collector detection`

## 2026-05-23 13:30 WITA - Clarify Fleet Peer Reachability Fixes

- Status: Pushed
- Areas changed: Fleet machine issue modal, Tailscale collector URL discovery, changelog
- Summary: Use localhost for the current machine's collector URL and expand the remote collector Fix modal so duplicate machine names and stale Tailnet reachability are diagnosed with `tailscale ping`, dashboard-side curl, remote local health, and macOS firewall commands before assuming the collector installer is missing.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/page.tsx src/app/api/tailscale/devices/route.ts` (0 errors, existing page warnings only); `git diff --check -- src/app/page.tsx src/app/api/tailscale/devices/route.ts CHANGELOG.md`; local diagnostics confirmed a private Tailnet ping, collector curl, and Tailscale SSH check timed out from this dashboard machine.
- Intended commit message: `Clarify Fleet peer reachability fixes`

## 2026-05-23 00:52 WITA - Add Fleet Network Fix Badges

- Status: Pushed
- Areas changed: Fleet roster status copy, Tailscale discovery data, Fleet machine issue modal, changelog
- Summary: Replace the ambiguous Fleet local-mode message with `Tailscale not configured. Running locally.`, add per-machine roster Fix badges for Tailscale disconnected, collector unreachable, and env sync readiness issues, and show a modal with exact repair commands for each issue.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/components/fleet/roster.tsx src/components/fleet/fleet-data.ts src/app/api/fleet/discover/route.ts src/app/page.tsx` (0 errors, existing page warnings only); `git diff --check -- src/components/fleet/roster.tsx src/components/fleet/fleet-data.ts src/app/api/fleet/discover/route.ts src/app/page.tsx CHANGELOG.md`.
- Intended commit message: `Add Fleet network fix badges`

## 2026-05-23 00:44 WITA - Clarify Fleet Local Tailscale Status

- Status: Pushed
- Areas changed: Fleet Tailscale status copy, changelog
- Summary: Replace the ambiguous `Local mode; Tailscale optional` Fleet status with `Tailscale not configured. Running locally.` when Tailscale device discovery is unavailable.
- Verification: Pending.
- Intended commit message: `Clarify Fleet local Tailscale status`

## 2026-05-23 00:32 WITA - Document Syncing And Tailscale Architecture

- Status: Pushed
- Areas changed: Sync/Tailscale architecture docs, README docs link, changelog
- Summary: Add a docs page explaining the shared brain sync owner modes, Obsidian/external sync behavior, HivemindOS Syncthing pairing, manual rsync repair, conflict ownership, and the distinct ways Tailscale is used for discovery, collectors, Syncthing addressing, Tailscale SSH, env sync, and fleet updates.
- Verification: `git diff --check -- docs/syncing-and-tailscale.md README.md CHANGELOG.md`; confirmed `docs/syncing-and-tailscale.md` exists and the README link target resolves.
- Intended commit message: `Document syncing and Tailscale architecture`

## 2026-05-22 23:01 WITA - Clarify Brain Sync Ownership

- Status: Pushed
- Areas changed: Brain view vault sync settings, shared vault config, agent runtime vault context, README sharing docs, changelog
- Summary: Add a Brain setting for choosing whether an external provider owns realtime vault sync, HivemindOS Syncthing owns realtime sync, or Tailscale SSH rsync is manual repair only; migrate the old `tailnetSyncEnabled` setting into `syncthingAutoPairEnabled`; suppress Syncthing auto-pairing unless HivemindOS Syncthing is selected; and clarify where Syncthing versus rsync conflict files appear.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/page.tsx src/lib/types/agent-runtime.ts src/app/api/chat/agent-runtime/route.ts` (0 errors, existing page warnings only); `git diff --check -- src/app/page.tsx src/lib/types/agent-runtime.ts src/app/api/chat/agent-runtime/route.ts README.md CHANGELOG.md`.
- Intended commit message: `Clarify brain sync ownership`

## 2026-05-22 22:57 WITA - Streamline Env And Sync Setup

- Status: Pushed
- Areas changed: macOS/Linux setup, telemetry collector health, shared env docs, changelog
- Summary: Make setup discover env-ready HivemindOS peers, prompt to pull missing env keys from a trusted peer and push local keys with `hive-env-add --reconcile`, verify collector env readiness from the actual helper executable, and offer an interactive Syncthing pair/test-note check when another Syncthing-capable Tailnet collector is found.
- Verification: `bash -n setup.sh`; `node --check scripts/agent-telemetry-collector.mjs`; peer-discovery smoke found Ubuntu as both env-ready and Syncthing-capable through collector health; temporary collector smoke on port 18787 reported `envSync.ready=true` with the executable `~/.local/bin/hive-env-add`; `git diff --check -- setup.sh scripts/agent-telemetry-collector.mjs README.md CHANGELOG.md`.
- Intended commit message: `Streamline env and sync setup`

## 2026-05-22 22:38 WITA - Harden Hive Env Reconciliation

- Status: Pushed
- Areas changed: hive-env-add, macOS/Linux setup and uninstall, README shared env docs, env example, changelog
- Summary: Install `hive-env-add` as a rediscovering wrapper instead of a fragile checkout symlink, enable env peer sync only after Tailscale SSH is verified, add `hive-env-add --reconcile` for pushing existing env keys to ready peers, and add `--pull-from USER@HOST` with conflict policies for importing missing keys from a trusted Tailnet peer.
- Verification: `bash -n setup.sh && bash -n uninstall.sh`; `python3 -m py_compile scripts/hive-env-add`; isolated `--export-json` smoke confirmed local-only keys are excluded and agent values win; fake-Tailscale `--pull-from` smoke merged a new key while preserving a local conflict; temp-`HOME` setup-function smoke verified the installed wrapper executes after symlink replacement; installed the repaired local wrapper at `~/.local/bin/hive-env-add`; `git diff --check -- scripts/hive-env-add setup.sh uninstall.sh README.md .env.example CHANGELOG.md`.
- Intended commit message: `Harden hive env reconciliation`

## 2026-05-22 22:12 WITA - Offer Homebrew Tailscaled Setup

- Status: Pushed
- Areas changed: macOS/Linux setup, README quick start, changelog
- Summary: Detect Homebrew/open-source Tailscale CLI and `tailscaled` separately from the sandboxed macOS GUI shim, offer to install/start/connect the Homebrew daemon when the GUI build cannot host Tailscale SSH, retry SSH enablement through that daemon, and document that setup can run the Homebrew formula flow interactively.
- Verification: `bash -n setup.sh`; sandboxed-GUI fake CLI smoke confirmed setup suppresses stale sudo advice and offers the Homebrew daemon path; `git diff --check -- setup.sh README.md CHANGELOG.md`.
- Intended commit message: `Offer Homebrew tailscaled setup`

## 2026-05-22 22:01 WITA - Link Tailscale Mac CLI Guide

- Status: Pushed
- Areas changed: README quick start, macOS/Linux setup, changelog
- Summary: Add direct links to Tailscale's macOS variants documentation and Tailscaled-on-macOS guide in the preflight instructions, and include the same guide URL in the setup warning for sandboxed macOS GUI builds that cannot host Tailscale SSH.
- Verification: `bash -n setup.sh`; `git diff --check -- README.md setup.sh CHANGELOG.md`; README and setup warning excerpts reviewed to confirm direct Tailscale guide links are present.
- Intended commit message: `Link Tailscale Mac CLI guide`

## 2026-05-22 21:09 WITA - Document Tailscale Preflight

- Status: Pushed
- Areas changed: README quick start, changelog
- Summary: Add optional-but-recommended Tailscale preflight steps before setup, including local-only guidance, macOS sandboxed GUI limitations, macOS open-source CLI/daemon commands for Tailscale SSH hosting, and Linux Tailscale SSH setup commands.
- Verification: `git diff --check -- README.md CHANGELOG.md`; README quick-start excerpt reviewed to confirm Tailscale preflight appears before setup commands.
- Intended commit message: `Document Tailscale preflight`

## 2026-05-22 21:05 WITA - Clarify Sandboxed Tailscale SSH

- Status: Pushed
- Areas changed: macOS/Linux setup, telemetry collector installer, changelog
- Summary: Detect the Tailscale error for sandboxed macOS GUI builds, stop recommending `sudo tailscale set --ssh` for that unsupported install type, and explain that Syncthing still works while Tailscale SSH-hosted features require the open-source `tailscale` + `tailscaled` CLI build.
- Verification: `bash -n setup.sh && bash -n scripts/install-telemetry-collector.sh`; fake Tailscale CLI smoke tests for setup and collector installer confirmed sandboxed-GUI messages suppress the stale sudo advice; `git diff --check -- setup.sh scripts/install-telemetry-collector.sh CHANGELOG.md`.
- Intended commit message: `Clarify sandboxed Tailscale SSH`

## 2026-05-22 20:57 WITA - Report Tailscale SSH Errors

- Status: Pushed
- Areas changed: macOS/Linux setup, changelog
- Summary: Try both the PATH Tailscale CLI and the macOS app-bundled Tailscale CLI when advertising Tailscale SSH, avoid retrying a second sudo command after the user enters their password, and print the captured Tailscale error when SSH advertisement still fails.
- Verification: `bash -n setup.sh`; fake Tailscale CLI smoke test verified fallback to the app CLI and captured error formatting; `git diff --check -- setup.sh CHANGELOG.md`.
- Intended commit message: `Report Tailscale SSH errors`

## 2026-05-22 20:41 WITA - Smooth Setup Service Startup

- Status: Pushed
- Areas changed: macOS/Linux setup, pnpm workspace settings, package metadata, changelog
- Summary: Move pnpm overrides from `package.json` into `pnpm-workspace.yaml`, silence pnpm version-check warnings, prompt interactively before using sudo for Tailscale SSH advertisement, and actively start/wait for Syncthing before warning that its web UI is unavailable.
- Verification: `bash -n setup.sh`; `pnpm --version` prints only `8.6.12`; `pnpm install --lockfile-only --ignore-scripts`; `pnpm install --frozen-lockfile --ignore-scripts`; `git diff --check -- setup.sh package.json pnpm-workspace.yaml pnpm-lock.yaml CHANGELOG.md`.
- Intended commit message: `Smooth setup service startup`

## 2026-05-22 20:34 WITA - Install Env Encryption Helpers

- Status: Pushed
- Areas changed: macOS/Linux setup and uninstaller, Windows setup and uninstaller, README setup docs, changelog
- Summary: Prompt to install GnuPG for `hive-env-add` encrypted backups, install a Windows `hive-env-add.cmd` shim alongside the existing macOS/Linux helper install, add mirrored uninstall prompts for GnuPG and the Windows helper shim, and ask interactive users whether to open the dashboard after setup starts it.
- Verification: `bash -n setup.sh && bash -n uninstall.sh`; `./uninstall.sh --non-interactive`; `git diff --check -- setup.sh setup.ps1 uninstall.sh uninstall.ps1 README.md CHANGELOG.md`. PowerShell parse check was skipped because `pwsh`/`powershell` is not installed in this macOS workspace.
- Intended commit message: `Install env encryption helpers`

## 2026-05-22 20:41 WITA - Verify Fleet Updates By Commit

- Status: Pushed
- Areas changed: Fleet update API, Fleet update request payload, changelog
- Summary: Require remote machine updates to verify that the collector reports the expected latest commit before returning success, infer that target commit server-side for older UI calls, fail fast when the remote shell reaches the machine but the update command fails, and only show roster `Updated!` when the response includes `verified: true`.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/api/fleet/update/route.ts src/app/page.tsx` (0 errors, existing page warnings only); `git diff --check -- src/app/api/fleet/update/route.ts src/app/page.tsx CHANGELOG.md`.
- Intended commit message: `Verify fleet updates by commit`

## 2026-05-22 20:33 WITA - Hide Pathless Recent Directories

- Status: Pushed
- Areas changed: Shared recent-directory service
- Summary: Treat Recents as a reusable directory picker by excluding historical linked-directory records that do not have a saved path, and reject future recent-directory writes that only contain a display name.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/lib/services/obsidian/recent-directories.ts src/app/page.tsx` (0 errors, existing page warnings only); `/api/obsidian/recent-directories` returns only entries with usable paths; `git diff --check -- src/lib/services/obsidian/recent-directories.ts CHANGELOG.md`.
- Intended commit message: `Hide pathless recent directories`

## 2026-05-22 20:27 WITA - Resolve Pnpm After Setup Installs

- Status: Pushed
- Areas changed: macOS/Linux setup, Windows setup, macOS/Linux uninstaller, README setup docs, changelog
- Summary: Refresh Homebrew and npm global bin paths after setup installs pnpm, route later dependency/build/dev commands through a pnpm wrapper that can fall back to Corepack, and add optional Obsidian install prompts to setup so the existing uninstall prompts have a matching install surface.
- Verification: `bash -n setup.sh && bash -n uninstall.sh`; `git diff --check -- setup.sh setup.ps1 uninstall.sh README.md CHANGELOG.md`; local `command -v pnpm`, `pnpm --version`, and `command -v corepack` confirm pnpm is available through the active Node toolchain. PowerShell parse check was skipped because `pwsh`/`powershell` is not installed in this macOS workspace.
- Intended commit message: `Resolve pnpm after setup installs`

## 2026-05-22 20:23 WITA - Clarify Recent Directory Metadata

- Status: Pushed
- Areas changed: Attachment menu recent-directory labels, local checkout folder, shared-vault Kanban linked-directory metadata
- Summary: Replace the misleading `Shared brain` fallback for recent directories that lack saved path/machine metadata with source-aware labels, rename the local checkout folder from `openclaw-next` to `hivemind-os`, update the stale Kanban linked-directory entry to the new folder name/path, and restart the local collector from the renamed checkout.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/page.tsx` (0 errors, existing page warnings only); `KANBAN_TEST_BASE_URL=http://127.0.0.1:5021 node scripts/test-kanban-workflow.mjs && KANBAN_TEST_BASE_URL=http://127.0.0.1:5021 node scripts/test-dashboard-nav.mjs`; `git diff --check -- src/app/page.tsx src/app/chat.module.css CHANGELOG.md`; `/api/obsidian/recent-directories` now returns `hivemind-os` with the renamed local path; collector `/health` reports the renamed app directory.
- Intended commit message: `Clarify recent directory metadata`

## 2026-05-22 20:20 WITA - Let Recent Directory Names Wrap

- Status: Pushed
- Areas changed: Attachment menu recent-directory rows
- Summary: Widen recent-directory attachment menus and let folder names plus metadata wrap across multiple lines instead of truncating them with ellipses.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/page.tsx` (0 errors, existing page warnings only); `git diff --check -- src/app/chat.module.css CHANGELOG.md`.
- Intended commit message: `Let recent directory names wrap`

## 2026-05-22 20:19 WITA - Keep Uninstall Prompts Flowing

- Status: Pushed
- Areas changed: macOS/Linux uninstaller, changelog
- Summary: Treat missing agent instruction files and absent Aeon skills folders as no-op cleanup cases so `uninstall.sh` does not exit during shared-skill cleanup before reaching later prompts for copied skills, generated files, caches, Syncthing, Tailscale, pnpm, Obsidian, and checkout deletion.
- Verification: `bash -n uninstall.sh`; `./uninstall.sh --non-interactive`; temp-`HOME` piped uninstall run completed past shared-skill cleanup; `git diff --check -- uninstall.sh CHANGELOG.md`.
- Intended commit message: `Keep uninstall prompts flowing`

## 2026-05-22 20:16 WITA - Improve Directory And Attachment Picking

- Status: Pushed
- Areas changed: Kanban card attachment controls, remote directory browser
- Summary: Make the machine directory browser behave like a file picker with single-click selection, double-click navigation, and Cancel/Open actions; split the card attachment badge so the paperclip opens a removable attachment list while the plus opens the add-attachment menu.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/page.tsx` (0 errors, existing page warnings only); `KANBAN_TEST_BASE_URL=http://127.0.0.1:5021 node scripts/test-kanban-workflow.mjs && KANBAN_TEST_BASE_URL=http://127.0.0.1:5021 node scripts/test-dashboard-nav.mjs && git diff --check -- src/app/page.tsx src/app/kanban-board.module.css CHANGELOG.md`; Playwright smoke loaded `http://127.0.0.1:5021` with no page errors.
- Intended commit message: `Improve directory and attachment picking`

## 2026-05-22 20:05 WITA - Fallback Remote Directory Browse To Tailscale SSH

- Status: Pushed
- Areas changed: Machine directory browsing API
- Summary: Let remote machine directory browsing recover when a target collector is stale or missing `/directories` by falling back to `tailscale ssh` and listing folders directly on the selected machine.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/api/machines/directories/route.ts`; `node --check scripts/agent-telemetry-collector.mjs && node scripts/test-kanban-workflow.mjs && node scripts/test-dashboard-nav.mjs && git diff --check -- src/app/api/machines/directories/route.ts src/app/page.tsx src/app/kanban-board.module.css CHANGELOG.md`; local route smoke returned the local home directory list; Ubuntu remote route smoke returned `/root` directory entries through the Tailscale SSH fallback after the stale collector returned `not found`.
- Intended commit message: `Fallback remote directory browse to Tailscale SSH`

## 2026-05-22 20:09 WITA - Restore Roster Machine Update Button

- Status: Pushed
- Areas changed: Fleet roster, fleet view action wiring, changelog
- Summary: Show a compact `Update` button on stale roster machine rows, call the existing remote fleet update action from the new Fleet UI, animate a spinner while updating, show `Updated!` briefly after success, then hide the button.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/components/fleet/roster.tsx src/components/fleet/FleetView.tsx src/app/page.tsx` (0 errors, existing page warnings only); `git diff --check -- src/components/fleet/roster.tsx src/components/fleet/FleetView.tsx src/components/fleet/fleet-tokens.module.css src/app/page.tsx CHANGELOG.md`; local Next dev server on port 5020 loaded the Fleet UI through Playwright.
- Intended commit message: `Restore roster machine update button`

## 2026-05-22 20:04 WITA - Add Mirrored Uninstall Prompts

- Status: Pushed
- Areas changed: macOS/Linux uninstaller, Windows uninstaller, README setup docs, project agent rules
- Summary: Add `uninstall.sh` and `uninstall.ps1` with one-by-one prompts to stop HivemindOS dashboard/services, remove shared-skill agent instruction blocks, optionally remove copied skill folders and generated repo files, optionally uninstall Syncthing/Tailscale/pnpm/Obsidian, and optionally delete the checkout. Add an AGENTS rule requiring future setup prompts and install actions to have matching uninstall prompts in the same change.
- Verification: `bash -n uninstall.sh`; `bash -n setup.sh`; `./uninstall.sh --non-interactive` listed each uninstall prompt without mutating local files; `git diff --check -- uninstall.sh uninstall.ps1 README.md AGENTS.md CHANGELOG.md`; public GitHub search for `bash interactive uninstall script cleanup prompts tailscale syncthing` returned no reusable candidates. PowerShell execution/parsing was not run because `pwsh`/`powershell` is not installed in this macOS workspace.
- Intended commit message: `Add mirrored uninstall prompts`

## 2026-05-22 20:01 WITA - Combine Card Attachment Badge

- Status: Pushed
- Areas changed: Kanban card attachment controls
- Summary: Merge the separate card `+` button and attachment count pill into one clickable attachment badge that shows a gray paperclip with `0` when empty, switches to the active attachment color when populated, and keeps the plus affordance on the right.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/page.tsx` (0 errors, existing page warnings only); `node scripts/test-kanban-workflow.mjs && node scripts/test-dashboard-nav.mjs && git diff --check -- src/app/page.tsx src/app/kanban-board.module.css CHANGELOG.md`.
- Intended commit message: `Combine card attachment badge`

## 2026-05-22 19:57 WITA - Add Native Windows Setup

- Status: Pushed
- Areas changed: Windows PowerShell setup, README quick start, changelog
- Summary: Add `setup.ps1` for native Windows machines with interactive winget/npm/Corepack prompts for Node.js, pnpm, Tailscale, and Syncthing, shared `.env.local` defaults, dependency/build caching, direct Next build/dev commands that avoid Unix shell wrappers, and README instructions for PowerShell setup.
- Verification: `bash -n setup.sh`; `git diff --check -- setup.ps1 README.md CHANGELOG.md`; public GitHub assimilation searches for `PowerShell Windows setup script winget pnpm node tailscale syncthing` and `setup.ps1 winget node pnpm` returned no reusable candidates. PowerShell execution/parsing was not run because `pwsh`/`powershell` is not installed in this macOS workspace.
- Intended commit message: `Add native Windows setup`

## 2026-05-22 19:55 WITA - Share Attachment Menu UI

- Status: Pushed
- Areas changed: Attachment menu rendering, chat/add-task/steer/card attachment controls, Kanban card attachment styling
- Summary: Replace the separate Kanban card attachment tooltip with the same shared attachment menu used by chat and task creation so Images, Files, Directories, and Recents have one source of truth and one visual treatment.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/page.tsx` (0 errors, existing page warnings only); `node scripts/test-kanban-workflow.mjs && node scripts/test-dashboard-nav.mjs && git diff --check -- src/app/page.tsx src/app/chat.module.css src/app/kanban-board.module.css CHANGELOG.md`.
- Intended commit message: `Share attachment menu UI`

## 2026-05-22 19:49 WITA - Prompt For Setup Tool Installs

- Status: Pushed
- Areas changed: Setup dependency installer prompts, Homebrew shellenv handling, Syncthing startup, changelog
- Summary: Add interactive yes/no install prompts for Homebrew, pnpm, Tailscale, rsync, and Syncthing, load Homebrew shellenv from standard Apple Silicon and Intel paths so newly installed tools are immediately visible, ask before adding Homebrew shellenv to `~/.zprofile`, and start/check Syncthing after installation when Tailnet sync is connected. Non-interactive setup no longer installs optional sync tools automatically.
- Verification: `bash -n setup.sh`; `git diff --check -- setup.sh CHANGELOG.md`; `/opt/homebrew/bin/brew shellenv zsh` smoke confirmed the zsh profile line is valid for `.zprofile`.
- Intended commit message: `Prompt for setup tool installs`

## 2026-05-22 19:44 WITA - Keep This Mac On Native Directory Picker

- Status: Pushed
- Areas changed: Kanban directory picker machine detection
- Summary: Treat `This Mac` as local even when its collector URL is a Tailscale address, so local task directory attachment opens the browser-native directory picker instead of the remote collector browser.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/page.tsx src/app/api/machines/directories/route.ts scripts/agent-telemetry-collector.mjs` (0 errors, existing page warnings only); `node --check scripts/agent-telemetry-collector.mjs && node scripts/test-kanban-workflow.mjs && git diff --check`.
- Intended commit message: `Keep This Mac on native directory picker`

## 2026-05-22 19:38 WITA - Browse Directories On Target Machine

- Status: Pushed
- Areas changed: Kanban machine defaults, attachment directory picker behavior, telemetry collector directory browsing, machine directory API proxy
- Summary: Default new Kanban tasks to This Mac when available, keep Any Machine as an explicit manual choice, disable directory selection for Any Machine, use the native browser directory picker for local targets, and add remote collector directory browsing for Tailscale machines.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/page.tsx src/app/api/machines/directories/route.ts src/app/api/obsidian/recent-directories/route.ts src/lib/services/obsidian/recent-directories.ts src/lib/types/agent-runtime.ts src/lib/types/kanban.ts scripts/agent-telemetry-collector.mjs` (0 errors, existing page warnings only); `node --check scripts/agent-telemetry-collector.mjs && node scripts/test-kanban-workflow.mjs && node scripts/test-dashboard-nav.mjs && git diff --check`; `curl -sS /api/machines/directories?...collectorUrl=http://127.0.0.1:8787` returned the local home directory list.
- Intended commit message: `Browse directories on target machine`

## 2026-05-22 19:11 WITA - Add Shared Recent Directory Attachments

- Status: Pushed
- Areas changed: Attachment menus, Kanban linked-directory metadata, shared brain recent-directory API, chat/add-task directory handling
- Summary: Add an expandable Recents section to Images/Files/Directories menus, source recent folders from the shared Obsidian brain plus Kanban history, record selected folders back to the shared brain for cross-machine reuse, and allow chat composer directory links.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/page.tsx src/app/api/obsidian/recent-directories/route.ts src/lib/services/obsidian/recent-directories.ts src/lib/types/kanban.ts src/lib/types/recent-directories.ts` (0 errors, existing page warnings only); `node scripts/test-kanban-workflow.mjs && node scripts/test-dashboard-nav.mjs && git diff --check`; `curl -sS /api/obsidian/recent-directories` against the local dev server returned the shared-brain recents list sorted with `openclaw-next`.
- Intended commit message: `Add shared recent directory attachments`

## 2026-05-22 16:47 WITA - Route Kanban Undo To Workers

- Status: Pushed
- Areas changed: Kanban undo dispatch prompt, Queen/worker assignment routing, Kanban workflow regression test
- Summary: Route explicit undo requests to an eligible worker before falling back to Queen and remove the stale retry prompt guard that told agents not to undo verified work.
- Verification: Telemetry inspection confirmed task `t_mpebcduf_obrj4` was requeued for undo, skipped Aeon, assigned to Queen Bee, then failed with no fresh pollable session; `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/page.tsx src/lib/services/orchestration/bee-roles.ts scripts/test-kanban-workflow.mjs scripts/test-dashboard-nav.mjs` (0 errors, existing page warnings only); `node scripts/test-dashboard-nav.mjs && git diff --check`; `node scripts/test-kanban-workflow.mjs`.
- Intended commit message: `Route Kanban undo requests to workers`

## 2026-05-22 16:44 WITA - Undo New Test Navigation Tab

- Status: Pushed
- Areas changed: Dashboard navigation and nav smoke test
- Summary: Remove the temporary `New` dashboard navigation tab and placeholder test panel while preserving later Kanban completion/undo workflow changes.
- Verification: `node scripts/test-dashboard-nav.mjs && git diff --check`; `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/page.tsx src/lib/services/orchestration/bee-roles.ts scripts/test-kanban-workflow.mjs scripts/test-dashboard-nav.mjs` (0 errors, existing page warnings only).
- Intended commit message: `Undo New test navigation tab`

## 2026-05-22 16:34 WITA - Add Kanban Undo Reversal Flow

- Status: Pushed
- Areas changed: Kanban task menu, dispatch prompt, task metadata, Workboard card badges
- Summary: Add an `Undo work` context-menu action only for Done and Needs You cards, requeue the card as a targeted undo assignment, inject explicit task-scoped reversal instructions into the worker prompt, and show an orange Undo badge while the reversal is ready/working.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/page.tsx src/lib/services/kanban/local-kanban-store.ts src/lib/types/kanban.ts` (0 errors, existing page warnings only); `node scripts/test-kanban-workflow.mjs && node scripts/test-dashboard-nav.mjs && git diff --check`.
- Intended commit message: `Add Kanban undo reversal flow`

## 2026-05-22 16:28 WITA - Complete Silent Workspace Changes And Add Review Badge

- Status: Pushed
- Areas changed: Kanban completion handling, workspace git status API, Done-card review UI, Kanban task metadata
- Summary: Treat silent runtime runs with observable workspace changes as completed work instead of Needs Human, add a workspace git snapshot endpoint for before/after comparison, and add a Done-column `Review` badge that switches to `Reviewed` with a checkmark.
- Verification: Patched live task `t_mpebcduf_obrj4` from Needs Human to Done after confirming the requested New-tab work completed; `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/page.tsx src/app/api/chat/agent-runtime/route.ts src/app/api/workspace/git-status/route.ts src/lib/services/kanban/local-kanban-store.ts src/lib/types/kanban.ts` (0 errors, existing page warnings only); `node scripts/test-kanban-workflow.mjs && node scripts/test-dashboard-nav.mjs && git diff --check`; `curl -sS -X POST http://127.0.0.1:5020/api/workspace/git-status ...` confirmed the workspace snapshot API reports git state.
- Intended commit message: `Complete silent workspace changes and add review badge`

## 2026-05-22 16:13 WITA - Bound Kanban Dispatches Without Sessions

- Status: Pushed
- Areas changed: Kanban dispatch timeout handling, Hermes collector session discovery, Kanban workflow regression test
- Summary: Add a 75s no-progress timeout for delegated Kanban runs that produce no text and no fresh pollable session, fail no-session runtime-accepted cards closed to Needs Human instead of leaving them Working, and tag Hermes API requests so the collector cannot attach stale sessions from prior matching prompts.
- Verification: Telemetry confirmed live task `t_mpebcduf_obrj4` was Working on This Mac with no `agentSession` after `agent_runtime.http.stream.first_chunk`; patched that live card to Needs Human with a no-session diagnostic; restarted `com.agent-control-room.telemetry` and confirmed `/health` advertises `runtimeIntegrations`; `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/page.tsx src/lib/services/kanban/local-kanban-store.ts scripts/test-kanban-workflow.mjs scripts/agent-telemetry-collector.mjs` (0 errors, existing page warnings only); `node --check scripts/agent-telemetry-collector.mjs && node scripts/test-kanban-workflow.mjs && git diff --check`; `node scripts/test-dashboard-nav.mjs && git diff --check`.
- Intended commit message: `Bound Kanban dispatches without sessions`

## 2026-05-22 16:08:33 WITA - Add New Test Navigation Tab

- Status: Pushed
- Areas changed: Dashboard navigation and nav smoke test
- Summary: Add a visible `New` dashboard navigation tab with a small placeholder test panel, superseding the previous removed-tab smoke expectation.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/page.tsx scripts/test-dashboard-nav.mjs` (0 errors, existing page warnings only); `node scripts/test-dashboard-nav.mjs`; `git diff --check`.
- Intended commit message: `Add New test navigation tab`

## 2026-05-22 16:05 WITA - Remove Inline Add Machine Label

- Status: Pushed
- Areas changed: Workboard inline task composer
- Summary: Remove the redundant `Machine` label from the inline task creation area and right-align the machine selector.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/page.tsx` (0 errors, existing warnings only); `node scripts/test-dashboard-nav.mjs && git diff --check`.
- Intended commit message: `Remove inline add machine label`

## 2026-05-22 16:02 WITA - Add Card Attachment Button

- Status: Pushed
- Areas changed: Workboard card metadata controls and card attachment persistence
- Summary: Add a visible card-level `+` attachment menu beside the machine selector so existing tasks can append images, files, or directories without opening another editor.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/page.tsx` (0 errors, existing warnings only); `node --check scripts/agent-telemetry-collector.mjs && node scripts/test-kanban-workflow.mjs && git diff --check`; `node scripts/test-dashboard-nav.mjs && git diff --check`.
- Intended commit message: `Add card attachment button`

## 2026-05-22 15:56 WITA - Advertise Runtime Integration Collectors

- Status: Pushed
- Areas changed: Telemetry collector capabilities
- Summary: Include `runtimeIntegrations` in collector health capabilities so the dashboard can identify collectors that support machine-local runtime integration checks.
- Verification: `node --check scripts/agent-telemetry-collector.mjs`; `git diff --check -- CHANGELOG.md scripts/agent-telemetry-collector.mjs`.
- Intended commit message: `Advertise runtime integration collectors`

## 2026-05-22 15:53 WITA - Check Hermes Updates Per Machine

- Status: Pushed
- Areas changed: Runtime integrations API, telemetry collector runtime endpoint, Hermes update actions
- Summary: Route runtime integration status/actions through an agent's remote collector when its telemetry URL points at another machine, so Hermes update badges and `hermes update` run against the selected agent machine instead of always checking the dashboard host.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `node --check scripts/agent-telemetry-collector.mjs`; `git diff --check`.
- Intended commit message: `Check Hermes updates per machine`

## 2026-05-22 15:51 WITA - Make Card Machine Picker Pressed And Unclipped

- Status: Pushed
- Areas changed: Workboard card machine picker interaction and popover styling
- Summary: Replace the hover tooltip machine selector with a press-controlled card menu, close it on outside click/Escape/selection, and let the lane/card overflow visibly while the menu is open so the machine list does not clip.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/page.tsx` (0 errors, existing warnings only); `node scripts/test-dashboard-nav.mjs && node scripts/test-kanban-workflow.mjs && git diff --check`.
- Intended commit message: `Make card machine picker press controlled`

## 2026-05-22 15:50 WITA - Proxy Remote Runtime Integrations Through Collectors

- Status: Pushed
- Areas changed: runtime integration API route and agent telemetry collector
- Summary: Route non-local agent runtime integration checks/actions through each machine's telemetry collector, and expose Hermes integration status/actions from the collector so remote machines can report tool setup and run supported integration commands.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `node --check scripts/agent-telemetry-collector.mjs`; `git diff --check`.
- Intended commit message: `Proxy remote runtime integrations through collectors`

## 2026-05-22 15:51 WITA - Add Remote Collector Background Runtime Action

- Status: Pushed
- Areas changed: agent telemetry collector runtime integrations
- Summary: Add the Hermes background runtime action to the telemetry collector so remote machines can start background Hermes work through the same runtime integration panel as local machines.
- Verification: `node --check scripts/agent-telemetry-collector.mjs`; `git diff --check`.
- Intended commit message: `Add remote collector background runtime action`

## 2026-05-22 15:48 WITA - Wrap Workboard Machine Tooltip Provider

- Status: Pushed
- Areas changed: Workboard machine target tooltip
- Summary: Wrap the Workboard surface in `TooltipProvider` so card machine selectors can render without the Radix tooltip provider runtime error.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/page.tsx` (0 errors, existing page warnings only); `node scripts/test-dashboard-nav.mjs && node scripts/test-kanban-workflow.mjs`; `git diff --check src/app/page.tsx`.
- Intended commit message: `Wrap Workboard machine tooltip provider`

## 2026-05-22 15:47 WITA - Add Kanban Machine Targets And Unlimited Attachments

- Status: Pushed
- Areas changed: Kanban task model, Kanban assignment filtering, Workboard card/quick-add UI, shared composer attachment helpers
- Summary: Persist each task's target machine, attached files/images, and linked directories. Add a subtle `Any machine`/machine selector to quick-add and cards, route Ready assignment only through agents on the chosen machine when one is set, and remove the attachment count caps so users can repeatedly add one or many images/files/directories.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/page.tsx src/app/kanban-board.module.css src/lib/types/kanban.ts src/lib/services/kanban/local-kanban-store.ts` (0 errors, existing page warnings only; CSS module ignored by eslint config); `node scripts/test-kanban-workflow.mjs && node scripts/test-dashboard-nav.mjs`; `git diff --check`.
- Intended commit message: `Add Kanban machine targets and attachments`

## 2026-05-22 15:23 WITA - Add Runtime Setup Actions

- Status: Pushed
- Areas changed: Agent Settings runtime setup controls
- Summary: Turn `Needs setup` runtime statuses into buttons that open a reusable setup panel with capability-specific setup actions, including Hermes xAI/X search and video tool setup.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/page.tsx src/app/fleet.module.css` (0 errors, existing page warnings only; CSS module ignored by eslint config); `git diff --check -- CHANGELOG.md src/app/page.tsx src/app/fleet.module.css`.
- Intended commit message: `Add runtime setup actions`

## 2026-05-22 15:16 WITA - Keep Runtime Update Badges In Sync

- Status: Pushed
- Areas changed: Agent Settings runtime tools, Hermes update detection state
- Summary: Update the Hermes update-required state whenever the Agent Settings Tools tab refreshes runtime integrations, so cards do not fall back to `Ready` before the skills view has scanned.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/page.tsx` (0 errors, existing page warnings only); `git diff --check -- CHANGELOG.md src/app/page.tsx`.
- Intended commit message: `Keep runtime update badges in sync`

## 2026-05-22 15:10 WITA - Add Inline Hermes Update Confirmation

- Status: Pushed
- Areas changed: Agent Settings runtime update badge, Hermes runtime integration action
- Summary: Let the `Needs Hermes update` badge expand into an inline `Update now?` confirmation with check/cancel controls, and run `hermes update` when the checkmark is confirmed.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/page.tsx src/app/fleet.module.css src/lib/services/runtime-integrations.ts` (0 errors, existing page warnings only; CSS module ignored by eslint config); `git diff --check -- CHANGELOG.md src/app/page.tsx src/app/fleet.module.css src/lib/services/runtime-integrations.ts`. Did not execute `hermes update`; it now runs only from the confirmation checkmark.
- Intended commit message: `Add inline Hermes update confirmation`

## 2026-05-22 15:05 WITA - Refine Hermes Update Badge Styling

- Status: Pushed
- Areas changed: Agent Settings runtime tool badge styling
- Summary: Tone down the `Needs Hermes update` runtime badge with smaller type, tighter padding, softer color, and normal casing so it reads as a compact compatibility note instead of a primary card title.
- Verification: `pnpm exec eslint src/app/fleet.module.css src/app/page.tsx` (0 errors, existing page warnings only; CSS module ignored by eslint config); `git diff --check -- CHANGELOG.md src/app/fleet.module.css`.
- Intended commit message: `Refine Hermes update badge styling`

## 2026-05-22 15:03 WITA - Stop Tool-Only Kanban Runs From Sticking

- Status: Pushed
- Areas changed: Kanban dispatch completion handling, Kanban telemetry
- Summary: When a delegated Kanban runtime stream closes without response text but has an attached agent session, fetch the final session before deciding status. Complete the card if the session contains a final assistant response; otherwise record `kanban.dispatch.no_final_assistant`, clear the active agent session, and move the card to Needs Human with a summarized latest message instead of leaving it stuck in Working.
- Verification: Telemetry inspection confirmed the live failed task `t_mpebcduf_obrj4` session `api-b448f5974ef54c76` reached 63 messages with latest role `tool`, latest assistant length `0`, and `kanban.session.tool_output_stalled`; `node scripts/test-kanban-workflow.mjs && node scripts/test-dashboard-nav.mjs`; `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/page.tsx src/lib/services/runtime-integrations.ts scripts/test-kanban-workflow.mjs` (0 errors, existing page warnings only); `git diff --check`. A Playwright UI repro was attempted with a temp board and mocked tool-only session, but the local dashboard tab buttons did not activate in headless Chromium, matching the existing browser-smoke limitation.
- Intended commit message: `Stop tool-only Kanban runs from sticking`

## 2026-05-22 14:17 WITA - Clarify HivemindOS Setup Dependencies

- Status: Pushed
- Areas changed: Setup script dependency output, changelog
- Summary: Print pnpm install instructions only once in the final required-dependency block, describe missing Tailscale as optional when setup cannot auto-install it, and use singular wording when only one required dependency is missing.
- Verification: `bash -n setup.sh`; `git diff --check -- setup.sh CHANGELOG.md`; simulated a missing-pnpm/no-Tailscale-installer run with a temporary PATH containing only `node`, confirming pnpm install commands print once, Tailscale is described as optional, and the final rerun prompt uses singular wording.
- Intended commit message: `De-noise setup dependency output`

## 2026-05-22 14:17 WITA - Clarify HivemindOS Setup Dependencies

- Status: Pushed
- Areas changed: Setup script, setup/app HivemindOS branding, shared brain copy, local setup docs, telemetry collector service description
- Summary: Replace the remaining user-facing Agent Control Room setup/app wording with HivemindOS, make missing pnpm output include concrete install commands, and have setup try to install Tailscale when it is absent before falling back to explicit install/login instructions. Tailscale remains optional; local-only setup still proceeds when it is not connected.
- Verification: `bash -n setup.sh`; `bash -n scripts/install-telemetry-collector.sh`; `pnpm exec eslint src/app/page.tsx src/app/api/control-room/status/route.ts src/app/api/chat/agent-runtime/route.ts src/lib/types/agent-runtime.ts` (0 errors, existing page warnings only); `pnpm exec tsc --noEmit --pretty false`; `git diff --check -- setup.sh src/app/page.tsx src/app/api/control-room/status/route.ts src/app/api/chat/agent-runtime/route.ts src/lib/types/agent-runtime.ts src/components/cells/MemoryCell.tsx docs/hermes-local-setup.md scripts/install-telemetry-collector.sh README.md CHANGELOG.md`; `rg` sweep found no remaining live setup/app `Agent Control Room` or `Control Room` wording in setup, src, README, docs, or scripts.
- Intended commit message: `Clarify HivemindOS setup dependencies`

## 2026-05-22 14:05 WITA - Move Agent Wallets Into Shared Brain

- Status: Pushed
- Areas changed: New `src/lib/services/obsidian/wallet-ledger.ts`, new `src/app/api/obsidian/wallets/route.ts`, hydrate + write-through effects in `src/app/page.tsx`, `machineName` surfaced on `AgentWalletCard`, changelog
- Summary: Move agent wallet state from device-local `localStorage` to the shared brain so balances follow the agent across machines. Each agent now has a human-readable record at `{vault}/Projects/HivemindOS/Wallets/{agentId}.md` with YAML frontmatter holding the full `AgentWalletConfig` plus metadata (`agentName`, `runtime`, `machineName`, `dashboardMachine`, `updatedAt`) and a brief markdown body summarising the current balance / status / network / runtime / last-write. New `GET /api/obsidian/wallets` lists the ledger and `POST /api/obsidian/wallets` upserts a single record. Dashboard hydrates from the vault on load when `sharedVault.enabled` (vault wins where `updatedAt` is newer than the local copy) and write-throughs each updated wallet with an 800ms debounce so slider drags and rapid edits coalesce. LocalStorage stays as an offline cache so the wallet view still works without the vault. The wallet card now shows the agent's home `machineName` in the subtitle row so cross-device balances are easy to attribute.
- Verification: `npm run typecheck` (no new errors; pre-existing apple-notes route warnings unchanged). Pattern matches the existing shared-brain integrations (`brain-graph.ts`, `brain-skills.ts`) — same `Projects/HivemindOS/...` parent folder, same `resolveObsidianVaultPath` helper, same `/api/obsidian/<feature>` route shape. Visual verification requires `npm run dev` on http://localhost:5020/wallet — pending user confirmation. To migrate existing local-only wallets, the next time the dashboard loads with the shared vault enabled it will write through current local state; vault then becomes the source of truth.
- Intended commit message: `Move agent wallets into shared brain`

## 2026-05-22 13:48 WITA - Keep Active Kanban Sessions Working

- Status: Pushed
- Areas changed: Kanban session stall detection, Kanban retry state, Bee assignment selection, agent-runtime streaming, telemetry collector streaming, dashboard nav regression
- Summary: Require a no-assistant Kanban runtime session to go quiet before moving it to Needs You, keep timeout-accepted runtime connections in Working, clear stale ownership/session state when moving a card back to Ready, delegate executable work to an available worker instead of Queen Bee, stream collector heartbeat/session events immediately, and extend local runtime streams past the old 110-second cutoff.
- Verification: `node scripts/test-dashboard-nav.mjs && node scripts/test-kanban-workflow.mjs`; `pnpm exec eslint src/app/api/chat/agent-runtime/route.ts scripts/agent-telemetry-collector.mjs src/app/page.tsx src/lib/services/kanban/local-kanban-store.ts src/lib/services/orchestration/bee-roles.ts scripts/test-kanban-workflow.mjs scripts/test-dashboard-nav.mjs` (0 errors, existing page warnings only); `pnpm exec tsc --noEmit --pretty false`; same-card e2e on task `t_mpebcduf_obrj4` confirmed Ready retry claims cleanly, selects Hermes worker mode, receives a pollable session, and streams past the old 110s timeout; the stale New-tab worker edits were reverted and `node scripts/test-dashboard-nav.mjs` confirms the removed New tab stays removed.
- Intended commit message: `Keep active Kanban sessions working`

## 2026-05-22 13:36 WITA - Add Workboard Loading Skeletons

- Status: Pushed
- Areas changed: Workboard Kanban loading state, Workboard card skeleton styling
- Summary: Track the initial Kanban board fetch separately from an empty board and show lane-colored skeleton placeholder cards while Workboard tasks load, instead of rendering empty Add Task lanes during the request.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/page.tsx` (0 errors, existing dashboard warnings only); `git diff --check -- src/app/page.tsx src/app/kanban-board.module.css CHANGELOG.md`; `node scripts/test-dashboard-nav.mjs`. Browser smoke against `http://127.0.0.1:5020` was attempted, but the local dev page did not activate dashboard tab clicks in headless or in-app browser automation, so the skeleton was not visually captured there.
- Intended commit message: `Add Workboard loading skeletons`

## 2026-05-22 13:36 WITA - Align Brain Graph Loader Hexagons

- Status: Pushed
- Areas changed: Shared brain graph loading state
- Summary: Rebuild the loader honeycomb with the same SVG hex polygon math used by the brain graph, including axial center spacing, a deduplicated edge-line layer, and a centered in-graph overlay instead of a separate compact card. Scope the loader SVG sizing so the main graph canvas SVG rule cannot stretch the seven loader hexagons to full canvas size.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/page.tsx` (0 errors, existing page warnings only); `git diff --check -- src/app/page.tsx src/app/vault.module.css CHANGELOG.md`; geometry probe confirmed all six perimeter centers sit exactly `sqrt(3) * radius` from the center; CSS check confirmed compact loading uses `inset: 0`, no border/box-shadow, and the in-graph honeycomb renders at `76px` by `58px` with `min-height: 0`.
- Intended commit message: `Align brain graph loader hexagons`

## 2026-05-22 13:30 WITA - Badge Hermes Update-Gated Skills

- Status: Pushed
- Areas changed: Shared skills view, skill browser, Agent Settings runtime tools, Hermes runtime update detection
- Summary: Detect when the local Hermes CLI reports an available update and show compact `Needs Hermes update` badges on Hermes/new-feature skill and tool cards while keeping each card body focused on what the feature does. Update-required runtime cards use that as the single status instead of also saying `Ready`.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/page.tsx src/app/fleet.module.css src/app/vault.module.css src/lib/services/runtime-integrations.ts` (0 errors, existing page warnings only; CSS modules ignored by eslint config); `git diff --check -- CHANGELOG.md src/app/page.tsx src/app/fleet.module.css src/app/vault.module.css src/lib/services/runtime-integrations.ts`; live API smoke on `/api/runtimes/hermes/integrations` confirmed the background task card detail is feature copy while Hermes update output stays in diagnostics.
- Intended commit message: `Badge Hermes update-gated skills`

## 2026-05-22 12:54 WITA - Stop Kanban Retry Boomerangs

- Status: Pushed
- Areas changed: Kanban task claiming, Kanban retry blocker handling
- Summary: Clear stale blocker results when retrying a Needs You card into Working, and stop dispatching agents when the API rejects a Working claim by returning another status.
- Verification: `node scripts/test-dashboard-nav.mjs`; `pnpm exec eslint src/app/page.tsx src/lib/services/kanban/local-kanban-store.ts scripts/test-dashboard-nav.mjs` (0 errors, existing page warnings only); `pnpm exec tsc --noEmit --pretty false`; `git diff --check -- src/app/page.tsx src/lib/services/kanban/local-kanban-store.ts scripts/test-dashboard-nav.mjs CHANGELOG.md`. A direct store probe with `pnpm exec tsx` could not run because `tsx` is not installed.
- Intended commit message: `Stop Kanban retry boomerangs`

## 2026-05-22 13:28 WITA - Add Swarm History Loading Rail

- Status: Pushed
- Areas changed: Swarm past-simulations rail, MiroShark archive loading state
- Summary: Add an explicit archive-loading state for the Swarm past simulations shelf so saved runs show a loading note and skeleton cards while the archive list is fetched instead of popping in suddenly.
- Verification: `pnpm exec eslint src/app/page.tsx src/components/swarm/SwarmView.tsx src/components/swarm/runs.tsx src/components/swarm/swarm-tokens.module.css` (0 errors, existing page warnings only; CSS module ignored by eslint config); `pnpm exec tsc --noEmit --pretty false`; `git diff --check -- src/app/page.tsx src/components/swarm/SwarmView.tsx src/components/swarm/runs.tsx src/components/swarm/swarm-tokens.module.css CHANGELOG.md`; in-app browser smoke at `http://127.0.0.1:5020/swarm` rendered the shelf and `new simulation` button with no console errors.
- Intended commit message: `Add Swarm history loading rail`

## 2026-05-22 12:20 WITA - Derive Fleet Machine Locations

- Status: Pushed
- Areas changed: Fleet location mapping, Tailscale device APIs, fleet discovery merge
- Summary: Replace the roster/map's index-based mock city fallback with derived machine locations from the local browser timezone, Hetzner-style region hints, and Tailscale relay codes, labeling relay-derived positions explicitly as relays. Carry relay codes through both Tailscale device APIs and keep stale loopback self rows hidden once a Tailscale self device exists.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/page.tsx src/app/api/tailscale/devices/route.ts src/app/api/fleet/discover/route.ts` (0 errors, existing page warnings only); `git diff --check -- src/app/page.tsx src/app/api/tailscale/devices/route.ts src/app/api/fleet/discover/route.ts`; live API smokes on `http://localhost:5020/api/tailscale/devices` and `/api/fleet/discover` returned relay codes for the current Mac, peer Mac, `iphone182`, and `ubuntu-8gb-hel1-2`.
- Intended commit message: `Derive fleet machine locations`

## 2026-05-22 12:20 WITA - Add Runtime Integration Controls

- Status: Pushed
- Areas changed: Runtime capability model, Hermes and OpenClaw adapters, runtime integration APIs, agent settings modal, fleet modal styling
- Summary: Add agent-agnostic runtime integration status/search/action APIs and a Tools tab in Agent Settings, with Hermes-only controls for xAI login, X search, video generation, background runs, session search, Codex status, and Kanban decomposition surfaced only for Hermes agents.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/page.tsx src/app/fleet.module.css src/lib/services/runtime-integrations.ts src/lib/types/agent-runtime.ts src/lib/services/runtime-adapters/hermes.ts src/lib/services/runtime-adapters/openclaw.ts 'src/app/api/runtimes/[runtime]/integrations/route.ts' 'src/app/api/runtimes/[runtime]/sessions/search/route.ts'` (0 errors, existing page warnings only); `git diff --check -- CHANGELOG.md src/app/page.tsx src/app/fleet.module.css src/lib/services/runtime-integrations.ts src/lib/types/agent-runtime.ts src/lib/services/runtime-adapters/hermes.ts 'src/app/api/runtimes/[runtime]/integrations/route.ts' 'src/app/api/runtimes/[runtime]/sessions/search/route.ts'`; live API smokes on `http://localhost:5020/api/runtimes/hermes/integrations`, `/api/runtimes/openclaw/integrations`, and `/api/runtimes/hermes/sessions/search?limit=2`; Playwright smoke opened a seeded Hermes agent settings modal and confirmed the Tools tab rendered with no new console errors.
- Intended commit message: `Add runtime integration controls`

## 2026-05-22 11:47 WITA - Explain Kanban Tool-Only Stalls

- Status: Pushed
- Areas changed: Kanban session stall notes, dashboard nav smoke test
- Summary: Restore the dashboard nav smoke test so it asserts the removed New tab stays removed, and include a compact preview of the latest tool output when a Kanban session advances without any assistant response.
- Verification: `node scripts/test-dashboard-nav.mjs`; `pnpm exec eslint src/app/page.tsx scripts/test-dashboard-nav.mjs` (0 errors, existing page warnings only); `git diff --check -- src/app/page.tsx scripts/test-dashboard-nav.mjs CHANGELOG.md`; `pnpm exec tsc --noEmit --pretty false`; inspected local telemetry for Hermes session `api-a183a8519ea6253b`.
- Intended commit message: `Explain Kanban tool-only stalls`

## 2026-05-22 12:17 WITA - Add Swarm New Simulation Hover

- Status: Pushed
- Areas changed: Swarm run shelf new-simulation button
- Summary: Add a scoped hover/focus effect to the Swarm `new simulation` button with lift, honey glow, shine pass, and icon motion.
- Verification: `pnpm exec eslint src/components/swarm/runs.tsx src/components/swarm/swarm-tokens.module.css` (0 errors; CSS module ignored by eslint config); `git diff --check -- src/components/swarm/runs.tsx src/components/swarm/swarm-tokens.module.css CHANGELOG.md`; in-app browser smoke at `http://127.0.0.1:5020/swarm` reloaded with no console errors. `pnpm exec tsc --noEmit --pretty false` is currently blocked by an unrelated `Buffer` type error in `src/lib/services/runtime-integrations.ts`.
- Intended commit message: `Add Swarm new simulation hover`

## 2026-05-22 12:14 WITA - Show Vertical Fleet Graph Edges

- Status: Pushed
- Areas changed: Fleet graph edge rendering
- Summary: Render graph edge gradients in SVG user-space coordinates so perfectly vertical machine links, such as the iPhone link, remain visible.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/components/fleet/network-graph.tsx`; `git diff --check -- src/components/fleet/network-graph.tsx CHANGELOG.md`; Playwright smoke on `http://localhost:5020` confirmed the iPhone edge exists as a vertical graph line and `fleetEdge` now uses `gradientUnits="userSpaceOnUse"` with no console errors.
- Intended commit message: `Show vertical fleet graph edges`

## 2026-05-22 12:12 WITA - Tighten Fleet Graph Spacing

- Status: Pushed
- Areas changed: Fleet graph machine layout
- Summary: Compact the fallback graph constellation used by live-discovered machine ids and pull the new-machine affordance inward so machines do not sit at the far corners of the graph.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/components/fleet/network-graph.tsx src/components/fleet/FleetView.tsx`; `git diff --check -- src/components/fleet/network-graph.tsx CHANGELOG.md`; Playwright smoke on `http://localhost:5020` confirmed the live graph rendered with no console errors and a tighter machine spread of about 396px by 288px.
- Intended commit message: `Tighten fleet graph spacing`

## 2026-05-22 11:38 WITA - Clean Up Fleet Machine Identity

- Status: Pushed
- Areas changed: Fleet Tailscale device discovery, fleet machine discovery merge, changelog
- Summary: Prefer MagicDNS labels when Tailscale reports generic hostnames such as `localhost`, hide stale offline peers that duplicate the current Mac, and stop preserving old loopback self-discovery records once a Tailscale self device is available.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/api/fleet/discover/route.ts src/app/api/tailscale/devices/route.ts src/app/page.tsx` (0 errors, existing page warnings only); `git diff --check -- src/app/api/fleet/discover/route.ts src/app/api/tailscale/devices/route.ts src/app/page.tsx CHANGELOG.md`; live API smokes on `http://localhost:5020/api/tailscale/devices` and `/api/fleet/discover` returned the current Mac, `iphone182`, and `ubuntu-8gb-hel1-2` with no duplicate Mac and no `localhost` device label; Playwright smoke confirmed the fleet page shows those labels with no console errors, and a seeded stale `127.0.0.1` self record stays hidden.
- Intended commit message: `Clean up fleet machine identity`

## 2026-05-22 11:34 WITA - Fix Fleet Graph Bee Startup

- Status: Pushed
- Areas changed: Fleet graph bee animation loop
- Summary: Make the graph-view roaming bee animation read the latest edges and machine positions after fleet data arrives, so the Lottie bees appear on first graph load without switching views.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/components/fleet/network-graph.tsx src/components/fleet/FleetView.tsx src/components/fleet/map-view.tsx`; `git diff --check -- src/components/fleet/network-graph.tsx CHANGELOG.md`; Playwright smoke on `http://localhost:5020` loaded Graph directly and confirmed both Lottie bee canvases had nonzero opacity/transforms with no console errors.
- Intended commit message: `Fix fleet graph bee startup`

## 2026-05-22 11:28 WITA - Add Fleet Map Panning

- Status: Pushed
- Areas changed: Fleet map view interaction
- Summary: Give the Fleet map the same drag-to-pan treatment as the graph canvas, including pointer capture, viewport recentering, and clamped map bounds.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/components/fleet/map-view.tsx src/components/fleet/network-graph.tsx src/components/fleet/FleetView.tsx`; `git diff --check -- src/components/fleet/map-view.tsx CHANGELOG.md`; Playwright smoke on `http://localhost:5020` switched to Map and confirmed dragging changed the map canvas transform with no console errors.
- Intended commit message: `Add fleet map panning`

## 2026-05-22 02:31 WITA - Cache Bee Icons

- Status: Pushed
- Areas changed: Bee role icon config, app layout preloads, Next icon cache headers, Fleet/Swarm/Scheduler bee icon rendering, dashboard bee image usage, changelog
- Summary: Preload the bee role icon set, serve `/icons/*` with long-lived immutable browser cache headers, and make bee icon images request the public files directly so they stop visibly popping in on repeated page loads.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/page.tsx src/app/api/chat/agent-runtime/route.ts` (0 errors, existing page warnings only); `git diff --check -- src/app/page.tsx src/app/api/chat/agent-runtime/route.ts CHANGELOG.md`; patched the affected Kanban task to clear its stale agent session after confirming the mixed scheduler/Kanban/chat Hermes session in local telemetry.
- Intended commit message: `Cache bee icon images`

## 2026-05-22 02:34 WITA - Isolate Hermes Chat Context And Stalls

- Status: Pushed
- Areas changed: Agent chat context filtering, Hermes runtime request locking, Kanban session stall handling, local telemetry, changelog
- Summary: Keep scheduler and Kanban transcript messages out of normal agent chat context, tag new chat messages by surface, block overlapping interactive Hermes runtime calls instead of letting background work interrupt manual chat, clear stale agent sessions when cards move to Needs You, and add telemetry-backed stall handling for sessions that advance without assistant output.
- Verification: Pending.
- Intended commit message: `Isolate Hermes chat context and stalls`

## 2026-05-22 02:18 WITA - Add Swarm Loading State

- Status: Pushed
- Areas changed: Swarm theater loading view, dashboard Swarm loading wiring, changelog
- Summary: Show a dedicated MiroShark loading state in the Swarm theater while a new simulation starts or a saved run loads, instead of briefly falling through to the empty-run message.
- Verification: `pnpm exec eslint src/components/swarm/SwarmView.tsx src/components/swarm/swarm-tokens.module.css src/app/page.tsx` (0 errors, existing page warnings only; CSS module ignored by eslint config); `pnpm exec tsc --noEmit --pretty false`; `git diff --check -- src/components/swarm/SwarmView.tsx src/components/swarm/swarm-tokens.module.css src/app/page.tsx CHANGELOG.md`; in-app browser smoke at `http://127.0.0.1:5020/swarm` rendered the Swarm theater with no console errors.
- Intended commit message: `Add Swarm loading state`

## 2026-05-22 02:16 WITA - Hide Fleet Chat For Background Agents

- Status: Pushed
- Areas changed: Fleet roster/list/agent footer actions, fleet agent data, changelog
- Summary: Hide Fleet chat buttons for agents whose runtime does not advertise chat support, so Aeon background agents no longer show a dead Chat action while Hermes and OpenClaw still do.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/components/fleet/fleet-data.ts src/components/fleet/roster.tsx src/components/fleet/list-view.tsx src/components/fleet/footers.tsx src/app/page.tsx` (0 errors, existing page warnings only); `git diff --check -- src/components/fleet/fleet-data.ts src/components/fleet/roster.tsx src/components/fleet/list-view.tsx src/components/fleet/footers.tsx src/app/page.tsx CHANGELOG.md`.
- Intended commit message: `Hide fleet chat for background agents`

## 2026-05-22 02:10 WITA - Add Verified Reward Compute Gateway

- Status: Pushed
- Areas changed: Compute gateway OpenAI-compatible API, reward gateway docs, README Honey setup, changelog
- Summary: Add spoof-proof reward compute mode so Hermes, OpenClaw, and other OpenAI-compatible clients can keep being used directly while pointing their model base URL at the HivemindOS compute gateway. The gateway accepts Bankr-backed reward keys, forwards calls through Bankr, reads provider-returned token usage, signs Honey receipts server-side, and returns OpenAI-compatible chat completion responses.
- Verification: `pnpm typecheck` in `workers/compute-gateway`; `pnpm exec eslint workers/compute-gateway/src/index.ts`; `git diff --check -- workers/compute-gateway/src/index.ts workers/compute-gateway/README.md README.md CHANGELOG.md`; deployed `hivemindos-compute-gateway` to Cloudflare via Wrangler dry-run bundle plus authenticated Cloudflare API upload after Wrangler's Node fetch failed; applied D1 schema remotely; live smokes confirmed `/health`, `/v1/models` missing-key rejection, `/v1/chat/completions` missing-key rejection, and invalid reward key passthrough rejection from Bankr without creating Honey.
- Intended commit message: `Add verified reward compute gateway`

## 2026-05-22 02:02 WITA - Fix Polymarket Completed Result Surface

- Status: Pushed
- Areas changed: Swarm completed-run center stage, Polymarket result view, market tick mapping, integration payload cards, changelog
- Summary: Replace the generic agent arena for completed Polymarket runs with a dedicated result board showing the market question, run state, summarized market payload rows, expandable raw payloads, price history payloads, and evidence timeline. Missing price-history ticks now fall back to a real `price_yes` market snapshot when present instead of fake 0% odds, long payload strings wrap inside bounded cards, integration/report cards summarize structured status/error/template payloads, and raw diagnostics move behind disclosures.
- Verification: `pnpm exec eslint src/components/swarm/SwarmView.tsx src/components/swarm/output-views.tsx src/components/swarm/feeds.tsx src/app/page.tsx`; `git diff --check -- src/app/page.tsx src/components/swarm/SwarmView.tsx src/components/swarm/output-views.tsx src/components/swarm/feeds.tsx src/components/swarm/swarm-data.ts CHANGELOG.md`. `pnpm typecheck` is currently blocked by unrelated nullable snapshot errors in `src/lib/services/obsidian/scheduled-runs.ts`.
- Intended commit message: `Fix polymarket completed result surface`

## 2026-05-22 02:58 WITA - Share Scheduler Runs Through Obsidian

- Status: Pushed
- Areas changed: Scheduler shared-vault API, Obsidian scheduled-run store, scheduler run context injection, task modal history option, shared vault defaults, setup script, changelog
- Summary: Add a shared Obsidian `Scheduled/` shelf where schedule definitions are mirrored as `Scheduled/<device>/<schedule>/schedule.md` and executions are recorded as auto-incremented `run0001-<agent>-<timestamp>.md` notes. The scheduler view now syncs schedule definitions back from that shelf, so schedules written by other Tailscale-synced machines can appear in the dashboard, and the toolbar includes a manual `Sync vault` refresh. Scheduler tasks can opt into injecting recent run notes as context for continuity, anti-repetition, and comparisons, and imported runtime schedules are mirrored into the same shelf.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/page.tsx src/components/task-modal/TaskModal.tsx src/app/api/scheduler/shared/route.ts src/lib/services/obsidian/scheduled-runs.ts src/lib/types/agent-runtime.ts` (0 errors, existing page warnings only); `bash -n setup.sh`; `git diff --check -- src/app/page.tsx src/components/task-modal/TaskModal.tsx src/app/api/scheduler/shared/route.ts src/lib/services/obsidian/scheduled-runs.ts src/lib/types/agent-runtime.ts setup.sh CHANGELOG.md`; temp-vault API smoke wrote `Scheduled/Liams-MacBook-Pro/Apple-Notes-Poster/schedule.md`, generated `run0001-Hermes-...md` and `run0002-Hermes-...md`, and returned both as past-run context newest-first; `list-schedules` smoke read `Scheduled/Remote-Worker-01/Vault-List-Smoke/schedule.md` back into a schedule payload with shared paths and history settings.
- Intended commit message: `Share scheduler runs through Obsidian`

## 2026-05-22 02:40 WITA - Wallet Grid + Honest Defaults

- Status: Pushed
- Areas changed: `src/lib/utils/agent-wallet.ts` defaults, new `AgentWalletCardCompact` component + CSS, wallet section markup in `src/app/page.tsx`, `src/app/wallets.module.css`, changelog
- Summary: Two wallet view changes. First, zero out the misleading $10 placeholder in `DEFAULT_AGENT_WALLET` — `seedBalanceUsd`, `currentBalanceUsd`, and `dailyComputeBurnUsd` now default to 0 so newly-created agent wallets honestly show "$0.00" with no fake runway until the user funds them; existing locally-stored wallets are unaffected. Second, replace the agent sidebar with a responsive grid of compact wallet tiles. Each tile shows the agent name with a status-colored dot, the current balance in 30px Space Grotesk, and a status chip ("Wallet off" / "N days runway" / "Needs funding"). Tiles have a lift-and-glow hover effect with a chevron reveal; clicking expands into the full `AgentWalletCard` with an "← All wallets" back button at the top. Workspace is now a two-pane layout (grid/detail on the left, Hive ledger rail on the right) — the slim agent sidebar is gone since the grid IS the agent picker.
- Verification: `npm run typecheck` (no new errors; pre-existing apple-notes route warnings unchanged). Visual verification requires `npm run dev` on http://localhost:5020/wallet — pending user confirmation.
- Intended commit message: `Add wallet grid view and zero placeholder balances`

## 2026-05-22 01:24 WITA - Restore Mode-Specific Swarm Composers

- Status: Pushed
- Areas changed: Swarm template composer UI, launch controls, assimilation manifest, changelog
- Summary: Restore the downloaded nextjs-swarm mode-specific compose surfaces for Market Maker, Reddit Narrative, Polymarket Binary, Research Swarm, Ops Stress Test, and Blank Canvas while keeping the controlled MiroShark launch wiring and real scenario inputs.
- Verification: `pnpm typecheck`; `pnpm exec eslint src/components/swarm/composer.tsx src/components/swarm/template-composers.tsx`; audited reused downloaded Swarm composer paths; `verify_assimilation_manifest.py`; `git diff --check -- src/components/swarm/template-composers.tsx src/components/swarm/composer.tsx CHANGELOG.md ASSIMILATION.json`; browser smoke confirmed `/swarm` still renders the standalone compose shell; source scan confirmed the restored Polymarket odds/news, Market Maker instrument/shock, and Ops failure-profile controls.
- Intended commit message: `Restore mode-specific swarm composers`

## 2026-05-22 02:43 WITA - Document Honey And HIVE Compute Rewards

- Status: Pushed
- Areas changed: README reward overview, Wallets Honey copy, Honey usage observer API, Hermes token observer, Honey ledger worker observed-usage endpoint, changelog
- Summary: Wire opt-in Honey rewards to observed local runtime usage while the dashboard is running: Hermes CLI sessions are credited from Hermes' persisted token counters, OpenClaw sessions are credited from real documented usage fields in session/transcript stores, observed events send only token metadata to the official ledger, the ledger dedupes/caps observed usage server-side, and README/Wallets copy now describes Honey as runtime usage rewards rather than dashboard-routed compute only.
- Verification: Verified Hermes `~/.hermes/state.db` exposes actual token columns on `sessions`; checked OpenClaw token-use docs for `/usage`, `/status`, CLI, and transcript usage surfaces; `pnpm typecheck`; `pnpm typecheck` in `workers/honey-ledger`; targeted eslint for Honey observer/ledger files passed with no new errors; deployed `hivemindos-honey-ledger` to Cloudflare version `fd3432b3-0120-4d77-8eeb-4e15100e8ee6`; live smokes confirmed `/health`, invalid observed usage rejection, and valid observed Hermes usage acceptance with reward-pool clipping; `git diff --check` for touched Honey docs/code.
- Intended commit message: `Observe runtime token usage for Honey`

## 2026-05-22 02:31 WITA - Disable Scheduler Skill Action Fast Path

- Status: Pushed
- Areas changed: Scheduler Run Now execution, scheduler skill-action telemetry, agent runtime stream telemetry, installed Hermes Apple Notes skill, changelog
- Summary: Temporarily disable the dynamic scheduler skill-action shortcut so attached skills run through Hermes while investigating Hermes skill execution latency, minimize scheduler context for attached Hermes skill runs, add stream-completion telemetry, and update the installed Hermes Apple Notes skill away from missing `memo`/Homebrew toward single-command built-in osascript.
- Verification: Hermes Apple Notes direct runtime probes improved from 83.38s with the missing `memo` skill fallback, to 49.94s after switching the installed skill to osascript with shared-vault context still enabled, to 35.43s with shared-vault context disabled, to 33.59s after removing post-create verification, and to 22.14s when the scheduler-style request also omitted the default repo working directory. Route telemetry confirmed the optimized no-workdir run used `contextLength: 0`, first chunk at 6.15s, one skill-read tool turn, one osascript tool result, and stream completion at 20.19s route elapsed. `pnpm exec eslint src/app/page.tsx src/app/api/chat/agent-runtime/route.ts src/app/api/scheduler/skill-action/route.ts` passed with 0 errors and existing page warnings; `git diff --check -- src/app/page.tsx src/app/api/chat/agent-runtime/route.ts CHANGELOG.md` passed; `pnpm exec tsc --noEmit --pretty false` is currently blocked by an unrelated wallet action nullability error at `src/app/page.tsx:10912`.
- Intended commit message: `Disable scheduler skill action fast path`

## 2026-05-22 01:13 WITA - E2E Test Swarm Simulation Surfaces

- Status: Pushed
- Areas changed: MiroShark surface launch verification, app run history archive, changelog
- Summary: Ran one real HivemindOS app-path E2E launch for each Swarm simulation surface label: X Post Simulation, Reddit Simulation, Polymarket Simulation, and Multi-surface Simulation, then archived each result through the app history endpoint so the runs are available in Past Simulations.
- Verification: Started Docker Desktop and a local Neo4j container after the first app-path launch exposed `localhost:7687` was down; launched each run through `/api/miroshark/swarm`, polled the app job/run endpoints, archived through `/api/miroshark/runs`, and loaded each archive by simulation id. History now contains `sim_1bb2a7a20baa` (twitter/X, 5 posts, complete), `sim_25481b352b36` (reddit, 5 posts, complete), `sim_07c1127378d9` (polymarket, 0 posts, 1 market payload, saved), and `sim_18f35b160bae` (parallel/multi-surface, 4 posts, 1 market payload, complete). `/api/mcp/status` reports Neo4j connected with 4 graphs and 26 entities after the suite.
- Intended commit message: `E2E test swarm simulation surfaces`

## 2026-05-22 02:18 WITA - Run Scheduler Skill Actions Dynamically

- Status: Pushed
- Areas changed: Scheduler Run Now execution, generic scheduler skill-action API, shared Apple Notes skill metadata, scheduler telemetry, changelog
- Summary: Add a generic dynamic scheduler skill-action runner that executes action blocks declared inside attached skill files, then use that mechanism for fast Apple Notes runs without creating a dedicated per-skill route.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/api/scheduler/skill-action/route.ts src/app/page.tsx` (0 errors, existing dashboard warnings only); `curl` smoke for `shared-apple-notes` created Apple Notes through the dynamic skill action in 0.853s and 1.516s route time; `curl` smoke for `karpathy-guidelines` returned `skipped` in 7ms so non-action skills still fall back to agent runtime; telemetry confirmed `scheduler.skill_action.start` and `scheduler.skill_action.completed` events.
- Intended commit message: `Run scheduler skill actions dynamically`

## 2026-05-22 02:10 WITA - Phantom-Style Agent Wallet Card

- Status: Pushed
- Areas changed: New `src/components/wallet/AgentWalletCard.tsx` + CSS module, wallet section markup in `src/app/page.tsx`, wallet view CSS (three-pane workspace + slim agent sidebar + sticky Hive rail), changelog
- Summary: Replace the wallet view's stacked-card "settings dashboard" treatment with a Phantom-style portrait wallet card. Each selected agent gets a single tall card with a centered 52px hero balance, a runway chip below it, a four-button action grid (Send · Receive · Limits · Autopay), and a holdings list (USDC · Gas · Honey · HIVE) styled like Phantom's token rows. Send/Receive/Limits each open an in-card sheet instead of expanding nested disclosures. Power lives as a single On/Off pill in the card header. Advanced setup (provider, network, x402 base URL, ClawCard env, notes) collapses behind one disclosure at the bottom. The "Bee reward meter" amber card and the "Next safe steps" `Cell` are gone — the meter content now lives as a Honey token row in the holdings list. Page workspace stays as a three-pane console: slim agents rail with status-colored dots → centered wallet card (max 460px) → sticky Hive ledger rail. Dropped unused `WalletCell`, `CreditCard`, `SOVEREIGN_AGENT_LAUNCH_STEPS`, and `PAYMENT_SAFETY_RULES` imports from `page.tsx`.
- Verification: `npm run typecheck` (no new errors; pre-existing apple-notes route warnings unchanged). Visual verification requires `npm run dev` on http://localhost:5020/wallet — pending user confirmation.
- Intended commit message: `Add Phantom-style agent wallet card`

## 2026-05-22 00:58 WITA - Trace Hermes Runtime Handoff

- Status: Pushed
- Areas changed: Agent runtime route telemetry, scheduler runtime diagnostics, changelog
- Summary: Add server-side telemetry around the HTTP handoff to Hermes so scheduler runs show whether the delay is before Hermes returns headers, during upstream streaming, or in an upstream failure path.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/api/chat/agent-runtime/route.ts`; `git diff --check -- src/app/api/chat/agent-runtime/route.ts CHANGELOG.md`; debug POST to `/api/chat/agent-runtime` with `x-hivemind-run-id: debug:hermes-pong-runtime-handoff` confirmed route telemetry now records `agent_runtime.http.fetch.start`, `agent_runtime.http.fetch.slow`, `agent_runtime.http.fetch.response`, `agent_runtime.http.stream.start`, and `agent_runtime.http.stream.first_chunk`.
- Intended commit message: `Trace Hermes runtime handoff`

## 2026-05-22 00:42 WITA - Surface MiroShark Integration Depth

- Status: Pushed
- Areas changed: MiroShark swarm proxy, Swarm compose helpers, Swarm integration panels, market price data, integration TODO docs, changelog
- Summary: Load the missing MiroShark integration surfaces into the Swarm API and UI: template capabilities/enrichment, scenario Ask/Suggest helpers, graph/entity/project payloads, report/interview metadata, export/share links, webhook/embed/transcript payloads, public/settings/MCP/push snapshots, and per-market Polymarket price histories, plus a durable TODO note for the integrations that still need richer in-app controls.
- Verification: `pnpm typecheck`; `pnpm exec eslint src/components/swarm src/app/api/miroshark/swarm/route.ts src/app/page.tsx` (0 errors, existing dashboard warnings only); `git diff --check -- src/app/api/miroshark/swarm/route.ts src/app/page.tsx src/components/swarm docs/MIROSHARK_INTEGRATION_TODO.md CHANGELOG.md ASSIMILATION.json`; `verify_assimilation_manifest.py`; Playwright smoke at `http://127.0.0.1:5020/swarm` confirmed the Swarm theater renders with Ask MiroShark/Suggest controls and no blank page.
- Intended commit message: `Surface MiroShark integration depth`

## 2026-05-22 00:38 WITA - Keep Scheduler Runs Live

- Status: Pushed
- Areas changed: Scheduler Run Now lifecycle, scheduler button labels, scheduler telemetry, changelog
- Summary: Stop aborting dashboard scheduler runs after 30 seconds, keep the run live until the runtime stream completes, record slow-run telemetry instead, and show realtime button phases for running, assigned, thinking, executing, wrapping up, and done.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/page.tsx src/components/scheduler` (0 errors, existing dashboard warnings only); `git diff --check -- src/app/page.tsx src/components/scheduler CHANGELOG.md`; Playwright slow-run smoke on `http://localhost:5020` with a 32s delayed runtime confirmed Run Now stays live past 30s, records waiting/slow/completed telemetry, and resets only after completion; Playwright phase smoke confirmed assigned/thinking/executing/wrapping labels, done checkmark, and reset to Run Now.
- Intended commit message: `Keep scheduler runs live`

## 2026-05-22 00:26 WITA - Restore Swarm Launch Presets

- Status: Pushed
- Areas changed: Swarm template presets, MiroShark launch payloads, template fields, launch API metadata, changelog
- Summary: Reintroduce the downloaded Swarm modes as real launch presets alongside MiroShark templates, mapping X Thread, Market Maker, Reddit Narrative, Polymarket Binary, Research Swarm, Ops Stress Test, and Blank Canvas to concrete MiroShark scenarios and surfaces instead of placeholder data.
- Verification: Audited `/Users/liam/Downloads/nextjs-swarm` selected swarm data/composer paths; `pnpm typecheck`; `pnpm exec eslint src/components/swarm src/app/api/miroshark/swarm/route.ts src/app/page.tsx` (0 errors, existing dashboard warnings only); `git diff --check -- src/components/swarm src/app/page.tsx src/app/api/miroshark/swarm/route.ts CHANGELOG.md`; in-app browser smoke confirmed New Simulation exposes Market Maker, Reddit Narrative, Polymarket Binary, Research Swarm, Ops Stress Test, and Blank Canvas presets, Market Maker shows `Polymarket Simulation` with Instrument/Market Shock fields, and Research Swarm shows its research fields.
- Intended commit message: `Restore swarm launch presets`

## 2026-05-22 00:18 WITA - Label Swarm Simulation Surface

- Status: Pushed
- Areas changed: Swarm template header, simulation surface labeling, changelog
- Summary: Add a right-aligned template surface label such as `• X Post Simulation`, `• Reddit Simulation`, `• Polymarket Simulation`, or `• Multi-surface Simulation` so MiroShark templates clearly show which surface is being composed or viewed.
- Verification: Pending.
- Intended commit message: `Label swarm simulation surface`

## 2026-05-22 00:18 WITA - Install Brain Skills From GitHub

- Status: Pushed
- Areas changed: Shared brain skill browser, Obsidian skill import API, GitHub skill download service, skill browser styling, assimilation manifest, changelog
- Summary: Add an `Install From Github` action to the shared brain Skill Browser that opens a GitHub URL form, downloads a repository skill folder or `SKILL.md` path through the GitHub API, writes the full skill folder into the shared Obsidian `Skills/` shelf with source metadata, and refreshes the skill inventory after install.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/lib/services/obsidian/brain-skills.ts src/app/api/obsidian/skills/route.ts src/app/page.tsx` (0 errors, existing dashboard warnings only); `git diff --check -- src/lib/services/obsidian/brain-skills.ts src/app/api/obsidian/skills/route.ts src/app/page.tsx src/app/fleet.module.css CHANGELOG.md ASSIMILATION.json`; `verify_assimilation_manifest.py`; temp-vault POST to `/api/obsidian/skills` with `action: "import-github"` and `https://github.com/multica-ai/andrej-karpathy-skills/tree/main/skills/karpathy-guidelines` returned `ok: true` and wrote the imported `SKILL.md` plus source metadata.
- Intended commit message: `Install brain skills from GitHub`

## 2026-05-22 00:05 WITA - Instrument Scheduler Runtime Runs

- Status: Pushed
- Areas changed: Scheduler Run Now telemetry, agent runtime route telemetry, scheduler timeout handling, changelog
- Summary: Add detailed local telemetry for scheduler run dispatch, waiting, first-byte, stream status/tool/content events, completion, failure, and server-side runtime route phases, and time out stuck dashboard scheduler runs instead of leaving the button spinning forever.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/page.tsx src/app/api/chat/agent-runtime/route.ts` (0 errors, existing dashboard warnings only); `git diff --check -- src/app/page.tsx src/app/api/chat/agent-runtime/route.ts CHANGELOG.md`; Playwright smoke on `http://localhost:5020` intercepted a 12s delayed `/api/chat/agent-runtime` response and confirmed the run ID header is sent, Run Now remains running while waiting, done appears after the response, and telemetry captures requested, waiting, first-byte, status, tool-call, content, and completed events.
- Intended commit message: `Instrument scheduler runtime runs`

## 2026-05-22 00:07 WITA - Pad Scheduler Timeline Now

- Status: Pushed
- Areas changed: Scheduler timeline view, changelog
- Summary: Add -2h and -1h space above the scheduler's now marker and map the dashed now line, hour labels, and future job cards through the same timeline scale so the marker no longer appears near +1h or clips at the top. Keep close-together jobs at their true time and resolve collisions with extra columns instead of pushing tasks down the time axis.
- Verification: `pnpm exec eslint src/components/scheduler/timeline.tsx`; `git diff --check -- src/components/scheduler/timeline.tsx CHANGELOG.md`; Playwright smoke on `http://localhost:5020/scheduler` confirmed near-term jobs render around now, close jobs fan into columns instead of moving down toward +1h/+2h, no horizontal overflow appears, and no browser console errors were logged. `pnpm exec tsc --noEmit --pretty false` is currently blocked by an unrelated `src/lib/services/obsidian/brain-skills.ts` Buffer type error.
- Intended commit message: `Pad scheduler timeline now`

## 2026-05-22 00:06 WITA - Wire Swarm Template Launch

- Status: Pushed
- Areas changed: Swarm new-simulation compose mode, MiroShark template inputs, launch controls, parallel platform preservation, changelog
- Summary: Connect the downloaded Swarm shell to the existing MiroShark template/run logic so New Simulation opens a compose state, template chips apply real MiroShark templates and required fields, Start Simulation launches through the app API, and parallel/polymarket platform choices no longer get rewritten to X/Twitter after refresh.
- Verification: `pnpm typecheck`; `pnpm exec eslint src/components/swarm src/app/api/miroshark/swarm/route.ts src/app/page.tsx` (0 errors, existing dashboard warnings only); `git diff --check -- src/components/swarm src/app/page.tsx src/app/api/miroshark/swarm/route.ts CHANGELOG.md`; in-app browser smoke opened Swarm compose mode, selected Product Announcement, confirmed real required template fields render, required-field gating works, and filling Company/Product regenerates the launch scenario.
- Intended commit message: `Wire swarm template launch`

## 2026-05-21 23:56 WITA - Execute Scheduler Run Now

- Status: Pushed
- Areas changed: Scheduler Run Now execution, agent runtime dispatch, scheduler status reporting, changelog
- Summary: Send dashboard-managed scheduler runs through the assigned agent runtime instead of immediately marking local task state as complete, so Run Now waits for the runtime response and only shows the completion checkmark after execution returns.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/page.tsx src/components/scheduler` (0 errors, existing dashboard warnings only); `git diff --check -- src/app/page.tsx src/components/scheduler CHANGELOG.md`; Playwright smoke on `http://localhost:5020` intercepted `/api/chat/agent-runtime` with a delayed SSE response and confirmed Run Now calls the runtime once, stays `running` before the runtime returns, shows `done` only after the response, resets to Run Now, stays on Scheduler, and logs no hydration errors.
- Intended commit message: `Execute scheduler run now`

## 2026-05-21 23:50 WITA - Keep Swarm History Order

- Status: Pushed
- Areas changed: Swarm history rail selection, archived-run data merge, changelog
- Summary: Merge the loaded archived simulation data back into its existing history row instead of prepending the selected run to the top of the shelf, so pressing a past simulation highlights/selects it in place.
- Verification: `pnpm typecheck`; `pnpm exec eslint src/app/page.tsx src/components/swarm` (0 errors, existing dashboard warnings only); `git diff --check -- src/app/page.tsx src/components/swarm CHANGELOG.md`; in-app browser smoke clicked Historical What-If and Political Debate history rows, confirmed each opened its own simulation content without `Simulation sim_*` titles, and confirmed the top Product Announcement history card stayed in place.
- Intended commit message: `Keep swarm history order`

## 2026-05-21 23:47 WITA - Fix Scheduler Run Now State

- Status: Pushed
- Areas changed: Scheduler run-now interaction, scheduler job card markup, changelog
- Summary: Keep dashboard scheduler runs in place with a running spinner, completion checkmark, and delayed reset, and replace the nested job-card button markup that caused the Next hydration error.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/page.tsx src/components/scheduler src/components/task-modal src/app/api/scheduler/browse-folder/route.ts` (0 errors, existing dashboard warnings only); `git diff --check -- src/app/page.tsx src/components/scheduler src/components/task-modal src/app/api/scheduler/browse-folder/route.ts CHANGELOG.md`; Playwright smoke on `http://localhost:5020` with seeded scheduler data confirmed Run Now stays on the Scheduler view, shows running/done state, resets to Run Now after 3 seconds, has no horizontal overflow, and logs no hydration/nested-button errors.
- Intended commit message: `Fix scheduler run now state`

## 2026-05-21 23:44 WITA - Fix Swarm Template Keys

- Status: Pushed
- Areas changed: Swarm template IDs, MiroShark template mapping, changelog
- Summary: Preserve real MiroShark template IDs in the Swarm template picker instead of collapsing multiple templates onto shared presentation IDs like `polymarket`.
- Verification: `pnpm typecheck`; `pnpm exec eslint src/components/swarm src/app/page.tsx` (0 errors, existing dashboard warnings only); `git diff --check -- src/components/swarm/swarm-data.ts src/app/page.tsx CHANGELOG.md`; in-app browser smoke on the Swarm tab confirmed all six real template buttons render and no duplicate-key/`polymarket` warning is logged.
- Intended commit message: `Fix swarm template keys`

## 2026-05-21 23:36 WITA - Add Local Kanban Telemetry

- Status: Pushed
- Areas changed: Local telemetry API, client telemetry buffering, Kanban orchestration diagnostics, stalled tool-output summaries, changelog
- Summary: Add a local-dev structured telemetry pipeline modeled after Claw Mobile's batched client events, writing `/api/telemetry/events` JSONL records under `~/.hivemindos/telemetry/`, and instrument Kanban pickup, dispatch, session polling, chat persistence, and stalled tool-output paths. Also summarize structured search/tool output instead of dumping raw JSON into Needs You notes.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/page.tsx src/lib/utils/client-telemetry.ts src/lib/services/telemetry/local-telemetry.ts src/app/api/telemetry/events/route.ts` (0 errors, existing dashboard warnings only); `git diff --check -- src/app/page.tsx src/lib/utils/client-telemetry.ts src/lib/services/telemetry/local-telemetry.ts src/app/api/telemetry/events/route.ts CHANGELOG.md`; `curl -sS -X POST http://localhost:5020/api/telemetry/events ...` and `GET /api/telemetry/events?type=telemetry.smoke&limit=1` confirmed a local JSONL event was written and queried.
- Intended commit message: `Add local Kanban telemetry`

## 2026-05-21 23:31 WITA - Attach Scheduler Folders

- Status: Pushed
- Areas changed: Scheduler task modal folder attachments, scheduler browse-folder API, changelog
- Summary: Make the task modal's `Choose folder` action attach folders through a scheduler-specific native macOS folder picker, while keeping `Choose files` as a separate file-browser action.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/components/task-modal src/app/api/scheduler/browse-folder/route.ts`; `git diff --check -- src/app/page.tsx src/components/task-modal src/app/api/scheduler/browse-folder/route.ts CHANGELOG.md`; Playwright smoke on `http://localhost:5020` confirmed `+ path` exposes both `Choose folder` and `Choose files`, no longer shows static fallback path values, and no horizontal overflow appears.
- Intended commit message: `Attach scheduler folders`

## 2026-05-21 23:25 WITA - Persist Dashboard Chat Messages

- Status: Pushed
- Areas changed: Dashboard chat state hydration, Kanban task chat history, changelog
- Summary: Persist non-system dashboard chat messages by agent in local storage so Kanban assignment and steering transcripts survive reloads and remain visible in the task chat modal.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/page.tsx` (0 errors, existing dashboard warnings only); `git diff --check -- src/app/page.tsx CHANGELOG.md`
- Intended commit message: `Persist dashboard chat messages`

## 2026-05-21 23:21 WITA - Remove Duplicate Work Add Button

- Status: Pushed
- Areas changed: Work board add-task controls, changelog
- Summary: Remove the top-level Work board `new task` button now that each lane has its own add control, and rename the empty-lane CTA from `nothing here` to `Add Task`.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/page.tsx` (0 errors, existing dashboard warnings only); `git diff --check -- src/app/page.tsx CHANGELOG.md`; Browser DOM smoke on `http://localhost:5020` confirmed no top-level `new task` button and visible empty-lane `Add Task` buttons.
- Intended commit message: `Remove duplicate work add button`

## 2026-05-21 23:12 WITA - Clarify Kanban Pickup And Tool Blocks

- Status: Pushed
- Areas changed: Work board ready pickup flow, Kanban card motion, task chat diagnostics, changelog
- Summary: Show a one-second springing worker bee pickup preview before Ready tasks move to Working, and include the last tool-output snippet when a Working task is moved to Needs You because no final agent response arrived.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/page.tsx` (0 errors, existing dashboard warnings only); `git diff --check -- src/app/page.tsx src/app/kanban-board.module.css CHANGELOG.md`; Browser smoke on `http://localhost:5020` confirmed the Work board renders after the card-header motion changes.
- Intended commit message: `Clarify kanban pickup and tool blocks`

## 2026-05-21 23:00 WITA - Add Fleet List Agent Controls

- Status: Pushed
- Areas changed: Fleet list view agent rows, fleet view action wiring, fleet token styling, changelog
- Summary: Collapse Fleet list agent task messages behind the same caret preview used in The Roster and show the selected agent's chat, wallet, settings, duplicate, and remove controls directly in the list row.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/components/fleet/list-view.tsx src/components/fleet/FleetView.tsx`; `git diff --check -- src/components/fleet/list-view.tsx src/components/fleet/FleetView.tsx src/components/fleet/fleet-tokens.module.css CHANGELOG.md`; Browser smoke on `http://localhost:5020` confirmed the Fleet list tab renders collapsed recent-task buttons, the caret expands a Queen Bee message, and selecting the agent row reveals Chat, Wallet, Settings, Duplicate, and Remove controls.
- Intended commit message: `Add fleet list agent controls`

## 2026-05-21 23:00 WITA - Use Pickers For Scheduler Paths

- Status: Pushed
- Areas changed: Scheduler task modal path attachment picker, changelog
- Summary: Replace the modal's `+ path` static fallback-value dropdown with picker actions for choosing a folder or choosing files, using the browser file-system picker when available and an input fallback otherwise.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/page.tsx src/components/task-modal` (0 errors, existing dashboard warnings only); `git diff --check -- src/app/page.tsx src/components/task-modal CHANGELOG.md`; Playwright smoke on `http://localhost:5020` confirmed `+ path` shows `Choose folder` and `Choose files`, no longer shows `~/Obsidian/hive` or `~/.hivemindos/.env` as menu choices, and no horizontal overflow appears.
- Intended commit message: `Use pickers for scheduler paths`

## 2026-05-21 22:56 WITA - Constrain Scheduler Skill Picker

- Status: Pushed
- Areas changed: Scheduler task modal skill attachment picker, changelog
- Summary: Give the modal's skill attachment picker the same name/slug/description search ranking as the custom worker role skill chooser, add a search input above the skill list, and constrain the dropdown to a scrollable height so long shared-skill inventories do not stretch the modal.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/page.tsx src/components/task-modal` (0 errors, existing dashboard warnings only); `git diff --check -- src/app/page.tsx src/components/task-modal CHANGELOG.md`; Playwright smoke on `http://localhost:5020` confirmed the task modal skill picker shows a search input, the result list has `max-height: 220px` and `overflow-y: auto`, filtering accepts `brain`, and no horizontal overflow appears.
- Intended commit message: `Constrain scheduler skill picker`

## 2026-05-21 22:55 WITA - Optimize Bee Icons

- Status: Pushed
- Areas changed: Bee icon PNG assets, changelog
- Summary: Losslessly optimize the queen and worker bee icon PNGs under `public/icons/` to reduce shipped asset size without changing dimensions or transparency.
- Verification: `oxipng -o 4 --strip safe public/icons/*bee*.png` processed 22 PNGs and reduced total size from 1.32 MiB to 1.23 MiB, saving 91.1 KiB (6.75%); `file public/icons/*bee*.png` confirmed all optimized bee icons remain 256 x 256 RGBA PNGs; `git diff --check -- public/icons CHANGELOG.md`
- Intended commit message: `Optimize bee icons`

## 2026-05-21 22:26 WITA - Use Task Modal For Scheduler Creation

- Status: Pushed
- Areas changed: Scheduler create/edit flow, task modal component bundle, assimilation manifest, changelog
- Summary: Replace the below-scheduler create task section with the downloaded `nextjs-task-modal` modal, wire Schedule new task and Edit into the modal, and map modal saves back into the existing scheduler state with cadence, target, prompt/steps, and attachments preserved.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/page.tsx src/components/task-modal src/components/scheduler` (0 errors, existing dashboard warnings only); `python3 /Users/liam/.codex/skills/github-assimilator/scripts/verify_assimilation_manifest.py`; `git diff --check -- src/app/page.tsx src/components/task-modal CHANGELOG.md ASSIMILATION.json`; Playwright smoke on `http://localhost:5020` confirmed Schedule new task opens the modal, the old inline creation section stays hidden, saving `Modal smoke schedule` adds it to the scheduler rail/detail view, and no horizontal overflow appears.
- Intended commit message: `Use task modal for scheduler creation`

## 2026-05-21 22:16 WITA - Make Hivemind Logo Return To Fleet

- Status: Pushed
- Areas changed: Dashboard topbar logo navigation, global header styling, changelog
- Summary: Turn the HivemindOS logo tile into an accessible button that returns the dashboard to the Fleet view.
- Verification: `pnpm exec eslint src/app/page.tsx` (0 errors, existing dashboard warnings only); `git diff --check -- src/app/page.tsx src/app/globals.css CHANGELOG.md`; Browser smoke on `http://localhost:5020` switched to Work, clicked the HivemindOS logo button, and confirmed the Fleet header and active Fleet tab returned.
- Intended commit message: `Make hivemind logo return to fleet`

## 2026-05-21 12:50 UTC - Load Shared Skill Hints Through Hermes SOUL

- Status: Pushed
- Areas changed: Shared skill seed script, Hermes runtime instruction pointers, changelog
- Summary: Make the shared-skill seeding script patch `~/.hermes/SOUL.md` as well as `~/.hermes/AGENTS.md`, because Hermes always loads SOUL from `HERMES_HOME` but only loads AGENTS as current-working-directory project context. Also remove stale `OMNI_AGENT_HIVEMIND_SHARED_SKILLS` managed blocks when rewriting skill hints so obsolete vault paths do not linger.
- Verification: `bash -n scripts/seed-shared-skills.sh`; `bash -n setup.sh`; Python prompt-builder smoke confirmed the shared-skill pointer is loaded through `~/.hermes/SOUL.md`.
- Intended commit message: `Load shared skill hints through Hermes SOUL`

## 2026-05-21 21:15 WITA - Cap Honey Rewards By HIVE Pool

- Status: Pushed
- Areas changed: Honey ledger worker economics, reward-pool D1 schema/migration, compute gateway Bankr key routing, Wallets Hive ledger display, setup/env defaults, economics simulation script, worker docs
- Summary: Encode Bankr's current 1.2% swap fee, 57% creator share, and 10% Honey-pool allocation as a 0.0684% volume-backed reward pool, track cumulative pool/emitted/exchanged HIVE in micro-units, clip every Honey grant by remaining pool capacity, show pool/rate stats in Wallets, and make trusted compute use the user's local Bankr LLM key so HIVE-funded Bankr credits pay for model calls.
- Verification: `pnpm test:honey-economics` including 10,000 randomized cap simulations; `pnpm typecheck`; `pnpm typecheck` in `workers/honey-ledger`; `pnpm typecheck` in `workers/compute-gateway`; `pnpm exec eslint workers/honey-ledger/src/index.ts workers/compute-gateway/src/index.ts src/lib/services/wallet/honey-ledger.ts src/lib/utils/agent-wallet.ts src/app/api/chat/agent-runtime/route.ts src/app/api/honey-ledger/route.ts`; `pnpm d1:migrate:local`; `pnpm d1:migrate:reward-pool:remote`; uploaded `HONEY_LEDGER_ADMIN_TOKEN`; deployed `hivemindos-honey-ledger` and `hivemindos-compute-gateway`; live smokes confirmed ledger/gateway health, forged receipt rejection, and compute gateway requiring a caller Bankr LLM key; `git diff --check`.
- Intended commit message: `Cap Honey rewards by HIVE pool`

## 2026-05-21 21:14 WITA - Replace Scheduler View With Timeline Dispatch

- Status: Pushed
- Areas changed: Scheduler dashboard tab, standalone `/scheduler` route, Scheduler component bundle, assimilation manifest, changelog
- Summary: Transplant the downloaded `nextjs-scheduler` scheduler view into the app, map existing dashboard/runtime schedules into its job rail, 24-hour timeline, detail composer, and empty state, and keep Import existing, pause/resume, run-now, and edit callbacks connected to the current scheduler state.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/page.tsx src/components/scheduler src/app/scheduler/page.tsx` (0 errors, existing dashboard warnings only); `python3 /Users/liam/.codex/skills/github-assimilator/scripts/verify_assimilation_manifest.py`; `git diff --check -- src/app/page.tsx src/components/scheduler src/app/scheduler/page.tsx CHANGELOG.md ASSIMILATION.json`; Browser smoke on `http://localhost:5020` confirmed the Scheduler tab renders the new dispatch shell with no horizontal document overflow, and `http://localhost:5020/scheduler` renders the timeline/jobs handoff.
- Intended commit message: `Replace scheduler view with timeline dispatch`

## 2026-05-21 20:39 WITA - Show Hetzner Server Specs

- Status: Pushed
- Areas changed: Hetzner machine initializer modal, fleet styling, changelog
- Summary: Add vCPU, RAM, SSD, and CPU-family metadata to the seeded Hetzner server type options and render the selected type's specs beside the estimated compute cost.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/page.tsx src/app/fleet.module.css` (0 errors, existing dashboard warnings plus CSS config ignore warning only); `git diff --check -- src/app/page.tsx src/app/fleet.module.css CHANGELOG.md`; Playwright smoke on `http://localhost:5020` confirmed CX23 renders 2 vCPU, 4 GB RAM, 40 GB SSD, Intel/AMD shared CPU and changing to CPX41 updates the specs to 8 vCPU, 16 GB RAM, 240 GB SSD, AMD shared CPU.
- Intended commit message: `Show Hetzner server specs`

## 2026-05-21 20:29 WITA - Clarify Hetzner Env Actions

- Status: Pushed
- Areas changed: Hetzner machine initializer modal, changelog
- Summary: Split the Hetzner token save/open-env loading states so opening the env file no longer animates the Save key button, and clarify that the generated local provision script uses `HCLOUD_TOKEN` with Hetzner Cloud before running the HivemindOS bootstrap over SSH.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/page.tsx` (0 errors, existing MiroShark warnings only); `git diff --check -- src/app/page.tsx CHANGELOG.md`; Playwright smoke on `http://localhost:5020` confirmed Open env file spins only its own button while the Save key button stays static and the updated provisioning explanation renders.
- Intended commit message: `Clarify Hetzner env actions`

## 2026-05-21 20:18 WITA - Add Hetzner Token Helpers

- Status: Pushed
- Areas changed: Fleet Hetzner token API helpers, local HivemindOS env opening flow, changelog
- Summary: Add node runtime API helpers for saving `HCLOUD_TOKEN` through `scripts/hive-env-add` and opening the local `~/.hivemindos/.env` file with safe permissions.
- Verification: `pnpm typecheck`; `pnpm exec eslint src/app/api/fleet/hetzner/token/route.ts src/app/api/fleet/hetzner/env/open/route.ts`; `git diff --check`.
- Intended commit message: `Add Hetzner token helpers`

## 2026-05-21 20:11 WITA - Compact Work Board Summary

- Status: Pushed
- Areas changed: Work board summary header, Work board stats labels, changelog
- Summary: Replace the oversized hardcoded Work board slogan with a compact Workboard task header and rename the misleading `in flight` count to `total` so only the Working stat implies active execution.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `git diff --check -- src/app/page.tsx src/app/kanban-board.module.css CHANGELOG.md`; static scan confirmed the old `Eight bees`, `one comb`, and `in flight` strings are gone; Playwright smoke on `http://localhost:5020` confirmed the Work summary renders as a 76px compact strip with `Workboard`, `Tasks by lane`, `0 working`, `2 needs you`, `6 done`, and `8 total`.
- Intended commit message: `Compact work board summary`

## 2026-05-21 20:05 WITA - Raise Work Board Scroll Buttons

- Status: Pushed
- Areas changed: Work board horizontal scroll FAB positioning, changelog
- Summary: Anchor the Work board left/right scroll buttons to a viewport-based lane height instead of the full scrollable board stage so they appear in the visible portion of the Kanban board.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `git diff --check -- src/app/kanban-board.module.css CHANGELOG.md`; source check confirmed the scroll FAB offset now uses `clamp(132px, 24vh, 220px)` instead of `top: 50%`.
- Intended commit message: `Raise work board scroll buttons`

## 2026-05-21 19:58 WITA - Add Trusted Honey Compute Gateway

- Status: Pushed
- Areas changed: Cloudflare Worker/D1 compute gateway, Bankr LLM gateway routing, official Honey receipt signing, setup defaults, chat reward path, worker documentation, assimilation manifest
- Summary: Add an official `hivemindos-compute-gateway` Worker that routes opt-in reward-eligible agent calls through trusted server-side compute, observes/estimates token usage, enforces a per-workspace daily cap, signs Honey receipts with Cloudflare-held secrets, and submits them to the official Honey ledger so cloned repos do not need private ledger/admin secrets.
- Verification: `pnpm typecheck`; `pnpm typecheck` in `workers/compute-gateway`; created D1 database `hivemindos_compute_gateway`; applied remote schema; uploaded Bankr and Honey signing secrets to Cloudflare; deployed to `https://hivemindos-compute-gateway.hivemindos.workers.dev`; live `/health` smoke returned OK; live `/chat` smoke reached Bankr and was blocked only by insufficient LLM Gateway credits; updated official ledger exchange to convert backend-stored Honey without requiring clone users to hold an admin token.
- Intended commit message: `Add trusted Honey compute gateway`

## 2026-05-21 19:41 WITA - Add Machine Initializer Cell

- Status: Pushed
- Areas changed: Fleet graph add-machine cell, machine initializer modal, Hetzner/HivemindOS provisioning scaffold API, local Hetzner token helper APIs, changelog, assimilation manifest
- Summary: Add a dotted plus cell to the Fleet hive graph that opens a new-machine initializer, generate a local Hetzner project under `~/.hivemindos/machines/<project>` with token-safe `.env`, idempotent provision/destroy scripts, a mandatory HivemindOS bootstrap script, a Hetzner API key empty state with save/open-env actions, estimated compute cost display, and dropdowns for machine runtime, server type, location, and supported Debian/Ubuntu image.
- Verification: `pnpm typecheck --pretty false`; `pnpm exec eslint src/components/fleet/network-graph.tsx src/components/fleet/FleetView.tsx src/app/api/fleet/machines/init/route.ts src/app/api/fleet/hetzner/token/route.ts src/app/api/fleet/hetzner/env/open/route.ts src/lib/services/machine-provisioning/hetzner-control-room.ts src/app/page.tsx` (0 errors, existing dashboard warnings only); `POST /api/fleet/machines/init` on `localhost:5020` created a runtime-selected smoke project with `.env`, `scripts/provision.sh`, `scripts/bootstrap-hivemindos.sh`, and `scripts/destroy.sh`; generated `.env` kept `HCLOUD_TOKEN` blank and local-only; Browser smoke confirmed the modal has runtime-agent copy, no Hermes control-room checkbox, a machine-name field, estimated cost, a Hetzner API key empty state, and working Runtime agent, Server type, Location, and Image selectors.
- Intended commit message: `Add machine initializer cell`

## 2026-05-21 19:31 WITA - Remove Work Task Side Drawer

- Status: Pushed
- Areas changed: Work board task layout, task card headers, changelog
- Summary: Remove the selected-task side drawer from the Kanban/Work board and rely on the per-card context menu and action buttons instead, while hiding raw internal task ids from task cards.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `git diff --check -- src/app/page.tsx src/app/kanban-board.module.css CHANGELOG.md`; static scan confirmed the drawer markup and card-id header render are gone; Playwright smoke on `http://localhost:5020` confirmed the Work board stays in `noDrawer`, shows 8 per-card action menus, and no raw task ids render in the board text.
- Intended commit message: `Remove work task side drawer`

## 2026-05-21 19:18 WITA - Add Custom Worker Class Builder

- Status: Pushed
- Areas changed: Agent settings modal, agent profile types, fleet styling, changelog
- Summary: Show worker capabilities as badges, add a dotted Custom worker card that opens an in-modal class builder, let users name a custom worker, choose or upload a bee image, write its suited-for prompt, select shared-brain skills with searchable toggle badges, and render saved custom classes as selectable worker-class cards.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/page.tsx src/lib/types/agent-runtime.ts` (0 errors, existing warnings only); `git diff --check -- src/app/page.tsx src/app/fleet.module.css src/lib/types/agent-runtime.ts CHANGELOG.md`; Playwright smoke with a seeded local agent confirmed worker capability badges render, the dotted Custom card opens the class builder, role name/image/prompt/search controls exist, a skill badge can be selected, applying the custom class adds it as a selectable worker-class card, switching to Engineer keeps the custom card visible, and reselecting the custom card restores its detail.
- Intended commit message: `Add custom worker class builder`

## 2026-05-21 19:13 WITA - Fix Swarm Archive Selection

- Status: Pushed
- Areas changed: Swarm archive selection, MiroShark archived-run display, live polling guards, changelog
- Summary: Keep saved simulation cards titled from their archived scenario instead of rewriting them as `Simulation sim_*`, mark the clicked archive immediately while its data loads, and prevent archived runs from being treated as live runs by polling/autosave effects.
- Verification: `pnpm typecheck`; `pnpm exec eslint src/app/page.tsx src/components/swarm` (0 errors, existing dashboard warnings only); `git diff --check -- src/app/page.tsx CHANGELOG.md src/components/swarm`; refreshed the six E2E template archives so their saved post counts match the backend; in-app browser smoke opened Swarm, clicked Historical What-If and Political Debate saved runs, and confirmed both switched content without showing `Simulation sim_*` titles.
- Intended commit message: `Fix swarm archive selection`

## 2026-05-21 19:06 WITA - Make Honey Ledger Opt-In

- Status: Pushed
- Areas changed: Wallets Honey ledger UI, agent-runtime Honey receipt gating, setup defaults, assimilation manifest
- Summary: Keep the official Honey ledger URL configured for clones but disable receipt submission by default, add a Wallets opt-in panel that explains the metadata sent, persist the user's ledger enablement in localStorage, and send Honey usage receipts only when the user enables the ledger.
- Verification: `pnpm typecheck`; `pnpm typecheck` in `workers/honey-ledger`; `pnpm exec eslint src/app/page.tsx src/app/api/chat/agent-runtime/route.ts src/lib/services/wallet/honey-ledger.ts src/app/wallets.module.css` (0 errors, existing warnings); `git diff --check`; attempted Playwright Wallets-tab smoke, but the dirty worktree's current header tab click did not switch views in that headless session.
- Intended commit message: `Make Honey ledger opt in`

## 2026-05-21 19:02 WITA - Simplify Agent Role Form

- Status: Pushed
- Areas changed: Agent settings modal, fleet styling, changelog
- Summary: Tone down the add/edit agent name field typography, remove the colony role selector from Role settings, and default newly created agents to Worker Bee while queen/orchestrator agents remain automatic.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/page.tsx` (0 errors, existing warnings only); `git diff --check -- src/app/page.tsx src/app/fleet.module.css CHANGELOG.md`; source scan confirmed `Colony role`, `Observer`, `Human-operated`, and add-agent draft bee-role wiring are gone from the settings modal.
- Intended commit message: `Simplify agent role form`

## 2026-05-21 18:58 WITA - Collapse Roster Task Preview

- Status: Pushed
- Areas changed: Fleet roster selected-agent task preview, fleet token styling, changelog
- Summary: Collapse the selected roster agent's recent task message to a short preview with a caret toggle for expanding and hiding the full text.
- Verification: `pnpm exec eslint src/components/fleet/roster.tsx`; `git diff --check -- src/components/fleet/roster.tsx src/components/fleet/fleet-tokens.module.css CHANGELOG.md`; Browser smoke at `http://localhost:5020` expanded the roster, selected Hermes, confirmed the recent-task control starts collapsed with `aria-expanded="false"`, and toggles open/closed.
- Intended commit message: `Collapse roster task preview`

## 2026-05-21 18:59 WITA - Route Dashboard Masthead Copy

- Status: Pushed
- Areas changed: Dashboard topbar masthead, changelog
- Summary: Replace the hard-coded Work Board masthead copy with active-view copy so Fleet, Work, Brain, Scheduler, Swarm, Wallets, Alerts, and Chat each show their own title and live detail text.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `git diff --check -- src/app/page.tsx CHANGELOG.md`; Playwright smoke at `http://localhost:5020` confirmed Fleet, Work, Brain, and Wallets each show different masthead copy.
- Intended commit message: `Route dashboard masthead copy`

## 2026-05-21 18:57 WITA - E2E Test MiroShark Templates

- Status: Pushed
- Areas changed: MiroShark template execution, app run history archive, changelog
- Summary: Started Docker/MiroShark, launched every real MiroShark template through the HivemindOS app swarm API, archived each resulting simulation through the app runs API, and verified the new template-test runs appear in the Swarm history shelf.
- Verification: `GET /api/miroshark/status` reported the local MiroShark backend connected after Docker start; launched and archived `campus_controversy` (`sim_54cf9211e5b4`, 13 posts), `corporate_crisis` (`sim_d15b0b71cc3a`, 13 posts), `crypto_launch` (`sim_5656eb5004e9`, 18 posts), `historical_whatif` (`sim_1046965ed379`, 13 posts), `political_debate` (`sim_03c53193c530`, 17 posts), and `product_announcement` (`sim_2e4545f1c455`, 23 posts) through `localhost:5020` app APIs; `GET /api/miroshark/runs` returned all six archive folders under `runs/2026/2026-05-21`; in-app browser smoke on the Swarm tab showed the template-test runs in the Past Simulations shelf and rendered the Product Announcement run's real X posts.
- Intended commit message: `E2E test MiroShark templates`

## 2026-05-21 18:46 WITA - Stack Agent Security Rows

- Status: Pushed
- Areas changed: Agent settings modal, fleet styling, changelog
- Summary: Change the agent Security view from narrow columns to stacked rows with icon/title/explanation alignment for more readable safety copy.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/page.tsx` (0 errors, existing warnings only); `git diff --check -- src/app/page.tsx src/app/fleet.module.css CHANGELOG.md`; source check confirmed security articles now wrap title/body in row content containers and CSS uses one-column stacked rows instead of auto-fit columns.
- Intended commit message: `Stack agent security rows`

## 2026-05-21 18:45 WITA - Unclip Work Add Attachment Menu

- Status: Pushed
- Areas changed: Work board inline add composer overflow, attachment menu layering, changelog
- Summary: Let the active Work board add-task composer and its lane escape the column scroller while the attachment menu is open, then raise the active cards stack/menu above the lane header so the Images/Files/Directory menu is not chopped or painted over.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `git diff --check -- src/app/kanban-board.module.css src/app/chat.module.css CHANGELOG.md`; Playwright smoke on `http://localhost:5020` clicked Work, opened the new-task composer, opened Add attachment, and confirmed the Images/Files/Directory menu renders fully instead of clipping behind the lane.
- Intended commit message: `Unclip work add attachment menu`

## 2026-05-21 18:35 WITA - Load Real Swarm Data

- Status: Pushed
- Areas changed: Swarm theater data wiring, MiroShark dashboard mapping, swarm output views, placeholder data removal, changelog
- Summary: Remove the downloaded Swarm placeholder constants and canned composer/output samples, then drive the Swarm theater from live MiroShark status, saved run summaries, templates, profiles, posts, timeline/actions, markets, and observability payloads already loaded by the dashboard.
- Verification: `pnpm typecheck`; `pnpm eslint src/components/swarm src/app/swarm/page.tsx`; `pnpm eslint src/app/page.tsx src/components/swarm src/app/swarm/page.tsx` (passes with existing dashboard warnings only); `rg` confirmed the old sample run names, market symbols, and canned social scenarios are no longer present in rendered Swarm code; in-app browser smoke on the dashboard Swarm tab confirmed no horizontal overflow, no placeholder sample strings, and real MiroShark offline/empty-state data is shown.
- Intended commit message: `Load real swarm data`

## 2026-05-21 18:34 WITA - Stabilize Work Card Hover

- Status: Pushed
- Areas changed: Work board task-card hover and active styling, changelog
- Summary: Remove the upward hover translation from Kanban task cards and replace the active/working/stale inset left stripe with even border/glow styling so the first card no longer clips at the top or shows a thicker left edge.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `git diff --check -- src/app/kanban-board.module.css CHANGELOG.md`; static scan confirmed the old `translateY(-1px)` hover transform and `inset 3px 0 0` card stripe are gone; Playwright hover geometry check on a Done card confirmed `movedY: 0` and `transform: none`.
- Intended commit message: `Stabilize work card hover`

## 2026-05-21 18:32 WITA - Add Roster Add-Agent Hover

- Status: Pushed
- Areas changed: Fleet roster add-agent row, fleet token styling, changelog
- Summary: Add a hover treatment to the dotted roster add-agent row so the dashed border, teal fill, plus tile, and row elevation respond visibly before opening the agent creation modal.
- Verification: `pnpm exec eslint src/components/fleet/roster.tsx`; `git diff --check -- src/components/fleet/roster.tsx src/components/fleet/fleet-tokens.module.css`.
- Intended commit message: `Add roster add-agent hover`

## 2026-05-21 18:16 WITA - Hide Advanced Runtime Plumbing

- Status: Pushed
- Areas changed: Agent settings modal, fleet styling, changelog
- Summary: Remove the redundant Runtime tab, keep runtime selection inside Role for both new and existing agents, and tuck raw gateway/session/collector fields behind an Advanced toggle within Role for existing agents only.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/page.tsx` (0 errors, existing warnings only); `git diff --check -- src/app/page.tsx src/app/fleet.module.css CHANGELOG.md`; Browser smoke at `http://localhost:5020` confirmed add-agent settings show only Role, Memory, and Security tabs with runtime selection in Role, and existing-agent Role hides gateway/session/collector until the Advanced toggle is opened.
- Intended commit message: `Hide advanced runtime plumbing`

## 2026-05-21 18:16 WITA - Replace Swarm View With Orbital Theater

- Status: Pushed
- Areas changed: Swarm dashboard tab, standalone `/swarm` route, swarm component bundle, assimilation manifest
- Summary: Replace the embedded MiroShark Swarm workbench surface with the downloaded `nextjs-swarm` orbital swarm theater, including the left run rail, center arena/output views, right template composers, scoped Swarm tokens, and a direct `/swarm` route.
- Verification: Audited `/Users/liam/Downloads/nextjs-swarm`; `pnpm typecheck`; `pnpm eslint src/app/page.tsx src/components/swarm src/app/swarm/page.tsx` (passes with existing dashboard warnings after the SwarmView effect fix); `pnpm eslint src/components/swarm src/app/swarm/page.tsx`; in-app browser smoke at `http://localhost:5020/swarm` confirmed the redesigned theater renders with no horizontal document overflow.
- Intended commit message: `Replace swarm view with orbital theater`

## 2026-05-21 18:14 WITA - Move Fleet Agent Controls Into Roster

- Status: Pushed
- Areas changed: Fleet roster, fleet view layout, changelog
- Summary: Add a dotted add-agent row inside each expanded roster machine card, expand selected agent rows to show task context and chat/wallet/settings/duplicate/remove controls, and remove the center-stage fleet footer entirely.
- Verification: `pnpm exec eslint src/components/fleet/FleetView.tsx src/components/fleet/roster.tsx`; `pnpm exec tsc --noEmit --pretty false --skipLibCheck`; `git diff --check -- src/components/fleet/FleetView.tsx src/components/fleet/roster.tsx CHANGELOG.md`.
- Intended commit message: `Move fleet agent controls into roster`

## 2026-05-21 18:11 WITA - Migrate Legacy Kanban Folder

- Status: Pushed
- Areas changed: Shared vault settings migration, Kanban storage resolution, Work board loading, Swarm CSS module build fix, changelog
- Summary: Migrate persisted shared-vault Kanban folders named `kanban` or `Kanban` to the current `Projects/HivemindOS/Kanban` folder on both the client and server, fall back from any empty non-default Obsidian Kanban folder to the populated project board, and fix an invalid Swarm CSS Modules selector that could make the dev server return a Next error page.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `git diff --check -- src/app/page.tsx src/lib/services/kanban/local-kanban-store.ts src/components/swarm/swarm-tokens.module.css CHANGELOG.md`; API requests with legacy/empty `kanbanFolder` values and non-default board slugs now resolve to the populated default project board; Playwright smoke with legacy localStorage confirmed the Work board shows `2` Needs human cards and `6` Done cards and rewrites the stored Kanban folder to `Projects/HivemindOS/Kanban`; live Chrome reload showed the Work nav returning to `Work: 8 tasks`.
- Intended commit message: `Migrate legacy kanban folder`

## 2026-05-21 18:08 WITA - Add Cloudflare Honey Ledger Worker

- Status: Pushed
- Areas changed: Cloudflare Worker/D1 ledger package, remote Honey receipt signing, public clone-safe ledger config, local ledger fallback, assimilation manifest, TypeScript config, local environment setup
- Summary: Deploy the `hivemindos-honey-ledger` Cloudflare Worker on the free Workers/D1 stack, make the official ledger URL the clone/setup default, require trusted signed receipts for official Honey, allow self-service Honey-to-HIVE exchange from backend-stored balances, and keep the backend D1 balance as the source of truth.
- Verification: `pnpm typecheck`; `pnpm typecheck` in `workers/honey-ledger`; `pnpm d1:migrate:local`; `pnpm d1:migrate:remote`; deployed to `https://hivemindos-honey-ledger.hivemindos.workers.dev`; live Cloudflare smoke confirmed unsigned `/receipts` is rejected, unauthenticated signed-receipt-free minting is rejected, signed `/receipts` credits Honey, and `/exchange` converts only backend-stored Honey; `pnpm exec eslint src/lib/services/wallet/honey-ledger.ts src/app/api/chat/agent-runtime/route.ts workers/honey-ledger/src/index.ts`; root `pnpm lint` is blocked by unrelated dirty-worktree warnings/errors.
- Intended commit message: `Add Cloudflare Honey ledger worker`

## 2026-05-21 18:08 WITA - Simplify Agent Memory Settings

- Status: Pushed
- Areas changed: Agent settings modal, runtime folder picker API, fleet styling, changelog
- Summary: Simplify the agent Memory tab so shared Obsidian brain context is the primary surface, keep the shared-brain checkbox editable during agent creation, hide runtime-folder configuration in add-agent mode, and move existing-agent runtime-folder configuration into compact browse/edit icon controls.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/page.tsx src/app/api/agents/browse-folder/route.ts` (0 errors, existing warnings only); `git diff --check -- src/app/page.tsx src/app/fleet.module.css src/app/api/agents/browse-folder/route.ts CHANGELOG.md`; Browser smoke at `http://localhost:5020` confirmed the add-agent Memory tab has a toggleable shared-brain checkbox, hides the shared-brain copy when unticked, and does not show the runtime-folder section in create mode; existing-agent Memory still keeps compact runtime-folder browse/edit controls.
- Intended commit message: `Simplify agent memory settings`

## 2026-05-21 18:01 WITA - Raise Fleet Hive Agent Labels

- Status: Pushed
- Areas changed: Fleet hive machine cluster agent cells, changelog
- Summary: Enlarge bee icons inside graph hive cells and shift the bee/name stack upward so agent labels have more breathing room from the lower hex edge.
- Verification: `pnpm typecheck`; `pnpm lint`; `git diff --check`.
- Intended commit message: `Raise fleet hive agent labels`

## 2026-05-21 18:02 WITA - Count All Done Work

- Status: Pushed
- Areas changed: Work board summary stats, changelog
- Summary: Change the Work board completed-work summary from a timestamp-sensitive `done today` count to the actual number of Done tasks on the board, so previously completed tasks are reflected in the visible stat.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `git diff --check -- src/app/page.tsx CHANGELOG.md`; Playwright smoke at `http://localhost:5020` confirmed the Work summary shows `6 done`, the Done column count is `6`, Done has 6 cards, and the board still starts at scroll-left 0.
- Intended commit message: `Count all done work`

## 2026-05-21 17:54 WITA - Fix Work Board Hover Transparency

- Status: Pushed
- Areas changed: Work board hover styling, changelog
- Summary: Add opaque base layers under Work board lane and task-card hover gradients so colored hover treatments no longer expose a transparent-looking band at the top.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `git diff --check -- src/app/kanban-board.module.css CHANGELOG.md`; Playwright hover smoke confirmed Work board lane hover backgrounds include an opaque base layer and no document-level horizontal overflow.
- Intended commit message: `Fix work board hover transparency`

## 2026-05-21 17:50 WITA - Add Bee Class Settings Grid

- Status: Pushed
- Areas changed: Agent settings modal, worker bee presets, bee icon asset paths, agent profile data model, fleet styling, changelog
- Summary: Restore the general worker bee to the clean original-style icon, version corrected class bee variants to cache-busting `*-v2.png` paths, replace the worker class dropdown with an icon grid, and add a selected-class detail panel with an editable suited-for prompt plus seeded shared-brain skill slugs based on the user's vault skill index.
- Verification: `pnpm typecheck`; `pnpm lint`; `git diff --check`; inspected the v2 bee class contact sheet.
- Intended commit message: `Add bee class settings grid`

## 2026-05-21 17:44 WITA - Refine Fleet List Cell Spacing

- Status: Pushed
- Areas changed: Fleet list row spacing, shared hex tile content centering, changelog
- Summary: Add more breathing room between fleet list hive cells and their labels, enlarge the agent list hive cells slightly, and center hex tile content with a flex-based content layer so bee icons sit cleanly inside their containers.
- Verification: `pnpm exec eslint src/components/fleet/list-view.tsx src/components/fleet/hex-tile.tsx`; `git diff --check -- src/components/fleet/list-view.tsx src/components/fleet/hex-tile.tsx src/components/fleet/fleet-tokens.module.css CHANGELOG.md`; Playwright geometry check on `http://localhost:5020` confirmed 14-16px label gaps and bee image centers aligned with their hex centers.
- Intended commit message: `Refine fleet list cell spacing`

## 2026-05-21 17:21 WITA - Add Worker Bee Class Variants

- Status: Pushed
- Areas changed: Worker bee class icons, bee icon selection config, fleet agent data, agent cells, changelog
- Summary: Replace the badge-style worker class icons with reference-edited full-bee variants for general, engineer, artist, writer, researcher, ops, QA, planner, and vision workers, then wire bee rendering to use each agent's `workerClass`.
- Verification: `pnpm typecheck`; `pnpm lint`; `git diff --check`; inspected the generated class icon contact sheet.
- Intended commit message: `Add worker bee class variants`

## 2026-05-21 17:12 WITA - Match HivemindOS Scheduler Builder

- Status: Pushed
- Areas changed: Scheduler builder, per-step schedule data model, Scheduler styles, schedule card actions, changelog
- Summary: Replace the Scheduler's textarea-style step mode with an HivemindOS-style selected-step builder: Enter adds steps, empty Backspace removes them, every step has its own `+` attachment menu for skills/folders/files/paths, every step has its own model picker, attached step context is included when a schedule runs, and saved schedules can be edited in the same builder instead of removed/recreated.
- Verification: `pnpm typecheck --pretty false`; `pnpm eslint src/app/page.tsx` (0 errors, existing warnings only); `git diff --check -- src/app/page.tsx src/app/fleet.module.css CHANGELOG.md`; Playwright smoke on `http://localhost:5020` verified step mode, per-step attachment menu, 147 skill choices, model menu, edit affordance, no console errors, and no horizontal overflow.
- Intended commit message: `Match HivemindOS scheduler builder`

## 2026-05-21 17:02 WITA - Replace Work View With Dispatch Board

- Status: Pushed
- Areas changed: Work board view, Kanban board styling, changelog
- Summary: Replace the existing Work/Kanban view with the dark Hivemind Dispatch board from `/Users/liam/Downloads/Work board-3.html`, including the honey/teal/pink stat coloring, status-tinted lane gradients, fixed-width scrolling lanes, conditional yellow board-scroll FABs, per-card left/right move controls, selected-task Comment/Link/Reassign action rail, drawer move controls, and existing board storage, filters, drag/drop, quick-add composer, chat, notes, events, and stale-worker controls.
- Verification: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint src/app/page.tsx` (0 errors, existing warnings only); `git diff --check -- src/app/page.tsx src/app/kanban-board.module.css CHANGELOG.md`; Playwright smoke at `http://localhost:5020` confirmed honey italic hero text, status-tinted lane gradients, gold drawer styling, right scroll FAB visible at the left edge, left scroll FAB hidden until horizontal scroll, and no document-level horizontal overflow.
- Intended commit message: `Replace work view with dispatch board`

## 2026-05-21 16:41 WITA - Replace Sidebar With Work Board Header

- Status: Pushed
- Areas changed: Dashboard shell, top navigation header, global dashboard styling, changelog
- Summary: Replace the left dashboard sidebar with the compact Work Board header strip copied from `/Users/liam/Downloads/Work board.html`, including the dispatch brand block, centered brain sync line, and right-aligned top navigation.
- Verification: `pnpm typecheck --pretty false`; `pnpm eslint src/app/page.tsx src/app/globals.css` (passes with existing warnings); `git diff --check -- src/app/page.tsx src/app/globals.css`; in-app browser geometry/text check at `http://localhost:5020`.
- Intended commit message: `Replace sidebar with work board header`

## 2026-05-21 16:09 WITA - Version Bee Role Icon Assets

- Status: Pushed
- Areas changed: Bee role icon asset paths, fleet role icon references, dashboard role icon references, changelog
- Summary: Copy the regenerated worker and queen bee icons to versioned `*-v2.png` filenames and update app references so Next/Image and browser caches fetch the new artwork instead of stale same-path assets.
- Verification: `pnpm typecheck`; `pnpm lint`; `git diff --check`.
- Intended commit message: `Version bee role icon assets`

## 2026-05-21 16:04 WITA - Regenerate Distinct Bee Role Icons

- Status: Pushed
- Areas changed: Bee role icons, fleet bee icon sizing, agent cell avatars, changelog
- Summary: Regenerate the worker and queen bee icons as simpler, more distinct 256px transparent PNG assets, enlarge their render sizes across fleet hive/list/roster/footer surfaces, and make standard agent cells use the larger role avatar size.
- Verification: `pnpm typecheck`; `pnpm lint`; `git diff --check`; inspected regenerated worker and queen icons at original size with transparent corners.
- Intended commit message: `Regenerate distinct bee role icons`

## 2026-05-21 16:03 WITA - Center Fleet Machine Hive Icon

- Status: Pushed
- Areas changed: Fleet hive machine cell alignment, changelog
- Summary: Center the monitor-shaped computer icon in machine hive cells by giving the icon a fixed centered flex box and removing the extra machine-cell padding that nudged the visual off the hex center.
- Verification: `pnpm eslint src/components/fleet/machine-cluster.tsx`; `git diff --check -- src/components/fleet/machine-cluster.tsx CHANGELOG.md`; Playwright geometry check on `http://localhost:5020` confirmed the `This Mac` monitor icon center is aligned with the hive cell center.
- Intended commit message: `Center fleet machine hive icon`

## 2026-05-21 16:02 WITA - Add Bankr Honey Treasury

- Status: Pushed
- Areas changed: Wallet provider config, server-side Honey/HIVE reward ledger, chat usage crediting, Wallets tab reward UI, Bankr LLM payment prompt, assimilation manifest
- Summary: Add a server-backed reward ledger where completed agent chat work credits Honey from server-observed token usage, available Honey can be exchanged for HIVE through the ledger API, and the Wallets view shows a compact spoof-resistant Hive ledger without manual reward inputs.
- Verification: `pnpm typecheck`; `pnpm lint` (passes with existing warnings); `git diff --check`; `verify_assimilation_manifest.py`; browser check confirmed the compact Hive ledger reads from the server ledger; `GET /api/honey-ledger` and `POST /api/honey-ledger` return server ledger state.
- Intended commit message: `Add Honey to HIVE rewards`

## 2026-05-21 15:52 WITA - Use Real Fleet Alert Headline

- Status: Pushed
- Areas changed: Fleet masthead alerts, fleet headline card, machine hive cell icon alignment, changelog
- Summary: Replace the placeholder OpenClaw-x headline with unread high/urgent notification alerts when present, include high-priority alerts in the urgent stat, and center the enlarged machine monitor icon inside hive cells.
- Verification: `pnpm typecheck`; `pnpm lint`; `git diff --check`.
- Intended commit message: `Use real fleet alert headline`

## 2026-05-21 15:48 WITA - Enlarge Machine Computer Cells

- Status: Pushed
- Areas changed: Fleet hive machine cells, changelog
- Summary: Replace the compact machine glyph inside hive cells with a larger monitor-shaped icon that fills the hex and renders the machine name directly on the computer screen.
- Verification: `pnpm typecheck`; `pnpm lint`; `git diff --check`.
- Intended commit message: `Enlarge machine computer cells`

## 2026-05-21 15:45 WITA - Restore Fleet Hive Cell Clicks

- Status: Pushed
- Areas changed: Fleet graph panning, hive cell interaction, changelog
- Summary: Prevent the graph pan layer from capturing pointer gestures that start on machine, agent, or add-agent hive cells so selecting cells and adding agents work again while empty-canvas drag-to-pan remains available.
- Verification: `pnpm typecheck`; `pnpm lint`; `git diff --check`.
- Intended commit message: `Restore fleet hive cell clicks`

## 2026-05-21 15:42 WITA - Reorder Fleet Masthead Metrics

- Status: Pushed
- Areas changed: Fleet masthead metrics, changelog
- Summary: Reorder the fleet summary stats to show machines, agents, working, and urgent.
- Verification: `pnpm typecheck`; `pnpm lint`; `git diff --check`.
- Intended commit message: `Reorder fleet masthead metrics`

## 2026-05-21 15:41 WITA - Refine Fleet Roster Icons And Rows

- Status: Pushed
- Areas changed: Fleet roster, changelog
- Summary: Replace the roster machine initial tile with a computer icon, expand the open agent rows across the machine card width, and use each agent's bee role icon in place of the status dot with disabled/offline states visually dimmed.
- Verification: `pnpm typecheck`; `pnpm lint`; `git diff --check`.
- Intended commit message: `Refine fleet roster icons and rows`

## 2026-05-21 15:37 WITA - Enlarge Fleet Graph Stage And Add Bounded Pan

- Status: Pushed
- Areas changed: Fleet constellation layout, graph viewport, fleet styling, changelog
- Summary: Slim the roster and dispatch rails, make the center graph/map/list stage a dominant square viewport, recenter machine clusters in the visible graph, and add drag-to-pan with bounds derived from the machine and agent cell extents plus padding.
- Verification: `pnpm typecheck`; `pnpm lint`; Playwright geometry check confirmed a square 646px graph frame with side rails at 240px and 260px; seeded four-machine Playwright check confirmed the cached fleet shows 4 machines and graph dragging changes the canvas position within bounds.
- Intended commit message: `Enlarge fleet graph stage and add bounded pan`

## 2026-05-21 15:29 WITA - Preserve Fleet Machines And Correct Icons

- Status: Pushed
- Areas changed: Fleet discovery merge, Tailscale device fallback, fleet data cache, constellation/list/map/footer icons, changelog
- Summary: Preserve last-known discovered machines when Tailscale discovery temporarily falls back to local-only mode, cache discovered machines locally, return the local device from the Tailscale API on CLI parse failure, render machine cells with computer icons, and render queen agents with the queen bee icon.
- Verification: `pnpm typecheck`; `pnpm lint`.
- Intended commit message: `Preserve fleet machines and correct icons`

## 2026-05-21 15:23 WITA - Add Compact Sidebar Tooltips

- Status: Pushed
- Areas changed: Left navigation sidebar, changelog
- Summary: Use the shared tooltip component for compact sidebar icons, including view navigation, compact/expand, theme, and Tailnet status controls, while keeping tooltips disabled in expanded mode.
- Verification: `pnpm typecheck`; `pnpm lint`; Playwright hover check confirmed compact mode shows shared tooltip content for the Fleet icon.
- Intended commit message: `Add compact sidebar tooltips`

## 2026-05-21 15:17 WITA - Add Compact Sidebar Mode

- Status: Pushed
- Areas changed: Dashboard shell, left navigation sidebar, global dashboard styling, changelog
- Summary: Add a persisted compact mode for the left navigation sidebar so the dashboard can reclaim horizontal workspace while keeping icon navigation, theme toggle, and Tailnet status available.
- Verification: `pnpm typecheck`; `pnpm lint`; Playwright layout check confirmed sidebar width changes from 280px to 88px and main workspace grows from 958px to 1150px at 1280px viewport.
- Intended commit message: `Add compact sidebar mode`

## 2026-05-21 15:10 WITA - Replace Fleet View With Swarm Constellation

- Status: Pushed
- Areas changed: Fleet dashboard view, fleet component set, fleet styling, assimilation manifest
- Summary: Replace the rendered Fleet/Agents machine board with the downloaded `nextjs-fleet` swarm constellation interface, adapt it to live machine, agent, task, wallet, and alert data, and keep the existing chat, wallet, settings, duplicate, remove, and add-agent actions wired through the new UI.
- Verification: `pnpm typecheck`; `pnpm lint` (passes with existing warnings); in-app browser render check at `http://localhost:5020`.
- Intended commit message: `Replace fleet view with swarm constellation`

## 2026-05-21 14:28 WITA - Refine README Logo Wordmark

- Status: Pushed
- Areas changed: README logo image
- Summary: Re-render the `HivemindOS` wordmark in the README logo with a sharper DIN-based display treatment while leaving the README hero and sharing-model images unchanged.
- Verification: Visual inspection of `public/hivemindos-logo.png`; PNG metadata check; `git diff --check`.
- Intended commit message: `Refine README logo wordmark`

## 2026-05-21 02:58 WITA - Audit HivemindOS Vault References

- Status: Pushed
- Areas changed: Project agent instructions, Codex global agent instructions, Obsidian active vault metadata, renamed backup vault metadata, ambient suggestion cache, changelog
- Summary: Remove stale references to the old shared vault path and old shared-skill block from active agent instructions and Obsidian metadata, add explicit HivemindOS shared vault paths to the project rules, and distinguish active config cleanup from historical Codex session transcripts.
- Verification: Scoped scans over the repo, Obsidian vaults, `/Users/liam/.codex/AGENTS.md`, and Codex ambient suggestions found no remaining old shared-vault/project-name references; confirmed `/Users/liam/.codex/AGENTS.md`, project `AGENTS.md`, and the active vault `AGENTS.md` point to `/Users/liam/Documents/Obsidian/hivemindos-vault`; `git diff --check -- AGENTS.md CHANGELOG.md ROADMAP.md`.
- Intended commit message: `Audit HivemindOS vault references`

## 2026-05-21 02:49 WITA - Refresh HivemindOS Roadmap

- Status: Pushed
- Areas changed: Roadmap, changelog
- Summary: Rewrite the stale roadmap around the current HivemindOS surface, move shipped Aeon, MiroShark, Brain sync, Work board, Scheduler, env sync, wallet, Remotion, and repo-rename work into Current Surface, and restate near-term work around onboarding, migration, collector hardening, runtime depth, shared Brain, security, and productization.
- Verification: Old project-name scan over `ROADMAP.md` and `CHANGELOG.md`; `git diff --check -- ROADMAP.md CHANGELOG.md`.
- Intended commit message: `Refresh HivemindOS roadmap`

## 2026-05-21 02:14 WITA - Regenerate README HivemindOS Images

- Status: Pushed
- Areas changed: README logo image, README hero image, README sharing-model image
- Summary: Refresh the README media so the embedded visual branding says `HivemindOS`, replacing the stale legacy title treatment in the logo and hero and aligning the sharing diagram's central brain label.
- Verification: Visual inspection of `public/hivemindos-logo.png`, `public/readme/hivemindos-hero.png`, and `public/readme/hivemind-sharing-model.png`; OCR scan of all three README images found no remaining legacy brand text.
- Intended commit message: `Regenerate README HivemindOS images`

## 2026-05-21 02:35 WITA - Rename Project To HivemindOS

- Status: Pushed
- Areas changed: App branding, package/storage slugs, setup scripts, README/docs, generated media paths, shared Obsidian brain vault and project folders
- Summary: Rename the project from legacy Hivemind branding to HivemindOS across active app surfaces, defaults, local storage keys, generated asset paths, helper scripts, GitHub repository name, and shared brain folder names while preserving migration compatibility for existing local browser/vault data.
- Verification: Renamed GitHub repository to `LiamVisionary/hivemindos` and updated local `origin`; moved the shared brain to `/Users/liam/Documents/Obsidian/hivemindos-vault` and its project folder to `Projects/HivemindOS`; repo and vault scans for old project names returned no matches; `node --check scripts/capture-remotion-showcase.mjs`; `node --check scripts/agent-telemetry-collector.mjs`; `bash -n scripts/install-telemetry-collector.sh`; `bash -n scripts/seed-shared-skills.sh`; `python3 -m py_compile scripts/hive-env-add`; `pnpm typecheck --pretty false`; `pnpm eslint src/app/page.tsx src/app/layout.tsx src/lib/types/agent-runtime.ts src/lib/services/obsidian/vault-path.ts scripts/capture-remotion-showcase.mjs scripts/agent-telemetry-collector.mjs`; `pnpm test:kanban`; `pnpm test:dashboard-nav`; `git diff --check`.
- Intended commit message: `Rename project to HivemindOS`

## 2026-05-21 02:16 WITA - Sanitize Public Commit Details

- Status: Pushed
- Areas changed: Remotion showcase fixture data, generated media ignores, changelog verification notes
- Summary: Tighten generated Remotion media ignores so rendered videos stay out of Git, and replace local machine names, private Tailnet-style IPs, and absolute personal vault paths in demo fixtures and changelog verification notes with sample-safe values.
- Verification: Sensitive-pattern scan for personal paths, private Tailnet-style IPs, real local machine names, and common token prefixes; `node --check scripts/capture-remotion-showcase.mjs`; `git diff --check`; `pnpm typecheck --pretty false`; `pnpm eslint src/app/page.tsx scripts/capture-remotion-showcase.mjs src/lib/services/runtime-adapters/aeon.ts src/lib/services/obsidian/brain-skills.ts src/lib/services/kanban/local-kanban-store.ts`; `pnpm test:kanban`.
- Intended commit message: `Publish hivemind dashboard updates`

## 2026-05-21 02:05 WITA - Remove Duplicate Chat Navigation Tab

- Status: Pushed
- Areas changed: Dashboard navigation tabs, dashboard nav regression script, changelog
- Summary: Remove the leftover temporary `New` tab state and nav entry, keep a single Chat tab in the dashboard sidebar, and update the nav regression script to reject duplicate navigation ids.
- Verification: `node scripts/test-dashboard-nav.mjs`; `pnpm eslint src/app/page.tsx scripts/test-dashboard-nav.mjs`.
- Intended commit message: `Remove duplicate chat navigation tab`

## 2026-05-21 01:58 WITA - Show Fleet Agent Role Badges

- Status: Pushed
- Areas changed: Fleet agent rows, agent settings header, changelog
- Summary: Show each fleet agent's Bee role as a compact badge beside its name in the fleet list and settings header, while allowing the settings name to wrap instead of being silently truncated.
- Verification: `pnpm eslint src/app/page.tsx src/components/cells/AgentCell.tsx`; `pnpm typecheck --pretty false`; `git diff --check -- src/components/cells/AgentCell.tsx src/app/page.tsx src/app/fleet.module.css CHANGELOG.md`.
- Intended commit message: `Show fleet agent role badges`

## 2026-05-21 01:52 WITA - Add Test New Navigation Tab

- Status: Pushed
- Areas changed: Dashboard navigation tabs, changelog
- Summary: Add a temporary `New` tab to the dashboard sidebar navigation as a test.
- Verification: Pending.
- Intended commit message: `Add test new navigation tab`

## 2026-05-21 01:48 WITA - Add Kanban Task Edit And Delete Actions

- Status: Pushed
- Areas changed: Work board task context menu, Kanban edit modal, Kanban API, Kanban storage, changelog
- Summary: Add Delete task to the Kanban task context menu, remove deleted tasks with their notes and links, and add an Edit & interrupt action that updates the task and immediately resends the revised instruction to the currently assigned agent instead of spawning a new worker.
- Verification: `pnpm eslint src/app/page.tsx src/app/api/kanban/route.ts src/lib/services/kanban/local-kanban-store.ts`; `pnpm typecheck --pretty false`; `git diff --check -- src/app/page.tsx src/app/api/kanban/route.ts src/lib/services/kanban/local-kanban-store.ts src/app/kanban-board.module.css CHANGELOG.md`; Browser smoke on `http://localhost:5020` verified task menus show Edit & interrupt and Delete task, and the edit modal opens with title/body fields and same-agent interrupt copy.
- Intended commit message: `Add Kanban task edit and delete actions`

## 2026-05-21 01:52 WITA - Add Test New Navigation Tab

- Status: Pushed
- Areas changed: Dashboard navigation tabs, dashboard nav regression script, changelog
- Summary: Add a temporary `New` navigation tab to the dashboard as a test.
- Verification: Pending.
- Intended commit message: `Add test new navigation tab`

## 2026-05-21 01:38 WITA - Reuse Composer In Kanban Agent Chat

- Status: Pushed
- Areas changed: Work board agent chat modal, shared composer wiring, Kanban chat styling, changelog
- Summary: Replace the bespoke Kanban agent chat input with the shared chat composer so steering messages support voice transcription, image/file attachments, and linked directories, remove the standalone Send text button, and add a subtle Send to status picker that excludes Needs Human.
- Verification: `pnpm typecheck --pretty false`; `git diff --check -- src/app/page.tsx src/app/kanban-board.module.css CHANGELOG.md`; Playwright smoke on `http://localhost:5020` opened Work > agent chat, clicked `Send to Working`, confirmed the menu opens with Ideas, Waiting for Queen, Working, and Done, and confirmed Needs Human is not offered. `pnpm eslint src/app/page.tsx ...` is currently blocked by unrelated existing `kanban-edit-*` purity errors around `Date.now()`/mutable `fullText`.
- Intended commit message: `Reuse composer in kanban agent chat`

## 2026-05-21 01:34 WITA - Polish Task Events Modal

- Status: Pushed
- Areas changed: Work board task events modal, Kanban event styles, changelog
- Summary: Replace raw event kind IDs like `task.updated` and `comment.created` with readable labels, and render event activity as spaced rows with label/time metadata above the message.
- Verification: `pnpm eslint src/app/page.tsx src/components/cells/CellMenu.tsx`; `pnpm typecheck --pretty false`; `git diff --check -- src/app/page.tsx src/app/kanban-board.module.css CHANGELOG.md`; Browser smoke on `http://localhost:5020` verified Task events shows friendly labels and proper spacing between event label, message, and timestamp.
- Intended commit message: `Polish task events modal`

## 2026-05-21 01:31 WITA - Add Default Queen Bee Profiles

- Status: Pushed
- Areas changed: Fleet discovery, agent dedupe, Queen Bee role defaults, changelog
- Summary: Add a default Queen Bee profile for each collector-ready machine when no Queen Bee is already configured, backing it with the machine's preferred runtime in Hermes-first order, and keep role-scoped agent profiles from being deduped into their underlying worker runtime.
- Verification: `pnpm eslint src/app/api/fleet/discover/route.ts src/lib/services/orchestration/bee-roles.ts src/app/page.tsx`; `pnpm typecheck --pretty false`; `pnpm test:kanban`; `git diff --check -- src/app/api/fleet/discover/route.ts src/lib/services/orchestration/bee-roles.ts src/app/page.tsx CHANGELOG.md`; `/api/fleet/discover` smoke showed default Hermes-backed Queen Bee profiles on the local Mac and `lab-linux-1`; `/api/orchestrator` smoke selected the Queen Bee for the ready test card.
- Intended commit message: `Add default queen bee profiles`

## 2026-05-21 01:28 WITA - Remove Fleet Test Hello

- Status: Pushed
- Areas changed: Fleet page, changelog
- Summary: Remove the temporary `test hello` line from the top of the Fleet view.
- Verification: Pending.
- Intended commit message: `Remove fleet test hello`

## 2026-05-21 01:28 WITA - Fix Add Agent Security Cards

- Status: Pushed
- Areas changed: Add agent settings modal security panel, Fleet styles, changelog
- Summary: Reflow the add-agent security cards so icon, heading, and body text stay inside their cards across narrow modal widths, and clarify that Prompt guard blocks obvious prompt-injection or dangerous local-action requests locally.
- Verification: `pnpm eslint src/app/page.tsx`; `git diff --check -- src/app/fleet.module.css CHANGELOG.md`; Browser smoke on `http://localhost:5020` opened Fleet > This Mac actions > Add agent > Security and verified all security-card child bounds stay inside their cards.
- Intended commit message: `Fix add agent security cards`

## 2026-05-21 01:23 WITA - Let Ready Tasks Fall Back To Workers

- Status: Pushed
- Areas changed: Queen/worker assignment routing, Work board ready pickup, changelog
- Summary: Make the Ready for Queen lane keep using a real Queen Bee when one is online, but fall back to the best available worker when no Queen Bee profile exists so moved cards do not sit idle without delegation.
- Verification: `pnpm eslint src/app/api/fleet/discover/route.ts src/lib/services/orchestration/bee-roles.ts src/app/page.tsx`; `pnpm typecheck --pretty false`; `pnpm test:kanban`; `git diff --check -- src/app/api/fleet/discover/route.ts src/lib/services/orchestration/bee-roles.ts src/app/page.tsx CHANGELOG.md`; `/api/orchestrator` smoke with only a worker agent returned `mode: "worker"` instead of pending.
- Intended commit message: `Let ready tasks fall back to workers`

## 2026-05-21 01:14 WITA - Detect Kanban Tool Output Stalls

- Status: Pushed
- Areas changed: Work board Hermes session polling, Kanban stale-state handling, changelog
- Summary: Stop treating Hermes tool output as a completed assistant response, detect Working cards whose latest pollable session message is terminal/tool output with no final assistant reply, and move those stalled cards to Needs You with a clear explanation instead of leaving them silently Working.
- Verification: `pnpm eslint src/app/page.tsx`; `pnpm typecheck --pretty false`; `git diff --check -- src/app/page.tsx CHANGELOG.md`; confirmed live Kanban task `t_mpdz5min_vtn8v` moved from Working to Needs You after its Hermes session stopped on terminal/tool output without a final assistant response.
- Intended commit message: `Detect kanban tool output stalls`

## 2026-05-21 01:12 WITA - Keep Queen Lane Queen-Owned

- Status: Pushed
- Areas changed: Work board Queen Bee assignment routing, live Kanban task state, changelog
- Summary: Stop cards moved to Waiting for Queen from being auto-claimed by a worker when no Queen Bee is available, make Queen Bee routing prefer the actual queen profile, replace the confusing fallback note with Queen Bee review/delegation copy, and return the affected test card to Waiting for Queen.
- Verification: `pnpm eslint src/lib/services/orchestration/bee-roles.ts src/app/page.tsx`; `pnpm typecheck --pretty false`; `git diff --check -- src/lib/services/orchestration/bee-roles.ts src/app/page.tsx CHANGELOG.md`; `/api/orchestrator` smoke verified worker-only assignments stay pending and queen-plus-worker assignments choose the Queen Bee; patched task `t_mpebcduf_obrj4` back to `ready` and confirmed it stayed unassigned after a delay.
- Intended commit message: `Keep queen lane queen-owned`

## 2026-05-21 01:01 WITA - Clamp Kanban Card Previews

- Status: Pushed
- Areas changed: Work board task card previews, Kanban card markdown styles, changelog
- Summary: Prevent Work board cards from expanding into full agent/tool dumps by using a compact card message summary for long results, clamping previews by default, rendering shell-like output in a bounded terminal-style panel, bounding expanded card text inside a scroll area, and giving card markdown headings card-sized typography.
- Verification: `pnpm eslint src/app/page.tsx`; `git diff --check -- src/app/page.tsx src/app/kanban-board.module.css CHANGELOG.md`; Playwright mobile-width smoke on `http://localhost:5020` confirmed long agent/tool output cards render as compact summaries and shell output renders in a bounded rounded terminal panel.
- Intended commit message: `Clamp kanban card previews`

## 2026-05-21 00:54 WITA - Sync Aeon Env Secrets

- Status: Pushed
- Areas changed: Aeon runtime adapter, generic runtime env sync API, Aeon settings UI, hive-env-add, changelog
- Summary: Add an explicit selected-key bridge from local HivemindOS/Aeon env stores to Aeon GitHub Actions secrets, expose it through `/api/runtimes/aeon/env/sync`, add an Aeon settings control for syncing selected keys to the configured Aeon repo, and teach `hive-env-add --runtime aeon` to optionally push the same key to GitHub secrets with `--sync-aeon-github-secret`.
- Verification: `pnpm typecheck --pretty false`; `pnpm eslint src/app/page.tsx 'src/app/api/runtimes/[runtime]/env/sync/route.ts' src/lib/services/runtime-adapters/aeon.ts src/lib/services/runtime-adapters/types.ts scripts/hive-env-add` (script ignored by eslint config); `python3 -m py_compile scripts/hive-env-add`; `git diff --check -- CHANGELOG.md src/app/page.tsx 'src/app/api/runtimes/[runtime]/env/sync/route.ts' src/lib/services/runtime-adapters/aeon.ts src/lib/services/runtime-adapters/types.ts src/lib/services/runtime-adapters/registry.ts scripts/hive-env-add`; real fork-backed API smoke wrote fake `HIVEMINDOS_AEON_E2E_SECRET` from `/tmp/hivemindos-aeon-fork-e2e/.env` to `LiamVisionary/aeon` with `/api/runtimes/aeon/env/sync`, verified it with `gh secret list`, then deleted the temporary secret and removed the temp `.env`.
- Intended commit message: `Sync Aeon env secrets`

## 2026-05-21 00:52 WITA - Reuse Composer For Quick Add

- Status: Pushed
- Areas changed: Work board quick-add composer, shared chat composer UI, chat composer styles, changelog
- Summary: Extract the chat input into a reusable composer with compact mode, replace the quick-add Cancel/Add text buttons with icon controls, and add quick-add attachment actions for images, files, directory picker links, and microphone dictation.
- Verification: `pnpm eslint src/app/page.tsx src/components/cells/CellMenu.tsx`; `pnpm typecheck --pretty false`; `git diff --check -- src/app/page.tsx src/app/chat.module.css src/app/kanban-board.module.css src/components/cells/CellMenu.tsx CHANGELOG.md`; Browser smoke on `http://localhost:5030` verified the compact quick-add composer renders correctly and its attachment menu exposes Images, Files, and Directory.
- Intended commit message: `Reuse composer for quick add`

## 2026-05-21 00:47 WITA - Refine Work Card Hierarchy

- Status: Pushed
- Areas changed: Work board task cards, changelog
- Summary: Put the task title back at the top of each card, keep only action icons in the header, move time into a quiet footer, reduce the title scale, and separate preview copy from the headline so cards scan better on narrow columns.
- Verification: `pnpm eslint src/app/page.tsx src/components/cells/CellMenu.tsx`; `pnpm typecheck --pretty false`; `git diff --check -- src/app/page.tsx src/app/kanban-board.module.css src/app/chat.module.css src/components/cells/CellMenu.tsx CHANGELOG.md`; Browser smoke on `http://localhost:5020` verified the Work card title is first, actions stay as a compact top-right cluster, time is in the footer, and the utility row no longer creates blank space.
- Intended commit message: `Refine work card hierarchy`

## 2026-05-21 00:39 WITA - Add Fleet Test Hello

- Status: Pushed
- Areas changed: Fleet page, changelog
- Summary: Add a visible `test hello` line at the top of the Fleet page.
- Verification: Confirmed `test hello` renders before the Fleet header in `src/app/page.tsx`; `pnpm eslint src/app/page.tsx`; `pnpm typecheck --pretty false`; `git diff --check -- src/app/page.tsx CHANGELOG.md`.
- Intended commit message: `Add fleet test hello`

## 2026-05-21 00:28 WITA - Fix Kanban Worker Pickup

- Status: Pushed
- Areas changed: Work board agent discovery normalization, Kanban assigned-agent matching, runtime chat working-directory context, collector session discovery, live Kanban task state, changelog
- Summary: Normalize collector-discovered agents so Hermes agents without saved role metadata are treated as general worker bees, match legacy `Hermes on This Mac` assignees to the discovered local Mac agent, inject the dashboard repo path into Hermes chat as a system context for Kanban dispatch/steering, give the collector more time to attach a Hermes API session before long work streams output, and diagnose the stuck Work card path from board state through fleet discovery and Hermes chat reachability.
- Verification: Confirmed the stuck card had no `agentSession`, direct Hermes collector chat and dashboard `/api/chat/agent-runtime` both respond, discovered local Hermes now normalizes to a worker, `localhost:5020` hydrates and dispatches while `127.0.0.1` is blocked by Next dev-origin HMR, Hermes now receives the dashboard repo as its working directory, restarted the local collector with the longer session-discovery window, moved the affected card to `Needs You` with the diagnostic note, `pnpm eslint src/app/page.tsx src/app/api/chat/agent-runtime/route.ts scripts/agent-telemetry-collector.mjs src/lib/services/kanban/local-kanban-store.ts src/lib/types/kanban.ts`; `pnpm test:kanban`; `pnpm typecheck --pretty false`; `git diff --check -- src/app/page.tsx src/app/api/chat/agent-runtime/route.ts scripts/agent-telemetry-collector.mjs src/lib/services/kanban/local-kanban-store.ts src/lib/types/kanban.ts CHANGELOG.md`.
- Intended commit message: `Fix Kanban worker pickup`

## 2026-05-21 00:31 WITA - Compact Kanban Task Actions

- Status: Pushed
- Areas changed: Work board task cards, selected-task drawer, shared cell context menu, Kanban modal styling, changelog
- Summary: Replace the busy task detail drawer controls with a vertical-ellipsis context menu, move status changes into an expandable Move to menu, add task-level chat buttons, and move chat, notes, assignment, and events into focused modals while removing the inline result field and agent stream from the drawer.
- Verification: `pnpm eslint src/app/page.tsx src/components/cells/CellMenu.tsx`; `pnpm typecheck --pretty false`; `git diff --check -- src/app/page.tsx src/app/kanban-board.module.css src/components/cells/CellMenu.tsx CHANGELOG.md`; Browser smoke on `http://localhost:5020` verified the Work board renders with title/time first, compact icon action row, simplified card body, and task detail modal actions.
- Intended commit message: `Compact Kanban task actions`

## 2026-05-21 00:12 WITA - Verify Aeon Real E2E

- Status: Pushed
- Areas changed: Aeon runtime adapter parser, changelog
- Summary: Clone the real `aaronjmars/aeon` repository and run the dashboard's Aeon runtime endpoints against its actual `aeon.yml`, `skills.json`, skills, workflows, and GitHub Actions API, fixing the inline `aeon.yml` parser so schedules with trailing comments are discovered.
- Verification: Cloned `https://github.com/aaronjmars/aeon.git` fresh to `/tmp/hivemindos-aeon-e2e` at `b77b201`; ran `/api/runtimes/aeon/status`, `/skills`, `/schedules`, `/runs`, and `/outputs` against the real clone; verified real `aeon.yml` schedule discovery returns 121 skills after parser fixes; synced the real shared Brain shelf into the real Aeon clone through `/api/runtimes/aeon/skills/sync`, writing 146 managed shared skills and skipping one unmanaged slug collision; verified `skills.json` contains 267 total skills with 146 shared-brain entries; ran `/api/scheduler/import` against the real Aeon agent and got 121 schedules; exercised real enable/disable actions on `heartbeat` in the clone's `aeon.yml` and restored it to enabled; created fork `LiamVisionary/aeon`, pushed empty commit `d0f7c3a` to register workflows, dispatched real `heartbeat` run through `/api/scheduler/runtime-action` against the fork, verified GitHub run `26176176117` exists at `https://github.com/LiamVisionary/aeon/actions/runs/26176176117`, and verified `/api/runtimes/aeon/runs` returns that queued run; built and ran Aeon's real A2A server on port `41241`, verified its live agent card exposes 267 skills, and verified A2A-only adapter status/skill discovery; `pnpm typecheck --pretty false`; `pnpm eslint src/lib/services/runtime-adapters/aeon.ts`; `git diff --check -- src/lib/services/runtime-adapters/aeon.ts CHANGELOG.md`.
- Intended commit message: `Verify Aeon real e2e`

## 2026-05-21 00:10 WITA - Ban Silent UI Truncation

- Status: Pushed
- Areas changed: Project UI rules, Work board lane/card text wrapping, changelog
- Summary: Add a project rule against silent user-facing text truncation unless an explicit expand affordance exists, remove Work board lane-description clamping, and let Work board assignee/agent labels wrap instead of ellipsizing.
- Verification: `pnpm eslint src/app/page.tsx`; `git diff --check -- AGENTS.md src/app/kanban-board.module.css CHANGELOG.md`; searched Work board styles for remaining clamp/ellipsis rules and confirmed only timestamp/button no-wrap plus the expand-chevron task-body preview clamp remain.
- Intended commit message: `Ban silent UI truncation`

## 2026-05-21 00:05 WITA - Remove Redundant Kanban Card Badges

- Status: Pushed
- Areas changed: Work board task card status badges, changelog
- Summary: Remove normal per-card status badges because the Kanban lane already communicates the card state, while keeping exceptional quiet/stale signals.
- Verification: `pnpm eslint src/app/page.tsx`; `pnpm typecheck --pretty false`; `git diff --check -- src/app/page.tsx CHANGELOG.md`.
- Intended commit message: `Remove redundant Kanban card badges`

## 2026-05-21 00:02 WITA - Remove Redundant Working Card Copy

- Status: Pushed
- Areas changed: Work board task card footer, changelog
- Summary: Remove the repeated “agent is working” footer text from Working cards because the card already shows Working in the top-right status area.
- Verification: `pnpm eslint src/app/page.tsx`; `pnpm typecheck --pretty false`; `git diff --check -- src/app/page.tsx CHANGELOG.md`.
- Intended commit message: `Remove redundant Working card copy`

## 2026-05-20 23:58 WITA - Block Unpollable Working Cards

- Status: Pushed
- Areas changed: Kanban task state guard, shared board state, changelog
- Summary: Move the stuck Hermes task out of Working, surface the Codex sign-in blocker, prevent accepted/no-output failures from being left in Working, and clear old blocker text when a card is manually retried.
- Verification: Cleared the stale blocker result from live card `t_mpdz5min_vtn8v` while preserving its Working retry state; `pnpm eslint src/lib/services/kanban/local-kanban-store.ts`; `pnpm test:kanban`; `pnpm typecheck --pretty false`; `git diff --check -- src/lib/services/kanban/local-kanban-store.ts CHANGELOG.md`.
- Intended commit message: `Block unpollable Working cards`

## 2026-05-20 23:56 WITA - Sync Brain Skills To Aeon

- Status: Pushed
- Areas changed: Brain skill service, Aeon runtime adapter, generic runtime skill sync API, Brain shared-skills UI, shared-skill setup script, changelog
- Summary: Make the shared Brain `Skills/` shelf a first-class Aeon skill source, merge shared skills into Aeon runtime skill discovery, add a runtime skill sync endpoint that mirrors managed shared skills into Aeon's local `skills/` folder and `skills.json`, expose a Brain UI action to sync shared skills to Aeon, include Aeon in the page-local provider inventory, and teach setup's shared-skill seed script to sync the shared shelf into Aeon when Aeon is a share target.
- Verification: `pnpm typecheck --pretty false`; `pnpm eslint src/app/page.tsx src/app/api/obsidian/skills/route.ts 'src/app/api/runtimes/[runtime]/skills/route.ts' 'src/app/api/runtimes/[runtime]/skills/sync/route.ts' src/lib/services/runtime-adapters/aeon.ts src/lib/services/runtime-adapters/types.ts src/lib/services/obsidian/brain-skills.ts`; `bash -n scripts/seed-shared-skills.sh`; `git diff --check -- CHANGELOG.md src/app/page.tsx src/app/api/runtimes src/lib/services/runtime-adapters src/lib/services/obsidian/brain-skills.ts scripts/seed-shared-skills.sh`; API smoke with temporary vault/Aeon root verified `/api/runtimes/aeon/skills` reads shared Brain skills with `aeon.yml` config and `/api/runtimes/aeon/skills/sync` writes Aeon `skills/<slug>/SKILL.md` plus `skills.json`; Playwright smoke on `http://127.0.0.1:5020` verified the dashboard renders without app console errors.
- Intended commit message: `Sync brain skills to Aeon`

## 2026-05-20 23:52 WITA - Rewrite Launch README

- Status: Pushed
- Areas changed: README positioning, README generated images, quick start, feature table, Tailscale/Syncthing/env-sync explanation, changelog
- Summary: Reframe the README around HivemindOS as a virtual private network and private control room for agents, keep Bankr as a launch badge only, simplify cross-machine/Tailscale language, elevate shared env sync, clarify that env sync uses Tailscale SSH while shared brain sync uses Syncthing over Tailscale, and add generated README visuals for the cyber-bee agent network plus the hub-and-spoke sharing model.
- Verification: `git diff --check -- README.md CHANGELOG.md`; verified README-referenced local files exist; searched README for stale Bankr-as-product and private-fleet/collector-backed phrasing.
- Intended commit message: `Rewrite launch README`

## 2026-05-20 23:18 WITA - Add Remotion Showcase Project

- Status: Pushed
- Areas changed: Remotion dependencies, Remotion composition, Playwright showcase capture script, generated media ignores, package scripts, dashboard render guard, changelog, assimilation manifest
- Summary: Install Remotion, add a `HivemindShowcase` video project that renders the actual dashboard UI from a Playwright-recorded walkthrough, add a capture script that seeds simulated Fleet, Work, Scheduler, X-thread Swarm comments, wallet, alert, and Hermes chat state while letting the Brain tab load the live Obsidian graph, force the headless-captured shell visible so the recording is not just the background, use `REMOTION_APP_URL` to capture against an already-running app without starting or stopping dev servers, stage the Chat sequence as user message, loading state, then delayed Hermes response, click Brain cells to show golden path tracing, trim the composition to the captured walkthrough length, and fix the render-time Aeon skill sync callback reference that blocked the dashboard before `displayAgents` was initialized.
- Verification: `node --check scripts/capture-remotion-showcase.mjs`; `REMOTION_APP_URL=http://localhost:5020 pnpm remotion:capture`; inspected captured source frames for Work, X thread comments, Brain golden path tracing, Hermes Chat loading/response timing, and Fleet; `pnpm remotion:render-showcase`; `ffprobe` confirmed `out/remotion/hivemind-showcase.mp4` is 1920x1080, 30 fps, about 40 seconds; inspected rendered frames at 5s, 13s, 25s, 32s, and 34s to verify Work activity, simulated X post/comments UI, live Brain hive graph with golden path tracing, and the delayed Hermes chat response; `pnpm typecheck --pretty false`; `pnpm eslint remotion scripts/capture-remotion-showcase.mjs src/app/page.tsx`; `python3 verify_assimilation_manifest.py`; `git diff --check -- .gitignore package.json pnpm-lock.yaml CHANGELOG.md ASSIMILATION.json remotion scripts/capture-remotion-showcase.mjs public/remotion/.gitkeep src/app/page.tsx`.
- Intended commit message: `Add Remotion showcase project`

## 2026-05-20 22:44 WITA - Canonicalize Shared Vault Folder

- Status: Pushed
- Areas changed: Shared Obsidian vault folder, default vault paths, browser vault migration, shared-skill seed paths, Syncthing label, package scripts, memory guard, setup/build diagnostics, changelog
- Summary: Merge the current `HivemindOS Vault` contents into the synced old `HivemindOS Vault`, rename the synced local vault folder to `hivemindos-vault`, keep a timestamped backup of the old current HivemindOS vault folder, update repo defaults/setup/runtime collector paths to the new lowercase folder name, migrate stale browser-stored vault paths to the new default, refresh managed shared-skill pointers for local agent runtimes, switch dashboard dev/build paths to Next's Webpack mode to avoid the Turbopack memory/NFT issue, and wrap setup/dev/build commands in a 5 GB resident-memory process-tree guard so runaway local servers/builds are killed before they can freeze the machine.
- Verification: Read both vault `AGENTS.md` files before durable vault changes; `rsync -a --backup --suffix=.pre-hivemindos-merge-20260520-224203.bak` merged current HivemindOS vault contents into the synced vault; moved `HivemindOS Vault` to `HivemindOS Vault.merged-20260520-224203.bak`; renamed `HivemindOS Vault` to `hivemindos-vault`; ran `NEXT_PUBLIC_OBSIDIAN_VAULT_PATH=~/Documents/Obsidian/hivemindos-vault ./scripts/seed-shared-skills.sh --import-sources none --share-targets all`; propagated the same repo/vault default to the reachable Ubuntu Tailscale machine at `~/hivemindos`; merged its recreated uppercase vault folder into `~/Documents/Obsidian/hivemindos-vault`; restarted its collector and verified `/health` reports `~/Documents/Obsidian/hivemindos-vault`; `bash -n setup.sh`; `bash -n scripts/seed-shared-skills.sh`; `bash -n scripts/install-telemetry-collector.sh`; `bash -n scripts/run-with-memory-limit.sh`; `node --check scripts/agent-telemetry-collector.mjs`; `pnpm typecheck --pretty false`; bounded `pnpm build` now runs as `next build --webpack` and passes without the Turbopack NFT warning; `MEMORY_TIMEOUT_SECONDS=60 pnpm dev` served `/` on port 5020 under the guard and was stopped by the test timeout; an artificial memory-growth command with `--limit-mb 50` was killed with exit 137.
- Intended commit message: `Canonicalize shared vault folder`

## 2026-05-20 22:05 WITA - Match HivemindOS Scheduler Attachments

- Status: Pushed
- Areas changed: Scheduler attachment menu, Scheduler skill/path chips, Brain skill browser inventory, changelog
- Summary: Replace the Scheduler's direct skill-browser button with an HivemindOS-style `+` attachment popover for attaching skills, folders, files, and paths; show removable attachment chips on new schedules and schedule cards; load installed/shared provider skills into Scheduler and the Skill Browser so it no longer appears as a one-card catalog.
- Verification: `pnpm typecheck`; `pnpm eslint src/app/page.tsx`; `git diff --check -- src/app/page.tsx src/app/fleet.module.css CHANGELOG.md`; Playwright smoke on `http://localhost:5020` verified the Scheduler `+` menu, skill-search subpopover, 147 discovered skill buttons, and no horizontal overflow.
- Intended commit message: `Match HivemindOS scheduler attachments`

## 2026-05-20 22:52 WITA - Refine Kanban Lane Headers

- Status: Pushed
- Areas changed: Work board lane names, lane descriptions, Kanban lane header styles, changelog
- Summary: Improve the Kanban column cells themselves with cleaner lane names, shorter descriptions, stronger title hierarchy, calmer count badges, and subtler add controls.
- Verification: `pnpm eslint src/app/page.tsx src/lib/types/kanban.ts`; `rm -rf .next/dev/types && pnpm typecheck --pretty false`; `git diff --check -- src/app/kanban-board.module.css src/lib/types/kanban.ts CHANGELOG.md`.
- Intended commit message: `Refine Kanban lane headers`

## 2026-05-20 21:42 WITA - Refactor Runtime Adapters

- Status: Pushed
- Areas changed: Runtime adapter registry, Aeon adapter, Scheduler runtime import/actions, Fleet collector discovery, Brain skill metadata, local storage keys, agent settings, README, changelog
- Summary: Add a neutral runtime adapter contract and registry, make OpenClaw just one adapter, add Aeon background-runtime support for `aeon.yml` schedules, GitHub Actions runs, local skills/outputs, and optional A2A skill discovery, remove legacy OpenClaw-named localStorage and skill metadata shims, prevent background runtimes from being forced through Chat, let collectors discover explicit Aeon installs, and update docs around agent-agnostic runtime support.
- Verification: `pnpm typecheck --pretty false`; `pnpm eslint src/app/page.tsx src/app/api/scheduler/import/route.ts src/app/api/scheduler/runtime-action/route.ts src/app/api/agents/status/route.ts src/app/api/chat/agent-runtime/route.ts src/app/api/obsidian/status/route.ts src/app/api/miroshark/runs/route.ts 'src/app/api/runtimes/[runtime]/schedules/route.ts' 'src/app/api/runtimes/[runtime]/schedules/action/route.ts' 'src/app/api/runtimes/[runtime]/skills/route.ts' 'src/app/api/runtimes/[runtime]/runs/route.ts' 'src/app/api/runtimes/[runtime]/outputs/route.ts' 'src/app/api/runtimes/[runtime]/status/route.ts' src/lib/types/agent-runtime.ts src/lib/services/runtime-adapters/aeon.ts src/lib/services/runtime-adapters/openclaw.ts src/lib/services/runtime-adapters/hermes.ts src/lib/services/runtime-adapters/registry.ts src/lib/services/runtime-adapters/types.ts src/lib/services/obsidian/brain-skills.ts src/lib/services/obsidian/vault-path.ts src/lib/services/kanban/local-kanban-store.ts`; `node --check scripts/agent-telemetry-collector.mjs`; `bash -n scripts/seed-shared-skills.sh`; `python3 -m py_compile scripts/hive-env-add`; `python3 verify_assimilation_manifest.py`; `git diff --check -- .env.example README.md CHANGELOG.md ASSIMILATION.json src/lib/types/agent-runtime.ts src/lib/services/runtime-adapters src/app/api/runtimes src/app/api/scheduler src/app/api/agents/status/route.ts src/app/api/chat/agent-runtime/route.ts src/app/api/obsidian/status/route.ts src/app/api/miroshark/runs/route.ts src/app/page.tsx src/lib/services/obsidian/brain-skills.ts src/lib/services/obsidian/vault-path.ts src/lib/services/kanban/local-kanban-store.ts scripts/agent-telemetry-collector.mjs scripts/seed-shared-skills.sh scripts/hive-env-add`; Playwright smoke on `http://127.0.0.1:5020` verified the zero-agent app renders with Fleet, Scheduler, and Chat empty states without app console errors.
- Intended commit message: `Refactor runtime adapters`

## 2026-05-20 21:49 WITA - Refine Work Board UI

- Status: Pushed
- Areas changed: Work board layout, Kanban card/column/drawer styles, selected-task drawer close affordance, changelog
- Summary: Return the Work board to a non-polygonal responsive Kanban layout with normal rounded columns and task cards, quieter controls, subtle background comb texture, sticky task details, and a low-friction close button while preserving the existing bee icon and animation treatment.
- Verification: `pnpm eslint src/app/page.tsx`; `git diff --check -- src/app/page.tsx src/app/kanban-board.module.css CHANGELOG.md ASSIMILATION.json`; `verify_assimilation_manifest.py`; in-app browser smoke on `http://localhost:5020` confirmed the Work board renders without clipped polygonal lane/card shapes.
- Intended commit message: `Refine work board UI`

## 2026-05-20 21:31 WITA - Fix Setup Build Failure

- Status: Pushed
- Areas changed: Setup dependency install, remote collector update install, local collector Hermes setup, Next config, setup cache storage, alert notification rendering, README, changelog
- Summary: Suppress the Node 24 `url.parse()` deprecation noise from the pinned pnpm 8 install path without migrating the lockfile, apply the same install environment to remote collector updates, make alert source-label rendering accept the full notification object so the dashboard type-checks during `next build`, keep Hermes API setup out-of-the-box, make interactive setup ask before starting/reloading the Hermes gateway when needed, use `hermes gateway start` instead of foreground-style `restart` so setup can create the missing launchd service and leave the API server healthy on macOS, move setup cache stamps out of `.next` so builds cannot delete them, and remove the dynamic Turbopack root override that caused whole-project NFT tracing warnings.
- Verification: `NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--no-deprecation" pnpm install --frozen-lockfile`; `pnpm typecheck --pretty false`; `node --check scripts/agent-telemetry-collector.mjs`; `bash -n setup.sh`; `bash -n scripts/install-telemetry-collector.sh`; `pnpm build`; killed hung local `hermes gateway restart` and `launchctl kickstart` children; confirmed `hermes gateway start` regenerated the missing launchd service and `curl --max-time 3 http://127.0.0.1:8642/health` returned healthy; reran `./scripts/install-telemetry-collector.sh` and it skipped Hermes changes because the API server was already healthy.
- Intended commit message: `Fix setup build failure`

## 2026-05-20 21:24 WITA - Make Scheduler Runtime Agnostic

- Status: Pushed
- Areas changed: Scheduler import/action API, telemetry collector schedule endpoint, Scheduler UI import flow, README, changelog
- Summary: Move Scheduler imports and runtime actions behind generic `/api/scheduler/*` routes, add a collector `/schedules` endpoint for non-OpenClaw runtimes to expose local schedule files, make the Scheduler import copy runtime-neutral, and keep OpenClaw as only one adapter behind the generic schedule contract.
- Verification: `pnpm typecheck`; `pnpm eslint src/app/page.tsx src/app/api/scheduler/import/route.ts src/app/api/scheduler/runtime-action/route.ts`; `node --check scripts/agent-telemetry-collector.mjs`; `git diff --check -- src/app/page.tsx src/app/fleet.module.css src/app/api/scheduler/import/route.ts src/app/api/scheduler/runtime-action/route.ts scripts/agent-telemetry-collector.mjs README.md CHANGELOG.md`; Playwright smoke on `http://localhost:5020` verified the Scheduler import action renders without OpenClaw-specific cron/automation copy and without horizontal overflow.
- Intended commit message: `Make scheduler runtime agnostic`

## 2026-05-20 22:24 WITA - Polish Alert Actor Metadata

- Status: Pushed
- Areas changed: Alerts notification metadata, alert actor/source styles, changelog
- Summary: Replace raw notification author/source text such as `queen-bee · kanban:t_...` with polished actor metadata, make Hermes auth alerts show the failed worker instead of the alert author, style the task chip with clear label/name hierarchy, and rewrite Hermes auth copy in a calmer plain-language format.
- Verification: `pnpm eslint src/app/page.tsx`; `rm -rf .next/dev/types && pnpm typecheck --pretty false`; `git diff --check -- src/app/page.tsx src/app/notifications.module.css CHANGELOG.md`.
- Intended commit message: `Polish alert actor metadata`

## 2026-05-20 21:15 WITA - Import Existing Runtime Schedules

- Status: Pushed
- Areas changed: Scheduler import controls, OpenClaw cron import/management bridge, fleet styles, changelog
- Summary: Add an Import existing action to Scheduler that pulls local OpenClaw cron jobs into the HivemindOS schedule list, preserves their runtime job IDs, shows imported runtime/source status, and routes Run now, Pause, and Resume actions back through the real OpenClaw cron API.
- Verification: `pnpm typecheck`; `pnpm eslint src/app/page.tsx`; Playwright smoke on `http://localhost:5020` verified the Import existing button renders in Scheduler without horizontal overflow.
- Intended commit message: `Import existing runtime schedules`

## 2026-05-20 22:14 WITA - Render Kanban Card Markdown

- Status: Pushed
- Areas changed: Work board task card messages, Kanban agent stream messages, Kanban styles, changelog
- Summary: Render Kanban card and selected-task agent messages with the shared markdown formatter so inline code, links, emphasis, lists, and code fences no longer show as raw markdown on the board.
- Verification: `pnpm eslint src/app/page.tsx`; `pnpm typecheck --pretty false`; `git diff --check -- src/app/page.tsx src/app/kanban-board.module.css CHANGELOG.md`.
- Intended commit message: `Render Kanban card markdown`

## 2026-05-20 21:58 WITA - Add Kanban Card Expand Control

- Status: Pushed
- Areas changed: Work board card message expansion, Kanban card styles, changelog
- Summary: Replace the clunky long-message text hint with a compact chevron button that expands or collapses Kanban card messages inline.
- Verification: `pnpm eslint src/app/page.tsx`; `pnpm typecheck --pretty false`; `git diff --check -- src/app/page.tsx src/app/kanban-board.module.css CHANGELOG.md`.
- Intended commit message: `Add Kanban card expand control`

## 2026-05-20 20:58 WITA - Restyle Scheduler Like HivemindOS

- Status: Pushed
- Areas changed: Scheduler UI, fleet styles, changelog
- Summary: Replace the generic Scheduler form with an HivemindOS-inspired automation studio: compact glass sections, prompt/step segmented controls with icons, cadence preset chips, live step previews, inline skill attachment chips, and tighter schedule cards.
- Verification: `pnpm typecheck`; `pnpm eslint src/app/page.tsx`; `git diff --check -- src/app/page.tsx src/app/fleet.module.css CHANGELOG.md`; Playwright smoke on `http://localhost:5020` verified the Scheduler tab renders without horizontal overflow and captured `/tmp/hivemindos-scheduler-smoke.png`.
- Intended commit message: `Restyle scheduler like HivemindOS`

## 2026-05-20 21:45 WITA - Render Alert Markdown

- Status: Pushed
- Areas changed: Alerts notification rendering, notification markdown styles, changelog
- Summary: Render alert bodies as markdown with formatted code fences, inline code, links, lists, and headings, and remove the boxed title treatment so alert headings no longer look clipped at the left and right edges.
- Verification: `pnpm eslint src/app/page.tsx`; `pnpm typecheck --pretty false`; `git diff --check -- src/app/page.tsx src/app/notifications.module.css CHANGELOG.md`.
- Intended commit message: `Render alert markdown`

## 2026-05-20 21:33 WITA - Clean Up Alerts Nav Badge

- Status: Pushed
- Areas changed: Dashboard nav alert detail, notification badge styles, Kanban card inspect hint, changelog
- Summary: Move the unread alert count beside the Alerts label, make the badge upright/non-italic and smaller with proper spacing, change the sublabel from duplicate unread count copy to high-priority context, and add an explicit tap-to-read hint when Kanban card messages are truncated.
- Verification: `pnpm eslint src/app/page.tsx`; `pnpm typecheck --pretty false`; `git diff --check -- src/app/page.tsx src/app/globals.css src/app/notifications.module.css src/app/kanban-board.module.css CHANGELOG.md`.
- Intended commit message: `Clean up alerts nav badge`

## 2026-05-20 21:27 WITA - Alert On Hermes Auth Failures

- Status: Pushed
- Areas changed: Shared notification writer, notifications API, Kanban delegation failure handling, shared alert state, changelog
- Summary: Add a first-class notification creation API and raise a high-priority Alerts tab notification when Kanban delegation hits the Hermes/Codex refresh-token auth failure, including the machine, affected task, and exact `codex` / `hermes auth` recovery steps.
- Verification: `pnpm typecheck --pretty false`; `pnpm eslint src/app/page.tsx src/app/api/openclaw/notifications/route.ts src/lib/services/obsidian/agent-notifications.ts`; `git diff --check -- src/app/page.tsx src/app/api/openclaw/notifications/route.ts src/lib/services/obsidian/agent-notifications.ts CHANGELOG.md`; created/read the live high-priority alert and confirmed it is unread, tagged `kanban/hermes/auth/runtime`, sourced to `kanban:t_mpdz5min_vtn8v`, and contains the `codex` plus `hermes auth` fix.
- Intended commit message: `Alert on Hermes auth failures`

## 2026-05-20 21:11 WITA - Add Kanban Workflow Regression Test

- Status: Pushed
- Areas changed: Kanban workflow retry guard, Kanban store invariants, Kanban move utility, API regression harness, package scripts, shared board state, changelog
- Summary: Add an end-to-end Kanban API regression script covering Ideas to Ready to Working to Done, assigned Needs Human back to Working, unassigned Needs Human back to Ready, and accepted-without-session failures; prevent unpollable “accepted/waiting” Working writes from sticking in the shared store; clear stale completed timestamps when cards leave Done; keep the real stuck test card in Needs Human instead of letting stale clients flip it back to Working.
- Verification: `pnpm test:kanban`; `pnpm typecheck --pretty false`; `pnpm eslint src/app/page.tsx src/lib/services/kanban/local-kanban-store.ts src/lib/utils/kanban-board.ts src/lib/types/kanban.ts scripts/agent-telemetry-collector.mjs`; `node --check scripts/agent-telemetry-collector.mjs`; `node --check scripts/test-kanban-workflow.mjs`; `git diff --check -- package.json src/app/page.tsx src/lib/services/kanban/local-kanban-store.ts src/lib/utils/kanban-board.ts scripts/test-kanban-workflow.mjs scripts/agent-telemetry-collector.mjs CHANGELOG.md`; waited 15 seconds after restoring the real stuck card to Needs Human and confirmed it stayed `needs-human` with no `agentSession`.
- Intended commit message: `Add Kanban workflow regression test`

## 2026-05-20 21:02 WITA - Clarify Kanban Assignment Copy

- Status: Pushed
- Areas changed: Work board Queen routing comment copy, shared Kanban board comments, changelog
- Summary: Replace the confusing “No Queen Bee is assigned” routing note with “No agent was assigned yet” and update existing shared board comments to match.
- Verification: `pnpm eslint src/app/page.tsx`; `pnpm typecheck --pretty false`; `git diff --check -- src/app/page.tsx CHANGELOG.md`; searched app and shared board JSON to confirm the old “No Queen Bee is assigned” / “dashboard pickup loop” wording is gone.
- Intended commit message: `Clarify Kanban assignment copy`

## 2026-05-20 20:39 WITA - Keep Mobile Ready Cards Ready

- Status: Pushed
- Areas changed: Work board Queen Bee pickup guard, local collector chat bridge, delegation failure handling, shared Kanban board state, changelog
- Summary: Stop clients with an empty local Fleet inventory, such as mobile Safari, from interpreting a move to `Ready for Queen` as a no-agent failure and bouncing the card to `Needs Human`; keep accepted-but-empty worker responses out of Done; make empty Hermes API streams fall through to the fallback/error path instead of masquerading as successful work; mark the affected test task as Needs Human with the surfaced local Hermes auth failure.
- Verification: `node --check scripts/agent-telemetry-collector.mjs`; `pnpm typecheck --pretty false`; `pnpm eslint src/app/page.tsx src/lib/types/kanban.ts scripts/agent-telemetry-collector.mjs`; `git diff --check -- src/app/page.tsx scripts/agent-telemetry-collector.mjs CHANGELOG.md`; local collector restart; direct `/chat` probe now exposes the Hermes auth failure through the `oneshot-fallback` stream instead of returning empty `[DONE]`; local `/api/chat/agent-runtime` smoke now surfaces the same auth failure; local Kanban API smoke confirmed `add a test hello to the top of the fleet page` is `needs-human` with the auth failure recorded.
- Intended commit message: `Keep mobile ready cards ready`

## 2026-05-20 20:31 WITA - Add Mobile Kanban Move Control

- Status: Pushed
- Areas changed: Work board card movement UI, Kanban mobile styles, changelog
- Summary: Add a touch-friendly Move picker to each Kanban card on mobile/coarse-pointer devices so cards can be moved between lanes without relying on native HTML drag-and-drop.
- Verification: `pnpm typecheck --pretty false`; `pnpm eslint src/app/page.tsx src/lib/types/kanban.ts`; `git diff --check -- src/app/page.tsx src/app/kanban-board.module.css CHANGELOG.md`.
- Intended commit message: `Add mobile Kanban move control`

## 2026-05-20 20:18 WITA - Recover Stale Kanban Work

- Status: Pushed
- Areas changed: Work board stale-session recovery, Kanban card/drawer UI, Kanban task typing, changelog
- Summary: Detect Working cards whose delegated agent session has gone quiet for more than 30 minutes, mark them as stale in the board UI, expose a selected-task retry action, auto-requeue stale sessions by clearing the dead session, and briefly cool down the quiet worker so Queen Bee can pick another eligible agent.
- Verification: `pnpm typecheck --pretty false`; `pnpm eslint src/app/page.tsx src/lib/types/kanban.ts`; `git diff --check -- src/app/page.tsx src/app/kanban-board.module.css src/lib/types/kanban.ts CHANGELOG.md`; local Kanban API smoke confirmed `Improve UI and UX` is now `done`, assigned to `Hermes on This Mac`, with the stale remote session cleared.
- Intended commit message: `Recover stale Kanban work`

## 2026-05-20 20:06 WITA - Add Hive Env Helper

- Status: Pushed
- Areas changed: Env helper CLI, setup script, environment example, README, changelog
- Summary: Add an agent-agnostic `hive-env-add` command that setup installs into `~/.local/bin`, updates local app and generic hive agent env stores by default, imports existing Hermes env keys with `--import-env`, discovers ready Tailnet peers through setup-installed collector health identity instead of guessing SSH users, supports explicit Hermes/Aeon/OpenClaw compatibility targets, and refreshes an encrypted shared-note backup when GPG configuration is available.
- Verification: Temp E2E harness verified `--import-env` imports valid Hermes env keys without printing secret values, `hive-env-add` updates local app plus generic agent env, fake Tailscale status with one online peer triggers Tailscale SSH replication, the remote peer receives the secret through stdin and updates its own app plus generic agent env defaults, offline peers are skipped, and secret values do not appear in stdout/stderr; real Tailnet smoke updated `lab-linux-1` collector health to publish `envSync.user=root`, installed the helper there, added a harmless `HIVE_TAILNET_COLLECTOR_ID_TEST_*` key on the Mac with `hive-env-add`, verified the identical key/value in Ubuntu `~/.hivemindos/.env`, then removed the test keys from both machines; isolated fresh-clone smoke created temp clone/home folders on Mac and Ubuntu, installed only the new helper in each temp `~/.local/bin`, ran an isolated Ubuntu collector health endpoint on a temporary port, added a harmless env with normal `hive-env-add KEY=value` from the Mac temp clone, verified the same value in the Ubuntu temp hive env, and removed all temp folders/processes; `env PYTHONPYCACHEPREFIX=/private/tmp/hive-pycache python3 -m py_compile scripts/hive-env-add`; `node --check scripts/agent-telemetry-collector.mjs`; `bash -n setup.sh`; `git diff --check -- scripts/hive-env-add scripts/agent-telemetry-collector.mjs setup.sh .env.example README.md CHANGELOG.md ASSIMILATION.json`; `verify_assimilation_manifest.py`.
- Intended commit message: `Add hive env helper`

## 2026-05-20 18:29 WITA - Make HivemindOS Vault Canonical

- Status: Pushed
- Areas changed: Shared Obsidian vault contents, Work board storage, browser vault migration, changelog
- Summary: Merge the HivemindOS Vault contents into `HivemindOS Vault`, merge both Kanban board histories into the HivemindOS board, preserve overwritten vault files with migration backups, and migrate browsers with the old HivemindOS path or old OpenClaw Kanban folder back to the default HivemindOS vault on reload.
- Verification: `pnpm typecheck --pretty false`; `pnpm eslint src/app/page.tsx`; `git diff --check -- src/app/page.tsx CHANGELOG.md`; merged `HivemindOS Vault` into `HivemindOS Vault` with `.20260520-hivemindos-migration.bak` backups for overwritten files; `GET /api/kanban?board=default&include_archived=true` now resolves to `~/Documents/Obsidian/hivemindos-vault/Projects/HivemindOS/Kanban/kanban.json` and returns `Improve UI and UX`, `MiroShark Integration`, `Say ok if no input audio is sent.`, plus archived smoke cards; browser storage migration covers old `HivemindOS Vault` and `Projects/OpenClaw/Kanban` settings.
- Intended commit message: `Make HivemindOS vault canonical`

## 2026-05-20 12:50 WITA - Bundle Karpathy Shared Skill

- Status: Pushed
- Areas changed: Bundled shared skills, Obsidian brain skill seeding, setup script, shared skill seed script, runtime skill hints, agent runtime vault context, README, assimilation manifest, changelog
- Summary: Bundle `multica-ai/andrej-karpathy-skills` as `karpathy-guidelines`, create the shared notes `Skills/` folder during setup and skill inventory reads, add an interactive arrow-key shared-skill checklist with an `Import all skills into shared hivemind` master checkbox plus per-agent choices for Codex, Claude, Hermes, Gemini, OpenClaw, and Aeon, import selected runtime skills into the shared shelf, mirror the baseline skill into selected runtime skill folders, write managed pointers so agents reached outside the dashboard know to consult the shared skill shelf, and add setup flags for import/share/skip/force workflows.
- Verification: `bash -n setup.sh`; `bash -n scripts/seed-shared-skills.sh`; `./setup.sh --help`; fake Aeon smoke with `HOME=/private/tmp/openclaw-aeon-skill-test/home NEXT_PUBLIC_OBSIDIAN_VAULT_PATH=/private/tmp/openclaw-aeon-skill-test/vault ./scripts/seed-shared-skills.sh --import-sources aeon --share-targets aeon` imported an Aeon skill into the shared `Skills/` shelf, regenerated `Skills/README.md`, mirrored `karpathy-guidelines` into `~/.aeon/skills`, wrote `~/.aeon/AGENTS.md`, and a second run kept one managed block; skipped-stage setup smoke with `HOME=/private/tmp/openclaw-setup-flags-test/home NEXT_PUBLIC_OBSIDIAN_VAULT_PATH=/private/tmp/openclaw-setup-flags-test/vault HIVE_SETUP_INTERACTIVE=false PORT=5999 AGENT_TELEMETRY_PORT=5998 ./setup.sh --import-skills aeon --skip-deps --skip-build --skip-collector --skip-dashboard` exercised flag parsing and created only the expected fake-home Aeon/vault skill files; `pnpm eslint src/app/api/chat/agent-runtime/route.ts src/lib/services/obsidian/brain-skills.ts src/app/api/obsidian/skills/route.ts`; `pnpm typecheck --pretty false`; `git diff --check -- AGENTS.md README.md CHANGELOG.md setup.sh scripts/seed-shared-skills.sh src/app/api/chat/agent-runtime/route.ts src/lib/services/obsidian/brain-skills.ts ASSIMILATION.json skills/karpathy-guidelines/SKILL.md`; `verify_assimilation_manifest.py`.
- Intended commit message: `Bundle Karpathy shared skill`

## 2026-05-20 12:22 WITA - Allow Tailnet Dev Dashboard Origins

- Status: Pushed
- Areas changed: Next dev server config, environment example, changelog
- Summary: Allow Tailnet dashboard access without hardcoding this machine's private IP by reading optional comma-separated `NEXT_ALLOWED_DEV_ORIGINS` values and auto-detecting the local Tailscale IPv4/MagicDNS host at dev-server startup.
- Verification: `pnpm typecheck --pretty false`; `pnpm eslint next.config.ts`; restarted `next dev -H 0.0.0.0 -p 5020`; `curl -H 'Host: 192.0.2.10:5020' http://192.0.2.10:5020/` returned the dashboard page.
- Intended commit message: `Allow Tailnet dev dashboard origin`

## 2026-05-20 11:32 WITA - Add Async Kanban Session Bridge

- Status: Pushed
- Areas changed: Telemetry collector session API, chat runtime proxy, Kanban task session metadata, Work board polling, agent stream UI, changelog
- Summary: Capture the remote Hermes API session id during delegation, persist it on the Kanban task, expose collector session messages, and poll them into the selected task's Agent stream so long-running worker output appears after the initial dashboard request times out.
- Verification: `node --check scripts/agent-telemetry-collector.mjs`; `pnpm eslint src/app/page.tsx src/app/api/chat/agent-session/route.ts scripts/agent-telemetry-collector.mjs`; `pnpm typecheck`; deployed the patched collector to `lab-linux-1` and confirmed `/chat` streams a `session` event plus content, `/sessions?sessionId=...` returns the persisted remote Hermes transcript without internal skill prelude noise, `/api/chat/agent-session` proxies that transcript locally, and a Work board smoke task assigned to `Hermes on lab-linux-1` completed with `remote async ui ok` while the selected drawer showed the durable Agent stream after reload. Archived the temporary smoke tasks afterward.
- Intended commit message: `Add async Kanban session bridge`

## 2026-05-20 11:31 WITA - Fix Optional Tailscale Step State

- Status: Pushed
- Areas changed: Machine setup modal, changelog
- Summary: Keep the optional Tailscale setup step pending for a selected machine unless that same machine has a Tailnet IP or DNS name, even when its local collector is already ready.
- Verification: `pnpm eslint src/app/page.tsx`; `pnpm typecheck`; `git diff --check -- src/app/page.tsx`.
- Intended commit message: `Fix optional Tailscale step state`

## 2026-05-20 11:26 WITA - Generalize Agent Operations Controls

- Status: Pushed
- Areas changed: Agent settings modal, Scheduler nav/view, Brain shared skill browser, generalized agent security proxy, Obsidian skill import API, README, assimilation manifest
- Summary: Expand agent settings into segmented Role, Memory, Runtime, and Security views; add a Scheduler tab for reusable prompt or step-by-step agent runs with shared skill attachments; add a bee-branded skill browser from the shared Brain skill shelf; let remote/catalog skills be mirrored into the Obsidian Skills folder; and make the chat security proxy apply across Hermes, OpenClaw, Aeon, and collector-backed runtimes.
- Verification: `pnpm typecheck`; `pnpm eslint src/app/page.tsx src/app/api/chat/agent-runtime/route.ts src/app/api/obsidian/skills/route.ts src/lib/services/obsidian/brain-skills.ts src/lib/services/openclaw/gateway-client.ts src/lib/services/openclaw/security-proxy.ts src/lib/services/agent-security-proxy.ts` (warnings only: existing unused MiroShark template state/functions); `git diff --check -- src/app/page.tsx src/app/fleet.module.css src/app/vault.module.css src/app/api/chat/agent-runtime/route.ts src/app/api/obsidian/skills/route.ts src/lib/services/obsidian/brain-skills.ts src/lib/services/openclaw/gateway-client.ts src/lib/services/openclaw/security-proxy.ts src/lib/services/agent-security-proxy.ts README.md CHANGELOG.md ASSIMILATION.json`; `verify_assimilation_manifest.py`; Playwright smoke on `http://localhost:5020` verified the Scheduler tab renders, the Brain add-skill card renders, and the Skill Browser modal opens.
- Intended commit message: `Generalize agent operations controls`

## 2026-05-20 11:20 WITA - Add MiroShark Template-Specific Inputs

- Status: Pushed
- Areas changed: Swarm MiroShark template builder, crypto launch rehearsal inputs, template scenario composition
- Summary: Add per-template detail fields so simulations are grounded in concrete rehearsal inputs, including token address and chain/network for Crypto Token Launch plus tailored fields for campus, corporate, historical, political, and product launch scenarios.
- Verification: `pnpm typecheck`; `pnpm eslint src/app/page.tsx`; `git diff --check -- src/app/page.tsx src/app/miroshark.module.css CHANGELOG.md`; Playwright verified Crypto Token Launch exposes coin/contract address and chain/network fields, those values feed the generated scenario, the run button enables after required token fields are filled, all six MiroShark templates expose relevant input labels, and the Swarm view has no horizontal overflow.
- Intended commit message: `Add MiroShark template-specific inputs`

## 2026-05-20 11:14 WITA - Make Tailscale Optional

- Status: Pushed
- Areas changed: Setup script, collector installer, collector health, Fleet discovery, setup modal copy, shared vault Tailnet default, README, security copy, env example, changelog
- Summary: Let setup complete in local-only mode when Tailscale is missing or logged out, warn that multi-machine collaboration and shared memory sync are disabled, skip Tailnet rsync/Syncthing setup unless Tailscale is connected, advertise Syncthing capability only when installed, fall back to the localhost collector for local Fleet use, default Tailnet sync off unless setup detects Tailscale, and frame Tailscale as optional in the connect-machine modal and README.
- Verification: `bash -n setup.sh`; `bash -n scripts/install-telemetry-collector.sh`; `node --check scripts/agent-telemetry-collector.mjs`; `pnpm eslint src/app/page.tsx src/app/api/fleet/discover/route.ts src/lib/types/agent-runtime.ts src/components/cells/SetupCell.tsx src/components/cells/SecurityCell.tsx scripts/agent-telemetry-collector.mjs` (warnings only: unrelated unused state/functions in `src/app/page.tsx`); `pnpm typecheck`; `git diff --check -- setup.sh scripts/install-telemetry-collector.sh scripts/agent-telemetry-collector.mjs src/app/api/fleet/discover/route.ts src/app/page.tsx src/components/cells/SetupCell.tsx src/components/cells/SecurityCell.tsx src/lib/types/agent-runtime.ts .env.example README.md CHANGELOG.md`; local-mode Fleet discovery smoke with `tailscale` removed from `PATH` returned a ready `127.0.0.1:8787` collector; targeted sensitive-info scan of changed files found no new secrets or private Tailnet IPs, with matches only in older unrelated changelog verification notes.
- Intended commit message: `Make Tailscale optional`

## 2026-05-20 11:08 WITA - Clarify Machine Connect Setup Steps

- Status: Pushed
- Areas changed: Machine setup modal, setup cell step documentation, changelog
- Summary: Add Tailscale as the first setup step with private-network copy, move the setup command copy action onto the Connect step, shift Verify into the next step, and keep Configure features last.
- Verification: `pnpm eslint src/app/page.tsx src/components/cells/SetupCell.tsx`; `pnpm typecheck`; `git diff --check -- src/app/page.tsx src/components/cells/SetupCell.tsx CHANGELOG.md`.
- Intended commit message: `Clarify machine connect setup steps`

## 2026-05-20 10:55 WITA - Add Kanban Active Work Stream

- Status: Pushed
- Areas changed: Work board task cards, selected task drawer, agent steering controls, Kanban styles, changelog
- Summary: Add a bee-based active work animation to assigned Working cards, show the selected task's agent conversation in a newest-first scroll panel with message timestamps, and add a compact Steer input that sends follow-up guidance to the assigned agent.
- Verification: `pnpm eslint src/app/page.tsx`; `pnpm typecheck`; `git diff --check -- src/app/page.tsx src/app/kanban-board.module.css CHANGELOG.md`; Playwright smoke on `http://localhost:5020` verified the Work board renders the Agent stream panel, Steer control, and bee working indicators without obvious drawer overlap.
- Intended commit message: `Add Kanban active work stream`

## 2026-05-20 11:04 WITA - Stop Kanban Waiting Comment Loop

- Status: Pushed
- Areas changed: Work board retry gating, transient delegation handling, shared Kanban board state, changelog
- Summary: Treat dashboard timeouts and transient fetch failures as a quiet waiting state, stop adding repetitive Queen Bee comments when an assigned Working task is awaiting an agent update, and prevent the retry watcher from redispatching those waiting cards.
- Verification: `pnpm eslint src/app/page.tsx`; `pnpm typecheck`; `git diff --check -- src/app/page.tsx CHANGELOG.md`; parsed the shared Kanban board JSON, removed 12 repeated timeout/failure comments from `Improve UI and UX`, confirmed the task is `working`, and confirmed zero noisy delegation failure comments remain for that task.
- Intended commit message: `Stop Kanban waiting comment loop`

## 2026-05-20 10:54 WITA - Add Chat Folder Creation

- Status: Pushed
- Areas changed: Chat sidebar machine actions, chat folder creation API, chat runtime directory context, chat styles, changelog
- Summary: Replace the machine availability label in Chat with a compact add-folder icon, add a folder creation dialog for choosing a parent location and folder name, persist created chat folders, auto-select the new folder, and pass the selected working directory into new chats.
- Verification: `pnpm typecheck`; `pnpm eslint src/app/page.tsx src/app/api/chat/agent-runtime/route.ts src/app/api/chat/folders/route.ts` (warnings only: existing unused Kanban active-work helpers); `git diff --check -- src/app/page.tsx src/app/chat.module.css src/app/api/chat/agent-runtime/route.ts src/app/api/chat/folders/route.ts CHANGELOG.md`; Playwright smoke on `localhost:5020` verified Chat machine rows show 20px create-folder buttons instead of availability text and the folder creation dialog opens with location/name inputs.
- Intended commit message: `Add chat folder creation`

## 2026-05-20 10:38 WITA - Keep Slow Delegations In Working

- Status: Pushed
- Areas changed: Work board delegation failure handling, Hermes runtime error copy, shared Kanban board state, changelog
- Summary: Stop treating a manually retried Working task timeout as a reachability failure, keep reachable-but-slow delegated work in Working for follow-up instead of bouncing it back to Needs Human, report runtime timeout copy accurately, and restore the current shared card to Working with non-contradictory status text.
- Verification: `node -e` JSON parse smoke for the shared Kanban board; `node --check scripts/agent-telemetry-collector.mjs`; `bash -n scripts/install-telemetry-collector.sh`; `pnpm eslint src/app/page.tsx src/app/api/chat/agent-runtime/route.ts scripts/agent-telemetry-collector.mjs`; `pnpm typecheck`; `git diff --check -- src/app/page.tsx src/app/api/chat/agent-runtime/route.ts scripts/agent-telemetry-collector.mjs scripts/install-telemetry-collector.sh CHANGELOG.md`; remote collector `/chat` streamed `reachable ok`.
- Intended commit message: `Keep slow delegations in working`

## 2026-05-20 02:00 WITA - Fix Remote Hermes Chat Reachability

- Status: Pushed
- Areas changed: Telemetry collector chat bridge, collector installer, Work board delegation retry gating, remote Hermes gateway setup, changelog
- Summary: Enable the Hermes loopback API server during collector setup, pass API host/port/key through the collector service environment, make the collector send auth headers when an API key is configured, avoid treating old failure comments as a permanent retry block, and repair the Ubuntu gateway so Queen Bee delegation can reach the agent through `/chat`.
- Verification: `node --check scripts/agent-telemetry-collector.mjs`; `bash -n scripts/install-telemetry-collector.sh`; `pnpm typecheck`; `pnpm eslint scripts/agent-telemetry-collector.mjs src/app/page.tsx`; `git diff --check -- scripts/agent-telemetry-collector.mjs scripts/install-telemetry-collector.sh src/app/page.tsx CHANGELOG.md`; configured the Ubuntu Hermes gateway API on `127.0.0.1:8642`; remote `/v1/chat/completions` returned `remote api ok`; remote collector `/chat` streamed `collector still ok`.
- Intended commit message: `Fix remote Hermes chat reachability`

## 2026-05-20 01:59 WITA - Create Syncthing Folder Markers

- Status: Pushed
- Areas changed: Collector Syncthing folder configuration, changelog
- Summary: Create Syncthing's `.stfolder` marker whenever the collector configures a shared folder so existing vault directories do not enter the `folder marker missing` error state.
- Verification: `node --check scripts/agent-telemetry-collector.mjs`; `git diff --cached --check`; restarted the local collector; updated the Ubuntu collector to `272dd7d`; re-paired without a remote folder path; local Syncthing folder status returned `idle` with no marker error; no-path E2E smoke passed Mac to Ubuntu in 5 attempts and Ubuntu to Mac in 6 attempts; cleaned up hidden `.hivemindos-sync-test` notes.
- Intended commit message: `Create Syncthing folder markers`

## 2026-05-20 01:54 WITA - Clarify Shared Skill Imports

- Status: Pushed
- Areas changed: Brain shared skills inventory, Obsidian skill import dedupe, changelog
- Summary: Show every unique shared-brain skill instead of only the first twelve, label imported provider skills as `Shared brain` with a secondary source chip, update provider copy to distinguish shared versus importable skills, and prevent provider imports from adding duplicate normalized skill slugs during the same sync.
- Verification: `pnpm eslint src/app/page.tsx src/lib/services/obsidian/brain-skills.ts`; `git diff --check -- src/app/page.tsx src/app/vault.module.css src/lib/services/obsidian/brain-skills.ts CHANGELOG.md`; local `/api/obsidian/skills` smoke against `~/Documents/Obsidian/agent-team-vault` returned 37 unique shared skills and Claude `0` importable; Playwright smoke verified 37 shared skill cards render with `Shared brain` labels and provider source chips.
- Intended commit message: `Clarify shared skill imports`

## 2026-05-20 01:49 WITA - Auto-Pair Tailnet Syncthing

- Status: Pushed
- Areas changed: Collector Syncthing status, Syncthing pairing API, shared vault defaults/UI, fleet discovery capability typing, changelog
- Summary: Make realtime Tailnet sync work out of the box by enabling auto-pair by default, having collectors advertise a default shared-brain sync path, allowing the pair API to use collector defaults when no remote path is provided, and auto-pairing reachable Syncthing-capable Tailnet collectors from the dashboard without requiring manual folder entry.
- Verification: `node --check scripts/agent-telemetry-collector.mjs`; `pnpm typecheck`; `git diff --check`; local collector restart advertised default sync path; Ubuntu collector updated to `72c8e0f` and advertised its default sync path; pair API accepted a request with no remote folder path and selected the Ubuntu collector default.
- Intended commit message: `Auto-pair Tailnet Syncthing`

## 2026-05-20 01:45 WITA - Retry Delegation With Reachable Agents

- Status: Pushed
- Areas changed: Queen Bee Work board delegation, unreachable agent cooldowns, changelog
- Summary: Stop repeatedly assigning Ready tasks to agents with recent unreachable chat failures, put failed dispatch targets on cooldown, and retry the same task with another eligible worker before moving it to Needs Human.
- Verification: `pnpm typecheck`; `pnpm eslint src/app/page.tsx` (warning only from unrelated existing `localTailscaleIp` symbol); `git diff --check -- src/app/page.tsx CHANGELOG.md`.
- Intended commit message: `Retry delegation with reachable agents`

## 2026-05-20 01:41 WITA - Move Vault Project Data To HivemindOS

- Status: Pushed
- Areas changed: MiroShark run archive API, Kanban vault storage, Obsidian project data folders, changelog
- Summary: Move the existing saved MiroShark archive, brain access log, and Kanban data into the canonical `Projects/HivemindOS` folder, remove the redundant legacy OpenClaw project folder, keep the MiroShark API pointed at the single HivemindOS archive path, and normalize stale Kanban folder requests to the canonical HivemindOS Kanban folder.
- Verification: `pnpm typecheck`; `pnpm eslint src/lib/services/kanban/local-kanban-store.ts src/app/api/miroshark/runs/route.ts`; `git diff --check -- src/app/api/miroshark/runs/route.ts src/lib/services/kanban/local-kanban-store.ts CHANGELOG.md`; canonical archive smoke found `sim_c7764ee3341b` with 30 posts and `sim_f64f2186bd42` with 74 posts in `~/Documents/Obsidian/agent-team-vault/Projects/HivemindOS/MiroShark Simulations`, verified every indexed `run.json` exists, merged 79 brain access log entries, moved the populated Kanban board with 2 tasks, 7 comments, and 24 events, confirmed the old project folder no longer exists, searched for stale legacy project-folder references, and verified a stale Kanban request resolves to the HivemindOS Kanban path without recreating the old folder.
- Intended commit message: `Move vault project data to HivemindOS`

## 2026-05-20 01:38 WITA - Move Brain Skill Imports To Providers

- Status: Pushed
- Areas changed: Brain shared skills provider controls, vault styles, changelog
- Summary: Move Brain skill import actions out of the section header and into each provider cell, with a nearby provider-toolbar import-all action so the provider inventory can be acted on directly.
- Verification: `pnpm eslint src/app/page.tsx` (warning only: existing unused `kanbanDispatchCooldownRef`); `git diff --check -- src/app/page.tsx src/app/vault.module.css CHANGELOG.md`; Playwright smoke with the HivemindOS Vault path verified provider cells show subtle per-provider import buttons and the nearby import-all action. `pnpm typecheck` is currently blocked by unrelated `dispatchKanbanTaskToAgent` return typing in `src/app/page.tsx`.
- Intended commit message: `Move brain skill imports to providers`

## 2026-05-20 01:38 WITA - Remove Setup Header Redundancy

- Status: Pushed
- Areas changed: Setup cell header, changelog
- Summary: Remove the redundant `SET` glyph, `Setup` eyebrow, and `Needs setup` status pill from the machine setup cell header so the modal leads with the actual task title.
- Verification: `pnpm eslint src/components/cells/SetupCell.tsx`; `git diff --check -- src/components/cells/SetupCell.tsx CHANGELOG.md`; Playwright smoke verified the setup cell starts with `Add this machine` and no longer contains the `SET`, `SETUP`, or `Needs setup` header labels.
- Intended commit message: `Remove setup header redundancy`

## 2026-05-20 01:35 WITA - Animate Running Idle Agents

- Status: Pushed
- Areas changed: Agent status copy, Fleet agent cell, changelog
- Summary: Treat a reachable running agent process as active for the Fleet avatar state so running-but-idle agents show the green dot and Lottie bee instead of a gray idle dot.
- Verification: `pnpm typecheck`; `pnpm eslint src/app/page.tsx src/components/cells/AgentCell.tsx src/components/cells/statusCopy.ts`; `git diff --check -- src/app/page.tsx src/components/cells/AgentCell.tsx src/components/cells/statusCopy.ts CHANGELOG.md`; Playwright mocked a running idle agent snapshot and verified the running copy appears with the Lottie/canvas avatar mounted.
- Intended commit message: `Animate running idle agents`

## 2026-05-20 01:34 WITA - Pin Collector Update Package Manager

- Status: Pushed
- Areas changed: Package metadata, setup script, collector self-update command, changelog
- Summary: Pin the repo to `pnpm@8.6.12` and make setup/self-update activate that version through Corepack before installing, so remote collectors do not fail against the v6 lockfile with newer global pnpm releases.
- Verification: Pending: syntax checks, typecheck, and remote collector update retry.
- Intended commit message: `Pin collector update package manager`

## 2026-05-20 01:29 WITA - Keep Duplicate Agent Histories Separate

- Status: Pushed
- Areas changed: Fleet discovered-agent aliasing, changelog
- Summary: Prevent a newly re-added saved agent from inheriting another saved agent's discovered collector task history when both point at the same Hermes runtime.
- Verification: `pnpm typecheck`; `pnpm eslint src/app/page.tsx`; `git diff --check -- src/app/page.tsx CHANGELOG.md`; Playwright mocked two saved Hermes profiles receiving duplicate snapshot payloads from the same collector and verified only the first profile shows collector history while the re-added profile stays clean.
- Intended commit message: `Keep duplicate agent histories separate`

## 2026-05-20 01:28 WITA - Simplify Machine Setup Modal

- Status: Pushed
- Areas changed: Fleet machine setup modal, setup cell component, changelog
- Summary: Reduce the machine setup guide to Connect, Verify, and Configure features; move the setup command copy action inline with the Verify step; rename it to a compact `Copy command`; and remove the separate shared-brain step because setup already installs the default Syncthing-backed shared brain path.
- Verification: `pnpm typecheck`; `pnpm eslint src/components/cells/SetupCell.tsx src/app/page.tsx`; `git diff --check -- src/components/cells/SetupCell.tsx src/app/page.tsx CHANGELOG.md`; localhost health check returned HTTP 200; Playwright smoke verified the modal shows `Copy command` inline with step 2, uses `3. Configure features`, and no longer shows `Enable shared brain` or `Copy setup command`.
- Intended commit message: `Simplify machine setup modal`

## 2026-05-20 01:28 WITA - Remove Header Agent Connector

- Status: Pushed
- Areas changed: Fleet header add-agent shortcut, Fleet styles, changelog
- Summary: Remove the redundant `Connect an agent` header disclosure now that agent creation happens from the machine-card `Add agent` action.
- Verification: `pnpm typecheck`; `pnpm eslint src/app/page.tsx`; `git diff --check -- src/app/page.tsx src/app/fleet.module.css CHANGELOG.md`. `pnpm eslint src/app/page.tsx src/app/fleet.module.css` also passed with the expected warning that CSS files are ignored by the ESLint config.
- Intended commit message: `Remove header agent connector`

## 2026-05-20 01:24 WITA - Add Brain Skill Imports

- Status: Pushed
- Areas changed: Brain shared skills UI, Obsidian skills inventory/import API, provider skill scanner, vault styles, changelog
- Summary: Add a prominent shared-brain Skills panel that reads Obsidian `Skills/`, scans installed Claude/Codex/Hermes/Gemini/OpenClaw skill folders, supports import-all and provider-specific import modal flows with loading/success states, mirrors skill directories into the vault, and refreshes the Brain view after sync.
- Verification: `pnpm typecheck`; `pnpm eslint src/app/page.tsx src/app/api/obsidian/skills/route.ts src/lib/services/obsidian/brain-skills.ts`; `git diff --check -- src/app/page.tsx src/app/vault.module.css src/app/api/obsidian/skills/route.ts src/lib/services/obsidian/brain-skills.ts CHANGELOG.md ASSIMILATION.json`; `verify_assimilation_manifest.py`; local `/api/obsidian/skills` smoke against `~/Documents/Obsidian/agent-team-vault` returned 12 shared skills and 140 provider skills; Playwright desktop/mobile smokes verified the Brain skills panel and provider import modal render with provider rows.
- Intended commit message: `Add brain skill imports`

## 2026-05-20 01:22 WITA - Show Created Agents In Fleet

- Status: Pushed
- Areas changed: Fleet agent dedupe/merge logic, changelog
- Summary: Preserve user-created agent profile fields when they overlap auto-discovered collector agents so newly added agents immediately appear under their machine.
- Verification: `pnpm typecheck`; `pnpm eslint src/app/page.tsx` (warnings only from unrelated existing unused Brain skill symbols); `git diff --check -- src/app/page.tsx CHANGELOG.md`; Playwright mocked a saved created agent plus a matching discovered collector/history agent and verified the created name remains visible under the machine after history loads.
- Intended commit message: `Show created agents in Fleet`

## 2026-05-20 01:18 WITA - Add Syncthing Tailnet Sync

- Status: Pushed
- Areas changed: Collector Syncthing service management, Syncthing pairing APIs, shared vault sync UI, setup scripts, README, roadmap, agent runtime context, assimilation manifest, changelog
- Summary: Make built-in multi-machine vault/folder sync use managed Syncthing over Tailscale by default, install/start Syncthing from setup on macOS and Linux collectors, pair local and remote folders through collector APIs, keep Tailscale SSH plus rsync as an advanced fallback, and add a scoped `.hivemindos-sync-test` note endpoint for real bidirectional E2E verification without SSH.
- Verification: `node --check scripts/agent-telemetry-collector.mjs`; `bash -n scripts/run-syncthing.sh`; `bash -n setup.sh`; `bash -n scripts/install-telemetry-collector.sh`; `pnpm typecheck`; `pnpm lint` (warnings only: 8 existing unused-variable warnings); `pnpm build` (passed with existing Turbopack NFT trace warning and bigint fallback notices); `git diff --check`; `python3 verify_assimilation_manifest.py`; local collector `/syncthing/status` reports Syncthing v2.1.0 running with a device ID; current-tree token/private-path scan found no matches outside changelog verification notes. Remote Mac-to-Ubuntu and Ubuntu-to-Mac sync test will run after this commit is pushed so the Ubuntu collector can update to these endpoints.
- Intended commit message: `Add Syncthing Tailnet sync`

## 2026-05-20 01:12 WITA - Align Chat Start Tooltips

- Status: Pushed
- Areas changed: Chat sidebar tree start-chat controls, changelog
- Summary: Reuse the same tooltip pattern as Fleet agent action buttons for machine and folder start-chat controls, with contextual `New chat in ...` tooltips.
- Verification: `pnpm eslint src/app/page.tsx`; `git diff --check -- src/app/page.tsx CHANGELOG.md`.
- Intended commit message: `Align chat start tooltips`

## 2026-05-20 01:08 WITA - Add Agent Creation Modal

- Status: Pushed
- Areas changed: Fleet add-agent flow, agent settings modal, changelog
- Summary: Change machine Add agent actions to open a settings-style creation modal with name/runtime/role controls, create the profile attached to that machine, and stop redirecting to Chat after creation.
- Verification: `pnpm typecheck`; `pnpm eslint src/app/page.tsx`; `git diff --check -- src/app/page.tsx CHANGELOG.md`; Playwright smoke on `localhost:5020` with a mocked ready machine verified Add agent opens the creation modal, creates the new profile under that machine, and leaves Fleet active instead of switching to Chat.
- Intended commit message: `Add agent creation modal`

## 2026-05-20 01:03 WITA - Shrink Chat Tree Action Icons

- Status: Pushed
- Areas changed: Chat sidebar tree action icon sizing, changelog
- Summary: Reduce the machine/folder start-chat action target in the Chat sidebar and force its SVG to a small fixed size so it no longer appears as an oversized speech bubble.
- Verification: `git diff --check -- src/app/chat.module.css CHANGELOG.md`.
- Intended commit message: `Shrink chat tree action icons`

## 2026-05-20 01:01 WITA - Fix Agent Rename Icon Button

- Status: Pushed
- Areas changed: Fleet agent settings modal styles, changelog
- Summary: Prevent the broad setup-modal header button style from turning the rename pencil control into a large filled square.
- Verification: `pnpm eslint src/app/page.tsx`; `git diff --check -- src/app/fleet.module.css CHANGELOG.md`; Playwright smoke on `localhost:5020` verified the rename control renders as a 32px icon button with the pencil SVG visible.
- Intended commit message: `Fix agent rename icon button`

## 2026-05-20 00:44 WITA - Add Chat Context Choosers

- Status: Pushed
- Areas changed: Chat panel header, machine/agent chooser, directory chooser, chat styles, changelog
- Summary: Replace the static runtime URL subtitle in the Chat panel with two compact tooltip-backed chooser buttons: one for selecting the machine/agent and one for selecting the working directory.
- Verification: `pnpm typecheck`; `pnpm eslint src/app/page.tsx`; `git diff --check -- src/app/page.tsx src/app/chat.module.css CHANGELOG.md`.
- Intended commit message: `Add chat context choosers`

## 2026-05-20 00:39 WITA - Add Chat Tree Start Controls

- Status: Pushed
- Areas changed: Chat sidebar tree, machine/folder start chat controls, Chat manual actions, chat styles, changelog
- Summary: Remove Duplicate/Delete controls from the Chat sidebar, add compact chat buttons to each machine and workspace folder row, and keep empty folders visible so a new chat can be started in that location.
- Verification: `pnpm typecheck`; `pnpm eslint src/app/page.tsx`; `git diff --check -- src/app/page.tsx src/app/chat.module.css CHANGELOG.md`.
- Intended commit message: `Add chat tree start controls`

## 2026-05-20 00:34 WITA - Add Agent Rename Settings

- Status: Pushed
- Areas changed: Fleet agent settings modal, Work board detail ordering, changelog
- Summary: Add inline agent renaming to the settings modal with edit/save/cancel controls, and sort Work board comments/events newest-first so recent delegation failures appear at the top.
- Verification: `pnpm typecheck`; `pnpm eslint src/app/page.tsx`; `git diff --check -- src/app/page.tsx src/app/fleet.module.css CHANGELOG.md`; Playwright smoke on `localhost:5020` verified the settings modal rename control opens with the current name prefilled and shows save/cancel buttons.
- Intended commit message: `Add agent rename settings`

## 2026-05-20 00:30 WITA - Transcribe Chat Voice Input

- Status: Pushed
- Areas changed: Chat composer voice input, attachment content parts, runtime chat API, telemetry collector, chat styles, changelog
- Summary: Stop sending microphone recordings as `input_audio` attachments; use browser speech recognition to transcribe voice into the chat input instead, show a real microphone analyser waveform while listening, and keep images/files as the only non-text content parts forwarded to Hermes.
- Verification: `node --check scripts/agent-telemetry-collector.mjs`; `pnpm typecheck`; `pnpm eslint src/app/page.tsx src/app/api/chat/agent-runtime/route.ts scripts/agent-telemetry-collector.mjs`; `pnpm lint` (warnings only, existing unused-variable warnings); `git diff --check -- src/app/page.tsx src/app/chat.module.css src/app/api/chat/agent-runtime/route.ts scripts/agent-telemetry-collector.mjs CHANGELOG.md`; restarted the local collector; collector chat smoke returned streamed `ok` without any `input_audio` content part.
- Intended commit message: `Transcribe chat voice input`

## 2026-05-20 00:27 WITA - Add Solana x402 Signing

- Status: Pushed
- Areas changed: x402 wallet executor, local x402 smoke endpoint, x402/Solana dependencies, chat voice AudioContext typing, changelog
- Summary: Extend the x402 paid HTTP executor from Base/Base Sepolia to Solana mainnet/devnet by mapping dashboard Solana wallet networks to x402 CAIP-2 network IDs, creating SVM signers from the encrypted local wallet secret, registering the x402 SVM exact scheme with the configured Solana RPC, and adding Solana devnet requirements to the local mock paid endpoint.
- Verification: `pnpm typecheck`; `pnpm lint` (warnings only, existing unused-variable warnings plus an unrelated `attachmentFormat` warning); `git diff --check`; `verify_assimilation_manifest.py`; local `/api/wallet/create` Solana devnet smoke passed; local `/api/wallet/x402` successfully signed and retried the mock paid call with a Solana devnet wallet; negative Solana x402 smokes rejected missing approval, too-low per-payment caps, and network mismatches.
- Intended commit message: `Add Solana x402 signing`

## 2026-05-20 00:20 WITA - Wire x402 Paid Agent Calls

- Status: Pushed
- Areas changed: x402 wallet executor, x402 wallet API route, local x402 smoke endpoint, Wallets UI money-moving controls, agent runtime wallet/tool context, orchestrator tool list, x402 dependencies, AgentCell role props, assimilation manifest
- Summary: Add a real x402 paid HTTP execution path for local Base/Base Sepolia wallets, including x402 payment signing/retry via the encrypted wallet vault, per-payment caps, provider checks, base URL restrictions, `PAY_X402` approval gates, a local dev-only mock paid endpoint for signing smoke tests, and agent-runtime/orchestrator context that exposes `x402_fetch` as a payment tool.
- Verification: `pnpm typecheck`; `pnpm lint` (warnings only, existing unused-variable warnings); `git diff --check`; `verify_assimilation_manifest.py`; local `/api/wallet/create` Base Sepolia smoke passed; local `/api/wallet/x402/mock-paid` returned a 402 challenge; local `/api/wallet/x402` successfully signed and retried the mock paid call with a $0.01 x402 payment; negative x402 smokes rejected missing approval, too-low per-payment caps, and non-x402 providers; `/api/orchestrator` advertises `x402_fetch`.
- Intended commit message: `Wire x402 paid agent calls`

## 2026-05-20 00:19 WITA - Auto Close Chat Attachment Menu

- Status: Pushed
- Areas changed: Chat composer attachment menu, changelog
- Summary: Close the Chat composer attachment menu when clicking/tapping outside it or pressing Escape.
- Verification: `pnpm eslint src/app/page.tsx` (warning only: existing unused `beeRoleLabel` import); `git diff --check -- src/app/page.tsx CHANGELOG.md`.
- Intended commit message: `Auto close chat attachment menu`

## 2026-05-20 00:10 WITA - Restore Fleet Agent Cards

- Status: Pushed
- Areas changed: Fleet machine card agent rows, agent role settings modal, changelog
- Summary: Remove only the inline role editor from Fleet machine cards, keep the selected-agent task actions with their tooltips, and move agent role/class management into a dedicated context-menu settings modal.
- Verification: `pnpm eslint src/app/page.tsx src/components/cells/AgentCell.tsx` (warning only from existing unused chat attachment helper); `git diff --check -- src/app/page.tsx src/components/cells/AgentCell.tsx src/app/fleet.module.css CHANGELOG.md`; Playwright smoke on `localhost:5020` verified Fleet renders and inline role controls are absent from machine cards. `pnpm typecheck` is still blocked by existing chat audio typing around `window.webkitAudioContext`.
- Intended commit message: `Restore Fleet agent cards`

## 2026-05-20 00:04 WITA - Restore Chat Composer Icons

- Status: Pushed
- Areas changed: Chat composer icon button styles, changelog
- Summary: Fix the compact Chat composer controls so the plus, mic, and send icons render instead of being overridden by the older broad chat button styling.
- Verification: `pnpm eslint src/app/page.tsx src/app/chat.module.css` (CSS ignored by ESLint config, page lint clean); `git diff --check -- src/app/chat.module.css CHANGELOG.md`.
- Intended commit message: `Restore chat composer icons`

## 2026-05-19 23:42 WITA - Import Note Tasks Into Ideas

- Status: Pushed
- Areas changed: Markdown note task intake service/API, Work board note intake controls, shared vault settings, changelog
- Summary: Scan folder-backed markdown notes using the existing vault project-tracking conventions, import unchecked tasks and `Next action` sections into Kanban Ideas with idempotency keys, and add an off-by-default auto-import toggle that works with Obsidian, Tailnet-synced folders, or any markdown note provider.
- Verification: `pnpm typecheck`; `pnpm eslint src/app/page.tsx src/app/api/note-intake/route.ts src/lib/services/notes/note-task-intake.ts src/lib/types/agent-runtime.ts`; `git diff --check -- src/app/page.tsx src/app/kanban-board.module.css src/app/api/note-intake/route.ts src/lib/services/notes/note-task-intake.ts src/lib/types/agent-runtime.ts CHANGELOG.md`; local API scan against the configured shared vault found note tasks from `Projects` and `Inbox`.
- Intended commit message: `Import note tasks into Ideas`

## 2026-05-19 23:39 WITA - Slim Chat Composer Controls

- Status: Pushed
- Areas changed: Chat composer controls, attachment menu, file attachment forwarding, chat styles, runtime chat API, telemetry collector
- Summary: Replace the clunky Attach/Record/Send button row with a single compact composer surface: a plus button opens a small menu for images and files, mic and send controls sit as icon-only buttons in the lower-right corner, and generic file attachments are represented and forwarded alongside images and audio.
- Verification: `node --check scripts/agent-telemetry-collector.mjs`; `pnpm typecheck`; `pnpm eslint src/app/page.tsx src/app/api/chat/agent-runtime/route.ts scripts/agent-telemetry-collector.mjs`; `pnpm lint` (warnings only, existing unused-variable warnings); `git diff --check -- src/app/page.tsx src/app/chat.module.css src/app/api/chat/agent-runtime/route.ts scripts/agent-telemetry-collector.mjs CHANGELOG.md ASSIMILATION.json`.
- Intended commit message: `Slim chat composer controls`

## 2026-05-19 23:31 WITA - Retry Working Assignments

- Status: Pushed
- Areas changed: Kanban Working retry dispatch, changelog
- Summary: Treat a user move back into Working with an existing assignee as an explicit retry, dispatching the task to that assigned agent instead of requiring the card to pass through Ready again.
- Verification: `pnpm typecheck`; `pnpm eslint src/app/page.tsx` (warnings only from unrelated existing unused icon imports); `git diff --check -- src/app/page.tsx CHANGELOG.md`.
- Intended commit message: `Retry Working assignments`

## 2026-05-19 23:20 WITA - Add Ready Queue Pickup Dispatch

- Status: Pushed
- Areas changed: Kanban Queen Bee pickup loop, automatic task dispatch, bee assignment ranking, changelog
- Summary: Add a dashboard-side Ready for Queen pickup loop so existing Ready tasks are retried when agents/roles become available, move eligible tasks into Working, dispatch the assignment to the chosen agent runtime, prefer local/chat-capable workers before remote collectors, and mark the task Done with the result or Needs Human if dispatch fails.
- Verification: `pnpm typecheck`; `pnpm eslint src/app/page.tsx src/lib/services/orchestration/bee-roles.ts`; `git diff --check -- src/app/page.tsx src/lib/services/orchestration/bee-roles.ts CHANGELOG.md`; Chrome visual check on `localhost:5020` verified the stale Ready card was picked up automatically and moved out of Ready, with a visible Needs Human error when the selected remote Hermes runtime timed out.
- Intended commit message: `Add Ready queue pickup dispatch`

## 2026-05-19 23:27 WITA - Neutralize Generic Storage Names

- Status: Pushed
- Areas changed: Tailnet vault sync state, local Kanban fallback storage, neutral Kanban/orchestrator/note-intake APIs, Obsidian vault autodetect scoring, MiroShark archive/run labels, changelog
- Summary: Replace generic OpenClaw-branded storage, API, and archive defaults with HivemindOS names while preserving explicit OpenClaw integration references only where they describe the OpenClaw runtime; remove the old OpenClaw Kanban/orchestrator/note-intake compatibility routes so generic work queues and note intake are only exposed through `/api/kanban`, `/api/orchestrator`, and `/api/note-intake`; make bidirectional sync stop after a failed remote snapshot instead of showing a misleading merge plan.
- Verification: `pnpm typecheck`; `pnpm lint` (warnings only: 8 existing unused-variable warnings); `pnpm build` (passed with the existing Turbopack NFT tracing warning and non-blocking bigint fallback notices); `bash -n setup.sh`; `bash -n scripts/install-telemetry-collector.sh`; `git diff --check`; `python3 verify_assimilation_manifest.py`; current-tree sensitive path/token scans returned no matches; generic storage/API scan returned no OpenClaw-branded defaults outside explicit OpenClaw integration docs.
- Intended commit message: `Neutralize generic storage names`

## 2026-05-20 00:46 WITA - Verify Tailnet SSH Setup

- Status: Pushed
- Areas changed: Setup script, telemetry collector installer, Tailnet vault sync docs, changelog
- Summary: Make setup and collector install advertise Tailscale SSH more reliably by trying user and passwordless-sudo paths, accepting both supported `tailscale set --ssh` syntaxes, verifying `RunSSH=true`, and printing the exact remaining admin command when automatic enablement is blocked.
- Verification: `bash -n setup.sh`; `bash -n scripts/install-telemetry-collector.sh`; `git diff --check`; `pnpm typecheck`; reviewed current Tailscale SSH docs for host advertisement and ACL requirements.
- Intended commit message: `Verify Tailnet SSH setup`

## 2026-05-19 23:12 WITA - Clarify Done Card Completion

- Status: Pushed
- Areas changed: Kanban Done card assignment/provenance copy, changelog
- Summary: Stop Done cards from showing contradictory worker assignment labels when they have no assignee; show `Completed by:` with the completing agent when known, or `user` for manually completed cards.
- Verification: `pnpm eslint src/app/page.tsx`; `git diff --check -- src/app/page.tsx CHANGELOG.md`; Chrome visual check on `localhost:5020` verified the Done card and selected task drawer both show `Completed by: user` for a manually completed task.
- Intended commit message: `Clarify Done card completion`

## 2026-05-19 23:06 WITA - Add Real Crypto Wallet Rails

- Status: Pushed
- Areas changed: Wallet API routes, encrypted local wallet vault, Base/Solana USDC balance and transfer services, Wallets UI controls, dependencies, Obsidian sync type fixes
- Summary: Add real throwaway wallet creation for Base and Solana, local encrypted secret storage under the user's home directory, live USDC/native balance polling, explicit capped USDC send actions gated by a `SEND_USDC` confirmation, and dashboard controls to create wallets, refresh balances, and test tiny transfers.
- Verification: `pnpm typecheck`; `pnpm lint` (warnings only, pre-existing unused-variable warnings); `git diff --check`; `pnpm build` (passed with the existing Turbopack NFT tracing warning and non-blocking bigint fallback notices); local `/api/wallet/create` smokes for Solana devnet and Base Sepolia passed; local `/api/wallet/balance` smokes for Solana devnet and Base Sepolia passed; local `/api/wallet/send` safety checks rejected over-cap and missing-confirmation sends; unfunded Solana devnet/Base Sepolia sends reached chain simulation and failed for expected no-funds/no-gas reasons; Playwright browser smoke on `localhost:5020` verified the Wallets tab hydrates and opens after restarting the dev server.
- Intended commit message: `Add real crypto wallet rails`

## 2026-05-19 22:56 WITA - Contain Fleet Role Controls

- Status: Pushed
- Areas changed: Fleet selected-agent role controls, AgentCell expanded layout, changelog
- Summary: Move the Queen Bee/worker role selectors into a compact per-agent disclosure and constrain the selected row content so role controls cannot overflow machine cards.
- Verification: `pnpm eslint src/app/page.tsx src/components/cells/AgentCell.tsx`; `git diff --check -- src/app/page.tsx src/app/fleet.module.css src/components/cells/AgentCell.tsx CHANGELOG.md`; Chrome visual check on `localhost:5020` verified the selected Fleet agent role controls stay inside the machine card when collapsed and expanded. `pnpm typecheck` is currently blocked by unrelated Tailnet vault sync errors in `src/app/page.tsx` and `src/lib/services/obsidian/tailnet-vault-sync.ts`.
- Intended commit message: `Contain Fleet role controls`

## 2026-05-19 22:55 WITA - Add Chat Image And Audio Messages

- Status: Pushed
- Areas changed: Chat composer, chat message rendering, agent runtime chat API, telemetry collector Hermes chat bridge, changelog, assimilation manifest
- Summary: Add image and audio attachments to the Chat composer, including file upload, microphone recording, compact attachment pills, inline image/audio rendering in sent messages, multimodal content-part forwarding through the dashboard runtime API, and collector preservation of `image_url` and `input_audio` parts for Hermes' streaming API path.
- Verification: `node --check scripts/agent-telemetry-collector.mjs`; `pnpm eslint src/app/page.tsx src/app/api/chat/agent-runtime/route.ts scripts/agent-telemetry-collector.mjs`; `pnpm lint` (warnings only, existing unused-variable warnings); `git diff --check -- src/app/page.tsx src/app/chat.module.css src/app/api/chat/agent-runtime/route.ts scripts/agent-telemetry-collector.mjs CHANGELOG.md ASSIMILATION.json`; `verify_assimilation_manifest.py`; restarted the local collector; text streaming collector smoke still returned token-sized SSE chunks; multimodal image collector smoke preserved the media path and now returns an explicit model-support error instead of a blank assistant response when the active Hermes model returns no multimodal text; `pnpm typecheck` is currently blocked by unrelated `src/lib/services/wallet/local-wallet-vault.ts` Buffer/CipherKey typing errors.
- Intended commit message: `Add chat image and audio messages`

## 2026-05-19 22:51 WITA - Clarify Ready For Queen Cards

- Status: Pushed
- Areas changed: Kanban card assignment copy, changelog
- Summary: Stop Ready for Queen cards from displaying stale worker assignees; show a neutral Ready badge and Queen Bee waiting state until the task is actually claimed into Working.
- Verification: `pnpm typecheck`; `pnpm eslint src/app/page.tsx` (warnings only from unrelated existing unused chat attachment symbols); `git diff --check -- src/app/page.tsx CHANGELOG.md`.
- Intended commit message: `Clarify Ready for Queen cards`

## 2026-05-19 22:49 WITA - Show Bee Assignees On Kanban Cards

- Status: Pushed
- Areas changed: Kanban card assignment UI, worker class labels, changelog
- Summary: Show Queen Bee or worker bee icons directly on Kanban cards with the assigned agent name and role label, including clearer labels such as Engineer worker bee and Planner worker bee.
- Verification: `pnpm typecheck`; `pnpm eslint src/app/page.tsx src/lib/types/agent-runtime.ts src/lib/services/orchestration/bee-roles.ts` passed; `pnpm eslint src/app/kanban-board.module.css` returned the expected ignored-file warning because ESLint is not configured for CSS; `git diff --check -- src/app/page.tsx src/app/kanban-board.module.css src/lib/types/agent-runtime.ts src/lib/services/orchestration/bee-roles.ts CHANGELOG.md`.
- Intended commit message: `Show bee assignees on Kanban cards`

## 2026-05-19 22:48 WITA - Add Tailnet Vault Sync

- Status: Pushed
- Areas changed: Obsidian vault sync API, Tailnet rsync service, shared vault settings UI, README, agent runtime context, roadmap, assimilation manifest
- Summary: Replace Obsidian Sync-as-requirement language with provider-neutral folder sync copy, explicitly state that no Obsidian subscription is required for local vault use, and add built-in Tailscale SSH + rsync vault sync with dry-run, bidirectional baseline merge, conflict copies, live polling, safe exclusions, one-step setup prep for rsync/Tailscale SSH, and local fallback.
- Verification: `pnpm typecheck`; `pnpm lint` (warnings only: existing unused variables); `pnpm build` (passed with existing Turbopack NFT tracing warning and non-blocking bigint fallback notices); `bash -n setup.sh`; `bash -n scripts/install-telemetry-collector.sh`; `git diff --check`; `verify_assimilation_manifest.py`; production route manifest includes `/api/obsidian/sync`; current-tree sensitive path/token scans returned no matches.
- Intended commit message: `Add Tailnet vault sync`

## 2026-05-19 22:40 WITA - Add Queen Bee Kanban Automation

- Status: Pushed
- Areas changed: Kanban workflow model, agent colony roles, Queen Bee assignment logic, orchestrator API/event surface, agent runtime context, Work board UI, changelog
- Summary: Replace the generic Triage/Todo/Ready/Running/Blocked board with a simpler Ideas, Ready for Queen, Working, Needs Human, Done workflow. Add Queen Bee and worker-class metadata to agents, expose role controls in Fleet, auto-claim cards moved into Ready for Queen by choosing a Queen/worker and moving them to Working, preserve Needs Human as an optional exception lane, expose an MCP-ready orchestrator API surface for listing tools, ready tasks, agents, roles, and assignment recommendations, and add an SSE event stream for Queen Bee watchers.
- Verification: `pnpm typecheck`; `pnpm eslint src/app/page.tsx src/components/cells/AgentCell.tsx src/lib/types/kanban.ts src/lib/types/agent-runtime.ts src/lib/services/kanban/local-kanban-store.ts src/lib/services/orchestration/bee-roles.ts src/app/api/orchestrator/route.ts src/app/api/orchestrator/events/route.ts src/app/api/chat/agent-runtime/route.ts`; `git diff --check -- src/app/page.tsx src/components/cells/AgentCell.tsx src/lib/types/kanban.ts src/lib/types/agent-runtime.ts src/lib/services/kanban/local-kanban-store.ts src/lib/services/orchestration/bee-roles.ts src/app/api/orchestrator/route.ts src/app/api/orchestrator/events/route.ts src/app/api/chat/agent-runtime/route.ts src/app/kanban-board.module.css CHANGELOG.md ASSIMILATION.json`; `verify_assimilation_manifest.py`.
- Intended commit message: `Add Queen Bee Kanban automation`

## 2026-05-19 22:46 WITA - Add Obsidian Agent Notifications

- Status: Pushed
- Areas changed: Dashboard navigation and notifications tab, Obsidian notification storage/API, shared vault runtime context, vault settings, notification styles, assimilation manifest
- Summary: Add a badge-backed Alerts tab that reads agent-authored markdown notifications from a dedicated `agent-notifications` vault folder, persists read receipts and notification settings beside the notes, supports mark-read and mark-all-read flows, pages the feed with endless scrolling, and exposes a disabled-by-default high-priority messaging escalation preference for Hermes/OpenClaw or another messaging agent to honor.
- Verification: `pnpm typecheck`; `pnpm eslint src/app/page.tsx src/app/api/openclaw/notifications/route.ts src/lib/services/obsidian/agent-notifications.ts src/lib/types/agent-notifications.ts src/lib/types/agent-runtime.ts src/app/api/chat/agent-runtime/route.ts` (warnings only: existing unused page symbols); `pnpm build` (passed with existing Turbopack NFT tracing warning via `src/app/api/openclaw/skill-prefs/route.ts`); notifications API smoke against the shared vault returned `ok: true`, `folder: agent-notifications`, zero notifications, and disabled high-priority messaging; Playwright production smoke on `next start -p 5023` verified the Alerts tab, empty state, escalation toggle copy, and no horizontal overflow at 1440x1000 and 390x844; `git diff --check -- src/app/page.tsx src/app/globals.css src/app/api/openclaw/notifications/route.ts src/lib/services/obsidian/agent-notifications.ts src/lib/types/agent-notifications.ts src/lib/types/agent-runtime.ts src/app/api/chat/agent-runtime/route.ts src/app/notifications.module.css CHANGELOG.md ASSIMILATION.json`; `verify_assimilation_manifest.py`.
- Intended commit message: `Add Obsidian agent notifications`

## 2026-05-19 22:12 WITA - Clean Chat History Sources

- Status: Pushed
- Areas changed: Chat sidebar history filtering, Fleet snapshot Hermes message parsing, telemetry collector Hermes message parsing
- Summary: Keep file/log/session artifact rows out of the Chat history tree so runtime JSON schemas and logs are not shown as conversations; extract user-facing response text from Hermes JSON assistant payloads and ignore reasoning/internal fields before building chat previews and transcripts.
- Verification: `node --check scripts/agent-telemetry-collector.mjs`; `pnpm typecheck`; `pnpm lint` (warnings only, pre-existing unused-variable warnings); `git diff --check -- src/app/page.tsx src/app/api/fleet/snapshot/route.ts scripts/agent-telemetry-collector.mjs CHANGELOG.md`; local collector snapshot smoke verified Hermes state rows are readable while file/log artifact rows remain available to Fleet but are now filtered out of Chat.
- Intended commit message: `Clean chat history sources`

## 2026-05-19 22:24 WITA - Use Hermes API Streaming For Collector Chat

- Status: Pushed
- Areas changed: Telemetry collector Hermes chat streaming
- Summary: Route collector `/chat` streaming requests through Hermes' OpenAI-compatible API server so Chat receives real `stream_delta_callback` SSE chunks; lazily start the local Hermes API server on `127.0.0.1:8642` when needed and keep the old `hermes -z` path only as a fallback.
- Verification: `node --check scripts/agent-telemetry-collector.mjs`; `pnpm typecheck`; `pnpm lint` (warnings only, existing unused-variable warnings); `git diff --check -- scripts/agent-telemetry-collector.mjs src/app/page.tsx src/app/api/fleet/snapshot/route.ts CHANGELOG.md`; restarted the local LaunchAgent collector; `curl -N` collector `/chat` probe returned `x-hermes-stream-source: api-server`, `Transfer-Encoding: chunked`, and many token-sized SSE `delta.content` chunks before `[DONE]`; Hermes API health returned `{"status": "ok", "platform": "hermes-agent"}`.
- Intended commit message: `Use Hermes API streaming for collector chat`

## 2026-05-19 01:51 WITA - Add Collector Hermes Chat Bridge

- Status: Pushed
- Areas changed: Telemetry collector
- Summary: Add a private collector `/chat` bridge for Hermes CLI messages, advertise chat capability from `/health`, and update the advertised collector update command to pull latest code and restart the collector without a full dashboard build.
- Verification: `node --check scripts/agent-telemetry-collector.mjs`; `git diff --check -- scripts/agent-telemetry-collector.mjs CHANGELOG.md`; pushed hotfix commit `5e4f143` to `origin/main`; Ubuntu collector pulled commit `5e4f143`, but its running collector process still needs restart because `/health` does not yet report capabilities and `/chat` still returns not found.
- Intended commit message: `Add collector Hermes chat bridge`

## 2026-05-19 10:03 WITA - Stop Stale Collector Listener During Install

- Status: Pushed
- Areas changed: Telemetry collector installer
- Summary: Stop any existing process listening on the telemetry collector port before restarting the systemd user service so old manually-started collectors cannot keep serving stale code after an update.
- Verification: `bash -n scripts/install-telemetry-collector.sh`; `git diff --check -- scripts/install-telemetry-collector.sh` passed.
- Intended commit message: `Stop stale collector listener during install`

## 2026-05-19 16:09 WITA - Harden Open Source Defaults

- Status: Pushed
- Areas changed: Obsidian defaults, Obsidian vault auto-detection, environment example, ignore rules, dependency security updates, changelog sanitization, open-source readiness scan
- Summary: Replace personal Obsidian vault and CLI defaults with generic configurable values, auto-detect common local Obsidian vault locations when no explicit vault is configured, keep secrets in env placeholders, add ignore guardrails for common secret/local artifact types, sanitize changelog verification notes that captured local machine paths, and update Next/ws/PostCSS resolution to clear known audit advisories.
- Verification: `pnpm typecheck`; `pnpm lint` (warnings only: existing unused variables); `pnpm build` (passed with existing Turbopack NFT tracing warning); `pnpm audit --audit-level moderate` (no known vulnerabilities); `git diff --check`; branch-history and current-tree secret/path scans for private keys, API tokens, local absolute home paths, private Tailnet IPs, MagicDNS hostnames, Tailscale auth keys, and the old personal vault name returned no matches; local artifact scan found only `.env.example`.
- Intended commit message: `Harden open source defaults and dependency security`

## 2026-05-19 16:18 WITA - Stream Hermes Chat Collector Responses

- Status: Pushed
- Areas changed: Hermes telemetry collector chat bridge, Chat composer waiting/streaming labels, changelog
- Summary: Make the collector `/chat` endpoint honor `stream: true` by spawning Hermes and forwarding stdout chunks as SSE deltas instead of always buffering `hermes -z` through `execFileAsync`; keep the existing JSON response path for non-streaming callers; update the Chat UI so it says Waiting until the first response chunk arrives and only says Streaming after real content starts.
- Verification: `node --check scripts/agent-telemetry-collector.mjs`; `pnpm typecheck`; `pnpm lint` (warnings only, existing unused-variable warnings); `git diff --check -- src/app/page.tsx scripts/agent-telemetry-collector.mjs CHANGELOG.md`.
- Intended commit message: `Stream Hermes collector chat responses`

## 2026-05-19 16:00 WITA - Quiet Machine Card Actions

- Status: Pushed
- Areas changed: Machine cell action sizing, Fleet machine action menu, changelog
- Summary: Reduce the visual weight of machine-card Connect and plus actions so they read as compact card controls instead of large competing CTAs.
- Verification: `pnpm eslint src/app/page.tsx src/components/cells/MachineCell.tsx`; `git diff --check -- src/app/page.tsx src/components/cells/MachineCell.tsx CHANGELOG.md`.
- Intended commit message: `Quiet machine card actions`

## 2026-05-19 15:58 WITA - Restore Clean App Font Stack

- Status: Pushed
- Areas changed: Global typography, changelog
- Summary: Replace the resurfaced `Avenir Next` / `DIN Alternate` body font stack with the intended native system UI stack so the chunky display face does not reappear across the dashboard.
- Verification: `rg -n "Avenir Next|DIN Alternate" src package.json public .env.example` returned no matches; `git diff --check -- src/app/globals.css CHANGELOG.md`; `pnpm eslint src/app/globals.css` returned only the expected ignored-file warning because ESLint is not configured for CSS files.
- Intended commit message: `Restore clean app font stack`

## 2026-05-19 15:37 WITA - Add Beehive Light Theme Toggle

- Status: Pushed
- Areas changed: Dashboard theme state, shared global theme tokens, app shell sidebar controls, assimilation manifest
- Summary: Add a sun/moon sidebar toggle that switches between the existing dark dashboard and a persisted hive-light mode with bee and beehive inspired honey, pollen, and comb colors, tune the light palette down to a washed-out wax/parchment range, restyle cell context-menu triggers/popovers, status chips, machine setup/update controls, and feature tab content so Fleet, Work, Swarm, Wallets, Brain, and Chat stay readable in light mode. Clean up the Chat panel layout so the composer fills its container and no longer leaves a large empty grid row below the input.
- Verification: `pnpm typecheck`; `pnpm eslint src/app/page.tsx src/components/cells/CellMenu.tsx src/components/cells/MachineCell.tsx src/components/cells/StatusPill.tsx`; `pnpm build` (passed with the existing Turbopack NFT tracing warning for `next.config.ts` via `src/app/api/openclaw/skill-prefs/route.ts`); `git diff --check -- src/app/page.tsx src/app/globals.css src/app/fleet.module.css src/app/kanban-board.module.css src/app/miroshark.module.css src/app/wallets.module.css src/app/vault.module.css src/app/chat.module.css src/components/cells/CellMenu.tsx src/components/cells/MachineCell.tsx src/components/cells/StatusPill.tsx CHANGELOG.md`; `verify_assimilation_manifest.py`; Playwright production smoke against `next start -p 5021` verified the sun/moon toggle, persisted light/dark localStorage state, hive-light CSS variables/background, and Fleet, Work, Swarm, Wallets, Brain, and Chat tabs with no horizontal overflow at 1440x1000 and 390x844. Follow-up strict light-mode sweep at 1440x1000 and 390x844 clicked Fleet machine menus and visited Fleet, Work, Swarm, Wallets, Brain, and Chat with zero large dark-background leftovers and no overflow. Follow-up Swarm template shelf smoke injected a sample template card into the real CSS-module template list and verified the card background, border, title, and metadata colors resolve to hive-light tokens. Follow-up Chat rail smoke verified machine metadata and empty-state copy use warm hive-light muted text instead of blue-gray. Follow-up Chat layout smoke with a seeded Hermes profile verified the textarea fills the composer field, the composer-to-hint gap is 8px, the hint-to-panel-bottom gap is 19px, and there is no overflow.
- Intended commit message: `Add beehive light theme toggle`

## 2026-05-19 14:55 WITA - Clarify MiroShark Template Refresh

- Status: Pushed
- Areas changed: Swarm MiroShark run builder
- Summary: Replace the vague builder-level Sync action with an explicit Refresh templates action beside the template count, making it clear the button reloads MiroShark-provided templates and metadata.
- Verification: `pnpm typecheck`; `pnpm eslint src/app/page.tsx` (warnings only from unrelated brain graph helpers); `git diff --check -- src/app/page.tsx src/app/miroshark.module.css CHANGELOG.md`; Playwright verified the Swarm tab no longer shows `Sync` and the template shelf shows `Refresh templates`.
- Intended commit message: `Clarify MiroShark template refresh`

## 2026-05-19 14:53 WITA - Add Shared Brain Graph And Access History

- Status: Pushed
- Areas changed: Brain/Vault dashboard UI, Obsidian graph API, Obsidian access audit API, Obsidian note-open API, shared vault runtime instructions, Vault CSS module, assimilation manifest
- Summary: Replace the bare shared-brain vault surface with a touching-cell hive graph built from markdown wikilinks, segmented cell-edge connection paths, selectable note inspection, drag-to-pan navigation, second-click note opening in Obsidian, graph stats, and per-note access history. Add vault-backed brain access logging under `Projects/HivemindOS/Brain Access/access-log.jsonl` so dashboard/agent note inspections record timestamp, agent, runtime, and machine.
- Verification: `pnpm typecheck`; `pnpm eslint src/app/page.tsx src/app/api/obsidian/graph/route.ts src/app/api/obsidian/access/route.ts src/app/api/obsidian/open/route.ts src/lib/services/obsidian/brain-graph.ts src/app/api/chat/agent-runtime/route.ts`; `git diff --check -- src/lib/services/obsidian/brain-graph.ts src/app/api/obsidian/graph/route.ts src/app/api/obsidian/access/route.ts src/app/api/obsidian/open/route.ts src/app/api/chat/agent-runtime/route.ts src/app/page.tsx src/app/vault.module.css CHANGELOG.md ASSIMILATION.json`; local API smoke for `/api/obsidian/graph` returned the HivemindOS Vault graph; local API smoke for `/api/obsidian/access` wrote a Codex inspection event for `DAILY-BRIEF.md`; local API smoke for `/api/obsidian/open` opened `DAILY-BRIEF.md` in Obsidian; standalone Playwright SVG render using the real vault graph verified a continuous selected-cell border route with no diagonals through cell interiors; `verify_assimilation_manifest.py`.
- Intended commit message: `Add shared brain graph and access history`

## 2026-05-19 14:52 WITA - Scope Dashboard Feature Styles

- Status: Pushed
- Areas changed: Dashboard CSS ownership, Fleet/agent rail styles, Chat styles, Vault styles, Wallet styles, Swarm/MiroShark styles, global stylesheet
- Summary: Move feature-owned dashboard rules out of `src/app/globals.css` into CSS modules for Fleet, Chat, Vault, Wallets, and MiroShark while preserving the existing JSX structure and UI appearance. Leave `globals.css` focused on imports, design tokens, reset/base element rules, shared app shell/navigation, `.tabPanel`, and the small `.hint` utility.
- Verification: `pnpm typecheck`; `pnpm eslint src/app/page.tsx` (warnings only for existing unused brain graph code); `pnpm build` (passed with an existing Turbopack NFT tracing warning for `next.config.ts` via `src/app/api/openclaw/skill-prefs/route.ts`); `git diff --check`; `rg -n '\\.(agentRail|taskPanel|historyPanel|swarmPanel|miroshark|vaultPanel|walletPanel|settings|chat|messages|message|machineTree|setupModal|addAgent|quickConnect|machineBoard|wallet|vault|swarmGrid)' src/app/globals.css || true`; Playwright smoke verified Fleet, Work, Swarm, Wallets, Brain, and Chat tabs at 1440x1000 and 390x844 with no horizontal overflow.
- Intended commit message: `Scope dashboard feature styles`

## 2026-05-19 14:42 WITA - Remove MiroShark Capability Strip

- Status: Pushed
- Areas changed: Swarm MiroShark workspace
- Summary: Remove the decorative MiroShark capability summary cards from the workspace body so the main area starts directly with the run builder or selected saved simulation.
- Verification: Pending.
- Intended commit message: `Remove MiroShark capability strip`

## 2026-05-19 14:34 WITA - Add Tasks Directly To Kanban Lanes

- Status: Pushed
- Areas changed: Kanban Work board task creation UI, Kanban styling scope, changelog
- Summary: Remove the top "What needs doing?" task input and let users add tasks directly from each board lane with a compact plus button or empty-lane add action. Move the Work board's section-specific styles into a dedicated CSS module instead of keeping Kanban layout rules in `globals.css`.
- Verification: `pnpm typecheck`; `pnpm eslint src/app/page.tsx`; `git diff --check -- src/app/page.tsx src/app/globals.css src/app/kanban-board.module.css CHANGELOG.md`; `rg -n "kanban" src/app/globals.css` returned no matches. Playwright loaded the existing `127.0.0.1:5020` dashboard with no horizontal overflow and confirmed the old "What needs doing?" input is gone, but the already-running dev session would not switch tabs in headless mode and blocked starting a fresh second dev server, so lane visual QA still needs an interactive browser pass.
- Intended commit message: `Add lane-level Kanban task creation`

## 2026-05-19 14:22 WITA - Merge Manual Agents With Discovered Agents

- Status: Pushed
- Areas changed: Agent identity dedupe, agent activity history, add-agent defaults, changelog
- Summary: Treat same-machine same-runtime manually added agents as aliases of the collector-discovered agent, hide the duplicate saved profile, and merge local dashboard chat/tasks from the saved profile into the visible discovered profile so newly sent work appears alongside collector history.
- Verification: `pnpm typecheck`; `pnpm eslint src/app/page.tsx`; `git diff --check -- src/app/page.tsx`.
- Intended commit message: `Merge manual agents with discovered agents`

## 2026-05-19 14:18 WITA - Compact Fleet Task Actions

- Status: Pushed
- Areas changed: Fleet agent task rows, Radix tooltip usage
- Summary: Replace cramped Track, Resume, and Working text labels in expanded Fleet task rows with icon-only controls and custom hover tooltips.
- Verification: `pnpm typecheck`; `pnpm lint` (warnings only, pre-existing unused-variable warnings); browser smoke opened the local dashboard on the existing `127.0.0.1:5020` dev server, though no live collector tasks were present for a visual row check.
- Intended commit message: `Compact fleet task action buttons`

## 2026-05-19 14:07 WITA - Clean Up MiroShark History Status Copy

- Status: Pushed
- Areas changed: Swarm MiroShark history rail
- Summary: Move archive status under the Saved simulations heading and remove the confusing companion rows label from the user-facing history rail.
- Verification: `pnpm typecheck`; `pnpm eslint src/app/page.tsx`; `git diff --check -- src/app/page.tsx src/app/globals.css CHANGELOG.md`; Playwright verified the history rail now reads New Simulation, Past runs, Saved simulations, Refresh, Obsidian archive, Auto-saving runs with no companion rows copy and with the status below the heading.
- Intended commit message: `Clean up MiroShark history status copy`

## 2026-05-19 14:05 WITA - Add Playwright QA Dependency

- Status: Pushed
- Areas changed: Playwright dev dependency, package lock, changelog
- Summary: Add Playwright as a development dependency and install its Chromium browser so local UI screenshot and browser-smoke checks can run from the workspace.
- Verification: `pnpm add -D playwright`; `pnpm exec playwright install chromium`; `node -e "import('playwright').then(async ({ chromium }) => { const browser = await chromium.launch({ headless: true }); const version = await browser.version(); await browser.close(); console.log(version); })"` returned Chromium `148.0.7778.96`; `git diff --check -- package.json pnpm-lock.yaml CHANGELOG.md`.
- Intended commit message: `Add Playwright QA dependency`

## 2026-05-19 14:01 WITA - Simplify Kanban First Use

- Status: Pushed
- Areas changed: Kanban Work tab UI, Kanban responsive CSS, agent task tracking action, assimilation manifest
- Summary: Reduce the Work board's first-screen complexity by renaming it to Work Board, replacing the full storage path with a compact sync pill, moving board creation and filters into disclosure controls, turning the task composer into a one-field command bar labeled "What needs doing?" with secondary fields behind an icon options popover, hiding the detail drawer until a task is selected, showing a first-run prompt on empty boards, and keeping only core empty lanes visible until optional statuses contain work.
- Verification: `pnpm typecheck`; `pnpm eslint src/app/page.tsx src/components/cells/AgentTaskList.tsx src/lib/services/kanban/local-kanban-store.ts src/app/api/kanban/route.ts` (one unrelated existing MiroShark unused-variable warning was observed before the targeted rerun passed); `git diff --check -- src/app/page.tsx src/app/globals.css CHANGELOG.md`; Playwright loaded the local app with no horizontal overflow, though the current dev session did not switch from Fleet to Work in headless mode, so final visual QA still needs an interactive browser pass.
- Intended commit message: `Simplify Kanban first use`

## 2026-05-19 13:43 WITA - Redesign MiroShark Workbench Navigation

- Status: Pushed
- Areas changed: Swarm MiroShark layout, history navigation, new simulation builder, saved run detail placement
- Summary: Rework the Swarm MiroShark screen into a master-detail workspace with a left history rail, primary New Simulation action, body-level run builder, and selected saved runs opening in the same main body area instead of stacking below the builder.
- Verification: `pnpm typecheck`; `pnpm eslint src/app/page.tsx`; `git diff --check -- src/app/page.tsx src/app/globals.css CHANGELOG.md`; Playwright QA on `http://localhost:5020` verified Swarm opens with a left history rail and right body builder, New Simulation shows only the builder in the body, selecting a saved run replaces the body with the run detail, the old archive block is gone, active history state is visible, and desktop/mobile have no horizontal overflow.
- Intended commit message: `Redesign MiroShark workbench navigation`

## 2026-05-19 12:23 WITA - Integrate Kanban With Shared Vault Storage

- Status: Pushed
- Areas changed: Kanban storage/API, shared vault config, dashboard Work/Vault UI, agent task tracking action, agent runtime context, README, roadmap, environment example, assimilation manifest
- Summary: Make the Work board prefer the configured shared vault for `kanban.json` board storage, migrate existing local boards into the vault when first opened, expose storage metadata in the API/UI, let observed agent activity rows be promoted into Kanban tasks, pass the Kanban folder into agent runtime context, and keep `~/.hivemindos/kanban` as an explicit local fallback.
- Verification: `pnpm typecheck`; `pnpm eslint src/app/page.tsx src/components/cells/AgentTaskList.tsx src/lib/services/kanban/local-kanban-store.ts src/app/api/kanban/route.ts`; `git diff --check -- src/lib/types/agent-runtime.ts src/lib/services/kanban/local-kanban-store.ts src/app/api/kanban/route.ts src/app/api/chat/agent-runtime/route.ts src/app/page.tsx src/app/globals.css README.md ROADMAP.md .env.example CHANGELOG.md ASSIMILATION.json`; Kanban API smoke read against `127.0.0.1:5020` with the shared vault path returned `storage.source: "obsidian"` and created `~/Documents/Obsidian/HivemindOS Vault/Projects/HivemindOS/Kanban/kanban.json`; `verify_assimilation_manifest.py`.
- Intended commit message: `Integrate Kanban with shared vault storage`

## 2026-05-19 11:54 WITA - Expand MiroShark Swarm Workbench

- Status: Pushed
- Areas changed: MiroShark API proxy, Swarm dashboard UI/UX, simulation surfaces, templates, analysis, observability, exports, publish admin auth, Kanban verification blockers
- Summary: Replace the X-only Swarm experience with a broader MiroShark workbench that exposes multiple simulation surfaces, templates, live telemetry, analysis panels, director inject/fork/branch/stop/publish controls, one-click MiroShark publish-auth setup, archive history, and export links from the real companion API.
- Verification: `pnpm typecheck`; `pnpm eslint src/app/page.tsx src/app/api/miroshark/swarm/route.ts src/app/api/miroshark/manage/route.ts src/lib/services/miroshark/companion-client.ts src/lib/services/kanban/local-kanban-store.ts`; `git diff --check -- src/app/page.tsx src/app/globals.css src/app/api/miroshark/swarm/route.ts src/app/api/miroshark/manage/route.ts src/lib/services/miroshark/companion-client.ts src/lib/services/kanban/local-kanban-store.ts .env.example CHANGELOG.md`; MiroShark metadata API returned 6 templates, 12 history rows, 30 telemetry events, and 20 LLM calls; run-data API for `sim_c7764ee3341b` returned 30 X posts plus analysis/telemetry payloads; Playwright UI QA passed Swarm nav, template selection, archive loading, all workbench tabs, all surface switches, disabled archived live-inject state, publish button presence, and horizontal-overflow checks; live run `sim_af3a74aeb083` started through OpenClaw and returned posts; fork `sim_a1daa9919117`, counterfactual branch `sim_ad271aca028d`, live injection, stop, publish-auth configuration, MiroShark restart, and successful publish for `sim_af3a74aeb083` were exercised against MiroShark.
- Intended commit message: `Expand MiroShark swarm workbench`

## 2026-05-19 11:27 WITA - Remove X Post Header Bar

- Status: Pushed
- Areas changed: MiroShark simulated X thread
- Summary: Remove the top `Post` header bar from the simulated X surface so the thread starts directly with the central post.
- Verification: `pnpm typecheck`; `pnpm eslint src/app/page.tsx`; `git diff --check -- src/app/page.tsx src/app/miroshark-x-thread.module.css CHANGELOG.md`; `rg` confirmed the header/topbar references are gone.
- Intended commit message: `Remove X post header bar`

## 2026-05-19 11:25 WITA - Remove Duplicate X Counts Row

- Status: Pushed
- Areas changed: MiroShark simulated X thread
- Summary: Remove the separate main-post repost/like/view counts strip and keep those metrics only in the X-style icon action row.
- Verification: `pnpm typecheck`; `pnpm eslint src/app/page.tsx`; `git diff --check -- src/app/page.tsx src/app/miroshark-x-thread.module.css CHANGELOG.md`; `rg` confirmed the removed counts strip selectors/usages are gone.
- Intended commit message: `Remove duplicate X counts row`

## 2026-05-19 11:22 WITA - Replace Chunky App Font

- Status: Pushed
- Areas changed: Global typography, Swarm navigation labels, MiroShark X thread typography
- Summary: Remove the old `Avenir Next` / `DIN Alternate` global font stack, replace it with a cleaner native system UI stack, and reduce the heaviest weights in the nav and X thread labels so titles/usernames no longer render with the chunky display-face look.
- Verification: `pnpm typecheck`; `pnpm eslint src/app/page.tsx`; `git diff --check -- src/app/globals.css src/app/miroshark-x-thread.module.css CHANGELOG.md`; `rg -n "Avenir Next|DIN Alternate" src package.json public .env.example` returned no matches.
- Intended commit message: `Replace chunky app font`

## 2026-05-19 11:09 WITA - Make MiroShark Feed A Real X Post Thread

- Status: Pushed
- Areas changed: Swarm dashboard MiroShark feed UI
- Summary: Rework the simulated X surface around one central main post with comments beneath it, using X-like spacing, metadata, engagement counts, action row, top Post bar, and constrained single-column layout instead of treating every generated message as a standalone post. Move the X thread styling into a CSS Module and explicitly force the mounted surface to block layout so legacy feed flex rules cannot turn the post surface into columns again.
- Verification: `pnpm typecheck`; `pnpm eslint src/app/page.tsx`; `git diff --check -- src/app/page.tsx src/app/globals.css src/app/miroshark-x-thread.module.css CHANGELOG.md`; `rg` confirmed there is no remaining broad `.mirosharkRunFeed > div` selector and the mounted X surface has a block-layout guard.
- Intended commit message: `Make MiroShark feed a real X post thread`

## 2026-05-19 10:08 WITA - Render MiroShark Posts As X Thread

- Status: Pushed
- Areas changed: Swarm dashboard MiroShark feed UI
- Summary: Replace the plain log-style MiroShark post list with an X-style simulated thread, including root post emphasis, reply cards, avatars, handles, round/post metadata, and familiar reply/repost/like/view actions.
- Verification: `pnpm typecheck`; `pnpm eslint src/app/page.tsx`; `git diff --check -- src/app/page.tsx src/app/globals.css CHANGELOG.md` passed.
- Intended commit message: `Render MiroShark posts as X thread`

## 2026-05-19 09:59 WITA - Show Archived MiroShark Runs As Complete

- Status: Pushed
- Areas changed: MiroShark archive summaries, Swarm dashboard history cards, loaded archive run status
- Summary: Normalize saved MiroShark run history to display `complete` instead of stale captured `running` status, and show loaded archive run step/status as complete.
- Verification: `pnpm typecheck`; `pnpm eslint src/app/page.tsx src/app/api/miroshark/runs/route.ts`; `git diff --check -- src/app/page.tsx src/app/api/miroshark/runs/route.ts CHANGELOG.md`; archive list API now returns `complete` for both saved runs with posts.
- Intended commit message: `Show archived MiroShark runs as complete`

## 2026-05-19 02:50 WITA - Clarify Loaded MiroShark Archives

- Status: Pushed
- Areas changed: Swarm dashboard archived MiroShark run display
- Summary: Mark loaded Obsidian MiroShark runs as archived snapshots, show `Saved run`/`saved snapshot` instead of live runner status, hide the live refresh button for archive loads, and rename the feed to `Saved posts` so snapshots are not mistaken for active simulations.
- Verification: `pnpm typecheck`; `pnpm eslint src/app/page.tsx`; `git diff --check -- src/app/page.tsx src/app/globals.css CHANGELOG.md` passed.
- Intended commit message: `Clarify loaded MiroShark archives`

## 2026-05-19 02:37 WITA - Fix Default Obsidian Vault Path

- Status: Pushed
- Areas changed: Shared vault defaults, MiroShark run archive, Obsidian status API, environment example
- Summary: Replace the stale `HivemindOS Vault` default with the configured `HivemindOS Vault`, migrate stale browser-stored vault config on load, and make server-side MiroShark archive/status requests fall back to the real vault when old clients still send the legacy path.
- Verification: `pnpm typecheck`; `pnpm eslint src/app/page.tsx src/app/api/miroshark/runs/route.ts src/app/api/obsidian/status/route.ts src/lib/types/agent-runtime.ts`; `git diff --check -- src/lib/types/agent-runtime.ts .env.example src/app/page.tsx src/app/api/miroshark/runs/route.ts src/app/api/obsidian/status/route.ts CHANGELOG.md`; legacy `~/Documents/Obsidian/HivemindOS Vault` status/archive requests now resolve to `~/Documents/Obsidian/HivemindOS Vault`.
- Intended commit message: `Fix default Obsidian vault path`

## 2026-05-19 02:31 WITA - Order MiroShark Timeline And Progress

- Status: Pushed
- Areas changed: Swarm dashboard MiroShark feed ordering, round labels, progress UI
- Summary: Sort MiroShark posts into explicit timeline order by simulation round and post id, label each post with its round, add a determinate round-progress bar when total rounds are known, and reuse observed post rounds when MiroShark's run-status current round lags behind the posts API.
- Verification: `pnpm typecheck`; `pnpm eslint src/app/page.tsx`; `git diff --check -- src/app/page.tsx src/app/globals.css CHANGELOG.md`; live API check confirmed MiroShark returned shuffled descending ids/ticks for `sim_c7764ee3341b`, so ordering is now imposed in the dashboard instead of trusting backend order.
- Intended commit message: `Order MiroShark timeline and progress`

## 2026-05-19 02:25 WITA - Add MiroShark Run Loading State

- Status: Pushed
- Areas changed: Swarm dashboard run controls, MiroShark run progress UI
- Summary: Add a visible animated MiroShark run-progress panel that appears during queued/setup/ontology/graph/profile-prep/start phases, uses the hive Lottie plus a CSS animated progress rail, and keeps the run button in a true loading state while setup is in flight.
- Verification: `pnpm typecheck`; `pnpm eslint src/app/page.tsx`; `git diff --check -- src/app/page.tsx src/app/globals.css CHANGELOG.md` passed.
- Intended commit message: `Add MiroShark run loading state`

## 2026-05-19 02:15 WITA - Archive MiroShark Runs In Obsidian

- Status: Pushed
- Areas changed: MiroShark swarm proxy, MiroShark run archive API, Swarm dashboard history controls, Obsidian project archive
- Summary: Save MiroShark simulation runs into the configured Obsidian vault under `Projects/HivemindOS/MiroShark Simulations`, including an index, per-run Markdown summaries, exact JSON payloads, post exports, timeline exports, automatic save-on-update behavior, and Swarm-tab controls to reload saved runs after the app is closed.
- Verification: `pnpm typecheck`; `pnpm eslint src/app/page.tsx src/app/api/miroshark/swarm/route.ts src/app/api/miroshark/runs/route.ts`; `git diff --check -- src/app/page.tsx src/app/globals.css src/app/api/miroshark/swarm/route.ts src/app/api/miroshark/runs/route.ts CHANGELOG.md`; saved `sim_c7764ee3341b` through `/api/miroshark/runs` into `~/Documents/Obsidian/HivemindOS Vault/Projects/HivemindOS/MiroShark Simulations`, verified the archive index, and loaded the run back with 30 visible posts. Full `pnpm lint` is still blocked by unrelated existing lint errors in `src/components/ui/lottie-player.tsx`.
- Intended commit message: `Archive MiroShark runs in Obsidian`

## 2026-05-19 02:05 WITA - Replace Square Background With Honeycomb

- Status: Pushed
- Areas changed: Global site background
- Summary: Replace the square page grid with layered shared-edge CSS honeycomb cells while preserving the existing teal and amber ambient washes.
- Verification: `git diff --check -- src/app/globals.css CHANGELOG.md` passed; in-app browser visual check on `http://localhost:5020` confirmed the honeycomb background before the tile spacing correction, but screenshot capture now times out while the dev server reports unrelated duplicate declarations of `mirosharkRunStatus` and `mirosharkPosts` in `src/app/page.tsx`. `pnpm typecheck` is blocked by the same pre-existing declarations.
- Intended commit message: `Replace square background with honeycomb`

## 2026-05-19 02:03 WITA - Center Sidebar Brand Logo

- Status: Pushed
- Areas changed: Sidebar brand layout
- Summary: Center the HivemindOS logo and title stack in the command sidebar, including the narrow/mobile layout, and make the logo image block-level with auto margins so it cannot start-align inside the grid.
- Verification: `pnpm typecheck`; `git diff --check -- src/app/globals.css src/app/page.tsx CHANGELOG.md` passed. Local visual QA was not run because `localhost:5023` was not serving and the project rules say not to start `pnpm dev`.
- Intended commit message: `Center sidebar brand logo`

## 2026-05-19 01:44 WITA - Make MiroShark Feed Live

- Status: Pushed
- Areas changed: Swarm dashboard live post feed, MiroShark swarm proxy
- Summary: Poll started MiroShark runs automatically, fetch a larger post window, filter blank MiroShark post rows before rendering, hide raw round-style timestamps in favor of post ids, expose raw versus visible counts from the proxy, show a listening state before first posts arrive, animate live feed activity, and make the full post list scrollable instead of showing only five items.
- Verification: `/api/miroshark/swarm?simulation_id=sim_c7764ee3341b&platform=twitter` returned 19 visible posts from 25 raw rows with 0 blank posts after filtering; `pnpm typecheck`; `pnpm lint` (warnings only, pre-existing unused-variable warnings).
- Intended commit message: `Make MiroShark feed live`

## 2026-05-19 01:37 WITA - Add Full MiroShark Swarm Controls

- Status: Pushed
- Areas changed: Swarm dashboard tab, MiroShark swarm API route, MiroShark companion runtime patch, assimilation manifest
- Summary: Replace the Swarm tab's connection-only surface with in-app scenario, surface, round, run, refresh, status, result links, and live post controls; drive the real MiroShark ontology/graph/prepare/start lifecycle from OpenClaw; enrich short scenarios with named participants so MiroShark builds usable graphs; normalize short runs so agents activate immediately; fetch Twitter posts correctly; and patch the local MiroShark companion so detached stdout logging does not crash profile preparation.
- Verification: `pnpm typecheck`; MiroShark backend restarted on `http://127.0.0.1:5101`; real OpenClaw `/api/miroshark/swarm` e2e created project `proj_92b4e7494715`, graph `887928da-e834-4df9-9618-ee60e18ed1e4`, simulation `sim_30dcc84523a2`, prepared 5 profiles, started the Twitter simulation, and verified 20 Twitter posts through MiroShark plus the OpenClaw proxy; stopped the verification simulation via `/api/simulation/stop`.
- Intended commit message: `Add full MiroShark swarm controls`

## 2026-05-19 01:27 WITA - Improve Chat View Layout

- Status: Pushed
- Areas changed: Chat panel layout, empty chat state, message transcript styling, machine tree sidebar, composer styling
- Summary: Replace the machine card chat picker with a Codex-like collapsible Machines tree, grouped by machine and workspace folder with Stray chats fallbacks, include recent remote/collector task metadata even when full transcripts are not locally cached, open historical leaves into their corresponding cached/metadata preview instead of the generic agent transcript, suppress assistant-only direct fallback rows when real session history exists, dedupe sidebar rows by normalized title and preview text while preferring higher-quality session rows, sort chats newest-first with relative timestamps, show only the latest four chats per folder with a subtle folder-local show-more control, keep selected chats visibly aqua with readable dark text, make the empty transcript a subtle placeholder, move starter prompts into small suggestion pills above the composer, and reduce header/composer scale.
- Verification: `pnpm typecheck`; `pnpm lint` (warnings only, pre-existing unused-variable warnings); `git diff --check -- src/app/page.tsx CHANGELOG.md`; previous `python3 verify_assimilation_manifest.py`; previous `git diff --check -- src/app/page.tsx src/app/globals.css CHANGELOG.md ASSIMILATION.json` passed. Browser connection opened the local app but did not visually render the dashboard content in the in-app screenshot, so visual QA is limited to code inspection and automated checks.
- Intended commit message: `Improve chat view layout`

## 2026-05-19 00:50 WITA - Tighten Swarm Navigation And Panel UI

- Status: Pushed
- Areas changed: Sidebar view tab CSS, Swarm dashboard panel
- Summary: Fix overlapping sidebar icons by giving nav icons a fixed grid lane, remove the oversized Swarm tab layout and attribution filler card, and collapse the screen into a compact MiroShark connection console.
- Verification: `pnpm typecheck`; `pnpm lint` (warnings only, pre-existing unused-variable warnings); Playwright verified all sidebar nav items report no icon/text overlap and the Swarm panel shows the compact MiroShark connection UI; screenshot saved to `/tmp/openclaw-swarm-ui-fixed.png`.
- Intended commit message: `Tighten swarm navigation and panel UI`

## 2026-05-19 00:48 WITA - Verify Collector Capability Repairs

- Status: Pushed
- Areas changed: Fleet updater API, machine update actions, update result feedback
- Summary: Keep update/repair visible when a collector is missing the Hermes chat bridge even if its checkout has local edits, run capability repairs through the synchronous remote updater instead of the collector's detached background endpoint, and only return success after the collector reports the required capability.
- Verification: Pending.
- Intended commit message: `Verify collector capability repairs`

## 2026-05-19 00:52 WITA - Simplify Machine Update Command

- Status: Pushed
- Areas changed: Fleet updater API, machine update controls
- Summary: Make the Update action always run the machine update command through SSH/Tailscale instead of the collector's detached endpoint, keep the Update button visible for dirty machines, and report success only after the command finishes.
- Verification: `pnpm typecheck`; `pnpm lint` (warnings only, pre-existing unused-variable warnings); `git diff --check -- src/app/api/fleet/update/route.ts src/app/page.tsx src/components/cells/MachineCell.tsx CHANGELOG.md` passed.
- Intended commit message: `Simplify machine update command`

## 2026-05-19 01:05 WITA - Run Local Machine Updates Locally

- Status: Pushed
- Areas changed: Fleet updater API
- Summary: Detect when an update target's app directory is on the same machine as the dashboard API and run the update command locally instead of trying Tailscale SSH, so updating This Mac does not require SSH to be enabled.
- Verification: `pnpm typecheck`; `pnpm lint` (warnings only, pre-existing unused-variable warnings); `git diff --check -- src/app/api/fleet/update/route.ts CHANGELOG.md` passed.
- Intended commit message: `Run local machine updates locally`

## 2026-05-19 01:12 WITA - Make Collector Updates Lightweight

- Status: Pushed
- Areas changed: Fleet updater API, telemetry collector advertised update command, update success copy
- Summary: Replace the full setup/build updater path with a lighter collector update path that pulls latest code, installs dependencies, and restarts the telemetry collector without running a production dashboard build on every update click.
- Verification: `node --check scripts/agent-telemetry-collector.mjs`; `pnpm typecheck`; `pnpm lint` (warnings only, pre-existing unused-variable warnings); `git diff --check -- src/app/api/fleet/update/route.ts scripts/agent-telemetry-collector.mjs src/app/page.tsx CHANGELOG.md` passed.
- Intended commit message: `Make collector updates lightweight`

## 2026-05-19 01:18 WITA - Stop Showing Update For Local Worktree Changes

- Status: Pushed
- Areas changed: Machine version state logic
- Summary: Treat collectors with local uncommitted work as synced for the Update button so a successful update on This Mac does not keep showing Update just because the dashboard checkout is a dirty local feature branch.
- Verification: `pnpm typecheck`; `pnpm lint` (warnings only, pre-existing unused-variable warnings); `git diff --check -- src/app/page.tsx CHANGELOG.md` passed.
- Intended commit message: `Stop showing update for local worktree changes`

## 2026-05-19 01:21 WITA - Remove Premature Update Success

- Status: Pushed
- Areas changed: Machine update status flow, fleet updater fallback
- Summary: Remove the frontend effect that marked updating machines as Updated based only on existing discovery state, and add a collector fallback for machines without SSH that starts the collector update then waits for capability verification before reporting success.
- Verification: `pnpm typecheck`; `pnpm lint` (warnings only, pre-existing unused-variable warnings); `git diff --check -- src/app/page.tsx src/app/api/fleet/update/route.ts CHANGELOG.md` passed.
- Intended commit message: `Remove premature update success`

## 2026-05-19 01:29 WITA - Fail Faster When Remote Update Is Unreachable

- Status: Pushed
- Areas changed: Fleet updater API
- Summary: Shorten unreachable SSH and collector verification timeouts and remove the SSH host-key preflight so machines without working remote command access fail quickly instead of leaving the dashboard on Updating for minutes.
- Verification: `pnpm typecheck`; `pnpm lint` (warnings only, pre-existing unused-variable warnings); `git diff --check -- src/app/api/fleet/update/route.ts CHANGELOG.md` passed.
- Intended commit message: `Fail faster when remote update is unreachable`

## 2026-05-19 01:47 WITA - Block Bridge Repair Until Code Is Published

- Status: Pushed
- Areas changed: Machine update action gating
- Summary: Detect when a machine is missing the Hermes chat bridge but the dashboard code that adds it only exists in the local uncommitted checkout, and replace the repair/update action with Publish update first guidance instead of running a pull that cannot fetch unpublished code.
- Verification: `pnpm typecheck`; `pnpm lint` (warnings only, pre-existing unused-variable warnings); `git diff --check -- src/app/page.tsx CHANGELOG.md` passed.
- Intended commit message: `Block bridge repair until code is published`

## 2026-05-19 00:41 WITA - Streamline MiroShark Connection Flow

- Status: Pushed
- Areas changed: MiroShark companion manager, MiroShark status/manage API routes, Swarm dashboard UX, Swarm cell copy, MiroShark docs, environment example, assimilation manifest
- Summary: Replace passive "start companion separately" messaging with local MiroShark install detection, richer prerequisite/config status, one-click install/start/open actions, managed setup state/log reporting, and auto-detected backend selection for known local installs.
- Verification: Reused audited MiroShark runtime paths; `pnpm typecheck`; `pnpm lint` (warnings only, pre-existing unused-variable warnings); `/api/miroshark/status` on local Next dev returned connected with detected Codex-cache install and all prerequisites ready; `/api/miroshark/manage` start action returned connected; Playwright opened `http://localhost:5023`, clicked Swarm, verified the Swarm panel shows `MiroShark connected` and `Open MiroShark`; screenshot saved to `/tmp/openclaw-miroshark-streamlined.png`.
- Intended commit message: `Streamline MiroShark connection flow`

## 2026-05-19 00:38 WITA - Prefer Collector Chat For Discovered Hermes

- Status: Pushed
- Areas changed: Hermes chat routing, collector capability detection, machine version affordance
- Summary: Route discovered Hermes agents through their machine collector chat bridge even if a stale runtime gateway URL is saved, surface collector chat-bridge capability in discovery and machine details, block sends before runtime fetch when the bridge is missing, and show an explicit Local edits pill on dirty machine cards instead of making the missing Update button look like success.
- Verification: `pnpm typecheck`; `pnpm lint` (warnings only, pre-existing unused-variable warnings); `git diff --check -- src/app/api/chat/agent-runtime/route.ts src/app/api/fleet/discover/route.ts src/lib/types/agent-runtime.ts src/app/page.tsx src/components/cells/MachineCell.tsx CHANGELOG.md` passed; live API check on port 5023 reports Ubuntu collector `capabilities.chat: false`; chat send with stale localhost gateway is blocked before fetch with bridge-missing guidance.
- Intended commit message: `Prefer collector chat for discovered Hermes`

## 2026-05-19 00:17 WITA - Clarify Collector Update Feedback

- Status: Pushed
- Areas changed: Machine update controls, collector update status feedback
- Summary: Replace the ambiguous refresh-only collector update header control with a labeled Update pill, keep accepted updates visible while discovery checks the new collector version, show a distinct Updated state when the version is current, and add a subtle success animation to the update banner.
- Verification: `pnpm typecheck`; `pnpm lint` (warnings only, pre-existing unused-variable warnings); `git diff --check -- src/app/page.tsx src/components/cells/MachineCell.tsx src/app/globals.css CHANGELOG.md` passed.
- Intended commit message: `Clarify collector update feedback`

## 2026-05-19 00:25 WITA - Add Collector Update Verification Timeout

- Status: Pushed
- Areas changed: Collector update verification feedback
- Summary: Make the accepted-update message explicit that the detached update is not verified yet, poll discovery for longer, and turn the banner into an actionable error if the collector still reports the old version after the verification window.
- Verification: `pnpm typecheck`; `pnpm lint` (warnings only, pre-existing unused-variable warnings); `git diff --check -- src/app/page.tsx CHANGELOG.md` passed.
- Intended commit message: `Add collector update verification timeout`

## 2026-05-19 00:33 WITA - Pause Auto Update For Dirty Collectors

- Status: Pushed
- Areas changed: Machine update controls, collector version state copy
- Summary: Stop showing the collector Update action for machines whose collector reports local edits, show Local edits instead, and guard the update handler so automatic updates only run for stale or unknown collectors.
- Verification: `pnpm typecheck`; `pnpm lint` (warnings only, pre-existing unused-variable warnings); `git diff --check -- src/app/page.tsx src/components/cells/MachineCell.tsx CHANGELOG.md` passed.
- Intended commit message: `Pause auto update for dirty collectors`

## 2026-05-19 00:07 WITA - Remove Full History Chat Footer

- Status: Pushed
- Areas changed: Dashboard agent task list, shared task list comment
- Summary: Remove the "Open chat for full history" footer from expanded agent task lists while keeping per-task Resume actions intact.
- Verification: `pnpm typecheck`; `rg -n "Open chat for full history|full history|view full history" src/app/page.tsx src/components/cells/AgentTaskList.tsx` returned no matches; `git diff --check -- src/app/page.tsx src/components/cells/AgentTaskList.tsx CHANGELOG.md` passed.
- Intended commit message: `Remove full history chat footer`

## 2026-05-19 00:09 WITA - Surface Collector Update Action

- Status: Pushed
- Areas changed: Machine quick actions
- Summary: Add an explicit Update collector row to machine card plus menus whenever a collector is outdated, with updating and synced states matching the existing header refresh action.
- Verification: `pnpm typecheck`; `pnpm lint` (warnings only, pre-existing unused-variable warnings); `git diff --check -- src/app/page.tsx CHANGELOG.md` passed.
- Intended commit message: `Surface collector update action`

## 2026-05-18 23:39 WITA - Make Add Agent Feedback Visible

- Status: Pushed
- Areas changed: Machine quick actions, dashboard chat selection feedback
- Summary: After adding an agent from a machine card, immediately switch to the new agent's chat and seed a clear confirmation message so the action is visible.
- Verification: `pnpm typecheck`; `pnpm lint` (warnings only, pre-existing unused-variable warnings); `git diff --check -- src/app/page.tsx CHANGELOG.md` passed.
- Intended commit message: `Make add agent feedback visible`

## 2026-05-18 23:33 WITA - Add Machine Quick Actions Menu

- Status: Pushed
- Areas changed: Machine cards, dashboard fleet actions, shared MachineCell header controls
- Summary: Add a compact plus action menu to every machine card with New chat and Add agent actions, reusing the cell menu pattern while keeping setup-required machines guarded behind Connect.
- Verification: `pnpm typecheck`; `pnpm lint` (warnings only, pre-existing unused-variable warnings); `git diff --check -- src/app/page.tsx src/components/cells/MachineCell.tsx CHANGELOG.md` passed.
- Intended commit message: `Add machine quick actions menu`

## 2026-05-18 23:27 WITA - Add Collector Hermes Chat Bridge

- Status: Pushed
- Areas changed: Telemetry collector, agent runtime chat API, dashboard chat setup guard
- Summary: Add a narrow private `/chat` endpoint to the Tailscale collector that sends messages to local Hermes via `hermes -z`, advertise collector chat capability from `/health`, and route discovered Hermes agents through their collector URL when no separate HTTP runtime URL is configured.
- Verification: `node --check scripts/agent-telemetry-collector.mjs`; `pnpm typecheck`; `pnpm lint` (warnings only, pre-existing unused-variable warnings); restarted the local collector with `./scripts/install-telemetry-collector.sh`; `/health` reports `capabilities.chat`; direct collector `/chat` returned `collector bridge works`; `/api/chat/agent-runtime` returned SSE text `dashboard bridge works` through the collector; `git diff --check` passed. Remote Ubuntu collector currently lacks `capabilities.chat` and needs update/restart before remote chat works.
- Intended commit message: `Add collector Hermes chat bridge`

## 2026-05-18 22:24 WITA - Add Task Resume Hover Action

- Status: Pushed
- Areas changed: Agent task list, dashboard chat resume flow
- Summary: Show a hover-only Resume action on agent task rows, replace it with a spinning Working... state only for fresh active task rows, and open resumed chats with the latest five conversation messages while sending those messages as runtime context.
- Verification: `pnpm typecheck`; `pnpm lint` (warnings only, pre-existing unused-variable warnings); `git diff --check -- src/components/cells/AgentTaskList.tsx src/app/page.tsx CHANGELOG.md`; `verify_assimilation_manifest.py`; local browser check against existing `127.0.0.1:5020` dev server confirmed dashboard shell loads with no console errors.
- Intended commit message: `Add task resume hover action`

## 2026-05-18 22:38 WITA - Ignore Stale Task Busy State

- Status: Pushed
- Areas changed: Agent task hover action state, fleet snapshot task message history, chat resume seeding
- Summary: Stop showing Working... for every task row when an agent has stale active telemetry; only fresh active task rows or the current streaming chat task show the loading state, while finished or stale rows show Resume. Include fuller recent Hermes session messages in fleet task snapshots, seed the chat pane from the task's latest five messages when Resume opens a collector-backed conversation, and render chat content as compact Markdown.
- Verification: `pnpm typecheck`; `pnpm lint` (warnings only, pre-existing unused-variable warnings); `git diff --check -- src/app/api/fleet/snapshot/route.ts src/app/page.tsx src/app/globals.css CHANGELOG.md` passed.
- Intended commit message: `Ignore stale task busy state`

## 2026-05-18 22:15 WITA - Hide Dead Starter Chat Profiles

- Status: Pushed
- Areas changed: Dashboard agent filtering, chat starter profile handling
- Summary: Remove newly seeded fake Hermes/Aeon localhost chat shortcuts, force legacy seeded non-OpenClaw starter shortcuts to stay hidden unless attached to a collector, and block direct sends from stale starter selections with setup guidance instead of calling dead localhost URLs.
- Verification: Confirmed no service is listening on the seeded Hermes ports 8642-8647 while the Hermes CLI is installed; `pnpm typecheck`; `pnpm lint` (warnings only, pre-existing unused-variable warnings); `git diff --check` passed.
- Intended commit message: `Hide dead starter chat profiles`

## 2026-05-18 22:03 WITA - Handle Offline Runtime Chat URLs

- Status: Pushed
- Areas changed: Agent runtime chat API
- Summary: Catch network failures when Hermes/Aeon runtime chat URLs are configured but offline, returning a clear unreachable-runtime error instead of a blank HTTP 500.
- Verification: Reproduced the offline Aeon request against `/api/chat/agent-runtime` and confirmed it now returns HTTP 502 JSON with the unreachable-runtime message instead of HTTP 500; confirmed discovered read-only Hermes still returns HTTP 400 setup guidance; `pnpm typecheck`; `pnpm lint` (warnings only, pre-existing unused-variable warnings); `git diff --check` passed.
- Intended commit message: `Handle offline runtime chat URLs`

## 2026-05-18 21:07 WITA - Add Optional MiroShark Companion Status

- Status: Pushed
- Areas changed: MiroShark companion adapter, status API route, dashboard Swarm view, shared Button primitive, environment example, MiroShark companion docs, roadmap, assimilation manifest
- Summary: Add optional MiroShark support as an external companion runtime with health/status detection, documented endpoint mapping, dashboard readiness copy, and a roadmap split between OpenClaw-owned real swarm coordination and MiroShark-powered scenario rehearsal.
- Verification: Audited selected MiroShark source/docs paths; Playwright browser e2e against `next start -p 5021` opened the dashboard, clicked the Swarm tab, verified the MiroShark panel, endpoint copy, and safe non-MiroShark port mismatch for local port 5001; live MiroShark e2e set up Neo4j in Docker, started the MiroShark backend on `127.0.0.1:5101`, generated a Nom project/graph/simulation, prepared 4 agents, ran the Twitter simulation script, and verified OpenClaw shows MiroShark connected; `pnpm typecheck`; `pnpm lint` (warnings only, pre-existing unused-variable warnings); `pnpm build` (pre-existing Turbopack NFT trace warning); `git diff --check`; `verify_assimilation_manifest.py` passed.
- Intended commit message: `Add optional MiroShark companion status`

## 2026-05-18 21:01 WITA - Redesign Control Room With Modern UI Primitives

- Status: Pushed
- Areas changed: Dashboard shell, navigation, fleet summary, action controls, shadcn-style UI primitives, Tailwind/Motion/Lucide integration, assimilation manifest
- Summary: Replace the hero-first dashboard with a persistent operational command shell, icon-led sidebar navigation, compact status metrics, clearer trust copy, Lucide action affordances, Motion entry animation, and adapted Button/Card/Badge/Tooltip primitives using the newly installed UI stack.
- Verification: `pnpm typecheck`, `pnpm lint` (warnings only, pre-existing unused-variable warnings), `pnpm build` (pre-existing Turbopack NFT trace warning), local `/` HTTP 200, `git diff --check`, audited selected donor paths, and `verify_assimilation_manifest.py` passed. Browser plugin was not available through tool discovery; visual verification was limited to compile and local HTTP checks.
- Intended commit message: `Redesign control room with UI primitives`

## 2026-05-18 20:51 WITA - Explain Chat Runtime Setup Failures

- Status: Pushed
- Areas changed: Agent runtime chat API, chat view setup validation
- Summary: Detect discovered read-only collector agents that do not have a Hermes/Aeon chat runtime URL and return a clear setup error instead of an unhandled 500.
- Verification: Reproduced the discovered-Hermes request against `/api/chat/agent-runtime` and confirmed it now returns HTTP 400 with a setup message instead of 500; `pnpm typecheck`; `pnpm lint` (warnings only, pre-existing unused-variable warnings); `git diff --check` passed.
- Intended commit message: `Explain chat runtime setup failures`

## 2026-05-18 20:50 WITA - Install Modern UI Foundation

- Status: Pushed
- Areas changed: UI dependencies, Tailwind/PostCSS setup, shadcn-compatible component config, shared class-name utility
- Summary: Install a modern React/Next UI foundation with Tailwind CSS v4, Radix primitives, Lucide icons, Motion, CVA, clsx, tailwind-merge, and shadcn-compatible project configuration for future component work.
- Verification: `pnpm typecheck`, `pnpm lint` (warnings only, pre-existing unused-variable warnings), `pnpm build` (pre-existing Turbopack NFT trace warning), `pnpm exec shadcn --help`, and `git diff --check` passed.
- Intended commit message: `Install modern UI foundation`

## 2026-05-18 20:46 WITA - Simplify Dashboard UI

- Status: Pushed
- Areas changed: Dashboard navigation, fleet overview, agent cards, wallet management UI, dashboard styling, assimilation manifest
- Summary: Redesign the primary UI around the layman-first rules: plain navigation labels, calmer fleet header, collapsed agent connection setup, simpler machine and agent cards, and a wallet view that foregrounds spend permission, balance, days remaining, and safe limits while hiding provider and protocol details behind disclosures.
- Verification: `pnpm typecheck`, `pnpm lint` (warnings only, pre-existing unused-variable warnings), `git diff --check`, `verify_assimilation_manifest.py`, and local `/` HTTP 200 passed.
- Intended commit message: `Simplify dashboard UI`

## 2026-05-18 20:45 WITA - Refine Connect Command Card

- Status: Pushed
- Areas changed: Shared machine Connect modal layout and copy control styling
- Summary: Merge the setup instruction, terminal command, and return guidance into one coherent command card and replace the oversized Copy button with a compact copy icon button.
- Verification: `pnpm typecheck`, `pnpm lint` (warnings only, pre-existing unused-variable warnings), `git diff --check`, and local browser verification of the unified command card passed.
- Intended commit message: `Refine connect command card`

## 2026-05-18 20:39 WITA - Cross-Link UI Guidance

- Status: Pushed
- Areas changed: UI rules and design philosophy documentation
- Summary: Link the concise UI rules checklist to the full design philosophy and link the philosophy back to the implementation checklist.
- Verification: `git diff --check -- docs/design-philosophy.md docs/UI_RULES.md CHANGELOG.md` passed.
- Intended commit message: `Cross-link UI guidance`

## 2026-05-18 20:38 WITA - Repair Design Philosophy Markdown

- Status: Pushed
- Areas changed: Design philosophy documentation
- Summary: Fix the broken Markdown structure in the expanded UI/UX philosophy by closing code fences and converting raw outline text into proper headings, bullets, and examples.
- Verification: `git diff --check -- docs/design-philosophy.md CHANGELOG.md` passed.
- Intended commit message: `Repair design philosophy markdown`

## 2026-05-18 20:26 WITA - Tighten Connect Modal Wording

- Status: Pushed
- Areas changed: Shared machine Connect modal instruction copy
- Summary: Change the primary setup instruction to explicitly tell lay users to open Terminal, paste the command, and press Return.
- Verification: `pnpm typecheck`, `pnpm lint` (warnings only, pre-existing unused-variable warnings), `git diff --check`, and local browser verification of the modal copy passed.
- Intended commit message: `Tighten connect modal wording`

## 2026-05-18 20:26 WITA - Clarify Connect Modal For Lay Users

- Status: Pushed
- Areas changed: Shared machine Connect modal layout, command copy treatment, setup instruction copy
- Summary: Rework the Connect modal into one layperson-friendly instruction that tells the user to open Terminal on the other computer, paste the labeled command, press Return, and then come back after setup finishes.
- Verification: `pnpm typecheck`, `pnpm lint` (warnings only, pre-existing unused-variable warnings), `git diff --check`, and local `/` HTTP 200 checks passed during the dashboard update verification pass.
- Intended commit message: `Clarify connect modal instructions`

## 2026-05-18 20:24 WITA - Fix Markdown Code Wrapping

- Status: Pushed
- Areas changed: Agent activity card Markdown styling
- Summary: Make inline code and long file paths wrap inside narrow agent activity cards instead of clipping at the card edge.
- Verification: `pnpm typecheck`, `pnpm lint` (warnings only, pre-existing unused-variable warnings), `git diff --check`, dev-server hot compile, and local `/` HTTP 200 passed.
- Intended commit message: `Fix markdown code wrapping`

## 2026-05-18 20:22 WITA - Simplify Connect Setup Instructions

- Status: Pushed
- Areas changed: Shared machine Connect modal copy and setup command
- Summary: Replace the modal's manual Tailscale/collector instructions with the project setup script as the primary path and remove hardcoded personal-name copy.
- Verification: `pnpm typecheck`, `pnpm lint` (warnings only, pre-existing unused-variable warnings), `git diff --check`, and local browser verification of the Connect modal copy passed.
- Intended commit message: `Simplify connect setup instructions`

## 2026-05-18 20:20 WITA - Add Design Philosophy

- Status: Pushed
- Areas changed: Design documentation
- Summary: Add a project-wide design philosophy requiring simple layman-first primary surfaces, progressive disclosure, minimal default UI, intuitive navigation, plain-English copy, and advanced controls hidden behind clear secondary actions.
- Verification: Documentation-only change; `git diff --check -- docs/design-philosophy.md CHANGELOG.md` passed.
- Intended commit message: `Add design philosophy`

## 2026-05-18 20:17 WITA - Add Shared Machine Connect Modal

- Status: Pushed
- Areas changed: Agent machine status actions, chat machine picker actions, shared setup modal, dashboard styling
- Summary: Replace non-actionable Setup/Offline machine labels with Connect buttons that open one shared setup instructions modal for installing the read-only collector on another Tailnet machine.
- Verification: `pnpm typecheck`, `pnpm lint` (warnings only, pre-existing unused-variable warnings), `git diff --check`, and local browser checks for both chat-view and agent-view Connect buttons passed.
- Intended commit message: `Add shared machine connect modal`

## 2026-05-18 20:16 WITA - Render Markdown In Agent Cards

- Status: Pushed
- Areas changed: Agent activity card rendering, markdown preview styling, changelog
- Summary: Preserve Markdown line structure in agent activity messages and render compact card-safe formatting for headings, lists, quotes, links, bold/italic text, inline code, and fenced code blocks.
- Verification: `pnpm typecheck`, `pnpm lint` (warnings only, pre-existing unused-variable warnings), `git diff --check`, dev-server hot compile, and local `/` HTTP 200 passed.
- Intended commit message: `Render markdown in agent cards`

## 2026-05-18 20:11 WITA - Add Agent Wallet Survival Setup

- Status: Pushed
- Areas changed: Wallet & Spend dashboard tab, agent-card wallet shortcut, local agent wallet/survival types and utilities, payment provider/runbook config, dashboard styling, assimilation manifest
- Summary: Add a per-agent Wallet & Survival Setup view for ClawCard/MoneyClaw/x402/manual rails, bounded spend caps, local seeded-balance burn accounting, survival tiers, launch steps, safety rules, copyable payment-context prompts for agent runtimes, and a wallet setup/status shortcut on each agent card.
- Verification: `pnpm typecheck`, `pnpm lint` (warnings only, pre-existing unused-variable warnings), `git diff --check`, `verify_assimilation_manifest.py`, and local `/` HTTP 200 smoke check passed.
- Intended commit message: `Add agent wallet survival setup`

## 2026-05-18 20:06 WITA - Fix Cross-Machine Agent Dedupe

- Status: Pushed
- Areas changed: Dashboard agent merge logic, Add Agent connector controls
- Summary: Stop deduping Hermes home folders across different Tailnet machines, so the local Mac Hermes agent and the VPS Hermes agent can both appear at the same time. Remove the runtime folder field from the primary Add Agent flow because collectors already know their runtime defaults.
- Verification: `pnpm typecheck`, `pnpm lint` (warnings only, pre-existing unused-variable warnings), and `git diff --check` passed. `/api/fleet/discover` reports the VPS collector and its Hermes agent.
- Intended commit message: `Fix cross-machine agent dedupe`

## 2026-05-18 19:59 WITA - Wrap Kanban Columns

- Status: Pushed
- Areas changed: Kanban board responsive layout CSS, changelog
- Summary: Replace the horizontal-scrolling Kanban column strip with a responsive wrapping grid so fixed workflow columns flow onto additional rows instead of clipping or requiring sideways scrolling.
- Verification: `pnpm typecheck`, `pnpm lint` (warnings only, pre-existing unused-variable warnings), and `git diff --check` passed.
- Intended commit message: `Wrap Kanban columns`

## 2026-05-18 19:59 WITA - Simplify Chat Machine Picker

- Status: Pushed
- Areas changed: Chat view sidebar, agent manual setup controls, chat sidebar styling
- Summary: Replace the chat view's always-visible runtime configuration form with machine-first Chat buttons and previous conversation resume buttons, moving manual transport/profile fields into a collapsed setup section.
- Verification: `pnpm typecheck`, `pnpm lint` (warnings only, pre-existing unused-variable warnings), `git diff --check`, and local browser verification on `http://localhost:5020/` passed.
- Intended commit message: `Simplify chat machine picker`

## 2026-05-18 19:58 WITA - Redesign Add Agent Flow

- Status: Pushed
- Areas changed: Agent creation flow, dashboard header controls, add-agent styling
- Summary: Replace the one-click placeholder-creating Add Agent button with a guided connector that requires choosing a discovered machine, explains auto-discovery, and creates attached profiles instead of offline zombie cards.
- Verification: `pnpm typecheck`, `pnpm lint` (warnings only, pre-existing unused-variable warnings), `git diff --check`, dev-server hot compile, local `/` HTTP 200, and `/api/fleet/discover` smoke read passed.
- Intended commit message: `Redesign add agent flow`

## 2026-05-18 19:51 WITA - Fix Kanban Column Clipping

- Status: Pushed
- Areas changed: Kanban board/drawer layout CSS, changelog
- Summary: Prevent the Kanban task drawer from clipping the final board columns by making the board and drawer a two-column grid and constraining horizontal board scrolling to the board pane.
- Verification: `pnpm typecheck` and `git diff --check` passed.
- Intended commit message: `Fix Kanban column clipping`

## 2026-05-18 19:51 WITA - Hide Starter Agent Placeholders

- Status: Pushed
- Areas changed: Dashboard agent defaults and display filtering
- Summary: Stop rendering the original seed/demo agents as large disconnected cards once real collector-discovered agents are available. Starter profiles without telemetry, local data, chat history, or observed work are now hidden from the fleet view.
- Verification: `pnpm typecheck`, `pnpm lint` (warnings only, pre-existing unused-variable warnings), `git diff --check`, dev-server hot compile, local `/` HTTP 200, and `/api/fleet/discover` smoke read passed.
- Intended commit message: `Hide starter agent placeholders`

## 2026-05-18 19:47 WITA - Dedupe Auto-Discovered Local Agents

- Status: Pushed
- Areas changed: Dashboard agent merge logic
- Summary: Prevent the same local Hermes workspace from appearing as both a saved placeholder agent and an auto-discovered collector agent. Auto-discovered agents now replace saved profiles that point at the same runtime workspace.
- Verification: `pnpm typecheck`, `pnpm lint` (warnings only, pre-existing unused-variable warnings), `git diff --check`, and dev-server hot compile passed.
- Intended commit message: `Dedupe auto-discovered local agents`

## 2026-05-18 19:47 WITA - Split Dashboard Into View Tabs

- Status: Pushed
- Areas changed: Dashboard view navigation, Agents/Kanban/Vault/Chat layout composition, responsive tab styling
- Summary: Replace the long stacked dashboard with a top-level segmented view switcher so Kanban, agent fleet control, vault settings, and runtime chat each get a dedicated workspace while preserving shared selected-agent state.
- Verification: `pnpm typecheck`, `pnpm lint` (warnings only, pre-existing unused-variable warnings), `pnpm build` (pre-existing Turbopack NFT trace warning), `git diff --check`, local `/` HTTP 200, and local Kanban API smoke read passed.
- Intended commit message: `Split dashboard into view tabs`

## 2026-05-18 19:29 WITA - Center README Branding Badges

- Status: Pushed
- Areas changed: README header branding and badge links
- Summary: Center the README logo/title block and add GitHub star, GitHub fork, and Bankr badges while omitting the X follow and language buttons.
- Verification: `git diff --check -- README.md CHANGELOG.md` passed, and README diff reviewed.
- Intended commit message: `Center README branding badges`

## 2026-05-18 19:18 WITA - Humanize Fleet Dashboard UI

- Status: Pushed
- Areas changed: Machine/agent dashboard UI, activity ranking, dashboard card styling
- Summary: Replace the technical machine/agent card treatment with a cleaner command-center layout, compress the oversized hero into an operational header, hide raw collector/version noise, rank meaningful Hermes activity above runtime log files, soften update/empty states, add a stronger visual hierarchy for workspace and agent cards, and render activity bubbles as narrow vertical playing-card-style columns instead of long log rows.
- Verification: `pnpm typecheck`, `pnpm lint` (warnings only, pre-existing unused-variable warnings), `git diff --check`, dev-server hot compile, `/`, `/api/app/version`, and `/api/fleet/discover` passed.
- Intended commit message: `Humanize fleet dashboard UI`

## 2026-05-22 11:25 WITA - Stabilize Fleet Story Keys

- Status: Pushed
- Areas changed: Fleet dashboard field-story card rendering
- Summary: Scope flattened field-story React keys by machine id so agents with the same stable id on different hosts do not collide during rendering.
- Verification: `pnpm typecheck`, `pnpm lint` (warnings only, pre-existing unused-variable warnings), and `git diff --check` passed.
- Intended commit message: `Stabilize fleet story keys`

## 2026-05-18 18:53 WITA - Stabilize Agent Activity Cards

- Status: Pushed
- Areas changed: Dashboard fleet snapshot merging, discovered machine merge behavior
- Summary: Prevent polling flicker where an empty-but-connected collector snapshot briefly overwrites the last real Hermes task/history card. Keep recent non-empty activity visible while the collector returns quiet snapshots.
- Verification: `pnpm typecheck`, `pnpm lint` (warnings only, pre-existing unused-variable warnings), `git diff --check`, dev-server hot compile, `/api/fleet/discover`, and direct VPS collector `/snapshot` passed.
- Intended commit message: `Stabilize agent activity cards`

## 2026-05-18 18:38 WITA - Restart Collector During Setup

- Status: Pushed
- Areas changed: Setup script, telemetry collector installer
- Summary: Make setup restart the telemetry collector after reinstalling it so stale remote collectors pick up `/health` version data and `/update`. Switch dashboard startup from production `next start` to the dev server on the configured port.
- Verification: `bash -n setup.sh scripts/install-telemetry-collector.sh`, `pnpm typecheck`, `pnpm lint` (warnings only, pre-existing unused-variable warnings), `pnpm build` (pre-existing Turbopack NFT trace warning), and `git diff --check` passed.
- Intended commit message: `Restart collector during setup`

## 2026-05-18 18:26 WITA - Multi-Agent Kanban Board

- Status: Pushed
- Areas changed: OpenClaw Kanban API, local Kanban persistence, Kanban dashboard UI, Kanban types and grouping utilities, assimilation manifest
- Summary: Add a Hermes-style multi-agent Kanban surface with local board storage, task create/update/move flows, assignees, tenants, comments, links, archive visibility, and dashboard columns for triage through done.
- Verification: `pnpm typecheck`, `pnpm lint` (warnings only, pre-existing unused-variable warnings), `pnpm build` (pre-existing Turbopack NFT trace warning), `git diff --check`, Kanban API smoke test against local dev server, and `verify_assimilation_manifest.py` passed.
- Intended commit message: `Add multi-agent Kanban board`

## 2026-05-18 18:24 WITA - Clear Stale Collector Update Failures

- Status: Pushed
- Areas changed: Fleet update API, remote update fallback errors
- Summary: Make remote machine updates fall back from Tailscale SSH to plain SSH when possible, and replace the raw host-key failure with a clear stale-collector/bootstrap message when the collector is reachable but cannot update itself yet.
- Verification: `pnpm typecheck`, `pnpm lint` (warnings only, pre-existing unused-variable warnings), `pnpm build` (pre-existing Turbopack NFT trace warning), and `git diff --check` passed.
- Intended commit message: `Clarify stale collector update failures`

## 2026-05-18 18:17 WITA - Preflight Tailscale SSH Host Keys

- Status: Pushed
- Areas changed: Fleet update API, Tailscale SSH update fallback, changelog status correction
- Summary: Prime the target machine's SSH host key before the first `tailscale ssh` update attempt, while keeping the existing retry for first-use host-key errors. Correct the previous host-key handling changelog hash after the amended push.
- Verification: `pnpm typecheck`, `pnpm lint` (warnings only, pre-existing unused-variable warnings), `pnpm build` (pre-existing Turbopack NFT trace warning), `git diff --check`, and `ssh-keyscan` against the VPS Tailnet hostname passed. Restarted the local production server on port 5020.
- Intended commit message: `Preflight Tailscale SSH host keys`

## 2026-05-18 18:08 WITA - HivemindOS Branding

- Status: Pushed
- Areas changed: App metadata, hero branding, runtime status placement, README/docs title references, package name, public logo and favicon assets
- Summary: Add the supplied HivemindOS logo throughout the app, generate browser icons and favicon assets, rename visible app title surfaces from OpenClaw Next to HivemindOS, and move runtime status checking out of the hero into the selected-agent workspace.
- Verification: `pnpm typecheck`, `pnpm lint` (warnings only, pre-existing unused-variable warnings), `pnpm build` (pre-existing Turbopack NFT trace warning), and `git diff --check` passed.
- Intended commit message: `Add HivemindOS branding`

## 2026-05-18 18:01 WITA - Tailscale SSH Host Key Handling

- Status: Pushed in `5c4187f`
- Areas changed: Tailscale SSH fallback transport, update error copy feedback
- Summary: Avoid first-use host key failures by detecting `tailscale ssh` host-key errors, priming `~/.ssh/known_hosts` with `ssh-keyscan` for the Tailnet host, then retrying the update. Make the update error Copy button visibly switch to `Copied`.
- Verification: `pnpm typecheck`, `pnpm lint` (warnings only), `pnpm build`, `git diff --check`, and `ssh-keyscan` against the VPS Tailnet hostname passed.
- Intended commit message: `Fix Tailscale SSH update host key handling`

## 2026-05-18 17:48 WITA - Robust Direct Update Errors

- Status: Pushed in `daf7089`
- Areas changed: Tailscale SSH update fallback, machine update UI, changelog status cleanup
- Summary: Fix direct update failures caused by brittle remote shell quoting by streaming a script through `tailscale ssh ... bash -s`. Make update errors visible in selectable text with a copy button instead of trapping the message inside a button label.
- Verification: `node --check scripts/agent-telemetry-collector.mjs`, `pnpm typecheck`, `pnpm lint` (warnings only), `pnpm build`, `git diff --check`, and a local `/api/fleet/update` error-path smoke test passed. The fallback script now renders as multiline `bash -s` input with valid `[ -d ... ]` spacing and remote `$HOME` expansion.
- Intended commit message: `Fix fleet update fallback and errors`

## 2026-05-18 17:39 WITA - One-Click Fleet Updates

- Status: Pushed in `c3621de`
- Areas changed: collector update endpoint, dashboard update action, fleet update API, machine update UI
- Summary: Make machine Update buttons execute directly out of the box. New collectors run a built-in `/update` endpoint; dashboards call it directly and fall back to Tailscale SSH for older collectors when available.
- Verification: `node --check scripts/agent-telemetry-collector.mjs`, `pnpm typecheck`, `pnpm lint` (warnings only), `pnpm build`, `tailscale ssh --help`, and a local `/api/fleet/update` error-path smoke test passed.
- Intended commit message: `Add one-click fleet updates`

## 2026-05-18 17:34 WITA - Project Changelog Rule

- Status: Pushed in `407e066`
- Areas changed: `AGENTS.md`, `CHANGELOG.md`, `README.md`
- Summary: Added a project rule requiring all future features and meaningful fixes to be documented in `CHANGELOG.md` with timestamps, commit status, verification, and an intended commit-message summary before commit.
- Verification: Documentation-only change; no runtime verification required.
- Intended commit message: `Add changelog discipline rule`
