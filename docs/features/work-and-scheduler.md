# Work Board And Scheduler

The Work board is a shared Kanban system for human and agent tasks. Scheduler manages background automations and runtime schedules.

## Work Board

How it works:

- API route: `/api/kanban`.
- Storage service: `src/lib/services/kanban/local-kanban-store.ts`.
- Shared-vault storage is preferred under the configured Obsidian Kanban folder.
- Local fallback storage is `~/.hivemindos/kanban`.
- Agent dispatch is handled in `use-kanban-dispatch-controller`.

Columns:

| Column | Purpose |
|---|---|
| Ideas | Capture rough thoughts that should not run yet |
| Waiting for Queen | Ready for assignment |
| Working | Claimed by an agent |
| Needs You | Blocked on access, approval, or a decision |
| Done | Completed with notes, evidence, result, or deliverables |
| Archived | Hidden from the main board but retained |

Capabilities:

- Create, update, move, archive, and delete tasks.
- Dispatch tasks to agents.
- Detect stale or no-progress work.
- Preserve agent sessions on cards.
- Store attachments, linked directories, target machines, comments, events, run records, child links, and deliverables.
- Extract local paths and URLs from completed output into deliverables.
- Open or reveal deliverables through `/api/kanban/deliverable`.
- Import tasks from notes through `/api/note-intake`.

## Scheduler

How it works:

- Shared schedule files are stored through `src/lib/services/obsidian/scheduled-runs.ts`.
- Runtime schedule APIs are exposed through `/api/runtimes/[runtime]/schedules` and `/api/runtimes/[runtime]/schedules/action`.
- Scheduler UI behavior lives in `src/features/dashboard/hooks/use-scheduler-controller.tsx`.
- Skill-backed actions use `/api/scheduler/skill-action`.

Capabilities:

- Create and import schedules.
- Run, pause, resume, and inspect runtime schedules where supported.
- Track past scheduled runs in the shared vault.
- Browse folders and attach runtime or skill context.
- Route scheduled prompts through supported agents.

## Main Code Paths

- `src/app/api/kanban/route.ts`
- `src/app/api/kanban/deliverable/route.ts`
- `src/app/api/note-intake/route.ts`
- `src/lib/services/kanban/local-kanban-store.ts`
- `src/features/dashboard/views/KanbanPanel.tsx`
- `src/features/dashboard/hooks/use-kanban-task-controller.tsx`
- `src/features/dashboard/hooks/use-kanban-dispatch-controller.tsx`
- `src/features/dashboard/hooks/use-scheduler-controller.tsx`
- `src/components/scheduler/**`
