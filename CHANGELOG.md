# Changelog

This file records user-visible changes before they are committed. New work should
be added here first, then marked `Committed` or `Pushed` after the git action.

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
