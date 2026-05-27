"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ExternalLink, LoaderCircle, Maximize2, RefreshCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DashboardView } from "@/features/dashboard/dashboard-types";

type ClassNameBuilder = (...names: Array<string | false | null | undefined>) => string;

type HostedApp = {
  id: string;
  name: string;
  description: string;
  kind: "ai" | "creative" | "code" | "dashboard" | "media" | "app";
  theme: string;
  initials: string;
  iconUrl?: string;
  machineName: string;
  machineHost: string;
  local: boolean;
  online: boolean;
  interactive: boolean;
  scheme: string;
  port: number;
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

function AppIcon({ app, large = false }: { app: HostedApp; large?: boolean }) {
  const sizeClass = large ? "h-24 w-24 rounded-[24px] text-3xl" : "h-20 w-20 rounded-[22px] text-2xl";
  const [broken, setBroken] = useState(false);
  return (
    <span className={`flex ${sizeClass} items-center justify-center overflow-hidden bg-gradient-to-br ${app.theme} font-black text-white shadow-[0_18px_38px_rgba(15,23,42,0.30)] ring-1 ring-white/20 transition group-hover:-translate-y-1 group-hover:shadow-[0_24px_54px_rgba(15,23,42,0.42)]`}>
      {app.iconUrl && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={app.iconUrl}
          alt=""
          className="h-full w-full object-contain p-2"
          onError={() => setBroken(true)}
        />
      ) : (
        app.initials
      )}
    </span>
  );
}

export function MyAppsPanel({ activeView, fleetClass, formatRelativeTime }: MyAppsPanelProps) {
  const [payload, setPayload] = useState<FleetAppsPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

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
  const selectedApp = apps.find((app) => app.id === selectedAppId) ?? null;
  const checkedAt = payload?.checkedAt ? Date.parse(payload.checkedAt) : 0;
  const readyMachines = payload?.machines?.filter((machine) => machine.collector === "ready").length ?? 0;
  const reportingMachines = payload?.machines?.filter((machine) => machine.appCount > 0).length ?? 0;

  if (selectedApp) {
    const isComfy = /comfy/i.test(selectedApp.name);
    return (
      <section className={fleetClass("taskPanel", "tabPanel")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button type="button" size="sm" variant="secondary" onClick={() => setSelectedAppId(null)}>
            <ArrowLeft aria-hidden="true" />
            Apps
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={() => void refresh()} disabled={loading}>
              {loading ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : <RefreshCcw aria-hidden="true" />}
              Refresh
            </Button>
            <Button type="button" size="sm" asChild>
              <a href={selectedApp.openUrl} target="_blank" rel="noreferrer">
                <ExternalLink aria-hidden="true" />
                Open
              </a>
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.4fr)]">
          <div className="grid content-start gap-4">
            <div className="flex items-center gap-4">
              <AppIcon app={selectedApp} large />
              <div>
                <p className="eyebrow">{selectedApp.local ? "This Mac" : selectedApp.machineName}</p>
                <h2 className="m-0 text-2xl font-black">{selectedApp.name}</h2>
                <p className="m-0 mt-2 text-sm leading-6 text-[var(--muted)]">{selectedApp.description}</p>
              </div>
            </div>

            <div className="grid gap-3 rounded-md border border-[rgba(148,163,184,0.14)] bg-[rgba(10,14,21,0.55)] p-4">
              <div className="flex items-center gap-2 text-sm font-bold">
                <Sparkles aria-hidden="true" className="h-4 w-4 text-[var(--accent-strong)]" />
                Ready on your Tailnet
              </div>
              <p className="m-0 text-sm leading-6 text-[var(--muted)]">
                This app is reachable from the private network. Use the embedded workspace here, or open it in a full browser tab when you need more room.
              </p>
              {isComfy ? (
                <div className="rounded-md border border-[rgba(94,234,212,0.20)] bg-[rgba(20,184,166,0.08)] p-3 text-sm leading-6 text-[var(--foreground)]">
                  ComfyUI exposes its own workflow controls. The embedded workspace below is the safest way to run the current graph from HivemindOS without guessing at your node schema.
                </div>
              ) : null}
            </div>
          </div>

          <div className="min-h-[520px] overflow-hidden rounded-md border border-[rgba(148,163,184,0.18)] bg-black/40">
            <div className="flex items-center justify-between gap-3 border-b border-[rgba(148,163,184,0.14)] bg-[rgba(10,14,21,0.86)] px-3 py-2">
              <span className="text-xs font-bold text-[var(--muted)]">Live app</span>
              <a href={selectedApp.openUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs font-bold text-[var(--accent-strong)] hover:bg-[rgba(20,184,166,0.10)]">
                <Maximize2 aria-hidden="true" className="h-3 w-3" />
                Full screen
              </a>
            </div>
            <iframe
              title={selectedApp.name}
              src={selectedApp.openUrl}
              className="h-[520px] w-full border-0 bg-white"
              sandbox="allow-forms allow-modals allow-popups allow-same-origin allow-scripts allow-downloads"
            />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={fleetClass("taskPanel", "tabPanel")}>
      <div className={fleetClass("taskPanelHeader")}>
        <div>
          <p className="eyebrow">My Apps</p>
          <h2>Apps running now</h2>
          <p>Interactive apps from your private network, cleaned up into a launcher.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={() => void refresh()} disabled={loading}>
            {loading ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : <RefreshCcw aria-hidden="true" />}
            Refresh
          </Button>
        </div>
      </div>

      {status ? <p className="mt-3 rounded-md border border-[rgba(248,113,113,0.24)] bg-[rgba(127,29,29,0.20)] px-3 py-2 text-xs text-[var(--foreground)]">{status}</p> : null}

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
        <span>{apps.length} apps</span>
        <span>·</span>
        <span>{reportingMachines}/{readyMachines} machines</span>
        <span>·</span>
        <span>{checkedAt ? formatRelativeTime(checkedAt) : loading ? "Scanning..." : "Not yet"}</span>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-x-4 gap-y-7 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-7">
        {apps.map((app) => (
          <button
            type="button"
            key={app.id}
            onClick={() => setSelectedAppId(app.id)}
            className="group grid justify-items-center gap-3 text-center text-[var(--foreground)] outline-none"
          >
            <span className="relative">
              <AppIcon app={app} />
              <span className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-[rgb(10,14,21)] ${app.online ? "bg-emerald-400" : "bg-slate-400"}`} />
            </span>
            <span className="max-w-[7rem] text-sm font-bold leading-5">{app.name}</span>
          </button>
        ))}
      </div>

      {!loading && apps.length === 0 ? (
        <div className="mt-4 rounded-md border border-[rgba(148,163,184,0.14)] bg-[rgba(10,14,21,0.55)] p-4 text-sm text-[var(--muted)]">
          No interactive apps found yet. Background services and plumbing are hidden from this launcher.
        </div>
      ) : null}
    </section>
  );
}
