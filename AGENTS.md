# Project Rules

## Changelog Discipline

- Before committing any feature, bug fix, setup change, or user-visible behavior change, update `CHANGELOG.md`.
- Every changelog entry must include:
  - local timestamp with timezone
  - short title
  - status: `Uncommitted`, `Committed`, or `Pushed`
  - files or areas changed
  - verification performed
  - intended commit-message summary
- Write the changelog entry while the work is still uncommitted, then update its status after commit/push.
- Before creating a commit, consult the newest relevant changelog entries and use them to write a specific commit message.
- Documentation-only housekeeping may use a concise changelog entry, but should still record the status and commit-message summary.

## Safety

- Do not commit local secrets, private Tailnet IPs, personal vault contents, or machine-specific data.
- Keep collectors private to Tailscale unless the user explicitly asks for another exposure model.
- Prefer read-only fleet inspection by default. Remote mutation/update endpoints need explicit design and safety review.

## Setup / Uninstall Mirror

- Any install prompt, package, service, generated file, shell profile edit, agent instruction edit, shared-skill mirror, or optional third-party app added to `setup.sh` or `setup.ps1` must have a matching one-by-one removal prompt in `uninstall.sh` and `uninstall.ps1`.
- The uninstall prompt should name the same thing the install prompt created and should be conservative by default for destructive or third-party removals.
- If setup starts or registers a service, uninstall must offer to stop and unregister that exact service label/unit.
- If setup writes a managed block into an agent/runtime file, uninstall must remove only that managed block and preserve surrounding user-authored content.
- When adding or changing setup behavior, update this mirror surface in the same commit so install and uninstall stay 1:1.

## UI Text

- Do not silently truncate user-facing text with ellipses, line clamps, `text-overflow`, or forced no-wrap styling.
- Text may be collapsed only when the compact surface genuinely needs it, such as a long chat/history/body preview, and the UI must provide an obvious expand/collapse affordance.
- Prefer wrapping, taller rows/cards, or responsive layout adjustments over hiding content.

## Shared Skills

- The shared skill shelf lives at `Skills/` inside the configured shared notes vault/folder.
- Current HivemindOS shared vault: `/Users/liam/Documents/Obsidian/hivemindos-vault`.
- Current HivemindOS shared skill index: `/Users/liam/Documents/Obsidian/hivemindos-vault/Skills/README.md`.
- Read `Skills/README.md` for the index, then read the relevant `Skills/<slug>/SKILL.md` before using a shared skill.
- Setup seeds `karpathy-guidelines` from `multica-ai/andrej-karpathy-skills` into the shared shelf and can mirror/import skills through common local runtime skill folders for Codex, Claude, Hermes, Gemini, OpenClaw, and Aeon.
