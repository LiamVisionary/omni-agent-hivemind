# Changelog

This file records user-visible changes before they are committed. New work should
be added here first, then marked `Committed` or `Pushed` after the git action.

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

## 2026-05-21 17:12 WITA - Match Ami Scheduler Builder

- Status: Pushed
- Areas changed: Scheduler builder, per-step schedule data model, Scheduler styles, schedule card actions, changelog
- Summary: Replace the Scheduler's textarea-style step mode with an Ami-style selected-step builder: Enter adds steps, empty Backspace removes them, every step has its own `+` attachment menu for skills/folders/files/paths, every step has its own model picker, attached step context is included when a schedule runs, and saved schedules can be edited in the same builder instead of removed/recreated.
- Verification: `pnpm typecheck --pretty false`; `pnpm eslint src/app/page.tsx` (0 errors, existing warnings only); `git diff --check -- src/app/page.tsx src/app/fleet.module.css CHANGELOG.md`; Playwright smoke on `http://localhost:5020` verified step mode, per-step attachment menu, 147 skill choices, model menu, edit affordance, no console errors, and no horizontal overflow.
- Intended commit message: `Match Ami scheduler builder`

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

## 2026-05-20 22:05 WITA - Match Ami Scheduler Attachments

- Status: Pushed
- Areas changed: Scheduler attachment menu, Scheduler skill/path chips, Brain skill browser inventory, changelog
- Summary: Replace the Scheduler's direct skill-browser button with an Ami-style `+` attachment popover for attaching skills, folders, files, and paths; show removable attachment chips on new schedules and schedule cards; load installed/shared provider skills into Scheduler and the Skill Browser so it no longer appears as a one-card catalog.
- Verification: `pnpm typecheck`; `pnpm eslint src/app/page.tsx`; `git diff --check -- src/app/page.tsx src/app/fleet.module.css CHANGELOG.md`; Playwright smoke on `http://localhost:5020` verified the Scheduler `+` menu, skill-search subpopover, 147 discovered skill buttons, and no horizontal overflow.
- Intended commit message: `Match Ami scheduler attachments`

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

## 2026-05-20 20:58 WITA - Restyle Scheduler Like Ami

- Status: Pushed
- Areas changed: Scheduler UI, fleet styles, changelog
- Summary: Replace the generic Scheduler form with an Ami-inspired automation studio: compact glass sections, prompt/step segmented controls with icons, cadence preset chips, live step previews, inline skill attachment chips, and tighter schedule cards.
- Verification: `pnpm typecheck`; `pnpm eslint src/app/page.tsx`; `git diff --check -- src/app/page.tsx src/app/fleet.module.css CHANGELOG.md`; Playwright smoke on `http://localhost:5020` verified the Scheduler tab renders without horizontal overflow and captured `/tmp/hivemindos-scheduler-smoke.png`.
- Intended commit message: `Restyle scheduler like Ami`

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
