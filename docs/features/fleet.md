# Fleet

Fleet is the machine-first control room. It shows local and Tailnet-reachable machines, runtimes, agents, health signals, version drift, setup gaps, and update actions.

## How It Works

- The dashboard polls `/api/fleet/discover` and `/api/fleet/snapshot`.
- Discovery reads local collector settings, Tailscale/Link state, and reachable collector health.
- Snapshots merge local profiles, remote collector reports, runtime status, tasks, alerts, and capability flags.
- Machine identity helpers in `src/features/fleet/fleet-identity.ts` keep local, Link, Tailscale, and remote machine labels stable.
- Collector data comes from `scripts/agent-telemetry-collector.mjs`, usually through Tailscale or Hivemind Link.

## Capabilities

- Local and remote machine cards.
- Runtime and agent visibility.
- Collector health and version checks.
- Remote update action through `/api/fleet/update`.
- Machine provisioning helpers, including Hetzner-related setup routes.
- Directory browsing on capable collectors.
- Duplicate-machine handling across Link, Tailscale, loopback, and collector reports.

## Main Code Paths

- `src/app/api/fleet/discover/route.ts`
- `src/app/api/fleet/snapshot/route.ts`
- `src/app/api/fleet/update/route.ts`
- `src/app/api/tailscale/devices/route.ts`
- `src/features/fleet/fleet-identity.ts`
- `src/components/fleet/**`
- `scripts/agent-telemetry-collector.mjs`
