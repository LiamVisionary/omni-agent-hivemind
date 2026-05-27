"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Globe2, LoaderCircle, Monitor, RefreshCcw, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DashboardView } from "@/features/dashboard/dashboard-types";

type ClassNameBuilder = (...names: Array<string | false | null | undefined>) => string;

type HostedApp = {
  id: string;
  name: string;
  description: string;
  machineName: string;
  machineHost: string;
  local: boolean;
  online: boolean;
  scheme: string;
  port: number;
  process?: string;
  server?: string;
  openUrl: string;
};

type FleetAppsPayload = {
  ok?: boolean;
  checkedAt?: string;
  source?: string;
  apps?: HostedApp[];
  machines?: Array<{
    name: string;
    collector: string;
    appCount: number;
    error?: string;
  }>;
  error?: string;
};

type MyAppsPanelProps = {
  activeView: DashboardView;
  fleetClass: ClassNameBuilder;
  formatRelativeTime: (timestamp: number) => string;
};

export function MyAppsPanel({ activeView, fleetClass, formatRelativeTime }: MyAppsPanelProps) {
  const [payload, setPayload] = useState<FleetAppsPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setStatus("");
    try {
      const response = await fetch("/api/fleet/apps", { cache: "no-store" });
      const data = await response.json() as FleetAppsPayload;
      if (!response.ok || data.ok === false) throw new Error(data.error || `${response.status} ${response.statusText}`);
      setPayload(data);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not load hosted apps.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeView !== "my-apps" || payload || loading) return undefined;
    const timer = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activeView, loading, payload, refresh]);

  if (activeView !== "my-apps") return null;

  const apps = payload?.apps ?? [];
  const checkedAt = payload?.checkedAt ? Date.parse(payload.checkedAt) : 0;
  const readyMachines = payload?.machines?.filter((machine) => machine.collector === "ready").length ?? 0;
  const reportingMachines = payload?.machines?.filter((machine) => machine.appCount > 0).length ?? 0;

  return (
    <section className={fleetClass("taskPanel", "tabPanel")}>
      <div className={fleetClass("taskPanelHeader")}>
        <div>
          <p className="eyebrow">My Apps</p>
          <h2>Hosted web apps</h2>
          <p>HTTP apps discovered from every ready HivemindOS agent bridge on the Tailnet, with local apps opened through localhost and remote apps through their Tailscale host.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={() => void refresh()} disabled={loading}>
            {loading ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : <RefreshCcw aria-hidden="true" />}
            Refresh
          </Button>
        </div>
      </div>

      {status ? <p className="mt-3 rounded-md border border-[rgba(248,113,113,0.24)] bg-[rgba(127,29,29,0.20)] px-3 py-2 text-xs text-[var(--foreground)]">{status}</p> : null}

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-md border border-[rgba(94,234,212,0.18)] bg-[rgba(20,184,166,0.06)] p-4">
          <p className="eyebrow">Apps</p>
          <strong className="text-2xl">{apps.length}</strong>
        </div>
        <div className="rounded-md border border-[rgba(148,163,184,0.14)] bg-[rgba(10,14,21,0.55)] p-4">
          <p className="eyebrow">Machines</p>
          <strong className="text-2xl">{reportingMachines}/{readyMachines}</strong>
        </div>
        <div className="rounded-md border border-[rgba(148,163,184,0.14)] bg-[rgba(10,14,21,0.55)] p-4">
          <p className="eyebrow">Checked</p>
          <strong className="text-sm">{checkedAt ? formatRelativeTime(checkedAt) : loading ? "Scanning..." : "Not yet"}</strong>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {apps.map((app) => (
          <article key={app.id} className="grid gap-3 rounded-md border border-[rgba(148,163,184,0.14)] bg-[rgba(10,14,21,0.55)] p-4">
            <div className="flex items-start justify-between gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[rgba(94,234,212,0.24)] bg-[rgba(20,184,166,0.10)] text-[var(--accent-strong)]">
                {app.local ? <Monitor aria-hidden="true" className="h-4 w-4" /> : <Server aria-hidden="true" className="h-4 w-4" />}
              </span>
              <a
                href={app.openUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[rgba(94,234,212,0.24)] bg-[rgba(20,184,166,0.10)] text-[var(--accent-strong)] transition hover:border-[rgba(94,234,212,0.45)] hover:bg-[rgba(20,184,166,0.16)]"
                title={`Open ${app.name}`}
              >
                <ExternalLink aria-hidden="true" className="h-4 w-4" />
              </a>
            </div>
            <div className="grid gap-1">
              <small className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--muted)]">
                {app.local ? "localhost" : app.machineHost} · {app.scheme}:{app.port}
              </small>
              <h3 className="m-0 text-base font-bold">{app.name}</h3>
              <p className="m-0 text-xs leading-5 text-[var(--muted)]">{app.description}</p>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] text-[var(--muted)]">
              <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(148,163,184,0.14)] px-2 py-1">
                <Globe2 aria-hidden="true" className="h-3 w-3" />
                {app.machineName}
              </span>
              {app.process ? <span className="rounded-full border border-[rgba(148,163,184,0.14)] px-2 py-1">{app.process}</span> : null}
              {app.server ? <span className="rounded-full border border-[rgba(148,163,184,0.14)] px-2 py-1">{app.server}</span> : null}
            </div>
          </article>
        ))}
      </div>

      {!loading && apps.length === 0 ? (
        <div className="mt-4 rounded-md border border-[rgba(148,163,184,0.14)] bg-[rgba(10,14,21,0.55)] p-4 text-sm text-[var(--muted)]">
          No HTTP apps reported yet. Ready collectors need the updated agent bridge with the `/apps` endpoint.
        </div>
      ) : null}
    </section>
  );
}
