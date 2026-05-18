# Changelog

This file records user-visible changes before they are committed. New work should
be added here first, then marked `Committed` or `Pushed` after the git action.

## 2026-05-18 17:48 WITA - Robust Direct Update Errors

- Status: Pushed in `d9eb599`
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
