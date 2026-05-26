# MiroShark And Runtime Gateways

MiroShark is an optional companion for scenario rehearsal and swarm simulation. HivemindOS also keeps a minimal runtime-gateway layer for runtimes such as OpenClaw when they are used as agents in the Fleet and Chat views.

## MiroShark

How it works:

- Companion client: `src/lib/services/miroshark/companion-client.ts`.
- Dashboard routes: `/api/miroshark/status`, `/api/miroshark/manage`, `/api/miroshark/swarm`, `/api/miroshark/runs`, `/api/miroshark/analysis`.
- Swarm transformations live in `src/features/swarm`.

Capabilities:

- Detect, install, start, and open MiroShark.
- List templates and run metadata.
- Start scenario simulations.
- Fetch run status, summaries, reports, transcripts, exports, and intelligence where the companion exposes them.
- Send simulation output back into agent or Kanban workflows.

See also: [MiroShark Companion Integration](../integrations/miroshark/companion.md).

## Runtime Gateway Support

How it works:

- Gateway client: `src/lib/services/openclaw/gateway-client.ts`.
- Gateway health/token helper: `src/lib/services/openclaw/gateway-health.ts`.
- The OpenClaw runtime adapter participates in the generic runtime adapter registry.
- Chat is routed through the generic agent runtime path when an OpenClaw runtime profile is selected.

Capabilities:

- Runtime profile detection.
- Runtime model selection from local config.
- WebSocket chat bridge through the HivemindOS runtime chat surface.
- Basic gateway token lookup for local runtime calls.

## Main Code Paths

- `src/lib/services/miroshark/**`
- `src/app/api/miroshark/**`
- `src/features/swarm/**`
- `src/components/swarm/**`
- `src/lib/services/openclaw/**`
- `src/lib/services/runtime-adapters/openclaw.ts`
