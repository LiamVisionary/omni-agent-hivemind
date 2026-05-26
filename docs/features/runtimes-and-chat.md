# Agents, Runtimes, And Chat

Agents are local profiles that point at a runtime, gateway URL, token, model/provider settings, shared vault settings, and optional collector metadata. Chat bridges the dashboard to supported runtimes while preserving machine, runtime, agent, and session context.

## Runtime Model

Known runtimes are defined in `src/lib/types/agent-runtime.ts`:

| Runtime | Kind | Main capabilities |
|---|---|---|
| OpenClaw | Gateway | status, chat, model selection |
| Hermes | Interactive | status, chat, runs, memory, sessions, background tasks, X search, video generation, Codex runtime, Kanban decomposition, model selection |
| Aeon | Background | status, skills, schedules, runs, outputs, memory, background tasks, notifications |
| OpenAI-compatible | Interactive | status, chat, model selection |

## How Runtime Settings Work

- Runtime adapters live in `src/lib/services/runtime-adapters`.
- The adapter registry is `src/lib/services/runtime-adapters/registry.ts`.
- Agent settings use `/api/runtimes/[runtime]/integrations` for capability and model-selection data.
- Runtime availability is read through `/api/runtimes/availability`.
- Remote runtime agent creation is proxied through `/api/agents/runtime` when the collector supports it.

## How Chat Works

- The primary send path is `/api/chat/agent-runtime`.
- Session reads use `/api/chat/agent-session`.
- Runtime stream events are normalized by `src/lib/services/runtime-stream-events.ts`.
- The collector bridges Hermes and other local runtime sessions when a remote machine owns the agent.
- Chat history and folders are cached in browser storage and supported by `/api/chat/folders`.

## Capabilities

- Runtime/provider/model selection where supported.
- Streaming runtime responses where available.
- Session resume and session search.
- Attachments and linked directories for task context.
- Send-to-Kanban from chat messages.
- Agent prompts for clarification, approval, secrets, or sudo-style decisions.
- Agent role, worker class, preferred skills, and per-agent env values.

## Main Code Paths

- `src/lib/types/agent-runtime.ts`
- `src/lib/services/runtime-adapters/**`
- `src/lib/services/runtime-integrations.ts`
- `src/app/api/runtimes/**`
- `src/app/api/chat/**`
- `src/features/dashboard/hooks/use-agent-controller.tsx`
- `src/features/dashboard/hooks/use-status-chat-input-controller.tsx`
- `src/features/dashboard/hooks/use-chat-tree-controller.tsx`
