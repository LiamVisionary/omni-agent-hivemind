"use client";

import type { ElementType } from "react";

import type { MemoryTelemetryPayload, MemoryTelemetryProcess, MemoryTelemetrySuspect } from "@/lib/types/memory-telemetry";

type IconComponent = ElementType<{
  "aria-hidden"?: boolean | "true" | "false";
  className?: string;
}>;

type ClassNameBuilder = (...names: Array<string | false | null | undefined>) => string;

type MemoryTelemetryPanelProps = {
  Activity: IconComponent;
  Button: ElementType;
  LoaderCircle: IconComponent;
  RefreshCcw: IconComponent;
  active: boolean;
  fleetClass: ClassNameBuilder;
  formatRelativeTime: (timestamp: number) => string;
  memoryTelemetry: MemoryTelemetryPayload | null | undefined;
  memoryTelemetryLoading: boolean;
  refreshMemoryTelemetry: () => void | Promise<void>;
  vaultClass: ClassNameBuilder;
};

export function MemoryTelemetryPanel(props: MemoryTelemetryPanelProps) {
  const {
    Activity,
    Button,
    LoaderCircle,
    RefreshCcw,
    active,
    fleetClass,
    formatRelativeTime,
    memoryTelemetry,
    memoryTelemetryLoading,
    refreshMemoryTelemetry,
    vaultClass,
  } = props;
  if (!active) return null;

  const samples = memoryTelemetry?.samples ?? [];
  const latestSample = samples[samples.length - 1];
  const firstSample = samples[0];
  const appGrowth = latestSample && firstSample ? latestSample.appRssMb - firstSample.appRssMb : 0;
  const maxAppRss = Math.max(0, ...samples.map((sample) => sample.appRssMb));

  return (
    <section className={fleetClass("taskPanel", "tabPanel")}>
      <div className={fleetClass("taskPanelHeader")}>
        <div>
          <p className="eyebrow">RAM diagnostics</p>
          <h2>Memory telemetry</h2>
          <p>Tracks RSS growth across the dashboard process tree, the current Next.js heap, and app-related child processes.</p>
        </div>
        <Button type="button" size="sm" variant="secondary" onClick={() => void refreshMemoryTelemetry()} disabled={memoryTelemetryLoading}>
          {memoryTelemetryLoading ? <LoaderCircle aria-hidden="true" className={vaultClass("spinIcon")} /> : <RefreshCcw aria-hidden="true" />}
          Refresh
        </Button>
      </div>

      {memoryTelemetry ? (
        <div className="mt-4 grid gap-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard label="App RSS" value={formatMb(memoryTelemetry.summary.appRssMb)} detail={`${growthLabel(appGrowth)} over ${memoryTelemetry.summary.sampleWindowMinutes}m`} />
            <MetricCard label="Next RSS" value={formatMb(memoryTelemetry.processMemory.rssMb)} detail={`PID ${memoryTelemetry.pid}`} />
            <MetricCard label="Heap used" value={formatMb(memoryTelemetry.processMemory.heapUsedMb)} detail={`${formatMb(memoryTelemetry.processMemory.heapTotalMb)} allocated`} />
            <MetricCard label="External" value={formatMb(memoryTelemetry.processMemory.externalMb + memoryTelemetry.processMemory.arrayBuffersMb)} detail="native buffers" />
            <MetricCard label="Top grower" value={growthLabel(memoryTelemetry.summary.topGrowerGrowthMb)} detail={memoryTelemetry.summary.topGrowerLabel} />
          </div>

          <section className="grid gap-3 rounded-md border border-[rgba(148,163,184,0.14)] bg-[rgba(10,14,21,0.55)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="eyebrow">Timeline</p>
                <h3 className="m-0 text-base font-bold">App RSS samples</h3>
              </div>
              <small className="text-[var(--muted)]">
                {samples.length} samples · checked {formatRelativeTime(memoryTelemetry.checkedAt)}
              </small>
            </div>
            <div className="grid gap-2">
              {samples.slice(-24).map((sample) => (
                <div key={sample.ts} className="grid grid-cols-[5.5rem_minmax(0,1fr)_5rem] items-center gap-3 text-xs">
                  <span className="text-[var(--muted)]">{new Date(sample.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  <span className="h-2 rounded-full bg-[rgba(148,163,184,0.16)]">
                    <span
                      className="block h-2 rounded-full bg-[rgba(94,234,212,0.72)]"
                      style={{ width: `${barPercent(sample.appRssMb, maxAppRss)}%` }}
                    />
                  </span>
                  <strong className="text-right">{formatMb(sample.appRssMb)}</strong>
                </div>
              ))}
              {samples.length === 0 ? <p className="m-0 text-sm text-[var(--muted)]">No samples yet. Press Refresh or leave the app open for the background sampler.</p> : null}
            </div>
          </section>

          <section className="grid gap-3 rounded-md border border-[rgba(148,163,184,0.14)] bg-[rgba(10,14,21,0.55)] p-4">
            <div className="flex items-center gap-2">
              <Activity aria-hidden="true" className="h-4 w-4 text-[var(--accent-strong)]" />
              <h3 className="m-0 text-base font-bold">Suspects</h3>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {memoryTelemetry.suspects.map((suspect) => <SuspectCard suspect={suspect} key={`${suspect.title}:${suspect.pid ?? "global"}`} />)}
            </div>
          </section>

          <ProcessTable title="App-related processes" processes={memoryTelemetry.processes} />
          <ProcessTable title="Fastest growers" processes={memoryTelemetry.topGrowers} />
          <ProcessTable title="Largest other system processes" processes={memoryTelemetry.topSystemProcesses} muted />
        </div>
      ) : (
        <div className="mt-4 rounded-md border border-dashed border-[rgba(148,163,184,0.22)] p-6 text-center text-sm text-[var(--muted)]">
          Press Refresh to start memory telemetry.
        </div>
      )}
    </section>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="grid gap-1 rounded-md border border-[rgba(148,163,184,0.14)] bg-[rgba(10,14,21,0.55)] p-4">
      <small className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--muted)]">{label}</small>
      <strong className="text-2xl">{value}</strong>
      <span className="break-words text-xs leading-5 text-[var(--muted)]">{detail}</span>
    </article>
  );
}

function SuspectCard({ suspect }: { suspect: MemoryTelemetrySuspect }) {
  const tone = suspect.severity === "critical"
    ? "border-[rgba(251,113,133,0.40)] bg-[rgba(127,29,29,0.20)] text-[#fecdd3]"
    : suspect.severity === "warning"
      ? "border-[rgba(250,204,21,0.30)] bg-[rgba(113,63,18,0.18)] text-[#fde68a]"
      : "border-[rgba(94,234,212,0.20)] bg-[rgba(20,184,166,0.08)] text-[var(--foreground)]";
  return (
    <article className={`grid gap-1 rounded-md border p-3 ${tone}`}>
      <strong>{suspect.title}</strong>
      <p className="m-0 break-words text-xs leading-5">{suspect.detail}</p>
    </article>
  );
}

function ProcessTable({ title, processes, muted = false }: { title: string; processes: MemoryTelemetryProcess[]; muted?: boolean }) {
  return (
    <section className="grid gap-3 rounded-md border border-[rgba(148,163,184,0.14)] bg-[rgba(10,14,21,0.55)] p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">{muted ? "Context" : "Process RSS"}</p>
          <h3 className="m-0 text-base font-bold">{title}</h3>
        </div>
        <small className="text-[var(--muted)]">{processes.length} tracked</small>
      </div>
      <div className="grid gap-2">
        <div className="hidden grid-cols-[4rem_8rem_7rem_7rem_minmax(0,1fr)] gap-3 border-b border-[rgba(148,163,184,0.14)] pb-2 text-xs font-bold uppercase tracking-[0.08em] text-[var(--muted)] md:grid">
          <span>PID</span>
          <span>Role</span>
          <span>RSS</span>
          <span>Growth</span>
          <span>Command</span>
        </div>
        {processes.map((processInfo) => (
          <article key={`${processInfo.pid}:${processInfo.command}`} className="grid gap-2 rounded-md border border-[rgba(148,163,184,0.10)] bg-[rgba(2,6,23,0.34)] p-3 text-xs md:grid-cols-[4rem_8rem_7rem_7rem_minmax(0,1fr)] md:items-start">
            <strong>{processInfo.pid}</strong>
            <span className="capitalize text-[var(--muted)]">{processInfo.role}</span>
            <span>{formatMb(processInfo.rssMb)}</span>
            <span className={processInfo.recentGrowthMb > 50 ? "font-bold text-[#fecdd3]" : processInfo.recentGrowthMb > 0 ? "text-[#fde68a]" : "text-[var(--muted)]"}>
              {growthLabel(processInfo.recentGrowthMb)}
            </span>
            <span className="min-w-0 break-words font-mono text-[11px] leading-5 text-[var(--muted)]">{processInfo.command}</span>
          </article>
        ))}
        {processes.length === 0 ? <p className="m-0 text-sm text-[var(--muted)]">No processes sampled yet.</p> : null}
      </div>
    </section>
  );
}

function formatMb(value: number) {
  if (!Number.isFinite(value)) return "0 MB";
  if (value >= 1024) return `${(value / 1024).toFixed(2)} GB`;
  return `${value.toFixed(value >= 100 ? 0 : 1)} MB`;
}

function growthLabel(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatMb(value)}`;
}

function barPercent(value: number, max: number) {
  if (!max) return 0;
  return Math.min(100, Math.max(4, (value / max) * 100));
}
