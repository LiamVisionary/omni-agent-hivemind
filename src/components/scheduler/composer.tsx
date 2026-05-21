// src/components/scheduler/composer.tsx
"use client";

import * as React from "react";
import { BeeIcon } from "./bee-icon";
import type { CadenceTemplate, SchedulerJob } from "./scheduler-data";
import styles from "./scheduler-tokens.module.css";

interface ComposerProps {
  job: SchedulerJob;
  templates: CadenceTemplate[];
  onRunNow?: () => void;
  onEdit?: () => void;
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <label className="grid" style={{ gap: 4 }}>
      <span className={styles.monoCap} style={{ color: "var(--muted)" }}>{label}</span>
      <input defaultValue={value} style={{
        padding: "8px 10px", borderRadius: 7,
        border: "1px solid rgba(148,163,184,0.22)", background: "var(--panel-bg-soft)",
        color: "var(--foreground)", fontFamily: mono ? "var(--f-mono)" : "inherit",
        fontSize: 12, outline: "none",
      }} />
    </label>
  );
}

const STATUS_COLOR = {
  ok:     "var(--hex-active-border)",
  warn:   "var(--hex-honey-border)",
  failed: "#fb7185",
  stale:  "var(--hex-honey-border)",
  idle:   "var(--muted)",
};

export function Composer({ job, templates, onRunNow, onEdit }: ComposerProps) {
  const [activeTpl, setActiveTpl] = React.useState<CadenceTemplate["id"]>("cron");
  return (
    <aside className="flex flex-col overflow-auto"
      style={{
        gap: 14, padding: "20px 18px",
        borderLeft: "1px solid rgba(148,163,184,0.16)",
        background: "var(--panel-bg-soft)",
      }}>
      <div>
        <div className={styles.monoCap} style={{ color: "var(--muted)" }}>Detail</div>
        <div className="font-bold leading-tight" style={{
          margin: "4px 0 0", fontFamily: "var(--f-display)", fontSize: 22, letterSpacing: 0,
        }}>{job.name}</div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8, lineHeight: 1.5 }}>
          {job.description}
        </div>
      </div>

      {/* Next run tile */}
      <div className="grid" style={{
        padding: "12px 14px", borderRadius: 10, gap: 4,
        border: "1px solid var(--hex-honey-border)",
        background: "linear-gradient(180deg, rgba(255,212,90,0.10), transparent)",
      }}>
        <div className={styles.monoCap} style={{ color: "var(--hex-honey-border)" }}>NEXT RUN</div>
        <div className="font-bold" style={{
          fontFamily: "var(--f-display)", fontSize: 28,
          color: "var(--foreground)", letterSpacing: 0, lineHeight: 1,
        }}>{job.enabled ? job.nextRun : "paused"}</div>
        <div style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--muted)" }}>
          {job.cronLabel}
        </div>
        <div className="flex" style={{ gap: 8, marginTop: 8 }}>
          <button onClick={onRunNow} className="uppercase font-bold cursor-pointer"
            style={{
              flex: 1, padding: "9px 12px", borderRadius: 7,
              border: "1px solid rgba(94,234,212,0.55)",
              background: "rgba(45,212,191,0.18)", color: "var(--hex-active-border)",
              fontFamily: "var(--f-mono)", fontSize: 11, letterSpacing: 0.06,
            }}>▶ run now</button>
          <button onClick={onEdit} className="uppercase font-bold cursor-pointer"
            style={{
              flex: 1, padding: "9px 12px", borderRadius: 7,
              border: "1px solid rgba(148,163,184,0.22)", background: "transparent",
              color: "var(--foreground)",
              fontFamily: "var(--f-mono)", fontSize: 11, letterSpacing: 0.06,
            }}>edit</button>
        </div>
      </div>

      {/* Assignment */}
      <section className="grid" style={{ gap: 8 }}>
        <div className={styles.monoCap} style={{ color: "var(--muted)" }}>Assigned to</div>
        <div className="grid items-center" style={{
          gridTemplateColumns: "auto 1fr", gap: 10,
          padding: "10px 12px", borderRadius: 8,
          border: "1px solid rgba(148,163,184,0.16)", background: "var(--panel-bg-soft)",
        }}>
          <BeeIcon role="worker" size={26} dim={!job.enabled} />
          <div className="min-w-0">
            <div className="font-semibold" style={{ fontFamily: "var(--f-display)", fontSize: 13 }}>{job.bee}</div>
            <div style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: "var(--muted)" }}>
              {job.runtime} · {job.machine}
            </div>
          </div>
        </div>
      </section>

      {/* Cadence builder */}
      <section className="grid" style={{ gap: 8 }}>
        <div className={styles.monoCap} style={{ color: "var(--muted)" }}>Change cadence</div>
        <div className="flex flex-wrap" style={{
          gap: 5, padding: 8, borderRadius: 10,
          border: "1px solid rgba(148,163,184,0.16)", background: "var(--panel-bg-soft)",
        }}>
          {templates.map((t) => {
            const a = activeTpl === t.id;
            return (
              <button key={t.id} onClick={() => setActiveTpl(t.id)}
                className="uppercase font-bold cursor-pointer"
                style={{
                  padding: "5px 9px", borderRadius: 999,
                  border: `1px solid ${a ? "var(--hex-honey-border)" : "rgba(148,163,184,0.16)"}`,
                  background: a ? "rgba(255,212,90,0.14)" : "transparent",
                  color: a ? "var(--hex-honey-border)" : "var(--muted)",
                  fontFamily: "var(--f-mono)", fontSize: 10, letterSpacing: 0.06,
                }}>{t.icon} {t.label}</button>
            );
          })}
        </div>
        {activeTpl === "cron" && (
          <div>
            <input defaultValue={job.cron} style={{
              width: "100%", padding: "10px 12px", borderRadius: 7,
              border: "1px solid rgba(148,163,184,0.22)", background: "var(--panel-bg-soft)",
              color: "var(--hex-active-border)", fontFamily: "var(--f-mono)", fontSize: 13,
              outline: "none", letterSpacing: 0.04,
            }} />
            <div style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: "var(--muted)", marginTop: 6 }}>
              <span style={{ color: "var(--hex-active-border)" }}>min · hr · dom · mon · dow</span> — {job.cronLabel}
            </div>
          </div>
        )}
        {activeTpl === "interval" && (
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Field label="every" value="15" mono />
            <Field label="unit" value="minutes" />
          </div>
        )}
        {activeTpl === "daily" && <Field label="at" value="02:00 UTC" mono />}
        {activeTpl === "weekday" && (
          <div className="grid" style={{ gap: 8 }}>
            <Field label="at" value="13:30 ET" mono />
            <div className="flex" style={{ gap: 4 }}>
              {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d, i) => (
                <span key={d} className="text-center font-bold" style={{
                  flex: 1, padding: "5px 0", borderRadius: 6,
                  border: `1px solid ${i < 5 ? "rgba(94,234,212,0.4)" : "rgba(148,163,184,0.16)"}`,
                  background: i < 5 ? "rgba(45,212,191,0.10)" : "transparent",
                  color: i < 5 ? "var(--hex-active-border)" : "var(--muted)",
                  fontFamily: "var(--f-mono)", fontSize: 10,
                }}>{d.slice(0, 1)}</span>
              ))}
            </div>
          </div>
        )}
        {activeTpl === "session" && (
          <div className="flex flex-wrap" style={{ gap: 6 }}>
            {["NYSE open", "NYSE close", "Tokyo open", "London open", "FOMC"].map((s, i) => (
              <span key={s} className="uppercase font-bold" style={{
                padding: "6px 10px", borderRadius: 999,
                border: `1px solid ${i === 0 ? "var(--hex-honey-border)" : "rgba(148,163,184,0.16)"}`,
                background: i === 0 ? "rgba(255,212,90,0.14)" : "transparent",
                color: i === 0 ? "var(--hex-honey-border)" : "var(--muted)",
                fontFamily: "var(--f-mono)", fontSize: 10, letterSpacing: 0.06,
              }}>{s}</span>
            ))}
          </div>
        )}
        {activeTpl === "trigger" && <Field label="on event" value="agent.signal.fed_speak" mono />}
      </section>

      {/* History */}
      <section className="grid" style={{ gap: 8 }}>
        <div className="flex justify-between items-baseline">
          <div className={styles.monoCap} style={{ color: "var(--muted)" }}>Recent runs</div>
          <span style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: "var(--muted)" }}>
            {job.history.length} entries
          </span>
        </div>
        <div className="grid" style={{ gap: 4 }}>
          {job.history.map((h, i) => {
            const c = STATUS_COLOR[h.status];
            return (
              <div key={i} className="grid items-center" style={{
                gridTemplateColumns: "auto 1fr auto", gap: 10,
                padding: "8px 10px", borderRadius: 6,
                border: "1px solid rgba(148,163,184,0.16)", background: "var(--panel-bg-soft)",
              }}>
                <span className={styles.dot} style={{ color: c }} />
                <div>
                  <div style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--foreground)" }}>{h.at}</div>
                  <div className={styles.monoCap} style={{ color: c }}>{h.status}</div>
                </div>
                <span style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--muted)" }}>{h.dur}</span>
              </div>
            );
          })}
        </div>
      </section>
    </aside>
  );
}
