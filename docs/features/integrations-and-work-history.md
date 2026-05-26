# Integrations And Work History

The Integrations and Work History surfaces connect external accounts and summarize work that has happened across the control room.

## Integrations

The Integrations view currently centers on Nango host setup and connected-account discovery.

How it works:

- UI: `src/features/integrations/NangoIntegrationsView.tsx`.
- Services: `src/lib/services/integrations/nango-client.ts` and `src/lib/services/integrations/nango-host.ts`.
- Routes: `/api/integrations/nango` and `/api/integrations/nango/setup`.
- Remote collector setup can proxy through `/integrations/nango/setup`.

Capabilities:

- Read and update local Nango host config.
- Check Nango host health.
- List Nango connections.
- Start setup on local or capable remote machines.

## Work History

Work History summarizes repository and dynamic changelog activity.

How it works:

- Service: `src/lib/services/work-history/dynamic-changelog.ts`.
- API route: `/api/work-history`.
- `src/app/page.tsx` prefetches recent history when the History view is requested.

Capabilities:

- List recent work items.
- Link completed work to Kanban, docs, changelog, and runtime activity.
- Provide a lightweight audit trail of local work.

## Main Code Paths

- `src/features/integrations/NangoIntegrationsView.tsx`
- `src/lib/services/integrations/nango-client.ts`
- `src/lib/services/integrations/nango-host.ts`
- `src/app/api/integrations/nango/route.ts`
- `src/app/api/integrations/nango/setup/route.ts`
- `src/lib/services/work-history/dynamic-changelog.ts`
- `src/app/api/work-history/route.ts`
