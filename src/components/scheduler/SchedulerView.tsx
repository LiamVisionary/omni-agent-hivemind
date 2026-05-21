// src/components/scheduler/SchedulerView.tsx
"use client";

import * as React from "react";
import { TooltipProvider } from "@/components/ui/tooltip";

import { BeeIcon } from "./bee-icon";
import { Composer } from "./composer";
import { HexTile } from "./hex-tile";
import { Jobs } from "./jobs";
import { Timeline } from "./timeline";
import { SCH_JOBS, SCH_TEMPLATES, type SchedulerJob } from "./scheduler-data";
import styles from "./scheduler-tokens.module.css";

interface SchedulerViewProps {
  jobs?: SchedulerJob[];
  onToggleJob?: (j: SchedulerJob) => void;
  onRunNow?: (j: SchedulerJob) => void;
  onEditJob?: (j: SchedulerJob) => void;
  onNewJob?: () => void;
  toolbar?: React.ReactNode;
  status?: React.ReactNode;
}

export function SchedulerView({
  jobs: initialJobs = SCH_JOBS, onToggleJob, onRunNow, onEditJob, onNewJob, toolbar, status,
}: SchedulerViewProps = {}) {
  const jobs = initialJobs;
  const [selectedId, setSelectedId] = React.useState<string>(initialJobs[0]?.id ?? "");
  const selected = jobs.find((j) => j.id === selectedId) ?? jobs[0];
  const effectiveSelectedId = selected?.id ?? "";
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "short", day: "numeric", year: "numeric",
  });

  const toggleJob = (id: string) => {
    const job = jobs.find((j) => j.id === id);
    if (!job) return;
    onToggleJob?.({ ...job, enabled: !job.enabled, nextRun: job.enabled ? "paused" : job.nextRun });
  };

  const upcoming = jobs.filter((j) => j.enabled).length;
  const failedLast = jobs.filter((j) => j.lastRun.status === "failed").length;

  return (
    <TooltipProvider delayDuration={120}>
      <div className={`${styles.root} relative overflow-hidden`} style={{
        width: "100%", height: "100%",
        background: "var(--background)", color: "var(--foreground)",
        fontFamily: "var(--f-display), system-ui, sans-serif",
        display: "grid", gridTemplateRows: "auto 1fr",
      }}>
        <div aria-hidden className="absolute inset-0 pointer-events-none" style={{
          background:
            "radial-gradient(circle at 50% 30%, rgba(255,212,90,0.10), transparent 50%)," +
            "radial-gradient(circle at 80% 80%, rgba(45,212,191,0.08), transparent 50%)",
        }} />

        {/* MASTHEAD */}
        <header className="relative z-10" style={{
          padding: "22px 32px 16px", borderBottom: "1px solid rgba(148,163,184,0.16)",
        }}>
          <div className="grid items-center" style={{ gridTemplateColumns: "auto 1fr auto", gap: 24 }}>
            <div className="flex items-center" style={{ gap: 14 }}>
              <HexTile size={42} tone="honey"><BeeIcon role="queen" size={26} /></HexTile>
              <div>
                <div className={styles.monoCap} style={{ color: "var(--hex-honey-border)" }}>
                  Hivemind Dispatch · Scheduler
                </div>
                <div className="font-bold" style={{
                  fontFamily: "var(--f-display)", fontSize: 18, letterSpacing: 0,
                }}>The bees keep flying</div>
              </div>
            </div>
            <div className="text-center uppercase" style={{
              fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--muted)", letterSpacing: 0.1,
            }}>
              {today} · cron · <span style={{ color: "var(--hex-active-border)" }}>synced</span>
            </div>
            <div className="flex justify-end">{toolbar}</div>
          </div>

          <div className="mt-4 grid items-end" style={{ gridTemplateColumns: "1fr auto", gap: 24 }}>
            <h1 className="m-0 font-bold" style={{
              fontFamily: "var(--f-display)", fontSize: "clamp(40px, 5vw, 64px)",
              lineHeight: 0.95, letterSpacing: 0,
            }}>
              While you{" "}
              <span style={{ fontStyle: "italic", color: "var(--hex-honey-border)", fontWeight: 500 }}>sleep.</span>
            </h1>
            <div className="flex" style={{ gap: 18, paddingBottom: 6 }}>
              <BigStat n={upcoming} label="active" tone="cyan" />
              <BigStat n={jobs.length - upcoming} label="paused" tone="honey" />
              <BigStat n={failedLast} label="failed last" tone="danger" />
              <BigStat n={jobs.length} label="total" />
            </div>
          </div>
          {status ? <div style={{ marginTop: 12 }}>{status}</div> : null}
        </header>

        {/* BODY */}
        {selected ? <div className="relative z-10 grid" style={{
          gridTemplateColumns: "300px minmax(0, 1fr) 360px", minHeight: 0,
        }}>
          <Jobs jobs={jobs} selectedId={effectiveSelectedId}
            onSelect={setSelectedId} onToggle={toggleJob} onNewJob={onNewJob} />

          <section className="grid overflow-hidden" style={{
            minWidth: 0, minHeight: 0,
            padding: "20px 28px 28px", gap: 16, gridTemplateRows: "auto 1fr",
          }}>
            <div className="flex justify-between items-baseline">
              <div className={styles.monoCap} style={{ color: "var(--hex-active-border)" }}>
                <span className={`${styles.dot} ${styles.dotLive}`} style={{ color: "#2dd4bf" }} />
                &nbsp; next 24 hours
              </div>
              <div className="flex" style={{ gap: 6 }}>
                {["24h", "week", "month"].map((v, i) => (
                  <button key={v} aria-pressed={i === 0} className="uppercase cursor-pointer"
                    style={{
                      fontFamily: "var(--f-mono)", fontSize: 10, padding: "5px 10px", borderRadius: 999,
                      background: i === 0 ? "rgba(45,212,191,0.12)" : "transparent",
                      color: i === 0 ? "var(--foreground)" : "var(--muted)",
                      border: `1px solid ${i === 0 ? "rgba(94,234,212,0.42)" : "rgba(148,163,184,0.16)"}`,
                      letterSpacing: 0.1,
                    }}>{v}</button>
                ))}
              </div>
            </div>
            <Timeline jobs={jobs} selectedId={effectiveSelectedId} onSelect={setSelectedId} />
          </section>

          <Composer job={selected} templates={SCH_TEMPLATES}
            onRunNow={() => onRunNow?.(selected)}
            onEdit={() => onEditJob?.(selected)} />
        </div> : (
          <div className="relative z-10 grid place-items-center" style={{ minHeight: 460, padding: 28 }}>
            <div className="grid place-items-center text-center" style={{
              gap: 10, maxWidth: 420, padding: 28, borderRadius: 14,
              border: "1px dashed var(--hex-add-stroke)",
              background: "var(--panel-bg-soft)",
            }}>
              <HexTile size={58} tone="honey"><BeeIcon role="queen" size={34} /></HexTile>
              <div className={styles.monoCap} style={{ color: "var(--hex-active-border)" }}>No schedules yet</div>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: 13, lineHeight: 1.5 }}>
                Import existing runtime schedules or create a new task to populate the dispatch rail.
              </p>
              {onNewJob ? (
                <button type="button" onClick={onNewJob} className="uppercase font-bold cursor-pointer" style={{
                  marginTop: 6, padding: "9px 12px", borderRadius: 7,
                  border: "1px solid rgba(94,234,212,0.55)",
                  background: "rgba(45,212,191,0.18)", color: "var(--hex-active-border)",
                  fontFamily: "var(--f-mono)", fontSize: 11, letterSpacing: 0.06,
                }}>
                  Schedule new task
                </button>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

function BigStat({ n, label, tone }: { n: number; label: string; tone?: "cyan" | "honey" | "danger" }) {
  const color =
    tone === "cyan"   ? "var(--hex-active-border)" :
    tone === "honey"  ? "var(--hex-honey-border)"  :
    tone === "danger" ? "#fb7185"                  :
                        "var(--foreground)";
  return (
    <div className="text-right">
      <div className="font-bold" style={{
        fontFamily: "var(--f-display)", fontSize: 36, color, lineHeight: 1, letterSpacing: 0,
      }}>{n}</div>
      <div className={styles.monoCap} style={{ color: "var(--muted)", marginTop: 2 }}>{label}</div>
    </div>
  );
}
