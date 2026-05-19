# Changelog

This file records user-visible changes before they are committed. New work should
be added here first, then marked `Committed` or `Pushed` after the git action.

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
- Summary: Replace the bare shared-brain vault surface with a touching-cell hive graph built from markdown wikilinks, segmented cell-edge connection paths, selectable note inspection, drag-to-pan navigation, second-click note opening in Obsidian, graph stats, and per-note access history. Add vault-backed brain access logging under `Projects/OpenClaw/Brain Access/access-log.jsonl` so dashboard/agent note inspections record timestamp, agent, runtime, and machine.
- Verification: `pnpm typecheck`; `pnpm eslint src/app/page.tsx src/app/api/obsidian/graph/route.ts src/app/api/obsidian/access/route.ts src/app/api/obsidian/open/route.ts src/lib/services/obsidian/brain-graph.ts src/app/api/chat/agent-runtime/route.ts`; `git diff --check -- src/lib/services/obsidian/brain-graph.ts src/app/api/obsidian/graph/route.ts src/app/api/obsidian/access/route.ts src/app/api/obsidian/open/route.ts src/app/api/chat/agent-runtime/route.ts src/app/page.tsx src/app/vault.module.css CHANGELOG.md ASSIMILATION.json`; local API smoke for `/api/obsidian/graph` returned the OpenClaw Vault graph; local API smoke for `/api/obsidian/access` wrote a Codex inspection event for `DAILY-BRIEF.md`; local API smoke for `/api/obsidian/open` opened `DAILY-BRIEF.md` in Obsidian; standalone Playwright SVG render using the real vault graph verified a continuous selected-cell border route with no diagonals through cell interiors; `verify_assimilation_manifest.py`.
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
- Verification: `pnpm typecheck`; `pnpm eslint src/app/page.tsx src/components/cells/AgentTaskList.tsx src/lib/services/kanban/local-kanban-store.ts src/app/api/openclaw/kanban/route.ts` (one unrelated existing MiroShark unused-variable warning was observed before the targeted rerun passed); `git diff --check -- src/app/page.tsx src/app/globals.css CHANGELOG.md`; Playwright loaded the local app with no horizontal overflow, though the current dev session did not switch from Fleet to Work in headless mode, so final visual QA still needs an interactive browser pass.
- Intended commit message: `Simplify Kanban first use`

## 2026-05-19 13:43 WITA - Redesign MiroShark Workbench Navigation

- Status: Pushed
- Areas changed: Swarm MiroShark layout, history navigation, new simulation builder, saved run detail placement
- Summary: Rework the Swarm MiroShark screen into a master-detail workspace with a left history rail, primary New Simulation action, body-level run builder, and selected saved runs opening in the same main body area instead of stacking below the builder.
- Verification: `pnpm typecheck`; `pnpm eslint src/app/page.tsx`; `git diff --check -- src/app/page.tsx src/app/globals.css CHANGELOG.md`; Playwright QA on `http://localhost:5020` verified Swarm opens with a left history rail and right body builder, New Simulation shows only the builder in the body, selecting a saved run replaces the body with the run detail, the old archive block is gone, active history state is visible, and desktop/mobile have no horizontal overflow.
- Intended commit message: `Redesign MiroShark workbench navigation`

## 2026-05-19 12:23 WITA - Integrate Kanban With Obsidian Sync

- Status: Pushed
- Areas changed: Kanban storage/API, shared vault config, dashboard Work/Vault UI, agent task tracking action, agent runtime context, README, roadmap, environment example, assimilation manifest
- Summary: Make the Work board prefer the configured Obsidian Sync vault for shared `kanban.json` board storage, migrate existing local boards into the vault when first opened, expose storage metadata in the API/UI, let observed agent activity rows be promoted into Kanban tasks, pass the Kanban folder into agent runtime context, and keep `~/.openclaw/kanban` as an explicit local fallback.
- Verification: `pnpm typecheck`; `pnpm eslint src/app/page.tsx src/components/cells/AgentTaskList.tsx src/lib/services/kanban/local-kanban-store.ts src/app/api/openclaw/kanban/route.ts`; `git diff --check -- src/lib/types/agent-runtime.ts src/lib/services/kanban/local-kanban-store.ts src/app/api/openclaw/kanban/route.ts src/app/api/chat/agent-runtime/route.ts src/app/page.tsx src/app/globals.css README.md ROADMAP.md .env.example CHANGELOG.md ASSIMILATION.json`; Kanban API smoke read against `127.0.0.1:5020` with the shared vault path returned `storage.source: "obsidian"` and created `~/Documents/Obsidian/OpenClaw Vault/Projects/OpenClaw/Kanban/kanban.json`; `verify_assimilation_manifest.py`.
- Intended commit message: `Integrate Kanban with Obsidian sync`

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
- Summary: Replace the stale `Omni Agent Vault` default with the configured `OpenClaw Vault`, migrate stale browser-stored vault config on load, and make server-side MiroShark archive/status requests fall back to the real vault when old clients still send the legacy path.
- Verification: `pnpm typecheck`; `pnpm eslint src/app/page.tsx src/app/api/miroshark/runs/route.ts src/app/api/obsidian/status/route.ts src/lib/types/agent-runtime.ts`; `git diff --check -- src/lib/types/agent-runtime.ts .env.example src/app/page.tsx src/app/api/miroshark/runs/route.ts src/app/api/obsidian/status/route.ts CHANGELOG.md`; legacy `~/Documents/Obsidian/Omni Agent Vault` status/archive requests now resolve to `~/Documents/Obsidian/OpenClaw Vault`.
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
- Summary: Save MiroShark simulation runs into the configured Obsidian vault under `Projects/OpenClaw/MiroShark Simulations`, including an index, per-run Markdown summaries, exact JSON payloads, post exports, timeline exports, automatic save-on-update behavior, and Swarm-tab controls to reload saved runs after the app is closed.
- Verification: `pnpm typecheck`; `pnpm eslint src/app/page.tsx src/app/api/miroshark/swarm/route.ts src/app/api/miroshark/runs/route.ts`; `git diff --check -- src/app/page.tsx src/app/globals.css src/app/api/miroshark/swarm/route.ts src/app/api/miroshark/runs/route.ts CHANGELOG.md`; saved `sim_c7764ee3341b` through `/api/miroshark/runs` into `~/Documents/Obsidian/OpenClaw Vault/Projects/OpenClaw/MiroShark Simulations`, verified the archive index, and loaded the run back with 30 visible posts. Full `pnpm lint` is still blocked by unrelated existing lint errors in `src/components/ui/lottie-player.tsx`.
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
- Summary: Center the Omni-Agent Hivemind logo and title stack in the command sidebar, including the narrow/mobile layout, and make the logo image block-level with auto margins so it cannot start-align inside the grid.
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

## 2026-05-18 18:08 WITA - Omni-Agent Hivemind Branding

- Status: Pushed
- Areas changed: App metadata, hero branding, runtime status placement, README/docs title references, package name, public logo and favicon assets
- Summary: Add the supplied Omni-Agent Hivemind logo throughout the app, generate browser icons and favicon assets, rename visible app title surfaces from OpenClaw Next to Omni-Agent Hivemind, and move runtime status checking out of the hero into the selected-agent workspace.
- Verification: `pnpm typecheck`, `pnpm lint` (warnings only, pre-existing unused-variable warnings), `pnpm build` (pre-existing Turbopack NFT trace warning), and `git diff --check` passed.
- Intended commit message: `Add Omni-Agent Hivemind branding`

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
