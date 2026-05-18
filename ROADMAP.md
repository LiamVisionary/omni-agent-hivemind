# Roadmap

## Now

- Machine-first dashboard for Tailscale-connected agent nodes.
- Read-only collector install script for macOS LaunchAgent and Linux systemd user services.
- Hermes local activity discovery from sessions, logs, runtime files, and process signals.
- OpenClaw, Hermes, and Aeon runtime profiles.
- Shared Obsidian vault settings and per-agent opt-in.

## Next

- Streamline setup into a single public installer command.
- Add collector auto-update and health repair.
- Add friendly first-run onboarding for Tailscale status, missing Node.js, missing pnpm, and collector reachability.
- Add collector authentication on top of Tailnet reachability.
- Add configurable redaction rules for task titles, recent messages, hostnames, and local paths.
- Improve OpenClaw and Aeon live-task adapters beyond profile-level HTTP/gateway checks.

## Encrypted Fleet Layer

- Use Tailscale as the default encrypted transport across all machines.
- Add Tailnet ACL examples for control-room devices and agent nodes.
- Add optional machine tags such as `tag:agent-control-room` and `tag:agent-node`.
- Support collector discovery by Tailscale device list, MagicDNS names, and manually pinned nodes.
- Add signed collector identity metadata so the dashboard can distinguish trusted agent nodes from unknown machines.

## Shared Obsidian Brain

- Shared memory bank structure for company brain, project brain, agent-specific brain, and user preferences.
- Shared kanban board for agent handoffs, queued work, blocked work, and completed work.
- Shared skills folder with sync status per agent runtime.
- Vault-safe write APIs with explicit allowlists and append-only defaults.
- Agent handoff notes that link tasks, source messages, outputs, and follow-up decisions.

## Encrypted Environment Management

- Shared encrypted env registry with no raw secrets in the control room.
- Per-agent secret scopes, revocation notes, and rotation reminders.
- Support for age/SOPS-style encrypted files.
- Runtime injection helpers for Hermes, OpenClaw, and Aeon.

## Runtime Support

- Hermes: richer task extraction from sqlite sessions, logs, cron, Telegram/Discord/Slack adapters, and task-bus files.
- OpenClaw: live gateway status, active session discovery, skill status, and recent message history.
- Aeon: runtime-specific adapters once the stable local state and API surfaces are documented.
- Per-agent history with searchable completed tasks.
- Cross-machine activity timeline.

## Swarm Behavior

- Investigate and integrate MiroShark for swarm behavior orchestration.
- Add swarm plans, agent role assignment, voting/synthesis, and quorum-based handoffs.
- Add an optional task bus between orchestrators and specialists.
- Show swarm state in the dashboard without hiding which agent did which work.

## VPS And Hermes Deployment

- Borrow safe control-room patterns from `shannhk/hermes-agent-control-room`.
- Add one-click VPS setup with explicit dry-run, review, and pinning steps.
- Support Hermes agent deployment templates for a single personal agent, specialists, and orchestrator plus task bus.
- Generate control-room docs, runbooks, env maps, backup notes, and port maps.
- Avoid running live external installers until the user has reviewed the plan.

## Hardening

- Security review for collector endpoints and dashboard APIs.
- Test fixtures for Hermes, OpenClaw, and Aeon runtime snapshots.
- Package signed releases for macOS and Linux.
- Add CI for typecheck, lint, build, and secret scanning.
- Add documentation for safe public deployment boundaries.
